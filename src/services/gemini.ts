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
  dosageBigha?: string;
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
          5. **Recommended Treatment**: Pointwise chemical and organic solutions with dosage (per 15L/20L pump, per Shamgarh Pucca Bigha [27,225 sq ft = 20 Biswa], and per Acre [1 Acre = 1.60 Bigha]).
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
          5. **Recommended Treatment**: Pointwise chemical and organic solutions with dosage (per pump, per Shamgarh Pucca Bigha, and per Acre).
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
    ? "You are an expert plant pathologist representing 'Falsawdiya Krishi Bazaar' (Shamgarh, MP). Hours: 8:00 AM to 8:00 PM daily. Land standard: 1 Shamgarh Pucca Bigha = 27,225 sq ft (1 Acre = 1.60 Bigha). Respond only in English using natural, correct grammar. NEVER include HTML tags like <br> or <p>. Return structured JSON."
    : "You are an expert plant pathologist representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar). Located in Shamgarh, MP. Shop address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). Hours: 8:00 AM to 8:00 PM daily. LAND STANDARD: शामगढ़ क्षेत्र में 1 पक्का बीघा = 27,225 वर्ग फीट (20 बिस्वा), 1 एकड़ = 1.60 बीघा और 1 हेक्टेयर ≈ 3.95 बीघा होता है। रासायनिक नियंत्रण में प्रति पंप के साथ-साथ 'प्रति शामगढ़ पक्का बीघा' (dosageBigha) तथा प्रति एकड़ (dosageAcre) की मात्रा अनिवार्य रूप से प्रदान करें। Respond only in Hindi using natural, correct grammar. STRICT RULE: ONLY use 'फल्सावदिया' for the name. Never use 'फालसावदिया'. NEVER include HTML tags like <br> or <p>. Return structured JSON.";

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
            dosagePump: { type: "STRING", description: "मात्रा प्रति 15L या 20L पंप" },
            dosageBigha: { type: "STRING", description: "मात्रा प्रति शामगढ़ पक्का बीघा (27,225 वर्ग फीट)" },
            dosageAcre: { type: "STRING", description: "मात्रा प्रति 1 एकड़ (43,560 वर्ग फीट)" },
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
    4. Provide dosages per 15L/20L pump and per Shamgarh Pucca Bigha (27,225 sq ft = 20 Biswa, 1 Acre = 1.60 Bigha) as primary land unit, and per acre. Always explicitly include the note: 'मात्रा की गणना शामगढ़ क्षेत्र के पक्का बीघा माप के अनुसार की गई है।' If the farmer mentions being from another district or state with a different bigha, confirm their bigha size before recalculating.
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
    const systemInstruction = `You are a helpful Agri-Expert for farmers representing 'फल्सावदिया कृषि बाजार' in Shamgarh, MP. Our shop is at Dimple Chauraha and open 8:00 AM to 8:00 PM (सुबह 8:00 बजे से रात 8:00 बजे तक). Provide advice based on current weather. Today is ${dateStr}. LAND STANDARD: शामगढ़ क्षेत्र में भूमि की मानक इकाई 'शामगढ़ पक्का बीघा' है (1 बीघा = 27,225 वर्ग फीट = 20 बिस्वा | 1 एकड़ = 1.60 बीघा | 1 हेक्टेयर ≈ 3.95 बीघा)। खाद (यूरिया, डीएपी) और कीटनाशक की मात्रा हमेशा शामगढ़ पक्का बीघा के अनुसार प्राथमिकता से बताएं। Always use the name 'फल्सावदिया कृषि बाजार' strictly and never 'फालसावदिया'.`;

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

    const systemInstruction = "You are an expert Indian agricultural scientist representing 'फल्सावदिया कृषि बाजार' located in Shamgarh, Mandsaur, MP.\n\nShop Profile:\n- Name: फल्सावदिया कृषि बाजार\n- Address: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)\n- Timings: सुबह 8:00 बजे से रात 8:00 बजे तक (08:00 AM – 08:00 PM)\n\nInstructions: Answer farmer questions in simple Hindi. LAND STANDARD: शामगढ़ क्षेत्र में भूमि की स्थानीय मानक इकाई 'शामगढ़ पक्का बीघा' है (1 बीघा = 27,225 वर्ग फीट = 20 बिस्वा | 1 एकड़ = 1.60 बीघा | 1 हेक्टेयर ≈ 3.95 बीघा)। खाद, बीज दर या दवा की गणना हमेशा शामगढ़ पक्का बीघा के अनुसार ही बताएं। Always mention that recommended products are available at 'फल्सावदिया कृषि बाजार'. STRICT RULE: Do not use 'फालसावदिया'.";

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

    const prompt = `आप भारत के सर्वोच्च कृषि वैज्ञानिक, पौध संरक्षण विशेषज्ञ एवं CIBRC/ICAR नियामक सलाहकार हैं, जो 'फल्सावदिया कृषि बाजार' का प्रतिनिधित्व करते हैं।
आपका कार्य कृषि उत्पाद: "${query}" पर आधिकारिक भारत सरकार के कृषि डेटाबेसों (CIBRC, ICAR, DPPQS, FCO, SAUs) एवं निर्माता टेक्निकल शोध पत्रों के आधार पर 100% सटीक, अत्यधिक विस्तृत, प्रामाणिक व व्यावहारिक कृषि रिपोर्ट तैयार करना है।

अति-महत्वपूर्ण गुणवत्ता नियम (60 दिन पहले की तरह पूर्ण विस्तृत व सटीक जानकारी):
1. कोई भी संक्षिप्त या आधा-अधूरा उत्तर न दें। प्रत्येक फील्ड में कम से कम 2 से 4 वाक्यों का गहन, वैज्ञानिक एवं किसान-उपयोगी विवरण होना अनिवार्य है।
2. भाषा नियम (100% केवल सरल हिंदी): समस्त विवरण, लाभ, सावधानियां, कार्यप्रणाली, फसलें, कीट व मात्राएं सरल, स्पष्ट व सम्मानजनक हिंदी भाषा में ही होनी चाहिए। अंग्रेजी पैराग्राफ कतई न लिखें। टेक्निकल केमिकल नाम के साथ कोष्ठक में अंग्रेजी नाम दे सकते हैं (उदा. 'क्लोरेंट्रानिलिप्रोल (Chlorantraniliprole 18.5% SC)')।
3. संपूर्ण विस्तृत फील्ड्स (All Fields Must Be Thoroughly Filled):
   - productName: उत्पाद का पूरा ब्रांड नाम व हिंदी उच्चारण
   - companyName: मूल निर्माता कंपनी का नाम (उदा. FMC India, Bayer, Syngenta, IFFCO, Dhanuka, UPL, आदि)
   - technicalName: सक्रिय टेक्निकल रसायन का पूरा नाम, सांद्रता व फॉर्मूलेशन (उदा. क्लोरेंट्रानिलिप्रोल 18.5% एससी)
   - category: सटीक श्रेणी (उदा. प्रणालीगत कीटनाशक (Systemic Insecticide), ब्रॉड-स्पेक्ट्रम फफूंदनाशक, आदि)
   - formulation: फॉर्मूलेशन का प्रकार (उदा. सस्पेंशन कॉन्सेंट्रेट (SC - Suspension Concentrate))
   - activeIngredient: सक्रिय घटक एवं उसकी प्रतिशत मात्रा
   - modeOfAction: कार्य करने का सटीक वैज्ञानिक तरीका (Mode of Action) - कीट/फसल के शरीर में यह दवा किस प्रकार कार्य करती है, इसका कम से कम 2-3 वाक्यों में विस्तृत विवरण
   - fracIracHracGroup: सटीक IRAC / FRAC / HRAC ग्रुप कोड (उदा. IRAC Group 28 - Diamides)
   - targetCrops: कम से कम 6 से 8 प्रमुख भारतीय फसलें (उदा. सोयाबीन, धान, मक्का, कपास, चना, टमाटर, मिर्च, बैंगन, गोभी, गन्ना)
   - targetPests: सभी लक्षित कीटों, इल्लियों या रोगों के नाम (हिंदी व अंग्रेजी/वैज्ञानिक नाम सहित)
   - symptoms: खेत में फसल पर कीट या रोग के हमले के स्पष्ट लक्षण (Symptoms), जिससे किसान तुरंत पहचान सके
   - usage: खेत में उपयोग की विस्तृत विधि, प्रति एकड़ पानी की मात्रा, नोजल का प्रकार और छिड़काव तकनीक
   - benefits: कम से कम 5 से 6 बिंदुवार विस्तृत फायदे (फसल की हरियाली, लंबे समय तक सुरक्षा, उपज में वृद्धि)
   - features: उत्पाद की विशेष तकनीकी खूबियां (ग्रीन लेबल, मित्र कीटों की सुरक्षा, 2 घंटे में वर्षा स्थिरता)
   - compatibleProducts: टैंक-मिक्स में किन कीटनाशकों, फफूंदनाशकों व टॉनिकों के साथ मिलाया जा सकता है
   - incompatibleProducts: किन रसायनों (क्षारीय, कॉपर, सल्फर, बोर्डो मिश्रण) के साथ कतई न मिलाएं
   - waitingPeriod: तुड़ाई प्रतीक्षा अवधि (Pre-Harvest Interval) का फसलवार विस्तृत विवरण
   - phi: विभिन्न फसलों के लिए अंतिम छिड़काव और कटाई के बीच सुरक्षित दिनों का अंतराल (उदा. धान: 14 दिन, गन्ना: 21 दिन, टमाटर: 3 दिन, सोयाबीन: 21 दिन)
   - rei: खेत में दोबारा प्रवेश का सुरक्षित समय (Re-Entry Interval) (उदा. 12 से 24 घंटे)
   - toxicity: टॉक्सिसिटी त्रिकोण का रंग (हरा / नीला / पीला / लाल) व विषाक्तता स्तर
   - safetyInstructions: किसानों के लिए व्यक्तिगत सुरक्षा (दस्ताने, मास्क, चश्मा, हवा की दिशा)
   - mixingOrder: WALES नियम अनुसार सही घोल बनाने का क्रम (सर्वप्रथम आधा पानी -> WP/WDG -> SC/CS -> EC -> SL/SP)
   - sprayTiming: छिड़काव का सर्वोत्तम समय (सुबह 7 से 10 या शाम 4 से 7 बजे)
   - rainfastPeriod: बारिश से धुलने से बचाव का समय (उदा. छिड़काव के 2 घंटे बाद)
   - storage: सुरक्षित भंडारण निर्देश
4. अत्यंत सटीक व वैज्ञानिक मात्रा (Exhaustive & Accurate Dosages for Every Sprayer):
   - dosageLiquid:
     * perLiter: सटीक मात्रा (उदा. 0.3 - 0.4 मिली प्रति लीटर)
     * per15L: 15 लीटर नैपसैक पंप के लिए (उदा. 6 - 7 मिली)
     * per16L: 16 लीटर बैटरी पंप के लिए (उदा. 6.5 - 7.5 मिली)
     * per20L: 20 लीटर पावर पंप के लिए (उदा. 8 - 10 मिली)
     * per25L: 25 लीटर स्प्रेयर के लिए (उदा. 10 - 12.5 मिली)
     * per200L: 200 लीटर ड्रम के लिए (उदा. 60 - 75 मिली)
     * per500L: 500 लीटर टैंकर के लिए (उदा. 150 - 175 मिली)
     * perBigha: 1 शामगढ़ पक्का बीघा (27,225 वर्ग फीट, 1 एकड़ = 1.60 बीघा) के लिए सटीक मात्रा (उदा. 30 - 35 मिली)
   - dosagePowder: यदि पाउडर फॉर्मूलेशन है तो इसी तरह प्रति लीटर, 15L, 16L, 20L, 25L, 200L, 500L, प्रति शामगढ़ पक्का बीघा हेतु सटीक ग्राम में मात्रा
   - dosageFertilizer: यदि खाद/उर्वरक है तो प्रति पौधा, प्रति गमला, प्रति शामगढ़ पक्का बीघा, प्रति सिंचाई, स्प्रे व ड्रेंचिंग मात्रा
   - dosageSeeds: यदि बीज (Seeds/Hybrid) या बीजोपचार रसायन (Seed Treatment) है तो: { seedRatePerBigha (उदा. 18-20 किग्रा प्रति शामगढ़ पक्का बीघा [27,225 वर्ग फीट]), seedRatePerAcre (उदा. 40-45 किग्रा/एकड़), seedTreatment (बीजोपचार की सटीक मात्रा व तरीका प्रति किग्रा बीज), sowingDepth (बुवाई गहराई 3-5 सेमी), rowAndPlantSpacing (कतार व पौधे की दूरी), germinationDays (अंकुरण समय 4-7 दिन), sowingSeason (बुवाई मौसम) }
   - cropSpecificDosage: कम से कम 4 से 6 फसलों (उदा. सोयाबीन, चना, गेहूं, धान, मिर्च, टमाटर) के लिए एक सारणी जिसमें cropName, dosage (मात्रा प्रति बीघा/एकड़), usage (छिड़काव/ड्रेंचिंग विधि) और sprayTime (छिड़काव का सही समय) स्पष्ट हो
5. सरकारी स्रोत: CIBRC, DPPQS, ICAR, FCO एवं राज्य कृषि विश्वविद्यालय
6. आउटपुट फॉर्मेट: केवल और केवल वैध Raw JSON स्ट्रिंग लौटाएं जो इन सभी कीज़ को शुद्धता से धारण करती हो।`;

    const systemInstruction = "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). MANDATORY LANGUAGE REQUIREMENT: Your audience is exclusively Hindi-speaking Indian farmers. You MUST respond 100% in simple, clear, respectful HINDI (सरल हिंदी भाषा). Consult official government agricultural sources (CIBRC, ICAR, FCO). LAND MEASUREMENT STANDARD: In Shamgarh (MP), 1 Pucca Bigha = 27,225 sq ft = 20 Biswa. 1 Acre = 1.60 Pucca Bigha, and 1 Hectare ≈ 3.95 Pucca Bigha. All per-Bigha dosages and seed rates MUST be strictly calibrated to this Shamgarh Pucca Bigha standard. NEVER provide descriptions, benefits, usages, or symptoms in English. Ensure the output is valid JSON. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').";

    let response: any = null;
    let lastError: any = null;

    // TIER 1: Prioritize Live Google Search Grounding to search official CIBRC, ICAR, and authentic web sources
    const candidateModels = getPrioritizedModels();
    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: `${systemInstruction} Return strictly a valid raw JSON object string without any markdown wraps.`,
            tools: [{ googleSearch: {} }]
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
            // Extract search grounding citations if present
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const liveSources: Array<{ title: string; uri: string }> = [];
            if (chunks && chunks.length > 0) {
              chunks.forEach((c: any) => {
                if (c.web?.uri) {
                  liveSources.push({
                    title: c.web.title || "आधिकारिक सरकारी स्रोत",
                    uri: c.web.uri
                  });
                }
              });
            }
            parsed.sources = enrichGovernmentSources(parsed.category, liveSources);
            return parsed;
          }
        }
      } catch (searchError: any) {
        markModelTemporaryFailure(model, searchError);
        lastError = searchError;
        console.warn(`[getProductKnowledge] Search grounding attempt on ${model} notice:`, searchError?.status, searchError?.message?.substring(0, 80));
      }
    }

    // TIER 2: Secondary Resilient Direct Structured JSON Generation with the exhaustive prompt
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
        console.warn(`[getProductKnowledge] Direct model attempt on ${model} notice:`, directErr?.status, directErr?.message?.substring(0, 80));
      }
    }

    if (!response?.text) {
      throw lastError || new Error("उत्पाद की विस्तृत जानकारी प्राप्त नहीं हो सकी।");
    }

    const result = safeParseProductKnowledge(response.text);

    if (!result.productName || result.productName === "जानकारी उपलब्ध नहीं है" || result.productName.includes("पहचान नहीं") || result.productName.includes("पहचाना नहीं")) {
      throw new Error("इस उत्पाद की जानकारी नहीं मिल सकी। कृपया सही नाम या स्पेलिंग (जैसे: कोराजन, यूरिया, इमिडाक्लोप्रिड) लिखकर पुनः प्रयास करें।");
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

    const prompt = `आप भारत के सर्वोच्च कृषि वैज्ञानिक, पौध संरक्षण विशेषज्ञ, इमेज एनालिस्ट एवं CIBRC/ICAR नियामक सलाहकार हैं, जो 'फल्सावदिया कृषि बाजार' का प्रतिनिधित्व करते हैं।
आपका कार्य संलग्न कृषि उत्पाद (कीटनाशक की बोतल, फफूंदनाशक का पाउच, खरपतवारनाशक, टॉनिक/PGR, सूक्ष्म पोषक तत्व, उर्वरक/खाद की बोरी, या बीज पैकेट जैसे 'श्री मंगलम एम-501') की फोटो का गहन विश्लेषण करना है और 60 दिन पहले की तरह 100% सटीक, अत्यधिक विस्तृत, प्रामाणिक व व्यावहारिक कृषि रिपोर्ट तैयार करना है।

अति-महत्वपूर्ण विश्लेषण एवं नियामक मानक (OCR & Government Standards):
1. **OCR व पैकेजिंग टेक्स्ट एक्सट्रैक्शन**: लेबल, बोतल या पैकेट पर छपे समस्त अक्षर, ब्रांड नाम, टेक्निकल रसायन नाम, फॉर्मूलेशन कोड (EC, SC, WP, SP, आदि), निर्माता कंपनी, बैच नंबर तथा CIBRC / CIR पंजीकरण नंबर को ध्यानपूर्वक पढ़ें।
2. **सटीक कृषि पुनर्निर्माण**: यदि फोटो धुंधली, कम रोशनी वाली या तिरछी हो, तो भी उपलब्ध अक्षरों (उदा. 'श्री मंगलम एम-501', 'कोराजन', 'साफ', 'यूरिया', 'इमिडाक्लोप्रिड', 'एम-45') से सटीक उत्पाद की पहचान करें।
3. **सरकारी मानकों से मिलान**: CIBRC (केंद्रीय कीटनाशक बोर्ड), ICAR एवं उर्वरक नियंत्रण आदेश (FCO) के आधिकारिक पंजीकृत दावों से मिलान कर पूर्ण विवरण भरें।
4. **100% केवल सरल हिंदी (अति-महत्वपूर्ण)**: भारतीय किसान इस रिपोर्ट को पढ़ेंगे। समस्त विवरण, फायदे, सावधानियां, कार्यप्रणाली, फसलें, कीट व मात्राएं सरल, स्पष्ट व सम्मानजनक हिंदी में ही लिखें। अंग्रेजी वाक्य बिल्कुल न लिखें।
5. **सटीक व विस्तृत फील्ड्स**:
   - productName, companyName, technicalName, category, formulation, activeIngredient
   - modeOfAction: कार्य करने का सटीक वैज्ञानिक तरीका (कम से कम 2-3 वाक्यों में)
   - fracIracHracGroup: सटीक ग्रुप कोड
   - targetCrops: कम से कम 6 से 8 प्रमुख भारतीय फसलें
   - targetPests: सभी लक्षित कीट, रोग व इल्लियां
   - symptoms: खेत में फसल पर दिखाई देने वाले लक्षण
   - usage: छिड़काव विधि, पानी की मात्रा, नोजल
   - benefits: 5 से 6 विस्तृत बिंदुवार फायदे
   - features: विशेष तकनीकी खूबियां
   - compatibleProducts & incompatibleProducts
   - waitingPeriod, phi, rei, toxicity, safetyInstructions, mixingOrder (WALES नियम), sprayTiming, rainfastPeriod, storage
6. **प्रत्येक स्प्रेयर हेतु सटीक मात्रा (Dosages)**:
   - dosageLiquid: { perLiter, per15L, per16L, per20L, per25L, per200L, per500L, perBigha }
   - dosagePowder: { perLiter, per15L, per16L, per20L, per25L, per200L, per500L, perBigha }
   - dosageFertilizer: { perPlant, perPot, perBigha, perIrrigation, perSpray, perDrenching, totalAmount }
   - dosageSeeds: { seedRatePerBigha, seedRatePerAcre, seedTreatment, sowingDepth, rowAndPlantSpacing, germinationDays, sowingSeason }
   - cropSpecificDosage: कम से कम 4 से 6 फसलों हेतु { cropName, dosage, usage, sprayTime }
7. **पहचान की स्थिति**: पहचान होने पर 'hasExactMatch' को true सेट करें। यदि फोटो कृषि से संबंधित नहीं है तो 'productName' में 'पहचान नहीं हो सकी' दें।
8. **कोई इमेज डेटा आउटपुट में न दें**: JSON में कोई base64 या इमेज स्ट्रिंग शामिल न करें।
9. आउटपुट फॉर्मेट: केवल और केवल वैध JSON ऑब्जेक्ट स्ट्रिंग लौटाएं।`;

    const systemInstruction = "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). MANDATORY LANGUAGE REQUIREMENT: Your audience is exclusively Hindi-speaking Indian farmers. You MUST respond 100% in simple, clear, respectful HINDI (सरल हिंदी भाषा). LAND MEASUREMENT STANDARD: In Shamgarh (MP), 1 Pucca Bigha = 27,225 sq ft = 20 Biswa. 1 Acre = 1.60 Pucca Bigha, and 1 Hectare ≈ 3.95 Pucca Bigha. All per-Bigha dosages and seed rates MUST be strictly calibrated to this Shamgarh Pucca Bigha standard. NEVER provide descriptions, benefits, usages, or symptoms in English. Never echo base64 image data in output. Ensure the output is valid JSON. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').";

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

