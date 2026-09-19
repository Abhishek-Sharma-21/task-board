import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  colors: typeof colors.dark;
  toggleTheme: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  colors: colors.light,

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem('theme');
      const theme = (saved as Theme) || 'light';
      set({ theme, colors: colors[theme] });
    } catch {
      set({ theme: 'light', colors: colors.light });
    }
  },

  toggleTheme: async () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    await AsyncStorage.setItem('theme', newTheme);
    set({ theme: newTheme, colors: colors[newTheme] });
  },
}));
