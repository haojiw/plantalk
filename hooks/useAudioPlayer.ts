import { setAudioModeAsync, useAudioPlayerStatus, useAudioPlayer as useExpoAudioPlayer } from 'expo-audio';
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
  player: any; // AudioPlayer type from expo-audio
  progressPosition: { value: number };
  handlePlayPause: () => Promise<void>;
  seekToPosition: (position: number) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  setWasPlayingBeforeDrag: (playing: boolean) => void;
  wasPlayingBeforeDrag: boolean;
}

export const useAudioPlayer = ({ audioUri, duration }: UseAudioPlayerProps): UseAudioPlayerReturn => {
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  const progressPosition = useSharedValue(0);

  // Create audio player using expo-audio
  const player = useExpoAudioPlayer(audioUri ? { uri: audioUri } : null);
  const status = useAudioPlayerStatus(player);

  // Configure audio session for speaker output
  useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });
      } catch (error) {
        console.error('Error configuring audio session:', error);
      }
    };

    configureAudioSession();
  }, []);

  // Calculate progress
  const playbackProgress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const isFinished = status.didJustFinish || false;
  const isPlaying = status.playing || false;

  // Update progress position when playback changes
  useEffect(() => {
    progressPosition.value = playbackProgress;
  }, [playbackProgress, progressPosition]);

  const seekToPosition = async (position: number) => {
    if (player && status.duration > 0) {
      try {
        await player.seekTo(position * status.duration);
      } catch (error) {
        console.error('Error seeking audio:', error);
      }
    }
  };

  const pauseAudio = async () => {
    if (player && isPlaying) {
      try {
        player.pause();
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
    }
  };

  const resumeAudio = async () => {
    if (player && !isPlaying && wasPlayingBeforeDrag) {
      try {
        player.play();
      } catch (error) {
        console.error('Error resuming audio:', error);
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      if (!audioUri || !player) return;

      if (isFinished) {
        // Replay from start - expo-audio requires seekTo before play
        await player.seekTo(0);
        player.play();
        return;
      }

      if (isPlaying) {
        player.pause();
      } else {
        player.play();
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
    player, // Changed from 'sound' to 'player' to match expo-audio
    progressPosition,
    handlePlayPause,
    seekToPosition,
    pauseAudio,
    resumeAudio,
    setWasPlayingBeforeDrag,
    wasPlayingBeforeDrag,
  };
}; 