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

type RecordingState = 'recording' | 'paused' | 'saving' | 'error';

export default function RecordScreen() {
  const [recordingState, setRecordingState] = useState<RecordingState>('recording');
  const [duration, setDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string>('');
  const [hasPermission, setHasPermission] = useState(false);
  
  const recording = useRef<Audio.Recording | null>(null);
  const meteringInterval = useRef<ReturnType<typeof setInterval> | null>(null);
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
          // Use more specific settings instead of HIGH_QUALITY preset
          // which might create incompatible formats
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm;codecs=opus',
            bitsPerSecond: 128000,
          },
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
      recording.current.stopAndUnloadAsync().catch(e => console.error('Error on cleanup', e));
      recording.current = null;
    }
  };

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
    let interval: ReturnType<typeof setInterval>;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
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
        setRecordingState('saving');
        
        // Stop metering, but let the useEffect cleanup handle the recording object itself
        stopMetering();
        const uri = recording.current.getURI();
        setAudioUri(uri || '');
        
        // Save entry immediately (transcription will happen in background)
        await addEntry({
          date: new Date().toISOString(),
          title: 'Processing...', // Will be replaced by AI-generated title
          text: '', 
          rawText: '', // Original Whisper output
          duration,
          audioUri: uri || '',
          processingStage: 'transcribing',
        });
        
        // Let the cleanup function handle the recording object on unmount
        // recording.current = null;
        
        // Navigate to history to show the new entry
        router.replace('/history');
      }
    } catch (error) {
      console.error('Error finishing recording:', error);
      setRecordingState('error');
    }
  };

  const handleClose = () => {
    if (recordingState === 'recording' || recordingState === 'paused') {
      Alert.alert(
        'Discard Recording?',
        'Your recording will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => {
            // No need to call cleanupRecording here, unmount will handle it
            router.back();
          }},
        ]
      );
    } else {
      // No need to call cleanupRecording here, unmount will handle it
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
            {recordingState === 'saving' && 'Saving...'}
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
            source={require('@/assets/images/bonsai.png')} 
            style={styles.plantImage}
            resizeMode="contain"
          />
        </View>

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
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
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
    width: 200,
    height: 200,
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