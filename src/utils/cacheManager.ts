/**
 * Manages application caching and versioning to ensure users always have the latest version.
 */

const APP_VERSION_KEY = 'app-version';

export const checkAppVersion = async () => {
  const currentVersion = __APP_VERSION__;
  const storedVersion = localStorage.getItem(APP_VERSION_KEY);

  if (storedVersion && storedVersion !== currentVersion) {
    console.log(`New version detected: ${currentVersion}. Clearing old caches...`);
    
    try {
      // Clear Cache Storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Optional: Clear specific local storage keys or all
      // We might want to keep some user preferences, but for a total "glitch clear" 
      // we might clear most things. For now, let's just update the version.
      localStorage.setItem(APP_VERSION_KEY, currentVersion);
      
      // Force reload to get fresh assets
      window.location.reload();
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  } else if (!storedVersion) {
    localStorage.setItem(APP_VERSION_KEY, currentVersion);
  }
};

/**
 * Specifically handles chunk loading failures which often happen 
 * when a new version is deployed and the user is on an old one.
 */
export const setupChunkErrorHandling = () => {
  window.addEventListener('error', (e) => {
    // Check if it's a chunk loading error
    const isChunkError = 
      /Loading chunk [\d]+ failed/.test(e.message) || 
      /Loading CSS chunk [\d]+ failed/.test(e.message) ||
      (e.target && (e.target as any).tagName === 'SCRIPT' && (e.target as any).src && (e.target as any).src.includes('chunk-'));

    if (isChunkError) {
      console.warn('Chunk loading error detected. Forcing hard reload...');
      // Use a flag to avoid infinite reload loop
      const lastReload = parseInt(sessionStorage.getItem('last-chunk-reload') || '0');
      const now = Date.now();
      
      if (now - lastReload > 10000) { // Only reload if last reload was more than 10s ago
        sessionStorage.setItem('last-chunk-reload', now.toString());
        window.location.reload();
      }
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && 
        (event.reason.name === 'ChunkLoadError' || 
         /Loading chunk [\d]+ failed/.test(event.reason.message))) {
      console.warn('Unhandled ChunkLoadError detected. Forcing reload...');
      window.location.reload();
    }
  });
};

/**
 * Forces a manual reset of the Service Worker if needed
 */
export const unregisterAllServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      await registration.unregister();
    }
    console.log('All Service Workers unregistered.');
  }
};
