/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { theme } from '@/styles/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const colorScheme = useColorScheme() ?? 'light';
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[colorScheme][colorName];
  }
}

/**
 * Hook to easily access typography styles from theme
 * Usage: const typography = useTypography();
 * Then: style={typography.title} or style={[typography.body, { color: 'red' }]}
 */
export function useTypography() {
  return theme.typography;
}

/**
 * Hook to easily access font families from theme
 * Usage: const fonts = useFonts(); 
 * Then: style={{ fontFamily: fonts.heading }}
 */
export function useFontFamilies() {
  return theme.fonts;
}
