import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedRef, useAnimatedStyle, useScrollViewOffset, useSharedValue, withSpring } from 'react-native-reanimated';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = usePlant();
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const dateRevealed = useSharedValue(0); // 0 = hidden, 1 = revealed
  const progressPosition = useSharedValue(0); // For draggable slider
  
  const entry = state.entries.find(e => e.id === id);

  // Configure audio session for speaker output
  useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false, // This ensures speaker output on Android
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

  // Enhanced date animation that can hide again when scrolling down
  const dateAnimatedStyle = useAnimatedStyle(() => {
    const pullOpacity = interpolate(
      scrollOffset.value,
      [-100, -50, 0],
      [1, 0.5, 0],
      'clamp'
    );
    
    // If user pulls down significantly, reveal the date permanently
    if (scrollOffset.value < -50 && dateRevealed.value === 0) {
      dateRevealed.value = withSpring(1, { damping: 15, stiffness: 100 });
    }
    
    // If user scrolls down after revealing, hide the date again
    if (scrollOffset.value > 50 && dateRevealed.value === 1) {
      dateRevealed.value = withSpring(0, { damping: 15, stiffness: 100 });
    }
    
    // Show either pull-to-reveal or permanent revealed state
    const finalOpacity = Math.max(pullOpacity, dateRevealed.value);
    
    return {
      opacity: finalOpacity,
    };
  });

  if (!entry) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </Pressable>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.errorContainer}>
            <Ionicons name="leaf-outline" size={48} color={theme.colors.primary + '40'} />
            <Text style={styles.errorText}>Entry not found</Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '0:00';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      if (!entry.audioUri) return;

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
          { uri: entry.audioUri },
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

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(entry.transcription);
      Alert.alert('Copied', 'Transcription copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text');
    }
  };

  const handleMorePress = () => {
    // Empty function for now as requested
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
      runOnJS(setPlaybackProgress)(newProgress);
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

  // Update progress position when playback changes
  React.useEffect(() => {
    progressPosition.value = playbackProgress;
  }, [playbackProgress]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Minimalist Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerControls}>
            <Pressable onPress={handleCopyText} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={24} color={theme.colors.text} />
            </Pressable>
            <Pressable onPress={handleMorePress} style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        <Animated.ScrollView 
          ref={scrollRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
        >
          {/* Date - Hidden by default, reveals on overscroll */}
          <Animated.Text style={[styles.date, dateAnimatedStyle]}>
            {formatDate(entry.date)}
          </Animated.Text>
          
          {/* Title */}
          <Text style={styles.title}>{entry.title}</Text>
          
          {/* Audio Player */}
          {entry.audioUri && (
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
                  {formatDuration(entry.duration)}
                </Text>
              </View>
            </View>
          )}
          
          {/* Transcription as Body Text */}
          <Text style={styles.transcriptionText}>{entry.transcription}</Text>
        </Animated.ScrollView>
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  copyButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
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
  transcriptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 26,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    marginTop: theme.spacing.md,
  },
}); 