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
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import {
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import {
  Manrope_400Regular,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

import {
  Karla_400Regular,
  Karla_500Medium,
  Karla_600SemiBold,
  Karla_700Bold,
} from '@expo-google-fonts/karla';

import {
  Sora_400Regular,
  Sora_600SemiBold,
} from '@expo-google-fonts/sora';

import {
  Lora_400Regular,
  Lora_700Bold,
} from '@expo-google-fonts/lora';

import {
  Lato_400Regular,
  Lato_700Bold,
} from '@expo-google-fonts/lato';

import {
  InstrumentSerif_400Regular,
} from '@expo-google-fonts/instrument-serif';

import {
  PatrickHand_400Regular,
} from '@expo-google-fonts/patrick-hand';

import {
  Merriweather_400Regular,
  Merriweather_500Medium,
  Merriweather_600SemiBold,
  Merriweather_700Bold,
} from '@expo-google-fonts/merriweather';

import {
  Pangolin_400Regular,
} from '@expo-google-fonts/pangolin'; 

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

export default function RootLayout() {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require('@assets/fonts/SpaceMono-Regular.ttf'),
    Dyslexic: require('@assets/fonts/OpenDyslexic-Regular.otf'),

    // Merriweather fonts
    Merriweather_400Regular,
    Merriweather_500Medium,
    Merriweather_600SemiBold,
    Merriweather_700Bold,
    // DM Sans fonts
    DMSans_400Regular,
    DMSans_700Bold,
    // DM Serif Display fonts
    DMSerifDisplay_400Regular,
    // Inter fonts
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Manrope fonts
    Manrope_400Regular,
    Manrope_700Bold,
    // Karla fonts
    Karla_400Regular,
    Karla_700Bold,
    // Sora fonts
    Sora_400Regular,
    Sora_600SemiBold,
    // Lora fonts
    Lora_400Regular,
    Lora_700Bold,
    // Lato fonts
    Lato_400Regular,
    Lato_700Bold,
    // Instrument Serif fonts
    InstrumentSerif_400Regular,
    // PatrickHand fonts
    PatrickHand_400Regular,
    
    // Pangolin fonts
    Pangolin_400Regular,
  });

  // Preload images
  useEffect(() => {
    async function loadImagesAsync() {
      try {
        const imageAssets = cacheImages([
          // Images
          require('@assets/images/icon.png'),
          require('@assets/images/tree.png'),
          // Textures
          require('@assets/texture/noise_overlay.webp'),
          require('@assets/texture/paper.jpg'),
        ]);

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

  // Hide splash screen when both fonts and images are loaded
  useEffect(() => {
    if (loaded && imagesLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, imagesLoaded]);

  // Show splash screen while loading
  if (!loaded || !imagesLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SecureJournalProvider>
          <Stack screenOptions={{ 
            headerShown: false,
            animation: 'fade',
            animationDuration: 250,
            animationTypeForReplace: 'push',
          }}>
            {/* Tabs as the primary navigation */}
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false,
                animation: 'fade',
                animationDuration: 250,
              }} 
            />
            {/* Modal and detailed screens outside tabs */}
            <Stack.Screen 
              name="record" 
              options={{ 
                animation: 'fade',
                animationDuration: 300,
                headerShown: false,
              }} 
            />
            <Stack.Screen 
              name="entry/[id]" 
              options={{ 
                headerShown: false,
                animation: 'default',
                animationDuration: 250,
              }} 
            />
            <Stack.Screen name="+not-found" />
          </Stack>
        </SecureJournalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
