import { defaults } from '@/styles/assets';
import { theme } from '@/styles/theme';
import { motion } from '@/styles/motion';
import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const BAR_WIDTH = 3;
const BAR_GAP = 2.5;
const BAR_MIN_HEIGHT = 3;
const BAR_MAX_HEIGHT = 56;
const FADE_COLUMNS = 10;

interface WaveformProps {
  audioLevels: number[];
}

interface AnimatedBarProps {
  level: number;
  index: number;
  total: number;
}

const AnimatedBar = React.memo(({ level, index, total }: AnimatedBarProps) => {
  const height = useSharedValue(BAR_MIN_HEIGHT);

  const fade = index < FADE_COLUMNS ? (index + 1) / FADE_COLUMNS : 1;
  const targetHeight = BAR_MIN_HEIGHT + level * fade * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);
  const opacity = index < FADE_COLUMNS ? 0.3 + fade * 0.7 : 1;

  useEffect(() => {
    const { min, max } = motion.durations.waveformBar;
    const duration = min + Math.random() * (max - min);
    height.value = withTiming(targetHeight, { duration });
  }, [targetHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[styles.bar, animatedStyle, { opacity }]}
    />
  );
});

export const Waveform: React.FC<WaveformProps> = React.memo(({ audioLevels }) => {
  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {audioLevels.map((level, i) => (
          <AnimatedBar
            key={i}
            level={level}
            index={i}
            total={audioLevels.length}
          />
        ))}
      </View>

      <View style={styles.imageContainer}>
        <Image
          source={defaults.recorder}
          style={styles.doorImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_MAX_HEIGHT + 8,
    gap: BAR_GAP,
  },
  bar: {
    width: BAR_WIDTH,
    backgroundColor: theme.colors.primary,
    borderRadius: BAR_WIDTH / 2,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doorImage: {
    width: 260,
    height: 260,
  },
});
