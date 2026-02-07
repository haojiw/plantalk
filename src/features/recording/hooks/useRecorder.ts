import { useKeepAwake } from 'expo-keep-awake';
import { useSecureJournal } from '@/core/providers/journal';
import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState
} from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { motion } from '@/styles/motion';

type RecordingState = 'recording' | 'paused' | 'saving' | 'error';

export interface UseRecorderReturn {
  recordingState: RecordingState;
  duration: number;
  hasPermission: boolean;
  waveformValues: Array<{ value: number }>;
  handlePauseRecording: () => Promise<void>;
  handleResumeRecording: () => Promise<void>;
  handleFinishRecording: () => Promise<void>;
  handleClose: () => void;
  formatDuration: (seconds: number) => string;
}

export const useRecorder = (): UseRecorderReturn => {
  useKeepAwake(); // Keep screen awake during recording

  const [recordingState, setRecordingState] = useState<RecordingState>('recording');
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  
  const meteringInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addEntry } = useSecureJournal();

  // Create audio recorder using expo-audio with high quality preset
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

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

  const waveformValues = [
    waveform1, waveform2, waveform3, waveform4, waveform5,
    waveform6, waveform7, waveform8, waveform9
  ];

  // Monitor app state to ensure recording continues in background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('App state changed to:', nextAppState);
      // Keep recording active even when app goes to background
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('App went to background, recording should continue...');
      } else if (nextAppState === 'active') {
        console.log('App became active, checking recording status...');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Auto-start recording on mount
  useEffect(() => {
    const startRecordingAutomatically = async () => {
      try {
        // Request permissions using expo-audio
        const { status } = await AudioModule.requestRecordingPermissionsAsync();
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

        // Configure audio mode using expo-audio for background recording
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          // Additional settings for robust background recording
          interruptionMode: 'doNotMix', // Don't mix with other audio
          interruptionModeAndroid: 'doNotMix', // Android-specific interruption handling
        });

        // Start recording immediately
        setDuration(0);
        setRecordingState('recording');
        
        // Prepare and start recording
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
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
    // expo-audio handles cleanup automatically
  };

  const startMetering = () => {
    meteringInterval.current = setInterval(async () => {
      if (recorderState.isRecording && recorderState.metering !== undefined) {
        try {
          // Convert dBFS to a 0-1 scale (dBFS ranges from -160 to 0)
          // We'll focus on the -60 to 0 range for better visual response
          const normalizedLevel = Math.max(0, Math.min(1, (recorderState.metering + 60) / 60));
          
          // Add some randomization for more natural waveform appearance
          const variation = 0.2;
          const baseLevel = Math.max(0.1, normalizedLevel);
          
          // Update waveform bars with slight delays and variations
          const { min, max } = motion.durations.waveformBar;
          const randDur = () => min + Math.random() * (max - min);
          waveform1.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: randDur() });
          waveform2.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: randDur() });
          waveform3.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: randDur() });
          waveform4.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: randDur() });
          waveform5.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: randDur() });
          waveform6.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: randDur() });
          waveform7.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: randDur() });
          waveform8.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: randDur() });
          waveform9.value = withTiming(baseLevel + (Math.random() - 0.5) * variation, { duration: randDur() });
        } catch (error) {
          console.error('Error getting metering:', error);
        }
      }
    }, 100);
  };

  const stopMetering = () => {
    if (meteringInterval.current) {
      clearInterval(meteringInterval.current);
      meteringInterval.current = null;
    }
    
    // Animate bars back to idle state
    const idleHeight = 0.3;
    const idleDuration = motion.durations.waveformIdle;
    waveform1.value = withTiming(idleHeight, { duration: idleDuration });
    waveform2.value = withTiming(idleHeight, { duration: idleDuration });
    waveform3.value = withTiming(idleHeight, { duration: idleDuration });
    waveform4.value = withTiming(idleHeight, { duration: idleDuration });
    waveform5.value = withTiming(idleHeight, { duration: idleDuration });
    waveform6.value = withTiming(idleHeight, { duration: idleDuration });
    waveform7.value = withTiming(idleHeight, { duration: idleDuration });
    waveform8.value = withTiming(idleHeight, { duration: idleDuration });
    waveform9.value = withTiming(idleHeight, { duration: idleDuration });
  };

  // Timer for recording duration with 1-hour limit
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          // Check if we've reached the 1-hour limit (3600 seconds)
          if (newDuration >= 3600) {
            Alert.alert(
              'Recording Limit Reached',
              'The maximum recording duration is 1 hour. Your recording will be saved automatically.',
              [{ text: 'OK', onPress: () => handleFinishRecording() }]
            );
            return 3600; // Cap at exactly 1 hour
          }
          return newDuration;
        });
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
      audioRecorder.pause();
      setRecordingState('paused');
      stopMetering();
    } catch (error) {
      console.error('Error pausing recording:', error);
    }
  };

  const handleResumeRecording = async () => {
    try {
      audioRecorder.record();
      setRecordingState('recording');
      startMetering();
    } catch (error) {
      console.error('Error resuming recording:', error);
    }
  };

  const handleFinishRecording = async () => {
    try {
      setRecordingState('saving');
      
      stopMetering();
      await audioRecorder.stop();
      
      // Get the recording URI
      const uri = audioRecorder.uri;
      
      // Save entry immediately (transcription will happen in background)
      await addEntry({
        date: new Date().toISOString(),
        title: 'Processing...',
        text: '', 
        rawText: '',
        duration,
        audioUri: uri || '',
        processingStage: 'transcribing',
      });
      
      // Navigate to history to show the new entry
      router.replace('/(tabs)/journal');
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
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  return {
    recordingState,
    duration,
    hasPermission,
    waveformValues,
    handlePauseRecording,
    handleResumeRecording,
    handleFinishRecording,
    handleClose,
    formatDuration,
  };
}; 