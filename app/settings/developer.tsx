import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useSecureJournal } from '@/core/providers/journal';
import { SettingsRow, SettingsSection } from '@/features/settings';
import { ScreenWrapper } from '@/shared/components';
import { getRelativeAudioPath, isRelativePath } from '@/shared/utils';
import { motion } from '@/styles/motion';
import { theme } from '@/styles/theme';

export default function DeveloperScreen() {
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: motion.durations.screenFadeIn });
      return () => {
        opacity.value = 0;
      };
    }, [])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const { state, isLoading: contextLoading, updateEntry, runStorageDiagnostics, runSchemaMigration } = useSecureJournal();
  const [isMigrating, setIsMigrating] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isMigratingSchema, setIsMigratingSchema] = useState(false);

  const isDisabled = contextLoading || isMigrating || isDiagnosing || isMigratingSchema;

  const performDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const diagnosticResults = await runStorageDiagnostics();
      
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

  const performSchemaMigration = async () => {
    setIsMigratingSchema(true);
    try {
      const result = await runSchemaMigration();
      
      if (result.success) {
        if (result.columnsAdded.length > 0) {
          Alert.alert(
            'Schema Migration Complete',
            `Added columns: ${result.columnsAdded.join(', ')}\n\n` +
            (result.columnsAlreadyExist.length > 0 
              ? `Already existed: ${result.columnsAlreadyExist.join(', ')}`
              : 'All required columns are now present.'),
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Schema Up to Date',
            `All required columns already exist:\n${result.columnsAlreadyExist.join(', ')}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Schema Migration Failed',
          `Errors:\n${result.errors.join('\n')}\n\n` +
          (result.columnsAdded.length > 0 
            ? `Columns added before failure: ${result.columnsAdded.join(', ')}`
            : 'No columns were added.'),
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Schema Migration Error',
        `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsMigratingSchema(false);
    }
  };

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
        `Total: ${stats.total}\nMigrated: ${stats.alreadyMigrated}\nNeed migration: 0`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Migration Status',
        `Total: ${stats.total}\nMigrated: ${stats.alreadyMigrated}\nNeed migration: ${stats.needsMigration}`,
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
        Alert.alert('Success', `Migrated ${successCount} file(s)`);
      } else {
        Alert.alert('Complete', `Success: ${successCount}\nErrors: ${errorCount}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <ScreenWrapper withPadding={false}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Developer Tools</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Diagnostics Section */}
        <SettingsSection title="Diagnostics">
          <SettingsRow
            type="action"
            icon="search-outline"
            label={isDiagnosing ? 'Running...' : 'Run Storage Diagnostics'}
            onPress={performDiagnostics}
          />
        </SettingsSection>

        {/* Database Section */}
        <SettingsSection title="Database">
          <SettingsRow
            type="action"
            icon="server-outline"
            label={isMigratingSchema ? 'Migrating...' : 'Migrate DB Schema'}
            onPress={performSchemaMigration}
          />
        </SettingsSection>

        {/* Audio Section */}
        <SettingsSection title="Audio">
          <SettingsRow
            type="action"
            icon="musical-notes-outline"
            label={isMigrating ? 'Migrating...' : 'Migrate Audio Paths'}
            onPress={checkMigrationStatus}
          />
        </SettingsSection>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Current Stats</Text>
          <Text style={styles.statsText}>Total Entries: {state.entries.length}</Text>
          <Text style={styles.statsText}>
            Entries with Audio: {state.entries.filter(e => e.audioUri).length}
          </Text>
        </View>
      </ScrollView>
      </Animated.View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statsContainer: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.textMuted10,
    borderRadius: theme.borderRadius.lg,
  },
  statsTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  statsText: {
    ...theme.typography.body,
    color: theme.colors.textMuted80,
    marginBottom: theme.spacing.xs,
  },
});
