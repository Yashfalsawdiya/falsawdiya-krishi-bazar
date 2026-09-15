import { ParsedDiseaseReport, TreatmentItem } from '../types/diseaseReport';

/**
 * Normalizes raw string by removing HTML break tags, non-breaking spaces,
 * standardizing newlines and converting bold tags to markdown.
 */
export function normalizeDiseaseText(rawText: string): string {
  if (!rawText) return '';

  return rawText
    // Replace html br tags with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Replace non-breaking spaces
    .replace(/&nbsp;/gi, ' ')
    // Replace strong/b tags with markdown asterisks
    .replace(/<\/?(strong|b)>/gi, '**')
    // Standardize newlines
    .replace(/\r\n/g, '\n')
    // Collapse excessive empty newlines (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Splits text into individual clean points / sentences
 */
function extractBulletPoints(textBlock: string): string[] {
  if (!textBlock) return [];
  const lines = textBlock.split('\n');
  const points: string[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check if line starts with numbered list e.g. "1.", "1)", "- ", "* ", "•"
    const cleaned = line
      .replace(/^(\d+[\.\)]|\-|\*|•)\s*/, '')
      .trim();

    if (cleaned && cleaned.length > 3) {
      points.push(cleaned);
    }
  }

  return points;
}

/**
 * Parses dosage info (pump dosage, acre dosage) from treatment instruction text
 */
function extractDosageHighlights(text: string): { pumpDosage?: string; acreDosage?: string } {
  let pumpDosage: string | undefined;
  let acreDosage: string | undefined;

  // Search for pump dosage pattern e.g. "15-18 मिलीलीटर प्रति 15 लीटर पंप", "10 ग्राम प्रति 15 लीटर"
  const pumpMatch = text.match(/(\d+(?:[\.–\-]\d+)?\s*(?:मिलीलीटर|एमएल|ml|ग्राम|gm|g|लीटर|L)\s*(?:प्रति|\/)?\s*(?:15|16|20)?\s*(?:लीटर)?\s*(?:पंप|पानी))/i);
  if (pumpMatch) {
    pumpDosage = pumpMatch[1].trim();
  }

  // Search for acre/bigha dosage pattern e.g. "(180 मिलीलीटर प्रति एकड़)", "100 ग्राम प्रति एकड़"
  const acreMatch = text.match(/(\d+(?:[\.–\-]\d+)?\s*(?:मिलीलीटर|एमएल|ml|ग्राम|gm|g|लीटर|L)\s*(?:प्रति|\/)?\s*(?:एकड़|बीघा))/i);
  if (acreMatch) {
    acreDosage = acreMatch[1].trim();
  }

  return { pumpDosage, acreDosage };
}

/**
 * Parses treatment lines into structured TreatmentItems
 */
function parseTreatmentLines(
  textBlock: string,
  type: 'chemical' | 'organic' | 'preventive' | 'general'
): TreatmentItem[] {
  if (!textBlock) return [];
  const lines = textBlock.split('\n');
  const items: TreatmentItem[] = [];
  let currentStep = 1;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Ignore intro / shop lines inside treatment section if they aren't steps
    if (line.startsWith('किसान भाइयों') || line.includes('दुकान पर उपलब्ध')) {
      continue;
    }

    // Check if line represents a step (numbered or bold bullet)
    const stepMatch = line.match(/^(?:(\d+)[\.\)]|\-|\*|•)?\s*(?:\*\*(.*?)\*\*|\b([^:]+)\b)\s*:\s*(.*)$/);

    if (stepMatch) {
      const explicitNum = stepMatch[1] ? parseInt(stepMatch[1], 10) : currentStep;
      const rawTitle = (stepMatch[2] || stepMatch[3] || '').trim();
      const rawDetails = (stepMatch[4] || '').trim();

      // Extract technical name if in parentheses
      let title = rawTitle;
      let technicalName: string | undefined;
      const techMatch = rawTitle.match(/^(.*?)\s*\((.*?)\)$/);
      if (techMatch) {
        title = techMatch[1].trim();
        technicalName = techMatch[2].trim();
      }

      const { pumpDosage, acreDosage } = extractDosageHighlights(rawDetails);
      const combinedDosage = [pumpDosage, acreDosage].filter(Boolean).join(' | ');

      items.push({
        id: `trt_${type}_${currentStep}`,
        stepNumber: explicitNum || currentStep,
        title: title || rawTitle,
        technicalName,
        dosage: combinedDosage || '',
        pumpDosage,
        acreDosage,
        instructions: rawDetails,
        type
      });
      currentStep++;
    } else {
      // Fallback: simple line
      const cleanLine = line.replace(/^(\d+[\.\)]|\-|\*|•)\s*/, '').trim();
      if (cleanLine.length > 5) {
        const { pumpDosage, acreDosage } = extractDosageHighlights(cleanLine);
        items.push({
          id: `trt_${type}_${currentStep}`,
          stepNumber: currentStep,
          title: cleanLine.length > 35 ? cleanLine.substring(0, 35) + '...' : cleanLine,
          dosage: [pumpDosage, acreDosage].filter(Boolean).join(' | '),
          pumpDosage,
          acreDosage,
          instructions: cleanLine,
          type
        });
        currentStep++;
      }
    }
  }

  return items;
}

/**
 * Main parser that translates the Gemini disease diagnosis text into
 * a strongly typed, structured representation for the UI.
 */
export function parseDiseaseReport(
  rawText: string,
  imageCount: number = 1,
  keywords: string[] = []
): ParsedDiseaseReport {
  const normalized = normalizeDiseaseText(rawText);

  if (!normalized) {
    return {
      isStructured: false,
      cropName: 'अज्ञात फसल',
      pestOrDiseaseType: 'जाँच परिणाम',
      specificName: 'फसल रोग रिपोर्ट',
      confidenceScore: 90,
      severity: 'सामान्य',
      severityCode: 'LOW',
      symptoms: [],
      causes: [],
      chemicalTreatments: [],
      organicTreatments: [],
      preventionTips: [],
      warnings: [],
      shopAdvisories: [],
      unparsedMarkdown: rawText
    };
  }

  // 1. Extract Crop Name
  let cropName = '';
  let cropScientificOrEng: string | undefined;
  const cropMatch = normalized.match(/(?:\*\*|#{1,4}\s*)(?:फसल का नाम|Crop Name)[\s\:\*]*([^\n]+)/i);
  if (cropMatch) {
    const rawCrop = cropMatch[1].trim();
    const bracketMatch = rawCrop.match(/^(.*?)\s*\((.*?)\)$/);
    if (bracketMatch) {
      cropName = bracketMatch[1].trim();
      cropScientificOrEng = bracketMatch[2].trim();
    } else {
      cropName = rawCrop;
    }
  }

  // 2. Extract Pest / Disease Type
  let pestOrDiseaseType = '';
  const typeMatch = normalized.match(/(?:\*\*|#{1,4}\s*)(?:बीमारी या कीट का प्रकार|कीट का प्रकार|रोग का प्रकार|कीट या रोग का प्रकार|Disease or Pest Type|Pest Type|Disease Type)[\s\:\*]*([^\n]+)/i);
  if (typeMatch) {
    pestOrDiseaseType = typeMatch[1].trim();
  }

  // 3. Extract Specific Name (Disease or Pest)
  let specificName = '';
  let scientificName: string | undefined;
  const specificMatch = normalized.match(/(?:\*\*|#{1,4}\s*)(?:विशिष्ट नाम|नाम|Specific Name|Disease Name|Pest Name)[\s\:\*]*([^\n]+)/i);
  if (specificMatch) {
    const rawSpecific = specificMatch[1].trim();
    const bracketMatch = rawSpecific.match(/^(.*?)\s*\((.*?)\)$/);
    if (bracketMatch) {
      specificName = bracketMatch[1].trim();
      scientificName = bracketMatch[2].trim();
    } else {
      specificName = rawSpecific;
    }
  }

  // Fallbacks if not extracted
  if (!specificName && keywords.length > 0) {
    specificName = keywords.slice(0, 2).join(', ');
  }
  if (!specificName) {
    specificName = 'फसल रोग एवं कीट समस्या';
  }
  if (!cropName) {
    cropName = 'फसल / पौधा';
  }
  if (!pestOrDiseaseType) {
    pestOrDiseaseType = 'रोग / कीट संक्रमण';
  }

  // 4. Extract Symptoms Block
  let symptoms: string[] = [];
  const symptomsBlockMatch = normalized.match(
    /(?:\*\*|#{1,4}\s*)(?:लक्षण|Symptoms)[\s\:\*]*([\s\S]*?)(?=\n\s*(?:\*\*|#{1,4}\s*)(?:अनुशंसित उपचार|उपचार|रासायनिक नियंत्रण|कारण|Treatment|Chemical Control)|\n\s*किसान भाइयों|$)/i
  );
  if (symptomsBlockMatch) {
    symptoms = extractBulletPoints(symptomsBlockMatch[1]);
  }

  // 5. Extract Possible Causes (if any)
  let causes: string[] = [];
  const causesBlockMatch = normalized.match(
    /(?:\*\*|#{1,4}\s*)(?:कारण|संभावित कारण|Causes|Possible Causes)[\s\:\*]*([\s\S]*?)(?=\n\s*(?:\*\*|#{1,4}\s*)(?:अनुशंसित उपचार|उपचार|लक्षण|रासायनिक नियंत्रण)|$)/i
  );
  if (causesBlockMatch) {
    causes = extractBulletPoints(causesBlockMatch[1]);
  }

  // 6. Extract Treatment Intro
  let treatmentIntro: string | undefined;
  const treatmentIntroMatch = normalized.match(
    /(?:\*\*|#{1,4}\s*)(?:अनुशंसित उपचार|उपचार|Recommended Treatment)[\s\:\*]*([^\n]+(?:\n[^\n\*\#]+)?)/i
  );
  if (treatmentIntroMatch) {
    const introCandidate = treatmentIntroMatch[1].trim();
    if (!introCandidate.startsWith('**') && !introCandidate.startsWith('#') && introCandidate.length > 10) {
      treatmentIntro = introCandidate;
    }
  }

  // 7. Extract Chemical Control Block
  let chemicalTreatments: TreatmentItem[] = [];
  const chemicalBlockMatch = normalized.match(
    /(?:\*\*|#{1,4}\s*)(?:रासायनिक नियंत्रण|Chemical Control|Chemical Treatment)[\s\:\*]*([\s\S]*?)(?=\n\s*(?:\*\*|#{1,4}\s*)(?:जैविक नियंत्रण|Organic Control|बचाव एवं सावधानियां|बचाव|सावधानियां|Prevention)|\n\s*अधिक जानकारी|$)/i
  );
  if (chemicalBlockMatch) {
    chemicalTreatments = parseTreatmentLines(chemicalBlockMatch[1], 'chemical');
  }

  // 8. Extract Organic Control Block
  let organicTreatments: TreatmentItem[] = [];
  const organicBlockMatch = normalized.match(
    /(?:\*\*|#{1,4}\s*)(?:जैविक नियंत्रण|Organic Control|जैविक उपचार)[\s\:\*]*([\s\S]*?)(?=\n\s*(?:\*\*|#{1,4}\s*)(?:बचाव एवं सावधानियां|बचाव|सावधानियां|Prevention)|\n\s*अधिक जानकारी|$)/i
  );
  if (organicBlockMatch) {
    organicTreatments = parseTreatmentLines(organicBlockMatch[1], 'organic');
  }

  // Fallback: If neither Chemical nor Organic subheadings were present, parse general treatment block
  if (chemicalTreatments.length === 0 && organicTreatments.length === 0) {
    const generalTreatmentMatch = normalized.match(
      /(?:\*\*|#{1,4}\s*)(?:अनुशंसित उपचार|उपचार|Recommended Treatment|Treatment)[\s\:\*]*([\s\S]*?)(?=\n\s*(?:\*\*|#{1,4}\s*)(?:बचाव एवं सावधानियां|बचाव|सावधानियां|Prevention)|\n\s*अधिक जानकारी|$)/i
    );
    if (generalTreatmentMatch) {
      chemicalTreatments = parseTreatmentLines(generalTreatmentMatch[1], 'chemical');
    }
  }

  // 9. Extract Prevention & Precautions Block
  let preventionTips: string[] = [];
  const preventionBlockMatch = normalized.match(
    /(?:\*\*|#{1,4}\s*)(?:बचाव एवं सावधानियां|बचाव|सावधानियां|रोकथाम|Prevention & Precautions|Prevention)[\s\:\*]*([\s\S]*?)(?=\n\s*अधिक जानकारी|\n\s*दुकान का समय|$)/i
  );
  if (preventionBlockMatch) {
    preventionTips = extractBulletPoints(preventionBlockMatch[1]);
  }

  // 10. Extract Shop Advisory & Timings
  let shopAdvisories: string[] = [];
  const shopMatch = normalized.match(/(?:अधिक जानकारी और उच्च गुणवत्ता वाले कृषि उत्पादों के लिए हमारी दुकान[\s\S]*?(?:शामगढ़|8:00 PM|458883)[^\n]*)/i);
  if (shopMatch) {
    shopAdvisories.push(shopMatch[0].trim());
  }

  // 11. Extract Warnings / Spray Precautions
  const warnings: string[] = [];
  const sprayPrecaution = preventionTips.find(p => p.includes('छिड़काव') && (p.includes('सुबह') || p.includes('हवा')));
  if (sprayPrecaution) {
    warnings.push(sprayPrecaution);
  }

  // 12. Calculate Severity & SeverityCode
  let severity: 'सामान्य' | 'मध्यम' | 'गंभीर' | 'अति गंभीर' = 'मध्यम';
  let severityCode: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

  const lower = normalized.toLowerCase();
  if (lower.includes('अति गंभीर') || lower.includes('गंभीर नुकसान') || lower.includes('तुरंत छिड़काव')) {
    severity = 'गंभीर';
    severityCode = 'HIGH';
  } else if (lower.includes('हल्का') || lower.includes('शुरुआती') || lower.includes('प्रारंभिक')) {
    severity = 'सामान्य';
    severityCode = 'LOW';
  } else {
    severity = 'मध्यम';
    severityCode = 'MEDIUM';
  }

  // 13. Confidence Score calculation
  let confidenceScore = 95;
  const confMatch = normalized.match(/(?:सटीकता|विश्वसनीयता|Confidence)[\s\:\*]*(\d{2})%/i);
  if (confMatch) {
    confidenceScore = parseInt(confMatch[1], 10);
  } else {
    // Multi-photo increases confidence
    confidenceScore = imageCount >= 2 ? 97 : 94;
  }

  const isStructured = (symptoms.length > 0 || chemicalTreatments.length > 0 || organicTreatments.length > 0);

  return {
    isStructured,
    cropName,
    cropScientificOrEng,
    pestOrDiseaseType,
    specificName,
    scientificName,
    confidenceScore,
    severity,
    severityCode,
    summary: `${cropName} में ${specificName} (${pestOrDiseaseType}) के विशिष्ट लक्षण पाए गए हैं।`,
    symptoms,
    causes,
    treatmentIntro,
    chemicalTreatments,
    organicTreatments,
    preventionTips,
    warnings,
    shopAdvisories,
    unparsedMarkdown: !isStructured ? normalized : undefined
  };
}
