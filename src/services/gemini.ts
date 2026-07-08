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

const DEFAULT_PRODUCT_KNOWLEDGE: ProductKnowledgeResult = {
  productName: "जानकारी उपलब्ध नहीं है",
  companyName: "उपलब्ध नहीं है",
  technicalName: "उपलब्ध नहीं है",
  category: "सामान्य",
  formulation: "उपलब्ध नहीं है",
  activeIngredient: "उपलब्ध नहीं है",
  modeOfAction: "उपलब्ध नहीं है",
  fracIracHracGroup: "उपलब्ध नहीं है",
  targetCrops: "सभी फसलें",
  targetPests: "सामान्य कीट",
  symptoms: "उपलब्ध नहीं है",
  usage: "उपलब्ध नहीं है",
  benefits: "उपलब्ध नहीं है",
  features: "उपलब्ध नहीं है",
  compatibleProducts: "सभी सामान्य उत्पाद",
  incompatibleProducts: "कोई ज्ञात नहीं",
  waitingPeriod: "कोई नहीं",
  phi: "उपलब्ध नहीं है",
  rei: "उपलब्ध नहीं है",
  toxicity: "सामान्य",
  safetyInstructions: "सावधानीपूर्वक उपयोग करें। बच्चों की पहुँच से दूर रखें।",
  mixingOrder: "उपलब्ध नहीं है",
  sprayTiming: "सुबह या शाम",
  rainfastPeriod: "2 घंटे",
  storage: "ठंडी और सूखी जगह पर रखें",
  dosageLiquid: {
    perLiter: "1-2 ml",
    per15L: "15-30 ml",
    per16L: "16-32 ml",
    per20L: "20-40 ml",
    per25L: "25-50 ml",
    per200L: "200-400 ml",
    per500L: "500-1000 ml",
    perBigha: "100-200 ml"
  },
  dosagePowder: {
    perLiter: "1-2 gm",
    per15L: "15-30 gm",
    per16L: "16-32 gm",
    per20L: "20-40 gm",
    per25L: "25-50 gm",
    per200L: "200-400 gm",
    per500L: "500-1000 gm",
    perBigha: "100-200 gm"
  },
  dosageFertilizer: {
    perPlant: "5-10 gm",
    perPot: "2-5 gm",
    perBigha: "10-15 kg",
    perIrrigation: "उपलब्ध नहीं है",
    perSpray: "उपलब्ध नहीं है",
    perDrenching: "उपलब्ध नहीं है",
    totalAmount: "उपलब्ध नहीं है"
  },
  cropSpecificDosage: [],
  hasExactMatch: false
};

function cleanAndParseJson<T>(jsonText: string): T {
  // 1. Remove markdown formatting if present
  let cleaned = jsonText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }

  // 2. Character-by-character scan to escape control characters inside string literals
  let result = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escape) {
      result += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        const code = char.charCodeAt(0);
        if (code < 32) {
          result += '\\u' + code.toString(16).padStart(4, '0');
        } else {
          result += char;
        }
      }
    } else {
      result += char;
    }
  }

  // 3. Clean up common LLM JSON syntax issues
  // Fix trailing commas in objects or arrays
  result = result.replace(/,(\s*[\]}])/g, '$1');

  // Fix common Chinese/Hindi punctuation outside of strings that break JSON
  result = result.replace(/"cropSpecificDosage"\s*:\s*[।०]/g, '"cropSpecificDosage": []');
  result = result.replace(/"(dosageLiquid|dosagePowder|dosageFertilizer)"\s*:\s*[।०]/g, '"$1": {}');

  try {
    return JSON.parse(result) as T;
  } catch (firstError) {
    console.warn("Standard JSON parse failed, trying advanced regex cleaning...", firstError);
    
    // Fallback: If there are still unmatched punctuation or cutoffs, let's try to fix them.
    if (result.endsWith('।') || result.endsWith('。')) {
      result = result.slice(0, -1).trim();
    }
    
    result = result.replace(/:\s*[।०]/g, ': null');

    try {
      return JSON.parse(result) as T;
    } catch (secondError: any) {
      console.error("Advanced JSON parse also failed:", secondError);
      throw new Error(`JSON parsing failed: ${secondError.message}. Original text snippet: ${jsonText.substring(0, 100)}...`);
    }
  }
}

function safeParseProductKnowledge(jsonText: string): ProductKnowledgeResult {
  try {
    const parsed = cleanAndParseJson<any>(jsonText);
    
    // Ensure we merge with defaults so we never have undefined/null values that crash the UI
    const result: ProductKnowledgeResult = {
      ...DEFAULT_PRODUCT_KNOWLEDGE,
      ...parsed
    };

    // Ensure object fields are actually objects
    if (parsed.dosageLiquid && typeof parsed.dosageLiquid === 'object') {
      result.dosageLiquid = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosageLiquid, ...parsed.dosageLiquid };
    } else {
      result.dosageLiquid = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosageLiquid };
    }

    if (parsed.dosagePowder && typeof parsed.dosagePowder === 'object') {
      result.dosagePowder = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosagePowder, ...parsed.dosagePowder };
    } else {
      result.dosagePowder = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosagePowder };
    }

    if (parsed.dosageFertilizer && typeof parsed.dosageFertilizer === 'object') {
      result.dosageFertilizer = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosageFertilizer, ...parsed.dosageFertilizer };
    } else {
      result.dosageFertilizer = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosageFertilizer };
    }

    // Ensure cropSpecificDosage is always an array of objects
    if (Array.isArray(parsed.cropSpecificDosage)) {
      result.cropSpecificDosage = parsed.cropSpecificDosage.map((item: any) => ({
        cropName: item?.cropName || "अज्ञात फसल",
        dosage: item?.dosage || "उपलब्ध नहीं है",
        usage: item?.usage || "उपलब्ध नहीं है",
        sprayTime: item?.sprayTime || "उपलब्ध नहीं है"
      }));
    } else {
      result.cropSpecificDosage = [];
    }

    // Handle sources
    if (Array.isArray(parsed.sources)) {
      result.sources = parsed.sources;
    }

    return result;
  } catch (error) {
    console.error("safeParseProductKnowledge Error, returning default object", error);
    return { ...DEFAULT_PRODUCT_KNOWLEDGE };
  }
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

    const responseSchema = {
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
    };

    const systemInstruction = "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). Always analyze the query with high precision, search Google for real-time validation, and provide complete details in Hindi as requested. Ensure the output is valid JSON strictly following the schema. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').";

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema
        }
      });
    } catch (searchError: any) {
      console.warn("Google search grounding failed in getProductKnowledge. Retrying without search tool.", searchError);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema
        }
      });
    }

    const result = safeParseProductKnowledge(response.text);

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
    console.warn("Gemini Product Knowledge Error:", error);
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    throw new Error(friendlyError.message || "जानकारी खोजने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
  }
}

export async function analyzeProductImage(base64Image: string, userApiKey?: string): Promise<ProductKnowledgeResult> {
  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");

    const prompt = `You are a world-class Indian agricultural product expert and advanced image recognition AI.
    Your task is to analyze the attached photo of an agricultural product (fertilizer, insecticide, fungicide, herbicide, PGR, micronutrient, biostimulant, seed, animal nutrition, etc.).
    
    CRITICAL ANALYSIS STEPS:
    1. **De-blur & Image Enhancing**: If the photo is blurry, dark, low-quality, or taken at an angle, simulate digital enhancement in your reasoning. Carefully read the text elements, logos, color patterns, and label details to reconstruct the visible characters.
    2. **OCR & Label Extraction**: Perform OCR on all visible text on the product label. Read the brand name, chemical composition, company name, formulation, or registration numbers.
    3. **Product Recognition**: Identify the Product Name, Company Name, Technical Name, Category, and Formulation.
    4. **Knowledge Retrieval**: Once the product is identified, retrieve exhaustive, accurate, and completely verified agricultural details for this product (its active ingredients, mode of action, group, recommended dosage, safety instructions, target crops, target pests, etc.).
    
    Instructions:
    - Respond strictly in clear, simple HINDI so farmers can easily understand. Translate technical terms or provide Hindi descriptions.
    - Ensure that the DOSAGE section is fully filled. Even if generic guidelines are available, calculate them for 1L, 15L, 16L, 20L, 25L, 200L, 500L, and 1 Bigha (बीघा) based on standard recommendations for this product class (Liquid / Powder / Fertilizer).
    - Provide crop-specific dosages for common crops (like Soybean, Wheat, Maize, Chickpea, Cotton, etc.) if applicable.
    - If the image does not show an agricultural product, or if the product is not recognized at all, provide a helpful general response, set 'hasExactMatch' to false, and explain in productName/usage what was visible in the image.
    - Return the result strictly as a valid JSON object matching the defined schema. Do not include markdown wraps or anything except the JSON string in response.`;

    const responseSchema = {
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
    };

    const systemInstruction = "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). Always analyze the query with high precision, search Google for real-time validation, and provide complete details in Hindi as requested. Ensure the output is valid JSON strictly following the schema. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').";

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ],
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema
        }
      });
    } catch (searchError: any) {
      console.warn("Google search grounding failed in analyzeProductImage. Retrying without search tool.", searchError);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema
        }
      });
    }

    const result = safeParseProductKnowledge(response.text);

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
    console.error("Gemini Analyze Product Image Error:", error);
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    throw new Error(friendlyError.message || "इमेज का विश्लेषण करने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
  }
}

