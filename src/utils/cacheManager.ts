/**
 * Manages application caching and versioning to ensure users always have the latest version.
 */

const APP_VERSION_KEY = 'app-version';

export const checkAppVersion = async (): Promise<void> => {
  try {
    const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
    let storedVersion: string | null = null;
    try {
      storedVersion = localStorage.getItem(APP_VERSION_KEY);
    } catch {
      // Ignore localStorage access restrictions in private/sandboxed contexts
    }

    if (storedVersion && storedVersion !== currentVersion) {
      console.log(`New version detected: ${currentVersion}. Clearing old caches...`);
      
      try {
        // Clear Cache Storage if available
        if (typeof window !== 'undefined' && 'caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name).catch(() => false)));
        }

        try {
          localStorage.setItem(APP_VERSION_KEY, currentVersion);
        } catch {}
        
        // Force reload to get fresh assets
        window.location.reload();
      } catch (error) {
        console.warn('Error during cache cleanup:', error);
      }
    } else if (!storedVersion) {
      try {
        localStorage.setItem(APP_VERSION_KEY, currentVersion);
      } catch {}
    }
  } catch (err) {
    console.warn('checkAppVersion handled error:', err);
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
