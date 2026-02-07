// Centralized Google Font imports
// Change which fonts are loaded by editing this single file.
// Midnight Ink: Only load fonts used by the dark theme

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import {
  Manrope_400Regular,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

import {
  Lora_400Regular,
  Lora_700Bold,
} from '@expo-google-fonts/lora';

import {
  PatrickHand_400Regular,
} from '@expo-google-fonts/patrick-hand';

import { fontFiles } from './assets';

/**
 * Spread this into useFonts() to load every font the app needs.
 *
 * Usage in _layout.tsx:
 *   import { googleFonts } from '@/styles/fonts';
 *   const [fontsLoaded] = useFonts(googleFonts);
 */
export const googleFonts = {
  // Local font files
  SpaceMono: fontFiles.SpaceMono,
  Dyslexic: fontFiles.Dyslexic,

  // Lora (heading)
  Lora_400Regular,
  Lora_700Bold,

  // DM Sans (body)
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,

  // Manrope (secondary)
  Manrope_400Regular,
  Manrope_700Bold,

  // Patrick Hand (handwriting)
  PatrickHand_400Regular,
} as const;
