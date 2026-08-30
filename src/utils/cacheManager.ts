/**
 * Manages application caching and versioning to ensure users always have the latest version.
 */

const APP_VERSION_KEY = 'app-version';

/**
 * Proactively cleans up stale or bloated storage items to prevent QuotaExceededError
 */
export const cleanupStorageQuota = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // 1. Remove stale firestore multi-tab target indices
      if (
        key.startsWith('firestore_targets_') || 
        key.startsWith('firestore_mutations_') || 
        key.startsWith('firestore_clients_')
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });
  } catch (e) {
    console.warn("cleanupStorageQuota warning:", e);
  }
};

/**
 * Safe wrapper around localStorage.setItem with automatic quota overflow recovery
 */
export const safeLocalStorageSet = (key: string, value: string): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    console.warn(`localStorage quota exceeded while saving "${key}". Triggering emergency cleanup...`);
    
    try {
      // 1. Purge firestore target keys
      cleanupStorageQuota();

      // 2. Clear large non-critical cache keys
      const disposableKeys = [
        'agri_cache_news',
        'news_cache_time',
        'mandi_rates_cache',
        'pk_smart_cache',
        'schemes_cache',
        'calc_normal_history'
      ];

      disposableKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });

      // 3. Retry setting
      localStorage.setItem(key, value);
      return true;
    } catch (retryError) {
      console.error(`Failed to save "${key}" to localStorage even after quota cleanup:`, retryError);
      return false;
    }
  }
};

export const checkAppVersion = async (): Promise<void> => {
  cleanupStorageQuota();
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
          safeLocalStorageSet(APP_VERSION_KEY, currentVersion);
        } catch {}
        
        // Force reload to get fresh assets
        window.location.reload();
      } catch (error) {
        console.warn('Error during cache cleanup:', error);
      }
    } else if (!storedVersion) {
      try {
        safeLocalStorageSet(APP_VERSION_KEY, currentVersion);
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
