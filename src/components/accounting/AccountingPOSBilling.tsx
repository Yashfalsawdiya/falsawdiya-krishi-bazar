import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShoppingBag, Plus, Trash2, Search, UserCheck, AlertCircle, 
  CheckCircle2, Printer, Percent, ArrowRight, RefreshCw, 
  Phone, MapPin, IndianRupee, CreditCard, Wallet, UserPlus, X, FileText,
  ChevronDown, User, Smartphone, BookOpen, Scale, Banknote, Download,
  Droplet, Layers, Check, Sparkles
} from 'lucide-react';
import { 
  AccountingProduct, 
  AccountingCustomer, 
  AccountingSale,
  PackagingVariant 
} from '../../types/accounting';
import { 
  fetchAccountingProducts, 
  fetchAccountingCustomers, 
  createOfflineSale, 
  saveAccountingCustomer, 
  calculateBargainingAllocation 
} from '../../services/accountingService';
import { 
  getProductVariants, 
  normalizeToBaseUnit, 
  formatBaseUnitDisplay 
} from '../../utils/agriPackagingUtils';
import { PrintableSalesInvoice } from './PrintableSalesInvoice';
import { downloadSalesInvoicePDF } from '../../utils/salesInvoicePdfGenerator';

interface Props {
  onSaleCreated?: (saleId: string) => void;
  onSaleComplete?: () => void;
  onOpenCustomerKhata?: (customerId: string) => void;
}

export const AccountingPOSBilling: React.FC<Props> = ({ onSaleCreated, onSaleComplete, onOpenCustomerKhata }) => {
  const [products, setProducts] = useState<AccountingProduct[]>([]);
  const [customers, setCustomers] = useState<AccountingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cart / Bill State
  interface CartItem {
    cartItemId: string; // unique item id
    productId: string;
    name: string;
    hindiName: string;
    unit: string;
    quantity: number;
    costPrice: number;
    originalSellingPrice: number;
    currentStock: number;
    variantId?: string;
    variantLabel?: string;
    batchNumber?: string;
    expiryDate?: string;
    saleType?: 'pack' | 'loose';
    looseQuantity?: number;
    looseUnit?: string;
    looseBaseQty?: number;
    openedPackDeducted?: boolean;
  }

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  
  // Loose & Spray Dose Modal State
  const [looseModalProduct, setLooseModalProduct] = useState<AccountingProduct | null>(null);
  const [looseMode, setLooseMode] = useState<'direct' | 'pump'>('direct');
  const [looseDirectQty, setLooseDirectQty] = useState<string>('100');
  const [looseDirectUnit, setLooseDirectUnit] = useState<string>('ml');
  const [loosePumpCount, setLoosePumpCount] = useState<string>('3');
  const [looseDosePerPump, setLooseDosePerPump] = useState<string>('35');
  const [looseCustomPrice, setLooseCustomPrice] = useState<string>('');
  
  // Quick Add Customer modal
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustVillage, setNewCustVillage] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState(10000);

  // Product Search / Selector
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Bargaining / Negotiation Input
  const [customFinalTotalInput, setCustomFinalTotalInput] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'udhari' | 'split'>('cash');
  const [cashPaidInput, setCashPaidInput] = useState<string>('');
  const [onlinePaidInput, setOnlinePaidInput] = useState<string>('');
  const [billNote, setBillNote] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Success / Print Modal
  const [completedSale, setCompletedSale] = useState<AccountingSale | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, custs] = await Promise.all([
        fetchAccountingProducts(),
        fetchAccountingCustomers(),
      ]);
      setProducts(prods);
      setCustomers(custs);
    } catch (err) {
      console.error('Error loading POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Products for Quick Add
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = productSearchQuery.toLowerCase().trim();
      if (!q) return matchesCat;
      return matchesCat && (
        p.hindiName.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.customId && p.customId.toLowerCase().includes(q))
      );
    });
  }, [products, selectedCategory, productSearchQuery]);

  // Selected Customer Object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filtered Customers for Search
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return customers.slice(0, 10);
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q) || 
      (c.village && c.village.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [customers, customerSearchQuery]);

  // Add Item to Cart (Pack / Packaging Variant)
  const addItemToCart = (p: AccountingProduct, variant?: PackagingVariant) => {
    const variants = getProductVariants(p);
    const chosenVariant = variant || (variants.length === 1 ? variants[0] : null);

    const variantId = chosenVariant ? chosenVariant.id : undefined;
    const cartItemId = `${p.id}_${variantId || 'base'}_pack`;

    setCartItems(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === cartItemId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      const variantLabel = chosenVariant 
        ? (chosenVariant.label || `${chosenVariant.sizeValue} ${chosenVariant.sizeUnit} (${chosenVariant.packagingType})`)
        : undefined;

      const costPrice = chosenVariant ? (chosenVariant.costPrice || p.costPrice || 0) : (p.costPrice || 0);
      const originalSellingPrice = chosenVariant ? (chosenVariant.sellingPrice || p.defaultSellingPrice || p.costPrice || 0) : (p.defaultSellingPrice || p.costPrice || 0);
      const currentStock = chosenVariant ? (chosenVariant.currentStockPacks ?? p.currentStock ?? 0) : (p.currentStock || 0);
      const unit = chosenVariant ? (chosenVariant.sizeUnit || p.unit) : p.unit;

      const firstBatch = p.batches && p.batches.length > 0 ? p.batches[0] : undefined;

      return [
        ...prev,
        {
          cartItemId,
          productId: p.id,
          name: p.name,
          hindiName: p.hindiName,
          unit,
          quantity: 1,
          costPrice,
          originalSellingPrice,
          currentStock,
          variantId,
          variantLabel,
          batchNumber: firstBatch?.batchNumber,
          expiryDate: firstBatch?.expiryDate,
          saleType: 'pack',
        },
      ];
    });
  };

  // Open Loose / Spray Dose Modal
  const openLooseDoseModal = (p: AccountingProduct) => {
    setLooseModalProduct(p);
    setLooseMode('direct');

    const isLiquid = p.unit === 'Ltr' || p.unit === 'Ml' || p.productType === 'liquid';
    const baseUnit = isLiquid ? 'ml' : 'g';
    setLooseDirectUnit(baseUnit);

    const doseVal = p.standardDoseInfo?.verifiedDosePer20LTank || (isLiquid ? 35 : 50);
    setLooseDosePerPump(String(doseVal));
    setLoosePumpCount('3');
    setLooseDirectQty('100');

    // Default rate per base unit
    let ratePerBase = p.looseStock?.sellingPricePerBaseUnit || 0;
    if (!ratePerBase) {
      const defaultSelling = p.defaultSellingPrice || 0;
      const baseQty = normalizeToBaseUnit(1, p.unit || (isLiquid ? 'Ltr' : 'kg'));
      ratePerBase = baseQty > 0 ? Number((defaultSelling / baseQty).toFixed(2)) : 0.5;
    }
    setLooseCustomPrice(String(ratePerBase));
  };

  // Confirm and Add Loose Item to Cart
  const handleConfirmLooseSale = () => {
    if (!looseModalProduct) return;
    const p = looseModalProduct;
    const isLiquid = p.unit === 'Ltr' || p.unit === 'Ml' || p.productType === 'liquid';
    const baseUnit = isLiquid ? 'ml' : 'g';

    let requestedQty = 0;
    let label = '';

    if (looseMode === 'pump') {
      const pumps = Number(loosePumpCount) || 1;
      const dose = Number(looseDosePerPump) || 35;
      requestedQty = pumps * dose;
      label = `डोज: ${pumps} पंप (${requestedQty} ${baseUnit})`;
    } else {
      requestedQty = Number(looseDirectQty) || 0;
      label = `खुला / डोज (${requestedQty} ${baseUnit})`;
    }

    if (requestedQty <= 0) {
      alert('कृपया मान्य मात्रा दर्ज करें।');
      return;
    }

    const ratePerUnit = Number(looseCustomPrice) || (p.looseStock?.sellingPricePerBaseUnit || 0.5);
    const lineTotal = Math.round(requestedQty * ratePerUnit);

    // Calculate cost per base unit
    let costPerUnit = p.looseStock?.costPerBaseUnit || 0;
    if (!costPerUnit) {
      const baseQty = normalizeToBaseUnit(1, p.unit || (isLiquid ? 'Ltr' : 'kg'));
      costPerUnit = baseQty > 0 ? ((p.costPrice || 0) / baseQty) : 0;
    }
    const lineCost = Math.round(requestedQty * costPerUnit);

    const cartItemId = `${p.id}_loose_${Date.now()}`;

    setCartItems(prev => [
      ...prev,
      {
        cartItemId,
        productId: p.id,
        name: p.name,
        hindiName: p.hindiName,
        unit: baseUnit,
        quantity: 1, // 1 loose line item
        originalSellingPrice: lineTotal,
        costPrice: lineCost,
        currentStock: p.looseStock?.availableBaseQty || 0,
        saleType: 'loose',
        variantLabel: label,
        looseQuantity: requestedQty,
        looseUnit: baseUnit,
        looseBaseQty: requestedQty,
        openedPackDeducted: false,
      },
    ]);

    setLooseModalProduct(null);
  };

  const updateItemQty = (cartItemId: string, qty: number) => {
    if (qty <= 0) {
      removeItemFromCart(cartItemId);
      return;
    }
    setCartItems(prev => prev.map(it => it.cartItemId === cartItemId ? { ...it, quantity: qty } : it));
  };

  const updateItemPrice = (cartItemId: string, price: number) => {
    setCartItems(prev => prev.map(it => it.cartItemId === cartItemId ? { ...it, originalSellingPrice: Math.max(0, price) } : it));
  };

  const removeItemFromCart = (cartItemId: string) => {
    setCartItems(prev => prev.filter(it => it.cartItemId !== cartItemId));
  };

  // Base Calculation without bargaining
  const subtotalBeforeBargain = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + (it.quantity * it.originalSellingPrice), 0);
  }, [cartItems]);

  // Keep customFinalTotalInput synced if user hasn't typed custom discount
  useEffect(() => {
    if (customFinalTotalInput === '' || Number(customFinalTotalInput) === 0) {
      setCustomFinalTotalInput(subtotalBeforeBargain > 0 ? String(subtotalBeforeBargain) : '');
    }
  }, [subtotalBeforeBargain]);

  const negotiatedTotalNumber = useMemo(() => {
    const val = Number(customFinalTotalInput);
    return isNaN(val) ? subtotalBeforeBargain : val;
  }, [customFinalTotalInput, subtotalBeforeBargain]);

  // Proportional Allocation Calculations
  const allocation = useMemo(() => {
    return calculateBargainingAllocation(cartItems, negotiatedTotalNumber);
  }, [cartItems, negotiatedTotalNumber]);

  // Auto calculate Split amounts
  const calculatedFinalTotal = allocation.finalTotal;

  useEffect(() => {
    if (paymentMode === 'cash') {
      setCashPaidInput(String(calculatedFinalTotal));
      setOnlinePaidInput('0');
    } else if (paymentMode === 'online') {
      setCashPaidInput('0');
      setOnlinePaidInput(String(calculatedFinalTotal));
    } else if (paymentMode === 'udhari') {
      setCashPaidInput('0');
      setOnlinePaidInput('0');
    }
  }, [paymentMode, calculatedFinalTotal]);

  const cashPaidVal = Number(cashPaidInput) || 0;
  const onlinePaidVal = Number(onlinePaidInput) || 0;
  const totalPaidNow = cashPaidVal + onlinePaidVal;
  const udhariRemaining = Math.max(0, calculatedFinalTotal - totalPaidNow);

  // Quick Add Customer Handler
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('कृपया ग्राहक का नाम दर्ज करें।');
      return;
    }
    try {
      const newId = await saveAccountingCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        village: newCustVillage.trim(),
        totalPurchases: 0,
        totalPaid: 0,
        currentOutstanding: 0,
        creditLimit: Number(newCustCreditLimit) || 10000,
        status: 'good',
      });
      const updatedCusts = await fetchAccountingCustomers();
      setCustomers(updatedCusts);
      setSelectedCustomerId(newId);
      setShowQuickCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustVillage('');
    } catch (err: any) {
      alert('ग्राहक जोड़ने में त्रुटि: ' + err.message);
    }
  };

  // Submit Sale Handler
  const handleCreateSale = async () => {
    if (cartItems.length === 0) {
      alert('कृपया बिल में कम से कम एक उत्पाद जोड़ें।');
      return;
    }

    if (udhariRemaining > 0 && !selectedCustomerId) {
      alert('उधारी बिल के लिए कृपया ग्राहक का चयन करें या नया ग्राहक जोड़ें।');
      return;
    }

    // Check Credit Limit
    if (selectedCustomer && udhariRemaining > 0) {
      const projectedOutstanding = selectedCustomer.currentOutstanding + udhariRemaining;
      if (projectedOutstanding > selectedCustomer.creditLimit) {
        const proceed = window.confirm(
          `चेतावनी: ग्राहक की उधारी सीमा (Credit Limit: ₹${selectedCustomer.creditLimit}) पार हो रही है!\n\nवर्तमान उधारी: ₹${selectedCustomer.currentOutstanding}\nनया बिल उधारी: ₹${udhariRemaining}\nकुल अनुमानित: ₹${projectedOutstanding}\n\nक्या आप फिर भी यह उधारी बिल काटना चाहते हैं?`
        );
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);
    try {
      const invoiceNo = `OFF-${Date.now().toString().slice(-6)}`;
      const salePayload: Omit<AccountingSale, 'id' | 'createdAt'> = {
        invoiceNo,
        date: invoiceDate,
        timestamp: Date.now(),
        customerId: selectedCustomerId || null,
        customerName: selectedCustomer ? selectedCustomer.name : 'नकद ग्राहक (Retail Cash Customer)',
        customerPhone: selectedCustomer?.phone || '',
        customerVillage: selectedCustomer?.village || '',
        items: allocation.allocatedItems,
        subtotal: allocation.subtotal,
        bargainingDiscount: allocation.bargainingDiscount,
        finalTotal: allocation.finalTotal,
        totalCOGS: allocation.totalCOGS,
        grossProfit: allocation.grossProfit,
        grossMarginPercent: allocation.grossMarginPercent,
        paymentMode,
        cashPaid: cashPaidVal,
        onlinePaid: onlinePaidVal,
        udhariAmount: udhariRemaining,
        note: billNote.trim(),
      };

      const saleId = await createOfflineSale(salePayload);
      
      const savedSale: AccountingSale = {
        ...salePayload,
        id: saleId,
        createdAt: Date.now(),
      };

      setCompletedSale(savedSale);

      // Reset Form
      setCartItems([]);
      setSelectedCustomerId('');
      setCustomerSearchQuery('');
      setCustomFinalTotalInput('');
      setBillNote('');
      
      // Refresh inventory & customers in background
      loadData();
      if (onSaleCreated) onSaleCreated(saleId);
      if (onSaleComplete) onSaleComplete();
    } catch (err: any) {
      alert('बिल सेव करने में त्रुटि: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!completedSale) return;
    setIsPrinting(true);
    document.body.classList.add('has-active-print');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('has-active-print');
        setIsPrinting(false);
      }, 600);
    }, 150);
  };

  const handleDownloadPdf = async () => {
    if (!completedSale) return;
    setIsDownloadingPdf(true);
    try {
      const res = await downloadSalesInvoicePDF(
        completedSale,
        selectedCustomer?.currentOutstanding || 0
      );
      if (!res.success && res.error) {
        alert('PDF जनरेट करने में त्रुटि: ' + res.error);
      }
    } catch (err: any) {
      alert('PDF डाउनलोड करने में त्रुटि: ' + err.message);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#2D5A27] text-white rounded-xl flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">ऑफलाइन बिक्री काउंटर (Offline POS Billing)</h2>
            <p className="text-xs text-gray-500">त्वरित मल्टी-आइटम बिलिंग, स्वचालित स्टॉक कटौती एवं मोलभाव मार्जिन गणना</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={invoiceDate}
            onChange={e => setInvoiceDate(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-emerald-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="डेटा रिफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Product Catalog & Quick Add (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                उत्पाद चुनें (Select Products)
              </h3>
              <span className="text-xs text-gray-400 font-medium">
                {filteredProducts.length} उत्पाद उपलब्ध
              </span>
            </div>

            {/* Product Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="दवाई, बीज, खाद का नाम खोजें..."
                value={productSearchQuery}
                onChange={e => setProductSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {[
                { id: 'all', label: 'सभी' },
                { id: 'fertilizers', label: 'खाद' },
                { id: 'pesticides', label: 'कीटनाशक' },
                { id: 'seeds', label: 'बीज' },
                { id: 'fungicides', label: 'फफूंदनाशी' },
                { id: 'herbicides', label: 'खरपतवार' },
                { id: 'medicines', label: 'टॉनिक' },
                { id: 'implements', label: 'उपकरण' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Products List Scrollable */}
            <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
                  कोई उत्पाद नहीं मिला। कृपया इन्वेंट्री टैब में जाकर उत्पाद जोड़ें।
                </div>
              ) : (
                filteredProducts.map(prod => {
                  const variants = getProductVariants(prod);
                  const hasMultipleVariants = variants.length > 1;
                  const isLiquidOrPowder = prod.unit === 'Ltr' || prod.unit === 'Ml' || prod.unit === 'Kg' || prod.unit === 'Gram' || prod.productType === 'liquid' || prod.productType === 'powder_granule' || prod.category === 'pesticides' || prod.category === 'fungicides' || prod.category === 'herbicides' || prod.category === 'medicines';
                  const allowLoose = prod.looseStock?.isAllowedForLooseSale ?? isLiquidOrPowder;

                  const prodCartCount = cartItems
                    .filter(it => it.productId === prod.id)
                    .reduce((sum, it) => sum + it.quantity, 0);

                  const isOutOfStock = (prod.currentStock || 0) <= 0;

                  return (
                    <div
                      key={prod.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        prodCartCount > 0
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                          : isOutOfStock
                          ? 'border-red-100 bg-red-50/20'
                          : 'border-gray-100 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                              {prod.hindiName || prod.name}
                            </h4>
                            {prodCartCount > 0 && (
                              <span className="bg-[#2D5A27] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                {prodCartCount} बिल में
                              </span>
                            )}
                          </div>
                          {prod.hindiName && prod.name && prod.hindiName !== prod.name && (
                            <p className="text-[10px] text-gray-400 truncate">{prod.name}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-extrabold text-emerald-800">
                              ₹{prod.defaultSellingPrice} /{prod.unit}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              (लागत: ₹{prod.costPrice})
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full block mb-1 ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700'
                                : prod.currentStock <= prod.minStockAlert
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            स्टॉक: {prod.currentStock} {prod.unit}
                          </span>

                          {!hasMultipleVariants && (
                            <button
                              type="button"
                              onClick={() => addItemToCart(prod, variants[0])}
                              className="text-xs bg-[#2D5A27] text-white px-2.5 py-1 rounded-xl hover:bg-[#23461e] active:scale-95 transition-all font-bold flex items-center gap-1 ml-auto"
                            >
                              <Plus className="w-3.5 h-3.5" /> जोड़ें
                            </button>
                          )}
                        </div>
                      </div>

                      {/* PACKAGING VARIANTS CHIPS */}
                      {hasMultipleVariants && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100">
                          <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-emerald-700" />
                            पैकिंग विकल्प (Variants):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {variants.map(v => {
                              const vInCart = cartItems.find(it => it.cartItemId === `${prod.id}_${v.id}_pack`);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => addItemToCart(prod, v)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                                    vInCart
                                      ? 'bg-[#2D5A27] text-white border-[#2D5A27]'
                                      : 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  <span>{v.label || `${v.sizeValue} ${v.sizeUnit}`}</span>
                                  <span className="font-extrabold">₹{v.sellingPrice || prod.defaultSellingPrice}</span>
                                  {vInCart && (
                                    <span className="bg-white/20 text-white px-1 rounded text-[9px]">
                                      ×{vInCart.quantity}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* LOOSE SALE / DOSE QUICK BUTTON */}
                      {allowLoose && (
                        <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => openLooseDoseModal(prod)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors flex items-center gap-1"
                          >
                            <Droplet className="w-3 h-3 text-blue-600" />
                            <span>खुला / डोज बिक्री (Loose & Spray Dose)</span>
                          </button>
                          {prod.looseStock && prod.looseStock.availableBaseQty > 0 && (
                            <span className="text-[10px] font-semibold text-blue-700">
                              खुला: {formatBaseUnitDisplay(prod.looseStock.availableBaseQty, prod.looseStock.baseUnit)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Cart, Bargaining & Billing (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
            {/* Customer Selector Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  ग्राहक (Customer)
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + नया ग्राहक जोड़ें
                </button>
              </div>

              {/* Customer Search & Select */}
              <div className="relative" ref={customerDropdownRef}>
                <div 
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer flex items-center justify-between text-xs sm:text-sm"
                >
                  {selectedCustomer ? (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-gray-900">{selectedCustomer.name}</span>
                      {selectedCustomer.phone && <span className="text-gray-500">({selectedCustomer.phone})</span>}
                      {selectedCustomer.village && <span className="text-gray-400">· {selectedCustomer.village}</span>}
                    </div>
                  ) : (
                    <span className="text-gray-400 font-medium">नकद ग्राहक (Retail Cash Customer) - क्लिक करके खाता चुनें</span>
                  )}
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    बदलें <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-2 max-h-60 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="नाम या मोबाइल नंबर से खोजें..."
                      value={customerSearchQuery}
                      onChange={e => setCustomerSearchQuery(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <div
                      onClick={() => {
                        setSelectedCustomerId('');
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="p-2 rounded-xl text-xs hover:bg-gray-50 cursor-pointer font-bold text-gray-600 border-b border-gray-100 flex items-center gap-1.5"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      <span>बिना खाते के नकद ग्राहक (Retail Walk-in)</span>
                    </div>

                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="p-2.5 rounded-xl text-xs hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-[11px] text-gray-500">{c.phone} {c.village ? `· ${c.village}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${c.currentOutstanding > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            उधारी: ₹{c.currentOutstanding}
                          </p>
                          <p className="text-[10px] text-gray-400">लिमिट: ₹{c.creditLimit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Customer Outstanding Card */}
              {selectedCustomer && (
                <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                  selectedCustomer.currentOutstanding > selectedCustomer.creditLimit
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : selectedCustomer.currentOutstanding > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div>
                    <span className="font-bold">पिछली उधारी: ₹{selectedCustomer.currentOutstanding}</span>
                    <span className="text-[11px] ml-2 text-gray-600">
                      (लिमिट: ₹{selectedCustomer.creditLimit})
                    </span>
                  </div>
                  {onOpenCustomerKhata && (
                    <button
                      type="button"
                      onClick={() => onOpenCustomerKhata(selectedCustomer.id)}
                      className="underline font-bold text-xs"
                    >
                      खाता देखें →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items Table */}
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center justify-between">
                <span>बिल की वस्तुएं ({cartItems.length} उत्पाद)</span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartItems([])}
                    className="text-xs text-red-500 hover:text-red-700 font-bold"
                  >
                    पूरी लिस्ट खाली करें
                  </button>
                )}
              </h3>

              {cartItems.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-gray-300" />
                  <span>बाईं तरफ से उत्पाद पर क्लिक करके बिल में जोड़ें</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => {
                    const allocItem = allocation.allocatedItems[idx];
                    const lineTotal = item.quantity * item.originalSellingPrice;
                    const isLoose = item.saleType === 'loose';

                    return (
                      <div
                        key={item.cartItemId}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-gray-900 text-xs sm:text-sm">
                                {item.hindiName || item.name}
                              </h4>
                              {item.variantLabel && !isLoose && (
                                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                  {item.variantLabel}
                                </span>
                              )}
                              {isLoose && (
                                <span className="text-[10px] text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                                  <Droplet className="w-3 h-3 text-blue-600" />
                                  {item.variantLabel || `खुला (${item.looseQuantity} ${item.looseUnit})`}
                                </span>
                              )}
                              {item.batchNumber && (
                                <span className="text-[9px] text-gray-500 font-mono bg-gray-200 px-1.5 py-0.5 rounded">
                                  B: {item.batchNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {isLoose ? `कुल मात्रा: ${item.looseQuantity} ${item.looseUnit}` : `लागत: ₹${item.costPrice} /${item.unit}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItemFromCart(item.cartItemId)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="बिल से हटाएं"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Controls: Quantity & Unit Price */}
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5 flex items-center gap-1">
                            <span className="text-[11px] text-gray-500 font-bold">मात्रा:</span>
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={item.quantity}
                              onChange={e => updateItemQty(item.cartItemId, Number(e.target.value))}
                              className="w-16 p-1.5 text-center font-bold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="text-[11px] text-gray-500">{isLoose ? 'लाइन' : item.unit}</span>
                          </div>

                          <div className="col-span-4 flex items-center gap-1">
                            <span className="text-[11px] text-gray-500 font-bold">दर: ₹</span>
                            <input
                              type="number"
                              min="0"
                              value={item.originalSellingPrice}
                              onChange={e => updateItemPrice(item.cartItemId, Number(e.target.value))}
                              className="w-20 p-1.5 text-center font-bold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div className="col-span-3 text-right font-extrabold text-gray-900 text-sm">
                            ₹{lineTotal}
                          </div>
                        </div>

                        {/* Proportional Bargaining Impact on this line */}
                        {allocItem && allocation.bargainingDiscount > 0 && (
                          <div className="pt-1.5 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                            <span className="text-gray-500">
                              मोलभाव शेयर: <span className="font-bold text-amber-700">-₹{allocItem.bargainingDiscountShare}</span> (प्रभावी दर: ₹{allocItem.effectiveSellingPrice})
                            </span>
                            <span className={`font-bold ${allocItem.isBelowCost ? 'text-red-600' : 'text-emerald-700'}`}>
                              लाभ: ₹{allocItem.lineGrossProfit} ({allocItem.lineMarginPercent}%)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BARGAINING / NEGOTIATION PROPORTIONAL CALCULATOR */}
            {cartItems.length > 0 && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    मोलभाव / अंतिम देय राशि (Bargaining & Final Amount)
                  </span>
                  <span className="text-xs text-gray-500">
                    कुल MRP योग: <strong className="text-gray-900">₹{subtotalBeforeBargain}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">
                      ग्राहक द्वारा दी जाने वाली राशि (Final Agreed Bill):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-800">₹</span>
                      <input
                        type="number"
                        value={customFinalTotalInput}
                        onChange={e => setCustomFinalTotalInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-base font-extrabold text-emerald-900 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 text-xs space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>दी गई छूट (Discount):</span>
                      <strong className="text-amber-700">₹{allocation.bargainingDiscount}</strong>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>माल की कुल लागत (COGS):</span>
                      <span>₹{allocation.totalCOGS}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-gray-100">
                      <span>सकल लाभ (Gross Profit):</span>
                      <span className={allocation.grossProfit < 0 ? 'text-red-600' : 'text-emerald-700'}>
                        ₹{allocation.grossProfit} ({allocation.grossMarginPercent}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Mode Selection */}
            {cartItems.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-gray-700 block">
                  भुगतान का माध्यम (Payment Mode)
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                  {[
                    { id: 'cash', label: 'नकद (Cash)', icon: Banknote },
                    { id: 'online', label: 'ऑनलाइन (UPI)', icon: Smartphone },
                    { id: 'udhari', label: 'पूरी उधारी (Khata)', icon: BookOpen },
                    { id: 'split', label: 'आधा नकद / उधारी', icon: Scale },
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMode(m.id as any)}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          paymentMode === m.id
                            ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Split / Custom Payment Inputs */}
                {paymentMode === 'split' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600">नकद प्राप्त (Cash Paid): ₹</label>
                      <input
                        type="number"
                        value={cashPaidInput}
                        onChange={e => setCashPaidInput(e.target.value)}
                        className="w-full mt-1 p-2 font-bold bg-white border border-gray-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-600">ऑनलाइन प्राप्त (UPI): ₹</label>
                      <input
                        type="number"
                        value={onlinePaidInput}
                        onChange={e => setOnlinePaidInput(e.target.value)}
                        className="w-full mt-1 p-2 font-bold bg-white border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Udhari Breakdown Alert */}
                {udhariRemaining > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-bold">
                    <span>खाते में जाने वाली उधारी राशि:</span>
                    <span className="text-sm text-red-700 font-extrabold">₹{udhariRemaining}</span>
                  </div>
                )}

                {/* Optional Note */}
                <input
                  type="text"
                  placeholder="टिप्पणी / फसल का नाम (वैकल्पिक)..."
                  value={billNote}
                  onChange={e => setBillNote(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />

                {/* Final Action Button */}
                <button
                  type="button"
                  disabled={isSubmitting || cartItems.length === 0}
                  onClick={handleCreateSale}
                  className="w-full py-3.5 px-6 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl font-extrabold text-sm sm:text-base shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'बिल सुरक्षित हो रहा है...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      बिल सेव करें (Save Bill & Deduct Stock) · ₹{calculatedFinalTotal}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                नया ग्राहक जोड़ें (Add Customer)
              </h3>
              <button onClick={() => setShowQuickCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">किसान का पूरा नाम *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. रमेश पाटीदार"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">मोबाइल नंबर</label>
                  <input
                    type="tel"
                    placeholder="उदा. 98260XXXXX"
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">गाँव / पता</label>
                  <input
                    type="text"
                    placeholder="उदा. फल्सावद"
                    value={newCustVillage}
                    onChange={e => setNewCustVillage(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">अधिकतम उधारी सीमा (Credit Limit) ₹</label>
                <input
                  type="number"
                  value={newCustCreditLimit}
                  onChange={e => setNewCustCreditLimit(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#2D5A27] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-[#23461e] active:scale-95 transition-all mt-4"
              >
                ग्राहक सुरक्षित करें
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LOOSE & SPRAY PUMP DOSE CALCULATOR MODAL */}
      {looseModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4 max-h-[92vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">खुला / स्प्रे डोज बिक्री</h3>
                  <p className="text-[11px] text-gray-500">{looseModalProduct.hindiName || looseModalProduct.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setLooseModalProduct(null)} 
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Open Stock Indicator */}
            <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-blue-800 font-medium block">वर्तमान उपलब्ध खुला स्टॉक:</span>
                <span className="text-base font-black text-blue-950">
                  {looseModalProduct.looseStock 
                    ? formatBaseUnitDisplay(looseModalProduct.looseStock.availableBaseQty, looseModalProduct.looseStock.baseUnit)
                    : `0 ${looseDirectUnit}`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 block">खुला दर:</span>
                <span className="text-xs font-bold text-gray-800">
                  ₹{looseCustomPrice || looseModalProduct.looseStock?.sellingPricePerBaseUnit || 0} /{looseDirectUnit}
                </span>
              </div>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setLooseMode('direct')}
                className={`py-2 rounded-xl transition-all ${
                  looseMode === 'direct' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                सीधी खुली मात्रा ({looseDirectUnit})
              </button>
              <button
                type="button"
                onClick={() => setLooseMode('pump')}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                  looseMode === 'pump' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                पंप डोज कैलकुलेटर
              </button>
            </div>

            {/* Mode 1: Direct Quantity */}
            {looseMode === 'direct' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    बिक्री की मात्रा ({looseDirectUnit}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={`उदा. 100 ${looseDirectUnit}`}
                    value={looseDirectQty}
                    onChange={e => setLooseDirectQty(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {/* Preset quick buttons */}
                  <div className="flex gap-1.5 mt-2">
                    {['50', '100', '150', '250', '500'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLooseDirectQty(val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          looseDirectQty === val
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {val} {looseDirectUnit}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    दर प्रति {looseDirectUnit} (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={looseCustomPrice}
                    onChange={e => setLooseCustomPrice(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Mode 2: Spray Tank Dose Calculator */}
            {looseMode === 'pump' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      पंपों की संख्या (Tanks) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="उदा. 3"
                      value={loosePumpCount}
                      onChange={e => setLoosePumpCount(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <div className="flex gap-1 mt-1.5">
                      {['1', '2', '3', '4', '5'].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setLoosePumpCount(cnt)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                            loosePumpCount === cnt
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      प्रति पंप डोज ({looseDirectUnit}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="उदा. 35"
                      value={looseDosePerPump}
                      onChange={e => setLooseDosePerPump(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {looseModalProduct.standardDoseInfo?.verifiedDosePer20LTank && (
                      <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
                        सत्यापित डोज: {looseModalProduct.standardDoseInfo.verifiedDosePer20LTank} {looseDirectUnit}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    दर प्रति {looseDirectUnit} (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={looseCustomPrice}
                    onChange={e => setLooseCustomPrice(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Calculation Summary Box */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center justify-between">
                    <span>कुल दवा (Volume):</span>
                    <span className="text-sm">
                      {(Number(loosePumpCount) || 0) * (Number(looseDosePerPump) || 0)} {looseDirectUnit}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    {loosePumpCount} पंप × {looseDosePerPump} {looseDirectUnit} प्रति 15-16 लीटर टंकी
                  </p>
                </div>
              </div>
            )}

            {/* Total Price & Stock Check Display */}
            {(() => {
              const reqQty = looseMode === 'pump' 
                ? (Number(loosePumpCount) || 0) * (Number(looseDosePerPump) || 0)
                : (Number(looseDirectQty) || 0);
              const rate = Number(looseCustomPrice) || 0;
              const lineTotal = Math.round(reqQty * rate);
              const openStock = looseModalProduct.looseStock?.availableBaseQty || 0;
              const willNeedPackOpen = reqQty > openStock;

              return (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div>
                      <span className="text-[11px] text-gray-500 block">देय राशि (Line Total):</span>
                      <span className="text-xl font-black text-gray-900">₹{lineTotal}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-gray-500 block">कुल मात्रा:</span>
                      <span className="text-sm font-bold text-emerald-800">{reqQty} {looseDirectUnit}</span>
                    </div>
                  </div>

                  {willNeedPackOpen && (
                    <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <span>
                        खुले स्टॉक में मात्र <strong>{openStock} {looseDirectUnit}</strong> है। यह बिल सुरक्षित होने पर 1 सीलबंद पैकेट अपने-आप खुल जाएगा और शेष मात्रा खुले स्टॉक में सुरक्षित हो जाएगी।
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setLooseModalProduct(null)}
                      className="py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmLooseSale}
                      className="py-2.5 px-4 bg-[#2D5A27] text-white rounded-xl font-bold text-xs hover:bg-[#23461e] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      बिल में जोड़ें
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* COMPLETED SALE & PRINT MODAL */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1 border-b pb-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">बिल सफलतापूर्वक कट गया!</h3>
              <p className="text-xs text-gray-500">इनवॉइस नंबर: <strong>#{completedSale.invoiceNo}</strong></p>
            </div>

            {/* Printable Receipt Preview */}
            <div id="printable-receipt" className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs space-y-3 font-mono">
              <div className="text-center border-b pb-2">
                <h4 className="font-extrabold text-sm uppercase">फल्सावदिया कृषि बाजार</h4>
                <p className="text-[10px] text-gray-500">डिंपल चौराहा, शामगढ़ (म.प्र.) | मो. 8982338046</p>
                <p className="text-[10px] text-gray-400">दिनांक: {completedSale.date}</p>
              </div>

              <div className="flex justify-between border-b pb-1 text-[11px]">
                <span>ग्राहक: <strong>{completedSale.customerName}</strong></span>
                <span>{completedSale.customerPhone}</span>
              </div>

              <div className="space-y-1">
                {completedSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate flex-1">{it.hindiName || it.name} × {it.quantity} {it.unit}</span>
                    <span className="font-bold">₹{it.totalEffectiveAmount}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>उप-कुल (Subtotal):</span>
                  <span>₹{completedSale.subtotal}</span>
                </div>
                {completedSale.bargainingDiscount > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>मोलभाव छूट (Discount):</span>
                    <span>-₹{completedSale.bargainingDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-extrabold pt-1 border-t">
                  <span>अंतिम कुल (Grand Total):</span>
                  <span>₹{completedSale.finalTotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>नकद/UPI भुगतान:</span>
                  <span>₹{completedSale.cashPaid + completedSale.onlinePaid}</span>
                </div>
                {completedSale.udhariAmount > 0 && (
                  <div className="flex justify-between text-red-700 font-bold">
                    <span>खाते में उधारी (Due):</span>
                    <span>₹{completedSale.udhariAmount}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={printReceipt}
                className="py-3 px-3 bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-900 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" /> A4 प्रिंट / Spooler
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="py-3 px-3 bg-gray-100 text-gray-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors border border-gray-200 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-700" /> {isDownloadingPdf ? 'PDF बन रहा है...' : 'PDF फाइल'}
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="py-3 px-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors"
              >
                अगला बिल बनाएं
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED A4 PRINT PORTAL */}
      {typeof document !== 'undefined' && isPrinting && completedSale && createPortal(
        <div id="active-print-portal">
          <PrintableSalesInvoice
            sale={completedSale}
            customerOutstanding={selectedCustomer?.currentOutstanding || 0}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default AccountingPOSBilling;
