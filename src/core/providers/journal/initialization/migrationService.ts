import { backupService, databaseService, dataValidationService, secureStorageService } from '@/core/services/storage';
import { JournalState } from '@/shared/types';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

/**
 * Migrate data from old JSON-based storage to new secure storage
 */
export const performMigrationFromOldStorage = async (): Promise<void> => {
  try {
    // Check if migration has already been performed
    const migrationCompleted = await secureStorageService.getSecureItem('migration_completed');
    if (migrationCompleted === 'true') {
      return; // Migration already done
    }

    console.log('[migrationService] Checking for legacy data to migrate...');
    
    // Try to import from old storage locations
    const oldEntriesPath = `${FileSystem.documentDirectory}entries.json`;

    // Check if old data exists
    const oldDataExists = await FileSystem.getInfoAsync(oldEntriesPath);
    
    if (oldDataExists.exists) {
      console.log('[migrationService] Found legacy data, starting migration...');
      
      try {
        // Read old entries
        const oldDataContent = await FileSystem.readAsStringAsync(oldEntriesPath);
        const oldState: JournalState = JSON.parse(oldDataContent);
        
        // Validate old data
        const validation = await dataValidationService.validateAppState(oldState);
        
        let entriesToMigrate = oldState.entries;
        
        // Fix entries if needed
        if (!validation.isValid && validation.fixable) {
          console.log('[migrationService] Fixing corrupted entries during migration...');
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
          
          console.log(`[migrationService] Successfully migrated ${entriesToMigrate.length} entries`);
          
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
        console.error('[migrationService] Migration failed:', migrationError);
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
    console.error('[migrationService] Migration check failed:', error);
  }
};

/**
 * Emergency recovery: force re-migration from old entries.json
 */
export const emergencyRecovery = async (): Promise<{ success: boolean; message: string; entriesRecovered: number }> => {
  try {
    console.log('[migrationService] Starting emergency recovery...');
    
    // Check if old entries.json exists
    const oldEntriesPath = `${FileSystem.documentDirectory}entries.json`;
    const oldDataExists = await FileSystem.getInfoAsync(oldEntriesPath);
    
    if (!oldDataExists.exists) {
      return {
        success: false,
        message: 'No legacy data found at entries.json. Your data may have been lost during migration.',
        entriesRecovered: 0
      };
    }
    
    // Read old entries
    const oldDataContent = await FileSystem.readAsStringAsync(oldEntriesPath);
    const oldState: JournalState = JSON.parse(oldDataContent);
    
    console.log(`[migrationService] Found ${oldState.entries.length} entries in legacy storage`);
    
    if (oldState.entries.length === 0) {
      return {
        success: false,
        message: 'Legacy file exists but contains 0 entries.',
        entriesRecovered: 0
      };
    }
    
    // Validate and fix entries if needed
    const validation = await dataValidationService.validateAppState(oldState);
    let entriesToRecover = oldState.entries;
    
    if (!validation.isValid && validation.fixable) {
      console.log('[migrationService] Fixing corrupted entries during recovery...');
      entriesToRecover = await Promise.all(
        oldState.entries.map(async (entry) => {
          const entryValidation = dataValidationService.validateEntry(entry);
          if (!entryValidation.isValid && entryValidation.fixable) {
            return await dataValidationService.fixEntry(entry);
          }
          return entry;
        })
      );
    }
    
    // Get current state to check for duplicates
    const currentState = await databaseService.getAppState();
    const currentIds = new Set(currentState.entries.map(e => e.id));
    
    // Import entries that don't already exist
    let recoveredCount = 0;
    for (const entry of entriesToRecover) {
      if (!currentIds.has(entry.id)) {
        await databaseService.addEntry(entry);
        recoveredCount++;
      }
    }
    
    // Update app state with the most recent data
    const allEntries = [...currentState.entries, ...entriesToRecover.filter(e => !currentIds.has(e.id))];
    const sortedEntries = allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sortedEntries.length > 0) {
      await databaseService.updateAppState({
        streak: oldState.streak || currentState.streak,
        lastEntryISO: sortedEntries[0].date
      });
    }
    
    // Mark migration as completed
    await secureStorageService.setSecureItem('migration_completed', 'true');
    
    // Create backup after recovery
    await backupService.createCompleteBackup(false);
    
    console.log(`[migrationService] Emergency recovery completed: ${recoveredCount} entries recovered`);
    
    return {
      success: true,
      message: `Successfully recovered ${recoveredCount} entries from legacy storage.`,
      entriesRecovered: recoveredCount
    };
    
  } catch (error) {
    console.error('[migrationService] Emergency recovery failed:', error);
    return {
      success: false,
      message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      entriesRecovered: 0
    };
  }
};

