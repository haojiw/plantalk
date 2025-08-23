import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

export interface UseAudioPlayerProps {
  audioUri?: string;
  duration?: number;
}

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  playbackProgress: number;
  isFinished: boolean;
  sound: Audio.Sound | null;
  progressPosition: { value: number };
  handlePlayPause: () => Promise<void>;
  seekToPosition: (position: number) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  setWasPlayingBeforeDrag: (playing: boolean) => void;
  wasPlayingBeforeDrag: boolean;
}

export const useAudioPlayer = ({ audioUri, duration }: UseAudioPlayerProps): UseAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  const progressPosition = useSharedValue(0);

  // Configure audio session for speaker output
  useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error configuring audio session:', error);
      }
    };

    configureAudioSession();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Update progress position when playback changes
  useEffect(() => {
    progressPosition.value = playbackProgress;
  }, [playbackProgress, progressPosition]);

  const seekToPosition = async (position: number) => {
    if (sound && audioDuration > 0) {
      try {
        await sound.setPositionAsync(position * audioDuration * 1000);
      } catch (error) {
        console.error('Error seeking audio:', error);
      }
    }
  };

  const pauseAudio = async () => {
    if (sound && isPlaying) {
      try {
        await sound.pauseAsync();
        setIsPlaying(false);
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
    }
  };

  const resumeAudio = async () => {
    if (sound && !isPlaying && wasPlayingBeforeDrag) {
      try {
        await sound.playAsync();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error resuming audio:', error);
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      if (!audioUri) return;

      if (isFinished) {
        // Replay from start
        if (sound) {
          await sound.setPositionAsync(0);
          await sound.playAsync();
          setIsPlaying(true);
          setIsFinished(false);
          setPlaybackProgress(0);
        }
        return;
      }

      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
        setIsPlaying(!isPlaying);
      } else {
        // Load and play new sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
        
        setSound(newSound);
        setIsPlaying(true);
        setIsFinished(false);

        // Get duration
        const status = await newSound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setAudioDuration(status.durationMillis / 1000);
        }

        // Set up playback status listener for progress tracking
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              setIsPlaying(false);
              setIsFinished(true);
              setPlaybackProgress(1);
            } else if (status.durationMillis) {
              const progress = status.positionMillis / status.durationMillis;
              setPlaybackProgress(progress);
              progressPosition.value = progress;
            }
          }
        });
      }
    } catch (error) {
      console.error('Error handling audio playback:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  return {
    isPlaying,
    playbackProgress,
    isFinished,
    sound,
    progressPosition,
    handlePlayPause,
    seekToPosition,
    pauseAudio,
    resumeAudio,
    setWasPlayingBeforeDrag,
    wasPlayingBeforeDrag,
  };
}; 