import { JournalState } from '@/shared/types';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { databaseService } from './DatabaseService';
import { secureStorageService } from './SecureStorageService';

interface BackupMetadata {
  version: string;
  timestamp: string;
  deviceInfo: {
    platform: string;
    appVersion: string;
  };
  entryCount: number;
  audioFileCount: number;
  totalSize: number;
}

interface BackupManifest extends BackupMetadata {
  files: {
    database: string;
    audioFiles: string[];
    metadata: string;
  };
}

class BackupService {
  private static readonly BACKUP_VERSION = '1.0.0';
  private static readonly BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;
  private static readonly AUTO_BACKUP_DIR = `${BackupService.BACKUP_DIR}auto/`;
  private static readonly MANUAL_BACKUP_DIR = `${BackupService.BACKUP_DIR}manual/`;
  private static readonly MAX_AUTO_BACKUPS = 7; // Keep last 7 auto backups
  private static readonly MAX_MANUAL_BACKUPS = 20; // Keep last 20 manual backups

  // Initialize backup service
  async initialize(): Promise<void> {
    try {
      await this.ensureBackupDirectories();
      await this.cleanupOldBackups();
      console.log('[BackupService] Initialized successfully');
    } catch (error) {
      console.error('[BackupService] Failed to initialize:', error);
      throw error;
    }
  }

  // Create backup directories
  private async ensureBackupDirectories(): Promise<void> {
    await secureStorageService.createSecureDirectory(BackupService.BACKUP_DIR);
    await secureStorageService.createSecureDirectory(BackupService.AUTO_BACKUP_DIR);
    await secureStorageService.createSecureDirectory(BackupService.MANUAL_BACKUP_DIR);
  }

  // Create a complete backup (database + audio files)
  async createCompleteBackup(isAutomatic = false): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `backup-${timestamp}`;
      const backupDir = isAutomatic ? BackupService.AUTO_BACKUP_DIR : BackupService.MANUAL_BACKUP_DIR;
      const backupPath = `${backupDir}${backupId}/`;

      console.log(`[BackupService] Creating ${isAutomatic ? 'automatic' : 'manual'} backup: ${backupId}`);

      // Create backup directory
      await secureStorageService.createSecureDirectory(backupPath);

      // Get current app state
      const appState = await databaseService.getAppState();
      
      // Create database backup
      const dbBackupPath = `${backupPath}database.json`;
      await secureStorageService.createSecureBackup(dbBackupPath, appState);

      // Copy audio files
      const audioFiles: string[] = [];
      const audioBackupDir = `${backupPath}audio/`;
      await secureStorageService.createSecureDirectory(audioBackupDir);

      for (const entry of appState.entries) {
        if (entry.audioUri) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(entry.audioUri);
            if (fileInfo.exists) {
              const filename = entry.audioUri.split('/').pop() || `${entry.id}.m4a`;
              const backupAudioPath = `${audioBackupDir}${filename}`;
              await FileSystem.copyAsync({
                from: entry.audioUri,
                to: backupAudioPath
              });
              audioFiles.push(filename);
            }
          } catch (error) {
            console.warn(`[BackupService] Failed to backup audio for entry ${entry.id}:`, error);
          }
        }
      }

      // Calculate total backup size
      const totalSize = await this.calculateBackupSize(backupPath);

      // Create backup manifest
      const manifest: BackupManifest = {
        version: BackupService.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: require('expo-constants').default.platform?.ios ? 'ios' : 'android',
          appVersion: '1.0.0' // You can get this from app.config.js
        },
        entryCount: appState.entries.length,
        audioFileCount: audioFiles.length,
        totalSize,
        files: {
          database: 'database.json',
          audioFiles,
          metadata: 'manifest.json'
        }
      };

      await secureStorageService.setSecureFile(
        `${backupPath}manifest.json`,
        JSON.stringify(manifest, null, 2)
      );

      console.log(`[BackupService] Backup created successfully: ${backupId}`);
      return backupPath;
    } catch (error) {
      console.error('[BackupService] Failed to create complete backup:', error);
      throw error;
    }
  }

  // Create lightweight backup (database only, no audio)
  async createLightweightBackup(isAutomatic = true): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `lightweight-${timestamp}`;
      const backupDir = isAutomatic ? BackupService.AUTO_BACKUP_DIR : BackupService.MANUAL_BACKUP_DIR;
      const backupPath = `${backupDir}${backupId}.json`;

      console.log(`[BackupService] Creating lightweight backup: ${backupId}`);

      // Get current app state (without audio file copying)
      const appState = await databaseService.getAppState();
      
      // Create lightweight backup data
      const backupData = {
        version: BackupService.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        type: 'lightweight',
        entryCount: appState.entries.length,
        // Remove audio URIs from lightweight backup to save space
        data: {
          ...appState,
          entries: appState.entries.map(entry => ({
            ...entry,
            audioUri: undefined // Don't include audio URIs in lightweight backup
          }))
        }
      };

      await secureStorageService.setSecureFile(backupPath, JSON.stringify(backupData));

      console.log(`[BackupService] Lightweight backup created: ${backupId}`);
      return backupPath;
    } catch (error) {
      console.error('[BackupService] Failed to create lightweight backup:', error);
      throw error;
    }
  }

  // Auto backup (runs daily or on app close)
  async performAutoBackup(): Promise<void> {
    try {
      // Create lightweight backup automatically
      await this.createLightweightBackup(true);
      
      // Clean up old auto backups
      await this.cleanupOldBackups(true);
      
      console.log('[BackupService] Auto backup completed');
    } catch (error) {
      console.error('[BackupService] Auto backup failed:', error);
      // Don't throw - auto backup failures shouldn't crash the app
    }
  }

  // Export backup for sharing/manual storage
  async exportBackup(includeAudio = false): Promise<string> {
    try {
      const backupPath = await this.createCompleteBackup(false);
      
      if (!includeAudio) {
        // Create zip-like structure with just the database
        const dbBackupPath = `${backupPath}database.json`;
        const exportPath = `${FileSystem.documentDirectory}PlantalkBackup-${Date.now()}.json`;
        await FileSystem.copyAsync({
          from: dbBackupPath,
          to: exportPath
        });
        return exportPath;
      }

      // For full backup with audio, we'd need to implement zip functionality
      // For now, return the backup directory path
      return backupPath;
    } catch (error) {
      console.error('[BackupService] Failed to export backup:', error);
      throw error;
    }
  }

  // Share backup via system share sheet
  async shareBackup(includeAudio = false): Promise<void> {
    try {
      const backupPath = await this.exportBackup(includeAudio);
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(backupPath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Plantalk Backup'
      });

      // Clean up the temporary export file
      try {
        await FileSystem.deleteAsync(backupPath);
      } catch (cleanupError) {
        console.warn('[BackupService] Failed to cleanup export file:', cleanupError);
      }
    } catch (error) {
      console.error('[BackupService] Failed to share backup:', error);
      throw error;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      console.log(`[BackupService] Restoring from backup: ${backupPath}`);

      // Check if it's a complete backup (directory) or lightweight backup (file)
      const fileInfo = await FileSystem.getInfoAsync(backupPath);
      if (!fileInfo.exists) {
        throw new Error('Backup file/directory not found');
      }

      if (fileInfo.isDirectory) {
        await this.restoreCompleteBackup(backupPath);
      } else {
        await this.restoreLightweightBackup(backupPath);
      }

      console.log('[BackupService] Restore completed successfully');
    } catch (error) {
      console.error('[BackupService] Failed to restore from backup:', error);
      throw error;
    }
  }

  // Restore complete backup (with audio files)
  private async restoreCompleteBackup(backupPath: string): Promise<void> {
    const manifestPath = `${backupPath}manifest.json`;
    const dbBackupPath = `${backupPath}database.json`;
    const audioBackupDir = `${backupPath}audio/`;

    // Read manifest
    const manifestContent = await secureStorageService.getSecureFile(manifestPath);
    if (!manifestContent) {
      throw new Error('Backup manifest not found');
    }

    const manifest: BackupManifest = JSON.parse(manifestContent);

    // Restore database
    await databaseService.restoreFromBackup(dbBackupPath);

    // Restore audio files
    const audioDir = `${FileSystem.documentDirectory}audio/`;
    await secureStorageService.createSecureDirectory(audioDir);

    for (const audioFile of manifest.files.audioFiles) {
      try {
        const sourceAudioPath = `${audioBackupDir}${audioFile}`;
        const targetAudioPath = `${audioDir}${audioFile}`;
        
        const sourceInfo = await FileSystem.getInfoAsync(sourceAudioPath);
        if (sourceInfo.exists) {
          await FileSystem.copyAsync({
            from: sourceAudioPath,
            to: targetAudioPath
          });
        }
      } catch (error) {
        console.warn(`[BackupService] Failed to restore audio file ${audioFile}:`, error);
      }
    }
  }

  // Restore lightweight backup (database only)
  private async restoreLightweightBackup(backupPath: string): Promise<void> {
    const backupContent = await secureStorageService.getSecureFile(backupPath);
    if (!backupContent) {
      throw new Error('Backup file is corrupted or empty');
    }

    const backupData = JSON.parse(backupContent);
    
    if (backupData.type !== 'lightweight') {
      throw new Error('Invalid backup type');
    }

    // Restore the app state (without audio files)
    const state: JournalState = backupData.data;
    
    // Clear existing data
    const currentState = await databaseService.getAppState();
    for (const entry of currentState.entries) {
      await databaseService.deleteEntry(entry.id);
    }

    // Restore entries
    for (const entry of state.entries) {
      await databaseService.addEntry(entry);
    }

    // Restore metadata
    await databaseService.updateAppState({
      streak: state.streak,
      lastEntryISO: state.lastEntryISO
    });
  }

  // Get list of available backups
  async getAvailableBackups(): Promise<Array<{path: string, type: 'complete' | 'lightweight', timestamp: string, size: number}>> {
    try {
      const backups: Array<{path: string, type: 'complete' | 'lightweight', timestamp: string, size: number}> = [];

      // Scan auto backup directory
      const autoBackups = await FileSystem.readDirectoryAsync(BackupService.AUTO_BACKUP_DIR);
      for (const backup of autoBackups) {
        const backupPath = `${BackupService.AUTO_BACKUP_DIR}${backup}`;
        const size = await this.calculateBackupSize(backupPath);
        const fileInfo = await FileSystem.getInfoAsync(backupPath);
        
        backups.push({
          path: backupPath,
          type: backup.includes('lightweight') ? 'lightweight' : 'complete',
          timestamp: fileInfo.isDirectory ? backup.replace('backup-', '').replace('lightweight-', '') : backup,
          size
        });
      }

      // Scan manual backup directory
      const manualBackups = await FileSystem.readDirectoryAsync(BackupService.MANUAL_BACKUP_DIR);
      for (const backup of manualBackups) {
        const backupPath = `${BackupService.MANUAL_BACKUP_DIR}${backup}`;
        const size = await this.calculateBackupSize(backupPath);
        const fileInfo = await FileSystem.getInfoAsync(backupPath);
        
        backups.push({
          path: backupPath,
          type: backup.includes('lightweight') ? 'lightweight' : 'complete',
          timestamp: fileInfo.isDirectory ? backup.replace('backup-', '').replace('lightweight-', '') : backup,
          size
        });
      }

      // Sort by timestamp (newest first)
      return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error) {
      console.error('[BackupService] Failed to get available backups:', error);
      return [];
    }
  }

  // Clean up old backups based on retention policy
  async cleanupOldBackups(autoOnly = false): Promise<void> {
    try {
      // Clean up auto backups
      await this.cleanupBackupsInDirectory(BackupService.AUTO_BACKUP_DIR, BackupService.MAX_AUTO_BACKUPS);
      
      if (!autoOnly) {
        // Clean up manual backups
        await this.cleanupBackupsInDirectory(BackupService.MANUAL_BACKUP_DIR, BackupService.MAX_MANUAL_BACKUPS);
      }
      
      console.log('[BackupService] Backup cleanup completed');
    } catch (error) {
      console.error('[BackupService] Failed to cleanup backups:', error);
    }
  }

  private async cleanupBackupsInDirectory(directory: string, maxBackups: number): Promise<void> {
    try {
      const backups = await FileSystem.readDirectoryAsync(directory);
      
      if (backups.length <= maxBackups) {
        return; // No cleanup needed
      }

      // Sort backups by name (which includes timestamp)
      const sortedBackups = backups.sort((a, b) => b.localeCompare(a));
      
      // Delete oldest backups
      const backupsToDelete = sortedBackups.slice(maxBackups);
      
      for (const backup of backupsToDelete) {
        const backupPath = `${directory}${backup}`;
        await secureStorageService.secureDeleteFile(backupPath);
        console.log(`[BackupService] Deleted old backup: ${backup}`);
      }
    } catch (error) {
      console.error(`[BackupService] Failed to cleanup backups in ${directory}:`, error);
    }
  }

  // Calculate backup size
  private async calculateBackupSize(path: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(path);
      if (!fileInfo.exists) return 0;

      if (fileInfo.isDirectory) {
        // Calculate directory size recursively
        let totalSize = 0;
        const items = await FileSystem.readDirectoryAsync(path);
        
        for (const item of items) {
          const itemPath = `${path}${item}`;
          totalSize += await this.calculateBackupSize(itemPath);
        }
        
        return totalSize;
      } else {
        return (fileInfo as any).size || 0;
      }
    } catch (error) {
      console.error(`[BackupService] Failed to calculate size for ${path}:`, error);
      return 0;
    }
  }

  // Schedule automatic backups
  async scheduleAutoBackup(): Promise<void> {
    try {
      // Store the last auto backup timestamp
      const lastBackupTime = await secureStorageService.getSecureItem('lastAutoBackupTime');
      const now = new Date();
      const lastBackup = lastBackupTime ? new Date(lastBackupTime) : new Date(0);
      
      // Perform auto backup if it's been more than 24 hours
      const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastBackup >= 24) {
        await this.performAutoBackup();
        await secureStorageService.setSecureItem('lastAutoBackupTime', now.toISOString());
      }
    } catch (error) {
      console.error('[BackupService] Failed to schedule auto backup:', error);
    }
  }
}

// Create singleton instance
export const backupService = new BackupService();
