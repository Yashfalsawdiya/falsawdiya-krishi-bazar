import { GoogleGenAI } from "@google/genai";
import { getFriendlyAiError } from "../utils/aiErrorHandler";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey;
  
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export interface Scheme {
  title: string;
  description: string;
  benefits: string[];
  eligibility: string;
  howToApply: string;
  link?: string;
  category?: string;
  type?: string;
}

export const fetchSchemes = async (userApiKey?: string, forceRefresh: boolean = false): Promise<Scheme[]> => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const CACHE_KEY = 'agri_schemes_cache';
  const CACHE_TIME_KEY = 'agri_schemes_cache_time';
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  if (!forceRefresh && cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime);
    if (age < CACHE_DURATION) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        console.warn("Error parsing cached schemes:", e);
      }
    }
  }

  const fallbackData: Scheme[] = [
    {
      title: "पीएम-किसान सम्मान निधि (PM-Kisan)",
      description: "किसानों को प्रति वर्ष 6000 रुपये की आर्थिक सहायता दी जाती है।",
      benefits: ["2000 रुपये की 3 किस्तें", "सीधे बैंक खाते में पैसा"],
      eligibility: "सभी भूमिधारक किसान परिवार",
      howToApply: "पीएम-किसान पोर्टल या CSC केंद्र के माध्यम से पंजीकरण करें।"
    },
    {
      title: "मुख्यमंत्री किसान कल्याण योजना (MP CM-Kisan)",
      description: "मध्य प्रदेश सरकार द्वारा पीएम-किसान के लाभार्थियों को अतिरिक्त आर्थिक सहायता।",
      benefits: ["4000 रुपये अतिरिक्त आर्थिक सहायता", "पीएम-किसान के साथ जुड़ाव"],
      eligibility: "पीएम-किसान योजना के पात्र किसान",
      howToApply: "पीएम-किसान की पात्रता के आधार पर स्वतः लाभ।"
    },
    {
      title: "प्रधानमंत्री फसल बीमा योजना (PMFBY)",
      description: "फसल के नुकसान होने पर किसानों को बीमा कवर प्रदान किया जाता है।",
      benefits: ["कम प्रीमियम", "प्राकृतिक आपदाओं से सुरक्षा"],
      eligibility: "सभी किसान जो अधिसूचित फसलें उगाते हैं",
      howToApply: "बैंक या बीमा एजेंट के माध्यम से।"
    },
    {
      title: "किसान मानधन योजना",
      description: "60 वर्ष की आयु के बाद किसानों को 3000 रुपये मासिक पेंशन।",
      benefits: ["वृद्धावस्था में आर्थिक सुरक्षा", "मासिक पेंशन 3000 रु"],
      eligibility: "18-40 वर्ष की आयु के छोटे और सीमांत किसान",
      howToApply: "CSC केंद्रों के माध्यम से पंजीकरण।"
    },
    {
      title: "प्रधानमंत्री कृपि सिंचाई योजना (PMKSY)",
      description: "खेतों में पानी पहुँचने की सुविधा को बढ़ावा देना और 'हर खेत को पानी' का लक्ष्य।",
      benefits: ["ड्रिप और स्प्रिंकलर सिंचाई पर भारी सब्सिडी", "पानी की बचत"],
      eligibility: "सभी श्रेणी के किसान जिनके पास सिंचाई का स्रोत हो",
      howToApply: "कृषि विभाग के ऑनलाइन पोर्टल पर आवेदन।"
    },
    {
      title: "डेयरी उद्यमी विकास योजना (DEDH)",
      description: "डेयरी व्यवसाय शुरू करने के लिए नाबार्ड (NABARD) के माध्यम से सब्सिडी और ऋण।",
      benefits: ["25% से 33% तक सब्सिडी", "आसान ऋण सुविधा"],
      eligibility: "किसान, उद्यमी और स्वयं सहायता समूह",
      howToApply: "अपने नज़दीकी बैंक या नाबार्ड कार्यालय से संपर्क करें।"
    }
  ];

  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");
    const prompt = `आज ${dateStr} तक की जानकारी के अनुसार भारत (India) और मध्य प्रदेश (Madhya Pradesh) सरकार की नवीनतम और सबसे महत्वपूर्ण 10 कृषि योजनाओं (Government Schemes for Farmers) की सूची प्रदान करें।
    
    योजनाओं के प्रकार:
    - वित्तीय सहायता (Financial Aid)
    - उपकरण सब्सिडी (Subsidies for Solar Pumps, Tractors)
    - फसल बीमा (Insurance)
    - पशुपालन और डेयरी विकास
    
    नियम:
    - डेटा केवल JSON ऐरे फॉर्मैट में हो।
    - सभी जानकारी पूरी तरह शुद्ध हिंदी में हो।
    - लिंक (link) में केवल आधिकारिक सरकारी पोर्टल की लिंक दें।
    - 'benefits' एक स्ट्रिंग ऐरे होना चाहिए।`;

    let response;
    try {
      console.log("Fetching schemes with Grounding...");
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Government Scheme Consultant for Indian Farmers. Provide real and current schemes in JSON format.",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY" as any,
            items: {
              type: "OBJECT" as any,
              properties: {
                title: { type: "STRING" },
                description: { type: "STRING" },
                benefits: { type: "ARRAY" as any, items: { type: "STRING" } },
                eligibility: { type: "STRING" },
                howToApply: { type: "STRING" },
                link: { type: "STRING" },
                category: { type: "STRING" },
                type: { type: "STRING" }
              },
              required: ["title", "description", "benefits", "eligibility", "howToApply"]
            }
          }
        }
      });
    } catch (searchError) {
      console.warn("Scheme grounding failed, using standard generation...", searchError);
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Government Scheme Consultant for Indian Farmers. Provide 10 most important agri schemes in JSON format using your latest knowledge.",
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY" as any,
            items: {
              type: "OBJECT" as any,
              properties: {
                title: { type: "STRING" },
                description: { type: "STRING" },
                benefits: { type: "ARRAY" as any, items: { type: "STRING" } },
                eligibility: { type: "STRING" },
                howToApply: { type: "STRING" },
                link: { type: "STRING" },
                category: { type: "STRING" },
                type: { type: "STRING" }
              },
              required: ["title", "description", "benefits", "eligibility", "howToApply"]
            }
          }
        }
      });
    }

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
    const isQuotaError = friendlyError.type === 'quota';
    if (isQuotaError) {
      console.warn("Gemini API Quota Exceeded for Schemes. Using fallback.");
    } else {
      console.error("Critical error fetching schemes:", error);
    }

    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }

    return fallbackData;
  }
};
