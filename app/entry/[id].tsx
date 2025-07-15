import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = usePlant();
  const [isPlaying, setIsPlaying] = useState(false);
  
  const entry = state.entries.find(e => e.id === id);

  if (!entry) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Entry</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.errorContainer}>
            <Ionicons name="leaf-outline" size={48} color={theme.colors.primary + '40'} />
            <Text style={styles.errorText}>Entry not found</Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '0:00';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    // TODO: Implement actual audio playback
    setIsPlaying(!isPlaying);
    
    // Simulate audio duration
    if (!isPlaying) {
      setTimeout(() => {
        setIsPlaying(false);
      }, (entry.duration || 30) * 1000);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Entry</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Date */}
          <Text style={styles.date}>{formatDate(entry.date)}</Text>
          
          {/* Title */}
          <Text style={styles.title}>{entry.title}</Text>
          
          {/* Audio Player */}
          {entry.audioUri && (
            <View style={styles.audioPlayer}>
              <Pressable onPress={handlePlayPause} style={styles.playButton}>
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={20} 
                  color={theme.colors.surface} 
                />
              </Pressable>
              
              <View style={styles.audioInfo}>
                <View style={styles.waveformMini}>
                  {Array.from({ length: 12 }).map((_, index) => (
                    <View 
                      key={index}
                      style={[
                        styles.miniWaveBar,
                        { height: Math.random() * 16 + 4 }
                      ]} 
                    />
                  ))}
                </View>
                <Text style={styles.audioDuration}>
                  {formatDuration(entry.duration)}
                </Text>
              </View>
            </View>
          )}
          
          {/* Transcription */}
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionLabel}>Transcription</Text>
            <Text style={styles.transcriptionText}>{entry.transcription}</Text>
          </View>
          
          {/* Growth insight */}
          <View style={styles.insightContainer}>
            <View style={styles.insightHeader}>
              <Ionicons name="leaf" size={20} color={theme.colors.primary} />
              <Text style={styles.insightTitle}>Growth Insight</Text>
            </View>
            <Text style={styles.insightText}>
              This entry contributed to your {state.streak} day streak. 
              Keep reflecting to help your plant grow!
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  audioPlayer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  audioInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveformMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  miniWaveBar: {
    width: 2,
    backgroundColor: theme.colors.primary + '40',
    borderRadius: 1,
  },
  audioDuration: {
    ...theme.typography.caption,
    color: theme.colors.text + '80',
    fontFamily: 'SpaceMono',
    marginLeft: theme.spacing.sm,
  },
  transcriptionContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  transcriptionLabel: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  transcriptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  insightContainer: {
    backgroundColor: theme.colors.light + '40',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  insightTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  insightText: {
    ...theme.typography.body,
    color: theme.colors.text + '80',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    marginTop: theme.spacing.md,
  },
}); 