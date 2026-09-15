export interface TreatmentItem {
  id: string;
  stepNumber: number;
  title: string;
  technicalName?: string;
  dosage: string;
  pumpDosage?: string;
  acreDosage?: string;
  instructions: string;
  type: 'chemical' | 'organic' | 'preventive' | 'general';
}

export interface ParsedDiseaseReport {
  isStructured: boolean;
  cropName: string;
  cropScientificOrEng?: string;
  pestOrDiseaseType: string;
  specificName: string;
  scientificName?: string;
  confidenceScore: number; // e.g. 95
  severity: 'सामान्य' | 'मध्यम' | 'गंभीर' | 'अति गंभीर';
  severityCode: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary?: string;
  symptoms: string[];
  causes: string[];
  treatmentIntro?: string;
  chemicalTreatments: TreatmentItem[];
  organicTreatments: TreatmentItem[];
  preventionTips: string[];
  warnings: string[];
  shopAdvisories: string[];
  unparsedMarkdown?: string;
}
