import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { useSecureJournal } from '@/core/providers/journal';
import { useSettings } from '@/core/providers/settings';
import { WeeklyRecap } from '@/features/journal';
import { ScreenWrapper } from '@/shared/components';
import { defaults } from '@/styles/assets';
import { motion } from '@/styles/motion';
import { theme } from '@/styles/theme';

export default function MeScreen() {
  const opacity = useSharedValue(0);
  const { settings } = useSettings();
  const { state } = useSecureJournal();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  const entryCount = state.entries.length;

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: motion.durations.screenFadeIn });
      return () => {
        opacity.value = 0;
      };
    }, [])
  );

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const renderExpandableCard = (
    id: string,
    icon: string,
    title: string,
    content: React.ReactNode
  ) => {
    const isExpanded = expandedCards.has(id);
    
    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => toggleCard(id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={theme.colors.textMuted60} 
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <Animated.View 
            style={styles.expandedContent}
            entering={FadeIn.duration(motion.layoutAnimations.fadeIn)}
            exiting={FadeOut.duration(motion.layoutAnimations.fadeOut)}
          >
            {content}
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <Animated.ScrollView style={[styles.container, containerAnimatedStyle]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          
        </View>

        {/* Profile Section */}
        <Pressable style={styles.profileSection} onPress={() => router.push('/settings/profile')}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                settings.avatarUri
                  ? { uri: settings.avatarUri }
                  : defaults.mascot
              }
              style={styles.avatar}
              contentFit="cover"
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{settings.displayName}</Text>
            <View style={styles.scoreRow}>
              <Ionicons name="leaf-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.scoreText}>{entryCount}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted60} />
        </Pressable>

        {/* Insights Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Insights</Text>
        </View>

        <View style={styles.cardsContainer}>
          <WeeklyRecap />

          {/* Your Patterns Card */}
          {renderExpandableCard(
            'patterns',
            'analytics-outline',
            'Your Patterns',
            <View>
              <Text style={styles.contentText}>
                Based on your journal entries, we&apos;ll identify recurring themes, emotional patterns, 
                and topics you frequently explore. This space will help you understand yourself better.
              </Text>
              <View style={styles.patternsList}>
                <View style={styles.patternItem}>
                  <Ionicons name="heart-outline" size={16} color={theme.colors.textMuted60} />
                  <Text style={styles.patternText}>Emotional patterns coming soon</Text>
                </View>
                <View style={styles.patternItem}>
                  <Ionicons name="trending-up-outline" size={16} color={theme.colors.textMuted60} />
                  <Text style={styles.patternText}>Growth trends coming soon</Text>
                </View>
                <View style={styles.patternItem}>
                  <Ionicons name="bulb-outline" size={16} color={theme.colors.textMuted60} />
                  <Text style={styles.patternText}>Key topics coming soon</Text>
                </View>
              </View>
            </View>
          )}

          {/* Mirror Card */}
          {renderExpandableCard(
            'mirror',
            'chatbubble-ellipses-outline',
            'Mirror',
            <View>
              <Text style={styles.contentText}>
                Ask questions and get personalized insights based on your journal entries. 
                The Mirror will help you reflect and discover new perspectives.
              </Text>
              <Text style={styles.comingSoonText}>Interactive Mirror coming soon...</Text>
            </View>
          )}
        </View>

        {/* Settings Row */}
        <TouchableOpacity 
          style={styles.settingsRow} 
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <View style={styles.settingsRowContent}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
            <Text style={styles.settingsRowText}>Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted60} />
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Profile Section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.textMuted10,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  avatar: {
    width: 60,
    height: 60,
  },
  profileInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  displayName: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  scoreText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted80,
    fontWeight: '500',
  },
  // Section
  sectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted60,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  // Cards
  cardsContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cardContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.textMuted10,
    overflow: 'hidden',
  },
  card: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginLeft: theme.spacing.md,
  },
  expandedContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
  },
  contentText: {
    ...theme.typography.body,
    color: theme.colors.textMuted80,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  patternsList: {
    marginTop: theme.spacing.sm,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  patternText: {
    ...theme.typography.body,
    color: theme.colors.textMuted60,
    marginLeft: theme.spacing.sm,
    fontSize: 14,
  },
  comingSoonText: {
    ...theme.typography.body,
    color: theme.colors.textMuted60,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  // Settings Row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.textMuted10,
  },
  settingsRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsRowText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginLeft: theme.spacing.md,
  },
  bottomSpacing: {
    height: 120,
  },
}); 
