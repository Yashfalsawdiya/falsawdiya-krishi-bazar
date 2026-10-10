import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, onSnapshot, writeBatch, Timestamp,
  runTransaction, DocumentReference
} from 'firebase/firestore';
import { db } from '../firebase';
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
  MonthlyPOSExportMeta
} from '../types/accounting';

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
  const payload = {
    ...product,
    updatedAt: now,
    ...(id ? {} : { createdAt: now }),
  };
  await setDoc(prodRef, payload, { merge: true });
  return prodRef.id;
}

export async function deleteAccountingProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, 'accounting_products', productId));
}

/**
 * Opens one or more sealed packs of a specific packaging variant
 * and transfers the volume/weight into the product's loose stock pool.
 */
export async function openSealedPack(
  productId: string,
  variantId: string,
  packsToOpen = 1
): Promise<{ success: boolean; looseAdded: number; message: string }> {
  const prodRef = doc(db, 'accounting_products', productId);
  const prodSnap = await getDoc(prodRef);
  if (!prodSnap.exists()) {
    throw new Error('उत्पाद नहीं मिला (Product not found)');
  }

  const prod = prodSnap.data() as AccountingProduct;
  const variants = prod.packagingVariants ? [...prod.packagingVariants] : [];
  const targetVarIndex = variants.findIndex(v => v.id === variantId);

  if (targetVarIndex === -1) {
    throw new Error('पैकेजिंग साइज नहीं मिला (Variant not found)');
  }

  const targetVar = { ...variants[targetVarIndex] };
  if ((targetVar.currentStockPacks || 0) < packsToOpen) {
    throw new Error(`सीलबंद पैकेट उपलब्ध नहीं हैं। वर्तमान स्टॉक: ${targetVar.currentStockPacks || 0}`);
  }

  // Calculate base quantity (ml or g)
  let baseQtyPerPack = targetVar.baseQuantity;
  if (!baseQtyPerPack || baseQtyPerPack <= 0) {
    const unit = (targetVar.sizeUnit || '').toLowerCase();
    if (unit === 'ltr' || unit === 'l') baseQtyPerPack = targetVar.sizeValue * 1000;
    else if (unit === 'kg') baseQtyPerPack = targetVar.sizeValue * 1000;
    else baseQtyPerPack = targetVar.sizeValue;
  }

  const totalBaseQtyToAdd = baseQtyPerPack * packsToOpen;
  const isLiquid = targetVar.sizeUnit === 'ml' || targetVar.sizeUnit === 'Ltr' || prod.unit === 'Ltr' || prod.unit === 'Ml';
  const detectedBaseUnit: 'ml' | 'g' = isLiquid ? 'ml' : 'g';

  // 1. Decrement variant stock
  targetVar.currentStockPacks = Math.max(0, (targetVar.currentStockPacks || 0) - packsToOpen);
  variants[targetVarIndex] = targetVar;

  // 2. Calculate new loose pool balance & per-base-unit cost/rate
  const currentLoose = prod.looseStock?.availableBaseQty || 0;
  const newLooseQty = currentLoose + totalBaseQtyToAdd;

  const costPerBaseUnit = baseQtyPerPack > 0 ? (targetVar.costPrice / baseQtyPerPack) : (prod.costPrice / (baseQtyPerPack || 1));
  const sellingPerBaseUnit = baseQtyPerPack > 0 ? (targetVar.sellingPrice / baseQtyPerPack) : (prod.defaultSellingPrice / (baseQtyPerPack || 1));

  const newLooseStock: LooseStockPool = {
    availableBaseQty: newLooseQty,
    baseUnit: detectedBaseUnit,
    costPerBaseUnit: Math.round(costPerBaseUnit * 1000) / 1000,
    sellingPricePerBaseUnit: Math.round(sellingPerBaseUnit * 1000) / 1000,
    lastOpenedFromVariantId: targetVar.id,
    updatedAt: Date.now(),
  };

  const totalSealedStock = variants.reduce((acc, v) => acc + (v.currentStockPacks || 0), 0);

  const batch = writeBatch(db);
  batch.update(prodRef, {
    packagingVariants: variants,
    currentStock: totalSealedStock,
    looseStock: newLooseStock,
    updatedAt: Date.now(),
  });

  // 3. Log stock movement
  const movRef = doc(collection(db, 'accounting_stock_movements'));
  const movLog: StockMovementLog = {
    id: movRef.id,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
    productId,
    productName: prod.hindiName || prod.name,
    variantId: targetVar.id,
    variantLabel: targetVar.label,
    type: 'pack_opened',
    quantityChangePacks: -packsToOpen,
    quantityChangeBaseUnit: totalBaseQtyToAdd,
    balancePacksAfter: targetVar.currentStockPacks,
    balanceBaseUnitAfter: newLooseQty,
    reason: `${packsToOpen} सीलबंद पैकेट (${targetVar.label}) खोलकर ${totalBaseQtyToAdd} ${detectedBaseUnit} खुले स्टॉक में जमा किया गया।`,
  };
  batch.set(movRef, movLog);

  await batch.commit();

  return {
    success: true,
    looseAdded: totalBaseQtyToAdd,
    message: `${targetVar.label} का ${packsToOpen} पैकेट सफलतापूर्वक खुला। अब कुल ${newLooseQty} ${detectedBaseUnit} खुला स्टॉक उपलब्ध है।`,
  };
}

/**
 * Stock adjustment for physical verification, weighing tolerance losses, or damage write-offs.
 */
export async function adjustProductStock(params: {
  productId: string;
  variantId?: string;
  isLooseStock?: boolean;
  adjustType: 'set' | 'add' | 'subtract';
  quantity: number;
  reason: string;
}): Promise<void> {
  const { productId, variantId, isLooseStock, adjustType, quantity, reason } = params;
  const prodRef = doc(db, 'accounting_products', productId);
  const prodSnap = await getDoc(prodRef);
  if (!prodSnap.exists()) throw new Error('उत्पाद नहीं मिला');

  const prod = prodSnap.data() as AccountingProduct;
  const batch = writeBatch(db);
  const now = Date.now();

  let packsChange: number | undefined;
  let baseUnitChange: number | undefined;
  let finalPacks: number | undefined;
  let finalBaseQty: number | undefined;

  if (isLooseStock) {
    const currentLoose = prod.looseStock?.availableBaseQty || 0;
    let newLoose = currentLoose;
    if (adjustType === 'set') newLoose = Math.max(0, quantity);
    else if (adjustType === 'add') newLoose = currentLoose + quantity;
    else if (adjustType === 'subtract') newLoose = Math.max(0, currentLoose - quantity);

    baseUnitChange = newLoose - currentLoose;
    finalBaseQty = newLoose;

    batch.update(prodRef, {
      'looseStock.availableBaseQty': newLoose,
      'looseStock.updatedAt': now,
      updatedAt: now,
    });
  } else if (variantId && prod.packagingVariants && prod.packagingVariants.length > 0) {
    const variants = prod.packagingVariants.map(v => {
      if (v.id === variantId) {
        const cur = v.currentStockPacks || 0;
        let nxt = cur;
        if (adjustType === 'set') nxt = Math.max(0, quantity);
        else if (adjustType === 'add') nxt = cur + quantity;
        else if (adjustType === 'subtract') nxt = Math.max(0, cur - quantity);

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
    if (adjustType === 'set') nxt = Math.max(0, quantity);
    else if (adjustType === 'add') nxt = cur + quantity;
    else if (adjustType === 'subtract') nxt = Math.max(0, cur - quantity);

    packsChange = nxt - cur;
    finalPacks = nxt;

    batch.update(prodRef, {
      currentStock: nxt,
      updatedAt: now,
    });
  }

  // Record Audit Trail
  const movRef = doc(collection(db, 'accounting_stock_movements'));
  const movLog: StockMovementLog = {
    id: movRef.id,
    timestamp: now,
    date: new Date().toISOString().split('T')[0],
    productId,
    productName: prod.hindiName || prod.name,
    variantId,
    type: 'weighing_adjustment',
    quantityChangePacks: packsChange,
    quantityChangeBaseUnit: baseUnitChange,
    balancePacksAfter: finalPacks,
    balanceBaseUnitAfter: finalBaseQty,
    reason: reason || 'स्टॉक एडजस्टमेंट (मैनुअल सत्यापन)',
  };
  batch.set(movRef, movLog);

  await batch.commit();
}

export async function fetchStockMovements(productId?: string, limitCount = 50): Promise<StockMovementLog[]> {
  try {
    let q = query(collection(db, 'accounting_stock_movements'), orderBy('timestamp', 'desc'), limit(limitCount));
    if (productId) {
      q = query(collection(db, 'accounting_stock_movements'), where('productId', '==', productId), orderBy('timestamp', 'desc'), limit(limitCount));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovementLog));
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    return [];
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
  const saleRef = doc(collection(db, 'accounting_sales'));

  let assignedInvoiceNo = '';

  await runTransaction(db, async (transaction) => {
    // =========================================================================
    // PHASE 1: ALL READ OPERATIONS FIRST (Mandatory Firestore rule)
    // =========================================================================

    // 1. Read the counter atomically
    const counterSnap = await transaction.get(counterRef);
    let lastSeq = 0;
    if (counterSnap.exists()) {
      const cData = counterSnap.data();
      if (typeof cData.lastSequence === 'number') {
        lastSeq = cData.lastSequence;
      }
    }

    // Determine invoice number:
    // If invoiceNo is empty or is placeholder (e.g. FKB-TEMP), generate strictly sequential FKB number
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

    // =========================================================================
    // PHASE 2: ALL WRITE OPERATIONS AFTER ALL READS HAVE COMPLETED
    // =========================================================================

    // 3. Update sequence counter atomically (WRITE)
    if (shouldUpdateCounter) {
      transaction.set(counterRef, {
        lastSequence: nextSeq,
        prefix: 'FKB-',
        updatedAt: now,
      }, { merge: true });
    }

    // 4. Write Sale Document (WRITE)
    // Product quantity in saleData.items records strictly what was billed to the customer
    // No automatic stock deduction or inventory mutation occurs
    const fullSale: AccountingSale = {
      ...saleData,
      id: saleRef.id,
      invoiceNo: assignedInvoiceNo,
      createdAt: now,
    };
    transaction.set(saleRef, fullSale);

    // 5. Update Customer Udhari Ledger (if sale involves udhari)
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
  const batch = writeBatch(db);

  // Restore stock if requested
  if (restoreStock && saleData.items) {
    for (const item of saleData.items) {
      if (item.productId) {
        const prodRef = doc(db, 'accounting_products', item.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const currentStock = prodSnap.data().currentStock || 0;
          batch.update(prodRef, {
            currentStock: currentStock + item.quantity,
            updatedAt: Date.now(),
          });
        }
      }
    }
  }

  // If customer udhari was charged, reverse it
  if (saleData.customerId && saleData.udhariAmount > 0) {
    const custRef = doc(db, 'accounting_customers', saleData.customerId);
    const custSnap = await getDoc(custRef);
    if (custSnap.exists()) {
      const custData = custSnap.data() as AccountingCustomer;
      const newOutstanding = Math.max(0, (custData.currentOutstanding || 0) - saleData.udhariAmount);
      batch.update(custRef, {
        currentOutstanding: newOutstanding,
        updatedAt: Date.now(),
      });
    }
  }

  batch.delete(saleRef);
  await batch.commit();
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
  await deleteDoc(doc(db, 'accounting_expenses', expenseId));
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

// ----------------------------------------------------
// AI BUSINESS INSIGHTS
// ----------------------------------------------------

export async function getAccountingInsightsAI(period: string, summaryData: any): Promise<string> {
  const res = await fetch('/api/accounting/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, summaryData }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'AI सलाह प्राप्त नहीं हो सकी।');
  }

  return json.insights;
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
    const [sales, expenses, products, customers, ledgerPayments] = await Promise.all([
      fetchAccountingSales(500),
      fetchAccountingExpenses(),
      fetchAccountingProducts(),
      fetchAccountingCustomers(),
      fetchCustomerLedgerPayments(),
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

    const totalInventoryValuation = products.reduce((acc, p) => acc + ((p.currentStock || 0) * (p.costPrice || 0)), 0);
    const lowStockCount = products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 5)).length;
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

export async function getAIFinancialInsights(reportData: any): Promise<any> {
  try {
    const rawAiText = await getAccountingInsightsAI('custom', reportData);
    
    return {
      hindiSummary: rawAiText,
      businessHealthScore: reportData.netProfit > 0 ? 'EXCELLENT' : reportData.grossProfit > 0 ? 'GOOD' : 'WARNING',
      bargainingImpactAdvice: `बिक्री पर सकल मार्जिन ${reportData.grossMarginPercent}% रहा। मोलभाव उचित सीमा में है।`,
      cashFlowAnalysis: `गल्ले में शुद्ध नकद प्रवाह धनात्मक है। कुल मार्केट उधारी ₹${reportData.totalCustomerOutstanding} पर वसूली अभियान चलाएं।`,
      keyActionItems: [
        'उधारी सीमा पार कर चुके किसानों को WhatsApp तगादा भेजें',
        `${reportData.lowStockCount} कम स्टॉक वाले उत्पादों का थोक आर्डर दें`,
        'दुकान खर्चों को नियमित रूप से AI स्कैनर से रिकॉर्ड करें',
      ],
    };
  } catch (err: any) {
    return {
      hindiSummary: `आपकी कुल बिक्री ₹${reportData.totalSalesAmount} और शुद्ध मुनाफा ₹${reportData.netProfit} रहा (मार्जिन: ${reportData.netMarginPercent}%)। व्यापार स्वस्थ स्थिति में है।`,
      businessHealthScore: 'GOOD',
      bargainingImpactAdvice: 'दवाइयों व खादों पर उचित मार्जिन बनाए रखें।',
      cashFlowAnalysis: `दुकान पर कुल ₹${reportData.totalCustomerOutstanding} उधारी बाकी है।`,
      keyActionItems: [
        'समय पर सप्लायर इनवॉइस दर्ज करें',
        'उधारी वसूली पर ध्यान दें',
      ],
    };
  }
}

