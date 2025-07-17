import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryItem } from '@/components/EntryItem';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PlantEntry, usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

interface SectionData {
  title: string;
  data: PlantEntry[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HistoryScreen() {
  const { state, deleteEntry } = usePlant();
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  
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
    // Add haptic feedback for consistency
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
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

  const formatEntryDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenWrapper>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.headerContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.headerContent}>
              <Pressable onPress={handleBack} style={styles.headerButton}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
              </Pressable>
              <Text style={styles.headerTitle}>History</Text>
              <Pressable style={styles.headerButton}>
                <Ionicons name="search" size={24} color={theme.colors.text + '60'} />
              </Pressable>
            </View>
            <View style={styles.headerBorder} />
          </View>

          {/* Entries List */}
          {sectionedEntries.length > 0 ? (
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.listContent, { 
                paddingTop: 120, // Account for header height
                paddingBottom: 100 + insets.bottom // Account for footer height
              }]}
              scrollEventThrottle={16}
              bounces={true}
              bouncesZoom={false}
              onTouchStart={handleOutsideInteraction}
              onScroll={handleScroll}>
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
                        onEntryPress={handleEntryPress} 
                        onEntryDelete={handleEntryDelete}
                        onSwipeOpen={setSwipedEntryId}
                      />;
                    })}
                  </View>
                </View>
              ))}
            </Animated.ScrollView>
          ) : (
            <View style={[styles.emptyState, { marginTop: 120 }]}>
              <Ionicons name="book-outline" size={48} color={theme.colors.text + '30'} />
              <Text style={styles.emptyStateText}>
                No entries yet. Start your journaling journey!
              </Text>
            </View>
          )}
        </View>
      </ScreenWrapper>

      {/* Footer with Basic Blur Backdrop */}
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom }]}>
        
        <View style={styles.footerBorder} />
        <View style={styles.footerContent}>
          <Text style={styles.footerText}>
            {state.entries.length} {state.entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
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
  headerBorder: {
    height: 1,
    backgroundColor: theme.colors.border + '20',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
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