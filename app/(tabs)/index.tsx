import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

export default function EntryScreen() {
  const { state } = usePlant();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

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
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.streakText}>Start your journey</Text>
        </View>

        {/* Plant Display */}
        <View style={styles.plantContainer}>
          <Pressable onPress={handlePlantPress}>
            <Animated.View style={[styles.plantWrapper, plantAnimatedStyle]}>
              <View style={styles.plantCard}>
                <Image
                  source={require('@/assets/images/bonsai.png')}
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
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  streakText: {
    ...theme.typography.body,
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
    width: 200,
    height: 200,
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
  bottomHint: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
  },
  hintText: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
    marginTop: theme.spacing.xs,
    fontSize: 12,
  },
}); 