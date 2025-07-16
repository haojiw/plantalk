import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PlantEntry } from '@/context/PlantProvider';

const { height: screenHeight } = Dimensions.get('window');

interface MasterGestureContainerProps {
  homeComponent: React.ReactElement;
  historyComponent: React.ReactElement;
  entries: PlantEntry[];
}

export const MasterGestureContainer: React.FC<MasterGestureContainerProps> = ({
  homeComponent,
  historyComponent,
  entries,
}) => {
  // Master pan gesture shared value
  const gestureTranslateY = useSharedValue(0);
  
  // Master pan gesture implementation
  const masterPanGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Allow both upward swipes (negative) and downward swipes (positive)
      // Clamp between 0 (home) and -screenHeight (history)
      const clampedTranslation = Math.max(
        Math.min(event.translationY, 0), // Don't allow swiping below home
        -screenHeight // Don't allow swiping above history
      );
      gestureTranslateY.value = clampedTranslation;
    })
    .onEnd((event) => {
      const threshold = -screenHeight / 3;
      const velocityThreshold = 400; // Use positive for downward velocity
      
      // Determine user intent based on translation and velocity
      const shouldShowHistory = 
        event.translationY < threshold || event.velocityY < -velocityThreshold;
      
      const shouldShowHome = 
        event.translationY > -threshold || event.velocityY > velocityThreshold;
      
      if (shouldShowHistory) {
        // Snap to history screen
        gestureTranslateY.value = withSpring(-screenHeight, {
          damping: 20,
          stiffness: 300,
        });
      } else if (shouldShowHome || gestureTranslateY.value > -screenHeight / 2) {
        // Snap back to home screen
        gestureTranslateY.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
      } else {
        // Default to history if we're closer to it
        gestureTranslateY.value = withSpring(-screenHeight, {
          damping: 20,
          stiffness: 300,
        });
      }
    });

  // HomeScreen container animation (no opacity, just movement and visibility)
  const homeAnimatedStyle = useAnimatedStyle(() => {
    // Completely hide home screen when showing history
    if (gestureTranslateY.value <= -screenHeight * 0.8) {
      return {
        transform: [{ translateY: -screenHeight }], // Move completely out of view
      };
    }

    return {
      transform: [
        { translateY: gestureTranslateY.value * 0.5 } // Parallax at 50% speed
      ],
    };
  });

  // HistoryScreen container animation (direct movement)
  const historyAnimatedStyle = useAnimatedStyle(() => {
    const translateY = screenHeight + gestureTranslateY.value;
    
    return {
      transform: [{ translateY }],
    };
  });

  // Provide staggered animation context to history components
  const historyStaggeredProps = {
    masterGestureValue: gestureTranslateY,
    entries,
  };

  // Provide master gesture value to home component
  const homeProps = {
    masterGestureValue: gestureTranslateY,
  };

  return (
    <ScreenWrapper>
      <GestureDetector gesture={masterPanGesture}>
        <View style={styles.masterContainer}>
          {/* HomeScreen Container */}
          <Animated.View style={[styles.screenContainer, homeAnimatedStyle]}>
            {React.cloneElement(homeComponent, homeProps)}
          </Animated.View>

          {/* HistoryScreen Container - positioned below viewport */}
          <Animated.View style={[styles.screenContainer, styles.historyContainer, historyAnimatedStyle]}>
            {React.cloneElement(historyComponent, historyStaggeredProps)}
          </Animated.View>
        </View>
      </GestureDetector>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  masterContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden', // Hide content that goes outside bounds
  },
  screenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: screenHeight,
    zIndex: 1,
  },
  historyContainer: {
    zIndex: 2, // Ensure history is on top
  },
}); 