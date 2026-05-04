import { GoogleGenAI } from "@google/genai";

const getAI = (userApiKey?: string) => {
  let apiKey = userApiKey;
  
  // If userApiKey is empty or undefined, look for environment variables
  if (!apiKey || apiKey.trim() === "") {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  }

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export async function detectDisease(base64Image: string, userApiKey?: string) {
  try {
    const ai = getAI(userApiKey);
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: {
        parts: [
          {
            text: `You are an expert Indian agricultural scientist and plant pathologist. 
            Analyze this photo of a crop leaf or plant. 
            
            Identify:
            1. **Crop Name (फसल का नाम)**
            2. **Disease or Pest Type (बीमारी या कीट का प्रकार)**: Identify if it is a disease, a **Sucking Pest (रस चूसने वाला कीट)** like Aphids/Thrips/Whitefly, or a **Chewing Pest (चबाने वाला कीट)** like Caterpillars/Bollworms.
            3. **Specific Name (नाम)**: Name of the disease or specific pest.
            4. **Symptoms (लक्षण)**: What is visible in the photo? (e.g., leaf curling, holes, spots, etc.)
            5. **Recommended Treatment (उपचार)**: 
               - Provide specific names of pesticides, insecticides, or fungicides (e.g., Imidacloprid for sucking pests, Chlorantraniliprole for chewing pests, etc.).
               - Provide the EXACT dosage (मात्रा) per liter of water or per acre.
               - Provide application instructions (how to spray, when to spray, safety precautions).
            6. **Prevention (बचाव)**: How to prevent this in the future.
            
            CRITICAL: Provide the entire response in CLEAR, SIMPLE HINDI (with English terms in brackets where necessary). 
            The tone should be helpful and professional. Use formatting like bold text and bullet points for readability.`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    });

    return response.text;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      return "क्षमा करें, हमारी सेवा की सीमा (Quota) समाप्त हो गई है। कृपया कुछ देर बाद (लगभग 1-2 घंटे) फिर से प्रयास करें। (Service quota exceeded. Please try again in 1-2 hours.)";
    }
    return "क्षमा करें, बीमारी का पता लगाने में समस्या हुई। कृपया सुनिश्चित करें कि इंटरनेट चालू है और फोटो साफ़ है। (Error detecting disease. Please check connection and photo quality.)";
  }
}

export async function getDynamicAdvice(weatherData: any, season: string, cropName: string, userApiKey?: string) {
  const CACHE_KEY = `agri_advice_${cropName}_${season}`;
  const CACHE_TIME_KEY = `${CACHE_KEY}_timestamp`;
  const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours

  try {
    const ai = getAI(userApiKey);
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
      model: "gemini-flash-latest",
      contents: { parts: [{ text: prompt }] }
    });

    const adviceText = response.text;
    
    // Save to Cache
    localStorage.setItem(CACHE_KEY, adviceText);
    localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());

    return adviceText;
  } catch (error: any) {
    console.error("Gemini Advice Error:", error);
    
    // Try to return cached advice if available
    const cachedAdvice = localStorage.getItem(CACHE_KEY);
    if (cachedAdvice) {
      return cachedAdvice + "\n\n*(नोट: यह पहले से सहेजी गई सलाह है, क्योंकि अभी इंटरनेट या सर्वर उपलब्ध नहीं है)*";
    }

    if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      return "वर्तमान में सलाह उपलब्ध नहीं है क्योंकि सेवा की सीमा (Quota) समाप्त हो गई है। कृपया बाद में प्रयास करें।";
    }
    return "वर्तमान में सलाह उपलब्ध नहीं है। कृपया बाद में प्रयास करें।";
  }
}

export async function askAiQuestion(question: string, weatherData: any, userApiKey?: string) {
  try {
    const ai = getAI(userApiKey);
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
      model: "gemini-flash-latest",
      contents: { parts: [{ text: prompt }] }
    });

    return response.text;
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      return "क्षमा करें, सेवा की सीमा (Quota) समाप्त हो गई है। कृपया बाद में प्रयास करें।";
    }
    return "क्षमा करें, आपके प्रश्न का उत्तर देने में समस्या हुई। कृपया पुनः प्रयास करें।";
  }
}
