import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PlantProvider } from '@/context/PlantProvider';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PlantProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="history" options={{ headerShown: false }} />
            <Stack.Screen 
              name="record" 
              options={{ 
                animation: 'fade',
                headerShown: false,
              }} 
            />
            <Stack.Screen name="entry/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </PlantProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
