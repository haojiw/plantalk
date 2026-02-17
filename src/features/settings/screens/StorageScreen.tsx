import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { ScreenWrapper } from '@/shared/components';
import { motion } from '@/styles/motion';
import { theme } from '@/styles/theme';

interface StorageInfo {
  audioSize: number;
  entryCount: number;
  isLoading: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const StorageScreen: React.FC = () => {
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

  const { state } = useSecureJournal();
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    audioSize: 0,
    entryCount: 0,
    isLoading: true,
  });
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    calculateStorageUsage();
  }, [state.entries]);

  const calculateStorageUsage = async () => {
    try {
      let totalAudioSize = 0;
      const audioDir = FileSystem.documentDirectory + 'audio/';

      // Check if audio directory exists
      const dirInfo = await FileSystem.getInfoAsync(audioDir);
      if (dirInfo.exists && dirInfo.isDirectory) {
        const files = await FileSystem.readDirectoryAsync(audioDir);
        
        for (const file of files) {
          const fileInfo = await FileSystem.getInfoAsync(audioDir + file);
          if (fileInfo.exists && !fileInfo.isDirectory && fileInfo.size) {
            totalAudioSize += fileInfo.size;
          }
        }
      }

      setStorageInfo({
        audioSize: totalAudioSize,
        entryCount: state.entries.length,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error calculating storage:', error);
      setStorageInfo((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Audio Cache',
      'This will delete all audio files to save space. Your journal text will be preserved. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: performClearCache,
        },
      ]
    );
  };

  const performClearCache = async () => {
    setIsClearing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const audioDir = FileSystem.documentDirectory + 'audio/';
      const dirInfo = await FileSystem.getInfoAsync(audioDir);

      if (dirInfo.exists) {
        await FileSystem.deleteAsync(audioDir, { idempotent: true });
        await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
      }

      await calculateStorageUsage();
      
      Alert.alert('Success', 'Audio cache has been cleared.');
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear audio cache.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <ScreenWrapper withPadding={false}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Storage</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Storage Info */}
      <View style={styles.content}>
        {storageInfo.isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons
                  name="musical-notes-outline"
                  size={28}
                  color={theme.colors.primary}
                />
                <Text style={styles.statValue}>
                  {formatBytes(storageInfo.audioSize)}
                </Text>
                <Text style={styles.statLabel}>Audio Files</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons
                  name="document-text-outline"
                  size={28}
                  color={theme.colors.primary}
                />
                <Text style={styles.statValue}>{storageInfo.entryCount}</Text>
                <Text style={styles.statLabel}>Journal Entries</Text>
              </View>
            </View>

            {/* Clear Cache Button */}
            <View style={styles.actionContainer}>
              <Pressable
                style={[
                  styles.clearButton,
                  (isClearing || storageInfo.audioSize === 0) &&
                    styles.clearButtonDisabled,
                ]}
                onPress={handleClearCache}
                disabled={isClearing || storageInfo.audioSize === 0}
              >
                {isClearing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="white" />
                    <Text style={styles.clearButtonText}>Clear Audio Cache</Text>
                  </>
                )}
              </Pressable>
              <Text style={styles.clearHint}>
                Delete old audio files to save space. Your journal text will be
                preserved.
              </Text>
            </View>
          </>
        )}
      </View>
      </Animated.View>
    </ScreenWrapper>
  );
};

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
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.textMuted10,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted60,
    marginTop: theme.spacing.xs,
  },
  actionContainer: {
    marginTop: theme.spacing.lg,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.destructive,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  clearButtonDisabled: {
    opacity: 0.5,
  },
  clearButtonText: {
    ...theme.typography.body,
    color: 'white',
    fontWeight: '600',
  },
  clearHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted60,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
