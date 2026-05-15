import { GoogleGenAI } from "@google/genai";

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
        const pads = generateHistory(item.history[0].price, 30 - item.history.length);
        item.history = [...pads, ...item.history];
      }

      return item;
    });
    return data;
  };

  // 1. Check Cache First
  const CACHE_KEY = `mandi_bhav_${mandiName}_v2`; // Bumped version to clear old cache
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

  // 2. Fallback Data
  const fallbackData: MandiData = {
    mandiName: mandiName,
    date: `${dateStr} ${timeStr}`,
    items: [
      { 
        commodity: "सोयाबीन", minPrice: "4200", maxPrice: "4850", avgPrice: "4550", unit: "क्विंटल",
        history: generateHistory(4500, 30)
      },
      { 
        commodity: "गेहूं", minPrice: "2350", maxPrice: "2850", avgPrice: "2600", unit: "क्विंटल",
        history: generateHistory(2550, 30)
      },
      { 
        commodity: "लहसुन", minPrice: "7500", maxPrice: "18000", avgPrice: "12500", unit: "क्विंटल",
        history: generateHistory(12000, 30)
      },
      { 
        commodity: "प्याज", minPrice: "800", maxPrice: "2400", avgPrice: "1600", unit: "क्विंटल",
        history: generateHistory(1500, 30)
      }
    ]
  };

  try {
    const ai = getAI(userApiKey);
    if (!ai) {
      if (cachedData) {
        try {
          return JSON.parse(cachedData);
        } catch (e) {}
      }
      return sanitizeMandiData(fallbackData);
    }
    
    const prompt = `You are an expert agricultural market analyst for Madhya Pradesh, India.
    Provide market prices (Mandi Bhav) for agricultural commodities in ${mandiName}, MP for TODAY, ${dateStr}. 
    
    IMPORTANT: For each commodity, also provide a mock historical price trend for the LAST 30 DAYS to show price fluctuations. 
    The history should have exactly 30 data points representing consecutive days leading up to today.
    Ensure "price" in history is a Number (integer), not a String.
    
    Return the data in this strict JSON format:
    {
      "mandiName": "${mandiName}",
      "date": "${dateStr} ${timeStr}",
      "items": [
        { 
          "commodity": "सोयाबीन", 
          "minPrice": "4200", 
          "maxPrice": "4800", 
          "avgPrice": "4500", 
          "unit": "क्विंटल",
          "history": [
            { "date": "01 Apr", "price": 4400 },
            ... 30 points
            { "date": "आज", "price": 4500 }
          ]
        }
      ]
    }
    
    Include: Soybean, Wheat, Garlic, Onion, Mustard, Gram, Maize, etc.
    Use Hindi names for commodities.
    Only return JSON. Use realistic current and historical market estimates for ${mandiName}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] }
    });

    const text = response.text;
    const jsonStr = text.replace(/```json|```/g, "").trim();
    const rawData = JSON.parse(jsonStr);
    const data = sanitizeMandiData(rawData);

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
    
    return sanitizeMandiData(fallbackData);
  }
}
