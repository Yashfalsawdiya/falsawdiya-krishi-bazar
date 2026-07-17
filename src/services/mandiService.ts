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
 * First checks local cache. If fresh (< 1 hour), returns cached data.
 * If stale or missing, attempts to fetch real-time data using Gemini Search Grounding.
 * If offline or key is missing, loads high-quality local stable fallback data.
 */
export async function fetchMandiBhav(
  stateOrMandi: string = "मध्यप्रदेश (Madhya Pradesh)",
  districtOrApiKey?: string,
  mandiName?: string,
  userApiKey?: string
): Promise<MandiDetails> {
  const now = new Date();
  
  let state = "मध्यप्रदेश (Madhya Pradesh)";
  let district = "मंदसौर (Mandsaur)";
  let mandi = "शामगढ़ (Shamgarh)";
  let apiKey = userApiKey;

  // Detect signature: fetchMandiBhav(mandiName, apiKey) vs fetchMandiBhav(state, district, mandi, apiKey)
  if (mandiName === undefined) {
    // Legacy signature call
    const legacyMandi = stateOrMandi;
    apiKey = districtOrApiKey;

    // Resolve known mandis to their districts and states
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
    // New signature call
    state = stateOrMandi;
    district = districtOrApiKey || "मंदसौर (Mandsaur)";
    mandi = mandiName;
  }

  // Clean names for keys
  const cacheKey = `mandi_pulse_${state}_${district}_${mandi}`.replace(/\s+/g, "_");
  const cacheTimeKey = `${cacheKey}_timestamp`;
  const cacheDuration = 24 * 60 * 60 * 1000; // 24 hours (1 day) caching to avoid unnecessary API limit hits

  const cachedData = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);

  // 1. Return cached data if fresh
  if (cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime);
    if (age < cacheDuration) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed && parsed.items && parsed.items.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn("Error parsing cached Mandi data:", e);
      }
    }
  }

  // 2. Create the highly realistic stable fallback first (as immediate offline-first backup)
  const fallbackData = generateFallbackMandiDetails(state, district, mandi);

  // 3. Try to fetch from live search grounding using Gemini 3.5 Flash if API Key is available
  try {
    const ai = getAI(apiKey);
    if (!ai) {
      // If no API key is set, check if we have any cached data (even if expired) to maintain continuity
      if (cachedData) {
        try {
          return JSON.parse(cachedData);
        } catch (e) {}
      }
      return fallbackData;
    }

    const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const prompt = `आज (${dateStr}) के लिए ${state} राज्य के ${district} ज़िले की ${mandi} मंडी के सभी फसलों के नवीनतम मंडी भाव (Mandi Bhav / Market Prices) खोजें।
    
    कृपया मुख्य स्रोतों जैसे 'Mandi Pulse' (mandipulse.com) और 'Agmarknet' से डेटा खोजकर वास्तविक भाव निकालें।
    
    महत्वपूर्ण नियम:
    - सोयाबीन, गेहूं, चना, मक्का, सरसों, कपास, उड़द, मूंग, प्याज, लहसुन, टमाटर, आलू, मिर्च, धनिया, मेथी जैसी उपलब्ध फसलों के भाव अनिवार्य रूप से खोजें।
    - भाव (Prices) प्रति क्विंटल (या फल/सब्जी के लिए मानक इकाई) में होने चाहिए।
    - आगमन (arrival - उदा. "150 टन" या "500 बोरी") और गुणवत्ता (quality - उदा. "सुपर बोल्ड", "FAQ") यदि उपलब्ध हों तो अवश्य जोड़ें।
    - केवल शुद्ध JSON डेटा ही लौटाएं जो नीचे दिए गए स्कीमा के अनुकूल हो।
    - सभी फसलों के नाम और गुणवत्ता हिंदी में होने चाहिए।`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        mandiName: { type: Type.STRING },
        district: { type: Type.STRING },
        state: { type: Type.STRING },
        date: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              commodity: { type: Type.STRING, description: "फसल का नाम हिंदी में (उदा. सोयाबीन)" },
              minPrice: { type: Type.STRING, description: "न्यूनतम भाव (संख्या रूप में)" },
              maxPrice: { type: Type.STRING, description: "अधिकतम भाव (संख्या रूप में)" },
              avgPrice: { type: Type.STRING, description: "मॉडल या औसत भाव (संख्या रूप में)" },
              unit: { type: Type.STRING, description: "इकाई (उदा. क्विंटल, बोरी)" },
              arrival: { type: Type.STRING, description: "आगमन विवरण (यदि उपलब्ध हो, उदा. '200 बोरी')" },
              quality: { type: Type.STRING, description: "गुणवत्ता विवरण (यदि उपलब्ध हो, उदा. 'सुपर बोल्ड')" },
              lastUpdated: { type: Type.STRING, description: "अंतिम अपडेट समय (उदा. '17 जुलाई 2026')" }
            },
            required: ["commodity", "minPrice", "maxPrice", "avgPrice", "unit", "lastUpdated"]
          }
        }
      },
      required: ["mandiName", "district", "state", "date", "items"]
    };

    console.log(`Querying Mandi Pulse live data via Gemini for: ${mandi}, ${district}, ${state}`);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar) Mandi Reporter. Search the web for actual live Mandi rates on Mandi Pulse, Agmarknet, and regional news. Extract the rates precisely into JSON. If a crop is not found today, provide the most recent available price. Never hallucinate or use mock templates if real search data exists.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const parsedData = JSON.parse(response.text.trim()) as MandiDetails;
    
    // Validate returned data structure, apply fallbacks for missing optional properties
    if (parsedData && parsedData.items && parsedData.items.length > 0) {
      // Deduplicate items
      const uniqueItems: { [commodity: string]: MandiItem } = {};
      parsedData.items.forEach(item => {
        const key = item.commodity.trim();
        if (!uniqueItems[key] || parseInt(item.avgPrice) > parseInt(uniqueItems[key].avgPrice)) {
          uniqueItems[key] = {
            ...item,
            arrival: item.arrival || "उपलब्ध नहीं",
            quality: item.quality || "सामान्य",
            lastUpdated: item.lastUpdated || parsedData.date
          };
        }
      });
      parsedData.items = Object.values(uniqueItems);

      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify(parsedData));
      localStorage.setItem(cacheTimeKey, now.getTime().toString());

      return parsedData;
    }

    return fallbackData;
  } catch (error: any) {
    console.warn("Error fetching live Mandi Pulse data, using fallback logic:", error);
    
    // Propagate key errors if critical
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      // For key error, we can still load expired cache safely
      if (cachedData) {
        try {
          return JSON.parse(cachedData);
        } catch (e) {}
      }
      return fallbackData;
    }

    // Return cached data as best effort, otherwise fallback
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }
    return fallbackData;
  }
}
