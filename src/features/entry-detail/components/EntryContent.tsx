import { JournalEntry } from '@/shared/types';
import { theme } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

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
  const [showFailureBanner, setShowFailureBanner] = useState(true);

  // Edit mode - show editable text input
  if (isEditing) {
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

  // Audio file unavailable (missing/corrupted) - not retryable
  if (entry.processingStage === 'audio_unavailable') {
    return (
      <View style={styles.failureContainer}>
        <Ionicons name="musical-notes-outline" size={32} color={theme.colors.text + '40'} />
        <Text style={styles.failureTitle}>Audio Unavailable</Text>
        <Text style={styles.failureMessage}>
          The audio file for this entry is missing or corrupted. This entry cannot be transcribed.
        </Text>
      </View>
    );
  }

  // Transcription failed (API/network error) - retryable
  if (entry.processingStage === 'transcribing_failed') {
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

  // Content resolution logic:
  // 1. When both rawText and text are empty → show "Transcribing..." (blocking)
  // 2. When we have rawText but text is empty → display rawText
  // 3. When we have both → display text
  const hasRawText = entry.rawText && entry.rawText.trim() !== '';
  const hasText = entry.text && entry.text.trim() !== '';
  
  // Both empty - show loading state (blocking)
  if (!hasRawText && !hasText) {
    return (
      <View style={styles.processingContainer}>
        <View style={styles.processingIconContainer}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.processingTitle}>Transcribing audio...</Text>
        <Text style={styles.processingMessage}>
          This may take a few moments. Please wait.
        </Text>
      </View>
    );
  }

  // Determine content: prefer text if available, otherwise use rawText
  const content = hasText ? entry.text! : entry.rawText!;

  // Render status banners and content
  return (
    <View>
      {/* Refining Banner - Non-blocking indicator */}
      {entry.processingStage === 'refining' && (
        <View style={styles.refiningBanner}>
          <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
          <Text style={styles.refiningBannerText}>Refining text...</Text>
        </View>
      )}

      {/* Refinement Failed Banner - Improved messaging with retry */}
      {entry.processingStage === 'refining_failed' && showFailureBanner && (
        <View style={styles.failureBanner}>
          <View style={styles.failureBannerContent}>
            <Ionicons name="sparkles-outline" size={14} color={theme.colors.accent} />
            <Text style={styles.failureBannerText}>
              Refinement failed. Retry?
            </Text>
          </View>
          <View style={styles.failureBannerActions}>
            <Pressable style={styles.retryBannerButton} onPress={onRetryRefinement}>
              <Ionicons name="refresh" size={12} color={theme.colors.primary} />
              <Text style={styles.retryBannerButtonText}>Refine</Text>
            </Pressable>
            <Pressable 
              style={styles.dismissButton} 
              onPress={() => setShowFailureBanner(false)}
            >
              <Ionicons name="close" size={14} color={theme.colors.text + '60'} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Main Content - Rendered with Markdown */}
      {content ? (
        <Markdown style={markdownStyles}>{content}</Markdown>
      ) : (
        <Text style={styles.noContentText}>No content available.</Text>
      )}
    </View>
  );
};

// Markdown styles mapped to theme
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
  noContentText: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
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
  // Non-blocking banners
  refiningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  refiningBannerText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  failureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  failureBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  failureBannerText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  failureBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  retryBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    gap: 4,
  },
  retryBannerButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  dismissButton: {
    padding: theme.spacing.xs,
  },
});
