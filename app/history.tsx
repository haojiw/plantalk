import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PlantEntry, usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

const { height: screenHeight } = Dimensions.get('window');

interface SectionData {
  title: string;
  data: PlantEntry[];
}

export default function HistoryScreen() {
  const { state } = usePlant();
  const translateY = useSharedValue(0);
  const scrollOffset = useSharedValue(0);

  // Group entries by date sections
  const sectionedEntries = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sections: SectionData[] = [];
    const sectionMap = new Map<string, PlantEntry[]>();

    state.entries.forEach(entry => {
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
  }, [state.entries]);

  const handleEntryPress = (entry: PlantEntry) => {
    router.push(`/entry/${entry.id}`);
  };

  const handleBack = () => {
    // Smooth transition back to home
    translateY.value = withTiming(screenHeight, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    }, () => {
      runOnJS(router.back)();
    });
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatEntryTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Enhanced swipe down gesture for seamless return
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow swipe down when at the top of the list
      if (event.translationY > 0 && scrollOffset.value <= 0) {
        // Create resistance effect
        const resistance = Math.min(event.translationY, screenHeight * 0.6);
        translateY.value = resistance;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 120 && event.velocityY > 600 && scrollOffset.value <= 0) {
        // Swipe down detected - navigate back to home
        handleBack();
      } else {
        // Spring back to original position
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateY.value,
      [0, screenHeight * 0.3],
      [1, 0.95],
      'clamp'
    );

    return {
      transform: [
        { translateY: translateY.value },
        { scale }
      ],
    };
  });

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderEntryCard = ({ item }: { item: PlantEntry }) => (
    <Pressable 
      style={styles.entryCard}
      onPress={() => handleEntryPress(item)}
    >
      <View style={styles.entryContent}>
        <View style={styles.entryMain}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{item.title}</Text>
            <Text style={styles.entryTime}>{formatEntryTime(item.date)}</Text>
          </View>
          <Text style={styles.entryPreview} numberOfLines={2}>
            {item.transcription}
          </Text>
        </View>
        <View style={styles.entryMeta}>
          {item.duration && (
            <Text style={styles.entryDuration}>{formatDuration(item.duration)}</Text>
          )}
          <Ionicons name="chevron-forward" size={16} color={theme.colors.text + '40'} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <ScreenWrapper>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>History</Text>
            <Pressable style={styles.headerButton}>
              <Ionicons name="search" size={24} color={theme.colors.text + '60'} />
            </Pressable>
          </View>

          {/* Entries List */}
          {sectionedEntries.length > 0 ? (
            <SectionList
              sections={sectionedEntries}
              keyExtractor={(item) => item.id}
              renderItem={renderEntryCard}
              renderSectionHeader={renderSectionHeader}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              bounces={false}
              onScroll={(event) => {
                scrollOffset.value = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color={theme.colors.text + '30'} />
              <Text style={styles.emptyStateText}>
                No entries yet. Start your journaling journey!
              </Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontWeight: '600',
  },
  entryCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.text + '10',
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  entryMain: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  entryTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  entryTime: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
    fontSize: 13,
  },
  entryPreview: {
    ...theme.typography.body,
    color: theme.colors.text + '70',
    lineHeight: 20,
    fontSize: 15,
  },
  entryMeta: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  entryDuration: {
    ...theme.typography.caption,
    color: theme.colors.text + '50',
    fontFamily: 'SpaceMono',
    fontSize: 12,
    marginBottom: theme.spacing.xs,
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
    lineHeight: 22,
  },
}); 