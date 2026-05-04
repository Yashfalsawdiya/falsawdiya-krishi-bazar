import { GoogleGenAI } from "@google/genai";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export interface MandiItem {
  commodity: string;
  minPrice: string;
  maxPrice: string;
  avgPrice: string;
  unit: string;
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

  // 1. Check Cache First (Cache for 30 mins for more live data)
  const CACHE_KEY = `mandi_bhav_${mandiName}`;
  const CACHE_TIME_KEY = `${CACHE_KEY}_timestamp`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

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

  // 2. Fallback Data (used if API fails)
  const fallbackData: MandiData = {
    mandiName: mandiName,
    date: `${dateStr} ${timeStr}`,
    items: [
      { commodity: "सोयाबीन", minPrice: "4200", maxPrice: "4850", avgPrice: "4550", unit: "क्विंटल" },
      { commodity: "गेहूं", minPrice: "2350", maxPrice: "2850", avgPrice: "2600", unit: "क्विंटल" },
      { commodity: "लहसुन", minPrice: "7500", maxPrice: "18000", avgPrice: "12500", unit: "क्विंटल" },
      { commodity: "प्याज", minPrice: "800", maxPrice: "2400", avgPrice: "1600", unit: "क्विंटल" },
      { commodity: "सरसों", minPrice: "4800", maxPrice: "5400", avgPrice: "5100", unit: "क्विंटल" },
      { commodity: "चना", minPrice: "5150", maxPrice: "5900", avgPrice: "5550", unit: "क्विंटल" },
      { commodity: "मक्का", minPrice: "1850", maxPrice: "2250", avgPrice: "2050", unit: "क्विंटल" },
      { commodity: "मेथी", minPrice: "5200", maxPrice: "6500", avgPrice: "5800", unit: "क्विंटल" },
      { commodity: "अलसी", minPrice: "4900", maxPrice: "5600", avgPrice: "5250", unit: "क्विंटल" },
      { commodity: "धनिया", minPrice: "6000", maxPrice: "8500", avgPrice: "7200", unit: "क्विंटल" },
      { commodity: "उड़द", minPrice: "6500", maxPrice: "8200", avgPrice: "7400", unit: "क्विंटल" },
      { commodity: "isabgol (इसबगोल)", minPrice: "12000", maxPrice: "15500", avgPrice: "13500", unit: "क्विंटल" }
    ]
  };

  try {
    const ai = getAI(userApiKey);
    const prompt = `You are an expert agricultural market analyst for Madhya Pradesh, India.
    Provide a comprehensive list of market prices (Mandi Bhav) for at least 10-15 different agricultural commodities in ${mandiName}, Madhya Pradesh for TODAY, ${dateStr}. 
    
    Return the data in a strict JSON format like this:
    {
      "mandiName": "${mandiName}",
      "date": "${dateStr} ${timeStr}",
      "items": [
        { "commodity": "सोयाबीन", "minPrice": "4200", "maxPrice": "4800", "avgPrice": "4500", "unit": "क्विंटल" }
      ]
    }
    
    Include as many of these as possible if relevant to ${mandiName}: 
    Soybean (सोयाबीन), Wheat (गेहूं), Garlic (लहसुन), Onion (प्याज), Mustard (सरसों/रायड़ा), Gram (चना), Maize (मक्का), 
    Fenugreek (मेथी), Linseed (अलसी), Coriander (धनिया), Black Gram (उड़द), Green Gram (मूंग), 
    Isabgol (इसबगोल), Masoor (मसूर), Pea (मटर).
    
    Use Hindi names for commodities.
    Only return the JSON. Use realistic current market estimates for ${dateStr} based on MP Mandi trends.`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: { parts: [{ text: prompt }] }
    });

    const text = response.text;
    const jsonStr = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(jsonStr);

    // Save to Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());

    return data;
  } catch (error: any) {
    // If it's a quota error, don't log it as a full error to avoid cluttering logs
    const isQuotaError = error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
    
    if (isQuotaError) {
      console.warn("Gemini API Quota Exceeded for Mandi Bhav. Using fallback data.");
    } else {
      console.error("Error fetching Mandi Bhav:", error);
    }

    // If we have any cached data at all (even if expired), use it as a better fallback than static data
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }
    
    return fallbackData;
  }
}
