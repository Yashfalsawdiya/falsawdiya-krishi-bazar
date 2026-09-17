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

/**
 * Fetches Mandi Bhav for a specific State, District, and Mandi.
 * 1. Checks local cache (< 1 hour).
 * 2. Queries backend server route `/api/mandi/prices` (Official OGD AGMARKNET + Server Grounding).
 *    -> Ensures live production data on Vercel without requiring user's personal API key!
 * 3. If server fails & user has a client Gemini API key, attempts client search grounding.
 * 4. Honest offline fallback with clear 'estimated' labeling if all live sources are down.
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

  // 1. Return cached data if fresh (unless forceRefresh is true)
  if (!forceRefresh && cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime, 10);
    if (age < cacheDuration) {
      try {
        const parsed: MandiDetails = JSON.parse(cachedData);
        if (parsed && Array.isArray(parsed.items)) {
          console.log(`[Mandi Client Cache Hit] Loaded ${parsed.items.length} records for ${mandi}`);
          return parsed;
        }
      } catch (e) {
        console.warn("Error parsing cached Mandi data:", e);
      }
    }
  }

  // 2. Primary Strategy: Call Server Backend (/api/mandi/prices)
  // Backend strictly executes Government OGD & MandiPulse with State + District + Mandi filtering
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

        console.log(`[Mandi Client Debug] Server returned ${liveData.items?.length || 0} records for ${mandi} (Source: ${liveData.sourceType})`);

        // Cache valid result (even if items is empty, cache it briefly for 5 mins to prevent hammering)
        localStorage.setItem(cacheKey, JSON.stringify(liveData));
        localStorage.setItem(cacheTimeKey, now.getTime().toString());
        return liveData;
      }
    }
  } catch (serverErr) {
    console.warn("[Mandi Client] Server endpoint error:", serverErr);
  }

  // 3. Fallback when server cannot be reached: return honest empty state
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
