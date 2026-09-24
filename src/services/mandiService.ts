import { GoogleGenAI, Type } from "@google/genai";
import { getFriendlyAiError } from "../utils/aiErrorHandler";
import { MandiItem, MandiDetails, generateFallbackMandiDetails } from "../data/mandiData";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ 
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

// Backwards compatibility types
export type { MandiItem, MandiDetails as MandiData };

// Location and word normalization helpers for client-side direct fallback
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

  if (candNorm === targetEnNorm || candNorm === targetHiNorm) return true;
  if (candNoSpace === targetEnNorm.replace(/\s+/g, '') || candNoSpace === targetHiNorm.replace(/\s+/g, '')) return true;

  const candWords = candNorm.split(' ').filter(w => w.length >= 3);
  const targetWords = [...targetEnNorm.split(' '), ...targetHiNorm.split(' ')].filter(w => w.length >= 3);

  for (const tw of targetWords) {
    if (candWords.includes(tw)) return true;
    if (tw.length >= 4 && (candNorm.includes(tw) || tw.includes(candNorm))) return true;
  }
  return false;
}

const CLIENT_COMMODITY_MAP: Record<string, string> = {
  'bengal gram': 'चना (साबुत)',
  'gram': 'चना',
  'chana': 'चना',
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
  'black gram': 'उड़द',
  'moong': 'मूंग',
  'green gram': 'मूंग',
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
  'peanut': 'मूंगफली',
  'groundnut': 'मूंगफली',
  'arhar': 'तुअर',
  'tur': 'तुअर',
  'sesamum': 'तिल',
  'sesame': 'तिल',
};

function normalizeClientCommodity(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [key, val] of Object.entries(CLIENT_COMMODITY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return name.trim();
}

/**
 * Direct browser fallback to MandiPulse API using CORS (access-control-allow-origin: *).
 * Ensures that even if Vercel serverless function times out or gets challenged by Cloudflare,
 * the client browser in India can retrieve live verified MandiPulse data directly!
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
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const rawItems = Array.isArray(json?.items) ? json.items : [];
    if (rawItems.length === 0) return null;

    const items: MandiItem[] = [];
    const seen = new Set<string>();

    for (const it of rawItems) {
      const rawName = (it.name || it.commodity || '').trim();
      if (!rawName) continue;
      const cropName = normalizeClientCommodity(rawName);

      // Strict validation against selected State, District, and Mandi
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
        quality: it.variety || 'मानक गुणवत्ता (FAQ)',
        lastUpdated: it.updated_at || json.updated_at || 'आज'
      });
    }

    if (items.length > 0) {
      console.log(`[Mandi Client] Direct Browser Fallback found ${items.length} records in MandiPulse for ${mandi}`);
      const now = new Date();
      return {
        mandiName: mandi,
        district,
        state,
        date: json.updated_at || 'आज',
        items,
        sourceType: 'mandipulse',
        sourceName: 'मंडी पल्स (MandiPulse.com)',
        sourceDate: json.updated_at || 'आज',
        fetchedAt: now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        isLive: true,
        isEstimated: false,
        statusMessage: 'सरकारी पोर्टल पर डेटा न मिलने पर मंडी पल्स (MandiPulse.com) से प्राप्त सत्यापित लाइव भाव'
      };
    }
  } catch {
    // MandiPulse is an optional 3rd-party fallback; silently fall through to primary data sources
  }
  return null;
}

/**
 * Fetches Mandi Bhav for a specific State, District, and Mandi.
 * 1. Checks local cache (< 30 minutes, only if items > 0).
 * 2. Queries backend server route `/api/mandi/prices` (Official OGD AGMARKNET + MandiPulse + Gemini Grounding).
 * 3. Browser-Direct MandiPulse Fallback via CORS if server is unavailable or returns 0 records.
 * 4. Transparent offline message if no verified records exist for this exact sub-mandi.
 */
export async function fetchMandiBhav(
  stateOrMandi: string = "मध्यप्रदेश (Madhya Pradesh)",
  districtOrApiKey?: string,
  mandiName?: string,
  userApiKey?: string,
  forceRefresh: boolean = false
): Promise<MandiDetails> {
  const now = new Date();
  
  let state = "मध्यप्रदेश (Madhya Pradesh)";
  let district = "मंदसौर (Mandsaur)";
  let mandi = "शामगढ़ (Shamgarh)";
  let apiKey = userApiKey;

  // Detect signature: fetchMandiBhav(mandiName, apiKey) vs fetchMandiBhav(state, district, mandi, apiKey)
  if (mandiName === undefined) {
    const legacyMandi = stateOrMandi;
    apiKey = districtOrApiKey;

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

  const cacheKey = `mandi_pulse_${state}_${district}_${mandi}`.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, '_');
  const cacheTimeKey = `${cacheKey}_timestamp`;
  const cacheDuration = 30 * 60 * 1000; // 30 minutes caching

  const cachedData = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);

  console.log(`[Mandi Client] Fetching: State="${state}", District="${district}", Mandi="${mandi}", forceRefresh=${forceRefresh}`);

  // 1. Return cached data if fresh and CONTAINS ITEMS (never lock an empty response into cache)
  if (!forceRefresh && cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime, 10);
    if (age < cacheDuration) {
      try {
        const parsed: MandiDetails = JSON.parse(cachedData);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          console.log(`[Mandi Client Cache Hit] Loaded ${parsed.items.length} records for ${mandi}`);
          return parsed;
        }
      } catch (e) {
        console.warn("Error parsing cached Mandi data:", e);
      }
    }
  }

  // 2. Primary Strategy: Call Server Backend (/api/mandi/prices)
  try {
    const queryParams = new URLSearchParams({
      state,
      district,
      mandi,
      forceRefresh: forceRefresh ? 'true' : 'false'
    });

    const serverRes = await fetch(`/api/mandi/prices?${queryParams.toString()}`);
    if (serverRes.ok) {
      const serverJson = await serverRes.json();
      if (serverJson.success && serverJson.data) {
        const liveData: MandiDetails = serverJson.data;

        // Only cache and return if server returned actual matching records
        if (Array.isArray(liveData.items) && liveData.items.length > 0) {
          console.log(`[Mandi Client] Server returned ${liveData.items.length} records for ${mandi} (Source: ${liveData.sourceType})`);
          localStorage.setItem(cacheKey, JSON.stringify(liveData));
          localStorage.setItem(cacheTimeKey, now.getTime().toString());
          return liveData;
        }
      }
    }
  } catch (serverErr) {
    console.warn("[Mandi Client] Server endpoint error:", serverErr);
  }

  // 3. Secondary Strategy: Browser-Direct MandiPulse Fallback via CORS
  // If server is on Vercel and was cold-started or blocked by Cloudflare,
  // the client browser in India can fetch directly from MandiPulse without restrictions!
  console.log(`[Mandi Client] Attempting Browser-Direct MandiPulse fallback for ${mandi}...`);
  const directMandiPulseData = await fetchClientMandiPulse(state, district, mandi);
  if (directMandiPulseData && directMandiPulseData.items.length > 0) {
    localStorage.setItem(cacheKey, JSON.stringify(directMandiPulseData));
    localStorage.setItem(cacheTimeKey, now.getTime().toString());
    return directMandiPulseData;
  }

  // 4. Honest empty state when neither Server nor MandiPulse has data for this exact mandi
  // NEVER show fake data or data from other mandis!
  const emptyStateData: MandiDetails = {
    mandiName: mandi,
    district,
    state,
    date: 'आज',
    items: [],
    sourceType: 'govt',
    sourceName: 'आधिकारिक मंडी रिकॉर्ड (AGMARKNET / MandiPulse)',
    sourceDate: 'आज',
    fetchedAt: now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    isLive: false,
    isEstimated: false,
    statusMessage: `${mandi} (${district.split(' (')[0]}, ${state.split(' (')[0]}) मंडी के लिए आज का आधिकारिक डेटा उपलब्ध नहीं है।`
  };

  return emptyStateData;
}
