import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Plus, Trash2, Search, UserCheck, AlertCircle, 
  CheckCircle2, Printer, Percent, ArrowRight, RefreshCw, 
  Phone, MapPin, IndianRupee, CreditCard, Wallet, UserPlus, X, FileText,
  ChevronDown, User, Smartphone, BookOpen, Scale, Banknote
} from 'lucide-react';
import { 
  AccountingProduct, 
  AccountingCustomer, 
  AccountingSale 
} from '../../types/accounting';
import { 
  fetchAccountingProducts, 
  fetchAccountingCustomers, 
  createOfflineSale, 
  saveAccountingCustomer,
  calculateBargainingAllocation 
} from '../../services/accountingService';

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
    productId: string;
    name: string;
    hindiName: string;
    unit: string;
    quantity: number;
    costPrice: number;
    originalSellingPrice: number;
    currentStock: number;
  }

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  
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

  // Add Item to Cart
  const addItemToCart = (p: AccountingProduct) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === p.id);
      if (existing) {
        return prev.map(item => 
          item.productId === p.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          hindiName: p.hindiName,
          unit: p.unit,
          quantity: 1,
          costPrice: p.costPrice || 0,
          originalSellingPrice: p.defaultSellingPrice || p.costPrice || 0,
          currentStock: p.currentStock || 0,
        },
      ];
    });
  };

  const updateItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeItemFromCart(productId);
      return;
    }
    setCartItems(prev => prev.map(it => it.productId === productId ? { ...it, quantity: qty } : it));
  };

  const updateItemPrice = (productId: string, price: number) => {
    setCartItems(prev => prev.map(it => it.productId === productId ? { ...it, originalSellingPrice: Math.max(0, price) } : it));
  };

  const removeItemFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(it => it.productId !== productId));
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
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-200">
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
                  const inCart = cartItems.find(it => it.productId === prod.id);
                  const isOutOfStock = (prod.currentStock || 0) <= 0;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => addItemToCart(prod)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        inCart
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : isOutOfStock
                          ? 'border-red-100 bg-red-50/20 hover:border-red-300'
                          : 'border-gray-100 bg-white hover:border-emerald-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                            {prod.hindiName || prod.name}
                          </h4>
                          {inCart && (
                            <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                              ×{inCart.quantity}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">{prod.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-extrabold text-emerald-800">
                            ₹{prod.defaultSellingPrice} /{prod.unit}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            (लागत: ₹{prod.costPrice})
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
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
                        <button
                          type="button"
                          className="text-xs bg-emerald-600 text-white p-1.5 rounded-xl hover:bg-emerald-700 active:scale-95 transition-transform"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
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
                    return (
                      <div
                        key={item.productId}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                              {item.hindiName || item.name}
                            </h4>
                            <p className="text-[10px] text-gray-400">
                              लागत: ₹{item.costPrice} /{item.unit}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItemFromCart(item.productId)}
                            className="text-gray-400 hover:text-red-600 p-1"
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
                              onChange={e => updateItemQty(item.productId, Number(e.target.value))}
                              className="w-16 p-1.5 text-center font-bold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="text-[11px] text-gray-500">{item.unit}</span>
                          </div>

                          <div className="col-span-4 flex items-center gap-1">
                            <span className="text-[11px] text-gray-500 font-bold">दर: ₹</span>
                            <input
                              type="number"
                              min="0"
                              value={item.originalSellingPrice}
                              onChange={e => updateItemPrice(item.productId, Number(e.target.value))}
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
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-md'
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
                  className="w-full py-4 px-6 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 active:scale-95 transition-all mt-4"
              >
                ग्राहक सुरक्षित करें
              </button>
            </form>
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

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={printReceipt}
                className="py-3 px-4 bg-gray-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-black transition-colors"
              >
                <Printer className="w-4 h-4" /> प्रिंट / PDF रसीद
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors"
              >
                अगला बिल बनाएं (New Bill)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPOSBilling;
