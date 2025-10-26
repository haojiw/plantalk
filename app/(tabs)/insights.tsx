import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
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

import { AudioPathMigration } from '@/features/journal';
import { ScreenWrapper } from '@/shared/components';
import { theme } from '@/styles/theme';

export default function InsightsScreen() {
  const opacity = useSharedValue(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 200 });
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
            color={theme.colors.text + '60'} 
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <Animated.View 
            style={styles.expandedContent}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
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
          <Text style={styles.headerTitle}>Insights</Text>
        </View>

        {/* Cards */}
        <View style={styles.cardsContainer}>
          {/* Weekly Recap Card */}
          {renderExpandableCard(
            'weekly-recap',
            'calendar-outline',
            'Weekly Recap',
            <View>
              <Text style={styles.contentText}>
                Your weekly summary will appear here. We&apos;ll analyze your journal entries to show patterns, 
                themes, and highlights from the past seven days.
              </Text>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>—</Text>
                  <Text style={styles.statLabel}>Entries</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>—</Text>
                  <Text style={styles.statLabel}>Minutes</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>—</Text>
                  <Text style={styles.statLabel}>Topics</Text>
                </View>
              </View>
            </View>
          )}

          {/* Your Patterns Card */}
          {renderExpandableCard(
            'patterns',
            'person-outline',
            'Your Patterns',
            <View>
              <Text style={styles.contentText}>
                Based on your journal entries, we&apos;ll identify recurring themes, emotional patterns, 
                and topics you frequently explore. This space will help you understand yourself better.
              </Text>
              <View style={styles.patternsList}>
                <View style={styles.patternItem}>
                  <Ionicons name="heart-outline" size={16} color={theme.colors.text + '60'} />
                  <Text style={styles.patternText}>Emotional patterns coming soon</Text>
                </View>
                <View style={styles.patternItem}>
                  <Ionicons name="trending-up-outline" size={16} color={theme.colors.text + '60'} />
                  <Text style={styles.patternText}>Growth trends coming soon</Text>
                </View>
                <View style={styles.patternItem}>
                  <Ionicons name="bulb-outline" size={16} color={theme.colors.text + '60'} />
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

        {/* Developer Tools Section */}
        <View style={styles.developerSection}>
          <Text style={styles.developerSectionTitle}>Developer Tools</Text>
          <AudioPathMigration />
        </View>

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
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  cardsContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cardContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.text + '10',
    overflow: 'hidden',
  },
  card: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 70,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    ...theme.typography.subheading,
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
    color: theme.colors.text + '80',
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...theme.typography.title,
    color: theme.colors.text + '40',
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.text + '60',
    fontSize: 12,
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
    color: theme.colors.text + '60',
    marginLeft: theme.spacing.sm,
    fontSize: 14,
  },
  comingSoonText: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  developerSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xxl,
  },
  developerSectionTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text + '60',
    fontWeight: '600',
    marginBottom: theme.spacing.md,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomSpacing: {
    height: theme.spacing.lg,
  },
}); 