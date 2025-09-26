import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { HistoryList } from '@/components/HistoryList';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { JournalEntry, useJournal } from '@/context/JournalProvider';
import { theme } from '@/styles/theme';

interface SectionData {
  title: string;
  data: JournalEntry[];
}

export default function JournalScreen() {
  const { state, deleteEntry, addEntry } = useJournal();
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null);
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 200 });
      return () => {
        opacity.value = 0;
      };
    }, [])
  );
  
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
    const sectionMap = new Map<string, JournalEntry[]>();

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

  const handleEntryPress = (entry: JournalEntry) => {
    router.push(`/entry/${entry.id}`);
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
      // Method 1: Try to get duration using expo-audio (most reliable for supported formats)
      console.log('Attempting to extract duration with expo-audio...');
      const player = createAudioPlayer({ uri: asset.uri });
      
      // Wait a bit for the audio to load and get duration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (player.duration > 0) {
        duration = Math.round(player.duration); // Duration is already in seconds
        console.log(`Duration extracted with expo-audio: ${duration}s`);
      }
      
      // Clean up the player object
      player.remove();
    } catch (error) {
      console.log('Could not extract duration with expo-audio:', error);
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

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScreenWrapper>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Journal</Text>
            <Pressable onPress={handleAddAudio} style={styles.addButton}>
              <Ionicons name="add" size={24} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Entries List */}
        <HistoryList
          sectionedEntries={sectionedEntries}
          swipedEntryId={swipedEntryId}
          onEntryPress={handleEntryPress}
          onEntryDelete={handleEntryDelete}
          onSwipeOpen={setSwipedEntryId}
          onOutsideInteraction={handleOutsideInteraction}
          onScroll={handleScroll}
          entriesCount={state.entries.length}
        />
      </Animated.View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 