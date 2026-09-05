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
  AccountingSupplier,
  SupplierLedgerEntry,
  AccountingPurchase,
  AccountingPurchaseItem,
  AccountingExpense,
  AccountingExpenseCategory,
  AccountingCashRegister,
  DailyAccountingSummary,
  AIScanResult,
  PackagingVariant,
  StockBatch,
  LooseStockPool,
  StockMovementLog,
  AccountingAuditLog,
  MonthlyPOSExportMeta
} from '../types/accounting';
import { compressImage } from '../lib/utils';

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
  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.originalSellingPrice), 0);
  const totalCOGS = items.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0);
  
  // If no negotiation or higher, discount is 0
  const finalTotal = Math.max(0, negotiatedFinalTotal);
  const bargainingDiscount = Math.max(0, subtotal - finalTotal);

  let allocatedDiscountRunning = 0;
  const allocatedItems: AccountingSaleItem[] = items.map((it, idx) => {
    const originalLineTotal = it.quantity * it.originalSellingPrice;
    const lineCostTotal = it.quantity * it.costPrice;

    let lineDiscountShare = 0;
    if (subtotal > 0 && bargainingDiscount > 0) {
      if (idx === items.length - 1) {
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
    // If invoiceNo is empty, starts with "OFF-", or is placeholder, generate strictly sequential FKB number
    const isPlaceholder = !saleData.invoiceNo || saleData.invoiceNo.startsWith('OFF-') || saleData.invoiceNo.startsWith('FKB-TEMP');
    if (!isPlaceholder && saleData.invoiceNo) {
      assignedInvoiceNo = saleData.invoiceNo;
    } else {
      const nextSeq = lastSeq + 1;
      assignedInvoiceNo = formatPOSInvoiceNo(nextSeq);
      // Persist next sequence number atomically
      transaction.set(counterRef, {
        lastSequence: nextSeq,
        prefix: 'FKB-',
        updatedAt: now,
      }, { merge: true });
    }

    // 2. Read products for stock deductions (must read before any writes)
    const productReads: { ref: DocumentReference; snap: any; item: AccountingSaleItem }[] = [];
    for (const item of saleData.items) {
      if (item.productId) {
        const prodRef = doc(db, 'accounting_products', item.productId);
        const prodSnap = await transaction.get(prodRef);
        productReads.push({ ref: prodRef, snap: prodSnap, item });
      }
    }

    // 3. Read customer if udhari
    let custRead: { ref: DocumentReference; snap: any } | null = null;
    if (saleData.udhariAmount > 0 && saleData.customerId) {
      const custRef = doc(db, 'accounting_customers', saleData.customerId);
      const custSnap = await transaction.get(custRef);
      custRead = { ref: custRef, snap: custSnap };
    }

    // --- ALL READS COMPLETED: NOW EXECUTE ALL ATOMIC WRITES ---

    // 4. Write Sale Document
    const fullSale: AccountingSale = {
      ...saleData,
      id: saleRef.id,
      invoiceNo: assignedInvoiceNo,
      createdAt: now,
    };
    transaction.set(saleRef, fullSale);

    // 5. Deduct inventory stock and record audit movements
    for (const { ref: prodRef, snap: prodSnap, item } of productReads) {
      if (prodSnap.exists()) {
        const prodData = prodSnap.data() as AccountingProduct;

        if (item.saleType === 'loose') {
          const currentLoose = prodData.looseStock?.availableBaseQty || 0;
          const deductBase = item.looseBaseQty || item.looseQuantity || 0;
          const newLoose = Math.max(0, currentLoose - deductBase);

          transaction.update(prodRef, {
            'looseStock.availableBaseQty': newLoose,
            'looseStock.updatedAt': now,
            updatedAt: now,
          });

          const movRef = doc(collection(db, 'accounting_stock_movements'));
          transaction.set(movRef, {
            id: movRef.id,
            timestamp: now,
            date: saleData.date,
            productId: item.productId,
            productName: item.hindiName || item.name,
            type: 'loose_sale',
            quantityChangeBaseUnit: -deductBase,
            balanceBaseUnitAfter: newLoose,
            reason: `बिल #${assignedInvoiceNo} पर खुली बिक्री (${deductBase} ${item.looseUnit || 'ml/g'})`,
            referenceId: saleRef.id,
          });
        } else if (item.variantId && prodData.packagingVariants && prodData.packagingVariants.length > 0) {
          const updatedVariants = prodData.packagingVariants.map(v => {
            if (v.id === item.variantId) {
              return {
                ...v,
                currentStockPacks: Math.max(0, (v.currentStockPacks || 0) - item.quantity),
              };
            }
            return v;
          });
          const totalSealedPacks = updatedVariants.reduce((sum, v) => sum + (v.currentStockPacks || 0), 0);

          transaction.update(prodRef, {
            packagingVariants: updatedVariants,
            currentStock: totalSealedPacks,
            updatedAt: now,
          });

          const movRef = doc(collection(db, 'accounting_stock_movements'));
          transaction.set(movRef, {
            id: movRef.id,
            timestamp: now,
            date: saleData.date,
            productId: item.productId,
            productName: item.hindiName || item.name,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
            type: 'pack_sale',
            quantityChangePacks: -item.quantity,
            balancePacksAfter: updatedVariants.find(v => v.id === item.variantId)?.currentStockPacks,
            reason: `बिल #${assignedInvoiceNo} पर सीलबंद बिक्री (${item.quantity} ${item.variantLabel || item.unit})`,
            referenceId: saleRef.id,
          });
        } else {
          const currentStock = prodData.currentStock || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          transaction.update(prodRef, {
            currentStock: newStock,
            updatedAt: now,
          });
        }
      }
    }

    // 6. Update Customer Udhari Ledger
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
        timestamp: now,
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
// WHOLESALER PURCHASES & SUPPLIER LEDGER
// ----------------------------------------------------

export async function fetchAccountingSuppliers(includeArchived = true): Promise<AccountingSupplier[]> {
  try {
    const q = query(collection(db, 'accounting_suppliers'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingSupplier));
    if (!includeArchived) {
      return list.filter(s => !s.isArchived);
    }
    return list;
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return [];
  }
}

export async function saveAccountingSupplier(
  supplier: Omit<AccountingSupplier, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): Promise<string> {
  const now = Date.now();
  const suppRef = id ? doc(db, 'accounting_suppliers', id) : doc(collection(db, 'accounting_suppliers'));
  const payload: any = {
    ...supplier,
    updatedAt: now,
    ...(id ? {} : { createdAt: now }),
  };
  if (supplier.isArchived !== undefined) {
    payload.isArchived = !!supplier.isArchived;
    payload.status = supplier.isArchived ? 'archived' : 'active';
  }
  await setDoc(suppRef, payload, { merge: true });
  return suppRef.id;
}

export async function archiveAccountingSupplier(supplierId: string): Promise<void> {
  const suppRef = doc(db, 'accounting_suppliers', supplierId);
  await updateDoc(suppRef, {
    isArchived: true,
    status: 'archived',
    updatedAt: Date.now(),
  });
}

export async function unarchiveAccountingSupplier(supplierId: string): Promise<void> {
  const suppRef = doc(db, 'accounting_suppliers', supplierId);
  await updateDoc(suppRef, {
    isArchived: false,
    status: 'active',
    updatedAt: Date.now(),
  });
}

export async function checkSupplierHasHistory(supplierId: string): Promise<{
  hasHistory: boolean;
  purchaseCount: number;
  totalPurchased: number;
  totalPaid: number;
  currentOutstanding: number;
}> {
  try {
    const q = query(
      collection(db, 'accounting_purchases'),
      where('supplierId', '==', supplierId)
    );
    const snap = await getDocs(q);
    const suppRef = doc(db, 'accounting_suppliers', supplierId);
    const suppSnap = await getDoc(suppRef);
    const suppData = suppSnap.exists() ? (suppSnap.data() as AccountingSupplier) : null;
    
    const count = snap.size;
    const totalPurchased = suppData?.totalPurchased || 0;
    const totalPaid = suppData?.totalPaid || 0;
    const currentOutstanding = suppData?.currentOutstanding || 0;
    const hasHistory = count > 0 || totalPurchased > 0 || totalPaid > 0;
    return {
      hasHistory,
      purchaseCount: count,
      totalPurchased,
      totalPaid,
      currentOutstanding,
    };
  } catch (err) {
    console.error('Error checking supplier history:', err);
    return { hasHistory: true, purchaseCount: 0, totalPurchased: 0, totalPaid: 0, currentOutstanding: 0 };
  }
}

export async function deleteAccountingSupplier(supplierId: string): Promise<void> {
  await deleteDoc(doc(db, 'accounting_suppliers', supplierId));
}

export async function fetchSupplierLedger(supplierId: string): Promise<SupplierLedgerEntry[]> {
  try {
    const q = query(
      collection(db, 'accounting_supplier_ledger'),
      where('supplierId', '==', supplierId),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierLedgerEntry));
  } catch (err) {
    console.error('Error fetching supplier ledger:', err);
    return [];
  }
}

export async function fetchAccountingPurchases(): Promise<AccountingPurchase[]> {
  try {
    const q = query(collection(db, 'accounting_purchases'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingPurchase));
  } catch (err) {
    console.error('Error fetching purchases:', err);
    return [];
  }
}

export async function createWholesalerPurchase(purchaseData: Omit<AccountingPurchase, 'id' | 'createdAt'>): Promise<string> {
  const now = Date.now();
  const batch = writeBatch(db);

  const purchaseRef = doc(collection(db, 'accounting_purchases'));
  const isFullyPaid = purchaseData.unpaidSupplierUdhari === 0;
  const initialStatus: 'paid' | 'partially_paid' | 'unpaid' = isFullyPaid
    ? 'paid'
    : purchaseData.paidAmount > 0
    ? 'partially_paid'
    : 'unpaid';

  const initialPayments: any[] = [];
  if (purchaseData.paidAmount > 0) {
    initialPayments.push({
      id: `pay_init_${now}`,
      amount: purchaseData.paidAmount,
      date: purchaseData.invoiceDate,
      paymentMode: purchaseData.paymentMode === 'split' ? 'cash' : (purchaseData.paymentMode === 'online' ? 'online' : (purchaseData.paymentMode === 'bank' ? 'bank' : 'cash')),
      note: 'खरीद के समय दिया गया प्रारंभिक भुगतान',
      timestamp: now,
    });
  }

  // Calculate landed cost allocation per item if transport charges exist
  const transportCost = purchaseData.transportCharges || 0;
  const itemsSubtotal = purchaseData.subtotal || purchaseData.items.reduce((s, it) => s + (it.total || 0), 0);
  
  const enrichedItems: AccountingPurchaseItem[] = purchaseData.items.map(item => {
    let allocatedTransport = 0;
    if (transportCost > 0 && itemsSubtotal > 0) {
      allocatedTransport = Math.round(((item.total || 0) / itemsSubtotal) * transportCost * 100) / 100;
    }
    const packQty = item.quantity || 1;
    const landedCostPerPack = Math.round(((item.purchasePrice || 0) + (allocatedTransport / packQty)) * 100) / 100;
    return {
      ...item,
      allocatedTransportCost: allocatedTransport,
      landedCostPerPack,
    };
  });

  const totalLandedCost = Math.max(0, itemsSubtotal + (purchaseData.taxAmount || 0) - (purchaseData.discountAmount || 0) + transportCost);

  const fullPurchase: AccountingPurchase = {
    ...purchaseData,
    items: enrichedItems,
    totalLandedCost,
    id: purchaseRef.id,
    paymentStatus: initialStatus,
    clearedDate: isFullyPaid ? purchaseData.invoiceDate : undefined,
    payments: initialPayments,
    createdAt: now,
  };

  batch.set(purchaseRef, fullPurchase);

  // 1. Group items by product to safely handle multiple packaging variants under the same product
  const itemsByProduct = new Map<string, AccountingPurchaseItem[]>();
  const unlinkedItems: AccountingPurchaseItem[] = [];

  for (const item of enrichedItems) {
    if (item.productId) {
      const existingList = itemsByProduct.get(item.productId) || [];
      existingList.push(item);
      itemsByProduct.set(item.productId, existingList);
    } else {
      unlinkedItems.push(item);
    }
  }

  // Process each linked product with all its purchase variants together
  for (const [productId, prodItems] of itemsByProduct.entries()) {
    const prodRef = doc(db, 'accounting_products', productId);
    const prodSnap = await getDoc(prodRef);

    if (prodSnap.exists()) {
      const prodData = prodSnap.data() as AccountingProduct;
      const variants: PackagingVariant[] = prodData.packagingVariants ? [...prodData.packagingVariants] : [];
      const batches: StockBatch[] = prodData.batches ? [...prodData.batches] : [];
      let currentStock = prodData.currentStock || 0;
      let currentCost = prodData.costPrice || 0;

      let addedPacks = 0;
      let addedPurchaseCostTotal = 0;
      let latestBatchNo = prodData.batchNo || '';
      let latestExpiryDate = prodData.expiryDate || '';
      let latestMfgDate = prodData.manufacturingDate || '';

      for (const item of prodItems) {
        const itemQty = Number(item.quantity) || 0;
        addedPacks += itemQty;
        addedPurchaseCostTotal += (item.purchasePrice || 0) * itemQty;

        // Variant matching and updating
        let targetVar: PackagingVariant | undefined;
        if (item.variantId) {
          targetVar = variants.find(v => v.id === item.variantId);
        }
        
        // Fallback: match by size, unit, packagingType
        if (!targetVar && item.packagingSize) {
          targetVar = variants.find(v => 
            v.sizeValue === Number(item.packagingSize) && 
            v.sizeUnit === item.packagingUnit && 
            v.packagingType === item.packagingType
          );
        }

        if (targetVar) {
          targetVar.currentStockPacks = (targetVar.currentStockPacks || 0) + itemQty;
          targetVar.costPrice = item.purchasePrice;
          if (item.sellingPriceSuggestion) {
            targetVar.sellingPrice = item.sellingPriceSuggestion;
          }
        } else if (item.packagingSize) {
          // Create new packaging variant for this product
          const sizeVal = Number(item.packagingSize);
          const sizeUnit = item.packagingUnit || 'ml';
          const packType = item.packagingType || 'Bottle';
          let baseQty = sizeVal;
          if (sizeUnit === 'Ltr' || sizeUnit === 'kg') baseQty = sizeVal * 1000;

          const newVarId = `var_${now}_${Math.random().toString(36).slice(2, 6)}`;
          const newVar: PackagingVariant = {
            id: newVarId,
            sizeValue: sizeVal,
            sizeUnit: sizeUnit,
            packagingType: packType,
            label: `${sizeVal} ${sizeUnit} ${packType}`,
            baseQuantity: baseQty,
            costPrice: item.purchasePrice,
            sellingPrice: item.sellingPriceSuggestion || Math.round(item.purchasePrice * 1.25),
            currentStockPacks: itemQty,
            minStockAlertPacks: 5,
            allowLooseSale: sizeUnit === 'Ltr' || sizeUnit === 'kg' || sizeUnit === 'ml' || sizeUnit === 'g',
          };
          variants.push(newVar);
          targetVar = newVar;
        }

        // Add Batch Record
        if (item.batchNumber || item.expiryDate || item.manufacturingDate) {
          const newBatch: StockBatch = {
            id: `batch_${now}_${Math.random().toString(36).slice(2, 6)}`,
            productId,
            variantId: targetVar ? targetVar.id : (item.variantId || 'default'),
            batchNumber: item.batchNumber || `B-${now.toString().slice(-6)}`,
            manufacturingDate: item.manufacturingDate,
            expiryDate: item.expiryDate || '',
            purchasePricePerPack: item.purchasePrice,
            initialPackQuantity: itemQty,
            remainingPackQuantity: itemQty,
            supplierId: purchaseData.supplierId,
            purchaseInvoiceNo: purchaseData.invoiceNumber,
            purchaseDate: purchaseData.invoiceDate,
            createdAt: now,
          };
          batches.push(newBatch);

          if (item.batchNumber) latestBatchNo = item.batchNumber;
          if (item.expiryDate) latestExpiryDate = item.expiryDate;
          if (item.manufacturingDate) latestMfgDate = item.manufacturingDate;
        }

        // Stock movement audit for each variant
        const movRef = doc(collection(db, 'accounting_stock_movements'));
        batch.set(movRef, {
          id: movRef.id,
          timestamp: now,
          date: purchaseData.invoiceDate,
          productId,
          productName: item.hindiName || item.name,
          variantId: targetVar?.id || item.variantId,
          variantLabel: targetVar?.label || item.variantLabel,
          batchNumber: item.batchNumber,
          type: 'purchase',
          quantityChangePacks: itemQty,
          balancePacksAfter: targetVar?.currentStockPacks || (currentStock + addedPacks),
          reason: `थोक खरीद #${purchaseData.invoiceNumber} से स्टॉक आवक (${itemQty} पैकेट)`,
          referenceId: purchaseRef.id,
        });
      }

      // Calculate total stock and weighted average cost for the product
      const totalNewStock = currentStock + addedPacks;
      let weightedCost = currentCost;
      if (totalNewStock > 0 && addedPacks > 0) {
        weightedCost = ((currentStock * currentCost) + addedPurchaseCostTotal) / totalNewStock;
      }

      // Recalculate total sealed packs from all variants if variants exist
      const totalPacksFromVariants = variants.length > 0
        ? variants.reduce((sum, v) => sum + (v.currentStockPacks || 0), 0)
        : totalNewStock;

      const updates: any = {
        currentStock: totalPacksFromVariants,
        costPrice: Math.round(weightedCost * 100) / 100,
        updatedAt: now,
      };

      if (variants.length > 0) {
        updates.packagingVariants = variants;
        updates.hasMultipleVariants = variants.length > 1;
      }
      if (batches.length > 0) {
        updates.batches = batches;
      }
      if (latestBatchNo) updates.batchNo = latestBatchNo;
      if (latestExpiryDate) updates.expiryDate = latestExpiryDate;
      if (latestMfgDate) updates.manufacturingDate = latestMfgDate;

      batch.update(prodRef, updates);
    }
  }

  // Process any unlinked new products that were added directly in the invoice
  for (const item of unlinkedItems) {
    const newProdRef = doc(collection(db, 'accounting_products'));
    const sizeVal = Number(item.packagingSize) || 1;
    const sizeUnit = item.packagingUnit || 'ml';
    const packType = item.packagingType || 'Bottle';
    let baseQty = sizeVal;
    if (sizeUnit === 'Ltr' || sizeUnit === 'kg') baseQty = sizeVal * 1000;

    const initialVar: PackagingVariant = {
      id: `var_${now}_${Math.random().toString(36).slice(2, 6)}`,
      sizeValue: sizeVal,
      sizeUnit: sizeUnit,
      packagingType: packType,
      label: `${sizeVal} ${sizeUnit} ${packType}`,
      baseQuantity: baseQty,
      costPrice: item.purchasePrice,
      sellingPrice: item.sellingPriceSuggestion || Math.round(item.purchasePrice * 1.25),
      currentStockPacks: item.quantity,
      minStockAlertPacks: 5,
      allowLooseSale: sizeUnit === 'Ltr' || sizeUnit === 'kg' || sizeUnit === 'ml' || sizeUnit === 'g',
    };

    const initialBatches: StockBatch[] = [];
    if (item.batchNumber || item.expiryDate || item.manufacturingDate) {
      initialBatches.push({
        id: `batch_${now}_${Math.random().toString(36).slice(2, 6)}`,
        productId: newProdRef.id,
        variantId: initialVar.id,
        batchNumber: item.batchNumber || `B-${now.toString().slice(-6)}`,
        manufacturingDate: item.manufacturingDate,
        expiryDate: item.expiryDate || '',
        purchasePricePerPack: item.purchasePrice,
        initialPackQuantity: item.quantity,
        remainingPackQuantity: item.quantity,
        supplierId: purchaseData.supplierId,
        purchaseInvoiceNo: purchaseData.invoiceNumber,
        purchaseDate: purchaseData.invoiceDate,
        createdAt: now,
      });
    }

    const newProductData: AccountingProduct = {
      id: newProdRef.id,
      name: item.name || item.hindiName || 'नया कृषि उत्पाद',
      hindiName: item.hindiName || item.name || 'नया कृषि उत्पाद',
      category: item.category || 'pesticides',
      unit: packType,
      currentStock: item.quantity,
      minStockAlert: 5,
      costPrice: item.purchasePrice,
      defaultSellingPrice: item.sellingPriceSuggestion || Math.round(item.purchasePrice * 1.25),
      batchNo: item.batchNumber,
      expiryDate: item.expiryDate,
      manufacturingDate: item.manufacturingDate,
      packagingVariants: [initialVar],
      batches: initialBatches,
      hasMultipleVariants: false,
      productType: item.productType || (sizeUnit === 'ml' || sizeUnit === 'Ltr' ? 'liquid' : 'powder_granule'),
      updatedAt: now,
      createdAt: now,
    };

    batch.set(newProdRef, newProductData);
  }

  // 2. Update Supplier Outstanding, total purchased and total paid
  if (purchaseData.supplierId) {
    const suppRef = doc(db, 'accounting_suppliers', purchaseData.supplierId);
    const suppSnap = await getDoc(suppRef);
    if (suppSnap.exists()) {
      const suppData = suppSnap.data() as AccountingSupplier;
      const currentOutstanding = suppData.currentOutstanding || 0;
      
      // Determine amount to add to supplier balance based on transport liability
      const supplierBilledTotal = purchaseData.transportPayableTo === 'transporter'
        ? Math.max(0, purchaseData.grandTotal - (purchaseData.transportCharges || 0))
        : purchaseData.grandTotal;

      const newOutstanding = currentOutstanding + purchaseData.unpaidSupplierUdhari;
      const totalPurchased = (suppData.totalPurchased || 0) + supplierBilledTotal;
      const totalPaid = (suppData.totalPaid || 0) + purchaseData.paidAmount;

      batch.update(suppRef, {
        currentOutstanding: newOutstanding,
        totalPurchased,
        totalPaid,
        lastPaymentDate: purchaseData.paidAmount > 0 ? purchaseData.invoiceDate : suppData.lastPaymentDate,
        updatedAt: now,
      });

      // Write Supplier Ledger (Purchase Credit)
      const sLedgerRef = doc(collection(db, 'accounting_supplier_ledger'));
      const sEntry: SupplierLedgerEntry = {
        id: sLedgerRef.id,
        supplierId: purchaseData.supplierId,
        supplierName: purchaseData.supplierName,
        type: 'purchase_credit',
        invoiceNo: purchaseData.invoiceNumber,
        purchaseId: purchaseRef.id,
        amount: supplierBilledTotal,
        balanceAfter: newOutstanding,
        paymentMode: purchaseData.paymentMode === 'split' ? 'cash' : (purchaseData.paymentMode === 'online' ? 'online' : (purchaseData.paymentMode === 'bank' ? 'bank' : 'cash')),
        date: purchaseData.invoiceDate,
        timestamp: now,
        note: `थोक खरीद इनवॉइस #${purchaseData.invoiceNumber} (माल: ₹${purchaseData.subtotal}${purchaseData.transportCharges ? `, भाड़ा: ₹${purchaseData.transportCharges}` : ''})`,
      };
      batch.set(sLedgerRef, sEntry);

      // If initial payment was made at purchase, record a ledger debit entry for clarity
      if (purchaseData.paidAmount > 0) {
        const payLedgerRef = doc(collection(db, 'accounting_supplier_ledger'));
        const payEntry: SupplierLedgerEntry = {
          id: payLedgerRef.id,
          supplierId: purchaseData.supplierId,
          supplierName: purchaseData.supplierName,
          type: 'payment_debit',
          invoiceNo: purchaseData.invoiceNumber,
          purchaseId: purchaseRef.id,
          amount: purchaseData.paidAmount,
          balanceAfter: newOutstanding,
          paymentMode: purchaseData.paymentMode === 'split' ? 'cash' : (purchaseData.paymentMode === 'online' ? 'online' : 'cash'),
          date: purchaseData.invoiceDate,
          timestamp: now + 1,
          note: `खरीद के समय दिया गया भुगतान (बिल #${purchaseData.invoiceNumber})`,
        };
        batch.set(payLedgerRef, payEntry);
      }
    }
  }

  // 3. Cash Flow Integration: Automatically record Outflow Expense for cash/online paid during purchase
  if (purchaseData.paidAmount > 0) {
    const expRef = doc(collection(db, 'accounting_expenses'));
    const expPayload: AccountingExpense = {
      id: expRef.id,
      date: purchaseData.invoiceDate,
      timestamp: now,
      categoryId: 'supplier_payment',
      categoryName: 'Supplier Payment',
      categoryNameHindi: 'सप्लायर भुगतान (थोक खरीद)',
      amount: purchaseData.paidAmount,
      paymentMode: purchaseData.paymentMode === 'cash' ? 'cash' : 'online',
      recipientName: purchaseData.supplierName,
      description: `सप्लायर ${purchaseData.supplierName} को खरीद इनवॉइस #${purchaseData.invoiceNumber} पर नकद/ऑनलाइन भुगतान`,
      isAiScanned: false,
      createdAt: now,
    };
    batch.set(expRef, expPayload);
  }

  await batch.commit();
  return purchaseRef.id;
}

export interface RecordSupplierPaymentParams {
  supplierId: string;
  supplierName: string;
  purchaseId?: string;
  invoiceNumber?: string;
  amount: number;
  paymentMode: 'cash' | 'online' | 'bank';
  paymentDate: string;
  notes?: string;
}

/**
 * Record payment to a supplier.
 * Supports partial or full payment against a specific invoice or on-account.
 * Automatically integrates with cash flow / business outflow expenses!
 */
export async function recordSupplierPayment(params: RecordSupplierPaymentParams): Promise<void> {
  const { supplierId, supplierName, purchaseId, invoiceNumber, amount, paymentMode, paymentDate, notes } = params;
  if (amount <= 0) {
    throw new Error('कृपया 0 से अधिक भुगतान राशि दर्ज करें।');
  }

  const now = Date.now();
  const batch = writeBatch(db);

  // 1. Fetch & update supplier
  const suppRef = doc(db, 'accounting_suppliers', supplierId);
  const suppSnap = await getDoc(suppRef);
  if (!suppSnap.exists()) {
    throw new Error('सप्लायर रिकॉर्ड नहीं मिला।');
  }

  const suppData = suppSnap.data() as AccountingSupplier;
  const currentOutstanding = suppData.currentOutstanding || 0;
  const newOutstanding = Math.max(0, currentOutstanding - amount);
  const totalPaid = (suppData.totalPaid || 0) + amount;

  batch.update(suppRef, {
    currentOutstanding: newOutstanding,
    totalPaid,
    lastPaymentDate: paymentDate,
    updatedAt: now,
  });

  // 2. Settle specific invoice or allocate across pending invoices
  let targetInvoiceNumber = invoiceNumber || '';
  if (purchaseId) {
    const purchRef = doc(db, 'accounting_purchases', purchaseId);
    const purchSnap = await getDoc(purchRef);
    if (purchSnap.exists()) {
      const purchData = purchSnap.data() as AccountingPurchase;
      targetInvoiceNumber = purchData.invoiceNumber || targetInvoiceNumber;
      const currentPaid = purchData.paidAmount || 0;
      const newPaid = currentPaid + amount;
      const newUnpaid = Math.max(0, purchData.grandTotal - newPaid);
      const isCleared = newUnpaid === 0;

      const paymentRec: any = {
        id: `pay_${now}_${Math.random().toString(36).substring(2, 7)}`,
        amount,
        date: paymentDate,
        paymentMode,
        note: notes || '',
        timestamp: now,
      };

      batch.update(purchRef, {
        paidAmount: newPaid,
        unpaidSupplierUdhari: newUnpaid,
        paymentStatus: isCleared ? 'paid' : (newPaid > 0 ? 'partially_paid' : 'unpaid'),
        clearedDate: isCleared ? paymentDate : (purchData.clearedDate || null),
        payments: [...(purchData.payments || []), paymentRec],
      });
    }
  } else {
    // If no specific invoice was chosen, settle sequentially against oldest pending invoices
    const q = query(
      collection(db, 'accounting_purchases'),
      where('supplierId', '==', supplierId),
      orderBy('timestamp', 'asc')
    );
    const pSnap = await getDocs(q);
    let remainingAmountToAllocate = amount;
    const settledInvoiceNumbers: string[] = [];

    for (const docSnap of pSnap.docs) {
      if (remainingAmountToAllocate <= 0) break;
      const pData = docSnap.data() as AccountingPurchase;
      const unpaid = pData.unpaidSupplierUdhari || 0;
      if (unpaid > 0) {
        const settleAmt = Math.min(unpaid, remainingAmountToAllocate);
        const newPaid = (pData.paidAmount || 0) + settleAmt;
        const newUnpaid = Math.max(0, pData.grandTotal - newPaid);
        const isCleared = newUnpaid === 0;

        settledInvoiceNumbers.push(pData.invoiceNumber);

        const paymentRec: any = {
          id: `pay_${now}_${Math.random().toString(36).substring(2, 7)}`,
          amount: settleAmt,
          date: paymentDate,
          paymentMode,
          note: notes ? `${notes} (On-Account)` : 'खाता ऑन-अकाउंट समायोजन',
          timestamp: now,
        };

        batch.update(docSnap.ref, {
          paidAmount: newPaid,
          unpaidSupplierUdhari: newUnpaid,
          paymentStatus: isCleared ? 'paid' : 'partially_paid',
          clearedDate: isCleared ? paymentDate : (pData.clearedDate || null),
          payments: [...(pData.payments || []), paymentRec],
        });

        remainingAmountToAllocate -= settleAmt;
      }
    }

    if (settledInvoiceNumbers.length > 0 && !targetInvoiceNumber) {
      targetInvoiceNumber = settledInvoiceNumbers.join(', ');
    }
  }

  // 3. Write Supplier Ledger (Debit entry)
  const sLedgerRef = doc(collection(db, 'accounting_supplier_ledger'));
  const sEntry: SupplierLedgerEntry = {
    id: sLedgerRef.id,
    supplierId,
    supplierName,
    type: 'payment_debit',
    invoiceNo: targetInvoiceNumber,
    purchaseId: purchaseId || '',
    amount,
    balanceAfter: newOutstanding,
    paymentMode,
    date: paymentDate,
    timestamp: now,
    note: notes || (targetInvoiceNumber ? `सप्लायर भुगतान (बिल #${targetInvoiceNumber})` : 'सप्लायर खाता भुगतान'),
  };
  batch.set(sLedgerRef, sEntry);

  // 4. Cash Flow Integration: Automatic Business Outflow Expense Entry
  const expRef = doc(collection(db, 'accounting_expenses'));
  const expPayload: AccountingExpense = {
    id: expRef.id,
    date: paymentDate,
    timestamp: now,
    categoryId: 'supplier_payment',
    categoryName: 'Supplier Payment',
    categoryNameHindi: 'सप्लायर भुगतान (थोक खरीद)',
    amount,
    paymentMode: paymentMode === 'cash' ? 'cash' : 'online',
    recipientName: supplierName,
    description: `सप्लायर ${supplierName} को भुगतान${targetInvoiceNumber ? ` (बिल #${targetInvoiceNumber})` : ''}${notes ? ` - ${notes}` : ''}`,
    isAiScanned: false,
    createdAt: now,
  };
  batch.set(expRef, expPayload);

  await batch.commit();
}

export async function checkPurchaseHasDependentRecords(purchaseId: string): Promise<{
  purchase: AccountingPurchase | null;
  hasSoldStock: boolean;
  soldStockWarnings: Array<{
    productId?: string;
    productName: string;
    variantLabel?: string;
    boughtQty: number;
    availableQty: number;
    deficit: number;
  }>;
  hasSubsequentPayments: boolean;
  subsequentPaymentsTotal: number;
  subsequentPaymentsCount: number;
  supplierOutstanding: number;
  initialPaidExpenseFound: boolean;
}> {
  try {
    const purchRef = doc(db, 'accounting_purchases', purchaseId);
    const purchSnap = await getDoc(purchRef);
    if (!purchSnap.exists()) {
      return {
        purchase: null,
        hasSoldStock: false,
        soldStockWarnings: [],
        hasSubsequentPayments: false,
        subsequentPaymentsTotal: 0,
        subsequentPaymentsCount: 0,
        supplierOutstanding: 0,
        initialPaidExpenseFound: false,
      };
    }

    const purchase = { id: purchSnap.id, ...purchSnap.data() } as AccountingPurchase;

    // 1. Check stock availability for each item
    const soldStockWarnings: Array<{
      productId?: string;
      productName: string;
      variantLabel?: string;
      boughtQty: number;
      availableQty: number;
      deficit: number;
    }> = [];

    for (const item of purchase.items || []) {
      if (item.productId) {
        const prodSnap = await getDoc(doc(db, 'accounting_products', item.productId));
        if (prodSnap.exists()) {
          const prod = prodSnap.data() as AccountingProduct;
          let available = prod.currentStock || 0;
          let variantLabel = item.variantLabel || `${item.packagingSize || ''} ${item.packagingUnit || ''}`;

          if (item.variantId && prod.packagingVariants && prod.packagingVariants.length > 0) {
            const v = prod.packagingVariants.find(x => x.id === item.variantId);
            if (v) {
              available = v.currentStockPacks || 0;
              variantLabel = v.label || variantLabel;
            }
          } else if (item.packagingSize && prod.packagingVariants && prod.packagingVariants.length > 0) {
            const v = prod.packagingVariants.find(x => 
              x.sizeValue === Number(item.packagingSize) && 
              x.sizeUnit === item.packagingUnit && 
              x.packagingType === item.packagingType
            );
            if (v) {
              available = v.currentStockPacks || 0;
              variantLabel = v.label || variantLabel;
            }
          }

          if (available < item.quantity) {
            soldStockWarnings.push({
              productId: item.productId,
              productName: item.hindiName || item.name,
              variantLabel,
              boughtQty: item.quantity,
              availableQty: available,
              deficit: item.quantity - available,
            });
          }
        }
      }
    }

    // 2. Check subsequent payments on this invoice
    const allPayments = purchase.payments || [];
    const subsequentPayments = allPayments.filter(p => !p.id.startsWith('pay_init_'));
    const subsequentPaymentsTotal = subsequentPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // 3. Check supplier outstanding
    let supplierOutstanding = 0;
    if (purchase.supplierId) {
      const suppSnap = await getDoc(doc(db, 'accounting_suppliers', purchase.supplierId));
      if (suppSnap.exists()) {
        supplierOutstanding = suppSnap.data().currentOutstanding || 0;
      }
    }

    return {
      purchase,
      hasSoldStock: soldStockWarnings.length > 0,
      soldStockWarnings,
      hasSubsequentPayments: subsequentPayments.length > 0,
      subsequentPaymentsTotal,
      subsequentPaymentsCount: subsequentPayments.length,
      supplierOutstanding,
      initialPaidExpenseFound: (purchase.paidAmount || 0) > 0,
    };
  } catch (err) {
    console.error('Error checking purchase dependencies:', err);
    return {
      purchase: null,
      hasSoldStock: false,
      soldStockWarnings: [],
      hasSubsequentPayments: false,
      subsequentPaymentsTotal: 0,
      subsequentPaymentsCount: 0,
      supplierOutstanding: 0,
      initialPaidExpenseFound: false,
    };
  }
}

export async function cancelOrDeleteWholesalerPurchase(params: {
  purchaseId: string;
  adminEmail: string;
  adminName?: string;
  adminUid?: string;
  reason?: string;
  hardDelete?: boolean;
}): Promise<void> {
  const { purchaseId, adminEmail, adminName, adminUid, reason, hardDelete = false } = params;
  const now = Date.now();
  const purchRef = doc(db, 'accounting_purchases', purchaseId);
  const purchSnap = await getDoc(purchRef);
  if (!purchSnap.exists()) throw new Error('खरीद इनवॉइस रिकॉर्ड नहीं मिला।');

  const purchase = { id: purchSnap.id, ...purchSnap.data() } as AccountingPurchase;

  // If already cancelled and user wants to hard delete, we delete doc and record audit
  if (purchase.status === 'cancelled' && hardDelete) {
    const batch = writeBatch(db);
    batch.delete(purchRef);
    const auditRef = doc(collection(db, 'accounting_audit_logs'));
    batch.set(auditRef, {
      id: auditRef.id,
      action: 'purchase_invoice_deleted',
      targetId: purchase.id,
      targetNumber: purchase.invoiceNumber,
      targetName: purchase.supplierName,
      targetType: 'purchase',
      adminEmail,
      adminName: adminName || adminEmail,
      adminUid: adminUid || '',
      timestamp: now,
      date: new Date().toISOString().split('T')[0],
      reason: reason || 'रद्द इनवॉइस को डेटाबेस से स्थायी रूप से हटाया गया',
      previousAmount: purchase.grandTotal,
      financialImpact: {
        totalAmount: purchase.grandTotal,
        paidAmount: purchase.paidAmount,
        outstandingAmount: purchase.unpaidSupplierUdhari,
      },
    });
    await batch.commit();
    return;
  }

  // If already cancelled and trying to cancel again, no-op
  if (purchase.status === 'cancelled' && !hardDelete) {
    return;
  }

  const batch = writeBatch(db);

  // 1. Stock Reversal for all items and packaging variants
  const itemsByProduct = new Map<string, AccountingPurchaseItem[]>();
  for (const item of purchase.items || []) {
    if (item.productId) {
      const list = itemsByProduct.get(item.productId) || [];
      list.push(item);
      itemsByProduct.set(item.productId, list);
    }
  }

  for (const [productId, prodItems] of itemsByProduct.entries()) {
    const prodRef = doc(db, 'accounting_products', productId);
    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists()) {
      const prod = prodSnap.data() as AccountingProduct;
      const variants: PackagingVariant[] = prod.packagingVariants ? [...prod.packagingVariants] : [];
      let batches: StockBatch[] = prod.batches ? [...prod.batches] : [];
      let currentStock = prod.currentStock || 0;

      let totalDeductedPacks = 0;

      for (const item of prodItems) {
        const itemQty = Number(item.quantity) || 0;
        totalDeductedPacks += itemQty;

        // Match and deduct variant stock
        let targetVar: PackagingVariant | undefined;
        if (item.variantId) {
          targetVar = variants.find(v => v.id === item.variantId);
        }
        if (!targetVar && item.packagingSize) {
          targetVar = variants.find(v => 
            v.sizeValue === Number(item.packagingSize) && 
            v.sizeUnit === item.packagingUnit && 
            v.packagingType === item.packagingType
          );
        }

        if (targetVar) {
          targetVar.currentStockPacks = Math.max(0, (targetVar.currentStockPacks || 0) - itemQty);
        }

        // Remove or reduce corresponding batch
        batches = batches.filter(b => {
          if (b.purchaseInvoiceNo === purchase.invoiceNumber || (b as any).purchaseId === purchase.id) {
            return false;
          }
          return true;
        });

        // Record stock movement reversal audit log
        const movRef = doc(collection(db, 'accounting_stock_movements'));
        const movLog: StockMovementLog = {
          id: movRef.id,
          timestamp: now,
          date: new Date().toISOString().split('T')[0],
          productId,
          productName: item.hindiName || item.name,
          variantId: targetVar?.id || item.variantId,
          variantLabel: targetVar?.label || item.variantLabel,
          batchNumber: item.batchNumber,
          type: 'return',
          quantityChangePacks: -itemQty,
          balancePacksAfter: targetVar?.currentStockPacks ?? Math.max(0, currentStock - totalDeductedPacks),
          reason: `थोक खरीद #${purchase.invoiceNumber} रद्द/हटाने के कारण स्टॉक रिवर्सल (-${itemQty} पैकेट)`,
          referenceId: purchase.id,
        };
        batch.set(movRef, movLog);
      }

      // Recalculate total product stock
      const totalPacksFromVariants = variants.length > 0
        ? variants.reduce((sum, v) => sum + (v.currentStockPacks || 0), 0)
        : Math.max(0, currentStock - totalDeductedPacks);

      const prodUpdates: any = {
        currentStock: totalPacksFromVariants,
        updatedAt: now,
      };
      if (variants.length > 0) prodUpdates.packagingVariants = variants;
      if (prod.batches) prodUpdates.batches = batches;

      batch.update(prodRef, prodUpdates);
    }
  }

  // 2. Supplier Balance & Ledger Reversal
  if (purchase.supplierId) {
    const suppRef = doc(db, 'accounting_suppliers', purchase.supplierId);
    const suppSnap = await getDoc(suppRef);
    if (suppSnap.exists()) {
      const supp = suppSnap.data() as AccountingSupplier;

      const supplierBilledTotal = purchase.transportPayableTo === 'transporter'
        ? Math.max(0, purchase.grandTotal - (purchase.transportCharges || 0))
        : purchase.grandTotal;

      const newOutstanding = Math.max(0, (supp.currentOutstanding || 0) - (purchase.unpaidSupplierUdhari || 0));
      const newTotalPurchased = Math.max(0, (supp.totalPurchased || 0) - supplierBilledTotal);
      const newTotalPaid = Math.max(0, (supp.totalPaid || 0) - (purchase.paidAmount || 0));

      batch.update(suppRef, {
        currentOutstanding: newOutstanding,
        totalPurchased: newTotalPurchased,
        totalPaid: newTotalPaid,
        updatedAt: now,
      });

      // Write reversal record in Supplier Ledger
      const sLedgerRef = doc(collection(db, 'accounting_supplier_ledger'));
      const sEntry: SupplierLedgerEntry = {
        id: sLedgerRef.id,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        type: 'payment_debit',
        invoiceNo: purchase.invoiceNumber,
        purchaseId: purchase.id,
        amount: purchase.unpaidSupplierUdhari || supplierBilledTotal,
        balanceAfter: newOutstanding,
        date: new Date().toISOString().split('T')[0],
        timestamp: now,
        note: `खरीद इनवॉइस #${purchase.invoiceNumber} रद्द/हटाया गया (लेजर व बकाया रिवर्सल)`,
      };
      batch.set(sLedgerRef, sEntry);
    }
  }

  // 3. Cash Outflow / Expense Reversal
  if (purchase.paidAmount > 0) {
    try {
      const expQ = query(
        collection(db, 'accounting_expenses'),
        where('categoryId', '==', 'supplier_payment')
      );
      const expSnap = await getDocs(expQ);
      for (const eDoc of expSnap.docs) {
        const eData = eDoc.data() as AccountingExpense;
        if (eData.description && eData.description.includes(purchase.invoiceNumber)) {
          batch.delete(eDoc.ref);
        }
      }
    } catch (eErr) {
      console.warn('Could not clean up expense for purchase:', eErr);
    }
  }

  // 4. Record Comprehensive Audit Log
  const auditRef = doc(collection(db, 'accounting_audit_logs'));
  const auditLog: AccountingAuditLog = {
    id: auditRef.id,
    action: hardDelete ? 'purchase_invoice_deleted' : 'purchase_invoice_cancelled',
    targetId: purchase.id,
    targetNumber: purchase.invoiceNumber,
    targetName: purchase.supplierName,
    targetType: 'purchase',
    adminEmail,
    adminName: adminName || adminEmail,
    adminUid: adminUid || '',
    timestamp: now,
    date: new Date().toISOString().split('T')[0],
    reason: reason || (hardDelete ? 'Admin द्वारा खरीद इनवॉइस स्थायी रूप से हटाया गया' : 'Admin द्वारा खरीद इनवॉइस रद्द (Cancelled) किया गया'),
    previousAmount: purchase.grandTotal,
    previousStockImpact: (purchase.items || []).map(it => ({
      productId: it.productId,
      productName: it.hindiName || it.name,
      variantLabel: it.variantLabel || `${it.packagingSize || ''} ${it.packagingUnit || ''}`,
      quantity: it.quantity,
    })),
    financialImpact: {
      totalAmount: purchase.grandTotal,
      paidAmount: purchase.paidAmount,
      outstandingAmount: purchase.unpaidSupplierUdhari,
      reversedExpenseAmount: purchase.paidAmount || 0,
    },
    details: `इनवॉइस #${purchase.invoiceNumber} (${purchase.supplierName}), तारीख: ${purchase.invoiceDate}, कुल: ₹${purchase.grandTotal}, दिया गया: ₹${purchase.paidAmount}, बकाया: ₹${purchase.unpaidSupplierUdhari}`,
  };
  batch.set(auditRef, auditLog);

  // 5. Purchase Doc Update or Delete
  if (hardDelete) {
    batch.delete(purchRef);
  } else {
    batch.update(purchRef, {
      status: 'cancelled',
      isCancelled: true,
      paymentStatus: 'cancelled',
      unpaidSupplierUdhari: 0,
      cancelledAt: now,
      cancelledBy: adminEmail,
      cancelReason: reason || '',
      updatedAt: now,
    });
  }

  await batch.commit();
}

export async function fetchAccountingAuditLogs(targetType?: 'customer' | 'purchase', limitCount = 50): Promise<AccountingAuditLog[]> {
  try {
    let q = query(
      collection(db, 'accounting_audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    if (targetType) {
      q = query(
        collection(db, 'accounting_audit_logs'),
        where('targetType', '==', targetType),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AccountingAuditLog));
  } catch (err) {
    console.error('Error fetching accounting audit logs:', err);
    return [];
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
// AI SMART SCAN & BUSINESS INSIGHTS
// ----------------------------------------------------

export async function scanBillWithAI(
  imageBase64: string,
  existingContext: {
    products?: Array<{ id: string; name: string; hindiName: string; unit: string; costPrice: number; defaultSellingPrice: number }>;
    suppliers?: Array<{ id: string; name: string; phone?: string; companyName?: string }>;
    customers?: Array<{ id: string; name: string; phone?: string; village?: string }>;
  }
): Promise<AIScanResult> {
  const res = await fetch('/api/accounting/scan-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      mimeType: 'image/jpeg',
      existingContext,
    }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'AI स्कैनिंग विफल रही।');
  }

  return json.data as AIScanResult;
}

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
    const [sales, expenses, products, customers, suppliers, ledgerPayments] = await Promise.all([
      fetchAccountingSales(500),
      fetchAccountingExpenses(),
      fetchAccountingProducts(),
      fetchAccountingCustomers(),
      fetchAccountingSuppliers(),
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
    const totalSupplierOutstanding = suppliers.reduce((acc, s) => acc + (s.currentOutstanding || 0), 0);

    const totalInventoryValuation = products.reduce((acc, p) => acc + ((p.currentStock || 0) * (p.costPrice || 0)), 0);
    const lowStockCount = products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 5)).length;

    return {
      startDate,
      endDate,
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

