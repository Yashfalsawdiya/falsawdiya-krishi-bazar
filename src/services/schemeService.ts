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
  objective: string;
  benefits: string[];
  subsidyDetails: string;
  sector: string;
  governmentLevel: 'Central' | 'State' | string;
  eligibility: string;
  requiredDocuments: string[];
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
  const CACHE_DURATION = 10 * 1000; // 10 seconds for real-time update as requested by user ("Google से real-time में fetch हों")

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
      objective: "सीमांत और छोटे किसानों को आय सहायता प्रदान करना।",
      benefits: ["2000 रुपये की 3 किस्तें", "सीधे बैंक खाते में पैसा"],
      subsidyDetails: "100% केंद्र सरकार द्वारा वित्त पोषित",
      sector: "वित्तीय सहायता (Direct Benefit Transfer)",
      governmentLevel: "Central",
      eligibility: "सभी भूमिधारक किसान परिवार",
      requiredDocuments: ["आधार कार्ड", "खतौनी/राजस्व दस्तावेज", "बैंक खाता विवरण"],
      howToApply: "पीएम-किसान पोर्टल या CSC केंद्र के माध्यम से पंजीकरण करें।"
    },
    {
      title: "मुख्यमंत्री किसान कल्याण योजना (MP CM-Kisan)",
      description: "मध्य प्रदेश सरकार द्वारा पीएम-किसान के लाभार्थियों को अतिरिक्त आर्थिक सहायता।",
      objective: "राज्य के किसानों की आर्थिक स्थिति में सुधार करना।",
      benefits: ["4000 रुपये अतिरिक्त आर्थिक सहायता", "पीएम-किसान के साथ जुड़ाव"],
      subsidyDetails: "राज्य सरकार द्वारा अतिरिक्त भुगतान",
      sector: "वित्तीय सहायता",
      governmentLevel: "State (MP)",
      eligibility: "पीएम-किसान योजना के पात्र किसान",
      requiredDocuments: ["पीएम-किसान आईडी", "बैंक विवरण"],
      howToApply: "पीएम-किसान की पात्रता के आधार पर स्वतः लाभ।"
    }
  ];

  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");
    
    const prompt = `आज ${dateStr} तक की जानकारी के अनुसार भारत (Central Govt) और मध्य प्रदेश (MP State Govt) की नवीनतम और सबसे महत्वपूर्ण 20 कृषि योजनाओं (Government Schemes for Farmers) की बहुत ही विस्तृत और प्रोफेशनल सूची प्रदान करें।
    
    प्रत्येक योजना में निम्नलिखित जानकारी शामिल होनी चाहिए (Strictly JSON format):
    - title: योजना का पूरा नाम
    - governmentLevel: 'Central' या 'State'
    - description: संक्षिप्त विवरण
    - objective: योजना का मुख्य उद्देश्य (विस्तार से)
    - benefits: किसान को मिलने वाले लाभ (Array of strings)
    - subsidyDetails: सब्सिडी या वित्तीय सहायता का विवरण (जैसे 50% सब्सिडी, ट्रैक्टर पर 1 लाख छूट आदि)
    - sector: संबंधित क्षेत्र (जैस Infrastructure, Irrigation, Solar, Tractor, Insurance, Fertilizer, Dairy आदि)
    - eligibility: कौन आवेदन कर सकता है (पात्रता)
    - requiredDocuments: आवश्यक दस्तावेज (Array of strings)
    - howToApply: आवेदन कैसे करें
    - link: आधिकारिक सरकारी वेबसाइट लिंक
    
    नियम:
    - डेटा केवल JSON ऐरे फॉर्मैट में हो।
    - सभी जानकारी पूरी तरह शुद्ध हिंदी में हो।
    - 'benefits' और 'requiredDocuments' स्ट्रिंग ऐरे (Array) होने चाहिए।
    - जितनी ज्यादा हो सके केंद्र और राज्य दोनों की योजनाओं को कवर करें।`;

    let response;
    try {
      console.log("Fetching detailed schemes with Grounding...");
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Government Scheme Consultant for Indian Farmers representing 'Falsawdiya Krishi Bazar' (Shamgarh, MP). Provide professional, detailed, and current schemes in a structured JSON format.",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY" as any,
            items: {
              type: "OBJECT" as any,
              properties: {
                title: { type: "STRING" },
                governmentLevel: { type: "STRING" },
                description: { type: "STRING" },
                objective: { type: "STRING" },
                benefits: { type: "ARRAY" as any, items: { type: "STRING" } },
                subsidyDetails: { type: "STRING" },
                sector: { type: "STRING" },
                eligibility: { type: "STRING" },
                requiredDocuments: { type: "ARRAY" as any, items: { type: "STRING" } },
                howToApply: { type: "STRING" },
                link: { type: "STRING" }
              },
              required: ["title", "governmentLevel", "description", "objective", "benefits", "subsidyDetails", "sector", "eligibility", "requiredDocuments", "howToApply"]
            }
          }
        }
      });
    } catch (searchError) {
      console.warn("Scheme grounding failed, using standard generation...", searchError);
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Government Scheme Consultant representing 'Falsawdiya Krishi Bazar' (Shamgarh, MP). Provide 20 most important agri schemes in JSON format using latest knowledge.",
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY" as any,
            items: {
              type: "OBJECT" as any,
              properties: {
                title: { type: "STRING" },
                governmentLevel: { type: "STRING" },
                description: { type: "STRING" },
                objective: { type: "STRING" },
                benefits: { type: "ARRAY" as any, items: { type: "STRING" } },
                subsidyDetails: { type: "STRING" },
                sector: { type: "STRING" },
                eligibility: { type: "STRING" },
                requiredDocuments: { type: "ARRAY" as any, items: { type: "STRING" } },
                howToApply: { type: "STRING" },
                link: { type: "STRING" }
              },
              required: ["title", "governmentLevel", "description", "objective", "benefits", "subsidyDetails", "sector", "eligibility", "requiredDocuments", "howToApply"]
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
