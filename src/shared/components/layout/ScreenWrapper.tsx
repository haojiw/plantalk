import { theme } from '@/styles/theme';
import { defaults } from '@/styles/assets';
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
        source={defaults.backgroundTexture}
        style={[styles.container, style]}
        resizeMode="cover"
      >
        {/* Noise texture overlay */}
        <ImageBackground
          source={defaults.noiseTexture}
          style={styles.noiseOverlay}
          resizeMode="repeat"
          imageStyle={{ opacity: theme.screenWrapper.noiseOpacity }}
        >
          <View
            style={[
              styles.content,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                paddingHorizontal: withPadding ? theme.screenWrapper.padding : 0,
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