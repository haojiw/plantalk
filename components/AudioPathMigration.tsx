import { useSecureJournal } from '@/context/SecureJournalProvider';
import { databaseService } from '@/services/DatabaseService';
import { theme } from '@/styles/theme';
import { getRelativeAudioPath, isRelativePath } from '@/utils/audioPath';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Audio Path Migration Component
 * 
 * Converts old absolute audio file paths to relative paths.
 * This ensures audio files survive iOS app updates where the container UUID changes.
 * 
 * Migration Process:
 * 1. Scans all journal entries for audio URIs
 * 2. Identifies entries with absolute paths (old format)
 * 3. Converts them to relative paths (new format)
 * 4. Updates the database
 * 
 * This button should be placed in Settings > Developer Tools once that page is created.
 */
export const AudioPathMigration: React.FC = () => {
  const { state, isLoading: contextLoading } = useSecureJournal();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStats, setMigrationStats] = useState<{
    total: number;
    needsMigration: number;
    alreadyMigrated: number;
  } | null>(null);

  const checkMigrationStatus = () => {
    const entriesWithAudio = state.entries.filter(entry => entry.audioUri);
    const needsMigration = entriesWithAudio.filter(entry => !isRelativePath(entry.audioUri));
    const alreadyMigrated = entriesWithAudio.filter(entry => isRelativePath(entry.audioUri));

    const stats = {
      total: entriesWithAudio.length,
      needsMigration: needsMigration.length,
      alreadyMigrated: alreadyMigrated.length,
    };

    setMigrationStats(stats);

    if (needsMigration.length === 0) {
      Alert.alert(
        'No Migration Needed',
        `All ${stats.total} audio files are already using relative paths. ✅`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Migration Status',
        `Total audio files: ${stats.total}\n` +
        `✅ Already migrated: ${stats.alreadyMigrated}\n` +
        `⚠️ Need migration: ${stats.needsMigration}\n\n` +
        `Would you like to migrate the ${stats.needsMigration} file(s)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Migrate', onPress: performMigration }
        ]
      );
    }
  };

  const performMigration = async () => {
    setIsMigrating(true);
    
    try {
      const entriesWithAudio = state.entries.filter(entry => entry.audioUri);
      const entriesToMigrate = entriesWithAudio.filter(entry => !isRelativePath(entry.audioUri));

      console.log(`[AudioPathMigration] Starting migration for ${entriesToMigrate.length} entries...`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const entry of entriesToMigrate) {
        try {
          const oldPath = entry.audioUri!;
          const newPath = getRelativeAudioPath(oldPath);
          
          if (newPath && newPath !== oldPath) {
            console.log(`[AudioPathMigration] Migrating entry ${entry.id}:`);
            console.log(`  OLD: ${oldPath}`);
            console.log(`  NEW: ${newPath}`);
            
            await databaseService.updateEntry(entry.id, { audioUri: newPath });
            successCount++;
          } else {
            console.warn(`[AudioPathMigration] Could not convert path for entry ${entry.id}: ${oldPath}`);
            errorCount++;
            errors.push(`Entry "${entry.title}": Invalid path format`);
          }
        } catch (error) {
          console.error(`[AudioPathMigration] Error migrating entry ${entry.id}:`, error);
          errorCount++;
          errors.push(`Entry "${entry.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`[AudioPathMigration] Migration complete. Success: ${successCount}, Errors: ${errorCount}`);

      // Refresh migration stats
      checkMigrationStatus();

      if (errorCount === 0) {
        Alert.alert(
          'Migration Complete ✅',
          `Successfully migrated ${successCount} audio file path(s) to the new format.\n\n` +
          `Your audio files will now survive app updates!`,
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert(
          'Migration Partially Complete',
          `Success: ${successCount}\n` +
          `Errors: ${errorCount}\n\n` +
          `Errors:\n${errors.join('\n')}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[AudioPathMigration] Migration failed:', error);
      Alert.alert(
        'Migration Failed',
        `An error occurred during migration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsMigrating(false);
    }
  };

  const isDisabled = contextLoading || isMigrating;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audio Path Migration</Text>
        <Text style={styles.description}>
          Fix audio files that disappear after app updates by converting to relative paths.
        </Text>
      </View>

      {migrationStats && (
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total audio files:</Text>
            <Text style={styles.statValue}>{migrationStats.total}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>✅ Already migrated:</Text>
            <Text style={[styles.statValue, styles.statSuccess]}>{migrationStats.alreadyMigrated}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>⚠️ Need migration:</Text>
            <Text style={[styles.statValue, styles.statWarning]}>{migrationStats.needsMigration}</Text>
          </View>
        </View>
      )}

      <Pressable
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        onPress={checkMigrationStatus}
        disabled={isDisabled}
      >
        {isMigrating ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>
            {migrationStats ? 'Check Again' : 'Check & Migrate'}
          </Text>
        )}
      </Pressable>

      <Text style={styles.note}>
        💡 This is a one-time migration. Once complete, all new recordings will automatically use the new format.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    ...theme.shadows.sm,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.secondary,
    lineHeight: 20,
  },
  statsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.body,
    color: theme.colors.secondary,
  },
  statValue: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    fontSize: 16,
  },
  statSuccess: {
    color: '#10B981', // Green
  },
  statWarning: {
    color: '#F59E0B', // Amber
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...theme.typography.subheading,
    color: theme.colors.surface,
    fontSize: 16,
  },
  note: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    marginTop: theme.spacing.md,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

