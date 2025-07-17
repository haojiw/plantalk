interface TranscriptionTask {
  entryId: string;
  audioUri: string;
  onComplete: (entryId: string, transcription: string, status: 'completed' | 'failed') => void;
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
        await this.transcribeAudio(task);
      }
    }

    this.isProcessing = false;
  }

  // Simulate transcription (replace with actual API call)
  private async transcribeAudio(task: TranscriptionTask): Promise<void> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For now, use mock transcription. Replace this with actual API call
      const mockTranscription = this.generateMockTranscription();
      
      // TODO: Replace with actual transcription API call
      // const transcription = await this.callTranscriptionAPI(task.audioUri);
      
      task.onComplete(task.entryId, mockTranscription, 'completed');
    } catch (error) {
      console.error('Transcription failed:', error);
      task.onComplete(task.entryId, 'Transcription failed. Please try again.', 'failed');
    }
  }

  // Generate mock transcription for development
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

  // TODO: Implement actual transcription API call
  // private async callTranscriptionAPI(audioUri: string): Promise<string> {
  //   // Example implementation for a transcription service
  //   const formData = new FormData();
  //   formData.append('audio', {
  //     uri: audioUri,
  //     type: 'audio/m4a',
  //     name: 'recording.m4a'
  //   } as any);
  //
  //   const response = await fetch('YOUR_TRANSCRIPTION_API_ENDPOINT', {
  //     method: 'POST',
  //     body: formData,
  //     headers: {
  //       'Content-Type': 'multipart/form-data',
  //       'Authorization': 'Bearer YOUR_API_KEY'
  //     }
  //   });
  //
  //   const result = await response.json();
  //   return result.transcription;
  // }
}

// Create singleton instance
export const transcriptionService = new TranscriptionService(); 