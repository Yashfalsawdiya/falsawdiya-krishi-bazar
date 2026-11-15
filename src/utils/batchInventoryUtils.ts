import {
  AccountingProduct,
  BatchAllocation,
  PackagingVariant,
  StockBatch,
} from '../types/accounting';
import { calculateExpiryAlert, ExpiryAlertResult, getProductVariants } from './agriPackagingUtils';

/**
 * Recursively strips `undefined` properties from objects and arrays so Firestore
 * never rejects nested batch/variant/sale-item payloads with "Unsupported field value: undefined".
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export function sanitizeBatchForFirestore(batch: StockBatch): StockBatch {
  return stripUndefinedDeep({
    ...batch,
    batchNumber: batch.batchNumber?.trim() || undefined,
    manufacturingDate: batch.manufacturingDate?.trim() || undefined,
    mfgDisplay: batch.mfgDisplay?.trim() || undefined,
    expiryDate: batch.expiryDate?.trim() || undefined,
    expiryDisplay: batch.expiryDisplay?.trim() || undefined,
    purchasePricePerPack:
      batch.purchasePricePerPack !== undefined && batch.purchasePricePerPack !== null && Number.isFinite(Number(batch.purchasePricePerPack))
        ? Number(batch.purchasePricePerPack)
        : undefined,
    initialPackQuantity: Math.max(0, Number(batch.initialPackQuantity) || 0),
    remainingPackQuantity: Math.max(0, Number(batch.remainingPackQuantity) || 0),
    dismissedWarnings: Array.isArray(batch.dismissedWarnings) && batch.dismissedWarnings.length > 0
      ? Array.from(new Set(batch.dismissedWarnings))
      : undefined,
    notes: batch.notes?.trim() || undefined,
    purchaseInvoiceNo: batch.purchaseInvoiceNo?.trim() || undefined,
    purchaseDate: batch.purchaseDate?.trim() || undefined,
    supplierId: batch.supplierId?.trim() || undefined,
  });
}

/**
 * Parses flexible Agri Input dates:
 * - "06/2028" or "06-2028" or "2028-06"
 *   -> Expiry: last day of June 2028 ("2028-06-30"), Mfg: first day ("2026-06-01")
 * - "2028-06-15" -> normalized as-is
 * - Empty string -> valid empty optional field
 */
export function parseMfgOrExpiryInput(
  rawInput: string,
  kind: 'mfg' | 'expiry'
): { valid: boolean; isoDate?: string; display?: string; error?: string } {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: true, isoDate: undefined, display: undefined };
  }

  // Match MM/YYYY or MM-YYYY
  const mmYyyyMatch = trimmed.match(/^(\d{1,2})\s*[\/\-]\s*(\d{4})$/);
  if (mmYyyyMatch) {
    const month = parseInt(mmYyyyMatch[1], 10);
    const year = parseInt(mmYyyyMatch[2], 10);
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return { valid: false, error: 'अमान्य माह/वर्ष (सही उदाहरण: 06/2028)' };
    }
    const mm = String(month).padStart(2, '0');
    const day = kind === 'expiry' ? new Date(year, month, 0).getDate() : 1;
    const dd = String(day).padStart(2, '0');
    return {
      valid: true,
      isoDate: `${year}-${mm}-${dd}`,
      display: `${mm}/${year}`,
    };
  }

  // Match YYYY-MM
  const yyyyMmMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (yyyyMmMatch) {
    const year = parseInt(yyyyMmMatch[1], 10);
    const month = parseInt(yyyyMmMatch[2], 10);
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return { valid: false, error: 'अमान्य माह/वर्ष (सही उदाहरण: 06/2028)' };
    }
    const mm = String(month).padStart(2, '0');
    const day = kind === 'expiry' ? new Date(year, month, 0).getDate() : 1;
    const dd = String(day).padStart(2, '0');
    return {
      valid: true,
      isoDate: `${year}-${mm}-${dd}`,
      display: `${mm}/${year}`,
    };
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const ddMmYyyyMatch = trimmed.match(/^(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})$/);
  if (ddMmYyyyMatch) {
    const day = parseInt(ddMmYyyyMatch[1], 10);
    const month = parseInt(ddMmYyyyMatch[2], 10);
    const year = parseInt(ddMmYyyyMatch[3], 10);
    const dt = new Date(year, month - 1, day);
    if (
      dt.getFullYear() !== year ||
      dt.getMonth() !== month - 1 ||
      dt.getDate() !== day
    ) {
      return { valid: false, error: 'अमान्य दिनांक (सही उदाहरण: 30/06/2028 या 06/2028)' };
    }
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return {
      valid: true,
      isoDate: `${year}-${mm}-${dd}`,
      display: `${dd}/${mm}/${year}`,
    };
  }

  // Match ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const dt = new Date(year, month - 1, day);
    if (
      dt.getFullYear() !== year ||
      dt.getMonth() !== month - 1 ||
      dt.getDate() !== day
    ) {
      return { valid: false, error: 'अमान्य दिनांक' };
    }
    const lastDay = new Date(year, month, 0).getDate();
    const isMonthGranular = (kind === 'expiry' && day === lastDay) || (kind === 'mfg' && day === 1);
    return {
      valid: true,
      isoDate: trimmed,
      display: isMonthGranular
        ? `${String(month).padStart(2, '0')}/${year}`
        : `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    };
  }

  return {
    valid: false,
    error: 'कृपया MM/YYYY (जैसे 06/2028) या DD/MM/YYYY दर्ज करें।',
  };
}

export function formatBatchDateDisplay(dateStr?: string, displayHint?: string): string {
  if (displayHint && displayHint.trim()) return displayHint.trim();
  if (!dateStr || !dateStr.trim()) return 'तिथि नहीं';
  const isoMatch = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return dateStr.trim();
}

export type BatchWarningKey =
  | 'missing_batch_no'
  | 'missing_mfg_date'
  | 'missing_expiry_date'
  | 'missing_purchase_cost';

export interface BatchCompletenessWarning {
  key: BatchWarningKey;
  labelHindi: string;
  shortLabel: string;
}

/**
 * Checks which optional fields are missing on an active batch.
 * Never treats incomplete batches as silently valid unless admin explicitly dismissed that warning key.
 */
export function getBatchMissingWarnings(
  batch: StockBatch,
  options?: { includeDismissed?: boolean }
): BatchCompletenessWarning[] {
  if (batch.status === 'expired_written_off' || (batch.remainingPackQuantity || 0) <= 0) {
    return [];
  }

  const all: BatchCompletenessWarning[] = [];
  if (!batch.batchNumber || !batch.batchNumber.trim()) {
    all.push({
      key: 'missing_batch_no',
      labelHindi: 'बैच नंबर दर्ज नहीं — बैच-वार ट्रैकिंग अधूरी है',
      shortLabel: 'बैच नं. अधूरा',
    });
  }
  if (!batch.manufacturingDate || !batch.manufacturingDate.trim()) {
    all.push({
      key: 'missing_mfg_date',
      labelHindi: 'निर्माण तिथि (Mfg Date) दर्ज नहीं — उत्पाद आयु ट्रैकिंग अधूरी',
      shortLabel: 'Mfg तिथि अधूरी',
    });
  }
  if (!batch.expiryDate || !batch.expiryDate.trim()) {
    all.push({
      key: 'missing_expiry_date',
      labelHindi: 'एक्सपायरी तिथि दर्ज नहीं — स्वचालित एक्सपायरी अलर्ट लागू नहीं होगा',
      shortLabel: 'Expiry अधूरी',
    });
  }
  if (
    batch.purchasePricePerPack === undefined ||
    batch.purchasePricePerPack === null ||
    !Number.isFinite(Number(batch.purchasePricePerPack))
  ) {
    all.push({
      key: 'missing_purchase_cost',
      labelHindi: 'बैच खरीद दर दर्ज नहीं — उत्पाद की डिफ़ॉल्ट दर (Fallback Cost) उपयोग होगी',
      shortLabel: 'बैच खरीद दर नहीं',
    });
  }

  if (options?.includeDismissed) return all;
  const dismissed = new Set(batch.dismissedWarnings || []);
  return all.filter((w) => !dismissed.has(w.key));
}

export function getBatchAlert(batch: StockBatch, expiryWarningDays = 122): ExpiryAlertResult {
  if (!batch.expiryDate || !batch.expiryDate.trim()) {
    return {
      status: 'no_date',
      daysRemaining: 9999,
      labelHindi: 'एक्सपायरी तिथि दर्ज नहीं',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      isSaleable: true,
    };
  }
  const baseAlert = calculateExpiryAlert(batch.expiryDate);
  if (baseAlert.status === 'expired' || baseAlert.status === 'critical') {
    return baseAlert;
  }
  if (baseAlert.daysRemaining <= expiryWarningDays) {
    const months = Math.max(1, Math.ceil(baseAlert.daysRemaining / 30));
    return {
      status: 'warning',
      daysRemaining: baseAlert.daysRemaining,
      labelHindi: `शीघ्र एक्सपायरी (${baseAlert.daysRemaining} दिन / ~${months} माह)`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
      isSaleable: true,
    };
  }
  return baseAlert;
}

export interface EnrichedBatch extends StockBatch {
  alert: ExpiryAlertResult;
  effectivePurchaseCost: number;
  usedFallbackCost: boolean;
  missingWarnings: BatchCompletenessWarning[];
}

export interface VariantStockSummary {
  variantId: string;
  variantLabel: string;
  batchedSaleablePacks: number;
  batchedExpiredPacks: number;
  unbatchedPacks: number;
  saleablePacks: number;
  totalPhysicalPacks: number;
  nearExpiryBatchesCount: number;
  criticalBatchesCount: number;
  expiredBatchesCount: number;
  activeBatchesCount: number;
  hasMissingBatchWarnings: boolean;
  missingWarningsCount: number;
  batches: EnrichedBatch[];
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  totalValuation: number;
}

export function getBatchesForVariant(
  product: AccountingProduct,
  variant: PackagingVariant,
  allVariants?: PackagingVariant[]
): StockBatch[] {
  const allBatches = Array.isArray(product.batches) ? product.batches : [];
  const variantList = allVariants || getProductVariants(product);
  const isSingleVariant = variantList.length <= 1;

  return allBatches.filter((b) => {
    if (b.variantId === variant.id) return true;
    if (isSingleVariant && (!b.variantId || !variantList.some((v) => v.id === b.variantId))) {
      return true;
    }
    return false;
  });
}

/**
 * Single authoritative calculation for variant stock, distinguishing:
 * - Saleable Batched Stock (not expired, >0 qty)
 * - Expired Batched Stock (daysRemaining < 0, >0 qty)
 * - Legacy Unbatched Stock (if product has opening packs without batch records)
 */
export function calculateVariantStockSummary(
  product: AccountingProduct,
  variant: PackagingVariant,
  defaultLowStockThreshold = 10,
  expiryWarningDays = 122
): VariantStockSummary {
  const allVariants = getProductVariants(product);
  const rawBatches = getBatchesForVariant(product, variant, allVariants);

  let batchedSaleablePacks = 0;
  let batchedExpiredPacks = 0;
  let totalNonWrittenOffRemaining = 0;
  let nearExpiryBatchesCount = 0;
  let criticalBatchesCount = 0;
  let expiredBatchesCount = 0;
  let activeBatchesCount = 0;
  let missingWarningsCount = 0;
  let totalBatchValuation = 0;

  const fallbackCost = Number(variant.costPrice) || Number(product.costPrice) || 0;

  const enrichedBatches: EnrichedBatch[] = rawBatches.map((b) => {
    const alert = getBatchAlert(b, expiryWarningDays);
    const hasExplicitCost =
      b.purchasePricePerPack !== undefined &&
      b.purchasePricePerPack !== null &&
      Number.isFinite(Number(b.purchasePricePerPack));
    const effectivePurchaseCost = hasExplicitCost ? Number(b.purchasePricePerPack) : fallbackCost;
    const missingWarnings = getBatchMissingWarnings(b);
    const rem = Math.max(0, Number(b.remainingPackQuantity) || 0);

    if (b.status !== 'expired_written_off' && rem > 0) {
      totalNonWrittenOffRemaining += rem;
      if (!alert.isSaleable) {
        batchedExpiredPacks += rem;
        expiredBatchesCount++;
      } else {
        batchedSaleablePacks += rem;
        activeBatchesCount++;
        totalBatchValuation += rem * effectivePurchaseCost;
        if (alert.status === 'critical') criticalBatchesCount++;
        if (alert.status === 'warning' || alert.status === 'critical') nearExpiryBatchesCount++;
      }
      missingWarningsCount += missingWarnings.length;
    }

    return {
      ...b,
      alert,
      effectivePurchaseCost,
      usedFallbackCost: !hasExplicitCost,
      missingWarnings,
    };
  });

  // Sort batches: saleable first by FEFO, then expired, then exhausted
  enrichedBatches.sort((a, b) => {
    const aActive = a.remainingPackQuantity > 0 && a.status !== 'expired_written_off' ? 1 : 0;
    const bActive = b.remainingPackQuantity > 0 && b.status !== 'expired_written_off' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    const aExp = a.alert.status === 'expired' ? 1 : 0;
    const bExp = b.alert.status === 'expired' ? 1 : 0;
    if (aExp !== bExp) return aExp - bExp;

    if (a.expiryDate && b.expiryDate) {
      return a.expiryDate.localeCompare(b.expiryDate);
    }
    if (a.expiryDate) return -1;
    if (b.expiryDate) return 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  let unbatchedPacks = 0;
  if (variant.unbatchedPacks !== undefined) {
    unbatchedPacks = Math.max(0, Number(variant.unbatchedPacks) || 0);
  } else if (rawBatches.length === 0) {
    unbatchedPacks = Math.max(0, Number(variant.currentStockPacks) || 0);
  } else {
    unbatchedPacks = Math.max(0, (Number(variant.currentStockPacks) || 0) - totalNonWrittenOffRemaining);
  }

  const saleablePacks = batchedSaleablePacks + unbatchedPacks;
  const totalPhysicalPacks = saleablePacks + batchedExpiredPacks;
  const threshold =
    variant.minStockAlertPacks !== undefined && Number(variant.minStockAlertPacks) >= 0
      ? Number(variant.minStockAlertPacks)
      : defaultLowStockThreshold;

  const isOutOfStock = saleablePacks <= 0;
  const isLowStock = saleablePacks > 0 && saleablePacks <= threshold;

  totalBatchValuation += unbatchedPacks * fallbackCost;

  return {
    variantId: variant.id,
    variantLabel: variant.label || `${variant.sizeValue} ${variant.sizeUnit}`,
    batchedSaleablePacks,
    batchedExpiredPacks,
    unbatchedPacks,
    saleablePacks,
    totalPhysicalPacks,
    nearExpiryBatchesCount,
    criticalBatchesCount,
    expiredBatchesCount,
    activeBatchesCount,
    hasMissingBatchWarnings: missingWarningsCount > 0,
    missingWarningsCount,
    batches: enrichedBatches,
    lowStockThreshold: threshold,
    isLowStock,
    isOutOfStock,
    totalValuation: Math.round(totalBatchValuation * 100) / 100,
  };
}

export interface ProductInventoryHealthSummary {
  saleablePacks: number;
  expiredPacks: number;
  unbatchedPacks: number;
  nearExpiryBatchesCount: number;
  criticalBatchesCount: number;
  expiredBatchesCount: number;
  activeBatchesCount: number;
  missingWarningsCount: number;
  hasLowStockVariant: boolean;
  hasOutOfStockVariant: boolean;
  allVariantsOutOfStock: boolean;
  totalValuation: number;
  variantSummaries: VariantStockSummary[];
}

export function calculateProductHealthSummary(
  product: AccountingProduct,
  defaultLowStockThreshold = 10,
  expiryWarningDays = 122
): ProductInventoryHealthSummary {
  const variants = getProductVariants(product);
  const variantSummaries = variants.map((v) =>
    calculateVariantStockSummary(product, v, defaultLowStockThreshold, expiryWarningDays)
  );

  const saleablePacks = variantSummaries.reduce((s, vs) => s + vs.saleablePacks, 0);
  const expiredPacks = variantSummaries.reduce((s, vs) => s + vs.batchedExpiredPacks, 0);
  const unbatchedPacks = variantSummaries.reduce((s, vs) => s + vs.unbatchedPacks, 0);
  const nearExpiryBatchesCount = variantSummaries.reduce((s, vs) => s + vs.nearExpiryBatchesCount, 0);
  const criticalBatchesCount = variantSummaries.reduce((s, vs) => s + vs.criticalBatchesCount, 0);
  const expiredBatchesCount = variantSummaries.reduce((s, vs) => s + vs.expiredBatchesCount, 0);
  const activeBatchesCount = variantSummaries.reduce((s, vs) => s + vs.activeBatchesCount, 0);
  const missingWarningsCount = variantSummaries.reduce((s, vs) => s + vs.missingWarningsCount, 0);
  const hasLowStockVariant = variantSummaries.some((vs) => vs.isLowStock || vs.isOutOfStock);
  const hasOutOfStockVariant = variantSummaries.some((vs) => vs.isOutOfStock);
  const allVariantsOutOfStock = variantSummaries.length > 0 && variantSummaries.every((vs) => vs.isOutOfStock);
  const totalSealedVal = variantSummaries.reduce((s, vs) => s + vs.totalValuation, 0);
  const looseVal =
    product.looseStock && product.looseStock.availableBaseQty > 0
      ? product.looseStock.availableBaseQty * (product.looseStock.costPerBaseUnit || 0)
      : 0;

  return {
    saleablePacks,
    expiredPacks,
    unbatchedPacks,
    nearExpiryBatchesCount,
    criticalBatchesCount,
    expiredBatchesCount,
    activeBatchesCount,
    missingWarningsCount,
    hasLowStockVariant,
    hasOutOfStockVariant,
    allVariantsOutOfStock,
    totalValuation: Math.round(totalSealedVal + looseVal),
    variantSummaries,
  };
}

export interface FefoAllocationResult {
  allocations: BatchAllocation[];
  unbatchedPacksUsed: number;
  shortfallPacks: number;
  allocatedTotalPacks: number;
  totalCost: number;
  weightedUnitCost: number;
  batchNumbersSummary?: string;
  primaryExpiryDate?: string;
  hasNearExpiryAllocation: boolean;
  usedFallbackCost: boolean;
  errorReason?: string;
}

/**
 * Pure FEFO (First Expired, First Out) allocator across eligible non-expired batches.
 * - Excludes expired batches when `blockExpiredSale` is true (default true).
 * - Undated batches are ordered AFTER dated batches using FIFO (createdAt ascending).
 * - Optional `manualBatchId` prioritizes that specific eligible batch first, spilling over via FEFO if needed.
 * - Supports legacy unbatched packs & negative stock override cleanly.
 */
export function allocateFefoBatches(params: {
  product: AccountingProduct;
  variant: PackagingVariant;
  requestedPacks: number;
  manualBatchId?: string;
  allowNegativeStock?: boolean;
  blockExpiredSale?: boolean;
  expiryWarningDays?: number;
  reservedPacksByBatch?: Record<string, number>;
  reservedUnbatchedPacks?: number;
}): FefoAllocationResult {
  const {
    product,
    variant,
    requestedPacks,
    manualBatchId,
    allowNegativeStock = false,
    blockExpiredSale = true,
    expiryWarningDays = 122,
    reservedPacksByBatch = {},
    reservedUnbatchedPacks = 0,
  } = params;

  const qtyNeeded = Math.max(0, Number(requestedPacks) || 0);
  const fallbackCost = Number(variant.costPrice) || Number(product.costPrice) || 0;

  if (qtyNeeded <= 0) {
    return {
      allocations: [],
      unbatchedPacksUsed: 0,
      shortfallPacks: 0,
      allocatedTotalPacks: 0,
      totalCost: 0,
      weightedUnitCost: fallbackCost,
      hasNearExpiryAllocation: false,
      usedFallbackCost: true,
    };
  }

  const summary = calculateVariantStockSummary(product, variant, 10, expiryWarningDays);

  // Eligible batches: positive remaining qty (after subtracting any cart reservations), not written off, not expired
  const eligible = summary.batches
    .map((b) => {
      const reserved = reservedPacksByBatch[b.id] || 0;
      const availableForThis = Math.max(0, (b.remainingPackQuantity || 0) - reserved);
      return { batch: b, availableForThis };
    })
    .filter(({ batch, availableForThis }) => {
      if (batch.status === 'expired_written_off') return false;
      if (availableForThis <= 0) return false;
      if (blockExpiredSale && !batch.alert.isSaleable) return false;
      return true;
    });

  // Sort FEFO: manualBatchId first (if valid), then earliest expiryDate, then undated by FIFO (createdAt)
  eligible.sort((a, b) => {
    if (manualBatchId) {
      if (a.batch.id === manualBatchId && b.batch.id !== manualBatchId) return -1;
      if (b.batch.id === manualBatchId && a.batch.id !== manualBatchId) return 1;
    }
    const aHasExp = Boolean(a.batch.expiryDate);
    const bHasExp = Boolean(b.batch.expiryDate);
    if (aHasExp && bHasExp) {
      const cmp = (a.batch.expiryDate || '').localeCompare(b.batch.expiryDate || '');
      if (cmp !== 0) return cmp;
    } else if (aHasExp !== bHasExp) {
      return aHasExp ? -1 : 1;
    }
    return (a.batch.createdAt || 0) - (b.batch.createdAt || 0);
  });

  let remainingToAllocate = qtyNeeded;
  const allocations: BatchAllocation[] = [];
  let hasNearExpiryAllocation = false;
  let usedFallbackCost = false;
  let totalCost = 0;

  for (const { batch, availableForThis } of eligible) {
    if (remainingToAllocate <= 0) break;
    const take = Math.min(remainingToAllocate, availableForThis);
    if (take <= 0) continue;

    if (batch.usedFallbackCost) usedFallbackCost = true;
    if (batch.alert.status === 'critical' || batch.alert.status === 'warning') {
      hasNearExpiryAllocation = true;
    }

    const lineCost = take * batch.effectivePurchaseCost;
    totalCost += lineCost;
    remainingToAllocate -= take;

    allocations.push(
      stripUndefinedDeep({
        batchId: batch.id,
        batchNumber: batch.batchNumber || undefined,
        expiryDate: batch.expiryDate || undefined,
        packsUsed: take,
        unitCost: batch.effectivePurchaseCost,
        usedFallbackCost: batch.usedFallbackCost ? true : undefined,
      })
    );
  }

  let unbatchedPacksUsed = 0;
  const availUnbatched = Math.max(0, summary.unbatchedPacks - reservedUnbatchedPacks);
  if (remainingToAllocate > 0 && availUnbatched > 0) {
    unbatchedPacksUsed = Math.min(remainingToAllocate, availUnbatched);
    totalCost += unbatchedPacksUsed * fallbackCost;
    usedFallbackCost = true;
    remainingToAllocate -= unbatchedPacksUsed;
  }

  let shortfallPacks = 0;
  let errorReason: string | undefined;

  if (remainingToAllocate > 0) {
    if (allowNegativeStock) {
      shortfallPacks = remainingToAllocate;
      totalCost += shortfallPacks * fallbackCost;
      usedFallbackCost = true;
    } else {
      shortfallPacks = remainingToAllocate;
      if (summary.batchedExpiredPacks > 0 && summary.saleablePacks === 0) {
        errorReason = `"${product.hindiName || product.name}" (${variant.label}) का पूरा उपलब्ध स्टॉक (${summary.batchedExpiredPacks}) एक्सपायर्ड हो चुका है — बिक्री प्रतिबंधित है।`;
      } else {
        errorReason = `"${product.hindiName || product.name}" (${variant.label}) का केवल ${qtyNeeded - shortfallPacks} बिक्री योग्य स्टॉक उपलब्ध है।`;
      }
    }
  }

  const allocatedTotalPacks = qtyNeeded - (allowNegativeStock ? 0 : shortfallPacks);
  const weightedUnitCost =
    allocatedTotalPacks > 0
      ? Math.round((totalCost / allocatedTotalPacks) * 100) / 100
      : fallbackCost;

  const batchNames = allocations
    .map((a) => a.batchNumber || 'बिना बैच नं.')
    .filter(Boolean);
  const batchNumbersSummary =
    batchNames.length > 0
      ? Array.from(new Set(batchNames)).join(', ')
      : unbatchedPacksUsed > 0
      ? 'सामान्य स्टॉक'
      : undefined;

  const primaryExpiryDate = allocations.find((a) => a.expiryDate)?.expiryDate;

  return {
    allocations,
    unbatchedPacksUsed,
    shortfallPacks,
    allocatedTotalPacks,
    totalCost: Math.round(totalCost * 100) / 100,
    weightedUnitCost,
    batchNumbersSummary,
    primaryExpiryDate,
    hasNearExpiryAllocation,
    usedFallbackCost,
    errorReason,
  };
}

/**
 * Recomputes variant.currentStockPacks & product.currentStock from batches + preserved unbatchedPacks.
 * Ensures expired batches are NOT counted in saleable variant.currentStockPacks,
 * while preserving unbatched legacy quantities safely.
 */
export function syncProductVariantsWithBatches(
  product: AccountingProduct,
  variants: PackagingVariant[],
  batches: StockBatch[],
  expiryWarningDays = 122,
  explicitUnbatchedOverride?: Record<string, number>
): {
  updatedVariants: PackagingVariant[];
  cleanedBatches: StockBatch[];
  totalSaleablePacks: number;
} {
  const cleanedBatches = batches.map((b) => {
    const rem = Math.max(0, Number(b.remainingPackQuantity) || 0);
    const nextStatus: StockBatch['status'] =
      b.status === 'expired_written_off'
        ? 'expired_written_off'
        : rem <= 0
        ? 'exhausted'
        : 'active';
    return sanitizeBatchForFirestore({
      ...b,
      remainingPackQuantity: rem,
      status: nextStatus,
    });
  });

  const tempProduct: AccountingProduct = {
    ...product,
    packagingVariants: variants,
    batches: cleanedBatches,
  };

  const updatedVariants = variants.map((v) => {
    const summary = calculateVariantStockSummary(tempProduct, v, 10, expiryWarningDays);
    const unbatched =
      explicitUnbatchedOverride && explicitUnbatchedOverride[v.id] !== undefined
        ? Math.max(0, Number(explicitUnbatchedOverride[v.id]) || 0)
        : summary.unbatchedPacks;

    const saleable = summary.batchedSaleablePacks + unbatched;
    return stripUndefinedDeep({
      ...v,
      currentStockPacks: saleable,
      unbatchedPacks: unbatched > 0 ? unbatched : undefined,
    });
  });

  const totalSaleablePacks = updatedVariants.reduce((sum, v) => sum + (v.currentStockPacks || 0), 0);

  return {
    updatedVariants,
    cleanedBatches,
    totalSaleablePacks,
  };
}

