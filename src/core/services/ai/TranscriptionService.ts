import { getTotalDiskCapacityAsync } from 'expo-file-system/legacy';
import { speechService } from './SpeechService';
import { textService } from './TextService';

interface TranscriptionTask {
  entryId: string;
  audioUri: string;
  audioDurationSeconds?: number; // Audio duration in seconds for dynamic timeout calculation
  onProgress: (entryId: string, stage: 'transcribing' | 'refining', progress?: number) => void;
  onComplete: (entryId: string, result: TranscriptionResult, status: 'completed' | 'failed') => void;
}

interface TranscriptionResult {
  rawTranscription: string;
  refinedTranscription: string;
  aiGeneratedTitle: string;
  processingStage?: 'transcribing' | 'refining' | 'transcribing_failed' | 'refining_failed' | 'completed';
}

function chunkText(text: string, chunkSizeInWords: number = 1000): string[] { //split into chunkSizeInWords number of words
  const words = text.split(/(\s+)/).filter(w => w.trim().length > 0);
  const chunks: string[] = [];
  if (words.length === 0) return [];

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

class TranscriptionService {
  private queue: TranscriptionTask[] = [];
  private isProcessing = false;

  // im just very excited about this new monitor i got

  // Add a transcription task to the queue
  addToQueue(task: TranscriptionTask) {
    this.queue.push(task);
    this.processQueue();
  }

  // Process the transcription queue
  private async processQueue() {
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

  // Process a single transcription task through the complete pipeline
  private async processTranscriptionTask(task: TranscriptionTask): Promise<void> {
    let rawTranscription: string = '';

    try {
      console.log(`[TranscriptionService] Starting processing for entry ${task.entryId}`);
      
      // Step 1: Transcribe audio with Gemini
      task.onProgress(task.entryId, 'transcribing');
      console.log(`[TranscriptionService] Starting Gemini transcription...`);
      
      try {
        rawTranscription = await speechService.transcribeAudio(task.audioUri, task.audioDurationSeconds);
        console.log(`[TranscriptionService] Gemini completed. Raw text length: ${rawTranscription.length}`);
        
        if (!rawTranscription.trim()) {
          throw new Error('No transcription returned from Gemini');
        }
      } catch (transcriptionError) {
        console.error(`[TranscriptionService] Gemini transcription failed:`, transcriptionError);
        
        // Handle transcription-specific failure
        task.onComplete(task.entryId, {
          rawTranscription: '',
          refinedTranscription: `Transcription failed: ${transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'}. Please try again.`,
          aiGeneratedTitle: `Entry - ${new Date().toLocaleDateString()}`,
          processingStage: 'transcribing_failed'
        }, 'failed');
        return;
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
      const finalResult: TranscriptionResult = {
        rawTranscription: rawTranscription,
        refinedTranscription: finalRefinedText,
        aiGeneratedTitle: finalTitle,
        processingStage: 'completed'
      };

      console.log(`[TranscriptionService] Processing completed successfully for entry ${task.entryId}`);
      task.onComplete(task.entryId, finalResult, 'completed');

    } catch (error) {
      console.error(`[TranscriptionService] Unexpected error during processing for entry ${task.entryId}:`, error);
      
      // Determine if the failure happened during transcription or refinement
      const stageFailed = rawTranscription ? 'refining_failed' : 'transcribing_failed';
      const fallbackText = stageFailed === 'refining_failed' 
        ? rawTranscription // If refinement fails, we still have the raw text
        : `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

      //moved reuse here
      task.onComplete(task.entryId, {
        rawTranscription: rawTranscription, // Will be empty if transcription failed
        refinedTranscription: fallbackText, // Use raw text or an error message as a fallback
        aiGeneratedTitle: `Entry - ${new Date().toLocaleDateString()}`,
        processingStage: stageFailed
      }, stageFailed === 'transcribing_failed' ? 'failed' : 'completed'); // Mark 'completed' if we have usable text
    }
  }

  // Legacy method for backwards compatibility (now uses mock data)
  private generateMockTranscription(): string {
    const mockTranscriptions = [
      "Today I reflected on my journey and realized how much I've grown. The challenges I faced last week taught me valuable lessons about resilience and patience. I'm grateful for the small moments of joy that helped me through difficult times.",
      "I had an interesting conversation with a friend today that made me think about what really matters in life. Sometimes the most meaningful discussions happen spontaneously, when we're just being present with each other.",
      "The weather was beautiful this morning, and I took a moment to appreciate the changing seasons. There's something peaceful about watching nature's rhythms and feeling connected to something larger than myself.",
      "I've been working on a new project that's both challenging and exciting. It's reminding me how much I enjoy learning new things and pushing beyond my comfort zone.",
      "Spent some time journaling about my goals and dreams today. It's amazing how writing things down can help clarify what's truly important and what steps I want to take next."
    ];
    
    return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
  }

  // Development method to test with mock data
  async addMockTranscriptionToQueue(task: Omit<TranscriptionTask, 'onProgress'> & { 
    onComplete: (entryId: string, transcription: string, status: 'completed' | 'failed') => void 
  }) {
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockText = this.generateMockTranscription();
      task.onComplete(task.entryId, mockText, 'completed');
    } catch (error) {
      console.error('Mock transcription failed:', error);
      task.onComplete(task.entryId, 'Mock transcription failed. Please try again.', 'failed');
    }
  }
}

// Create singleton instance
export const transcriptionService = new TranscriptionService(); 