import { interpolate, SharedValue, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export interface UseDateRevealAnimationProps {
  scrollOffset: SharedValue<number>;
}

export interface UseDateRevealAnimationReturn {
  dateAnimatedStyle: {
    opacity: number;
  };
}

export const useDateRevealAnimation = ({ scrollOffset }: UseDateRevealAnimationProps): UseDateRevealAnimationReturn => {
  const dateRevealed = useSharedValue(0); // 0 = hidden, 1 = revealed

  // Enhanced date animation that can hide again when scrolling down
  const dateAnimatedStyle = useAnimatedStyle(() => {
    const pullOpacity = interpolate(
      scrollOffset.value,
      [-100, -50, 0],
      [1, 0.5, 0],
      'clamp'
    );
    
    // If user pulls down significantly, reveal the date permanently
    if (scrollOffset.value < -50 && dateRevealed.value === 0) {
      dateRevealed.value = withSpring(1, { damping: 15, stiffness: 100 });
    }
    
    // If user scrolls down after revealing, hide the date again
    if (scrollOffset.value > 50 && dateRevealed.value === 1) {
      dateRevealed.value = withSpring(0, { damping: 15, stiffness: 100 });
    }
    
    // Show either pull-to-reveal or permanent revealed state
    const finalOpacity = Math.max(pullOpacity, dateRevealed.value);
    
    return {
      opacity: finalOpacity,
    };
  });

  return {
    dateAnimatedStyle,
  };
}; 