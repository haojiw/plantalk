import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

export default function HomeScreen() {
  const { state } = usePlant();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Get plant icon based on growth stage
  const getPlantIcon = (stage: number): string => {
    switch (stage) {
      case 0: return 'ellipse-outline'; // seed
      case 1: return 'leaf-outline'; // sprout
      case 2: return 'leaf'; // small plant
      case 3: return 'flower-outline'; // growing
      case 4: return 'flower'; // fully grown
      default: return 'ellipse-outline';
    }
  };

  const getPlantSize = (stage: number): number => {
    return 60 + (stage * 20); // Grows from 60 to 140
  };

  const getStageText = (stage: number): string => {
    switch (stage) {
      case 0: return 'Plant a seed';
      case 1: return 'First sprout!';
      case 2: return 'Growing strong';
      case 3: return 'Almost blooming';
      case 4: return 'In full bloom';
      default: return 'Plant a seed';
    }
  };

  // Handle plant press - animate and open record modal
  const handlePlantPress = () => {
    // Quick scale animation
    scale.value = withSpring(0.9, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 200 });
    });
    
    // Navigate to record modal
    setTimeout(() => {
      router.push('/record');
    }, 150);
  };

  // Swipe up gesture to switch to history tab
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -100 && event.velocityY < -500) {
        // Swipe up detected - switch to history tab
        runOnJS(router.push)('/(tabs)/history');
      }
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const plantAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ScreenWrapper>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.streakText}>
              {state.streak > 0 ? `${state.streak} day streak` : 'Start your journey'}
            </Text>
          </View>

          {/* Plant Display */}
          <View style={styles.plantContainer}>
            <Pressable onPress={handlePlantPress}>
              <Animated.View style={[styles.plantWrapper, plantAnimatedStyle]}>
                <View style={styles.plantCard}>
                  <Ionicons
                    name={getPlantIcon(state.stage) as any}
                    size={getPlantSize(state.stage)}
                    color={theme.colors.primary}
                  />
                </View>
              </Animated.View>
            </Pressable>
            
            <Text style={styles.stageText}>{getStageText(state.stage)}</Text>
            <Text style={styles.instructionText}>
              Tap to share your thoughts
            </Text>
          </View>

          {/* Bottom hint */}
          <View style={styles.bottomHint}>
            <Ionicons 
              name="chevron-up" 
              size={20} 
              color={theme.colors.text + '60'} 
            />
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
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  stageText: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  instructionText: {
    ...theme.typography.body,
    color: theme.colors.text + '80',
    textAlign: 'center',
  },
  bottomHint: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
  },
  hintText: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
    marginTop: theme.spacing.xs,
  },
}); 