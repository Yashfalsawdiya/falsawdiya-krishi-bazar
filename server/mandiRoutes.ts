import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  getRemoteFirestoreDoc,
  hasServerFirestoreWriteAccess,
  setRemoteFirestoreDocDetailed,
  verifyAdminFirebaseToken,
} from './firestoreSync.js';

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
  lastSyncStatus?: 'success' | 'no_change' | 'blocked' | 'error' | 'never';
  lastSyncSource?: 'server_ogd' | 'auto_cron' | 'browser_sync' | 'json_import' | 'firestore_restore';
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

export interface MandiSyncHistoryEntry {
  timestamp: number;
  trigger: 'auto_cron' | 'admin_manual' | 'admin_browser';
  status: 'success' | 'no_change' | 'blocked' | 'error';
  rawRecords: number;
  newMarketsCount: number;
  updatedMarketsCount: number;
  unchangedCount: number;
  durationMs: number;
  message: string;
  error?: string;
  rateLimitRemaining?: number;
}

export interface MandiSyncStatusStore {
  lastSyncAt: number;
  lastSuccessfulSyncAt: number;
  lastSyncStatus: 'success' | 'no_change' | 'blocked' | 'error' | 'never';
  lastSyncTrigger: string;
  lastSyncMessage: string;
  lastError: string;
  nextScheduledSyncAt: number;
  inProgressUntil: number;
  dataHash: string;
  consecutiveFailures: number;
  rateLimitRemaining: number | null;
  lastAlertSentAt: number;
  syncHistory: MandiSyncHistoryEntry[];
}

// Compact 30-day rolling history store (per stateSlug -> dist|market -> commodity -> ["YYYYMMDD|avg|min|max", ...])
export interface StateMandiHistoryBucket {
  version: number;
  updatedAt: number;
  stateSlug: string;
  markets: Record<string, Record<string, string[]>>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const GOVT_CONFIG_FILE = path.join(DATA_DIR, 'mandi-govt-config.json');
const GOVT_CONFIG_TMP_FILE = '/tmp/falsawdiya-mandi-govt-config.json';
const GOVT_CACHE_FILE = path.join(DATA_DIR, 'mandi-govt-cache.json');
const GOVT_CACHE_TMP_FILE = '/tmp/falsawdiya-mandi-govt-cache.json';
const SYNC_STATUS_FILE = path.join(DATA_DIR, 'mandi-sync-status.json');
const SYNC_STATUS_TMP_FILE = '/tmp/falsawdiya-mandi-sync-status.json';
const HISTORY_CACHE_FILE = path.join(DATA_DIR, 'mandi-history-cache.json');
const HISTORY_CACHE_TMP_FILE = '/tmp/falsawdiya-mandi-history-cache.json';

const OGD_RESOURCE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const FIRESTORE_DOC_BYTE_BUDGET = 760 * 1024; // Safe margin well below Firestore's 1 MB limit
const HISTORY_DOC_BYTE_BUDGET = 700 * 1024;
const GOVT_CACHE_FRESH_MS = 48 * 60 * 60 * 1000; // 48 hours for shared govt cache before preferring live fallback
const FIRESTORE_CACHE_POLL_MS = 15 * 60 * 1000; // Poll Firestore at most once every 15 mins on cold server
const MAX_MARKET_AGE_DAYS = 10; // Auto-prune markets older than 10 days to prevent stale cache bloat
const MAX_HISTORY_TRADING_DAYS = 30; // Strict 30-day FIFO rolling history
const SYNC_LOCK_TTL_MS = 90 * 1000; // 90s distributed lock against concurrent cron/sync hits
const ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000; // Max 1 alert email per 12 hours
const ADMIN_ALERT_EMAIL = 'yashfalsawdiya36@gmail.com';

// 10 active IST market sync slots (minutes from 00:00 IST):
// 09:30 AM, 11:00 AM, 12:30 PM, 02:00 PM, 03:30 PM, 05:00 PM, 06:30 PM, 08:00 PM, 09:30 PM, 11:00 PM IST
const IST_SYNC_SLOTS_MINUTES = [
  9 * 60 + 30,
  11 * 60,
  12 * 60 + 30,
  14 * 60,
  15 * 60 + 30,
  17 * 60,
  18 * 60 + 30,
  20 * 60,
  21 * 60 + 30,
  23 * 60,
];

type MandiAlertMailerFn = (opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => Promise<{ success: boolean; error?: string }>;

let mandiAlertMailer: MandiAlertMailerFn | null = null;

export function setMandiAlertMailer(fn: MandiAlertMailerFn): void {
  mandiAlertMailer = fn;
}

let govtConfig: GovtMandiConfig = {
  enabled: true,
  apiKey: '',
  defaultLimit: 3000,
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

let syncStatusStore: MandiSyncStatusStore = {
  lastSyncAt: 0,
  lastSuccessfulSyncAt: 0,
  lastSyncStatus: 'never',
  lastSyncTrigger: 'none',
  lastSyncMessage: '',
  lastError: '',
  nextScheduledSyncAt: 0,
  inProgressUntil: 0,
  dataHash: '',
  consecutiveFailures: 0,
  rateLimitRemaining: null,
  lastAlertSentAt: 0,
  syncHistory: [],
};

// Map stateSlug -> StateMandiHistoryBucket
let mandiHistoryByState: Record<string, StateMandiHistoryBucket> = {};
const lastHistoryStatePollAt: Record<string, number> = {};

let lastFirestoreCacheCheckAt = 0;
let lastSyncStatusPollAt = 0;
let isLocalSyncInFlight = false;

// In-memory cache for final mandi responses (30 min TTL)
interface CacheEntry {
  data: ServerMandiDetails;
  timestamp: number;
}
const mandiCache = new Map<string, CacheEntry>();
const historyApiCache = new Map<string, { data: any; timestamp: number }>();
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

function loadSyncStatusFromDisk(): void {
  try {
    const fileToRead = fs.existsSync(SYNC_STATUS_FILE)
      ? SYNC_STATUS_FILE
      : fs.existsSync(SYNC_STATUS_TMP_FILE)
      ? SYNC_STATUS_TMP_FILE
      : null;
    if (!fileToRead) return;
    const raw = fs.readFileSync(fileToRead, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      syncStatusStore = {
        ...syncStatusStore,
        ...parsed,
        syncHistory: Array.isArray(parsed.syncHistory) ? parsed.syncHistory.slice(0, 20) : [],
      };
    }
  } catch (err) {
    console.warn('[Mandi Sync Status] Failed loading disk status:', err);
  }
}

function saveSyncStatusToDisk(status: MandiSyncStatusStore): void {
  syncStatusStore = {
    ...status,
    syncHistory: Array.isArray(status.syncHistory) ? status.syncHistory.slice(0, 20) : [],
  };
  ensureDataDir();
  const payload = JSON.stringify(syncStatusStore, null, 2);
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(SYNC_STATUS_FILE, payload, 'utf-8');
      return;
    }
  } catch {
    // Fall through to /tmp
  }
  try {
    fs.writeFileSync(SYNC_STATUS_TMP_FILE, payload, 'utf-8');
  } catch (err) {
    console.warn('[Mandi Sync Status] Failed saving status:', err);
  }
}

function loadHistoryCacheFromDisk(): void {
  try {
    const fileToRead = fs.existsSync(HISTORY_CACHE_FILE)
      ? HISTORY_CACHE_FILE
      : fs.existsSync(HISTORY_CACHE_TMP_FILE)
      ? HISTORY_CACHE_TMP_FILE
      : null;
    if (!fileToRead) return;
    const raw = fs.readFileSync(fileToRead, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      mandiHistoryByState = parsed;
    }
  } catch (err) {
    console.warn('[Mandi History] Failed loading disk history:', err);
  }
}

function saveHistoryCacheToDisk(): void {
  ensureDataDir();
  const payload = JSON.stringify(mandiHistoryByState);
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(HISTORY_CACHE_FILE, payload, 'utf-8');
      return;
    }
  } catch {
    // Fall through to /tmp
  }
  try {
    fs.writeFileSync(HISTORY_CACHE_TMP_FILE, payload, 'utf-8');
  } catch (err) {
    console.warn('[Mandi History] Failed saving disk history:', err);
  }
}

// Initialize at module load
loadGovtConfigFromDisk();
loadGovtCacheFromDisk();
loadSyncStatusFromDisk();
loadHistoryCacheFromDisk();

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

function getStateSlugKey(stateRaw: string): string {
  const cleaned = cleanLocation(stateRaw).english || stateRaw || 'india';
  const s = cleaned.toLowerCase().trim();
  if (s.includes('chhattisgarh') || s.includes('chattisgarh')) return 'chhattisgarh';
  if (s.includes('odisha') || s.includes('orissa')) return 'odisha';
  if (s.includes('delhi')) return 'delhi';
  if (s.includes('kerala')) return 'kerala';
  return s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'india';
}

function dateScoreToEpochDays(score: number): number {
  const y = Math.floor(score / 10000);
  const m = Math.floor((score % 10000) / 100);
  const d = score % 100;
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function pruneMarketCache(
  markets: Record<string, CachedGovtMarketEntry>,
  maxAgeDays: number = MAX_MARKET_AGE_DAYS
): Record<string, CachedGovtMarketEntry> {
  const todayDays = dateScoreToEpochDays(getCurrentIstDateScore());
  const pruned: Record<string, CachedGovtMarketEntry> = {};

  for (const [k, entry] of Object.entries(markets || {})) {
    if (!entry || !Array.isArray(entry.items) || entry.items.length === 0) continue;
    const entryDays = dateScoreToEpochDays(entry.dateScore || 0);
    if (todayDays > 0 && entryDays > 0 && todayDays - entryDays > maxAgeDays) {
      continue;
    }
    pruned[k] = entry;
  }

  return pruned;
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

  return pruneMarketCache(merged, MAX_MARKET_AGE_DAYS);
}

function computeMarketDeltaAndHash(
  prevMarkets: Record<string, CachedGovtMarketEntry>,
  incomingMarkets: Record<string, CachedGovtMarketEntry>,
  mergedMarkets: Record<string, CachedGovtMarketEntry>
): {
  newMarketsCount: number;
  updatedMarketsCount: number;
  unchangedCount: number;
  dataHash: string;
  hasMeaningfulChange: boolean;
} {
  let newMarketsCount = 0;
  let updatedMarketsCount = 0;
  let unchangedCount = 0;

  const serializeMarketFingerprint = (m: CachedGovtMarketEntry) =>
    `${m.dateScore}|${m.items.map((i) => `${i.commodity}:${i.avgPrice}:${i.minPrice}:${i.maxPrice}`).join(',')}`;

  for (const [key, inc] of Object.entries(incomingMarkets)) {
    const prev = prevMarkets[key];
    if (!prev) {
      newMarketsCount++;
    } else if (
      inc.dateScore > prev.dateScore ||
      (inc.dateScore === prev.dateScore && serializeMarketFingerprint(inc) !== serializeMarketFingerprint(prev))
    ) {
      updatedMarketsCount++;
    } else {
      unchangedCount++;
    }
  }

  const sortedKeys = Object.keys(mergedMarkets).sort();
  const hashInput = sortedKeys
    .map((k) => `${k}=${serializeMarketFingerprint(mergedMarkets[k])}`)
    .join('\n');
  const dataHash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 24);

  return {
    newMarketsCount,
    updatedMarketsCount,
    unchangedCount,
    dataHash,
    hasMeaningfulChange: newMarketsCount > 0 || updatedMarketsCount > 0,
  };
}

/**
 * Updates centralized 30-day FIFO rolling history for all incoming Govt markets.
 * Format per crop: "YYYYMMDD|avg|min|max" (tiny ~22 bytes/day, auto-drops Day 1 after 30 days).
 */
function updateCentralizedHistoryFromMarkets(
  incomingMarkets: Record<string, CachedGovtMarketEntry>
): { changedStateSlugs: string[]; totalMarketsTracked: number } {
  const changedStates = new Set<string>();

  for (const entry of Object.values(incomingMarkets)) {
    if (!entry || !entry.dateScore || !Array.isArray(entry.items) || entry.items.length === 0) continue;
    const stateSlug = getStateSlugKey(entry.state);
    if (!mandiHistoryByState[stateSlug]) {
      mandiHistoryByState[stateSlug] = {
        version: 1,
        updatedAt: Date.now(),
        stateSlug,
        markets: {},
      };
    }

    const bucket = mandiHistoryByState[stateSlug];
    const mktKey = `${entry.distNorm}|${entry.marketNorm}`;
    if (!bucket.markets[mktKey]) {
      bucket.markets[mktKey] = {};
    }
    const cropMap = bucket.markets[mktKey];
    let marketChanged = false;

    for (const item of entry.items) {
      const avg = Math.round(Number(item.avgPrice) || 0);
      const min = Math.round(Number(item.minPrice) || avg);
      const max = Math.round(Number(item.maxPrice) || avg);
      if (avg <= 0) continue;

      const rowStr = `${entry.dateScore}|${avg}|${min}|${max}`;
      const existingList = Array.isArray(cropMap[item.commodity]) ? [...cropMap[item.commodity]] : [];

      const byScore = new Map<number, string>();
      for (const line of existingList) {
        const sc = parseInt(String(line).split('|')[0] || '0', 10);
        if (sc > 0) byScore.set(sc, line);
      }

      const prevForScore = byScore.get(entry.dateScore);
      if (prevForScore !== rowStr) {
        byScore.set(entry.dateScore, rowStr);
        marketChanged = true;
      }

      const sortedRows = Array.from(byScore.entries())
        .sort(([a], [b]) => a - b)
        .slice(-MAX_HISTORY_TRADING_DAYS)
        .map(([, val]) => val);

      cropMap[item.commodity] = sortedRows;
    }

    if (marketChanged) {
      bucket.updatedAt = Date.now();
      bucket.version = (bucket.version || 1) + 1;
      changedStates.add(stateSlug);
    }
  }

  if (changedStates.size > 0) {
    saveHistoryCacheToDisk();
    historyApiCache.clear();
  }

  const totalMarketsTracked = Object.values(mandiHistoryByState).reduce(
    (sum, b) => sum + Object.keys(b.markets || {}).length,
    0
  );

  return {
    changedStateSlugs: Array.from(changedStates),
    totalMarketsTracked,
  };
}

function buildCompactStateHistoryDoc(stateSlug: string): {
  docId: string;
  payload: StateMandiHistoryBucket;
} | null {
  const bucket = mandiHistoryByState[stateSlug];
  if (!bucket || !bucket.markets) return null;

  const entries = Object.entries(bucket.markets);
  const compactMarkets: Record<string, Record<string, string[]>> = {};
  let runningBytes = 250;

  // Sort most recently updated markets first so active markets always fit safely within 700 KB
  entries.sort(([, cropsA], [, cropsB]) => {
    const getMaxScore = (cMap: Record<string, string[]>) => {
      let maxS = 0;
      for (const rows of Object.values(cMap)) {
        const last = rows[rows.length - 1];
        const sc = last ? parseInt(last.split('|')[0] || '0', 10) : 0;
        if (sc > maxS) maxS = sc;
      }
      return maxS;
    };
    return getMaxScore(cropsB) - getMaxScore(cropsA);
  });

  for (const [mktKey, crops] of entries) {
    const size = Buffer.byteLength(JSON.stringify(crops), 'utf8') + mktKey.length + 8;
    if (runningBytes + size > HISTORY_DOC_BYTE_BUDGET) {
      break;
    }
    compactMarkets[mktKey] = crops;
    runningBytes += size;
  }

  return {
    docId: `mandi_history_${stateSlug}`,
    payload: {
      version: bucket.version || 1,
      updatedAt: bucket.updatedAt || Date.now(),
      stateSlug,
      markets: compactMarkets,
    },
  };
}

function computeNextScheduledSyncAt(nowMs: number = Date.now()): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(nowMs));
  const y = parseInt(parts.find((p) => p.type === 'year')?.value || '2026', 10);
  const m = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const d = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);
  const hh = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const mm = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const currentMinutes = hh * 60 + mm;

  const istStartOfDayUtc = Date.UTC(y, m - 1, d, 0, 0, 0) - 5.5 * 60 * 60 * 1000;
  for (const slotMin of IST_SYNC_SLOTS_MINUTES) {
    if (slotMin > currentMinutes + 1) {
      return istStartOfDayUtc + slotMin * 60 * 1000;
    }
  }
  // Otherwise first slot tomorrow IST (09:30 AM IST)
  return istStartOfDayUtc + 24 * 60 * 60 * 1000 + IST_SYNC_SLOTS_MINUTES[0] * 60 * 1000;
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
  const entries = Object.entries(pruneMarketCache(store.markets || {}, MAX_MARKET_AGE_DAYS));
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

function buildStateCacheDocs(store: GovtMandiCacheStore): Array<{
  docId: string;
  payload: {
    version: number;
    updatedAt: number;
    syncSource: string;
    stateSlug: string;
    totalMarkets: number;
    totalItems: number;
    markets: Record<string, CachedGovtMarketEntry>;
  };
}> {
  const byState = new Map<string, Array<[string, CachedGovtMarketEntry]>>();
  const cleaned = pruneMarketCache(store.markets || {}, MAX_MARKET_AGE_DAYS);

  for (const [k, entry] of Object.entries(cleaned)) {
    const slug = getStateSlugKey(entry.state);
    if (!byState.has(slug)) byState.set(slug, []);
    byState.get(slug)!.push([k, entry]);
  }

  const out: Array<{ docId: string; payload: any }> = [];
  for (const [stateSlug, entries] of byState.entries()) {
    entries.sort(([, a], [, b]) => (b.dateScore || 0) - (a.dateScore || 0));
    const markets: Record<string, CachedGovtMarketEntry> = {};
    let totalItems = 0;
    let runningBytes = 320;
    for (const [k, entry] of entries) {
      const sz = Buffer.byteLength(JSON.stringify(entry), 'utf8') + k.length + 6;
      if (runningBytes + sz > FIRESTORE_DOC_BYTE_BUDGET) break;
      markets[k] = entry;
      totalItems += entry.items.length;
      runningBytes += sz;
    }
    out.push({
      docId: `mandi_cache_${stateSlug}`,
      payload: {
        version: store.version || 1,
        updatedAt: store.updatedAt || Date.now(),
        syncSource: store.syncSource || 'auto_sync',
        stateSlug,
        totalMarkets: Object.keys(markets).length,
        totalItems,
        markets,
      },
    });
  }
  return out;
}

async function ensureFirestoreCacheLoaded(preferredStateRaw?: string): Promise<void> {
  const now = Date.now();
  const hasAny = Object.keys(govtCacheStore.markets || {}).length > 0;
  const isFresh = hasAny && now - (govtCacheStore.updatedAt || 0) < GOVT_CACHE_FRESH_MS;

  if (preferredStateRaw) {
    const stateSlug = getStateSlugKey(preferredStateRaw);
    const hasState = Object.values(govtCacheStore.markets || {}).some(
      (m) => getStateSlugKey(m.state) === stateSlug
    );
    if (!hasState && now - lastFirestoreCacheCheckAt >= FIRESTORE_CACHE_POLL_MS) {
      try {
        const stateRemote = await getRemoteFirestoreDoc<any>('_metadata', `mandi_cache_${stateSlug}`);
        if (stateRemote?.markets && typeof stateRemote.markets === 'object') {
          const merged = mergeMarketCaches(govtCacheStore.markets || {}, stateRemote.markets);
          saveGovtCacheToDisk({
            version: Number(stateRemote.version) || govtCacheStore.version || 1,
            updatedAt: Math.max(govtCacheStore.updatedAt || 0, Number(stateRemote.updatedAt) || now),
            syncSource: String(stateRemote.syncSource || 'firestore_state_cache'),
            totalRawRecords: Number(stateRemote.totalItems) || govtCacheStore.totalRawRecords || 0,
            markets: merged,
          });
        }
      } catch {
        // Non-fatal
      }
    }
  }

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

async function ensureSyncStatusLoaded(force: boolean = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastSyncStatusPollAt < FIRESTORE_CACHE_POLL_MS && syncStatusStore.lastSyncAt > 0) {
    return;
  }
  lastSyncStatusPollAt = now;
  try {
    const remote = await getRemoteFirestoreDoc<Partial<MandiSyncStatusStore>>('_metadata', 'mandi_sync_status');
    if (remote && typeof remote === 'object') {
      if ((Number(remote.lastSyncAt) || 0) >= (syncStatusStore.lastSyncAt || 0)) {
        const merged: MandiSyncStatusStore = {
          ...syncStatusStore,
          ...remote,
          syncHistory: Array.isArray(remote.syncHistory) ? remote.syncHistory.slice(0, 20) : syncStatusStore.syncHistory,
        };
        saveSyncStatusToDisk(merged);
      }
    }
  } catch {
    // Non-fatal
  }
}

function getCurrentIstDateScore(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date());
  const dd = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);
  const mm = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const yyyy = parseInt(parts.find((p) => p.type === 'year')?.value || '2026', 10);
  return yyyy * 10000 + mm * 100 + dd;
}

async function lookupSharedGovtCache(
  rawState: string,
  rawDistrict: string,
  rawMandi: string
): Promise<{ items: ServerMandiItem[]; sourceDate: string; marketLabel: string; isFreshToday: boolean } | null> {
  await ensureFirestoreCacheLoaded(rawState);

  const markets = govtCacheStore.markets || {};
  const entries = Object.values(markets);
  if (entries.length === 0) return null;

  const cacheAgeMs = govtCacheStore.updatedAt ? Date.now() - govtCacheStore.updatedAt : Infinity;
  if (cacheAgeMs > 48 * 60 * 60 * 1000) {
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
    const todayScore = getCurrentIstDateScore();
    const isFreshToday =
      (bestMatch.dateScore || 0) >= todayScore && cacheAgeMs < 6 * 60 * 60 * 1000;
    return {
      items: bestMatch.items,
      sourceDate: bestMatch.sourceDate || formatIndianDate(),
      marketLabel: bestMatch.market,
      isFreshToday,
    };
  }
  return null;
}

// Helper to query OGD AGMARKNET API with pagination & rate-limit tracking
async function fetchOgdRecords(params: {
  apiKey: string;
  limit?: number;
  offset?: number;
  stateFilter?: string;
  districtFilter?: string;
  marketFilter?: string;
  timeoutMs?: number;
}): Promise<{ records: any[]; total?: number; httpStatus: number; rateLimitRemaining?: number | null }> {
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

    const remainingHeader = res.headers.get('x-ratelimit-remaining');
    const rateLimitRemaining = remainingHeader !== null && remainingHeader !== '' && Number.isFinite(Number(remainingHeader))
      ? Number(remainingHeader)
      : null;

    if (!res.ok) {
      return { records: [], httpStatus: res.status, rateLimitRemaining };
    }

    const json: any = await res.json();
    const records = Array.isArray(json?.records) ? json.records : Array.isArray(json?.data) ? json.data : [];
    return {
      records,
      total: Number(json?.total) || records.length,
      httpStatus: res.status,
      rateLimitRemaining,
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function fetchPaginatedOgdRecords(params: {
  apiKey: string;
  targetLimit: number;
  stateFilter?: string;
  timeoutMs?: number;
}): Promise<{
  records: any[];
  httpStatus: number;
  rateLimitRemaining: number | null;
}> {
  const pageSize = Math.min(1000, Math.max(1, params.targetLimit));
  let combinedRaw: any[] = [];
  let offset = 0;
  let lastStatus = 200;
  let lastRemaining: number | null = null;

  while (combinedRaw.length < params.targetLimit) {
    const remaining = params.targetLimit - combinedRaw.length;
    const batchLimit = Math.min(pageSize, remaining);
    const resPage = await fetchOgdRecords({
      apiKey: params.apiKey,
      limit: batchLimit,
      offset,
      stateFilter: params.stateFilter || 'ALL',
      timeoutMs: params.timeoutMs || 10000,
    });

    lastStatus = resPage.httpStatus;
    if (resPage.rateLimitRemaining !== undefined && resPage.rateLimitRemaining !== null) {
      lastRemaining = resPage.rateLimitRemaining;
    }

    if (resPage.httpStatus !== 200) {
      if (combinedRaw.length === 0) {
        return { records: [], httpStatus: resPage.httpStatus, rateLimitRemaining: lastRemaining };
      }
      break;
    }

    if (resPage.records.length === 0) break;
    combinedRaw = combinedRaw.concat(resPage.records);
    if (resPage.records.length < batchLimit) break;
    offset += batchLimit;
  }

  return {
    records: combinedRaw,
    httpStatus: lastStatus,
    rateLimitRemaining: lastRemaining,
  };
}

// Strict Zero-User-API-Call Rule: Public farmer requests NEVER call data.gov.in directly.
// Official data.gov.in OGD syncing runs ONLY via 10x/day Cron (/api/cron/mandi-sync) and verified Admin (/api/admin/mandi/sync).

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

// Zero-Cost Policy: Server-side Paid AI fallback removed cleanly so zero AI billing risk exists.

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

  await Promise.all([
    ensureFirestoreCacheLoaded(),
    ensureSyncStatusLoaded(true),
  ]);

  const { key, source } = getActiveGovtApiKey();
  const cacheStats = getCacheSummaryStats();
  const historyMarketsCount = Object.values(mandiHistoryByState).reduce(
    (sum, b) => sum + Object.keys(b.markets || {}).length,
    0
  );

  res.json({
    success: true,
    configured: Boolean(key),
    keySource: source,
    maskedKey: maskApiKey(key),
    enabled: govtConfig.enabled,
    defaultLimit: govtConfig.defaultLimit,
    syncStateFilter: govtConfig.syncStateFilter,
    lastSyncAt: syncStatusStore.lastSyncAt || govtConfig.lastSyncAt || 0,
    lastSuccessfulSyncAt: syncStatusStore.lastSuccessfulSyncAt || govtConfig.lastSyncAt || 0,
    lastSyncStatus: syncStatusStore.lastSyncStatus !== 'never' ? syncStatusStore.lastSyncStatus : (govtConfig.lastSyncStatus || 'never'),
    lastSyncSource: govtConfig.lastSyncSource || syncStatusStore.lastSyncTrigger || 'none',
    lastSyncMessage: syncStatusStore.lastSyncMessage || govtConfig.lastSyncMessage || '',
    lastError: syncStatusStore.lastError || '',
    lastSyncRecordsCount: govtConfig.lastSyncRecordsCount || 0,
    nextScheduledSyncAt: computeNextScheduledSyncAt(),
    consecutiveFailures: syncStatusStore.consecutiveFailures || 0,
    rateLimitRemaining: syncStatusStore.rateLimitRemaining ?? null,
    serviceAccountConfigured: hasServerFirestoreWriteAccess(),
    cronSecretConfigured: Boolean((process.env.CRON_SYNC_SECRET || '').trim()),
    historyMarketsCount,
    syncHistory: syncStatusStore.syncHistory || [],
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

  const limit = Math.min(10000, Math.max(1, Number(req.query.limit) || govtConfig.defaultLimit || 3000));
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
        rateLimitRemaining: result.rateLimitRemaining ?? null,
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
        ? 'यह क्लाउड सर्वर भारत से बाहर स्थित होने के कारण data.gov.in ने डायरेक्ट सर्वर कनेक्शन ब्लॉक किया है। भारत-आधारित सर्वर (जैसे Vercel Mumbai) पर यह स्वतः चालू रहता है; तब तक MandiPulse लाइव बैकअप सक्रिय है।'
        : `कनेक्शन जांच विफल: ${err?.message || 'Network Error'}`,
    });
  }
};

async function maybeSendAdminFailureAlert(params: {
  reasonTitle: string;
  errorDetails: string;
  consecutiveFailures: number;
  rateLimitRemaining: number | null;
}): Promise<void> {
  if (!mandiAlertMailer) return;
  const now = Date.now();
  if (syncStatusStore.lastAlertSentAt && now - syncStatusStore.lastAlertSentAt < ALERT_COOLDOWN_MS) {
    return;
  }

  try {
    const res = await mandiAlertMailer({
      to: ADMIN_ALERT_EMAIL,
      subject: `फल्सावदिया कृषि बाजार अलर्ट: मंडी सिंक चेतावनी (${params.reasonTitle})`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px;">
          <h2 style="color: #991b1b; margin-top: 0;">मंडी भाव ऑटो-सिंक चेतावनी</h2>
          <p><strong>कारण:</strong> ${params.reasonTitle}</p>
          <p><strong>तकनीकी विवरण:</strong> ${params.errorDetails}</p>
          <p><strong>लगातार विफल प्रयास:</strong> ${params.consecutiveFailures}</p>
          <p><strong>शेष API कोटा (यदि उपलब्ध):</strong> ${params.rateLimitRemaining ?? 'अज्ञात'}</p>
          <p><strong>समय:</strong> ${formatIndianTime(new Date(now))}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
          <p style="font-size: 12px; color: #6b7280;">किसानों के लिए ऐप में MandiPulse लाइव बैकअप व पिछला साझा कैश सुरक्षित रूप से चालू है।</p>
        </div>
      `,
      text: `मंडी भाव ऑटो-सिंक चेतावनी: ${params.reasonTitle} | ${params.errorDetails}`,
    });

    if (res.success) {
      saveSyncStatusToDisk({
        ...syncStatusStore,
        lastAlertSentAt: now,
      });
    }
  } catch (err) {
    console.warn('[Mandi Alert Mailer] Failed sending alert email:', err);
  }
}

async function executeFullGovtMandiSync(options: {
  trigger: 'auto_cron' | 'admin_manual';
  apiKey: string;
  targetLimit: number;
  stateFilter: string;
  persistToFirestoreServer: boolean;
}): Promise<{
  success: boolean;
  noChange?: boolean;
  blockedFromServer?: boolean;
  statusCode?: number;
  message: string;
  error?: string;
  rawCount: number;
  newMarketsCount: number;
  updatedMarketsCount: number;
  unchangedCount: number;
  rateLimitRemaining: number | null;
  firestorePublished?: boolean;
  firestorePublishError?: string;
  firestoreCacheDoc?: any;
  stateCacheDocs?: Array<{ docId: string; payload: any }>;
  historyDocs?: Array<{ docId: string; payload: any }>;
  syncStatusDoc?: MandiSyncStatusStore;
}> {
  const startMs = Date.now();

  if (isLocalSyncInFlight) {
    return {
      success: false,
      statusCode: 409,
      message: 'एक मंडी सिंक प्रक्रिया पहले से चल रही है। कृपया कुछ सेकंड प्रतीक्षा करें।',
      error: 'Sync already in flight',
      rawCount: 0,
      newMarketsCount: 0,
      updatedMarketsCount: 0,
      unchangedCount: 0,
      rateLimitRemaining: syncStatusStore.rateLimitRemaining,
    };
  }

  await Promise.all([ensureFirestoreCacheLoaded(), ensureSyncStatusLoaded(true)]);

  // Distributed lock check (across serverless invocations)
  if (syncStatusStore.inProgressUntil && Date.now() < syncStatusStore.inProgressUntil) {
    return {
      success: false,
      statusCode: 409,
      message: 'अन्य सर्वर इंस्टेंस पर सिंक अभी सक्रिय है। डुप्लिकेट API कॉल रोकी गई।',
      error: 'Distributed sync lock active',
      rawCount: 0,
      newMarketsCount: 0,
      updatedMarketsCount: 0,
      unchangedCount: 0,
      rateLimitRemaining: syncStatusStore.rateLimitRemaining,
    };
  }

  isLocalSyncInFlight = true;
  const lockExpiresAt = Date.now() + SYNC_LOCK_TTL_MS;
  saveSyncStatusToDisk({ ...syncStatusStore, inProgressUntil: lockExpiresAt });

  try {
    const resFetch = await fetchPaginatedOgdRecords({
      apiKey: options.apiKey,
      targetLimit: options.targetLimit,
      stateFilter: options.stateFilter,
      timeoutMs: 10000,
    });

    const durationMs = Date.now() - startMs;

    if (resFetch.httpStatus !== 200) {
      const errReason =
        resFetch.httpStatus === 429
          ? 'सरकारी API की दर सीमा (HTTP 429 Too Many Requests) पूरी हो गई।'
          : resFetch.httpStatus === 401 || resFetch.httpStatus === 403
          ? `सरकारी API Key अमान्य या ब्लॉक हुई (HTTP ${resFetch.httpStatus})।`
          : `सरकारी OGD API ने HTTP ${resFetch.httpStatus} त्रुटि दी।`;

      const failures = (syncStatusStore.consecutiveFailures || 0) + 1;
      const historyEntry: MandiSyncHistoryEntry = {
        timestamp: Date.now(),
        trigger: options.trigger,
        status: 'error',
        rawRecords: 0,
        newMarketsCount: 0,
        updatedMarketsCount: 0,
        unchangedCount: 0,
        durationMs,
        message: errReason,
        error: `HTTP ${resFetch.httpStatus}`,
        rateLimitRemaining: resFetch.rateLimitRemaining ?? undefined,
      };

      const nextStatus: MandiSyncStatusStore = {
        ...syncStatusStore,
        lastSyncAt: Date.now(),
        lastSyncStatus: 'error',
        lastSyncTrigger: options.trigger,
        lastSyncMessage: errReason,
        lastError: `HTTP ${resFetch.httpStatus}: ${errReason}`,
        nextScheduledSyncAt: computeNextScheduledSyncAt(),
        inProgressUntil: 0,
        consecutiveFailures: failures,
        rateLimitRemaining: resFetch.rateLimitRemaining,
        syncHistory: [historyEntry, ...(syncStatusStore.syncHistory || [])].slice(0, 20),
      };

      saveSyncStatusToDisk(nextStatus);
      saveGovtConfigToDisk({
        lastSyncAt: Date.now(),
        lastSyncStatus: 'error',
        lastSyncMessage: errReason,
      });

      if (options.persistToFirestoreServer && hasServerFirestoreWriteAccess()) {
        await setRemoteFirestoreDocDetailed('_metadata', 'mandi_sync_status', nextStatus);
      }

      if (resFetch.httpStatus === 429 || resFetch.httpStatus === 401 || resFetch.httpStatus === 403 || failures >= 3) {
        await maybeSendAdminFailureAlert({
          reasonTitle: `HTTP ${resFetch.httpStatus}`,
          errorDetails: errReason,
          consecutiveFailures: failures,
          rateLimitRemaining: resFetch.rateLimitRemaining,
        });
      }

      return {
        success: false,
        blockedFromServer: false,
        statusCode: 200,
        message: errReason,
        error: errReason,
        rawCount: 0,
        newMarketsCount: 0,
        updatedMarketsCount: 0,
        unchangedCount: 0,
        rateLimitRemaining: resFetch.rateLimitRemaining,
        syncStatusDoc: nextStatus,
      };
    }

    if (resFetch.records.length === 0) {
      const emptyMsg = 'सरकारी API से इस समय कोई नया मंडी रिकॉर्ड प्राप्त नहीं हुआ (पिछला वैध डेटा सुरक्षित है)।';
      const staleHours = syncStatusStore.lastSuccessfulSyncAt
        ? (Date.now() - syncStatusStore.lastSuccessfulSyncAt) / (60 * 60 * 1000)
        : 0;
      const historyEntry: MandiSyncHistoryEntry = {
        timestamp: Date.now(),
        trigger: options.trigger,
        status: 'no_change',
        rawRecords: 0,
        newMarketsCount: 0,
        updatedMarketsCount: 0,
        unchangedCount: Object.keys(govtCacheStore.markets || {}).length,
        durationMs,
        message: emptyMsg,
        rateLimitRemaining: resFetch.rateLimitRemaining ?? undefined,
      };
      const nextStatus: MandiSyncStatusStore = {
        ...syncStatusStore,
        lastSyncAt: Date.now(),
        lastSyncStatus: 'no_change',
        lastSyncTrigger: options.trigger,
        lastSyncMessage: emptyMsg,
        lastError: '',
        nextScheduledSyncAt: computeNextScheduledSyncAt(),
        inProgressUntil: 0,
        rateLimitRemaining: resFetch.rateLimitRemaining,
        syncHistory: [historyEntry, ...(syncStatusStore.syncHistory || [])].slice(0, 20),
      };
      saveSyncStatusToDisk(nextStatus);

      if (options.persistToFirestoreServer && hasServerFirestoreWriteAccess()) {
        await setRemoteFirestoreDocDetailed('_metadata', 'mandi_sync_status', nextStatus);
      }

      if (staleHours >= 48) {
        await maybeSendAdminFailureAlert({
          reasonTitle: '48+ घंटे से नया सरकारी डेटा नहीं',
          errorDetails: emptyMsg,
          consecutiveFailures: syncStatusStore.consecutiveFailures || 0,
          rateLimitRemaining: resFetch.rateLimitRemaining,
        });
      }

      return {
        success: true,
        noChange: true,
        message: emptyMsg,
        rawCount: 0,
        newMarketsCount: 0,
        updatedMarketsCount: 0,
        unchangedCount: Object.keys(govtCacheStore.markets || {}).length,
        rateLimitRemaining: resFetch.rateLimitRemaining,
        syncStatusDoc: nextStatus,
      };
    }

    const prevMarkets = govtCacheStore.markets || {};
    const normalizedNew = normalizeRawOgdRecordsToMarkets(resFetch.records);
    const mergedMarkets = mergeMarketCaches(prevMarkets, normalizedNew);
    const delta = computeMarketDeltaAndHash(prevMarkets, normalizedNew, mergedMarkets);

    const isSameHash =
      Boolean(syncStatusStore.dataHash) &&
      syncStatusStore.dataHash === delta.dataHash &&
      !delta.hasMeaningfulChange;

    // Even if prices didn't change since last sync, ensure centralized history is up-to-date
    const historyResult = updateCentralizedHistoryFromMarkets(normalizedNew);

    const newStore: GovtMandiCacheStore = {
      version: isSameHash ? govtCacheStore.version || 1 : (govtCacheStore.version || 1) + 1,
      updatedAt: Date.now(),
      syncSource: options.trigger === 'auto_cron' ? 'auto_cron' : 'server_ogd',
      totalRawRecords: resFetch.records.length,
      markets: mergedMarkets,
    };

    saveGovtCacheToDisk(newStore);
    mandiCache.clear();

    const firestoreCacheDoc = buildCompactFirestoreCacheDoc(newStore);
    const stateCacheDocs = buildStateCacheDocs(newStore);
    const historyDocs = historyResult.changedStateSlugs
      .map((slug) => buildCompactStateHistoryDoc(slug))
      .filter((d): d is { docId: string; payload: StateMandiHistoryBucket } => Boolean(d));

    const summaryMsg = isSameHash
      ? `सरकारी पोर्टल जाँचा गया (${resFetch.records.length} रिकॉर्ड) — भाव पहले से अप-टू-डेट हैं (कोई नया बदलाव नहीं)।`
      : `नए: ${delta.newMarketsCount} मंडियाँ • अपडेट: ${delta.updatedMarketsCount} मंडियाँ • अपरिवर्तित: ${delta.unchangedCount} (${resFetch.records.length} रिकॉर्ड)।`;

    const historyEntry: MandiSyncHistoryEntry = {
      timestamp: Date.now(),
      trigger: options.trigger,
      status: isSameHash ? 'no_change' : 'success',
      rawRecords: resFetch.records.length,
      newMarketsCount: delta.newMarketsCount,
      updatedMarketsCount: delta.updatedMarketsCount,
      unchangedCount: delta.unchangedCount,
      durationMs,
      message: summaryMsg,
      rateLimitRemaining: resFetch.rateLimitRemaining ?? undefined,
    };

    const nextStatus: MandiSyncStatusStore = {
      ...syncStatusStore,
      lastSyncAt: Date.now(),
      lastSuccessfulSyncAt: Date.now(),
      lastSyncStatus: isSameHash ? 'no_change' : 'success',
      lastSyncTrigger: options.trigger,
      lastSyncMessage: summaryMsg,
      lastError: '',
      nextScheduledSyncAt: computeNextScheduledSyncAt(),
      inProgressUntil: 0,
      dataHash: delta.dataHash,
      consecutiveFailures: 0,
      rateLimitRemaining: resFetch.rateLimitRemaining,
      syncHistory: [historyEntry, ...(syncStatusStore.syncHistory || [])].slice(0, 20),
    };

    saveSyncStatusToDisk(nextStatus);
    saveGovtConfigToDisk({
      lastSyncAt: Date.now(),
      lastSyncStatus: isSameHash ? 'no_change' : 'success',
      lastSyncSource: options.trigger === 'auto_cron' ? 'auto_cron' : 'server_ogd',
      lastSyncRecordsCount: resFetch.records.length,
      lastSyncMessage: summaryMsg,
    });

    let firestorePublished = false;
    let firestorePublishError: string | undefined;

    if (options.persistToFirestoreServer) {
      if (hasServerFirestoreWriteAccess()) {
        try {
          if (!isSameHash) {
            const mainWrite = await setRemoteFirestoreDocDetailed('_metadata', 'mandi_govt_cache', firestoreCacheDoc);
            if (!mainWrite.ok) {
              firestorePublishError = mainWrite.error || `HTTP ${mainWrite.status}`;
            } else {
              firestorePublished = true;
            }
            for (const sDoc of stateCacheDocs) {
              await setRemoteFirestoreDocDetailed('_metadata', sDoc.docId, sDoc.payload);
            }
          } else {
            firestorePublished = true;
          }

          for (const hDoc of historyDocs) {
            await setRemoteFirestoreDocDetailed('_metadata', hDoc.docId, hDoc.payload);
          }

          await setRemoteFirestoreDocDetailed('_metadata', 'mandi_sync_status', nextStatus);
        } catch (fsErr: any) {
          firestorePublishError = fsErr?.message || 'Firestore write failed';
        }
      } else {
        firestorePublishError = 'FIREBASE_SERVICE_ACCOUNT_JSON सेट न होने से सर्वर-साइड Firestore लेखन छोड़ा गया';
      }
    }

    return {
      success: true,
      noChange: isSameHash,
      message: summaryMsg,
      rawCount: resFetch.records.length,
      newMarketsCount: delta.newMarketsCount,
      updatedMarketsCount: delta.updatedMarketsCount,
      unchangedCount: delta.unchangedCount,
      rateLimitRemaining: resFetch.rateLimitRemaining,
      firestorePublished,
      firestorePublishError,
      firestoreCacheDoc,
      stateCacheDocs,
      historyDocs,
      syncStatusDoc: nextStatus,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startMs;
    const errMsg = String(err?.cause?.code || err?.code || err?.message || '');
    const isBlocked =
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('ETIMEDOUT') ||
      errMsg.includes('ENOTFOUND') ||
      errMsg.includes('fetch failed') ||
      errMsg.includes('AbortError');

    const readableErr = isBlocked
      ? 'क्लाउड सर्वर भारत के बाहर होने से data.gov.in ने कनेक्शन ब्लॉक किया (Vercel Mumbai bom1 आवश्यक)'
      : err?.message || 'सिंक करने में नेटवर्क त्रुटि हुई';

    const failures = (syncStatusStore.consecutiveFailures || 0) + 1;
    const historyEntry: MandiSyncHistoryEntry = {
      timestamp: Date.now(),
      trigger: options.trigger,
      status: isBlocked ? 'blocked' : 'error',
      rawRecords: 0,
      newMarketsCount: 0,
      updatedMarketsCount: 0,
      unchangedCount: 0,
      durationMs,
      message: readableErr,
      error: errMsg || readableErr,
    };

    const nextStatus: MandiSyncStatusStore = {
      ...syncStatusStore,
      lastSyncAt: Date.now(),
      lastSyncStatus: isBlocked ? 'blocked' : 'error',
      lastSyncTrigger: options.trigger,
      lastSyncMessage: readableErr,
      lastError: readableErr,
      nextScheduledSyncAt: computeNextScheduledSyncAt(),
      inProgressUntil: 0,
      consecutiveFailures: failures,
      syncHistory: [historyEntry, ...(syncStatusStore.syncHistory || [])].slice(0, 20),
    };

    saveSyncStatusToDisk(nextStatus);
    saveGovtConfigToDisk({
      lastSyncAt: Date.now(),
      lastSyncStatus: isBlocked ? 'blocked' : 'error',
      lastSyncMessage: readableErr,
    });

    if (options.persistToFirestoreServer && hasServerFirestoreWriteAccess()) {
      await setRemoteFirestoreDocDetailed('_metadata', 'mandi_sync_status', nextStatus);
    }

    if (failures >= 3) {
      await maybeSendAdminFailureAlert({
        reasonTitle: isBlocked ? 'Server IP Block' : 'Sync Network Error',
        errorDetails: readableErr,
        consecutiveFailures: failures,
        rateLimitRemaining: syncStatusStore.rateLimitRemaining,
      });
    }

    return {
      success: false,
      blockedFromServer: isBlocked,
      message: readableErr,
      error: readableErr,
      rawCount: 0,
      newMarketsCount: 0,
      updatedMarketsCount: 0,
      unchangedCount: 0,
      rateLimitRemaining: syncStatusStore.rateLimitRemaining,
      syncStatusDoc: nextStatus,
    };
  } finally {
    isLocalSyncInFlight = false;
  }
}

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

  const targetLimit = Math.min(10000, Math.max(1, Number(req.body?.limit) || govtConfig.defaultLimit || 3000));
  const stateFilter = typeof req.body?.stateFilter === 'string' ? req.body.stateFilter.trim() : govtConfig.syncStateFilter;

  const result = await executeFullGovtMandiSync({
    trigger: 'admin_manual',
    apiKey: activeKey,
    targetLimit,
    stateFilter,
    persistToFirestoreServer: hasServerFirestoreWriteAccess(),
  });

  if (!result.success) {
    res.json({
      success: false,
      blockedFromServer: Boolean(result.blockedFromServer),
      error: result.error || result.message,
      syncStatusDoc: result.syncStatusDoc,
    });
    return;
  }

  const stats = getCacheSummaryStats();
  res.json({
    success: true,
    noChange: Boolean(result.noChange),
    message: result.message,
    rawCount: result.rawCount,
    newMarketsCount: result.newMarketsCount,
    updatedMarketsCount: result.updatedMarketsCount,
    unchangedCount: result.unchangedCount,
    rateLimitRemaining: result.rateLimitRemaining,
    firestoreCacheDoc: result.firestoreCacheDoc,
    stateCacheDocs: result.stateCacheDocs,
    historyDocs: result.historyDocs,
    syncStatusDoc: result.syncStatusDoc,
    ...stats,
  });
};

/**
 * Authenticated Cron Endpoint for Zero-Cost GitHub Actions Scheduler (10x/day IST)
 */
export const handleCronMandiSync = async (req: Request, res: Response): Promise<void> => {
  const configuredSecret = (process.env.CRON_SYNC_SECRET || '').trim();
  if (!configuredSecret) {
    res.status(503).json({
      success: false,
      error: 'CRON_SYNC_SECRET एनवायरनमेंट वेरिएबल सेट नहीं है।',
    });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const providedSecret = (bearerMatch ? bearerMatch[1] : (req.headers['x-cron-secret'] as string) || '').trim();

  if (!providedSecret || providedSecret !== configuredSecret) {
    res.status(401).json({
      success: false,
      error: 'अनधिकृत Cron अनुरोध: अमान्य Secret।',
    });
    return;
  }

  const { key: activeKey } = getActiveGovtApiKey();
  if (!activeKey) {
    res.status(400).json({
      success: false,
      error: 'DATA_GOV_IN_API_KEY सेट नहीं है।',
    });
    return;
  }

  const result = await executeFullGovtMandiSync({
    trigger: 'auto_cron',
    apiKey: activeKey,
    targetLimit: Math.min(10000, Math.max(1, Number(process.env.MANDI_CRON_LIMIT) || govtConfig.defaultLimit || 3000)),
    stateFilter: (process.env.MANDI_CRON_STATE || govtConfig.syncStateFilter || 'Madhya Pradesh').trim(),
    persistToFirestoreServer: true,
  });

  if (!result.success) {
    res.status(result.statusCode || 500).json({
      success: false,
      blockedFromServer: Boolean(result.blockedFromServer),
      error: result.error || result.message,
      rateLimitRemaining: result.rateLimitRemaining,
    });
    return;
  }

  res.json({
    success: true,
    noChange: Boolean(result.noChange),
    message: result.message,
    rawCount: result.rawCount,
    newMarketsCount: result.newMarketsCount,
    updatedMarketsCount: result.updatedMarketsCount,
    unchangedCount: result.unchangedCount,
    firestorePublished: Boolean(result.firestorePublished),
    firestorePublishError: result.firestorePublishError || null,
    rateLimitRemaining: result.rateLimitRemaining,
    nextScheduledSyncAt: result.syncStatusDoc?.nextScheduledSyncAt || computeNextScheduledSyncAt(),
  });
};

/**
 * Public Lightweight Endpoint: Returns 30-day centralized Govt history for ONLY the selected mandi (~5-12 KB).
 */
export const handleGetMandiHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawState = (req.query.state as string) || 'मध्यप्रदेश (Madhya Pradesh)';
    const rawDistrict = (req.query.district as string) || 'मंदसौर (Mandsaur)';
    const rawMandi = (req.query.mandi as string) || 'शामगढ़ (Shamgarh)';
    const stateSlug = getStateSlugKey(rawState);

    const cacheKey = `hist_${stateSlug}_${normalizeNoSpace(rawDistrict)}_${normalizeNoSpace(rawMandi)}`;
    const now = Date.now();
    const cached = historyApiCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200');
      res.json(cached.data);
      return;
    }

    // Load from Firestore _metadata/mandi_history_{stateSlug} if missing or stale (> 15m)
    const lastPoll = lastHistoryStatePollAt[stateSlug] || 0;
    if (!mandiHistoryByState[stateSlug] || now - lastPoll > FIRESTORE_CACHE_POLL_MS) {
      lastHistoryStatePollAt[stateSlug] = now;
      const remoteHist = await getRemoteFirestoreDoc<StateMandiHistoryBucket>(
        '_metadata',
        `mandi_history_${stateSlug}`
      );
      if (remoteHist && remoteHist.markets && typeof remoteHist.markets === 'object') {
        mandiHistoryByState[stateSlug] = remoteHist;
        saveHistoryCacheToDisk();
      }
    }

    const bucket = mandiHistoryByState[stateSlug];
    if (!bucket || !bucket.markets) {
      res.json({ success: true, isAuthentic: false, daysCount: 0, commodities: {} });
      return;
    }

    let matchedCrops: Record<string, string[]> | null = null;
    for (const [mktKey, crops] of Object.entries(bucket.markets)) {
      const [distPart = '', mktPart = ''] = mktKey.split('|');
      const dOk = checkLocationMatch(distPart, rawDistrict, 'district').match;
      const mOk = checkLocationMatch(mktPart, rawMandi, 'mandi').match;
      if (dOk && mOk) {
        matchedCrops = crops;
        break;
      }
    }

    if (!matchedCrops) {
      const emptyPayload = { success: true, isAuthentic: false, daysCount: 0, commodities: {} };
      historyApiCache.set(cacheKey, { data: emptyPayload, timestamp: now });
      res.json(emptyPayload);
      return;
    }

    const commoditiesOut: Record<
      string,
      Array<{
        date: string;
        fullDate: string;
        price: number;
        minPrice: number;
        maxPrice: number;
        change: number;
        changePercent: number;
      }>
    > = {};

    let maxDays = 0;

    for (const [cropName, rows] of Object.entries(matchedCrops)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const points: any[] = [];
      let prevPrice = 0;

      for (const rowStr of rows) {
        const [scoreStr, avgStr, minStr, maxStr] = String(rowStr).split('|');
        const score = parseInt(scoreStr || '0', 10);
        const avg = parseInt(avgStr || '0', 10);
        const minP = parseInt(minStr || '0', 10) || avg;
        const maxP = parseInt(maxStr || '0', 10) || avg;
        if (!score || avg <= 0) continue;

        const y = Math.floor(score / 10000);
        const m = Math.floor((score % 10000) / 100);
        const d = score % 100;
        const fullDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hindiDateLabel = `${String(d).padStart(2, '0')} ${SERVER_HINDI_MONTHS[m - 1] || ''}`.trim();

        const change = points.length === 0 ? 0 : avg - prevPrice;
        const changePercent = prevPrice > 0 ? parseFloat(((change / prevPrice) * 100).toFixed(1)) : 0;

        points.push({
          date: hindiDateLabel,
          fullDate,
          price: avg,
          minPrice: minP,
          maxPrice: maxP,
          change,
          changePercent,
        });
        prevPrice = avg;
      }

      if (points.length > 0) {
        commoditiesOut[cropName] = points;
        if (points.length > maxDays) maxDays = points.length;
      }
    }

    const responsePayload = {
      success: true,
      isAuthentic: maxDays > 0,
      daysCount: maxDays,
      commodities: commoditiesOut,
    };

    historyApiCache.set(cacheKey, { data: responsePayload, timestamp: now });
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200');
    res.json(responsePayload);
  } catch (err: any) {
    res.json({ success: false, isAuthentic: false, daysCount: 0, commodities: {}, error: err?.message });
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
// Strict Zero-User-API-Call Rule: NEVER calls data.gov.in directly!
// ==========================================
export const handleGetMandiPrices = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawState = (req.query.state as string) || 'मध्यप्रदेश (Madhya Pradesh)';
    const rawDistrict = (req.query.district as string) || 'मंदसौर (Mandsaur)';
    const rawMandi = (req.query.mandi as string) || 'शामगढ़ (Shamgarh)';

    const cacheKey = `mandi_${normalizeNoSpace(rawState)}_${normalizeNoSpace(rawDistrict)}_${normalizeNoSpace(rawMandi)}`;
    const now = Date.now();

    const cached = mandiCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
      res.json({
        success: true,
        cached: true,
        data: cached.data,
      });
      return;
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
      res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
      res.json({ success: true, data: responseData });
    };

    // Tier 1: Shared Govt Cache (populated exclusively by 10x/day Auto-Cron & Admin Sync)
    const sharedMatch = govtConfig.enabled
      ? await lookupSharedGovtCache(rawState, rawDistrict, rawMandi)
      : null;

    if (sharedMatch && sharedMatch.items.length > 0 && sharedMatch.isFreshToday) {
      console.log(`[Mandi Route Success] Shared Govt Cache hit (${sharedMatch.items.length} crops) for ${rawMandi}`);
      sendGovtSuccess(
        sharedMatch.items,
        sharedMatch.sourceDate,
        'सरकारी पोर्टल (AGMARKNET OGD साझा कैश) से प्राप्त प्रमाणित दैनिक दरें'
      );
      return;
    }

    // Tier 2: Dedicated Backup -> Mandi Pulse (mandipulse.com) (Strict State + District + Mandi match, zero data.gov.in load)
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
        statusMessage: 'सरकारी पोर्टल साझा कैश प्रतीक्षारत होने पर मंडी पल्स (MandiPulse.com) से प्राप्त सत्यापित लाइव भाव',
      };

      mandiCache.set(cacheKey, { data: responseData, timestamp: now });
      res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
      res.json({ success: true, data: responseData });
      return;
    }

    // Tier 3: Recent Shared Govt Cache fallback (keeps latest verified govt rates available up to 10 days)
    if (sharedMatch && sharedMatch.items.length > 0) {
      console.log(`[Mandi Route Success] Recent Shared Govt Cache fallback for ${rawMandi} (${sharedMatch.sourceDate})`);
      sendGovtSuccess(
        sharedMatch.items,
        sharedMatch.sourceDate,
        'सरकारी पोर्टल (AGMARKNET OGD साझा कैश) से प्राप्त नवीनतम उपलब्ध दरें'
      );
      return;
    }

    // Tier 4: Clean empty response (zero data.gov.in call, zero paid AI fallback)
    console.log(`[Mandi Route Complete] No official records in cache/backup for ${rawMandi}. Returning clean empty state.`);
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

    const emptyCacheDurationMs = 3 * 60 * 1000;
    mandiCache.set(cacheKey, { data: cleanEmptyDetails, timestamp: now - (CACHE_TTL_MS - emptyCacheDurationMs) });
    res.setHeader('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=300');
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

export function clearMandiMemoryCaches(): void {
  mandiCache.clear();
  historyApiCache.clear();
  lastFirestoreCacheCheckAt = 0;
  for (const k of Object.keys(lastHistoryStatePollAt)) {
    delete lastHistoryStatePollAt[k];
  }
}

