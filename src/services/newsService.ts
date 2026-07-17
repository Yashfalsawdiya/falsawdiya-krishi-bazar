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
  date: string; // Strictly DD/MM/YYYY
  source: string;
  url: string;
  category: 'MP' | 'India' | 'Scheme' | 'Weather' | 'Crop' | 'Market' | 'Tech' | 'Innovation';
}

export interface AgriNewsResponse {
  items: AgriNewsItem[];
  isCached: boolean;
  isOfflineFallback: boolean;
  syncFailed: boolean;
  hasTodayNews: boolean;
  lastSyncedTime?: string;
}

/**
 * Format any date object strictly into DD/MM/YYYY format.
 */
export const getFormattedDateString = (dateOb?: Date): string => {
  const d = dateOb || new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Parse DD/MM/YYYY string into a Date object for reliable sorting.
 */
export const parseDDMMYYYY = (dateStr: string): Date => {
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(0);
};

// Fixed historical fallback dates to represent older news truthfully
const generateFallbacks = (): AgriNewsItem[] => {
  return [
    {
      title: "मध्य प्रदेश के किसानों के लिए मुख्यमंत्री किसान कल्याण योजना की नई किश्त जारी",
      summary: "मध्य प्रदेश के मुख्यमंत्री द्वारा प्रदेश के सीमांत एवं लघु कृषकों के कल्याण के लिए मुख्यमंत्री किसान कल्याण योजना के तहत आगामी किश्त का भुगतान सीधे बैंक खातों में ऑनलाइन अंतरित (DBT) कर दिया गया है। कृषि विभाग के अधिकारियों ने पुष्टि की है कि इस योजना के माध्यम से लाखों योग्य किसान लाभान्वित हुए हैं। सभी किसान भाई अपने नजदीकी बैंक या सहकारी सोसायटी पर जाकर अपने भुगतान की स्थिति जाँच सकते हैं। यह राशि खरीफ सीजन की तैयारियों और आवश्यक कृषि इनपुट खरीदने के लिए महत्वपूर्ण सहायक सिद्ध होगी।",
      date: "16/07/2026",
      source: "कृषि विभाग, MP",
      url: "https://mpkrishi.mp.gov.in/",
      category: "MP"
    },
    {
      title: "मंडी भाव अपडेट: मालवा क्षेत्र की मंडियों में गेहूं की आवक बढ़ी",
      summary: "मध्य प्रदेश के मालवा-निमाड़ अंचल की प्रमुख अनाज मंडियों में रबी फसलों की कटाई पूरी होने के साथ ही उत्तम गुणवत्ता वाले गेहूं की आवक तेजी से बढ़ रही है। इंदौर, उज्जैन, मंदसौर और शाजापुर मंडियों में प्रतिदिन हजारों क्विंटल उपज की नीलामी हो रही है और बंपर आवक के बावजूद बाजार में गेहूं की कीमतें न्यूनतम समर्थन मूल्य (MSP) से ऊपर स्थिर बनी हुई हैं। किसानों को मंडी में आने से पहले अपनी फसल को अच्छी तरह साफ करने और सुखाने की सलाह दी गई है।",
      date: "16/07/2026",
      source: "मंडी रिपोर्ट",
      url: "https://enam.gov.in/",
      category: "Market"
    },
    {
      title: "प्रधानमंत्री फसल बीमा योजना: रजिस्ट्रेशन की तारीख बढ़ी",
      summary: "कृषि मंत्रालय, भारत सरकार ने प्रतिकूल मौसम और किसानों की सुविधा को ध्यान में रखते हुए प्रधानमंत्री फसल बीमा योजना (PMFBY) के अंतर्गत खरीफ की फसलों के बीमा पंजीकरण की अंतिम तिथि को बढ़ा दिया है। इस निर्णय से उन किसान भाइयों को एक और अवसर मिलेगा जो अब तक तकनीकी कारणों या दस्तावेज़ों की कमी की वजह से पंजीकरण नहीं करा पाए थे। किसान भाई अपनी ग्राम सहकारी समिति या राष्ट्रीयकृत बैंक शाखा पर आवश्यक भू-अभिलेख प्रस्तुत कर फसल सुरक्षित बीमा करा सकते हैं।",
      date: "15/07/2026",
      source: "कृषि जागरण",
      url: "https://pmfby.gov.in/",
      category: "Scheme"
    },
    {
      title: "अगले 48 घंटों में मध्य प्रदेश के कई जिलों में बारिश की संभावना",
      summary: "भारतीय मौसम विज्ञान विभाग (IMD) ने एक सक्रिय पश्चिमी विक्षोभ के प्रभाव स्वरूप आगामी 48 घंटों में भोपाल, इंदौर, उज्जैन और ग्वालियर संभाग के अनेक जिलों में गरज-चमक के साथ हल्की से मध्यम स्तर की वर्षा और कहीं-कहीं ओलावृष्टि की संभावना व्यक्त की है। मौसम वैज्ञानिकों ने किसानों को कटी हुई फसलों को खुले खलिहानों से सुरक्षित स्थानों पर स्थानांतरित करने या तिरपाल से ढकने की चेतावनी जारी की है।",
      date: "15/07/2026",
      source: "IMD",
      url: "https://mausam.imd.gov.in/",
      category: "Weather"
    },
    {
      title: "जैविक खेती अपनाने वाले किसानों को मिलेगी विशेष सब्सिडी",
      summary: "मध्य प्रदेश राज्य सरकार ने पर्यावरण संरक्षण और मिट्टी की उर्वरा शक्ति को बनाए रखने के लिए प्राकृतिक खेती और जैविक खेती को बड़े पैमाने पर बढ़ावा देने का निर्णय लिया है। इसके तहत क्लस्टर आधारित जैविक खेती को अपनाने वाले प्रत्येक पंजीकृत किसान को जैविक इनपुट्स जैसे केंचुआ खाद यूनिट स्थापित करने, वर्मी कंपोस्ट और जीवामृत तैयार करने के लिए सीधे आर्थिक अनुदान (सब्सिडी) दिया जाएगा।",
      date: "14/07/2026",
      source: "Patrika News",
      url: "https://www.patrika.com/",
      category: "Innovation"
    },
    {
      title: "धान की नई उन्नत रोग-प्रतिरोधी किस्मों पर किसानों को मिलेगी ट्रेनिंग",
      summary: "धान उत्पादक क्षेत्रों के किसानों के लिए स्थानीय कृषि विज्ञान केंद्रों (KVK) द्वारा बासमती और उन्नत गैर-बासमती धान की नवीनतम रोग-प्रतिरोधी तथा कम पानी में पकने वाली किस्मों पर विशेष प्रशिक्षण सत्रों का आयोजन किया जा रहा है। इन कम अवधि के व्यावहारिक शिविरों में किसानों को वैज्ञानिक नर्सरी प्रबंधन, उचित पौध दूरी, एकीकृत पोषक तत्व प्रबंधन और जल संरक्षण की आधुनिक तकनीकों के बारे में प्रशिक्षण दिया जाएगा।",
      date: "14/07/2026",
      source: "Kisan News",
      url: "https://www.krishijagran.com/",
      category: "Crop"
    },
    {
      title: "सोलर पंप योजना: मध्य प्रदेश के किसानों के लिए ऑनलाइन आवेदन शुरू",
      summary: "प्रधानमंत्री कुसुम (KUSUM) योजना के तहत मध्य प्रदेश ऊर्जा विकास निगम ने राज्य के किसानों के लिए खेतों में नवीन ऑफ-ग्रिड सोलर पंप स्थापित करने हेतु ऑनलाईन आवेदन आमंत्रित करने की प्रक्रिया शुरू कर दी है। इस महात्वाकांक्षी योजना के अंतर्गत 3 एचपी से लेकर 10 एचपी तक की क्षमता वाले वाटर पंपों पर सरकार द्वारा 60 प्रतिशत तक की भारी सब्सिडी का लाभ सीधे दिया जा रहा है।",
      date: "13/07/2026",
      source: "ऊर्जा विभाग, MP",
      url: "https://cmsolarpump.mp.gov.in/",
      category: "Scheme"
    },
    {
      title: "ड्रोन तकनीक से खेती: छिड़काव के लिए नई गाइडलाइन्स जारी",
      summary: "केंद्रीय कृषि एवं किसान कल्याण मंत्रालय ने आधुनिक कृषि को प्रोत्साहित करने तथा कीटनाशकों व तरल उर्वरकों की बर्बादी को रोकने हेतु खेतों में कृषि ड्रोन (Agri Drones) के उपयोग के संबंध में सुरक्षात्मक नियमावली और दिशा-निर्देश जारी किए हैं। नई गाइडलाइन्स के अनुसार ड्रोन उड़ाने वाले ऑपरेटर को विशेष रूप से प्रशिक्षित और लाइसेंस प्राप्त होना अनिवार्य है।",
      date: "13/07/2026",
      source: "AgriTech India",
      url: "https://agriculture.gov.in/",
      category: "Tech"
    },
    {
      title: "मध्य प्रदेश में सोयाबीन की एमएसपी बढ़ाने की मांग तेज",
      summary: "सोयाबीन उत्पादक जिलों के प्रमुख किसान संगठनों और सहकारी सोसायटियों ने बढ़ती उत्पादन लागत, महंगे खाद, डीजल और बीजों की कीमतों को देखते हुए केंद्र व राज्य सरकार से सोयाबीन फसल का न्यूनतम समर्थन मूल्य (MSP) और बढ़ाने की जोरदार अपील की है। वर्तमान बाजार विश्लेषण के आधार पर किसानों का कहना है कि कृषि जोखिमों के अनुपात में सोयाबीन की वर्तमान कीमतें पर्याप्त नहीं हैं।",
      date: "12/07/2026",
      source: "Dainik Bhaskar",
      url: "https://www.bhaskar.com/",
      category: "Market"
    }
  ];
};

/**
 * Deduplicates and merges news arrays. Items with duplicate titles (case-insensitive, whitespace trimmed)
 * are removed, retaining the newer entry. The resulting array is sorted by date descending.
 */
export const mergeAndDeduplicateNews = (existing: AgriNewsItem[], newlyFetched: AgriNewsItem[]): AgriNewsItem[] => {
  const map = new Map<string, AgriNewsItem>();

  // Add existing items first
  existing.forEach(item => {
    const key = item.title.trim().toLowerCase();
    map.set(key, item);
  });

  // Add/Overwrite with newly fetched items
  newlyFetched.forEach(item => {
    const key = item.title.trim().toLowerCase();
    map.set(key, item);
  });

  const merged = Array.from(map.values());

  // Sort by parsed date descending
  merged.sort((a, b) => parseDDMMYYYY(b.date).getTime() - parseDDMMYYYY(a.date).getTime());

  // Keep a maximum of 50 items for storage efficiency
  return merged.slice(0, 50);
};

export const fetchAgriNews = async (userApiKey?: string, forceRefresh: boolean = false): Promise<AgriNewsResponse> => {
  const now = new Date();
  const todayStr = getFormattedDateString(now);

  const CACHE_KEY = 'agri_news_cache_v3';
  const CACHE_TIME_KEY = 'agri_news_cache_time_v3';
  const CACHE_LAST_SYNC_KEY = 'agri_news_last_sync_v3';

  const cachedDataStr = localStorage.getItem(CACHE_KEY);
  const cachedTimeStr = localStorage.getItem(CACHE_TIME_KEY);
  const lastSyncStr = localStorage.getItem(CACHE_LAST_SYNC_KEY) || undefined;

  let currentCache: AgriNewsItem[] = [];
  if (cachedDataStr) {
    try {
      currentCache = JSON.parse(cachedDataStr);
    } catch (e) {
      console.warn("Error parsing cache, initializing fresh cache.", e);
    }
  }

  // If no cache at all, initialize cache with the older fallbacks
  if (currentCache.length === 0) {
    currentCache = generateFallbacks();
    localStorage.setItem(CACHE_KEY, JSON.stringify(currentCache));
    localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());
  }

  const hasTodayInCache = currentCache.some(item => item.date === todayStr);

  // Caching condition: If we already have news for today in the cache, and we are not forcing a refresh,
  // we do not need to make an API call. This saves API limits and matches "App प्रतिदिन जाँच करे कि आज की ताज़ा खबर उपलब्ध है या नहीं".
  if (hasTodayInCache && !forceRefresh) {
    return {
      items: currentCache,
      isCached: true,
      isOfflineFallback: false,
      syncFailed: false,
      hasTodayNews: true,
      lastSyncedTime: lastSyncStr
    };
  }

  // Try to fetch from live search grounding using Gemini if API Key is available
  try {
    const ai = getAI(userApiKey);
    if (!ai) {
      // No key, we fallback to our local cache cleanly
      const hasToday = currentCache.some(item => item.date === todayStr);
      return {
        items: currentCache,
        isCached: true,
        isOfflineFallback: true,
        syncFailed: false,
        hasTodayNews: hasToday,
        lastSyncedTime: lastSyncStr
      };
    }

    const prompt = `आज ${todayStr} के लिए विश्वसनीय स्रोतों जैसे 'Krishi Jagran' (krishijagran.com), 'ICAR', और मुख्य कृषि समाचार पोर्टल्स से भारत और विशेष रूप से मध्य प्रदेश (Madhya Pradesh) के लिए नवीनतम और सबसे महत्वपूर्ण 10-15 कृषि समाचार (Agricultural News) खोजें।
    
    कृषि से जुड़े विषयों पर ही केवल वास्तविक (Real) और प्रमाणित समाचार आइटम प्रदान करें, जैसे:
    - फसलों के भाव/MSP, सरकारी योजनायें (Fasal Bima, CM/PM Kisan updates), मौसम की चेतावनी, कृषि तकनीक/ड्रोन, उर्वरक/कीटनाशक/बीज, जैविक खेती, पशुपालन, अनुसंधान।
    
    नियम:
    - सभी शीर्षक (Titles) और सारांश (Summaries) अत्यंत विस्तृत, पूर्ण व्यावसायिक विवरण के साथ किसान-अनुकूल हिंदी में हों। प्रत्येक सारांश में कम से कम 3-4 जानकारीपूर्ण वाक्य हों। संक्षेप या अधूरे वाक्य न लिखें।
    - "source" बिल्कुल विश्वसनीय हो जैसे 'कृषि जागरण', 'IMD', 'ICAR' इत्यादि।
    - "url" अनिवार्य रूप से संबंधित न्यूज़ पोर्टल या आधिकारिक सरकारी पोर्टल की लिंक हो।
    - "date" हमेशा न्यूज़ की वास्तविक प्रकाशन तिथि हो। यदि न्यूज़ आज प्रकाशित हुई है तो '${todayStr}' डालें। यदि न्यूज़ पुरानी है (जैसे कल या परसों की) तो उसकी वास्तविक प्रकाशन तिथि DD/MM/YYYY फॉर्मेट में ही दें। कृपया आज की तिथि जबरदस्ती न थोपें।
    - "category" इनमें से एक हो: ['MP', 'India', 'Scheme', 'Weather', 'Crop', 'Market', 'Tech', 'Innovation']`;

    console.log("Fetching fresh news with Google Search Grounding for today:", todayStr);
    
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a highly professional Agricultural News editor representing 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar). Always search for and return authentic, high-quality agricultural news with real publication dates. Do NOT return duplicate news and do NOT forge today's date if the news is old.",
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
    } catch (searchError) {
      console.warn("Google Search Grounding failed, retrying with standard knowledge base generation", searchError);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a highly professional Agricultural News editor representing 'फल्सावदिया कृषि बाज़ार'. Return authentic, high-quality agricultural news with real publication dates. Since Google Search is currently unavailable, use your latest knowledge base up to 2026. Do NOT invent fake news.",
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

    const newlyFetched: AgriNewsItem[] = JSON.parse(response.text);

    if (Array.isArray(newlyFetched) && newlyFetched.length > 0) {
      // Parse dates cleanly and normalize them to DD/MM/YYYY
      const formattedFetched = newlyFetched.map(item => {
        let finalDate = todayStr;
        if (item.date) {
          const trimmed = item.date.trim();
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
            finalDate = trimmed;
          } else {
            const parsed = Date.parse(trimmed);
            if (!isNaN(parsed)) {
              finalDate = getFormattedDateString(new Date(parsed));
            } else {
              // Keep what is returned or fallback to today
              finalDate = trimmed.length > 5 ? trimmed : todayStr;
            }
          }
        }
        return {
          ...item,
          date: finalDate
        };
      });

      // Merge & Deduplicate
      const mergedList = mergeAndDeduplicateNews(currentCache, formattedFetched);
      
      const lastSyncTimeStr = new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) + " (आज)";
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(mergedList));
      localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());
      localStorage.setItem(CACHE_LAST_SYNC_KEY, lastSyncTimeStr);

      const hasToday = mergedList.some(item => item.date === todayStr);

      return {
        items: mergedList,
        isCached: false,
        isOfflineFallback: false,
        syncFailed: false,
        hasTodayNews: hasToday,
        lastSyncedTime: lastSyncTimeStr
      };
    }

    // Fallback if empty array returned
    const hasToday = currentCache.some(item => item.date === todayStr);
    return {
      items: currentCache,
      isCached: true,
      isOfflineFallback: false,
      syncFailed: false,
      hasTodayNews: hasToday,
      lastSyncedTime: lastSyncStr
    };

  } catch (error: any) {
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    console.error("Critical news fetch failure, returning last successful cache:", error);

    const hasToday = currentCache.some(item => item.date === todayStr);
    return {
      items: currentCache,
      isCached: true,
      isOfflineFallback: false,
      syncFailed: true,
      hasTodayNews: hasToday,
      lastSyncedTime: lastSyncStr
    };
  }
};
