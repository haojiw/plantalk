import { theme } from '@/styles/theme';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  withPadding?: boolean;
  statusBarStyle?: 'auto' | 'inverted' | 'light' | 'dark';
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  withPadding = true,
  statusBarStyle = 'dark',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <View style={[styles.container, style]}>
        {/* Grain texture overlay - placeholder for now */}
        <View style={styles.grainOverlay} />
        
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: withPadding ? theme.spacing.md : 0,
              paddingRight: withPadding ? theme.spacing.md : 0,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  grainOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // TODO: Add grain texture image as background
    // backgroundImage: require('@/assets/images/grain.png'),
    opacity: 0.1,
  },
  content: {
    flex: 1,
  },
}); 