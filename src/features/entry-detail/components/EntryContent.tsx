import { JournalEntry } from '@/shared/types';
import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface EntryContentProps {
  entry: JournalEntry;
  isEditing: boolean;
  editText: string;
  setEditText: (text: string) => void;
  onRetryTranscription: () => Promise<void>;
  onRetryRefinement: () => Promise<void>;
}

export const EntryContent: React.FC<EntryContentProps> = ({
  entry,
  isEditing,
  editText,
  setEditText,
  onRetryTranscription,
  onRetryRefinement,
}) => {
  if (isEditing) {
    // Edit mode - show editable text input
    return (
      <View style={styles.editContainer}>
        <TextInput
          style={styles.textInput}
          value={editText}
          onChangeText={setEditText}
          multiline={true}
          placeholder="Enter your text here..."
          placeholderTextColor={theme.colors.text + '60'}
          textAlignVertical="top"
        />
      </View>
    );
  }

  if (entry.processingStage === 'transcribing_failed') {
    // Transcription failed - show error and retry button
    return (
      <View style={styles.failureContainer}>
        <Ionicons name="alert-circle" size={32} color={theme.colors.accent} />
        <Text style={styles.failureTitle}>Transcription Failed</Text>
        <Text style={styles.failureMessage}>
          Unable to process your audio recording. Please try again.
        </Text>
        <Pressable style={styles.retryButton} onPress={onRetryTranscription}>
          <Ionicons name="refresh" size={16} color={theme.colors.surface} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (entry.processingStage === 'refining_failed' || (entry.processingStage === 'refining' && entry.rawText)) {
    // Refinement failed OR stuck in refining with raw text - show raw text and refinement retry button
    return (
      <View>
        <Text style={styles.transcriptionText}>{entry.text || entry.rawText}</Text>
        
        <View style={styles.failureContainer}>
          <Ionicons name="construct" size={32} color={theme.colors.accent} />
          <Text style={styles.failureTitle}>
            {entry.processingStage === 'refining' ? 'Refinement Stuck' : 'Refinement Failed'}
          </Text>
          <Text style={styles.failureMessage}>
            {entry.processingStage === 'refining' 
              ? 'Text refinement appears to be stuck. Try refining again.'
              : 'Couldn\'t improve the formatting. Try again or keep as is.'
            }
          </Text>
          <Pressable style={styles.refineRetryButton} onPress={onRetryRefinement}>
            <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
            <Text style={styles.refineRetryButtonText}>Refine Text</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (entry.processingStage === 'transcribing' || (entry.processingStage === 'refining' && !entry.rawText)) {
    // Still processing - show loading state
    return (
      <View style={styles.processingContainer}>
        <View style={styles.processingIconContainer}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.processingTitle}>
          {entry.processingStage === 'transcribing' ? 'Transcribing audio...' : 'Refining text...'}
        </Text>
        <Text style={styles.processingMessage}>
          This may take a few moments. Please wait.
        </Text>
      </View>
    );
  }

  // Completed successfully - show refined text
  return <Text style={styles.transcriptionText}>{entry.text}</Text>;
};

const styles = StyleSheet.create({
  editContainer: {
    marginTop: theme.spacing.md,
  },
  textInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
    fontSize: 15,
    minHeight: 200,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
  },
  transcriptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
    fontSize: 15,
  },
  failureContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  failureTitle: {
    ...theme.typography.title,
    color: theme.colors.accent,
    textAlign: 'center',
  },
  failureMessage: {
    ...theme.typography.body,
    color: theme.colors.text + '80',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  retryButtonText: {
    ...theme.typography.subheading,
    color: theme.colors.surface,
    fontWeight: '600',
  },
  refineRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  refineRetryButtonText: {
    ...theme.typography.subheading,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  processingIconContainer: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.full,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  processingTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  processingMessage: {
    ...theme.typography.body,
    color: theme.colors.text + '80',
    textAlign: 'center',
  },
}); 