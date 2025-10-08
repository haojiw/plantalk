import { backupService } from '@/services/BackupService';
import { databaseService } from '@/services/DatabaseService';
import { dataValidationService } from '@/services/DataValidationService';
import { secureStorageService } from '@/services/SecureStorageService';
import { transcriptionService } from '@/services/TranscriptionService';
import { JournalEntry, JournalState } from '@/types/journal';
import { getAbsoluteAudioPath, getAudioDirectory, getRelativeAudioPath } from '@/utils/audioPath';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

interface SecureJournalContextType {
  state: JournalState;
  isLoading: boolean;
  isInitialized: boolean;
  addEntry: (entryData: Omit<JournalEntry, 'id'>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  updateEntry: (entryId: string, updates: Partial<JournalEntry>) => Promise<void>;
  updateEntryTranscription: (entryId: string, result: any, status: 'completed' | 'failed') => void;
  updateEntryProgress: (entryId: string, stage: 'transcribing' | 'refining') => void;
  getDaysSinceLastEntry: () => number;
  resetStreak: () => void;
  // Secure storage specific methods
  performHealthCheck: () => Promise<void>;
  createBackup: (includeAudio?: boolean) => Promise<void>;
  restoreFromBackup: (backupPath: string) => Promise<void>;
  getBackupList: () => Promise<any[]>;
  forceSync: () => Promise<void>;
}

const SecureJournalContext = createContext<SecureJournalContextType | undefined>(undefined);

interface SecureJournalProviderProps {
  children: ReactNode;
}

export const SecureJournalProvider: React.FC<SecureJournalProviderProps> = ({ children }) => {
  const [state, setState] = useState<JournalState>({ streak: 0, lastEntryISO: null, entries: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ensure audio directory exists
  const ensureAudioDirectoryExists = async () => {
    try {
      const audioDir = getAudioDirectory();
      const dirInfo = await FileSystem.getInfoAsync(audioDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
      }
    } catch (error) {
      console.error('[SecureJournalProvider] Error creating audio directory:', error);
    }
  };

  // Move audio file from temporary cache to permanent storage
  // Returns RELATIVE path (e.g., "audio/audio_123.m4a") to survive app updates
  const moveAudioToPermanentStorage = async (tempAudioUri: string): Promise<string> => {
    try {
      await ensureAudioDirectoryExists();
      const filename = `audio_${Date.now()}.m4a`;
      const relativePath = `audio/${filename}`;
      const absolutePath = getAbsoluteAudioPath(relativePath)!;
      
      await FileSystem.moveAsync({
        from: tempAudioUri,
        to: absolutePath,
      });
      
      console.log(`[SecureJournalProvider] Moved audio file from ${tempAudioUri} to ${absolutePath}`);
      console.log(`[SecureJournalProvider] Storing relative path: ${relativePath}`);
      
      return relativePath; // Return relative path for database storage
    } catch (error) {
      console.error('[SecureJournalProvider] Error moving audio file:', error);
      // Return relative path of temp URI if move fails
      return getRelativeAudioPath(tempAudioUri) || tempAudioUri;
    }
  };

  // Cleanup orphaned audio files
  const cleanupOrphanedAudio = async (currentEntries: JournalEntry[]) => {
    try {
      const audioDir = getAudioDirectory();
      const dirInfo = await FileSystem.getInfoAsync(audioDir);
      if (!dirInfo.exists) return; // No directory, no orphans

      const audioFiles = await FileSystem.readDirectoryAsync(audioDir);
      
      // Create set of valid relative filenames (e.g., "audio_123.m4a")
      const validFilenames = new Set(
        currentEntries
          .map(e => e.audioUri)
          .filter(Boolean)
          .map(uri => {
            // Extract just the filename from the relative path
            // e.g., "audio/audio_123.m4a" -> "audio_123.m4a"
            const parts = uri!.split('/');
            return parts[parts.length - 1];
          })
      );

      for (const filename of audioFiles) {
        if (!validFilenames.has(filename)) {
          console.log(`[SecureJournalProvider] Deleting orphaned audio file: ${filename}`);
          try {
            const fileUri = `${audioDir}${filename}`;
            await FileSystem.deleteAsync(fileUri);
          } catch (deleteError) {
            console.error(`[SecureJournalProvider] Failed to delete ${filename}:`, deleteError);
          }
        }
      }
    } catch (error) {
      console.error('[SecureJournalProvider] Error during orphaned audio cleanup:', error);
    }
  };

  // Initialize secure storage system
  useEffect(() => {
    initializeSecureStorage();
  }, []);

  // Schedule auto backups
  useEffect(() => {
    if (isInitialized) {
      scheduleAutoBackup();
    }
  }, [isInitialized]);

  const initializeSecureStorage = async () => {
    try {
      console.log('[SecureJournalProvider] Initializing secure storage...');
      setIsLoading(true);

      // Check if secure storage is available
      const isAvailable = await secureStorageService.isAvailable();
      if (!isAvailable) {
        throw new Error('Secure storage is not available on this device');
      }

      // Initialize all services
      await secureStorageService.initializeEncryption();
      await databaseService.initialize();
      await backupService.initialize();

      // Ensure audio directory exists
      await ensureAudioDirectoryExists();

      // Perform initial health check and recovery if needed
      const ENABLE_AUTO_RECOVERY = false; // Set to false
      if (ENABLE_AUTO_RECOVERY) {
        const recovery = await dataValidationService.attemptRecovery();
        if (!recovery.success) {
          console.warn('[SecureJournalProvider] Recovery issues detected:', recovery.message);
          
          // Show alert for critical issues
          if (recovery.message.includes('Critical') || recovery.message.includes('Manual intervention')) {
            Alert.alert(
              'Data Recovery Issue',
              recovery.message + '\n\nThe app will continue to work, but some data may be missing.',
              [{ text: 'OK' }]
            );
          }
        } else if (recovery.backupRestored) {
          Alert.alert(
            'Data Restored',
            'Your data has been restored from a backup due to corruption.',
            [{ text: 'OK' }]
          );
        }
      }

      // Load current state
      await loadState();

      // Perform migration from old storage if needed
      await performMigrationFromOldStorage();

      // Schedule auto backup
      await backupService.scheduleAutoBackup();

      setIsInitialized(true);
      console.log('[SecureJournalProvider] Secure storage initialized successfully');
    } catch (error) {
      console.error('[SecureJournalProvider] Failed to initialize secure storage:', error);
      
      // Fall back to basic state
      setState({ streak: 0, lastEntryISO: null, entries: [] });
      
      Alert.alert(
        'Storage Initialization Error',
        'There was an issue initializing secure storage. The app will work with limited functionality.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadState = async () => {
    try {
      const appState = await databaseService.getAppState();
      setState(appState);
      console.log(`[SecureJournalProvider] Loaded ${appState.entries.length} entries`);
      
      // Run cleanup after loading the state to remove orphaned audio files
      await cleanupOrphanedAudio(appState.entries);
    } catch (error) {
      console.error('[SecureJournalProvider] Failed to load state:', error);
      setState({ streak: 0, lastEntryISO: null, entries: [] });
    }
  };

  // Migrate data from old JSON-based storage to new secure storage
  const performMigrationFromOldStorage = async () => {
    try {
      // Check if migration has already been performed
      const migrationCompleted = await secureStorageService.getSecureItem('migration_completed');
      if (migrationCompleted === 'true') {
        return; // Migration already done
      }

      console.log('[SecureJournalProvider] Checking for legacy data to migrate...');
      
      // Try to import from old storage locations
      const FileSystem = await import('expo-file-system/legacy');
      const oldEntriesPath = `${FileSystem.documentDirectory}entries.json`;

      // Check if old data exists
      const oldDataExists = await FileSystem.getInfoAsync(oldEntriesPath);
      
      if (oldDataExists.exists) {
        console.log('[SecureJournalProvider] Found legacy data, starting migration...');
        
        try {
          // Read old entries
          const oldDataContent = await FileSystem.readAsStringAsync(oldEntriesPath);
          const oldState: JournalState = JSON.parse(oldDataContent);
          
          // Validate old data
          const validation = await dataValidationService.validateAppState(oldState);
          
          let entriesToMigrate = oldState.entries;
          
          // Fix entries if needed
          if (!validation.isValid && validation.fixable) {
            console.log('[SecureJournalProvider] Fixing corrupted entries during migration...');
            entriesToMigrate = await Promise.all(
              oldState.entries.map(async (entry) => {
                const entryValidation = dataValidationService.validateEntry(entry);
                if (!entryValidation.isValid && entryValidation.fixable) {
                  return await dataValidationService.fixEntry(entry);
                }
                return entry;
              })
            );
          }
          
          // Only migrate if we don't already have data
          const currentState = await databaseService.getAppState();
          if (currentState.entries.length === 0) {
            // Migrate entries to new storage
            for (const entry of entriesToMigrate) {
              await databaseService.addEntry(entry);
            }
            
            // Migrate app state
            await databaseService.updateAppState({
              streak: oldState.streak,
              lastEntryISO: oldState.lastEntryISO
            });
            
            console.log(`[SecureJournalProvider] Successfully migrated ${entriesToMigrate.length} entries`);
            
            // Create backup after migration
            await backupService.createCompleteBackup(false);
            
            Alert.alert(
              'Data Migration Complete',
              `Successfully migrated ${entriesToMigrate.length} entries to secure storage.`,
              [{ text: 'OK' }]
            );
          }
          
          // Mark migration as completed
          await secureStorageService.setSecureItem('migration_completed', 'true');
          
        } catch (migrationError) {
          console.error('[SecureJournalProvider] Migration failed:', migrationError);
          Alert.alert(
            'Migration Error',
            'Failed to migrate old data. Your existing data is safe, but you may need to manually export and import it.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // No old data found, mark migration as completed
        await secureStorageService.setSecureItem('migration_completed', 'true');
      }
    } catch (error) {
      console.error('[SecureJournalProvider] Migration check failed:', error);
    }
  };

  const scheduleAutoBackup = async () => {
    try {
      await backupService.scheduleAutoBackup();
    } catch (error) {
      console.error('[SecureJournalProvider] Auto backup scheduling failed:', error);
    }
  };

  // Calculate days since last entry
  const getDaysSinceLastEntry = (): number => {
    if (!state.lastEntryISO) return 0;
    
    const lastEntry = new Date(state.lastEntryISO);
    const today = new Date();
    const diffTime = today.getTime() - lastEntry.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Add a new entry
  const addEntry = async (entryData: Omit<JournalEntry, 'id'>): Promise<void> => {
    try {
      const newEntry: JournalEntry = {
        ...entryData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      };

      // Move audio file to permanent storage if present
      if (newEntry.audioUri) {
        newEntry.audioUri = await moveAudioToPermanentStorage(newEntry.audioUri);
      }

      // Validate entry before adding
      const validation = dataValidationService.validateEntry(newEntry);
      if (!validation.isValid) {
        if (validation.fixable) {
          const fixedEntry = await dataValidationService.fixEntry(newEntry);
          await databaseService.addEntry(fixedEntry);
        } else {
          throw new Error(`Invalid entry data: ${validation.errors.join(', ')}`);
        }
      } else {
        await databaseService.addEntry(newEntry);
      }

      // Update streak logic
      const today = new Date().toISOString().split('T')[0];
      const isToday = entryData.date.split('T')[0] === today;
      const daysSince = getDaysSinceLastEntry();
      
      let newStreak = state.streak;
      
      if (isToday && (!state.lastEntryISO || daysSince >= 1)) {
        if (daysSince === 1) {
          newStreak = state.streak + 1;
        } else if (daysSince === 0) {
          newStreak = state.streak;
        } else {
          newStreak = 1;
        }
      }

      // Update app state
      await databaseService.updateAppState({
        lastEntryISO: entryData.date,
        streak: newStreak
      });

      // Start transcription if needed
      if (newEntry.audioUri && (!newEntry.text || newEntry.text.trim() === '')) {
        newEntry.text = 'Processing...';
        newEntry.processingStage = 'transcribing';
        
        await databaseService.updateEntry(newEntry.id, {
          text: 'Processing...',
          processingStage: 'transcribing'
        });
        
        // Start background transcription
        transcriptionService.addToQueue({
          entryId: newEntry.id,
          audioUri: newEntry.audioUri,
          audioDurationSeconds: newEntry.duration,
          onProgress: (entryId: string, stage: 'transcribing' | 'refining') => {
            updateEntryProgress(entryId, stage);
          },
          onComplete: (entryId: string, result: any, status: 'completed' | 'failed') => {
            updateEntryTranscription(entryId, result, status);
          }
        });
      }

      // Reload state
      await loadState();
      
      console.log(`[SecureJournalProvider] Added entry: ${newEntry.id}`);
    } catch (error) {
      console.error('[SecureJournalProvider] Failed to add entry:', error);
      throw error;
    }
  };

  // Delete entry
  const deleteEntry = async (entryId: string) => {
    try {
      // Find the entry to get its audio URI before deletion
      const currentState = await databaseService.getAppState();
      const entryToDelete = currentState.entries.find(entry => entry.id === entryId);
      
      // Delete audio file if it exists
      if (entryToDelete?.audioUri) {
        try {
          const absolutePath = getAbsoluteAudioPath(entryToDelete.audioUri);
          if (absolutePath) {
            const fileInfo = await FileSystem.getInfoAsync(absolutePath);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(absolutePath);
              console.log(`[SecureJournalProvider] Deleted audio file: ${absolutePath}`);
            }
          }
        } catch (audioError) {
          console.error('[SecureJournalProvider] Error deleting audio file:', audioError);
          // Continue with entry deletion even if audio deletion fails
        }
      }
      
      await databaseService.deleteEntry(entryId);
      
      // Recalculate streak
      const updatedState = await databaseService.getAppState();
      if (updatedState.entries.length > 0) {
        const sortedEntries = [...updatedState.entries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        await databaseService.updateAppState({
          lastEntryISO: sortedEntries[0].date
        });
      } else {
        await databaseService.updateAppState({
          streak: 0,
          lastEntryISO: null
        });
      }
      
      await loadState();
      console.log(`[SecureJournalProvider] Deleted entry: ${entryId}`);
    } catch (error) {
      console.error('[SecureJournalProvider] Failed to delete entry:', error);
      throw error;
    }
  };

  // Update entry
  const updateEntry = async (entryId: string, updates: Partial<JournalEntry>) => {
    try {
      await databaseService.updateEntry(entryId, updates);
      await loadState();
      console.log(`[SecureJournalProvider] Updated entry: ${entryId}`);
    } catch (error) {
      console.error('[SecureJournalProvider] Failed to update entry:', error);
      throw error;
    }
  };

  const updateEntryTranscription = async (entryId: string, result: any, status: 'completed' | 'failed') => {
    try {
      await databaseService.updateEntry(entryId, {
        title: result.aiGeneratedTitle,
        text: result.refinedTranscription,
        rawText: result.rawTranscription,
        processingStage: result.processingStage,
      });
      await loadState();
    } catch (error) {
      console.error('[SecureJournalProvider] Failed to update entry transcription:', error);
    }
  };

  const updateEntryProgress = async (entryId: string, stage: 'transcribing' | 'refining') => {
    try {
      await databaseService.updateEntry(entryId, { processingStage: stage });
      await loadState();
    } catch (error) {
      console.error('[SecureJournalProvider] Failed to update entry progress:', error);
    }
  };

  const resetStreak = async () => {
    try {
      await databaseService.updateAppState({ streak: 0 });
      await loadState();
    } catch (error) {
      console.error('[SecureJournalProvider] Failed to reset streak:', error);
    }
  };

  // Secure storage specific methods
  const performHealthCheck = async () => {
    try {
      const healthCheck = await dataValidationService.performHealthCheck();
      
      if (!healthCheck.isHealthy) {
        Alert.alert(
          'Data Health Check',
          `Found ${healthCheck.issues.length} issues:\n${healthCheck.recommendations.join('\n')}`,
          [
            { text: 'Run Auto-Fix', onPress: async () => {
              const recovery = await dataValidationService.attemptRecovery();
              Alert.alert('Recovery Result', recovery.message);
              if (recovery.success) await loadState();
            }},
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Data Health Check', 'Your data is healthy!', [{ text: 'OK' }]);
      }
    } catch (error) {
      Alert.alert('Health Check Error', `Failed to perform health check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const createBackup = async (includeAudio = false) => {
    try {
      const backupPath = await backupService.createCompleteBackup(false);
      
      if (includeAudio) {
        await backupService.shareBackup(true);
      } else {
        await backupService.shareBackup(false);
      }
      
      Alert.alert('Backup Created', 'Your backup has been created and shared successfully.');
    } catch (error) {
      Alert.alert('Backup Error', `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const restoreFromBackup = async (backupPath: string) => {
    try {
      await backupService.restoreFromBackup(backupPath);
      await loadState();
      Alert.alert('Restore Complete', 'Your data has been restored from the backup.');
    } catch (error) {
      Alert.alert('Restore Error', `Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getBackupList = async () => {
    try {
      return await backupService.getAvailableBackups();
    } catch (error) {
      console.error('[SecureJournalProvider] Failed to get backup list:', error);
      return [];
    }
  };

  const forceSync = async () => {
    try {
      await loadState();
      await backupService.performAutoBackup();
      Alert.alert('Sync Complete', 'Data has been refreshed and backed up.');
    } catch (error) {
      Alert.alert('Sync Error', `Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    getDaysSinceLastEntry,
    resetStreak,
    performHealthCheck,
    createBackup,
    restoreFromBackup,
    getBackupList,
    forceSync,
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