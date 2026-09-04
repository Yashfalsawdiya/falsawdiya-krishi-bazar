import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Plus, Search, Calendar, FileText, CheckCircle2, 
  Trash2, Phone, Building2, IndianRupee, ArrowDownLeft, X, Eye, 
  BookOpen, Clock, AlertCircle, Receipt, ArrowRight, ShieldCheck,
  Layers, Droplet, Scale, Package, Ban, AlertTriangle, RotateCcw, ShieldAlert
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
  saveAccountingSupplier,
  cancelOrDeleteWholesalerPurchase,
  checkPurchaseHasDependentRecords
} from '../../services/accountingService';
import { useAppContext } from '../../context/AppContext';
import { SupplierLedgerView } from './SupplierLedgerView';
import { SupplierPaymentModal } from './SupplierPaymentModal';
import { 
  PurchasePackagingBuilder, 
  PurchaseProductEntry 
} from './PurchasePackagingBuilder';
import { normalizeToBaseUnit } from '../../utils/agriPackagingUtils';

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

  const { isAdmin, user } = useAppContext();

  // Purchase Deletion / Cancellation Modal state
  const [showDeletePurchaseModal, setShowDeletePurchaseModal] = useState(false);
  const [targetPurchaseToDelete, setTargetPurchaseToDelete] = useState<AccountingPurchase | null>(null);
  const [checkingPurchaseDeps, setCheckingPurchaseDeps] = useState(false);
  const [purchaseDepsInfo, setPurchaseDepsInfo] = useState<Awaited<ReturnType<typeof checkPurchaseHasDependentRecords>> | null>(null);
  const [purchaseDeleteMode, setPurchaseDeleteMode] = useState<'cancel' | 'permanent'>('cancel');
  const [purchaseDeleteReason, setPurchaseDeleteReason] = useState('');
  const [purchaseConfirmText, setPurchaseConfirmText] = useState('');
  const [isDeletingPurchase, setIsDeletingPurchase] = useState(false);

  const handleInitiateDeletePurchase = async (purchase: AccountingPurchase) => {
    setTargetPurchaseToDelete(purchase);
    setPurchaseDeleteReason('');
    setPurchaseConfirmText('');
    setShowDeletePurchaseModal(true);
    setCheckingPurchaseDeps(true);
    try {
      const deps = await checkPurchaseHasDependentRecords(purchase.id);
      setPurchaseDepsInfo(deps);
      if (purchase.status === 'cancelled' || purchase.isCancelled) {
        setPurchaseDeleteMode('permanent');
      } else {
        setPurchaseDeleteMode('cancel');
      }
    } catch (err) {
      console.error('Error checking purchase dependencies:', err);
    } finally {
      setCheckingPurchaseDeps(false);
    }
  };

  const handleConfirmDeletePurchase = async () => {
    if (!targetPurchaseToDelete) return;
    setIsDeletingPurchase(true);
    try {
      const adminEmail = user?.email || 'admin@krishibazaar.com';
      const adminName = user?.displayName || user?.email || 'Admin';
      const adminUid = user?.uid || '';

      await cancelOrDeleteWholesalerPurchase({
        purchaseId: targetPurchaseToDelete.id,
        adminEmail,
        adminName,
        adminUid,
        reason: purchaseDeleteReason || (purchaseDeleteMode === 'permanent' ? 'एडमिन द्वारा इनवॉइस स्थायी हटाया गया' : 'एडमिन द्वारा इनवॉइस रद्द (Cancelled) किया गया'),
        hardDelete: purchaseDeleteMode === 'permanent',
      });

      if (purchaseDeleteMode === 'permanent') {
        alert(`इनवॉइस #${targetPurchaseToDelete.invoiceNumber} डेटाबेस से स्थायी रूप से हटा दिया गया है। स्टॉक और सप्लायर लेजर रिवर्स कर दिए गए हैं।`);
      } else {
        alert(`इनवॉइस #${targetPurchaseToDelete.invoiceNumber} को सफलतापूर्वक रद्द (Cancelled / Void) कर दिया गया। स्टॉक और सप्लायर लेजर सुरक्षित रूप से रिवर्स हो चुके हैं।`);
      }

      setShowDeletePurchaseModal(false);
      setTargetPurchaseToDelete(null);
      if (viewingPurchase?.id === targetPurchaseToDelete.id) {
        setViewingPurchase(null);
      }
      await loadData();
    } catch (err: any) {
      alert('इनवॉइस रद्द / हटाने में त्रुटि: ' + (err.message || err));
    } finally {
      setIsDeletingPurchase(false);
    }
  };

  // New Purchase Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Products and Packaging Variants for the purchase invoice
  const [productEntries, setProductEntries] = useState<PurchaseProductEntry[]>([
    {
      tempId: `entry_${Date.now()}`,
      name: '',
      hindiName: '',
      productType: 'liquid',
      category: 'pesticides',
      variants: [
        {
          id: `var_${Date.now()}`,
          sizeValue: 100,
          sizeUnit: 'ml',
          packagingType: 'Bottle',
          costPrice: 0,
          sellingPrice: 0,
          quantity: 1,
        },
      ],
    },
  ]);

  // Transport / Freight & Tax / Discount
  const [transportCharges, setTransportCharges] = useState<number>(0);
  const [transportNote, setTransportNote] = useState<string>('');
  const [transportPayableTo, setTransportPayableTo] = useState<'supplier' | 'transporter'>('supplier');
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

  // Purchase Calculations across all product entries and variants
  const subtotal = useMemo(() => {
    return productEntries.reduce((pSum, prod) => {
      return pSum + prod.variants.reduce((vSum, v) => vSum + (Number(v.quantity) || 0) * (Number(v.costPrice) || 0), 0);
    }, 0);
  }, [productEntries]);

  const totalLandedCost = useMemo(() => {
    return Math.max(0, subtotal + taxAmount - discountAmount + transportCharges);
  }, [subtotal, taxAmount, discountAmount, transportCharges]);

  const grandTotal = useMemo(() => {
    if (transportPayableTo === 'transporter') {
      return Math.max(0, subtotal + taxAmount - discountAmount);
    }
    return Math.max(0, subtotal + taxAmount - discountAmount + transportCharges);
  }, [subtotal, taxAmount, discountAmount, transportCharges, transportPayableTo]);

  const unpaidSupplierUdhari = Math.max(0, grandTotal - paidAmount);

  // Helper to open new purchase modal with fresh state
  const handleOpenAddPurchase = (supplierId?: string) => {
    if (supplierId) setSelectedSupplierId(supplierId);
    setProductEntries([
      {
        tempId: `entry_${Date.now()}`,
        name: '',
        hindiName: '',
        productType: 'liquid',
        category: 'pesticides',
        variants: [
          {
            id: `var_${Date.now()}`,
            sizeValue: 100,
            sizeUnit: 'ml',
            packagingType: 'Bottle',
            costPrice: 0,
            sellingPrice: 0,
            quantity: 1,
          },
        ],
      },
    ]);
    setTransportCharges(0);
    setTransportNote('');
    setTransportPayableTo('supplier');
    setTaxAmount(0);
    setDiscountAmount(0);
    setPaidAmount(0);
    setInvoiceNumber('');
    setPurchaseNotes('');
    setShowAddPurchaseModal(true);
  };

  // Submit New Purchase
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    // Flatten all product entries & variants into items: AccountingPurchaseItem[]
    const flatItems: AccountingPurchaseItem[] = [];

    for (const prod of productEntries) {
      const prodName = prod.name.trim() || prod.hindiName?.trim() || '';
      if (!prodName && !prod.productId) continue;

      for (const v of prod.variants) {
        const qty = Number(v.quantity) || 0;
        if (qty <= 0) continue;

        const cost = Number(v.costPrice) || 0;
        const baseQty = normalizeToBaseUnit(v.sizeValue, v.sizeUnit);
        const totalBaseQty = baseQty * qty;
        const totalLine = Math.round(qty * cost * 100) / 100;

        flatItems.push({
          productId: prod.productId,
          name: prod.name || prod.hindiName || 'कृषि उत्पाद',
          hindiName: prod.hindiName || prod.name || 'कृषि उत्पाद',
          unit: v.packagingType || 'Bottle',
          quantity: qty,
          purchasePrice: cost,
          sellingPriceSuggestion: Number(v.sellingPrice) || undefined,
          total: totalLine,
          variantId: v.variantId,
          variantLabel: `${v.sizeValue} ${v.sizeUnit} ${v.packagingType}`,
          packagingSize: v.sizeValue,
          packagingUnit: v.sizeUnit,
          packagingType: v.packagingType,
          baseQuantity: baseQty,
          totalBaseQuantity: totalBaseQty,
          batchNumber: v.batchNumber?.trim() || undefined,
          manufacturingDate: v.manufacturingDate?.trim() || undefined,
          expiryDate: v.expiryDate?.trim() || undefined,
        });
      }
    }

    if (flatItems.length === 0) {
      alert('कृपया कम से कम एक उत्पाद और उसकी वैध मात्रा/खरीद दर दर्ज करें।');
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
        items: flatItems,
        subtotal,
        taxAmount,
        discountAmount,
        transportCharges,
        transportNote: transportNote.trim() || undefined,
        transportPayableTo,
        totalLandedCost,
        grandTotal,
        paidAmount,
        unpaidSupplierUdhari,
        paymentMode,
        notes: purchaseNotes.trim(),
      });

      await loadData();
      setShowAddPurchaseModal(false);
      handleOpenAddPurchase();
      setShowAddPurchaseModal(false);
      alert('थोक खरीद इनवॉइस दर्ज हो गया एवं इन्वेंट्री में सभी पैकेजिंग साइज का स्टॉक बढ़ गया!');
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
            onClick={() => handleOpenAddPurchase()}
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
                    const isCancelled = p.isCancelled || p.status === 'cancelled';
                    const isCleared = !isCancelled && ((p.unpaidSupplierUdhari || 0) === 0 || p.paymentStatus === 'paid');
                    const isPartial = !isCancelled && !isCleared && (p.paidAmount || 0) > 0;

                    return (
                      <tr key={p.id} className={`hover:bg-gray-50/80 transition-colors ${isCancelled ? 'bg-rose-50/40 opacity-80' : ''}`}>
                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>#{p.invoiceNumber}</span>
                            {isCancelled && (
                              <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded">रद्द</span>
                            )}
                          </div>
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

                        <td className={`py-3 px-3 font-extrabold text-sm ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          ₹{p.grandTotal?.toLocaleString()}
                        </td>

                        <td className="py-3 px-3">
                          {isCancelled ? (
                            <div>
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                <Ban className="w-3 h-3 text-rose-600" /> रद्द (Cancelled / Void)
                              </span>
                              <div className="text-[10px] text-rose-600 font-medium mt-0.5 truncate max-w-[180px]" title={p.cancelReason}>
                                {p.cancelReason || 'एडमिन द्वारा रद्द'}
                              </div>
                            </div>
                          ) : isCleared ? (
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
                            {!isCleared && !isCancelled && (
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

                            {isAdmin && (
                              <button
                                onClick={() => handleInitiateDeletePurchase(p)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors border border-rose-200"
                                title={isCancelled ? 'स्थायी रूप से हटाएं' : 'इनवॉइस रद्द या हटाएं'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
            handleOpenAddPurchase(suppId);
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
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-700" />
                  <span>नया थोक खरीद इनवॉइस (Add Purchase with Packaging Variants)</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  सप्लायर से अलग-अलग साइज (ml/Ltr, g/kg), मात्रा, खरीद व बिक्री दर और परिवहन शुल्क दर्ज करें
                </p>
              </div>
              <button onClick={() => setShowAddPurchaseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              {/* Top Row: Supplier, Invoice Number, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">सप्लायर / थोक व्यापारी चुनें *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <label className="font-bold text-gray-700 block mb-1">सप्लायर इनवॉइस नंबर *</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. INV-9801"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">इनवॉइस तारीख</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION: Products & Packaging Variants Builder */}
              <PurchasePackagingBuilder
                products={products}
                productEntries={productEntries}
                onChangeEntries={setProductEntries}
                transportCharges={transportCharges}
              />

              {/* SECTION: Transport / Freight Charges & Landed Cost Allocation */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="font-extrabold text-purple-950 flex items-center gap-1.5 text-xs">
                    <Truck className="w-4 h-4 text-purple-700" />
                    <span>परिवहन / माल ढुलाई शुल्क (Transport / Freight Charges)</span>
                  </label>
                  <span className="text-[10px] text-purple-800 font-bold bg-purple-100/90 px-2 py-0.5 rounded-full border border-purple-200">
                    आनुपातिक लैंडेड कॉस्ट (Landed Cost) गणना
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                      परिवहन शुल्क ₹ (भाड़ा)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={transportCharges || ''}
                      onChange={e => setTransportCharges(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="उदा. 500"
                      className="w-full p-2 bg-white border border-purple-200 rounded-xl font-bold text-purple-950 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                      परिवहन नोट / विवरण (वैकल्पिक)
                    </label>
                    <input
                      type="text"
                      value={transportNote}
                      onChange={e => setTransportNote(e.target.value)}
                      placeholder="उदा. इंदौर से मंदसौर दुकान तक माल ढुलाई..."
                      className="w-full p-2 bg-white border border-purple-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                      परिवहन भुगतान दायित्व
                    </label>
                    <select
                      value={transportPayableTo}
                      onChange={e => setTransportPayableTo(e.target.value as 'supplier' | 'transporter')}
                      className="w-full p-2 bg-white border border-purple-200 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="supplier">सप्लायर इनवॉइस में शामिल (Payable to Supplier)</option>
                      <option value="transporter">ट्रांसपोर्टर को अलग से भुगतान (Paid to Transporter)</option>
                    </select>
                  </div>
                </div>

                {transportCharges > 0 && (
                  <div className="text-[11px] text-purple-900 bg-purple-100/60 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1 border border-purple-200">
                    <span className="leading-snug">
                      💡 <strong>लैंडेड कॉस्ट फॉर्मूला:</strong> उत्पाद खरीद दर + आनुपातिक परिवहन लागत = वास्तविक लैंडेड कॉस्ट प्रति पैक। इन्वेंट्री मूल्यांकन और वास्तविक मुनाफे की गणना इसी लैंडेड दर पर होगी।
                    </span>
                    <span className="font-extrabold shrink-0 text-purple-950 font-mono text-xs">
                      कुल लैंडेड लागत: ₹{totalLandedCost.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Bill Totals Calculation */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-gray-700 font-medium">
                  <span>उत्पाद खरीद उप-योग (Product Subtotal):</span>
                  <span className="font-bold font-mono text-gray-900">₹{subtotal.toLocaleString()}</span>
                </div>

                {transportCharges > 0 && (
                  <div className="flex justify-between text-purple-900 font-medium">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-purple-700" />
                      <span>
                        परिवहन / भाड़ा ({transportPayableTo === 'supplier' ? 'सप्लायर बिल में शामिल' : 'ट्रांसपोर्टर को देय'}):
                      </span>
                    </span>
                    <span className="font-bold font-mono">
                      {transportPayableTo === 'supplier' ? `+ ₹${transportCharges.toLocaleString()}` : `(₹${transportCharges.toLocaleString()} अलग से देय)`}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 font-bold">टैक्स / GST: ₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={taxAmount || ''}
                      onChange={e => setTaxAmount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-24 p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-gray-500 font-bold">छूट (Discount): ₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={discountAmount || ''}
                      onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-24 p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-xs text-emerald-800"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-extrabold text-sm text-gray-900 pt-2 border-t border-gray-300">
                  <div>
                    <span>सप्लायर इनवॉइस कुल देय राशि (Grand Total):</span>
                    {transportCharges > 0 && (
                      <span className="block text-[10px] text-purple-700 font-bold">
                        कुल लैंडेड खरीद मूल्य: ₹{totalLandedCost.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className="text-blue-900 font-mono text-base">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-700">सप्लायर को चुकाई गई राशि ₹</label>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(grandTotal)}
                      className="text-[10px] text-blue-700 font-bold hover:underline"
                    >
                      पूरा भुगतान (₹{grandTotal.toLocaleString()})
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paidAmount || ''}
                    onChange={e => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0 दर्ज करें यदि पूरा उधार है"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">भुगतान माध्यम</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="online">ऑनलाइन (UPI / NEFT / RTGS)</option>
                    <option value="cash">नकद (Cash)</option>
                    <option value="bank">बैंक चेक (Cheque)</option>
                    <option value="udhari">सप्लायर उधारी (Full Credit)</option>
                  </select>
                </div>
              </div>

              {/* Balance calculation preview */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-700 font-medium block">सप्लायर उधारी बाकी (Due):</span>
                  <span className="text-base font-extrabold text-blue-950 font-mono">₹{unpaidSupplierUdhari.toLocaleString()}</span>
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
                className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-extrabold text-sm shadow-sm active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>{isSubmitting ? 'सुरक्षित हो रहा है...' : `खरीद दर्ज करें एवं स्टॉक जोड़ें · ₹${grandTotal.toLocaleString()}`}</span>
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
              {viewingPurchase.isCancelled || viewingPurchase.status === 'cancelled' ? (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-start gap-2 text-rose-900 font-extrabold">
                    <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">यह खरीद इनवॉइस रद्द (Cancelled / Void) किया जा चुका है</p>
                      <p className="text-[11px] text-rose-700 font-medium mt-0.5">
                        कारण: {viewingPurchase.cancelReason || 'एडमिन द्वारा रद्द'}
                        {viewingPurchase.cancelledAt && ` · तारीख: ${new Date(viewingPurchase.cancelledAt).toLocaleDateString('hi-IN')}`}
                        {viewingPurchase.cancelledBy && ` · एडमिन: ${viewingPurchase.cancelledBy}`}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleInitiateDeletePurchase(viewingPurchase)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all self-end sm:self-auto"
                      title="डेटाबेस से स्थायी रूप से हटाएं"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> स्थायी हटाएं
                    </button>
                  )}
                </div>
              ) : (
                <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${
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
                  <div className="flex items-center gap-2">
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
                    {isAdmin && (
                      <button
                        onClick={() => handleInitiateDeletePurchase(viewingPurchase)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                        title="इनवॉइस रद्द या हटाएं"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> इनवॉइस रद्द / हटाएं
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-700">खरीदे गए उत्पाद एवं पैकेजिंग साइज:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {viewingPurchase.items?.map((it, idx) => (
                    <div key={idx} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-900">{it.hindiName || it.name}</div>
                          <div className="text-[11px] text-gray-600 flex flex-wrap gap-1.5 mt-0.5">
                            {it.packagingSize && (
                              <span className="bg-emerald-100/70 text-emerald-900 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                                साइज: {it.packagingSize} {it.packagingUnit || ''} ({it.packagingType || 'Packet'})
                              </span>
                            )}
                            <span className="font-medium">मात्रा: <strong>{it.quantity} पैकेट</strong></span>
                            {it.batchNumber && (
                              <span className="bg-blue-100/70 text-blue-900 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                बैच: {it.batchNumber}
                              </span>
                            )}
                            {it.expiryDate && (
                              <span className="text-gray-500 text-[10px]">
                                Exp: {it.expiryDate}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <strong className="font-mono text-xs text-gray-900 block">₹{it.total?.toLocaleString()}</strong>
                          <span className="text-[10px] text-gray-500">दर: ₹{it.purchasePrice}/पैक</span>
                        </div>
                      </div>

                      {/* Landed cost info if available */}
                      {it.landedCostPerPack && it.landedCostPerPack > it.purchasePrice && (
                        <div className="text-[10px] text-purple-900 bg-purple-50 p-1.5 rounded-lg flex items-center justify-between border border-purple-100">
                          <span>परिवहन जोड़कर लैंडेड लागत: <strong>₹{it.landedCostPerPack}/पैक</strong></span>
                          {it.sellingPriceSuggestion && (
                            <span className="text-emerald-800 font-bold">विक्रय मूल्य: ₹{it.sellingPriceSuggestion}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Totals */}
              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>उत्पाद खरीद उप-योग (Subtotal):</span>
                  <span className="font-bold text-gray-900">₹{(viewingPurchase.subtotal || viewingPurchase.grandTotal)?.toLocaleString()}</span>
                </div>
                {viewingPurchase.transportCharges && viewingPurchase.transportCharges > 0 && (
                  <div className="flex justify-between text-purple-900 font-medium">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-purple-700" />
                      <span>परिवहन शुल्क (Transport):</span>
                    </span>
                    <span className="font-bold">+ ₹{viewingPurchase.transportCharges.toLocaleString()}</span>
                  </div>
                )}
                {viewingPurchase.taxAmount && viewingPurchase.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>टैक्स / GST:</span>
                    <span>+ ₹{viewingPurchase.taxAmount.toLocaleString()}</span>
                  </div>
                )}
                {viewingPurchase.discountAmount && viewingPurchase.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>छूट (Discount):</span>
                    <span>- ₹{viewingPurchase.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-900 font-bold border-t pt-1">
                  <span>कुल इनवॉइस (Grand Total):</span>
                  <strong className="text-blue-900 text-sm">₹{viewingPurchase.grandTotal?.toLocaleString()}</strong>
                </div>
                {viewingPurchase.totalLandedCost && viewingPurchase.totalLandedCost > 0 && (
                  <div className="flex justify-between text-purple-950 font-bold bg-purple-50 p-1 rounded">
                    <span>कुल लैंडेड लागत (Landed Cost):</span>
                    <span>₹{viewingPurchase.totalLandedCost.toLocaleString()}</span>
                  </div>
                )}
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

      {/* MODAL: CANCEL / DELETE PURCHASE INVOICE */}
      {showDeletePurchaseModal && targetPurchaseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    खरीद इनवॉइस रद्द / हटाएं
                  </h3>
                  <p className="text-xs text-gray-500">
                    एडमिन सुरक्षा नियंत्रण · स्टॉक व सप्लायर लेजर स्वतः रिवर्सल
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeletePurchaseModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkingPurchaseDeps ? (
              <div className="py-10 text-center space-y-3">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-rose-600 border-t-transparent"></div>
                <p className="text-xs text-gray-600 font-medium">
                  खरीद से जुड़े स्टॉक, पैकेजिंग साइज और भुगतान रिकॉर्ड की जांच हो रही है...
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Invoice Summary Card */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                        <span>इनवॉइस #{targetPurchaseToDelete.invoiceNumber}</span>
                        {(targetPurchaseToDelete.isCancelled || targetPurchaseToDelete.status === 'cancelled') && (
                          <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-2 py-0.5 rounded">रद्द</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        सप्लायर: <strong>{targetPurchaseToDelete.supplierName}</strong> ({targetPurchaseToDelete.invoiceDate})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 block">कुल इनवॉइस राशि</span>
                      <strong className="text-blue-900 text-sm font-extrabold">
                        ₹{targetPurchaseToDelete.grandTotal.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/70 text-[11px]">
                    <div>
                      <span className="text-gray-500 block">उत्पाद:</span>
                      <span className="font-bold text-gray-800">{targetPurchaseToDelete.items?.length || 0} आइटम्स</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">चुकाया गया:</span>
                      <span className="font-bold text-emerald-700">₹{(targetPurchaseToDelete.paidAmount || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">सप्लायर उधारी:</span>
                      <span className="font-bold text-rose-700">₹{(targetPurchaseToDelete.unpaidSupplierUdhari || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 1. STOCK REVERSAL & SALES CHECK */}
                {purchaseDepsInfo?.hasSoldStock ? (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 text-rose-950">
                    <div className="flex items-center gap-1.5 font-extrabold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>चेतावनी: इस खरीद का माल पहले ही बिक्री में इस्तेमाल हो चुका है!</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      इस खरीद इनवॉइस के कुछ उत्पादों का वर्तमान स्टॉक, खरीदी गई मात्रा से कम है (अर्थात माल किसानों को बेचा जा चुका है):
                    </p>
                    <div className="bg-white/80 border border-rose-200 rounded-xl p-2 space-y-1.5 max-h-36 overflow-y-auto">
                      {purchaseDepsInfo.soldStockWarnings.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] pb-1 border-b border-rose-100 last:border-b-0">
                          <div>
                            <span className="font-bold text-gray-900">{item.productName}</span>
                            <span className="text-gray-500 ml-1">({item.variantLabel})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-600">खरीदा: {item.boughtQty} | स्टॉक: {item.availableQty}</span>
                            <span className="font-bold text-rose-700 ml-1.5">कमी: -{item.deficit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] font-bold text-rose-900 pt-1">
                      इस इनवॉइस को हटाने या रद्द करने पर संबंधित उत्पाद का स्टॉक कम होगा और ऐतिहासिक हिसाब प्रभावित होगा।
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-emerald-950">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>स्टॉक सत्यापन सफल</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      इस इनवॉइस के सभी {targetPurchaseToDelete.items?.length || 0} उत्पादों एवं पैकेजिंग साइज का स्टॉक सुरक्षित रूप से इन्वेंट्री से घटा दिया जाएगा।
                    </p>
                  </div>
                )}

                {/* 2. FINANCIAL / LEDGER REVERSAL EXPLANATION */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-1.5 text-blue-950">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <RotateCcw className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>लेजर व कैश-फ्लो समायोजन (Reversal Details)</span>
                  </div>
                  <ul className="text-[11px] text-blue-900 list-disc list-inside space-y-0.5">
                    <li>
                      सप्लायर <strong>'{targetPurchaseToDelete.supplierName}'</strong> के खाते से ₹{(targetPurchaseToDelete.unpaidSupplierUdhari || targetPurchaseToDelete.grandTotal).toLocaleString()} का उधारी बकाया लेजर में रिवर्स (Contra Debit) होगा।
                    </li>
                    {(targetPurchaseToDelete.paidAmount || 0) > 0 && (
                      <li>
                        खरीद के समय दिया गया ₹{(targetPurchaseToDelete.paidAmount || 0).toLocaleString()} का नकद/ऑनलाइन खर्च (Expense) भी व्यय सूची से रिवर्स किया जाएगा।
                      </li>
                    )}
                  </ul>
                </div>

                {/* 3. MODE SELECTION */}
                {!(targetPurchaseToDelete.isCancelled || targetPurchaseToDelete.status === 'cancelled') ? (
                  <div className="space-y-2">
                    <label className="font-bold text-gray-700 block">कार्यवाही का प्रकार चुनें:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div
                        onClick={() => setPurchaseDeleteMode('cancel')}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                          purchaseDeleteMode === 'cancel'
                            ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                          <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>सुरक्षित रद्द करें (Cancel / Void)</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                          इनवॉइस पर 'रद्द' का लाल बैज लग जाएगा। स्टॉक और लेजर रिवर्स होंगे, बिल नंबर रिकॉर्ड में सुरक्षित रहेगा।
                        </p>
                        <span className="mt-2 inline-block text-[9px] bg-emerald-200/80 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                          ★ अनुशंसित (Recommended)
                        </span>
                      </div>

                      <div
                        onClick={() => setPurchaseDeleteMode('permanent')}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                          purchaseDeleteMode === 'permanent'
                            ? 'border-rose-600 bg-rose-50/70 shadow-sm'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                          <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>स्थायी हटाएं (Permanent Delete)</span>
                        </div>
                        <p className="text-[10px] text-rose-700 mt-1 leading-snug">
                          इनवॉइस रिकॉर्ड डेटाबेस से पूरी तरह मिट जाएगा। स्टॉक और लेजर रिवर्स होंगे।
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-1">
                    <p className="font-bold">यह इनवॉइस पहले ही रद्द (Cancelled) है।</p>
                    <p className="text-[11px]">
                      अब आप इसे डेटाबेस से स्थायी रूप से हटा सकते हैं।
                    </p>
                  </div>
                )}

                {/* Permanent Delete Confirmation Input */}
                {purchaseDeleteMode === 'permanent' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                    <p className="text-rose-900 font-bold">
                      पुष्टिकरण आवश्यक: स्थायी हटाने के लिए नीचे <strong>"हटाएं"</strong> टाइप करें:
                    </p>
                    <input
                      type="text"
                      value={purchaseConfirmText}
                      onChange={e => setPurchaseConfirmText(e.target.value)}
                      placeholder='यहाँ "हटाएं" टाइप करें'
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                {/* Audit Reason Input */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700 block">
                    रद्द / हटाने का कारण (Audit Reason) <span className="text-rose-600">*</span>:
                  </label>
                  <input
                    type="text"
                    value={purchaseDeleteReason}
                    onChange={e => setPurchaseDeleteReason(e.target.value)}
                    placeholder="उदा. सप्लायर को माल वापस भेजा / बिल में गलत प्रविष्टि / डुप्लीकेट इनवॉइस"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-gray-400">
                    यह कारण एवं एडमिन आईडी ({user?.email || 'admin'}) स्थायी रूप से ऑडिट लॉग में दर्ज की जाएगी।
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowDeletePurchaseModal(false)}
                    disabled={isDeletingPurchase}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeletePurchase}
                    disabled={
                      isDeletingPurchase ||
                      !purchaseDeleteReason.trim() ||
                      (purchaseDeleteMode === 'permanent' && purchaseConfirmText.trim() !== 'हटाएं')
                    }
                    className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      purchaseDeleteMode === 'cancel'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {isDeletingPurchase ? (
                      <>प्रक्रिया जारी है...</>
                    ) : purchaseDeleteMode === 'cancel' ? (
                      <>
                        <Ban className="w-3.5 h-3.5" /> सुरक्षित रद्द करें (Cancel / Void)
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" /> स्थायी रूप से हटाएं
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPurchases;
