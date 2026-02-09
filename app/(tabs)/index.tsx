import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '@/core/providers/settings';
import { defaults, stages } from '@/styles/assets';
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

  const greeting = useMemo(() => getGreeting(), []);

  const handlePress = () => {
    scale.value = withSpring(0.97, motion.springs.press, () => {
      scale.value = withSpring(1, motion.springs.pressReturn);
    });
    try {
      router.push('/record');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <Pressable onPress={handlePress} style={styles.pressable}>
          <Animated.View style={[styles.animatedContainer, imageAnimatedStyle, containerAnimatedStyle]}>
            <Image
              source={stages.chapel}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />

            <ImageBackground
              source={defaults.noiseTexture}
              style={StyleSheet.absoluteFill}
              resizeMode="repeat"
              imageStyle={{ opacity: 0.04 }}
            />

            <View style={[styles.contentOverlay, { paddingTop: insets.top }]}>
              <View style={styles.header}>
                <Text style={styles.greeting}>{greeting} {settings.displayName}</Text>
                <Text style={styles.subtitle}>Tap to begin</Text>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  pressable: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  contentOverlay: {
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
});
