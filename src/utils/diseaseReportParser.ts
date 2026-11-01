/**
 * Utility to clean and parse crop disease detection reports into structured,
 * pointwise, section-wise data for professional UI rendering.
 */

export interface ChemicalMedicine {
  medicineName: string;
  dosagePump: string;
  dosageBigha?: string;
  dosageAcre?: string;
  instructions?: string;
  raw: string;
}

export interface OrganicMedicine {
  methodName: string;
  dosage: string;
  instructions?: string;
  raw: string;
}

export interface ParsedDiseaseReport {
  cropName: string;
  problemType: string;
  diseaseName: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  severityLabel: string;
  symptoms: string[];
  treatmentNotice?: string;
  chemicalControl: ChemicalMedicine[];
  organicControl: OrganicMedicine[];
  preventionTips: string[];
  shopNotice?: string;
  rawCleanedText: string;
  hasStructuredSections: boolean;
}

/**
 * Removes any literal <br>, <br/>, and markdown formatting tags cleanly
 */
export function cleanRawReportText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:p|div|span|strong|b|i|em)>/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strips leading bullets, numbers, and asterisks
 */
function cleanBullet(text: string): string {
  return text
    .replace(/^\s*(?:[\d]+[\.\)]|[-•*]+)\s*/, '')
    .replace(/^\*\*|\*\*$/g, '')
    .trim();
}

/**
 * Parse chemical medicine line into name, dosage, and instructions
 */
function parseChemicalLine(line: string): ChemicalMedicine {
  const cleaned = cleanBullet(line);
  
  // Split on the first colon if available (e.g. "Name (Active): Dosage instructions")
  const colonIndex = cleaned.indexOf(':');
  if (colonIndex > 0) {
    const namePart = cleaned.substring(0, colonIndex).replace(/\*\*/g, '').trim();
    const rest = cleaned.substring(colonIndex + 1).trim();

    // Try to extract pump, bigha, and acre dosages
    let dosagePump = rest;
    let dosageBigha = '';
    let dosageAcre = '';
    let instructions = '';

    // Match bigha dosage if present
    const bighaMatch = rest.match(/\(?(\d+(?:[-–]\d+)?\s*(?:मिलीलीटर|मिली|ग्राम|ml|gm|g)\s*(?:प्रति\s*(?:शामगढ़\s*)?बीघा|\/\s*बीघा))\)?/i);
    if (bighaMatch) {
      dosageBigha = bighaMatch[1].trim();
    }

    // Match acre dosage if present in brackets or separate phrase
    const acreMatch = rest.match(/\(?(\d+(?:[-–]\d+)?\s*(?:मिलीलीटर|मिली|ग्राम|ml|gm|g)\s*(?:प्रति\s*एकड़|\/\s*एकड़))\)?/i);
    if (acreMatch) {
      dosageAcre = acreMatch[1].trim();
    }

    // Match pump dosage
    const pumpMatch = rest.match(/(\d+(?:[-–]\d+)?\s*(?:मिलीलीटर|मिली|ग्राम|ml|gm|g)\s*(?:प्रति\s*(?:15|20)?\s*(?:लीटर|ली)?\s*(?:पंप|पानी)|प्रति\s*पंप|\/\s*15\s*लीटर))/i);
    if (pumpMatch) {
      dosagePump = pumpMatch[1].trim();
    }

    // Instructions
    const instMatch = rest.match(/(?:की दर से छिड़काव करें|स्प्रे करें|घोल बनाकर छिड़कें|का छिड़काव करें)[^\.]*/i);
    if (instMatch) {
      instructions = instMatch[0].trim();
    }

    return {
      medicineName: namePart,
      dosagePump: dosagePump || rest,
      dosageBigha: dosageBigha || undefined,
      dosageAcre: dosageAcre || undefined,
      instructions: instructions || (dosagePump !== rest ? rest : undefined),
      raw: cleaned
    };
  }

  return {
    medicineName: cleaned,
    dosagePump: '',
    raw: cleaned
  };
}

/**
 * Parse organic control line
 */
function parseOrganicLine(line: string): OrganicMedicine {
  const cleaned = cleanBullet(line);
  const colonIndex = cleaned.indexOf(':');
  if (colonIndex > 0) {
    const namePart = cleaned.substring(0, colonIndex).replace(/\*\*/g, '').trim();
    const rest = cleaned.substring(colonIndex + 1).trim();
    return {
      methodName: namePart,
      dosage: rest,
      raw: cleaned
    };
  }
  return {
    methodName: cleaned,
    dosage: '',
    raw: cleaned
  };
}

/**
 * Cleans generic disease placeholders like "लक्षण आधारित रोग रिपोर्ट"
 * and resolves an authentic pathology name based on the crop and problem category.
 */
export function sanitizeDiseaseName(
  rawName: string | undefined,
  cropName: string,
  problemType: string,
  symptoms: string[] = []
): string {
  const name = (rawName || '').trim();
  const lower = name.toLowerCase();
  const symptomStr = symptoms.join(' ').toLowerCase();

  const isGeneric = 
    !name ||
    name === 'लक्षण आधारित रोग रिपोर्ट' ||
    name === 'लक्षण आधारित रोग' ||
    name === 'लक्षण आधारित रिपोर्ट' ||
    name === 'विस्तृत रिपोर्ट' ||
    name === 'लक्षित समस्या' ||
    name === 'लक्षित कीट / फफूंद समस्या' ||
    lower.includes('symptoms based') ||
    lower.includes('symptom based') ||
    lower.includes('लक्षण आधारित');

  if (!isGeneric) {
    return name;
  }

  const crop = cropName.toLowerCase();

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
 * Ensures that chemical and organic control lists are never empty
 * by supplying standard CIBRC-registered remedies for Indian farming conditions.
 */
export function getGuaranteedTreatments(
  cropName: string,
  problemType: string,
  diseaseName: string
): { chemicalControl: ChemicalMedicine[]; organicControl: OrganicMedicine[] } {
  const combined = `${cropName} ${problemType} ${diseaseName}`.toLowerCase();

  // Chewing Pests
  if (combined.includes('इल्ली') || combined.includes('सुंडी') || combined.includes('सेमीलूपर') || combined.includes('chewing') || combined.includes('borer') || combined.includes('caterpillar') || combined.includes('spodoptera')) {
    return {
      chemicalControl: [
        {
          medicineName: "कोराजन (Coragen) - क्लोरेंट्रानिलिप्रोल 18.5% SC",
          dosagePump: "6-7 मिली प्रति 15 लीटर पंप",
          dosageBigha: "35-40 मिली/बीघा",
          dosageAcre: "60 मिली प्रति एकड़",
          instructions: "इल्लियों की शुरुआती अवस्था व अंडों से निकलते ही सर्वोत्तम नियंत्रण प्रदान करता है।",
          raw: "कोराजन: 6-7 मिली प्रति 15 लीटर पंप"
        },
        {
          medicineName: "प्रोक्लेम / एमामेक्टिन बेंजोएट 5% SG",
          dosagePump: "8-10 ग्राम प्रति 15 लीटर पंप",
          dosageBigha: "60-70 ग्राम/बीघा",
          dosageAcre: "100 ग्राम प्रति एकड़",
          instructions: "शाम के समय छिड़काव करें जब इल्लियां पत्तियों पर भोजन के लिए बाहर आती हैं।",
          raw: "प्रोक्लेम: 8-10 ग्राम प्रति 15 लीटर पंप"
        }
      ],
      organicControl: [
        {
          methodName: "बवेरिया बासियाना (Beauveria bassiana 1.15% WP)",
          dosage: "40-50 ग्राम प्रति 15 लीटर पंप",
          instructions: "शाम के समय नम मौसम में जैविक इल्ली नाशक के रूप में छिड़कें।",
          raw: "बवेरिया बासियाना: 40-50 ग्राम प्रति पंप"
        },
        {
          methodName: "नीम का तेल (Neem Oil 10,000 PPM)",
          dosage: "40-50 मिली प्रति 15 लीटर पंप",
          instructions: "इल्लियों के अंडों और छोटी सूंडियों की रोकथाम के लिए उपयोगी।",
          raw: "नीम का तेल: 40-50 मिली प्रति पंप"
        }
      ]
    };
  }

  // Sucking Pests
  if (combined.includes('रस चूसक') || combined.includes('थ्रिप्स') || combined.includes('सफेद मक्खी') || combined.includes('माहू') || combined.includes('एफिड') || combined.includes('तेला') || combined.includes('sucking') || combined.includes('thrips') || combined.includes('whitefly')) {
    return {
      chemicalControl: [
        {
          medicineName: "कॉन्फिडोर / इमिडाक्लोप्रिड 17.8% SL",
          dosagePump: "8-10 मिली प्रति 15 लीटर पंप",
          dosageBigha: "60-80 मिली/बीघा",
          dosageAcre: "100-125 मिली प्रति एकड़",
          instructions: "पत्तियों की निचली सतह पर जहाँ रस चूसक कीट छिपे रहते हैं, अच्छी तरह स्प्रे करें।",
          raw: "कॉन्फिडोर: 8-10 मिली प्रति 15 लीटर पंप"
        },
        {
          medicineName: "एक्टारा / थायमेथोक्सम 25% WG",
          dosagePump: "10-12 ग्राम प्रति 15 लीटर पंप",
          dosageBigha: "90-100 ग्राम/बीघा",
          dosageAcre: "150 ग्राम प्रति एकड़",
          instructions: "सिस्टेमिक कीटनाशक है जो पूरे पौधे में रस चूसक कीटों को निष्क्रिय करता है।",
          raw: "एक्टारा: 10-12 ग्राम प्रति 15 लीटर पंप"
        }
      ],
      organicControl: [
        {
          methodName: "नीम का तेल (Neem Oil 10,000 PPM)",
          dosage: "40-50 मिली प्रति 15 लीटर पंप",
          instructions: "स्टीकर या थोड़े साबुन के घोल के साथ मिलाकर शाम के समय स्प्रे करें।",
          raw: "नीम का तेल: 40-50 मिली प्रति 15 लीटर पंप"
        },
        {
          methodName: "वर्टिसिलियम लेकानी (Verticillium lecanii 1.15% WP)",
          dosage: "40-50 ग्राम प्रति 15 लीटर पंप",
          instructions: "रस चूसक कीटों और सफेद मक्खी के विरुद्ध प्रभावी जैविक नियंत्रण।",
          raw: "वर्टिसिलियम लेकानी: 40-50 ग्राम प्रति पंप"
        }
      ]
    };
  }

  // Bacterial Diseases
  if (combined.includes('जीवाणु') || combined.includes('बैक्टीरिया') || combined.includes('bacterial')) {
    return {
      chemicalControl: [
        {
          medicineName: "स्ट्रेप्टोसाइक्लिन (Streptocycline) + ब्लाइटॉक्स (कॉपर ऑक्सीक्लोराइड 50% WP)",
          dosagePump: "6 ग्राम स्ट्रेप्टोसाइक्लिन + 40 ग्राम कॉपर ऑक्सीक्लोराइड प्रति 15 लीटर पंप",
          dosageBigha: "35 ग्राम + 300 ग्राम/बीघा",
          dosageAcre: "60 ग्राम + 500 ग्राम प्रति एकड़",
          instructions: "जीवाणु जनित धब्बों को रोकने के लिए मौसम साफ होने पर तुरंत स्प्रे करें।",
          raw: "स्ट्रेप्टोसाइक्लिन + कॉपर ऑक्सीक्लोराइड"
        },
        {
          medicineName: "कासु-बी / कासुगामाइसिन 3% SL",
          dosagePump: "30-35 मिली प्रति 15 लीटर पंप",
          dosageBigha: "250-300 मिली/बीघा",
          dosageAcre: "400-500 मिली प्रति एकड़",
          instructions: "पत्तियों के घावों में बैक्टीरिया के प्रसार को रोकने में अत्यधिक प्रभावी।",
          raw: "कासुगामाइसिन: 30-35 मिली प्रति पंप"
        }
      ],
      organicControl: [
        {
          methodName: "स्यूडोमोनास फ्लोरोसेंस (Pseudomonas fluorescens 1% WP)",
          dosage: "40-50 ग्राम प्रति 15 लीटर पंप",
          instructions: "जैविक जीवाणुनाशक के रूप में पौधों पर अच्छी तरह छिड़काव करें।",
          raw: "स्यूडोमोनास फ्लोरोसेंस: 40-50 ग्राम प्रति पंप"
        }
      ]
    };
  }

  // Fungal Diseases (Default)
  return {
    chemicalControl: [
      {
        medicineName: "साफ (SAAF) - कार्बेंडाजिम 12% + मैनकोजेब 63% WP",
        dosagePump: "35-40 ग्राम प्रति 15 लीटर पंप",
        dosageBigha: "250-300 ग्राम/बीघा",
        dosageAcre: "400-500 ग्राम प्रति एकड़",
        instructions: "रोग के लक्षण दिखते ही पत्तियों के दोनों तरफ अच्छी तरह छिड़काव करें।",
        raw: "साफ: 35-40 ग्राम प्रति 15 लीटर पंप"
      },
      {
        medicineName: "कस्टोडिया (Custodia) - एजोक्सीस्ट्रोबिन 11% + डिफेनोकोनाजोल 18.3% SC",
        dosagePump: "15-18 मिली प्रति 15 लीटर पंप",
        dosageBigha: "120-150 मिली/बीघा",
        dosageAcre: "200-250 मिली प्रति एकड़",
        instructions: "गंभीर संक्रमण में त्वरित सिस्टेमिक व कॉन्टैक्ट सुरक्षा प्रदान करता है।",
        raw: "कस्टोडिया: 15-18 मिली प्रति 15 लीटर पंप"
      }
    ],
    organicControl: [
      {
        methodName: "नीम का तेल (Neem Oil 10,000 PPM)",
        dosage: "35-40 मिली प्रति 15 लीटर पंप",
        instructions: "फंगल बीजाणुओं के प्रसार को रोकने के लिए शाम को साफ पानी में स्प्रे करें।",
        raw: "नीम का तेल: 35-40 मिली प्रति पंप"
      },
      {
        methodName: "ट्राइकोडर्मा विरिडी (Trichoderma viride 1% WP)",
        dosage: "40-50 ग्राम प्रति 15 लीटर पंप",
        instructions: "जैविक फफूंदनाशक के रूप में पत्तियों या जड़ क्षेत्र में छिड़कें।",
        raw: "ट्राइकोडर्मा विरिडी: 40-50 ग्राम प्रति पंप"
      }
    ]
  };
}

/**
 * Core parser function to convert any raw text analysis into a pointwise,
 * structured, section-wise report.
 */
export function parseDiseaseReport(
  rawText: string,
  preStructured?: {
    cropName?: string;
    problemType?: string;
    diseaseName?: string;
    severity?: string;
    symptoms?: string[];
    chemicalControl?: any[];
    organicControl?: any[];
    preventionTips?: string[];
    shopNotice?: string;
  }
): ParsedDiseaseReport {
  const cleanedText = cleanRawReportText(rawText);

  // If pre-structured fields were passed directly from Gemini JSON response
  if (
    preStructured &&
    (preStructured.cropName || preStructured.diseaseName || (preStructured.symptoms && preStructured.symptoms.length > 0))
  ) {
    let severity: 'MILD' | 'MODERATE' | 'SEVERE' = 'MODERATE';
    let severityLabel = 'मध्यम प्रभाव (Action Recommended)';

    const sevStr = (preStructured.severity || '').toLowerCase();
    if (sevStr.includes('mild') || sevStr.includes('सामान्य') || sevStr.includes('शुरुआती')) {
      severity = 'MILD';
      severityLabel = 'शुरुआती / सामान्य प्रभाव (Mild)';
    } else if (sevStr.includes('severe') || sevStr.includes('गंभीर') || sevStr.includes('क्रिटिकल')) {
      severity = 'SEVERE';
      severityLabel = 'गंभीर / तत्काल रोकथाम आवश्यक (Severe)';
    }

    const cropName = preStructured.cropName || 'फसल (Crop)';
    const problemType = preStructured.problemType || 'कीट / रोग प्रकोप';
    const symptoms = preStructured.symptoms && preStructured.symptoms.length > 0
      ? preStructured.symptoms
      : ['पत्तियों या तने पर दिखाई देने वाले विशिष्ट लक्षण'];

    const diseaseName = sanitizeDiseaseName(
      preStructured.diseaseName,
      cropName,
      problemType,
      symptoms
    );

    let chemicalControl: ChemicalMedicine[] = (preStructured.chemicalControl || []).map((c: any) => {
      let bighaDose = c.dosageBigha;
      if (!bighaDose && c.dosageAcre) {
        // Automatically derive Shamgarh Pucca Bigha from Acre (1 Acre = 1.60 Bigha)
        const rangeMatch = c.dosageAcre.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(.*)/);
        if (rangeMatch) {
          const l = Math.round((parseFloat(rangeMatch[1]) / 1.60) * 10) / 10;
          const h = Math.round((parseFloat(rangeMatch[2]) / 1.60) * 10) / 10;
          const u = rangeMatch[3].replace(/प्रति\s*एकड़|\/\s*एकड़/gi, '').trim();
          bighaDose = `${l} - ${h} ${u || 'ml/g'}/बीघा`.trim();
        } else {
          const singleMatch = c.dosageAcre.match(/(\d+(?:\.\d+)?)\s*(.*)/);
          if (singleMatch) {
            const val = Math.round((parseFloat(singleMatch[1]) / 1.60) * 10) / 10;
            const u = singleMatch[2].replace(/प्रति\s*एकड़|\/\s*एकड़/gi, '').trim();
            bighaDose = `${val} ${u || 'ml/g'}/बीघा`.trim();
          }
        }
      }
      return {
        medicineName: c.medicineName || c.name || '',
        dosagePump: c.dosagePump || c.dosage || '',
        dosageBigha: bighaDose,
        dosageAcre: c.dosageAcre,
        instructions: c.instructions,
        raw: `${c.medicineName}: ${c.dosagePump || c.dosage}`
      };
    }).filter(c => c.medicineName.trim().length > 0);

    let organicControl: OrganicMedicine[] = (preStructured.organicControl || []).map(o => ({
      methodName: o.methodName || o.name || '',
      dosage: o.dosage || '',
      instructions: o.instructions,
      raw: `${o.methodName}: ${o.dosage}`
    })).filter(o => o.methodName.trim().length > 0);

    // Guaranteed Treatment Plan Protection: Ensure treatment cards are NEVER empty
    if (chemicalControl.length === 0 || organicControl.length === 0) {
      const guaranteed = getGuaranteedTreatments(cropName, problemType, diseaseName);
      if (chemicalControl.length === 0) {
        chemicalControl = guaranteed.chemicalControl;
      }
      if (organicControl.length === 0) {
        organicControl = guaranteed.organicControl;
      }
    }

    return {
      cropName,
      problemType,
      diseaseName,
      severity,
      severityLabel,
      symptoms,
      treatmentNotice: preStructured.shopNotice || 'किसान भाइयों, ये सभी उत्तम दवाएं हमारी दुकान फल्सावदिया कृषि बाजार पर उपलब्ध हैं।',
      chemicalControl,
      organicControl,
      preventionTips: preStructured.preventionTips || [
        'खेत की नियमित निगरानी करें',
        'मौसम साफ होने पर सुबह या शाम को छिड़काव करें',
        'असंतुलित यूरिया का प्रयोग न करें'
      ],
      shopNotice: preStructured.shopNotice,
      rawCleanedText: cleanedText,
      hasStructuredSections: true
    };
  }

  // --- REGEX FALLBACK PARSER FOR RAW TEXT (HISTORICAL SCANS & STORED DATA) ---
  
  // 1. Crop Name
  let cropName = '';
  const cropMatch = cleanedText.match(/(?:फसल का नाम|फसल|Crop Name)[:\s*]+([^\n\r]+)/i);
  if (cropMatch) {
    cropName = cropMatch[1].replace(/\*\*/g, '').trim();
  }

  // 2. Problem Type (Disease / Pest / Deficiency)
  let problemType = '';
  const probMatch = cleanedText.match(/(?:कीट का प्रकार|बीमारी या कीट का प्रकार|समस्या का प्रकार|रोग का प्रकार|कीट वर्ग|Disease or Pest Type|Pest Type)[:\s*]+([^\n\r]+)/i);
  if (probMatch) {
    problemType = probMatch[1].replace(/\*\*/g, '').trim();
  } else {
    // Deduce from keywords in text
    if (/रस चूसक|थ्रिप्स|एफिड|माहू|सफेद मक्खी|sucking/i.test(cleanedText)) {
      problemType = 'रस चूसक कीट (Sucking Pest)';
    } else if (/इल्ली|कैटरपिलर|chewing|borer/i.test(cleanedText)) {
      problemType = 'चबाने वाला कीट / इल्ली (Chewing Pest)';
    } else if (/फफूंद|फंगस|fungal|झुलसा|ब्लाइट|mildew/i.test(cleanedText)) {
      problemType = 'फफूंद जनित रोग (Fungal Disease)';
    } else if (/जीवाणु|बैक्टीरिया|bacterial/i.test(cleanedText)) {
      problemType = 'जीवाणु जनित रोग (Bacterial Disease)';
    } else if (/पोषण|कमी|deficiency|पीलापन/i.test(cleanedText)) {
      problemType = 'पोषक तत्व की कमी (Nutrient Deficiency)';
    } else {
      problemType = 'फसल रोग / कीट समस्या';
    }
  }

  // 3. Specific Name (Disease or Pest Name)
  let diseaseName = '';
  const nameMatch = cleanedText.match(/(?:विशिष्ट नाम|बीमारी का नाम|रोग का नाम|कीट का नाम|Specific Name)[:\s*]+([^\n\r]+)/i);
  if (nameMatch) {
    diseaseName = nameMatch[1].replace(/\*\*/g, '').trim();
  }

  // 4. Symptoms (लक्षण) Pointwise Extraction
  const symptoms: string[] = [];
  const symptomsBlockMatch = cleanedText.match(/(?:लक्षण|Symptoms)[:\s*]*\n([\s\S]*?)(?=(?:अनुशंसित उपचार|उपचार|उपाय|Recommended Treatment|रासायनिक नियंत्रण|$))/i);
  if (symptomsBlockMatch) {
    const rawSymptoms = symptomsBlockMatch[1];
    // Split by numbered list or bullet points
    const lines = rawSymptoms.split('\n');
    let currentPoint = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/^(?:[\d]+[\.\)]|[-•*])\s+/.test(trimmed)) {
        if (currentPoint) symptoms.push(cleanBullet(currentPoint));
        currentPoint = trimmed;
      } else if (currentPoint) {
        currentPoint += ' ' + trimmed;
      } else {
        currentPoint = trimmed;
      }
    }
    if (currentPoint) {
      symptoms.push(cleanBullet(currentPoint));
    }
  }

  // 5. Treatment Notice
  let treatmentNotice = '';
  const noticeMatch = cleanedText.match(/(?:अनुशंसित उपचार|उपचार|Recommended Treatment)[^\n]*\n+([^:\n][^\n]*)/i);
  if (noticeMatch && !noticeMatch[1].includes('रासायनिक नियंत्रण')) {
    treatmentNotice = noticeMatch[1].replace(/\*\*/g, '').trim();
  }

  // 6. Chemical Control (रासायनिक नियंत्रण) Pointwise Extraction
  const chemicalControl: ChemicalMedicine[] = [];
  const chemBlockMatch = cleanedText.match(/(?:रासायनिक नियंत्रण|Chemical Control)[:\s*]*\n([\s\S]*?)(?=(?:जैविक नियंत्रण|Organic Control|बचाव एवं सावधानियां|बचाव|Prevention|$))/i);
  if (chemBlockMatch) {
    const rawChem = chemBlockMatch[1];
    const lines = rawChem.split('\n');
    let currentLine = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^(?:[\d]+[\.\)]|[-•*])\s+/.test(trimmed)) {
        if (currentLine) chemicalControl.push(parseChemicalLine(currentLine));
        currentLine = trimmed;
      } else if (currentLine) {
        currentLine += ' ' + trimmed;
      } else {
        currentLine = trimmed;
      }
    }
    if (currentLine) {
      chemicalControl.push(parseChemicalLine(currentLine));
    }
  }

  // 7. Organic Control (जैविक नियंत्रण) Pointwise Extraction
  const organicControl: OrganicMedicine[] = [];
  const orgBlockMatch = cleanedText.match(/(?:जैविक नियंत्रण|Organic Control)[:\s*]*\n([\s\S]*?)(?=(?:बचाव एवं सावधानियां|बचाव|Prevention|अधिक जानकारी|दुकान|$))/i);
  if (orgBlockMatch) {
    const rawOrg = orgBlockMatch[1];
    const lines = rawOrg.split('\n');
    let currentLine = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^(?:[\d]+[\.\)]|[-•*])\s+/.test(trimmed)) {
        if (currentLine) organicControl.push(parseOrganicLine(currentLine));
        currentLine = trimmed;
      } else if (currentLine) {
        currentLine += ' ' + trimmed;
      } else {
        currentLine = trimmed;
      }
    }
    if (currentLine) {
      organicControl.push(parseOrganicLine(currentLine));
    }
  }

  // 8. Prevention & Precautions (बचाव एवं सावधानियां) Pointwise Extraction
  const preventionTips: string[] = [];
  const prevBlockMatch = cleanedText.match(/(?:बचाव एवं सावधानियां|बचाव|सावधानियां|Prevention & Precautions|Prevention)[:\s*]*\n([\s\S]*?)(?=(?:अधिक जानकारी|दुकान|नोट|$))/i);
  if (prevBlockMatch) {
    const rawPrev = prevBlockMatch[1];
    const lines = rawPrev.split('\n');
    let currentPoint = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^(?:[\d]+[\.\)]|[-•*])\s+/.test(trimmed)) {
        if (currentPoint) preventionTips.push(cleanBullet(currentPoint));
        currentPoint = trimmed;
      } else if (currentPoint) {
        currentPoint += ' ' + trimmed;
      } else {
        currentPoint = trimmed;
      }
    }
    if (currentPoint) {
      preventionTips.push(cleanBullet(currentPoint));
    }
  }

  // 9. Shop Notice / Address
  let shopNotice = '';
  const shopMatch = cleanedText.match(/(?:अधिक जानकारी और उच्च गुणवत्ता|हमारी दुकान 'फल्सावदिया कृषि बाजार')[^\n]*[\s\S]*$/i);
  if (shopMatch) {
    shopNotice = shopMatch[0].replace(/\*\*/g, '').trim();
  }

  // Determine Severity
  let severity: 'MILD' | 'MODERATE' | 'SEVERE' = 'MODERATE';
  let severityLabel = 'मध्यम प्रभाव (Action Recommended)';

  if (/गंभीर|तत्काल|भारी प्रकोप|severe|critical|झुलसा|सड़न|विनाशकारी/i.test(cleanedText)) {
    severity = 'SEVERE';
    severityLabel = 'गंभीर / तत्काल रोकथाम आवश्यक (Severe)';
  } else if (/शुरुआती|सामान्य|हल्का|कम|mild/i.test(cleanedText)) {
    severity = 'MILD';
    severityLabel = 'शुरुआती लक्षण / सामान्य (Mild)';
  }

  const finalCropName = cropName || 'पौधे / फसल की पहचान';
  const finalProblemType = problemType || 'फसल कीट या रोग';
  const finalDiseaseName = sanitizeDiseaseName(
    diseaseName,
    finalCropName,
    finalProblemType,
    symptoms
  );

  // Guarantee non-empty treatment plan even in regex fallback mode
  if (chemicalControl.length === 0 || organicControl.length === 0) {
    const guaranteed = getGuaranteedTreatments(finalCropName, finalProblemType, finalDiseaseName);
    if (chemicalControl.length === 0) {
      chemicalControl.push(...guaranteed.chemicalControl);
    }
    if (organicControl.length === 0) {
      organicControl.push(...guaranteed.organicControl);
    }
  }

  const hasStructuredSections = Boolean(
    finalCropName || finalDiseaseName || symptoms.length > 0 || chemicalControl.length > 0 || preventionTips.length > 0
  );

  return {
    cropName: finalCropName,
    problemType: finalProblemType,
    diseaseName: finalDiseaseName,
    severity,
    severityLabel,
    symptoms,
    treatmentNotice,
    chemicalControl,
    organicControl,
    preventionTips,
    shopNotice,
    rawCleanedText: cleanedText,
    hasStructuredSections
  };
}
