import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '@/core/providers/settings';
import { theme } from '@/styles/theme';

const DAYS = [
  { value: 0, short: 'S', label: 'Sunday' },
  { value: 1, short: 'M', label: 'Monday' },
  { value: 2, short: 'T', label: 'Tuesday' },
  { value: 3, short: 'W', label: 'Wednesday' },
  { value: 4, short: 'T', label: 'Thursday' },
  { value: 5, short: 'F', label: 'Friday' },
  { value: 6, short: 'S', label: 'Saturday' },
];

const TIME_OPTIONS = [
  '08:00',
  '09:00',
  '10:00',
  '12:00',
  '14:00',
  '17:00',
  '19:00',
  '20:00',
  '21:00',
];

export const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    settings,
    setWeeklyRecapEnabled,
    setReminderEnabled,
    setReminderDays,
    setReminderTime,
  } = useSettings();

  const handleBack = () => {
    router.back();
  };

  const toggleDay = async (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentDays = settings.reminderDays;
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort();
    await setReminderDays(newDays);
  };

  const selectTime = async (time: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setReminderTime(time);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Weekly Recap Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Recap</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Weekly Summary</Text>
                <Text style={styles.toggleDescription}>
                  Get a summary of your journaling activity every Sunday
                </Text>
              </View>
              <Switch
                value={settings.weeklyRecapEnabled}
                onValueChange={setWeeklyRecapEnabled}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary + '60',
                }}
                thumbColor={
                  settings.weeklyRecapEnabled ? theme.colors.primary : '#f4f3f4'
                }
              />
            </View>
          </View>
        </View>

        {/* Daily Reminder Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Reminder</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Enable Reminders</Text>
                <Text style={styles.toggleDescription}>
                  Get reminded to journal on selected days
                </Text>
              </View>
              <Switch
                value={settings.reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary + '60',
                }}
                thumbColor={
                  settings.reminderEnabled ? theme.colors.primary : '#f4f3f4'
                }
              />
            </View>

            {settings.reminderEnabled && (
              <>
                {/* Day Selection */}
                <View style={styles.daysContainer}>
                  <Text style={styles.subLabel}>Days</Text>
                  <View style={styles.daysRow}>
                    {DAYS.map((day) => (
                      <Pressable
                        key={day.value}
                        style={[
                          styles.dayButton,
                          settings.reminderDays.includes(day.value) &&
                            styles.dayButtonActive,
                        ]}
                        onPress={() => toggleDay(day.value)}
                      >
                        <Text
                          style={[
                            styles.dayButtonText,
                            settings.reminderDays.includes(day.value) &&
                              styles.dayButtonTextActive,
                          ]}
                        >
                          {day.short}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Time Selection */}
                <View style={styles.timeContainer}>
                  <Text style={styles.subLabel}>Time</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.timeScrollContent}
                  >
                    {TIME_OPTIONS.map((time) => (
                      <Pressable
                        key={time}
                        style={[
                          styles.timeButton,
                          settings.reminderTime === time &&
                            styles.timeButtonActive,
                        ]}
                        onPress={() => selectTime(time)}
                      >
                        <Text
                          style={[
                            styles.timeButtonText,
                            settings.reminderTime === time &&
                              styles.timeButtonTextActive,
                          ]}
                        >
                          {formatTime(time)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.text + '80',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: 2,
  },
  toggleDescription: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
  },
  daysContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  subLabel: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
    marginBottom: theme.spacing.sm,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dayButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: 'white',
  },
  timeContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  timeScrollContent: {
    gap: theme.spacing.sm,
  },
  timeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeButtonText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  timeButtonTextActive: {
    color: 'white',
  },
});
