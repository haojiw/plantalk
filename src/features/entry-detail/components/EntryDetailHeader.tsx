import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface EntryDetailHeaderProps {
  isEditing: boolean;
  isChatActive?: boolean;
  onBackPress: () => void;
  onChatToggle?: () => void;
  onCopy: () => void;
  onMorePress: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => Promise<void>;
}

export const EntryDetailHeader: React.FC<EntryDetailHeaderProps> = ({
  isEditing,
  isChatActive = false,
  onBackPress,
  onChatToggle,
  onCopy,
  onMorePress,
  onCancelEdit,
  onSaveEdit,
}) => {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
      </Pressable>
      <View style={styles.headerControls}>
        {isEditing ? (
          <>
            <Pressable onPress={onCancelEdit} style={styles.cancelButton}>
              <Ionicons name="close" size={24} color={theme.colors.accent} />
            </Pressable>
            <Pressable onPress={onSaveEdit} style={styles.saveButton}>
              <Ionicons name="checkmark" size={24} color={theme.colors.surface} />
            </Pressable>
          </>
        ) : (
          <>
            {onChatToggle && (
              <Pressable
                onPress={onChatToggle}
                style={[styles.chatButton, isChatActive && styles.chatButtonActive]}
              >
                <Ionicons
                  name={isChatActive ? 'chatbubble' : 'chatbubble-outline'}
                  size={20}
                  color={isChatActive ? theme.colors.surface : theme.colors.text}
                />
              </Pressable>
            )}
            <Pressable onPress={onCopy} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={24} color={theme.colors.text} />
            </Pressable>
            <Pressable onPress={onMorePress} style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  copyButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 