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

class TranscriptionService {
  private queue: TranscriptionTask[] = [];
  private isProcessing = false;

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
    try {
      console.log(`[TranscriptionService] Starting processing for entry ${task.entryId}`);
      
      // Step 1: Transcribe audio with Gemini
      task.onProgress(task.entryId, 'transcribing');
      console.log(`[TranscriptionService] Starting Gemini transcription...`);
      
      let rawTranscription: string;
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
      
      try {
        const refined = await textService.refineTranscription(rawTranscription);
        console.log(`[TranscriptionService] Text refinement completed. Title: "${refined.title}"`);

        // Step 3: Return complete result
        const result: TranscriptionResult = {
          rawTranscription: rawTranscription,
          refinedTranscription: refined.formattedText,
          aiGeneratedTitle: refined.title,
          processingStage: 'completed'
        };

        console.log(`[TranscriptionService] Processing completed successfully for entry ${task.entryId}`);
        task.onComplete(task.entryId, result, 'completed');
      } catch (refinementError) {
        console.error(`[TranscriptionService] Text refinement failed:`, refinementError);
        
        // Handle refinement-specific failure - we still have the raw transcription
        task.onComplete(task.entryId, {
          rawTranscription: rawTranscription,
          refinedTranscription: rawTranscription, // Use raw text as fallback
          aiGeneratedTitle: `Entry - ${new Date().toLocaleDateString()}`,
          processingStage: 'refining_failed'
        }, 'completed'); // Still mark as completed since we have usable text
      }

    } catch (error) {
      console.error(`[TranscriptionService] Unexpected error processing entry ${task.entryId}:`, error);
      
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      task.onComplete(task.entryId, {
        rawTranscription: '',
        refinedTranscription: `Processing failed: ${errorMessage}. Please try again.`,
        aiGeneratedTitle: `Entry - ${new Date().toLocaleDateString()}`,
        processingStage: 'transcribing_failed'
      }, 'failed');
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