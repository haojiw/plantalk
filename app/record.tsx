import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Waveform } from '@/components/Waveform';
import { useRecorder } from '@/hooks/useRecorder';
import { theme } from '@/styles/theme';

export default function RecordScreen() {
  const {
    recordingState,
    duration,
    waveformValues,
    handlePauseRecording,
    handleResumeRecording,
    handleFinishRecording,
    handleClose,
    formatDuration,
  } = useRecorder();

  return (
    <ScreenWrapper statusBarStyle="light">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerSpacer} />
          <View style={styles.headerSpacer} />
        </View>

        {/* Status Display */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {recordingState === 'recording' && 'Recording...'}
            {recordingState === 'paused' && 'Paused'}
            {recordingState === 'saving' && 'Saving...'}
            {recordingState === 'error' && 'Something went wrong'}
          </Text>
          
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          )}
        </View>

        {/* Waveform Display */}
        <Waveform waveformValues={waveformValues} />

        {/* Controls */}
        <View style={styles.controlsContainer}>          
          {recordingState === 'recording' && (
            <View style={styles.recordingControls}>
              <Pressable onPress={handlePauseRecording} style={styles.pauseButton}>
                <Ionicons name="pause" size={28} color={theme.colors.surface} />
              </Pressable>
              <Pressable onPress={handleFinishRecording} style={styles.finishButton}>
                <Ionicons name="checkmark" size={28} color={theme.colors.surface} />
              </Pressable>
            </View>
          )}
          
          {recordingState === 'paused' && (
            <View style={styles.recordingControls}>
              <Pressable onPress={handleResumeRecording} style={styles.resumeButton}>
                <Ionicons name="play" size={28} color={theme.colors.surface} />
              </Pressable>
              <Pressable onPress={handleFinishRecording} style={styles.finishButton}>
                <Ionicons name="checkmark" size={28} color={theme.colors.surface} />
              </Pressable>
            </View>
          )}
          
          {recordingState === 'saving' && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Saving your recording...</Text>
            </View>
          )}
          
          {recordingState === 'error' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                An error occurred while recording. Please try again.
              </Text>
            </View>
          )}
        </View>
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
    paddingVertical: theme.spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statusText: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  durationText: {
    ...theme.typography.title,
    color: theme.colors.primary,
    fontFamily: 'SpaceMono',
  },
  controlsContainer: {
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: theme.spacing.xxl,
    alignItems: 'center',
  },
  pauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primary, // Green for pause
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  resumeButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.accent, // Yellow for resume
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  finishButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primary, // Green for finish
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
}); 