import { databaseService } from '@/core/services/storage';
import { JournalEntry, JournalState } from '@/shared/types';
import { getAudioDirectory } from '@/shared/utils';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Cleanup orphaned audio files that don't belong to any entry
 */
export const cleanupOrphanedAudio = async (currentEntries: JournalEntry[]): Promise<void> => {
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
        console.log(`[stateLoader] Deleting orphaned audio file: ${filename}`);
        try {
          const fileUri = `${audioDir}${filename}`;
          await FileSystem.deleteAsync(fileUri);
        } catch (deleteError) {
          console.error(`[stateLoader] Failed to delete ${filename}:`, deleteError);
        }
      }
    }
  } catch (error) {
    console.error('[stateLoader] Error during orphaned audio cleanup:', error);
  }
};

/**
 * Load the current application state from the database
 */
export const loadState = async (): Promise<JournalState> => {
  try {
    const appState = await databaseService.getAppState();
    console.log(`[stateLoader] Loaded ${appState.entries.length} entries`);
    
    // Run cleanup after loading the state to remove orphaned audio files
    await cleanupOrphanedAudio(appState.entries);
    
    return appState;
  } catch (error) {
    console.error('[stateLoader] Failed to load state:', error);
    return { streak: 0, lastEntryISO: null, entries: [] };
  }
};

