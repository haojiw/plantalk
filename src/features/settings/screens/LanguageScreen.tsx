import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '@/core/providers/settings';
import { theme } from '@/styles/theme';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

export const LanguageScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { settings, setLanguage } = useSettings();

  const handleBack = () => {
    router.back();
  };

  const handleSelectLanguage = async (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setLanguage(code);
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Language</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Language List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.listContainer}>
          {LANGUAGES.map((language, index) => (
            <Pressable
              key={language.code}
              style={[
                styles.languageRow,
                index === LANGUAGES.length - 1 && styles.lastRow,
              ]}
              onPress={() => handleSelectLanguage(language.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{language.name}</Text>
                <Text style={styles.nativeName}>{language.nativeName}</Text>
              </View>
              {settings.language === language.code && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            </Pressable>
          ))}
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
  listContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: 2,
  },
  nativeName: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
  },
});
