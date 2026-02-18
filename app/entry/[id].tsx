import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useSecureJournal } from '@/core/providers/journal';
import { AudioPlayer } from '@/features/audio-player';
import { ChatInput, ChatMessageBubble, EntryContent, EntryDetailHeader, TypingIndicator, useEntryChat, useEntryEditor, useEntryOptions } from '@/features/entry-detail';
import { ScreenWrapper } from '@/shared/components';
import { theme } from '@/styles/theme';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateEntry, retranscribeEntry, refineEntry } = useSecureJournal();
  const entry = state.entries.find(e => e.id === id);

  const [activeTab, setActiveTab] = useState<'journal' | 'chat'>('journal');
  const scrollRef = useRef<ScrollView>(null);
  const contentOpacity = useSharedValue(1);
  const contentAnimatedStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  const {
    isEditing,
    editTitle,
    editText,
    setEditTitle,
    setEditText,
    handleEditEntry,
    handleSaveEdit,
    handleCancelEdit,
  } = useEntryEditor({ entry, updateEntry });

  const { showOptions } = useEntryOptions({
    entry,
    updateEntry,
    retranscribeEntry,
    refineEntry,
    onEditEntry: handleEditEntry
  });

  const {
    messages,
    isLoadingMessages,
    sendMessage,
    retryMessage,
    isWaitingForResponse,
  } = useEntryChat({ entry: entry!, updateEntry });

  // Filter: hide the first user message (it's the entry text, already visible in journal tab)
  const visibleMessages = messages.length > 0 && messages[0].role === 'user'
    ? messages.slice(1)
    : messages;

  // Auto-scroll to bottom on new chat messages
  useEffect(() => {
    if (activeTab === 'chat' && (messages.length > 0 || isWaitingForResponse)) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isWaitingForResponse, activeTab]);

  const handleChatToggle = useCallback(() => {
    contentOpacity.value = withTiming(0, { duration: 120 }, () => {
      // Content is invisible — safe to swap
    });
    setTimeout(() => {
      setActiveTab(prev => prev === 'journal' ? 'chat' : 'journal');
      contentOpacity.value = withTiming(1, { duration: 180 });
    }, 120);
  }, [contentOpacity]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${weekday}, ${month}/${day}`;
  };

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(entry?.text || '');
      Alert.alert('Copied', 'Transcription copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text');
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleRetryTranscription = async () => {
    if (!entry?.audioUri) return;

    try {
      await retranscribeEntry(entry);
      Alert.alert('Retry Started', 'We\'re processing your audio again. This may take a few moments.');
    } catch (error) {
      console.error('Error retrying transcription:', error);
      Alert.alert('Error', 'Failed to retry transcription');
    }
  };

  const handleRetryRefinement = async () => {
    if (!entry?.rawText) return;

    try {
      await refineEntry(entry, false);
      Alert.alert('Success', 'Text refinement completed!');
    } catch (error) {
      console.error('Error retrying refinement:', error);
      Alert.alert('Error', 'Failed to refine text. Please try again later.');
    }
  };

  // Entry not found state
  if (!entry) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <EntryDetailHeader
            isEditing={false}
            onBackPress={handleBackPress}
            onCopy={() => {}}
            onMorePress={() => {}}
            onCancelEdit={() => {}}
            onSaveEdit={async () => {}}
          />

          <View style={styles.errorContainer}>
            <Ionicons name="leaf-outline" size={48} color={theme.colors.primaryMuted40} />
            <Text style={styles.errorText}>Entry not found</Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <EntryDetailHeader
          isEditing={isEditing}
          isChatActive={activeTab === 'chat'}
          onBackPress={handleBackPress}
          onChatToggle={handleChatToggle}
          onCopy={handleCopyText}
          onMorePress={showOptions}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
        />

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date */}
          <Text style={styles.date}>{formatDate(entry.date)}</Text>

          {/* Title */}
          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Entry title..."
              placeholderTextColor={theme.colors.textMuted60}
              multiline={false}
              returnKeyType="next"
            />
          ) : (
            <Text style={styles.title}>{entry.title}</Text>
          )}

          {/* Audio Player */}
          <AudioPlayer audioUri={entry.audioUri} duration={entry.duration} audioLevels={entry.audioLevels} />

          {/* Tab content with fade animation */}
          <Animated.View style={contentAnimatedStyle}>
            {activeTab === 'journal' ? (
              <EntryContent
                entry={entry}
                isEditing={isEditing}
                editText={editText}
                setEditText={setEditText}
                onRetryTranscription={handleRetryTranscription}
                onRetryRefinement={handleRetryRefinement}
              />
            ) : (
              <View>
                {entry.processingStage !== 'completed' && (
                  <View style={styles.pendingSection}>
                    <Text style={styles.pendingText}>AI chat will be available after processing completes.</Text>
                  </View>
                )}

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

                {isWaitingForResponse && <TypingIndicator />}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Chat input - fixed at bottom when chat tab is active */}
        {activeTab === 'chat' && (
          <ChatInput
            onSend={sendMessage}
            isSending={isWaitingForResponse}
            disabled={entry.processingStage !== 'completed'}
          />
        )}
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  date: {
    ...theme.typography.caption,
    fontFamily: theme.fonts.handwriting,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    fontSize: 24,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  titleInput: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    borderBottomWidth: 0,
    paddingBottom: 0,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.textMuted60,
    marginTop: theme.spacing.md,
  },
});
