import { AccountingProduct, PackagingVariant, SizeUnit, PackagingType, StockBatch } from '../types/accounting';

/**
 * Normalizes any package size into base units (ml for liquids, g for solids/powders).
 */
export function normalizeToBaseUnit(sizeValue: number, sizeUnit: string): number {
  const val = Number(sizeValue) || 0;
  const unit = sizeUnit.toLowerCase().trim();

  if (unit === 'ltr' || unit === 'l' || unit === 'लीटर') {
    return val * 1000;
  }
  if (unit === 'kg' || unit === 'किलो' || unit === 'किग्रा') {
    return val * 1000;
  }
  if (unit === 'ml' || unit === 'मिली' || unit === 'मिलीलीटर') {
    return val;
  }
  if (unit === 'g' || unit === 'gram' || unit === 'ग्राम') {
    return val;
  }
  return val;
}

/**
 * Formats base units into human-friendly bilingual display strings.
 */
export function formatBaseUnitDisplay(baseQty: number, baseUnit: 'ml' | 'g' | string): string {
  const qty = Number(baseQty) || 0;
  if (baseUnit === 'ml') {
    if (qty >= 1000) {
      const ltr = (qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 2);
      return `${ltr} Ltr (${qty} ml)`;
    }
    return `${qty} ml`;
  } else if (baseUnit === 'g') {
    if (qty >= 1000) {
      const kg = (qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 2);
      return `${kg} kg (${qty} g)`;
    }
    return `${qty} g`;
  }
  return `${qty} ${baseUnit}`;
}

/**
 * Multi-tier Expiry Alert Engine.
 * Monitors batches and variants with 4-month (122 days) advance warning.
 */
export interface ExpiryAlertResult {
  status: 'expired' | 'critical' | 'warning' | 'fresh' | 'no_date';
  daysRemaining: number;
  labelHindi: string;
  badgeClass: string;
  isSaleable: boolean;
}

export function calculateExpiryAlert(expiryDateStr?: string): ExpiryAlertResult {
  if (!expiryDateStr || !expiryDateStr.trim()) {
    return {
      status: 'no_date',
      daysRemaining: 9999,
      labelHindi: 'तिथि उपलब्ध नहीं',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      isSaleable: true,
    };
  }

  try {
    const expDate = new Date(expiryDateStr);
    if (isNaN(expDate.getTime())) {
      return {
        status: 'no_date',
        daysRemaining: 9999,
        labelHindi: 'अमान्य तारीख',
        badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
        isSaleable: true,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);

    const diffMs = expDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return {
        status: 'expired',
        daysRemaining,
        labelHindi: `समय सीमा समाप्त (Expired, ${Math.abs(daysRemaining)} दिन पहले)`,
        badgeClass: 'bg-red-50 text-red-700 border-red-200 font-bold',
        isSaleable: false, // Blocked from standard sale!
      };
    }

    if (daysRemaining <= 30) {
      return {
        status: 'critical',
        daysRemaining,
        labelHindi: `अत्यंत निकट एक्सपायरी (${daysRemaining} दिन शेष)`,
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 font-bold',
        isSaleable: true,
      };
    }

    if (daysRemaining <= 122) { // 4 months
      const months = Math.ceil(daysRemaining / 30);
      return {
        status: 'warning',
        daysRemaining,
        labelHindi: `4 माह में एक्सपायरी (${daysRemaining} दिन / लगभग ${months} माह)`,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
        isSaleable: true,
      };
    }

    return {
      status: 'fresh',
      daysRemaining,
      labelHindi: `मान्य (${daysRemaining} दिन शेष)`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      isSaleable: true,
    };
  } catch {
    return {
      status: 'no_date',
      daysRemaining: 9999,
      labelHindi: 'तिथि उपलब्ध नहीं',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      isSaleable: true,
    };
  }
}

/**
 * Formats a packaging variant label strictly adhering to invoice specifications:
 * e.g. "100ml Bottle", "250ml Bottle", "1L Bottle", "1kg Bag", "45kg Bag", "250g Pouch", "500g Pack", "100g", "250ml"
 */
export function formatPackagingVariantString(params: {
  sizeValue?: number;
  sizeUnit?: string;
  packagingType?: string;
  variantLabel?: string;
}): string {
  const { sizeValue, sizeUnit, packagingType, variantLabel } = params;

  if (sizeValue !== undefined && sizeValue > 0 && sizeUnit) {
    const uLower = sizeUnit.toLowerCase().trim();
    let displayUnit = sizeUnit;
    if (uLower === 'ltr' || uLower === 'l' || uLower === 'लीटर') {
      displayUnit = 'L';
    } else if (uLower === 'ml' || uLower === 'मिली') {
      displayUnit = 'ml';
    } else if (uLower === 'kg' || uLower === 'किलो' || uLower === 'किग्रा') {
      displayUnit = 'kg';
    } else if (uLower === 'g' || uLower === 'gm' || uLower === 'gram' || uLower === 'ग्राम') {
      displayUnit = 'g';
    }

    const sizeStr = `${sizeValue}${displayUnit}`;

    // Check packaging type
    const validPackTypes = ['Bottle', 'Bag', 'Pouch', 'Pack', 'Packet', 'Can', 'Drum', 'Box'];
    let cleanPackType = (packagingType || '').trim();
    if (/बोतल/i.test(cleanPackType)) cleanPackType = 'Bottle';
    else if (/कट्टा|बोरी/i.test(cleanPackType)) cleanPackType = 'Bag';
    else if (/पाउच|थैली/i.test(cleanPackType)) cleanPackType = 'Pouch';
    else if (/पैकेट/i.test(cleanPackType)) cleanPackType = 'Packet';
    else if (/केन/i.test(cleanPackType)) cleanPackType = 'Can';
    else if (/ड्रम/i.test(cleanPackType)) cleanPackType = 'Drum';
    else if (/डिब्बा/i.test(cleanPackType)) cleanPackType = 'Box';

    const isRecognized = validPackTypes.some(t => t.toLowerCase() === cleanPackType.toLowerCase());

    if (isRecognized && cleanPackType.toLowerCase() !== displayUnit.toLowerCase() && cleanPackType.toLowerCase() !== 'piece' && cleanPackType.toLowerCase() !== 'unit') {
      const capitalized = cleanPackType.charAt(0).toUpperCase() + cleanPackType.slice(1);
      return `${sizeStr} ${capitalized}`;
    }

    return sizeStr;
  }

  // Fallback to variantLabel if provided
  if (variantLabel && variantLabel.trim() && !variantLabel.startsWith('var_')) {
    let clean = variantLabel.replace(/[()]/g, '').trim();
    clean = clean.replace(/(\d+(?:\.\d+)?)\s*(ml|मिली)/i, '$1ml');
    clean = clean.replace(/(\d+(?:\.\d+)?)\s*(ltr|l|लीटर)/i, '$1L');
    clean = clean.replace(/(\d+(?:\.\d+)?)\s*(kg|किलो|किग्रा)/i, '$1kg');
    clean = clean.replace(/(\d+(?:\.\d+)?)\s*(g|gm|gram|ग्राम)/i, '$1g');
    return clean;
  }

  return '';
}

/**
 * Formats line item title for Generated Bill / Invoice:
 * Examples:
 * - Pack items:
 *   "Command Super - 1L Bottle"
 *   "Curacron - 500ml Bottle"
 *   "Rocket - 100ml Bottle"
 *   "Rocket - 250ml Bottle"
 *   "Volax - 100g"
 * - Loose items:
 *   "Volax - 100g (Loose)"
 *   "Emamectin - 50g (Loose)"
 */
export function formatSaleItemInvoiceTitle(item: {
  name?: string;
  hindiName?: string;
  saleType?: string;
  looseQuantity?: number;
  looseUnit?: string;
  quantity?: number;
  unit?: string;
  variantLabel?: string;
  variantName?: string;
  packSizeValue?: number;
  packSizeUnit?: string;
  packagingType?: string;
  packSize?: number;
  packUnit?: string;
}): string {
  if (!item) return '';

  // 1. Determine base product name
  const rawName = (item.name || item.hindiName || 'उत्पाद').trim();

  // 2. Loose Sale
  if (item.saleType === 'loose') {
    const looseQty = item.looseQuantity || item.quantity || 1;
    const looseUnit = item.looseUnit || item.unit || 'g';
    
    if (rawName.toLowerCase().includes('(loose)') || rawName.includes('खुला')) {
      return rawName;
    }

    const cleanBaseName = rawName.replace(/\s*-\s*(\d+.*)?$/, '').trim();
    return `${cleanBaseName} - ${looseQty}${looseUnit} (Loose)`;
  }

  // 3. Pack Sale
  const sizeVal = item.packSizeValue ?? item.packSize;
  const sizeUnit = item.packSizeUnit ?? item.packUnit;
  const packType = item.packagingType;
  const vLabel = item.variantLabel || item.variantName;

  let packagingStr = formatPackagingVariantString({
    sizeValue: sizeVal,
    sizeUnit: sizeUnit,
    packagingType: packType,
    variantLabel: vLabel,
  });

  // If still empty, attempt to extract from item.unit (e.g. "500ml Bottle", "100g", "1L")
  if (!packagingStr && item.unit) {
    const unitStr = item.unit.trim();
    const unitMatch = unitStr.match(/(\d+(?:\.\d+)?)\s*(ml|मिली|ltr|l|लीटर|kg|किलो|किग्रा|g|gm|gram|ग्राम)\b/i);
    if (unitMatch) {
      const pVal = parseFloat(unitMatch[1]);
      const pUnit = unitMatch[2];
      const pType = /bottle|बोतल/i.test(unitStr) ? 'Bottle' : (/bag|बोरी|कट्टा/i.test(unitStr) ? 'Bag' : (/pouch|पाउच/i.test(unitStr) ? 'Pouch' : undefined));
      packagingStr = formatPackagingVariantString({ sizeValue: pVal, sizeUnit: pUnit, packagingType: pType });
    }
  }

  // If still empty, attempt to extract from rawName (e.g. "Curacron 500ml")
  if (!packagingStr) {
    const nameMatch = rawName.match(/(\d+(?:\.\d+)?)\s*(ml|मिली|ltr|l|लीटर|kg|किलो|किग्रा|g|gm|gram|ग्राम)\b/i);
    if (nameMatch) {
      const pVal = parseFloat(nameMatch[1]);
      const pUnit = nameMatch[2];
      const pType = item.packagingType || (item.unit && /bottle|बोतल/i.test(item.unit) ? 'Bottle' : undefined);
      packagingStr = formatPackagingVariantString({ sizeValue: pVal, sizeUnit: pUnit, packagingType: pType });
    }
  }

  // If no packaging found at all, return rawName
  if (!packagingStr) {
    return rawName;
  }

  // Clean rawName so it doesn't already duplicate the packaging string
  let cleanBaseName = rawName.replace(/\s*-\s*.*$/, '').trim();
  const firstToken = packagingStr.split(' ')[0];
  if (firstToken) {
    const regexTrailingSize = new RegExp(`\\s+${firstToken}\\b.*$`, 'i');
    cleanBaseName = cleanBaseName.replace(regexTrailingSize, '').trim();
  }

  return `${cleanBaseName} - ${packagingStr}`;
}

/**
 * Synthesizes packaging variants for existing legacy products
 * ensuring 100% backward compatibility without data migration.
 */
export function getProductVariants(product: AccountingProduct): PackagingVariant[] {
  if (product.packagingVariants && product.packagingVariants.length > 0) {
    return product.packagingVariants;
  }

  // Fallback: generate a virtual single variant from legacy fields
  const unit = (product.unit || 'Bottle') as string;
  let sizeUnit: SizeUnit = 'Piece';
  let packType: PackagingType = 'Bottle';
  let sizeValue = 1;

  // Scan product.unit, product.name, product.hindiName for size and packaging type
  const textToScan = `${unit} ${product.name || ''} ${product.hindiName || ''}`;
  const sizeMatch = textToScan.match(/(\d+(?:\.\d+)?)\s*(ml|मिली|ltr|l|लीटर|kg|किलो|किग्रा|g|gm|gram|ग्राम)\b/i);

  if (sizeMatch) {
    sizeValue = parseFloat(sizeMatch[1]);
    const u = sizeMatch[2].toLowerCase();
    if (u === 'ml' || u === 'मिली') {
      sizeUnit = 'ml';
      packType = 'Bottle';
    } else if (u === 'ltr' || u === 'l' || u === 'लीटर') {
      sizeUnit = 'Ltr';
      packType = 'Bottle';
    } else if (u === 'kg' || u === 'किलो' || u === 'किग्रा') {
      sizeUnit = 'kg';
      packType = sizeValue >= 10 ? 'Bag' : 'Packet';
    } else if (u === 'g' || u === 'gm' || u === 'gram' || u === 'ग्राम') {
      sizeUnit = 'g';
      packType = 'Packet';
    }
  } else {
    const uLower = unit.toLowerCase();
    if (uLower.includes('ltr') || uLower.includes('लीटर')) {
      sizeUnit = 'Ltr';
      packType = 'Bottle';
    } else if (uLower.includes('ml') || uLower.includes('मिली')) {
      sizeUnit = 'ml';
      packType = 'Bottle';
    } else if (uLower.includes('kg') || uLower.includes('किलो')) {
      sizeUnit = 'kg';
      packType = 'Bag';
    } else if (uLower.includes('gram') || uLower.includes('ग्राम') || uLower === 'g') {
      sizeUnit = 'g';
      packType = 'Packet';
    } else if (uLower.includes('packet') || uLower.includes('पैकेट')) {
      sizeUnit = 'Piece';
      packType = 'Packet';
    } else if (uLower.includes('bag') || uLower.includes('बोरी') || uLower.includes('कट्टा')) {
      sizeUnit = 'Piece';
      packType = 'Bag';
    }
  }

  // Check explicit container keywords
  if (/bottle|बोतल/i.test(textToScan)) packType = 'Bottle';
  else if (/bag|बोरी|कट्टा/i.test(textToScan)) packType = 'Bag';
  else if (/pouch|पाउच|थैली/i.test(textToScan)) packType = 'Pouch';
  else if (/can|केन/i.test(textToScan)) packType = 'Can';
  else if (/drum|ड्रम/i.test(textToScan)) packType = 'Drum';
  else if (/box|डिब्बा/i.test(textToScan)) packType = 'Box';
  else if (/packet|पैकेट/i.test(textToScan)) packType = 'Packet';

  const label = formatPackagingVariantString({ sizeValue, sizeUnit, packagingType: packType }) || `${sizeValue} ${unit}`;

  return [{
    id: `var_default_${product.id}`,
    sizeValue,
    sizeUnit,
    packagingType: packType,
    label,
    baseQuantity: normalizeToBaseUnit(sizeValue, sizeUnit),
    costPrice: product.costPrice || 0,
    sellingPrice: product.defaultSellingPrice || product.costPrice || 0,
    currentStockPacks: product.currentStock || 0,
    minStockAlertPacks: product.minStockAlert || 5,
    allowLooseSale: sizeUnit === 'Ltr' || sizeUnit === 'kg' || sizeUnit === 'ml' || sizeUnit === 'g',
  }];
}

/**
 * Calculates total equivalent volume or weight across all sealed packs + open stock.
 */
export function calculateTotalEquivalentStock(product: AccountingProduct): {
  totalBaseQty: number;
  baseUnit: 'ml' | 'g' | 'units';
  displayString: string;
} {
  const variants = getProductVariants(product);
  let totalBaseQty = 0;
  let detectedBaseUnit: 'ml' | 'g' | 'units' = 'units';

  for (const v of variants) {
    const baseUnit = v.sizeUnit === 'Ltr' || v.sizeUnit === 'ml' ? 'ml' : (v.sizeUnit === 'kg' || v.sizeUnit === 'g' ? 'g' : 'units');
    if (baseUnit !== 'units') {
      detectedBaseUnit = baseUnit;
    }
    const perPackBase = v.baseQuantity || normalizeToBaseUnit(v.sizeValue, v.sizeUnit);
    totalBaseQty += (v.currentStockPacks || 0) * perPackBase;
  }

  if (product.looseStock?.availableBaseQty) {
    totalBaseQty += product.looseStock.availableBaseQty;
    if (product.looseStock.baseUnit) {
      detectedBaseUnit = product.looseStock.baseUnit;
    }
  }

  return {
    totalBaseQty,
    baseUnit: detectedBaseUnit,
    displayString: formatBaseUnitDisplay(totalBaseQty, detectedBaseUnit),
  };
}

/**
 * Formats pack count and pack size into an elegant equivalent quantity string.
 * e.g.
 * 1 x 500 ml Bottle -> "500 ml"
 * 3 x 500 ml Bottle -> "1.5 L (1500 ml)"
 * 1 x 250 g Packet -> "250 g"
 * 4 x 250 g Packet -> "1 kg (1000 g)"
 * 1 x 3 kg Bag -> "3 kg"
 */
export function formatPackEquivalent(packCount: number, sizeValue?: number, sizeUnit?: string): string {
  if (!sizeValue || !sizeUnit) return '';
  const totalVal = packCount * sizeValue;
  const unitLower = sizeUnit.toLowerCase().trim();

  if (unitLower === 'ml' || unitLower === 'मिली') {
    if (totalVal >= 1000) {
      const ltr = (totalVal / 1000).toFixed(totalVal % 1000 === 0 ? 0 : 2);
      return `${ltr} Ltr (${totalVal} ml)`;
    }
    return `${totalVal} ml`;
  }
  if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'ग्राम') {
    if (totalVal >= 1000) {
      const kg = (totalVal / 1000).toFixed(totalVal % 1000 === 0 ? 0 : 2);
      return `${kg} kg (${totalVal} g)`;
    }
    return `${totalVal} g`;
  }
  if (unitLower === 'ltr' || unitLower === 'l' || unitLower === 'लीटर') {
    return `${totalVal} Ltr`;
  }
  if (unitLower === 'kg' || unitLower === 'किलो' || unitLower === 'किग्रा') {
    return `${totalVal} kg`;
  }
  return `${totalVal} ${sizeUnit}`;
}

/**
 * Supported units and denominators for loose sale rate inputs.
 */
export interface LooseRateUnitOption {
  label: string; // "10 g", "100 g", "1 kg", "1 g" or "10 ml", "100 ml", "1 L", "1 ml"
  multiplier: number; // 10, 100, 1000, 1
  baseUnit: 'g' | 'ml';
}

export function getLooseRateOptions(baseUnit: 'g' | 'ml' | string): LooseRateUnitOption[] {
  const isLiquid = baseUnit === 'ml' || baseUnit === 'Ltr' || baseUnit === 'l' || baseUnit === 'लीटर' || baseUnit === 'मिली';
  if (isLiquid) {
    return [
      { label: '10 ml', multiplier: 10, baseUnit: 'ml' },
      { label: '100 ml', multiplier: 100, baseUnit: 'ml' },
      { label: '1 L', multiplier: 1000, baseUnit: 'ml' },
      { label: '1 ml', multiplier: 1, baseUnit: 'ml' },
    ];
  }
  return [
    { label: '1 kg', multiplier: 1000, baseUnit: 'g' },
    { label: '500 g', multiplier: 500, baseUnit: 'g' },
    { label: '100 g', multiplier: 100, baseUnit: 'g' },
    { label: '50 g', multiplier: 50, baseUnit: 'g' },
    { label: '10 g', multiplier: 10, baseUnit: 'g' },
    { label: '1 g', multiplier: 1, baseUnit: 'g' },
  ];
}

export interface ProductPhysicalCategoryResult {
  physicalType: 'liquid' | 'solid' | 'seed';
  baseUnit: 'ml' | 'g';
  allowedUnits: Array<{
    unit: string;
    label: string;
    multiplierToBase: number;
  }>;
  defaultUnit: string;
  primaryDoseMode: 'pump' | 'bigha';
  supportsPumpDose: boolean;
  supportsBighaDose: boolean;
}

/**
 * Intelligently analyzes a product's Category, Form, Physical State,
 * Packaging Unit, and Variants to determine physical category and allowed loose units.
 */
export function detectProductPhysicalCategory(product: AccountingProduct): ProductPhysicalCategoryResult {
  if (!product) {
    return {
      physicalType: 'solid',
      baseUnit: 'g',
      allowedUnits: [
        { unit: 'g', label: 'g (ग्राम)', multiplierToBase: 1 },
        { unit: 'kg', label: 'kg (किलो)', multiplierToBase: 1000 },
      ],
      defaultUnit: 'g',
      primaryDoseMode: 'bigha',
      supportsPumpDose: true,
      supportsBighaDose: true,
    };
  }

  const categoryLower = (product.category || '').toLowerCase();
  const unitLower = (product.unit || '').toLowerCase();
  const productType = product.productType;
  const variants = getProductVariants(product);
  const textToScan = `${product.name || ''} ${product.hindiName || ''} ${unitLower}`.toLowerCase();

  // 1. Check if explicitly Seed
  const isSeed = categoryLower === 'seeds' || categoryLower === 'seed' || /बीज|seed|hybrid\s*seed/i.test(textToScan);
  if (isSeed) {
    const hasPacketVariant = variants.some(v => v.packagingType === 'Packet' || v.packagingType === 'Pouch');
    const allowedUnits = [
      { unit: 'kg', label: 'kg (किलो)', multiplierToBase: 1000 },
      { unit: 'g', label: 'g (ग्राम)', multiplierToBase: 1 },
    ];
    if (hasPacketVariant) {
      allowedUnits.push({ unit: 'packet', label: 'Packet (पैकेट)', multiplierToBase: 0 });
    }
    return {
      physicalType: 'seed',
      baseUnit: 'g',
      allowedUnits,
      defaultUnit: 'kg',
      primaryDoseMode: 'bigha',
      supportsPumpDose: false,
      supportsBighaDose: true,
    };
  }

  // 2. Liquid Detection:
  // Check variants, unit, productType, or formulation keywords
  const hasLiquidVariant = variants.some(v => 
    v.sizeUnit === 'ml' || v.sizeUnit === 'Ltr' || 
    v.packagingType === 'Bottle' || v.packagingType === 'Can' || v.packagingType === 'Drum'
  );

  const isLiquidUnit = /ltr|l|लीटर|ml|मिली|bottle|बोतल|can|केन|drum|ड्रम/.test(unitLower);
  const isLiquidKeyword = /ec\b|sl\b|sc\b|fs\b|oil\b|syrup|liquid|तरल|लिक्विड/.test(textToScan);
  const isLiquid = productType === 'liquid' || hasLiquidVariant || isLiquidUnit || (isLiquidKeyword && !/wp|wdg|sp|gr\b|दानेदार/.test(textToScan));

  if (isLiquid) {
    const primaryVariant = variants[0];
    const isLargePack = primaryVariant ? (primaryVariant.sizeUnit === 'Ltr' || primaryVariant.baseQuantity >= 1000) : (unitLower.includes('ltr') || unitLower.includes('l'));

    return {
      physicalType: 'liquid',
      baseUnit: 'ml',
      allowedUnits: [
        { unit: 'ml', label: 'ml (मिलीलीटर)', multiplierToBase: 1 },
        { unit: 'L', label: 'Litre (लीटर)', multiplierToBase: 1000 },
      ],
      defaultUnit: isLargePack ? 'L' : 'ml',
      primaryDoseMode: 'pump',
      supportsPumpDose: true,
      supportsBighaDose: true, // Soil application or area spray
    };
  }

  // 3. Solid / Powder / Granule / Fertilizer:
  const isFertilizer = categoryLower === 'fertilizers' || categoryLower === 'fertilizer' || /खाद|उर्वरक|urea|dap|duophos|potash|npk|zinc|boron|sulfur|जिंक|सल्फर/i.test(textToScan);
  const primaryVariant = variants[0];
  const isLargeSolidPack = primaryVariant ? (primaryVariant.sizeUnit === 'kg' || primaryVariant.baseQuantity >= 1000) : (unitLower.includes('kg') || unitLower.includes('bag') || unitLower.includes('बोरी') || unitLower.includes('कट्टा'));

  return {
    physicalType: 'solid',
    baseUnit: 'g',
    allowedUnits: [
      { unit: 'g', label: 'g (ग्राम)', multiplierToBase: 1 },
      { unit: 'kg', label: 'kg (किलोग्राम)', multiplierToBase: 1000 },
    ],
    defaultUnit: (isFertilizer || isLargeSolidPack) ? 'kg' : 'g',
    primaryDoseMode: isFertilizer ? 'bigha' : 'pump',
    supportsPumpDose: true,
    supportsBighaDose: true,
  };
}

/**
 * Calculates loose sale pricing and cost metrics accurately.
 * e.g. Emamectin 250 g @ ₹700 cost
 * costPerBaseUnit = 700 / 250 = ₹2.80/g
 * Rate = ₹30 / 10 g -> sellingPricePerBaseUnit = 30 / 10 = ₹3.00/g
 * Loose Qty = 50 g:
 * lineTotal = 50 * 3.00 = ₹150
 * lineCost = 50 * 2.80 = ₹140
 * grossProfit = 150 - 140 = ₹10
 * marginPercent = (10 / 150) * 100 = 6.67%
 */
export function calculateLooseMetrics(params: {
  looseQuantity: number;
  costPerBaseUnit: number;
  rateAmount: number;
  rateUnitMultiplier: number;
}): {
  sellingPricePerBaseUnit: number;
  lineTotal: number;
  lineCost: number;
  grossProfit: number;
  marginPercent: number;
} {
  const qty = Math.max(0, Number(params.looseQuantity) || 0);
  const costPerBase = Math.max(0, Number(params.costPerBaseUnit) || 0);
  const multiplier = Math.max(1, Number(params.rateUnitMultiplier) || 1);
  const rateAmt = Math.max(0, Number(params.rateAmount) || 0);

  const sellingPricePerBaseUnit = multiplier > 0 ? (rateAmt / multiplier) : rateAmt;
  const lineTotal = Math.round(qty * sellingPricePerBaseUnit * 100) / 100;
  const lineCost = Math.round(qty * costPerBase * 100) / 100;
  const grossProfit = Math.round((lineTotal - lineCost) * 100) / 100;
  const marginPercent = lineTotal > 0 ? Math.round((grossProfit / lineTotal) * 1000) / 10 : 0;

  return {
    sellingPricePerBaseUnit,
    lineTotal,
    lineCost,
    grossProfit,
    marginPercent,
  };
}
