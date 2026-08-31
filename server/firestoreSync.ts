import fs from 'fs';
import path from 'path';

// Load firebase applet config
let firebaseConfig: {
  projectId?: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
} = {};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    firebaseConfig = JSON.parse(raw);
  }
} catch (e) {
  console.warn('[FirestoreSync] Could not read firebase-applet-config.json from disk:', e);
}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'ai-studio-applet-webapp-4d7f3';
const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || 'ai-studio-7b5685c2-6c65-4fd7-acc5-4d8cd6d95335';
const API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || '';

/**
 * Converts a standard JavaScript object into Firestore REST API fields format
 */
export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  if (!obj || typeof obj !== 'object') return fields;

  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: val.toString() };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((v) => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') {
              return Number.isInteger(v) ? { integerValue: v.toString() } : { doubleValue: v };
            }
            if (typeof v === 'boolean') return { booleanValue: v };
            if (v === null || v === undefined) return { nullValue: null };
            if (typeof v === 'object') return { mapValue: { fields: toFirestoreFields(v) } };
            return { stringValue: String(v) };
          }),
        },
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

/**
 * Converts Firestore REST API fields back into a clean JavaScript object
 */
export function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  if (!fields || typeof fields !== 'object') return {};
  const obj: Record<string, any> = {};

  for (const [key, val] of Object.entries(fields)) {
    if (!val || typeof val !== 'object') continue;

    if ('stringValue' in val) {
      obj[key] = val.stringValue;
    } else if ('integerValue' in val) {
      obj[key] = parseInt(val.integerValue, 10);
    } else if ('doubleValue' in val) {
      obj[key] = parseFloat(val.doubleValue);
    } else if ('booleanValue' in val) {
      obj[key] = val.booleanValue;
    } else if ('nullValue' in val) {
      obj[key] = null;
    } else if ('arrayValue' in val) {
      const arr = val.arrayValue?.values || [];
      obj[key] = arr.map((item: any) => {
        if ('stringValue' in item) return item.stringValue;
        if ('integerValue' in item) return parseInt(item.integerValue, 10);
        if ('doubleValue' in item) return parseFloat(item.doubleValue);
        if ('booleanValue' in item) return item.booleanValue;
        if ('nullValue' in item) return null;
        if ('mapValue' in item) return fromFirestoreFields(item.mapValue?.fields || {});
        return item;
      });
    } else if ('mapValue' in val) {
      obj[key] = fromFirestoreFields(val.mapValue?.fields || {});
    }
  }
  return obj;
}

/**
 * Helper to build the Firestore REST endpoint URL
 */
function getDocumentUrl(collection: string, docId: string): string {
  const dbPath = DATABASE_ID ? `(default)` === DATABASE_ID ? '(default)' : DATABASE_ID : '(default)';
  const keyParam = API_KEY ? `?key=${encodeURIComponent(API_KEY)}` : '';
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbPath}/documents/${collection}/${docId}${keyParam}`;
}

/**
 * Fetch a document from Firestore REST API
 */
export async function getRemoteFirestoreDoc<T = any>(collection: string, docId: string): Promise<T | null> {
  try {
    const url = getDocumentUrl(collection, docId);
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[FirestoreSync] getDoc ${collection}/${docId} returned status ${res.status}:`, errText);
      return null;
    }

    const data: any = await res.json();
    if (data && data.fields) {
      return fromFirestoreFields(data.fields) as T;
    }
    return null;
  } catch (err: any) {
    console.warn(`[FirestoreSync] getDoc ${collection}/${docId} error:`, err.message);
    return null;
  }
}

/**
 * Save / Update a document in Firestore REST API
 */
export async function setRemoteFirestoreDoc(collection: string, docId: string, data: Record<string, any>): Promise<boolean> {
  try {
    const url = getDocumentUrl(collection, docId);
    const fields = toFirestoreFields(data);

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[FirestoreSync] setDoc ${collection}/${docId} returned status ${res.status}:`, errText);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn(`[FirestoreSync] setDoc ${collection}/${docId} error:`, err.message);
    return false;
  }
}

/**
 * Delete a document from Firestore REST API
 */
export async function deleteRemoteFirestoreDoc(collection: string, docId: string): Promise<boolean> {
  try {
    const url = getDocumentUrl(collection, docId);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });
    return res.ok;
  } catch (err: any) {
    console.warn(`[FirestoreSync] deleteDoc ${collection}/${docId} error:`, err.message);
    return false;
  }
}
