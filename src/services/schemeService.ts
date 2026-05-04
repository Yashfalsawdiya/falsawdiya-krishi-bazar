import { GoogleGenAI } from "@google/genai";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured.");
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
}

export const fetchSchemes = async (userApiKey?: string): Promise<Scheme[]> => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const CACHE_KEY = 'agri_schemes_cache';
  const CACHE_TIME_KEY = 'agri_schemes_cache_time';
  const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  if (cachedData && cachedTime) {
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
    Provide a list of the top 5 most useful current government schemes for farmers in Madhya Pradesh as of ${dateStr}.
    Include schemes like PM-Kisan, Fasal Bima Yojana, KCC, etc.
    
    Return the data in a strict JSON format like this:
    [
      {
        "title": "Scheme Name in Hindi",
        "description": "Brief description in Hindi",
        "benefits": ["Benefit 1 in Hindi", "Benefit 2 in Hindi"],
        "eligibility": "Eligibility criteria in Hindi",
        "howToApply": "Steps to apply in Hindi",
        "link": "Official link if known"
      }
    ]
    Only return the JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: { parts: [{ text: prompt }] }
    });

    const text = response.text;
    const jsonStr = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(jsonStr);

    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());

    return data;
  } catch (error: any) {
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
