import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolate,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { JournalEntry } from '@/shared/types';
import { theme } from '@/styles/theme';

const { width: screenWidth } = Dimensions.get('window');

interface EntryItemProps {
  item: JournalEntry;
  isLast: boolean;
  swipedEntryId: string | null;
  onEntryPress: (entry: JournalEntry) => void;
  onEntryDelete: (entryId: string) => void;
  onSwipeOpen: (entryId: string | null) => void;
}

export const EntryItem: React.FC<EntryItemProps> = ({
  item,
  isLast,
  swipedEntryId,
  onEntryPress,
  onEntryDelete,
  onSwipeOpen,
}) => {
  const translateX = useSharedValue(0);
  const startTranslateX = useSharedValue(0); // Track starting position
  const rowHeight = useSharedValue(1); // For delete animation - animate entire row
  const rowOpacity = useSharedValue(1); // For delete animation
  const processingPulse = useSharedValue(1); // For processing indicator animation

  // Helper function to get appropriate preview text based on processing stage
  // Content resolution logic:
  // 1. When both rawText and text are empty → show status message
  // 2. When we have rawText but text is empty → display rawText
  // 3. When we have both → display text
  const getPreviewText = (entry: JournalEntry) => {
    const hasRawText = entry.rawText && entry.rawText.trim() !== '';
    const hasText = entry.text && entry.text.trim() !== '';
    
    // Both empty - show status based on processing stage
    if (!hasRawText && !hasText) {
      if (entry.processingStage === 'transcribing') {
        return 'Transcribing audio...';
      } else if (entry.processingStage === 'transcribing_failed') {
        return 'Transcription failed. Please try again.';
      } else if (entry.processingStage === 'audio_unavailable') {
        return 'Audio file unavailable.';
      } else {
        return 'No transcription available.';
      }
    }
    
    // Have content - prefer text if available, otherwise use rawText
    return hasText ? entry.text! : entry.rawText!;
  };

  // Handle external close triggers (when another entry is opened or outside interaction)
  useEffect(() => {
    if (swipedEntryId !== item.id && translateX.value !== 0) {
      // This entry is open but should be closed (another entry opened or all should close)
      translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
    }
  }, [swipedEntryId, item.id]);

  // Start processing animation if entry is being processed
  useEffect(() => {
    if (item.processingStage && item.processingStage !== 'completed') {
      processingPulse.value = withRepeat(
        withTiming(0.6, { duration: 800 }), 
        -1, 
        true
      );
    } else {
      processingPulse.value = withTiming(1, { duration: 300 });
    }
  }, [item.processingStage]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: rowHeight.value }],
    opacity: rowOpacity.value,
  }));

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const processingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: processingPulse.value,
  }));

  // NEW: The delete button's style is now derived entirely from the card's translation.
  const deleteButtonStyle = useAnimatedStyle(() => {
    // Stage 1: Reveal. As the card moves 80px, the button slides into view.
    // Stage 2: Stretch. As the card moves past 80px, the button grows in width.
    const buttonWidth = interpolate(
      translateX.value,
      [-screenWidth, -100, -80, 0], // Input range (how far the card is swiped)
      [screenWidth, 100, 80, 80],   // Output range (the button's resulting width)
      Extrapolate.CLAMP
    );

    // This makes the button appear to be revealed, not grown, during the initial swipe.
    const buttonTranslateX = interpolate(
      translateX.value,
      [-80, 0],       // Input range
      [0, 80],        // Output range
      Extrapolate.CLAMP
    );

    return {
      width: buttonWidth,
      transform: [{ translateX: buttonTranslateX }],
    };
  });

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .activeOffsetX([-20, 20]) // Allow both left and right swipes
    .failOffsetY([-10, 10])
    .onBegin(() => {
      // Store the starting position when gesture begins
      startTranslateX.value = translateX.value;
      
      // Priority 1: If another entry is open, close it
      if (swipedEntryId !== null && swipedEntryId !== item.id) {
        runOnJS(onSwipeOpen)(null);
        return;
      }
    })
    .onUpdate((event) => {
      // Only allow swiping if no other entry is open or this is the open entry
      if (swipedEntryId === null || swipedEntryId === item.id) {
        // Calculate new position from starting position + gesture translation
        const newTranslateX = startTranslateX.value + event.translationX;
        
        // Allow left swipes to open (from 0 to -80) and right swipes to close (from -80 to 0)
        // Clamp the values to prevent going beyond the bounds
        const clampedTranslateX = Math.max(Math.min(newTranslateX, 0), -120);
        
        translateX.value = clampedTranslateX;
      }
    })
    .onEnd(() => {
      // Only process end gesture if no other entry is open or this is the open entry
      if (swipedEntryId === null || swipedEntryId === item.id) {
        // If swiped past the threshold (e.g., 40px left), snap open to the final position (80px).
        if (translateX.value < -40) {
          translateX.value = withSpring(-80, { damping: 15, stiffness: 120 });
          // Notify parent that this entry is now open
          runOnJS(onSwipeOpen)(item.id);
        } else {
          // Otherwise, snap back to closed.
          translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
          // Notify parent that this entry is now closed
          runOnJS(onSwipeOpen)(null);
        }
      }
    });

  const tapGesture = Gesture.Tap()
    .maxDistance(5)
    .onEnd((_, success) => {
      if (!success) return;

      // Priority 1: If another item is open, the tap's only job is to close it.
      if (swipedEntryId !== null && swipedEntryId !== item.id) {
        runOnJS(onSwipeOpen)(null);
        return; // Stop further actions
      }

      // Priority 2: If this item is open, the tap's job is to close it.
      if (translateX.value !== 0) {
        translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
        runOnJS(onSwipeOpen)(null);
        return; // Stop further actions
      }

      // Priority 3 (Default): If no items are open, perform the main action.
      runOnJS(onEntryPress)(item);
    });

  const composedGesture = Gesture.Exclusive( // <--- Change from Simultaneous
    panGesture,
    tapGesture
  );

  const handleDeletePress = () => {
    // Start the folding animation - scale down vertically and fade out
    rowHeight.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(onEntryDelete)(item.id);
      }
    });
    rowOpacity.value = withTiming(0, { duration: 200 });
    translateX.value = withTiming(-screenWidth * 0.3, { duration: 300 });
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View style={rowAnimatedStyle}>
      <View style={styles.entryContainer}>
        {/* Delete Button - positioned behind the card */}
        <Animated.View style={[styles.deleteButton, deleteButtonStyle]}>
          <Pressable
            style={styles.deleteButtonInner}
            onPress={handleDeletePress}
          >
            <Ionicons name="trash" size={20} color="white" />
          </Pressable>
        </Animated.View>
        
        {/* Entry Card - the swipeable part */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.entryItem, itemAnimatedStyle]}>
            <View>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.entryHeaderRight}>
                  {/* Processing/Error indicators */}
                  {item.processingStage === 'transcribing' || item.processingStage === 'refining' ? (
                    // Show animated processing indicator
                    <Animated.View style={[styles.processingIndicator, processingAnimatedStyle]}>
                      <Ionicons name="ellipsis-horizontal" size={12} color={theme.colors.primary} />
                    </Animated.View>
                  ) : (item.processingStage === 'transcribing_failed' || item.processingStage === 'refining_failed' || item.processingStage === 'audio_unavailable') ? (
                    // Show error indicator for failed states
                    <View style={styles.errorIndicator}>
                      <Ionicons name="alert-circle" size={12} color={theme.colors.accent} />
                    </View>
                  ) : null}
                  
                  {item.duration && (
                    <Text style={styles.entryDuration}>{formatDuration(item.duration)}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.entryPreview} numberOfLines={2}>
                {getPreviewText(item)}
              </Text>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
      {!isLast && <View style={styles.entrySeparator} />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  entryContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  entryItem: {
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  entrySeparator: {
    height: 1,
    backgroundColor: theme.colors.border + '40',
    marginHorizontal: -theme.spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  entryTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: theme.spacing.sm,
    letterSpacing: -0.4,
  },
  entryPreview: {
    ...theme.typography.body,
    fontWeight: '400',
    color: theme.colors.text + '70',
    lineHeight: 20,
  },
  entryDuration: {
    ...theme.typography.caption,
    color: theme.colors.text + '50',
    fontFamily: 'SpaceMono',
    fontSize: 12,
  },
  deleteButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: theme.spacing.md,
  },
  deleteButtonInner: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingIndicator: {
    marginHorizontal: theme.spacing.xs,
  },
  errorIndicator: {
    marginHorizontal: theme.spacing.xs,
  },
  entryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
}); 
