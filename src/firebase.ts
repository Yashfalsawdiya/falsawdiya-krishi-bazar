import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  inMemoryPersistence 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  persistentLocalCache, 
  persistentSingleTabManager,
  memoryLocalCache,
  setLogLevel
} from 'firebase/firestore';
import { cleanupStorageQuota } from './utils/cacheManager';

// Set Firestore log level to silent to prevent non-critical connection fallback warning logs
setLogLevel('silent');

// Proactively free up storage space to ensure room for Auth tokens and app state
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    cleanupStorageQuota();
  } catch (e) {
    console.warn("Initial storage cleanup warning:", e);
  }
}

// Try to load from JSON file, fallback to environment variables for Vercel/Production
let firebaseConfig: any;
// We use a simpler approach without top-level await for better compatibility
import configJson from '../firebase-applet-config.json';

// Prioritize environment variables (Vercel) over JSON file (Local/AI Studio)
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
};

if (envConfig.apiKey) {
  firebaseConfig = envConfig;
} else if (configJson && configJson.apiKey && !configJson.apiKey.includes('TODO')) {
  firebaseConfig = configJson;
} else {
  firebaseConfig = envConfig; // Fallback to empty env vars if nothing found
}

console.log("Firebase Config Selected:", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? "PRESENT" : "MISSING",
  projectId: firebaseConfig.projectId
});

const app = initializeApp(firebaseConfig);

const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "") 
  ? firebaseConfig.firestoreDatabaseId 
  : (firebaseConfig.databaseId && firebaseConfig.databaseId !== "" ? firebaseConfig.databaseId : '(default)');

console.log("Final Firestore Database ID:", dbId);

// CRITICAL: Use initializeFirestore with experimentalForceLongPolling: true 
// to fix connectivity issues (code=unavailable) in proxy/sandboxed environments.
// We use persistentSingleTabManager to use IndexedDB instead of localStorage (which hits quota limits).
let dbInstance: any;
try {
  // 1. Primary: force long polling + useFetchStreams: false + IndexedDB local cache (single tab manager to avoid localStorage quota issues)
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({})
    })
  } as any, dbId);
} catch (e) {
  console.warn("Firestore with IndexedDB local cache failed to initialize, trying memory cache fallback:", e);
  try {
    // 2. Fallback: force long polling + memoryLocalCache (never touches storage quota)
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      ignoreUndefinedProperties: true,
      localCache: memoryLocalCache()
    } as any, dbId);
  } catch (e2) {
    console.warn("Firestore with memory cache failed, trying auto-detect long polling:", e2);
    try {
      // 3. Fallback: auto-detect long polling with memory cache
      dbInstance = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false,
        ignoreUndefinedProperties: true,
        localCache: memoryLocalCache()
      } as any, dbId);
    } catch (e3) {
      console.warn("Firestore custom initializations failed, falling back to memory/default firestore:", e3);
      try {
        dbInstance = initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true,
          ignoreUndefinedProperties: true
        } as any, dbId);
      } catch (e4) {
        console.error("All custom Firestore initializations failed, using default getFirestore:", e4);
        dbInstance = getFirestore(app);
      }
    }
  }
}

export const db = dbInstance;

// Persistence is now handled by persistentLocalCache in the initialization settings.

export const auth = getAuth(app);

// Explicitly set persistence to Local with graceful fallback to session/memory if storage is full
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn("Local auth persistence failed, falling back to session persistence:", err);
  setPersistence(auth, browserSessionPersistence).catch(sessionErr => {
    console.warn("Session auth persistence failed, falling back to inMemory persistence:", sessionErr);
    setPersistence(auth, inMemoryPersistence).catch(() => {});
  });
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isQuotaError = errorMessage.toLowerCase().includes('quota') || errorMessage.includes('429');
  
  const isConnectionError = 
    errorMessage.toLowerCase().includes('offline') || 
    errorMessage.toLowerCase().includes('unavailable') || 
    errorMessage.toLowerCase().includes('could not reach cloud firestore backend') ||
    errorMessage.toLowerCase().includes('failed to connect');
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  if (isQuotaError) {
    console.warn('Firestore Quota Exceeded (Limited Mode):', JSON.stringify(errInfo));
    // We don't throw here for quota errors so the app can attempt to use cached data or fallbacks
    return errInfo;
  }

  if (isConnectionError) {
    console.warn('Firestore Connection Error (Operating in Local/Cached Mode):', JSON.stringify(errInfo));
    // We don't throw here for network/offline errors to keep the application highly functional via offline cache
    return errInfo;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
