import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

interface ChatInputProps {
  onSend: (text: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isSending, disabled }) => {
  const [text, setText] = useState('');

  const canSend = text.trim().length > 0 && !isSending && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Ask about this entry..."
        placeholderTextColor={theme.colors.textMuted40}
        multiline
        maxLength={2000}
        editable={!disabled}
      />
      <Pressable
        onPress={handleSend}
        style={[styles.sendButton, canSend ? styles.sendButtonActive : styles.sendButtonInactive]}
        disabled={!canSend}
      >
        {isSending ? (
          <ActivityIndicator size="small" color={theme.colors.surface} />
        ) : (
          <Ionicons
            name="arrow-up"
            size={20}
            color={canSend ? theme.colors.surface : theme.colors.textMuted40}
          />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderMuted20,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    maxHeight: 100,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primaryMuted10,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: theme.colors.primaryMuted20,
  },
});
