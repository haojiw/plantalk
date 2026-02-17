import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { theme } from '@/styles/theme';

type SettingsRowType = 'navigate' | 'toggle' | 'action';

interface SettingsRowProps {
  type: SettingsRowType;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  type,
  icon,
  label,
  value,
  onPress,
  onToggle,
  destructive = false,
}) => {
  const handlePress = () => {
    if (type === 'toggle' && onToggle && typeof value === 'boolean') {
      onToggle(!value);
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && type !== 'toggle' && styles.pressed,
      ]}
      onPress={handlePress}
      disabled={type === 'toggle'}
    >
      <View style={styles.leftContent}>
        {icon && (
          <View style={[styles.iconContainer, destructive && styles.iconDestructive]}>
            <Ionicons
              name={icon}
              size={20}
              color={destructive ? theme.colors.destructive : theme.colors.primary}
            />
          </View>
        )}
        <Text style={[styles.label, destructive && styles.labelDestructive]}>
          {label}
        </Text>
      </View>

      <View style={styles.rightContent}>
        {type === 'navigate' && typeof value === 'string' && (
          <Text style={styles.valueText}>{value}</Text>
        )}
        {type === 'navigate' && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textMuted40}
          />
        )}
        {type === 'toggle' && typeof value === 'boolean' && (
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primaryMuted60,
            }}
            thumbColor={value ? theme.colors.primary : theme.colors.switchThumbInactive}
          />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.textMuted10,
  },
  pressed: {
    backgroundColor: theme.colors.background,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryMuted15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  iconDestructive: {
    backgroundColor: theme.colors.destructiveMuted15,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  labelDestructive: {
    color: theme.colors.destructive,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  valueText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted60,
  },
});
