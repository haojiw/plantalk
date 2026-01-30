import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { useSecureJournal } from '@/core/providers/journal';
import { HistoryList } from '@/features/journal';
import { ScreenWrapper } from '@/shared/components';
import { JournalEntry } from '@/shared/types';
import { theme } from '@/styles/theme';

interface SectionData {
  title: string;
  data: JournalEntry[];
}

export default function JournalScreen() {
  const { state, deleteEntry } = useSecureJournal();
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 200 });
      return () => {
        opacity.value = 0;
      };
    }, [])
  );
  
  const handleOutsideInteraction = () => {
    if (swipedEntryId !== null) {
      setSwipedEntryId(null);
    }
  };

  const handleScroll = () => {
    // Close any open entry when scrolling
    if (swipedEntryId !== null) {
      setSwipedEntryId(null);
    }
  };

  // Group entries by date sections
  const sectionedEntries = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sections: SectionData[] = [];
    const sectionMap = new Map<string, JournalEntry[]>();

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

  const handleEntryPress = (entry: JournalEntry) => {
    router.push(`/entry/${entry.id}`);
  };

  const handleEntryDelete = async (entryId: string) => {
    try {
      await deleteEntry(entryId);
      // Add haptic feedback for successful deletion
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      // Add haptic feedback for error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScreenWrapper>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Journal</Text>
        </View>

       {/* Entries List */}
        <HistoryList
          sectionedEntries={sectionedEntries}
          swipedEntryId={swipedEntryId}
          onEntryPress={handleEntryPress}
          onEntryDelete={handleEntryDelete}
          onSwipeOpen={setSwipedEntryId}
          onOutsideInteraction={handleOutsideInteraction}
          onScroll={handleScroll}
          entriesCount={state.entries.length}
        />
      </Animated.View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
});
