import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/styles/theme';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.lg,
  },
  title: {
    ...theme.typography.caption,
    color: theme.colors.textMuted80,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.textMuted10,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    overflow: 'hidden',
  },
});
