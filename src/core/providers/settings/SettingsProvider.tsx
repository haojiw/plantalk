import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import {
  settingsStorageService,
  UserSettings,
  ThemeMode,
} from '@/core/services/storage/SettingsStorageService';

interface SettingsContextType {
  settings: UserSettings;
  isLoading: boolean;
  
  // Theme
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => Promise<void>;
  
  // Profile
  setDisplayName: (name: string) => Promise<void>;
  setAvatarUri: (uri: string | null) => Promise<void>;
  
  // Language
  setLanguage: (language: string) => Promise<void>;
  
  // Appearance
  setMainIllustration: (illustration: string) => Promise<void>;
  
  // Notifications
  setWeeklyRecapEnabled: (enabled: boolean) => Promise<void>;
  setReminderEnabled: (enabled: boolean) => Promise<void>;
  setReminderDays: (days: number[]) => Promise<void>;
  setReminderTime: (time: string) => Promise<void>;
  
  // Utility
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: UserSettings = {
  displayName: 'Haoji',
  avatarUri: null,
  theme: 'system',
  language: 'en',
  mainIllustration: 'dino',
  weeklyRecapEnabled: true,
  reminderEnabled: false,
  reminderDays: [1, 2, 3, 4, 5],
  reminderTime: '20:00',
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const systemColorScheme = useSystemColorScheme();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loaded = await settingsStorageService.getSettings();
        setSettings(loaded);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Calculate effective theme based on setting and system preference
  const effectiveTheme: 'light' | 'dark' = 
    settings.theme === 'system' 
      ? (systemColorScheme ?? 'light') 
      : settings.theme;

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      const updated = await settingsStorageService.saveSettings(updates);
      setSettings(updated);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }, []);

  const setTheme = useCallback(async (theme: ThemeMode) => {
    await updateSettings({ theme });
  }, [updateSettings]);

  const setDisplayName = useCallback(async (displayName: string) => {
    await updateSettings({ displayName });
  }, [updateSettings]);

  const setAvatarUri = useCallback(async (avatarUri: string | null) => {
    await updateSettings({ avatarUri });
  }, [updateSettings]);

  const setLanguage = useCallback(async (language: string) => {
    await updateSettings({ language });
  }, [updateSettings]);

  const setMainIllustration = useCallback(async (mainIllustration: string) => {
    await updateSettings({ mainIllustration });
  }, [updateSettings]);

  const setWeeklyRecapEnabled = useCallback(async (weeklyRecapEnabled: boolean) => {
    await updateSettings({ weeklyRecapEnabled });
  }, [updateSettings]);

  const setReminderEnabled = useCallback(async (reminderEnabled: boolean) => {
    await updateSettings({ reminderEnabled });
  }, [updateSettings]);

  const setReminderDays = useCallback(async (reminderDays: number[]) => {
    await updateSettings({ reminderDays });
  }, [updateSettings]);

  const setReminderTime = useCallback(async (reminderTime: string) => {
    await updateSettings({ reminderTime });
  }, [updateSettings]);

  const value: SettingsContextType = {
    settings,
    isLoading,
    effectiveTheme,
    setTheme,
    setDisplayName,
    setAvatarUri,
    setLanguage,
    setMainIllustration,
    setWeeklyRecapEnabled,
    setReminderEnabled,
    setReminderDays,
    setReminderTime,
    updateSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
