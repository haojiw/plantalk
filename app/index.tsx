import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

export default function HomeScreen() {
  const { state } = usePlant();
  const scale = useSharedValue(1);
  
  // Animation values for smooth transitions
  const screenScale = useSharedValue(1);
  
  const chevronFloat = useSharedValue(0);
  const chevronPulse = useSharedValue(1);

  // Start animations on mount
  useEffect(() => {
    chevronFloat.value = withRepeat(
      withTiming(-12, { 
        duration: 1800, 
        easing: Easing.inOut(Easing.ease) 
      }),
      -1,
      true
    );

    // Subtle pulse animation for better visibility
    chevronPulse.value = withRepeat(
      withTiming(1.2, { 
        duration: 2500, 
        easing: Easing.inOut(Easing.ease) 
      }),
      -1,
      true
    );
  }, []);

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

  // Function to handle navigation with smooth transition
  const navigateToHistory = () => {
    try {
      // Trigger haptic feedback first
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Start scale animation
      screenScale.value = withTiming(0.95, { 
        duration: 200, 
        easing: Easing.out(Easing.ease) 
      });
      
      // Navigate after a short delay to allow animation to start
      setTimeout(() => {
        router.push('/history');
        // Reset animations for when user comes back
        screenScale.value = 1;
      }, 100);
    } catch (error) {
      console.error('Navigation error:', error);
      // Reset animations if navigation fails
      screenScale.value = withSpring(1);
    }
  };

  // Improved swipe gesture with simplified animation
  const swipeUpGesture = Gesture.Pan()
    .activeOffsetY([-10, 10]) // Allow small horizontal movement
    .failOffsetX([-50, 50]) // Fail if too much horizontal movement
    .minDistance(30) // Minimum distance to trigger
    .onUpdate((event) => {
      // Provide visual feedback during swipe - only scale
      if (event.translationY < -20) {
        const progress = Math.min(1, Math.abs(event.translationY) / 100);
        screenScale.value = 1 - (progress * 0.05);
      }
    })
    .onEnd((event) => {
      // Check for a decisive swipe upwards with improved conditions
      const isSwipeUp = event.translationY < -50;
      const hasEnoughVelocity = Math.abs(event.velocityY) > 300;
      const isUpwardVelocity = event.velocityY < -200;
      
      if (isSwipeUp && hasEnoughVelocity && isUpwardVelocity) {
        // Use runOnJS to ensure the navigation runs on the JS thread
        runOnJS(navigateToHistory)();
      } else {
        // Reset animations if swipe didn't meet criteria
        screenScale.value = withSpring(1, { damping: 15 });
      }
    })
    .onFinalize(() => {
      // Ensure animations are reset on gesture end
      if (screenScale.value !== 1) {
        screenScale.value = withSpring(1, { damping: 15 });
      }
    });

  const plantAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: chevronFloat.value },
        { scale: chevronPulse.value }
      ],
      opacity: 0.7,
    };
  });

  // Main container animation for smooth transitions
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: screenScale.value }],
  }));

  return (
    <ScreenWrapper>
      <GestureDetector gesture={swipeUpGesture}>
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

          {/* Bottom hint */}
          <View style={styles.bottomHint}>
            <Animated.View style={chevronAnimatedStyle}>
              <Ionicons 
                name="chevron-up" 
                size={20} 
                color={theme.colors.text + '60'} 
              />
            </Animated.View>
            <Text style={styles.hintText}>Swipe up for history</Text>
          </View>
        </Animated.View>
      </GestureDetector>
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
    paddingTop: theme.spacing.xxl,
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
    color: theme.colors.text + '40',
    marginTop: theme.spacing.xs,
    fontSize: 12,
  },
});
