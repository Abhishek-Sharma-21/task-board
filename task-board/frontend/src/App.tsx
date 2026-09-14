import { useEffect } from 'react';
import { AppRouter } from './routes/AppRouter';
import { useAuthStore } from './features/auth/authStore';
import { InitialLoadingScreen } from './components/InitialLoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

function App(): JSX.Element {
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Initialize the auth store from localStorage on app load
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  if (!isInitialized) {
    return <InitialLoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}

export default App;