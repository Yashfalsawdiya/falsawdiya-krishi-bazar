import { GoogleGenAI } from "@google/genai";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured.");
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

  // 1. Check Cache with new 2PM / 7PM logic
  const CACHE_KEY = `mandi_bhav_${mandiName}_v3`; 
  const CACHE_TIME_KEY = `${CACHE_KEY}_timestamp`;

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  const nowTime = now.getTime();
  const today2PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0).getTime();
  const today7PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0).getTime();

  let shouldRefresh = true;

  if (cachedData && cachedTime) {
    const lastFetchTime = parseInt(cachedTime);
    const lastFetchDate = new Date(lastFetchTime);
    const isSameDay = lastFetchDate.toDateString() === now.toDateString();

    if (nowTime < today2PM) {
      // Before 2 PM: Refresh if we don't have today's data (or data from last evening 7PM)
      // Actually, if we have data from last night, we keep it. 
      // If we have data from today (but before 2PM), we keep it.
      if (isSameDay || (nowTime - lastFetchTime < 19 * 60 * 60 * 1000)) {
        shouldRefresh = false;
      }
    } else if (nowTime >= today2PM && nowTime < today7PM) {
      // Between 2 PM and 7 PM: Refresh only if last fetch was before 2 PM today
      if (isSameDay && lastFetchTime >= today2PM) {
        shouldRefresh = false;
      }
    } else {
      // After 7 PM: Refresh only if last fetch was before 7 PM today
      if (isSameDay && lastFetchTime >= today7PM) {
        shouldRefresh = false;
      }
    }
  }

  if (!shouldRefresh && cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.warn("Error parsing cached Mandi Bhav data:", e);
    }
  }

  // 2. Fallback Data (Simple)
  const fallbackData: MandiData = {
    mandiName: mandiName,
    date: `${dateStr} ${timeStr}`,
    items: [
      { commodity: "सोयाबीन", minPrice: "4200", maxPrice: "4850", avgPrice: "4550", unit: "क्विंटल" },
      { commodity: "गेहूं", minPrice: "2350", maxPrice: "2850", avgPrice: "2600", unit: "क्विंटल" },
      { commodity: "चना", minPrice: "5200", maxPrice: "5800", avgPrice: "5500", unit: "क्विंटल" },
      { commodity: "मक्का", minPrice: "1900", maxPrice: "2200", avgPrice: "2050", unit: "क्विंटल" },
      { commodity: "सरसों", minPrice: "4800", maxPrice: "5400", avgPrice: "5100", unit: "क्विंटल" },
      { commodity: "मूंग", minPrice: "6500", maxPrice: "7500", avgPrice: "7000", unit: "क्विंटल" },
      { commodity: "उड़द", minPrice: "6000", maxPrice: "8000", avgPrice: "7000", unit: "क्विंटल" },
      { commodity: "मसूर", minPrice: "5500", maxPrice: "6200", avgPrice: "5800", unit: "क्विंटल" },
      { commodity: "प्याज", minPrice: "800", maxPrice: "2400", avgPrice: "1600", unit: "क्विंटल" },
      { commodity: "लहसुन", minPrice: "7500", maxPrice: "18000", avgPrice: "12500", unit: "क्विंटल" },
      { commodity: "धनिया", minPrice: "5000", maxPrice: "7000", avgPrice: "6000", unit: "क्विंटल" },
      { commodity: "कपास", minPrice: "6500", maxPrice: "7500", avgPrice: "7000", unit: "क्विंटल" }
    ]
  };

  try {
    const ai = getAI(userApiKey);
    
    const prompt = `You are an expert agricultural market analyst for Madhya Pradesh, India.
    Provide current market prices (Mandi Bhav) for agricultural commodities in ${mandiName}, MP for ${dateStr}. 
    
    Provide exactly 12 major commodities.
    Include these crops: Soybean (सोयाबीन), Wheat (गेहूं), Gram (चना), Maize (मक्का), Mustard (सरसों), Moong (मूंग), Urad (उड़द), Masoor (मसूर), Onion (प्याज), Garlic (लहसुन), Coriander (धनिया), Cotton (कपास).
    
    Return the data in this strict JSON format:
    {
      "mandiName": "${mandiName}",
      "date": "${dateStr} ${timeStr}",
      "items": [
        { 
          "commodity": "Commodity Name in Hindi", 
          "minPrice": "price", 
          "maxPrice": "price", 
          "avgPrice": "price", 
          "unit": "क्विंटल"
        }
      ]
    }
    
    Use realistic market estimates for ${mandiName}. Only return JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt
    });

    const text = response.text;
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response");
    
    const data = JSON.parse(jsonMatch[0]);

    // Save to Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, nowTime.toString());

    return data;
  } catch (error: any) {
    console.error("Error fetching Mandi Bhav:", error);
    if (cachedData) {
      try { return JSON.parse(cachedData); } catch (e) {}
    }
    return fallbackData;
  }
}
