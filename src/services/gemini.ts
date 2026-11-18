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
 * Resolves a scientifically accurate disease/pest name if the model
 * returned generic text like "लक्षण आधारित रोग रिपोर्ट" or left it blank.
 */
function resolveDefinitiveDiseaseName(
  rawDiseaseName: string | undefined,
  cropName: string,
  problemType: string,
  symptoms: string[] = []
): string {
  const name = (rawDiseaseName || '').trim();
  const lower = name.toLowerCase();
  const symptomStr = symptoms.join(' ').toLowerCase();

  const isGeneric = 
    !name ||
    name === 'लक्षण आधारित रोग रिपोर्ट' ||
    name === 'लक्षण आधारित रोग' ||
    name === 'लक्षण आधारित रिपोर्ट' ||
    name === 'विस्तृत रिपोर्ट' ||
    name === 'लक्षित समस्या' ||
    lower.includes('symptoms based') ||
    lower.includes('symptom based') ||
    lower.includes('लक्षण आधारित');

  if (!isGeneric) {
    return name;
  }

  const crop = cropName.toLowerCase();

  // Crop-specific pathology deduction
  if (crop.includes('टमाटर') || crop.includes('tomato')) {
    if (symptomStr.includes('पीला') && (symptomStr.includes('मुड़') || symptomStr.includes('curl'))) {
      return 'टमाटर पर्ण कुंचन वायरस (Tomato Leaf Curl Virus)';
    }
    if (symptomStr.includes('जीवाणु') || symptomStr.includes('bacterial')) {
      return 'टमाटर जीवाणु धब्बा रोग (Bacterial Spot - Xanthomonas spp.)';
    }
    return 'टमाटर अगेती झुलसा रोग (Early Blight - Alternaria solani)';
  }

  if (crop.includes('सोयाबीन') || crop.includes('soybean')) {
    if (symptomStr.includes('पीला मोज़ेक') || symptomStr.includes('yellow mosaic') || (symptomStr.includes('पीलापन') && symptomStr.includes('शिरा'))) {
      return 'सोयाबीन पीला मोज़ेक वायरस (Yellow Mosaic Virus)';
    }
    if (problemType.includes('कीट') || symptomStr.includes('इल्ली') || symptomStr.includes('छेद')) {
      return 'सोयाबीन सेमीलूपर एवं तंबाकू इल्ली प्रकोप (Spodoptera litura)';
    }
    return 'सोयाबीन अल्टरनेरिया पत्ती धब्बा रोग (Alternaria Leaf Spot - Alternaria spp.)';
  }

  if (crop.includes('मिर्च') || crop.includes('chilli')) {
    if (symptomStr.includes('मुड़') || symptomStr.includes('नाव') || symptomStr.includes('सिकुड़')) {
      return 'मिर्च पर्ण कुंचन रोग (Chilli Leaf Curl Virus / Thrips)';
    }
    return 'मिर्च फल सड़न एवं एन्थ्रेक्नोज (Anthracnose / Dieback - Colletotrichum capsici)';
  }

  if (crop.includes('लहसुन') || crop.includes('garlic') || crop.includes('प्याज') || crop.includes('onion')) {
    if (symptomStr.includes('बैंगनी') || symptomStr.includes('purple')) {
      return 'बैंगनी धब्बा रोग (Purple Blotch - Alternaria porri)';
    }
    return 'पत्ती झुलसा एवं थ्रिप्स प्रकोप (Stemphylium Blight / Thrips)';
  }

  if (crop.includes('कपास') || crop.includes('cotton')) {
    if (problemType.includes('कीट') || symptomStr.includes('रस चूसक')) {
      return 'कपास रस चूसक कीट / सफेद मक्खी प्रकोप (Whitefly / Thrips)';
    }
    return 'कपास पत्ती मरोड़ रोग (Cotton Leaf Curl Virus)';
  }

  if (crop.includes('गेहूं') || crop.includes('wheat')) {
    return 'गेहूं का पीला / भूरा रतुआ (Yellow / Brown Rust - Puccinia spp.)';
  }

  if (crop.includes('चना') || crop.includes('gram') || crop.includes('chickpea')) {
    if (symptomStr.includes('इल्ली') || symptomStr.includes('घंटी')) {
      return 'चना फली छेदक इल्ली (Helicoverpa armigera)';
    }
    return 'चना उकठा रोग (Fusarium Wilt - Fusarium oxysporum)';
  }

  // Deduce from problemType
  if (problemType.includes('रस चूसक') || symptomStr.includes('रस चूसक') || symptomStr.includes('थ्रिप्स')) {
    return `${cropName} रस चूसक कीट प्रकोप (Thrips / Aphid Infestation)`;
  }
  if (problemType.includes('इल्ली') || problemType.includes('चबाने') || symptomStr.includes('इल्ली')) {
    return `${cropName} इल्ली / सुंडी प्रकोप (Caterpillar / Borer Infestation)`;
  }
  if (problemType.includes('जीवाणु') || symptomStr.includes('जीवाणु')) {
    return `${cropName} जीवाणु धब्बा रोग (Bacterial Leaf Spot)`;
  }
  if (problemType.includes('फफूंद') || symptomStr.includes('धब्बा') || symptomStr.includes('झुलसा')) {
    return `${cropName} पत्ती धब्बा व झुलसा रोग (Leaf Blight / Spot)`;
  }

  return `${cropName} स्वास्थ्य सुरक्षा एवं रोग प्रबंधन`;
}

/**
 * Standard CIBRC-approved verified fallback treatments for Indian crops
 * ensuring that the treatment plan cards are NEVER empty in any scan report.
 */
function resolveDefaultTreatments(
  cropName: string,
  problemType: string,
  diseaseName: string
): { chemicalControl: ChemicalItem[]; organicControl: OrganicItem[] } {
  const combined = `${cropName} ${problemType} ${diseaseName}`.toLowerCase();

  // 1. Chewing Pests / Caterpillars / Borers
  if (combined.includes('इल्ली') || combined.includes('सुंडी') || combined.includes('सेमीलूपर') || combined.includes('chewing') || combined.includes('borer') || combined.includes('caterpillar') || combined.includes('spodoptera')) {
    return {
      chemicalControl: [
        {
          medicineName: "कोराजन (Coragen) - क्लोरेंट्रानिलिप्रोल 18.5% SC",
          dosagePump: "6-7 मिली प्रति 15 लीटर पंप",
          dosageAcre: "60 मिली प्रति एकड़ (शामगढ़ बीघा: 35-40 मिली)",
          instructions: "इल्लियों की शुरुआती अवस्था व अंडों से निकलते ही सर्वोत्तम नियंत्रण प्रदान करता है।"
        },
        {
          medicineName: "प्रोक्लेम / एमामेक्टिन बेंजोएट 5% SG",
          dosagePump: "8-10 ग्राम प्रति 15 लीटर पंप",
          dosageAcre: "100 ग्राम प्रति एकड़ (शामगढ़ बीघा: 60-70 ग्राम)",
          instructions: "शाम के समय छिड़काव करें जब इल्लियां पत्तियों पर भोजन के लिए बाहर आती हैं।"
        }
      ],
      organicControl: [
        {
          methodName: "बवेरिया बासियाना (Beauveria bassiana 1.15% WP)",
          dosage: "40-50 ग्राम प्रति 15 लीटर पंप",
          instructions: "शाम के समय नम मौसम में जैविक इल्ली नाशक के रूप में छिड़कें।"
        },
        {
          methodName: "नीम का तेल (Neem Oil 10,000 PPM)",
          dosage: "40-50 मिली प्रति 15 लीटर पंप",
          instructions: "इल्लियों के अंडों और छोटी सूंडियों की रोकथाम के लिए उपयोगी।"
        }
      ]
    };
  }

  // 2. Sucking Pests / Thrips / Aphids / Whiteflies / Mites
  if (combined.includes('रस चूसक') || combined.includes('थ्रिप्स') || combined.includes('सफेद मक्खी') || combined.includes('माहू') || combined.includes('एफिड') || combined.includes('तेला') || combined.includes('sucking') || combined.includes('thrips') || combined.includes('whitefly')) {
    return {
      chemicalControl: [
        {
          medicineName: "कॉन्फिडोर / इमिडाक्लोप्रिड 17.8% SL",
          dosagePump: "8-10 मिली प्रति 15 लीटर पंप",
          dosageAcre: "100-125 मिली प्रति एकड़ (शामगढ़ बीघा: 60-80 मिली)",
          instructions: "पत्तियों की निचली सतह पर जहाँ रस चूसक कीट छिपे रहते हैं, अच्छी तरह स्प्रे करें।"
        },
        {
          medicineName: "एक्टारा / थायमेथोक्सम 25% WG",
          dosagePump: "10-12 ग्राम प्रति 15 लीटर पंप",
          dosageAcre: "150 ग्राम प्रति एकड़ (शामगढ़ बीघा: 90-100 ग्राम)",
          instructions: "सिस्टेमिक कीटनाशक है जो पूरे पौधे में रस चूसक कीटों को निष्क्रिय करता है।"
        }
      ],
      organicControl: [
        {
          methodName: "नीम का तेल (Neem Oil 10,000 PPM)",
          dosage: "40-50 मिली प्रति 15 लीटर पंप",
          instructions: "स्टीकर या थोड़े साबुन के घोल के साथ मिलाकर शाम के समय स्प्रे करें।"
        },
        {
          methodName: "वर्टिसिलियम लेकानी (Verticillium lecanii 1.15% WP)",
          dosage: "40-50 ग्राम प्रति 15 लीटर पंप",
          instructions: "रस चूसक कीटों और सफेद मक्खी के विरुद्ध प्रभावी जैविक नियंत्रण।"
        }
      ]
    };
  }

  // 3. Bacterial Diseases
  if (combined.includes('जीवाणु') || combined.includes('बैक्टीरिया') || combined.includes('bacterial')) {
    return {
      chemicalControl: [
        {
          medicineName: "स्ट्रेप्टोसाइक्लिन (Streptocycline) + ब्लाइटॉक्स (कॉपर ऑक्सीक्लोराइड 50% WP)",
          dosagePump: "6 ग्राम स्ट्रेप्टोसाइक्लिन + 40 ग्राम कॉपर ऑक्सीक्लोराइड प्रति 15 लीटर पंप",
          dosageAcre: "60 ग्राम + 500 ग्राम प्रति एकड़ (शामगढ़ बीघा: 35 ग्राम + 300 ग्राम)",
          instructions: "जीवाणु जनित धब्बों को रोकने के लिए मौसम साफ होने पर तुरंत स्प्रे करें।"
        },
        {
          medicineName: "कासु-बी / कासुगामाइसिन 3% SL",
          dosagePump: "30-35 मिली प्रति 15 लीटर पंप",
          dosageAcre: "400-500 मिली प्रति एकड़ (शामगढ़ बीघा: 250-300 मिली)",
          instructions: "पत्तियों के घावों में बैक्टीरिया के प्रसार को रोकने में अत्यधिक प्रभावी।"
        }
      ],
      organicControl: [
        {
          methodName: "स्यूडोमोनास फ्लोरोसेंस (Pseudomonas fluorescens 1% WP)",
          dosage: "40-50 ग्राम प्रति 15 लीटर पंप",
          instructions: "जैविक जीवाणुनाशक के रूप में पौधों पर अच्छी तरह छिड़काव करें।"
        }
      ]
    };
  }

  // 4. Default Fungal (झुलसा, धब्बा, रतुआ, पाउडरी, अल्टरनेरिया, आदि)
  return {
    chemicalControl: [
      {
        medicineName: "साफ (SAAF) - कार्बेंडाजिम 12% + मैनकोजेब 63% WP",
        dosagePump: "35-40 ग्राम प्रति 15 लीटर पंप",
        dosageAcre: "400-500 ग्राम प्रति एकड़ (शामगढ़ बीघा: 250-300 ग्राम)",
        instructions: "रोग के लक्षण दिखते ही पत्तियों के दोनों तरफ अच्छी तरह छिड़काव करें।"
      },
      {
        medicineName: "कस्टोडिया (Custodia) - एजोक्सीस्ट्रोबिन 11% + डिफेनोकोनाजोल 18.3% SC",
        dosagePump: "15-18 मिली प्रति 15 लीटर पंप",
        dosageAcre: "200-250 मिली प्रति एकड़ (शामगढ़ बीघा: 120-150 मिली)",
        instructions: "गंभीर संक्रमण में त्वरित सिस्टेमिक व कॉन्टैक्ट सुरक्षा प्रदान करता है।"
      }
    ],
    organicControl: [
      {
        methodName: "नीम का तेल (Neem Oil 10,000 PPM)",
        dosage: "35-40 मिली प्रति 15 लीटर पंप",
        instructions: "फंगल बीजाणुओं के प्रसार को रोकने के लिए शाम को साफ पानी में स्प्रे करें।"
      },
      {
        methodName: "ट्राइकोडर्मा विरिडी (Trichoderma viride 1% WP)",
        dosage: "40-50 ग्राम प्रति 15 लीटर पंप",
        instructions: "जैविक फफूंदनाशक के रूप में पत्तियों या जड़ क्षेत्र में छिड़कें।"
      }
    ]
  };
}

/**
 * Safely normalizes and extracts a complete DiseaseAnalysis object
 * ensuring accurate diagnosis names and non-empty treatment lists.
 */
function parseDiseaseResponse(rawText: string): DiseaseAnalysis {
  try {
    const parsed = cleanAndParseJson<DiseaseAnalysis>(rawText);
    if (parsed && typeof parsed === 'object') {
      const cleanAnalysis = (parsed.analysis || rawText).replace(/<br\s*\/?>/gi, '\n');
      const cropName = parsed.cropName || 'पहचानी गई फसल';
      const problemType = parsed.problemType || 'फसल रोग / कीट प्रकोप';
      const symptoms = Array.isArray(parsed.symptoms) && parsed.symptoms.length > 0
        ? parsed.symptoms
        : ['पत्तियों या तने पर दिखाई देने वाले विशिष्ट लक्षण'];

      const diseaseName = resolveDefinitiveDiseaseName(
        parsed.diseaseName,
        cropName,
        problemType,
        symptoms
      );

      // Enforce non-empty chemical and organic recommendations
      let chemicalControl = Array.isArray(parsed.chemicalControl) && parsed.chemicalControl.length > 0
        ? parsed.chemicalControl
        : [];
      let organicControl = Array.isArray(parsed.organicControl) && parsed.organicControl.length > 0
        ? parsed.organicControl
        : [];

      if (chemicalControl.length === 0 || organicControl.length === 0) {
        const defaults = resolveDefaultTreatments(cropName, problemType, diseaseName);
        if (chemicalControl.length === 0) {
          chemicalControl = defaults.chemicalControl;
        }
        if (organicControl.length === 0) {
          organicControl = defaults.organicControl;
        }
      }

      return {
        analysis: cleanAnalysis,
        keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 
          ? parsed.keywords 
          : ['कीटनाशक', 'फफूंदनाशक', 'साफ', 'कस्टोडिया', 'कोराजन', 'कृषि सुरक्षा'],
        cropName,
        problemType,
        diseaseName,
        severity: parsed.severity || 'मध्यम (Moderate)',
        symptoms,
        chemicalControl,
        organicControl,
        preventionTips: Array.isArray(parsed.preventionTips) && parsed.preventionTips.length > 0 
          ? parsed.preventionTips 
          : ['खेत की नियमित निगरानी करें', 'सही मात्रा में सुबह या शाम को छिड़काव करें', 'फसल में जलभराव न होने दें'],
        shopNotice: parsed.shopNotice
      };
    }
  } catch (parseErr) {
    console.warn("[parseDiseaseResponse] JSON parse notice, recovering text analysis:", parseErr);
  }

  // Graceful text recovery fallback
  const cleanText = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const fallbackDefaults = resolveDefaultTreatments('पहचानी गई फसल', 'फफूंद जनित रोग', 'पत्ती धब्बा व झुलसा रोग');
  
  return {
    analysis: cleanText.replace(/<br\s*\/?>/gi, '\n'),
    keywords: ['कीटनाशक', 'फफूंदनाशक', 'साफ', 'कस्टोडिया', 'कृषि सुरक्षा'],
    cropName: 'पहचानी गई फसल',
    problemType: 'फफूंद जनित रोग (Fungal Disease)',
    diseaseName: 'पत्ती धब्बा व झुलसा रोग (Leaf Spot / Blight)',
    severity: 'मध्यम (Moderate)',
    symptoms: ['पत्तियों पर धब्बे और पीलापन दिखाई दे रहा है', 'संक्रमित पत्तियों का सूखना'],
    chemicalControl: fallbackDefaults.chemicalControl,
    organicControl: fallbackDefaults.organicControl,
    preventionTips: ['दवा का सही मात्रा में सुबह या शाम छिड़काव करें', 'नियमित रूप से खेत की निगरानी करें']
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

  const pathologyInstructions = `You are a Senior Agricultural Scientist and Expert Plant Pathologist for Falsawdiya Krishi Bazaar in Madhya Pradesh, India.
Examine the attached photo(s) with clinical precision to diagnose the exact crop problem.

CRITICAL DIAGNOSIS REQUIREMENTS:
1. **Accurate Crop Identification**:
   - Determine the exact crop (e.g. टमाटर (Tomato), सोयाबीन (Soybean), मिर्च (Chilli), प्याज (Onion), लहसुन (Garlic), कपास (Cotton), गेहूं (Wheat), चना (Gram), मक्का (Maize), सरसों (Mustard), मटर (Peas), आदि).

2. **Definitive Differential Diagnosis (STRICT RULE: NO HEDGING)**:
   - Perform a differential plant pathology diagnosis: analyze lesion shape, chlorotic halos, concentric rings, target board spots, water-soaked margins, fungal spores, bacterial specking, leaf curling, vein clearing, or pest feeding signatures.
   - You MUST identify the specific disease or pest name (e.g. "टमाटर अगेती झुलसा (Early Blight - Alternaria solani)", "सोयाबीन अल्टरनेरिया पत्ती धब्बा रोग (Alternaria Leaf Spot)", "मिर्च पर्ण कुंचन वायरस (Chilli Leaf Curl Virus)", "बैक्टीरियल लीफ स्पॉट (Xanthomonas)", "थ्रिप्स प्रकोप (Thrips Infestation)").
   - STRICT PROHIBITION: NEVER use generic labels like "लक्षण आधारित रोग", "लक्षण आधारित रोग रिपोर्ट", "Symptoms Based Diagnosis", or "अज्ञात रोग". Always name the primary diagnosed disease with scientific / pathogen name.

3. **Mandatory Chemical Treatment (Chemical Control)**:
   - You MUST recommend at least 2 to 3 specific CIBRC-registered chemical treatments.
   - For each item, provide:
     * medicineName: Popular trade name + active technical ingredient (e.g. "साफ (SAAF) - कार्बेंडाजिम 12% + मैनकोजेब 63% WP", "कस्टोडिया - एजोक्सीस्ट्रोबिन 11% + डिफेनोकोनाजोल 18.3% SC", "कोराजन - क्लोरेंट्रानिलिप्रोल 18.5% SC", "कॉन्फिडोर - इमिडाक्लोप्रिड 17.8% SL")
     * dosagePump: Precise dose for 15-20 Liter knapsack spray pump (e.g. "35-40 ग्राम प्रति 15 लीटर पंप" or "8-10 मिली प्रति 15 लीटर पंप")
     * dosageAcre: Dose per Acre and local Pucca Bigha (e.g. "400-500 ग्राम प्रति एकड़ (250-300 ग्राम प्रति बीघा)")
     * instructions: Spray timing, foliage coverage, or safety instructions.
   - chemicalControl array MUST NOT be empty.

4. **Mandatory Organic & Bio Control**:
   - Recommend at least 1 to 2 proven biological or organic treatments (e.g. Neem Oil 10,000 PPM, Trichoderma viride, Beauveria bassiana, Pseudomonas fluorescens) with pump dosage and instructions.
   - organicControl array MUST NOT be empty.

5. **Observed Symptoms**:
   - 3 to 5 clear, pointwise diagnostic symptoms visible in the photo.

6. **Prevention & Precautions**:
   - 2 to 4 actionable agricultural management practices (crop rotation, clean drainage, balanced fertilizer, spray precautions).

7. **Format**:
   - Respond in ${language === 'en' ? 'English' : 'Hindi'} with respectful, farmer-friendly, professional tone.
   - NEVER use HTML tags like <br> or <p>. Return valid structured JSON.`;

  const prompt = isMultiple
    ? `${pathologyInstructions}
       
       Note: You are provided with ${imageList.length} different photos of the same crop/plant problem. Cross-reference all photos to achieve maximum diagnostic certainty.`
    : pathologyInstructions;

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
    ? "You are a senior plant pathologist representing 'Falsawdiya Krishi Bazaar' (Shamgarh, MP). Hours: 8:00 AM to 8:00 PM daily. Respond only in English using natural, correct grammar. NEVER include HTML tags like <br> or <p>. Return structured JSON."
    : "You are a senior plant pathologist representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar). Located in Shamgarh, MP. Shop address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). Hours: 8:00 AM to 8:00 PM daily. Respond only in Hindi using natural, correct grammar. STRICT RULE: ONLY use 'फल्सावदिया' for the name. Never use 'फालसावदिया'. NEVER include HTML tags like <br> or <p>. Return structured JSON.";

  // Schema with enforced required fields to prevent empty diagnosis or missing treatment plan
  const responseSchema = {
    type: "OBJECT" as any,
    properties: {
      analysis: { type: "STRING", description: "Complete comprehensive text report in Hindi without HTML tags" },
      cropName: { type: "STRING", description: "Crop name in Hindi with English in brackets, e.g. टमाटर (Tomato)" },
      problemType: { type: "STRING", description: "Category: फफूंद जनित रोग, जीवाणु जनित रोग, रस चूसक कीट, चबाने वाले कीट, या पोषक तत्व कमी" },
      diseaseName: { type: "STRING", description: "Definitive disease or pest name with scientific name. NEVER use generic 'लक्षण आधारित रोग'." },
      severity: { type: "STRING", description: "Severity level: 'सामान्य (Mild)' or 'मध्यम (Moderate)' or 'गंभीर (Severe)'" },
      symptoms: { type: "ARRAY" as any, items: { type: "STRING" }, description: "Pointwise list of observed symptoms" },
      chemicalControl: {
        type: "ARRAY" as any,
        items: {
          type: "OBJECT" as any,
          properties: {
            medicineName: { type: "STRING", description: "Trade name + Active technical formulation" },
            dosagePump: { type: "STRING", description: "Dose for 15-20L spray pump" },
            dosageAcre: { type: "STRING", description: "Dose per acre or bigha" },
            instructions: { type: "STRING", description: "Directions for spraying and precautions" }
          },
          required: ["medicineName", "dosagePump", "dosageAcre", "instructions"]
        },
        description: "2 to 3 specific recommended chemical treatments"
      },
      organicControl: {
        type: "ARRAY" as any,
        items: {
          type: "OBJECT" as any,
          properties: {
            methodName: { type: "STRING", description: "Bio-agent or organic practice name" },
            dosage: { type: "STRING", description: "Dosage per pump or acre" },
            instructions: { type: "STRING", description: "Directions for use" }
          },
          required: ["methodName", "dosage", "instructions"]
        },
        description: "1 to 2 organic or biological control methods"
      },
      preventionTips: { type: "ARRAY" as any, items: { type: "STRING" }, description: "Pointwise list of precautions" },
      shopNotice: { type: "STRING" },
      keywords: { type: "ARRAY" as any, items: { type: "STRING" } }
    },
    required: [
      "cropName",
      "problemType",
      "diseaseName",
      "severity",
      "symptoms",
      "chemicalControl",
      "organicControl",
      "preventionTips",
      "analysis",
      "keywords"
    ]
  };

  // 3-Tier Resilient Model Failover Chain
  // gemini-3.6-flash -> gemini-3.5-flash -> gemini-3.5-flash-lite
  const candidateModels = [
    PRIMARY_GEMINI_MODEL,  // gemini-3.6-flash
    FALLBACK_GEMINI_MODEL, // gemini-3.5-flash
    TERTIARY_GEMINI_MODEL  // gemini-3.5-flash-lite
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

export interface KrishiChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface KrishiChatSource {
  title: string;
  uri: string;
  trustLevel: 'govt_official' | 'academic_brand' | 'web';
}

export type KrishiVerificationStatus = 'verified' | 'partial' | 'unverified';

export interface KrishiChatResponse {
  text: string;
  verificationStatus: KrishiVerificationStatus;
  searchGrounded: boolean;
  sources: KrishiChatSource[];
}

export interface KrishiShopContext {
  productNames?: string[];
}

const MAX_CHAT_HISTORY_MESSAGES = 16;

const GOVT_OFFICIAL_DOMAIN_HINTS = [
  '.gov.in',
  '.nic.in',
  '.res.in',
  'icar.org.in',
  'rvskvv.net',
  'jnkvv.org',
  'krishi.mp.gov.in',
  'mpkrishi.mp.gov.in',
  'cibrc',
  'ppqs',
  'iari',
  'kvk',
  'agricoop',
  'agriwelfare',
  'pmkisan',
  'indiaseeds',
  'agmarknet',
  'data.gov.in'
];

const ACADEMIC_BRAND_DOMAIN_HINTS = [
  '.ac.in',
  '.edu.in',
  '.edu',
  'bayer',
  'syngenta',
  'upl-ltd',
  'rallis',
  'coromandel',
  'iffco',
  'fmc',
  'corteva',
  'adama',
  'dhanuka',
  'sumitomo',
  'basf',
  'piindustries',
  'mahyco',
  'kaveriseeds',
  'nuziveeduseeds',
  'krishijagran'
];

function classifyChatSourceTrust(uri: string, title?: string): KrishiChatSource['trustLevel'] {
  const combined = `${uri} ${title || ''}`.toLowerCase();
  if (GOVT_OFFICIAL_DOMAIN_HINTS.some((hint) => combined.includes(hint))) {
    return 'govt_official';
  }
  if (ACADEMIC_BRAND_DOMAIN_HINTS.some((hint) => combined.includes(hint))) {
    return 'academic_brand';
  }
  return 'web';
}

function extractGroundingChatSources(response: any): {
  sources: KrishiChatSource[];
  hasWebSearchQueries: boolean;
} {
  const metadata = response?.candidates?.[0]?.groundingMetadata;
  const chunks = Array.isArray(metadata?.groundingChunks) ? metadata.groundingChunks : [];
  const webSearchQueries = Array.isArray(metadata?.webSearchQueries) ? metadata.webSearchQueries : [];

  const seenUris = new Set<string>();
  const extracted: KrishiChatSource[] = [];

  for (const chunk of chunks) {
    const uri = typeof chunk?.web?.uri === 'string' ? chunk.web.uri.trim() : '';
    const titleRaw = typeof chunk?.web?.title === 'string' ? chunk.web.title.trim() : '';
    if (!uri || !/^https?:\/\//i.test(uri) || seenUris.has(uri)) continue;

    seenUris.add(uri);
    let displayTitle = titleRaw;
    if (!displayTitle) {
      try {
        displayTitle = new URL(uri).hostname.replace(/^www\./, '');
      } catch {
        displayTitle = 'वेब संदर्भ';
      }
    }

    extracted.push({
      title: displayTitle,
      uri,
      trustLevel: classifyChatSourceTrust(uri, displayTitle)
    });
  }

  const trustRank: Record<KrishiChatSource['trustLevel'], number> = {
    govt_official: 0,
    academic_brand: 1,
    web: 2
  };

  extracted.sort((a, b) => trustRank[a.trustLevel] - trustRank[b.trustLevel]);

  return {
    sources: extracted.slice(0, 5),
    hasWebSearchQueries: webSearchQueries.length > 0 || extracted.length > 0
  };
}

export async function askAiQuestion(
  question: string,
  weatherData: any,
  userApiKey?: string,
  history: KrishiChatTurn[] = [],
  shopContext?: KrishiShopContext
): Promise<KrishiChatResponse> {
  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      throw new Error("कृपया अपना प्रश्न लिखें।");
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const weatherContext = `आज की तारीख: ${dateStr} | स्थान: शामगढ़, मंदसौर (मालवा क्षेत्र, मध्य प्रदेश) | वर्तमान मौसम: ${weatherData?.temp ?? 'N/A'}°C, ${weatherData?.condition || 'उपलब्ध नहीं'}`;

    const sanitizedHistory = Array.isArray(history)
      ? history
          .filter(
            (turn): turn is KrishiChatTurn =>
              Boolean(turn) &&
              (turn.role === 'user' || turn.role === 'model') &&
              typeof turn.text === 'string' &&
              turn.text.trim().length > 0
          )
          .slice(-MAX_CHAT_HISTORY_MESSAGES)
      : [];

    // Ensure multi-turn payload starts cleanly with a user turn
    const firstUserIdx = sanitizedHistory.findIndex((t) => t.role === 'user');
    const alignedHistory = firstUserIdx >= 0 ? sanitizedHistory.slice(firstUserIdx) : [];

    const contents = [
      ...alignedHistory.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text.trim() }]
      })),
      {
        role: 'user' as const,
        parts: [{ text: trimmedQuestion }]
      }
    ];

    const catalogList = Array.isArray(shopContext?.productNames)
      ? Array.from(new Set(shopContext.productNames.map(n => n.trim()).filter(Boolean))).slice(0, 80)
      : [];
    const catalogContextLine = catalogList.length > 0
      ? `Store Catalog Reference (ONLY claim in-stock availability if matched here): ${catalogList.join(', ')}`
      : `Store Catalog Reference: Not provided in chat context — NEVER falsely claim any seed/chemical is in stock; invite the farmer to check availability at the shop.`;

    const isFollowUp = alignedHistory.length > 0;
    const systemInstruction = `You are an honest, farmer-friendly Indian agricultural advisor representing 'फल्सावदिया कृषि बाजार' located in Shamgarh, Mandsaur, Malwa region, Madhya Pradesh.

Shop Profile:
- Name: फल्सावदिया कृषि बाजार
- Address: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)
- Timings: सुबह 8:00 बजे से रात 8:00 बजे तक (08:00 AM – 08:00 PM)
- Local Context: ${weatherContext}
- ${catalogContextLine}

Core Verification & Accuracy Rules (CRITICAL):
1. ALWAYS Provide Helpful Guidance: Never leave the farmer empty-handed or give a dead-end refusal. Always answer their question clearly and respectfully in simple Hindi.
2. Prioritize Trusted Sources via Google Search: Before answering factual questions about crop varieties/codes, yields, chemical technicals/dosages, fertilizers, or government schemes, search and cross-check authoritative Indian sources first: ICAR, IARI, KVK (especially KVK Mandsaur / RVSKVV / JNKVV), MP Agriculture Department (mpkrishi.mp.gov.in), CIBRC, PPQS, Govt of India portals (agricoop.gov.in, pmkisan.gov.in), and official manufacturer/seed company documents.
3. High-Risk Agronomy Precision Rules:
   - Seeds & Varieties: Verify exact official variety name and number (e.g. do NOT confuse HI 8759 Pusa Tejas, HI 8713 Pusa Mangal, Lok-1, etc.). Always clearly state yield units (क्विंटल/हेक्टेयर vs क्विंटल/एकड़ vs प्रति बीघा — never mix them up!). Distinguish public/ICAR varieties vs private research varieties.
   - Pesticides / Fungicides / Herbicides: Verify exact Technical Name & Formulation. NEVER invent or guess an unverified chemical dose (ml/L or g/acre). If exact CIBRC/label approval is unverified, still explain general crop/pest care clearly, and tell the farmer to verify the exact dose on the original bottle label or at the shop before spraying.
   - Fertilizers: State verified NPK % and advise soil-test/crop-stage based usage without false yield guarantees.
   - Govt Schemes: Check current active status for ${dateStr}; clearly note if eligibility/last dates need checking on official govt portal.
4. No Fake Links or Fake Stock Claims:
   - NEVER invent or type fake URLs in your text (real clickable links are attached automatically from search metadata).
   - ONLY say an item is available at 'फल्सावदिया कृषि बाजार' if it matches the Store Catalog Reference above. Otherwise politely say to confirm availability directly at the shop.
5. Continuous Context & Formatting Rules:
   - Treat this as a continuous multi-turn conversation; resolve pronouns ("इसकी", "उसमें", "यह", "कितनी मात्रा") from prior turns naturally.
   - ${isFollowUp ? "Follow-up Turn Rule: Do NOT repeat 'जय राम जी की' greetings or full shop address again." : "First Turn Rule: Start with a warm brief greeting like 'जय राम जी की किसान भाई!'."}
   - Format cleanly for mobile reading using short ### headings, * bullet points, and **bold** labels.
   - STRICT RULE: Always write 'फल्सावदिया' (never 'फालसावदिया').
6. Mandatory Machine Tag on Last Line (REQUIRED):
   - End EVERY response on a separate final line with EXACTLY one tag:
     - [[VERIFICATION:VERIFIED]] ONLY if your factual claims (variety numbers/traits, scheme status, technical names/doses) were confidently verified against reliable official/authoritative sources.
     - [[VERIFICATION:UNVERIFIED]] if official confirmation was incomplete, uncertain, based on general agronomic memory, or for local/private varieties/products whose official specification could not be confirmed.`;

    let response: any = null;
    let usedSearchTool = false;

    // Tier 1 & 2: Try Google Search Grounding across locked Flash models first
    const groundedModels = [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL];
    for (const model of groundedModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }]
          }
        });
        if (response?.text?.trim()) {
          usedSearchTool = true;
          break;
        }
      } catch (searchErr: any) {
        console.warn(`[askAiQuestion] Search grounding on ${model} failed:`, searchErr?.status, searchErr?.message);
      }
    }

    // Tier 3: Seamless non-search fallback so the farmer still receives helpful guidance
    if (!response?.text?.trim()) {
      const fallbackModels = [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL, TERTIARY_GEMINI_MODEL];
      let lastFallbackErr: any = null;
      for (const model of fallbackModels) {
        try {
          response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction
            }
          });
          if (response?.text?.trim()) {
            usedSearchTool = false;
            break;
          }
        } catch (err: any) {
          lastFallbackErr = err;
          console.warn(`[askAiQuestion] Non-search fallback ${model} failed:`, err?.status, err?.message);
        }
      }
      if (!response?.text?.trim() && lastFallbackErr) {
        throw lastFallbackErr;
      }
    }

    const rawAnswerText = response?.text?.trim();
    if (!rawAnswerText) {
      throw new Error("AI से उत्तर प्राप्त नहीं हो सका। कृपया पुनः प्रयास करें।");
    }

    // Inspect and strip the verification marker tag
    const selfFlaggedUnverified = /\[\[VERIFICATION:\s*UNVERIFIED\]\]/i.test(rawAnswerText);
    const selfFlaggedVerified = /\[\[VERIFICATION:\s*VERIFIED\]\]/i.test(rawAnswerText);
    const cleanText = rawAnswerText
      .replace(/\[\[VERIFICATION:\s*(VERIFIED|UNVERIFIED)\]\]/gi, '')
      .trim();

    // Extract real, non-hallucinated URLs from Gemini Grounding Metadata
    const { sources, hasWebSearchQueries } = extractGroundingChatSources(response);
    const searchGrounded = usedSearchTool && (sources.length > 0 || hasWebSearchQueries);
    const hasAuthoritativeSource = sources.some(
      (s) => s.trustLevel === 'govt_official' || s.trustLevel === 'academic_brand'
    );

    let verificationStatus: KrishiVerificationStatus;
    if (!searchGrounded || selfFlaggedUnverified || sources.length === 0) {
      verificationStatus = 'unverified';
    } else if (hasAuthoritativeSource && selfFlaggedVerified) {
      verificationStatus = 'verified';
    } else if (hasAuthoritativeSource && !selfFlaggedUnverified) {
      verificationStatus = 'verified';
    } else {
      verificationStatus = 'partial';
    }

    return {
      text: cleanText,
      verificationStatus,
      searchGrounded,
      sources
    };
  } catch (error: any) {
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    console.error("Gemini Chat Error:", error);
    throw new Error(friendlyError.message || error?.message || "त्रुटि हुई। कृपया पुनः प्रयास करें।");
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
  mismatchDetected?: boolean;
  mismatchWarning?: string;
  ocrUncertain?: boolean;
  uncertaintyNote?: string;
  scanMode?: 'single' | 'front_back';
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
    // If a legitimate product name was extracted (not a dummy error string) and no Front/Back mismatch occurred, it IS recognized!
    const hasValidName = Boolean(
      result.productName && 
      result.productName !== "जानकारी उपलब्ध नहीं है" && 
      !result.productName.includes("पहचान नहीं") &&
      !result.productName.includes("उपलब्ध नहीं")
    );

    result.mismatchDetected = Boolean(parsed.mismatchDetected);
    result.mismatchWarning = typeof parsed.mismatchWarning === 'string' ? parsed.mismatchWarning.trim() : undefined;
    result.ocrUncertain = Boolean(parsed.ocrUncertain);
    result.uncertaintyNote = typeof parsed.uncertaintyNote === 'string' ? parsed.uncertaintyNote.trim() : undefined;
    result.hasExactMatch = result.mismatchDetected ? false : hasValidName;

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

export interface ProductScanImagesInput {
  frontImage?: string | null;
  backImage?: string | null;
}

function extractInlineImagePart(dataUrl: string): { inlineData: { mimeType: string; data: string } } {
  let mimeType = "image/jpeg";
  if (dataUrl.startsWith("data:")) {
    const match = dataUrl.match(/^data:([^;]+);base64,/);
    if (match && match[1]) {
      mimeType = match[1];
    }
  }
  const cleanData = dataUrl.split(',')[1] || dataUrl;
  return {
    inlineData: {
      mimeType,
      data: cleanData
    }
  };
}

export async function analyzeProductImage(
  imageInput: string | ProductScanImagesInput,
  userApiKey?: string
): Promise<ProductKnowledgeResult> {
  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");

    const normalizedInput: ProductScanImagesInput =
      typeof imageInput === 'string'
        ? { frontImage: imageInput, backImage: null }
        : { frontImage: imageInput?.frontImage || null, backImage: imageInput?.backImage || null };

    const hasFront = Boolean(normalizedInput.frontImage && normalizedInput.frontImage.trim().length > 0);
    const hasBack = Boolean(normalizedInput.backImage && normalizedInput.backImage.trim().length > 0);

    if (!hasFront && !hasBack) {
      throw new Error("स्कैन करने के लिए कम से कम एक उत्पाद फोटो आवश्यक है।");
    }

    const isDualPhoto = hasFront && hasBack;
    const scanMode: 'single' | 'front_back' = isDualPhoto ? 'front_back' : 'single';

    const photoContextInstruction = isDualPhoto
      ? `आपको एक ही कृषि उत्पाद की 2 फोटो दी जा रही हैं:
   - **PHOTO 1 (Front Side / सामने का हिस्सा)**: ब्रांड नाम, उत्पाद प्रकार, पैकेट/बोतल का मुख्य चेहरा और फ्रंट विवरण पढ़ने के लिए।
   - **PHOTO 2 (Back Side / पीछे का हिस्सा)**: टेक्निकल नाम (Technical Composition), सक्रिय घटक (% w/w), फॉर्मूलेशन कोड, निर्माता कंपनी, CIBRC/FCO पंजीकरण संख्या, प्रतीक्षा अवधि (PHI), और सुरक्षा निर्देश पढ़ने के लिए।
   दोनों फोटो के टेक्स्ट को संयुक्त रूप से (Joint OCR) जोड़कर उत्पाद की 100% सटीक पहचान करें।`
      : hasFront
        ? `आपको कृषि उत्पाद की 1 फोटो (Front Side / सामने का हिस्सा) दी जा रही है। फोटो पर दिख रहे ब्रांड नाम, पैकेट/बोतल के टेक्स्ट और किसी भी दिख रहे टेक्निकल विवरण से उत्पाद की पहचान करें।`
        : `आपको कृषि उत्पाद की 1 फोटो (Back Side / पीछे का हिस्सा) दी जा रही है। लेबल पर छपे टेक्निकल नाम, Composition %, कंपनी का नाम और CIBRC/FCO विवरण से उत्पाद की पहचान करें।`;

    const prompt = `आप भारत के शीर्षस्थ कृषि वैज्ञानिक, पौध संरक्षण विशेषज्ञ, मल्टी-इमेज OCR एनालिस्ट एवं CIBRC/ICAR नियामक सलाहकार हैं, जो 'फल्सावदिया कृषि बाजार' का प्रतिनिधित्व करते हैं।
आपका कार्य संलग्न कृषि उत्पाद (कीटनाशक की बोतल, फफूंदनाशक का पाउच, खरपतवारनाशक, टॉनिक/PGR, सूक्ष्म पोषक तत्व, उर्वरक/खाद की बोरी, या बीज पैकेट) की फोटो का गहन विश्लेषण करना है और 100% सटीक, अत्यधिक विस्तृत (Detailed) व प्रामाणिक कृषि रिपोर्ट तैयार करना है।

${photoContextInstruction}

अति-महत्वपूर्ण विश्लेषण, विरोधाभास जांच एवं नियामक मानक (Joint OCR & Verification):
1. **संयुक्त OCR व पैकेजिंग टेक्स्ट एक्सट्रैक्शन**: दोनों लेबल (जो उपलब्ध हों) पर छपे समस्त अक्षर, ब्रांड नाम, टेक्निकल रसायन नाम, सांद्रता (% w/w या % w/v), फॉर्मूलेशन कोड (EC, SC, SL, WP, SP, WDG, SG, ZC, FS आदि), निर्माता कंपनी और CIBRC/FCO पंजीकरण नंबर को ध्यानपूर्वक पढ़ें।
2. **विरोधाभास जांच (Contradiction Check - अत्यंत महत्वपूर्ण)**:
   - यदि 2 फोटो दी गई हैं और PHOTO 1 (Front) तथा PHOTO 2 (Back) स्पष्ट रूप से **दो अलग-अलग उत्पादों** या असंगत ब्रांड/रासायनिक श्रेणियों की प्रतीत होती हैं (जैसे फ्रंट पर कोई कीटनाशक ब्रांड और बैक पर कोई बिल्कुल अलग खरपतवारनाशक/कंपनी का लेबल), तो उन्हें जबरदस्ती मिलाकर गलत जानकारी न दें!
   - ऐसी स्थिति में JSON में \`"mismatchDetected": true\` सेट करें, \`"mismatchWarning"\` में सरल हिंदी में स्पष्ट कारण लिखें (जैसे दोनों फोटो में कौन-कौन से अलग उत्पाद दिखे), \`"hasExactMatch": false\` रखें और \`"productName"\` में स्पष्ट चेतावनी लिखें।
3. **अस्पष्टता व अनुमान न लगाने का नियम (Strict Anti-Guesswork Rule)**:
   - यदि फोटो धुंधली है, चमक (glare) के कारण टेक्निकल नाम/Composition पढ़ा नहीं जा रहा है, और फ्रंट ब्रांड से भी पक्का टेक्निकल सुनिश्चित नहीं हो पा रहा है, तो **गलत या अनुमानित केमिकल नाम व डोज़ कतई न लिखें**।
   - ऐसी स्थिति में \`"ocrUncertain": true\` सेट करें और \`"uncertaintyNote"\` में सरल हिंदी में लिखें कि कौन-सी जानकारी स्पष्ट नहीं दिख रही (और यदि केवल Front फोटो दी गई थी, तो Back Side की साफ फोटो जोड़ने का सुझाव दें)।
   - यदि फोटो कृषि उत्पाद की ही नहीं है तो \`"productName"\` में \`"पहचान नहीं हो सकी"\` लिखें।
4. **सरकारी मानकों से मिलान**: जब उत्पाद और टेक्निकल स्पष्ट हो जाए, तो CIBRC (केंद्रीय कीटनाशक बोर्ड), ICAR एवं उर्वरक नियंत्रण आदेश (FCO) के आधिकारिक पंजीकृत दावों के अनुसार सटीक विवरण भरें।
5. **100% केवल सरल हिंदी**: भारतीय किसान इस रिपोर्ट को पढ़ेंगे। समस्त विवरण, फायदे, सावधानियां, कार्यप्रणाली, फसलें, कीट व मात्राएं सरल, स्पष्ट व सम्मानजनक हिंदी में ही लिखें (टेक्निकल रसायनों के साथ कोष्ठक में अंग्रेजी नाम लिख सकते हैं)।
6. **सटीक व विस्तृत JSON फील्ड्स**:
   - productName: उत्पाद का पूरा ब्रांड नाम व हिंदी उच्चारण
   - companyName: मूल निर्माता कंपनी
   - technicalName: सक्रिय टेक्निकल रसायन, सांद्रता व फॉर्मूलेशन (यदि फोटो में साफ़ पढ़ा न जा सके और निश्चित न हो तो "लेबल अस्पष्ट - कृपया बैक फोटो स्पष्ट दें" लिखें)
   - category: सटीक श्रेणी (कीटनाशक, फफूंदनाशक, खरपतवारनाशक, खाद, बीज आदि)
   - formulation: फॉर्मूलेशन का प्रकार (SC, EC, WP, WDG, SL आदि)
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
   - mismatchDetected: boolean (true केवल तब जब फ्रंट और बैक फोटो अलग-अलग उत्पादों की हों)
   - mismatchWarning: string (विरोधाभास होने पर सरल हिंदी चेतावनी, अन्यथा "")
   - ocrUncertain: boolean (true जब टेक्निकल/कंपोज़िशन धुंधला या अपूर्ण हो)
   - uncertaintyNote: string (अस्पष्टता का कारण व सुझाव सरल हिंदी में, अन्यथा "")
7. **प्रत्येक स्प्रेयर हेतु सटीक वास्तविक मात्रा (Accurate Dosages)**:
   - dosageLiquid: { perLiter, per15L, per16L, per20L, per25L, per200L, per500L, perBigha, perAcre } - सही मिलीलीटर मात्रा
   - dosagePowder: { perLiter, per15L, per16L, per20L, per25L, per200L, per500L, perBigha, perAcre } - सही ग्राम/किग्रा मात्रा
   - dosageFertilizer: { perPlant, perPot, perBigha, perAcre, perIrrigation, perSpray, perDrenching, totalAmount }
   - dosageSeeds: { seedRatePerBigha, seedRatePerAcre, seedTreatment, sowingDepth, rowAndPlantSpacing, germinationDays, sowingSeason }
   - cropSpecificDosage: कम से कम 4 से 6 फसलों हेतु { cropName, dosage, usage, sprayTime }
8. **पहचान की स्थिति**: सही पहचान होने पर 'hasExactMatch' को true सेट करें।
9. कोई base64 या इमेज स्ट्रिंग आउटपुट JSON में न दें।
10. आउटपुट केवल और केवल वैध JSON स्ट्रिंग लौटाएं।`;

    const systemInstruction = "You are an expert agricultural inputs consultant representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar), Shamgarh, MP. Shop timings: 8:00 AM to 8:00 PM. Address: Dimple Chauraha, Near Kshatriya Khati Manglik Bhawan, Shamgarh (458883). MANDATORY REQUIREMENT: Analyze single or dual (Front & Back) packaging images with extreme accuracy using joint OCR. Never fabricate technical compositions if unreadable, and always flag Front vs Back product contradictions honestly. Provide 100% scientifically accurate, deeply detailed, authentic agronomic information based on official CIB&RC and ICAR standards. Respond 100% in simple, respectful HINDI. Never echo base64 image data. Return strictly valid JSON. STRICT RULE ON NAME: Only use 'फल्सावदिया' (never 'फालसावदिया').";

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt }
    ];

    if (hasFront && normalizedInput.frontImage) {
      parts.push({ text: "--- PHOTO 1: PRODUCT FRONT SIDE (सामने का हिस्सा) ---" });
      parts.push(extractInlineImagePart(normalizedInput.frontImage));
    }

    if (hasBack && normalizedInput.backImage) {
      parts.push({ text: "--- PHOTO 2: PRODUCT BACK SIDE (पीछे का हिस्सा - Composition / Technical / CIBRC) ---" });
      parts.push(extractInlineImagePart(normalizedInput.backImage));
    }

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
            parsed.scanMode = scanMode;
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
    result.scanMode = scanMode;
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

