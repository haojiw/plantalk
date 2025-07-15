import * as FileSystem from 'expo-file-system';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface PlantEntry {
  id: string;
  date: string; // ISO date string
  title: string;
  transcription: string;
  audioUri?: string;
  duration?: number; // in seconds
}

export interface PlantState {
  streak: number; // consecutive days
  lastEntryISO: string | null; // ISO date string of last entry
  entries: PlantEntry[];
}

interface PlantContextType {
  state: PlantState;
  addEntry: (entry: Omit<PlantEntry, 'id'>) => void;
  getDaysSinceLastEntry: () => number;
  resetStreak: () => void;
}

const PlantContext = createContext<PlantContextType | undefined>(undefined);

// Create dummy data for development and testing
const createDummyData = (): PlantEntry[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'dummy-1',
      date: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM today
      title: 'Morning Reflections',
      transcription: 'Today I feel grateful for the small moments of peace I found during my morning walk. The birds were singing, and there was a gentle breeze that reminded me to slow down and appreciate nature around me.',
      duration: 125, // 2:05
    },
    {
      id: 'dummy-2',
      date: new Date(yesterday.getTime() + 19 * 60 * 60 * 1000).toISOString(), // 7 PM yesterday
      title: 'Evening Gratitude',
      transcription: 'I had a challenging day at work, but I managed to find three things I was grateful for: my supportive colleague who helped me with the project, the delicious lunch I had, and the fact that I accomplished my main goals despite the obstacles.',
      duration: 87, // 1:27
    },
    {
      id: 'dummy-3',
      date: new Date(lastWeek.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 2 PM last week
      title: 'Weekend Discoveries',
      transcription: 'This weekend I tried something new - I went to a pottery class. It was messy and I wasn\'t very good at it, but there was something meditative about working with my hands and focusing on creating something beautiful.',
      duration: 156, // 2:36
    },
    {
      id: 'dummy-4',
      date: new Date(twoWeeksAgo.getTime() + 11 * 60 * 60 * 1000).toISOString(), // 11 AM two weeks ago
      title: 'Personal Growth',
      transcription: 'I\'ve been thinking about how much I\'ve grown over the past year. The challenges I faced helped me become more resilient, and I\'m learning to be kinder to myself when things don\'t go as planned.',
      duration: 203, // 3:23
    },
  ];
};

const INITIAL_STATE: PlantState = {
  streak: 2, // Set to 2 since we have entries for today and yesterday
  lastEntryISO: new Date().toISOString(), // Set to today since we have a dummy entry for today
  entries: createDummyData(),
};

// File paths for persistent storage
const ENTRIES_FILE_PATH = `${FileSystem.documentDirectory}entries.json`;
const AUDIO_DIR_PATH = `${FileSystem.documentDirectory}audio/`;

interface PlantProviderProps {
  children: ReactNode;
}

export const PlantProvider: React.FC<PlantProviderProps> = ({ children }) => {
  const [state, setState] = useState<PlantState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Ensure audio directory exists
  const ensureAudioDirectoryExists = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIR_PATH);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(AUDIO_DIR_PATH, { intermediates: true });
      }
    } catch (error) {
      console.error('Error creating audio directory:', error);
    }
  };

  // Load entries from persistent storage
  const loadEntries = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(ENTRIES_FILE_PATH);
      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(ENTRIES_FILE_PATH);
        const savedState: PlantState = JSON.parse(fileContent);
        setState(savedState);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      // If loading fails, keep the initial state with dummy data
    } finally {
      setIsLoaded(true);
    }
  };

  // Save entries to persistent storage
  const saveEntries = async (newState: PlantState) => {
    try {
      await FileSystem.writeAsStringAsync(ENTRIES_FILE_PATH, JSON.stringify(newState));
    } catch (error) {
      console.error('Error saving entries:', error);
    }
  };

  // Move audio file from temporary cache to permanent storage
  const moveAudioToPermanentStorage = async (tempAudioUri: string): Promise<string> => {
    try {
      await ensureAudioDirectoryExists();
      const filename = `audio_${Date.now()}.m4a`;
      const permanentUri = `${AUDIO_DIR_PATH}${filename}`;
      await FileSystem.moveAsync({
        from: tempAudioUri,
        to: permanentUri,
      });
      return permanentUri;
    } catch (error) {
      console.error('Error moving audio file:', error);
      return tempAudioUri; // Return original URI if move fails
    }
  };

  // Calculate days since last entry
  const getDaysSinceLastEntry = (): number => {
    if (!state.lastEntryISO) return 0;
    
    const lastEntry = new Date(state.lastEntryISO);
    const today = new Date();
    const diffTime = today.getTime() - lastEntry.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Reset streak if more than 1 day has passed
  const checkAndUpdateStreak = () => {
    const daysSince = getDaysSinceLastEntry();
    
    if (daysSince > 1) {
      setState(prev => {
        const newState = {
          ...prev,
          streak: 0,
        };
        saveEntries(newState);
        return newState;
      });
    }
  };

  // Add new entry and update streak
  const addEntry = async (entryData: Omit<PlantEntry, 'id'>) => {
    const newEntry: PlantEntry = {
      ...entryData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };

    // Move audio file to permanent storage if present
    if (newEntry.audioUri) {
      newEntry.audioUri = await moveAudioToPermanentStorage(newEntry.audioUri);
    }

    setState(prev => {
      const today = new Date().toISOString().split('T')[0];
      const isToday = entryData.date.split('T')[0] === today;
      const daysSince = getDaysSinceLastEntry();
      
      let newStreak = prev.streak;
      
      // If this is today's first entry
      if (isToday && (!prev.lastEntryISO || daysSince >= 1)) {
        if (daysSince === 1) {
          // Consecutive day - increase streak
          newStreak = prev.streak + 1;
        } else if (daysSince === 0) {
          // Same day as last entry - no streak change
          newStreak = prev.streak;
        } else {
          // Skipped days - reset streak and start new
          newStreak = 1;
        }
      }

      const newState = {
        ...prev,
        entries: [...prev.entries, newEntry].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        lastEntryISO: entryData.date,
        streak: newStreak,
      };

      // Save to persistent storage
      saveEntries(newState);
      
      return newState;
    });
  };

  const resetStreak = () => {
    setState(prev => {
      const newState = {
        ...prev,
        streak: 0,
      };
      saveEntries(newState);
      return newState;
    });
  };

  // Load entries on app start
  useEffect(() => {
    loadEntries();
  }, []);

  // Check streak validity when entries are loaded
  useEffect(() => {
    if (isLoaded) {
      checkAndUpdateStreak();
    }
  }, [isLoaded]);

  const contextValue: PlantContextType = {
    state,
    addEntry,
    getDaysSinceLastEntry,
    resetStreak,
  };

  return (
    <PlantContext.Provider value={contextValue}>
      {children}
    </PlantContext.Provider>
  );
};

export const usePlant = (): PlantContextType => {
  const context = useContext(PlantContext);
  if (!context) {
    throw new Error('usePlant must be used within a PlantProvider');
  }
  return context;
}; 