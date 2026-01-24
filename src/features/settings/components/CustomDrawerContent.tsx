import { Ionicons } from '@expo/vector-icons';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSecureJournal } from '@/core/providers/journal';
import { useSettings } from '@/core/providers/settings';
import { theme } from '@/styles/theme';

import { SettingsHeader } from './SettingsHeader';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';
import { importAudioFile } from '../utils/importAudio';

const THEME_LABELS: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  pt: 'Português',
  ar: 'العربية',
};

export const CustomDrawerContent: React.FC<DrawerContentComponentProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { settings, setTheme, setWeeklyRecapEnabled } = useSettings();
  const { state, addEntry } = useSecureJournal();
  const [isExporting, setIsExporting] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? '1';

  const closeDrawer = () => {
    navigation.closeDrawer();
  };

  const navigateTo = (screen: string) => {
    closeDrawer();
    setTimeout(() => {
      router.push(`/(drawer)/${screen}` as any);
    }, 300);
  };

  const cycleTheme = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(settings.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    await setTheme(themes[nextIndex]);
  };

  const handleImportRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeDrawer();
    await importAudioFile(addEntry);
  };

  const handleExportJournal = async () => {
    if (isExporting) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExporting(true);

    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        version: appVersion,
        entries: state.entries.map((entry) => ({
          id: entry.id,
          date: entry.date,
          title: entry.title,
          text: entry.text,
          rawText: entry.rawText,
          duration: entry.duration,
          processingStage: entry.processingStage,
        })),
      };

      const fileName = `plantalk_journal_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(exportData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Journal',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Unable to export journal. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRateApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Placeholder - replace with actual App Store URL
    Alert.alert('Rate App', 'This will open the App Store review page.');
  };

  const handleSendFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:haoji.one@gmail.com?subject=PlanTalk%20Feedback');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Close Button */}
      <Pressable style={styles.closeButton} onPress={closeDrawer}>
        <Ionicons name="close" size={24} color={theme.colors.text} />
      </Pressable>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Avatar and Name */}
        <SettingsHeader />

        {/* Account Section */}
        <SettingsSection title="Account">
          <SettingsRow
            type="navigate"
            icon="person-outline"
            label="Profile"
            onPress={() => navigateTo('profile')}
          />
          <SettingsRow
            type="navigate"
            icon="card-outline"
            label="Billing"
            onPress={() => navigateTo('billing')}
          />
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection title="Preferences">
          <SettingsRow
            type="navigate"
            icon="contrast-outline"
            label="Theme"
            value={THEME_LABELS[settings.theme]}
            onPress={cycleTheme}
          />
          <SettingsRow
            type="navigate"
            icon="color-palette-outline"
            label="Appearance"
            onPress={() => navigateTo('appearance')}
          />
          <SettingsRow
            type="navigate"
            icon="language-outline"
            label="Language"
            value={LANGUAGE_LABELS[settings.language] ?? settings.language}
            onPress={() => navigateTo('language')}
          />
          <SettingsRow
            type="navigate"
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigateTo('notifications')}
          />
        </SettingsSection>

        {/* Data Section */}
        <SettingsSection title="Data">
          <SettingsRow
            type="action"
            icon="cloud-upload-outline"
            label="Import Recording"
            onPress={handleImportRecording}
          />
          <SettingsRow
            type="action"
            icon="download-outline"
            label="Export Journal"
            onPress={handleExportJournal}
          />
          <SettingsRow
            type="navigate"
            icon="server-outline"
            label="Storage"
            onPress={() => navigateTo('storage')}
          />
          <SettingsRow
            type="navigate"
            icon="cloud-outline"
            label="Backup"
            value="Coming Soon"
            onPress={() => Alert.alert('Coming Soon', 'iCloud Backup will be available in a future update.')}
          />
        </SettingsSection>

        {/* Support Section */}
        <SettingsSection title="Support">
          <SettingsRow
            type="action"
            icon="star-outline"
            label="Rate App"
            onPress={handleRateApp}
          />
          <SettingsRow
            type="action"
            icon="mail-outline"
            label="Send Feedback"
            onPress={handleSendFeedback}
          />
        </SettingsSection>

        {/* Version Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>
            v{appVersion} (Build {buildNumber})
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  versionText: {
    ...theme.typography.caption,
    color: theme.colors.text + '40',
  },
});
