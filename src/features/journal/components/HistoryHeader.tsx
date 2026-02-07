import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface HistoryHeaderProps {
  onBack: () => void;
  onAddAudio: () => Promise<void>;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({ onBack, onAddAudio }) => {
  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.headerContent}>
        <Pressable onPress={onBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>History</Text>
        <Pressable onPress={onAddAudio} style={[styles.headerButton, styles.addButton]}>
          <Ionicons name="add" size={24} color={theme.colors.surface} />
        </Pressable>
      </View>
      <View style={styles.headerBorder} />
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: theme.colors.borderMuted20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
  },
}); 