import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface ChatMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  onRetry?: () => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ role, content, onRetry }) => {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantContainer}>
      <Markdown style={markdownStyles}>{content}</Markdown>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryButton} hitSlop={8}>
          <Ionicons name="refresh-outline" size={14} color={theme.colors.textMuted40} />
        </Pressable>
      )}
    </View>
  );
};

const markdownStyles = StyleSheet.create({
  body: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
    fontSize: 15,
  },
  heading1: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  heading2: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  heading3: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  paragraph: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
    fontSize: 15,
    marginTop: 0,
    marginBottom: theme.spacing.sm,
  },
  strong: {
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  em: {
    fontStyle: 'italic' as const,
    color: theme.colors.text,
  },
  bullet_list: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  ordered_list: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  list_item: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
    fontSize: 15,
    marginBottom: theme.spacing.xs,
  },
  blockquote: {
    backgroundColor: theme.colors.surface,
    borderLeftColor: theme.colors.primary,
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginVertical: theme.spacing.sm,
  },
  code_inline: {
    ...theme.typography.monospace,
    backgroundColor: theme.colors.surface,
    color: theme.colors.primary,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  code_block: {
    ...theme.typography.monospace,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.sm,
  },
  hr: {
    backgroundColor: theme.colors.border,
    height: 1,
    marginVertical: theme.spacing.md,
  },
  link: {
    color: theme.colors.primary,
    textDecorationLine: 'underline' as const,
  },
});

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  userBubble: {
    maxWidth: '80%',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primaryMuted15,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  userText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 20,
  },
  assistantContainer: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  retryButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing.xs,
    marginTop: 2,
  },
});
