import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  getDocFromServer, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

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

// CRITICAL: Initialize Firestore using auto-detecting long polling and auto-fallback 
// for cache configuration to prevent failure inside sandboxed iframes.
let dbInstance: any;
const firestoreSettings: any = {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
};

try {
  firestoreSettings.localCache = persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  });
  dbInstance = initializeFirestore(app, firestoreSettings, dbId);
} catch (cacheError) {
  console.warn("Firestore persistent cache failed to initialize, falling back to basic/memory cache:", cacheError);
  try {
    dbInstance = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    }, dbId);
  } catch (initError) {
    console.error("Firestore initializeFirestore failed, falling back to getFirestore:", initError);
    dbInstance = getFirestore(app, dbId);
  }
}

export const db = dbInstance;

// Persistence is now handled by persistentLocalCache in the initialization settings.

export const auth = getAuth(app);

// Explicitly set persistence to Local (Default but being safe for session longevity)
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Auth persistence error:", err);
});

async function testConnection() {
  console.log("Testing Firestore connection...");
  try {
    // CRITICAL: Call getFromServer to test the connection to Firestore.
    // We use a specific doc path that doesn't necessarily need to exist
    await getDocFromServer(doc(db, '_connection_test_', 'check'));
    console.log("Firestore connection test: SUCCESS (Server reached)");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isQuotaError = errorMessage.toLowerCase().includes('quota') || errorMessage.includes('429');
    
    if (isQuotaError) {
      console.warn("Firestore connection test: PARTIAL SUCCESS (Server reached but Quota Exceeded)");
      console.warn("The app will operate in OFFLINE/CACHE-ONLY mode until quota resets.");
    } else {
      console.error("Firestore connection test: FAILED");
      console.error("Error Message:", errorMessage);
      if (errorMessage.includes('the client is offline')) {
        console.error("The client is reporting offline mode. This may be due to environment constraints.");
      }
    }
  }
}
testConnection();

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

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
