import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { checkAppVersion, setupChunkErrorHandling } from './utils/cacheManager';

// Setup chunk error handling (hard reload on chunk load failure)
setupChunkErrorHandling();

// Check for app version change and clear cache if needed
checkAppVersion();

// Register Service Worker with automatic updates
registerSW({ 
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, refreshing...');
    window.location.reload();
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  }
});

// Global error handling - log to console instead of intrusive alerts in production
const isDev = process.env.NODE_ENV === 'development';

window.onerror = function(message, source, lineno, colno, error) {
  console.error("App Error:", message, "at", source, ":", lineno);
  if (isDev) {
    // Keep alerts only in dev if desired, but for now console is safer
  }
  return false;
};

window.onunhandledrejection = function(event) {
  console.error("Unhandled Promise Rejection:", event.reason);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
