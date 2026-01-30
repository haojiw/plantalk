import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
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
import { SettingsRow, SettingsSection } from '@/features/settings';
import { theme } from '@/styles/theme';

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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, setTheme } = useSettings();
  const { state, addEntry } = useSecureJournal();
  const [isExporting, setIsExporting] = useState(false);
  const isImportingRef = useRef(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? '1';

  const navigateTo = (screen: string) => {
    router.push(`/settings/${screen}` as any);
  };

  const cycleTheme = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(settings.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    await setTheme(themes[nextIndex]);
  };

  const handleImportRecording = async () => {
    // Use ref for synchronous guard - prevents double-tap race condition
    if (isImportingRef.current) return;
    isImportingRef.current = true;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        await addEntry({
          date: new Date().toISOString(),
          title: 'Processing...',
          text: '',
          rawText: '',
          duration: undefined,
          audioUri: asset.uri,
          processingStage: 'transcribing',
        });
        
        Alert.alert(
          'Audio Added',
          `Processing ${asset.name || 'audio file'}. Transcription will complete in a few moments.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error importing audio:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to import audio file');
    } finally {
      isImportingRef.current = false;
    }
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
    Alert.alert('Rate App', 'This will open the App Store review page.');
  };

  const handleSendFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:haoji.one@gmail.com?subject=PlanTalk%20Feedback');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <SettingsSection title="Account">
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

        {/* Developer Section */}
        <SettingsSection title="Developer">
          <SettingsRow
            type="navigate"
            icon="code-slash-outline"
            label="Developer Tools"
            onPress={() => navigateTo('developer')}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  placeholder: {
    width: 32,
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
