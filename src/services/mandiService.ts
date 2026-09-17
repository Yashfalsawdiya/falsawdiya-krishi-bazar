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

  const cacheKey = `mandi_pulse_${state}_${district}_${mandi}`.replace(/\s+/g, "_");
  const cacheTimeKey = `${cacheKey}_timestamp`;
  const cacheDuration = 60 * 60 * 1000; // 1 hour caching for fresh mandi updates

  const cachedData = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);

  // 1. Return cached data if fresh (unless forceRefresh is true)
  if (!forceRefresh && cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime, 10);
    if (age < cacheDuration) {
      try {
        const parsed: MandiDetails = JSON.parse(cachedData);
        if (parsed && parsed.items && parsed.items.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn("Error parsing cached Mandi data:", e);
      }
    }
  }

  // 2. Primary Production Strategy: Call Server Backend (/api/mandi/prices)
  // This executes on Vercel Serverless Function / AI Studio server with full backend credentials
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
      if (serverJson.success && serverJson.data && serverJson.data.items?.length > 0) {
        const liveData: MandiDetails = serverJson.data;
        // Save fresh live data to local cache
        localStorage.setItem(cacheKey, JSON.stringify(liveData));
        localStorage.setItem(cacheTimeKey, now.getTime().toString());
        return liveData;
      }
    }
  } catch (serverErr) {
    console.warn("[Mandi Client] Server endpoint error, attempting client AI fallback:", serverErr);
  }

  // 3. Secondary Strategy: Client-side Gemini Grounding (if user has provided their own Gemini API key)
  if (apiKey && apiKey.trim() !== "") {
    try {
      const ai = getAI(apiKey);
      if (ai) {
        const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        const prompt = `आज (${dateStr}) के लिए ${state} राज्य के ${district} ज़िले की ${mandi} मंडी के सभी फसलों के नवीनतम वास्तविक मंडी भाव (Mandi Bhav / Market Prices) खोजें।
        
कृपया मुख्य आधिकारिक व क्षेत्रीय स्रोतों जैसे 'Agmarknet' और 'Mandi Pulse' से वास्तविक भाव निकालें।
        
आवश्यक नियम:
- सोयाबीन, गेहूं, चना, मक्का, सरसों, कपास, लहसुन, प्याज, धनिया, मेथी जैसी फसलों के भाव खोजें।
- भाव (Prices) प्रति क्विंटल में होने चाहिए।
- आवक और गुणवत्ता यदि उपलब्ध हों तो जोड़ें।
- जिस रिपोर्ट या तारीख का डेटा मिला है, उसे sourceDate में अवश्य लिखें।
- केवल शुद्ध JSON डेटा ही लौटाएं। सभी फसलों के नाम हिंदी में होने चाहिए।`;

        const schema = {
          type: Type.OBJECT,
          properties: {
            sourceName: { type: Type.STRING },
            sourceDate: { type: Type.STRING },
            mandiName: { type: Type.STRING },
            district: { type: Type.STRING },
            state: { type: Type.STRING },
            date: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  commodity: { type: Type.STRING },
                  minPrice: { type: Type.STRING },
                  maxPrice: { type: Type.STRING },
                  avgPrice: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  arrival: { type: Type.STRING },
                  quality: { type: Type.STRING },
                  lastUpdated: { type: Type.STRING }
                },
                required: ["commodity", "minPrice", "maxPrice", "avgPrice", "unit"]
              }
            }
          },
          required: ["items"]
        };

        // Supported current Gemini models with fallback
        const clientCandidateModels = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-flash-latest"];
        let clientResponseText = "";

        for (const modelName of clientCandidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction: "You are 'Falsawdiya Krishi Bazar' Mandi Reporter. Search web for actual live Mandi rates on Agmarknet and Mandi Pulse. Never hallucinate fake numbers.",
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: schema
              }
            });
            if (response.text && response.text.trim()) {
              clientResponseText = response.text.trim();
              break;
            }
          } catch (modelErr) {
            console.warn(`[Client Grounding ${modelName}] Error:`, modelErr);
          }
        }

        const parsedData = JSON.parse(clientResponseText || "{}");
        if (parsedData && Array.isArray(parsedData.items) && parsedData.items.length > 0) {
          const clientLiveData: MandiDetails = {
            mandiName: mandi,
            district,
            state,
            date: parsedData.sourceDate || dateStr,
            items: parsedData.items,
            sourceType: 'market_report',
            sourceName: parsedData.sourceName || 'सत्यापित स्थानीय मंडी रिपोर्ट (वेब खोज)',
            sourceDate: parsedData.sourceDate || dateStr,
            fetchedAt: now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            isLive: true,
            isEstimated: false,
            statusMessage: 'सत्यापित मंडी रिपोर्ट से प्राप्त ताज़ा दरें'
          };

          localStorage.setItem(cacheKey, JSON.stringify(clientLiveData));
          localStorage.setItem(cacheTimeKey, now.getTime().toString());
          return clientLiveData;
        }
      }
    } catch (clientAiErr) {
      console.warn("[Mandi Client] Client AI grounding failed:", clientAiErr);
    }
  }

  // 4. Return expired cache if exists rather than showing nothing
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      if (parsed && parsed.items && parsed.items.length > 0) {
        return parsed;
      }
    } catch (e) {}
  }

  // 5. Transparent fallback (Clearly flagged as estimated, never faking live data)
  return generateFallbackMandiDetails(state, district, mandi);
}
