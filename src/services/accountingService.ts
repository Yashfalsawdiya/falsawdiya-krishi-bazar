import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, onSnapshot, writeBatch, Timestamp 
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
  StockMovementLog
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

export async function fetchAccountingCustomers(): Promise<AccountingCustomer[]> {
  try {
    const q = query(collection(db, 'accounting_customers'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingCustomer));
  } catch (err) {
    console.error('Error fetching accounting customers:', err);
    return [];
  }
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

export async function createOfflineSale(saleData: Omit<AccountingSale, 'id' | 'createdAt'>): Promise<string> {
  const now = Date.now();
  const batch = writeBatch(db);

  const saleRef = doc(collection(db, 'accounting_sales'));
  const fullSale: AccountingSale = {
    ...saleData,
    id: saleRef.id,
    createdAt: now,
  };

  // 1. Write Sale Doc
  batch.set(saleRef, fullSale);

  // 2. Automatically Deduct Inventory Stock for each sold item (Pack or Loose)
  for (const item of saleData.items) {
    if (item.productId) {
      const prodRef = doc(db, 'accounting_products', item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prodData = prodSnap.data() as AccountingProduct;

        if (item.saleType === 'loose') {
          // Deduct from Loose Stock Pool
          const currentLoose = prodData.looseStock?.availableBaseQty || 0;
          const deductBase = item.looseBaseQty || item.looseQuantity || 0;
          const newLoose = Math.max(0, currentLoose - deductBase);
          
          batch.update(prodRef, {
            'looseStock.availableBaseQty': newLoose,
            'looseStock.updatedAt': now,
            updatedAt: now,
          });

          // Stock movement audit
          const movRef = doc(collection(db, 'accounting_stock_movements'));
          batch.set(movRef, {
            id: movRef.id,
            timestamp: now,
            date: saleData.date,
            productId: item.productId,
            productName: item.hindiName || item.name,
            type: 'loose_sale',
            quantityChangeBaseUnit: -deductBase,
            balanceBaseUnitAfter: newLoose,
            reason: `बिल #${saleData.invoiceNo} पर खुली बिक्री (${deductBase} ${item.looseUnit || 'ml/g'})`,
            referenceId: saleRef.id,
          });
        } else if (item.variantId && prodData.packagingVariants && prodData.packagingVariants.length > 0) {
          // Deduct from specific variant
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
          
          batch.update(prodRef, {
            packagingVariants: updatedVariants,
            currentStock: totalSealedPacks,
            updatedAt: now,
          });

          // Stock movement audit
          const movRef = doc(collection(db, 'accounting_stock_movements'));
          batch.set(movRef, {
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
            reason: `बिल #${saleData.invoiceNo} पर सीलबंद बिक्री (${item.quantity} ${item.variantLabel || item.unit})`,
            referenceId: saleRef.id,
          });
        } else {
          // Fallback legacy deduction
          const currentStock = prodData.currentStock || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          batch.update(prodRef, {
            currentStock: newStock,
            updatedAt: now,
          });
        }
      }
    }
  }

  // 3. If there is Udhari on this sale and customerId is present, update Customer Ledger
  if (saleData.udhariAmount > 0 && saleData.customerId) {
    const custRef = doc(db, 'accounting_customers', saleData.customerId);
    const custSnap = await getDoc(custRef);
    if (custSnap.exists()) {
      const custData = custSnap.data() as AccountingCustomer;
      const currentOutstanding = custData.currentOutstanding || 0;
      const newOutstanding = currentOutstanding + saleData.udhariAmount;
      const totalPurchases = (custData.totalPurchases || 0) + saleData.finalTotal;
      const totalPaid = (custData.totalPaid || 0) + (saleData.cashPaid + saleData.onlinePaid);

      batch.update(custRef, {
        currentOutstanding: newOutstanding,
        totalPurchases,
        totalPaid,
        lastPurchaseDate: saleData.date,
        status: newOutstanding > custData.creditLimit ? 'warning' : 'good',
        updatedAt: now,
      });

      // Write Ledger debit
      const ledgerRef = doc(collection(db, 'accounting_customer_ledger'));
      const ledgerEntry: CustomerLedgerEntry = {
        id: ledgerRef.id,
        customerId: saleData.customerId,
        customerName: saleData.customerName,
        type: 'sale_debit',
        invoiceNo: saleData.invoiceNo,
        saleId: saleRef.id,
        amount: saleData.udhariAmount,
        balanceAfter: newOutstanding,
        paymentMode: saleData.paymentMode === 'split' ? 'cash' : (saleData.paymentMode === 'online' ? 'online' : 'cash'),
        date: saleData.date,
        timestamp: now,
        note: `बिल #${saleData.invoiceNo} पर उधारी (Total: ₹${saleData.finalTotal}, Paid: ₹${saleData.cashPaid + saleData.onlinePaid})`,
      };
      batch.set(ledgerRef, ledgerEntry);
    }
  }

  await batch.commit();
  return saleRef.id;
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

  const fullPurchase: AccountingPurchase = {
    ...purchaseData,
    id: purchaseRef.id,
    paymentStatus: initialStatus,
    clearedDate: isFullyPaid ? purchaseData.invoiceDate : undefined,
    payments: initialPayments,
    createdAt: now,
  };

  batch.set(purchaseRef, fullPurchase);

  // 1. Automatically update stock, variants, batches and Weighted Average Cost for each item
  for (const item of purchaseData.items) {
    if (item.productId) {
      const prodRef = doc(db, 'accounting_products', item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prodData = prodSnap.data() as AccountingProduct;
        const currentStock = prodData.currentStock || 0;
        const currentCost = prodData.costPrice || 0;
        
        // Calculate new Weighted Average Cost
        const totalNewQty = currentStock + item.quantity;
        let weightedCost = item.purchasePrice;
        if (totalNewQty > 0) {
          weightedCost = ((currentStock * currentCost) + (item.quantity * item.purchasePrice)) / totalNewQty;
        }

        const updates: any = {
          currentStock: totalNewQty,
          costPrice: Math.round(weightedCost * 100) / 100,
          updatedAt: now,
        };

        // If packaging variant is specified or created on the fly
        const variants = prodData.packagingVariants ? [...prodData.packagingVariants] : [];
        if (item.variantId || item.packagingSize) {
          let targetVar = variants.find(v => v.id === item.variantId);
          if (!targetVar && item.packagingSize) {
            const sizeVal = Number(item.packagingSize);
            const sizeUnit = item.packagingUnit || 'ml';
            const packType = item.packagingType || 'Bottle';
            const baseQty = sizeUnit === 'Ltr' || sizeUnit === 'kg' ? sizeVal * 1000 : sizeVal;
            const newVar: PackagingVariant = {
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
              allowLooseSale: true,
            };
            variants.push(newVar);
            targetVar = newVar;
          } else if (targetVar) {
            targetVar.currentStockPacks = (targetVar.currentStockPacks || 0) + item.quantity;
            targetVar.costPrice = item.purchasePrice;
            if (item.sellingPriceSuggestion) {
              targetVar.sellingPrice = item.sellingPriceSuggestion;
            }
          }
          updates.packagingVariants = variants;
        }

        // Add Stock Batch Lot record
        if (item.batchNumber || item.expiryDate || item.manufacturingDate) {
          const batches = prodData.batches ? [...prodData.batches] : [];
          const newBatch: StockBatch = {
            id: `batch_${now}_${Math.random().toString(36).slice(2, 6)}`,
            productId: item.productId,
            variantId: item.variantId || 'default',
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
          };
          batches.push(newBatch);
          updates.batches = batches;
          updates.batchNo = item.batchNumber || prodData.batchNo;
          updates.expiryDate = item.expiryDate || prodData.expiryDate;
          if (item.manufacturingDate) updates.manufacturingDate = item.manufacturingDate;
        }

        batch.update(prodRef, updates);

        // Stock movement audit
        const movRef = doc(collection(db, 'accounting_stock_movements'));
        batch.set(movRef, {
          id: movRef.id,
          timestamp: now,
          date: purchaseData.invoiceDate,
          productId: item.productId,
          productName: item.hindiName || item.name,
          variantId: item.variantId,
          batchNumber: item.batchNumber,
          type: 'purchase',
          quantityChangePacks: item.quantity,
          balancePacksAfter: totalNewQty,
          reason: `थोक खरीद इनवॉइस #${purchaseData.invoiceNumber} से स्टॉक आगमन`,
          referenceId: purchaseRef.id,
        });
      }
    }
  }

  // 2. Update Supplier Outstanding, total purchased and total paid
  if (purchaseData.supplierId) {
    const suppRef = doc(db, 'accounting_suppliers', purchaseData.supplierId);
    const suppSnap = await getDoc(suppRef);
    if (suppSnap.exists()) {
      const suppData = suppSnap.data() as AccountingSupplier;
      const currentOutstanding = suppData.currentOutstanding || 0;
      const newOutstanding = currentOutstanding + purchaseData.unpaidSupplierUdhari;
      const totalPurchased = (suppData.totalPurchased || 0) + purchaseData.grandTotal;
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
        amount: purchaseData.grandTotal,
        balanceAfter: newOutstanding,
        paymentMode: purchaseData.paymentMode === 'split' ? 'cash' : (purchaseData.paymentMode === 'online' ? 'online' : 'cash'),
        date: purchaseData.invoiceDate,
        timestamp: now,
        note: `खरीद इनवॉइस #${purchaseData.invoiceNumber} (Total: ₹${purchaseData.grandTotal}, Paid: ₹${purchaseData.paidAmount}, Due: ₹${purchaseData.unpaidSupplierUdhari})`,
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

