import { useSecureJournal } from '@/context/SecureJournalProvider';
import { databaseService } from '@/services/DatabaseService';
import { theme } from '@/styles/theme';
import { getRelativeAudioPath, isRelativePath } from '@/utils/audioPath';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';

export const AudioPathMigration: React.FC = () => {
  const { state, isLoading: contextLoading } = useSecureJournal();
  const [isMigrating, setIsMigrating] = useState(false);

  const checkMigrationStatus = () => {
    const entriesWithAudio = state.entries.filter(entry => entry.audioUri);
    const needsMigration = entriesWithAudio.filter(entry => !isRelativePath(entry.audioUri));
    const alreadyMigrated = entriesWithAudio.filter(entry => isRelativePath(entry.audioUri));

    const stats = {
      total: entriesWithAudio.length,
      needsMigration: needsMigration.length,
      alreadyMigrated: alreadyMigrated.length,
    };

    if (needsMigration.length === 0) {
      Alert.alert(
        'Migration Status',
        `Total: ${stats.total}\n✅ Migrated: ${stats.alreadyMigrated}\n⚠️ Need migration: 0`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Migration Status',
        `Total: ${stats.total}\n✅ Migrated: ${stats.alreadyMigrated}\n⚠️ Need migration: ${stats.needsMigration}`,
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

      let successCount = 0;
      let errorCount = 0;

      for (const entry of entriesToMigrate) {
        try {
          const oldPath = entry.audioUri!;
          const newPath = getRelativeAudioPath(oldPath);
          
          if (newPath && newPath !== oldPath) {
            await databaseService.updateEntry(entry.id, { audioUri: newPath });
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      if (errorCount === 0) {
        Alert.alert('Success', `Migrated ${successCount} file(s) ✅`);
      } else {
        Alert.alert('Complete', `Success: ${successCount}\nErrors: ${errorCount}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  const isDisabled = contextLoading || isMigrating;

  return (
    <Pressable
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={checkMigrationStatus}
      disabled={isDisabled}
    >
      {isMigrating ? (
        <ActivityIndicator color={theme.colors.surface} />
      ) : (
        <Text style={styles.buttonText}>Migrate Audio Paths</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
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
});

