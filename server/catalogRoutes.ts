import { Request, Response } from 'express';
import { getRemoteFirestoreDocStatus, listRemoteFirestoreCollection } from './firestoreSync.js';

export type CatalogKey =
  | 'products'
  | 'categories'
  | 'content'
  | 'legalPages'
  | 'deliveryConfig'
  | 'invoiceTemplate'
  | 'deliveryEmailTemplate'
  | 'helplines'
  | 'agriIssues'
  | 'playlists';

const ALLOWED_CATALOG_KEYS = new Set<CatalogKey>([
  'products',
  'categories',
  'content',
  'legalPages',
  'deliveryConfig',
  'invoiceTemplate',
  'deliveryEmailTemplate',
  'helplines',
  'agriIssues',
  'playlists',
]);

const VERSION_RAM_TTL_MS = 2 * 60 * 1000; // 2 minutes (aligns with Vercel Edge CDN s-maxage=120)
const DATA_RAM_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours (aligns with Vercel Edge CDN s-maxage=21600)

interface VersionRamEntry {
  fetchedAt: number;
  versionDoc: Record<string, any> | null;
  exists: boolean;
}

interface DataRamEntry {
  fetchedAt: number;
  cv: string;
  exists: boolean;
  data: any;
}

let versionRamCache: VersionRamEntry | null = null;
let inFlightVersionPromise: Promise<VersionRamEntry | null> | null = null;

const dataRamCache = new Map<string, DataRamEntry>();
const inFlightDataPromises = new Map<string, Promise<DataRamEntry | null>>();

export function clearCatalogMemoryCaches(): void {
  versionRamCache = null;
  inFlightVersionPromise = null;
  dataRamCache.clear();
  inFlightDataPromises.clear();
  console.log('[CatalogHub] Cleared server catalog version & data memory caches.');
}

async function fetchVersionFromFirestore(): Promise<VersionRamEntry | null> {
  const res = await getRemoteFirestoreDocStatus<Record<string, any>>('settings', 'metadata_version');
  if (!res.ok) {
    return null;
  }
  const entry: VersionRamEntry = {
    fetchedAt: Date.now(),
    exists: res.exists,
    versionDoc: res.exists && res.data ? res.data : { version: 0, updatedAt: new Date(0).toISOString(), collections: {} },
  };
  versionRamCache = entry;
  return entry;
}

async function fetchCatalogDataFromFirestore(key: CatalogKey, cv: string): Promise<DataRamEntry | null> {
  const cacheKey = `${key}:${cv || 'latest'}`;

  if (key === 'products' || key === 'categories' || key === 'agriIssues' || key === 'helplines') {
    const res = await listRemoteFirestoreCollection(key);
    if (!res.ok) return null;
    let items = res.items;
    if (key === 'categories') {
      items = items.slice().sort((a: any, b: any) => (Number(a.order) || 9999) - (Number(b.order) || 9999));
    }
    const entry: DataRamEntry = {
      fetchedAt: Date.now(),
      cv,
      exists: true,
      data: items,
    };
    dataRamCache.set(cacheKey, entry);
    return entry;
  }

  if (key === 'playlists') {
    const [playlistsRes, playlistVideosRes] = await Promise.all([
      listRemoteFirestoreCollection('playlists'),
      listRemoteFirestoreCollection('playlist_videos'),
    ]);
    if (!playlistsRes.ok || !playlistVideosRes.ok) return null;

    const playlists = playlistsRes.items
      .slice()
      .sort((a: any, b: any) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));
    const playlistVideos = playlistVideosRes.items
      .slice()
      .sort((a: any, b: any) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));

    const entry: DataRamEntry = {
      fetchedAt: Date.now(),
      cv,
      exists: true,
      data: { playlists, playlistVideos },
    };
    dataRamCache.set(cacheKey, entry);
    return entry;
  }

  // Whitelisted settings documents (strictly public store settings only; never smtp_config or razorpay_config)
  const docRes = await getRemoteFirestoreDocStatus<Record<string, any>>('settings', key);
  if (!docRes.ok) return null;

  const entry: DataRamEntry = {
    fetchedAt: Date.now(),
    cv,
    exists: docRes.exists,
    data: docRes.exists ? docRes.data : null,
  };
  dataRamCache.set(cacheKey, entry);
  return entry;
}

/**
 * GET /api/catalog/version
 * Serves lightweight metadata_version via Vercel Edge CDN (2-min cache).
 * Supports 10 Lakh+ farmers with <= ~720 Firestore reads/day total and 0 client onSnapshot connections!
 */
export async function handleGetCatalogVersion(_req: Request, res: Response): Promise<void> {
  try {
    const now = Date.now();
    if (versionRamCache && now - versionRamCache.fetchedAt < VERSION_RAM_TTL_MS) {
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      res.json({
        success: true,
        exists: versionRamCache.exists,
        version: versionRamCache.versionDoc,
        source: 'server_ram_cache',
      });
      return;
    }

    if (!inFlightVersionPromise) {
      inFlightVersionPromise = fetchVersionFromFirestore().finally(() => {
        inFlightVersionPromise = null;
      });
    }

    const fetched = await inFlightVersionPromise;
    if (!fetched) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json({
        success: false,
        error: 'Catalog version temporarily unavailable from upstream store.',
      });
      return;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    res.json({
      success: true,
      exists: fetched.exists,
      version: fetched.versionDoc,
      source: 'vercel_cdn_firestore_hub',
    });
  } catch (err: any) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({
      success: false,
      error: err?.message || 'Internal version hub error',
    });
  }
}

/**
 * GET /api/catalog/data?key=<CatalogKey>&cv=<timestamp>
 * Serves an individual public catalog collection/setting via Vercel Edge CDN (6-hour cache).
 * Every farmer requesting the same (key, cv) hits Vercel Mumbai CDN with 0 Firestore reads!
 */
export async function handleGetCatalogData(req: Request, res: Response): Promise<void> {
  try {
    const rawKey = String(req.query.key || '').trim() as CatalogKey;
    const cv = String(req.query.cv || 'latest').trim().slice(0, 64);

    if (!ALLOWED_CATALOG_KEYS.has(rawKey)) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(400).json({
        success: false,
        error: 'Invalid or restricted catalog key.',
      });
      return;
    }

    const cacheKey = `${rawKey}:${cv || 'latest'}`;
    const now = Date.now();
    const cached = dataRamCache.get(cacheKey);
    if (cached && now - cached.fetchedAt < DATA_RAM_TTL_MS) {
      res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200');
      res.json({
        success: true,
        key: rawKey,
        exists: cached.exists,
        data: cached.data,
        source: 'server_ram_cache',
      });
      return;
    }

    let pending = inFlightDataPromises.get(cacheKey);
    if (!pending) {
      pending = fetchCatalogDataFromFirestore(rawKey, cv).finally(() => {
        inFlightDataPromises.delete(cacheKey);
      });
      inFlightDataPromises.set(cacheKey, pending);
    }

    const fetched = await pending;
    if (!fetched) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json({
        success: false,
        key: rawKey,
        error: 'Catalog data temporarily unavailable from upstream store.',
      });
      return;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200');
    res.json({
      success: true,
      key: rawKey,
      exists: fetched.exists,
      data: fetched.data,
      source: 'vercel_cdn_firestore_hub',
    });
  } catch (err: any) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({
      success: false,
      error: err?.message || 'Internal catalog hub error',
    });
  }
}
