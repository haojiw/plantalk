import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    interpolate,
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

const { height: screenHeight } = Dimensions.get('window');

export default function HomeScreen() {
  const { state } = usePlant();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  
  // Breathing animation for plant
  const breathingScale = useSharedValue(1);
  const breathingOpacity = useSharedValue(1);
  
  // Floating animation for chevron
  const chevronFloat = useSharedValue(0);

  // Start breathing animation on mount
  useEffect(() => {
    // Gentle breathing animation - scale slightly up/down
    breathingScale.value = withRepeat(
      withTiming(1.02, { 
        duration: 3000, 
        easing: Easing.inOut(Easing.ease) 
      }),
      -1,
      true
    );
    
    // Subtle opacity breathing
    breathingOpacity.value = withRepeat(
      withTiming(0.95, { 
        duration: 3000, 
        easing: Easing.inOut(Easing.ease) 
      }),
      -1,
      true
    );

    // Floating chevron animation
    chevronFloat.value = withRepeat(
      withTiming(-8, { 
        duration: 2000, 
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
    router.push('/record');
  };

  // Navigate to history with smooth transition
  const navigateToHistory = () => {
    router.push('/history');
  };

  // Enhanced swipe up gesture for seamless transition
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        // Clamp the translation to create resistance effect
        const clampedTranslation = Math.max(event.translationY, -screenHeight * 0.8);
        translateY.value = clampedTranslation;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -100 && event.velocityY < -500) {
        // Smooth transition to history screen
        translateY.value = withTiming(-screenHeight, {
          duration: 300,
          easing: Easing.out(Easing.quad),
        }, () => {
          runOnJS(navigateToHistory)();
          // Reset position after navigation
          translateY.value = 0;
        });
      } else {
        // Spring back to original position
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, -screenHeight * 0.3],
      [1, 0.7],
      'clamp'
    );
    
    const scale = interpolate(
      translateY.value,
      [0, -screenHeight * 0.3],
      [1, 0.95],
      'clamp'
    );

    return {
      transform: [
        { translateY: translateY.value },
        { scale }
      ],
      opacity,
    };
  });

  const plantAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const breathingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
    opacity: breathingOpacity.value,
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => {
    const combinedTranslateY = chevronFloat.value + interpolate(
      translateY.value,
      [0, -100],
      [0, -10],
      'clamp'
    );

    const opacity = interpolate(
      translateY.value,
      [0, -50],
      [0.6, 1],
      'clamp'
    );

    return {
      transform: [{ translateY: combinedTranslateY }],
      opacity,
    };
  });

  return (
    <ScreenWrapper>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.streakText}>Start your journey</Text>
          </View>

          {/* Plant Display */}
          <View style={styles.plantContainer}>
            <Pressable onPress={handlePlantPress}>
              <Animated.View style={[styles.plantWrapper, plantAnimatedStyle]}>
                <Animated.View style={[styles.plantCard, breathingAnimatedStyle]}>
                  <Image
                    source={require('@/assets/images/plant.png')}
                    style={styles.plantImage}
                    resizeMode="contain"
                  />
                </Animated.View>
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
    width: 180,
    height: 180,
  },
  bottomHint: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
  },
}); 