import { GoogleGenAI } from "@google/genai";
import { getFriendlyAiError } from "../utils/aiErrorHandler";

function isQuotaError(error: any): boolean {
  const status = error?.status || error?.code;
  const msg = (error?.message || String(error)).toLowerCase();
  return status === 429 || status === 'RESOURCE_EXHAUSTED' || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
}

export const PRIMARY_GEMINI_MODEL = "gemini-3.6-flash";
export const FALLBACK_GEMINI_MODEL = "gemini-3.5-flash";
export const TERTIARY_GEMINI_MODEL = "gemini-3.1-flash-lite";
export const CANDIDATE_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite"
];

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

function repairUnescapedQuotes(jsonText: string): string {
  const schemaKeys = [
    "productName", "companyName", "technicalName", "category", "formulation", "activeIngredient", 
    "modeOfAction", "fracIracHracGroup", "targetCrops", "targetPests", "symptoms", "usage", 
    "benefits", "features", "compatibleProducts", "incompatibleProducts", "waitingPeriod", 
    "phi", "rei", "toxicity", "safetyInstructions", "mixingOrder", "sprayTiming", 
    "rainfastPeriod", "storage", "dosageLiquid", "dosagePowder", "dosageFertilizer", 
    "cropSpecificDosage", "hasExactMatch", "perLiter", "per15L", "per16L", "per20L", 
    "per25L", "per200L", "per500L", "perBigha", "perPlant", "perPot", "perIrrigation", 
    "perSpray", "perDrenching", "totalAmount", "cropName", "dosage", "sprayTime", "sources", "title", "uri",
    "analysis", "keywords"
  ];

  const keysPattern = schemaKeys.join('|');
  const regex = new RegExp('"(' + keysPattern + ')"\\s*:\\s*"(.*?)"\\s*(?=,\\s*"(?:' + keysPattern + ')"\\s*:|\\s*\\}|\\s*\\])', 'gs');

  return jsonText.replace(regex, (match, key, value) => {
    const escapedValue = value.replace(/\\"/g, '"').replace(/"/g, '\\"');
    return `"${key}":"${escapedValue}"`;
  });
}

function cleanAndParseJson<T>(jsonText: string): T {
  // 1. Remove markdown formatting if present
  let cleaned = jsonText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }

  // 2. Extract JSON block (from first '{' or '[' to the last corresponding '}' or ']')
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }

  // 3. Try parsing directly first
  try {
    return JSON.parse(cleaned) as T;
  } catch (directParseError: any) {
    const errorMsg = directParseError?.message || "";
    const match = errorMsg.match(/Unexpected non-whitespace character after JSON at position (\d+)/);
    if (match) {
      const pos = parseInt(match[1], 10);
      try {
        return JSON.parse(cleaned.substring(0, pos)) as T;
      } catch (innerError) {
        // ignore and let repair logic handle it
      }
    }
    console.warn("Direct JSON parse failed. Attempting cleanup and repair...", directParseError);
  }

  // 4. Fallback: repair unescaped double quotes inside string values before parsing
  let repaired = repairUnescapedQuotes(cleaned);

  // 5. Character-by-character scan to escape control characters inside string literals
  let result = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

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

  // 6. Clean up common LLM JSON syntax issues
  // Fix trailing commas in objects or arrays
  result = result.replace(/,(\s*[\]}])/g, '$1');

  // Fix common Chinese/Hindi punctuation outside of strings that break JSON
  result = result.replace(/"cropSpecificDosage"\s*:\s*[।०]/g, '"cropSpecificDosage": []');
  result = result.replace(/"(dosageLiquid|dosagePowder|dosageFertilizer)"\s*:\s*[।०]/g, '"$1": {}');

  try {
    return JSON.parse(result) as T;
  } catch (firstError: any) {
    const errorMsg = firstError?.message || "";
    const match = errorMsg.match(/Unexpected non-whitespace character after JSON at position (\d+)/);
    if (match) {
      const pos = parseInt(match[1], 10);
      try {
        return JSON.parse(result.substring(0, pos)) as T;
      } catch (inner) {
        // continue
      }
    }

    console.warn("Standard JSON parse failed, trying advanced regex cleaning...", firstError);
    
    // Fallback: If there are still unmatched punctuation or cutoffs, let's try to fix them.
    if (result.endsWith('।') || result.endsWith('。')) {
      result = result.slice(0, -1).trim();
    }
    
    result = result.replace(/:\s*[।०]/g, ': null');

    try {
      return JSON.parse(result) as T;
    } catch (secondError: any) {
      const secondErrorMsg = secondError?.message || "";
      const match2 = secondErrorMsg.match(/Unexpected non-whitespace character after JSON at position (\d+)/);
      if (match2) {
        const pos2 = parseInt(match2[1], 10);
        try {
          return JSON.parse(result.substring(0, pos2)) as T;
        } catch (inner2) {
          // continue
        }
      }
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

    const prompt = `You are a world-class Indian agricultural product expert representing 'फल्सावदिया कृषि बाजार'.
    Your task is to provide exhaustive, accurate, and completely verified information for the agricultural product/technical queried by the user.
    
    User Query: "${query}"

    Search Google and official agricultural resources (CIB&RC, ICAR, IFFCO, Krishi Vigyan Kendra, etc.) to get details on this product/technical/formulation.
    
    CRITICAL LANGUAGE MANDATE (अति-महत्वपूर्ण नियम: 100% केवल सरल हिंदी):
    1. STRICTLY 100% SIMPLE HINDI (केवल सरल हिंदी भाषा): The user is a rural Indian farmer who only understands Hindi. Every single sentence, paragraph, bullet point, explanation, usage instruction, benefit, precaution, symptom, dosage guideline, crop name, and pest name MUST be written in natural, easy-to-understand HINDI (शुद्ध व सरल हिंदी).
    2. ABSOLUTELY NO ENGLISH SENTENCES: Under NO circumstance should you return English explanations or paragraphs in any JSON field. Even if Google Search results are in English, you MUST translate and explain everything clearly in Hindi.
    3. Technical/Chemical Names: For technical active ingredients, provide the Hindi transcription first, with optional English chemical name in parentheses for scientific accuracy (e.g. 'क्लोरेंट्रानिलिप्रोल (Chlorantraniliprole 18.5% SC)' or 'इमिडाक्लोप्रिड (Imidacloprid 17.8% SL)'). But ALL descriptions of usage, mode of action, benefits, symptoms, targets, and directions MUST be entirely in simple Hindi!
    4. If the product is not found or not official, write detailed alternative helpful info or mark 'hasExactMatch' as false and provide a helpful description in productName/usage entirely in Hindi.
    5. Ensure that the DOSAGE section is fully filled in Hindi. Calculate dosages for 1L, 15L, 16L, 20L, 25L, 200L, 500L, and 1 Bigha (बीघा) based on standard recommendations for this product class (Liquid / Powder / Fertilizer).
    6. Provide crop-specific dosages for common Indian crops (जैसे: सोयाबीन, गेहूं, मक्का, चना, कपास, प्याज, लहसुन, टमाटर, मिर्च आदि) strictly in Hindi.
    7. Return the result strictly as a valid JSON object matching the defined schema. Do not include markdown wraps or anything except the JSON string in response.`;

    const responseSchema = {
      type: "OBJECT" as any,
      properties: {
        productName: { type: "STRING", description: "उत्पाद का नाम हिंदी में (जैसे: कोराजन कीटनाशक)" },
        companyName: { type: "STRING", description: "कंपनी या निर्माता का नाम हिंदी में (जैसे: एफएमसी / बायर)" },
        technicalName: { type: "STRING", description: "तकनीकी नाम हिंदी में व कोष्ठक में अंग्रेजी" },
        category: { type: "STRING", description: "कीटनाशक, फफूंदनाशक, खरपतवारनाशक, टॉनिक या खाद (सरल हिंदी में)" },
        formulation: { type: "STRING", description: "फार्मूलेशन का प्रकार सरल हिंदी में (जैसे: तरल / दानेदार)" },
        activeIngredient: { type: "STRING", description: "सक्रिय घटक हिंदी में" },
        modeOfAction: { type: "STRING", description: "असर का तरीका व कार्यप्रणाली 100% सरल हिंदी में" },
        fracIracHracGroup: { type: "STRING", description: "रासायनिक ग्रुप कोड (जैसे: Group 28)" },
        targetCrops: { type: "STRING", description: "उपयुक्त फसलें सरल हिंदी में (जैसे: सोयाबीन, चना, गेहूं, कपास)" },
        targetPests: { type: "STRING", description: "नियंत्रित कीट, खरपतवार या रोग सरल हिंदी में (जैसे: तना छेदक, इल्ली, माहू)" },
        symptoms: { type: "STRING", description: "रोग व कीट के लक्षण पहचान सरल हिंदी में" },
        usage: { type: "STRING", description: "विस्तृत उपयोग विधि एवं छिड़काव का तरीका 100% सरल हिंदी में" },
        benefits: { type: "STRING", description: "मुख्य फायदे और लाभ 100% सरल हिंदी में" },
        features: { type: "STRING", description: "उत्पाद की विशेषताएं 100% सरल हिंदी में" },
        compatibleProducts: { type: "STRING", description: "किन दवाओं के साथ मिला सकते हैं (सरल हिंदी में)" },
        incompatibleProducts: { type: "STRING", description: "किन दवाओं के साथ भूलकर भी न मिलाएं (सरल हिंदी में)" },
        waitingPeriod: { type: "STRING", description: "प्रतीक्षा अवधि (PHI) सरल हिंदी में" },
        phi: { type: "STRING", description: "तुड़ाई पूर्व अंतर सरल हिंदी में" },
        rei: { type: "STRING", description: "खेत में पुनः प्रवेश का समय सरल हिंदी में" },
        toxicity: { type: "STRING", description: "विषाक्तता का स्तर व रंगीन त्रिकोण सरल हिंदी में" },
        safetyInstructions: { type: "STRING", description: "किसान सुरक्षा सावधानियां 100% सरल हिंदी में" },
        mixingOrder: { type: "STRING", description: "दवा घोलने का सही क्रम सरल हिंदी में" },
        sprayTiming: { type: "STRING", description: "छिड़काव का सबसे उत्तम समय सरल हिंदी में (जैसे: सुबह या शाम)" },
        rainfastPeriod: { type: "STRING", description: "बारिश से बचाव की अवधि सरल हिंदी में (जैसे: 2 घंटे बाद बारिश से सुरक्षित)" },
        storage: { type: "STRING", description: "दवा भंडारण व रखने के निर्देश सरल हिंदी में" },
        dosageLiquid: {
          type: "OBJECT" as any,
          properties: {
            perLiter: { type: "STRING", description: "प्रति 1 लीटर पानी में मात्रा हिंदी में" },
            per15L: { type: "STRING", description: "15 लीटर पंप में मात्रा हिंदी में" },
            per16L: { type: "STRING", description: "16 लीटर पंप में मात्रा हिंदी में" },
            per20L: { type: "STRING", description: "20 लीटर पंप में मात्रा हिंदी में" },
            per25L: { type: "STRING", description: "25 लीटर पंप में मात्रा हिंदी में" },
            per200L: { type: "STRING", description: "200 लीटर ड्रम में मात्रा हिंदी में" },
            per500L: { type: "STRING", description: "500 लीटर टैंकर में मात्रा हिंदी में" },
            perBigha: { type: "STRING", description: "प्रति 1 बीघा में मात्रा हिंदी में" }
          },
          required: ["perLiter", "per15L", "per16L", "per20L", "per25L", "per200L", "per500L", "perBigha"]
        },
        dosagePowder: {
          type: "OBJECT" as any,
          properties: {
            perLiter: { type: "STRING", description: "प्रति 1 लीटर पानी में ग्राम हिंदी में" },
            per15L: { type: "STRING", description: "15 लीटर पंप में ग्राम हिंदी में" },
            per16L: { type: "STRING", description: "16 लीटर पंप में ग्राम हिंदी में" },
            per20L: { type: "STRING", description: "20 लीटर पंप में ग्राम हिंदी में" },
            per25L: { type: "STRING", description: "25 लीटर पंप में ग्राम हिंदी में" },
            per200L: { type: "STRING", description: "200 लीटर ड्रम में ग्राम हिंदी में" },
            per500L: { type: "STRING", description: "500 लीटर टैंकर में ग्राम हिंदी में" },
            perBigha: { type: "STRING", description: "प्रति 1 बीघा में ग्राम हिंदी में" }
          },
          required: ["perLiter", "per15L", "per16L", "per20L", "per25L", "per200L", "per500L", "perBigha"]
        },
        dosageFertilizer: {
          type: "OBJECT" as any,
          properties: {
            perPlant: { type: "STRING", description: "प्रति पौधा मात्रा हिंदी में" },
            perPot: { type: "STRING", description: "प्रति गमला मात्रा हिंदी में" },
            perBigha: { type: "STRING", description: "प्रति 1 बीघा मात्रा हिंदी में" },
            perIrrigation: { type: "STRING", description: "प्रति सिंचाई मात्रा हिंदी में" },
            perSpray: { type: "STRING", description: "प्रति स्प्रे मात्रा हिंदी में" },
            perDrenching: { type: "STRING", description: "ड्रेंचिंग मात्रा हिंदी में" },
            totalAmount: { type: "STRING", description: "कुल मात्रा हिंदी में" }
          },
          required: ["perPlant", "perPot", "perBigha", "perIrrigation", "perSpray", "perDrenching", "totalAmount"]
        },
        cropSpecificDosage: {
          type: "ARRAY" as any,
          items: {
            type: "OBJECT" as any,
            properties: {
              cropName: { type: "STRING", description: "फसल का नाम हिंदी में (जैसे: सोयाबीन, गेहूं)" },
              dosage: { type: "STRING", description: "डोज़ की मात्रा हिंदी में" },
              usage: { type: "STRING", description: "उपयोग विधि सरल हिंदी में" },
              sprayTime: { type: "STRING", description: "स्प्रे का समय सरल हिंदी में" }
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

    const systemInstruction = "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). MANDATORY LANGUAGE REQUIREMENT: Your audience is exclusively Hindi-speaking Indian farmers. You MUST respond 100% in simple, clear, respectful HINDI (सरल हिंदी भाषा). NEVER provide descriptions, benefits, usages, or symptoms in English. Ensure the output is valid JSON strictly following the schema. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').";

    let response;
    try {
      response = await ai.models.generateContent({
        model: PRIMARY_GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema
        }
      });
    } catch (searchError: any) {
      console.warn("Google search grounding attempt in getProductKnowledge failed or unavailable. Retrying with pure agricultural model knowledge...", searchError);
      try {
        response = await ai.models.generateContent({
          model: PRIMARY_GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema
          }
        });
      } catch (primaryErr: any) {
        console.warn("Primary model attempt failed in getProductKnowledge, retrying with fallback model...", primaryErr);
        try {
          response = await ai.models.generateContent({
            model: FALLBACK_GEMINI_MODEL,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema
            }
          });
        } catch (secondaryErr: any) {
          console.warn("Secondary model failed in getProductKnowledge, retrying with tertiary model (flash-lite)...", secondaryErr);
          response = await ai.models.generateContent({
            model: TERTIARY_GEMINI_MODEL,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema
            }
          });
        }
      }
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

    const prompt = `You are a world-class Indian agricultural product expert and advanced image recognition AI representing 'फल्सावदिया कृषि बाजार'.
    Your task is to analyze the attached photo of an agricultural product (fertilizer, insecticide, fungicide, herbicide, PGR, micronutrient, biostimulant, seed, animal nutrition, etc.).
    
    CRITICAL ANALYSIS STEPS:
    1. **De-blur & Image Enhancing**: If the photo is blurry, dark, low-quality, or taken at an angle, simulate digital enhancement in your reasoning. Carefully read the text elements, logos, color patterns, and label details to reconstruct the visible characters.
    2. **OCR & Label Extraction**: Perform OCR on all visible text on the product label. Read the brand name, chemical composition, company name, formulation, or registration numbers.
    3. **Product Recognition**: Identify the Product Name, Company Name, Technical Name, Category, and Formulation.
    4. **Knowledge Retrieval**: Once the product is identified, retrieve exhaustive, accurate, and completely verified agricultural details for this product (its active ingredients, mode of action, group, recommended dosage, safety instructions, target crops, target pests, etc.).
    
    CRITICAL LANGUAGE MANDATE (अति-महत्वपूर्ण नियम: 100% केवल सरल हिंदी):
    - STRICTLY 100% SIMPLE HINDI (केवल सरल हिंदी भाषा): Indian farmers will read this. Every single sentence, paragraph, bullet point, explanation, usage instruction, benefit, precaution, symptom, dosage guideline, crop name, and pest name MUST be written in natural, easy-to-understand HINDI (शुद्ध व सरल हिंदी).
    - ABSOLUTELY NO ENGLISH SENTENCES: Even if the product label or chemical text in the photo is in English, you MUST translate and provide all descriptions, uses, dosages, and benefits in simple Hindi.
    - Technical/Chemical Names: For chemical active ingredients, provide the Hindi transcription first, with optional English chemical name in parentheses for accuracy (e.g. 'क्लोरेंट्रानिलिप्रोल (Chlorantraniliprole)'). All explanations MUST be in Hindi.
    - Ensure that the DOSAGE section is fully filled in Hindi for 1L, 15L, 16L, 20L, 25L, 200L, 500L, and 1 Bigha (बीघा).
    - Provide crop-specific dosages for common crops (जैसे: सोयाबीन, गेहूं, मक्का, चना, कपास आदि) strictly in Hindi.
    - If the image does not show an agricultural product, or if the product is not recognized at all, provide a helpful general response, set 'hasExactMatch' to false, and explain in productName/usage what was visible in the image in Hindi.
    - Return the result strictly as a valid JSON object matching the defined schema. Do not include markdown wraps or anything except the JSON string in response.`;

    const responseSchema = {
      type: "OBJECT" as any,
      properties: {
        productName: { type: "STRING", description: "उत्पाद का नाम हिंदी में (जैसे: कोराजन कीटनाशक)" },
        companyName: { type: "STRING", description: "कंपनी या निर्माता का नाम हिंदी में" },
        technicalName: { type: "STRING", description: "तकनीकी नाम हिंदी में व कोष्ठक में अंग्रेजी" },
        category: { type: "STRING", description: "कीटनाशक, फफूंदनाशक, खरपतवारनाशक, टॉनिक या खाद (सरल हिंदी में)" },
        formulation: { type: "STRING", description: "फार्मूलेशन का प्रकार सरल हिंदी में" },
        activeIngredient: { type: "STRING", description: "सक्रिय घटक हिंदी में" },
        modeOfAction: { type: "STRING", description: "असर का तरीका व कार्यप्रणाली 100% सरल हिंदी में" },
        fracIracHracGroup: { type: "STRING", description: "रासायनिक ग्रुप कोड" },
        targetCrops: { type: "STRING", description: "उपयुक्त फसलें सरल हिंदी में" },
        targetPests: { type: "STRING", description: "नियंत्रित कीट, खरपतवार या रोग सरल हिंदी में" },
        symptoms: { type: "STRING", description: "रोग व कीट के लक्षण पहचान सरल हिंदी में" },
        usage: { type: "STRING", description: "विस्तृत उपयोग विधि 100% सरल हिंदी में" },
        benefits: { type: "STRING", description: "मुख्य फायदे और लाभ 100% सरल हिंदी में" },
        features: { type: "STRING", description: "उत्पाद की विशेषताएं 100% सरल हिंदी में" },
        compatibleProducts: { type: "STRING", description: "किन दवाओं के साथ मिला सकते हैं (सरल हिंदी में)" },
        incompatibleProducts: { type: "STRING", description: "किन दवाओं के साथ न मिलाएं (सरल हिंदी में)" },
        waitingPeriod: { type: "STRING", description: "प्रतीक्षा अवधि (PHI) सरल हिंदी में" },
        phi: { type: "STRING", description: "तुड़ाई पूर्व अंतर सरल हिंदी में" },
        rei: { type: "STRING", description: "खेत में पुनः प्रवेश का समय सरल हिंदी में" },
        toxicity: { type: "STRING", description: "विषाक्तता का स्तर व रंगीन त्रिकोण सरल हिंदी में" },
        safetyInstructions: { type: "STRING", description: "किसान सुरक्षा सावधानियां 100% सरल हिंदी में" },
        mixingOrder: { type: "STRING", description: "दवा घोलने का सही क्रम सरल हिंदी में" },
        sprayTiming: { type: "STRING", description: "छिड़काव का सही समय सरल हिंदी में" },
        rainfastPeriod: { type: "STRING", description: "बारिश से बचाव की अवधि सरल हिंदी में" },
        storage: { type: "STRING", description: "दवा भंडारण व रखने के निर्देश सरल हिंदी में" },
        dosageLiquid: {
          type: "OBJECT" as any,
          properties: {
            perLiter: { type: "STRING", description: "प्रति 1 लीटर पानी में मात्रा हिंदी में" },
            per15L: { type: "STRING", description: "15 लीटर पंप में मात्रा हिंदी में" },
            per16L: { type: "STRING", description: "16 लीटर पंप में मात्रा हिंदी में" },
            per20L: { type: "STRING", description: "20 लीटर पंप में मात्रा हिंदी में" },
            per25L: { type: "STRING", description: "25 लीटर पंप में मात्रा हिंदी में" },
            per200L: { type: "STRING", description: "200 लीटर ड्रम में मात्रा हिंदी में" },
            per500L: { type: "STRING", description: "500 लीटर टैंकर में मात्रा हिंदी में" },
            perBigha: { type: "STRING", description: "प्रति 1 बीघा में मात्रा हिंदी में" }
          },
          required: ["perLiter", "per15L", "per16L", "per20L", "per25L", "per200L", "per500L", "perBigha"]
        },
        dosagePowder: {
          type: "OBJECT" as any,
          properties: {
            perLiter: { type: "STRING", description: "प्रति 1 लीटर पानी में ग्राम हिंदी में" },
            per15L: { type: "STRING", description: "15 लीटर पंप में ग्राम हिंदी में" },
            per16L: { type: "STRING", description: "16 लीटर पंप में ग्राम हिंदी में" },
            per20L: { type: "STRING", description: "20 लीटर पंप में ग्राम हिंदी में" },
            per25L: { type: "STRING", description: "25 लीटर पंप में ग्राम हिंदी में" },
            per200L: { type: "STRING", description: "200 लीटर ड्रम में ग्राम हिंदी में" },
            per500L: { type: "STRING", description: "500 लीटर टैंकर में ग्राम हिंदी में" },
            perBigha: { type: "STRING", description: "प्रति 1 बीघा में ग्राम हिंदी में" }
          },
          required: ["perLiter", "per15L", "per16L", "per20L", "per25L", "per200L", "per500L", "perBigha"]
        },
        dosageFertilizer: {
          type: "OBJECT" as any,
          properties: {
            perPlant: { type: "STRING", description: "प्रति पौधा मात्रा हिंदी में" },
            perPot: { type: "STRING", description: "प्रति गमला मात्रा हिंदी में" },
            perBigha: { type: "STRING", description: "प्रति 1 बीघा मात्रा हिंदी में" },
            perIrrigation: { type: "STRING", description: "प्रति सिंचाई मात्रा हिंदी में" },
            perSpray: { type: "STRING", description: "प्रति स्प्रे मात्रा हिंदी में" },
            perDrenching: { type: "STRING", description: "ड्रेंचिंग मात्रा हिंदी में" },
            totalAmount: { type: "STRING", description: "कुल मात्रा हिंदी में" }
          },
          required: ["perPlant", "perPot", "perBigha", "perIrrigation", "perSpray", "perDrenching", "totalAmount"]
        },
        cropSpecificDosage: {
          type: "ARRAY" as any,
          items: {
            type: "OBJECT" as any,
            properties: {
              cropName: { type: "STRING", description: "फसल का नाम हिंदी में" },
              dosage: { type: "STRING", description: "डोज़ की मात्रा हिंदी में" },
              usage: { type: "STRING", description: "उपयोग विधि सरल हिंदी में" },
              sprayTime: { type: "STRING", description: "स्प्रे का समय सरल हिंदी में" }
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

    const systemInstruction = "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). MANDATORY LANGUAGE REQUIREMENT: Your audience is exclusively Hindi-speaking Indian farmers. You MUST respond 100% in simple, clear, respectful HINDI (सरल हिंदी भाषा). NEVER provide descriptions, benefits, usages, or symptoms in English. Ensure the output is valid JSON strictly following the schema. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').";

    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image.split(',')[1] || base64Image
        }
      }
    ];

    let response: any = null;
    let lastError: any = null;

    for (const model of CANDIDATE_GEMINI_MODELS) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: parts,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema
          }
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[analyzeProductImage] Candidate ${model} attempt notice:`, err?.status, err?.message);
      }
    }

    if (!response?.text) {
      throw lastError || new Error("छवि का विश्लेषण नहीं हो सका।");
    }

    const result = safeParseProductKnowledge(response.text);
    return result;
  } catch (error: any) {
    console.warn("Gemini Analyze Product Image Warning:", error?.message || error);
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    throw new Error(friendlyError.message || "इमेज का विश्लेषण करने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
  }
}

