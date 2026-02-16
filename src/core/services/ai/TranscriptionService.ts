import { databaseService } from '@/core/services/storage';
import { chatService } from './ChatService';
import { speechService, SpeechServiceFileError } from './SpeechService';
import { textService } from './TextService';

/**
 * @brief Defines the structure for a single transcription job in the queue.
 */
interface TranscriptionTask {
  entryId: string;
  audioUri: string;
  audioDurationSeconds?: number; // Audio duration in seconds for dynamic timeout calculation
  existingRawText?: string; // For resuming from checkpoint (skip STT if present)
  existingStage?: 'transcribing' | 'refining'; // Current stage when resuming

  onProgress: (entryId: string, stage: 'transcribing' | 'refining', progress?: number) => void;
  onComplete: (entryId: string, result: TranscriptionResult, status: 'completed' | 'failed') => void;
}

/**
 * @brief Defines the structure of the output after a transcription task is completed.
 */
interface TranscriptionResult {
  rawTranscription: string;
  refinedTranscription: string;
  aiGeneratedTitle: string;
  processingStage?: 'transcribing' | 'refining' | 'transcribing_failed' | 'refining_failed' | 'completed' | 'audio_unavailable';
}

/**
 * @brief Splits a long string of text into smaller chunks based on word count.
 *
 * This utility function is used to break down large transcriptions into manageable
 * pieces that can be sent to the text refinement service without exceeding API limits.
 *
 * @param text The input string to be split.
 * @param chunkSizeInWords The maximum number of words per chunk. Defaults to 800.
 * @returns An array of text chunks.
 */
export function chunkText(text: string, chunkSizeInWords: number = 800): string[] { //split into chunkSizeInWords number of words
  const words = text.split(/(\s+)/).filter(w => w.trim().length > 0);
  const chunks: string[] = [];

  if (words.length === 0) { 
    return [];
  }

  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const word of words) {
    currentChunk.push(word);
    currentWordCount++;

    if (currentWordCount >= chunkSizeInWords) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
      currentWordCount = 0;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

/**
 * @brief Manages a queue of audio transcription tasks, processing them sequentially.
 *
 * This service handles the entire pipeline from raw audio to a refined, titled transcription,
 * ensuring that only one task is processed at a time. It now supports chunking for long transcriptions.
 * 
 * The service uses the database as the source of truth for processing state, enabling
 * crash recovery through checkpointing and the resumePendingTasks watchdog.
 */
class TranscriptionService {
  private queue: TranscriptionTask[] = [];
  private isProcessing = false;
  
  /**
   * @brief Set of entry IDs currently active (queued or processing).
   * Prevents double-queueing the same entry if resumePendingTasks is called multiple times.
   */
  private activeTaskIds = new Set<string>();

  /**
   * @brief Adds a new transcription task to the processing queue.
   * Prevents duplicate entries from being queued.
   *
   * @param task The transcription task object to be added to the queue.
   * @returns boolean indicating if the task was added (false if already active)
   */
  addToQueue(task: TranscriptionTask): boolean {
    // Prevent double-queueing the same entry
    if (this.activeTaskIds.has(task.entryId)) {
      console.log(`[TranscriptionService] Entry ${task.entryId} is already queued or processing, skipping`);
      return false;
    }
    
    this.activeTaskIds.add(task.entryId);
    this.queue.push(task);
    this.processQueue();
    return true;
  }

  /**
   * @brief Processes tasks from the queue one by one in the order they were added.
   *
   * @private
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();

      if (task) {
        await this.processTranscriptionTask(task);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Maximum number of retry attempts before permanently failing.
   * "Three Strikes" rule - prevents infinite retry loops.
   */
  private static readonly MAX_RETRY_COUNT = 3;

  /**
   * @brief Manages the full lifecycle of a single transcription task, processing in chunks.
   *
   * This method first transcribes audio to raw text (unless checkpointed rawText exists).
   * It then splits the text into manageable chunks, refines each chunk individually, 
   * and reassembles them into a final, polished transcription with a single title.
   * 
   * Features:
   * - Idempotency: Checks for existing externalJobId to resume without re-uploading
   * - Checkpointing: Saves rawText immediately after STT completes
   * - Three Strikes: Stops retrying after MAX_RETRY_COUNT attempts
   *
   * @private
   * @param task The individual transcription task to process.
   * @returns A promise that resolves when the task is fully processed.
   */
  private async processTranscriptionTask(task: TranscriptionTask): Promise<void> {
    let rawTranscription: string = task.existingRawText || '';

    try {
      console.log(`[TranscriptionService] Starting processing for entry ${task.entryId}`);
      console.log(`[TranscriptionService] Existing raw text: ${rawTranscription ? 'yes (' + rawTranscription.length + ' chars)' : 'no'}`);
      console.log(`[TranscriptionService] Existing stage: ${task.existingStage || 'none'}`);
      
      // Step 1: Transcribe audio with AssemblyAI (skip if we have checkpointed rawText)
      if (!rawTranscription.trim()) {
        task.onProgress(task.entryId, 'transcribing');
        console.log(`[TranscriptionService] Starting AssemblyAI transcription...`);
        
        try {
          // IDEMPOTENCY CHECK: Look up entry to see if we already have an external job ID
          const entry = await databaseService.getEntry(task.entryId);
          
          if (entry?.externalJobId) {
            // Try to resume polling for existing job (saves money if it works!)
            console.log(`[TranscriptionService] IDEMPOTENCY: Found existing job ID ${entry.externalJobId}, attempting to resume...`);
            
            try {
              rawTranscription = await speechService.resumeTranscription(entry.externalJobId);
              console.log(`[TranscriptionService] Successfully resumed from existing job ID`);
            } catch (resumeError) {
              // Stale job ID - clear it and fall through to fresh transcription
              console.warn(`[TranscriptionService] Failed to resume job ${entry.externalJobId}, starting fresh:`, resumeError);
              await databaseService.updateEntry(task.entryId, {
                externalJobId: undefined
              });
              
              // Fall through to fresh transcription below
              const result = await speechService.transcribeAudioWithId(task.audioUri, task.audioDurationSeconds);
              console.log(`[TranscriptionService] Saving new external job ID: ${result.transcriptId}`);
              await databaseService.updateEntry(task.entryId, {
                externalJobId: result.transcriptId
              });
              rawTranscription = result.text;
            }
          } else {
            // Fresh transcription - upload and create new job
            console.log(`[TranscriptionService] No existing job ID, starting fresh transcription...`);
            const result = await speechService.transcribeAudioWithId(task.audioUri, task.audioDurationSeconds);
            
            // SAVE JOB ID IMMEDIATELY for crash recovery
            // This is a checkpoint - if we crash after this, we can resume without re-uploading
            console.log(`[TranscriptionService] Saving external job ID: ${result.transcriptId}`);
            await databaseService.updateEntry(task.entryId, {
              externalJobId: result.transcriptId
            });
            
            rawTranscription = result.text;
          }
          
          console.log(`[TranscriptionService] AssemblyAI completed. Raw text length: ${rawTranscription.length}`);
          
          if (!rawTranscription.trim()) {
            throw new Error('No transcription returned from AssemblyAI');
          }

          // CHECKPOINT: Save rawText to database immediately after STT completes
          // Also clear the externalJobId since STT is complete
          console.log(`[TranscriptionService] Checkpointing: saving rawText and clearing job ID...`);
          await databaseService.updateEntry(task.entryId, {
            rawText: rawTranscription,
            processingStage: 'refining',
            externalJobId: undefined, // Clear - STT complete, no longer needed
            lastError: undefined // Clear any previous errors
          });
          console.log(`[TranscriptionService] Checkpoint saved successfully`);

        } catch (transcriptionError) {
          console.error(`[TranscriptionService] AssemblyAI transcription failed:`, transcriptionError);
          
          // THREE STRIKES: Check retry count before giving up
          const entry = await databaseService.getEntry(task.entryId);
          const currentRetryCount = (entry?.retryCount || 0) + 1;
          const errorMessage = transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error';
          
          // Update retry count and error in DB
          await databaseService.updateEntry(task.entryId, {
            retryCount: currentRetryCount,
            lastError: errorMessage
          });
          
          console.log(`[TranscriptionService] Retry count: ${currentRetryCount}/${TranscriptionService.MAX_RETRY_COUNT}`);
          
          // Check if it's a file-related error (not retryable at all)
          const isFileError = transcriptionError instanceof SpeechServiceFileError;
          
          // Determine if we should give up
          const shouldGiveUp = isFileError || currentRetryCount >= TranscriptionService.MAX_RETRY_COUNT;
          
          if (shouldGiveUp) {
            const processingStage = isFileError ? 'audio_unavailable' : 'transcribing_failed';
            const userMessage = isFileError 
              ? 'Audio file is unavailable or corrupted. Please record a new entry.'
              : `Transcription failed after ${currentRetryCount} attempts. Please try re-recording.`;
            
            console.log(`[TranscriptionService] Giving up on entry ${task.entryId}: ${isFileError ? 'File error (not retryable)' : 'Max retries reached'}`);
            
            // Clean up and fail permanently
            await databaseService.updateEntry(task.entryId, {
              externalJobId: undefined // Clear job ID on permanent failure
            });
            
            task.onComplete(
              task.entryId, 
              {
                rawTranscription: '',
                refinedTranscription: userMessage,
                aiGeneratedTitle: `Entry - ${new Date().toLocaleDateString()}`,
                processingStage
              }, 
              'failed',
            );
            
            return;
          }
          
          // Not giving up yet - mark as failed so user can manually retry
          // (Don't rely on watchdog - it only runs at app startup)
          console.log(`[TranscriptionService] Entry ${task.entryId} failed (attempt ${currentRetryCount}/${TranscriptionService.MAX_RETRY_COUNT}), user can retry`);
          
          // Clear the stale job ID so next attempt starts fresh
          await databaseService.updateEntry(task.entryId, {
            externalJobId: undefined
          });
          
          task.onComplete(
            task.entryId, 
            {
              rawTranscription: '',
              refinedTranscription: `Transcription failed (attempt ${currentRetryCount}/${TranscriptionService.MAX_RETRY_COUNT}). Tap to retry.`,
              aiGeneratedTitle: `Entry - ${new Date().toLocaleDateString()}`,
              processingStage: 'transcribing_failed'
            }, 
            'failed',
          );
          
          return;
        }
      } else {
        console.log(`[TranscriptionService] Skipping STT step - using checkpointed rawText`);
      }

      // Step 2: Refine with Gemini text service
      task.onProgress(task.entryId, 'refining');
      console.log(`[TranscriptionService] Starting text refinement...`);

      const chunks = chunkText(rawTranscription);
      console.log(`[TranscriptionService] Processing ${chunks.length} chunks...`);
      
      const refinedChunks: string[] = [];
      let finalTitle = `Entry - ${new Date().toLocaleDateString()}`; //default title placeholder
      
      for (let i = 0; i < chunks.length; i++) {
        const isFirst = (i === 0);
        console.log(`[TranscriptionService] Refining chunk ${i + 1} of ${chunks.length} (isFirst: ${isFirst})...`);
        
        // Refine the current chunk
        const result = await textService.refineTranscription(chunks[i], isFirst);

        //capture title if first chunk
        if (isFirst && result.title) {
          finalTitle = result.title;
          console.log(`[TranscriptionService] Title captured: "${finalTitle}"`);
        }
        
        // Always add the refined text to our array
        refinedChunks.push(result.formattedText);
        console.log(`[TranscriptionService] Chunk ${i + 1} refinement complete.`);
      }

      // Join the refined chunks with double newlines for paragraph spacing
      const finalRefinedText = refinedChunks.join('\n\n');
      console.log(`[TranscriptionService] All chunks processed. Final text length: ${finalRefinedText.length}`);

      // Step 3: Return the complete, assembled result
      // Clean up job tracking fields on successful completion
      await databaseService.updateEntry(task.entryId, {
        externalJobId: undefined,
        lastError: undefined,
        retryCount: 0 // Reset for potential future re-transcriptions
      });
      
      const finalResult: TranscriptionResult = {
        rawTranscription: rawTranscription,
        refinedTranscription: finalRefinedText,
        aiGeneratedTitle: finalTitle,
        processingStage: 'completed'
      };

      console.log(`[TranscriptionService] Processing completed successfully for entry ${task.entryId}`);
      task.onComplete(task.entryId, finalResult, 'completed');

      // Non-blocking: trigger summary generation after successful transcription
      this.generateSummaryForEntry(task.entryId, finalRefinedText);

    } catch (error) {
      console.error(`[TranscriptionService] Unexpected error during processing for entry ${task.entryId}:`, error);
      
      // Determine if the failure happened during transcription or refinement
      const stageFailed = rawTranscription ? 'refining_failed' : 'transcribing_failed';
      const fallbackText = stageFailed === 'refining_failed' 
        ? rawTranscription // If refinement fails, we still have the raw text
        : `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

      // Save error info for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await databaseService.updateEntry(task.entryId, {
        lastError: errorMessage,
        externalJobId: undefined // Clean up on failure too
      });

      task.onComplete(task.entryId, {
        rawTranscription: rawTranscription, // Will be empty if transcription failed
        refinedTranscription: fallbackText, // Use raw text or an error message as a fallback
        aiGeneratedTitle: `Entry - ${new Date().toLocaleDateString()}`,
        processingStage: stageFailed
      }, stageFailed === 'transcribing_failed' ? 'failed' : 'completed'); // Mark 'completed' if we have usable text
    } finally {
      // Always remove from active set when task completes (success or failure)
      this.activeTaskIds.delete(task.entryId);
    }
  }

  /**
   * @brief Non-blocking summary generation after transcription completes.
   * Updates the entry's summary and summaryStatus fields.
   */
  private async generateSummaryForEntry(entryId: string, text: string): Promise<void> {
    try {
      console.log(`[TranscriptionService] Starting summary generation for entry ${entryId}`);
      await databaseService.updateEntry(entryId, { summaryStatus: 'generating' });

      const summary = await chatService.generateSummary(text);

      await databaseService.updateEntry(entryId, {
        summary,
        summaryStatus: 'completed',
      });
      console.log(`[TranscriptionService] Summary generated for entry ${entryId}`);
    } catch (error) {
      console.error(`[TranscriptionService] Summary generation failed for entry ${entryId}:`, error);
      await databaseService.updateEntry(entryId, { summaryStatus: 'failed' });
    }
  }

  /**
   * @brief Watchdog method to resume pending transcription tasks after app restart.
   * 
   * Queries the database for entries stuck in 'transcribing' or 'refining' state
   * and re-queues them for processing. Uses checkpointed rawText when available
   * to skip the expensive STT step.
   * 
   * @param onProgress Callback for progress updates
   * @param onComplete Callback for completion (success or failure)
   * @returns Promise that resolves when all pending tasks are queued (not completed)
   */
  async resumePendingTasks(
    onProgress: (entryId: string, stage: 'transcribing' | 'refining', progress?: number) => void,
    onComplete: (entryId: string, result: TranscriptionResult, status: 'completed' | 'failed') => void
  ): Promise<void> {
    try {
      console.log('[TranscriptionService] Watchdog: Checking for pending transcription tasks...');
      
      // Query for zombie entries stuck in processing states
      const pendingEntries = await databaseService.getEntriesByProcessingStage(['transcribing', 'refining']);
      
      if (pendingEntries.length === 0) {
        console.log('[TranscriptionService] Watchdog: No pending tasks found');
        return;
      }
      
      console.log(`[TranscriptionService] Watchdog: Found ${pendingEntries.length} pending task(s)`);
      
      for (const entry of pendingEntries) {
        // Skip entries without audio (shouldn't happen, but defensive coding)
        if (!entry.audioUri) {
          console.warn(`[TranscriptionService] Watchdog: Entry ${entry.id} has no audioUri, marking as audio_unavailable`);
          onComplete(entry.id, {
            rawTranscription: '',
            refinedTranscription: 'Audio file is unavailable. Please record a new entry.',
            aiGeneratedTitle: entry.title || `Entry - ${new Date().toLocaleDateString()}`,
            processingStage: 'audio_unavailable'
          }, 'failed');
          continue;
        }
        
        console.log(`[TranscriptionService] Watchdog: Resuming entry ${entry.id} (stage: ${entry.processingStage}, hasRawText: ${!!entry.rawText})`);
        
        // Queue the task with checkpointed data if available
        const added = this.addToQueue({
          entryId: entry.id,
          audioUri: entry.audioUri,
          audioDurationSeconds: entry.duration,
          existingRawText: entry.rawText, // Pass checkpointed rawText to skip STT
          existingStage: entry.processingStage as 'transcribing' | 'refining',
          onProgress,
          onComplete
        });
        
        if (added) {
          console.log(`[TranscriptionService] Watchdog: Entry ${entry.id} queued for resumption`);
        }
      }
      
      console.log('[TranscriptionService] Watchdog: All pending tasks have been queued');
    } catch (error) {
      console.error('[TranscriptionService] Watchdog: Error resuming pending tasks:', error);
    }
  }
}

// Create singleton instance
export const transcriptionService = new TranscriptionService(); 