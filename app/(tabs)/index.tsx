import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useSecureJournal } from '@/core/providers/journal';
import { ScreenWrapper } from '@/shared/components';
import { theme } from '@/styles/theme';

export default function EntryScreen() {
  const { state } = useSecureJournal();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 200 });
      return () => {
        opacity.value = 0;
      };
    }, [])
  );

  // Handle plant press - animate and open record modal
  const handlePlantPress = () => {
    // Quick scale animation
    scale.value = withSpring(0.9, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 200 });
    });
    
    // Navigate to record screen
    try {
      router.push('/record');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const plantAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScreenWrapper>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning Haoji</Text>
          <Text style={styles.streakText}>Start your journey today</Text>
        </View>

        {/* Plant Display */}
        <View style={styles.plantContainer}>
          <Pressable onPress={handlePlantPress}>
            <Animated.View style={[styles.plantWrapper, plantAnimatedStyle]}>
              <View style={styles.plantCard}>
                <Image
                  source={require('@assets/images/tree.png')}
                  style={styles.plantImage}
                  contentFit="contain"
                />
              </View>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
  },
  greeting: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 32,
    marginVertical: theme.spacing.sm,
  },
  streakText: {
    ...theme.typography.handwriting,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  plantContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  plantWrapper: {
    marginBottom: theme.spacing.lg,
  },
  plantCard: {
    width: 300,
    height: 300,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  plantImage: {
    width: 300,
    height: 300,
  },
}); 