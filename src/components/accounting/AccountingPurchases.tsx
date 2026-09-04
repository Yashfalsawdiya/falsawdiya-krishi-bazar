import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Plus, Search, Calendar, FileText, CheckCircle2, 
  Trash2, Phone, Building2, IndianRupee, ArrowDownLeft, X, Eye, 
  BookOpen, Clock, AlertCircle, Receipt, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { 
  AccountingPurchase, 
  AccountingSupplier, 
  AccountingProduct, 
  AccountingPurchaseItem 
} from '../../types/accounting';
import { 
  fetchAccountingPurchases, 
  fetchAccountingSuppliers, 
  fetchAccountingProducts, 
  createWholesalerPurchase, 
  saveAccountingSupplier 
} from '../../services/accountingService';
import { SupplierLedgerView } from './SupplierLedgerView';
import { SupplierPaymentModal } from './SupplierPaymentModal';

export const AccountingPurchases: React.FC = () => {
  const [purchases, setPurchases] = useState<AccountingPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<AccountingSupplier[]>([]);
  const [products, setProducts] = useState<AccountingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'cleared'>('all');

  // Active Tab: Invoices List vs Suppliers & Ledger
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers'>('invoices');

  // Modals
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<AccountingPurchase | null>(null);

  // Supplier Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalSupplierId, setPaymentModalSupplierId] = useState<string | undefined>(undefined);
  const [paymentModalPurchaseId, setPaymentModalPurchaseId] = useState<string | undefined>(undefined);

  // New Purchase Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState<AccountingPurchaseItem[]>([]);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'bank' | 'udhari' | 'split'>('online');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Supplier Form state
  const [supplierName, setSupplierName] = useState('');
  const [supplierCompany, setSupplierCompany] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierCity, setSupplierCity] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchs, supps, prods] = await Promise.all([
        fetchAccountingPurchases(),
        fetchAccountingSuppliers(true),
        fetchAccountingProducts(),
      ]);
      setPurchases(purchs);
      setSuppliers(supps);
      setProducts(prods);

      // Keep viewing purchase in sync if open
      if (viewingPurchase) {
        const updatedView = purchs.find(p => p.id === viewingPurchase.id);
        if (updatedView) setViewingPurchase(updatedView);
      }
    } catch (err) {
      console.error('Error loading purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Active (non-archived) suppliers for new bill creation
  const activeSuppliers = useMemo(() => {
    return suppliers.filter(s => !s.isArchived);
  }, [suppliers]);

  // Purchase Calculations
  const subtotal = purchaseItems.reduce((acc, it) => acc + it.total, 0);
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const unpaidSupplierUdhari = Math.max(0, grandTotal - paidAmount);

  // Add Item Line
  const addPurchaseItem = () => {
    setPurchaseItems(prev => [
      ...prev,
      {
        name: '',
        hindiName: '',
        unit: 'Bottle',
        quantity: 1,
        purchasePrice: 0,
        total: 0,
      },
    ]);
  };

  const updatePurchaseItem = (index: number, field: keyof AccountingPurchaseItem, value: any) => {
    setPurchaseItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };

      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          copy[index].name = prod.name;
          copy[index].hindiName = prod.hindiName;
          copy[index].unit = prod.unit;
          copy[index].purchasePrice = prod.costPrice || 0;
          copy[index].batchNumber = prod.batchNo || '';
          copy[index].expiryDate = prod.expiryDate || '';

          if (prod.packagingVariants && prod.packagingVariants.length > 0) {
            const firstVar = prod.packagingVariants[0];
            copy[index].variantId = firstVar.id;
            copy[index].packagingSize = firstVar.sizeValue;
            copy[index].packagingUnit = firstVar.sizeUnit;
            copy[index].packagingType = firstVar.packagingType;
            copy[index].purchasePrice = firstVar.costPrice || prod.costPrice || 0;
            copy[index].sellingPriceSuggestion = firstVar.sellingPrice || prod.defaultSellingPrice || 0;
          }
        }
      }

      if (field === 'variantId') {
        const prod = products.find(p => p.id === copy[index].productId);
        if (prod && prod.packagingVariants) {
          const matchedVar = prod.packagingVariants.find(v => v.id === value);
          if (matchedVar) {
            copy[index].variantId = matchedVar.id;
            copy[index].packagingSize = matchedVar.sizeValue;
            copy[index].packagingUnit = matchedVar.sizeUnit;
            copy[index].packagingType = matchedVar.packagingType;
            copy[index].purchasePrice = matchedVar.costPrice || copy[index].purchasePrice;
            copy[index].sellingPriceSuggestion = matchedVar.sellingPrice || copy[index].sellingPriceSuggestion;
          }
        }
      }

      if (field === 'quantity' || field === 'purchasePrice' || field === 'productId' || field === 'variantId') {
        const qty = field === 'quantity' ? Number(value) : copy[index].quantity;
        const rate = field === 'purchasePrice' ? Number(value) : copy[index].purchasePrice;
        copy[index].total = Math.round(qty * rate * 100) / 100;
      }

      return copy;
    });
  };

  const removePurchaseItem = (index: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit New Purchase
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      alert('कृपया कम से कम एक उत्पाद जोड़ें।');
      return;
    }

    setIsSubmitting(true);
    try {
      await createWholesalerPurchase({
        invoiceNumber: invoiceNumber.trim() || `PUR-${Date.now().toString().slice(-6)}`,
        supplierId: selectedSupplier?.id,
        supplierName: selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.companyName || ''})` : 'थोक विक्रेता (Wholesaler)',
        supplierPhone: selectedSupplier?.phone || '',
        invoiceDate,
        timestamp: Date.now(),
        items: purchaseItems,
        subtotal,
        taxAmount,
        discountAmount,
        grandTotal,
        paidAmount,
        unpaidSupplierUdhari,
        paymentMode,
        notes: purchaseNotes.trim(),
      });

      await loadData();
      setShowAddPurchaseModal(false);
      setPurchaseItems([]);
      setPaidAmount(0);
      setInvoiceNumber('');
      setPurchaseNotes('');
      alert('थोक खरीद इनवॉइस दर्ज हो गया एवं इन्वेंट्री स्टॉक बढ़ गया!');
    } catch (err: any) {
      alert('खरीद सेव करने में त्रुटि: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    try {
      const newId = await saveAccountingSupplier({
        name: supplierName.trim(),
        companyName: supplierCompany.trim(),
        phone: supplierPhone.trim(),
        gstin: supplierGstin.trim(),
        city: supplierCity.trim(),
        totalPurchased: 0,
        totalPaid: 0,
        currentOutstanding: 0,
      });

      await loadData();
      setSelectedSupplierId(newId);
      setShowAddSupplierModal(false);
      setSupplierName('');
      setSupplierCompany('');
      setSupplierPhone('');
      setSupplierGstin('');
      setSupplierCity('');
    } catch (err: any) {
      alert('सप्लायर जोड़ने में त्रुटि: ' + err.message);
    }
  };

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        p.items.some(it => (it.hindiName || it.name).toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      const isCleared = (p.unpaidSupplierUdhari || 0) === 0 || p.paymentStatus === 'paid';
      if (statusFilter === 'pending') return !isCleared;
      if (statusFilter === 'cleared') return isCleared;
      return true;
    });
  }, [purchases, searchQuery, statusFilter]);

  // Handle open payment modal from any location
  const handleOpenPaymentModal = (supplierId?: string, purchaseId?: string) => {
    setPaymentModalSupplierId(supplierId);
    setPaymentModalPurchaseId(purchaseId);
    setShowPaymentModal(true);
  };

  // Total summary of invoices
  const invoiceMetrics = useMemo(() => {
    const totalPurchased = purchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
    const totalPaid = purchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    const totalOutstanding = purchases.reduce((acc, p) => acc + (p.unpaidSupplierUdhari || 0), 0);
    const pendingCount = purchases.filter(p => (p.unpaidSupplierUdhari || 0) > 0).length;
    return { totalPurchased, totalPaid, totalOutstanding, pendingCount };
  }, [purchases]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">थोक खरीद एवं सप्लायर प्रबंधन (Purchases & Supplier Ledger)</h2>
            <p className="text-xs text-gray-500">
              सप्लायर आवक इनवॉइस, खाता लेजर, भुगतान प्रविष्टि एवं स्वचालित कैश-फ्लो अपडेट
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenPaymentModal()}
            className="px-3.5 py-2.5 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <IndianRupee className="w-4 h-4" /> Supplier Payment दर्ज करें
          </button>
          <button
            onClick={() => {
              setPurchaseItems([
                { name: '', hindiName: '', unit: 'Bottle', quantity: 1, purchasePrice: 0, total: 0 },
              ]);
              setShowAddPurchaseModal(true);
            }}
            className="px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> नया खरीद इनवॉइस
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
              activeTab === 'invoices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>थोक खरीद इनवॉइस ({purchases.length})</span>
            {invoiceMetrics.pendingCount > 0 && (
              <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                {invoiceMetrics.pendingCount} बाकी
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
              activeTab === 'suppliers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>सप्लायर खाता व लेजर ({suppliers.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-gray-600 pb-1">
          <span>कुल खरीद: <strong className="text-gray-900">₹{invoiceMetrics.totalPurchased.toLocaleString()}</strong></span>
          <span>बकाया उधारी: <strong className="text-rose-700">₹{invoiceMetrics.totalOutstanding.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* TAB 1: INVOICES LIST */}
      {activeTab === 'invoices' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="इनवॉइस नंबर, सप्लायर या उत्पाद खोजें..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Filter by Payment Status */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                सभी इनवॉइस ({purchases.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                बकाया / उधारी ({invoiceMetrics.pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('cleared')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  statusFilter === 'cleared'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                पूर्ण चुकता (Cleared)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">तारीख व बिल नं.</th>
                  <th className="py-3 px-3">सप्लायर / डिस्ट्रीब्यूटर</th>
                  <th className="py-3 px-3">आइटम्स</th>
                  <th className="py-3 px-3">कुल खरीद राशि (Total)</th>
                  <th className="py-3 px-3">भुगतान स्थिति (Status)</th>
                  <th className="py-3 px-3 text-right">क्रियाएं</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      कोई खरीद रिकॉर्ड नहीं मिला। ऊपर "+ नया खरीद इनवॉइस" बटन दबाकर माल की आवक दर्ज करें।
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(p => {
                    const isCleared = (p.unpaidSupplierUdhari || 0) === 0 || p.paymentStatus === 'paid';
                    const isPartial = !isCleared && (p.paidAmount || 0) > 0;

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900">#{p.invoiceNumber}</div>
                          <div className="text-[11px] text-gray-400">{p.invoiceDate}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900">{p.supplierName}</div>
                          <div className="text-[11px] text-gray-400">{p.supplierPhone}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                            {p.items?.length || 0} उत्पाद
                          </span>
                        </td>

                        <td className="py-3 px-3 font-extrabold text-gray-900 text-sm">
                          ₹{p.grandTotal?.toLocaleString()}
                        </td>

                        <td className="py-3 px-3">
                          {isCleared ? (
                            <div>
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 inline-block">
                                पूर्ण चुकता (Paid)
                              </span>
                              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                Payment Cleared on: {p.clearedDate || p.invoiceDate}
                              </div>
                            </div>
                          ) : isPartial ? (
                            <div>
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-block">
                                आंशिक भुगतान (Partially Paid)
                              </span>
                              <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                                बाकी: ₹{p.unpaidSupplierUdhari.toLocaleString()} (दिया: ₹{p.paidAmount.toLocaleString()})
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 inline-block">
                                भुगतान बाकी (Unpaid / Full Credit)
                              </span>
                              <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                                बाकी: ₹{p.grandTotal.toLocaleString()}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCleared && (
                              <button
                                onClick={() => handleOpenPaymentModal(p.supplierId, p.id)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                                title="भुगतान दर्ज करें"
                              >
                                <IndianRupee className="w-3.5 h-3.5" /> भुगतान
                              </button>
                            )}

                            <button
                              onClick={() => setViewingPurchase(p)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                              title="बिल देखें"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIERS & LEDGER */}
      {activeTab === 'suppliers' && (
        <SupplierLedgerView
          suppliers={suppliers}
          purchases={purchases}
          onRefreshData={loadData}
          onOpenAddSupplier={() => setShowAddSupplierModal(true)}
          onOpenRecordPayment={(suppId, purchId) => handleOpenPaymentModal(suppId, purchId)}
          onOpenAddPurchaseForSupplier={(suppId) => {
            setSelectedSupplierId(suppId);
            setPurchaseItems([
              { name: '', hindiName: '', unit: 'Bottle', quantity: 1, purchasePrice: 0, total: 0 },
            ]);
            setShowAddPurchaseModal(true);
          }}
          onViewPurchaseDetails={(purchase) => setViewingPurchase(purchase)}
        />
      )}

      {/* MODAL: SUPPLIER PAYMENT ENTRY */}
      <SupplierPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={async () => {
          await loadData();
        }}
        suppliers={activeSuppliers}
        purchases={purchases}
        initialSupplierId={paymentModalSupplierId}
        initialPurchaseId={paymentModalPurchaseId}
      />

      {/* MODAL: ADD PURCHASE INVOICE */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                नया खरीद इनवॉइस दर्ज करें (Add Purchase)
              </h3>
              <button onClick={() => setShowAddPurchaseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">सप्लायर चुनें</label>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="">-- सप्लायर चुनें --</option>
                    {activeSuppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.companyName || s.city || 'सप्लायर'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">इनवॉइस नंबर *</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. INV-9801"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">इनवॉइस तारीख</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900">माल के उत्पाद ({purchaseItems.length})</h4>
                  <button
                    type="button"
                    onClick={addPurchaseItem}
                    className="text-xs text-blue-600 font-bold flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5" /> + पंक्ति जोड़ें
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.productId || ''}
                          onChange={e => updatePurchaseItem(idx, 'productId', e.target.value)}
                          className="flex-1 p-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                        >
                          <option value="">-- उत्पाद चुनें (Existing Inventory) या नीचे नाम लिखें --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.hindiName} ({p.name})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removePurchaseItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {!item.productId && (
                        <input
                          type="text"
                          placeholder="उत्पाद का नाम दर्ज करें..."
                          value={item.hindiName || item.name}
                          onChange={e => {
                            updatePurchaseItem(idx, 'hindiName', e.target.value);
                            updatePurchaseItem(idx, 'name', e.target.value);
                          }}
                          className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs"
                        />
                      )}

                      {/* If product selected, offer Variant selection */}
                      {item.productId && (() => {
                        const prod = products.find(p => p.id === item.productId);
                        if (!prod || !prod.packagingVariants || prod.packagingVariants.length === 0) return null;
                        return (
                          <div className="flex items-center gap-2 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200">
                            <span className="text-[10px] font-bold text-emerald-900 shrink-0">पैकेजिंग साइज:</span>
                            <select
                              value={item.variantId || ''}
                              onChange={e => updatePurchaseItem(idx, 'variantId', e.target.value)}
                              className="flex-1 p-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950"
                            >
                              {prod.packagingVariants.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.label} — लागत: ₹{v.costPrice} / बिक्री: ₹{v.sellingPrice} (स्टॉक: {v.currentStockPacks || 0})
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}

                      {/* Batch No & Expiry Date row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-0.5">बैच नंबर (Batch)</label>
                          <input
                            type="text"
                            placeholder="उदा. B-2409"
                            value={item.batchNumber || ''}
                            onChange={e => updatePurchaseItem(idx, 'batchNumber', e.target.value)}
                            className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-0.5">एक्सपायरी तारीख (Expiry)</label>
                          <input
                            type="date"
                            value={item.expiryDate || ''}
                            onChange={e => updatePurchaseItem(idx, 'expiryDate', e.target.value)}
                            className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-0.5">विक्रय मूल्य सुझाव ₹</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="विक्रय दर"
                            value={item.sellingPriceSuggestion || ''}
                            onChange={e => updatePurchaseItem(idx, 'sellingPriceSuggestion', Number(e.target.value))}
                            className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-emerald-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-0.5">पैकेट प्रकार</label>
                          <select
                            value={item.packagingType || 'Bottle'}
                            onChange={e => updatePurchaseItem(idx, 'packagingType', e.target.value as any)}
                            className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                          >
                            <option value="Bottle">बोतल (Bottle)</option>
                            <option value="Pouch">पाउच (Pouch)</option>
                            <option value="Packet">पैकेट (Packet)</option>
                            <option value="Bag">कट्टा/बैग (Bag)</option>
                            <option value="Bucket">बाल्टी (Bucket)</option>
                            <option value="Can">केन (Can)</option>
                            <option value="Other">अन्य</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5 flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-bold">मात्रा (पैकेट):</span>
                          <input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={e => updatePurchaseItem(idx, 'quantity', Number(e.target.value))}
                            className="w-16 p-1.5 text-center font-extrabold bg-white border border-gray-200 rounded-xl text-xs"
                          />
                          <span className="text-[11px] text-gray-600 font-bold">
                            {item.packagingSize ? `${item.packagingSize}${item.packagingUnit || ''}` : item.unit}
                          </span>
                        </div>

                        <div className="col-span-4 flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-bold">लागत ₹:</span>
                          <input
                            type="number"
                            step="any"
                            value={item.purchasePrice}
                            onChange={e => updatePurchaseItem(idx, 'purchasePrice', Number(e.target.value))}
                            className="w-24 p-1.5 font-bold bg-white border border-gray-200 rounded-xl text-xs text-purple-900"
                          />
                        </div>

                        <div className="col-span-3 text-right font-black text-gray-900 text-xs">
                          ₹{item.total}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Totals */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>उप-योग (Subtotal):</span>
                  <span className="font-bold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">टैक्स: ₹</span>
                    <input
                      type="number"
                      value={taxAmount}
                      onChange={e => setTaxAmount(Number(e.target.value))}
                      className="w-20 p-1 bg-white border border-gray-200 rounded-lg font-bold"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-gray-500">छूट: ₹</span>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={e => setDiscountAmount(Number(e.target.value))}
                      className="w-20 p-1 bg-white border border-gray-200 rounded-lg font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-gray-900 pt-1 border-t border-gray-300">
                  <span>कुल देय राशि (Grand Total):</span>
                  <span className="text-blue-900">₹{grandTotal}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-700">चुकाई गई राशि ₹</label>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(grandTotal)}
                      className="text-[10px] text-blue-600 font-bold"
                    >
                      पूरा भुगतान (₹{grandTotal})
                    </button>
                  </div>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    placeholder="0 दर्ज करें यदि पूरा उधार है"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">भुगतान माध्यम</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="online">ऑनलाइन (UPI / NEFT)</option>
                    <option value="cash">नकद (Cash)</option>
                    <option value="bank">बैंक चेक</option>
                    <option value="udhari">सप्लायर उधारी (Credit)</option>
                  </select>
                </div>
              </div>

              {/* Balance calculation preview */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-700 font-medium block">सप्लायर उधारी बाकी (Due):</span>
                  <span className="text-base font-extrabold text-blue-950">₹{unpaidSupplierUdhari}</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  unpaidSupplierUdhari === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {unpaidSupplierUdhari === 0 ? 'पूर्ण चुकता (Paid)' : paidAmount > 0 ? 'आंशिक भुगतान' : 'फुल क्रेडिट (Full Credit)'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-extrabold text-sm shadow-sm active:scale-95 transition-all mt-4"
              >
                {isSubmitting ? 'सुरक्षित हो रहा है...' : `खरीद दर्ज करें एवं स्टॉक जोड़ें · ₹${grandTotal}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                नया सप्लायर / डिस्ट्रीब्यूटर जोड़ें
              </h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">सप्लायर का नाम *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. धानुका एग्रीटेक एजेंसी"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">फर्म / कंपनी नाम</label>
                  <input
                    type="text"
                    placeholder="उदा. UPL Ltd."
                    value={supplierCompany}
                    onChange={e => setSupplierCompany(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">मोबाइल नंबर</label>
                  <input
                    type="tel"
                    placeholder="उदा. 94250XXXXX"
                    value={supplierPhone}
                    onChange={e => setSupplierPhone(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">GSTIN नंबर</label>
                  <input
                    type="text"
                    placeholder="उदा. 23AAAAA0000A1Z5"
                    value={supplierGstin}
                    onChange={e => setSupplierGstin(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">शहर / मंडी</label>
                  <input
                    type="text"
                    placeholder="उदा. मंदसौर / इंदौर"
                    value={supplierCity}
                    onChange={e => setSupplierCity(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-800 active:scale-95 transition-all mt-4"
              >
                सप्लायर सुरक्षित करें
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PURCHASE DETAILS */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">खरीद इनवॉइस विवरण</h3>
                <p className="text-xs text-gray-500">#{viewingPurchase.invoiceNumber} · {viewingPurchase.invoiceDate}</p>
              </div>
              <button onClick={() => setViewingPurchase(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Supplier Info */}
              <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                <p className="font-bold text-gray-900">{viewingPurchase.supplierName}</p>
                {viewingPurchase.supplierPhone && <p className="text-gray-500">मोबाइल: {viewingPurchase.supplierPhone}</p>}
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                viewingPurchase.unpaidSupplierUdhari === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div>
                  <span className="font-extrabold block">
                    {viewingPurchase.unpaidSupplierUdhari === 0 ? 'पूर्ण चुकता (Cleared)' : 'बकाया बाकी (Outstanding)'}
                  </span>
                  <span className="text-[11px] opacity-80 block">
                    {viewingPurchase.unpaidSupplierUdhari === 0
                      ? `Payment Cleared on: ${viewingPurchase.clearedDate || viewingPurchase.invoiceDate}`
                      : `सप्लायर उधारी शेष: ₹${viewingPurchase.unpaidSupplierUdhari.toLocaleString()}`}
                  </span>
                </div>
                {viewingPurchase.unpaidSupplierUdhari > 0 && (
                  <button
                    onClick={() => {
                      const p = viewingPurchase;
                      setViewingPurchase(null);
                      handleOpenPaymentModal(p.supplierId, p.id);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <IndianRupee className="w-3.5 h-3.5" /> भुगतान करें
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-700">आइटम्स:</h4>
                {viewingPurchase.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span>{it.hindiName || it.name} × {it.quantity} {it.unit}</span>
                    <strong className="font-mono">₹{it.total} (दर: ₹{it.purchasePrice})</strong>
                  </div>
                ))}
              </div>

              {/* Summary Totals */}
              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>कुल इनवॉइस:</span>
                  <strong className="text-gray-900">₹{viewingPurchase.grandTotal?.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>चुकाया गया:</span>
                  <span>₹{viewingPurchase.paidAmount?.toLocaleString()}</span>
                </div>
                {viewingPurchase.unpaidSupplierUdhari > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>सप्लायर उधारी बाकी:</span>
                    <span>₹{viewingPurchase.unpaidSupplierUdhari?.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Payment History on this invoice */}
              {viewingPurchase.payments && viewingPurchase.payments.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <h4 className="font-bold text-gray-700">इस बिल पर भुगतान इतिहास:</h4>
                  <div className="space-y-1.5">
                    {viewingPurchase.payments.map((pay, pIdx) => (
                      <div key={pay.id || pIdx} className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-bold text-emerald-900">₹{pay.amount?.toLocaleString()}</span>
                          <span className="text-gray-500 ml-2">({pay.date})</span>
                          {pay.note && <div className="text-gray-600 italic text-[10px]">{pay.note}</div>}
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                          {pay.paymentMode || 'online'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPurchases;
