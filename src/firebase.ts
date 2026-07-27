import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';

// Set Firestore log level to error to prevent non-critical connection fallback warning logs
setLogLevel('error');

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
let dbInstance: any;
try {
  // 1. Primary: force long polling + multiple tab local cache (best for sandboxed iframes)
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  } as any, dbId);
} catch (e) {
  console.warn("Firestore with multiple-tab local cache failed to initialize, trying basic cache fallback:", e);
  try {
    // 2. Fallback: force long polling + single tab cache
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({})
    } as any, dbId);
  } catch (e2) {
    console.warn("Firestore with standard local cache failed, trying auto-detect long polling:", e2);
    try {
      // 3. Fallback: auto-detect long polling
      dbInstance = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
        localCache: persistentLocalCache({})
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

// Explicitly set persistence to Local (Default but being safe for session longevity)
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Auth persistence error:", err);
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
