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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenWrapper } from '@/shared/components';
import { illustrations } from '@/styles/assets';
import { motion } from '@/styles/motion';
import { theme } from '@/styles/theme';

function formatDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function EntryScreen() {
  const insets = useSafeAreaInsets();
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

  const date = useMemo(() => formatDate(), []);

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
        <View style={styles.header}>
          <Text style={styles.date}>{date}.</Text>
        </View>

        <View style={[styles.chapelContainer, { marginBottom: -insets.bottom }]}>
          <Pressable onPress={handleChapelPress}>
            <Animated.View style={chapelAnimatedStyle}>
              <Image
                source={illustrations.chapel}
                style={styles.chapelImage}
                contentFit="cover"
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
  date: {
    ...theme.typography.handwriting,
    color: theme.colors.textMuted60,
    fontSize: 18,
    lineHeight: 20,
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
