import { GoogleGenAI } from "@google/genai";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey;
  
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("USER_API_KEY_MISSING");
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
  const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

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
    }
  ];

  try {
    const ai = getAI(userApiKey);
    const prompt = `You are an expert in Indian Government Agricultural Schemes.
    Current Date: ${dateStr}.
    Provide a comprehensive, accurate and LATEST list of the top 8-10 government schemes for farmers in India, with a focus on both Central Government and Madhya Pradesh State Government schemes.
    
    Include diverse categories:
    - Financial Aid (PM-Kisan, CM-Kisan)
    - Infrastructure/Subsidies (Solar pumps under PM-KUSUM, Tractor/Drip Irrigation subsidies)
    - Insurance (Fasal Bima)
    - Equipment/Tools subsidies
    - Crop-specific incentives
    
    Return the data in a strict JSON format (Array of Objects) only:
    [
      {
        "title": "Scheme Name in Hindi",
        "description": "Clear and detailed description in Hindi",
        "benefits": ["Benefit 1 in Hindi", "Benefit 2 in Hindi"],
        "eligibility": "Who can apply (in Hindi)",
        "howToApply": "Step-by-step application process (in Hindi)",
        "link": "Official website link (URL string)",
        "category": "Central/State",
        "type": "Financial/Subsidy/Insurance/etc"
      }
    ]
    Ensure all schemes are currently active and provide real, updated information. Do not return anything except the JSON code block.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    const text = response.text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Invalid response format from AI");
    
    const data = JSON.parse(jsonMatch[0]);

    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());

    return data;
  } catch (error: any) {
    if (error.message === 'USER_API_KEY_MISSING') {
      throw error;
    }
    const isQuotaError = error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (isQuotaError) {
      console.warn("Gemini API Quota Exceeded for Schemes. Using fallback.");
    } else {
      console.error("Error fetching schemes:", error);
    }

    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }

    return fallbackData;
  }
};
