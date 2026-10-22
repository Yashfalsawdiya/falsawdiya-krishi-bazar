import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import { getFriendlyAiError } from "../utils/aiErrorHandler";

function isQuotaError(error: any): boolean {
  const status = error?.status || error?.code;
  const msg = (error?.message || String(error)).toLowerCase();
  return status === 429 || status === 'RESOURCE_EXHAUSTED' || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
}

export const PRIMARY_GEMINI_MODEL = "gemini-3.6-flash";
export const FALLBACK_GEMINI_MODEL = "gemini-3.5-flash";
export const TERTIARY_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const CANDIDATE_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite"
];

const modelFailureCooldowns = new Map<string, number>();

export function isModelTemporarilyUnhealthy(model: string): boolean {
  const expiry = modelFailureCooldowns.get(model);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    modelFailureCooldowns.delete(model);
    return false;
  }
  return true;
}

export function markModelTemporaryFailure(model: string, error: any) {
  const status = error?.status || error?.code;
  const msg = (error?.message || String(error)).toLowerCase();
  if (status === 503 || status === 429 || msg.includes('503') || msg.includes('high demand') || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
    modelFailureCooldowns.set(model, Date.now() + 90 * 1000);
  }
}

export function getPrioritizedModels(models: string[] = CANDIDATE_GEMINI_MODELS): string[] {
  const healthy = models.filter(m => !isModelTemporarilyUnhealthy(m));
  const cooling = models.filter(m => isModelTemporarilyUnhealthy(m));
  return healthy.length > 0 ? [...healthy, ...cooling] : models;
}

const getAI = (userApiKey?: string) => {
  // STRICT USER-SPECIFIC API KEY: We never fall back to shared/central environment keys
  const apiKey = userApiKey?.trim();
  
  if (!apiKey || apiKey === "") {
    return null;
  }
  
  return new GoogleGenAI({ apiKey });
};

export interface ChemicalItem {
  medicineName: string;
  dosagePump: string;
  dosageAcre?: string;
  instructions?: string;
}

export interface OrganicItem {
  methodName: string;
  dosage: string;
  instructions?: string;
}

export interface DiseaseAnalysis {
  analysis: string;
  keywords: string[];
  cropName?: string;
  problemType?: string;
  diseaseName?: string;
  severity?: string;
  symptoms?: string[];
  chemicalControl?: ChemicalItem[];
  organicControl?: OrganicItem[];
  preventionTips?: string[];
  shopNotice?: string;
}

/**
 * Safely normalizes and extracts a complete DiseaseAnalysis object
 * even if the model returned plain text or slightly broken JSON.
 */
function parseDiseaseResponse(rawText: string): DiseaseAnalysis {
  try {
    const parsed = cleanAndParseJson<DiseaseAnalysis>(rawText);
    if (parsed && typeof parsed === 'object') {
      const cleanAnalysis = (parsed.analysis || rawText).replace(/<br\s*\/?>/gi, '\n');
      return {
        analysis: cleanAnalysis,
        keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 
          ? parsed.keywords 
          : ['कीटनाशक', 'फफूंदनाशक', 'कृषि सुरक्षा'],
        cropName: parsed.cropName || 'पहचानी गई फसल',
        problemType: parsed.problemType || 'फसल रोग / कीट प्रकोप',
        diseaseName: parsed.diseaseName || 'लक्षण आधारित रोग रिपोर्ट',
        severity: parsed.severity || 'मध्यम (Moderate)',
        symptoms: Array.isArray(parsed.symptoms) && parsed.symptoms.length > 0 
          ? parsed.symptoms 
          : ['पत्तियों या तने पर दिखाई देने वाले धब्बे/लक्षण'],
        chemicalControl: Array.isArray(parsed.chemicalControl) ? parsed.chemicalControl : [],
        organicControl: Array.isArray(parsed.organicControl) ? parsed.organicControl : [],
        preventionTips: Array.isArray(parsed.preventionTips) && parsed.preventionTips.length > 0 
          ? parsed.preventionTips 
          : ['खेत की नियमित निगरानी करें', 'सही मात्रा में सुबह या शाम को छिड़काव करें'],
        shopNotice: parsed.shopNotice
      };
    }
  } catch (parseErr) {
    console.warn("[parseDiseaseResponse] JSON parse notice, recovering text analysis:", parseErr);
  }

  // Graceful text recovery fallback
  const cleanText = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  return {
    analysis: cleanText.replace(/<br\s*\/?>/gi, '\n'),
    keywords: ['कीटनाशक', 'फफूंदनाशक', 'कृषि सुरक्षा'],
    cropName: 'पहचानी गई फसल',
    problemType: 'फसल स्वास्थ्य विश्लेषण',
    diseaseName: 'विस्तृत रिपोर्ट',
    severity: 'मध्यम (Moderate)',
    symptoms: ['फोटो में दिखाई दे रहे लक्षण'],
    chemicalControl: [],
    organicControl: [],
    preventionTips: ['दवा का सही मात्रा में छिड़काव करें', 'नियमित रूप से खेत की निगरानी करें']
  };
}

export async function detectDisease(base64Image: string | string[], userApiKey?: string, language: 'hi' | 'en' = 'hi'): Promise<DiseaseAnalysis> {
  const ai = getAI(userApiKey);
  if (!ai) throw new Error("GEMINI_KEY_NOT_SET");
  
  const imageList: string[] = Array.isArray(base64Image) ? base64Image : [base64Image];
  if (imageList.length === 0) {
    throw new Error("NO_IMAGE_PROVIDED");
  }

  const isMultiple = imageList.length > 1;

  const prompt = isMultiple
    ? `You are an expert Indian agricultural scientist and plant pathologist. 
          You are provided with ${imageList.length} different photos of the same crop/plant problem (which may include full plant view, close-up of affected leaves, stem, flower/fruit, or insect/pest). 
          
          Perform a combined, comprehensive, and highly accurate diagnosis by cross-referencing ALL ${imageList.length} attached photos.
          
          Identify:
          1. **Crop Name**
          2. **Disease or Pest Type**: Identify if it is a fungal/bacterial/viral disease, a Sucking Pest, Chewing Pest, or Nutrient Deficiency.
          3. **Specific Name**: Name of the disease or specific pest with scientific name.
          4. **Symptoms**: Pointwise detailed symptoms observed across the provided photos.
          5. **Recommended Treatment**: Pointwise chemical and organic solutions with dosage (per 15L/20L pump and per Bigha/Acre).
          6. **Prevention & Precautions**: Pointwise long-term prevention tips and spray recommendations.
          
          FORMATTING INSTRUCTIONS:
          1. Respond only in ${language === 'en' ? 'English' : 'Hindi'} using natural, correct grammar.
          2. NEVER use HTML tags like <br> or <p>. Use clean standard newlines and bullet points.
          3. Provide keywords array for matching shop products.`
    : `You are an expert Indian agricultural scientist and plant pathologist. 
          Analyze this photo of a crop leaf or plant. 
          
          Identify:
          1. **Crop Name**
          2. **Disease or Pest Type**: Identify if it is a disease, a Sucking Pest, or a Chewing Pest.
          3. **Specific Name**: Name of the disease or specific pest with scientific name.
          4. **Symptoms**: Pointwise what is visible in the photo.
          5. **Recommended Treatment**: Pointwise chemical and organic solutions with dosage.
          6. **Prevention**: Pointwise long-term prevention tips.
          
          FORMATTING INSTRUCTIONS:
          1. Respond only in ${language === 'en' ? 'English' : 'Hindi'} using natural, correct grammar.
          2. NEVER use HTML tags like <br> or <p>. Use clean standard newlines and bullet points.
          3. Provide keywords array for matching shop products.`;

  const parts: any[] = [{ text: prompt }];

  // Dynamic MIME type detection from Base64 Data URL (prevents invalid argument error on PNG/WebP)
  imageList.forEach((img) => {
    let mimeType = "image/jpeg";
    if (img.startsWith("data:")) {
      const match = img.match(/^data:([^;]+);base64,/);
      if (match && match[1]) {
        mimeType = match[1];
      }
    }
    const cleanData = img.split(',')[1] || img;
    parts.push({
      inlineData: {
        mimeType,
        data: cleanData
      }
    });
  });

  const systemInstruction = language === 'en'
    ? "You are an expert plant pathologist representing 'Falsawdiya Krishi Bazaar' (Shamgarh, MP). Hours: 8:00 AM to 8:00 PM daily. Respond only in English using natural, correct grammar. NEVER include HTML tags like <br> or <p>. Return structured JSON."
    : "You are an expert plant pathologist representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar). Located in Shamgarh, MP. Shop address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). Hours: 8:00 AM to 8:00 PM daily. Respond only in Hindi using natural, correct grammar. STRICT RULE: ONLY use 'फल्सावदिया' for the name. Never use 'फालसावदिया'. NEVER include HTML tags like <br> or <p>. Return structured JSON.";

  // Schema with resilient optional nested fields to prevent validation failures on atypical or healthy crop photos
  const responseSchema = {
    type: "OBJECT" as any,
    properties: {
      analysis: { type: "STRING", description: "Complete text report in Hindi without HTML tags" },
      cropName: { type: "STRING", description: "Crop name in Hindi with English in brackets" },
      problemType: { type: "STRING", description: "Pest or disease category, e.g. रस चूसक कीट, फफूंद जनित रोग" },
      diseaseName: { type: "STRING", description: "Specific pest or disease name with scientific name" },
      severity: { type: "STRING", description: "Severity level: 'सामान्य (Mild)' or 'मध्यम (Moderate)' or 'गंभीर (Severe)'" },
      symptoms: { type: "ARRAY" as any, items: { type: "STRING" }, description: "Pointwise list of observed symptoms" },
      chemicalControl: {
        type: "ARRAY" as any,
        items: {
          type: "OBJECT" as any,
          properties: {
            medicineName: { type: "STRING" },
            dosagePump: { type: "STRING" },
            dosageAcre: { type: "STRING" },
            instructions: { type: "STRING" }
          }
        }
      },
      organicControl: {
        type: "ARRAY" as any,
        items: {
          type: "OBJECT" as any,
          properties: {
            methodName: { type: "STRING" },
            dosage: { type: "STRING" },
            instructions: { type: "STRING" }
          }
        }
      },
      preventionTips: { type: "ARRAY" as any, items: { type: "STRING" }, description: "Pointwise list of precautions" },
      shopNotice: { type: "STRING" },
      keywords: { type: "ARRAY" as any, items: { type: "STRING" } }
    },
    required: ["analysis", "keywords"]
  };

  // 3-Tier Resilient Model Failover Chain
  // gemini-3.6-flash -> gemini-3.5-flash -> gemini-3.1-flash-lite
  const candidateModels = [
    PRIMARY_GEMINI_MODEL,  // gemini-3.6-flash
    FALLBACK_GEMINI_MODEL, // gemini-3.5-flash
    TERTIARY_GEMINI_MODEL  // gemini-3.1-flash-lite
  ];

  let response: any = null;
  let lastError: any = null;

  for (const model of candidateModels) {
    // 1. Try with structured responseSchema
    try {
      response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      if (response?.text) {
        console.log(`[detectDisease] Successfully analyzed with ${model}`);
        break;
      }
    } catch (schemaErr: any) {
      console.warn(`[detectDisease] Model ${model} structured attempt notice:`, schemaErr?.status, schemaErr?.message);
      
      // 2. Retry with same model without strict schema (json mode only)
      try {
        response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: {
            systemInstruction: `${systemInstruction} Return valid JSON output adhering to standard disease analysis structure.`,
            responseMimeType: "application/json"
          }
        });
        if (response?.text) {
          console.log(`[detectDisease] Successfully analyzed with ${model} (fallback JSON mode)`);
          break;
        }
      } catch (jsonErr: any) {
        lastError = jsonErr;
        console.warn(`[detectDisease] Model ${model} failed, switching to next candidate model...`, jsonErr?.status, jsonErr?.message);
      }
    }
  }

  if (!response?.text) {
    const friendlyError = getFriendlyAiError(lastError);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    throw new Error(friendlyError.message || "फसल बीमारी की जांच नहीं हो सकी। कृपया पुनः प्रयास करें।");
  }

  return parseDiseaseResponse(response.text);
}


export interface ReportChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface DiseaseReportChatInput {
  reportAnalysis: string;
  userQuestion: string;
  chatHistory: ReportChatMessage[];
  location?: string;
  weatherSummary?: string;
  userApiKey?: string;
  language?: 'hi' | 'en';
}

export async function askDiseaseReportChat({
  reportAnalysis,
  userQuestion,
  chatHistory,
  location = "शामगढ़, मंदसौर, मध्य प्रदेश",
  weatherSummary = "सामान्‍य",
  userApiKey,
  language = 'hi'
}: DiseaseReportChatInput): Promise<string> {
  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");

    const historyPrompt = chatHistory && chatHistory.length > 0 
      ? chatHistory.map(m => `${m.role === 'user' ? (language === 'en' ? 'Farmer' : 'किसान') : (language === 'en' ? 'AI Agronomist' : 'AI विशेषज्ञ')}: ${m.text}`).join('\n')
      : (language === 'en' ? 'No prior conversation' : 'कोई पूर्व बातचीत नहीं');

    const systemInstruction = `You are a senior agricultural advisor and plant pathologist at 'Falsawdiya Krishi Bazaar' (Shamgarh, MP).
    Respond only in ${language === 'en' ? 'English' : 'Hindi'} using natural, correct grammar.
    
    Scan Report context:
    -------------------------------------------
    ${reportAnalysis}
    -------------------------------------------
    Location: ${location}
    Weather: ${weatherSummary}
    
    Guidelines:
    1. Respond only in ${language === 'en' ? 'English' : 'Hindi'} using natural, correct grammar.
    2. Provide clear, point-wise actionable agronomy advice.
    3. State tank-mixing order if asked (1. Water, 2. WDG, 3. WP, 4. SC, 5. EC, 6. SL, 7. Adjuvant).
    4. Provide dosages per 15L/20L pump and per acre.
    5. Always state that recommended medicines are available at 'Falsawdiya Krishi Bazaar' (फल्सावदिया कृषि बाजार).`;

    const prompt = `Previous conversation:
${historyPrompt}

Farmer's question:
"${userQuestion}"`;

    let responseText: string | null = null;
    let lastError: any = null;

    for (const model of CANDIDATE_GEMINI_MODELS) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7
          }
        });
        if (resp?.text) {
          responseText = resp.text;
          break;
        }
      } catch (e: any) {
        lastError = e;
        console.warn(`[askDiseaseReportChat] Model ${model} failed, trying next candidate:`, e?.status, e?.message);
      }
    }

    if (!responseText) {
      throw lastError || new Error("उत्तर प्राप्त नहीं हो सका");
    }

    return responseText;
  } catch (error: any) {
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    console.error("Gemini Disease Report Chat Error:", error);
    return friendlyError.message || "उत्तर प्राप्त करने में समस्या आई।";
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
    const systemInstruction = `You are a helpful Agri-Expert for farmers representing 'फल्सावदिया कृषि बाजार' in Shamgarh, MP. Our shop is at Dimple Chauraha and open 8:00 AM to 8:00 PM (सुबह 8:00 बजे से रात 8:00 बजे तक). Provide advice based on current weather. Today is ${dateStr}. Always use the name 'फल्सावदिया कृषि बाजार' strictly and never 'फालसावदिया'.`;

    try {
      // Tier 1: Try with live Google Search Grounding
      response = await ai.models.generateContent({
        model: PRIMARY_GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }]
        }
      });
    } catch (searchErr: any) {
      console.warn("Dynamic advice search attempt failed, falling back to core agricultural knowledge...", searchErr);
      try {
        // Tier 2: Try primary model without search tool
        response = await ai.models.generateContent({
          model: PRIMARY_GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction
          }
        });
        } catch (primaryErr: any) {
          console.warn("Primary model fallback failed, trying secondary model...", primaryErr);
          try {
            // Tier 3: Secondary fallback model without search tool
            response = await ai.models.generateContent({
              model: FALLBACK_GEMINI_MODEL,
              contents: prompt,
              config: {
                systemInstruction
              }
            });
        } catch (secondaryErr: any) {
          console.warn("Secondary model fallback failed, trying tertiary model (flash-lite)...", secondaryErr);
          // Tier 4: Tertiary ultra-resilient fallback model
          response = await ai.models.generateContent({
            model: TERTIARY_GEMINI_MODEL,
            contents: prompt,
            config: {
              systemInstruction
            }
          });
        }
      }
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

    const systemInstruction = "You are an expert Indian agricultural scientist representing 'फल्सावदिया कृषि बाजार' located in Shamgarh, Mandsaur, MP.\n\nShop Profile:\n- Name: फल्सावदिया कृषि बाजार\n- Address: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)\n- Timings: सुबह 8:00 बजे से रात 8:00 बजे तक (08:00 AM – 08:00 PM)\n\nInstructions: Answer farmer questions in simple Hindi. Always mention that recommended products are available at 'फल्सावदिया कृषि बाजार'. STRICT RULE: Do not use 'फालसावदिया'.";

    let response;
    try {
      // Tier 1: Try with Google Search Grounding for real-time validation
      response = await ai.models.generateContent({
        model: PRIMARY_GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }]
        }
      });
    } catch (searchErr: any) {
      console.warn("Search grounding attempt failed (e.g. search tool quota or network). Falling back to pure Gemini knowledge base...", searchErr);
      try {
        // Tier 2: Seamlessly fall back to pure model generation without search tools
        response = await ai.models.generateContent({
          model: PRIMARY_GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction
          }
        });
      } catch (primaryErr: any) {
        console.warn("Primary model attempt failed in chat, trying fallback model...", primaryErr);
        try {
          // Tier 3: Resilient fallback to secondary flash model
          response = await ai.models.generateContent({
            model: FALLBACK_GEMINI_MODEL,
            contents: prompt,
            config: {
              systemInstruction
            }
          });
        } catch (secondaryErr: any) {
          console.warn("Secondary model attempt failed in chat, trying tertiary model (flash-lite)...", secondaryErr);
          // Tier 4: Ultra-resilient fallback to tertiary model
          response = await ai.models.generateContent({
            model: TERTIARY_GEMINI_MODEL,
            contents: prompt,
            config: {
              systemInstruction
            }
          });
        }
      }
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
  dosageLiquid?: {
    perLiter?: string;
    per15L?: string;
    per16L?: string;
    per20L?: string;
    per25L?: string;
    per200L?: string;
    per500L?: string;
    perBigha?: string;
    perAcre?: string;
  };
  dosagePowder?: {
    perLiter?: string;
    per15L?: string;
    per16L?: string;
    per20L?: string;
    per25L?: string;
    per200L?: string;
    per500L?: string;
    perBigha?: string;
    perAcre?: string;
  };
  dosageFertilizer?: {
    perPlant?: string;
    perPot?: string;
    perBigha?: string;
    perAcre?: string;
    perIrrigation?: string;
    perSpray?: string;
    perDrenching?: string;
    totalAmount?: string;
  };
  dosageSeeds?: {
    seedRatePerBigha: string;
    seedRatePerAcre: string;
    seedTreatment: string;
    sowingDepth: string;
    rowAndPlantSpacing: string;
    germinationDays: string;
    sowingSeason: string;
  };
  cropSpecificDosage: Array<{
    cropName: string;
    dosage: string;
    usage: string;
    sprayTime: string;
  }>;
  hasExactMatch: boolean;
  sources?: Array<{ title: string; uri: string }>;
  order?: number;
  createdAt?: number;
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
    perLiter: "उत्पाद अनुसार",
    per15L: "उत्पाद अनुसार",
    per16L: "उत्पाद अनुसार",
    per20L: "उत्पाद अनुसार",
    per25L: "उत्पाद अनुसार",
    per200L: "उत्पाद अनुसार",
    per500L: "उत्पाद अनुसार",
    perBigha: "उत्पाद अनुसार"
  },
  dosagePowder: {
    perLiter: "उत्पाद अनुसार",
    per15L: "उत्पाद अनुसार",
    per16L: "उत्पाद अनुसार",
    per20L: "उत्पाद अनुसार",
    per25L: "उत्पाद अनुसार",
    per200L: "उत्पाद अनुसार",
    per500L: "उत्पाद अनुसार",
    perBigha: "उत्पाद अनुसार"
  },
  dosageFertilizer: {
    perPlant: "उत्पाद अनुसार",
    perPot: "उत्पाद अनुसार",
    perBigha: "उत्पाद अनुसार",
    perIrrigation: "उपलब्ध नहीं है",
    perSpray: "उपलब्ध नहीं है",
    perDrenching: "उपलब्ध नहीं है",
    totalAmount: "उपलब्ध नहीं है"
  },
  dosageSeeds: {
    seedRatePerBigha: "उत्पाद/फसल अनुसार",
    seedRatePerAcre: "उत्पाद/फसल अनुसार",
    seedTreatment: "2-3 ग्राम या 3-5 मिली प्रति किग्रा बीज",
    sowingDepth: "3 से 5 सेमी",
    rowAndPlantSpacing: "फसल अनुसार (उदा. 30x10 सेमी)",
    germinationDays: "4 से 7 दिन",
    sowingSeason: "मौसम अनुसार"
  },
  cropSpecificDosage: [],
  hasExactMatch: false
};

function cleanAndParseJson<T>(jsonText: string): T {
  if (!jsonText || typeof jsonText !== 'string') {
    throw new Error("Empty JSON input");
  }

  let text = jsonText.trim();

  // Strip any accidental huge base64 data URLs or long strings that might have leaked into JSON
  text = text.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]{100,}/g, '');
  text = text.replace(/"[^"]*(?:image|photo|base64|thumbnail)[^"]*"\s*:\s*"[A-Za-z0-9+/=]{500,}"/gi, '""');

  // 1. Remove markdown code blocks (```json ... ``` or ``` ... ```) if present
  if (text.includes("```")) {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      text = codeBlockMatch[1].trim();
    } else {
      text = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    }
  }

  // 2. Extract substring between first '{' and last '}' (or first '[' and last ']')
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    text = text.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    text = text.substring(firstBracket, lastBracket + 1);
  } else if (firstBrace !== -1 && lastBrace === -1) {
    text = text.substring(firstBrace);
  }

  // 3. Fast path: Direct standard JSON.parse
  try {
    return JSON.parse(text) as T;
  } catch (directError: any) {
    // 4. Try jsonrepair (reliably fixes unescaped internal quotes, unescaped newlines, trailing commas, cut-off strings, missing closing braces)
    try {
      const repaired = jsonrepair(text);
      return JSON.parse(repaired) as T;
    } catch (repairError: any) {
      // 5. Fallback: Clean Hindi punctuation outside string literals (like Devanagari danda '।' before JSON tokens)
      try {
        const sanitized = text
          .replace(/:\s*[।०]/g, ': ""')
          .replace(/,(\s*[\]}])/g, '$1');
        const repaired2 = jsonrepair(sanitized);
        return JSON.parse(repaired2) as T;
      } catch (finalErr: any) {
        console.warn("[cleanAndParseJson] Parse notice:", finalErr?.message, "Text snippet:", text.substring(0, 120));
        throw new Error(`JSON parsing failed: ${finalErr?.message || repairError?.message || directError?.message}`);
      }
    }
  }
}

export function enrichGovernmentSources(category: string, existingSources?: Array<{ title: string; uri: string }>): Array<{ title: string; uri: string }> {
  const sources: Array<{ title: string; uri: string }> = [...(existingSources || [])];
  const cat = (category || "").toLowerCase();

  const addIfMissing = (title: string, uri: string) => {
    if (!sources.some(s => s.uri === uri || s.title.includes(title.substring(0, 12)))) {
      sources.push({ title, uri });
    }
  };

  if (cat.includes("कीट") || cat.includes("फफूंद") || cat.includes("खरपतवार") || cat.includes("pgr") || cat.includes("टॉनिक") || cat.includes("insecticide") || cat.includes("fungicide") || cat.includes("herbicide")) {
    addIfMissing("केंद्रीय कीटनाशक बोर्ड एवं पंजीकरण समिति (CIBRC, कृषि मंत्रालय भारत सरकार)", "https://cibrc.nic.in");
    addIfMissing("पादप संरक्षण, संगरोध एवं भंडारण निदेशालय (DPPQS भारत सरकार)", "https://ppqs.gov.in");
    addIfMissing("भारतीय कृषि अनुसंधान परिषद (ICAR - फसल कीट एवं रोग प्रबंधन)", "https://icar.org.in");
  } else if (cat.includes("खाद") || cat.includes("उर्वरक") || cat.includes("fertilizer") || cat.includes("पोषक") || cat.includes("micronutrient") || cat.includes("यूरिया") || cat.includes("dap")) {
    addIfMissing("उर्वरक नियंत्रण आदेश (FCO - उर्वरक विभाग, रसायन एवं उर्वरक मंत्रालय भारत सरकार)", "https://fert.nic.in");
    addIfMissing("भारतीय कृषि अनुसंधान परिषद (ICAR - मृदा स्वास्थ्य एवं पोषण प्रबंधन)", "https://icar.org.in");
    addIfMissing("कृषि एवं किसान कल्याण मंत्रालय (Agricoop भारत सरकार)", "https://agricoop.gov.in");
  } else if (cat.includes("बीज") || cat.includes("seed") || cat.includes("चारा") || cat.includes("fodder")) {
    addIfMissing("भारतीय चारागाह एवं चारा अनुसंधान संस्थान (ICAR-IGFRI झाँसी)", "https://igfri.icar.gov.in");
    addIfMissing("राष्ट्रीय बीज निगम (National Seeds Corporation - भारत सरकार)", "https://indiaseeds.gov.in");
    addIfMissing("कृषि एवं किसान कल्याण मंत्रालय (बीज विकास प्रभाग भारत सरकार)", "https://agricoop.gov.in");
  } else {
    addIfMissing("केंद्रीय कीटनाशक बोर्ड एवं पंजीकरण समिति (CIBRC भारत सरकार)", "https://cibrc.nic.in");
    addIfMissing("भारतीय कृषि अनुसंधान परिषद (ICAR)", "https://icar.org.in");
    addIfMissing("कृषि एवं किसान कल्याण मंत्रालय (भारत सरकार)", "https://agricoop.gov.in");
  }

  return sources;
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

    if (parsed.dosageSeeds && typeof parsed.dosageSeeds === 'object') {
      result.dosageSeeds = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosageSeeds, ...parsed.dosageSeeds };
    } else {
      result.dosageSeeds = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosageSeeds };
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

    // Handle sources and enrich with verified government agricultural portals
    const rawSources = Array.isArray(parsed.sources) ? parsed.sources : [];
    result.sources = enrichGovernmentSources(result.category, rawSources);

    // Determine hasExactMatch accurately:
    // If a legitimate product name was extracted (not a dummy error string), it IS recognized!
    const hasValidName = Boolean(
      result.productName && 
      result.productName !== "जानकारी उपलब्ध नहीं है" && 
      !result.productName.includes("पहचान नहीं") &&
      !result.productName.includes("उपलब्ध नहीं")
    );
    
    result.hasExactMatch = hasValidName;

    return result;
  } catch (error) {
    console.error("safeParseProductKnowledge Error, returning default object", error);
    return { ...DEFAULT_PRODUCT_KNOWLEDGE, hasExactMatch: false };
  }
}

export async function getProductKnowledge(query: string, userApiKey?: string): Promise<ProductKnowledgeResult> {
  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");

    const prompt = `आप भारत के शीर्षस्थ कृषि वैज्ञानिक, पौध संरक्षण विशेषज्ञ एवं CIBRC/ICAR नियामक सलाहकार हैं, जो 'फल्सावदिया कृषि बाजार' का प्रतिनिधित्व करते हैं।
आपका कार्य कृषि उत्पाद: "${query}" पर आधिकारिक भारत सरकार (CIBRC, ICAR, DPPQS, FCO, SAUs) एवं निर्माता टेक्निकल शोध के आधार पर 100% प्रामाणिक, अत्यधिक विस्तृत (Detailed) और वैज्ञानिक रूप से बिल्कुल सटीक (100% Accurate) कृषि रिपोर्ट तैयार करना है।

अति-महत्वपूर्ण शुद्धता एवं विस्तृत विवरण के नियम:
1. **कोई संक्षिप्त उत्तर न दें (Fully Detailed)**: प्रत्येक फील्ड में गहन, वैज्ञानिक व किसान-उपयोगी विवरण होना अनिवार्य है। आधी-अधूरी जानकारी बिल्कुल न दें।
2. **100% सरल, स्पष्ट एवं सम्मानजनक हिंदी**: संपूर्ण रिपोर्ट केवल और केवल सरल हिंदी में हो। टेक्निकल रसायनों के नाम के साथ कोष्ठक में अंग्रेजी नाम लिख सकते हैं (उदा. 'क्लोरेंट्रानिलिप्रोल (Chlorantraniliprole 18.5% SC)')।
3. **सटीक व वास्तविक डोज़ (Strict Scientific Accuracy - No Guesswork)**:
   - हर उत्पाद की आधिकारिक अनुमोदित मात्रा (CIBRC label claim) के अनुसार ही सटीक डोज़ बताएं।
   - यदि उत्पाद तरल (Liquid EC/SC/SL/FS) है: तो dosageLiquid में प्रति 1 लीटर पानी (उदा. 0.3-0.5 ml या 2-3 ml जैसा भी वास्तविक लेबल हो), 15L पंप, 16L बैटरी पंप, 20L पावर पंप, 25L ट्रॉली पंप, 200L ड्रम, 500L टैंकर, और प्रति 1 बीघा व एकड़ की वास्तविक मिलीलीटर मात्रा लिखें।
   - यदि उत्पाद पाउडर/दानेदार (Powder/Granule WP/SP/WDG/GR) है: तो dosagePowder में प्रति लीटर, 15L पंप, 20L पंप, 200L ड्रम और प्रति बीघा व एकड़ की वास्तविक ग्राम/किग्रा मात्रा लिखें।
   - यदि उत्पाद उर्वरक/खाद (Fertilizer/Micronutrient) है: तो dosageFertilizer में प्रति पौधा, प्रति गमला, प्रति बीघा, प्रति सिंचाई, स्प्रे व ड्रेंचिंग की सही मात्रा भरें।
   - यदि उत्पाद बीज (Seed) या बीजोपचार (Seed Treatment) है: तो dosageSeeds में { seedRatePerBigha, seedRatePerAcre, seedTreatment (बीजोपचार की प्रति किग्रा बीज मात्रा), sowingDepth, rowAndPlantSpacing, germinationDays, sowingSeason } की सही जानकारी दें।
4. **फसलवार विशिष्ट डोज़ (Crop Specific Dosage)**: कम से कम 4 से 6 फसलों (उदा. सोयाबीन, चना, गेहूं, धान, मिर्च, टमाटर, कपास आदि) के लिए एक सारणी जिसमें cropName, dosage (मात्रा प्रति बीघा/एकड़), usage (छिड़काव/ड्रेंचिंग विधि) और sprayTime (छिड़काव का सही समय) स्पष्ट हो।
5. **विस्तृत कार्यप्रणाली (Mode of Action)**: कम से कम 2-3 वाक्यों में वैज्ञानिक रूप से समझाएं कि यह दवा कीट या फफूंद के शरीर में (जैसे रयानॉडाइन रिसेप्टर्स, तंत्रिका तंत्र, कोशिका विभाजन आदि पर) कैसे काम करती है।
6. **पहचान के लक्षण (Symptoms)**: फसल को देखकर किसान कैसे समझें कि इस उत्पाद की आवश्यकता है।
7. **टैंक मिक्सिंग अनुकूलता (Compatibility)**: किन कीटनाशकों/फफूंदनाशकों/टॉनिकों के साथ मिला सकते हैं (Compatible) और किनके साथ कतई न मिलाएं (Incompatible जैसे कॉपर, सल्फर, चूना आदि)।
8. **सुरक्षा एवं प्रतीक्षा अवधि**: तुड़ाई से पहले सुरक्षित अंतर (PHI/Waiting Period), खेत में प्रवेश निषेध (REI), टॉक्सिसिटी त्रिकोण का रंग (हरा/नीला/पीला/लाल) और सुरक्षा सावधानियां।
9. **आउटपुट फॉर्मेट**: केवल और केवल वैध JSON स्ट्रिंग लौटाएं।`;

    const systemInstruction = "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). MANDATORY REQUIREMENT: Provide 100% scientifically accurate, deeply detailed, authentic agronomic information based on official CIB&RC and ICAR standards. Respond 100% in simple, respectful HINDI. Never invent dummy or arbitrary dosages. Return strictly valid JSON. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').";

    let response: any = null;
    let lastError: any = null;

    // Prioritized model chain: gemini-3.6-flash -> gemini-3.5-flash
    const healthyModels = getPrioritizedModels();
    for (const model of healthyModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        });

        if (response?.text) {
          const parsed = safeParseProductKnowledge(response.text);
          if (
            parsed && 
            parsed.productName && 
            parsed.productName !== "जानकारी उपलब्ध नहीं है" && 
            !parsed.productName.includes("पहचान नहीं") &&
            !parsed.productName.includes("पहचाना नहीं")
          ) {
            parsed.sources = enrichGovernmentSources(parsed.category, parsed.sources);
            return parsed;
          }
        }
      } catch (directErr: any) {
        markModelTemporaryFailure(model, directErr);
        lastError = directErr;
        console.warn(`[getProductKnowledge] Model ${model} attempt notice:`, directErr?.status, directErr?.message?.substring(0, 80));
      }
    }

    if (!response?.text) {
      throw lastError || new Error("उत्पाद की विस्तृत जानकारी प्राप्त नहीं हो सकी।");
    }

    const result = safeParseProductKnowledge(response.text);

    if (!result.productName || result.productName === "जानकारी उपलब्ध नहीं है" || result.productName.includes("पहचान नहीं") || result.productName.includes("पहचाना नहीं")) {
      throw new Error("इस उत्पाद की जानकारी नहीं मिल सकी। कृपया सही नाम या स्पेलिंग (जैसे: कोराजन, यूरिया, इमिडाक्लोप्रिड, साफ) लिखकर पुनः प्रयास करें।");
    }

    result.sources = enrichGovernmentSources(result.category, result.sources);
    return result;
  } catch (error: any) {
    console.warn("Gemini Product Knowledge Error:", error);
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    throw new Error(error?.message || friendlyError.message || "जानकारी खोजने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
  }
}

export async function analyzeProductImage(base64Image: string, userApiKey?: string): Promise<ProductKnowledgeResult> {
  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");

    const prompt = `आप भारत के शीर्षस्थ कृषि वैज्ञानिक, पौध संरक्षण विशेषज्ञ, इमेज एनालिस्ट एवं CIBRC/ICAR नियामक सलाहकार हैं, जो 'फल्सावदिया कृषि बाजार' का प्रतिनिधित्व करते हैं।
आपका कार्य संलग्न कृषि उत्पाद (कीटनाशक की बोतल, फफूंदनाशक का पाउच, खरपतवारनाशक, टॉनिक/PGR, सूक्ष्म पोषक तत्व, उर्वरक/खाद की बोरी, या बीज पैकेट) की फोटो का गहन विश्लेषण करना है और 100% सटीक, अत्यधिक विस्तृत (Detailed) व प्रामाणिक कृषि रिपोर्ट तैयार करना है।

अति-महत्वपूर्ण विश्लेषण एवं नियामक मानक (OCR & Government Standards):
1. **OCR व पैकेजिंग टेक्स्ट एक्सट्रैक्शन**: लेबल, बोतल या पैकेट पर छपे समस्त अक्षर, ब्रांड नाम, टेक्निकल रसायन नाम, फॉर्मूलेशन कोड (EC, SC, WP, SP, आदि), निर्माता कंपनी और CIBRC पंजीकरण को ध्यानपूर्वक पढ़ें।
2. **सटीक पहचान**: उपलब्ध अक्षरों व पैकेट के डिज़ाइन से सही उत्पाद की पहचान करें।
3. **सरकारी मानकों से मिलान**: CIBRC (केंद्रीय कीटनाशक बोर्ड), ICAR एवं उर्वरक नियंत्रण आदेश (FCO) के आधिकारिक पंजीकृत दावों से मिलान कर पूर्ण और सटीक विवरण भरें।
4. **100% केवल सरल हिंदी**: भारतीय किसान इस रिपोर्ट को पढ़ेंगे। समस्त विवरण, फायदे, सावधानियां, कार्यप्रणाली, फसलें, कीट व मात्राएं सरल, स्पष्ट व सम्मानजनक हिंदी में ही लिखें।
5. **सटीक व विस्तृत फील्ड्स**:
   - productName: उत्पाद का पूरा ब्रांड नाम व हिंदी उच्चारण
   - companyName: मूल निर्माता कंपनी
   - technicalName: सक्रिय टेक्निकल रसायन, सांद्रता व फॉर्मूलेशन
   - category: सटीक श्रेणी (कीटनाशक, फफूंदनाशक, खरपतवारनाशक, खाद आदि)
   - formulation: फॉर्मूलेशन का प्रकार (SC, EC, WP, WDG आदि)
   - activeIngredient: सक्रिय घटक
   - modeOfAction: कार्य करने का सटीक वैज्ञानिक तरीका (कम से कम 2-3 वाक्यों में)
   - fracIracHracGroup: ग्रुप कोड
   - targetCrops: कम से कम 6 से 8 प्रमुख भारतीय फसलें
   - targetPests: सभी लक्षित कीट, रोग व इल्लियां
   - symptoms: खेत में फसल पर दिखाई देने वाले लक्षण
   - usage: छिड़काव विधि, पानी की मात्रा, नोजल
   - benefits: 5 से 6 विस्तृत बिंदुवार फायदे
   - features: विशेष तकनीकी खूबियां
   - compatibleProducts & incompatibleProducts
   - waitingPeriod, phi, rei, toxicity, safetyInstructions, mixingOrder (WALES नियम), sprayTiming, rainfastPeriod, storage
6. **प्रत्येक स्प्रेयर हेतु सटीक वास्तविक मात्रा (Accurate Dosages)**:
   - dosageLiquid: { perLiter, per15L, per16L, per20L, per25L, per200L, per500L, perBigha } - सही मिलीलीटर मात्रा
   - dosagePowder: { perLiter, per15L, per16L, per20L, per25L, per200L, per500L, perBigha } - सही ग्राम/किग्रा मात्रा
   - dosageFertilizer: { perPlant, perPot, perBigha, perIrrigation, perSpray, perDrenching, totalAmount }
   - dosageSeeds: { seedRatePerBigha, seedRatePerAcre, seedTreatment, sowingDepth, rowAndPlantSpacing, germinationDays, sowingSeason }
   - cropSpecificDosage: कम से कम 4 से 6 फसलों हेतु { cropName, dosage, usage, sprayTime }
7. **पहचान की स्थिति**: पहचान होने पर 'hasExactMatch' को true सेट करें। यदि फोटो कृषि से संबंधित नहीं है तो 'productName' में 'पहचान नहीं हो सकी' दें।
8. कोई base64 या इमेज स्ट्रिंग आउटपुट JSON में न दें।
9. आउटपुट केवल और केवल वैध JSON स्ट्रिंग लौटाएं।`;

    const systemInstruction = "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). MANDATORY REQUIREMENT: Analyze the image with extreme accuracy. Provide 100% scientifically accurate, deeply detailed, authentic agronomic information based on official CIB&RC and ICAR standards. Respond 100% in simple, respectful HINDI. Never echo base64 image data. Return strictly valid JSON. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').";

    // Dynamic MIME type detection from Base64 Data URL (prevents invalid argument error on PNG/WebP)
    let mimeType = "image/jpeg";
    if (base64Image.startsWith("data:")) {
      const match = base64Image.match(/^data:([^;]+);base64,/);
      if (match && match[1]) {
        mimeType = match[1];
      }
    }
    const cleanData = base64Image.split(',')[1] || base64Image;

    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: cleanData
        }
      }
    ];

    let response: any = null;
    let lastError: any = null;

    const candidateModels = getPrioritizedModels();
    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: parts,
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        });
        if (response?.text) {
          const parsed = safeParseProductKnowledge(response.text);
          if (parsed && parsed.productName) {
            parsed.sources = enrichGovernmentSources(parsed.category, parsed.sources);
            return parsed;
          }
        }
      } catch (err: any) {
        markModelTemporaryFailure(model, err);
        lastError = err;
        console.warn(`[analyzeProductImage] Candidate ${model} notice:`, err?.status, err?.message?.substring(0, 80));
      }
    }

    if (!response?.text) {
      throw lastError || new Error("छवि का विस्तृत विश्लेषण नहीं हो सका।");
    }

    const result = safeParseProductKnowledge(response.text);
    result.sources = enrichGovernmentSources(result.category, result.sources);
    return result;
  } catch (error: any) {
    console.warn("Gemini Analyze Product Image Warning:", error?.message || error);
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    throw new Error(error?.message || friendlyError.message || "इमेज का विश्लेषण करने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
  }
}

