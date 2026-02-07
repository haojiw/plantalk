import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '@/core/providers/settings';
import { illustrationOptions } from '@/styles/assets';
import { theme } from '@/styles/theme';

export const AppearanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { settings, setMainIllustration } = useSettings();

  const handleBack = () => {
    router.back();
  };

  const handleSelectIllustration = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setMainIllustration(id);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Appearance</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Main Illustration</Text>
          <Text style={styles.sectionDescription}>
            Choose what appears on your home screen
          </Text>

          <View style={styles.grid}>
            {illustrationOptions.map((illustration) => (
              <Pressable
                key={illustration.id}
                style={[
                  styles.illustrationCard,
                  settings.mainIllustration === illustration.id &&
                    styles.illustrationCardActive,
                ]}
                onPress={() => handleSelectIllustration(illustration.id)}
              >
                <Image
                  source={illustration.source}
                  style={styles.illustrationImage}
                  contentFit="contain"
                />
                <Text
                  style={[
                    styles.illustrationName,
                    settings.mainIllustration === illustration.id &&
                      styles.illustrationNameActive,
                  ]}
                >
                  {illustration.name}
                </Text>
                {settings.mainIllustration === illustration.id && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={16} color="white" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
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
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    ...theme.typography.caption,
    color: theme.colors.textMuted60,
    marginBottom: theme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  illustrationCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  illustrationCardActive: {
    borderColor: theme.colors.primary,
  },
  illustrationImage: {
    width: '80%',
    height: '70%',
  },
  illustrationName: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    fontWeight: '500',
  },
  illustrationNameActive: {
    color: theme.colors.primary,
  },
  checkBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
