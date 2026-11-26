import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { getRemoteFirestoreDoc, verifyAdminFirebaseToken } from './firestoreSync.js';

export type MandiSourceType = 'govt' | 'mandipulse' | 'market_report' | 'estimated' | 'unavailable';

export interface ServerMandiItem {
  commodity: string;
  minPrice: string;
  maxPrice: string;
  avgPrice: string;
  unit: string;
  arrival?: string;
  quality?: string;
  lastUpdated: string;
}

export interface ServerMandiDetails {
  mandiName: string;
  district: string;
  state: string;
  date: string;
  items: ServerMandiItem[];
  sourceType: MandiSourceType;
  sourceName: string;
  sourceDate: string;
  fetchedAt: string;
  isLive: boolean;
  isEstimated?: boolean;
  statusMessage?: string;
}

export interface GovtMandiConfig {
  enabled: boolean;
  apiKey: string;
  defaultLimit: number;
  syncStateFilter: string;
  lastSyncAt?: number;
  lastSyncStatus?: 'success' | 'blocked' | 'error' | 'never';
  lastSyncSource?: 'server_ogd' | 'browser_sync' | 'json_import' | 'firestore_restore';
  lastSyncMessage?: string;
  lastSyncRecordsCount?: number;
  updatedAt: number;
}

export interface CachedGovtMarketEntry {
  state: string;
  district: string;
  market: string;
  stateNorm: string;
  distNorm: string;
  marketNorm: string;
  sourceDate: string;
  dateScore: number;
  items: ServerMandiItem[];
}

export interface GovtMandiCacheStore {
  version: number;
  updatedAt: number;
  syncSource: string;
  totalRawRecords: number;
  markets: Record<string, CachedGovtMarketEntry>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const GOVT_CONFIG_FILE = path.join(DATA_DIR, 'mandi-govt-config.json');
const GOVT_CONFIG_TMP_FILE = '/tmp/falsawdiya-mandi-govt-config.json';
const GOVT_CACHE_FILE = path.join(DATA_DIR, 'mandi-govt-cache.json');
const GOVT_CACHE_TMP_FILE = '/tmp/falsawdiya-mandi-govt-cache.json';

const OGD_RESOURCE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const FIRESTORE_DOC_BYTE_BUDGET = 760 * 1024; // Safe margin well below Firestore's 1 MB limit
const GOVT_CACHE_FRESH_MS = 48 * 60 * 60 * 1000; // 48 hours for shared govt cache before preferring live fallback
const FIRESTORE_CACHE_POLL_MS = 15 * 60 * 1000; // Refresh from Firestore _metadata/mandi_govt_cache at most once every 15 mins on cold server

let govtConfig: GovtMandiConfig = {
  enabled: true,
  apiKey: '',
  defaultLimit: 1000,
  syncStateFilter: 'Madhya Pradesh',
  lastSyncStatus: 'never',
  updatedAt: Date.now(),
};

let govtCacheStore: GovtMandiCacheStore = {
  version: 1,
  updatedAt: 0,
  syncSource: 'none',
  totalRawRecords: 0,
  markets: {},
};

let lastFirestoreCacheCheckAt = 0;

// In-memory cache for final mandi responses (30 min TTL)
interface CacheEntry {
  data: ServerMandiDetails;
  timestamp: number;
}
const mandiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Serverless read-only fallback handled by /tmp paths
  }
}

function loadGovtConfigFromDisk(): void {
  try {
    const fileToRead = fs.existsSync(GOVT_CONFIG_FILE)
      ? GOVT_CONFIG_FILE
      : fs.existsSync(GOVT_CONFIG_TMP_FILE)
      ? GOVT_CONFIG_TMP_FILE
      : null;
    if (!fileToRead) return;
    const raw = fs.readFileSync(fileToRead, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      govtConfig = {
        ...govtConfig,
        ...parsed,
        defaultLimit: Math.min(10000, Math.max(1, Number(parsed.defaultLimit) || 1000)),
      };
    }
  } catch (err) {
    console.warn('[Mandi Govt Config] Failed loading local config:', err);
  }
}

function saveGovtConfigToDisk(updates: Partial<GovtMandiConfig>): void {
  govtConfig = {
    ...govtConfig,
    ...updates,
    defaultLimit: Math.min(10000, Math.max(1, Number(updates.defaultLimit ?? govtConfig.defaultLimit) || 1000)),
    updatedAt: Date.now(),
  };
  ensureDataDir();
  const payload = JSON.stringify(govtConfig, null, 2);
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(GOVT_CONFIG_FILE, payload, 'utf-8');
      return;
    }
  } catch {
    // Fall through to /tmp
  }
  try {
    fs.writeFileSync(GOVT_CONFIG_TMP_FILE, payload, 'utf-8');
  } catch (err) {
    console.warn('[Mandi Govt Config] Failed writing config:', err);
  }
}

function loadGovtCacheFromDisk(): void {
  try {
    const fileToRead = fs.existsSync(GOVT_CACHE_FILE)
      ? GOVT_CACHE_FILE
      : fs.existsSync(GOVT_CACHE_TMP_FILE)
      ? GOVT_CACHE_TMP_FILE
      : null;
    if (!fileToRead) return;
    const raw = fs.readFileSync(fileToRead, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.markets && typeof parsed.markets === 'object') {
      govtCacheStore = {
        version: Number(parsed.version) || 1,
        updatedAt: Number(parsed.updatedAt) || 0,
        syncSource: String(parsed.syncSource || 'disk'),
        totalRawRecords: Number(parsed.totalRawRecords) || 0,
        markets: parsed.markets,
      };
    }
  } catch (err) {
    console.warn('[Mandi Govt Cache] Failed loading disk cache:', err);
  }
}

function saveGovtCacheToDisk(store: GovtMandiCacheStore): void {
  govtCacheStore = store;
  ensureDataDir();
  const payload = JSON.stringify(store);
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(GOVT_CACHE_FILE, payload, 'utf-8');
      return;
    }
  } catch {
    // Fall through to /tmp
  }
  try {
    fs.writeFileSync(GOVT_CACHE_TMP_FILE, payload, 'utf-8');
  } catch (err) {
    console.warn('[Mandi Govt Cache] Failed saving cache:', err);
  }
}

// Initialize at module load
loadGovtConfigFromDisk();
loadGovtCacheFromDisk();

function getActiveGovtApiKey(): { key: string; source: 'env' | 'admin' | 'none' } {
  const envKey = (process.env.DATA_GOV_IN_API_KEY || '').trim();
  if (envKey) return { key: envKey, source: 'env' };
  const adminKey = (govtConfig.apiKey || '').trim();
  if (adminKey) return { key: adminKey, source: 'admin' };
  return { key: '', source: 'none' };
}

function maskApiKey(key: string): string {
  const k = (key || '').trim();
  if (!k) return '';
  if (k.length <= 10) return `${k.slice(0, 2)}••••${k.slice(-2)}`;
  return `${k.slice(0, 6)}••••••••${k.slice(-4)}`;
}

// Comprehensive Commodity Mapping (multi-word keys checked first via sorted list)
const COMMODITY_MAP: Record<string, string> = {
  'bengal gram (gram)(whole)': 'चना (साबुत)',
  'bengal gram(gram)(whole)': 'चना (साबुत)',
  'bengal gram': 'चना (साबुत)',
  'kabuli chana': 'काबुली चना',
  'gram dal': 'चना दाल',
  'black gram (urd beans)(whole)': 'उड़द (साबुत)',
  'black gram(urd beans)(whole)': 'उड़द (साबुत)',
  'black gram': 'उड़द',
  'green gram (moong)(whole)': 'मूंग (साबुत)',
  'green gram(moong)(whole)': 'मूंग (साबुत)',
  'green gram': 'मूंग',
  'arhar (tur/red gram)(whole)': 'तुअर (अरहर)',
  'red gram': 'तुअर (अरहर)',
  'pigeon pea': 'तुअर (अरहर)',
  'lentil (masur)(whole)': 'मसूर',
  'paddy(dhan)(common)': 'धान (सामान्य)',
  'paddy(dhan)(basmati)': 'धान (बासमती)',
  'sweet lime': 'मौसंबी',
  'bottle gourd': 'लौकी',
  'bitter gourd': 'करेला',
  'ridge gourd': 'तोरई',
  'sponge gourd': 'गिलकी',
  'green chilli': 'हरी मिर्च',
  'red chilli': 'लाल मिर्च',
  'dry chillies': 'सूखी मिर्च',
  'coriander(leaves)': 'हरा धनिया',
  'coriander seed': 'धनिया (साबुत)',
  'mustard oil': 'सरसों तेल',
  'soyabean': 'सोयाबीन',
  'soybean': 'सोयाबीन',
  'wheat': 'गेहूँ',
  'mustard': 'सरसों',
  'sarson': 'सरसों',
  'maize': 'मक्का',
  'makka': 'मक्का',
  'cotton': 'कपास',
  'kapas': 'कपास',
  'urad': 'उड़द',
  'moong': 'मूंग',
  'onion': 'प्याज़',
  'pyaz': 'प्याज़',
  'garlic': 'लहसुन',
  'lahsun': 'लहसुन',
  'tomato': 'टमाटर',
  'potato': 'आलू',
  'chilli': 'मिर्च',
  'coriander': 'धनिया',
  'dhaniya': 'धनिया',
  'fenugreek': 'मेथी',
  'methi': 'मेथी',
  'lentil': 'मसूर',
  'masoor': 'मसूर',
  'masur': 'मसूर',
  'peanut': 'मूंगफली',
  'groundnut': 'मूंगफली',
  'arhar': 'तुअर',
  'tur': 'तुअर',
  'gram': 'चना',
  'chana': 'चना',
  'barley': 'जौ',
  'jau': 'जौ',
  'jowar': 'ज्वार',
  'sorghum': 'ज्वार',
  'bajra': 'बाजरा',
  'pearl millet': 'बाजरा',
  'cucumber': 'खीरा',
  'cabbage': 'पत्ता गोभी',
  'cauliflower': 'फूल गोभी',
  'brinjal': 'बैंगन',
  'bhindi': 'भिंडी',
  'ladies finger': 'भिंडी',
  'okra': 'भिंडी',
  'lemon': 'नींबू',
  'lime': 'नींबू',
  'capsicum': 'शिमला मिर्च',
  'sapota': 'चीकू',
  'chiku': 'चीकू',
  'paddy': 'धान',
  'rice': 'चावल',
  'sesamum': 'तिल',
  'sesame': 'तिल',
  'linseed': 'अलसी',
  'castor seed': 'अरंडी',
  'cumin': 'जीरा',
  'jeera': 'जीरा',
  'ajwain': 'अजवाइन',
  'isabgol': 'ईसबगोल',
  'psyllium': 'ईसबगोल',
  'peas': 'मटर',
  'green peas': 'हरा मटर',
  'pomegranate': 'अनार',
  'orange': 'संतरा',
  'banana': 'केला',
  'mango': 'आम',
  'apple': 'सेब',
  'ginger': 'अदरक',
  'turmeric': 'हल्दी',
  'gujarat': 'गुजरात',
  'taramira': 'तारामीरा',
  'guar': 'ग्वार',
  'cluster beans': 'ग्वार फली',
};

const SORTED_COMMODITY_ENTRIES = Object.entries(COMMODITY_MAP).sort(
  ([a], [b]) => b.length - a.length
);

function normalizeCommodityName(name: string): string {
  const lower = String(name || '').toLowerCase().trim();
  if (!lower) return '';
  for (const [key, val] of SORTED_COMMODITY_ENTRIES) {
    if (lower.includes(key)) return val;
  }
  return String(name).trim();
}

const VARIETY_MAP: Record<string, string> = {
  'lokwan': 'लोकवन',
  'sharbati': 'शरबती',
  'desi': 'देसी',
  'deshi': 'देसी',
  'yellow': 'पीला',
  'white': 'सफेद',
  'red': 'लाल',
  'bold': 'बोल्ड',
  'average': 'औसत',
  'medium': 'मध्यम',
  'hybrid': 'हाइब्रिड',
  'super': 'सुपर',
  'faq': 'FAQ (मानक)',
  '147': '147 किस्म',
  'other': '',
};

function cleanVarietyLabel(rawVariety: string | undefined | null): string {
  const raw = String(rawVariety || '').trim();
  if (!raw || raw.toLowerCase() === 'other' || raw === '-' || raw.toLowerCase() === 'n/a') {
    return '';
  }
  const lower = raw.toLowerCase();
  for (const [k, v] of Object.entries(VARIETY_MAP)) {
    if (lower === k) return v;
  }
  return raw;
}

// Location cleaning & alias helpers
const LOCATION_ALIASES: Record<string, string[]> = {
  'chhattisgarh': ['chattisgarh'],
  'chattisgarh': ['chhattisgarh'],
  'odisha': ['orissa'],
  'orissa': ['odisha'],
  'bengaluru': ['bangalore'],
  'bangalore': ['bengaluru'],
  'belgaum': ['belgavi', 'belagavi'],
  'belgavi': ['belgaum', 'belagavi'],
  'belagavi': ['belgaum', 'belgavi'],
  'narmadapuram': ['hoshangabad'],
  'hoshangabad': ['narmadapuram'],
  'delhincr': ['delhi', 'nctofdelhi'],
  'newdelhi': ['delhi', 'nctofdelhi'],
  'delhi': ['nctofdelhi', 'newdelhi'],
  'mysore': ['mysuru'],
  'mysuru': ['mysore'],
  'shivamogga': ['shimoga'],
  'shimoga': ['shivamogga'],
  'pipliya': ['pipaliya', 'pipliamandi'],
  'shamgarh': ['samgarh'],
  'lasalgaon': ['lasalgoan'],
  'ahmednagar': ['ahilyanagar'],
};

export function normalizeWord(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0919\u091e\u0923\u0928\u092e]\u094d/g, '\u0902')
    .replace(/\(.*?\)/g, ' ')
    .replace(/apmc|mandi|f&amp;v|f&v|उपमंडी|मंडी|एपीएमसी|कृषि उपज मंडी|कृषि मंडी/gi, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNoSpace(s: string): string {
  return normalizeWord(s).replace(/\s+/g, '');
}

export function extractEnHi(full: string): { en: string; hi: string; enNoSpace: string; hiNoSpace: string } {
  const match = full.match(/\(([^)]+)\)/);
  const en = match ? match[1].trim() : full.trim();
  const hi = full.split('(')[0].trim();
  return {
    en: normalizeWord(en),
    hi: normalizeWord(hi),
    enNoSpace: normalizeNoSpace(en),
    hiNoSpace: normalizeNoSpace(hi),
  };
}

export function checkLocationMatch(
  candidate: string | undefined | null,
  targetFull: string,
  type: 'state' | 'district' | 'mandi'
): { match: boolean; reason?: string } {
  if (!candidate || !candidate.trim()) {
    return { match: false, reason: `Candidate ${type} is empty` };
  }
  const candNorm = normalizeWord(candidate);
  const candNoSpace = normalizeNoSpace(candidate);
  const target = extractEnHi(targetFull);

  const targetKeysNoSpace = [target.enNoSpace, target.hiNoSpace];
  for (const key of [target.enNoSpace, target.hiNoSpace]) {
    if (LOCATION_ALIASES[key]) {
      targetKeysNoSpace.push(...LOCATION_ALIASES[key]);
    }
  }

  if (
    candNorm === target.en ||
    candNorm === target.hi ||
    targetKeysNoSpace.includes(candNoSpace)
  ) {
    return { match: true };
  }

  // Word-level inclusion check
  const candWords = candNorm.split(' ').filter((w) => w.length >= 3);
  const targetEnWords = target.en.split(' ').filter((w) => w.length >= 3);
  const targetHiWords = target.hi.split(' ').filter((w) => w.length >= 3);
  const allTargetWords = [...targetEnWords, ...targetHiWords];

  for (const tw of allTargetWords) {
    if (candWords.includes(tw)) return { match: true };
    if (tw.length >= 4 && (candNorm.includes(tw) || tw.includes(candNorm))) {
      return { match: true };
    }
    const twNoSpace = normalizeNoSpace(tw);
    if (tw.length >= 4 && (candNoSpace.includes(twNoSpace) || twNoSpace.includes(candNoSpace))) {
      return { match: true };
    }
  }

  return {
    match: false,
    reason: `${type.toUpperCase()} Mismatch: candidate "${candidate}" != target "${targetFull}"`,
  };
}

function cleanLocation(val: string): { hindi: string; english: string } {
  if (!val) return { hindi: '', english: '' };
  const parts = val.split(' (');
  const hindi = parts[0].trim();
  const english = parts[1] ? parts[1].replace(')', '').trim() : hindi;
  return { hindi, english };
}

const SERVER_HINDI_MONTHS = [
  'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
];

function formatIndianDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const dd = parts.find((p) => p.type === 'day')?.value || String(date.getDate()).padStart(2, '0');
  const mmIdx = parseInt(parts.find((p) => p.type === 'month')?.value || String(date.getMonth() + 1), 10) - 1;
  const yyyy = parts.find((p) => p.type === 'year')?.value || String(date.getFullYear());
  return `${dd} ${SERVER_HINDI_MONTHS[mmIdx] || ''} ${yyyy}`.trim();
}

function formatIndianTime(date: Date = new Date()): string {
  const datePart = formatIndianDate(date);
  const timePart = date
    .toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
  return `${datePart}, ${timePart}`;
}

function parseAgmarknetDate(rawDate: string | undefined | null): { hindiDate: string; dateScore: number } {
  const raw = String(rawDate || '').trim();
  if (!raw) {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const d = today.getDate();
    return {
      hindiDate: formatIndianDate(today),
      dateScore: y * 10000 + m * 100 + d,
    };
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    const year = parseInt(dmy[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        hindiDate: `${String(day).padStart(2, '0')} ${SERVER_HINDI_MONTHS[month - 1]} ${year}`,
        dateScore: year * 10000 + month * 100 + day,
      };
    }
  }

  // YYYY-MM-DD
  const ymd = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10);
    const day = parseInt(ymd[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        hindiDate: `${String(day).padStart(2, '0')} ${SERVER_HINDI_MONTHS[month - 1]} ${year}`,
        dateScore: year * 10000 + month * 100 + day,
      };
    }
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    return {
      hindiDate: formatIndianDate(parsed),
      dateScore: y * 10000 + m * 100 + d,
    };
  }

  return { hindiDate: raw, dateScore: 0 };
}

/**
 * Aggregates & cleans raw AGMARKNET records into MandiPulse-quality per-market items.
 * Multiple varieties of the same commodity on the latest date are cleanly merged
 * with accurate Min / Max / Modal price spread and human-readable Hindi labels.
 */
function normalizeRawOgdRecordsToMarkets(rawRecords: any[]): Record<string, CachedGovtMarketEntry> {
  interface CropAccumulator {
    commodity: string;
    dateScore: number;
    hindiDate: string;
    mins: number[];
    maxs: number[];
    modals: number[];
    varieties: Set<string>;
    arrivalTotal: number;
  }

  interface MarketBucket {
    state: string;
    district: string;
    market: string;
    stateNorm: string;
    distNorm: string;
    marketNorm: string;
    crops: Map<string, CropAccumulator>;
  }

  const buckets = new Map<string, MarketBucket>();

  for (const r of rawRecords) {
    if (!r || typeof r !== 'object') continue;
    const state = String(r.state || r.State || '').trim();
    const district = String(r.district || r.District || '').trim();
    const market = String(r.market || r.Market || '').trim();
    const rawComm = String(r.commodity || r.Commodity || '').trim();
    if (!state || !district || !market || !rawComm) continue;

    const min = Math.round(Number(r.min_price ?? r.Min_Price ?? r.minPrice ?? 0) || 0);
    const max = Math.round(Number(r.max_price ?? r.Max_Price ?? r.maxPrice ?? 0) || 0);
    const modalRaw = Math.round(Number(r.modal_price ?? r.Modal_Price ?? r.avgPrice ?? 0) || 0);
    const modal = modalRaw || (min > 0 && max > 0 ? Math.round((min + max) / 2) : max || min);
    if (modal <= 0 && min <= 0 && max <= 0) continue;

    const stateNorm = normalizeNoSpace(state);
    const distNorm = normalizeNoSpace(district);
    const marketNorm = normalizeNoSpace(market);
    const bucketKey = `${stateNorm}|${distNorm}|${marketNorm}`;

    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        state,
        district,
        market,
        stateNorm,
        distNorm,
        marketNorm,
        crops: new Map(),
      };
      buckets.set(bucketKey, bucket);
    }

    const hindiComm = normalizeCommodityName(rawComm);
    if (!hindiComm) continue;

    const { hindiDate, dateScore } = parseAgmarknetDate(r.arrival_date || r.Arrival_Date || r.lastUpdated);
    const existing = bucket.crops.get(hindiComm);

    // If a newer date row arrives for the same crop, prefer the latest date
    if (existing && dateScore > 0 && existing.dateScore > 0 && dateScore < existing.dateScore) {
      continue;
    }

    const acc: CropAccumulator =
      !existing || (dateScore > existing.dateScore && dateScore > 0)
        ? {
            commodity: hindiComm,
            dateScore,
            hindiDate,
            mins: [],
            maxs: [],
            modals: [],
            varieties: new Set<string>(),
            arrivalTotal: 0,
          }
        : existing;

    if (min > 0) acc.mins.push(min);
    if (max > 0) acc.maxs.push(max);
    if (modal > 0) acc.modals.push(modal);

    const cleanedVar = cleanVarietyLabel(r.variety || r.Variety || r.quality);
    if (cleanedVar) acc.varieties.add(cleanedVar);

    const arrQty = Number(r.arrivals_in_qtl ?? r.arrivals ?? r.Arrivals ?? 0);
    if (Number.isFinite(arrQty) && arrQty > 0) {
      acc.arrivalTotal += arrQty;
    }

    bucket.crops.set(hindiComm, acc);
  }

  const marketsOut: Record<string, CachedGovtMarketEntry> = {};

  for (const [key, bucket] of buckets.entries()) {
    let bestDateScore = 0;
    let bestSourceDate = formatIndianDate();
    const items: ServerMandiItem[] = [];

    for (const acc of bucket.crops.values()) {
      const avgModal =
        acc.modals.length > 0
          ? Math.round(acc.modals.reduce((s, v) => s + v, 0) / acc.modals.length)
          : Math.round(((acc.mins[0] || 0) + (acc.maxs[0] || 0)) / 2);

      const finalMin = acc.mins.length > 0 ? Math.min(...acc.mins) : avgModal;
      const finalMax = acc.maxs.length > 0 ? Math.max(...acc.maxs) : avgModal;
      const clampedModal = Math.min(finalMax || avgModal, Math.max(finalMin || avgModal, avgModal));

      if (acc.dateScore > bestDateScore) {
        bestDateScore = acc.dateScore;
        bestSourceDate = acc.hindiDate;
      }

      const varietyList = Array.from(acc.varieties).slice(0, 3);
      items.push({
        commodity: acc.commodity,
        minPrice: String(finalMin || clampedModal),
        maxPrice: String(finalMax || clampedModal),
        avgPrice: String(clampedModal),
        unit: 'क्विंटल',
        arrival: acc.arrivalTotal > 0 ? `${Math.round(acc.arrivalTotal)} क्विंटल` : 'नियमित मंडी आवक',
        quality: varietyList.length > 0 ? varietyList.join(', ') : 'मानक गुणवत्ता (FAQ)',
        lastUpdated: acc.hindiDate,
      });
    }

    if (items.length > 0) {
      items.sort((a, b) => a.commodity.localeCompare(b.commodity, 'hi'));
      marketsOut[key] = {
        state: bucket.state,
        district: bucket.district,
        market: bucket.market,
        stateNorm: bucket.stateNorm,
        distNorm: bucket.distNorm,
        marketNorm: bucket.marketNorm,
        sourceDate: bestSourceDate,
        dateScore: bestDateScore,
        items,
      };
    }
  }

  return marketsOut;
}

function mergeMarketCaches(
  existingMarkets: Record<string, CachedGovtMarketEntry>,
  incomingMarkets: Record<string, CachedGovtMarketEntry>
): Record<string, CachedGovtMarketEntry> {
  const merged: Record<string, CachedGovtMarketEntry> = { ...existingMarkets };

  for (const [key, inc] of Object.entries(incomingMarkets)) {
    const prev = merged[key];
    if (!prev || inc.dateScore >= prev.dateScore) {
      merged[key] = inc;
    }
  }

  return merged;
}

/**
 * Builds a Firestore-safe compact document (< 760 KB) for `_metadata/mandi_govt_cache`.
 * Prioritizes Madhya Pradesh and neighbouring key states + latest arrival dates.
 */
function buildCompactFirestoreCacheDoc(store: GovtMandiCacheStore): {
  version: number;
  updatedAt: number;
  syncSource: string;
  totalMarkets: number;
  totalItems: number;
  markets: Record<string, CachedGovtMarketEntry>;
} {
  const entries = Object.entries(store.markets || {});
  const priorityScore = (e: CachedGovtMarketEntry): number => {
    const s = e.stateNorm;
    let stateRank = 1;
    if (s.includes('madhyapradesh')) stateRank = 5;
    else if (s.includes('rajasthan') || s.includes('maharashtra') || s.includes('uttarpradesh') || s.includes('gujarat')) stateRank = 4;
    else if (s.includes('haryana') || s.includes('punjab') || s.includes('chhattisgarh') || s.includes('chattisgarh')) stateRank = 3;
    return stateRank * 100000000 + (e.dateScore || 0);
  };

  entries.sort(([, a], [, b]) => priorityScore(b) - priorityScore(a));

  const compactMarkets: Record<string, CachedGovtMarketEntry> = {};
  let totalItems = 0;

  // Incremental byte size estimation so we never cross Firestore's 1 MB document cap
  let runningBytes = 350;
  for (const [k, entry] of entries) {
    const entrySize = Buffer.byteLength(JSON.stringify(entry), 'utf8') + k.length + 6;
    if (runningBytes + entrySize > FIRESTORE_DOC_BYTE_BUDGET) {
      break;
    }
    compactMarkets[k] = entry;
    totalItems += entry.items.length;
    runningBytes += entrySize;
  }

  return {
    version: store.version || 1,
    updatedAt: store.updatedAt || Date.now(),
    syncSource: store.syncSource || 'admin_sync',
    totalMarkets: Object.keys(compactMarkets).length,
    totalItems,
    markets: compactMarkets,
  };
}

async function ensureFirestoreCacheLoaded(): Promise<void> {
  const now = Date.now();
  const hasAny = Object.keys(govtCacheStore.markets || {}).length > 0;
  const isFresh = hasAny && now - (govtCacheStore.updatedAt || 0) < GOVT_CACHE_FRESH_MS;
  if (isFresh && now - lastFirestoreCacheCheckAt < FIRESTORE_CACHE_POLL_MS) {
    return;
  }
  if (now - lastFirestoreCacheCheckAt < FIRESTORE_CACHE_POLL_MS) {
    return;
  }
  lastFirestoreCacheCheckAt = now;

  try {
    const remote = await getRemoteFirestoreDoc<any>('_metadata', 'mandi_govt_cache');
    if (remote && remote.markets && typeof remote.markets === 'object') {
      const remoteUpdatedAt = Number(remote.updatedAt) || 0;
      if (remoteUpdatedAt > (govtCacheStore.updatedAt || 0) || !hasAny) {
        const merged = mergeMarketCaches(govtCacheStore.markets || {}, remote.markets);
        saveGovtCacheToDisk({
          version: Number(remote.version) || 1,
          updatedAt: remoteUpdatedAt || now,
          syncSource: String(remote.syncSource || 'firestore_shared'),
          totalRawRecords: Number(remote.totalItems) || 0,
          markets: merged,
        });
        console.log(`[Mandi Shared Cache] Loaded ${Object.keys(merged).length} govt markets from Firestore _metadata/mandi_govt_cache`);
      }
    }
  } catch (err) {
    console.warn('[Mandi Shared Cache] Could not poll Firestore cache:', err);
  }
}

async function lookupSharedGovtCache(
  rawState: string,
  rawDistrict: string,
  rawMandi: string
): Promise<{ items: ServerMandiItem[]; sourceDate: string; marketLabel: string } | null> {
  await ensureFirestoreCacheLoaded();

  const markets = govtCacheStore.markets || {};
  const entries = Object.values(markets);
  if (entries.length === 0) return null;

  // Reject stale shared cache older than 72 hours unless nothing else works; prefer 48h window
  if (govtCacheStore.updatedAt && Date.now() - govtCacheStore.updatedAt > 72 * 60 * 60 * 1000) {
    return null;
  }

  let bestMatch: CachedGovtMarketEntry | null = null;
  for (const entry of entries) {
    const stateOk = checkLocationMatch(entry.state, rawState, 'state').match;
    const distOk = checkLocationMatch(entry.district, rawDistrict, 'district').match;
    const mandiOk = checkLocationMatch(entry.market, rawMandi, 'mandi').match;
    if (stateOk && distOk && mandiOk) {
      if (!bestMatch || entry.dateScore > bestMatch.dateScore) {
        bestMatch = entry;
      }
    }
  }

  if (bestMatch && bestMatch.items.length > 0) {
    return {
      items: bestMatch.items,
      sourceDate: bestMatch.sourceDate || formatIndianDate(),
      marketLabel: bestMatch.market,
    };
  }
  return null;
}

// Helper to query OGD AGMARKNET API with pagination & smart fallbacks
async function fetchOgdRecords(params: {
  apiKey: string;
  limit?: number;
  offset?: number;
  stateFilter?: string;
  districtFilter?: string;
  marketFilter?: string;
  timeoutMs?: number;
}): Promise<{ records: any[]; total?: number; httpStatus: number }> {
  const url = new URL(OGD_RESOURCE_URL);
  url.searchParams.set('api-key', params.apiKey.trim());
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(params.limit || 500));
  if (params.offset && params.offset > 0) {
    url.searchParams.set('offset', String(params.offset));
  }
  if (params.stateFilter && params.stateFilter !== 'ALL') {
    url.searchParams.set('filters[state]', params.stateFilter);
  }
  if (params.districtFilter) {
    url.searchParams.set('filters[district]', params.districtFilter);
  }
  if (params.marketFilter) {
    url.searchParams.set('filters[market]', params.marketFilter);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs || 8000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FalsawdiyaKrishiBazaar/2.0',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { records: [], httpStatus: res.status };
    }

    const json: any = await res.json();
    const records = Array.isArray(json?.records) ? json.records : Array.isArray(json?.data) ? json.data : [];
    return { records, total: Number(json?.total) || records.length, httpStatus: res.status };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// 1. Query Official Government OGD (data.gov.in / AGMARKNET dataset)
// Strict rule: Record MUST match selected state, district, AND mandi
async function fetchFromGovtOgd(
  rawState: string,
  rawDistrict: string,
  rawMandi: string
): Promise<{ items: ServerMandiItem[]; sourceDate: string } | null> {
  if (!govtConfig.enabled) return null;
  const { key: apiKey } = getActiveGovtApiKey();
  if (!apiKey) {
    return null;
  }

  const { english: stateEnglish } = cleanLocation(rawState);
  const { english: districtEnglish } = cleanLocation(rawDistrict);
  const { english: mandiEnglish } = cleanLocation(rawMandi);
  const queryLimit = Math.min(10000, Math.max(1, govtConfig.defaultLimit || 500));

  try {
    let allRawRecords: any[] = [];

    // Primary attempt: Query State + District with higher limit (500-1000)
    const primaryRes = await fetchOgdRecords({
      apiKey,
      limit: queryLimit,
      stateFilter: stateEnglish,
      districtFilter: districtEnglish,
      timeoutMs: 7000,
    });

    if (primaryRes.records.length > 0) {
      allRawRecords = primaryRes.records;
    } else if (stateEnglish === 'Delhi / NCR' || stateEnglish === 'Chhattisgarh') {
      // Alias state retry if primary returned empty
      const aliasState = stateEnglish === 'Chhattisgarh' ? 'Chattisgarh' : 'NCT of Delhi';
      const aliasRes = await fetchOgdRecords({
        apiKey,
        limit: queryLimit,
        stateFilter: aliasState,
        districtFilter: districtEnglish,
        timeoutMs: 6000,
      }).catch(() => ({ records: [], httpStatus: 0 }));
      allRawRecords = aliasRes.records;
    }

    // Parse & normalize all retrieved market entries
    let normalizedMarkets = normalizeRawOgdRecordsToMarkets(allRawRecords);

    // Check if the exact requested mandi is in normalizedMarkets
    const findMatch = (markets: Record<string, CachedGovtMarketEntry>) => {
      for (const entry of Object.values(markets)) {
        const sOk = checkLocationMatch(entry.state, rawState, 'state').match;
        const dOk = checkLocationMatch(entry.district, rawDistrict, 'district').match;
        const mOk = checkLocationMatch(entry.market, rawMandi, 'mandi').match;
        if (sOk && dOk && mOk && entry.items.length > 0) {
          return entry;
        }
      }
      return null;
    };

    let matchedEntry = findMatch(normalizedMarkets);

    // Fallback targeted market query if district had > queryLimit rows or district spelling differed
    if (!matchedEntry && mandiEnglish) {
      const mktRes = await fetchOgdRecords({
        apiKey,
        limit: 200,
        stateFilter: stateEnglish,
        marketFilter: mandiEnglish,
        timeoutMs: 6000,
      }).catch(() => ({ records: [], httpStatus: 0 }));

      if (mktRes.records.length > 0) {
        const mktNormalized = normalizeRawOgdRecordsToMarkets(mktRes.records);
        normalizedMarkets = mergeMarketCaches(normalizedMarkets, mktNormalized);
        matchedEntry = findMatch(normalizedMarkets);
      }
    }

    // Silently cache any valid Govt markets discovered from this live OGD call
    if (Object.keys(normalizedMarkets).length > 0) {
      const updatedMarkets = mergeMarketCaches(govtCacheStore.markets || {}, normalizedMarkets);
      saveGovtCacheToDisk({
        version: (govtCacheStore.version || 1) + 1,
        updatedAt: Date.now(),
        syncSource: 'live_ogd',
        totalRawRecords: Object.values(updatedMarkets).reduce((s, m) => s + m.items.length, 0),
        markets: updatedMarkets,
      });
    }

    if (matchedEntry) {
      return {
        items: matchedEntry.items,
        sourceDate: matchedEntry.sourceDate || formatIndianDate(),
      };
    }
    return null;
  } catch (err) {
    console.warn('[OGD Govt API] Error fetching:', (err as any)?.message || err);
    return null;
  }
}

// Helper to derive state slug for mandipulse.com
function getStateSlug(stateEnglish: string): string {
  const s = stateEnglish.toLowerCase().trim();
  if (s.includes('kerala')) return 'keralam';
  if (s.includes('chhattisgarh') || s.includes('chattisgarh')) return 'chattisgarh';
  if (s.includes('delhi')) return 'nct-of-delhi';
  if (s.includes('jammu')) return 'jammu-and-kashmir';
  if (s.includes('andaman')) return 'andaman-and-nicobar';
  if (s.includes('orissa') || s.includes('odisha')) return 'odisha';
  if (s.includes('uttar')) return 'uttar-pradesh';
  if (s.includes('madhya')) return 'madhya-pradesh';
  if (s.includes('himachal')) return 'himachal-pradesh';
  if (s.includes('andhra')) return 'andhra-pradesh';
  if (s.includes('tamil')) return 'tamil-nadu';
  if (s.includes('west')) return 'west-bengal';
  return s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// 2. Backup: Mandi Pulse (mandipulse.com) when Government sources are unavailable
// Strict rule: Record MUST match selected state, district, AND mandi
async function fetchFromMandiPulse(
  rawState: string,
  rawDistrict: string,
  rawMandi: string
): Promise<{ items: ServerMandiItem[]; sourceDate: string; sourceName: string } | null> {
  const { english: stateEnglish } = cleanLocation(rawState);
  const { english: districtEnglish } = cleanLocation(rawDistrict);
  const { english: mandiEnglish } = cleanLocation(rawMandi);

  const stateSlug = getStateSlug(stateEnglish);
  const mandiSlug = mandiEnglish.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const distSlug = districtEnglish.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const marketSlug = `${stateSlug}-${distSlug}-${mandiSlug}-apmc`;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    try {
      controller.abort();
    } catch {}
  }, 4500);

  try {
    // Step A: Direct market prices endpoint
    const marketPricesUrl = `https://mandipulse.com/embed/data?type=market-prices&market=${marketSlug}&language=hi`;
    const marketRes = await fetch(marketPricesUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': BROWSER_USER_AGENT,
      },
    }).catch(() => null);

    const marketData: any = marketRes && marketRes.ok ? await marketRes.json().catch(() => null) : null;
    const directMarketItems: any[] = marketData && Array.isArray(marketData.items) ? marketData.items : [];

    const cropMap = new Map<string, ServerMandiItem>();
    let latestReportDate = marketData?.updated_at ? parseAgmarknetDate(marketData.updated_at).hindiDate : '';

    for (const it of directMarketItems) {
      const rawName = (it.name || it.commodity || '').trim();
      if (!rawName) continue;
      const hindiName = normalizeCommodityName(rawName);

      const stateCheck = checkLocationMatch(it.state, rawState, 'state');
      const distCheck = checkLocationMatch(it.district, rawDistrict, 'district');
      const mandiCheck = checkLocationMatch(it.market, rawMandi, 'mandi');

      if (!stateCheck.match || !distCheck.match || !mandiCheck.match) {
        continue;
      }

      const minP = Math.round(Number(it.min_price) || 0);
      const maxP = Math.round(Number(it.max_price) || 0);
      const modalP = Math.round(Number(it.modal_price) || 0);
      if (modalP <= 0 && minP <= 0 && maxP <= 0) continue;

      const effectiveModal = modalP || Math.round((minP + maxP) / 2) || minP || maxP;
      const effectiveMin = minP || effectiveModal;
      const effectiveMax = maxP || effectiveModal;

      const itemDateStr = it.updated_at ? parseAgmarknetDate(it.updated_at).hindiDate : '';
      if (!latestReportDate && itemDateStr) {
        latestReportDate = itemDateStr;
      }

      cropMap.set(hindiName, {
        commodity: hindiName,
        minPrice: effectiveMin.toString(),
        maxPrice: effectiveMax.toString(),
        avgPrice: effectiveModal.toString(),
        unit: 'क्विंटल',
        arrival: it.arrival ? `${it.arrival} बोरी` : 'मंडी आवक',
        quality: cleanVarietyLabel(it.variety) || 'मानक गुणवत्ता (FAQ)',
        lastUpdated: itemDateStr || latestReportDate || formatIndianDate(),
      });
    }

    if (cropMap.size > 0) {
      clearTimeout(timeout);
      console.log(`[MandiPulse] Instant Direct Match: ${cropMap.size} crops found for ${marketSlug}`);
      return {
        items: Array.from(cropMap.values()),
        sourceDate: latestReportDate || formatIndianDate(),
        sourceName: 'मंडी पल्स (MandiPulse.com)',
      };
    }

    // Step B: Secondary fallback across staple crops
    const stapleSlugs = ['wheat', 'soyabean', 'garlic', 'mustard', 'bengal-gramgramwhole', 'onion', 'maize'];

    const staplePromises = stapleSlugs.map((slug) =>
      fetch(`https://mandipulse.com/embed/data?type=commodity-price&commodity=${slug}&language=hi&limit=50`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': BROWSER_USER_AGENT,
        },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    );

    const stapleResults = await Promise.all(staplePromises);
    clearTimeout(timeout);

    for (const sr of stapleResults) {
      if (sr && Array.isArray(sr.items)) {
        for (const it of sr.items) {
          const rawName = (it.name || it.commodity || '').trim();
          if (!rawName) continue;
          const hindiName = normalizeCommodityName(rawName);

          const stateCheck = checkLocationMatch(it.state, rawState, 'state');
          const distCheck = checkLocationMatch(it.district, rawDistrict, 'district');
          const mandiCheck = checkLocationMatch(it.market, rawMandi, 'mandi');

          if (!stateCheck.match || !distCheck.match || !mandiCheck.match) {
            continue;
          }

          const minP = Math.round(Number(it.min_price) || 0);
          const maxP = Math.round(Number(it.max_price) || 0);
          const modalP = Math.round(Number(it.modal_price) || 0);
          if (modalP <= 0 && minP <= 0 && maxP <= 0) continue;

          const effectiveModal = modalP || Math.round((minP + maxP) / 2) || minP || maxP;
          const effectiveMin = minP || effectiveModal;
          const effectiveMax = maxP || effectiveModal;

          const itemDateStr = it.updated_at ? parseAgmarknetDate(it.updated_at).hindiDate : '';
          if (!latestReportDate && itemDateStr) {
            latestReportDate = itemDateStr;
          }

          cropMap.set(hindiName, {
            commodity: hindiName,
            minPrice: effectiveMin.toString(),
            maxPrice: effectiveMax.toString(),
            avgPrice: effectiveModal.toString(),
            unit: 'क्विंटल',
            arrival: it.arrival ? `${it.arrival} बोरी` : 'मंडी आवक',
            quality: cleanVarietyLabel(it.variety) || 'मानक गुणवत्ता (FAQ)',
            lastUpdated: itemDateStr || latestReportDate || formatIndianDate(),
          });
        }
      }
    }

    const items = Array.from(cropMap.values());
    if (items.length > 0) {
      return {
        items,
        sourceDate: latestReportDate || formatIndianDate(),
        sourceName: 'मंडी पल्स (MandiPulse.com)',
      };
    }

    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// Track cooldown when Gemini hits 429 / quota exhaustion (circuit breaker)
let geminiQuotaCooldownUntil = 0;

function isQuotaOrRateLimitError(err: any): boolean {
  const status = err?.status || err?.code || err?.error?.code || err?.error?.status;
  const msg = (err?.message || JSON.stringify(err) || '').toLowerCase();
  return (
    status === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate-limit') ||
    msg.includes('rate limit')
  );
}

// 3. Fetch real market rates using Gemini Search Grounding (Server-Side)
async function fetchFromGeminiGrounding(
  stateClean: string,
  districtClean: string,
  mandiClean: string
): Promise<{ items: ServerMandiItem[]; sourceName: string; sourceDate: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  if (Date.now() < geminiQuotaCooldownUntil) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const now = new Date();
    const dateStr = formatIndianDate(now);

    const prompt = `आज (${dateStr}) और हाल के दिनों के लिए ${stateClean} राज्य के ${districtClean} जिले की ${mandiClean} मंडी के वास्तविक और नवीनतम मंडी भाव (Mandi Bhav / Market Rates) खोजें।

कृपया विश्वसनीय स्रोतों जैसे 'Agmarknet', 'Mandi Pulse', 'MP Mandi Bhav', या राज्य कृषि विपणन बोर्ड बुलेटिन से डेटा खोजें।

आवश्यक नियम:
1. सोयाबीन, गेहूँ, चना, सरसों, मक्का, लहसुन, प्याज, धनिया, मेथी, उड़द, मूंग आदि उपलब्ध फसलों के वास्तविक भाव निकालें।
2. भाव (minPrice, maxPrice, avgPrice) प्रति क्विंटल में संख्यात्मक होने चाहिए।
3. आवक (उदा. '250 बोरी') और गुणवत्ता (उदा. 'सुपर बोल्ड', 'FAQ') यदि मिले तो जोड़ें।
4. डेटा किस तारीख का मिला है वो sourceDate में दर्ज करें (उदा. '${dateStr}')।
5. जिस वेबसाइट या रिपोर्ट से भाव मिले हैं उसका नाम sourceName में दें (उदा. 'Agmarknet / Mandi Pulse')।
6. केवल नीचे दिए गए JSON स्कीमा में ही शुद्ध परिणाम दें।`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        sourceName: { type: Type.STRING },
        sourceDate: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              commodity: { type: Type.STRING, description: 'फसल का नाम हिंदी में' },
              minPrice: { type: Type.STRING, description: 'न्यूनतम भाव' },
              maxPrice: { type: Type.STRING, description: 'अधिकतम भाव' },
              avgPrice: { type: Type.STRING, description: 'मॉडल / औसत भाव' },
              unit: { type: Type.STRING, description: 'इकाई (क्विंटल)' },
              arrival: { type: Type.STRING, description: 'आवक' },
              quality: { type: Type.STRING, description: 'गुणवत्ता' },
              lastUpdated: { type: Type.STRING, description: 'अपडेट तारीख' },
            },
            required: ['commodity', 'minPrice', 'maxPrice', 'avgPrice', 'unit'],
          },
        },
      },
      required: ['sourceName', 'sourceDate', 'items'],
    };

    const candidateModels = ['gemini-3.6-flash', 'gemini-3.5-flash'];
    let responseText = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              "You are the Mandi Market Reporter for 'Falsawdiya Krishi Bazaar'. Extract real market prices from Google Search results. Never hallucinate fake numbers when real reports exist. Ensure all crop names are in Hindi.",
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
        if (response.text && response.text.trim()) {
          responseText = response.text.trim();
          break;
        }
      } catch (groundingErr: any) {
        if (isQuotaOrRateLimitError(groundingErr)) {
          geminiQuotaCooldownUntil = Date.now() + 15 * 60 * 1000;
          return null;
        }
      }
    }

    if (!responseText) return null;

    const parsed = JSON.parse(responseText || '{}');
    if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
      const validItems: ServerMandiItem[] = parsed.items.map((it: any) => ({
        commodity: normalizeCommodityName(it.commodity || 'फसल'),
        minPrice: it.minPrice?.toString() || it.avgPrice?.toString() || '0',
        maxPrice: it.maxPrice?.toString() || it.avgPrice?.toString() || '0',
        avgPrice: it.avgPrice?.toString() || '0',
        unit: it.unit || 'क्विंटल',
        arrival: it.arrival || 'उपलब्ध नहीं',
        quality: it.quality || 'सामान्य',
        lastUpdated: it.lastUpdated || parsed.sourceDate || dateStr,
      }));

      return {
        items: validItems,
        sourceName: parsed.sourceName || 'सत्यापित स्थानीय मंडी रिपोर्ट (Mandi Pulse / Agmarknet Web)',
        sourceDate: parsed.sourceDate || dateStr,
      };
    }
    return null;
  } catch (err) {
    console.warn('[Gemini Grounding Mandi] Error:', err);
    return null;
  }
}

// ==========================================
// ADMIN AUTHENTICATION MIDDLEWARE HELPER
// ==========================================
async function requireVerifiedAdmin(req: Request, res: Response) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = match ? match[1].trim() : '';

  if (!idToken) {
    res.status(401).json({
      success: false,
      error: 'अनधिकृत अनुरोध: Admin लॉगिन टोकन आवश्यक है।',
    });
    return null;
  }

  const verifiedAdmin = await verifyAdminFirebaseToken(idToken);
  if (!verifiedAdmin) {
    res.status(403).json({
      success: false,
      error: 'प्रवेश निषेध: केवल सत्यापित Admin ही मंडी API सेटिंग्स बदल सकते हैं।',
    });
    return null;
  }

  return verifiedAdmin;
}

function getCacheSummaryStats() {
  const markets = Object.values(govtCacheStore.markets || {});
  const totalItems = markets.reduce((sum, m) => sum + (Array.isArray(m.items) ? m.items.length : 0), 0);
  const previewMarkets = markets
    .slice()
    .sort((a, b) => (b.dateScore || 0) - (a.dateScore || 0))
    .slice(0, 8)
    .map((m) => ({
      state: m.state,
      district: m.district,
      market: m.market,
      sourceDate: m.sourceDate,
      cropCount: m.items.length,
    }));

  return {
    cachedMandisCount: markets.length,
    cachedRecordsCount: totalItems,
    cacheUpdatedAt: govtCacheStore.updatedAt || 0,
    syncSource: govtCacheStore.syncSource || 'none',
    previewMarkets,
  };
}

// ==========================================
// ADMIN API ROUTE HANDLERS
// ==========================================
export const handleGetAdminMandiSettings = async (req: Request, res: Response): Promise<void> => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  await ensureFirestoreCacheLoaded();
  const { key, source } = getActiveGovtApiKey();
  const cacheStats = getCacheSummaryStats();

  res.json({
    success: true,
    configured: Boolean(key),
    keySource: source,
    maskedKey: maskApiKey(key),
    enabled: govtConfig.enabled,
    defaultLimit: govtConfig.defaultLimit,
    syncStateFilter: govtConfig.syncStateFilter,
    lastSyncAt: govtConfig.lastSyncAt || 0,
    lastSyncStatus: govtConfig.lastSyncStatus || 'never',
    lastSyncSource: govtConfig.lastSyncSource || 'none',
    lastSyncMessage: govtConfig.lastSyncMessage || '',
    lastSyncRecordsCount: govtConfig.lastSyncRecordsCount || 0,
    updatedAt: govtConfig.updatedAt,
    ...cacheStats,
  });
};

export const handleUpdateAdminMandiSettings = async (req: Request, res: Response): Promise<void> => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  try {
    const { apiKey, clearKey, enabled, defaultLimit, syncStateFilter } = req.body || {};
    const updates: Partial<GovtMandiConfig> = {};

    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (defaultLimit !== undefined) {
      const parsed = Number(defaultLimit);
      if (Number.isFinite(parsed)) {
        updates.defaultLimit = Math.min(10000, Math.max(1, Math.round(parsed)));
      }
    }
    if (typeof syncStateFilter === 'string' && syncStateFilter.trim()) {
      updates.syncStateFilter = syncStateFilter.trim();
    }

    if (clearKey === true) {
      updates.apiKey = '';
    } else if (typeof apiKey === 'string') {
      const cleaned = apiKey.trim();
      if (cleaned && !cleaned.includes('••••')) {
        updates.apiKey = cleaned;
      }
    }

    saveGovtConfigToDisk(updates);
    mandiCache.clear();

    const { key, source } = getActiveGovtApiKey();
    res.json({
      success: true,
      message: 'सरकारी मंडी API सेटिंग्स सफलतापूर्वक सुरक्षित हो गई हैं।',
      configured: Boolean(key),
      keySource: source,
      maskedKey: maskApiKey(key),
      enabled: govtConfig.enabled,
      defaultLimit: govtConfig.defaultLimit,
      syncStateFilter: govtConfig.syncStateFilter,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'सेटिंग्स सेव करने में त्रुटि हुई।',
    });
  }
};

export const handleBuildAdminMandiSyncUrl = async (req: Request, res: Response): Promise<void> => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const overrideKey = typeof req.query.apiKey === 'string' ? req.query.apiKey.trim() : '';
  const { key: activeKey } = getActiveGovtApiKey();
  const keyToUse = overrideKey && !overrideKey.includes('••••') ? overrideKey : activeKey;

  if (!keyToUse) {
    res.status(400).json({
      success: false,
      error: 'कृपया पहले data.gov.in API Key दर्ज करके सेव करें।',
    });
    return;
  }

  const limit = Math.min(10000, Math.max(1, Number(req.query.limit) || govtConfig.defaultLimit || 1000));
  const stateFilter = typeof req.query.state === 'string' ? req.query.state.trim() : govtConfig.syncStateFilter;

  const url = new URL(OGD_RESOURCE_URL);
  url.searchParams.set('api-key', keyToUse);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  if (stateFilter && stateFilter !== 'ALL') {
    url.searchParams.set('filters[state]', stateFilter);
  }

  res.json({
    success: true,
    syncUrl: url.toString(),
    limit,
    stateFilter: stateFilter || 'ALL',
  });
};

export const handleTestAdminMandiConnection = async (req: Request, res: Response): Promise<void> => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const bodyKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
  const { key: savedKey } = getActiveGovtApiKey();
  const testKey = bodyKey && !bodyKey.includes('••••') ? bodyKey : savedKey;

  if (!testKey) {
    res.status(400).json({
      success: false,
      reachable: false,
      message: 'API Key उपलब्ध नहीं है। कृपया पहले अपनी data.gov.in API Key दर्ज करें।',
    });
    return;
  }

  try {
    const result = await fetchOgdRecords({
      apiKey: testKey,
      limit: 5,
      stateFilter: govtConfig.syncStateFilter || 'Madhya Pradesh',
      timeoutMs: 7000,
    });

    if (result.httpStatus === 200) {
      res.json({
        success: true,
        reachable: true,
        httpStatus: 200,
        recordCount: result.records.length,
        message: `कनेक्शन सफल! सरकारी OGD सर्वर से ${result.records.length} टेस्ट रिकॉर्ड प्राप्त हुए (कुल उपलब्ध: ${result.total ?? result.records.length})।`,
      });
      return;
    }

    if (result.httpStatus === 401 || result.httpStatus === 403) {
      res.json({
        success: false,
        reachable: true,
        httpStatus: result.httpStatus,
        message: 'सरकारी सर्वर ने API Key को अमान्य (401/403) बताया। कृपया data.gov.in से प्राप्त सही API Key जांचें।',
      });
      return;
    }

    res.json({
      success: false,
      reachable: true,
      httpStatus: result.httpStatus,
      message: `सरकारी पोर्टल ने HTTP ${result.httpStatus} उत्तर दिया। कृपया कुछ समय बाद पुनः जांचें।`,
    });
  } catch (err: any) {
    const errMsg = String(err?.cause?.code || err?.code || err?.message || '');
    const isBlocked =
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('ETIMEDOUT') ||
      errMsg.includes('ENOTFOUND') ||
      errMsg.includes('fetch failed') ||
      errMsg.includes('AbortError');

    res.json({
      success: false,
      reachable: false,
      blockedFromServer: isBlocked,
      message: isBlocked
        ? 'यह क्लाउड सर्वर भारत से बाहर स्थित होने के कारण data.gov.in ने डायरेक्ट सर्वर कनेक्शन ब्लॉक किया है। भारत में स्थित ब्राउज़र से "1-Click सरकारी डेटा सिंक करें" चलाएँ या भारत-आधारित सर्वर पर चलाएँ; तब तक MandiPulse लाइव बैकअप चालू है।'
        : `कनेक्शन जांच विफल: ${err?.message || 'Network Error'}`,
    });
  }
};

export const handleSyncAdminMandiGovt = async (req: Request, res: Response): Promise<void> => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  const bodyKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
  const { key: savedKey } = getActiveGovtApiKey();
  const activeKey = bodyKey && !bodyKey.includes('••••') ? bodyKey : savedKey;

  if (!activeKey) {
    res.status(400).json({
      success: false,
      error: 'कृपया पहले data.gov.in API Key दर्ज करें।',
    });
    return;
  }

  const targetLimit = Math.min(10000, Math.max(1, Number(req.body?.limit) || govtConfig.defaultLimit || 1000));
  const stateFilter = typeof req.body?.stateFilter === 'string' ? req.body.stateFilter.trim() : govtConfig.syncStateFilter;

  try {
    const pageSize = Math.min(1000, targetLimit);
    let combinedRaw: any[] = [];
    let offset = 0;

    while (combinedRaw.length < targetLimit) {
      const remaining = targetLimit - combinedRaw.length;
      const batchLimit = Math.min(pageSize, remaining);
      const resPage = await fetchOgdRecords({
        apiKey: activeKey,
        limit: batchLimit,
        offset,
        stateFilter: stateFilter || 'ALL',
        timeoutMs: 10000,
      });

      if (resPage.httpStatus !== 200) {
        if (combinedRaw.length === 0) {
          saveGovtConfigToDisk({
            lastSyncAt: Date.now(),
            lastSyncStatus: 'error',
            lastSyncMessage: `HTTP ${resPage.httpStatus}`,
          });
          res.json({
            success: false,
            blockedFromServer: false,
            error: `सरकारी API ने HTTP ${resPage.httpStatus} उत्तर दिया। कृपया API Key जांचें।`,
          });
          return;
        }
        break;
      }

      if (resPage.records.length === 0) break;
      combinedRaw = combinedRaw.concat(resPage.records);
      if (resPage.records.length < batchLimit) break;
      offset += batchLimit;
    }

    if (combinedRaw.length === 0) {
      res.json({
        success: false,
        blockedFromServer: false,
        error: 'सरकारी API से आज अभी कोई मंडी रिकॉर्ड प्राप्त नहीं हुआ।',
      });
      return;
    }

    const normalizedNew = normalizeRawOgdRecordsToMarkets(combinedRaw);
    const mergedMarkets = mergeMarketCaches(govtCacheStore.markets || {}, normalizedNew);

    const newStore: GovtMandiCacheStore = {
      version: (govtCacheStore.version || 1) + 1,
      updatedAt: Date.now(),
      syncSource: 'server_ogd',
      totalRawRecords: combinedRaw.length,
      markets: mergedMarkets,
    };

    saveGovtCacheToDisk(newStore);
    mandiCache.clear();

    const stats = getCacheSummaryStats();
    const firestoreCacheDoc = buildCompactFirestoreCacheDoc(newStore);

    saveGovtConfigToDisk({
      lastSyncAt: Date.now(),
      lastSyncStatus: 'success',
      lastSyncSource: 'server_ogd',
      lastSyncRecordsCount: combinedRaw.length,
      lastSyncMessage: `${Object.keys(normalizedNew).length} मंडियों के ${combinedRaw.length} सरकारी रिकॉर्ड सिंक हुए।`,
    });

    res.json({
      success: true,
      message: `सरकारी OGD से ${combinedRaw.length} रिकॉर्ड (${Object.keys(normalizedNew).length} मंडियां) सफलतापूर्वक सिंक हो गए।`,
      rawCount: combinedRaw.length,
      newMarketsCount: Object.keys(normalizedNew).length,
      firestoreCacheDoc,
      ...stats,
    });
  } catch (err: any) {
    const errMsg = String(err?.cause?.code || err?.code || err?.message || '');
    const isBlocked =
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('ETIMEDOUT') ||
      errMsg.includes('ENOTFOUND') ||
      errMsg.includes('fetch failed') ||
      errMsg.includes('AbortError');

    saveGovtConfigToDisk({
      lastSyncAt: Date.now(),
      lastSyncStatus: isBlocked ? 'blocked' : 'error',
      lastSyncMessage: isBlocked
        ? 'विदेशी सर्वर से data.gov.in ब्लॉक — भारत ब्राउज़र सिंक उपयोग करें'
        : err?.message || 'Sync Error',
    });

    res.json({
      success: false,
      blockedFromServer: isBlocked,
      error: isBlocked
        ? 'क्लाउड सर्वर भारत के बाहर होने से data.gov.in ने डायरेक्ट सर्वर अनुरोध अस्वीकार किया। भारत ब्राउज़र सिंक का उपयोग करें।'
        : err?.message || 'सिंक करने में त्रुटि हुई।',
    });
  }
};

export const handleImportAdminMandiCache = async (req: Request, res: Response): Promise<void> => {
  const admin = await requireVerifiedAdmin(req, res);
  if (!admin) return;

  try {
    let payload = req.body?.rawPayload ?? req.body;
    const sourceLabel = typeof req.body?.sourceLabel === 'string' ? req.body.sourceLabel : 'browser_sync';
    const mergeExisting = req.body?.mergeExisting !== false;

    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }

    const records: any[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.records)
      ? payload.records
      : Array.isArray(payload?.data)
      ? payload.data
      : [];

    if (records.length === 0) {
      res.status(400).json({
        success: false,
        error: 'दिए गए JSON डेटा में कोई मान्य मंडी रिकॉर्ड (records) नहीं मिला। कृपया data.gov.in का सही JSON पेस्ट करें।',
      });
      return;
    }

    const normalizedNew = normalizeRawOgdRecordsToMarkets(records);
    const newMarketCount = Object.keys(normalizedNew).length;

    if (newMarketCount === 0) {
      res.status(400).json({
        success: false,
        error: 'रिकॉर्ड्स में मान्य राज्य, जिला, मंडी या भाव फ़ील्ड नहीं मिले।',
      });
      return;
    }

    const finalMarkets = mergeExisting
      ? mergeMarketCaches(govtCacheStore.markets || {}, normalizedNew)
      : normalizedNew;

    const newStore: GovtMandiCacheStore = {
      version: (govtCacheStore.version || 1) + 1,
      updatedAt: Date.now(),
      syncSource: sourceLabel,
      totalRawRecords: records.length,
      markets: finalMarkets,
    };

    saveGovtCacheToDisk(newStore);
    mandiCache.clear();

    const stats = getCacheSummaryStats();
    const firestoreCacheDoc = buildCompactFirestoreCacheDoc(newStore);

    saveGovtConfigToDisk({
      lastSyncAt: Date.now(),
      lastSyncStatus: 'success',
      lastSyncSource: sourceLabel === 'json_import' ? 'json_import' : 'browser_sync',
      lastSyncRecordsCount: records.length,
      lastSyncMessage: `${newMarketCount} मंडियों के ${records.length} सरकारी रिकॉर्ड साझा कैश में सुरक्षित हुए।`,
    });

    res.json({
      success: true,
      message: `${newMarketCount} मंडियों (${records.length} रिकॉर्ड) का सरकारी डेटा साझा कैश में सफलतापूर्वक सहेजा गया!`,
      rawCount: records.length,
      newMarketsCount: newMarketCount,
      firestoreCacheDoc,
      ...stats,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: `JSON पार्स करने में त्रुटि: ${err?.message || 'अमान्य JSON प्रारूप'}`,
    });
  }
};

// ==========================================
// MAIN PUBLIC ROUTE HANDLER: /api/mandi/prices
// ==========================================
export const handleGetMandiPrices = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawState = (req.query.state as string) || 'मध्यप्रदेश (Madhya Pradesh)';
    const rawDistrict = (req.query.district as string) || 'मंदसौर (Mandsaur)';
    const rawMandi = (req.query.mandi as string) || 'शामगढ़ (Shamgarh)';
    const forceRefresh = req.query.forceRefresh === 'true';

    const cacheKey = `mandi_${normalizeNoSpace(rawState)}_${normalizeNoSpace(rawDistrict)}_${normalizeNoSpace(rawMandi)}`;
    const now = Date.now();

    if (!forceRefresh) {
      const cached = mandiCache.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        res.json({
          success: true,
          cached: true,
          data: cached.data,
        });
        return;
      }
    }

    const fetchedAtStr = formatIndianTime();

    // Helper to package Govt response consistently & cleanly
    const sendGovtSuccess = (items: ServerMandiItem[], sourceDate: string, statusMessage: string) => {
      const responseData: ServerMandiDetails = {
        mandiName: rawMandi,
        district: rawDistrict,
        state: rawState,
        date: sourceDate,
        items,
        sourceType: 'govt',
        sourceName: 'AGMARKNET (भारत सरकार OGD डेटासेट)',
        sourceDate,
        fetchedAt: fetchedAtStr,
        isLive: true,
        isEstimated: false,
        statusMessage,
      };
      mandiCache.set(cacheKey, { data: responseData, timestamp: now });
      res.json({ success: true, data: responseData });
    };

    // Tier 1A (Fast Shared Govt Cache) when not explicitly forcing live OGD re-fetch
    if (!forceRefresh && govtConfig.enabled) {
      const sharedMatch = await lookupSharedGovtCache(rawState, rawDistrict, rawMandi);
      if (sharedMatch && sharedMatch.items.length > 0) {
        console.log(`[Mandi Route Success] Shared Govt Cache hit (${sharedMatch.items.length} crops) for ${rawMandi}`);
        sendGovtSuccess(
          sharedMatch.items,
          sharedMatch.sourceDate,
          'सरकारी पोर्टल (AGMARKNET OGD) से प्राप्त प्रमाणित दैनिक दरें'
        );
        return;
      }
    }

    // Tier 1B: Try Live Official Government OGD API (High limit + alias + market fallback)
    const ogdResult = await fetchFromGovtOgd(rawState, rawDistrict, rawMandi);
    if (ogdResult && ogdResult.items.length > 0) {
      console.log(`[Mandi Route Success] Found ${ogdResult.items.length} records in Live Govt AGMARKNET for ${rawMandi}`);
      sendGovtSuccess(
        ogdResult.items,
        ogdResult.sourceDate,
        'सरकारी पोर्टल (AGMARKNET OGD) से लाइव प्राप्त प्रमाणित दैनिक दरें'
      );
      return;
    }

    // If forceRefresh was true and live OGD failed/was blocked, still check Shared Govt Cache before falling back
    if (forceRefresh && govtConfig.enabled) {
      const sharedMatch = await lookupSharedGovtCache(rawState, rawDistrict, rawMandi);
      if (sharedMatch && sharedMatch.items.length > 0) {
        console.log(`[Mandi Route Success] Shared Govt Cache fallback after live OGD for ${rawMandi}`);
        sendGovtSuccess(
          sharedMatch.items,
          sharedMatch.sourceDate,
          'सरकारी पोर्टल (AGMARKNET OGD साझा कैश) से प्राप्त प्रमाणित दैनिक दरें'
        );
        return;
      }
    }

    // Tier 2: Dedicated Backup -> Mandi Pulse (mandipulse.com) (Strict State + District + Mandi match)
    const mandiPulseResult = await fetchFromMandiPulse(rawState, rawDistrict, rawMandi);
    if (mandiPulseResult && mandiPulseResult.items.length > 0) {
      console.log(`[Mandi Route Success] Backup MandiPulse found ${mandiPulseResult.items.length} records for ${rawMandi}`);
      const responseData: ServerMandiDetails = {
        mandiName: rawMandi,
        district: rawDistrict,
        state: rawState,
        date: mandiPulseResult.sourceDate,
        items: mandiPulseResult.items,
        sourceType: 'mandipulse',
        sourceName: mandiPulseResult.sourceName,
        sourceDate: mandiPulseResult.sourceDate,
        fetchedAt: fetchedAtStr,
        isLive: true,
        isEstimated: false,
        statusMessage: 'सरकारी पोर्टल पर डेटा न मिलने पर मंडी पल्स (MandiPulse.com) बैकअप से प्राप्त सत्यापित लाइव भाव',
      };

      mandiCache.set(cacheKey, { data: responseData, timestamp: now });
      res.json({ success: true, data: responseData });
      return;
    }

    // Tier 3: Server-side Gemini Search Grounding if configured
    const geminiResult = await fetchFromGeminiGrounding(rawState, rawDistrict, rawMandi);
    if (geminiResult && geminiResult.items.length > 0) {
      console.log(`[Mandi Route Success] Found ${geminiResult.items.length} records via Gemini Grounding for ${rawMandi}`);
      const responseData: ServerMandiDetails = {
        mandiName: rawMandi,
        district: rawDistrict,
        state: rawState,
        date: geminiResult.sourceDate,
        items: geminiResult.items,
        sourceType: 'market_report',
        sourceName: geminiResult.sourceName,
        sourceDate: geminiResult.sourceDate,
        fetchedAt: fetchedAtStr,
        isLive: true,
        isEstimated: false,
        statusMessage: `${rawMandi} मंडी के लिए सार्वजनिक स्रोतों व ई-मंडी बुलेटिन से संकलित सत्यापित भाव`,
      };

      mandiCache.set(cacheKey, { data: responseData, timestamp: now });
      res.json({ success: true, data: responseData });
      return;
    }

    // Tier 4: Clean empty response (never mark unavailable data as govt!)
    console.log(`[Mandi Route Complete] No official records found for ${rawMandi}. Returning clean empty state.`);
    const cleanEmptyDetails: ServerMandiDetails = {
      mandiName: rawMandi,
      district: rawDistrict,
      state: rawState,
      date: formatIndianDate(),
      items: [],
      sourceType: 'unavailable',
      sourceName: 'आधिकारिक मंडी रिकॉर्ड (AGMARKNET / MandiPulse)',
      sourceDate: formatIndianDate(),
      fetchedAt: fetchedAtStr,
      isLive: false,
      isEstimated: false,
      statusMessage: `${rawMandi} (${rawDistrict.split(' (')[0]}, ${rawState.split(' (')[0]}) मंडी के लिए आज का आधिकारिक डेटा उपलब्ध नहीं है।`,
    };

    const emptyCacheDurationMs = Date.now() < geminiQuotaCooldownUntil ? 10 * 60 * 1000 : 3 * 60 * 1000;
    mandiCache.set(cacheKey, { data: cleanEmptyDetails, timestamp: now - (CACHE_TTL_MS - emptyCacheDurationMs) });
    res.json({
      success: true,
      data: cleanEmptyDetails,
    });
  } catch (error: any) {
    console.error('[Mandi Route Error]:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'मंडी डेटा फेच करने में आंतरिक त्रुटि',
    });
  }
};
