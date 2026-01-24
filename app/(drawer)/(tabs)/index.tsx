import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useSettings } from '@/core/providers/settings';
import { ScreenWrapper } from '@/shared/components';
import { theme } from '@/styles/theme';

const ILLUSTRATIONS: Record<string, any> = {
  dino: require('@assets/images/dino.png'),
  tree: require('@assets/images/tree.png'),
  bush: require('@assets/images/bush.png'),
  bonsai: require('@assets/images/bonsai.png'),
  doodle: require('@assets/images/doodle.png'),
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function EntryScreen() {
  const navigation = useNavigation();
  const { settings } = useSettings();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = withTiming(1, { duration: 200 });
      return () => {
        opacity.value = 0;
      };
    }, [])
  );

  const greeting = useMemo(() => getGreeting(), []);

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  // Handle plant press - animate and open record modal
  const handlePlantPress = () => {
    // Quick scale animation
    scale.value = withSpring(0.9, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 200 });
    });
    
    // Navigate to record screen
    try {
      router.push('/record');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const plantAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const illustrationSource = ILLUSTRATIONS[settings.mainIllustration] || ILLUSTRATIONS.dino;

  return (
    <ScreenWrapper>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Menu Button */}
        <Pressable style={styles.menuButton} onPress={handleMenuPress}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting} {settings.displayName}</Text>
          <Text style={styles.streakText}>Start your journey today</Text>
        </View>

        {/* Plant Display */}
        <View style={styles.plantContainer}>
          <Pressable onPress={handlePlantPress}>
            <Animated.View style={[styles.plantWrapper, plantAnimatedStyle]}>
              <View style={styles.plantCard}>
                <Image
                  source={illustrationSource}
                  style={styles.plantImage}
                  contentFit="contain"
                />
              </View>
            </Animated.View>
          </Pressable>
        </View>
      </Animated.View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  menuButton: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...theme.shadows.sm,
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
  },
  greeting: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 32,
    marginVertical: theme.spacing.sm,
  },
  streakText: {
    ...theme.typography.handwriting,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  plantContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  plantWrapper: {
    marginBottom: theme.spacing.lg,
  },
  plantCard: {
    width: 300,
    height: 300,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  plantImage: {
    width: 300,
    height: 300,
  },
});
