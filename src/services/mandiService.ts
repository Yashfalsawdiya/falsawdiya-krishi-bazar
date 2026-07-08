import { GoogleGenAI } from "@google/genai";
import { getFriendlyAiError } from "../utils/aiErrorHandler";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey;
  
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export interface MandiHistoryItem {
  date: string;
  price: number;
}

export interface MandiItem {
  commodity: string;
  minPrice: string;
  maxPrice: string;
  avgPrice: string;
  unit: string;
  history?: MandiHistoryItem[];
}

export interface MandiData {
  mandiName: string;
  date: string;
  items: MandiItem[];
}

export async function fetchMandiBhav(mandiName: string = "Shamgarh", userApiKey?: string): Promise<MandiData> {
  const now = new Date();
  const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });

  // Helper for generating fallback dates
  const getPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString('hi-IN', { day: '2-digit', month: 'short' });
  };

  const generateHistory = (basePrice: number, days: number = 30) => {
    const history: MandiHistoryItem[] = [];
    let currentPrice = basePrice;
    for (let i = days; i >= 0; i--) {
      const change = (Math.random() - 0.45) * 50; // Slight upward bias
      currentPrice = Math.round(currentPrice + change);
      history.push({
        date: i === 0 ? "आज" : getPastDate(i),
        price: currentPrice
      });
    }
    return history;
  };

  const sanitizeMandiData = (data: MandiData): MandiData => {
    if (!data.items) return data;
    
    data.items = data.items.map(item => {
      const avg = parseInt(item.avgPrice) || 0;
      // Always regenerate or ensure history exists client-side to keep AI response small
      if (!item.history || item.history.length === 0) {
        return {
          ...item,
          history: generateHistory(avg, 30)
        };
      }
      
      // Ensure prices are numbers
      item.history = item.history.map(h => ({
        ...h,
        price: typeof h.price === 'string' ? parseInt(h.price) : h.price
      }));

      // If history is too short, pad it
      if (item.history.length < 30) {
        const lastPrice = item.history[0]?.price || avg;
        const pads = generateHistory(lastPrice, 30 - item.history.length);
        item.history = [...pads, ...item.history];
      }

      return item;
    });
    return data;
  };

  // 1. Check Cache First
  const CACHE_KEY = `mandi_bhav_${mandiName}_v2`; 
  const CACHE_TIME_KEY = `${CACHE_KEY}_timestamp`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for fresh data

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  // If we have cached data, we can decide to return it immediately
  // Especially if it's relatively fresh
  if (cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime);
    if (age < CACHE_DURATION) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed && parsed.items && parsed.items.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn("Error parsing cached Mandi Bhav data:", e);
      }
    }
  }

  // 2. Fallback Data (Comprehensive list as requested)
  const getFallbackItems = (mandi: string) => {
    const items = [
      { commodity: "सोयाबीन", minPrice: "4200", maxPrice: "4850", avgPrice: "4550", unit: "क्विंटल" },
      { commodity: "गेहूं", minPrice: "2350", maxPrice: "2850", avgPrice: "2600", unit: "क्विंटल" },
      { commodity: "चना", minPrice: "5200", maxPrice: "5600", avgPrice: "5400", unit: "क्विंटल" },
      { commodity: "मक्का", minPrice: "1900", maxPrice: "2200", avgPrice: "2050", unit: "क्विंटल" },
      { commodity: "सरसों", minPrice: "5000", maxPrice: "5800", avgPrice: "5400", unit: "क्विंटल" },
      { commodity: "मूंग", minPrice: "7000", maxPrice: "8500", avgPrice: "7800", unit: "क्विंटल" },
      { commodity: "उड़द", minPrice: "6500", maxPrice: "8000", avgPrice: "7200", unit: "क्विंटल" },
      { commodity: "मसूर", minPrice: "5800", maxPrice: "6400", avgPrice: "6100", unit: "क्विंटल" },
      { commodity: "लहसुन", minPrice: "7500", maxPrice: "18000", avgPrice: "12500", unit: "क्विंटल" },
      { commodity: "प्याज", minPrice: "800", maxPrice: "2400", avgPrice: "1600", unit: "क्विंटल" },
      { commodity: "धनिया", minPrice: "6000", maxPrice: "7500", avgPrice: "6800", unit: "क्विंटल" },
      { commodity: "कपास", minPrice: "6500", maxPrice: "7800", avgPrice: "7200", unit: "क्विंटल" },
      { commodity: "मूंगफली", minPrice: "5500", maxPrice: "6800", avgPrice: "6200", unit: "क्विंटल" },
      { commodity: "तुअर", minPrice: "9000", maxPrice: "11000", avgPrice: "10000", unit: "क्विंटल" },
      { commodity: "जौ", minPrice: "1800", maxPrice: "2100", avgPrice: "1950", unit: "क्विंटल" },
      { commodity: "मेथी", minPrice: "5000", maxPrice: "6200", avgPrice: "5600", unit: "क्विंटल" }
    ];

    // Add some random variation based on mandi name
    const seed = mandi.length;
    return items.map(item => {
      const variation = (seed % 5) * 50 - 100;
      const avg = parseInt(item.avgPrice) + variation;
      return {
        ...item,
        avgPrice: avg.toString(),
        minPrice: (avg - 300).toString(),
        maxPrice: (avg + 300).toString(),
        history: generateHistory(avg, 30)
      };
    });
  };

  const fallbackData: MandiData = {
    mandiName: mandiName,
    date: `${dateStr} ${timeStr}`,
    items: getFallbackItems(mandiName)
  };

  try {
    const ai = getAI(userApiKey);
    if (!ai) {
      // If no API key, return cache even if expired, or fallback
      if (cachedData) return JSON.parse(cachedData);
      return sanitizeMandiData(fallbackData);
    }
    
    const prompt = `आज ${dateStr} के लिए मध्य प्रदेश की ${mandiName} मंडी के नवीनतम मंडी भाव (Market Prices) प्रदान करें। 
    कृपया 'Mandi Pulse', 'Agmarknet' और स्थानीय विश्वसनीय समाचार स्रोतों से डेटा खोजें।
    निम्नलिखित 16 प्रमुख फसलों के भाव अनिवार्य रूप से शामिल करें: गेहूं, सोयाबीन, चना, मक्का, सरसों, मूंग, उड़द, मसूर, प्याज, लहसुन, धनिया, कपास, मूंगफली, तुअर, जौ, मेथी।
    
    नियम:
    - डेटा केवल JSON फॉर्मैट में हो।
    - सभी नाम हिंदी में हों।
    - मंदसौर ज़िले की मंडियों (जैसे शामगढ़, गरोठ, सीतामऊ) के लिए Mandi Pulse जैसे सटीक स्रोतों का उपयोग करें।
    - यदि किसी फसल का सटीक भाव न मिले, तो पिछला उपलब्ध या औसत भाव दें।
    - इतिहास (history) देने की ज़रूरत नहीं है।`;

    const schema = {
      type: "OBJECT" as any,
      properties: {
        mandiName: { type: "STRING" },
        date: { type: "STRING" },
        items: {
          type: "ARRAY" as any,
          items: {
            type: "OBJECT" as any,
            properties: {
              commodity: { type: "STRING" },
              minPrice: { type: "STRING" },
              maxPrice: { type: "STRING" },
              avgPrice: { type: "STRING" },
              unit: { type: "STRING" }
            },
            required: ["commodity", "minPrice", "maxPrice", "avgPrice", "unit"]
          }
        }
      },
      required: ["mandiName", "date", "items"]
    };

    let response;
    try {
      console.log(`Fetching Mandi Bhav for ${mandiName} with Search...`);
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Mandi Bhav Reporter for Madhya Pradesh representing 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar). Instructions: Search for the latest mandi prices specifically for the given location using reliable sources like 'Mandi Pulse', 'e-Mandi', or official MP gov data. Focus on accuracy for Mandsaur district mandis (शामगढ़, गरोठ, सीतामऊ). Always return accurate JSON data. STRICT RULE: Use ONLY 'फल्सावदिया कृषि बाज़ार' for the shop name. Do NOT use 'फालसावदिया' (no extra aa matra after pha).",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
    } catch (searchError) {
      console.warn("Mandi Search failed, using status knowledge...", searchError);
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Mandi Bhav Reporter representing 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar) in Shamgarh, MP. Provide estimated Mandi Bhav for given location in JSON. Always use the name 'फल्सावदिया कृषि बाज़ार' when referring to the shop.",
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
    }

    const data = sanitizeMandiData(JSON.parse(response.text));

    // Save to Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());

    return data;
  } catch (error: any) {
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    const isQuotaError = friendlyError.type === 'quota';
    
    if (isQuotaError) {
      console.warn("Gemini API Quota Exceeded for Mandi Bhav. Using fallback.");
    } else {
      console.warn("Critical error fetching Mandi Bhav:", error);
    }

    // If we have any cached data at all (even if expired), use it as a better fallback than static data
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }
    
    return sanitizeMandiData(fallbackData);
  }
}
