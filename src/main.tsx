import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker
registerSW({ immediate: true });

// Global error handling for debugging deployed app
window.onerror = function(message, source, lineno, colno, error) {
  alert("Error: " + message + "\nAt: " + source + ":" + lineno);
  return false;
};

window.onunhandledrejection = function(event) {
  alert("Unhandled Promise Rejection: " + event.reason);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
