import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PlantEntry, usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

export default function HistoryScreen() {
  const { state } = usePlant();

  // Generate calendar data for current month
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const entryDates = new Set(
      state.entries.map(entry => 
        new Date(entry.date).toISOString().split('T')[0]
      )
    );

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasEntry = entryDates.has(dateString);
      days.push({ day, hasEntry, dateString });
    }

    return {
      monthName: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      days,
    };
  }, [state.entries]);

  const handleEntryPress = (entry: PlantEntry) => {
    router.push(`/entry/${entry.id}`);
  };

  const formatEntryDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCalendarDay = (day: any, index: number) => {
    if (!day) {
      return <View key={`empty-${index}`} style={styles.emptyCalendarDay} />;
    }

    return (
      <View key={day.dateString} style={styles.calendarDay}>
        <Text style={[
          styles.calendarDayText,
          day.hasEntry && styles.calendarDayTextActive
        ]}>
          {day.day}
        </Text>
        {day.hasEntry && (
          <Ionicons 
            name="leaf" 
            size={12} 
            color={theme.colors.primary}
            style={styles.calendarDayIcon}
          />
        )}
      </View>
    );
  };

  const renderEntryCard = ({ item }: { item: PlantEntry }) => (
    <Pressable 
      style={styles.entryCard}
      onPress={() => handleEntryPress(item)}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formatEntryDate(item.date)}</Text>
        {item.duration && (
          <Text style={styles.entryDuration}>{formatDuration(item.duration)}</Text>
        )}
      </View>
      
      <Text style={styles.entryTitle}>{item.title}</Text>
      <Text style={styles.entryPreview} numberOfLines={2}>
        {item.transcription}
      </Text>
      
      <View style={styles.entryFooter}>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.text + '60'} />
      </View>
    </Pressable>
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>The Growth Calendar</Text>
          <Text style={styles.subtitle}>
            Track your daily reflections
          </Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Text style={styles.monthTitle}>{calendarData.monthName}</Text>
          
          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={index} style={styles.dayHeaderText}>{day}</Text>
            ))}
          </View>
          
          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {calendarData.days.map((day, index) => renderCalendarDay(day, index))}
          </View>
        </View>

        {/* Entries List */}
        <View style={styles.entriesContainer}>
          <View style={styles.entriesHeader}>
            <Text style={styles.entriesTitle}>Recent History</Text>
            <Text style={styles.entriesCount}>
              {state.entries.length} {state.entries.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          
          {state.entries.length > 0 ? (
            <FlatList
              data={state.entries}
              keyExtractor={(item) => item.id}
              renderItem={renderEntryCard}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.entriesList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="leaf-outline" size={48} color={theme.colors.primary + '40'} />
              <Text style={styles.emptyStateText}>
                No entries yet. Start your journaling journey!
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text + '80',
  },
  calendarContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  monthTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  dayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  dayHeaderText: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%', // 7 days per week
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  emptyCalendarDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  calendarDayText: {
    ...theme.typography.caption,
    color: theme.colors.text + '80',
  },
  calendarDayTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  calendarDayIcon: {
    position: 'absolute',
    bottom: 2,
  },
  entriesContainer: {
    flex: 1,
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  entriesTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  entriesCount: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
  },
  entriesList: {
    paddingBottom: theme.spacing.xl,
  },
  entryCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  entryDate: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  entryDuration: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
    fontFamily: 'SpaceMono',
  },
  entryTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  entryPreview: {
    ...theme.typography.body,
    color: theme.colors.text + '80',
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  entryFooter: {
    alignItems: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
}); 