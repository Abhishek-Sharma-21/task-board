import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Import themeStore BEFORE App so applyTheme() runs synchronously on every
// page (including Login/Register) and sets data-theme before first paint.
import './stores/themeStore';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
