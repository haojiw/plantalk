import { Stack } from 'expo-router';
import { motion } from '@/styles/motion';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: motion.screenTransitions.settingsStack,
      animationDuration: motion.screenTransitions.fadeDuration,
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="billing" />
      <Stack.Screen name="language" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="storage" />
      <Stack.Screen name="developer" />
    </Stack>
  );
}
