export interface JournalEntry {
    id: string;
    date: string; // ISO date string
    title: string;
    text: string; // This will be the refined transcription
    rawText?: string; // Original Whisper output
    audioUri?: string;
    duration?: number; // in seconds
    processingStage?: 
      | 'transcribing' 
      | 'refining' 
      | 'completed' 
      | 'transcribing_failed' 
      | 'refining_failed'
      | 'audio_unavailable'; // Audio file missing/corrupted - not retryable
    
    // Robust pipeline fields
    retryCount?: number; // Tracks transcription retry attempts (max 3)
    externalJobId?: string; // AssemblyAI job ID for idempotent resume
    lastError?: string; // Last error message for debugging
    backupText?: string; // Previous text version for manual refinement "Undo"
    audioLevels?: number[]; // Normalized 0-1 amplitude samples for waveform display
  }
  
  export interface JournalState {
    streak: number; // consecutive days
    lastEntryISO: string | null; // ISO date string of last entry
    entries: JournalEntry[];
  }
  