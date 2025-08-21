import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActionSheetIOS, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { interpolate, useAnimatedRef, useAnimatedStyle, useScrollViewOffset, useSharedValue, withSpring } from 'react-native-reanimated';

import { AudioPlayer } from '@/components/AudioPlayer';
import { EntryContent } from '@/components/EntryContent';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { usePlant } from '@/context/PlantProvider';
import { useEntryEditor } from '@/hooks/useEntryEditor';
import { transcriptionService } from '@/services/TranscriptionService';
import { theme } from '@/styles/theme';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateEntry, updateEntryProgress, updateEntryTranscription } = usePlant();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const dateRevealed = useSharedValue(0); // 0 = hidden, 1 = revealed
  
  const entry = state.entries.find(e => e.id === id);

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

  // Debug: Log entry details
  console.log(`[EntryDetail] Entry found:`, {
    id,
    title: entry?.title,
    processingStage: entry?.processingStage,
    textLength: entry?.text?.length,
    hasAudio: !!entry?.audioUri
  });

  // Enhanced date animation that can hide again when scrolling down
  const dateAnimatedStyle = useAnimatedStyle(() => {
    const pullOpacity = interpolate(
      scrollOffset.value,
      [-100, -50, 0],
      [1, 0.5, 0],
      'clamp'
    );
    
    // If user pulls down significantly, reveal the date permanently
    if (scrollOffset.value < -50 && dateRevealed.value === 0) {
      dateRevealed.value = withSpring(1, { damping: 15, stiffness: 100 });
    }
    
    // If user scrolls down after revealing, hide the date again
    if (scrollOffset.value > 50 && dateRevealed.value === 1) {
      dateRevealed.value = withSpring(0, { damping: 15, stiffness: 100 });
    }
    
    // Show either pull-to-reveal or permanent revealed state
    const finalOpacity = Math.max(pullOpacity, dateRevealed.value);
    
    return {
      opacity: finalOpacity,
    };
  });

  if (!entry) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </Pressable>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.errorContainer}>
            <Ionicons name="leaf-outline" size={48} color={theme.colors.primary + '40'} />
            <Text style={styles.errorText}>Entry not found</Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

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
      await Clipboard.setStringAsync(entry.text);
      Alert.alert('Copied', 'Transcription copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text');
    }
  };

  const handleMorePress = () => {
    if (!entry) return;

    const showDateTimePicker = () => {
      const currentDate = new Date(entry.date);
      
      if (Platform.OS === 'ios') {
        // On iOS, use ActionSheetIOS for a native feel
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'Change Date & Time',
            message: 'Choose how you want to update the date and time',
            options: ['Cancel', 'Change Date', 'Change Time', 'Change Both'],
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            switch (buttonIndex) {
              case 1:
                showDatePicker(currentDate);
                break;
              case 2:
                showTimePicker(currentDate);
                break;
              case 3:
                showDatePicker(currentDate, true); // Will chain to time picker
                break;
            }
          }
        );
      } else {
        // On Android, use Alert for consistency
        Alert.alert(
          'Change Date & Time',
          'Choose how you want to update the date and time',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Change Date', onPress: () => showDatePicker(currentDate) },
            { text: 'Change Time', onPress: () => showTimePicker(currentDate) },
            { text: 'Change Both', onPress: () => showDatePicker(currentDate, true) },
          ]
        );
      }
    };

    const showDatePicker = (currentDate: Date, chainToTime: boolean = false) => {
      const year = currentDate.getFullYear().toString();
      const month = (currentDate.getMonth() + 1).toString();
      const day = currentDate.getDate().toString();
      
      Alert.prompt(
        'Change Date',
        'Enter the date (YYYY-MM-DD)',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'OK',
            onPress: (dateString) => {
              if (dateString) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (dateRegex.test(dateString)) {
                  const [newYear, newMonth, newDay] = dateString.split('-').map(Number);
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(newYear, newMonth - 1, newDay);
                  
                  if (chainToTime) {
                    showTimePicker(newDate);
                  } else {
                    updateEntryDate(newDate);
                  }
                } else {
                  Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
                }
              }
            }
          }
        ],
        'plain-text',
        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      );
    };

    const showTimePicker = (baseDate: Date) => {
      const hours = baseDate.getHours();
      const minutes = baseDate.getMinutes();
      
      Alert.prompt(
        'Change Time',
        'Enter the time (HH:MM, 24-hour format)',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'OK',
            onPress: (timeString) => {
              if (timeString) {
                const timeRegex = /^\d{2}:\d{2}$/;
                if (timeRegex.test(timeString)) {
                  const [newHours, newMinutes] = timeString.split(':').map(Number);
                  if (newHours >= 0 && newHours <= 23 && newMinutes >= 0 && newMinutes <= 59) {
                    const newDate = new Date(baseDate);
                    newDate.setHours(newHours, newMinutes);
                    updateEntryDate(newDate);
                  } else {
                    Alert.alert('Invalid Time', 'Please enter valid hours (00-23) and minutes (00-59)');
                  }
                } else {
                  Alert.alert('Invalid Time', 'Please enter time in HH:MM format');
                }
              }
            }
          }
        ],
        'plain-text',
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      );
    };

    const updateEntryDate = async (newDate: Date) => {
      try {
        await updateEntry(entry.id, { date: newDate.toISOString() });
        Alert.alert('Success', 'Date and time updated successfully');
      } catch (error) {
        console.error('Error updating entry date:', error);
        Alert.alert('Error', 'Failed to update date and time');
      }
    };

    // Show the main action sheet
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Entry Options',
          options: ['Cancel', 'Edit Entry', 'Change Date & Time'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleEditEntry();
          } else if (buttonIndex === 2) {
            showDateTimePicker();
          }
        }
      );
    } else {
      Alert.alert(
        'Entry Options',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit Entry', onPress: handleEditEntry },
          { text: 'Change Date & Time', onPress: showDateTimePicker },
        ]
      );
    }
  };

  const handleRetryTranscription = async () => {
    if (!entry.audioUri) return;

    try {
      // Update the entry to show it's processing again
      updateEntryProgress(entry.id, 'transcribing');
      
      // Start the transcription process again
      transcriptionService.addToQueue({
        entryId: entry.id,
        audioUri: entry.audioUri,
        onProgress: (entryId: string, stage: 'transcribing' | 'refining') => {
          updateEntryProgress(entryId, stage);
        },
        onComplete: (entryId: string, result: any, status: 'completed' | 'failed') => {
          if (status === 'completed') {
            updateEntryTranscription(entryId, {
              ...result,
              processingStage: result.processingStage || 'completed'
            }, status);
          } else {
            updateEntryTranscription(entryId, {
              refinedTranscription: result.refinedTranscription || 'Transcription failed. Please try again.',
              rawTranscription: result.rawTranscription || '',
              aiGeneratedTitle: result.aiGeneratedTitle || `Entry - ${new Date().toLocaleDateString()}`,
              processingStage: result.processingStage || 'transcribing_failed'
            }, status);
          }
        }
      });
      
      Alert.alert('Retry Started', 'We\'re processing your audio again. This may take a few moments.');
    } catch (error) {
      console.error('Error retrying transcription:', error);
      Alert.alert('Error', 'Failed to retry transcription');
    }
  };

  const handleRetryRefinement = async () => {
    if (!entry.rawText) return;

    try {
      // Update the entry to show it's refining again
      updateEntryProgress(entry.id, 'refining');
      
      // We'll simulate calling just the refinement part
      // Since we already have raw text, we just need to refine it
      const { geminiService } = await import('@/services/GeminiService');
      
      const refined = await geminiService.refineTranscription(entry.rawText);
      
      // Update with the refined result
      updateEntryTranscription(entry.id, {
        refinedTranscription: refined.formattedText,
        rawTranscription: entry.rawText,
        aiGeneratedTitle: refined.title,
        processingStage: 'completed'
      }, 'completed');
      
      Alert.alert('Success', 'Text refinement completed!');
    } catch (error) {
      console.error('Error retrying refinement:', error);
      Alert.alert('Error', 'Failed to refine text. Please try again later.');
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        {/* Minimalist Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerControls}>
            {isEditing ? (
              <>
                <Pressable onPress={handleCancelEdit} style={styles.cancelButton}>
                  <Ionicons name="close" size={24} color={theme.colors.accent} />
                </Pressable>
                <Pressable onPress={handleSaveEdit} style={styles.saveButton}>
                  <Ionicons name="checkmark" size={24} color={theme.colors.surface} />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable onPress={handleCopyText} style={styles.copyButton}>
                  <Ionicons name="copy-outline" size={24} color={theme.colors.text} />
                </Pressable>
                <Pressable onPress={handleMorePress} style={styles.moreButton}>
                  <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
                </Pressable>
              </>
            )}
          </View>
        </View>

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
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
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