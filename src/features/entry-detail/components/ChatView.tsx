import { useSecureJournal } from '@/core/providers/journal';
import { AudioPlayer } from '@/features/audio-player';
import { JournalEntry } from '@/shared/types';
import { theme } from '@/styles/theme';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEntryChat } from '../hooks/useEntryChat';
import { ChatInput } from './ChatInput';
import { ChatMessageBubble } from './ChatMessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface ChatViewProps {
  entry: JournalEntry;
}

export const ChatView: React.FC<ChatViewProps> = ({ entry }) => {
  const { updateEntry } = useSecureJournal();
  const {
    messages,
    isLoadingMessages,
    sendMessage,
    retryMessage,
    isWaitingForResponse,
  } = useEntryChat({ entry, updateEntry });

  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom on new messages or when typing indicator appears
  useEffect(() => {
    if (messages.length > 0 || isWaitingForResponse) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isWaitingForResponse]);

  // Filter: hide the first user message (it's the entry text, already visible in journal tab)
  const visibleMessages = messages.length > 0 && messages[0].role === 'user'
    ? messages.slice(1)
    : messages;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Audio Player */}
        <AudioPlayer audioUri={entry.audioUri} duration={entry.duration} audioLevels={entry.audioLevels} />

        {/* Processing note */}
        {entry.processingStage !== 'completed' && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingText}>AI chat will be available after processing completes.</Text>
          </View>
        )}

        {/* Messages */}
        {isLoadingMessages ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loadingMessages} />
        ) : (
          visibleMessages.map(msg => (
            <ChatMessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              onRetry={msg.role === 'assistant' ? () => retryMessage(msg.id) : undefined}
            />
          ))
        )}

        {/* Typing indicator */}
        {isWaitingForResponse && <TypingIndicator />}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Chat Input */}
      <ChatInput
        onSend={sendMessage}
        isSending={isWaitingForResponse}
        disabled={entry.processingStage !== 'completed'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  pendingSection: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  pendingText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted40,
    fontStyle: 'italic',
  },
  loadingMessages: {
    marginTop: theme.spacing.lg,
  },
  bottomSpacer: {
    height: theme.spacing.lg,
  },
});
