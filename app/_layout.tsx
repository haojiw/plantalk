import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { useEffect, useState } from 'react';

// Keep the splash screen visible while we load assets
SplashScreen.preventAutoHideAsync();

import { SecureJournalProvider } from '@/core/providers/journal';
import { SettingsProvider, useSettings } from '@/core/providers/settings';
import { theme } from '@/styles/theme';
import { motion } from '@/styles/motion';
import { defaults } from '@/styles/assets';
import { googleFonts } from '@/styles/fonts';

// Function to preload images
function cacheImages(images: (string | number)[]) {
  return images.map(image => {
    if (typeof image === 'string') {
      return Asset.fromURI(image).downloadAsync();
    } else {
      return Asset.fromModule(image).downloadAsync();
    }
  });
}

function RootLayoutNav() {
  const { isLoading: settingsLoading, effectiveTheme } = useSettings();
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [fontsLoaded] = useFonts(googleFonts);

  // Preload images
  useEffect(() => {
    async function loadImagesAsync() {
      try {
        const imageAssets = cacheImages(defaults.preloadImages);

        await Promise.all(imageAssets);
        setImagesLoaded(true);
      } catch (e) {
        console.warn('Error loading images:', e);
        // Set loaded anyway to not block the app
        setImagesLoaded(true);
      }
    }

    loadImagesAsync();
  }, []);

  // Hide splash screen when fonts, images, AND settings are loaded
  useEffect(() => {
    if (fontsLoaded && imagesLoaded && !settingsLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, imagesLoaded, settingsLoading]);

  // Show splash screen while loading
  if (!fontsLoaded || !imagesLoaded || settingsLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: motion.screenTransitions.rootStack,
      animationDuration: motion.screenTransitions.fadeDuration,
      contentStyle: {
        backgroundColor: effectiveTheme === 'dark' ? '#1a1a1a' : theme.colors.background
      },
    }}>
      {/* Tabs as the primary navigation */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      {/* Modal and detailed screens */}
      <Stack.Screen
        name="record"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="entry/[id]"
        options={{
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
      {/* Settings screens */}
      <Stack.Screen
        name="settings"
        options={{
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <SecureJournalProvider>
            <RootLayoutNav />
          </SecureJournalProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
