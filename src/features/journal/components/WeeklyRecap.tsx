import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { motion } from '@/styles/motion';
import { theme } from '@/styles/theme';

export const WeeklyRecap = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity 
        style={styles.card} 
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>Your Weekly Wrapped</Text>
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
          <Text style={styles.contentText}>
            I completed 5 journal entries this week, mostly reflecting on work challenges. 
            I spent time thinking through a difficult project and found clarity on my approach. 
            The act of talking through problems helped me move forward.
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.textMuted10,
    overflow: 'hidden',
    marginHorizontal: theme.spacing.sm,
    marginVertical: theme.spacing.md,
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
    fontFamily: theme.fonts.body3,
    color: theme.colors.textMuted80,
    lineHeight: 20,
  },
});

