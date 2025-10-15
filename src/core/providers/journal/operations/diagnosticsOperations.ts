import { backupService, databaseService, dataValidationService, secureStorageService } from '@/core/services/storage';
import { JournalState } from '@/shared/types';
import { getAbsoluteAudioPath, isRelativePath } from '@/shared/utils';
import * as FileSystem from 'expo-file-system/legacy';
import { DiagnosticsResult } from '../types';

/**
 * Run comprehensive storage diagnostics
 */
export const runStorageDiagnostics = async (): Promise<DiagnosticsResult> => {
  const results = {
    database: { status: '', details: '' },
    secureStorage: { status: '', details: '' },
    entries: { status: '', details: '' },
    audioFiles: { status: '', details: '' },
    backupSystem: { status: '', details: '' },
    migration: { status: '', details: '' },
  };

  try {
    // 1. Database Connection Test
    console.log('[Diagnostics] Testing database connection...');
    try {
      const appState = await databaseService.getAppState();
      results.database.status = '✅ Pass';
      results.database.details = `Connected. ${appState.entries.length} entries found, streak: ${appState.streak}`;
    } catch (error) {
      results.database.status = '❌ Fail';
      results.database.details = `Cannot read database: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // 2. Secure Storage Test
    console.log('[Diagnostics] Testing secure storage...');
    try {
      const isAvailable = await secureStorageService.isAvailable();
      if (isAvailable) {
        // Test write
        const testKey = 'diagnostic_test_key';
        const testValue = `test_${Date.now()}`;
        await secureStorageService.setSecureItem(testKey, testValue);
        
        // Test read
        const readValue = await secureStorageService.getSecureItem(testKey);
        
        // Cleanup
        await secureStorageService.removeSecureItem(testKey);
        
        if (readValue === testValue) {
          results.secureStorage.status = '✅ Pass';
          results.secureStorage.details = 'Read/write operations successful';
        } else {
          results.secureStorage.status = '⚠️ Warning';
          results.secureStorage.details = 'Read value does not match written value';
        }
      } else {
        results.secureStorage.status = '❌ Fail';
        results.secureStorage.details = 'Secure storage not available on this device';
      }
    } catch (error) {
      results.secureStorage.status = '❌ Fail';
      results.secureStorage.details = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // 3. Entries Validation Test
    console.log('[Diagnostics] Validating entries...');
    try {
      const appState = await databaseService.getAppState();
      const validationResult = await dataValidationService.validateAppState(appState);
      
      if (validationResult.isValid) {
        results.entries.status = '✅ Pass';
        results.entries.details = `All ${appState.entries.length} entries are valid`;
      } else if (validationResult.fixable) {
        results.entries.status = '⚠️ Warning';
        results.entries.details = `Found fixable issues: ${validationResult.errors.join(', ')}`;
      } else {
        results.entries.status = '❌ Fail';
        results.entries.details = `Critical issues: ${validationResult.errors.join(', ')}`;
      }
    } catch (error) {
      results.entries.status = '❌ Fail';
      results.entries.details = `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // 4. Audio Files Test
    console.log('[Diagnostics] Checking audio files...');
    try {
      const appState = await databaseService.getAppState();
      const entriesWithAudio = appState.entries.filter(e => e.audioUri);
      
      let existingFiles = 0;
      let missingFiles = 0;
      let relativePathCount = 0;
      
      for (const entry of entriesWithAudio) {
        if (entry.audioUri) {
          // Check if path is relative (correct format)
          if (isRelativePath(entry.audioUri)) {
            relativePathCount++;
          }
          
          // Check if file exists
          const absolutePath = getAbsoluteAudioPath(entry.audioUri);
          if (absolutePath) {
            const fileInfo = await FileSystem.getInfoAsync(absolutePath);
            if (fileInfo.exists) {
              existingFiles++;
            } else {
              missingFiles++;
            }
          } else {
            missingFiles++;
          }
        }
      }
      
      if (missingFiles === 0) {
        results.audioFiles.status = '✅ Pass';
        results.audioFiles.details = `${existingFiles}/${entriesWithAudio.length} audio files found (${relativePathCount} using relative paths)`;
      } else if (existingFiles > 0) {
        results.audioFiles.status = '⚠️ Warning';
        results.audioFiles.details = `${existingFiles} files exist, ${missingFiles} missing`;
      } else {
        results.audioFiles.status = '❌ Fail';
        results.audioFiles.details = `All ${missingFiles} audio files are missing`;
      }
    } catch (error) {
      results.audioFiles.status = '❌ Fail';
      results.audioFiles.details = `Error checking files: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // 5. Backup System Test
    console.log('[Diagnostics] Testing backup system...');
    try {
      const backups = await backupService.getAvailableBackups();
      results.backupSystem.status = '✅ Pass';
      results.backupSystem.details = `Backup system operational. ${backups.length} backup(s) available`;
    } catch (error) {
      results.backupSystem.status = '⚠️ Warning';
      results.backupSystem.details = `Cannot list backups: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // 6. Migration Status Test
    console.log('[Diagnostics] Checking migration status...');
    try {
      const migrationCompleted = await secureStorageService.getSecureItem('migration_completed');
      const oldEntriesPath = `${FileSystem.documentDirectory}entries.json`;
      const oldDataExists = await FileSystem.getInfoAsync(oldEntriesPath);
      
      if (migrationCompleted === 'true') {
        if (oldDataExists.exists) {
          // Read old file to see how many entries
          const oldContent = await FileSystem.readAsStringAsync(oldEntriesPath);
          const oldState: JournalState = JSON.parse(oldContent);
          results.migration.status = '⚠️ Warning';
          results.migration.details = `Migration completed, but old file still exists with ${oldState.entries.length} entries`;
        } else {
          results.migration.status = '✅ Pass';
          results.migration.details = 'Migration completed, old file removed';
        }
      } else {
        if (oldDataExists.exists) {
          results.migration.status = '❌ Fail';
          results.migration.details = 'Migration not completed, old file exists';
        } else {
          results.migration.status = '✅ Pass';
          results.migration.details = 'No migration needed (fresh install)';
        }
      }
    } catch (error) {
      results.migration.status = '⚠️ Warning';
      results.migration.details = `Cannot check migration: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Generate summary
    const passCount = Object.values(results).filter(r => r.status.includes('✅')).length;
    const warnCount = Object.values(results).filter(r => r.status.includes('⚠️')).length;
    const failCount = Object.values(results).filter(r => r.status.includes('❌')).length;
    
    let summary = '';
    if (failCount === 0 && warnCount === 0) {
      summary = '🎉 All tests passed! Storage system is healthy.';
    } else if (failCount === 0) {
      summary = `⚠️ ${passCount} passed, ${warnCount} warnings. System is functional with minor issues.`;
    } else {
      summary = `❌ ${failCount} critical failures, ${warnCount} warnings, ${passCount} passed. Action required.`;
    }

    console.log('[Diagnostics] Complete:', summary);
    
    return {
      success: failCount === 0,
      results,
      summary
    };
    
  } catch (error) {
    console.error('[Diagnostics] Fatal error:', error);
    return {
      success: false,
      results,
      summary: `Fatal error during diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

