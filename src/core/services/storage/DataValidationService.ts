import { JournalEntry, JournalState } from '@/shared/types';
import * as FileSystem from 'expo-file-system/legacy';
import { backupService } from './BackupService';
import { databaseService } from './DatabaseService';
import { secureStorageService } from './SecureStorageService';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixable: boolean;
}

interface DataCorruption {
  type: 'missing_audio' | 'invalid_entry' | 'corrupted_metadata' | 'database_corruption';
  entryId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
}

class DataValidationService {
  private static readonly RECOVERY_ATTEMPTS_KEY = 'recovery_attempts';
  private static readonly MAX_RECOVERY_ATTEMPTS = 3;

  // Validate a single entry
  validateEntry(entry: JournalEntry): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required fields validation
      if (!entry.id || typeof entry.id !== 'string') {
        errors.push('Entry ID is missing or invalid');
      }

      if (!entry.date || typeof entry.date !== 'string') {
        errors.push('Entry date is missing or invalid');
      } else {
        const date = new Date(entry.date);
        if (isNaN(date.getTime())) {
          errors.push('Entry date is not a valid ISO string');
        } else if (date > new Date()) {
          warnings.push('Entry date is in the future');
        }
      }

      if (!entry.title || typeof entry.title !== 'string') {
        errors.push('Entry title is missing or invalid');
      } else if (entry.title.length > 200) {
        warnings.push('Entry title is unusually long');
      }

      // Allow empty text if entry is still being processed
      const isProcessing = entry.processingStage === 'transcribing' || entry.processingStage === 'refining';
      
      if (typeof entry.text !== 'string') {
        errors.push('Entry text is invalid (must be a string)');
      } else if (!entry.text && !isProcessing) {
        errors.push('Entry text is missing or invalid');
      } else if (entry.text.length > 50000) {
        warnings.push('Entry text is unusually long');
      }

      // Optional fields validation
      if (entry.duration !== undefined) {
        if (typeof entry.duration !== 'number' || entry.duration < 0) {
          errors.push('Entry duration is invalid');
        } else if (entry.duration > 3600) {
          warnings.push('Entry duration is unusually long (>1 hour)');
        }
      }

      if (entry.processingStage !== undefined) {
        const validStages = ['transcribing', 'refining', 'completed', 'transcribing_failed', 'refining_failed'];
        if (!validStages.includes(entry.processingStage)) {
          errors.push('Entry processing stage is invalid');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixable: errors.length > 0 && this.canFixEntry(entry, errors)
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        fixable: false
      };
    }
  }

  // Validate entire app state
  async validateAppState(state: JournalState): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let allFixable = true;

    try {
      // Validate state structure
      if (typeof state.streak !== 'number' || state.streak < 0) {
        errors.push('Invalid streak value');
        allFixable = false;
      }

      if (state.lastEntryISO !== null && (typeof state.lastEntryISO !== 'string' || isNaN(new Date(state.lastEntryISO).getTime()))) {
        errors.push('Invalid lastEntryISO value');
      }

      if (!Array.isArray(state.entries)) {
        errors.push('Entries is not an array');
        allFixable = false;
      } else {
        // Validate each entry
        const entryIds = new Set<string>();
        
        for (let i = 0; i < state.entries.length; i++) {
          const entry = state.entries[i];
          const entryValidation = this.validateEntry(entry);
          
          // Check for duplicate IDs
          if (entryIds.has(entry.id)) {
            errors.push(`Duplicate entry ID found: ${entry.id}`);
          } else {
            entryIds.add(entry.id);
          }
          
          // Add entry-specific errors and warnings
          entryValidation.errors.forEach(error => {
            errors.push(`Entry ${i} (${entry.id}): ${error}`);
          });
          
          entryValidation.warnings.forEach(warning => {
            warnings.push(`Entry ${i} (${entry.id}): ${warning}`);
          });

          if (!entryValidation.fixable && entryValidation.errors.length > 0) {
            allFixable = false;
          }
        }

        // Validate audio files exist
        await this.validateAudioFiles(state.entries, errors, warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixable: errors.length > 0 && allFixable
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`State validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        fixable: false
      };
    }
  }

  // Validate that audio files referenced in entries actually exist
  private async validateAudioFiles(entries: JournalEntry[], errors: string[], warnings: string[]): Promise<void> {
    for (const entry of entries) {
      if (entry.audioUri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(entry.audioUri);
          if (!fileInfo.exists) {
            warnings.push(`Audio file missing for entry ${entry.id}: ${entry.audioUri}`);
          } else {
            const fileSize = (fileInfo as any).size;
            if (fileSize === 0) {
              warnings.push(`Audio file is empty for entry ${entry.id}`);
            } else if (fileSize < 1000) {
              warnings.push(`Audio file is suspiciously small for entry ${entry.id}`);
            }
          }
        } catch (error) {
          warnings.push(`Cannot access audio file for entry ${entry.id}: ${entry.audioUri}`);
        }
      }
    }
  }

  // Check if an entry can be automatically fixed
  private canFixEntry(entry: JournalEntry, errors: string[]): boolean {
    // We can fix entries with missing or invalid optional fields
    const fixableErrors = [
      'Entry duration is invalid',
      'Entry processing stage is invalid'
    ];

    return errors.every(error => 
      fixableErrors.some(fixableError => error.includes(fixableError))
    );
  }

  // Attempt to fix a corrupted entry
  async fixEntry(entry: JournalEntry): Promise<JournalEntry> {
    const fixedEntry = { ...entry };

    try {
      // Fix missing or invalid ID
      if (!fixedEntry.id || typeof fixedEntry.id !== 'string') {
        fixedEntry.id = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Fix missing or invalid date
      if (!fixedEntry.date || isNaN(new Date(fixedEntry.date).getTime())) {
        fixedEntry.date = new Date().toISOString();
      }

      // Fix missing title
      if (!fixedEntry.title || typeof fixedEntry.title !== 'string') {
        const entryDate = new Date(fixedEntry.date);
        fixedEntry.title = `Recovered Entry - ${entryDate.toLocaleDateString()}`;
      }

      // Fix missing text (but allow empty if processing)
      const isProcessing = fixedEntry.processingStage === 'transcribing' || fixedEntry.processingStage === 'refining';
      if (typeof fixedEntry.text !== 'string') {
        fixedEntry.text = isProcessing ? 'Processing...' : 'This entry was recovered from corrupted data.';
      } else if (!fixedEntry.text && !isProcessing) {
        fixedEntry.text = 'This entry was recovered from corrupted data.';
      }

      // Fix invalid duration
      if (fixedEntry.duration !== undefined && (typeof fixedEntry.duration !== 'number' || fixedEntry.duration < 0)) {
        fixedEntry.duration = undefined;
      }

      // Fix invalid processing stage
      if (fixedEntry.processingStage !== undefined) {
        const validStages = ['transcribing', 'refining', 'completed', 'transcribing_failed', 'refining_failed'];
        if (!validStages.includes(fixedEntry.processingStage)) {
          fixedEntry.processingStage = 'completed';
        }
      }

      console.log(`[DataValidation] Fixed entry: ${fixedEntry.id}`);
      return fixedEntry;
    } catch (error) {
      console.error('[DataValidation] Failed to fix entry:', error);
      throw error;
    }
  }

  // Detect data corruption
  async detectCorruption(): Promise<DataCorruption[]> {
    const corruptions: DataCorruption[] = [];

    try {
      // Check database health
      const isHealthy = await databaseService.healthCheck();
      if (!isHealthy) {
        corruptions.push({
          type: 'database_corruption',
          description: 'Database connection failed or database is corrupted',
          severity: 'critical',
          autoFixable: false
        });
        return corruptions; // If DB is down, can't check other things
      }

      // Get current state
      const state = await databaseService.getAppState();
      
      // Validate state
      const validation = await this.validateAppState(state);
      
      // Convert validation errors to corruptions
      validation.errors.forEach(error => {
        let severity: DataCorruption['severity'] = 'medium';
        let autoFixable = validation.fixable;
        
        if (error.includes('critical') || error.includes('database')) {
          severity = 'critical';
          autoFixable = false;
        } else if (error.includes('missing') || error.includes('corrupted')) {
          severity = 'high';
        } else if (error.includes('invalid')) {
          severity = 'medium';
        }

        corruptions.push({
          type: 'invalid_entry',
          description: error,
          severity,
          autoFixable
        });
      });

      // Check for missing audio files
      for (const entry of state.entries) {
        if (entry.audioUri) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(entry.audioUri);
            if (!fileInfo.exists) {
              corruptions.push({
                type: 'missing_audio',
                entryId: entry.id,
                description: `Audio file missing: ${entry.audioUri}`,
                severity: 'low',
                autoFixable: true
              });
            }
          } catch (error) {
            corruptions.push({
              type: 'missing_audio',
              entryId: entry.id,
              description: `Cannot access audio file: ${entry.audioUri}`,
              severity: 'medium',
              autoFixable: false
            });
          }
        }
      }

    } catch (error) {
      corruptions.push({
        type: 'database_corruption',
        description: `Corruption detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
        autoFixable: false
      });
    }

    return corruptions;
  }

  // Attempt automatic recovery
  async attemptRecovery(): Promise<{ success: boolean; message: string; backupRestored?: boolean }> {
    try {
      console.log('[DataValidation] Starting automatic recovery...');

      // Check if we've already attempted recovery too many times
      const attempts = await this.getRecoveryAttempts();
      if (attempts >= DataValidationService.MAX_RECOVERY_ATTEMPTS) {
        return {
          success: false,
          message: `Maximum recovery attempts (${DataValidationService.MAX_RECOVERY_ATTEMPTS}) exceeded. Manual intervention required.`
        };
      }

      // Increment recovery attempts
      await this.incrementRecoveryAttempts();

      // Detect corruption
      const corruptions = await this.detectCorruption();
      
      if (corruptions.length === 0) {
        await this.resetRecoveryAttempts();
        return { success: true, message: 'No corruption detected. Data is healthy.' };
      }

      // Check if all corruptions are auto-fixable
      const autoFixableCorruptions = corruptions.filter(c => c.autoFixable);
      const criticalCorruptions = corruptions.filter(c => c.severity === 'critical');

      if (criticalCorruptions.length > 0) {
        // Critical corruption detected - try to restore from backup
        const backupRestored = await this.attemptBackupRestore();
        if (backupRestored) {
          await this.resetRecoveryAttempts();
          return {
            success: true,
            message: 'Critical corruption detected. Data restored from backup.',
            backupRestored: true
          };
        } else {
          return {
            success: false,
            message: 'Critical corruption detected and no backup available. Manual intervention required.'
          };
        }
      }

      // Attempt to fix auto-fixable corruptions
      if (autoFixableCorruptions.length > 0) {
        await this.fixAutoFixableCorruptions(autoFixableCorruptions);
        
        // Re-validate to check if issues are resolved
        const remainingCorruptions = await this.detectCorruption();
        const remainingCritical = remainingCorruptions.filter(c => c.severity === 'critical' || c.severity === 'high');
        
        if (remainingCritical.length === 0) {
          await this.resetRecoveryAttempts();
          return {
            success: true,
            message: `Fixed ${autoFixableCorruptions.length} data corruption issues automatically.`
          };
        }
      }

      return {
        success: false,
        message: `Found ${corruptions.length} corruption issues. ${autoFixableCorruptions.length} were auto-fixable, but manual intervention may be required.`
      };

    } catch (error) {
      console.error('[DataValidation] Recovery failed:', error);
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Attempt to restore from the most recent backup
  private async attemptBackupRestore(): Promise<boolean> {
    try {
      const backups = await backupService.getAvailableBackups();
      
      if (backups.length === 0) {
        return false;
      }

      // Use the most recent backup
      const mostRecent = backups[0];
      await backupService.restoreFromBackup(mostRecent.path);
      
      console.log(`[DataValidation] Restored from backup: ${mostRecent.path}`);
      return true;
    } catch (error) {
      console.error('[DataValidation] Backup restore failed:', error);
      return false;
    }
  }

  // Fix auto-fixable corruptions
  private async fixAutoFixableCorruptions(corruptions: DataCorruption[]): Promise<void> {
    for (const corruption of corruptions) {
      try {
        switch (corruption.type) {
          case 'missing_audio':
            // Remove audio URI from entry if file is missing
            if (corruption.entryId) {
              await databaseService.updateEntry(corruption.entryId, { audioUri: undefined });
              console.log(`[DataValidation] Removed missing audio URI from entry: ${corruption.entryId}`);
            }
            break;
            
          case 'invalid_entry':
            // This would require more complex logic to fix specific entry issues
            console.log(`[DataValidation] Invalid entry corruption detected: ${corruption.description}`);
            break;
        }
      } catch (error) {
        console.error(`[DataValidation] Failed to fix corruption: ${corruption.description}`, error);
      }
    }
  }

  // Recovery attempt tracking
  private async getRecoveryAttempts(): Promise<number> {
    try {
      const attempts = await secureStorageService.getSecureItem(DataValidationService.RECOVERY_ATTEMPTS_KEY);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  private async incrementRecoveryAttempts(): Promise<void> {
    try {
      const current = await this.getRecoveryAttempts();
      await secureStorageService.setSecureItem(DataValidationService.RECOVERY_ATTEMPTS_KEY, (current + 1).toString());
    } catch (error) {
      console.error('[DataValidation] Failed to increment recovery attempts:', error);
    }
  }

  private async resetRecoveryAttempts(): Promise<void> {
    try {
      await secureStorageService.removeSecureItem(DataValidationService.RECOVERY_ATTEMPTS_KEY);
    } catch (error) {
      console.error('[DataValidation] Failed to reset recovery attempts:', error);
    }
  }

  // Run comprehensive health check
  async performHealthCheck(): Promise<{
    isHealthy: boolean;
    issues: DataCorruption[];
    recommendations: string[];
  }> {
    try {
      const issues = await this.detectCorruption();
      const isHealthy = issues.length === 0 || issues.every(issue => issue.severity === 'low');
      
      const recommendations: string[] = [];
      
      if (issues.length > 0) {
        const critical = issues.filter(i => i.severity === 'critical').length;
        const high = issues.filter(i => i.severity === 'high').length;
        const medium = issues.filter(i => i.severity === 'medium').length;
        const low = issues.filter(i => i.severity === 'low').length;
        
        if (critical > 0) {
          recommendations.push('Critical issues detected. Consider restoring from backup.');
        }
        if (high > 0) {
          recommendations.push('High severity issues found. Run automatic recovery.');
        }
        if (medium > 0) {
          recommendations.push('Medium severity issues detected. Monitor data integrity.');
        }
        if (low > 0) {
          recommendations.push('Minor issues found. Consider running cleanup.');
        }
        
        const autoFixable = issues.filter(i => i.autoFixable).length;
        if (autoFixable > 0) {
          recommendations.push(`${autoFixable} issues can be fixed automatically.`);
        }
      } else {
        recommendations.push('Data integrity is good. Consider creating a backup.');
      }
      
      return { isHealthy, issues, recommendations };
    } catch (error) {
      return {
        isHealthy: false,
        issues: [{
          type: 'database_corruption',
          description: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical',
          autoFixable: false
        }],
        recommendations: ['System error detected. Check app logs and consider reinstalling.']
      };
    }
  }
}

// Create singleton instance
export const dataValidationService = new DataValidationService();
