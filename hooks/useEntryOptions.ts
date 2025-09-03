import { PlantEntry } from '@/context/PlantProvider';
import { transcriptionService } from '@/services/TranscriptionService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface UseEntryOptionsProps {
  entry: PlantEntry | undefined;
  updateEntry: (id: string, updates: Partial<PlantEntry>) => Promise<void>;
  updateEntryProgress: (id: string, stage: 'transcribing' | 'refining') => void;
  updateEntryTranscription: (id: string, result: any, status: 'completed' | 'failed') => void;
  onEditEntry: () => void;
}

export interface UseEntryOptionsReturn {
  showOptions: () => void;
  showRawTranscription: () => void;
}

export const useEntryOptions = ({ entry, updateEntry, updateEntryProgress, updateEntryTranscription, onEditEntry }: UseEntryOptionsProps): UseEntryOptionsReturn => {
  const updateEntryDate = async (newDate: Date) => {
    if (!entry) return;
    
    try {
      await updateEntry(entry.id, { date: newDate.toISOString() });
      Alert.alert('Success', 'Date and time updated successfully');
    } catch (error) {
      console.error('Error updating entry date:', error);
      Alert.alert('Error', 'Failed to update date and time');
    }
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

  const showDateTimePicker = () => {
    if (!entry) return;
    
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

  const showRawTranscription = () => {
    if (!entry) return;
    
    const rawText = entry.rawText || 'No raw transcription available';
    
    Alert.alert(
      'Raw Transcription',
      rawText,
      [{ text: 'Close', style: 'cancel' }],
      { 
        userInterfaceStyle: 'light'
      }
    );
  };

  const handleRetranscribe = async () => {
    if (!entry || !entry.audioUri) {
      Alert.alert('Error', 'No audio file available for re-transcription');
      return;
    }

    Alert.alert(
      'Re-transcribe Audio',
      'This will overwrite the current transcription. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-transcribe',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update the entry to show it's processing
              await updateEntry(entry.id, {
                text: 'Re-transcribing...',
                processingStage: 'transcribing'
              });

              // Add to transcription queue
              transcriptionService.addToQueue({
                entryId: entry.id,
                audioUri: entry.audioUri!,
                onProgress: (entryId: string, stage: 'transcribing' | 'refining') => {
                  updateEntryProgress(entryId, stage);
                },
                onComplete: (entryId: string, result: any, status: 'completed' | 'failed') => {
                  if (status === 'completed') {
                    updateEntryTranscription(entryId, {
                      ...result,
                      processingStage: result.processingStage || 'completed'
                    }, status);
                    Alert.alert('Success', 'Re-transcription completed successfully');
                  } else {
                    updateEntryTranscription(entryId, {
                      refinedTranscription: result.refinedTranscription || 'Re-transcription failed. Please try again.',
                      rawTranscription: result.rawTranscription || '',
                      aiGeneratedTitle: result.aiGeneratedTitle || entry.title,
                      processingStage: result.processingStage || 'transcribing_failed'
                    }, status);
                    Alert.alert('Error', 'Re-transcription failed. Please try again.');
                  }
                }
              });
            } catch (error) {
              console.error('Error starting re-transcription:', error);
              Alert.alert('Error', 'Failed to start re-transcription');
            }
          }
        }
      ]
    );
  };

  const handleDownloadAudio = async () => {
    if (!entry || !entry.audioUri) {
      Alert.alert('Error', 'No audio file available for download');
      return;
    }

    try {
      // Check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(entry.audioUri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Audio file not found');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Generate a user-friendly filename
      const entryDate = new Date(entry.date);
      const dateString = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeString = entryDate.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const fileName = `${entry.title.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')}_${dateString}_${timeString}.m4a`;

      // Copy to a temporary location with the desired filename
      const tempUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({
        from: entry.audioUri,
        to: tempUri
      });

      // Share the file
      await Sharing.shareAsync(tempUri, {
        mimeType: 'audio/m4a',
        dialogTitle: 'Save Audio File'
      });

      // Clean up the temporary file
      await FileSystem.deleteAsync(tempUri);
      
    } catch (error) {
      console.error('Error downloading audio:', error);
      Alert.alert('Error', 'Failed to download audio file');
    }
  };

  const showOptions = () => {
    if (!entry) return;

    // Show the main action sheet
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Entry Options',
          options: [
            'Cancel', 
            'Edit Entry', 
            'Change Date & Time', 
            'Show Raw Transcription', 
            'Re-transcribe Audio', 
            'Download Audio'
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1:
              onEditEntry();
              break;
            case 2:
              showDateTimePicker();
              break;
            case 3:
              showRawTranscription();
              break;
            case 4:
              handleRetranscribe();
              break;
            case 5:
              handleDownloadAudio();
              break;
          }
        }
      );
    } else {
      Alert.alert(
        'Entry Options',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit Entry', onPress: onEditEntry },
          { text: 'Change Date & Time', onPress: showDateTimePicker },
          { text: 'Show Raw Transcription', onPress: showRawTranscription },
          { text: 'Re-transcribe Audio', onPress: handleRetranscribe },
          { text: 'Download Audio', onPress: handleDownloadAudio },
        ]
      );
    }
  };

  return {
    showOptions,
    showRawTranscription,
  };
}; 