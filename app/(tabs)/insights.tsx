import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { theme } from '@/styles/theme';

export default function InsightsScreen() {
  const [mirrorQuestion, setMirrorQuestion] = useState('');
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 200 });
      return () => {
        opacity.value = 0;
      };
    }, [])
  );

  const handleAskMirror = () => {
    // Placeholder for future AI functionality
    console.log('Mirror question:', mirrorQuestion);
    setMirrorQuestion('');
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScreenWrapper>
      <Animated.ScrollView style={[styles.container, containerAnimatedStyle]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Insights</Text>
          <Text style={styles.headerSubtitle}>Discover patterns in your journey</Text>
        </View>

        {/* Weekly Recap Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Weekly Recap</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardContent}>
              Your weekly summary will appear here. We'll analyze your journal entries to show patterns, 
              themes, and highlights from the past seven days.
            </Text>
            <View style={styles.placeholderStats}>
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
        </View>

        {/* User Insights Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Your Patterns</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardContent}>
              Based on your journal entries, we'll identify recurring themes, emotional patterns, 
              and topics you frequently explore. This space will help you understand yourself better.
            </Text>
            <View style={styles.insightsList}>
              <View style={styles.insightItem}>
                <Ionicons name="heart-outline" size={16} color={theme.colors.text + '60'} />
                <Text style={styles.insightText}>Emotional patterns coming soon</Text>
              </View>
              <View style={styles.insightItem}>
                <Ionicons name="trending-up-outline" size={16} color={theme.colors.text + '60'} />
                <Text style={styles.insightText}>Growth trends coming soon</Text>
              </View>
              <View style={styles.insightItem}>
                <Ionicons name="bulb-outline" size={16} color={theme.colors.text + '60'} />
                <Text style={styles.insightText}>Key topics coming soon</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Mirror Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Mirror</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardContent}>
              Ask questions and get personalized insights based on your journal entries. 
              The Mirror will help you reflect and discover new perspectives.
            </Text>
            <View style={styles.mirrorInput}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask the Mirror anything about your journey..."
                placeholderTextColor={theme.colors.text + '40'}
                value={mirrorQuestion}
                onChangeText={setMirrorQuestion}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <TouchableOpacity 
                style={[
                  styles.askButton, 
                  { opacity: mirrorQuestion.trim() ? 1 : 0.5 }
                ]}
                onPress={handleAskMirror}
                disabled={!mirrorQuestion.trim()}
              >
                <Ionicons name="send" size={16} color="white" />
                <Text style={styles.askButtonText}>Ask Mirror</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    fontSize: 14,
  },
  section: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.subheading,
    color: theme.colors.text,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.text + '10',
  },
  cardContent: {
    ...theme.typography.body,
    color: theme.colors.text + '80',
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  placeholderStats: {
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
  insightsList: {
    marginTop: theme.spacing.sm,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  insightText: {
    ...theme.typography.body,
    color: theme.colors.text + '60',
    marginLeft: theme.spacing.sm,
    fontSize: 14,
  },
  mirrorInput: {
    marginTop: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.text + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.text,
    minHeight: 80,
    marginBottom: theme.spacing.md,
  },
  askButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  askButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
    fontSize: 14,
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
}); 