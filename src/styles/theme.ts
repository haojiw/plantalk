// Font families - change these to experiment with different fonts
const fonts = {
  // Primary fonts for main content
  heading: 'Lora',               // Elegant serif for dark theme
  body: 'DMSans_400Regular',     // Clean sans for body text
  bodyBold: 'DMSans_700Bold',    // Bold variant for subheadings

  // Secondary fonts
  body2: 'Manrope',
  body3: 'Manrope',

  // Utility fonts
  monospace: 'SpaceMono',                  // For code, numbers, timestamps in recording screen
  handwriting: 'PatrickHand',              // Casual handwriting feel

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

const baseColors = {
  primary: '#C9A94E',      // Muted gold
  surface: '#1A1B1E',      // Dark surface
  text: '#E8E4D9',         // Warm off-white text
  accent: '#7B8CDE',       // Periwinkle accent
  secondary: '#A89050',    // Darker gold
  light: '#2A2B30',        // Slightly lighter than surface
  background: '#141518',   // Near-black background
  border: '#333640',       // Subtle dark border
  overlay: '#00000040',    // Subtle overlay
} as const;

export const theme = {
  fonts,
  colors: {
    ...baseColors,

    // Pre-computed opacity variants — eliminates all `+ 'XX'` hex concatenation in components
    textMuted10: baseColors.text + '10',
    textMuted30: baseColors.text + '30',
    textMuted40: baseColors.text + '40',
    textMuted50: baseColors.text + '50',
    textMuted60: baseColors.text + '60',
    textMuted70: baseColors.text + '70',
    textMuted80: baseColors.text + '80',

    primaryMuted10: baseColors.primary + '10',
    primaryMuted15: baseColors.primary + '15',
    primaryMuted20: baseColors.primary + '20',
    primaryMuted40: baseColors.primary + '40',
    primaryMuted60: baseColors.primary + '60',

    accentMuted15: baseColors.accent + '15',

    borderMuted20: baseColors.border + '20',
    borderMuted40: baseColors.border + '40',
    borderMuted60: baseColors.border + '60',

    backgroundBlur: baseColors.background + 'A0',

    // Semantic colors
    destructive: '#DC2626',
    destructiveMuted15: '#DC262615',
    deleteSwipe: '#FF4444',
    badge: '#C9A94E',
    white: '#FFFFFF',
    switchThumbInactive: '#555555',
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
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  tabBar: {
    height: 90,
    paddingBottom: 20,
    paddingTop: 16,
    blurIntensity: 80,
    blurTint: 'dark' as const,
  },
  screenWrapper: {
    noiseOpacity: 0.05,
    padding: 12,
  },
} as const;

export type Theme = typeof theme;
