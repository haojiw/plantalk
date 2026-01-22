import { transcriptionService } from '@/core/services/ai';
import { databaseService, dataValidationService } from '@/core/services/storage';
import { JournalEntry, JournalState } from '@/shared/types';
import { getAbsoluteAudioPath, getRelativeAudioPath } from '@/shared/utils';
import * as FileSystem from 'expo-file-system/legacy';
import { ensureAudioDirectoryExists } from '../initialization/initializeServices';

/**
 * Move audio file from temporary cache to permanent storage
 * Returns RELATIVE path (e.g., "audio/audio_123.m4a") to survive app updates
 */
export const moveAudioToPermanentStorage = async (tempAudioUri: string): Promise<string> => {
  try {
    await ensureAudioDirectoryExists();
    const filename = `audio_${Date.now()}.m4a`;
    const relativePath = `audio/${filename}`;
    const absolutePath = getAbsoluteAudioPath(relativePath)!;
    
    await FileSystem.moveAsync({
      from: tempAudioUri,
      to: absolutePath,
    });
    
    console.log(`[entryOperations] Moved audio file from ${tempAudioUri} to ${absolutePath}`);
    console.log(`[entryOperations] Storing relative path: ${relativePath}`);
    
    return relativePath; // Return relative path for database storage
  } catch (error) {
    console.error('[entryOperations] Error moving audio file:', error);
    // Return relative path of temp URI if move fails
    return getRelativeAudioPath(tempAudioUri) || tempAudioUri;
  }
};

/**
 * Calculate days since last entry
 */
export const getDaysSinceLastEntry = (lastEntryISO: string | null): number => {
  if (!lastEntryISO) return 0;
  
  const lastEntry = new Date(lastEntryISO);
  const today = new Date();
  const diffTime = today.getTime() - lastEntry.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Calculate new streak based on entry date and current state
 */
const calculateNewStreak = (entryDate: string, currentStreak: number, lastEntryISO: string | null): number => {
  const today = new Date().toISOString().split('T')[0];
  const isToday = entryDate.split('T')[0] === today;
  const daysSince = getDaysSinceLastEntry(lastEntryISO);
  
  let newStreak = currentStreak;
  
  if (isToday && (!lastEntryISO || daysSince >= 1)) {
    if (daysSince === 1) {
      newStreak = currentStreak + 1;
    } else if (daysSince === 0) {
      newStreak = currentStreak;
    } else {
      newStreak = 1;
    }
  }
  
  return newStreak;
};

/**
 * Add a new entry to the journal
 */
export const addEntry = async (
  entryData: Omit<JournalEntry, 'id'>,
  currentState: JournalState,
  onProgress: (entryId: string, stage: 'transcribing' | 'refining') => void,
  onComplete: (entryId: string, result: any, status: 'completed' | 'failed') => void
): Promise<void> => {
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
    const newStreak = calculateNewStreak(entryData.date, currentState.streak, currentState.lastEntryISO);

    // Update app state
    await databaseService.updateAppState({
      lastEntryISO: entryData.date,
      streak: newStreak
    });

    // Start transcription if needed
    // Note: text and rawText start empty - UI uses processingStage to show status
    if (newEntry.audioUri && (!newEntry.text || newEntry.text.trim() === '')) {
      newEntry.processingStage = 'transcribing';
      
      await databaseService.updateEntry(newEntry.id, {
        processingStage: 'transcribing'
      });
      
      // Start background transcription
      transcriptionService.addToQueue({
        entryId: newEntry.id,
        audioUri: newEntry.audioUri,
        audioDurationSeconds: newEntry.duration,
        onProgress,
        onComplete
      });
    }
    
    console.log(`[entryOperations] Added entry: ${newEntry.id}`);
  } catch (error) {
    console.error('[entryOperations] Failed to add entry:', error);
    throw error;
  }
};

/**
 * Delete an entry and its associated audio file
 */
export const deleteEntry = async (entryId: string): Promise<void> => {
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
            console.log(`[entryOperations] Deleted audio file: ${absolutePath}`);
          }
        }
      } catch (audioError) {
        console.error('[entryOperations] Error deleting audio file:', audioError);
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
    
    console.log(`[entryOperations] Deleted entry: ${entryId}`);
  } catch (error) {
    console.error('[entryOperations] Failed to delete entry:', error);
    throw error;
  }
};

/**
 * Update an existing entry
 */
export const updateEntry = async (entryId: string, updates: Partial<JournalEntry>): Promise<void> => {
  try {
    await databaseService.updateEntry(entryId, updates);
    console.log(`[entryOperations] Updated entry: ${entryId}`);
  } catch (error) {
    console.error('[entryOperations] Failed to update entry:', error);
    throw error;
  }
};

/**
 * Update entry with transcription results
 */
export const updateEntryTranscription = async (entryId: string, result: any, status: 'completed' | 'failed'): Promise<void> => {
  try {
    await databaseService.updateEntry(entryId, {
      title: result.aiGeneratedTitle,
      text: result.refinedTranscription,
      rawText: result.rawTranscription,
      processingStage: result.processingStage,
    });
  } catch (error) {
    console.error('[entryOperations] Failed to update entry transcription:', error);
  }
};

/**
 * Update entry processing progress
 */
export const updateEntryProgress = async (entryId: string, stage: 'transcribing' | 'refining'): Promise<void> => {
  try {
    await databaseService.updateEntry(entryId, { processingStage: stage });
  } catch (error) {
    console.error('[entryOperations] Failed to update entry progress:', error);
  }
};

/**
 * Queue an entry for retranscription using "Clean Slate" strategy.
 * 
 * Two-Phase Commit:
 * 1. Wipe existing data in DB (prevents zombie transcripts on crash)
 * 2. Only then add to processing queue
 */
export const retranscribeEntry = async (
  entry: JournalEntry,
  onProgress: (entryId: string, stage: 'transcribing' | 'refining') => void,
  onComplete: (entryId: string, result: any, status: 'completed' | 'failed') => void
): Promise<void> => {
  if (!entry.audioUri) {
    console.error('[entryOperations] Cannot retranscribe entry without audio');
    throw new Error('Cannot retranscribe entry without audio');
  }

  console.log('[entryOperations] Starting Clean Slate retranscription for entry:', entry.id);
  
  // Phase 1: The Wipe - Clear all transcription data in DB
  // This ensures if app crashes, watchdog will find a clean entry
  await databaseService.updateEntry(entry.id, {
    text: '',
    rawText: '',
    title: 'Processing...',
    processingStage: 'transcribing',
    retryCount: 0,
    externalJobId: undefined, // Clear any previous job ID
    lastError: undefined,
    // Note: Don't clear backupText - that's for manual refinement undo
  });
  
  console.log('[entryOperations] Phase 1 complete: DB wiped for entry:', entry.id);
  
  // Phase 2: The Queue - Add to transcription queue
  // Only runs if Phase 1 succeeds
  transcriptionService.addToQueue({
    entryId: entry.id,
    audioUri: entry.audioUri,
    audioDurationSeconds: entry.duration,
    onProgress,
    onComplete,
  });
  
  console.log('[entryOperations] Phase 2 complete: Entry queued for transcription:', entry.id);
};

