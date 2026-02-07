// Centralized Google Font imports
// Change which fonts are loaded by editing this single file.

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

  // Merriweather
  Merriweather_400Regular,
  Merriweather_500Medium,
  Merriweather_600SemiBold,
  Merriweather_700Bold,

  // DM Sans
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,

  // DM Serif Display
  DMSerifDisplay_400Regular,

  // Inter
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,

  // Manrope
  Manrope_400Regular,
  Manrope_700Bold,

  // Karla
  Karla_400Regular,
  Karla_500Medium,
  Karla_600SemiBold,
  Karla_700Bold,

  // Sora
  Sora_400Regular,
  Sora_600SemiBold,

  // Lora
  Lora_400Regular,
  Lora_700Bold,

  // Lato
  Lato_400Regular,
  Lato_700Bold,

  // Instrument Serif
  InstrumentSerif_400Regular,

  // Patrick Hand
  PatrickHand_400Regular,

  // Pangolin
  Pangolin_400Regular,
} as const;
