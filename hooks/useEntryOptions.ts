import { PlantEntry } from '@/context/PlantProvider';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface UseEntryOptionsProps {
  entry: PlantEntry | undefined;
  updateEntry: (id: string, updates: Partial<PlantEntry>) => Promise<void>;
  onEditEntry: () => void;
}

export interface UseEntryOptionsReturn {
  showOptions: () => void;
}

export const useEntryOptions = ({ entry, updateEntry, onEditEntry }: UseEntryOptionsProps): UseEntryOptionsReturn => {
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

  const showOptions = () => {
    if (!entry) return;

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
            onEditEntry();
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
          { text: 'Edit Entry', onPress: onEditEntry },
          { text: 'Change Date & Time', onPress: showDateTimePicker },
        ]
      );
    }
  };

  return {
    showOptions,
  };
}; 