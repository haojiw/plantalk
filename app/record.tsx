import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

type RecordingState = 'idle' | 'recording' | 'paused' | 'uploading' | 'transcribing' | 'success' | 'error';

export default function RecordScreen() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const { addEntry } = usePlant();

  // Waveform animation
  const waveform1 = useSharedValue(0.5);
  const waveform2 = useSharedValue(0.7);
  const waveform3 = useSharedValue(0.4);
  const waveform4 = useSharedValue(0.8);
  const waveform5 = useSharedValue(0.6);

  // Start waveform animation when recording
  useEffect(() => {
    if (recordingState === 'recording') {
      waveform1.value = withRepeat(
        withTiming(Math.random() * 0.8 + 0.2, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      waveform2.value = withRepeat(
        withTiming(Math.random() * 0.8 + 0.2, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      waveform3.value = withRepeat(
        withTiming(Math.random() * 0.8 + 0.2, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      waveform4.value = withRepeat(
        withTiming(Math.random() * 0.8 + 0.2, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      waveform5.value = withRepeat(
        withTiming(Math.random() * 0.8 + 0.2, { duration: 320, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      // Stop animation
      waveform1.value = withTiming(0.3);
      waveform2.value = withTiming(0.3);
      waveform3.value = withTiming(0.3);
      waveform4.value = withTiming(0.3);
      waveform5.value = withTiming(0.3);
    }
  }, [recordingState]);

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setDuration(0);
    setRecordingState('recording');
  };

  const handlePauseRecording = () => {
    setRecordingState('paused');
  };

  const handleResumeRecording = () => {
    setRecordingState('recording');
  };

  const handleFinishRecording = () => {
    setRecordingState('transcribing');
    
    // Simulate transcription process
    setTimeout(() => {
      const mockTranscription = "Today I reflected on my journey and realized how much I've grown. The challenges I faced last week taught me valuable lessons about resilience and patience.";
      setTranscription(mockTranscription);
      setRecordingState('success');
    }, 2000);
  };

  const handleSaveEntry = () => {
    if (!transcription) return;
    
    addEntry({
      date: new Date().toISOString(),
      title: `Entry for ${new Date().toLocaleDateString()}`,
      transcription,
      duration,
    });
    
    router.back();
  };

  const handleClose = () => {
    if (recordingState === 'recording' || recordingState === 'paused') {
      Alert.alert(
        'Discard Recording?',
        'Your recording will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const waveAnimatedStyle1 = useAnimatedStyle(() => ({
    height: `${waveform1.value * 100}%`,
  }));
  
  const waveAnimatedStyle2 = useAnimatedStyle(() => ({
    height: `${waveform2.value * 100}%`,
  }));
  
  const waveAnimatedStyle3 = useAnimatedStyle(() => ({
    height: `${waveform3.value * 100}%`,
  }));
  
  const waveAnimatedStyle4 = useAnimatedStyle(() => ({
    height: `${waveform4.value * 100}%`,
  }));
  
  const waveAnimatedStyle5 = useAnimatedStyle(() => ({
    height: `${waveform5.value * 100}%`,
  }));

  return (
    <ScreenWrapper statusBarStyle="light">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Voice Journal</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Status Display */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {recordingState === 'idle' && 'Ready to record'}
            {recordingState === 'recording' && 'Recording...'}
            {recordingState === 'paused' && 'Paused'}
            {recordingState === 'transcribing' && 'Transcribing...'}
            {recordingState === 'success' && 'Transcription complete'}
            {recordingState === 'error' && 'Something went wrong'}
          </Text>
          
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          )}
        </View>

        {/* Waveform Display */}
        <View style={styles.waveformContainer}>
          <View style={styles.waveform}>
            <Animated.View style={[styles.waveBar, waveAnimatedStyle1]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle2]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle3]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle4]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle5]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle4]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle3]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle2]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle1]} />
          </View>
        </View>

        {/* Transcription Display */}
        {recordingState === 'success' && transcription && (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionTitle}>Transcription</Text>
            <Text style={styles.transcriptionText}>{transcription}</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {recordingState === 'idle' && (
            <Pressable onPress={handleStartRecording} style={styles.recordButton}>
              <Ionicons name="mic" size={32} color={theme.colors.surface} />
            </Pressable>
          )}
          
          {recordingState === 'recording' && (
            <View style={styles.recordingControls}>
              <Pressable onPress={handlePauseRecording} style={styles.pauseButton}>
                <Ionicons name="pause" size={24} color={theme.colors.surface} />
              </Pressable>
              <Pressable onPress={handleFinishRecording} style={styles.finishButton}>
                <Ionicons name="stop" size={24} color={theme.colors.surface} />
              </Pressable>
            </View>
          )}
          
          {recordingState === 'paused' && (
            <View style={styles.recordingControls}>
              <Pressable onPress={handleResumeRecording} style={styles.resumeButton}>
                <Ionicons name="play" size={24} color={theme.colors.surface} />
              </Pressable>
              <Pressable onPress={handleFinishRecording} style={styles.finishButton}>
                <Ionicons name="stop" size={24} color={theme.colors.surface} />
              </Pressable>
            </View>
          )}
          
          {recordingState === 'transcribing' && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Processing your recording...</Text>
            </View>
          )}
          
          {recordingState === 'success' && (
            <Pressable onPress={handleSaveEntry} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </Pressable>
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
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  closeButton: {
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
  statusContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
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
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.xxl,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 120,
    gap: theme.spacing.xs,
  },
  waveBar: {
    width: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    minHeight: 8,
  },
  transcriptionContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  transcriptionTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  transcriptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  controlsContainer: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xxl,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
  },
  pauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  resumeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  finishButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.secondary,
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
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.md,
  },
  saveButtonText: {
    ...theme.typography.subheading,
    color: theme.colors.surface,
    fontWeight: '600',
  },
}); 