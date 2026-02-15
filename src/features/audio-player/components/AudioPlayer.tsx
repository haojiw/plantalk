import { useAudioPlayer, UseAudioPlayerProps } from '@/features/audio-player';
import { resampleLevels } from '@/shared/utils';
import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_MIN_HEIGHT = 3;
const BAR_MAX_HEIGHT = 28;

interface AudioPlayerProps extends UseAudioPlayerProps {
  duration?: number;
  audioLevels?: number[];
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUri, duration, audioLevels }) => {
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

  const [containerWidth, setContainerWidth] = useState(0);
  const containerWidthShared = useSharedValue(0);

  const barCount = containerWidth > 0
    ? Math.floor(containerWidth / (BAR_WIDTH + BAR_GAP))
    : 0;

  const bars = useMemo(() => {
    if (barCount === 0) return [];
    if (!audioLevels || audioLevels.length === 0) {
      // Generate a pseudo-random waveform seeded by duration for variety
      let seed = ((duration || 1) * 127) | 0;
      return Array.from({ length: barCount }, () => {
        seed = (seed * 16807) % 2147483647;
        return 0.15 + ((seed & 0xff) / 255) * 0.5;
      });
    }
    return resampleLevels(audioLevels, barCount);
  }, [audioLevels, barCount, duration]);

  const formatDuration = (d?: number): string => {
    if (!d) return '0:00';
    const mins = Math.floor(d / 60);
    const secs = d % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setContainerWidth(width);
    containerWidthShared.value = width;
  };

  // Gesture for seeking via waveform
  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setWasPlayingBeforeDrag)(isPlaying);
      if (isPlaying) {
        runOnJS(pauseAudio)();
      }
    })
    .onUpdate((event) => {
      const w = containerWidthShared.value;
      if (w > 0) {
        const newProgress = Math.max(0, Math.min(1, event.x / w));
        progressPosition.value = newProgress;
      }
    })
    .onEnd(() => {
      runOnJS(seekToPosition)(progressPosition.value);
      if (wasPlayingBeforeDrag) {
        runOnJS(resumeAudio)();
      }
    });

  // Tap gesture for seeking
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const w = containerWidthShared.value;
      if (w > 0) {
        const newProgress = Math.max(0, Math.min(1, event.x / w));
        progressPosition.value = newProgress;
        runOnJS(seekToPosition)(newProgress);
      }
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Clip width for the "played" waveform layer
  const playedClipStyle = useAnimatedStyle(() => ({
    width: `${progressPosition.value * 100}%`,
  }));

  if (!audioUri) return null;

  return (
    <View style={styles.audioPlayer}>
      <Pressable onPress={handlePlayPause} style={styles.playButton}>
        <Ionicons
          name={isFinished ? 'refresh' : isPlaying ? 'pause' : 'play'}
          size={18}
          color={theme.colors.surface}
        />
      </Pressable>

      <View style={styles.audioInfo}>
        <GestureDetector gesture={composedGesture}>
          <View style={styles.waveformContainer} onLayout={handleLayout}>
            {/* Bottom layer: unplayed bars (muted) */}
            <View style={styles.barsRow}>
              {bars.map((level, i) => (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    styles.barUnplayed,
                    { height: BAR_MIN_HEIGHT + level * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) },
                  ]}
                />
              ))}
            </View>

            {/* Top layer: played bars (primary), clipped by progress */}
            <Animated.View style={[styles.playedOverlay, playedClipStyle]}>
              <View style={styles.barsRow}>
                {bars.map((level, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      styles.barPlayed,
                      { height: BAR_MIN_HEIGHT + level * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) },
                    ]}
                  />
                ))}
              </View>
            </Animated.View>
          </View>
        </GestureDetector>

        <Text style={styles.audioDuration}>{formatDuration(duration)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  audioPlayer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  audioInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    height: BAR_MAX_HEIGHT + 8,
    justifyContent: 'center',
    marginHorizontal: theme.spacing.sm,
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BAR_GAP,
    height: BAR_MAX_HEIGHT,
  },
  playedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
  },
  barUnplayed: {
    backgroundColor: theme.colors.primaryMuted20,
  },
  barPlayed: {
    backgroundColor: theme.colors.primary,
  },
  audioDuration: {
    ...theme.typography.caption,
    color: theme.colors.textMuted80,
    fontFamily: theme.fonts.monospace,
    marginHorizontal: theme.spacing.xs,
  },
});
