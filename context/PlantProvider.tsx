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

const INITIAL_STATE: PlantState = {
  streak: 0,
  lastEntryISO: null,
  entries: [],
};

interface PlantProviderProps {
  children: ReactNode;
}

export const PlantProvider: React.FC<PlantProviderProps> = ({ children }) => {
  const [state, setState] = useState<PlantState>(INITIAL_STATE);

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
      setState(prev => ({
        ...prev,
        streak: 0,
      }));
    }
  };

  // Add new entry and update streak
  const addEntry = (entryData: Omit<PlantEntry, 'id'>) => {
    const newEntry: PlantEntry = {
      ...entryData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };

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

      return {
        ...prev,
        entries: [...prev.entries, newEntry].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        lastEntryISO: entryData.date,
        streak: newStreak,
      };
    });
  };

  const resetStreak = () => {
    setState(prev => ({
      ...prev,
      streak: 0,
    }));
  };

  // Check streak validity on app start/resume
  useEffect(() => {
    checkAndUpdateStreak();
  }, []);

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