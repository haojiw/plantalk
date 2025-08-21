import { PlantEntry } from '@/context/PlantProvider';
import { useState } from 'react';
import { Alert } from 'react-native';

export interface UseEntryEditorProps {
  entry: PlantEntry | undefined;
  updateEntry: (id: string, updates: Partial<PlantEntry>) => Promise<void>;
}

export interface UseEntryEditorReturn {
  isEditing: boolean;
  editTitle: string;
  editText: string;
  setEditTitle: (title: string) => void;
  setEditText: (text: string) => void;
  handleEditEntry: () => void;
  handleSaveEdit: () => Promise<void>;
  handleCancelEdit: () => void;
}

export const useEntryEditor = ({ entry, updateEntry }: UseEntryEditorProps): UseEntryEditorReturn => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');

  const handleEditEntry = () => {
    if (!entry) return;
    
    // Only allow editing for completed entries or entries with some text
    if (entry.processingStage === 'transcribing' || entry.processingStage === 'transcribing_failed') {
      Alert.alert(
        'Cannot Edit', 
        'This entry is still being processed or failed to transcribe. Please wait for transcription to complete or retry first.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setEditTitle(entry.title);
    setEditText(entry.text || entry.rawText || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!entry) return;
    
    try {
      await updateEntry(entry.id, {
        title: editTitle.trim() || entry.title,
        text: editText.trim() || entry.text,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Entry updated successfully');
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update entry');
    }
  };

  const handleCancelEdit = () => {
    Alert.alert(
      'Cancel Editing',
      'Are you sure you want to cancel? Your changes will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { 
          text: 'Cancel Changes', 
          style: 'destructive',
          onPress: () => {
            setIsEditing(false);
            setEditTitle('');
            setEditText('');
          }
        },
      ]
    );
  };

  return {
    isEditing,
    editTitle,
    editText,
    setEditTitle,
    setEditText,
    handleEditEntry,
    handleSaveEdit,
    handleCancelEdit,
  };
}; 