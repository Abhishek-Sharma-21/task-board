import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'tb_access_token';
const REFRESH_KEY = 'tb_refresh_token';
const THEME_KEY = 'tb_theme_mode';
const LAST_WORKSPACE_KEY = 'tb_last_workspace_id';

export const storage = {
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.warn('Storage setToken error:', e);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Storage removeToken error:', e);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_KEY, token);
    } catch (e) {
      console.warn('Storage setRefreshToken error:', e);
    }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(REFRESH_KEY);
    } catch (e) {
      console.warn('Storage removeRefreshToken error:', e);
    }
  },

  async getThemeMode(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  },

  async setThemeMode(mode: string): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (e) {
      console.warn('Storage setThemeMode error:', e);
    }
  },

  async getLastWorkspaceId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_WORKSPACE_KEY);
    } catch {
      return null;
    }
  },

  async setLastWorkspaceId(workspaceId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
    } catch (e) {
      console.warn('Storage setLastWorkspaceId error:', e);
    }
  },

  async removeLastWorkspaceId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LAST_WORKSPACE_KEY);
    } catch (e) {
      console.warn('Storage removeLastWorkspaceId error:', e);
    }
  },
};
