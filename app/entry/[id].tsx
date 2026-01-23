import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';

import { useSecureJournal } from '@/core/providers/journal';
import { AudioPlayer } from '@/features/audio-player';
import { EntryContent, EntryDetailHeader, useDateRevealAnimation, useEntryEditor, useEntryOptions } from '@/features/entry-detail';
import { ScreenWrapper } from '@/shared/components';
import { theme } from '@/styles/theme';

export default function EntryDetailScreen() {
  // 1. Get entry and context functions
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateEntry, retranscribeEntry, refineEntry } = useSecureJournal();
  const entry = state.entries.find(e => e.id === id);

  // 2. Initialize all hooks
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  
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

  const { dateAnimatedStyle } = useDateRevealAnimation({ scrollOffset });

  // Debug: Log entry details
  console.log(`[EntryDetail] Entry found:`, {
    id,
    title: entry?.title,
    processingStage: entry?.processingStage,
    textLength: entry?.text?.length,
    hasAudio: !!entry?.audioUri
  });

  // Helper functions
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      // Use consolidated "clean slate" retranscription that properly resets state
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
      // Use consolidated refineEntry - no backup for retry (already have the text)
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
            <Ionicons name="leaf-outline" size={48} color={theme.colors.primary + '40'} />
            <Text style={styles.errorText}>Entry not found</Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // 3. Render by composing components
  return (
    <ScreenWrapper>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <EntryDetailHeader
          isEditing={isEditing}
          onBackPress={handleBackPress}
          onCopy={handleCopyText}
          onMorePress={showOptions}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
        />

        <Animated.ScrollView 
          ref={scrollRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date - Hidden by default, reveals on overscroll */}
          <Animated.Text style={[styles.date, dateAnimatedStyle]}>
            {formatDate(entry.date)}
          </Animated.Text>
          
          {/* Title */}
          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Entry title..."
              placeholderTextColor={theme.colors.text + '60'}
              multiline={false}
              returnKeyType="next"
            />
          ) : (
            <Text style={styles.title}>{entry.title}</Text>
          )}
          
          {/* Audio Player */}
          <AudioPlayer audioUri={entry.audioUri} duration={entry.duration} />
          
          {/* Content based on processing stage */}
          <EntryContent
            entry={entry}
            isEditing={isEditing}
            editText={editText}
            setEditText={setEditText}
            onRetryTranscription={handleRetryTranscription}
            onRetryRefinement={handleRetryRefinement}
          />
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    marginTop: theme.spacing.md,
  },
}); 