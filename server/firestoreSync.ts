import crypto from 'crypto';
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

interface ServiceAccountCreds {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getServiceAccountCreds(): ServiceAccountCreds | null {
  try {
    const rawJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
    if (rawJson) {
      const parsed = JSON.parse(rawJson);
      if (parsed?.client_email && parsed?.private_key) {
        return {
          clientEmail: String(parsed.client_email).trim(),
          privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
          tokenUri: String(parsed.token_uri || 'https://oauth2.googleapis.com/token').trim(),
        };
      }
    }
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
    if (clientEmail && privateKey) {
      return {
        clientEmail,
        privateKey,
        tokenUri: 'https://oauth2.googleapis.com/token',
      };
    }
  } catch (err: any) {
    console.warn('[FirestoreSync] Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', err?.message || err);
  }
  return null;
}

export function hasServerFirestoreWriteAccess(): boolean {
  return Boolean(getServiceAccountCreds());
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getServiceAccountAccessToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 120_000) {
    return cachedAccessToken.token;
  }

  const creds = getServiceAccountCreds();
  if (!creds) return null;

  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = base64UrlEncode(
      JSON.stringify({
        iss: creds.clientEmail,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: creds.tokenUri,
        iat: nowSec,
        exp: nowSec + 3600,
      })
    );

    const unsignedJwt = `${header}.${claim}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedJwt);
    signer.end();
    const signature = base64UrlEncode(signer.sign(creds.privateKey));
    const assertion = `${unsignedJwt}.${signature}`;

    const tokenRes = await fetch(creds.tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errTxt = await tokenRes.text().catch(() => '');
      console.warn(`[FirestoreSync] OAuth2 token exchange failed (${tokenRes.status}):`, errTxt);
      return null;
    }

    const tokenJson: any = await tokenRes.json();
    if (tokenJson?.access_token) {
      const expiresInMs = (Number(tokenJson.expires_in) || 3600) * 1000;
      cachedAccessToken = {
        token: String(tokenJson.access_token),
        expiresAt: Date.now() + expiresInMs,
      };
      return cachedAccessToken.token;
    }
    return null;
  } catch (err: any) {
    console.warn('[FirestoreSync] Failed generating OAuth2 access token:', err?.message || err);
    return null;
  }
}

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
            if (Array.isArray(v)) {
              // Firestore REST API does not allow directly nested arrays; wrap inner arrays safely inside mapValue
              return {
                mapValue: {
                  fields: toFirestoreFields({ items: v }),
                },
              };
            }
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
        if ('mapValue' in item) {
          const decoded = fromFirestoreFields(item.mapValue?.fields || {});
          if (Object.keys(decoded).length === 1 && Array.isArray(decoded.items)) {
            return decoded.items;
          }
          return decoded;
        }
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
function getDocumentUrl(collection: string, docId: string, useKeyParam: boolean = true): string {
  const dbPath = DATABASE_ID ? `(default)` === DATABASE_ID ? '(default)' : DATABASE_ID : '(default)';
  const keyParam = useKeyParam && API_KEY ? `?key=${encodeURIComponent(API_KEY)}` : '';
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbPath}/documents/${collection}/${docId}${keyParam}`;
}

/**
 * Fetch a document from Firestore REST API
 */
export async function getRemoteFirestoreDoc<T = any>(collection: string, docId: string): Promise<T | null> {
  try {
    const accessToken = await getServiceAccountAccessToken();
    const url = getDocumentUrl(collection, docId, !accessToken);
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, { headers });

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

export async function setRemoteFirestoreDocDetailed(
  collection: string,
  docId: string,
  data: Record<string, any>
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const accessToken = await getServiceAccountAccessToken();
    const url = getDocumentUrl(collection, docId, !accessToken);
    const fields = toFirestoreFields(data);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[FirestoreSync] setDoc ${collection}/${docId} returned status ${res.status}:`, errText);
      return { ok: false, status: res.status, error: errText || `HTTP ${res.status}` };
    }

    return { ok: true, status: res.status };
  } catch (err: any) {
    console.warn(`[FirestoreSync] setDoc ${collection}/${docId} error:`, err.message);
    return { ok: false, error: err?.message || 'Network error' };
  }
}

/**
 * Save / Update a document in Firestore REST API
 */
export async function setRemoteFirestoreDoc(collection: string, docId: string, data: Record<string, any>): Promise<boolean> {
  const result = await setRemoteFirestoreDocDetailed(collection, docId, data);
  return result.ok;
}

/**
 * Delete a document from Firestore REST API
 */
export async function deleteRemoteFirestoreDoc(collection: string, docId: string): Promise<boolean> {
  try {
    const accessToken = await getServiceAccountAccessToken();
    const url = getDocumentUrl(collection, docId, !accessToken);
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err: any) {
    console.warn(`[FirestoreSync] deleteDoc ${collection}/${docId} error:`, err.message);
    return false;
  }
}

export interface VerifiedAdminUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

const BOOTSTRAP_ADMIN_EMAIL = 'yashfalsawdiya36@gmail.com';

/**
 * Verifies a Firebase ID Token using Identity Toolkit accounts:lookup and ensures the user is an Admin.
 */
export async function verifyAdminFirebaseToken(idToken: string): Promise<VerifiedAdminUser | null> {
  try {
    const cleanToken = (idToken || '').trim();
    if (!cleanToken || !API_KEY) {
      return null;
    }

    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: cleanToken }),
      }
    );

    if (!lookupRes.ok) {
      return null;
    }

    const lookupJson: any = await lookupRes.json();
    const user = Array.isArray(lookupJson?.users) ? lookupJson.users[0] : null;
    if (!user || !user.localId || !user.email) {
      return null;
    }

    const emailLower = String(user.email).toLowerCase().trim();
    const emailVerified = Boolean(user.emailVerified);

    if (!emailVerified) {
      return null;
    }

    if (emailLower === BOOTSTRAP_ADMIN_EMAIL) {
      return {
        uid: String(user.localId),
        email: emailLower,
        emailVerified,
      };
    }

    const [contentDoc, userDoc] = await Promise.all([
      getRemoteFirestoreDoc<{ adminEmails?: string[] }>('settings', 'content'),
      getRemoteFirestoreDoc<{ role?: string }>('users', String(user.localId)),
    ]);

    const adminEmails = Array.isArray(contentDoc?.adminEmails)
      ? contentDoc!.adminEmails.map((e) => String(e).toLowerCase().trim())
      : [];

    if (adminEmails.includes(emailLower) || userDoc?.role === 'admin') {
      return {
        uid: String(user.localId),
        email: emailLower,
        emailVerified,
      };
    }

    return null;
  } catch (err: any) {
    console.warn('[FirestoreSync] verifyAdminFirebaseToken error:', err?.message || err);
    return null;
  }
}

