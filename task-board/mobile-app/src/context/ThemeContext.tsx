import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { AppTheme, getTheme } from '../theme/theme';
import { ThemeColors } from '../theme/colors';
import { storage } from '../services/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  theme: AppTheme;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    const loadStoredTheme = async () => {
      const stored = await storage.getThemeMode();
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored as ThemeMode);
      }
    };
    loadStoredTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await storage.setThemeMode(mode);
  };

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const theme = useMemo(() => getTheme(isDark), [isDark]);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      theme,
      colors: theme.colors,
      isDark,
    }),
    [themeMode, theme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if component is used outside ThemeProvider
    const defaultTheme = getTheme(true);
    return {
      themeMode: 'dark',
      setThemeMode: async () => {},
      theme: defaultTheme,
      colors: defaultTheme.colors,
      isDark: true,
    };
  }
  return context;
};
