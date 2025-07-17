import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PlantProvider } from '@/context/PlantProvider';
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

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
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
  });

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PlantProvider>
          <Stack screenOptions={{ 
            headerShown: false,
            animation: 'fade',
            animationDuration: 250,
            animationTypeForReplace: 'push',
          }}>
            <Stack.Screen 
              name="index" 
              options={{ 
                headerShown: false,
                animation: 'fade',
                animationDuration: 250,
              }} 
            />
            <Stack.Screen
              name="history"
              options={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 250,
              }}
            />
            <Stack.Screen 
              name="record" 
              options={{ 
                animation: 'fade',
                animationDuration: 250,
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
        </PlantProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
