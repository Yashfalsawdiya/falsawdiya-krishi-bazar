import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, onSnapshot, writeBatch, Timestamp,
  runTransaction, DocumentReference
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  AccountingProduct,
  AccountingSale,
  AccountingSaleItem,
  AccountingCustomer,
  CustomerLedgerEntry,
  AccountingExpense,
  AccountingExpenseCategory,
  AccountingCashRegister,
  DailyAccountingSummary,
  PackagingVariant,
  StockBatch,
  LooseStockPool,
  StockMovementLog,
  AccountingAuditLog,
  MonthlyPOSExportMeta,
  POSLooseRateSettings,
  CustomLooseRateOption,
  StockManagementConfig
} from '../types/accounting';
import {
  POS_LOOSE_RATE_CACHE_KEY,
  getCachedLooseRateSettings,
  normalizeToBaseUnit,
  calculateExpiryAlert,
  getProductVariants,
} from '../utils/agriPackagingUtils';
import {
  allocateFefoBatches,
  calculateProductHealthSummary,
  calculateVariantStockSummary,
  sanitizeBatchForFirestore,
  stripUndefinedDeep,
  syncProductVariantsWithBatches,
} from '../utils/batchInventoryUtils';

export const DEFAULT_EXPENSE_CATEGORIES: AccountingExpenseCategory[] = [
  { id: 'supplier_payment', name: 'Supplier Payment', hindiName: 'सप्लायर भुगतान (थोक खरीद)', icon: 'Truck', isSystem: true },
  { id: 'tea_refreshment', name: 'Tea & Refreshment', hindiName: 'चाय-पानी व नाश्ता', icon: 'Coffee', isSystem: true },
  { id: 'fuel', name: 'Petrol & Fuel', hindiName: 'पेट्रोल व ईंधन', icon: 'Fuel', isSystem: true },
  { id: 'transport', name: 'Transport & Freight', hindiName: 'भाड़ा / ट्रांसपोर्ट', icon: 'Truck', isSystem: true },
  { id: 'salary', name: 'Hamali & Staff Salary', hindiName: 'हमाली / मजदूरी / वेतन', icon: 'Users', isSystem: true },
  { id: 'electricity', name: 'Electricity Bill', hindiName: 'बिजली बिल', icon: 'Zap', isSystem: true },
  { id: 'rent', name: 'Shop Rent', hindiName: 'दुकान किराया', icon: 'Home', isSystem: true },
  { id: 'packaging', name: 'Packaging & Bags', hindiName: 'पैकेजिंग / कट्टे / थैली', icon: 'Package', isSystem: true },
  { id: 'repair', name: 'Repair & Maintenance', hindiName: 'मरम्मत व मेंटेनेंस', icon: 'Wrench', isSystem: true },
  { id: 'other', name: 'Other Misc Expense', hindiName: 'अन्य विविध खर्च', icon: 'PlusCircle', isSystem: true },
];

/**
 * Proportional Bargaining Allocation Calculator
 * Distributes a total bill discount proportionately across all product line items.
 */
export function calculateBargainingAllocation(
  items: Array<{
    productId: string;
    name: string;
    hindiName: string;
    unit: string;
    quantity: number;
    costPrice: number;
    originalSellingPrice: number;
    [key: string]: any;
  }>,
  negotiatedFinalTotal: number
): {
  subtotal: number;
  bargainingDiscount: number;
  finalTotal: number;
  totalCOGS: number;
  grossProfit: number;
  grossMarginPercent: number;
  allocatedItems: AccountingSaleItem[];
} {
  // Normalize items in case of loose sale items
  const normalizedItems = items.map(it => {
    let costPrice = it.costPrice;
    let sellingPrice = it.originalSellingPrice;
    let qty = it.quantity;

    if (it.saleType === 'loose') {
      const isLargeUnit = it.looseUnit === 'kg' || it.looseUnit === 'L' || it.looseUnit === 'Ltr' || it.looseUnit === 'लीटर' || it.looseUnit === 'किलो';
      const unitMultiplier = isLargeUnit ? 1000 : 1;
      const displayQty = it.looseQuantity !== undefined && it.looseQuantity > 0 ? it.looseQuantity : it.quantity;
      qty = displayQty;

      if (it.costPerBaseUnit !== undefined && it.costPerBaseUnit > 0) {
        costPrice = Math.round(it.costPerBaseUnit * unitMultiplier * 100) / 100;
      }
      if (it.sellingPricePerBaseUnit !== undefined && it.sellingPricePerBaseUnit > 0) {
        sellingPrice = Math.round(it.sellingPricePerBaseUnit * unitMultiplier * 100) / 100;
      }
    }
    return {
      ...it,
      quantity: qty,
      costPrice,
      originalSellingPrice: sellingPrice,
    };
  });

  const subtotal = normalizedItems.reduce((acc, it) => acc + (it.quantity * it.originalSellingPrice), 0);
  const totalCOGS = normalizedItems.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0);
  
  // If no negotiation or higher, discount is 0
  const finalTotal = Math.max(0, negotiatedFinalTotal);
  const bargainingDiscount = Math.max(0, subtotal - finalTotal);

  let allocatedDiscountRunning = 0;
  const allocatedItems: AccountingSaleItem[] = normalizedItems.map((it, idx) => {
    const originalLineTotal = it.quantity * it.originalSellingPrice;
    const lineCostTotal = it.quantity * it.costPrice;

    let lineDiscountShare = 0;
    if (subtotal > 0 && bargainingDiscount > 0) {
      if (idx === normalizedItems.length - 1) {
        // Last item absorbs any rounding difference to ensure exact penny match
        lineDiscountShare = Math.round((bargainingDiscount - allocatedDiscountRunning) * 100) / 100;
      } else {
        lineDiscountShare = Math.round((bargainingDiscount * (originalLineTotal / subtotal)) * 100) / 100;
        allocatedDiscountRunning += lineDiscountShare;
      }
    }

    const effectiveLineTotal = Math.max(0, originalLineTotal - lineDiscountShare);
    const effectiveUnitPrice = it.quantity > 0 ? (effectiveLineTotal / it.quantity) : it.originalSellingPrice;
    const lineGrossProfit = effectiveLineTotal - lineCostTotal;
    const lineMarginPercent = effectiveLineTotal > 0 ? (lineGrossProfit / effectiveLineTotal) * 100 : 0;
    const isBelowCost = effectiveUnitPrice < it.costPrice;

    return {
      ...(it as any),
      productId: it.productId,
      name: it.name,
      hindiName: it.hindiName,
      unit: it.unit,
      quantity: it.quantity,
      costPrice: it.costPrice,
      originalSellingPrice: it.originalSellingPrice,
      effectiveSellingPrice: Math.round(effectiveUnitPrice * 100) / 100,
      totalCost: Math.round(lineCostTotal * 100) / 100,
      totalOriginalAmount: Math.round(originalLineTotal * 100) / 100,
      totalEffectiveAmount: Math.round(effectiveLineTotal * 100) / 100,
      bargainingDiscountShare: Math.round(lineDiscountShare * 100) / 100,
      lineGrossProfit: Math.round(lineGrossProfit * 100) / 100,
      lineMarginPercent: Math.round(lineMarginPercent * 10) / 10,
      isBelowCost,
    };
  });

  const calculatedGrossProfit = finalTotal - totalCOGS;
  const calculatedGrossMarginPercent = finalTotal > 0 ? (calculatedGrossProfit / finalTotal) * 100 : 0;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    bargainingDiscount: Math.round(bargainingDiscount * 100) / 100,
    finalTotal: Math.round(finalTotal * 100) / 100,
    totalCOGS: Math.round(totalCOGS * 100) / 100,
    grossProfit: Math.round(calculatedGrossProfit * 100) / 100,
    grossMarginPercent: Math.round(calculatedGrossMarginPercent * 10) / 10,
    allocatedItems,
  };
}

// ----------------------------------------------------
// PRODUCT & INVENTORY MANAGEMENT
// ----------------------------------------------------

export async function fetchAccountingProducts(): Promise<AccountingProduct[]> {
  try {
    const q = query(collection(db, 'accounting_products'), orderBy('hindiName', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingProduct));
  } catch (err) {
    console.error('Error fetching accounting products:', err);
    return [];
  }
}

export async function saveAccountingProduct(product: Omit<AccountingProduct, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<string> {
  const now = Date.now();
  const prodRef = id ? doc(db, 'accounting_products', id) : doc(collection(db, 'accounting_products'));
  const normalizedBatches = Array.isArray(product.batches)
    ? product.batches.map(b => ({ ...b, productId: prodRef.id }))
    : undefined;
  const payload = stripUndefinedDeep({
    ...product,
    ...(normalizedBatches !== undefined ? { batches: normalizedBatches } : {}),
    updatedAt: now,
    ...(id ? {} : { createdAt: now }),
  });
  await setDoc(prodRef, payload, { merge: true });
  return prodRef.id;
}

export async function deleteAccountingProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, 'accounting_products', productId));
}

/**
 * Adds a new Batch or updates an existing Batch for a product variant,
 * recomputes variant & product saleable stock, and logs an audit movement.
 */
export async function upsertProductBatch(params: {
  productId: string;
  variantId: string;
  batchId?: string; // Provide to edit existing batch
  addQtyToExistingBatchId?: string; // Provide to restock/add packs into existing batch
  batchNumber?: string;
  manufacturingDate?: string;
  mfgDisplay?: string;
  expiryDate?: string;
  expiryDisplay?: string;
  purchasePricePerPack?: number;
  quantityPacks: number; // Opening qty (for new), target remaining qty (for edit), or delta qty (for addQtyToExistingBatchId)
  notes?: string;
  supplierId?: string;
  purchaseInvoiceNo?: string;
  purchaseDate?: string;
  movementType?: StockMovementLog['type'];
  reason?: string;
}): Promise<StockBatch> {
  const {
    productId,
    variantId,
    batchId,
    addQtyToExistingBatchId,
    batchNumber,
    manufacturingDate,
    mfgDisplay,
    expiryDate,
    expiryDisplay,
    purchasePricePerPack,
    quantityPacks,
    notes,
    supplierId,
    purchaseInvoiceNo,
    purchaseDate,
    movementType = 'opening',
    reason,
  } = params;

  const prodRef = doc(db, 'accounting_products', productId);
  const prodSnap = await getDoc(prodRef);
  if (!prodSnap.exists()) throw new Error('उत्पाद नहीं मिला');

  const prod = { id: prodSnap.id, ...prodSnap.data() } as AccountingProduct;
  const variants = getProductVariants(prod);
  const targetVar = variants.find(v => v.id === variantId) || variants[0];
  if (!targetVar) throw new Error('पैकेजिंग वेरिएंट नहीं मिला');

  const now = Date.now();
  const dateStr = new Date(now).toISOString().split('T')[0];

  // Capture existing unbatched counts before batch array changes so legacy unbatched packs are preserved
  const unbatchedOverride: Record<string, number> = {};
  for (const v of variants) {
    unbatchedOverride[v.id] = calculateVariantStockSummary(prod, v).unbatchedPacks;
  }

  const existingBatches: StockBatch[] = Array.isArray(prod.batches)
    ? prod.batches.map(b => ({ ...b }))
    : [];

  const safeQty = Math.max(0, Number(quantityPacks) || 0);
  let savedBatch: StockBatch;
  let qtyDelta = 0;

  const targetEditId = addQtyToExistingBatchId || batchId;
  const existingIdx = targetEditId ? existingBatches.findIndex(b => b.id === targetEditId) : -1;

  if (existingIdx !== -1 && addQtyToExistingBatchId) {
    const prev = existingBatches[existingIdx];
    qtyDelta = safeQty;
    const nextRem = (prev.remainingPackQuantity || 0) + safeQty;
    savedBatch = sanitizeBatchForFirestore({
      ...prev,
      initialPackQuantity: (prev.initialPackQuantity || 0) + safeQty,
      remainingPackQuantity: nextRem,
      purchasePricePerPack:
        purchasePricePerPack !== undefined ? purchasePricePerPack : prev.purchasePricePerPack,
      status: nextRem > 0 ? 'active' : 'exhausted',
      updatedAt: now,
    });
    existingBatches[existingIdx] = savedBatch;
  } else if (existingIdx !== -1 && batchId) {
    const prev = existingBatches[existingIdx];
    qtyDelta = safeQty - (prev.remainingPackQuantity || 0);
    const updatedInit = Math.max(prev.initialPackQuantity || 0, safeQty);
    savedBatch = sanitizeBatchForFirestore({
      ...prev,
      batchNumber: batchNumber !== undefined ? batchNumber : prev.batchNumber,
      manufacturingDate: manufacturingDate !== undefined ? manufacturingDate : prev.manufacturingDate,
      mfgDisplay: mfgDisplay !== undefined ? mfgDisplay : prev.mfgDisplay,
      expiryDate: expiryDate !== undefined ? expiryDate : prev.expiryDate,
      expiryDisplay: expiryDisplay !== undefined ? expiryDisplay : prev.expiryDisplay,
      purchasePricePerPack:
        purchasePricePerPack !== undefined ? purchasePricePerPack : prev.purchasePricePerPack,
      initialPackQuantity: updatedInit,
      remainingPackQuantity: safeQty,
      notes: notes !== undefined ? notes : prev.notes,
      status: prev.status === 'expired_written_off' && safeQty === 0
        ? 'expired_written_off'
        : safeQty > 0
        ? 'active'
        : 'exhausted',
      dismissedWarnings: [], // Reset dismissed warnings if admin edited metadata
      updatedAt: now,
    });
    existingBatches[existingIdx] = savedBatch;
  } else {
    const newId = `batch_${now}_${Math.random().toString(36).slice(2, 6)}`;
    qtyDelta = safeQty;
    savedBatch = sanitizeBatchForFirestore({
      id: newId,
      productId,
      variantId: targetVar.id,
      batchNumber,
      manufacturingDate,
      mfgDisplay,
      expiryDate,
      expiryDisplay,
      purchasePricePerPack,
      initialPackQuantity: safeQty,
      remainingPackQuantity: safeQty,
      status: safeQty > 0 ? 'active' : 'exhausted',
      notes,
      supplierId,
      purchaseInvoiceNo,
      purchaseDate: purchaseDate || dateStr,
      createdAt: now,
      updatedAt: now,
    });
    existingBatches.push(savedBatch);
  }

  const synced = syncProductVariantsWithBatches(
    prod,
    variants,
    existingBatches,
    122,
    unbatchedOverride
  );

  const wb = writeBatch(db);
  wb.update(
    prodRef,
    stripUndefinedDeep({
      batches: synced.cleanedBatches,
      packagingVariants: synced.updatedVariants,
      currentStock: synced.totalSaleablePacks,
      updatedAt: now,
    })
  );

  if (qtyDelta !== 0 || !batchId) {
    const updatedVar = synced.updatedVariants.find(v => v.id === targetVar.id);
    const movRef = doc(collection(db, 'accounting_stock_movements'));
    const movLog: StockMovementLog = stripUndefinedDeep({
      id: movRef.id,
      timestamp: now,
      date: dateStr,
      productId,
      productName: prod.hindiName || prod.name,
      variantId: targetVar.id,
      variantLabel: targetVar.label,
      batchId: savedBatch.id,
      batchNumber: savedBatch.batchNumber,
      expiryDate: savedBatch.expiryDate,
      purchaseCostPerPack: savedBatch.purchasePricePerPack ?? targetVar.costPrice,
      type: movementType,
      quantityChangePacks: qtyDelta,
      balancePacksAfter: updatedVar?.currentStockPacks ?? synced.totalSaleablePacks,
      reason:
        reason ||
        (batchId
          ? `बैच ${savedBatch.batchNumber || '(बिना नं.)'} अपडेट किया गया`
          : `नया बैच ${savedBatch.batchNumber || '(बिना नं.)'} जोड़ा गया (${safeQty} ${targetVar.label})`),
    });
    wb.set(movRef, movLog);
  }

  await wb.commit();
  return savedBatch;
}

/**
 * Adjusts remaining quantity on a specific batch OR writes off an expired batch cleanly.
 */
export async function adjustBatchOrWriteOff(params: {
  productId: string;
  batchId: string;
  adjustType: 'add' | 'subtract' | 'set' | 'write_off_expired';
  quantity?: number;
  reason?: string;
  movementType?: StockMovementLog['type'];
}): Promise<void> {
  const { productId, batchId, adjustType, quantity = 0, reason, movementType } = params;
  const prodRef = doc(db, 'accounting_products', productId);
  const prodSnap = await getDoc(prodRef);
  if (!prodSnap.exists()) throw new Error('उत्पाद नहीं मिला');

  const prod = { id: prodSnap.id, ...prodSnap.data() } as AccountingProduct;
  const variants = getProductVariants(prod);
  const existingBatches = Array.isArray(prod.batches) ? prod.batches.map(b => ({ ...b })) : [];
  const idx = existingBatches.findIndex(b => b.id === batchId);
  if (idx === -1) throw new Error('बैच रिकॉर्ड नहीं मिला');

  const targetBatch = existingBatches[idx];
  const unbatchedOverride: Record<string, number> = {};
  for (const v of variants) {
    unbatchedOverride[v.id] = calculateVariantStockSummary(prod, v).unbatchedPacks;
  }

  const now = Date.now();
  const dateStr = new Date(now).toISOString().split('T')[0];
  const prevRem = targetBatch.remainingPackQuantity || 0;
  const safeQty = Math.max(0, Number(quantity) || 0);
  let nextRem = prevRem;
  let nextStatus: StockBatch['status'] = targetBatch.status || 'active';

  if (adjustType === 'write_off_expired') {
    nextRem = 0;
    nextStatus = 'expired_written_off';
  } else if (adjustType === 'set') {
    nextRem = safeQty;
    nextStatus = nextRem > 0 ? 'active' : 'exhausted';
  } else if (adjustType === 'add') {
    nextRem = prevRem + safeQty;
    nextStatus = nextRem > 0 ? 'active' : 'exhausted';
  } else if (adjustType === 'subtract') {
    nextRem = Math.max(0, prevRem - safeQty);
    nextStatus = nextRem > 0 ? 'active' : 'exhausted';
  }

  existingBatches[idx] = sanitizeBatchForFirestore({
    ...targetBatch,
    remainingPackQuantity: nextRem,
    initialPackQuantity: Math.max(targetBatch.initialPackQuantity || 0, nextRem),
    status: nextStatus,
    updatedAt: now,
  });

  const synced = syncProductVariantsWithBatches(prod, variants, existingBatches, 122, unbatchedOverride);
  const matchedVar = synced.updatedVariants.find(v => v.id === targetBatch.variantId) || synced.updatedVariants[0];

  const wb = writeBatch(db);
  wb.update(
    prodRef,
    stripUndefinedDeep({
      batches: synced.cleanedBatches,
      packagingVariants: synced.updatedVariants,
      currentStock: synced.totalSaleablePacks,
      updatedAt: now,
    })
  );

  const delta = nextRem - prevRem;
  const movRef = doc(collection(db, 'accounting_stock_movements'));
  const movLog: StockMovementLog = stripUndefinedDeep({
    id: movRef.id,
    timestamp: now,
    date: dateStr,
    productId,
    productName: prod.hindiName || prod.name,
    variantId: matchedVar?.id,
    variantLabel: matchedVar?.label,
    batchId: targetBatch.id,
    batchNumber: targetBatch.batchNumber,
    expiryDate: targetBatch.expiryDate,
    purchaseCostPerPack: targetBatch.purchasePricePerPack ?? matchedVar?.costPrice,
    type:
      movementType ||
      (adjustType === 'write_off_expired' ? 'expired_writeoff' : 'weighing_adjustment'),
    quantityChangePacks: delta,
    balancePacksAfter: matchedVar?.currentStockPacks ?? synced.totalSaleablePacks,
    reason:
      reason ||
      (adjustType === 'write_off_expired'
        ? `एक्सपायर्ड बैच (${targetBatch.batchNumber || 'बिना नं.'}) राइट-ऑफ़ (${Math.abs(delta)} पैक)`
        : `बैच (${targetBatch.batchNumber || 'बिना नं.'}) स्टॉक समायोजन`),
  });
  wb.set(movRef, movLog);
  await wb.commit();
}

/**
 * Dismisses a completeness warning on a specific batch (or all batches of a product)
 * while still recording which keys admin acknowledged.
 */
export async function dismissBatchWarning(params: {
  productId: string;
  batchId: string;
  warningKey: string;
}): Promise<void> {
  const { productId, batchId, warningKey } = params;
  const prodRef = doc(db, 'accounting_products', productId);
  const prodSnap = await getDoc(prodRef);
  if (!prodSnap.exists()) return;

  const prod = prodSnap.data() as AccountingProduct;
  const batches = Array.isArray(prod.batches) ? [...prod.batches] : [];
  const idx = batches.findIndex(b => b.id === batchId);
  if (idx === -1) return;

  const existing = new Set(batches[idx].dismissedWarnings || []);
  existing.add(warningKey);
  batches[idx] = sanitizeBatchForFirestore({
    ...batches[idx],
    dismissedWarnings: Array.from(existing),
    updatedAt: Date.now(),
  });

  await updateDoc(prodRef, stripUndefinedDeep({ batches, updatedAt: Date.now() }));
}

/**
 * Converts legacy unbatched packs of a variant into an official tracked StockBatch cleanly.
 */
export async function convertUnbatchedStockToBatch(params: {
  productId: string;
  variantId: string;
  batchNumber?: string;
  manufacturingDate?: string;
  mfgDisplay?: string;
  expiryDate?: string;
  expiryDisplay?: string;
  purchasePricePerPack?: number;
}): Promise<StockBatch> {
  const { productId, variantId, ...batchDetails } = params;
  const prodRef = doc(db, 'accounting_products', productId);
  const prodSnap = await getDoc(prodRef);
  if (!prodSnap.exists()) throw new Error('उत्पाद नहीं मिला');

  const prod = { id: prodSnap.id, ...prodSnap.data() } as AccountingProduct;
  const variants = getProductVariants(prod);
  const targetVar = variants.find(v => v.id === variantId);
  if (!targetVar) throw new Error('पैकेजिंग वेरिएंट नहीं मिला');

  const summary = calculateVariantStockSummary(prod, targetVar);
  const qtyToConvert = summary.unbatchedPacks;
  if (qtyToConvert <= 0) {
    throw new Error('इस साइज में कोई बिना-बैच (Unbatched) स्टॉक शेष नहीं है।');
  }

  const now = Date.now();
  const dateStr = new Date(now).toISOString().split('T')[0];

  const unbatchedOverride: Record<string, number> = {};
  for (const v of variants) {
    unbatchedOverride[v.id] = v.id === variantId ? 0 : calculateVariantStockSummary(prod, v).unbatchedPacks;
  }

  const newBatch = sanitizeBatchForFirestore({
    id: `batch_${now}_${Math.random().toString(36).slice(2, 6)}`,
    productId,
    variantId,
    batchNumber: batchDetails.batchNumber,
    manufacturingDate: batchDetails.manufacturingDate,
    mfgDisplay: batchDetails.mfgDisplay,
    expiryDate: batchDetails.expiryDate,
    expiryDisplay: batchDetails.expiryDisplay,
    purchasePricePerPack: batchDetails.purchasePricePerPack ?? targetVar.costPrice,
    initialPackQuantity: qtyToConvert,
    remainingPackQuantity: qtyToConvert,
    status: 'active',
    purchaseDate: dateStr,
    createdAt: now,
    updatedAt: now,
  });

  const existingBatches = Array.isArray(prod.batches) ? [...prod.batches, newBatch] : [newBatch];
  const synced = syncProductVariantsWithBatches(prod, variants, existingBatches, 122, unbatchedOverride);

  const wb = writeBatch(db);
  wb.update(
    prodRef,
    stripUndefinedDeep({
      batches: synced.cleanedBatches,
      packagingVariants: synced.updatedVariants,
      currentStock: synced.totalSaleablePacks,
      updatedAt: now,
    })
  );

  const movRef = doc(collection(db, 'accounting_stock_movements'));
  wb.set(
    movRef,
    stripUndefinedDeep({
      id: movRef.id,
      timestamp: now,
      date: dateStr,
      productId,
      productName: prod.hindiName || prod.name,
      variantId: targetVar.id,
      variantLabel: targetVar.label,
      batchId: newBatch.id,
      batchNumber: newBatch.batchNumber,
      expiryDate: newBatch.expiryDate,
      purchaseCostPerPack: newBatch.purchasePricePerPack,
      type: 'opening',
      quantityChangePacks: 0,
      balancePacksAfter: synced.updatedVariants.find(v => v.id === variantId)?.currentStockPacks ?? qtyToConvert,
      reason: `बिना-बैच के ${qtyToConvert} पैक को बैच ${newBatch.batchNumber || '(बिना नं.)'} में बदला गया`,
    })
  );

  await wb.commit();
  return newBatch;
}

/**
 * Opens one or more sealed packs of a specific packaging variant (FEFO or selected Batch)
 * and transfers the volume/weight into the product's loose stock pool.
 */
export async function openSealedPack(
  productId: string,
  variantId: string,
  packsToOpen = 1,
  manualBatchId?: string
): Promise<{ success: boolean; looseAdded: number; message: string }> {
  const prodRef = doc(db, 'accounting_products', productId);
  const [prodSnap, stockConfig] = await Promise.all([
    getDoc(prodRef),
    fetchStockManagementConfig(),
  ]);
  if (!prodSnap.exists()) {
    throw new Error('उत्पाद नहीं मिला (Product not found)');
  }

  const prod = { id: prodSnap.id, ...prodSnap.data() } as AccountingProduct;
  const variants = getProductVariants(prod);
  const targetVarIndex = variants.findIndex(v => v.id === variantId);

  if (targetVarIndex === -1) {
    throw new Error('पैकेजिंग साइज नहीं मिला (Variant not found)');
  }

  const targetVar = { ...variants[targetVarIndex] };
  const summary = calculateVariantStockSummary(
    prod,
    targetVar,
    stockConfig.defaultLowStockThreshold ?? 10,
    stockConfig.expiryWarningDays ?? 122
  );

  if (summary.saleablePacks < packsToOpen) {
    throw new Error(
      summary.batchedExpiredPacks > 0 && summary.saleablePacks === 0
        ? `इस साइज (${targetVar.label}) के सभी ${summary.batchedExpiredPacks} पैक एक्सपायर्ड हो चुके हैं — इन्हें खुले स्टॉक में नहीं खोला जा सकता।`
        : `सीलबंद बिक्री योग्य पैकेट अपर्याप्त हैं। उपलब्ध: ${summary.saleablePacks}`
    );
  }

  const alloc = allocateFefoBatches({
    product: prod,
    variant: targetVar,
    requestedPacks: packsToOpen,
    manualBatchId,
    allowNegativeStock: false,
    blockExpiredSale: stockConfig.blockExpiredSale !== false,
    expiryWarningDays: stockConfig.expiryWarningDays ?? 122,
  });

  if (alloc.errorReason) {
    throw new Error(alloc.errorReason);
  }

  // Apply batch deductions
  const unbatchedOverride: Record<string, number> = {};
  for (const v of variants) {
    const s = calculateVariantStockSummary(prod, v);
    unbatchedOverride[v.id] = v.id === targetVar.id
      ? Math.max(0, s.unbatchedPacks - alloc.unbatchedPacksUsed)
      : s.unbatchedPacks;
  }

  const nextBatches = Array.isArray(prod.batches) ? prod.batches.map(b => ({ ...b })) : [];
  for (const a of alloc.allocations) {
    const bIdx = nextBatches.findIndex(b => b.id === a.batchId);
    if (bIdx !== -1) {
      nextBatches[bIdx].remainingPackQuantity = Math.max(
        0,
        (nextBatches[bIdx].remainingPackQuantity || 0) - a.packsUsed
      );
      nextBatches[bIdx].updatedAt = Date.now();
    }
  }

  const synced = syncProductVariantsWithBatches(
    prod,
    variants,
    nextBatches,
    stockConfig.expiryWarningDays ?? 122,
    unbatchedOverride
  );
  const updatedVar = synced.updatedVariants.find(v => v.id === targetVar.id) || targetVar;

  // Calculate base quantity (ml or g)
  let baseQtyPerPack = targetVar.baseQuantity;
  if (!baseQtyPerPack || baseQtyPerPack <= 0) {
    const unit = (targetVar.sizeUnit || '').toLowerCase();
    if (unit === 'ltr' || unit === 'l') baseQtyPerPack = targetVar.sizeValue * 1000;
    else if (unit === 'kg') baseQtyPerPack = targetVar.sizeValue * 1000;
    else baseQtyPerPack = targetVar.sizeValue;
  }

  const totalBaseQtyToAdd = baseQtyPerPack * packsToOpen;
  const isLiquid =
    targetVar.sizeUnit === 'ml' ||
    targetVar.sizeUnit === 'Ltr' ||
    prod.unit === 'Ltr' ||
    prod.unit === 'Ml';
  const detectedBaseUnit: 'ml' | 'g' = isLiquid ? 'ml' : 'g';

  const currentLoose = prod.looseStock?.availableBaseQty || 0;
  const newLooseQty = currentLoose + totalBaseQtyToAdd;

  const packCostForCalc = alloc.weightedUnitCost > 0 ? alloc.weightedUnitCost : targetVar.costPrice;
  const costPerBaseUnit =
    baseQtyPerPack > 0 ? packCostForCalc / baseQtyPerPack : prod.costPrice / (baseQtyPerPack || 1);
  const sellingPerBaseUnit =
    baseQtyPerPack > 0
      ? targetVar.sellingPrice / baseQtyPerPack
      : prod.defaultSellingPrice / (baseQtyPerPack || 1);

  const primaryAlloc = alloc.allocations[0];
  const newLooseStock: LooseStockPool = stripUndefinedDeep({
    availableBaseQty: newLooseQty,
    baseUnit: detectedBaseUnit,
    costPerBaseUnit: Math.round(costPerBaseUnit * 10000) / 10000,
    sellingPricePerBaseUnit: Math.round(sellingPerBaseUnit * 10000) / 10000,
    lastOpenedFromVariantId: targetVar.id,
    lastOpenedBatchNumber: primaryAlloc?.batchNumber || prod.looseStock?.lastOpenedBatchNumber,
    activeBatchId: primaryAlloc?.batchId || prod.looseStock?.activeBatchId,
    activeBatchExpiryDate: primaryAlloc?.expiryDate || prod.looseStock?.activeBatchExpiryDate,
    updatedAt: Date.now(),
  });

  const wb = writeBatch(db);
  wb.update(
    prodRef,
    stripUndefinedDeep({
      batches: synced.cleanedBatches,
      packagingVariants: synced.updatedVariants,
      currentStock: synced.totalSaleablePacks,
      looseStock: newLooseStock,
      updatedAt: Date.now(),
    })
  );

  // Log stock movement
  const movRef = doc(collection(db, 'accounting_stock_movements'));
  const movLog: StockMovementLog = stripUndefinedDeep({
    id: movRef.id,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
    productId,
    productName: prod.hindiName || prod.name,
    variantId: targetVar.id,
    variantLabel: targetVar.label,
    batchId: primaryAlloc?.batchId,
    batchNumber: alloc.batchNumbersSummary,
    expiryDate: primaryAlloc?.expiryDate,
    purchaseCostPerPack: alloc.weightedUnitCost,
    type: 'pack_opened',
    quantityChangePacks: -packsToOpen,
    quantityChangeBaseUnit: totalBaseQtyToAdd,
    balancePacksAfter: updatedVar.currentStockPacks,
    balanceBaseUnitAfter: newLooseQty,
    reason: `${packsToOpen} सीलबंद पैकेट (${targetVar.label}${alloc.batchNumbersSummary ? ` · बैच: ${alloc.batchNumbersSummary}` : ''}) खोलकर ${totalBaseQtyToAdd} ${detectedBaseUnit} खुले स्टॉक में जमा किया गया।`,
  });
  wb.set(movRef, movLog);

  await wb.commit();

  return {
    success: true,
    looseAdded: totalBaseQtyToAdd,
    message: `${targetVar.label} का ${packsToOpen} पैकेट सफलतापूर्वक खुला${alloc.batchNumbersSummary ? ` (बैच: ${alloc.batchNumbersSummary})` : ''}। अब कुल ${newLooseQty} ${detectedBaseUnit} खुला स्टॉक उपलब्ध है।`,
  };
}

/**
 * Stock adjustment for physical verification, opening stock, purchase, weighing tolerance losses, or damage write-offs.
 */
export async function adjustProductStock(params: {
  productId: string;
  variantId?: string;
  isLooseStock?: boolean;
  adjustType: 'set' | 'add' | 'subtract';
  quantity: number;
  reason: string;
  movementType?: StockMovementLog['type'];
}): Promise<void> {
  const {
    productId,
    variantId,
    isLooseStock,
    adjustType,
    quantity,
    reason,
    movementType = 'weighing_adjustment',
  } = params;
  const prodRef = doc(db, 'accounting_products', productId);
  const prodSnap = await getDoc(prodRef);
  if (!prodSnap.exists()) throw new Error('उत्पाद नहीं मिला');

  const prod = prodSnap.data() as AccountingProduct;
  const batch = writeBatch(db);
  const now = Date.now();
  const safeQty = Math.max(0, Number(quantity) || 0);

  let packsChange: number | undefined;
  let baseUnitChange: number | undefined;
  let finalPacks: number | undefined;
  let finalBaseQty: number | undefined;
  let variantLabel: string | undefined;

  if (isLooseStock) {
    const currentLoose = prod.looseStock?.availableBaseQty || 0;
    let newLoose = currentLoose;
    if (adjustType === 'set') newLoose = Math.max(0, safeQty);
    else if (adjustType === 'add') newLoose = currentLoose + safeQty;
    else if (adjustType === 'subtract') newLoose = Math.max(0, currentLoose - safeQty);

    baseUnitChange = newLoose - currentLoose;
    finalBaseQty = newLoose;

    const firstVar = prod.packagingVariants?.[0];
    const baseUnit: 'ml' | 'g' =
      prod.looseStock?.baseUnit ||
      (prod.productType === 'liquid' || firstVar?.sizeUnit === 'ml' || firstVar?.sizeUnit === 'Ltr'
        ? 'ml'
        : 'g');

    if (prod.looseStock) {
      batch.update(prodRef, {
        'looseStock.availableBaseQty': newLoose,
        'looseStock.updatedAt': now,
        updatedAt: now,
      });
    } else {
      const basePerPack = firstVar
        ? firstVar.baseQuantity || normalizeToBaseUnit(firstVar.sizeValue, firstVar.sizeUnit)
        : 1000;
      const costPerBase = basePerPack > 0 ? (firstVar?.costPrice || prod.costPrice || 0) / basePerPack : 0;
      const sellPerBase =
        basePerPack > 0 ? (firstVar?.sellingPrice || prod.defaultSellingPrice || 0) / basePerPack : 0;

      const createdLoose: LooseStockPool = {
        availableBaseQty: newLoose,
        baseUnit,
        costPerBaseUnit: Math.round(costPerBase * 10000) / 10000,
        sellingPricePerBaseUnit: Math.round(sellPerBase * 10000) / 10000,
        lastOpenedFromVariantId: firstVar?.id,
        updatedAt: now,
      };
      batch.update(prodRef, {
        looseStock: createdLoose,
        updatedAt: now,
      });
    }
  } else if (variantId && prod.packagingVariants && prod.packagingVariants.length > 0) {
    const variants = prod.packagingVariants.map(v => {
      if (v.id === variantId) {
        variantLabel = v.label || `${v.sizeValue} ${v.sizeUnit}`;
        const cur = v.currentStockPacks || 0;
        let nxt = cur;
        if (adjustType === 'set') nxt = Math.max(0, safeQty);
        else if (adjustType === 'add') nxt = cur + safeQty;
        else if (adjustType === 'subtract') nxt = Math.max(0, cur - safeQty);

        packsChange = nxt - cur;
        finalPacks = nxt;
        return { ...v, currentStockPacks: nxt };
      }
      return v;
    });

    const totalSealed = variants.reduce((sum, v) => sum + (v.currentStockPacks || 0), 0);
    batch.update(prodRef, {
      packagingVariants: variants,
      currentStock: totalSealed,
      updatedAt: now,
    });
  } else {
    // Legacy top-level stock adjustment
    const cur = prod.currentStock || 0;
    let nxt = cur;
    if (adjustType === 'set') nxt = Math.max(0, safeQty);
    else if (adjustType === 'add') nxt = cur + safeQty;
    else if (adjustType === 'subtract') nxt = Math.max(0, cur - safeQty);

    packsChange = nxt - cur;
    finalPacks = nxt;

    batch.update(prodRef, {
      currentStock: nxt,
      updatedAt: now,
    });
  }

  // Record Audit Trail
  const movRef = doc(collection(db, 'accounting_stock_movements'));
  const movLog: StockMovementLog = stripUndefinedDeep({
    id: movRef.id,
    timestamp: now,
    date: new Date(now).toISOString().split('T')[0],
    productId,
    productName: prod.hindiName || prod.name,
    variantId,
    variantLabel,
    type: movementType,
    quantityChangePacks: packsChange,
    quantityChangeBaseUnit: baseUnitChange,
    balancePacksAfter: finalPacks,
    balanceBaseUnitAfter: finalBaseQty,
    reason: reason || 'स्टॉक एडजस्टमेंट (मैनुअल सत्यापन)',
  });
  batch.set(movRef, movLog);

  await batch.commit();
}

/**
 * Records stock movement audit logs when a product's stock quantities are initialized or updated from the Product modal.
 */
export async function recordProductStockMovementsBatch(
  entries: Array<Omit<StockMovementLog, 'id' | 'timestamp' | 'date'>>
): Promise<void> {
  if (!entries || entries.length === 0) return;
  const now = Date.now();
  const dateStr = new Date(now).toISOString().split('T')[0];

  for (let i = 0; i < entries.length; i += 350) {
    const chunk = entries.slice(i, i + 350);
    const batch = writeBatch(db);
    for (const entry of chunk) {
      const movRef = doc(collection(db, 'accounting_stock_movements'));
      const log: StockMovementLog = stripUndefinedDeep({
        ...entry,
        id: movRef.id,
        timestamp: now,
        date: dateStr,
      });
      batch.set(movRef, log);
    }
    await batch.commit();
  }
}

/**
 * Resets all legacy/existing product pack, batch & loose stock quantities to 0 cleanly
 * so Admin can start fresh Opening Stock & Batch entry without old residual numbers.
 */
export async function resetAllProductStockToZero(): Promise<number> {
  const products = await fetchAccountingProducts();
  const now = Date.now();
  let updatedCount = 0;

  for (let i = 0; i < products.length; i += 300) {
    const chunk = products.slice(i, i + 300);
    const batch = writeBatch(db);

    for (const p of chunk) {
      const prodRef = doc(db, 'accounting_products', p.id);
      const updatedVariants = (p.packagingVariants || []).map(v =>
        stripUndefinedDeep({
          ...v,
          currentStockPacks: 0,
          unbatchedPacks: undefined,
        })
      );
      const updatePayload: Record<string, any> = {
        currentStock: 0,
        batches: [],
        updatedAt: now,
      };
      if (p.packagingVariants) {
        updatePayload.packagingVariants = updatedVariants;
      }
      if (p.looseStock) {
        updatePayload.looseStock = stripUndefinedDeep({
          ...p.looseStock,
          availableBaseQty: 0,
          activeBatchId: undefined,
          activeBatchExpiryDate: undefined,
          lastOpenedBatchNumber: undefined,
          updatedAt: now,
        });
      }
      batch.update(prodRef, updatePayload);
      updatedCount++;
    }

    await batch.commit();
  }

  return updatedCount;
}

export async function fetchStockMovements(productId?: string, limitCount = 50): Promise<StockMovementLog[]> {
  try {
    if (productId) {
      const q = query(
        collection(db, 'accounting_stock_movements'),
        where('productId', '==', productId),
        limit(Math.max(limitCount, 100))
      );
      const snap = await getDocs(q);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as StockMovementLog))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, limitCount);
    }
    const q = query(
      collection(db, 'accounting_stock_movements'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovementLog));
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    return [];
  }
}

export async function deleteStockMovement(movementId: string): Promise<void> {
  const path = `accounting_stock_movements/${movementId}`;
  try {
    await deleteDoc(doc(db, 'accounting_stock_movements', movementId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearStockMovements(productId?: string): Promise<number> {
  const path = 'accounting_stock_movements';
  try {
    const q = productId
      ? query(collection(db, path), where('productId', '==', productId))
      : query(collection(db, path));
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    let deletedCount = 0;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const wb = writeBatch(db);
      for (const d of chunk) {
        wb.delete(d.ref);
        deletedCount++;
      }
      await wb.commit();
    }
    return deletedCount;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return 0;
  }
}

// ----------------------------------------------------
// CUSTOMER & UDHARI LEDGER (KHATA) MANAGEMENT
// ----------------------------------------------------

export async function fetchAccountingCustomers(includeArchived = true): Promise<AccountingCustomer[]> {
  try {
    const q = query(collection(db, 'accounting_customers'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingCustomer));
    if (!includeArchived) {
      return list.filter(c => !c.isArchived && c.status !== 'archived' && c.status !== 'closed');
    }
    return list;
  } catch (err) {
    console.error('Error fetching accounting customers:', err);
    return [];
  }
}

export async function checkCustomerHasFinancialHistory(customerId: string): Promise<{
  hasHistory: boolean;
  salesCount: number;
  ledgerCount: number;
  totalPurchases: number;
  totalPaid: number;
  currentOutstanding: number;
  customerName: string;
}> {
  try {
    const custRef = doc(db, 'accounting_customers', customerId);
    const custSnap = await getDoc(custRef);
    const custData = custSnap.exists() ? (custSnap.data() as AccountingCustomer) : null;

    const salesQ = query(collection(db, 'accounting_sales'), where('customerId', '==', customerId));
    const salesSnap = await getDocs(salesQ);

    const ledgerQ = query(collection(db, 'accounting_customer_ledger'), where('customerId', '==', customerId));
    const ledgerSnap = await getDocs(ledgerQ);

    const salesCount = salesSnap.size;
    const ledgerCount = ledgerSnap.size;
    const currentOutstanding = custData?.currentOutstanding || 0;
    const totalPurchases = custData?.totalPurchases || 0;
    const totalPaid = custData?.totalPaid || 0;

    const hasHistory = salesCount > 0 || ledgerCount > 0 || currentOutstanding > 0 || totalPurchases > 0 || totalPaid > 0;

    return {
      hasHistory,
      salesCount,
      ledgerCount,
      totalPurchases,
      totalPaid,
      currentOutstanding,
      customerName: custData?.name || 'किसान / ग्राहक',
    };
  } catch (err) {
    console.error('Error checking customer history:', err);
    return {
      hasHistory: false,
      salesCount: 0,
      ledgerCount: 0,
      totalPurchases: 0,
      totalPaid: 0,
      currentOutstanding: 0,
      customerName: 'किसान / ग्राहक',
    };
  }
}

export async function archiveOrCloseCustomerKhata(params: {
  customerId: string;
  adminEmail: string;
  adminName?: string;
  reason?: string;
  actionType?: 'archived' | 'closed';
}): Promise<void> {
  const { customerId, adminEmail, adminName, reason, actionType = 'closed' } = params;
  const now = Date.now();
  const custRef = doc(db, 'accounting_customers', customerId);
  const custSnap = await getDoc(custRef);
  if (!custSnap.exists()) throw new Error('ग्राहक रिकॉर्ड नहीं मिला।');
  const custData = custSnap.data() as AccountingCustomer;

  const batch = writeBatch(db);

  batch.update(custRef, {
    status: actionType,
    isArchived: true,
    archivedAt: now,
    archivedBy: adminEmail,
    notes: reason ? `${custData.notes ? custData.notes + ' | ' : ''}खाता बंद/आर्काइव कारण: ${reason}` : custData.notes,
    updatedAt: now,
  });

  // Record Audit Log
  const auditRef = doc(collection(db, 'accounting_audit_logs'));
  const auditLog: AccountingAuditLog = {
    id: auditRef.id,
    action: actionType === 'archived' ? 'customer_khata_archived' : 'customer_khata_closed',
    targetId: customerId,
    targetName: custData.name,
    targetType: 'customer',
    adminEmail,
    adminName: adminName || adminEmail,
    timestamp: now,
    date: new Date().toISOString().split('T')[0],
    reason: reason || 'Admin द्वारा खाता बंद / आर्काइव किया गया',
    previousAmount: custData.currentOutstanding || 0,
    financialImpact: {
      outstandingAmount: custData.currentOutstanding || 0,
      totalAmount: custData.totalPurchases || 0,
      paidAmount: custData.totalPaid || 0,
    },
    details: `ग्राहक: ${custData.name} (${custData.phone || 'No Phone'}), बकाया: ₹${custData.currentOutstanding || 0}`,
  };
  batch.set(auditRef, auditLog);

  await batch.commit();
}

export async function reopenCustomerKhata(customerId: string, adminEmail: string, adminName?: string): Promise<void> {
  const now = Date.now();
  const custRef = doc(db, 'accounting_customers', customerId);
  const custSnap = await getDoc(custRef);
  if (!custSnap.exists()) throw new Error('ग्राहक रिकॉर्ड नहीं मिला।');
  const custData = custSnap.data() as AccountingCustomer;

  const batch = writeBatch(db);

  batch.update(custRef, {
    status: 'good',
    isArchived: false,
    updatedAt: now,
  });

  const auditRef = doc(collection(db, 'accounting_audit_logs'));
  const auditLog: AccountingAuditLog = {
    id: auditRef.id,
    action: 'customer_khata_reopened',
    targetId: customerId,
    targetName: custData.name,
    targetType: 'customer',
    adminEmail,
    adminName: adminName || adminEmail,
    timestamp: now,
    date: new Date().toISOString().split('T')[0],
    reason: 'खाता पुनः सक्रिय किया गया',
    previousAmount: custData.currentOutstanding || 0,
    details: `ग्राहक: ${custData.name}, बकाया: ₹${custData.currentOutstanding || 0}`,
  };
  batch.set(auditRef, auditLog);

  await batch.commit();
}

export async function deleteCustomerKhata(params: {
  customerId: string;
  adminEmail: string;
  adminName?: string;
  reason?: string;
}): Promise<void> {
  const { customerId, adminEmail, adminName, reason } = params;
  const now = Date.now();
  const custRef = doc(db, 'accounting_customers', customerId);
  const custSnap = await getDoc(custRef);
  if (!custSnap.exists()) return;
  const custData = custSnap.data() as AccountingCustomer;

  const history = await checkCustomerHasFinancialHistory(customerId);

  const batch = writeBatch(db);

  // Record Audit Log with complete snapshot of financial history
  const auditRef = doc(collection(db, 'accounting_audit_logs'));
  const auditLog: AccountingAuditLog = {
    id: auditRef.id,
    action: 'customer_khata_deleted',
    targetId: customerId,
    targetName: custData.name,
    targetType: 'customer',
    adminEmail,
    adminName: adminName || adminEmail,
    timestamp: now,
    date: new Date().toISOString().split('T')[0],
    reason: reason || 'Admin द्वारा ग्राहक खाता स्थायी हटाया गया',
    previousAmount: custData.currentOutstanding || 0,
    financialImpact: {
      outstandingAmount: custData.currentOutstanding || 0,
      totalAmount: custData.totalPurchases || 0,
      paidAmount: custData.totalPaid || 0,
    },
    details: `ग्राहक: ${custData.name} (${custData.phone || ''}), गांव: ${custData.village || ''}, बिक्री संख्या: ${history.salesCount}, लेजर एंट्रीज: ${history.ledgerCount}, अंतिम बकाया: ₹${custData.currentOutstanding || 0}`,
  };
  batch.set(auditRef, auditLog);

  batch.delete(custRef);

  await batch.commit();
}

export async function saveAccountingCustomer(customer: Omit<AccountingCustomer, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<string> {
  const now = Date.now();
  const custRef = id ? doc(db, 'accounting_customers', id) : doc(collection(db, 'accounting_customers'));
  const payload = {
    ...customer,
    updatedAt: now,
    ...(id ? {} : { createdAt: now }),
  };
  await setDoc(custRef, payload, { merge: true });
  return custRef.id;
}

export async function fetchCustomerLedger(customerId: string): Promise<CustomerLedgerEntry[]> {
  try {
    const q = query(
      collection(db, 'accounting_customer_ledger'),
      where('customerId', '==', customerId),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerLedgerEntry));
  } catch (err) {
    console.error('Error fetching customer ledger:', err);
    return [];
  }
}

export async function recordCustomerPayment(
  customerId: string,
  customerName: string,
  amount: number,
  paymentMode: 'cash' | 'online' | 'bank',
  note: string,
  dateStr?: string
): Promise<void> {
  const now = Date.now();
  const today = dateStr || new Date().toISOString().split('T')[0];
  
  // 1. Get current customer state
  const custRef = doc(db, 'accounting_customers', customerId);
  const custSnap = await getDoc(custRef);
  if (!custSnap.exists()) {
    throw new Error('ग्राहक नहीं मिला (Customer not found).');
  }

  const custData = custSnap.data() as AccountingCustomer;
  const currentOutstanding = custData.currentOutstanding || 0;
  const newOutstanding = Math.max(0, currentOutstanding - amount);
  const totalPaid = (custData.totalPaid || 0) + amount;

  const batch = writeBatch(db);

  // 2. Update Customer Doc
  batch.update(custRef, {
    currentOutstanding: newOutstanding,
    totalPaid,
    lastPaymentDate: today,
    status: newOutstanding <= custData.creditLimit ? 'good' : 'warning',
    updatedAt: now,
  });

  // 3. Create Ledger Entry
  const ledgerRef = doc(collection(db, 'accounting_customer_ledger'));
  const ledgerEntry: CustomerLedgerEntry = {
    id: ledgerRef.id,
    customerId,
    customerName,
    type: 'payment_credit',
    amount,
    balanceAfter: newOutstanding,
    paymentMode,
    date: today,
    timestamp: now,
    note: note || `उधारी जमा (Payment Received via ${paymentMode})`,
  };
  batch.set(ledgerRef, ledgerEntry);

  await batch.commit();
}

// ----------------------------------------------------
// OFFLINE SALES (BILLING & INVOICE ENGINE)
// ----------------------------------------------------

export async function fetchAccountingSales(limitCount = 100): Promise<AccountingSale[]> {
  try {
    const q = query(
      collection(db, 'accounting_sales'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingSale));
  } catch (err) {
    console.error('Error fetching sales:', err);
    return [];
  }
}

export async function fetchAccountingSaleById(saleId: string): Promise<AccountingSale | null> {
  try {
    const snap = await getDoc(doc(db, 'accounting_sales', saleId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as AccountingSale;
    }
    return null;
  } catch (err) {
    console.error('Error fetching sale by id:', err);
    return null;
  }
}

export async function fetchAccountingSaleByInvoiceNo(invoiceNo: string): Promise<AccountingSale | null> {
  try {
    const q = query(
      collection(db, 'accounting_sales'),
      where('invoiceNo', '==', invoiceNo),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as AccountingSale;
    }
    return null;
  } catch (err) {
    console.error('Error fetching sale by invoice no:', err);
    return null;
  }
}

/**
 * Fetch sale by combination of Bill Number + Bill Date (for offline paper bill validation)
 * Multiple paper bill books can have the same number (e.g. #3) on different dates,
 * so uniqueness is strictly enforced on (invoiceNo + date) pair.
 */
export async function fetchAccountingSaleByInvoiceNoAndDate(invoiceNo: string, date: string): Promise<AccountingSale | null> {
  const trimmedNo = invoiceNo?.trim();
  const trimmedDate = date?.trim();
  if (!trimmedNo || !trimmedDate) return null;

  try {
    const q = query(
      collection(db, 'accounting_sales'),
      where('invoiceNo', '==', trimmedNo),
      where('date', '==', trimmedDate),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as AccountingSale;
    }
    return null;
  } catch (err) {
    console.warn('Direct compound query error, falling back to invoice search:', err);
    try {
      const qFallback = query(
        collection(db, 'accounting_sales'),
        where('invoiceNo', '==', trimmedNo),
        limit(20)
      );
      const snap = await getDocs(qFallback);
      const matched = snap.docs.find(d => {
        const data = d.data() as AccountingSale;
        return data.date === trimmedDate;
      });
      if (matched) {
        return { id: matched.id, ...matched.data() } as AccountingSale;
      }
      return null;
    } catch (fallbackErr) {
      console.error('Error fetching sale by invoice no and date:', fallbackErr);
      return null;
    }
  }
}

/**
 * Format sequential POS bill number
 * 1 -> FKB-0001
 * 2 -> FKB-0002
 * 9999 -> FKB-9999
 * 10000 -> FKB-10000
 */
export function formatPOSInvoiceNo(seq: number): string {
  const safeSeq = Math.max(1, Math.floor(seq || 1));
  if (safeSeq < 10000) {
    return `FKB-${String(safeSeq).padStart(4, '0')}`;
  }
  return `FKB-${safeSeq}`;
}

/**
 * Peek next available bill number for live UI preview
 */
export async function getNextPOSInvoiceNoPreview(): Promise<string> {
  try {
    const counterRef = doc(db, 'accounting_settings', 'pos_sequence');
    const counterSnap = await getDoc(counterRef);
    if (!counterSnap.exists()) {
      return formatPOSInvoiceNo(1);
    }
    const data = counterSnap.data();
    const lastSeq = typeof data.lastSequence === 'number' ? data.lastSequence : 0;
    return formatPOSInvoiceNo(lastSeq + 1);
  } catch (err) {
    console.warn('Could not read pos_sequence counter, default to FKB-0001:', err);
    return 'FKB-0001';
  }
}

export async function createOfflineSale(saleData: Omit<AccountingSale, 'id' | 'createdAt'>): Promise<string> {
  const now = Date.now();
  const counterRef = doc(db, 'accounting_settings', 'pos_sequence');
  const stockConfigRef = doc(db, 'accounting_settings', 'stock_management_config');
  const saleRef = doc(collection(db, 'accounting_sales'));

  let assignedInvoiceNo = '';

  await runTransaction(db, async (transaction) => {
    // =========================================================================
    // PHASE 1: ALL READ OPERATIONS FIRST (Mandatory Firestore rule)
    // =========================================================================

    // 1. Read sequence counter & stock management config atomically
    const [counterSnap, stockConfigSnap] = await Promise.all([
      transaction.get(counterRef),
      transaction.get(stockConfigRef),
    ]);

    let lastSeq = 0;
    if (counterSnap.exists()) {
      const cData = counterSnap.data();
      if (typeof cData.lastSequence === 'number') {
        lastSeq = cData.lastSequence;
      }
    }

    const stockConfig: StockManagementConfig = stockConfigSnap.exists()
      ? {
          enabled: Boolean(stockConfigSnap.data()?.enabled),
          allowNegativeStock: Boolean(stockConfigSnap.data()?.allowNegativeStock),
          autoOpenPackOnLooseSale:
            stockConfigSnap.data()?.autoOpenPackOnLooseSale === undefined
              ? true
              : Boolean(stockConfigSnap.data()?.autoOpenPackOnLooseSale),
          defaultLowStockThreshold:
            typeof stockConfigSnap.data()?.defaultLowStockThreshold === 'number'
              ? stockConfigSnap.data()?.defaultLowStockThreshold
              : 10,
          expiryWarningDays:
            typeof stockConfigSnap.data()?.expiryWarningDays === 'number'
              ? stockConfigSnap.data()?.expiryWarningDays
              : 122,
          blockExpiredSale:
            stockConfigSnap.data()?.blockExpiredSale === undefined
              ? true
              : Boolean(stockConfigSnap.data()?.blockExpiredSale),
          updatedAt: Number(stockConfigSnap.data()?.updatedAt) || now,
        }
      : {
          enabled: false,
          allowNegativeStock: false,
          autoOpenPackOnLooseSale: true,
          defaultLowStockThreshold: 10,
          expiryWarningDays: 122,
          blockExpiredSale: true,
          updatedAt: 0,
        };

    // Determine invoice number:
    const isPlaceholder = !saleData.invoiceNo || saleData.invoiceNo.trim() === '' || saleData.invoiceNo.startsWith('FKB-TEMP');
    let shouldUpdateCounter = false;
    let nextSeq = lastSeq;
    if (!isPlaceholder && saleData.invoiceNo) {
      assignedInvoiceNo = saleData.invoiceNo.trim();
    } else {
      nextSeq = lastSeq + 1;
      assignedInvoiceNo = formatPOSInvoiceNo(nextSeq);
      shouldUpdateCounter = true;
    }

    // 2. Read customer if udhari (READ OPERATION - must be before any writes)
    let custRead: { ref: DocumentReference; snap: any } | null = null;
    if (saleData.udhariAmount > 0 && saleData.customerId) {
      const custRef = doc(db, 'accounting_customers', saleData.customerId);
      const custSnap = await transaction.get(custRef);
      custRead = { ref: custRef, snap: custSnap };
    }

    // 3. If Stock Quantity Management is ON, read each unique product doc ONCE
    interface WorkingProductState {
      ref: DocumentReference;
      data: AccountingProduct;
      variants: PackagingVariant[];
      batches: StockBatch[];
      unbatchedMap: Record<string, number>;
      hasStoredVariants: boolean;
      looseStock?: LooseStockPool;
      currentStock: number;
      modified: boolean;
    }
    const workingProducts = new Map<string, WorkingProductState>();
    const movementsToWrite: StockMovementLog[] = [];
    const authoritativeItems: AccountingSaleItem[] = (saleData.items || []).map(it => ({ ...it }));

    if (stockConfig.enabled && Array.isArray(authoritativeItems)) {
      const uniqueProductIds = Array.from(
        new Set(authoritativeItems.map(it => it.productId).filter((id): id is string => Boolean(id)))
      );

      const prodSnaps = await Promise.all(
        uniqueProductIds.map(async pid => {
          const pRef = doc(db, 'accounting_products', pid);
          const pSnap = await transaction.get(pRef);
          return { pid, pRef, pSnap };
        })
      );

      for (const { pid, pRef, pSnap } of prodSnaps) {
        if (!pSnap.exists()) continue;
        const pData = { id: pSnap.id, ...pSnap.data() } as AccountingProduct;
        const storedVariants = Array.isArray(pData.packagingVariants)
          ? pData.packagingVariants.map(v => ({ ...v }))
          : [];
        const storedBatches = Array.isArray(pData.batches)
          ? pData.batches.map(b => ({ ...b }))
          : [];
        const unbatchedMap: Record<string, number> = {};
        for (const v of storedVariants) {
          unbatchedMap[v.id] = calculateVariantStockSummary(
            { ...pData, packagingVariants: storedVariants, batches: storedBatches },
            v,
            stockConfig.defaultLowStockThreshold ?? 10,
            stockConfig.expiryWarningDays ?? 122
          ).unbatchedPacks;
        }
        workingProducts.set(pid, {
          ref: pRef,
          data: pData,
          variants: storedVariants,
          batches: storedBatches,
          unbatchedMap,
          hasStoredVariants: storedVariants.length > 0,
          looseStock: pData.looseStock ? { ...pData.looseStock } : undefined,
          currentStock: pData.currentStock || 0,
          modified: false,
        });
      }

      const saleDateStr = saleData.date || new Date(now).toISOString().split('T')[0];
      const blockExpired = stockConfig.blockExpiredSale !== false;
      const warnDays = stockConfig.expiryWarningDays ?? 122;

      for (let itemIdx = 0; itemIdx < authoritativeItems.length; itemIdx++) {
        const item = authoritativeItems[itemIdx];
        if (!item.productId) continue;
        const wp = workingProducts.get(item.productId);
        if (!wp) continue;

        const productLabel = item.hindiName || item.name || wp.data.hindiName || wp.data.name;

        if (item.saleType === 'loose') {
          // LOOSE SALE DEDUCTION + BATCH EXPIRY GUARD + FEFO AUTO-OPEN
          const rawQty = Number(item.looseQuantity ?? item.quantity) || 0;
          const unitLower = String(item.looseUnit || item.unit || '').toLowerCase();
          const isLargeUnit =
            unitLower === 'kg' ||
            unitLower === 'l' ||
            unitLower === 'ltr' ||
            unitLower === 'लीटर' ||
            unitLower === 'किलो';
          const computedBaseQty =
            item.looseBaseQty && item.looseBaseQty > 0
              ? Number(item.looseBaseQty)
              : isLargeUnit
              ? rawQty * 1000
              : rawQty;
          const reqBaseQty = Math.max(0, computedBaseQty);

          if (reqBaseQty <= 0) continue;

          const baseUnit: 'ml' | 'g' =
            wp.looseStock?.baseUnit ||
            (unitLower === 'ml' || unitLower === 'l' || unitLower === 'ltr' || wp.data.productType === 'liquid'
              ? 'ml'
              : 'g');

          if (!wp.looseStock) {
            wp.looseStock = {
              availableBaseQty: 0,
              baseUnit,
              costPerBaseUnit: item.costPerBaseUnit || 0,
              sellingPricePerBaseUnit: item.sellingPricePerBaseUnit || 0,
              lastOpenedFromVariantId: item.openedPackFromVariantId || item.variantId,
              updatedAt: now,
            };
          }

          // Check open loose batch expiry if any qty sits in open pool
          if (
            blockExpired &&
            (wp.looseStock.availableBaseQty || 0) > 0 &&
            wp.looseStock.activeBatchExpiryDate
          ) {
            const looseAlert = calculateExpiryAlert(wp.looseStock.activeBatchExpiryDate);
            if (!looseAlert.isSaleable) {
              throw new Error(
                `खुला स्टॉक एक्सपायर्ड: "${productLabel}" का खुला स्टॉक${wp.looseStock.lastOpenedBatchNumber ? ` (बैच: ${wp.looseStock.lastOpenedBatchNumber})` : ''} एक्सपायरी तिथि पार कर चुका है — बिक्री प्रतिबंधित है।`
              );
            }
          }

          let currentLooseAvail = wp.looseStock.availableBaseQty || 0;

          if (currentLooseAvail < reqBaseQty) {
            const shortage = reqBaseQty - currentLooseAvail;
            const preferredVariantId = item.openedPackFromVariantId || item.variantId;
            let sourceVariantIdx = preferredVariantId
              ? wp.variants.findIndex(v => v.id === preferredVariantId)
              : -1;
            if (sourceVariantIdx === -1 && wp.variants.length === 1) {
              sourceVariantIdx = 0;
            }

            const sourceVar = sourceVariantIdx !== -1 ? wp.variants[sourceVariantIdx] : null;
            const basePerPack = sourceVar
              ? sourceVar.baseQuantity && sourceVar.baseQuantity > 0
                ? sourceVar.baseQuantity
                : normalizeToBaseUnit(sourceVar.sizeValue, sourceVar.sizeUnit)
              : 0;

            const sourceSummary = sourceVar
              ? calculateVariantStockSummary(
                  { ...wp.data, packagingVariants: wp.variants, batches: wp.batches },
                  sourceVar,
                  stockConfig.defaultLowStockThreshold ?? 10,
                  warnDays
                )
              : null;

            if (
              stockConfig.autoOpenPackOnLooseSale !== false &&
              sourceVar &&
              sourceSummary &&
              basePerPack > 0 &&
              sourceSummary.saleablePacks > 0
            ) {
              const packsNeeded = Math.ceil(shortage / basePerPack);
              const availPacks = sourceSummary.saleablePacks;

              if (availPacks < packsNeeded && !stockConfig.allowNegativeStock) {
                const maxPossibleBase = currentLooseAvail + availPacks * basePerPack;
                throw new Error(
                  `खुला स्टॉक अपर्याप्त: "${productLabel}" के लिए ${reqBaseQty} ${baseUnit} चाहिए, लेकिन केवल ${maxPossibleBase} ${baseUnit} बिक्री योग्य स्टॉक उपलब्ध है (${currentLooseAvail} ${baseUnit} खुला + ${availPacks} × ${sourceVar.label})।`
                );
              }

              const actualPacksToOpen = packsNeeded;
              const openAlloc = allocateFefoBatches({
                product: { ...wp.data, packagingVariants: wp.variants, batches: wp.batches },
                variant: sourceVar,
                requestedPacks: actualPacksToOpen,
                manualBatchId: item.selectedBatchId,
                allowNegativeStock: Boolean(stockConfig.allowNegativeStock),
                blockExpiredSale: blockExpired,
                expiryWarningDays: warnDays,
              });

              if (openAlloc.errorReason && !stockConfig.allowNegativeStock) {
                throw new Error(openAlloc.errorReason);
              }

              // Deduct opened batches
              for (const al of openAlloc.allocations) {
                const bIdx = wp.batches.findIndex(b => b.id === al.batchId);
                if (bIdx !== -1) {
                  wp.batches[bIdx].remainingPackQuantity = Math.max(
                    0,
                    (wp.batches[bIdx].remainingPackQuantity || 0) - al.packsUsed
                  );
                  wp.batches[bIdx].updatedAt = now;
                }
              }
              wp.unbatchedMap[sourceVar.id] = Math.max(
                0,
                (wp.unbatchedMap[sourceVar.id] || 0) - openAlloc.unbatchedPacksUsed
              );

              // Sync variant saleable packs after opening
              const syncedAfterOpen = syncProductVariantsWithBatches(
                wp.data,
                wp.variants,
                wp.batches,
                warnDays,
                wp.unbatchedMap
              );
              wp.variants = syncedAfterOpen.updatedVariants;
              wp.batches = syncedAfterOpen.cleanedBatches;
              wp.currentStock = syncedAfterOpen.totalSaleablePacks;

              const addedBase = actualPacksToOpen * basePerPack;
              currentLooseAvail += addedBase;

              const openedPackCost = openAlloc.weightedUnitCost > 0 ? openAlloc.weightedUnitCost : sourceVar.costPrice;
              wp.looseStock.lastOpenedFromVariantId = sourceVar.id;
              if (openAlloc.allocations.length > 0) {
                wp.looseStock.activeBatchId = openAlloc.allocations[0].batchId;
                wp.looseStock.lastOpenedBatchNumber = openAlloc.batchNumbersSummary;
                wp.looseStock.activeBatchExpiryDate = openAlloc.primaryExpiryDate;
              }
              if (basePerPack > 0) {
                wp.looseStock.costPerBaseUnit = Math.round((openedPackCost / basePerPack) * 10000) / 10000;
                wp.looseStock.sellingPricePerBaseUnit =
                  Math.round((sourceVar.sellingPrice / basePerPack) * 10000) / 10000;
              }

              const updatedSourceVar = wp.variants[sourceVariantIdx];
              const openMovRef = doc(collection(db, 'accounting_stock_movements'));
              movementsToWrite.push(
                stripUndefinedDeep({
                  id: openMovRef.id,
                  timestamp: now,
                  date: saleDateStr,
                  productId: item.productId,
                  productName: productLabel,
                  variantId: sourceVar.id,
                  variantLabel: sourceVar.label,
                  batchId: openAlloc.allocations[0]?.batchId,
                  batchNumber: openAlloc.batchNumbersSummary,
                  expiryDate: openAlloc.primaryExpiryDate,
                  purchaseCostPerPack: openedPackCost,
                  type: 'pack_opened',
                  quantityChangePacks: -actualPacksToOpen,
                  quantityChangeBaseUnit: addedBase,
                  balancePacksAfter: updatedSourceVar?.currentStockPacks ?? 0,
                  balanceBaseUnitAfter: currentLooseAvail,
                  reason: `POS खुली बिक्री (बिल #${assignedInvoiceNo}) हेतु ${actualPacksToOpen} पैक (${sourceVar.label}${openAlloc.batchNumbersSummary ? ` · बैच: ${openAlloc.batchNumbersSummary}` : ''}) खोला गया`,
                  referenceId: saleRef.id,
                })
              );
            } else if (!stockConfig.allowNegativeStock) {
              throw new Error(
                sourceSummary && sourceSummary.batchedExpiredPacks > 0 && sourceSummary.saleablePacks === 0
                  ? `खुला व सीलबंद स्टॉक एक्सपायर्ड: "${productLabel}" के बचे हुए पैक एक्सपायर्ड हैं — बिक्री प्रतिबंधित है।`
                  : `खुला स्टॉक अपर्याप्त: "${productLabel}" के लिए ${reqBaseQty} ${baseUnit} चाहिए, जबकि वर्तमान खुला स्टॉक ${currentLooseAvail} ${baseUnit}${
                      sourceVar ? ` और "${sourceVar.label}" बिक्री योग्य स्टॉक 0` : ''
                    } है।`
              );
            }
          }

          const newLooseAfterSale = stockConfig.allowNegativeStock
            ? currentLooseAvail - reqBaseQty
            : Math.max(0, currentLooseAvail - reqBaseQty);
          wp.looseStock.availableBaseQty = Math.round(newLooseAfterSale * 100) / 100;
          wp.looseStock.updatedAt = now;
          wp.modified = true;

          if (wp.looseStock.lastOpenedBatchNumber && !item.batchNumber) {
            item.batchNumber = wp.looseStock.lastOpenedBatchNumber;
          }
          if (wp.looseStock.activeBatchExpiryDate && !item.expiryDate) {
            item.expiryDate = wp.looseStock.activeBatchExpiryDate;
          }

          const looseMovRef = doc(collection(db, 'accounting_stock_movements'));
          movementsToWrite.push(
            stripUndefinedDeep({
              id: looseMovRef.id,
              timestamp: now + 1,
              date: saleDateStr,
              productId: item.productId,
              productName: productLabel,
              variantId: item.openedPackFromVariantId || item.variantId,
              variantLabel: item.variantLabel || `${rawQty} ${item.looseUnit || baseUnit}`,
              batchId: wp.looseStock.activeBatchId,
              batchNumber: wp.looseStock.lastOpenedBatchNumber || item.batchNumber,
              expiryDate: wp.looseStock.activeBatchExpiryDate || item.expiryDate,
              type: 'loose_sale',
              quantityChangeBaseUnit: -reqBaseQty,
              balanceBaseUnitAfter: wp.looseStock.availableBaseQty,
              reason: `POS खुली बिक्री (${rawQty} ${item.looseUnit || baseUnit}) · बिल #${assignedInvoiceNo}`,
              referenceId: saleRef.id,
            })
          );
        } else {
          // SEALED PACK SALE DEDUCTION (BATCH-AWARE FEFO OR MANUAL BATCH)
          const qtyPacks = Number(item.packCount ?? item.quantity) || 0;
          if (qtyPacks <= 0) continue;

          let targetVarIdx = -1;
          if (wp.hasStoredVariants) {
            if (item.variantId) {
              targetVarIdx = wp.variants.findIndex(v => v.id === item.variantId);
            }
            if (targetVarIdx === -1 && item.variantLabel) {
              targetVarIdx = wp.variants.findIndex(v => v.label === item.variantLabel);
            }
            if (targetVarIdx === -1 && wp.variants.length === 1) {
              targetVarIdx = 0;
            }
          }

          if (targetVarIdx !== -1) {
            const targetVar = wp.variants[targetVarIdx];
            const alloc = allocateFefoBatches({
              product: { ...wp.data, packagingVariants: wp.variants, batches: wp.batches },
              variant: targetVar,
              requestedPacks: qtyPacks,
              manualBatchId: item.selectedBatchId,
              allowNegativeStock: Boolean(stockConfig.allowNegativeStock),
              blockExpiredSale: blockExpired,
              expiryWarningDays: warnDays,
            });

            if (alloc.errorReason && !stockConfig.allowNegativeStock) {
              throw new Error(alloc.errorReason);
            }

            // Deduct from batches
            for (const al of alloc.allocations) {
              const bIdx = wp.batches.findIndex(b => b.id === al.batchId);
              if (bIdx !== -1) {
                wp.batches[bIdx].remainingPackQuantity = Math.max(
                  0,
                  (wp.batches[bIdx].remainingPackQuantity || 0) - al.packsUsed
                );
                wp.batches[bIdx].updatedAt = now;
              }
            }

            // Deduct unbatched / negative shortfall
            const totalUnbatchedDeduct = alloc.unbatchedPacksUsed + (stockConfig.allowNegativeStock ? alloc.shortfallPacks : 0);
            wp.unbatchedMap[targetVar.id] = stockConfig.allowNegativeStock
              ? (wp.unbatchedMap[targetVar.id] || 0) - totalUnbatchedDeduct
              : Math.max(0, (wp.unbatchedMap[targetVar.id] || 0) - totalUnbatchedDeduct);

            const synced = syncProductVariantsWithBatches(
              wp.data,
              wp.variants,
              wp.batches,
              warnDays,
              wp.unbatchedMap
            );
            wp.variants = synced.updatedVariants;
            wp.batches = synced.cleanedBatches;
            wp.currentStock = synced.totalSaleablePacks;
            wp.modified = true;

            // Attach authoritative batch allocations & exact batch COGS to sale item
            if (alloc.allocations.length > 0) {
              item.batchAllocations = alloc.allocations;
              item.batchNumber = alloc.batchNumbersSummary;
              if (alloc.primaryExpiryDate) {
                item.expiryDate = alloc.primaryExpiryDate;
              }
              const qtyForCost = Number(item.quantity) || qtyPacks;
              item.costPrice = alloc.weightedUnitCost;
              item.totalCost = Math.round(alloc.weightedUnitCost * qtyForCost * 100) / 100;
              item.lineGrossProfit = Math.round((item.totalEffectiveAmount - item.totalCost) * 100) / 100;
              item.lineMarginPercent =
                item.totalEffectiveAmount > 0
                  ? Math.round((item.lineGrossProfit / item.totalEffectiveAmount) * 1000) / 10
                  : 0;
              item.isBelowCost = item.effectiveSellingPrice < item.costPrice;
            }

            const updatedTargetVar = wp.variants[targetVarIdx];
            if (alloc.allocations.length > 0) {
              alloc.allocations.forEach((al, idxOffset) => {
                const movRef = doc(collection(db, 'accounting_stock_movements'));
                movementsToWrite.push(
                  stripUndefinedDeep({
                    id: movRef.id,
                    timestamp: now + idxOffset,
                    date: saleDateStr,
                    productId: item.productId,
                    productName: productLabel,
                    variantId: targetVar.id,
                    variantLabel: item.variantLabel || targetVar.label,
                    batchId: al.batchId,
                    batchNumber: al.batchNumber,
                    expiryDate: al.expiryDate,
                    purchaseCostPerPack: al.unitCost,
                    type: 'pack_sale',
                    quantityChangePacks: -al.packsUsed,
                    balancePacksAfter: updatedTargetVar?.currentStockPacks ?? 0,
                    reason: `POS बिक्री (बिल #${assignedInvoiceNo}) · बैच: ${al.batchNumber || 'बिना नं.'}`,
                    referenceId: saleRef.id,
                  })
                );
              });
            } else {
              const movRef = doc(collection(db, 'accounting_stock_movements'));
              movementsToWrite.push(
                stripUndefinedDeep({
                  id: movRef.id,
                  timestamp: now,
                  date: saleDateStr,
                  productId: item.productId,
                  productName: productLabel,
                  variantId: targetVar.id,
                  variantLabel: item.variantLabel || targetVar.label,
                  type: 'pack_sale',
                  quantityChangePacks: -qtyPacks,
                  balancePacksAfter: updatedTargetVar?.currentStockPacks ?? 0,
                  reason: `POS बिक्री (बिल #${assignedInvoiceNo})`,
                  referenceId: saleRef.id,
                })
              );
            }
          } else {
            // Legacy product without stored packagingVariants array
            const avail = wp.currentStock || 0;
            if (!stockConfig.allowNegativeStock && avail < qtyPacks) {
              throw new Error(
                `स्टॉक अपर्याप्त: "${productLabel}" का केवल ${avail} स्टॉक उपलब्ध है, बिल में ${qtyPacks} दर्ज है।`
              );
            }
            const nextStock = stockConfig.allowNegativeStock
              ? avail - qtyPacks
              : Math.max(0, avail - qtyPacks);
            wp.currentStock = nextStock;
            wp.modified = true;

            const movRef = doc(collection(db, 'accounting_stock_movements'));
            movementsToWrite.push(
              stripUndefinedDeep({
                id: movRef.id,
                timestamp: now,
                date: saleDateStr,
                productId: item.productId,
                productName: productLabel,
                variantId: item.variantId,
                variantLabel: item.variantLabel || item.unit,
                type: 'pack_sale',
                quantityChangePacks: -qtyPacks,
                balancePacksAfter: nextStock,
                reason: `POS बिक्री (बिल #${assignedInvoiceNo})`,
                referenceId: saleRef.id,
              })
            );
          }
        }
      }
    }

    // Recompute authoritative COGS & Gross Profit if batch allocations adjusted unit costs
    const finalTotalCOGS =
      Math.round(authoritativeItems.reduce((sum, it) => sum + (Number(it.totalCost) || 0), 0) * 100) / 100;
    const finalGrossProfit = Math.round((saleData.finalTotal - finalTotalCOGS) * 100) / 100;
    const finalGrossMarginPercent =
      saleData.finalTotal > 0 ? Math.round((finalGrossProfit / saleData.finalTotal) * 1000) / 10 : 0;

    // =========================================================================
    // PHASE 2: ALL WRITE OPERATIONS AFTER ALL READS HAVE COMPLETED
    // =========================================================================

    // 4. Update sequence counter atomically (WRITE)
    if (shouldUpdateCounter) {
      transaction.set(counterRef, {
        lastSequence: nextSeq,
        prefix: 'FKB-',
        updatedAt: now,
      }, { merge: true });
    }

    // 5. Write Sale Document (WRITE)
    const fullSale: AccountingSale = stripUndefinedDeep({
      ...saleData,
      items: authoritativeItems,
      totalCOGS: finalTotalCOGS,
      grossProfit: finalGrossProfit,
      grossMarginPercent: finalGrossMarginPercent,
      id: saleRef.id,
      invoiceNo: assignedInvoiceNo,
      createdAt: now,
    });
    transaction.set(saleRef, fullSale);

    // 6. Update Customer Udhari Ledger (if sale involves udhari)
    if (custRead && custRead.snap.exists()) {
      const custData = custRead.snap.data() as AccountingCustomer;
      const currentOutstanding = custData.currentOutstanding || 0;
      const newOutstanding = currentOutstanding + saleData.udhariAmount;
      const totalPurchases = (custData.totalPurchases || 0) + saleData.finalTotal;
      const totalPaid = (custData.totalPaid || 0) + (saleData.cashPaid + saleData.onlinePaid);

      transaction.update(custRead.ref, {
        currentOutstanding: newOutstanding,
        totalPurchases,
        totalPaid,
        lastPurchaseDate: saleData.date,
        status: newOutstanding > custData.creditLimit ? 'warning' : 'good',
        updatedAt: now,
      });

      const ledgerRef = doc(collection(db, 'accounting_customer_ledger'));
      const ledgerEntry: CustomerLedgerEntry = {
        id: ledgerRef.id,
        customerId: saleData.customerId!,
        customerName: saleData.customerName,
        type: 'sale_debit',
        invoiceNo: assignedInvoiceNo,
        saleId: saleRef.id,
        amount: saleData.udhariAmount,
        balanceAfter: newOutstanding,
        paymentMode: saleData.paymentMode === 'split' ? 'cash' : (saleData.paymentMode === 'online' ? 'online' : 'cash'),
        date: saleData.date,
        timestamp: saleData.timestamp || now,
        note: `बिल #${assignedInvoiceNo} पर उधारी (Total: ₹${saleData.finalTotal}, Paid: ₹${saleData.cashPaid + saleData.onlinePaid})`,
      };
      transaction.set(ledgerRef, ledgerEntry);
    }

    // 7. Write Product Stock Updates & Stock Movement Audit Logs (only when enabled & modified)
    if (stockConfig.enabled) {
      for (const wp of workingProducts.values()) {
        if (!wp.modified) continue;
        const prodUpdate: Record<string, any> = {
          currentStock: wp.currentStock,
          batches: wp.batches,
          updatedAt: now,
        };
        if (wp.hasStoredVariants) {
          prodUpdate.packagingVariants = wp.variants;
        }
        if (wp.looseStock) {
          prodUpdate.looseStock = wp.looseStock;
        }
        transaction.update(wp.ref, stripUndefinedDeep(prodUpdate));
      }

      for (const mov of movementsToWrite) {
        const movRef = doc(db, 'accounting_stock_movements', mov.id);
        transaction.set(movRef, stripUndefinedDeep(mov));
      }
    }
  });

  return saleRef.id;
}

/**
 * Controlled Admin Test Data Reset
 * Resets all test sales, customer ledger transactions, cash flow metrics,
 * and resets the POS bill sequence so next bill starts cleanly at Bill #FKB-0001.
 * Master data (Products, Categories, Suppliers, Customer records) is 100% preserved.
 */
export async function resetTestAccountingData(): Promise<{
  deletedSalesCount: number;
  deletedLedgerCount: number;
  customersResetCount: number;
  movementsDeletedCount: number;
  backupsResetCount: number;
}> {
  // 1. Fetch all sales from accounting_sales
  const salesSnap = await getDocs(collection(db, 'accounting_sales'));
  const salesDocs = salesSnap.docs;

  // 2. Fetch all customer ledger entries
  const ledgerSnap = await getDocs(collection(db, 'accounting_customer_ledger'));
  const ledgerDocs = ledgerSnap.docs;

  // 3. Fetch all customer docs to reset their balances
  const custSnap = await getDocs(collection(db, 'accounting_customers'));
  const custDocs = custSnap.docs;

  // 4. Fetch test stock movements
  const movSnap = await getDocs(collection(db, 'accounting_stock_movements'));
  const testMovDocs = movSnap.docs.filter(d => {
    const data = d.data();
    return data.type === 'pack_sale' || data.type === 'loose_sale' || Boolean(data.referenceId);
  });

  // 5. Fetch backup metadata
  const backupSnap = await getDocs(collection(db, 'pos_monthly_backup_meta'));
  const backupDocs = backupSnap.docs;

  // 6. Delete test sales, ledger, and movements in safe batches
  const allDeletes: DocumentReference[] = [
    ...salesDocs.map(d => d.ref),
    ...ledgerDocs.map(d => d.ref),
    ...testMovDocs.map(d => d.ref),
    ...backupDocs.map(d => d.ref),
  ];

  for (let i = 0; i < allDeletes.length; i += 350) {
    const chunk = allDeletes.slice(i, i + 350);
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }

  // 7. Reset all customer balances to 0 (Preserving names, phones, villages, credit limits)
  for (let i = 0; i < custDocs.length; i += 350) {
    const chunk = custDocs.slice(i, i + 350);
    const batch = writeBatch(db);
    for (const docSnap of chunk) {
      batch.update(docSnap.ref, {
        currentOutstanding: 0,
        totalPurchases: 0,
        totalPaid: 0,
        lastPurchaseDate: '',
        status: 'good',
        updatedAt: Date.now(),
      });
    }
    await batch.commit();
  }

  // 8. Reset the bill sequence counter to 0 so the very next bill is strictly FKB-0001
  const counterRef = doc(db, 'accounting_settings', 'pos_sequence');
  await setDoc(counterRef, {
    lastSequence: 0,
    prefix: 'FKB-',
    updatedAt: Date.now(),
  });

  // 9. Write audit log entry
  const auditRef = doc(collection(db, 'accounting_audit_logs'));
  await setDoc(auditRef, {
    id: auditRef.id,
    action: 'TEST_DATA_RESET',
    details: `Accounting test data reset. Removed ${salesDocs.length} sales, ${ledgerDocs.length} ledger entries. Sequence reset to FKB-0001.`,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
  });

  // 10. Clean up client localStorage backup cache
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('pos_monthly_history_') || key.startsWith('pos_') || key.includes('accounting_report'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('Could not clear local storage cache:', e);
  }

  return {
    deletedSalesCount: salesDocs.length,
    deletedLedgerCount: ledgerDocs.length,
    customersResetCount: custDocs.length,
    movementsDeletedCount: testMovDocs.length,
    backupsResetCount: backupDocs.length,
  };
}

export async function deleteOfflineSale(saleId: string, restoreStock = true): Promise<void> {
  const saleRef = doc(db, 'accounting_sales', saleId);
  const saleSnap = await getDoc(saleRef);
  if (!saleSnap.exists()) return;

  const saleData = saleSnap.data() as AccountingSale;
  const now = Date.now();
  const dateStr = new Date(now).toISOString().split('T')[0];

  await runTransaction(db, async (transaction) => {
    const stockConfigRef = doc(db, 'accounting_settings', 'stock_management_config');
    const stockConfigSnap = await transaction.get(stockConfigRef);
    const stockEnabled = stockConfigSnap.exists() && Boolean(stockConfigSnap.data()?.enabled);
    const warnDays =
      stockConfigSnap.exists() && typeof stockConfigSnap.data()?.expiryWarningDays === 'number'
        ? stockConfigSnap.data()?.expiryWarningDays
        : 122;

    let custSnap: any = null;
    const custRef = saleData.customerId ? doc(db, 'accounting_customers', saleData.customerId) : null;
    if (custRef && saleData.udhariAmount > 0) {
      custSnap = await transaction.get(custRef);
    }

    const prodUpdates = new Map<
      string,
      {
        ref: DocumentReference;
        data: AccountingProduct;
        variants: PackagingVariant[];
        batches: StockBatch[];
        unbatchedMap: Record<string, number>;
        hasStoredVariants: boolean;
        looseStock?: LooseStockPool;
        currentStock: number;
      }
    >();
    const reversalMovements: StockMovementLog[] = [];

    if (restoreStock && stockEnabled && Array.isArray(saleData.items)) {
      const uniquePids = Array.from(
        new Set(saleData.items.map(it => it.productId).filter((id): id is string => Boolean(id)))
      );
      const snaps = await Promise.all(
        uniquePids.map(async pid => {
          const ref = doc(db, 'accounting_products', pid);
          const snap = await transaction.get(ref);
          return { pid, ref, snap };
        })
      );

      for (const { pid, ref, snap } of snaps) {
        if (!snap.exists()) continue;
        const pData = { id: snap.id, ...snap.data() } as AccountingProduct;
        const vars = Array.isArray(pData.packagingVariants)
          ? pData.packagingVariants.map(v => ({ ...v }))
          : [];
        const storedBatches = Array.isArray(pData.batches)
          ? pData.batches.map(b => ({ ...b }))
          : [];
        const unbatchedMap: Record<string, number> = {};
        for (const v of vars) {
          unbatchedMap[v.id] = calculateVariantStockSummary(
            { ...pData, packagingVariants: vars, batches: storedBatches },
            v,
            10,
            warnDays
          ).unbatchedPacks;
        }
        prodUpdates.set(pid, {
          ref,
          data: pData,
          variants: vars,
          batches: storedBatches,
          unbatchedMap,
          hasStoredVariants: vars.length > 0,
          looseStock: pData.looseStock ? { ...pData.looseStock } : undefined,
          currentStock: pData.currentStock || 0,
        });
      }

      for (const item of saleData.items) {
        if (!item.productId) continue;
        const wp = prodUpdates.get(item.productId);
        if (!wp) continue;

        const productLabel = item.hindiName || item.name || wp.data.hindiName || wp.data.name;

        if (item.saleType === 'loose') {
          const rawQty = Number(item.looseQuantity ?? item.quantity) || 0;
          const unitLower = String(item.looseUnit || item.unit || '').toLowerCase();
          const isLargeUnit = unitLower === 'kg' || unitLower === 'l' || unitLower === 'ltr';
          const restoreBaseQty =
            item.looseBaseQty && item.looseBaseQty > 0
              ? Number(item.looseBaseQty)
              : isLargeUnit
              ? rawQty * 1000
              : rawQty;

          if (restoreBaseQty > 0) {
            const baseUnit: 'ml' | 'g' =
              wp.looseStock?.baseUnit ||
              (unitLower === 'ml' || unitLower === 'l' || unitLower === 'ltr' ? 'ml' : 'g');
            if (!wp.looseStock) {
              wp.looseStock = {
                availableBaseQty: restoreBaseQty,
                baseUnit,
                costPerBaseUnit: item.costPerBaseUnit || 0,
                sellingPricePerBaseUnit: item.sellingPricePerBaseUnit || 0,
                lastOpenedBatchNumber: item.batchNumber,
                activeBatchExpiryDate: item.expiryDate,
                updatedAt: now,
              };
            } else {
              wp.looseStock.availableBaseQty =
                Math.round(((wp.looseStock.availableBaseQty || 0) + restoreBaseQty) * 100) / 100;
              wp.looseStock.updatedAt = now;
            }

            const movRef = doc(collection(db, 'accounting_stock_movements'));
            reversalMovements.push(
              stripUndefinedDeep({
                id: movRef.id,
                timestamp: now,
                date: dateStr,
                productId: item.productId,
                productName: productLabel,
                variantId: item.openedPackFromVariantId || item.variantId,
                variantLabel: item.variantLabel,
                batchNumber: item.batchNumber,
                type: 'sale_reversal',
                quantityChangeBaseUnit: restoreBaseQty,
                balanceBaseUnitAfter: wp.looseStock.availableBaseQty,
                reason: `बिल #${saleData.invoiceNo} रद्द/डिलीट होने पर खुला स्टॉक वापस जोड़ा गया`,
                referenceId: saleId,
              })
            );
          }
        } else {
          const qtyPacks = Number(item.packCount ?? item.quantity) || 0;
          if (qtyPacks <= 0) continue;

          let idx = -1;
          if (wp.hasStoredVariants) {
            if (item.variantId) idx = wp.variants.findIndex(v => v.id === item.variantId);
            if (idx === -1 && item.variantLabel) idx = wp.variants.findIndex(v => v.label === item.variantLabel);
            if (idx === -1 && wp.variants.length === 1) idx = 0;
          }

          if (idx !== -1) {
            const targetVar = wp.variants[idx];
            let restoredViaBatches = 0;

            if (Array.isArray(item.batchAllocations) && item.batchAllocations.length > 0) {
              for (const al of item.batchAllocations) {
                const bIdx = wp.batches.findIndex(b => b.id === al.batchId);
                if (bIdx !== -1) {
                  wp.batches[bIdx].remainingPackQuantity =
                    (wp.batches[bIdx].remainingPackQuantity || 0) + al.packsUsed;
                  wp.batches[bIdx].status = 'active';
                  wp.batches[bIdx].updatedAt = now;
                  restoredViaBatches += al.packsUsed;

                  const movRef = doc(collection(db, 'accounting_stock_movements'));
                  reversalMovements.push(
                    stripUndefinedDeep({
                      id: movRef.id,
                      timestamp: now,
                      date: dateStr,
                      productId: item.productId,
                      productName: productLabel,
                      variantId: targetVar.id,
                      variantLabel: item.variantLabel || targetVar.label,
                      batchId: al.batchId,
                      batchNumber: al.batchNumber,
                      expiryDate: al.expiryDate,
                      type: 'sale_reversal',
                      quantityChangePacks: al.packsUsed,
                      balancePacksAfter:
                        (targetVar.currentStockPacks || 0) + restoredViaBatches,
                      reason: `बिल #${saleData.invoiceNo} रद्द होने पर बैच (${al.batchNumber || 'बिना नं.'}) में ${al.packsUsed} स्टॉक वापस`,
                      referenceId: saleId,
                    })
                  );
                }
              }
            }

            const remainingUnbatchedRestore = Math.max(0, qtyPacks - restoredViaBatches);
            if (remainingUnbatchedRestore > 0) {
              wp.unbatchedMap[targetVar.id] =
                (wp.unbatchedMap[targetVar.id] || 0) + remainingUnbatchedRestore;

              const movRef = doc(collection(db, 'accounting_stock_movements'));
              reversalMovements.push(
                stripUndefinedDeep({
                  id: movRef.id,
                  timestamp: now,
                  date: dateStr,
                  productId: item.productId,
                  productName: productLabel,
                  variantId: targetVar.id,
                  variantLabel: item.variantLabel || targetVar.label,
                  type: 'sale_reversal',
                  quantityChangePacks: remainingUnbatchedRestore,
                  balancePacksAfter: (targetVar.currentStockPacks || 0) + qtyPacks,
                  reason: `बिल #${saleData.invoiceNo} रद्द होने पर पैक स्टॉक वापस जोड़ा गया`,
                  referenceId: saleId,
                })
              );
            }

            const synced = syncProductVariantsWithBatches(
              wp.data,
              wp.variants,
              wp.batches,
              warnDays,
              wp.unbatchedMap
            );
            wp.variants = synced.updatedVariants;
            wp.batches = synced.cleanedBatches;
            wp.currentStock = synced.totalSaleablePacks;
          } else {
            wp.currentStock = (wp.currentStock || 0) + qtyPacks;
            const movRef = doc(collection(db, 'accounting_stock_movements'));
            reversalMovements.push(
              stripUndefinedDeep({
                id: movRef.id,
                timestamp: now,
                date: dateStr,
                productId: item.productId,
                productName: productLabel,
                variantLabel: item.variantLabel || item.unit,
                type: 'sale_reversal',
                quantityChangePacks: qtyPacks,
                balancePacksAfter: wp.currentStock,
                reason: `बिल #${saleData.invoiceNo} रद्द/डिलीट होने पर स्टॉक वापस जोड़ा गया`,
                referenceId: saleId,
              })
            );
          }
        }
      }
    }

    // Writes
    for (const wp of prodUpdates.values()) {
      const updatePayload: Record<string, any> = {
        currentStock: wp.currentStock,
        batches: wp.batches,
        updatedAt: now,
      };
      if (wp.hasStoredVariants) updatePayload.packagingVariants = wp.variants;
      if (wp.looseStock) updatePayload.looseStock = wp.looseStock;
      transaction.update(wp.ref, stripUndefinedDeep(updatePayload));
    }

    for (const mov of reversalMovements) {
      transaction.set(doc(db, 'accounting_stock_movements', mov.id), stripUndefinedDeep(mov));
    }

    if (custRef && custSnap && custSnap.exists() && saleData.udhariAmount > 0) {
      const custData = custSnap.data() as AccountingCustomer;
      const newOutstanding = Math.max(0, (custData.currentOutstanding || 0) - saleData.udhariAmount);
      transaction.update(custRef, {
        currentOutstanding: newOutstanding,
        updatedAt: now,
      });
    }

    transaction.delete(saleRef);
  });
}

// ----------------------------------------------------
// POS MONTHLY BILL HISTORY & PDF BACKUP SYSTEM
// ----------------------------------------------------

export const HINDI_MONTH_NAMES_LIST = [
  'जनवरी (January)',
  'फरवरी (February)',
  'मार्च (March)',
  'अप्रैल (April)',
  'मई (May)',
  'जून (June)',
  'जुलाई (July)',
  'अगस्त (August)',
  'सितंबर (September)',
  'अक्टूबर (October)',
  'नवंबर (November)',
  'दिसंबर (December)',
];

export async function fetchAllPOSSalesForHistory(): Promise<AccountingSale[]> {
  try {
    const q = query(collection(db, 'accounting_sales'));
    const snap = await getDocs(q);
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as AccountingSale))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.error('Error fetching all POS sales:', err);
    return [];
  }
}

export async function fetchAccountingSalesForMonth(year: number, month: number): Promise<AccountingSale[]> {
  try {
    const all = await fetchAllPOSSalesForHistory();
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    return all.filter(s => {
      if (s.date && s.date.startsWith(prefix)) return true;
      if (s.timestamp) {
        const d = new Date(s.timestamp);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
      }
      return false;
    });
  } catch (err) {
    console.error('Error fetching sales for month:', err);
    return [];
  }
}

export async function getMonthlyPOSExportMeta(monthKey: string): Promise<MonthlyPOSExportMeta | null> {
  try {
    const snap = await getDoc(doc(db, 'pos_monthly_backup_meta', monthKey));
    if (snap.exists()) {
      return snap.data() as MonthlyPOSExportMeta;
    }
  } catch (err) {
    console.warn('Could not read pos_monthly_backup_meta from firestore:', err);
  }

  try {
    const stored = localStorage.getItem(`pos_export_meta_${monthKey}`);
    if (stored) {
      return JSON.parse(stored) as MonthlyPOSExportMeta;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export async function saveMonthlyPOSExportMeta(meta: MonthlyPOSExportMeta): Promise<void> {
  try {
    localStorage.setItem(`pos_export_meta_${meta.monthKey}`, JSON.stringify(meta));
  } catch (e) {
    // ignore
  }

  try {
    await setDoc(doc(db, 'pos_monthly_backup_meta', meta.monthKey), meta, { merge: true });
  } catch (err) {
    console.warn('Could not save to pos_monthly_backup_meta in Firestore:', err);
  }
}

export async function deleteMonthlyPOSBills(
  saleIds: string[],
  year: number,
  month: number,
  reason?: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    if (!saleIds || saleIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const now = Date.now();
    const monthStr = String(month).padStart(2, '0');
    const monthKey = `${year}-${monthStr}`;

    // Batched deletion in chunks of 400 (safe limit for Firestore)
    const chunkSize = 400;
    for (let i = 0; i < saleIds.length; i += chunkSize) {
      const chunk = saleIds.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'accounting_sales', id));
      }
      await batch.commit();
    }

    // Write audit log for compliance & accountability
    try {
      const auditRef = doc(collection(db, 'accounting_audit_logs'));
      await setDoc(auditRef, {
        id: auditRef.id,
        type: 'pos_monthly_bills_purge',
        title: `नकद बिक्री इतिहास हटाया गया: ${monthKey}`,
        timestamp: now,
        date: new Date(now).toISOString().split('T')[0],
        reason: reason || `Admin द्वारा ${monthKey} के POS बिलों का बैकअप लेने के बाद इतिहास मैन्युअली हटाया गया`,
        details: `कुल ${saleIds.length} नकद बिल स्थायी रूप से हटाए गए। इन्वेंट्री एवं ग्राहक खाता सुरक्षित रखा गया।`,
      });
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    // Update metadata
    try {
      await setDoc(doc(db, 'pos_monthly_backup_meta', monthKey), {
        monthKey,
        year,
        month,
        historyPurgedAt: now,
        purgedBillsCount: saleIds.length,
      }, { merge: true });
    } catch (mErr) {
      console.warn('Meta update error:', mErr);
    }

    return { success: true, deletedCount: saleIds.length };
  } catch (err: any) {
    console.error('Error deleting monthly POS bills:', err);
    return { success: false, deletedCount: 0, error: err.message || 'बिल डिलीट करने में त्रुटि' };
  }
}



// ----------------------------------------------------
// EXPENSE MANAGEMENT
// ----------------------------------------------------

export async function fetchAccountingExpenses(): Promise<AccountingExpense[]> {
  try {
    const q = query(collection(db, 'accounting_expenses'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingExpense));
  } catch (err) {
    console.error('Error fetching expenses:', err);
    return [];
  }
}

export async function saveAccountingExpense(expense: Omit<AccountingExpense, 'id' | 'createdAt'>, id?: string): Promise<string> {
  const now = Date.now();
  const expRef = id ? doc(db, 'accounting_expenses', id) : doc(collection(db, 'accounting_expenses'));
  const payload = {
    ...expense,
    id: expRef.id,
    createdAt: now,
  };
  await setDoc(expRef, payload, { merge: true });
  return expRef.id;
}

export async function deleteAccountingExpense(expenseId: string): Promise<void> {
  if (!expenseId || !expenseId.trim()) {
    throw new Error('अमान्य खर्च आईडी।');
  }
  if (!auth.currentUser) {
    throw new Error('केवल लॉगिन किए हुए एडमिन ही खर्च हटा सकते हैं।');
  }
  const path = `accounting_expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'accounting_expenses', expenseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchExpenseCategories(): Promise<AccountingExpenseCategory[]> {
  try {
    const snap = await getDocs(collection(db, 'accounting_expense_categories'));
    if (snap.empty) {
      // Seed default categories
      for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
        await setDoc(doc(db, 'accounting_expense_categories', cat.id), cat);
      }
      return DEFAULT_EXPENSE_CATEGORIES;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AccountingExpenseCategory));
  } catch {
    return DEFAULT_EXPENSE_CATEGORIES;
  }
}

export async function addCustomExpenseCategory(name: string, hindiName: string): Promise<AccountingExpenseCategory> {
  const id = `custom_${Date.now()}`;
  const newCat: AccountingExpenseCategory = {
    id,
    name,
    hindiName,
    icon: 'Tag',
    isSystem: false,
  };
  await setDoc(doc(db, 'accounting_expense_categories', id), newCat);
  return newCat;
}

// ----------------------------------------------------
// DAILY CASH REGISTER (GALLA)
// ----------------------------------------------------

export async function fetchCashRegister(dateStr: string): Promise<AccountingCashRegister | null> {
  try {
    const docRef = doc(db, 'accounting_cash_register', dateStr);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AccountingCashRegister;
    }
    return null;
  } catch (err) {
    console.error('Error fetching cash register:', err);
    return null;
  }
}

export async function saveCashRegister(register: AccountingCashRegister): Promise<void> {
  const docRef = doc(db, 'accounting_cash_register', register.date);
  await setDoc(docRef, { ...register, updatedAt: Date.now() }, { merge: true });
}

export async function fetchCustomerLedgerPayments(): Promise<CustomerLedgerEntry[]> {
  try {
    const q = query(
      collection(db, 'accounting_customer_ledger'),
      where('type', '==', 'payment_credit')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerLedgerEntry));
  } catch (err) {
    console.error('Error fetching customer ledger payments:', err);
    return [];
  }
}

export async function fetchAccountingReport(
  startDate: string,
  endDate: string
): Promise<any> {
  try {
    const [sales, expenses, products, customers, ledgerPayments, stockConfig] = await Promise.all([
      fetchAccountingSales(500),
      fetchAccountingExpenses(),
      fetchAccountingProducts(),
      fetchAccountingCustomers(),
      fetchCustomerLedgerPayments(),
      fetchStockManagementConfig(),
    ]);

    // Filter sales and expenses by date range
    const filteredSales = sales.filter(s => s.date >= startDate && s.date <= endDate);
    const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
    const filteredPayments = ledgerPayments.filter(p => p.date >= startDate && p.date <= endDate);

    const totalSalesAmount = filteredSales.reduce((acc, s) => acc + (s.finalTotal || 0), 0);
    const totalSalesCount = filteredSales.length;
    const totalCOGS = filteredSales.reduce((acc, s) => acc + (s.totalCOGS || 0), 0);
    const grossProfit = totalSalesAmount - totalCOGS;
    const grossMarginPercent = totalSalesAmount > 0 ? Math.round((grossProfit / totalSalesAmount) * 100) : 0;

    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExpenses;
    const netMarginPercent = totalSalesAmount > 0 ? Math.round((netProfit / totalSalesAmount) * 100) : 0;

    const cashReceived = filteredSales.reduce((acc, s) => acc + (s.cashPaid || 0), 0);
    const onlineReceived = filteredSales.reduce((acc, s) => acc + (s.onlinePaid || 0), 0);
    const newUdhariGiven = filteredSales.reduce((acc, s) => acc + (s.udhariAmount || 0), 0);

    const customerPaymentCollected = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const customerCashPaymentCollected = filteredPayments
      .filter(p => !p.paymentMode || p.paymentMode === 'cash')
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const customerOnlinePaymentCollected = filteredPayments
      .filter(p => p.paymentMode === 'online' || p.paymentMode === 'bank')
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    const cashExpenses = filteredExpenses.filter(e => e.paymentMode === 'cash').reduce((acc, e) => acc + (e.amount || 0), 0);
    const onlineExpenses = filteredExpenses.filter(e => e.paymentMode === 'online').reduce((acc, e) => acc + (e.amount || 0), 0);

    const totalCustomerOutstanding = customers.reduce((acc, c) => acc + (c.currentOutstanding || 0), 0);
    const totalSupplierOutstanding = 0;

    let totalInventoryValuation = 0;
    let lowStockCount = 0;

    if (stockConfig.enabled) {
      const defaultThreshold = stockConfig.defaultLowStockThreshold ?? 10;
      const warnDays = stockConfig.expiryWarningDays ?? 122;
      for (const p of products) {
        const health = calculateProductHealthSummary(p, defaultThreshold, warnDays);
        totalInventoryValuation += health.totalValuation;
        if (health.hasLowStockVariant) {
          lowStockCount++;
        }
      }
      totalInventoryValuation = Math.round(totalInventoryValuation);
    }

    const totalProductsCount = products.length;

    return {
      startDate,
      endDate,
      totalProductsCount,
      totalSalesAmount,
      totalSalesCount,
      totalCOGS,
      grossProfit,
      grossMarginPercent,
      totalExpenses,
      netProfit,
      netMarginPercent,
      cashReceived,
      onlineReceived,
      newUdhariGiven,
      customerPaymentCollected,
      customerCashPaymentCollected,
      customerOnlinePaymentCollected,
      cashExpenses,
      onlineExpenses,
      totalCustomerOutstanding,
      totalSupplierOutstanding,
      totalInventoryValuation,
      lowStockCount,
    };
  } catch (err) {
    console.error('Error compiling accounting report:', err);
    throw err;
  }
}

// ----------------------------------------------------
// POS LOOSE QUANTITY RATE DROPDOWN SETTINGS
// ----------------------------------------------------

const POS_LOOSE_RATE_SETTINGS_DOC_PATH = 'accounting_settings/pos_loose_rate_options';

function sanitizeCustomOptionList(
  rawList: unknown,
  category: 'liquid' | 'solid'
): CustomLooseRateOption[] {
  if (!Array.isArray(rawList)) return [];
  const allowedUnits = category === 'liquid' ? ['ml', 'L'] : ['g', 'kg'];
  const expectedBase: 'ml' | 'g' = category === 'liquid' ? 'ml' : 'g';

  return rawList
    .filter((item): item is CustomLooseRateOption => {
      if (!item || typeof item !== 'object') return false;
      const val = Number((item as any).value);
      const mult = Number((item as any).multiplier);
      const unit = String((item as any).unit || '');
      const label = String((item as any).label || '').trim();
      return (
        Number.isFinite(val) &&
        val > 0 &&
        Number.isFinite(mult) &&
        mult > 0 &&
        allowedUnits.includes(unit) &&
        label.length > 0
      );
    })
    .map((item) => ({
      id: String(item.id || `cust_${category}_${Date.now()}`),
      category,
      value: Number(item.value),
      unit: item.unit,
      label: String(item.label).trim(),
      multiplier: Number(item.multiplier),
      baseUnit: expectedBase,
      isCustom: true as const,
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
    }));
}

export function cachePOSLooseRateSettingsLocally(settings: POSLooseRateSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(POS_LOOSE_RATE_CACHE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Could not cache POS loose rate settings in localStorage:', err);
  }
}

export async function fetchPOSLooseRateSettings(): Promise<POSLooseRateSettings> {
  const cached = getCachedLooseRateSettings();
  try {
    const docRef = doc(db, 'accounting_settings', 'pos_loose_rate_options');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const normalized: POSLooseRateSettings = {
        liquid: sanitizeCustomOptionList(data?.liquid, 'liquid'),
        solid: sanitizeCustomOptionList(data?.solid, 'solid'),
        updatedAt: typeof data?.updatedAt === 'number' ? data.updatedAt : Date.now(),
        updatedBy: typeof data?.updatedBy === 'string' ? data.updatedBy : undefined,
      };
      cachePOSLooseRateSettingsLocally(normalized);
      return normalized;
    }
    return cached;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, POS_LOOSE_RATE_SETTINGS_DOC_PATH);
    return cached;
  }
}

export async function savePOSLooseRateSettings(
  settings: POSLooseRateSettings
): Promise<POSLooseRateSettings> {
  const payload: POSLooseRateSettings = {
    liquid: sanitizeCustomOptionList(settings.liquid, 'liquid'),
    solid: sanitizeCustomOptionList(settings.solid, 'solid'),
    updatedAt: Date.now(),
    updatedBy: auth.currentUser?.email || settings.updatedBy || 'admin',
  };

  try {
    const docRef = doc(db, 'accounting_settings', 'pos_loose_rate_options');
    await setDoc(docRef, payload);
    cachePOSLooseRateSettingsLocally(payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, POS_LOOSE_RATE_SETTINGS_DOC_PATH);
    throw err;
  }
}

// ----------------------------------------------------
// STOCK QUANTITY MANAGEMENT MASTER TOGGLE CONFIG
// ----------------------------------------------------

const STOCK_MGMT_CONFIG_DOC_PATH = 'accounting_settings/stock_management_config';
const STOCK_MGMT_CONFIG_CACHE_KEY = 'fkb_stock_management_config_v1';

export const DEFAULT_STOCK_MANAGEMENT_CONFIG: StockManagementConfig = {
  enabled: false,
  allowNegativeStock: false,
  autoOpenPackOnLooseSale: true,
  defaultLowStockThreshold: 10,
  expiryWarningDays: 122,
  blockExpiredSale: true,
  updatedAt: 0,
};

function normalizeStockConfigPayload(data: any): StockManagementConfig {
  return {
    enabled: Boolean(data?.enabled),
    allowNegativeStock: Boolean(data?.allowNegativeStock),
    autoOpenPackOnLooseSale:
      data?.autoOpenPackOnLooseSale === undefined
        ? true
        : Boolean(data?.autoOpenPackOnLooseSale),
    defaultLowStockThreshold:
      typeof data?.defaultLowStockThreshold === 'number' && data.defaultLowStockThreshold >= 0
        ? data.defaultLowStockThreshold
        : 10,
    expiryWarningDays:
      typeof data?.expiryWarningDays === 'number' && data.expiryWarningDays > 0
        ? data.expiryWarningDays
        : 122,
    blockExpiredSale:
      data?.blockExpiredSale === undefined ? true : Boolean(data?.blockExpiredSale),
    updatedAt: typeof data?.updatedAt === 'number' ? data.updatedAt : 0,
    updatedBy: typeof data?.updatedBy === 'string' ? data.updatedBy : undefined,
  };
}

export function getCachedStockManagementConfig(): StockManagementConfig {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_STOCK_MANAGEMENT_CONFIG };
  }
  try {
    const raw = window.localStorage.getItem(STOCK_MGMT_CONFIG_CACHE_KEY);
    if (!raw) return { ...DEFAULT_STOCK_MANAGEMENT_CONFIG };
    const parsed = JSON.parse(raw);
    return normalizeStockConfigPayload(parsed);
  } catch {
    return { ...DEFAULT_STOCK_MANAGEMENT_CONFIG };
  }
}

export function cacheStockManagementConfigLocally(config: StockManagementConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STOCK_MGMT_CONFIG_CACHE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Could not cache stock management config:', err);
  }
}

export async function fetchStockManagementConfig(): Promise<StockManagementConfig> {
  const cached = getCachedStockManagementConfig();
  try {
    const docRef = doc(db, 'accounting_settings', 'stock_management_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const normalized = normalizeStockConfigPayload(snap.data());
      if (!normalized.updatedAt) normalized.updatedAt = Date.now();
      cacheStockManagementConfigLocally(normalized);
      return normalized;
    }
    cacheStockManagementConfigLocally(DEFAULT_STOCK_MANAGEMENT_CONFIG);
    return { ...DEFAULT_STOCK_MANAGEMENT_CONFIG };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, STOCK_MGMT_CONFIG_DOC_PATH);
    return cached;
  }
}

export async function saveStockManagementConfig(
  updates: Partial<StockManagementConfig>
): Promise<StockManagementConfig> {
  const current = getCachedStockManagementConfig();
  const payload: StockManagementConfig = stripUndefinedDeep({
    enabled: updates.enabled !== undefined ? Boolean(updates.enabled) : current.enabled,
    allowNegativeStock:
      updates.allowNegativeStock !== undefined
        ? Boolean(updates.allowNegativeStock)
        : Boolean(current.allowNegativeStock),
    autoOpenPackOnLooseSale:
      updates.autoOpenPackOnLooseSale !== undefined
        ? Boolean(updates.autoOpenPackOnLooseSale)
        : current.autoOpenPackOnLooseSale ?? true,
    defaultLowStockThreshold:
      updates.defaultLowStockThreshold !== undefined
        ? Math.max(0, Number(updates.defaultLowStockThreshold) || 0)
        : current.defaultLowStockThreshold ?? 10,
    expiryWarningDays:
      updates.expiryWarningDays !== undefined
        ? Math.max(15, Number(updates.expiryWarningDays) || 122)
        : current.expiryWarningDays ?? 122,
    blockExpiredSale:
      updates.blockExpiredSale !== undefined
        ? Boolean(updates.blockExpiredSale)
        : current.blockExpiredSale ?? true,
    updatedAt: Date.now(),
    updatedBy: auth.currentUser?.email || updates.updatedBy || 'admin',
  });

  try {
    const docRef = doc(db, 'accounting_settings', 'stock_management_config');
    await setDoc(docRef, payload, { merge: true });
    cacheStockManagementConfigLocally(payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, STOCK_MGMT_CONFIG_DOC_PATH);
    throw err;
  }
}
