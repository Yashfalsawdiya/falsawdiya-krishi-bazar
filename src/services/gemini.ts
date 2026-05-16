import { GoogleGenAI } from "@google/genai";
import { getFriendlyAiError } from "../utils/aiErrorHandler";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey;
  
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export interface DiseaseAnalysis {
  analysis: string;
  keywords: string[];
}

export async function detectDisease(base64Image: string, userApiKey?: string): Promise<DiseaseAnalysis> {
  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");
    
    const prompt = `You are an expert Indian agricultural scientist and plant pathologist. 
            Analyze this photo of a crop leaf or plant. 
            
            Identify:
            1. **Crop Name (फसल का नाम)**
            2. **Disease or Pest Type (बीमारी या कीट का प्रकार)**: Identify if it is a disease, a Sucking Pest, or a Chewing Pest.
            3. **Specific Name (नाम)**: Name of the disease or specific pest.
            4. **Symptoms (लक्षण)**: What is visible in the photo?
            5. **Recommended Treatment (उपचार)**: Detailed chemical and organic solutions with dosage.
            6. **Prevention (बचाव)**: Long-term prevention tips.
            
            FORMATTING INSTRUCTIONS:
            1. Provide the analysis in CLEAR, SIMPLE HINDI with English terms in brackets.
            2. At the very end of your response, provide a list of search keywords (active ingredients or pesticide categories) separated by commas that can be used to search for real products in a store.
            
            Return the result as a JSON object with two fields:
            - 'analysis': The markdown string in Hindi.
            - 'keywords': An array of strings (e.g. ["Imidacloprid", "Fungicide", "Insecticide", "Thrips"]).
            
            Example JSON Response:
            {
              "analysis": "markdown text here...",
              "keywords": ["Imidacloprid", "Insecticide"]
            }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    });

    const text = response.text;
    try {
      const jsonStr = text.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      // Fallback if parsing fails
      return {
        analysis: text,
        keywords: []
      };
    }
  } catch (error: any) {
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    console.error("Gemini Error:", error);
    return {
      analysis: friendlyError.message,
      keywords: []
    };
  }
}

export async function getDynamicAdvice(weatherData: any, season: string, cropName: string, userApiKey?: string) {
  const CACHE_KEY = `agri_advice_${cropName}_${season}`;
  const CACHE_TIME_KEY = `${CACHE_KEY}_timestamp`;
  const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours

  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");
    const now = new Date();
    const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });

    const prompt = `You are an expert Indian agricultural scientist. 
    Current Context:
    - Current Date: ${dateStr}
    - Current Time: ${timeStr}
    - Location: Shamgarh, Madhya Pradesh
    - Season: ${season}
    - Weather: ${weatherData.temp}°C, Humidity: ${weatherData.humidity}%, Rain: ${weatherData.rain}mm, Condition: ${weatherData.condition}
    - Crop: ${cropName}
    
    Provide a daily agricultural bulletin for a farmer in Hindi for TODAY (${dateStr}). 
    CRITICAL: Use the current date (${dateStr}) in your response. Do NOT use any other dates like '22 May'.
    
    Include:
    1. Current status of the crop for this season.
    2. Specific advice for today based on the weather (e.g., if it's hot, advise on irrigation; if rainy, advise on drainage or avoiding spray).
    3. Recommended fertilizers or pesticides if applicable for this stage.
    4. A 'Pro Tip' for better yield.
    
    Keep the language simple, encouraging, and farmer-friendly. Use bullet points.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] }
    });

    const adviceText = response.text;
    
    // Save to Cache
    localStorage.setItem(CACHE_KEY, adviceText);
    localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());

    return adviceText;
  } catch (error: any) {
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    console.error("Gemini Advice Error:", error);
    
    // Try to return cached advice if available
    const cachedAdvice = localStorage.getItem(CACHE_KEY);
    if (cachedAdvice) {
      return cachedAdvice + `\n\n*(नोट: ${friendlyError.message})*`;
    }

    return friendlyError.message;
  }
}

export async function askAiQuestion(question: string, weatherData: any, userApiKey?: string) {
  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");
    const now = new Date();
    const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const prompt = `You are an expert Indian agricultural scientist and a helpful assistant for farmers.
    Current Context:
    - Date: ${dateStr}
    - Location: Shamgarh, Madhya Pradesh
    - Current Weather: ${weatherData?.temp || 'N/A'}°C, Condition: ${weatherData?.condition || 'N/A'}
    
    User Question: "${question}"
    
    Instructions:
    1. Answer the farmer's question in simple, clear Hindi.
    2. If the question is about farming, crops, pests, or weather, provide detailed and scientifically accurate advice.
    3. If the question is not related to agriculture, politely remind the farmer that you are an agricultural assistant but try to be helpful if possible.
    4. Use bullet points and bold text for readability.
    5. Keep the tone respectful and encouraging.
    6. If the user asks in another language, respond in Hindi but acknowledge their question.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] }
    });

    return response.text;
  } catch (error: any) {
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    console.error("Gemini Chat Error:", error);
    return friendlyError.message;
  }
}
