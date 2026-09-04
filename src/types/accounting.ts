export interface AccountingProduct {
  id: string;
  customId?: string;
  name: string; // e.g. "Chlorpyrifos 20% EC"
  hindiName: string; // e.g. "क्लोरो 20% ईसी (कीटनाशक)"
  category: string; // "pesticides" | "fertilizers" | "seeds" | "fungicides" | "herbicides" | "medicines" | "implements" | "other"
  unit: string; // "Kg" | "Ltr" | "Gram" | "Ml" | "Packet" | "Bottle" | "Bag" | "Piece"
  currentStock: number;
  minStockAlert: number;
  costPrice: number; // Average Purchase Cost Price per unit
  defaultSellingPrice: number; // Base selling price per unit
  hsnCode?: string;
  batchNo?: string;
  expiryDate?: string;
  updatedAt: number;
  createdAt: number;
}

export interface AccountingSaleItem {
  productId: string;
  name: string;
  hindiName: string;
  unit: string;
  quantity: number;
  costPrice: number; // Unit Cost Price
  originalSellingPrice: number; // Unit Price before discount/bargain
  effectiveSellingPrice: number; // Unit Price after allocated bargaining discount
  totalCost: number; // quantity * costPrice
  totalOriginalAmount: number; // quantity * originalSellingPrice
  totalEffectiveAmount: number; // quantity * effectiveSellingPrice
  bargainingDiscountShare: number; // Total discount allocated to this item line
  lineGrossProfit: number; // totalEffectiveAmount - totalCost
  lineMarginPercent: number; // ((effectiveSellingPrice - costPrice) / effectiveSellingPrice) * 100
  isBelowCost: boolean; // True if effectiveSellingPrice < costPrice
}

export interface AccountingSale {
  id: string;
  invoiceNo: string; // e.g. "OFF-2026-0001"
  date: string; // "YYYY-MM-DD"
  timestamp: number;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string;
  customerVillage?: string;
  items: AccountingSaleItem[];
  subtotal: number; // Sum of original items total
  bargainingDiscount: number; // Total bargaining discount given on the bill
  finalTotal: number; // subtotal - bargainingDiscount (Amount to collect)
  totalCOGS: number; // Sum of item total costs
  grossProfit: number; // finalTotal - totalCOGS
  grossMarginPercent: number; // (grossProfit / finalTotal) * 100
  paymentMode: 'cash' | 'online' | 'udhari' | 'split';
  cashPaid: number;
  onlinePaid: number;
  udhariAmount: number;
  dueDate?: string;
  note?: string;
  scannedReceiptUrl?: string | null;
  isAiScanned?: boolean;
  createdAt: number;
}

export interface AccountingCustomer {
  id: string;
  name: string;
  phone: string;
  village: string;
  totalPurchases: number;
  totalPaid: number;
  currentOutstanding: number; // Net Udhari
  creditLimit: number; // Max allowed udhari
  dailyUdhariLimit?: number;
  lastPurchaseDate?: string;
  lastPaymentDate?: string;
  status: 'good' | 'warning' | 'blocked';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  type: 'sale_debit' | 'payment_credit' | 'opening_balance';
  invoiceNo?: string;
  saleId?: string;
  amount: number;
  balanceAfter: number;
  paymentMode?: 'cash' | 'online' | 'bank';
  date: string; // YYYY-MM-DD
  timestamp: number;
  note?: string;
}

export interface AccountingSupplier {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  gstin?: string;
  city?: string;
  totalPurchased: number;
  totalPaid: number;
  currentOutstanding: number; // What we owe to supplier
  isArchived?: boolean;
  status?: 'active' | 'archived';
  lastPaymentDate?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PurchasePaymentRecord {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMode: 'cash' | 'online' | 'bank';
  note?: string;
  timestamp: number;
  expenseId?: string;
}

export interface AccountingPurchaseItem {
  productId?: string;
  name: string;
  hindiName?: string;
  unit: string;
  quantity: number;
  purchasePrice: number; // Unit Cost Price
  sellingPriceSuggestion?: number;
  total: number;
}

export interface AccountingPurchase {
  id: string;
  invoiceNumber: string;
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  invoiceDate: string; // YYYY-MM-DD
  timestamp: number;
  items: AccountingPurchaseItem[];
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal: number;
  paidAmount: number;
  unpaidSupplierUdhari: number;
  paymentMode: 'cash' | 'online' | 'bank' | 'udhari' | 'split';
  paymentStatus?: 'unpaid' | 'partially_paid' | 'paid';
  clearedDate?: string;
  payments?: PurchasePaymentRecord[];
  invoiceImageUrl?: string | null;
  isAiScanned?: boolean;
  notes?: string;
  createdAt: number;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  supplierName: string;
  type: 'purchase_credit' | 'payment_debit';
  invoiceNo?: string;
  purchaseId?: string;
  amount: number;
  balanceAfter: number;
  paymentMode?: 'cash' | 'online' | 'bank';
  date: string;
  timestamp: number;
  note?: string;
}

export interface AccountingExpenseCategory {
  id: string;
  name: string;
  hindiName: string;
  icon?: string;
  isSystem: boolean;
}

export interface AccountingExpense {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  categoryId: string;
  categoryName: string;
  categoryNameHindi: string;
  amount: number;
  paymentMode: 'cash' | 'online';
  recipientName?: string;
  description: string;
  receiptImageUrl?: string | null;
  isAiScanned?: boolean;
  createdAt: number;
}

export interface AccountingCashRegister {
  id: string; // "YYYY-MM-DD"
  date: string;
  openingCash: number;
  cashSales: number;
  udhariCashCollected: number;
  otherCashIn: number;
  cashPurchases: number;
  supplierCashPaid: number;
  cashExpenses: number;
  otherCashOut: number;
  calculatedClosingCash: number;
  actualClosingCash?: number;
  cashDifference?: number;
  isClosed: boolean;
  closedAt?: number;
  notes?: string;
  updatedAt: number;
}

export interface DailyAccountingSummary {
  id: string; // "YYYY-MM-DD"
  dateKey: string;
  totalSales: number;
  cashSales: number;
  onlineSales: number;
  udhariSales: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  actualNetProfit: number;
  totalPurchases: number;
  udhariRecovered: number;
  bargainingGivenTotal: number;
  salesCount: number;
  updatedAt: number;
}

export interface AIScanExtractedItem {
  name: string;
  hindiName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  matchedProductId?: string;
  confidence: number;
}

export interface AIScanResult {
  documentType: 'wholesaler_invoice' | 'customer_bill' | 'expense_receipt' | 'handwritten_slip' | 'unknown';
  documentTypeHindi: string;
  partyName?: string; // Supplier, Customer, or Vendor
  partyPhone?: string;
  partyGstin?: string;
  invoiceNumber?: string;
  date?: string; // YYYY-MM-DD
  items: AIScanExtractedItem[];
  subtotal: number;
  discount: number;
  taxAmount?: number;
  grandTotal: number;
  suggestedExpenseCategory?: string;
  suggestedExpenseCategoryHindi?: string;
  rawNotes?: string;
  confidenceScore: number;
  isHandwritten: boolean;
}

export interface AccountingSummaryReport {
  startDate: string;
  endDate: string;
  totalSalesAmount: number;
  totalSalesCount: number;
  totalCOGS: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  cashReceived: number;
  onlineReceived: number;
  newUdhariGiven: number;
  customerPaymentCollected: number;
  customerCashPaymentCollected?: number;
  customerOnlinePaymentCollected?: number;
  cashExpenses: number;
  onlineExpenses: number;
  totalCustomerOutstanding: number;
  totalSupplierOutstanding: number;
  totalInventoryValuation: number;
  lowStockCount: number;
}

export interface AIBusinessInsight {
  hindiSummary: string;
  businessHealthScore: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  bargainingImpactAdvice: string;
  cashFlowAnalysis: string;
  keyActionItems: string[];
}

