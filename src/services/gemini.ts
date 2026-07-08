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
            2. At the very end of your response, provide a list of search keywords (active ingredients or pesticide categories) separated by commas that can be used to search for real products in a store.`;

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
      },
      config: {
        systemInstruction: "You are an expert plant pathologist representing 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar). Located in Shamgarh, MP. Our shop is located at Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). Our shop timings are 8:00 AM to 8:00 PM every day (सुबह 8:00 बजे से रात 8:00 बजे तक). Always provide detailed analysis in Hindi, mention that recommended products are available at our shop 'फल्सावदिया कृषि बाज़ार'. STRICT RULE: ONLY use 'फल्सावदिया' for the name. Never use 'फालसावदिया' (no extra aa matra). Return structured JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            analysis: { type: "STRING" },
            keywords: { type: "ARRAY" as any, items: { type: "STRING" } }
          },
          required: ["analysis", "keywords"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error: any) {
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    console.error("Gemini Disease Detection Error:", error);
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

    const prompt = `आप एक विशेषज्ञ भारतीय कृषि वैज्ञानिक हैं। 
    आज की स्थिति (${dateStr}):
    - फसल: ${cropName}
    - मौसम: ${weatherData.temp}°C, आर्द्रता: ${weatherData.humidity}%, बारिश: ${weatherData.rain}mm, स्थिति: ${weatherData.condition}
    - स्थान: शामगढ़, मध्य प्रदेश
    
    आज के लिए किसानों को विस्तृत कृषि सलाह प्रदान करें। इसमें सिंचाई, उर्वरक और कीट प्रबंधन पर विशेष जोर हो।`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `You are a helpful Agri-Expert for farmers representing 'फल्सावदिया कृषि बाज़ार' in Shamgarh, MP. Our shop is at Dimple Chauraha and open 8:00 AM to 8:00 PM (सुबह 8:00 बजे से रात 8:00 बजे तक). Provide advice based on current weather. Today is ${dateStr}. Always use the name 'फल्सावदिया कृषि बाज़ार' strictly and never 'फालसावदिया'.`,
          tools: [{ googleSearch: {} }]
        }
      });
    } catch (e) {
      console.warn("Advice Search failed, fallback to knowledge...");
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `You are a helpful Agri-Expert representing 'फल्सावदिया कृषि बाज़ार'. Shop timings: 8:00 AM to 8:00 PM (सुबह 8:00 बजे से रात 8:00 बजे तक). Provide advice for ${dateStr} based on local knowledge. Always use the name 'फल्सावदिया कृषि बाज़ार' strictly. Do NOT use 'फालसावदिया'.`
        }
      });
    }

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

    const prompt = `सवाल: "${question}"
    स्थान: शामगढ़, मध्य प्रदेश
    मौसम: ${weatherData?.temp || 'N/A'}°C, ${weatherData?.condition || 'N/A'}
    तारीख: ${dateStr}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Indian agricultural scientist representing 'फल्सावदिया कृषि बाज़ार' located in Shamgarh, Mandsaur, MP.\n\nShop Profile:\n- Name: फल्सावदिया कृषि बाज़ार\n- Address: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)\n- Timings: सुबह 8:00 बजे से रात 8:00 बजे तक (08:00 AM – 08:00 PM)\n\nInstructions: Answer farmer questions in simple Hindi. Always mention that recommended products are available at 'फल्सावदिया कृषि बाज़ार'. STICT RULE: Do not use 'फालसावदिया'.",
          tools: [{ googleSearch: {} }]
        }
      });
    } catch (e) {
      console.warn("Chat Search failed, fallback to knowledge...");
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Indian agricultural scientist representing 'फल्सावदिया कृषि बाज़ार'. Shop Timings: 8:00 AM to 8:00 PM (सुबह 8:00 बजे से रात 8:00 बजे तक). Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh, Mandsaur, MP. Answer in Hindi and properly guide people to our shop 'फल्सावदिया कृषि बाज़ार'. strictly avoid 'फालसावदिया'."
        }
      });
    }

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

export interface ProductKnowledgeResult {
  productName: string;
  companyName: string;
  technicalName: string;
  category: string;
  formulation: string;
  activeIngredient: string;
  modeOfAction: string;
  fracIracHracGroup: string;
  targetCrops: string;
  targetPests: string;
  symptoms: string;
  usage: string;
  benefits: string;
  features: string;
  compatibleProducts: string;
  incompatibleProducts: string;
  waitingPeriod: string;
  phi: string;
  rei: string;
  toxicity: string;
  safetyInstructions: string;
  mixingOrder: string;
  sprayTiming: string;
  rainfastPeriod: string;
  storage: string;
  dosageLiquid: {
    perLiter: string;
    per15L: string;
    per16L: string;
    per20L: string;
    per25L: string;
    per200L: string;
    per500L: string;
    perBigha: string;
  };
  dosagePowder: {
    perLiter: string;
    per15L: string;
    per16L: string;
    per20L: string;
    per25L: string;
    per200L: string;
    per500L: string;
    perBigha: string;
  };
  dosageFertilizer: {
    perPlant: string;
    perPot: string;
    perBigha: string;
    perIrrigation: string;
    perSpray: string;
    perDrenching: string;
    totalAmount: string;
  };
  cropSpecificDosage: Array<{
    cropName: string;
    dosage: string;
    usage: string;
    sprayTime: string;
  }>;
  hasExactMatch: boolean;
  sources?: Array<{ title: string; uri: string }>;
}

export async function getProductKnowledge(query: string, userApiKey?: string): Promise<ProductKnowledgeResult> {
  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");

    const prompt = `You are a world-class Indian agricultural product expert. Your task is to provide exhaustive, accurate, and completely verified information for the agricultural product/technical queried by the user.
    
    User Query: "${query}"

    Search Google and official agricultural resources (CIB&RC, ICAR, IFFCO, Krishi Vigyan Kendra, etc.) to get details on this product/technical/formulation.
    
    Instructions:
    1. If the product is not found or not official, write detailed alternative helpful info or mark 'hasExactMatch' as false and provide a helpful description in productName/usage.
    2. Respond strictly in clear, simple HINDI that farmers can easily understand. Translate technical terms where appropriate or provide Hindi descriptions.
    3. Ensure that the DOSAGE section is fully filled. Even if generic guidelines are available, calculate them for 1L, 15L, 16L, 20L, 25L, 200L, 500L, and 1 Bigha (बीघा) based on standard recommendations for this product class (Liquid / Powder / Fertilizer).
    4. Provide crop-specific dosages for common crops (like Soybean, Wheat, Maize, Chickpea, Cotton, etc.) if applicable.
    5. Return the result strictly as a valid JSON object matching the defined schema. Do not include markdown wraps or anything except the JSON string in response.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). Always analyze the query with high precision, search Google for real-time validation, and provide complete details in Hindi as requested. Ensure the output is valid JSON strictly following the schema. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            productName: { type: "STRING" },
            companyName: { type: "STRING" },
            technicalName: { type: "STRING" },
            category: { type: "STRING" },
            formulation: { type: "STRING" },
            activeIngredient: { type: "STRING" },
            modeOfAction: { type: "STRING" },
            fracIracHracGroup: { type: "STRING" },
            targetCrops: { type: "STRING" },
            targetPests: { type: "STRING" },
            symptoms: { type: "STRING" },
            usage: { type: "STRING" },
            benefits: { type: "STRING" },
            features: { type: "STRING" },
            compatibleProducts: { type: "STRING" },
            incompatibleProducts: { type: "STRING" },
            waitingPeriod: { type: "STRING" },
            phi: { type: "STRING" },
            rei: { type: "STRING" },
            toxicity: { type: "STRING" },
            safetyInstructions: { type: "STRING" },
            mixingOrder: { type: "STRING" },
            sprayTiming: { type: "STRING" },
            rainfastPeriod: { type: "STRING" },
            storage: { type: "STRING" },
            dosageLiquid: {
              type: "OBJECT" as any,
              properties: {
                perLiter: { type: "STRING" },
                per15L: { type: "STRING" },
                per16L: { type: "STRING" },
                per20L: { type: "STRING" },
                per25L: { type: "STRING" },
                per200L: { type: "STRING" },
                per500L: { type: "STRING" },
                perBigha: { type: "STRING" }
              },
              required: ["perLiter", "per15L", "per16L", "per20L", "per25L", "per200L", "per500L", "perBigha"]
            },
            dosagePowder: {
              type: "OBJECT" as any,
              properties: {
                perLiter: { type: "STRING" },
                per15L: { type: "STRING" },
                per16L: { type: "STRING" },
                per20L: { type: "STRING" },
                per25L: { type: "STRING" },
                per200L: { type: "STRING" },
                per500L: { type: "STRING" },
                perBigha: { type: "STRING" }
              },
              required: ["perLiter", "per15L", "per16L", "per20L", "per25L", "per200L", "per500L", "perBigha"]
            },
            dosageFertilizer: {
              type: "OBJECT" as any,
              properties: {
                perPlant: { type: "STRING" },
                perPot: { type: "STRING" },
                perBigha: { type: "STRING" },
                perIrrigation: { type: "STRING" },
                perSpray: { type: "STRING" },
                perDrenching: { type: "STRING" },
                totalAmount: { type: "STRING" }
              },
              required: ["perPlant", "perPot", "perBigha", "perIrrigation", "perSpray", "perDrenching", "totalAmount"]
            },
            cropSpecificDosage: {
              type: "ARRAY" as any,
              items: {
                type: "OBJECT" as any,
                properties: {
                  cropName: { type: "STRING" },
                  dosage: { type: "STRING" },
                  usage: { type: "STRING" },
                  sprayTime: { type: "STRING" }
                },
                required: ["cropName", "dosage", "usage", "sprayTime"]
              }
            },
            hasExactMatch: { type: "BOOLEAN" }
          },
          required: [
            "productName", "companyName", "technicalName", "category", "formulation", "activeIngredient", 
            "modeOfAction", "fracIracHracGroup", "targetCrops", "targetPests", "symptoms", "usage", 
            "benefits", "features", "compatibleProducts", "incompatibleProducts", "waitingPeriod", 
            "phi", "rei", "toxicity", "safetyInstructions", "mixingOrder", "sprayTiming", 
            "rainfastPeriod", "storage", "dosageLiquid", "dosagePowder", "dosageFertilizer", 
            "cropSpecificDosage", "hasExactMatch"
          ]
        }
      }
    });

    const result: ProductKnowledgeResult = JSON.parse(response.text);

    // Extract citations
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      result.sources = chunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({
          title: c.web.title || "Official Resource",
          uri: c.web.uri
        }));
    }

    return result;
  } catch (error: any) {
    console.error("Gemini Product Knowledge Error:", error);
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    throw new Error(friendlyError.message || "जानकारी खोजने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
  }
}
