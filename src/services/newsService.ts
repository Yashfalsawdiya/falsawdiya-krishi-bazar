import { GoogleGenAI } from "@google/genai";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey;
  
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("USER_API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export interface AgriNewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  url: string;
  category: 'MP' | 'India' | 'Scheme' | 'Weather' | 'Crop' | 'Market' | 'Tech' | 'Innovation';
}

export const fetchAgriNews = async (userApiKey?: string): Promise<AgriNewsItem[]> => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const CACHE_KEY = 'agri_news_cache_v2';
  const CACHE_TIME_KEY = 'agri_news_cache_time_v2';
  const CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  if (cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime);
    if (age < CACHE_DURATION) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        console.warn("Error parsing cached news:", e);
      }
    }
  }

  const fallbackData: AgriNewsItem[] = [
    {
      title: "मध्य प्रदेश के किसानों के लिए मुख्यमंत्री किसान कल्याण योजना की नई किश्त जारी",
      summary: "राज्य सरकार ने पात्र किसानों के खातों में ₹2000 की नई किश्त ट्रांसफर कर दी है। किसान अपने बैंक खाते और पोर्टल पर स्टेटस चेक कर सकते हैं।",
      date: dateStr,
      source: "कृषि विभाग, MP",
      url: "https://mpkrishi.mp.gov.in/",
      category: "MP"
    },
    {
      title: "मंडी भाव अपडेट: मालवा क्षेत्र की मंडियों में गेहूं की आवक बढ़ी",
      summary: "इंदौर और उज्जैन मंडियों में गेहूं की बंपर आवक के साथ कीमतों में स्थिरता बनी हुई है। मौसम साफ रहने से आवक और बढ़ने की उम्मीद है।",
      date: dateStr,
      source: "मंडी रिपोर्ट",
      url: "https://enam.gov.in/",
      category: "Market"
    }
  ];

  try {
    const ai = getAI(userApiKey);
    const prompt = `Search for the latest and most important agricultural news for India and Madhya Pradesh as of today ${dateStr}.
    Find news about:
    1. Madhya Pradesh Agriculture (MP)
    2. Indian Agriculture (India)
    3. Farmer Schemes (Scheme)
    4. Weather/Monsoon Updates (Weather)
    5. Crop Updates/Sowing (Crop)
    6. Mandi Prices (Market)
    7. Agri Technology (Tech)
    8. Innovations in Farming (Innovation)

    Provide at least 8 real and current news items. 
    Translate summaries and titles to Hindi. 
    Ensure the "url" is a valid link to a news source like Krishi Jagran, DD Kisan, Patrika, Dainik Bhaskar, or similar.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY" as any,
          items: {
            type: "OBJECT" as any,
            properties: {
              title: { type: "STRING" },
              summary: { type: "STRING" },
              date: { type: "STRING" },
              source: { type: "STRING" },
              url: { type: "STRING" },
              category: { 
                type: "STRING",
                enum: ['MP', 'India', 'Scheme', 'Weather', 'Crop', 'Market', 'Tech', 'Innovation'] 
              }
            },
            required: ["title", "summary", "date", "source", "url", "category"]
          }
        }
      }
    });

    const data = JSON.parse(response.text);

    if (Array.isArray(data) && data.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());
      return data;
    }
    
    return fallbackData;
  } catch (error: any) {
    if (error.message === 'USER_API_KEY_MISSING') {
      throw error;
    }
    console.error("Error fetching news with search:", error);
    
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }

    return fallbackData;
  }
};
