import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryItem } from '@/components/EntryItem';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PlantEntry, usePlant } from '@/context/PlantProvider';
import { theme } from '@/styles/theme';

// Import the audio duration library as a fallback

interface SectionData {
  title: string;
  data: PlantEntry[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HistoryScreen() {
  const { state, deleteEntry, addEntry } = usePlant();
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  
  const handleOutsideInteraction = () => {
    if (swipedEntryId !== null) {
      setSwipedEntryId(null);
    }
  };

  const handleScroll = () => {
    // Close any open entry when scrolling
    if (swipedEntryId !== null) {
      setSwipedEntryId(null);
    }
  };

  // Group entries by date sections
  const sectionedEntries = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sections: SectionData[] = [];
    const sectionMap = new Map<string, PlantEntry[]>();

    state.entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      
      let sectionKey: string;
      
      if (entryDateOnly.getTime() === today.getTime()) {
        sectionKey = 'Today';
      } else if (entryDateOnly.getTime() === yesterday.getTime()) {
        sectionKey = 'Yesterday';
      } else if (entryDateOnly > sevenDaysAgo) {
        sectionKey = 'Previous 7 Days';
      } else if (entryDateOnly > thirtyDaysAgo) {
        sectionKey = 'Previous 30 Days';
      } else {
        // Group by month/year
        sectionKey = entryDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
      }

      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, []);
      }
      sectionMap.get(sectionKey)!.push(entry);
    });

    // Convert to sections array in the desired order
    const sectionOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days'];
    
    sectionOrder.forEach(key => {
      if (sectionMap.has(key)) {
        sections.push({
          title: key,
          data: sectionMap.get(key)!
        });
        sectionMap.delete(key);
      }
    });

    // Add remaining month sections (sorted by date, newest first)
    const monthSections = Array.from(sectionMap.entries())
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => {
        const dateA = new Date(a.data[0].date);
        const dateB = new Date(b.data[0].date);
        return dateB.getTime() - dateA.getTime();
      });

    sections.push(...monthSections);

    return sections;
  }, [state.entries]);

  const handleEntryPress = (entry: PlantEntry) => {
    router.push(`/entry/${entry.id}`);
  };

  const handleBack = () => {
    // Add haptic feedback for consistency
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleEntryDelete = async (entryId: string) => {
    try {
      await deleteEntry(entryId);
      // Add haptic feedback for successful deletion
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      // Add haptic feedback for error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleAddAudio = async () => {
    try {
      // Add haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Add haptic feedback for successful selection
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
          // Extract metadata from the audio file
          const metadata = await extractAudioMetadata(asset);
          
          // Create the entry with the audio file and metadata
          await addEntry({
            date: metadata.creationDate || new Date().toISOString(),
            title: 'Processing...', // Will be replaced by AI-generated title
            text: '', 
            rawText: '', // Original Whisper output
            duration: metadata.duration,
            audioUri: asset.uri,
            processingStage: 'transcribing',
          });
          
          // Navigate to history to show the new entry
          router.replace('/history');
          
          // Show success message
          Alert.alert(
            'Audio Added',
            `Processing ${asset.name || 'audio file'}. Transcription will complete in a few moments.`,
            [{ text: 'OK' }]
          );
          
        } catch (error) {
          console.error('Error processing audio file:', error);
          Alert.alert(
            'Processing Error', 
            'Failed to process the audio file. Please try a different file or check if the format is supported.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error picking audio file:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to select audio file');
    }
  };

  // Helper function to extract audio metadata
  const extractAudioMetadata = async (asset: any) => {
    let duration: number | undefined;
    let creationDate: string | undefined;

    // Try multiple methods to get the duration
    try {
      // Method 1: Try to get duration using expo-av (most reliable for supported formats)
      console.log('Attempting to extract duration with expo-av...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: asset.uri },
        { shouldPlay: false }
      );
      
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        duration = Math.round(status.durationMillis / 1000); // Convert to seconds
        console.log(`Duration extracted with expo-av: ${duration}s`);
      }
      
      // Clean up the sound object
      await sound.unloadAsync();
    } catch (error) {
      console.log('Could not extract duration with expo-av:', error);
    }

    // Method 2: Try using asset metadata from document picker
    if (!duration && asset.duration) {
      duration = Math.round(asset.duration / 1000);
      console.log(`Duration from asset metadata: ${duration}s`);
    }

    // Extract creation date and file metadata
    try {
      // Try to extract creation date from file system metadata
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists) {
        // Use modificationTime as fallback for creation date
        if ((fileInfo as any).modificationTime) {
          creationDate = new Date((fileInfo as any).modificationTime * 1000).toISOString();
          console.log(`Creation date from file system: ${creationDate}`);
        }
      }
    } catch (error) {
      console.log('Could not extract file metadata:', error);
    }

    // Try to extract date from asset metadata (some audio files have lastModified)
    if (!creationDate && asset.lastModified) {
      creationDate = new Date(asset.lastModified).toISOString();
      console.log(`Creation date from asset metadata: ${creationDate}`);
    }

    // Fallback for creation date - use current time if we can't determine it
    if (!creationDate) {
      creationDate = new Date().toISOString();
      console.log(`Using current time as creation date: ${creationDate}`);
    }

    console.log('Final metadata extracted:', {
      duration,
      creationDate,
      name: asset.name || 'audio_file',
      size: asset.size,
      mimeType: asset.mimeType
    });

    return {
      duration,
      creationDate,
      name: asset.name || 'audio_file',
      size: asset.size,
      mimeType: asset.mimeType
    };
  };

  const formatEntryDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '';
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenWrapper>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.headerContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.headerContent}>
              <Pressable onPress={handleBack} style={styles.headerButton}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
              </Pressable>
              <Text style={styles.headerTitle}>History</Text>
              <Pressable onPress={handleAddAudio} style={[styles.headerButton, styles.addButton]}>
                <Ionicons name="add" size={24} color={theme.colors.surface} />
              </Pressable>
            </View>
            <View style={styles.headerBorder} />
          </View>

          {/* Entries List */}
          {sectionedEntries.length > 0 ? (
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.listContent, { 
                paddingTop: 120, // Account for header height
                paddingBottom: 100 + insets.bottom // Account for footer height
              }]}
              scrollEventThrottle={16}
              bounces={true}
              bouncesZoom={false}
              onTouchStart={handleOutsideInteraction}
              onScroll={handleScroll}>
              {sectionedEntries.map((section) => (
                <View key={section.title}>
                  {/* Section Header */}
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>

                  {/* Section Cards */}
                  <View style={styles.sectionCard}>
                    {section.data.map((item, index) => {
                      const isLast = index === section.data.length - 1;
                      return <EntryItem 
                        key={item.id} 
                        item={item} 
                        isLast={isLast}
                        swipedEntryId={swipedEntryId}
                        onEntryPress={handleEntryPress} 
                        onEntryDelete={handleEntryDelete}
                        onSwipeOpen={setSwipedEntryId}
                      />;
                    })}
                  </View>
                </View>
              ))}
            </Animated.ScrollView>
          ) : (
            <View style={[styles.emptyState, { marginTop: 120 }]}>
              <Ionicons name="book-outline" size={48} color={theme.colors.text + '30'} />
              <Text style={styles.emptyStateText}>
                No entries yet. Start your journaling journey!
              </Text>
            </View>
          )}
        </View>
      </ScreenWrapper>

      {/* Footer with Basic Blur Backdrop */}
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom }]}>
        
        <View style={styles.footerBorder} />
        <View style={styles.footerContent}>
          <Text style={styles.footerText}>
            {state.entries.length} {state.entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    backgroundColor: theme.colors.border + '20',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  sectionHeader: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
    overflow: 'hidden',
    zIndex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 22,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80, // Increased height for better gradient effect
    backgroundColor: theme.colors.surface,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 2, // Ensure it's above other content
  },
  footerBorder: {
    height: 1,
    backgroundColor: theme.colors.border + '20',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  footerContent: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.text + 'A0',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
  },
}); 