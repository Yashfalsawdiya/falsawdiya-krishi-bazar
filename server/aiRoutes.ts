import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

/**
 * Helper to initialize the Gemini client.
 * Prioritizes user-supplied key (via header or body) if valid;
 * otherwise seamlessly falls back to server-side GEMINI_API_KEY.
 */
function getGeminiClient(customKey?: string) {
  const apiKey = customKey && customKey.trim() ? customKey.trim() : undefined;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractUserApiKey(req: Request): string | undefined {
  const headerKey = req.headers['x-user-gemini-key'] as string;
  if (headerKey && headerKey.trim() !== '') {
    return headerKey.trim();
  }
  const bodyKey = (req.body?.userApiKey || req.body?.apiKey) as string;
  if (bodyKey && typeof bodyKey === 'string' && bodyKey.trim() !== '') {
    return bodyKey.trim();
  }
  return undefined;
}

/**
 * Strict User-Only API Key Execution:
 * AI features run ONLY on the user's personal API key.
 * If user key is missing, throws an error requiring the user to add their key in Profile.
 * Never falls back to server GEMINI_API_KEY.
 */
async function executeWithGemini<T>(
  customKey: string | undefined,
  fn: (ai: GoogleGenAI) => Promise<T>
): Promise<T> {
  const trimmedKey = customKey?.trim();
  if (!trimmedKey) {
    const error: any = new Error('AI सुविधाओं का उपयोग करने के लिए आपकी व्यक्तिगत Gemini API Key आवश्यक है। कृपया अपनी प्रोफाइल में अपनी Key जोड़ें।');
    error.status = 401;
    error.requireApiKey = true;
    throw error;
  }

  const primaryAi = getGeminiClient(trimmedKey);
  if (!primaryAi) {
    const error: any = new Error('अमान्य API Key। कृपया अपनी प्रोफ़ाइल में वैध Gemini API Key जोड़ें।');
    error.status = 401;
    error.requireApiKey = true;
    throw error;
  }

  try {
    return await fn(primaryAi);
  } catch (err: any) {
    const isAuthError =
      err?.status === 403 ||
      err?.status === 400 ||
      err?.message?.includes('API_KEY_INVALID') ||
      err?.message?.includes('PERMISSION_DENIED') ||
      err?.message?.includes('permission denied');

    if (isAuthError) {
      const authErr: any = new Error('आपकी Gemini API Key अमान्य है या समाप्त हो गई है। कृपया प्रोफाइल में जाकर नई वैध Key दर्ज करें।');
      authErr.status = 403;
      authErr.requireApiKey = true;
      throw authErr;
    }

    const isQuotaError =
      err?.status === 429 ||
      err?.message?.includes('RESOURCE_EXHAUSTED') ||
      err?.message?.includes('quota');

    if (isQuotaError) {
      const quotaErr: any = new Error('आपकी व्यक्तिगत API Key का दैनिक कोटा समाप्त हो गया है। कृपया कुछ समय बाद पुनः प्रयास करें या नई API Key जोड़ें।');
      quotaErr.status = 429;
      throw quotaErr;
    }

    throw err;
  }
}

// =========================================================================
// 1. Ask AI Question (Q&A)
// =========================================================================
export const handleAskAiQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, weatherData } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ success: false, error: 'सवाल खाली नहीं हो सकता।' });
      return;
    }

    const userKey = extractUserApiKey(req);
    const now = new Date();
    const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const prompt = `सवाल: "${question.trim()}"
स्थान: शामगढ़, जिला मंदसौर, मध्य प्रदेश
मौसम: ${weatherData?.temp || '28'}°C, ${weatherData?.condition || 'साफ मौसम'}
तारीख: ${dateStr}`;

    const systemInstruction = `You are an expert Indian agricultural scientist representing 'फल्सावदिया कृषि बाजार' located in Shamgarh, Mandsaur, MP.

Shop Profile:
- Name: फल्सावदिया कृषि बाजार
- Address: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)
- Timings: सुबह 8:00 बजे से रात 8:00 बजे तक (08:00 AM – 08:00 PM)

Instructions: Answer farmer questions in simple Hindi. Give practical, honest advice. Always mention that recommended quality products/medicines are available at 'फल्सावदिया कृषि बाजार'.
STRICT RULE: Do NOT use 'फालसावदिया'. Always use 'फल्सावदिया कृषि बाजार'.`;

    const answer = await executeWithGemini(userKey, async (ai) => {
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });
      } catch {
        // Fallback without search tools if search tool is restricted
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction,
          },
        });
      }
      return response.text || 'क्षमा करें, उत्तर उत्पन्न नहीं हो सका। कृपया पुनः प्रयास करें।';
    });

    res.json({ success: true, answer });
  } catch (error: any) {
    console.error('[AI Routes] handleAskAiQuestion error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'AI उत्तर प्राप्त करने में त्रुटि हुई।',
    });
  }
};

// =========================================================================
// 2. Daily Agricultural Advice
// =========================================================================
export const handleGetDailyAdvice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { weatherData, season = 'Kharif', cropName = 'Soybean' } = req.body;
    const userKey = extractUserApiKey(req);
    const now = new Date();
    const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const prompt = `आप एक विशेषज्ञ भारतीय कृषि वैज्ञानिक हैं। 
आज की स्थिति (${dateStr}):
- मुख्य फसल: ${cropName} (${season} मौसम)
- वर्तमान मौसम: ${weatherData?.temp || '28'}°C, आर्द्रता: ${weatherData?.humidity || '60'}%, बारिश: ${weatherData?.rain || '0'}mm, स्थिति: ${weatherData?.condition || 'सामान्य'}
- स्थान: शामगढ़, जिला मंदसौर, मालवा क्षेत्र, मध्य प्रदेश

आज के लिए स्थानीय किसानों को संक्षिप्त, सटीक और व्यावहारिक कृषि सलाह प्रदान करें। इसमें सिंचाई, खाद/उर्वरक और संभावित कीट/रोग नियंत्रण पर स्पष्ट बुलेट पॉइंट्स में मार्गदर्शन दें।`;

    const systemInstruction = `You are a helpful Agri-Expert for farmers representing 'फल्सावदिया कृषि बाजार' in Shamgarh, MP. Our shop is at Dimple Chauraha, Shamgarh and open 8:00 AM to 8:00 PM (सुबह 8:00 बजे से रात 8:00 बजे तक). Provide advice based on current weather. Today is ${dateStr}. Always use the name 'फल्सावदिया कृषि बाजार' strictly and never 'फालसावदिया'.`;

    const advice = await executeWithGemini(userKey, async (ai) => {
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction,
          },
        });
      }
      return response.text || 'आज की कृषि सलाह उपलब्ध नहीं है।';
    });

    res.json({ success: true, advice });
  } catch (error: any) {
    console.error('[AI Routes] handleGetDailyAdvice error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'कृषि सलाह प्राप्त करने में त्रुटि हुई।',
    });
  }
};

// =========================================================================
// 3. Crop Disease Detection (Photos Analysis)
// =========================================================================
export const handleDetectDisease = async (req: Request, res: Response): Promise<void> => {
  try {
    const { images, location = 'शामगढ़, म.प्र.', weatherSummary = 'सामान्य' } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ success: false, error: 'कृपया कम से कम एक फसल की फोटो अपलोड करें।' });
      return;
    }

    const userKey = extractUserApiKey(req);
    const imageParts = images.map((img: string) => {
      const clean = img.replace(/^data:image\/\w+;base64,/, '');
      return {
        inlineData: {
          data: clean,
          mimeType: 'image/jpeg',
        },
      };
    });

    const systemInstruction = `आप 'फल्सावदिया कृषि बाजार' (डिंपल चौराहा, शामगढ़, जिला मंदसौर, म.प्र. - 458883, समय: सुबह 8:00 से रात 8:00 बजे) के वरिष्ठ पादप रोग विशेषज्ञ (Senior Plant Pathologist) हैं।

आपका कार्य किसान द्वारा भेजी गई फोटो (पत्ती, तना, फल, जड़ या कीट) को देखकर वैज्ञानिक व सटीक विश्लेषण करना है।

उत्तर हमेशा स्पष्ट, पेशेवर हिन्दी में निम्नलिखित संरचना (Structure) में दें:

🔍 **1. फसल और रोग की पहचान:**
- फसल का नाम:
- रोग/कीट का नाम (हिन्दी व वैज्ञानिक नाम):
- गंभीरता (Severity): (कम / मध्यम / गंभीर - %)
- लक्षण:

💊 **2. रासायनिक नियंत्रण (Chemical Control - सटीक मात्रा के साथ):**
- अनुशंसित दवा और टेक्निकल नाम:
- डोज़ (प्रति 15-20 लीटर पंप व प्रति एकड़):
- स्प्रे का सही समय व सावधानियां:

🌿 **3. जैविक व देशी रोकथाम (Organic & Preventive):**
- जैविक या घरेलू उपाय:
- आगे से बचाव के तरीके:

🏪 **4. दुकान उपलब्धता सूचना:**
- यह सभी प्रमाणित दवाइयां और खाद हमारी दुकान **'फल्सावदिया कृषि बाजार'** (डिंपल चौराहा, शामगढ़) पर उपलब्ध हैं।

STRICT RULE: दुकान का नाम हमेशा 'फल्सावदिया कृषि बाजार' ही लिखें। कभी भी 'फालसावदिया' न लिखें।`;

    const promptText = `कृपया इस फसल की फोटो का विश्लेषण करें।
स्थान: ${location}
मौसम: ${weatherSummary}
रोग, कीट, या पोषण की कमी की पहचान करके सही समाधान प्रदान करें।`;

    const result = await executeWithGemini(userKey, async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          ...imageParts,
          { text: promptText },
        ],
        config: {
          systemInstruction,
          temperature: 0.4,
        },
      });

      const analysisText = response.text || 'फोटो का विश्लेषण पूर्ण नहीं हो सका। कृपया स्पष्ट फोटो पुनः भेजें।';

      // Extract quick keywords
      const keywords: string[] = [];
      const matchWords = analysisText.match(/[A-Za-z0-9\u0900-\u097F]{3,20}/g) || [];
      for (const w of matchWords) {
        if (w.length >= 3 && !keywords.includes(w) && keywords.length < 8) {
          keywords.push(w);
        }
      }

      return {
        analysis: analysisText,
        keywords,
      };
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[AI Routes] handleDetectDisease error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'रोग पहचान में त्रुटि हुई।',
    });
  }
};

// =========================================================================
// 4. Disease Report Chat (Follow-up Q&A)
// =========================================================================
export const handleDiseaseChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userQuestion, reportAnalysis, location = 'शामगढ़, म.प्र.', weatherSummary = 'सामान्य', chatHistory = [] } = req.body;
    if (!userQuestion || !userQuestion.trim()) {
      res.status(400).json({ success: false, error: 'प्रश्न खाली नहीं हो सकता।' });
      return;
    }

    const userKey = extractUserApiKey(req);
    const historyText = (chatHistory || [])
      .map((m: any) => `${m.role === 'user' ? 'किसान' : 'AI विशेषज्ञ'}: ${m.text}`)
      .join('\n');

    const systemInstruction = `आप 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar, Shamgarh, MP) के वरिष्ठ कृषि विशेषज्ञ हैं।
आपका मुख्य कार्य किसान द्वारा कराई गई **फसल बीमारी जाँच रिपोर्ट** के संदर्भ में उनके फॉलो-अप प्रश्नों का उत्तर देना है।

स्कैन रिपोर्ट का संदर्भ:
-------------------------------------------
${reportAnalysis || 'सामान्य फसल परामर्श'}
-------------------------------------------
स्थान: ${location}
मौसम: ${weatherSummary}

दिशा-निर्देश:
1. सरल, व्यावहारिक हिन्दी में उत्तर दें।
2. डोज़, टैंक मिक्स का सही क्रम, स्प्रे का समय और सावधानियां स्पष्ट बताएं।
3. दुकान का नाम हमेशा 'फल्सावदिया कृषि बाजार' लिखें। 'फालसावदिया' वर्जित है।`;

    const prompt = `पूर्व बातचीत:
${historyText || 'कोई पूर्व बातचीत नहीं'}

किसान का नया प्रश्न:
"${userQuestion.trim()}"`;

    const reply = await executeWithGemini(userKey, async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.5,
        },
      });
      return response.text || 'उत्तर प्राप्त नहीं हो सका।';
    });

    res.json({ success: true, reply });
  } catch (error: any) {
    console.error('[AI Routes] handleDiseaseChat error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'उत्तर उत्पन्न करने में त्रुटि हुई।',
    });
  }
};

// =========================================================================
// 5. Product Knowledge & Chemical Details
// =========================================================================
const DEFAULT_PRODUCT_KNOWLEDGE = {
  productName: "जानकारी उपलब्ध नहीं है",
  companyName: "उपलब्ध नहीं है",
  technicalName: "उपलब्ध नहीं है",
  category: "सामान्य",
  formulation: "उपलब्ध नहीं है",
  activeIngredient: "उपलब्ध नहीं है",
  modeOfAction: "उपलब्ध नहीं है",
  fracIracHracGroup: "उपलब्ध नहीं है",
  targetCrops: "सभी फसलें",
  targetPests: "सामान्य कीट/रोग",
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
  safetyInstructions: "सावधानीपूर्वक उपयोग करें। बच्चों की पहुँच से दूर रखें। सुरक्षात्मक दस्ताने और मास्क का प्रयोग करें।",
  mixingOrder: "1. साफ पानी, 2. WP/WDG पाउडर, 3. SC/SL/EC लिक्विड, 4. सिलिकॉन स्टिकर/स्प्रेडर",
  sprayTiming: "सुबह 8 से 11 या शाम 4 से 6 बजे जब धूप तेज न हो और हवा शांत हो",
  rainfastPeriod: "2 घंटे",
  storage: "मूल डिब्बे में ठंडी, सूखी और छायादार जगह पर रखें",
  dosageLiquid: {
    perLiter: "लागू नहीं",
    per15L: "लागू नहीं",
    per16L: "लागू नहीं",
    per20L: "लागू नहीं",
    per25L: "लागू नहीं",
    per200L: "लागू नहीं",
    per500L: "लागू नहीं",
    perBigha: "लागू नहीं"
  },
  dosagePowder: {
    perLiter: "लागू नहीं",
    per15L: "लागू नहीं",
    per16L: "लागू नहीं",
    per20L: "लागू नहीं",
    per25L: "लागू नहीं",
    per200L: "लागू नहीं",
    per500L: "लागू नहीं",
    perBigha: "लागू नहीं"
  },
  dosageFertilizer: {
    perPlant: "लागू नहीं",
    perPot: "लागू नहीं",
    perBigha: "लागू नहीं",
    perIrrigation: "लागू नहीं",
    perSpray: "लागू नहीं",
    perDrenching: "लागू नहीं",
    totalAmount: "लागू नहीं"
  },
  cropSpecificDosage: [],
  hasExactMatch: true
};

export const handleProductKnowledge = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ success: false, error: 'कृपया उत्पाद या टेक्निकल नाम दर्ज करें।' });
      return;
    }

    const userKey = extractUserApiKey(req);
    const searchPrompt = `आप भारत के एक शीर्ष कृषि वैज्ञानिक और इनपुट विशेषज्ञ हैं जो 'फल्सावदिया कृषि बाजार', शामगढ़ (मंदसौर, म.प्र.) का प्रतिनिधित्व करते हैं।
उपयोगकर्ता द्वारा खोजे गए कृषि उत्पाद/कीटनाशक/फफूंदनाशक/खरपतवारनाशक/उर्वरक/टॉनिक की आधिकारिक और 100% सटीक जानकारी खोजें:
उत्पाद/टेक्निकल खोज शब्द: "${query.trim()}"

खोज और सत्यापन निर्देश (Strict Accuracy Requirements):
1. Google Search द्वारा CIB&RC (केन्द्रीय कीटनाशी बोर्ड एवं पंजीकरण समिति), ICAR, राज्य कृषि विश्वविद्यालयों, IFFCO, और उत्पाद निर्माता (जैसे Syngenta, Bayer, FMC, UPL, Dhanuka, BASF, Crystal, PI Industries, Sumitomo) के वास्तविक डेटा से पुष्टि करें।
2. उत्पाद का सही ब्रांड नाम, अधिकृत निर्माता कंपनी, सटीक टेक्निकल नाम (Active Ingredient प्रतिशत के साथ जैसे 'Chlorantraniliprole 18.5% SC', 'Emamectin Benzoate 5% SG', 'Tebuconazole 10% + Sulphur 65% WG'), और फॉर्मूलेशन प्रकार (EC, SC, SL, WDG, WP, SP, SG, GR, आदि) निर्धारित करें।
3. श्रेणी पहचानें: कीटनाशक (Insecticide), फफूंदनाशक (Fungicide), खरपतवारनाशक (Herbicide), उर्वरक/खाद (Fertilizer), PGR/टॉनिक, जैव-उत्तेजक (Bio-stimulant), या बीज उपचार (Seed Treatment)।
4. सटीक डोज़ (Dosage) दिशा-निर्देश:
   - यदि उत्पाद तरल/लिक्विड (EC, SC, SL, FS आदि) है:
     * dosageLiquid में प्रति 1L, 15L पंप, 16L पंप, 20L पंप, 25L पंप, 200L ड्रम, 500L, और 1 बीघा (मालवा क्षेत्र में 1 बीघा = ~0.4 एकड़ = 60-80 लीटर पानी या 4-5 पंप) की आधिकारिक अनुशंसित डोज़ लिखें।
     * dosagePowder और dosageFertilizer के सभी मानों में "लागू नहीं (तरल उत्पाद)" लिखें।
   - यदि उत्पाद पाउडर या दानेदार (WP, WDG, SP, SG, GR, Granules आदि) है:
     * dosagePowder में ग्राम या किलोग्राम में आधिकारिक अनुशंसित डोज़ लिखें।
     * dosageLiquid और dosageFertilizer के सभी मानों में "लागू नहीं (पाउडर/दानेदार उत्पाद)" लिखें।
   - यदि उत्पाद उर्वरक/खाद (Urea, DAP, NPK 19:19:19, 0:0:50, जिंक, बोरॉन, आदि) है:
     * dosageFertilizer में प्रति पौधा, प्रति गमला, प्रति बीघा (बेसल या टॉप ड्रेसिंग), प्रति स्प्रे (ग्राम/लीटर या ग्राम/पंप), ड्रेंचिंग/ड्रिप की सटीक मात्रा लिखें।
     * यदि स्प्रे हेतु घुलनशील खाद है, तो dosagePowder/dosageLiquid में भी उपयुक्त स्प्रे मात्रा लिखें।
5. लक्षित फसलें (Target Crops) और नियंत्रित कीट/रोग/खरपतवार (Target Pests/Diseases/Weeds) की वास्तविक आधिकारिक सूची हिंदी में दें।
6. असर का तरीका (Mode of Action - सिस्टेमिक, कॉन्टैक्ट, ट्रांसलेमिनर), FRAC/IRAC/HRAC ग्रुप, रेनफास्ट समय (घंटों में), PHI (प्रतीक्षा अवधि दिनों में), REI (पुनः प्रवेश घंटे), टॉक्सिसिटी ट्रायंगल रंग (हरा/नीला/पीला/लाल) बताएं।
7. दुकान उपलब्धता: 'फल्सावदिया कृषि बाजार' (डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़ - 458883)।

उत्तर को केवल और केवल एक मान्य JSON ऑब्जेक्ट के रूप में \`\`\`json और \`\`\` कोड ब्लॉक में दें। JSON प्रारूप:
{
  "productName": "ब्रांड नाम",
  "companyName": "निर्माता कंपनी",
  "technicalName": "सटीक टेक्निकल नाम व प्रतिशत",
  "category": "Insecticide / Fungicide / Herbicide / Fertilizer / PGR / Seed Treatment",
  "formulation": "जैसे 18.5% SC, 5% SG, 25% EC, 75% WP",
  "activeIngredient": "सक्रिय संघटक विवरण",
  "modeOfAction": "असर का वैज्ञानिक तरीका हिंदी में",
  "fracIracHracGroup": "Group कोड (जैसे IRAC Group 28)",
  "targetCrops": "अनुशंसित फसलें हिंदी में",
  "targetPests": "नियंत्रित कीट, रोग या खरपतवार हिंदी में",
  "symptoms": "किन लक्षणों या प्रकोप में उपयोगी है",
  "usage": "उपयोग और छिड़काव की विस्तृत विधि हिंदी में",
  "benefits": "मुख्य लाभ एवं विशेषताएं हिंदी में",
  "features": "तकनीकी विशेषताएं",
  "compatibleProducts": "किन दवाओं व खादों के साथ मिला सकते हैं",
  "incompatibleProducts": "किनके साथ मिश्रण न करें",
  "waitingPeriod": "कटाई पूर्व प्रतीक्षा अवधि (PHI) दिनों में",
  "phi": "दिनों की संख्या (जैसे 7-14 दिन)",
  "rei": "घंटों की संख्या (जैसे 24 घंटे)",
  "toxicity": "टॉक्सिसिटी चेतावनी (हरा/नीला/पीला/लाल लेबल)",
  "safetyInstructions": "सुरक्षा निर्देश एवं प्राथमिक उपचार",
  "mixingOrder": "टंकी में घोल बनाने का क्रम",
  "sprayTiming": "छिड़काव का सर्वोत्तम समय",
  "rainfastPeriod": "बारिश से बचाव अवधि (जैसे 2 घंटे)",
  "storage": "भंडारण निर्देश",
  "dosageLiquid": {
    "perLiter": "...",
    "per15L": "...",
    "per16L": "...",
    "per20L": "...",
    "per25L": "...",
    "per200L": "...",
    "per500L": "...",
    "perBigha": "..."
  },
  "dosagePowder": {
    "perLiter": "...",
    "per15L": "...",
    "per16L": "...",
    "per20L": "...",
    "per25L": "...",
    "per200L": "...",
    "per500L": "...",
    "perBigha": "..."
  },
  "dosageFertilizer": {
    "perPlant": "...",
    "perPot": "...",
    "perBigha": "...",
    "perIrrigation": "...",
    "perSpray": "...",
    "perDrenching": "...",
    "totalAmount": "..."
  },
  "cropSpecificDosage": [
    { "cropName": "सोयाबीन", "dosage": "...", "usage": "...", "sprayTime": "..." }
  ],
  "hasExactMatch": true
}`;

    const data = await executeWithGemini(userKey, async (ai) => {
      let response;
      let usedSearch = false;

      // 1. First attempt: Search Grounding without responseMimeType (so Google Search executes properly)
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        usedSearch = true;
      } catch (searchErr) {
        console.warn('[AI Routes] Search grounded product knowledge call failed, falling back to direct prompt:', searchErr);
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: searchPrompt,
        });
      }

      const text = response.text || '{}';
      let parsed: any = {};
      
      // Robust JSON extraction from markdown or raw text
      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } catch (innerErr) {
            console.warn('[AI Routes] JSON parse from regex match failed:', innerErr);
          }
        }
      }

      // Extract official citation links from Google Search grounding
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: Array<{ title: string; uri: string }> = [];
      if (chunks && Array.isArray(chunks)) {
        for (const chunk of chunks) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || 'अधिकृत कृषि स्रोत (Official Source)',
              uri: chunk.web.uri,
            });
          }
        }
      }

      // Smart formulation & dosage adjustment
      const formulation = String(parsed.formulation || '').toLowerCase();
      const category = String(parsed.category || '').toLowerCase();
      const isLiquid = formulation.includes('ec') || formulation.includes('sc') || formulation.includes('sl') || formulation.includes('fs') || formulation.includes('cs') || formulation.includes('liquid') || formulation.includes('तरल');
      const isPowder = formulation.includes('wp') || formulation.includes('wdg') || formulation.includes('sp') || formulation.includes('sg') || formulation.includes('gr') || formulation.includes('powder') || formulation.includes('पाउडर') || formulation.includes('दानेदार');
      const isFertilizer = category.includes('fertilizer') || category.includes('खाद') || category.includes('उर्वरक') || parsed.productName?.includes('19:19:19') || parsed.productName?.includes('0:0:50') || parsed.productName?.includes('DAP') || parsed.productName?.includes('Urea');

      const cleanDosageLiquid = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosageLiquid, ...(parsed.dosageLiquid || {}) };
      const cleanDosagePowder = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosagePowder, ...(parsed.dosagePowder || {}) };
      const cleanDosageFertilizer = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosageFertilizer, ...(parsed.dosageFertilizer || {}) };

      if (isLiquid && !isPowder) {
        Object.keys(cleanDosagePowder).forEach((k) => {
          if (!parsed.dosagePowder?.[k] || cleanDosagePowder[k as keyof typeof cleanDosagePowder] === '1-2 gm') {
            (cleanDosagePowder as any)[k] = 'लागू नहीं (तरल उत्पाद)';
          }
        });
        if (!isFertilizer) {
          Object.keys(cleanDosageFertilizer).forEach((k) => {
            (cleanDosageFertilizer as any)[k] = 'लागू नहीं (कीटनाशक/फफूंदनाशक दवा)';
          });
        }
      } else if (isPowder && !isLiquid) {
        Object.keys(cleanDosageLiquid).forEach((k) => {
          if (!parsed.dosageLiquid?.[k] || cleanDosageLiquid[k as keyof typeof cleanDosageLiquid] === '1-2 ml') {
            (cleanDosageLiquid as any)[k] = 'लागू नहीं (पाउडर/दानेदार उत्पाद)';
          }
        });
        if (!isFertilizer) {
          Object.keys(cleanDosageFertilizer).forEach((k) => {
            (cleanDosageFertilizer as any)[k] = 'लागू नहीं (दवा उत्पाद)';
          });
        }
      }

      return {
        ...DEFAULT_PRODUCT_KNOWLEDGE,
        ...parsed,
        dosageLiquid: cleanDosageLiquid,
        dosagePowder: cleanDosagePowder,
        dosageFertilizer: cleanDosageFertilizer,
        sources: sources.length > 0 ? sources : (parsed.sources || []),
        hasExactMatch: parsed.hasExactMatch ?? true,
      };
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[AI Routes] handleProductKnowledge error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'उत्पाद जानकारी प्राप्त करने में त्रुटि हुई।',
    });
  }
};

// =========================================================================
// 6. Analyze Product Image (Bottle / Label OCR)
// =========================================================================
export const handleAnalyzeProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      res.status(400).json({ success: false, error: 'कृपया उत्पाद के लेबल की फोटो अपलोड करें।' });
      return;
    }

    const userKey = extractUserApiKey(req);
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `इस कृषि उत्पाद (दवाई की बोतल, पैकेट, खाद या बीज का थैला) के लेबल की फोटो का विश्लेषण करें।
उत्पाद का नाम, कंपनी, टेक्निकल नाम, डोज़, और उपयोग विधि पहचानकर निम्नलिखित JSON प्रारूप में पूरा विवरण दें:
{
  "productName": "पहचाना गया ब्रांड नाम",
  "companyName": "कंपनी का नाम",
  "technicalName": "सक्रिय घटक (Technical Name)",
  "category": "Insecticide / Fungicide / Herbicide / Fertilizer / PGR",
  "formulation": "EC, SC, WDG, etc.",
  "activeIngredient": "Technical with percentage",
  "targetCrops": "उपयुक्त फसलें",
  "targetPests": "लक्षित कीट या रोग",
  "usage": "उपयोग विधि",
  "benefits": "फायदे",
  "features": "विशेषताएं",
  "safetyInstructions": "सावधानियां",
  "mixingOrder": "दवा मिलाने का क्रम",
  "sprayTiming": "स्प्रे का समय",
  "dosageLiquid": {
    "perLiter": "...",
    "per15L": "...",
    "per16L": "...",
    "per20L": "...",
    "per25L": "...",
    "per200L": "...",
    "per500L": "...",
    "perBigha": "..."
  },
  "dosagePowder": {
    "perLiter": "...",
    "per15L": "...",
    "per16L": "...",
    "per20L": "...",
    "per25L": "...",
    "per200L": "...",
    "per500L": "...",
    "perBigha": "..."
  },
  "hasExactMatch": true
}`;

    const data = await executeWithGemini(userKey, async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '{}';
      let parsed: any = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      }

      const cleanDosageLiquid = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosageLiquid, ...(parsed.dosageLiquid || {}) };
      const cleanDosagePowder = { ...DEFAULT_PRODUCT_KNOWLEDGE.dosagePowder, ...(parsed.dosagePowder || {}) };

      const formulation = String(parsed.formulation || '').toLowerCase();
      const isLiquid = formulation.includes('ec') || formulation.includes('sc') || formulation.includes('sl') || formulation.includes('fs') || formulation.includes('liquid');
      const isPowder = formulation.includes('wp') || formulation.includes('wdg') || formulation.includes('sp') || formulation.includes('sg') || formulation.includes('gr') || formulation.includes('powder');

      if (isLiquid && !isPowder) {
        Object.keys(cleanDosagePowder).forEach(k => {
          (cleanDosagePowder as any)[k] = 'लागू नहीं (तरल उत्पाद)';
        });
      } else if (isPowder && !isLiquid) {
        Object.keys(cleanDosageLiquid).forEach(k => {
          (cleanDosageLiquid as any)[k] = 'लागू नहीं (पाउडर/दानेदार उत्पाद)';
        });
      }

      return {
        ...DEFAULT_PRODUCT_KNOWLEDGE,
        ...parsed,
        dosageLiquid: cleanDosageLiquid,
        dosagePowder: cleanDosagePowder,
        hasExactMatch: Boolean(parsed.productName && !parsed.productName.includes("पहचान नहीं")),
      };
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[AI Routes] handleAnalyzeProductImage error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'फोटो से उत्पाद पहचानने में त्रुटि हुई।',
    });
  }
};

// =========================================================================
// 7. Agriculture News (Agri News with Search Grounding)
// =========================================================================
export const handleAgriNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const userKey = extractUserApiKey(req);
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const prompt = `आज की तारीख (${dateStr}) के अनुसार मध्यप्रदेश (विशेष रूप से मंदसौर, नीमच, मालवा) और भारत की ताजा कृषि खबरें प्रदान करें।
फसल के भाव, सरकारी योजनाएं, मौसम अलर्ट और खेती के नवाचार की 4 से 6 महत्वपूर्ण खबरें दें।

Return a pure JSON array of news items with this exact structure:
[
  {
    "title": "शीर्षक (हिन्दी)",
    "summary": "2-3 वाक्यों का संक्षिप्त समाचार (हिन्दी)",
    "date": "${dateStr}",
    "source": "स्रोत (जैसे कृषि जागरण, पत्रिका, भास्कर, डीडी किसान)",
    "url": "https://example.com/news",
    "category": "MP | India | Scheme | Weather | Crop | Market"
  }
]`;

    const items = await executeWithGemini(userKey, async (ai) => {
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }],
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      }

      const text = response.text || '[]';
      try {
        return JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      }
    });

    res.json({ success: true, items });
  } catch (error: any) {
    console.error('[AI Routes] handleAgriNews error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'समाचार लोड करने में त्रुटि हुई।',
    });
  }
};

// =========================================================================
// 8. Mandi Bhav
// =========================================================================
export const handleMandiBhav = async (req: Request, res: Response): Promise<void> => {
  try {
    const { state = 'Madhya Pradesh', district = 'Mandsaur', mandi = 'Shamgarh' } = req.body;
    const userKey = extractUserApiKey(req);
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const prompt = `तारीख: ${dateStr}
स्थान: ${mandi} मंडी, जिला ${district}, राज्य ${state}
इस मंडी में आज या कल के प्रमुख फसलों (सोयाबीन, गेहूं, लहसुन, प्याज, चना, सरसों, मेथी, अलसी) के ताजा भाव और आवक की जानकारी प्रदान करें।

Return a pure JSON object:
{
  "mandiName": "${mandi}",
  "district": "${district}",
  "state": "${state}",
  "date": "${dateStr}",
  "items": [
    {
      "commodity": "फसल का नाम (e.g. सोयाबीन / Soybean)",
      "variety": "किस्म (e.g. पीला / लोकवान)",
      "minPrice": 3800,
      "maxPrice": 4750,
      "modalPrice": 4500,
      "unit": "₹/क्विंटल",
      "trend": "up | down | stable"
    }
  ]
}`;

    const data = await executeWithGemini(userKey, async (ai) => {
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }],
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      }

      const text = response.text || '{}';
      try {
        return JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      }
    });

    // Normalize output so frontend gets guaranteed fields
    const normalizedData = {
      mandiName: data?.mandiName || mandi,
      district: data?.district || district,
      state: data?.state || state,
      date: data?.date || dateStr,
      items: Array.isArray(data?.items) && data.items.length > 0 ? data.items.map((it: any) => {
        const modal = it.modalPrice || it.avgPrice || it.maxPrice || 3500;
        const minP = it.minPrice || Math.round(Number(modal) * 0.9);
        const maxP = it.maxPrice || Math.round(Number(modal) * 1.1);
        return {
          commodity: String(it.commodity || 'फसल'),
          variety: String(it.variety || 'सामान्य'),
          minPrice: String(minP),
          maxPrice: String(maxP),
          avgPrice: String(modal),
          modalPrice: String(modal),
          unit: String(it.unit || '₹/क्विंटल'),
          trend: it.trend || 'stable',
          arrival: it.arrival || 'मध्यम आवक',
          quality: it.quality || it.variety || 'बढ़िया (FAQ)',
          lastUpdated: dateStr,
        };
      }) : []
    };

    res.json({ success: true, data: normalizedData });
  } catch (error: any) {
    console.error('[AI Routes] handleMandiBhav error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'मंडी भाव प्राप्त करने में त्रुटि हुई।',
    });
  }
};

// =========================================================================
// 9. Government Schemes
// =========================================================================
export const handleSchemes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category = 'All' } = req.body;
    const userKey = extractUserApiKey(req);

    const prompt = `मध्यप्रदेश और भारत सरकार की प्रमुख कृषि योजनाएं (जैसे PM-Kisan, PMFBY, तारबंदी अनुदान, ड्रिप सिंचाई अनुदान, सोलर पंप योजना, कृषि यंत्र अनुदान)।
Category: ${category}

Return a pure JSON array of schemes:
[
  {
    "title": "योजना का नाम",
    "description": "संक्षिप्त विवरण",
    "objective": "उद्देश्य",
    "benefits": ["लाभ 1", "लाभ 2"],
    "subsidyDetails": "सब्सिडी की जानकारी (जैसे 50% तक अनुदान)",
    "sector": "कृषि / सिंचाई / उपकरण",
    "governmentLevel": "State | Central",
    "eligibility": "पात्रता",
    "requiredDocuments": ["दस्तावेज 1", "दस्तावेज 2"],
    "howToApply": "आवेदन प्रक्रिया (पोर्टल या प्रक्रिया)",
    "link": "https://mpkrishi.mp.gov.in"
  }
]`;

    const schemes = await executeWithGemini(userKey, async (ai) => {
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }],
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      }

      const text = response.text || '[]';
      try {
        return JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      }
    });

    res.json({ success: true, schemes });
  } catch (error: any) {
    console.error('[AI Routes] handleSchemes error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'योजनाएं लोड करने में त्रुटि हुई।',
    });
  }
};

// =========================================================================
// 10. Live API Config / Ephemeral Key for Voice Calling
// =========================================================================
export const handleLiveConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      hasServerKey: false,
      apiKey: '',
      message: 'AI कॉल के लिए व्यक्तिगत यूज़र API Key आवश्यक है।',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Live config error' });
  }
};

// =========================================================================
// 11. Test API Key endpoint
// =========================================================================
export const handleTestKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey } = req.body;
    const testKey = apiKey && typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : undefined;

    if (!testKey) {
      res.status(400).json({ success: false, valid: false, message: 'कृपया टेस्ट करने के लिए अपनी Gemini API Key दर्ज करें।' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: testKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const result = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Ping test. Reply with OK.',
    });

    res.json({
      success: true,
      valid: true,
      message: 'आपकी API Key सफलतापूर्वक सत्यापित हो गई!',
      sample: result.text?.trim() || 'OK',
    });
  } catch (error: any) {
    console.error('[AI Routes] handleTestKey error:', error);
    res.status(400).json({
      success: false,
      valid: false,
      message: error?.message?.includes('API_KEY_INVALID') || error?.status === 400 || error?.status === 403
        ? 'अमान्य API Key। कृपया Google AI Studio से सही Key कॉपी करके पेस्ट करें।'
        : `API Key सत्यापन विफल: ${error?.message || 'अज्ञात त्रुटि'}`,
    });
  }
};
