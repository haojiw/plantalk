import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

type RecordingState = 'recording' | 'paused' | 'uploading' | 'transcribing' | 'success' | 'error';

export default function RecordScreen() {
  const [recordingState, setRecordingState] = useState<RecordingState>('recording');
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [audioUri, setAudioUri] = useState<string>('');
  const [hasPermission, setHasPermission] = useState(false);
  
  const recording = useRef<Audio.Recording | null>(null);
  const meteringInterval = useRef<NodeJS.Timeout | null>(null);
  const { addEntry } = usePlant();

  // Waveform animation with 9 bars for better visual effect
  const waveform1 = useSharedValue(0.3);
  const waveform2 = useSharedValue(0.3);
  const waveform3 = useSharedValue(0.3);
  const waveform4 = useSharedValue(0.3);
  const waveform5 = useSharedValue(0.3);
  const waveform6 = useSharedValue(0.3);
  const waveform7 = useSharedValue(0.3);
  const waveform8 = useSharedValue(0.3);
  const waveform9 = useSharedValue(0.3);

  // Auto-start recording on mount
  useEffect(() => {
    const startRecordingAutomatically = async () => {
      try {
        // Request permissions
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        
        if (status !== 'granted') {
          Alert.alert(
            'Microphone Permission Required',
            'This app needs microphone access to record your journal entries. Please enable microphone permissions in your device settings.',
            [
              { 
                text: 'OK', 
                onPress: () => router.back()
              }
            ]
          );
          return;
        }

        // Configure audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // Start recording immediately
        setDuration(0);
        setRecordingState('recording');
        
        // Create new recording
        recording.current = new Audio.Recording();
        await recording.current.prepareToRecordAsync({
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true, // Enable real-time audio level monitoring
        });
        
        await recording.current.startAsync();
        startMetering();
      } catch (error) {
        console.error('Error setting up audio or starting recording:', error);
        Alert.alert(
          'Recording Error',
          'Unable to start recording. Please check your microphone permissions and try again.',
          [
            { 
              text: 'OK', 
              onPress: () => router.back()
            }
          ]
        );
        setRecordingState('error');
      }
    };

    startRecordingAutomatically();
    
    return () => {
      cleanupRecording();
    };
  }, []);

  const cleanupRecording = () => {
    if (meteringInterval.current) {
      clearInterval(meteringInterval.current);
      meteringInterval.current = null;
    }
    if (recording.current) {
      recording.current.stopAndUnloadAsync();
      recording.current = null;
    }
  };

  // Real-time metering for waveform
  const startMetering = () => {
    meteringInterval.current = setInterval(async () => {
      if (recording.current) {
        try {
          const status = await recording.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // Convert dBFS to a 0-1 scale (dBFS ranges from -160 to 0)
            // We'll focus on the -60 to 0 range for better visual response
            const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 60) / 60));
            
            // Add some randomization for more natural waveform appearance
            const variation = 0.2;
            const baseLevel = Math.max(0.1, normalizedLevel);
            
            // Update waveform bars with slight delays and variations
            waveform1.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: 100 });
            waveform2.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: 120 });
            waveform3.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: 110 });
            waveform4.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: 90 });
            waveform5.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: 130 });
            waveform6.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: 100 });
            waveform7.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: 115 });
            waveform8.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: 105 });
            waveform9.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: 125 });
          }
        } catch (error) {
          console.error('Error getting metering:', error);
        }
      }
    }, 100); // Update 10 times per second
  };

  const stopMetering = () => {
    if (meteringInterval.current) {
      clearInterval(meteringInterval.current);
      meteringInterval.current = null;
    }
    
    // Animate bars back to idle state
    const idleHeight = 0.3;
    waveform1.value = withTiming(idleHeight, { duration: 300 });
    waveform2.value = withTiming(idleHeight, { duration: 300 });
    waveform3.value = withTiming(idleHeight, { duration: 300 });
    waveform4.value = withTiming(idleHeight, { duration: 300 });
    waveform5.value = withTiming(idleHeight, { duration: 300 });
    waveform6.value = withTiming(idleHeight, { duration: 300 });
    waveform7.value = withTiming(idleHeight, { duration: 300 });
    waveform8.value = withTiming(idleHeight, { duration: 300 });
    waveform9.value = withTiming(idleHeight, { duration: 300 });
  };

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

  const handlePauseRecording = async () => {
    try {
      if (recording.current) {
        await recording.current.pauseAsync();
        setRecordingState('paused');
        stopMetering();
      }
    } catch (error) {
      console.error('Error pausing recording:', error);
    }
  };

  const handleResumeRecording = async () => {
    try {
      if (recording.current) {
        await recording.current.startAsync();
        setRecordingState('recording');
        startMetering();
      }
    } catch (error) {
      console.error('Error resuming recording:', error);
    }
  };

  const handleFinishRecording = async () => {
    try {
      if (recording.current) {
        await recording.current.stopAndUnloadAsync();
        const uri = recording.current.getURI();
        setAudioUri(uri || '');
        stopMetering();
        
        // Start transcription simulation
        setRecordingState('transcribing');
        
        // Simulate transcription process
        setTimeout(() => {
          const mockTranscription = "Today I reflected on my journey and realized how much I've grown. The challenges I faced last week taught me valuable lessons about resilience and patience. I'm grateful for the small moments of joy that helped me through difficult times.";
          setTranscription(mockTranscription);
          setRecordingState('success');
        }, 2000);
        
        recording.current = null;
      }
    } catch (error) {
      console.error('Error finishing recording:', error);
      setRecordingState('error');
    }
  };

  const handleSaveEntry = () => {
    if (!transcription) return;
    
    addEntry({
      date: new Date().toISOString(),
      title: `Entry for ${new Date().toLocaleDateString()}`,
      transcription,
      duration,
      audioUri, // Save the audio file URI
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
          { text: 'Discard', style: 'destructive', onPress: () => {
            cleanupRecording();
            router.back();
          }},
        ]
      );
    } else {
      cleanupRecording();
      router.back();
    }
  };

  // Animated styles for waveform bars
  const waveAnimatedStyle1 = useAnimatedStyle(() => ({
    height: `${Math.max(8, waveform1.value * 100)}%`,
  }));
  
  const waveAnimatedStyle2 = useAnimatedStyle(() => ({
    height: `${Math.max(8, waveform2.value * 100)}%`,
  }));
  
  const waveAnimatedStyle3 = useAnimatedStyle(() => ({
    height: `${Math.max(8, waveform3.value * 100)}%`,
  }));
  
  const waveAnimatedStyle4 = useAnimatedStyle(() => ({
    height: `${Math.max(8, waveform4.value * 100)}%`,
  }));
  
  const waveAnimatedStyle5 = useAnimatedStyle(() => ({
    height: `${Math.max(8, waveform5.value * 100)}%`,
  }));

  const waveAnimatedStyle6 = useAnimatedStyle(() => ({
    height: `${Math.max(8, waveform6.value * 100)}%`,
  }));
  
  const waveAnimatedStyle7 = useAnimatedStyle(() => ({
    height: `${Math.max(8, waveform7.value * 100)}%`,
  }));
  
  const waveAnimatedStyle8 = useAnimatedStyle(() => ({
    height: `${Math.max(8, waveform8.value * 100)}%`,
  }));
  
  const waveAnimatedStyle9 = useAnimatedStyle(() => ({
    height: `${Math.max(8, waveform9.value * 100)}%`,
  }));

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
            <Animated.View style={[styles.waveBar, waveAnimatedStyle6]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle7]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle8]} />
            <Animated.View style={[styles.waveBar, waveAnimatedStyle9]} />
          </View>
          
          {/* Plant Image */}
          <Image 
            source={require('@/assets/images/plant.png')} 
            style={styles.plantImage}
            resizeMode="contain"
          />
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
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
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
    width: '80%',
    alignSelf: 'center',
  },
  waveform: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: 120,
    marginBottom: theme.spacing.xl,
  },
  waveBar: {
    width: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    minHeight: 8,
  },
  plantImage: {
    width: 80,
    height: 80,
    opacity: 0.7,
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