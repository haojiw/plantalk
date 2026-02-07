import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/core/providers/settings';
import { defaults } from '@/styles/assets';
import { theme } from '@/styles/theme';

export const SettingsHeader: React.FC = () => {
  const { settings } = useSettings();

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <Image
          source={
            settings.avatarUri
              ? { uri: settings.avatarUri }
              : defaults.mascot
          }
          style={styles.avatar}
          contentFit="cover"
        />
      </View>

      {/* Name and Badge */}
      <View style={styles.infoContainer}>
        <Text style={styles.displayName}>{settings.displayName}</Text>
        
        {/* Pro Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PRO</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  avatar: {
    width: 80,
    height: 80,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  displayName: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.badge,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  badgeText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
