import { useAudioPlayer, UseAudioPlayerProps } from '@/hooks/useAudioPlayer';
import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle } from 'react-native-reanimated';

interface AudioPlayerProps extends UseAudioPlayerProps {
  duration?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUri, duration }) => {
  const {
    isPlaying,
    isFinished,
    progressPosition,
    handlePlayPause,
    seekToPosition,
    pauseAudio,
    resumeAudio,
    setWasPlayingBeforeDrag,
    wasPlayingBeforeDrag,
  } = useAudioPlayer({ audioUri, duration });

  const formatDuration = (duration?: number): string => {
    if (!duration) return '0:00';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Modern Gesture API for draggable slider
  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Store playing state and pause audio while dragging
      runOnJS(setWasPlayingBeforeDrag)(isPlaying);
      if (isPlaying) {
        runOnJS(pauseAudio)();
      }
    })
    .onUpdate((event) => {
      // Using a more reliable width calculation
      const containerWidth = 250; // Approximate progress container width
      const newProgress = Math.max(0, Math.min(1, event.x / containerWidth));
      progressPosition.value = newProgress;
    })
    .onEnd(() => {
      // Seek to new position and resume if was playing
      runOnJS(seekToPosition)(progressPosition.value);
      if (wasPlayingBeforeDrag) {
        runOnJS(resumeAudio)();
      }
    });

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressPosition.value * 100}%`,
  }));

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    left: `${progressPosition.value * 100}%`,
    transform: [{ translateX: -8 }], // Half the thumb width to center it
  }));

  if (!audioUri) return null;

  return (
    <View style={styles.audioPlayer}>
      <Pressable onPress={handlePlayPause} style={styles.playButton}>
        <Ionicons 
          name={isFinished ? "refresh" : (isPlaying ? "pause" : "play")} 
          size={20} 
          color={theme.colors.surface} 
        />
      </Pressable>
      
      <View style={styles.audioInfo}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View 
                style={[styles.progressFill, progressAnimatedStyle]} 
              />
            </View>
            <Animated.View style={[styles.progressThumb, thumbAnimatedStyle]} />
          </Animated.View>
        </GestureDetector>
        <Text style={styles.audioDuration}>
          {formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  progressContainer: {
    flex: 1,
    height: 24, // Increased for better touch area
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    position: 'relative',
  },
  progressTrack: {
    height: 4,
    backgroundColor: theme.colors.border + '60',
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: '50%',
    width: 16,
    height: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    marginTop: -8, // Half height to center vertically
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  audioDuration: {
    ...theme.typography.caption,
    color: theme.colors.text + '80',
    fontFamily: 'SpaceMono',
    marginLeft: theme.spacing.sm,
  },
}); 