import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PlantEntry, usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

interface SectionData {
  title: string;
  data: PlantEntry[];
}

interface HistoryScreenContentProps {
  masterGestureValue?: Animated.SharedValue<number>;
  entries?: PlantEntry[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const HistoryScreenContent: React.FC<HistoryScreenContentProps> = ({
  masterGestureValue,
  entries: propEntries,
}) => {
  const { state } = usePlant();
  const [previewEntry, setPreviewEntry] = useState<PlantEntry | null>(null);
  
  // Use prop entries if provided, otherwise use context entries
  const entries = propEntries || state.entries;
  
  // Animation values
  const previewScale = useSharedValue(0);
  const previewOpacity = useSharedValue(0);
  const blurOpacity = useSharedValue(0);

  // Scroll tracking
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);

  // Scroll handler to track position
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Pan gesture for swipe down from anywhere
  const swipeDownGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Allow downward swipes from anywhere, not just top
      if (event.translationY > 0 && masterGestureValue) {
        // Map the swipe to the master gesture value
        const progress = Math.min(event.translationY / (screenHeight * 0.3), 1);
        masterGestureValue.value = -screenHeight + (progress * screenHeight);
      }
    })
    .onEnd((event) => {
      if (event.translationY > 50 && masterGestureValue) {
        // Threshold met - return to home screen
        masterGestureValue.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
      } else if (masterGestureValue) {
        // Snap back to history screen
        masterGestureValue.value = withSpring(-screenHeight, {
          damping: 20,
          stiffness: 300,
        });
      }
    });

  // Group entries by date sections
  const sectionedEntries = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sections: SectionData[] = [];
    const sectionMap = new Map<string, PlantEntry[]>();

    entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      
      let sectionKey: string;
      
      if (entryDateOnly.getTime() === today.getTime()) {
        sectionKey = 'Today';
      } else if (entryDateOnly.getTime() === yesterday.getTime()) {
        sectionKey = 'Yesterday';
      } else if (entryDateOnly > sevenDaysAgo) {
        sectionKey = 'Previous 7 Days';
      } else if (entryDateOnly > thirtyDaysAgo) {
        sectionKey = 'Previous 30 Days';
      } else {
        // Group by month/year
        sectionKey = entryDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
      }

      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, []);
      }
      sectionMap.get(sectionKey)!.push(entry);
    });

    // Convert to sections array in the desired order
    const sectionOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days'];
    
    sectionOrder.forEach(key => {
      if (sectionMap.has(key)) {
        sections.push({
          title: key,
          data: sectionMap.get(key)!
        });
        sectionMap.delete(key);
      }
    });

    // Add remaining month sections (sorted by date, newest first)
    const monthSections = Array.from(sectionMap.entries())
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => {
        const dateA = new Date(a.data[0].date);
        const dateB = new Date(b.data[0].date);
        return dateB.getTime() - dateA.getTime();
      });

    sections.push(...monthSections);

    return sections;
  }, [entries]);

  const showPreview = (entry: PlantEntry) => {
    setPreviewEntry(entry);
    previewScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    previewOpacity.value = withTiming(1, { duration: 200 });
    blurOpacity.value = withTiming(1, { duration: 200 });
  };

  const hidePreview = () => {
    previewScale.value = withSpring(0.8, { damping: 20, stiffness: 300 });
    previewOpacity.value = withTiming(0, { duration: 150 });
    blurOpacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(setPreviewEntry)(null);
    });
  };

  const handleEntryPress = (entry: PlantEntry) => {
    router.push(`/entry/${entry.id}`);
  };

  const handleBack = () => {
    // Instead of router.back(), animate back to home screen
    if (masterGestureValue) {
      masterGestureValue.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
    }
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatEntryDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Animated styles
  const previewAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: previewScale.value }],
    opacity: previewOpacity.value,
  }));

  const blurAnimatedStyle = useAnimatedStyle(() => ({
    opacity: blurOpacity.value,
  }));

  // Staggered Entry Item Component with master gesture response
  const EntryItem = ({ 
    item, 
    isLast, 
    index, 
    sectionIndex 
  }: { 
    item: PlantEntry; 
    isLast: boolean; 
    index: number;
    sectionIndex: number;
  }) => {
    const itemOpacity = useSharedValue(1);

    // Calculate staggered delay based on position
    const globalIndex = sectionIndex * 3 + index; // Approximate global position
    const delayFactor = globalIndex * 0.02; // Reduced from 0.05 to 0.02 for faster reveals

    // Staggered animation style based on master gesture
    const staggeredAnimatedStyle = useAnimatedStyle(() => {
      if (!masterGestureValue) {
        // If no master gesture value, show content normally
        return {
          transform: [
            { translateY: 0 },
            { scale: 1 }
          ],
        };
      }

      // Simple staggered reveal based on screen position
      const revealProgress = interpolate(
        masterGestureValue.value,
        [-screenHeight * 0.3, -screenHeight * 0.7],
        [0, 1],
        'clamp'
      );

      const adjustedProgress = Math.max(0, revealProgress - delayFactor);

      const translateY = interpolate(
        adjustedProgress,
        [0, 1],
        [20, 0],
        'clamp'
      );

      const scale = interpolate(
        adjustedProgress,
        [0, 1],
        [0.95, 1],
        'clamp'
      );

      return {
        transform: [
          { translateY },
          { scale }
        ],
      };
    });

    const itemAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: itemOpacity.value === 1 ? 1 : 0.98 }],
    }));

    const tapGesture = Gesture.Tap()
      .maxDistance(10)
      .onBegin(() => {
        itemOpacity.value = withTiming(0.7, { duration: 100 });
      })
      .onEnd((_, success) => {
        if (success) {
          runOnJS(handleEntryPress)(item);
        }
      })
      .onFinalize(() => {
        itemOpacity.value = withTiming(1, { duration: 200 });
      });

    const longPressGesture = Gesture.LongPress()
      .minDuration(350)
      .onStart(() => {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(showPreview)(item);
      });

    const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

    return (
      <React.Fragment>
        <GestureDetector gesture={composedGesture}>
          <Animated.View 
            style={[
              styles.entryItem, 
              itemAnimatedStyle, 
              staggeredAnimatedStyle
            ]}
          >
            <View style={styles.entryHeader}>
              <Text style={styles.entryTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.duration && (
                <Text style={styles.entryDuration}>{formatDuration(item.duration)}</Text>
              )}
            </View>
            <Text style={styles.entryPreview} numberOfLines={2}>
              {item.transcription}
            </Text>
          </Animated.View>
        </GestureDetector>
        {!isLast && <View style={styles.entrySeparator} />}
      </React.Fragment>
    );
  };

  // Header animation based on master gesture
  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (!masterGestureValue) {
      // If no master gesture value, show header normally
      return {
        transform: [{ translateY: 0 }],
      };
    }

    // Simple header reveal animation
    const translateY = interpolate(
      masterGestureValue.value,
      [-screenHeight * 0.2, -screenHeight * 0.6],
      [20, 0],
      'clamp'
    );

    return {
      transform: [{ translateY }],
    };
  });

  return (
    <GestureDetector gesture={swipeDownGesture}>
      <View style={{ flex: 1 }}>        
        <View style={styles.container}>
          {/* Header */}
          <Animated.View style={[styles.header, headerAnimatedStyle]}>
            <Pressable onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="chevron-down" size={24} color={theme.colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>History</Text>
            <Pressable style={styles.headerButton}>
              <Ionicons name="search" size={24} color={theme.colors.text + '60'} />
            </Pressable>
          </Animated.View>

          {/* Entries List */}
          {sectionedEntries.length > 0 ? (
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              scrollEventThrottle={16}
              bounces={true}
              bouncesZoom={false}
              ref={scrollRef}
              onScroll={scrollHandler}
              scrollEnabled={true}>
              {sectionedEntries.map((section, sectionIndex) => (
                <View key={section.title}>
                  {/* Section Header */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>

                  {/* Section Cards */}
                  <View style={styles.sectionCard}>
                    {section.data.map((item, index) => {
                      const isLast = index === section.data.length - 1;
                      return (
                        <EntryItem 
                          key={item.id} 
                          item={item} 
                          isLast={isLast} 
                          index={index}
                          sectionIndex={sectionIndex}
                        />
                      );
                    })}
                  </View>
                </View>
              ))}
            </Animated.ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color={theme.colors.text + '30'} />
              <Text style={styles.emptyStateText}>
                No entries yet. Start your journaling journey!
              </Text>
            </View>
          )}
        </View>

        {/* Preview Overlay */}
        {previewEntry && (
          <>
            <Animated.View style={[styles.blurContainer, blurAnimatedStyle]}>
              <BlurView intensity={20} style={StyleSheet.absoluteFill}>
                <Pressable style={styles.blurPressable} onPress={hidePreview} />
              </BlurView>
            </Animated.View>

            <Animated.View
              style={[styles.previewContainer, previewAnimatedStyle]}
              pointerEvents="none">
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle} numberOfLines={2}>
                    {previewEntry.title}
                  </Text>
                  <Text style={styles.previewDate}>{formatEntryDate(previewEntry.date)}</Text>
                  {previewEntry.duration && (
                    <Text style={styles.previewDuration}>
                      {formatDuration(previewEntry.duration)}
                    </Text>
                  )}
                </View>
                <ScrollView
                  style={styles.previewContent}
                  contentContainerStyle={styles.previewContentContainer}
                  showsVerticalScrollIndicator={true}
                  bounces={true}>
                  <Text style={styles.previewText}>{previewEntry.transcription}</Text>
                </ScrollView>
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  entryItem: {
    paddingVertical: theme.spacing.md,
  },
  entrySeparator: {
    height: 1,
    backgroundColor: theme.colors.border + '40',
    marginHorizontal: -theme.spacing.md,
    marginTop: theme.spacing.sm,
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
  },
  entryPreview: {
    ...theme.typography.body,
    color: theme.colors.text + '70',
    lineHeight: 20,
    fontSize: 15,
  },
  entryDuration: {
    ...theme.typography.caption,
    color: theme.colors.text + '50',
    fontFamily: 'SpaceMono',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  blurPressable: {
    flex: 1,
  },
  previewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    zIndex: 101,
  },
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxWidth: screenWidth - theme.spacing.xl,
    maxHeight: screenHeight * 0.7,
    width: '100%',
    ...theme.shadows.lg,
  },
  previewHeader: {
    marginBottom: theme.spacing.md,
  },
  previewTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  previewDate: {
    ...theme.typography.body,
    color: theme.colors.text + '70',
    marginBottom: theme.spacing.xs,
  },
  previewDuration: {
    ...theme.typography.caption,
    color: theme.colors.text + '50',
    fontFamily: 'SpaceMono',
  },
  previewContent: {
    flex: 1,
  },
  previewContentContainer: {
    paddingBottom: theme.spacing.md,
  },
  previewText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
}); 