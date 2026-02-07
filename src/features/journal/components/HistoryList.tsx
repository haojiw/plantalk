import { EntryItem, WeeklyRecap } from '@/features/journal';
import { JournalEntry } from '@/shared/types';
import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SectionData {
  title: string;
  data: JournalEntry[];
}

interface HistoryListProps {
  sectionedEntries: SectionData[];
  swipedEntryId: string | null;
  onEntryPress: (entry: JournalEntry) => void;
  onEntryDelete: (entryId: string) => Promise<void>;
  onSwipeOpen: (entryId: string | null) => void;
  onOutsideInteraction: () => void;
  onScroll: () => void;
  entriesCount: number;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  sectionedEntries,
  swipedEntryId,
  onEntryPress,
  onEntryDelete,
  onSwipeOpen,
  onOutsideInteraction,
  onScroll,
  entriesCount,
}) => {
  const insets = useSafeAreaInsets();

  if (sectionedEntries.length === 0) {
    return (
      <View style={[styles.emptyState, { marginTop: 120 }]}>
        <Ionicons name="book-outline" size={48} color={theme.colors.textMuted30} />
        <Text style={styles.emptyStateText}>
          No entries yet. Start your journey!
        </Text>
      </View>
    );
  }

  return (
    <>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { 
          paddingBottom: theme.spacing.xl + insets.bottom // Just padding for safe area
        }]}
        scrollEventThrottle={16}
        bounces={true}
        bouncesZoom={false}
        onTouchStart={onOutsideInteraction}
        onScroll={onScroll}>
        <WeeklyRecap />
        {sectionedEntries.map((section) => (
          <View key={section.title}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {/* Section Cards */}
            <View style={styles.sectionCard}>
              {section.data.map((item, index) => {
                const isLast = index === section.data.length - 1;
                return <EntryItem 
                  key={item.id} 
                  item={item} 
                  isLast={isLast}
                  swipedEntryId={swipedEntryId}
                  onEntryPress={onEntryPress} 
                  onEntryDelete={onEntryDelete}
                  onSwipeOpen={onSwipeOpen}
                />;
              })}
            </View>
          </View>
        ))}
      </Animated.ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.md,
  },
  sectionHeader: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm
  },
  sectionTitle: {
    ...theme.typography.heading,
    fontSize: 17,
    color: theme.colors.text,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
    overflow: 'hidden',
    zIndex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.textMuted60,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 22,
  },

}); 