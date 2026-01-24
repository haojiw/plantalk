import { createAudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

interface AudioMetadata {
  duration?: number;
  creationDate?: string;
  name: string;
  size?: number;
  mimeType?: string;
}

import { JournalEntry } from '@/shared/types';

type AddEntryFn = (entryData: Omit<JournalEntry, 'id'>) => Promise<void>;

async function extractAudioMetadata(asset: DocumentPicker.DocumentPickerAsset): Promise<AudioMetadata> {
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
  if (!duration && (asset as any).duration) {
    duration = Math.round((asset as any).duration / 1000);
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
  if (!creationDate && (asset as any).lastModified) {
    creationDate = new Date((asset as any).lastModified).toISOString();
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
}

export async function importAudioFile(addEntry: AddEntryFn): Promise<void> {
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
}
