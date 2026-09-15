/**
 * Utility to clean and parse crop disease detection reports into structured,
 * pointwise, section-wise data for professional UI rendering.
 */

export interface ChemicalMedicine {
  medicineName: string;
  dosagePump: string;
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

    // Try to extract pump and acre dosages
    let dosagePump = rest;
    let dosageAcre = '';
    let instructions = '';

    // Match acre dosage if present in brackets or separate phrase
    const acreMatch = rest.match(/\(?(\d+(?:[-–]\d+)?\s*(?:मिलीलीटर|मिली|ग्राम|ml|gm|g)\s*(?:प्रति\s*(?:एकड़|बीघा)|\/\s*एकड़))\)?/i);
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

    const chemicalControl: ChemicalMedicine[] = (preStructured.chemicalControl || []).map(c => ({
      medicineName: c.medicineName || c.name || '',
      dosagePump: c.dosagePump || c.dosage || '',
      dosageAcre: c.dosageAcre,
      instructions: c.instructions,
      raw: `${c.medicineName}: ${c.dosagePump || c.dosage}`
    }));

    const organicControl: OrganicMedicine[] = (preStructured.organicControl || []).map(o => ({
      methodName: o.methodName || o.name || '',
      dosage: o.dosage || '',
      instructions: o.instructions,
      raw: `${o.methodName}: ${o.dosage}`
    }));

    return {
      cropName: preStructured.cropName || 'फसल (Crop)',
      problemType: preStructured.problemType || 'कीट / रोग प्रकोप',
      diseaseName: preStructured.diseaseName || 'लक्षित समस्या',
      severity,
      severityLabel,
      symptoms: preStructured.symptoms || [],
      treatmentNotice: preStructured.shopNotice || 'किसान भाइयों, ये सभी उत्तम दवाएं हमारी दुकान फल्सावदिया कृषि बाजार पर उपलब्ध हैं।',
      chemicalControl,
      organicControl,
      preventionTips: preStructured.preventionTips || [],
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

  const hasStructuredSections = Boolean(
    cropName || diseaseName || symptoms.length > 0 || chemicalControl.length > 0 || preventionTips.length > 0
  );

  return {
    cropName: cropName || 'पौधे / फसल की पहचान',
    problemType: problemType || 'फसल कीट या रोग',
    diseaseName: diseaseName || 'लक्षित कीट / फफूंद समस्या',
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
