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

// Register Service Worker with automatic updates and error safety
try {
  registerSW({ 
    immediate: true,
    onNeedRefresh() {
      console.log('New content available, refreshing...');
      window.location.reload();
    },
    onOfflineReady() {
      console.log('App is ready to work offline');
    },
    onRegisterError(error) {
      console.warn('Service worker registration failed or ignored in frame:', error);
    }
  });
} catch (e) {
  console.warn('Service worker initialization skipped:', e);
}

// Global error handling - log gracefully without crashing preview frame
window.onerror = function(message, source, lineno) {
  console.error("App Error:", message, "at", source, ":", lineno);
  return true; // Prevents default browser error overlay
};

window.addEventListener('unhandledrejection', function(event) {
  console.warn("Handled unhandled promise rejection:", event.reason);
  event.preventDefault(); // Prevents error from crashing preview iframe or triggering unhandled error reporting
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
