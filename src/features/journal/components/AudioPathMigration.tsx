import { useSecureJournal } from '@/core/providers/journal';
import { getRelativeAudioPath, isRelativePath } from '@/shared/utils';
import { theme } from '@/styles/theme';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

export const AudioPathMigration: React.FC = () => {
  const { state, isLoading: contextLoading, updateEntry, emergencyRecovery, runStorageDiagnostics } = useSecureJournal();
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

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
            await updateEntry(entry.id, { audioUri: newPath });
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

  const performDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const diagnosticResults = await runStorageDiagnostics();
      
      // Format results for display
      const resultsText = Object.entries(diagnosticResults.results)
        .map(([key, value]) => {
          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
          return `${label}:\n${value.status} ${value.details}`;
        })
        .join('\n\n');
      
      Alert.alert(
        'Storage Diagnostics',
        `${diagnosticResults.summary}\n\n${resultsText}`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    } catch (error) {
      Alert.alert(
        'Diagnostics Error',
        `Failed to run diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsDiagnosing(false);
    }
  };

  const performEmergencyRecovery = async () => {
    Alert.alert(
      'Emergency Recovery',
      'This will attempt to recover your entries from the old storage file (entries.json). Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recover',
          onPress: async () => {
            setIsRecovering(true);
            try {
              const result = await emergencyRecovery();
              
              if (result.success) {
                Alert.alert(
                  'Recovery Successful ✅',
                  `${result.message}\n\nYour entries should now be visible in the journal.`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  'Recovery Failed',
                  result.message,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert(
                'Recovery Error',
                `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
                [{ text: 'OK' }]
              );
            } finally {
              setIsRecovering(false);
            }
          }
        }
      ]
    );
  };

  const isDisabled = contextLoading || isMigrating || isRecovering || isDiagnosing;

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, styles.diagnosticButton, isDisabled && styles.buttonDisabled]}
        onPress={performDiagnostics}
        disabled={isDisabled}
      >
        {isDiagnosing ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>🔍 Run Storage Diagnostics</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.button, styles.recoveryButton, isDisabled && styles.buttonDisabled]}
        onPress={performEmergencyRecovery}
        disabled={isDisabled}
      >
        {isRecovering ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>Emergency Recovery</Text>
        )}
      </Pressable>
      
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
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
  diagnosticButton: {
    backgroundColor: '#2563EB', // Blue color for diagnostic action
  },
  recoveryButton: {
    backgroundColor: '#800020', // Red color for emergency action
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

