import { backupService, databaseService, dataValidationService, secureStorageService } from '@/core/services/storage';
import { getAudioDirectory } from '@/shared/utils';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

/**
 * Ensure audio directory exists for storing audio files
 */
export const ensureAudioDirectoryExists = async (): Promise<void> => {
  try {
    const audioDir = getAudioDirectory();
    const dirInfo = await FileSystem.getInfoAsync(audioDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
    }
  } catch (error) {
    console.error('[initializeServices] Error creating audio directory:', error);
  }
};

/**
 * Initialize all secure storage services
 * Returns true if initialization was successful
 */
export const initializeServices = async (): Promise<boolean> => {
  try {
    console.log('[initializeServices] Initializing secure storage...');

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
        console.warn('[initializeServices] Recovery issues detected:', recovery.message);
        
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

    // Schedule auto backup
    await backupService.scheduleAutoBackup();

    console.log('[initializeServices] Secure storage initialized successfully');
    return true;
  } catch (error) {
    console.error('[initializeServices] Failed to initialize secure storage:', error);
    
    Alert.alert(
      'Storage Initialization Error',
      'There was an issue initializing secure storage. The app will work with limited functionality.',
      [{ text: 'OK' }]
    );
    
    return false;
  }
};

