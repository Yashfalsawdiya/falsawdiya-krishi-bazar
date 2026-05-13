import { GoogleGenAI } from "@google/genai";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export interface AgriNewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  url: string;
  category: 'Policy' | 'Market' | 'Technology' | 'Weather';
}

export const fetchAgriNews = async (userApiKey?: string): Promise<AgriNewsItem[]> => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const CACHE_KEY = 'agri_news_cache';
  const CACHE_TIME_KEY = 'agri_news_cache_time';
  
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  const nowTime = now.getTime();
  const today10AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0).getTime();

  let shouldRefresh = true;

  if (cachedData && cachedTime) {
    const lastFetchTime = parseInt(cachedTime);
    const lastFetchDate = new Date(lastFetchTime);
    const isSameDay = lastFetchDate.toDateString() === now.toDateString();

    // If it is before 10 AM today and we have data from yesterday or earlier today
    if (nowTime < today10AM) {
      if (isSameDay || (nowTime - lastFetchTime < 24 * 60 * 60 * 1000)) {
        shouldRefresh = false;
      }
    } else {
      // It is after 10 AM today. Refresh only if last fetch was before 10 AM today.
      if (isSameDay && lastFetchTime >= today10AM) {
        shouldRefresh = false;
      }
    }
  }

  if (!shouldRefresh && cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn("Error parsing cached news:", e);
    }
  }

  const fallbackData: AgriNewsItem[] = [
    {
      title: "मध्य प्रदेश में सोयाबीन के दामों में उछाल की संभावना",
      summary: "बाज़ार विशेषज्ञों के अनुसार, आने वाले हफ्तों में सोयाबीन की कीमतों में सुधार देखने को मिल सकता है। किसानों को सलाह दी जाती है कि वे मंडी भाव पर नज़र रखें।",
      date: dateStr,
      source: "कृषि जागरण",
      url: "https://hindi.krishijagran.com/",
      category: "Market"
    }
  ];

  try {
    const ai = getAI(userApiKey);
    const prompt = `You are an agricultural news reporter in India.
    Provide exactly 10 latest news headlines related to Indian agriculture, specifically for farmers in Madhya Pradesh, as of ${dateStr}.
    Focus on these areas: Madhya Pradesh local news, India level agriculture, Government Schemes, Weather alerts, Crop advice, Mandi prices, and Agri-Technology.
    
    Ensure the news is varied and not just one topic. 
    Ensure the news is HIGHLY RELEVANT for today or the current week.
    
    Return the data in a strict JSON format like this:
    [
      {
        "title": "News Headline in Hindi",
        "summary": "2-3 sentence summary in Hindi",
        "date": "${dateStr}",
        "source": "News Source Name (e.g., Krishi Jagran, DD Kisan, Patrika MP)",
        "url": "Direct URL to the news article or source website",
        "category": "Policy/Market/Technology/Weather"
      }
    ]
    Only return the JSON list.`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: { parts: [{ text: prompt }] }
    });

    const text = response.text;
    const jsonStr = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(jsonStr);

    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, nowTime.toString());

    return data;
  } catch (error: any) {
    const isQuotaError = error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (isQuotaError) {
      console.warn("Gemini API Quota Exceeded for News. Using fallback.");
    } else {
      console.error("Error fetching agri news:", error);
    }

    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }

    return fallbackData;
  }
};
