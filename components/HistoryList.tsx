import { EntryItem } from '@/components/EntryItem';
import { PlantEntry } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SectionData {
  title: string;
  data: PlantEntry[];
}

interface HistoryListProps {
  sectionedEntries: SectionData[];
  swipedEntryId: string | null;
  onEntryPress: (entry: PlantEntry) => void;
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
        <Ionicons name="book-outline" size={48} color={theme.colors.text + '30'} />
        <Text style={styles.emptyStateText}>
          No entries yet. Start your journaling journey!
        </Text>
      </View>
    );
  }

  return (
    <>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { 
          paddingTop: 120, // Account for header height
          paddingBottom: 100 + insets.bottom // Account for footer height
        }]}
        scrollEventThrottle={16}
        bounces={true}
        bouncesZoom={false}
        onTouchStart={onOutsideInteraction}
        onScroll={onScroll}>
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

      {/* Footer with Basic Blur Backdrop */}
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.footerBorder} />
        <View style={styles.footerContent}>
          <Text style={styles.footerText}>
            {entriesCount} {entriesCount === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.md,
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
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
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
    color: theme.colors.text + '60',
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 22,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80, // Increased height for better gradient effect
    backgroundColor: theme.colors.surface,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 2, // Ensure it's above other content
  },
  footerBorder: {
    height: 1,
    backgroundColor: theme.colors.border + '20',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  footerContent: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.text + 'A0',
    fontWeight: '500',
  },
}); 