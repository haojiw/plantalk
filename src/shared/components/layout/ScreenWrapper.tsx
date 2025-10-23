import { theme } from '@/styles/theme';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';
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
      <ImageBackground
        source={require('@assets/texture/paper.jpg')}
        style={[styles.container, style]}
        resizeMode="cover"
      >
        {/* Noise texture overlay */}
        <ImageBackground
          source={require('@assets/texture/noise_overlay.webp')}
          style={styles.noiseOverlay}
          resizeMode="repeat"
          imageStyle={{ opacity: 0.1 }}
        >
          <View
            style={[
              styles.content,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                paddingHorizontal: withPadding ? 12 : 0,
              },
            ]}
          >
            {children}
          </View>
        </ImageBackground>
      </ImageBackground>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  noiseOverlay: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
}); 