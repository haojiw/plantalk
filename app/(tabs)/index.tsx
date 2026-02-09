import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useSettings } from '@/core/providers/settings';
import { ScreenWrapper } from '@/shared/components';
import { illustrations } from '@/styles/assets';
import { motion } from '@/styles/motion';
import { theme } from '@/styles/theme';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function EntryScreen() {
  const { settings } = useSettings();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: motion.durations.screenFadeIn });
      return () => {
        opacity.value = 0;
      };
    }, [])
  );

  const greeting = useMemo(() => getGreeting(), []);

  const handleChapelPress = () => {
    scale.value = withSpring(0.95, motion.springs.press, () => {
      scale.value = withSpring(1, motion.springs.pressReturn);
    });
    try {
      router.push('/record');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const chapelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScreenWrapper withPadding={false}>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting} {settings.displayName}</Text>
          <Text style={styles.subtitle}>Tap to begin</Text>
        </View>

        {/* Chapel at the bottom */}
        <View style={styles.chapelContainer}>
          <Pressable onPress={handleChapelPress}>
            <Animated.View style={chapelAnimatedStyle}>
              <Image
                source={illustrations.chapel}
                style={styles.chapelImage}
                contentFit="contain"
              />
            </Animated.View>
          </Pressable>
        </View>
      </Animated.View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  greeting: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 32,
    marginVertical: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.handwriting,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  chapelContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chapelImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
});
