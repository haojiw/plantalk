import { JournalEntry, JournalState } from '@/shared/types';

export interface SecureJournalContextType {
  state: JournalState;
  isLoading: boolean;
  isInitialized: boolean;
  addEntry: (entryData: Omit<JournalEntry, 'id'>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  updateEntry: (entryId: string, updates: Partial<JournalEntry>) => Promise<void>;
  updateEntryTranscription: (entryId: string, result: any, status: 'completed' | 'failed') => void;
  updateEntryProgress: (entryId: string, stage: 'transcribing' | 'refining') => void;
  retranscribeEntry: (entry: JournalEntry) => void;
  getDaysSinceLastEntry: () => number;
  resetStreak: () => void;
  // Secure storage specific methods
  performHealthCheck: () => Promise<void>;
  createBackup: (includeAudio?: boolean) => Promise<void>;
  restoreFromBackup: (backupPath: string) => Promise<void>;
  getBackupList: () => Promise<any[]>;
  forceSync: () => Promise<void>;
  emergencyRecovery: () => Promise<{ success: boolean; message: string; entriesRecovered: number }>;
  runStorageDiagnostics: () => Promise<{
    success: boolean;
    results: {
      database: { status: string; details: string };
      secureStorage: { status: string; details: string };
      entries: { status: string; details: string };
      audioFiles: { status: string; details: string };
      backupSystem: { status: string; details: string };
      migration: { status: string; details: string };
    };
    summary: string;
  }>;
}

export interface DiagnosticsResult {
  success: boolean;
  results: {
    database: { status: string; details: string };
    secureStorage: { status: string; details: string };
    entries: { status: string; details: string };
    audioFiles: { status: string; details: string };
    backupSystem: { status: string; details: string };
    migration: { status: string; details: string };
  };
  summary: string;
}

export interface EmergencyRecoveryResult {
  success: boolean;
  message: string;
  entriesRecovered: number;
}

