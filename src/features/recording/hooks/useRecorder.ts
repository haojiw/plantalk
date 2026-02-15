import { useKeepAwake } from 'expo-keep-awake';
import { useSecureJournal } from '@/core/providers/journal';
import { resampleLevels } from '@/shared/utils';
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

type RecordingState = 'recording' | 'paused' | 'saving' | 'error';

export interface UseRecorderReturn {
  recordingState: RecordingState;
  duration: number;
  hasPermission: boolean;
  audioLevels: number[];
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

  // Create audio recorder using expo-audio with high quality preset + metering
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  // Ref to avoid stale closure in setInterval — always reads latest recorder state
  const recorderStateRef = useRef(recorderState);
  recorderStateRef.current = recorderState;

  // Rolling buffer of normalized audio levels (0-1) for live waveform display
  // Starts empty — bars grow from the right as audio arrives
  const [audioLevels, setAudioLevels] = useState<number[]>([]);

  // Accumulates ALL metering samples for the entire recording (no cap)
  // Downsampled and persisted with the entry for playback waveform
  const allAudioLevelsRef = useRef<number[]>([]);

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
    meteringInterval.current = setInterval(() => {
      const state = recorderStateRef.current;
      if (state.isRecording && state.metering !== undefined) {
        const db = state.metering ?? -160;
        // Hard noise gate at -30dB — kills ambient room noise
        // Map -30→0 dB to 0→1, power curve for natural spread
        const normalized = db < -30
          ? 0
          : Math.pow(Math.min(1, (db + 30) / 30), 0.6);

        // Accumulate every sample for playback waveform
        allAudioLevelsRef.current.push(normalized);

        setAudioLevels(prev => {
          // Grow from right until buffer is full, then shift left
          const next = prev.length < 50
            ? [...prev, normalized]
            : [...prev.slice(1), normalized];
          return next;
        });
      }
    }, 70);
  };

  const stopMetering = () => {
    if (meteringInterval.current) {
      clearInterval(meteringInterval.current);
      meteringInterval.current = null;
    }
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
      
      // Downsample full metering history to 200 samples for storage
      const downsampledLevels = resampleLevels(allAudioLevelsRef.current, 200);

      // Save entry immediately (transcription will happen in background)
      await addEntry({
        date: new Date().toISOString(),
        title: 'Processing...',
        text: '',
        rawText: '',
        duration,
        audioUri: uri || '',
        processingStage: 'transcribing',
        audioLevels: downsampledLevels,
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
    audioLevels,
    handlePauseRecording,
    handleResumeRecording,
    handleFinishRecording,
    handleClose,
    formatDuration,
  };
}; 