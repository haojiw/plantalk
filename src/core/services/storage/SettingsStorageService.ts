import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserSettings {
  // User profile
  displayName: string;
  avatarUri: string | null;
  
  // Preferences
  theme: ThemeMode;
  language: string;
  mainIllustration: string;
  
  // Notifications
  weeklyRecapEnabled: boolean;
  reminderEnabled: boolean;
  reminderDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  reminderTime: string; // HH:mm format
}

const SETTINGS_KEY = 'user_settings';

const DEFAULT_SETTINGS: UserSettings = {
  displayName: 'Haoji',
  avatarUri: null,
  theme: 'system',
  language: 'en',
  mainIllustration: 'dino',
  weeklyRecapEnabled: true,
  reminderEnabled: false,
  reminderDays: [1, 2, 3, 4, 5], // Weekdays
  reminderTime: '20:00',
};

class SettingsStorageService {
  private cache: UserSettings | null = null;

  async getSettings(): Promise<UserSettings> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const stored = await SecureStore.getItemAsync(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle any new settings added in updates
        const settings = { ...DEFAULT_SETTINGS, ...parsed };
        this.cache = settings;
        return settings;
      }
    } catch (error) {
      console.error('Error reading settings:', error);
    }

    const settings = { ...DEFAULT_SETTINGS };
    this.cache = settings;
    return settings;
  }

  async saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(updated));
      this.cache = updated;
      return updated;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  async resetSettings(): Promise<UserSettings> {
    try {
      await SecureStore.deleteItemAsync(SETTINGS_KEY);
      this.cache = { ...DEFAULT_SETTINGS };
      return this.cache;
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.cache = null;
  }
}

export const settingsStorageService = new SettingsStorageService();
