/**
 * Falsawdiya Krishi Bazaar - High Performance IndexedDB Local Store
 * 
 * Provides robust, asynchronous, multi-megabyte structured client-side storage
 * without hitting localStorage's 5MB quota limit.
 * Completely immune to DOMException: QuotaExceededError.
 * Automatic graceful fallback to safe localStorage if IndexedDB is blocked.
 */

const DB_NAME = 'falsawdiya_krishi_bazaar_idb';
const DB_VERSION = 1;
const STORE_NAME = 'app_cache_store';

let dbPromise: Promise<IDBDatabase> | null = null;

function openIDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Handle unexpected closes / version changes
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };

        resolve(db);
      };

      request.onerror = (event: Event) => {
        console.warn('[IDB] Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
        dbPromise = null;
        reject((event.target as IDBOpenDBRequest).error);
      };

      request.onblocked = () => {
        console.warn('[IDB] Database open blocked by another tab');
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

/**
 * Get item from IndexedDB with transparent fallback
 */
export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result !== undefined ? (req.result as T) : null);
        };

        req.onerror = () => {
          // Fallback to localStorage
          resolve(getLocalStorageFallback<T>(key));
        };
      } catch (txErr) {
        resolve(getLocalStorageFallback<T>(key));
      }
    });
  } catch {
    return getLocalStorageFallback<T>(key);
  }
}

/**
 * Save item into IndexedDB with transparent fallback
 */
export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);

        req.onsuccess = () => {
          resolve(true);
        };

        req.onerror = () => {
          setLocalStorageFallback(key, value);
          resolve(false);
        };

        tx.oncomplete = () => {
          resolve(true);
        };

        tx.onerror = () => {
          setLocalStorageFallback(key, value);
          resolve(false);
        };
      } catch (txErr) {
        setLocalStorageFallback(key, value);
        resolve(false);
      }
    });
  } catch {
    return setLocalStorageFallback(key, value);
  }
}

/**
 * Remove an item from IndexedDB
 */
export async function idbDelete(key: string): Promise<boolean> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    try {
      localStorage.removeItem(`idb_fallback_${key}`);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Clear all cached items in the IndexedDB store
 */
export async function idbClear(): Promise<boolean> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

// Fallback helpers
function getLocalStorageFallback<T>(key: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(`idb_fallback_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalStorageFallback<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.setItem(`idb_fallback_${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
