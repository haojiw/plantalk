import { transcriptionService } from '@/core/services/ai';
import { JournalEntry, JournalState } from '@/shared/types';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { initializeServices } from './initialization/initializeServices';
import { emergencyRecovery as emergencyRecoveryOp, performMigrationFromOldStorage } from './initialization/migrationService';
import { loadState as loadStateOp } from './initialization/stateLoader';
import * as backupOps from './operations/backupOperations';
import * as diagnosticsOps from './operations/diagnosticsOperations';
import * as entryOps from './operations/entryOperations';
import * as streakOps from './operations/streakOperations';
import { SecureJournalContextType } from './types';

const SecureJournalContext = createContext<SecureJournalContextType | undefined>(undefined);

interface SecureJournalProviderProps {
  children: ReactNode;
}

export const SecureJournalProvider: React.FC<SecureJournalProviderProps> = ({ children }) => {
  const [state, setState] = useState<JournalState>({ streak: 0, lastEntryISO: null, entries: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize secure storage system
  useEffect(() => {
    initializeSecureStorage();
  }, []);

  const initializeSecureStorage = async () => {
    try {
      setIsLoading(true);

      // Initialize all services
      const success = await initializeServices();
      
      if (!success) {
        // Fall back to basic state
        setState({ streak: 0, lastEntryISO: null, entries: [] });
        return;
      }

      // Load current state
      const loadedState = await loadStateOp();
      setState(loadedState);

      // Perform migration from old storage if needed
      await performMigrationFromOldStorage();

      setIsInitialized(true);
      
      // WATCHDOG: Resume any pending transcription tasks that were interrupted
      // This handles crash recovery - entries stuck in 'transcribing' or 'refining' state
      console.log('[SecureJournalProvider] Starting transcription watchdog...');
      transcriptionService.resumePendingTasks(
        // onProgress callback - updates UI with current stage
        async (entryId: string, stage: 'transcribing' | 'refining') => {
          await entryOps.updateEntryProgress(entryId, stage);
          // Reload state to update UI
          const updatedState = await loadStateOp();
          setState(updatedState);
        },
        // onComplete callback - finalizes the entry with transcription results
        async (entryId: string, result: any, status: 'completed' | 'failed') => {
          await entryOps.updateEntryTranscription(entryId, result, status);
          // Reload state to update UI
          const updatedState = await loadStateOp();
          setState(updatedState);
        }
      );
    } catch (error) {
      console.error('[SecureJournalProvider] Initialization error:', error);
      setState({ streak: 0, lastEntryISO: null, entries: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const loadState = async () => {
    const loadedState = await loadStateOp();
    setState(loadedState);
  };

  // Entry operations
  const addEntry = async (entryData: Omit<JournalEntry, 'id'>): Promise<void> => {
    await entryOps.addEntry(
      entryData,
      state,
      updateEntryProgress,
      updateEntryTranscription
    );
      await loadState();
  };

  const deleteEntry = async (entryId: string) => {
    await entryOps.deleteEntry(entryId);
      await loadState();
  };

  const updateEntry = async (entryId: string, updates: Partial<JournalEntry>) => {
    await entryOps.updateEntry(entryId, updates);
      await loadState();
  };

  const updateEntryTranscription = async (entryId: string, result: any, status: 'completed' | 'failed') => {
    await entryOps.updateEntryTranscription(entryId, result, status);
      await loadState();
  };

  const updateEntryProgress = async (entryId: string, stage: 'transcribing' | 'refining') => {
    await entryOps.updateEntryProgress(entryId, stage);
      await loadState();
  };

  const retranscribeEntry = async (entry: JournalEntry): Promise<void> => {
    await entryOps.retranscribeEntry(entry, updateEntryProgress, updateEntryTranscription);
    await loadState(); // Refresh state after DB wipe
  };

  // Streak operations
  const getDaysSinceLastEntry = (): number => {
    return entryOps.getDaysSinceLastEntry(state.lastEntryISO);
  };

  const resetStreak = async () => {
    await streakOps.resetStreak();
      await loadState();
  };

  // Backup operations
  const performHealthCheck = async () => {
    await backupOps.performHealthCheck();
  };

  const createBackup = async (includeAudio = false) => {
    await backupOps.createBackup(includeAudio);
  };

  const restoreFromBackup = async (backupPath: string) => {
    await backupOps.restoreFromBackup(backupPath);
      await loadState();
  };

  const getBackupList = async () => {
    return await backupOps.getBackupList();
  };

  const forceSync = async () => {
      await loadState();
    await backupOps.forceSync();
  };

  // Diagnostics operations
  const runStorageDiagnostics = async () => {
    return await diagnosticsOps.runStorageDiagnostics();
  };

  const emergencyRecovery = async () => {
    const result = await emergencyRecoveryOp();
    if (result.success) {
      await loadState();
    }
    return result;
  };

  const contextValue: SecureJournalContextType = {
    state,
    isLoading,
    isInitialized,
    addEntry,
    deleteEntry,
    updateEntry,
    updateEntryTranscription,
    updateEntryProgress,
    retranscribeEntry,
    getDaysSinceLastEntry,
    resetStreak,
    performHealthCheck,
    createBackup,
    restoreFromBackup,
    getBackupList,
    forceSync,
    emergencyRecovery,
    runStorageDiagnostics,
  };

  return (
    <SecureJournalContext.Provider value={contextValue}>
      {children}
    </SecureJournalContext.Provider>
  );
};

export const useSecureJournal = (): SecureJournalContextType => {
  const context = useContext(SecureJournalContext);
  if (!context) {
    throw new Error('useSecureJournal must be used within a SecureJournalProvider');
  }
  return context;
};
