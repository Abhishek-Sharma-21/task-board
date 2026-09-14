import { darkColors, lightColors, ThemeColors } from './colors';

export const radius = {
  xs: 6,
  sm: 9,
  md: 11,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const typography = {
  fontFamily: undefined, // Default system font
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 26,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export interface AppTheme {
  colors: ThemeColors;
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
  isDark: boolean;
}

export function getTheme(isDark: boolean): AppTheme {
  return {
    colors: isDark ? darkColors : lightColors,
    radius,
    spacing,
    typography,
    isDark,
  };
}

// Backward compatibility export matching old config/theme
export const theme = {
  colors: darkColors,
  radius,
  spacing,
};
