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
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  if (cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime);
    if (age < CACHE_DURATION) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        console.warn("Error parsing cached Mandi Bhav data:", e);
      }
    }
  }

  // 2. Fallback Data
  const fallbackData: MandiData = {
    mandiName: mandiName,
    date: `${dateStr} ${timeStr}`,
    items: [
      { commodity: "सोयाबीन", minPrice: "4200", maxPrice: "4850", avgPrice: "4550", unit: "क्विंटल" },
      { commodity: "गेहूं", minPrice: "2350", maxPrice: "2850", avgPrice: "2600", unit: "क्विंटल" },
      { commodity: "लहसुन", minPrice: "7500", maxPrice: "18000", avgPrice: "12500", unit: "क्विंटल" },
      { commodity: "प्याज", minPrice: "800", maxPrice: "2400", avgPrice: "1600", unit: "क्विंटल" },
      { commodity: "सरसों", minPrice: "5000", maxPrice: "5800", avgPrice: "5400", unit: "क्विंटल" }
    ].map(item => ({ ...item, history: generateHistory(parseInt(item.avgPrice), 30) }))
  };

  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");
    
    const prompt = `आज ${dateStr} के लिए मध्य प्रदेश की ${mandiName} मंडी के नवीनतम मंडी भाव (Market Prices) प्रदान करें। 
    सोयाबीन, गेहूं, लहसुन, प्याज, सरसों, चना, मक्का आदि मुख्य फसलों के भाव शामिल करें।
    
    नियम:
    - डेटा केवल JSON फॉर्मैट में हो।
    - सभी नाम हिंदी में हों।
    - इतिहास (history) देने की ज़रूरत नहीं है, वो अपने आप जनरेट हो जायेगा।`;

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
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Mandi Bhav Reporter for Madhya Pradesh. Always return accurate JSON data.",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
    } catch (searchError) {
      console.warn("Mandi Search failed, using status knowledge...", searchError);
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Mandi Bhav Reporter. Provide estimated Mandi Bhav for given location in JSON.",
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
      console.error("Critical error fetching Mandi Bhav:", error);
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
