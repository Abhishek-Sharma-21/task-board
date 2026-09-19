import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from './src/stores/authStore';
import { useThemeStore } from './src/stores/themeStore';
import { useNotificationStore } from './src/stores/notificationStore';
import RootNavigator from './src/navigation/RootNavigator';
import ToastContainer from './src/components/Toast';

export default function App() {
  const { initialize: initAuth } = useAuthStore();
  const { initialize: initTheme, theme } = useThemeStore();
  const { fetchNotifications } = useNotificationStore();

  useEffect(() => {
    initTheme();
    initAuth();
  }, []);

  useEffect(() => {
    const unsub = useAuthStore.subscribe((state) => {
      if (state.user && state.accessToken) {
        fetchNotifications();
      }
    });
    const { user, accessToken } = useAuthStore.getState();
    if (user && accessToken) {
      fetchNotifications();
    }
    return unsub;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
        <ToastContainer />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
