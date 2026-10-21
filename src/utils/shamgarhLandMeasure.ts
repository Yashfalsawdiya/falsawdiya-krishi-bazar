/**
 * Shamgarh Land Measurement & Agricultural Conversion Utility
 * 
 * Standards for Shamgarh, Tehsil Shamgarh, Dist. Mandsaur, Madhya Pradesh (458883):
 * - 1 Pucca Bigha = 55 yards x 55 yards = 3,025 sq yards = 27,225 sq ft = 2,529.29 sq meters
 * - 1 Pucca Bigha = 20 Biswa (1 Biswa = 1,361.25 sq ft = 151.25 sq yards)
 * - 1 Acre = 43,560 sq ft = 1.60 Pucca Bigha (Exact integer decimal: 1 Bigha 12 Biswa)
 * - 1 Hectare = 10,000 sq meters = 1,07,639 sq ft ≈ 3.9537 Pucca Bigha (~3.95 Bigha, colloquially ~4 Bigha)
 * - 1 Kaccha Bigha = 9,075 sq ft (1 Pucca Bigha = 3 Kaccha Bigha)
 */

export type LandUnitId = 'shamgarh_pucca_bigha' | 'acre' | 'hectare' | 'kaccha_bigha' | 'biswa';

export interface LandUnitConfig {
  unitId: LandUnitId;
  nameHi: string;
  shortLabel: string;
  sqFt: number;
  sqMeters: number;
  ratioToPuccaBigha: number; // multiplier to convert 1 Pucca Bigha to this unit
  biswaPerUnit: number;
  description: string;
}

export const SHAMGARH_LAND_UNITS: Record<LandUnitId, LandUnitConfig> = {
  shamgarh_pucca_bigha: {
    unitId: 'shamgarh_pucca_bigha',
    nameHi: 'शामगढ़ पक्का बीघा (मानक)',
    shortLabel: 'पक्का बीघा',
    sqFt: 27225,
    sqMeters: 2529.29,
    ratioToPuccaBigha: 1.0,
    biswaPerUnit: 20,
    description: '1 बीघा = 27,225 वर्ग फीट (20 बिस्वा) | 1 एकड़ = 1.60 बीघा'
  },
  acre: {
    unitId: 'acre',
    nameHi: 'एकड़ (Acre)',
    shortLabel: 'एकड़',
    sqFt: 43560,
    sqMeters: 4046.86,
    ratioToPuccaBigha: 0.625, // 1 Pucca Bigha = 0.625 Acre (5/8 Acre)
    biswaPerUnit: 32,
    description: '1 एकड़ = 43,560 वर्ग फीट (1.60 शामगढ़ पक्का बीघा)'
  },
  hectare: {
    unitId: 'hectare',
    nameHi: 'हेक्टेयर (Hectare)',
    shortLabel: 'हेक्टेयर',
    sqFt: 107639,
    sqMeters: 10000,
    ratioToPuccaBigha: 0.2529, // 1 Pucca Bigha = ~0.2529 Hectare
    biswaPerUnit: 79.07,
    description: '1 हेक्टेयर = 10,000 वर्ग मीटर (≈ 3.95 शामगढ़ पक्का बीघा)'
  },
  kaccha_bigha: {
    unitId: 'kaccha_bigha',
    nameHi: 'कच्चा बीघा (पारंपरिक)',
    shortLabel: 'कच्चा बीघा',
    sqFt: 9075,
    sqMeters: 843.1,
    ratioToPuccaBigha: 3.0, // 1 Pucca Bigha = 3 Kaccha Bigha
    biswaPerUnit: 20,
    description: '1 पक्का बीघा = 3 कच्चा बीघा (लगभग 9,075 वर्ग फीट)'
  },
  biswa: {
    unitId: 'biswa',
    nameHi: 'बिस्वा (Biswa)',
    shortLabel: 'बिस्वा',
    sqFt: 1361.25,
    sqMeters: 126.46,
    ratioToPuccaBigha: 20, // 1 Pucca Bigha = 20 Biswa
    biswaPerUnit: 1,
    description: '1 बिस्वा = 1,361.25 वर्ग फीट (151.25 वर्ग गज)'
  }
};

export const SHAMGARH_BYSWA_SQFT = 1361.25;
export const SHAMGARH_PUCCA_BIGHA_SQFT = 27225;
export const SHAMGARH_PUCCA_BIGHA_SQM = 2529.29;
export const ACRE_SQFT = 43560;
export const HECTARE_SQM = 10000;

export const SHAMGARH_BIGHA_ASSUMPTION_NOTE =
  "मात्रा की गणना शामगढ़ क्षेत्र के पक्का बीघा माप (1 बीघा = 27,225 वर्ग फीट, 1 एकड़ = 1.60 बीघा) के अनुसार की गई है।";

/**
 * Convert area from one land unit to another
 */
export function convertLandArea(value: number, fromUnit: LandUnitId, toUnit: LandUnitId): number {
  if (fromUnit === toUnit || isNaN(value) || value <= 0) return value;
  
  const fromConfig = SHAMGARH_LAND_UNITS[fromUnit];
  const toConfig = SHAMGARH_LAND_UNITS[toUnit];
  if (!fromConfig || !toConfig) return value;

  // Convert to square feet first, then to target unit
  const totalSqFt = value * fromConfig.sqFt;
  const result = totalSqFt / toConfig.sqFt;

  return Math.round(result * 1000) / 1000;
}

/**
 * Formats bigha count into "X बीघा Y बिस्वा" format
 */
export function formatBighaAndBiswa(totalBighas: number): { bighas: number; biswa: number; formatted: string } {
  if (isNaN(totalBighas) || totalBighas <= 0) {
    return { bighas: 0, biswa: 0, formatted: '0 बीघा' };
  }
  const wholeBighas = Math.floor(totalBighas);
  const remainingBiswa = Math.round((totalBighas - wholeBighas) * 20);

  let formatted = `${wholeBighas} बीघा`;
  if (remainingBiswa > 0) {
    formatted += ` ${remainingBiswa} बिस्वा`;
  }
  return { bighas: wholeBighas, biswa: remainingBiswa, formatted };
}

/**
 * Convert Acre dosage to Shamgarh Pucca Bigha dosage
 * Since 1 Acre = 1.60 Pucca Bigha, Bigha dose = Acre dose / 1.60
 */
export function convertAcreDoseToPuccaBigha(acreDose: number): number {
  return Math.round((acreDose / 1.60) * 100) / 100;
}

/**
 * Convert Pucca Bigha dosage to Acre dosage
 * Acre dose = Pucca Bigha dose * 1.60
 */
export function convertPuccaBighaDoseToAcre(bighaDose: number): number {
  return Math.round((bighaDose * 1.60) * 100) / 100;
}

/**
 * Convert Hectare dosage to Shamgarh Pucca Bigha dosage
 * Since 1 Hectare ≈ 3.9537 Pucca Bigha, Bigha dose = Hectare dose / 3.9537
 */
export function convertHectareDoseToPuccaBigha(hectareDose: number): number {
  return Math.round((hectareDose / 3.9537) * 100) / 100;
}

/**
 * Parses numeric dosage from a text string (e.g. "250 ml", "1.5 kg", "80-100 मिली")
 * and scales it by unit ratio (Acre/Hectare/Kaccha Bigha)
 */
export function scaleDoseString(originalText: string, targetUnit: LandUnitId): string {
  if (!originalText || originalText === 'N/A' || originalText.includes('उपलब्ध नहीं') || originalText.includes('अनुसार')) {
    return originalText;
  }

  // Ratio relative to Shamgarh Pucca Bigha (base 1.0)
  let ratio = 1.0;
  if (targetUnit === 'acre') {
    ratio = 1.60; // 1 Acre is 1.60 Pucca Bighas
  } else if (targetUnit === 'hectare') {
    ratio = 3.9537; // 1 Hectare is 3.9537 Pucca Bighas
  } else if (targetUnit === 'kaccha_bigha') {
    ratio = 1 / 3.0; // 1 Kaccha Bigha is 1/3 of a Pucca Bigha
  } else if (targetUnit === 'biswa') {
    ratio = 1 / 20.0;
  }

  if (ratio === 1.0) return originalText;

  // Handle range like "80 - 100 ml" or "80-100 मिली"
  const rangeMatch = originalText.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(.*)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    const suffix = rangeMatch[3].trim();
    if (!isNaN(low) && !isNaN(high)) {
      const scaledLow = Math.round(low * ratio * 10) / 10;
      const scaledHigh = Math.round(high * ratio * 10) / 10;
      return `${scaledLow} - ${scaledHigh} ${suffix}`.trim();
    }
  }

  // Handle single number like "250 मिली" or "5 kg"
  const singleMatch = originalText.match(/(\d+(?:\.\d+)?)\s*(.*)/);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    const suffix = singleMatch[2].trim();
    if (!isNaN(val)) {
      const scaledVal = Math.round(val * ratio * 10) / 10;
      return `${scaledVal} ${suffix}`.trim();
    }
  }

  return originalText;
}

/**
 * Calculate recommended spray pumps and water for given Bigha area
 * Standard recommendation: 80 - 100 Liters of water per Shamgarh Pucca Bigha
 * i.e. 5 pumps of 16L or 4 to 5 pumps of 20L per Bigha
 */
export function calculateSprayerRequirements(bighaCount: number, pumpCapacity: 15 | 16 | 20 | 25 = 16) {
  const waterLitersMin = Math.round(bighaCount * 80);
  const waterLitersMax = Math.round(bighaCount * 100);
  const pumpsMin = Math.ceil(waterLitersMin / pumpCapacity);
  const pumpsMax = Math.ceil(waterLitersMax / pumpCapacity);

  return {
    bighaCount,
    waterLitersMin,
    waterLitersMax,
    pumpsMin,
    pumpsMax,
    pumpCapacity
  };
}
