/**
 * Manages application caching, storage quotas, and versioning.
 */

import { CartItem, Order, Product } from '../types';

const APP_VERSION_KEY = 'app-version';

/**
 * Non-essential cache keys that can be safely evicted when storage quota is tight
 */
const DISPOSABLE_CACHE_KEYS = [
  'agri_cache_products',
  'agri_cache_categories',
  'agri_cache_agriIssues',
  'agri_cache_helplines',
  'agri_cache_news',
  'news_cache_time',
  'mandi_rates_cache',
  'pk_smart_cache',
  'schemes_cache',
  'calc_normal_history',
  'agri_cache_legal_pages',
  'agri_cache_app_content',
  'agri_cache_delivery_config',
  'agri_cache_invoice_template',
  'last_agri_sync_date'
];

/**
 * Proactively cleans up stale or bloated storage items to guarantee free space for Auth tokens and app state
 */
export const cleanupStorageQuota = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];
    let totalEstimatedBytes = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      const val = localStorage.getItem(key) || '';
      totalEstimatedBytes += (key.length + val.length) * 2;

      // 1. Remove stale firestore multi-tab target indices and mutations
      if (
        key.startsWith('firestore_targets_') || 
        key.startsWith('firestore_mutations_') || 
        key.startsWith('firestore_clients_')
      ) {
        keysToRemove.push(key);
      }

      // 2. Remove excessively huge items (> 100KB) unless it is authUser
      if (val.length > 100000 && !key.startsWith('firebase:authUser')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });

    // 3. If storage is getting tight (> 1MB), aggressively evict disposable caches
    if (totalEstimatedBytes > 1000000) {
      DISPOSABLE_CACHE_KEYS.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    }

    // 4. Test write capability to ensure room for Firebase Auth token
    try {
      const testKey = '__fkb_storage_test__';
      localStorage.setItem(testKey, 'ok');
      localStorage.removeItem(testKey);
    } catch (quotaErr) {
      console.warn("Storage quota full! Performing emergency clearance of all disposable caches...");
      DISPOSABLE_CACHE_KEYS.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    }
  } catch (e) {
    console.warn("cleanupStorageQuota warning:", e);
  }
};

/**
 * Sanitize product to avoid storing massive base64 image strings or unnecessary fields in localStorage
 */
export const sanitizeProductForStorage = (prod: Product): Product => {
  if (!prod) return prod;
  const image = prod.image;
  const cleanImage = (typeof image === 'string' && image.startsWith('data:') && image.length > 1000)
    ? '' // Strip huge base64 strings to keep localStorage minimal
    : image;

  return {
    ...prod,
    image: cleanImage,
  };
};

/**
 * Sanitize Cart Items before storing in localStorage
 */
export const sanitizeCartItemsForStorage = (items: CartItem[]): CartItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    id: item.id,
    quantity: item.quantity,
    price: item.price,
    unit: item.unit,
    weightInKg: item.weightInKg,
    product: sanitizeProductForStorage(item.product),
  }));
};

/**
 * Sanitize Order object before caching in localStorage
 */
export const sanitizeOrderForStorage = (order: Order): Order => {
  if (!order) return order;
  return {
    ...order,
    items: Array.isArray(order.items) 
      ? order.items.map(item => ({
          ...item,
          image: (typeof item.image === 'string' && item.image.startsWith('data:') && item.image.length > 1000)
            ? ''
            : item.image
        }))
      : [],
  };
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

      // 2. Clear non-critical cache keys
      DISPOSABLE_CACHE_KEYS.forEach(k => {
        if (k !== key) {
          try { localStorage.removeItem(k); } catch (_) {}
        }
      });

      // 3. If saving orders cache, trim to only top 5 orders
      if (key === 'falsawdiya_customer_orders_cache') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed) && parsed.length > 5) {
            value = JSON.stringify(parsed.slice(0, 5));
          }
        } catch (_) {}
      }

      // 4. Retry setting
      localStorage.setItem(key, value);
      return true;
    } catch (retryError) {
      console.warn(`Could not save "${key}" to localStorage due to strict quota limits:`, retryError);
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
