import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming
} from 'react-native-reanimated';

import { theme } from '@/styles/theme';

interface HomeScreenContentProps {
  masterGestureValue?: Animated.SharedValue<number>;
}

export const HomeScreenContent: React.FC<HomeScreenContentProps> = ({
  masterGestureValue,
}) => {
  const scale = useSharedValue(1);
  
  // Breathing animation for plant
  const breathingScale = useSharedValue(1);
  
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

    // Floating chevron animation
    chevronFloat.value = withRepeat(
      withTiming(-8, { 
        duration: 2000, 
        easing: Easing.inOut(Easing.ease) 
      }),
      -1,
      true
    );
  }, [breathingScale, chevronFloat]);

  // Handle plant press - animate and open record modal
  const handlePlantPress = () => {
    // Quick scale animation
    scale.value = withSpring(0.9, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 200 });
    });
    
    // Navigate to record screen
    router.push('/record');
  };

  const plantAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const breathingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => {
    // Base floating animation
    const baseTranslateY = chevronFloat.value;
    
    // Enhanced visibility and responsiveness to gesture
    let opacity = 0.8;
    let scale = 1;
    
    // If master gesture is available, make it more prominent when at home screen
    if (masterGestureValue) {
      // More visible when completely at home
      const homeProgress = interpolate(
        masterGestureValue.value,
        [-50, 0],
        [0.5, 1],
        'clamp'
      );
      opacity = 0.6 + (homeProgress * 0.4);
      scale = 0.9 + (homeProgress * 0.3);
    }
    
    return {
      transform: [
        { translateY: baseTranslateY },
        { scale }
      ],
      opacity,
    };
  });

  return (
    <View style={styles.container}>
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
    </View>
  );
};

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
    paddingTop: theme.spacing.md,
  },
}); 