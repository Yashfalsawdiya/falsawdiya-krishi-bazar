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
    },
    {
      title: "धान की नई किस्मों पर किसानों को मिलेगी ट्रेनिंग",
      summary: "कृषि विज्ञान केंद्रों पर उन्नत बीज और नई तकनीकों के बारे में विशेष कैंप लगाए जा रहे हैं।",
      date: dateStr,
      source: "Kisan News",
      url: "https://www.krishijagran.com/",
      category: "Crop"
    },
    {
      title: "सोलर पंप योजना: मध्य प्रदेश के किसानों के लिए ऑनलाइन आवेदन शुरू",
      summary: "कुसुम योजना के तहत सोलर पंप लगवाने के लिए किसान अब ऑनलाइन पोर्टल पर अपना आवेदन जमा कर सकते हैं। इसमें 60% तक सब्सिडी का प्रावधान है।",
      date: dateStr,
      source: "ऊर्जा विभाग, MP",
      url: "https://cmsolarpump.mp.gov.in/",
      category: "Scheme"
    },
    {
      title: "ड्रोन तकनीक से खेती: छिड़काव के लिए नई गाइडलाइन्स जारी",
      summary: "भारत सरकार ने कीटनाशकों के छिड़काव के लिए कृषि ड्रोन्स के इस्तेमाल की नई नियमावली जारी की है, जिससे लागत में कमी आएगी।",
      date: dateStr,
      source: "AgriTech India",
      url: "https://agriculture.gov.in/",
      category: "Tech"
    },
    {
      title: "मध्य प्रदेश में सोयाबीन की एमएसपी बढ़ाने की मांग तेज",
      summary: "किसान संगठनों ने सरकार से सोयाबीन का समर्थन मूल्य बढ़ाने की मांग की है ताकि बढ़ती लागत की भरपाई हो सके।",
      date: dateStr,
      source: "Dainik Bhaskar",
      url: "https://www.bhaskar.com/",
      category: "Market"
    },
    {
      title: "कृषि यंत्रों पर सब्सिडी के लिए नया पोर्टल लॉन्च",
      summary: "ट्रैक्टर, कल्टीवेटर और थ्रेशर जैसे यंत्रों पर छूट के लिए अब एक ही पोर्टल से आवेदन किया जा सकेगा।",
      date: dateStr,
      source: "MP Agri Portal",
      url: "https://dbt.mpdage.org/",
      category: "Scheme"
    },
    {
      title: "वर्मी कंपोस्ट खाद: घर पर बनाने की आसान विधि",
      summary: "कृषि विशेषज्ञों ने बताया कि कैसे किसान अपने खेत के अपशिष्ट का उपयोग कर घर पर ही उत्तम गुणवत्ता की जैविक खाद तैयार कर सकते हैं।",
      date: dateStr,
      source: "Kisan Guide",
      url: "https://www.icar.org.in/",
      category: "Innovation"
    },
    {
      title: "उत्तर भारत में शीतलहर का अलर्ट: किसान रखें फसलों का ध्यान",
      summary: "आने वाले सप्ताह में तापमान गिरने की संभावना है, जिससे पाले का खतरा बढ़ सकता है। हल्की सिंचाई करने की सलाह दी गई है।",
      date: dateStr,
      source: "Skymet Weather",
      url: "https://www.skymetweather.com/",
      category: "Weather"
    },
    {
      title: "सहकारी बैंकों में किसानों के लिए जीरो ब्याज दर पर ऋण",
      summary: "समय पर कर्ज चुकाने वाले किसानों को 0% ब्याज पर फसली ऋण की सुविधा जारी रहेगी।",
      date: dateStr,
      source: "MP Cooperative",
      url: "https://mp.gov.in/",
      category: "Scheme"
    },
    {
      title: "स्मार्ट सिंचाई तकनीक: कम पानी में ज्यादा पैदावार",
      summary: "ड्रिप और स्प्रिंकलर सिंचाई प्रणालियों के उपयोग से पानी की बड़ी बचत देखी जा रही है, जो भविष्य की खेती के लिए अनिवार्य है।",
      date: dateStr,
      source: "NITI Aayog",
      url: "https://niti.gov.in/",
      category: "Tech"
    },
    {
      title: "किसान रेल: अब फल और सब्जियों का परिवहन हुआ आसान",
      summary: "रेलवे ने पेरिशेबल गुड्स के लिए विशेष ट्रेनों की संख्या बढ़ा दी है ताकि किसानों का माल खराब न हो और सही दाम मिले।",
      date: dateStr,
      source: "Railway News",
      url: "https://indianrailways.gov.in/",
      category: "India"
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

    let response;
    try {
      console.log("Fetching news with Google Search Grounding...");
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a specialized Agricultural News reporter for Indian farmers. Always provide real, current news updates in a JSON array format.",
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
    } catch (searchError: any) {
      console.warn("Google Search Grounding failed, retrying with standard generation...", searchError);
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a specialized Agricultural News reporter for Indian farmers. Provide 15 most important agri news items as of today. Use your latest knowledge if search is unavailable.",
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
    }

    const data = JSON.parse(response.text);

    if (Array.isArray(data) && data.length > 0) {
      console.log("Successfully fetched news counts:", data.length);
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
    console.error("Critical news fetch failure:", error);
    
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }

    return fallbackData;
  }
};
