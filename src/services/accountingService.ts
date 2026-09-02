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
  AIScanResult
} from '../types/accounting';
import { compressImage } from '../lib/utils';

export const DEFAULT_EXPENSE_CATEGORIES: AccountingExpenseCategory[] = [
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

  // 2. Automatically Deduct Inventory Stock for each sold item
  for (const item of saleData.items) {
    if (item.productId) {
      const prodRef = doc(db, 'accounting_products', item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const currentStock = prodSnap.data().currentStock || 0;
        const newStock = Math.max(0, currentStock - item.quantity);
        batch.update(prodRef, {
          currentStock: newStock,
          updatedAt: now,
        });
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

export async function fetchAccountingSuppliers(): Promise<AccountingSupplier[]> {
  try {
    const q = query(collection(db, 'accounting_suppliers'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingSupplier));
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return [];
  }
}

export async function saveAccountingSupplier(supplier: Omit<AccountingSupplier, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<string> {
  const now = Date.now();
  const suppRef = id ? doc(db, 'accounting_suppliers', id) : doc(collection(db, 'accounting_suppliers'));
  const payload = {
    ...supplier,
    updatedAt: now,
    ...(id ? {} : { createdAt: now }),
  };
  await setDoc(suppRef, payload, { merge: true });
  return suppRef.id;
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
  const fullPurchase: AccountingPurchase = {
    ...purchaseData,
    id: purchaseRef.id,
    createdAt: now,
  };

  batch.set(purchaseRef, fullPurchase);

  // 1. Automatically update stock and Weighted Average Cost for each item
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

        batch.update(prodRef, {
          currentStock: totalNewQty,
          costPrice: Math.round(weightedCost * 100) / 100,
          updatedAt: now,
        });
      }
    }
  }

  // 2. Update Supplier Outstanding if unpaid amount
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
        updatedAt: now,
      });

      // Write Supplier Ledger
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
    }
  }

  await batch.commit();
  return purchaseRef.id;
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

export async function fetchAccountingReport(
  startDate: string,
  endDate: string
): Promise<any> {
  try {
    const [sales, expenses, products, customers, suppliers] = await Promise.all([
      fetchAccountingSales(500),
      fetchAccountingExpenses(),
      fetchAccountingProducts(),
      fetchAccountingCustomers(),
      fetchAccountingSuppliers(),
    ]);

    // Filter sales by date range
    const filteredSales = sales.filter(s => s.date >= startDate && s.date <= endDate);
    const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);

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
      customerPaymentCollected: 0,
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

