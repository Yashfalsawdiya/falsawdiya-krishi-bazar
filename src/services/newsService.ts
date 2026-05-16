import { GoogleGenAI } from "@google/genai";
import { getFriendlyAiError } from "../utils/aiErrorHandler";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey;
  
  if (!apiKey || apiKey.trim() === "") {
    return null;
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
    },
    {
      title: "प्रधानमंत्री फसल बीमा योजना: रजिस्ट्रेशन की तारीख बढ़ी",
      summary: "केंद्र सरकार ने खरीफ फसलों के लिए बीमा रजिस्ट्रेशन की समय सीमा बढ़ा दी है। किसान अपनी नज़दीकी बैंक या सीएससी केंद्र पर जाकर पंजीकरण करा सकते हैं।",
      date: dateStr,
      source: "कृषि जागरण",
      url: "https://pmfby.gov.in/",
      category: "Scheme"
    },
    {
      title: "अगले 48 घंटों में मध्य प्रदेश के कई जिलों में बारिश की संभावना",
      summary: "मौसम विभाग ने भोपाल, इंदौर और जबलपुर संभागों में हल्की से मध्यम बारिश का अलर्ट जारी किया है। किसानों को कटी हुई फसल सुरक्षित रखने की सलाह दी गई है।",
      date: dateStr,
      source: "IMD",
      url: "https://mausam.imd.gov.in/",
      category: "Weather"
    },
    {
      title: "जैविक खेती अपनाने वाले किसानों को मिलेगी विशेष सब्सिडी",
      summary: "मध्य प्रदेश सरकार ने जैविक खेती को बढ़ावा देने के लिए क्लस्टर आधारित खेती पर सब्सिडी देने का फैसला किया है।",
      date: dateStr,
      source: "Patrika News",
      url: "https://www.patrika.com/",
      category: "Innovation"
    }
  ];

  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");
    const prompt = `आज ${dateStr} के लिए भारत और विशेष रूप से मध्य प्रदेश (Madhya Pradesh) के लिए नवीनतम और सबसे महत्वपूर्ण कृषि समाचार (Agricultural News) खोजें।
    
    निम्नलिखित विषयों पर कम से कम 15 अलग-अलग और वास्तविक (Real) समाचार आइटम प्रदान करें:
    1. मध्य प्रदेश कृषि (MP Agriculture News, CM Kisan Kalyan Yojana, MP Mandi updates)
    2. भारतीय कृषि (Indian Agriculture, PM-Kisan, central schemes)
    3. सरकारी योजनायें (Fasal Bima, Subsidy updates)
    4. मौसम और मानसून (Weather alerts for farmers, Monsoon progress)
    5. फसल अपडेट (Sowing updates for Malwa/Nimar/Bundelkhand regions)
    6. मंडी भाव (Latest Mandi prices for Wheat, Soyabean, Garlic, etc. in MP)
    7. कृषि तकनीक और नवाचार (Agri-tech, Smart farming)

    नियम:
    - कुल 15 समाचार दें (15 items).
    - सभी शीर्षक (Titles) और सारांश (Summaries) शुद्ध हिंदी में हों।
    - "url" अनिवार्य रूप से एक वैध न्यूज़ लिंक होना चाहिए (जैसे Patrika, Dainik Bhaskar, Krishi Jagran, DD Kisan, IBC24, etc.)।
    - समाचार आज या इस सप्ताह के होने चाहिए।`;

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
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
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
