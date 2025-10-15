import { backupService } from '@/core/services/storage';
import { Alert } from 'react-native';

/**
 * Perform a health check on the data
 */
export const performHealthCheck = async (): Promise<void> => {
  try {
    const { dataValidationService } = await import('@/core/services/storage');
    const healthCheck = await dataValidationService.performHealthCheck();
    
    if (!healthCheck.isHealthy) {
      Alert.alert(
        'Data Health Check',
        `Found ${healthCheck.issues.length} issues:\n${healthCheck.recommendations.join('\n')}`,
        [
          { 
            text: 'Run Auto-Fix', 
            onPress: async () => {
              const recovery = await dataValidationService.attemptRecovery();
              Alert.alert('Recovery Result', recovery.message);
            }
          },
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

/**
 * Create a backup of the journal data
 */
export const createBackup = async (includeAudio = false): Promise<void> => {
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

/**
 * Restore journal data from a backup
 */
export const restoreFromBackup = async (backupPath: string): Promise<void> => {
  try {
    await backupService.restoreFromBackup(backupPath);
    Alert.alert('Restore Complete', 'Your data has been restored from the backup.');
  } catch (error) {
    Alert.alert('Restore Error', `Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get a list of available backups
 */
export const getBackupList = async (): Promise<any[]> => {
  try {
    return await backupService.getAvailableBackups();
  } catch (error) {
    console.error('[backupOperations] Failed to get backup list:', error);
    return [];
  }
};

/**
 * Force a manual sync/backup
 */
export const forceSync = async (): Promise<void> => {
  try {
    await backupService.performAutoBackup();
    Alert.alert('Sync Complete', 'Data has been refreshed and backed up.');
  } catch (error) {
    Alert.alert('Sync Error', `Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

