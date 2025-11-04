// Font families - change these to experiment with different fonts
const fonts = {
  // Primary fonts for main content
  heading: 'Merriweather',     // Used for titles and headings in all screens.
  body: 'Inter',                // Used for body, caption, and small text throughout the app.
  bodyBold: 'Karla_700Bold',               // Used for subheadings and entry titles.
  

  // Secondary fonts
  body2: 'Karla',
  body3: 'Manrope',

  // Utility fonts
  monospace: 'SpaceMono',                  // For code, numbers, timestamps in recording screen
  handwriting: 'Pangolin',
  
  // alternatives: 

  // sans:
  // Inter_400Regular, Inter_700Bold
  // DM Sans_400Regular, DM Sans_700Bold
  // Manrope_400Regular, Manrope_700Bold
  // Karla_400Regular, Karla_700Bold
  // Sora_400Regular, Sora_600SemiBold
  // Lato_400Regular, Lato_700Bold
  // Noto Sans_400Regular, Noto Sans_700Bold

  // serif:
  // DM Serif Display_400Regular
  // Instrument Serif_400Regular
  // Lora_400Regular, Lora_700Bold
  // Merriweather_400Regular, Merriweather_700Bold

  // utility: 
  // Pangolin_400Regular
  // PatrickHand_400Regular
  // Dyslexic
  // SpaceMono

} as const;

export const theme = {
  fonts,
  colors: {
    primary: '#3A7A4C',      // Deep forest green
    surface: '#F2EDDB',      // Warm cream background F2EDDB E7E2C2
    text: '#2F4A34',         // Dark green text 243C2E
    accent: '#F0C274',       // Golden yellow accent
    secondary: '#90B494',    // Medium green
    light: '#C5D6C7',        // Light green
    background: '#F5F3E8',   // Slightly warmer than surface
    border: '#D4CDB1',       // Subtle border color
    overlay: '#00000020',    // Subtle overlay
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  typography: {
    title: {
      fontFamily: fonts.heading,
      fontSize: 22,
      fontWeight: '700' as const,
      lineHeight: 28,
    },
    heading: {
      fontFamily: fonts.heading,
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    subheading: {
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      fontWeight: '500' as const,
      lineHeight: 22,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 18,
    },
    caption: {
      fontFamily: fonts.body,
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 15,
    },
    small: {
      fontFamily: fonts.body,
      fontSize: 10,
      fontWeight: '400' as const,
      lineHeight: 14,
    },
    accent: {
      fontFamily: fonts.body2,
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
    accentBold: {
      fontFamily: fonts.body2,
      fontSize: 14,
      fontWeight: '700' as const,
      lineHeight: 18,
    },
    monospace: {
      fontFamily: fonts.monospace,
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 15,
    },
    handwriting: {
      fontFamily: fonts.handwriting,
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
  },
} as const;

export type Theme = typeof theme; 