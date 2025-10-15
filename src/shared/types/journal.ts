export interface JournalEntry {
    id: string;
    date: string; // ISO date string
    title: string;
    text: string; // This will be the refined transcription
    rawText?: string; // Original Whisper output
    audioUri?: string;
    duration?: number; // in seconds
    processingStage?: 'transcribing' | 'refining' | 'completed' | 'transcribing_failed' | 'refining_failed';
  }
  
  export interface JournalState {
    streak: number; // consecutive days
    lastEntryISO: string | null; // ISO date string of last entry
    entries: JournalEntry[];
  }
  