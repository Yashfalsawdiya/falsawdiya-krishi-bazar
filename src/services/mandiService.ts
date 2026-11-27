import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { MandiItem, MandiDetails } from "../data/mandiData";
import { formatHindiDate, formatHindiTime, HINDI_MONTHS } from "../lib/dateUtils";
import { MandiHistoryPoint } from "../utils/mandiHistoryManager";
import { withCdnEpoch } from "../utils/cdnCacheBuster";

// Backwards compatibility types
export type { MandiItem, MandiDetails as MandiData };

// Location and word normalization helpers for client-side fallback
const CLIENT_LOCATION_ALIASES: Record<string, string[]> = {
  'chhattisgarh': ['chattisgarh'],
  'chattisgarh': ['chhattisgarh'],
  'odisha': ['orissa'],
  'orissa': ['odisha'],
  'bengaluru': ['bangalore'],
  'bangalore': ['bengaluru'],
  'belgaum': ['belgavi', 'belagavi'],
  'belgavi': ['belgaum', 'belagavi'],
  'narmadapuram': ['hoshangabad'],
  'hoshangabad': ['narmadapuram'],
  'delhincr': ['delhi', 'nctofdelhi'],
  'newdelhi': ['delhi', 'nctofdelhi'],
  'pipliya': ['pipaliya', 'pipliamandi'],
  'shamgarh': ['samgarh'],
};

function normalizeClientWord(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0919\u091e\u0923\u0928\u092e]\u094d/g, '\u0902')
    .replace(/\(.*?\)/g, ' ')
    .replace(/apmc|mandi|f&amp;v|f&v|उपमंडी|मंडी|एपीएमसी|कृषि उपज मंडी|कृषि मंडी/gi, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanClientLocation(val: string): { hindi: string; english: string } {
  if (!val) return { hindi: '', english: '' };
  const parts = val.split(' (');
  const hindi = parts[0].trim();
  const english = parts[1] ? parts[1].replace(')', '').trim() : hindi;
  return { hindi, english };
}

function getClientStateSlug(stateEnglish: string): string {
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

function checkClientLocationMatch(candidate: string | undefined | null, targetFull: string): boolean {
  if (!candidate || !candidate.trim()) return false;
  const candNorm = normalizeClientWord(candidate);
  const candNoSpace = candNorm.replace(/\s+/g, '');
  const target = cleanClientLocation(targetFull);
  const targetEnNorm = normalizeClientWord(target.english);
  const targetHiNorm = normalizeClientWord(target.hindi);
  const targetEnNoSpace = targetEnNorm.replace(/\s+/g, '');
  const targetHiNoSpace = targetHiNorm.replace(/\s+/g, '');

  const aliasKeys = [targetEnNoSpace, targetHiNoSpace];
  for (const k of [targetEnNoSpace, targetHiNoSpace]) {
    if (CLIENT_LOCATION_ALIASES[k]) aliasKeys.push(...CLIENT_LOCATION_ALIASES[k]);
  }

  if (candNorm === targetEnNorm || candNorm === targetHiNorm) return true;
  if (aliasKeys.includes(candNoSpace)) return true;

  const candWords = candNorm.split(' ').filter((w) => w.length >= 3);
  const targetWords = [...targetEnNorm.split(' '), ...targetHiNorm.split(' ')].filter((w) => w.length >= 3);

  for (const tw of targetWords) {
    if (candWords.includes(tw)) return true;
    if (tw.length >= 4 && (candNorm.includes(tw) || tw.includes(candNorm))) return true;
  }
  return false;
}

const CLIENT_COMMODITY_MAP: Record<string, string> = {
  'bengal gram (gram)(whole)': 'चना (साबुत)',
  'bengal gram': 'चना (साबुत)',
  'kabuli chana': 'काबुली चना',
  'black gram': 'उड़द',
  'green gram': 'मूंग',
  'red gram': 'तुअर (अरहर)',
  'pigeon pea': 'तुअर (अरहर)',
  'green chilli': 'हरी मिर्च',
  'red chilli': 'लाल मिर्च',
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
  'fenugreek': 'मेथी',
  'methi': 'मेथी',
  'lentil': 'मसूर',
  'masoor': 'मसूर',
  'peanut': 'मूंगफली',
  'groundnut': 'मूंगफली',
  'arhar': 'तुअर',
  'tur': 'तुअर',
  'gram': 'चना',
  'chana': 'चना',
  'sesamum': 'तिल',
  'sesame': 'तिल',
  'cumin': 'जीरा',
  'isabgol': 'ईसबगोल',
  'barley': 'जौ',
  'jowar': 'ज्वार',
  'bajra': 'बाजरा',
  'paddy': 'धान',
  'rice': 'चावल',
};

const SORTED_CLIENT_COMMODITIES = Object.entries(CLIENT_COMMODITY_MAP).sort(
  ([a], [b]) => b.length - a.length
);

function normalizeClientCommodity(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [key, val] of SORTED_CLIENT_COMMODITIES) {
    if (lower.includes(key)) return val;
  }
  return name.trim();
}

const SHARED_GOVT_CACHE_LS_KEY = 'mandi_shared_govt_cache_v1';
const SHARED_GOVT_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MANDI_HISTORY_LS_PREFIX = 'mandi_central_hist_v1_';
const MANDI_HISTORY_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Fallback lookup against shared Firestore `_metadata/mandi_cache_{stateSlug}` and `_metadata/mandi_govt_cache`
 * (cached locally in localStorage for 2 hours so 10 lakh farmers cost near ₹0 reads).
 */
async function fetchClientSharedGovtCache(
  state: string,
  district: string,
  mandi: string
): Promise<MandiDetails | null> {
  try {
    const { english: stateEnglish } = cleanClientLocation(state);
    const stateSlug = getClientStateSlug(stateEnglish);
    const stateLsKey = `${SHARED_GOVT_CACHE_LS_KEY}_${stateSlug}`;

    let cacheDoc: any = null;

    // Try state-wise cache first (smaller, complete for selected state)
    if (stateSlug) {
      try {
        const rawStateLs = localStorage.getItem(stateLsKey);
        if (rawStateLs) {
          const parsed = JSON.parse(rawStateLs);
          if (parsed && parsed.fetchedAt && Date.now() - parsed.fetchedAt < SHARED_GOVT_CACHE_TTL_MS && parsed.doc?.markets) {
            cacheDoc = parsed.doc;
          }
        }
      } catch {}

      if (!cacheDoc) {
        const stateSnap = await getDoc(doc(db, '_metadata', `mandi_cache_${stateSlug}`)).catch(() => null);
        if (stateSnap && stateSnap.exists()) {
          cacheDoc = stateSnap.data();
          try {
            localStorage.setItem(stateLsKey, JSON.stringify({ fetchedAt: Date.now(), doc: cacheDoc }));
          } catch {}
        }
      }
    }

    // Fallback to primary combined govt cache
    if (!cacheDoc) {
      const rawLs = localStorage.getItem(SHARED_GOVT_CACHE_LS_KEY);
      if (rawLs) {
        const parsed = JSON.parse(rawLs);
        if (parsed && parsed.fetchedAt && Date.now() - parsed.fetchedAt < SHARED_GOVT_CACHE_TTL_MS && parsed.doc?.markets) {
          cacheDoc = parsed.doc;
        }
      }

      if (!cacheDoc) {
        const snap = await getDoc(doc(db, '_metadata', 'mandi_govt_cache')).catch(() => null);
        if (snap && snap.exists()) {
          cacheDoc = snap.data();
          try {
            localStorage.setItem(
              SHARED_GOVT_CACHE_LS_KEY,
              JSON.stringify({ fetchedAt: Date.now(), doc: cacheDoc })
            );
          } catch {}
        }
      }
    }

    const markets = cacheDoc?.markets ? Object.values(cacheDoc.markets) : [];
    if (!Array.isArray(markets) || markets.length === 0) return null;

    let bestEntry: any = null;
    for (const entry of markets as any[]) {
      const sOk = checkClientLocationMatch(entry.state, state);
      const dOk = checkClientLocationMatch(entry.district, district);
      const mOk = checkClientLocationMatch(entry.market, mandi);
      if (sOk && dOk && mOk && Array.isArray(entry.items) && entry.items.length > 0) {
        if (!bestEntry || (entry.dateScore || 0) > (bestEntry.dateScore || 0)) {
          bestEntry = entry;
        }
      }
    }

    if (bestEntry) {
      const now = new Date();
      return {
        mandiName: mandi,
        district,
        state,
        date: formatHindiDate(bestEntry.sourceDate || now),
        items: bestEntry.items,
        sourceType: 'govt',
        sourceName: 'AGMARKNET (भारत सरकार OGD डेटासेट)',
        sourceDate: formatHindiDate(bestEntry.sourceDate || now),
        fetchedAt: `${formatHindiDate(now)}, ${formatHindiTime(now)}`,
        isLive: true,
        isEstimated: false,
        statusMessage: 'सरकारी पोर्टल (AGMARKNET OGD साझा कैश) से प्राप्त प्रमाणित दैनिक दरें',
      };
    }
  } catch {
    // Non-fatal fallback
  }
  return null;
}

/**
 * Direct browser fallback to MandiPulse API using CORS (access-control-allow-origin: *).
 * Kept intact as verified backup when Government sources are unavailable!
 */
async function fetchClientMandiPulse(
  state: string,
  district: string,
  mandi: string
): Promise<MandiDetails | null> {
  try {
    const { english: stateEnglish } = cleanClientLocation(state);
    const { english: districtEnglish } = cleanClientLocation(district);
    const { english: mandiEnglish } = cleanClientLocation(mandi);

    const stateSlug = getClientStateSlug(stateEnglish);
    const mandiSlug = mandiEnglish.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const distSlug = districtEnglish.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const marketSlug = `${stateSlug}-${distSlug}-${mandiSlug}-apmc`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://mandipulse.com/embed/data?type=market-prices&market=${marketSlug}&language=hi`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const rawItems = Array.isArray(json?.items) ? json.items : [];
    if (rawItems.length === 0) return null;

    const items: MandiItem[] = [];
    const seen = new Set<string>();
    const formattedReportDate = formatHindiDate(json.updated_at || new Date());

    for (const it of rawItems) {
      const rawName = (it.name || it.commodity || '').trim();
      if (!rawName) continue;
      const cropName = normalizeClientCommodity(rawName);

      const stateOk = checkClientLocationMatch(it.state, state);
      const distOk = checkClientLocationMatch(it.district, district);
      const mandiOk = checkClientLocationMatch(it.market, mandi);

      if (!stateOk || !distOk || !mandiOk) continue;
      if (seen.has(cropName)) continue;
      seen.add(cropName);

      const minP = Math.round(Number(it.min_price) || 0);
      const maxP = Math.round(Number(it.max_price) || 0);
      const modalP = Math.round(Number(it.modal_price) || 0);
      if (modalP <= 0 && minP <= 0 && maxP <= 0) continue;

      const effectiveModal = modalP || Math.round((minP + maxP) / 2) || minP || maxP;
      const effectiveMin = minP || effectiveModal;
      const effectiveMax = maxP || effectiveModal;

      items.push({
        commodity: cropName,
        minPrice: effectiveMin.toString(),
        maxPrice: effectiveMax.toString(),
        avgPrice: effectiveModal.toString(),
        unit: 'क्विंटल',
        arrival: it.arrival ? `${it.arrival} बोरी` : 'मंडी आवक',
        quality: it.variety && String(it.variety).toLowerCase() !== 'other' ? it.variety : 'मानक गुणवत्ता (FAQ)',
        lastUpdated: formatHindiDate(it.updated_at || json.updated_at || new Date()),
      });
    }

    if (items.length > 0) {
      console.log(`[Mandi Client] Direct Browser Backup found ${items.length} records in MandiPulse for ${mandi}`);
      const now = new Date();
      return {
        mandiName: mandi,
        district,
        state,
        date: formattedReportDate,
        items,
        sourceType: 'mandipulse',
        sourceName: 'मंडी पल्स (MandiPulse.com)',
        sourceDate: formattedReportDate,
        fetchedAt: `${formatHindiDate(now)}, ${formatHindiTime(now)}`,
        isLive: true,
        isEstimated: false,
        statusMessage: 'सरकारी पोर्टल पर डेटा न मिलने पर मंडी पल्स (MandiPulse.com) बैकअप से प्राप्त सत्यापित लाइव भाव',
      };
    }
  } catch {
    // Silent fallback
  }
  return null;
}

/**
 * Fetches Mandi Bhav for a specific State, District, and Mandi.
 * 1. Local cache (< 30 minutes, only if items > 0).
 * 2. Backend server route `/api/mandi/prices` (Shared Govt Cache -> Live Govt OGD -> MandiPulse Backup -> Gemini).
 * 3. Client Shared Govt Cache fallback (`_metadata/mandi_govt_cache` cached 2h in localStorage).
 * 4. Browser-Direct MandiPulse Backup via CORS.
 * 5. Honest empty state (`sourceType: 'unavailable'`).
 */
export async function fetchMandiBhav(
  stateOrMandi: string = "मध्यप्रदेश (Madhya Pradesh)",
  districtOrApiKey?: string,
  mandiName?: string,
  _userApiKey?: string,
  forceRefresh: boolean = false
): Promise<MandiDetails> {
  const now = new Date();

  let state = "मध्यप्रदेश (Madhya Pradesh)";
  let district = "मंदसौर (Mandsaur)";
  let mandi = "शामगढ़ (Shamgarh)";

  if (mandiName === undefined) {
    const legacyMandi = stateOrMandi;

    if (legacyMandi.toLowerCase().includes("shamgarh") || legacyMandi.includes("शामगढ़")) {
      mandi = "शामगढ़ (Shamgarh)";
      district = "मंदसौर (Mandsaur)";
      state = "मध्यप्रदेश (Madhya Pradesh)";
    } else if (legacyMandi.toLowerCase().includes("garoth") || legacyMandi.includes("गरोठ")) {
      mandi = "गरोठ (Garoth)";
      district = "मंदसौर (Mandsaur)";
      state = "मध्यप्रदेश (Madhya Pradesh)";
    } else if (legacyMandi.toLowerCase().includes("sitamau") || legacyMandi.includes("सीतामऊ")) {
      mandi = "सीतामऊ (Sitamau)";
      district = "मंदसौर (Mandsaur)";
      state = "मध्यप्रदेश (Madhya Pradesh)";
    } else if (legacyMandi.toLowerCase().includes("mandsaur") || legacyMandi.includes("मंदसौर")) {
      mandi = "मंदसौर (Mandsaur)";
      district = "मंदसौर (Mandsaur)";
      state = "मध्यप्रदेश (Madhya Pradesh)";
    } else if (legacyMandi.toLowerCase().includes("neemuch") || legacyMandi.includes("नीमच")) {
      mandi = "नीमच (Neemuch)";
      district = "नीमच (Neemuch)";
      state = "मध्यप्रदेश (Madhya Pradesh)";
    } else if (legacyMandi.toLowerCase().includes("ratlam") || legacyMandi.includes("रतलाम")) {
      mandi = "रतलाम (Ratlam)";
      district = "रतलाम (Ratlam)";
      state = "मध्यप्रदेश (Madhya Pradesh)";
    } else {
      mandi = legacyMandi;
    }
  } else {
    state = stateOrMandi;
    district = districtOrApiKey || "मंदसौर (Mandsaur)";
    mandi = mandiName;
  }

  const cacheKey = `mandi_v2_${state}_${district}_${mandi}`.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, '_');
  const cacheTimeKey = `${cacheKey}_timestamp`;
  const cacheDuration = 2 * 60 * 60 * 1000; // 2 hours client cache

  const cachedData = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);

  // 1. Return cached data if fresh and CONTAINS ITEMS
  if (!forceRefresh && cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime, 10);
    if (age < cacheDuration) {
      try {
        const parsed: MandiDetails = JSON.parse(cachedData);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          return parsed;
        }
      } catch {
        // Ignore corrupted cache
      }
    }
  }

  // 2. Primary Strategy: Call Server Backend (/api/mandi/prices — CDN & Shared Cache only, zero data.gov.in user calls)
  try {
    const queryParams = new URLSearchParams({
      state,
      district,
      mandi,
    });

    const serverRes = await fetch(withCdnEpoch(`/api/mandi/prices?${queryParams.toString()}`));
    if (serverRes.ok) {
      const serverJson = await serverRes.json();
      if (serverJson.success && serverJson.data) {
        const liveData: MandiDetails = serverJson.data;

        if (Array.isArray(liveData.items) && liveData.items.length > 0) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(liveData));
            localStorage.setItem(cacheTimeKey, now.getTime().toString());
          } catch {}
          return liveData;
        }
      }
    }
  } catch (serverErr) {
    console.warn("[Mandi Client] Server endpoint error:", serverErr);
  }

  // 3. Secondary Govt Strategy: Shared Govt Cache doc `_metadata/mandi_govt_cache`
  const sharedGovtData = await fetchClientSharedGovtCache(state, district, mandi);
  if (sharedGovtData && sharedGovtData.items.length > 0) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(sharedGovtData));
      localStorage.setItem(cacheTimeKey, now.getTime().toString());
    } catch {}
    return sharedGovtData;
  }

  // 4. Verified Backup Strategy: Browser-Direct MandiPulse Fallback via CORS
  const directMandiPulseData = await fetchClientMandiPulse(state, district, mandi);
  if (directMandiPulseData && directMandiPulseData.items.length > 0) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(directMandiPulseData));
      localStorage.setItem(cacheTimeKey, now.getTime().toString());
    } catch {}
    return directMandiPulseData;
  }

  // 5. Honest empty state (never falsely mark empty state as 'govt')
  return {
    mandiName: mandi,
    district,
    state,
    date: formatHindiDate(now),
    items: [],
    sourceType: 'unavailable',
    sourceName: 'आधिकारिक मंडी रिकॉर्ड (AGMARKNET / MandiPulse)',
    sourceDate: formatHindiDate(now),
    fetchedAt: `${formatHindiDate(now)}, ${formatHindiTime(now)}`,
    isLive: false,
    isEstimated: false,
    statusMessage: `${mandi} (${district.split(' (')[0]}, ${state.split(' (')[0]}) मंडी के लिए आज का आधिकारिक डेटा उपलब्ध नहीं है।`,
  };
}

export interface MandiHistoryResponse {
  success: boolean;
  isAuthentic: boolean;
  daysCount: number;
  commodities: Record<string, MandiHistoryPoint[]>;
}

/**
 * Fetches 30-day centralized Govt history for ONLY the selected mandi (~5-12 KB).
 * Caches locally for 4 hours, with Firestore `_metadata/mandi_history_{stateSlug}` fallback.
 */
export async function fetchMandiHistory(
  state: string,
  district: string,
  mandi: string,
  forceRefresh: boolean = false
): Promise<MandiHistoryResponse> {
  const lsKey = `${MANDI_HISTORY_LS_PREFIX}${state}_${district}_${mandi}`
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, '_');

  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.fetchedAt && Date.now() - parsed.fetchedAt < MANDI_HISTORY_TTL_MS && parsed.payload) {
          return parsed.payload;
        }
      }
    } catch {}
  }

  try {
    const qs = new URLSearchParams({ state, district, mandi });
    const res = await fetch(withCdnEpoch(`/api/mandi/history?${qs.toString()}`));
    if (res.ok) {
      const data: MandiHistoryResponse = await res.json();
      if (data.success && data.isAuthentic) {
        try {
          localStorage.setItem(lsKey, JSON.stringify({ fetchedAt: Date.now(), payload: data }));
        } catch {}
      }
      return data;
    }
  } catch {}

  // Fallback directly to Firestore state history bucket if API route unavailable
  try {
    const { english: stateEnglish } = cleanClientLocation(state);
    const stateSlug = getClientStateSlug(stateEnglish);
    if (stateSlug) {
      const snap = await getDoc(doc(db, '_metadata', `mandi_history_${stateSlug}`));
      if (snap.exists()) {
        const bucket = snap.data() as { markets?: Record<string, Record<string, string[]>> };
        let matchedCrops: Record<string, string[]> | null = null;
        for (const [mktKey, crops] of Object.entries(bucket?.markets || {})) {
          const [distPart = '', mktPart = ''] = mktKey.split('|');
          if (checkClientLocationMatch(distPart, district) && checkClientLocationMatch(mktPart, mandi)) {
            matchedCrops = crops;
            break;
          }
        }
        if (matchedCrops) {
          const commodities: Record<string, MandiHistoryPoint[]> = {};
          let maxDays = 0;
          for (const [cropName, rows] of Object.entries(matchedCrops)) {
            if (!Array.isArray(rows) || rows.length === 0) continue;
            const points: MandiHistoryPoint[] = [];
            let prev = 0;
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
              const date = `${String(d).padStart(2, '0')} ${HINDI_MONTHS[m - 1] || ''}`.trim();
              const change = points.length === 0 ? 0 : avg - prev;
              const changePercent = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(1)) : 0;
              points.push({ date, fullDate, price: avg, minPrice: minP, maxPrice: maxP, change, changePercent });
              prev = avg;
            }
            if (points.length > 0) {
              commodities[cropName] = points;
              if (points.length > maxDays) maxDays = points.length;
            }
          }
          const payload: MandiHistoryResponse = {
            success: true,
            isAuthentic: maxDays > 0,
            daysCount: maxDays,
            commodities,
          };
          if (maxDays > 0) {
            try {
              localStorage.setItem(lsKey, JSON.stringify({ fetchedAt: Date.now(), payload }));
            } catch {}
          }
          return payload;
        }
      }
    }
  } catch {}

  return { success: false, isAuthentic: false, daysCount: 0, commodities: {} };
}

export function clearClientMandiLocalCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('mandi_v2_') ||
          k.startsWith(SHARED_GOVT_CACHE_LS_KEY) ||
          k.startsWith(MANDI_HISTORY_LS_PREFIX))
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/**
 * Publishes all Admin sync result docs (primary cache, state caches, 30-day history buckets, sync status) to Firestore.
 */
export async function publishMandiSyncDocsToFirestore(syncResponse: any): Promise<boolean> {
  if (!syncResponse) return false;
  let anySuccess = false;
  const tasks: Promise<void>[] = [];

  if (syncResponse.firestoreCacheDoc?.markets) {
    tasks.push(
      setDoc(doc(db, '_metadata', 'mandi_govt_cache'), syncResponse.firestoreCacheDoc)
        .then(() => { anySuccess = true; })
        .catch(() => {})
    );
  }

  if (syncResponse.stateCacheDocs && typeof syncResponse.stateCacheDocs === 'object') {
    for (const [docId, docPayload] of Object.entries(syncResponse.stateCacheDocs)) {
      if (docPayload) {
        tasks.push(
          setDoc(doc(db, '_metadata', docId), docPayload)
            .then(() => { anySuccess = true; })
            .catch(() => {})
        );
      }
    }
  }

  if (syncResponse.historyDocs && typeof syncResponse.historyDocs === 'object') {
    for (const [docId, docPayload] of Object.entries(syncResponse.historyDocs)) {
      if (docPayload) {
        tasks.push(
          setDoc(doc(db, '_metadata', docId), docPayload)
            .then(() => { anySuccess = true; })
            .catch(() => {})
        );
      }
    }
  }

  if (syncResponse.syncStatusDoc) {
    tasks.push(
      setDoc(doc(db, '_metadata', 'mandi_sync_status'), syncResponse.syncStatusDoc)
        .then(() => { anySuccess = true; })
        .catch(() => {})
    );
  }

  await Promise.all(tasks);
  clearClientMandiLocalCaches();
  return anySuccess;
}

// ==========================================
// ADMIN MANDI GOVT OGD API CLIENT HELPERS
// ==========================================
export interface AdminMandiSyncHistoryItem {
  timestamp: number;
  trigger: 'auto_cron' | 'admin_manual' | 'live_fallback';
  status: 'success' | 'no_change' | 'blocked' | 'error';
  rawCount: number;
  newMarkets: number;
  updatedMarkets: number;
  unchangedMarkets: number;
  message: string;
  error?: string;
}

export interface AdminMandiSettingsResponse {
  success: boolean;
  configured: boolean;
  keySource: 'env' | 'admin' | 'none';
  maskedKey: string;
  enabled: boolean;
  defaultLimit: number;
  syncStateFilter: string;
  lastSyncAt: number;
  lastSuccessfulSyncAt?: number;
  lastSyncStatus: 'success' | 'no_change' | 'blocked' | 'error' | 'never';
  lastSyncSource: string;
  lastSyncMessage: string;
  lastError?: string;
  lastSyncRecordsCount: number;
  nextScheduledSyncAt?: number;
  consecutiveFailures?: number;
  rateLimitRemaining?: number | null;
  serviceAccountConfigured?: boolean;
  cronSecretConfigured?: boolean;
  historyMarketsCount?: number;
  syncHistory?: AdminMandiSyncHistoryItem[];
  updatedAt: number;
  cachedMandisCount: number;
  cachedRecordsCount: number;
  cacheUpdatedAt: number;
  syncSource: string;
  previewMarkets: Array<{
    state: string;
    district: string;
    market: string;
    sourceDate: string;
    cropCount: number;
  }>;
}

async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Admin प्रमाणीकरण सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function getAdminMandiSettings(): Promise<AdminMandiSettingsResponse> {
  const headers = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/mandi/settings', { headers });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'मंडी API सेटिंग्स लोड नहीं हो सकीं।');
  }
  return data;
}

export async function saveAdminMandiSettings(payload: {
  apiKey?: string;
  clearKey?: boolean;
  enabled?: boolean;
  defaultLimit?: number;
  syncStateFilter?: string;
}): Promise<any> {
  const headers = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/mandi/settings', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'सेटिंग्स सेव करने में विफल रहा।');
  }
  return data;
}

export async function testAdminMandiConnection(apiKey?: string): Promise<{
  success: boolean;
  reachable?: boolean;
  blockedFromServer?: boolean;
  message: string;
}> {
  const headers = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/mandi/test-connection', {
    method: 'POST',
    headers,
    body: JSON.stringify(apiKey ? { apiKey } : {}),
  });
  return await res.json();
}

export async function buildAdminMandiSyncUrl(params?: {
  limit?: number;
  state?: string;
  apiKey?: string;
}): Promise<{ success: boolean; syncUrl?: string; error?: string }> {
  const headers = await getAdminAuthHeaders();
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.state) qs.set('state', params.state);
  if (params?.apiKey) qs.set('apiKey', params.apiKey);
  const res = await fetch(`/api/admin/mandi/build-sync-url?${qs.toString()}`, { headers });
  return await res.json();
}

export async function syncAdminMandiGovt(params?: {
  apiKey?: string;
  limit?: number;
  stateFilter?: string;
}): Promise<any> {
  const headers = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/mandi/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify(params || {}),
  });
  return await res.json();
}

export async function importAdminMandiCache(params: {
  rawPayload: any;
  mergeExisting?: boolean;
  sourceLabel?: string;
}): Promise<any> {
  const headers = await getAdminAuthHeaders();
  const res = await fetch('/api/admin/mandi/import-cache', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'डेटा इम्पोर्ट करने में त्रुटि हुई।');
  }
  return data;
}
