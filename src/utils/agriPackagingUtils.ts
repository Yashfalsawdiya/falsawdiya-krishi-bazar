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
  } else if (uLower.includes('gram') || uLower.includes('ग्राम')) {
    sizeUnit = 'g';
    packType = 'Packet';
  } else if (uLower.includes('packet') || uLower.includes('पैकेट')) {
    sizeUnit = 'Piece';
    packType = 'Packet';
  } else if (uLower.includes('bag') || uLower.includes('बोरी') || uLower.includes('कट्टा')) {
    sizeUnit = 'Piece';
    packType = 'Bag';
  }

  return [{
    id: `var_default_${product.id}`,
    sizeValue,
    sizeUnit,
    packagingType: packType,
    label: `${sizeValue} ${unit}`,
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
