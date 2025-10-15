import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SecureJournalProvider } from '@/core/providers/journal';
import {
  DMSans_400Regular,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import {
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display';

import {
  Inter_400Regular,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import {
  Manrope_400Regular,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

import {
  Karla_400Regular,
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


export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('@assets/fonts/SpaceMono-Regular.ttf'),
    // DM Sans fonts
    DMSans_400Regular,
    DMSans_700Bold,
    // DM Serif Display fonts
    DMSerifDisplay_400Regular,
    // Inter fonts
    Inter_400Regular,
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
  });

  if (!loaded) {
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
