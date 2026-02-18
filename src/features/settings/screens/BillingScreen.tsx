import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenWrapper } from '@/shared/components';
import { theme } from '@/styles/theme';

export const BillingScreen: React.FC = () => {
  const handleBack = () => {
    router.back();
  };

  return (
    <ScreenWrapper withPadding={false}>
      <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Billing</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="card-outline" size={48} color={theme.colors.primary} />
        </View>
        <Text style={styles.heading}>Subscription Management</Text>
        <Text style={styles.description}>
          Billing and subscription management will be available here in a future update.
        </Text>
        
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
        <Text style={styles.statusText}>You're currently on the Pro plan</Text>
      </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryMuted15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  heading: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textMuted80,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  proBadge: {
    backgroundColor: theme.colors.badge,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
  },
  proBadgeText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontWeight: '700',
    letterSpacing: 2,
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted60,
  },
});
