export const theme = {
  colors: {
    primary: '#3A7A4C',      // Deep forest green
    surface: '#E7E2C2',      // Warm cream background
    text: '#243C2E',         // Dark green text
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
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
    },
    heading: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 29,
    },
    subheading: {
      fontSize: 18,
      fontWeight: '500' as const,
      lineHeight: 22,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 17,
    },
    small: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 15,
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