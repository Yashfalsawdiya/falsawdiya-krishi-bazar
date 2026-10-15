import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { checkAppVersion, setupChunkErrorHandling } from './utils/cacheManager';

// Setup chunk error handling (hard reload on chunk load failure)
try {
  setupChunkErrorHandling();
} catch (e) {
  console.warn("setupChunkErrorHandling warning:", e);
}

// Check for app version change and clear cache if needed
checkAppVersion().catch(err => {
  console.warn("Version check skipped:", err);
});

// Register Service Worker with automatic updates
try {
  registerSW({ 
    immediate: true,
    onRegistered(r) {
      if (r) {
        // Check for new service worker / bundle updates every 30 minutes
        setInterval(() => {
          r.update().catch(() => {});
        }, 30 * 60 * 1000);

        // Also check whenever the user returns to the app
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update().catch(() => {});
          }
        });

        // Check on internet reconnect
        window.addEventListener('online', () => {
          r.update().catch(() => {});
        });
      }
    },
    onNeedRefresh() {
      console.log('New app code available, updating...');
      window.location.reload();
    },
    onOfflineReady() {
      console.log('App is ready to work offline');
    }
  });
} catch (e) {
  console.warn("Service Worker registration not supported or skipped in this environment:", e);
}

// Global error handling
const isDev = process.env.NODE_ENV === 'development';

window.onerror = function(message, source, lineno, colno, error) {
  console.warn("App Error:", message, "at", source, ":", lineno);
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  // Prevent default browser popup/error logging for benign unhandled rejections (e.g., cancelled fetch, network hiccups)
  event.preventDefault();
  console.warn("Handled Promise Rejection:", event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
