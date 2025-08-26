import { usePlant } from '@/context/PlantProvider';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

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
  const [recordingState, setRecordingState] = useState<RecordingState>('recording');
  const [duration, setDuration] = useState(0);
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

  const waveformValues = [
    waveform1, waveform2, waveform3, waveform4, waveform5,
    waveform6, waveform7, waveform8, waveform9
  ];

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
          staysActiveInBackground: true,
        });

        // Start recording immediately
        setDuration(0);
        setRecordingState('recording');
        
        // Create new recording
        recording.current = new Audio.Recording();
        await recording.current.prepareToRecordAsync({
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
          isMeteringEnabled: true,
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
    }, 100);
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
        
        stopMetering();
        const uri = recording.current.getURI();
        
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