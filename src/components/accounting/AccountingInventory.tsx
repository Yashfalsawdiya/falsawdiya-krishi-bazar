import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Search, Plus, AlertTriangle, Edit3, Trash2, 
  RefreshCw, TrendingUp, DollarSign, Layers, ArrowUpDown, X, CheckCircle2,
  Droplet, Scale, Calendar, ShieldAlert, Clock, Boxes, ChevronDown, ChevronUp,
  AlertCircle, Sparkles
} from 'lucide-react';
import { 
  AccountingProduct, 
  PackagingVariant, 
  PackagingType, 
  SizeUnit,
  StockBatch 
} from '../../types/accounting';
import { 
  fetchAccountingProducts, 
  saveAccountingProduct, 
  deleteAccountingProduct,
  openSealedPack,
  adjustProductStock
} from '../../services/accountingService';
import { 
  normalizeToBaseUnit, 
  formatBaseUnitDisplay, 
  calculateExpiryAlert, 
  getProductVariants, 
  calculateTotalEquivalentStock 
} from '../../utils/agriPackagingUtils';

export const AccountingInventory: React.FC = () => {
  const [products, setProducts] = useState<AccountingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'expiry_4m' | 'expired' | 'loose'>('all');
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AccountingProduct | null>(null);
  
  // Product Form State
  const [formHindiName, setFormHindiName] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('pesticides');
  const [formProductType, setFormProductType] = useState<'liquid' | 'powder_granule' | 'other'>('liquid');
  const [formHsnCode, setFormHsnCode] = useState('');
  const [formDosePerTank, setFormDosePerTank] = useState<number | ''>('');
  const [formDoseUnit, setFormDoseUnit] = useState<'ml' | 'g'>('ml');
  const [formDoseTargetCrops, setFormDoseTargetCrops] = useState('');
  const [formDoseWarning, setFormDoseWarning] = useState('');

  // Variants in Form
  const [formVariants, setFormVariants] = useState<PackagingVariant[]>([]);

  // Open Pack Modal State
  const [packOpenProduct, setPackOpenProduct] = useState<AccountingProduct | null>(null);
  const [selectedVariantIdToOpen, setSelectedVariantIdToOpen] = useState<string>('');
  const [packsToOpenCount, setPacksToOpenCount] = useState<number>(1);
  const [isOpenPackSubmitting, setIsOpenPackSubmitting] = useState(false);

  // Stock Adjust Modal
  const [adjustingProduct, setAdjustingProduct] = useState<AccountingProduct | null>(null);
  const [adjustTargetType, setAdjustTargetType] = useState<'variant' | 'loose'>('variant');
  const [selectedVariantIdToAdjust, setSelectedVariantIdToAdjust] = useState<string>('');
  const [stockAdjustQty, setStockAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustReason, setAdjustReason] = useState('शारीरिक स्टॉक मिलान (Physical Audit)');
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchAccountingProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const toggleProductExpand = (id: string) => {
    setExpandedProductIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Pre-calculate expiry and stock status for all products
  const enrichedProducts = useMemo(() => {
    return products.map(p => {
      const variants = getProductVariants(p);
      const totalStockPacks = variants.reduce((sum, v) => sum + (v.currentStockPacks || 0), 0);
      const hasLoose = (p.looseStock?.availableBaseQty || 0) > 0;
      
      // Check nearest expiry across top-level expiryDate or batches
      let nearestDays = 9999;
      let worstStatus: 'expired' | 'critical' | 'warning' | 'fresh' | 'no_date' = 'no_date';
      let nearestExpiryDate = p.expiryDate;

      const datesToCheck: string[] = [];
      if (p.expiryDate) datesToCheck.push(p.expiryDate);
      if (p.batches) {
        p.batches.forEach(b => {
          if (b.expiryDate && (b.remainingPackQuantity > 0 || b.remainingPackQuantity === undefined)) {
            datesToCheck.push(b.expiryDate);
          }
        });
      }

      for (const d of datesToCheck) {
        const expResult = calculateExpiryAlert(d);
        if (expResult.status === 'expired') {
          worstStatus = 'expired';
          nearestDays = expResult.daysRemaining;
          nearestExpiryDate = d;
          break;
        } else if (expResult.status === 'critical') {
          worstStatus = 'critical';
          nearestDays = expResult.daysRemaining;
          nearestExpiryDate = d;
        } else if (expResult.status === 'warning' && worstStatus !== 'critical') {
          worstStatus = 'warning';
          nearestDays = expResult.daysRemaining;
          nearestExpiryDate = d;
        } else if (worstStatus === 'no_date') {
          worstStatus = expResult.status;
          nearestDays = expResult.daysRemaining;
          nearestExpiryDate = d;
        }
      }

      const expiryAlert = calculateExpiryAlert(nearestExpiryDate);
      const isExpiringWithin4Months = worstStatus === 'warning' || worstStatus === 'critical';
      const isExpired = worstStatus === 'expired';
      const eqStock = calculateTotalEquivalentStock(p);

      return {
        ...p,
        resolvedVariants: variants,
        totalStockPacks,
        hasLoose,
        worstExpiryStatus: worstStatus,
        expiryAlert,
        isExpiringWithin4Months,
        isExpired,
        equivalentStock: eqStock,
      };
    });
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return enrichedProducts.filter(p => {
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        p.hindiName?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        (p.customId && p.customId.toLowerCase().includes(q)) ||
        (p.batchNo && p.batchNo.toLowerCase().includes(q))
      );

      if (!matchesCat || !matchesSearch) return false;

      if (stockFilter === 'low') {
        const isLowSealed = (p.totalStockPacks || 0) <= (p.minStockAlert || 5) && (p.totalStockPacks || 0) > 0;
        return isLowSealed;
      }
      if (stockFilter === 'out') {
        return (p.totalStockPacks || 0) <= 0 && (!p.looseStock || p.looseStock.availableBaseQty <= 0);
      }
      if (stockFilter === 'expiry_4m') {
        return p.isExpiringWithin4Months;
      }
      if (stockFilter === 'expired') {
        return p.isExpired;
      }
      if (stockFilter === 'loose') {
        return p.hasLoose;
      }
      return true;
    });
  }, [enrichedProducts, categoryFilter, searchQuery, stockFilter]);

  // Summary Metrics
  const inventoryMetrics = useMemo(() => {
    const totalItems = products.length;
    let totalValuationCost = 0;
    let totalValuationSelling = 0;
    let lowStockCount = 0;
    let expiringWithin4MonthsCount = 0;
    let expiredCount = 0;
    let looseProductsCount = 0;

    enrichedProducts.forEach(p => {
      if (p.isExpired) expiredCount++;
      if (p.isExpiringWithin4Months) expiringWithin4MonthsCount++;
      if (p.hasLoose) looseProductsCount++;
      if ((p.totalStockPacks || 0) <= (p.minStockAlert || 5)) lowStockCount++;

      // Sum valuation from variants
      for (const v of p.resolvedVariants) {
        totalValuationCost += (v.currentStockPacks || 0) * (v.costPrice || 0);
        totalValuationSelling += (v.currentStockPacks || 0) * (v.sellingPrice || 0);
      }
      if (p.looseStock && p.looseStock.availableBaseQty > 0) {
        totalValuationCost += p.looseStock.availableBaseQty * (p.looseStock.costPerBaseUnit || 0);
        totalValuationSelling += p.looseStock.availableBaseQty * (p.looseStock.sellingPricePerBaseUnit || 0);
      }
    });

    const potentialProfit = Math.max(0, totalValuationSelling - totalValuationCost);

    return { 
      totalItems, 
      totalValuationCost: Math.round(totalValuationCost), 
      totalValuationSelling: Math.round(totalValuationSelling), 
      potentialProfit: Math.round(potentialProfit), 
      lowStockCount,
      expiringWithin4MonthsCount,
      expiredCount,
      looseProductsCount
    };
  }, [products, enrichedProducts]);

  // Initialize Edit Modal
  const openEditModal = (p: AccountingProduct) => {
    setEditingProduct(p);
    setFormHindiName(p.hindiName);
    setFormName(p.name);
    setFormCategory(p.category || 'pesticides');
    setFormHsnCode(p.hsnCode || '');

    const isLiquid = p.unit === 'Ltr' || p.unit === 'Ml' || p.productType === 'liquid';
    const isPowder = p.unit === 'Kg' || p.unit === 'Gram' || p.productType === 'powder_granule';
    setFormProductType(isLiquid ? 'liquid' : isPowder ? 'powder_granule' : 'other');

    if (p.standardDoseInfo) {
      setFormDosePerTank(p.standardDoseInfo.verifiedDosePer20LTank || '');
      setFormDoseUnit(p.standardDoseInfo.doseUnit || (isLiquid ? 'ml' : 'g'));
      setFormDoseTargetCrops(p.standardDoseInfo.targetCrops || '');
      setFormDoseWarning(p.standardDoseInfo.warningNote || '');
    } else {
      setFormDosePerTank('');
      setFormDoseUnit(isLiquid ? 'ml' : 'g');
      setFormDoseTargetCrops('');
      setFormDoseWarning('');
    }

    const variants = getProductVariants(p);
    setFormVariants(variants.map(v => ({ ...v })));
    setShowProductModal(true);
  };

  // Initialize Add Modal
  const openAddModal = () => {
    setEditingProduct(null);
    setFormHindiName('');
    setFormName('');
    setFormCategory('pesticides');
    setFormProductType('liquid');
    setFormHsnCode('');
    setFormDosePerTank('');
    setFormDoseUnit('ml');
    setFormDoseTargetCrops('');
    setFormDoseWarning('');

    // Default 1 standard variant
    setFormVariants([
      {
        id: `var_init_${Date.now()}`,
        sizeValue: 1,
        sizeUnit: 'Ltr',
        packagingType: 'Bottle',
        label: '1 Ltr Bottle',
        baseQuantity: 1000,
        costPrice: 0,
        sellingPrice: 0,
        currentStockPacks: 0,
        minStockAlertPacks: 5,
        allowLooseSale: true,
      }
    ]);
    setShowProductModal(true);
  };

  // Add Packaging Variant to Form
  const addVariantToForm = (presetSize?: { val: number; unit: SizeUnit; type: PackagingType }) => {
    const sizeVal = presetSize ? presetSize.val : (formProductType === 'liquid' ? 500 : 500);
    const sizeUnit: SizeUnit = presetSize ? presetSize.unit : (formProductType === 'liquid' ? 'ml' : 'g');
    const packType: PackagingType = presetSize ? presetSize.type : (formProductType === 'liquid' ? 'Bottle' : 'Packet');
    const baseQty = normalizeToBaseUnit(sizeVal, sizeUnit);

    const newVar: PackagingVariant = {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sizeValue: sizeVal,
      sizeUnit: sizeUnit,
      packagingType: packType,
      label: `${sizeVal} ${sizeUnit} ${packType}`,
      baseQuantity: baseQty,
      costPrice: 0,
      sellingPrice: 0,
      currentStockPacks: 0,
      minStockAlertPacks: 5,
      allowLooseSale: true,
    };
    setFormVariants(prev => [...prev, newVar]);
  };

  const updateFormVariant = (index: number, field: keyof PackagingVariant, value: any) => {
    setFormVariants(prev => {
      const copy = [...prev];
      const updated = { ...copy[index], [field]: value };
      if (field === 'sizeValue' || field === 'sizeUnit' || field === 'packagingType') {
        const sVal = Number(updated.sizeValue) || 0;
        const sUnit = updated.sizeUnit || 'ml';
        updated.baseQuantity = normalizeToBaseUnit(sVal, sUnit);
        updated.label = `${sVal} ${sUnit} ${updated.packagingType || ''}`.trim();
      }
      copy[index] = updated;
      return copy;
    });
  };

  const removeFormVariant = (index: number) => {
    if (formVariants.length <= 1) {
      alert('कम से कम एक पैकेजिंग वेरिएंट होना अनिवार्य है।');
      return;
    }
    setFormVariants(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHindiName.trim()) {
      alert('कृपया उत्पाद का हिंदी नाम दर्ज करें।');
      return;
    }
    if (formVariants.length === 0) {
      alert('कृपया कम से कम एक पैकेजिंग वेरिएंट जोड़ें।');
      return;
    }

    try {
      // Calculate top-level aggregate fields for backward compatibility
      const totalPacks = formVariants.reduce((sum, v) => sum + (Number(v.currentStockPacks) || 0), 0);
      const firstVar = formVariants[0];
      const avgCost = formVariants.reduce((sum, v) => sum + (Number(v.costPrice) || 0), 0) / formVariants.length;
      const primarySelling = firstVar.sellingPrice || 0;

      const doseInfo = (formDosePerTank !== '' && Number(formDosePerTank) > 0) ? {
        verifiedDosePer20LTank: Number(formDosePerTank),
        doseUnit: formDoseUnit,
        targetCrops: formDoseTargetCrops.trim(),
        warningNote: formDoseWarning.trim() || 'कृपया उत्पाद लेबल पर दिए अनुमोदित निर्देशों को सत्यापित करें।',
      } : undefined;

      await saveAccountingProduct({
        hindiName: formHindiName.trim(),
        name: formName.trim() || formHindiName.trim(),
        category: formCategory,
        productType: formProductType,
        unit: firstVar.sizeUnit === 'Ltr' || firstVar.sizeUnit === 'ml' ? 'Bottle' : (firstVar.sizeUnit === 'kg' ? 'Bag' : 'Packet'),
        currentStock: totalPacks,
        minStockAlert: firstVar.minStockAlertPacks || 5,
        costPrice: Math.round(avgCost * 100) / 100,
        defaultSellingPrice: primarySelling,
        hsnCode: formHsnCode.trim(),
        packagingVariants: formVariants,
        hasMultipleVariants: formVariants.length > 1,
        standardDoseInfo: doseInfo,
        looseStock: editingProduct?.looseStock,
        batches: editingProduct?.batches,
        batchNo: editingProduct?.batchNo,
        expiryDate: editingProduct?.expiryDate,
        manufacturingDate: editingProduct?.manufacturingDate,
      }, editingProduct?.id);

      await loadProducts();
      setShowProductModal(false);
      setEditingProduct(null);
    } catch (err: any) {
      alert('उत्पाद सुरक्षित करने में त्रुटि: ' + err.message);
    }
  };

  // Open Pack Action
  const handleOpenPackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packOpenProduct || !selectedVariantIdToOpen) return;

    setIsOpenPackSubmitting(true);
    try {
      const res = await openSealedPack(packOpenProduct.id, selectedVariantIdToOpen, Number(packsToOpenCount) || 1);
      alert(res.message);
      await loadProducts();
      setPackOpenProduct(null);
      setSelectedVariantIdToOpen('');
      setPacksToOpenCount(1);
    } catch (err: any) {
      alert('पैकेट खोलने में त्रुटि: ' + err.message);
    } finally {
      setIsOpenPackSubmitting(false);
    }
  };

  // Stock Adjustment Action
  const handleApplyStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    setIsAdjustSubmitting(true);
    try {
      await adjustProductStock({
        productId: adjustingProduct.id,
        variantId: adjustTargetType === 'variant' ? selectedVariantIdToAdjust : undefined,
        isLooseStock: adjustTargetType === 'loose',
        adjustType,
        quantity: Number(stockAdjustQty),
        reason: adjustReason.trim(),
      });

      await loadProducts();
      setAdjustingProduct(null);
      setStockAdjustQty(0);
      alert('स्टॉक सफलतापूर्वक अपडेट हो गया!');
    } catch (err: any) {
      alert('स्टॉक अपडेट करने में त्रुटि: ' + err.message);
    } finally {
      setIsAdjustSubmitting(false);
    }
  };

  const handleDelete = async (productId: string, name: string) => {
    if (!window.confirm(`क्या आप वाकई "${name}" को इन्वेंट्री से हटाना चाहते हैं?`)) return;
    try {
      await deleteAccountingProduct(productId);
      await loadProducts();
    } catch (err: any) {
      alert('डिलीट करने में त्रुटि: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">कृषि इन्वेंट्री व स्टॉक नियंत्रण</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              मल्टी-पैकेजिंग + खुला स्टॉक
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            100ml से 20L, 50g से 50kg बैग, 4-महीने एक्सपायरी अलर्ट एवं खुला (Loose) स्टॉक प्रबंधन
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="रिफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-bold hover:bg-[#23461e] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ नया उत्पाद जोड़ें</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div 
          onClick={() => setStockFilter('all')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            stockFilter === 'all' ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">कुल उत्पाद</span>
            <Boxes className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{inventoryMetrics.totalItems}</p>
          <span className="text-[10px] text-gray-400">सभी श्रेणियां</span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">स्टॉक मूल्यांकन (Cost)</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-700" />
          </div>
          <p className="text-lg font-black text-gray-900 mt-1">₹{inventoryMetrics.totalValuationCost.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-700 font-bold">विक्रय: ₹{inventoryMetrics.totalValuationSelling.toLocaleString('en-IN')}</span>
        </div>

        {/* 4-Month Expiry Alert Card */}
        <div 
          onClick={() => setStockFilter('expiry_4m')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            stockFilter === 'expiry_4m' ? 'bg-amber-100 border-amber-400' : 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              4 माह में एक्सपायरी
            </span>
            <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded">Alert</span>
          </div>
          <p className="text-xl font-black text-amber-900 mt-1">{inventoryMetrics.expiringWithin4MonthsCount}</p>
          <span className="text-[10px] text-amber-800 font-semibold">प्राथमिकता से बेचें</span>
        </div>

        {/* Expired Stock Alert Card */}
        <div 
          onClick={() => setStockFilter('expired')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            stockFilter === 'expired' ? 'bg-red-100 border-red-400' : 'bg-red-50/70 border-red-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-900 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
              एक्सपायर्ड स्टॉक
            </span>
            <span className="bg-red-200 text-red-900 text-[10px] font-black px-1.5 py-0.5 rounded">Block</span>
          </div>
          <p className="text-xl font-black text-red-900 mt-1">{inventoryMetrics.expiredCount}</p>
          <span className="text-[10px] text-red-800 font-semibold">बिक्री पर रोक</span>
        </div>

        {/* Loose Stock Items Card */}
        <div 
          onClick={() => setStockFilter('loose')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            stockFilter === 'loose' ? 'bg-sky-100 border-sky-400' : 'bg-sky-50/70 border-sky-200 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-900 flex items-center gap-1">
              <Droplet className="w-3.5 h-3.5 text-sky-700" />
              खुला स्टॉक (Loose)
            </span>
          </div>
          <p className="text-xl font-black text-sky-900 mt-1">{inventoryMetrics.looseProductsCount}</p>
          <span className="text-[10px] text-sky-800 font-semibold">ग्राम / मिलीलीटर में</span>
        </div>

        {/* Low Stock Alert Card */}
        <div 
          onClick={() => setStockFilter('low')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            stockFilter === 'low' ? 'bg-rose-100 border-rose-400' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-600">कम स्टॉक</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-700 mt-1">{inventoryMetrics.lowStockCount}</p>
          <span className="text-[10px] text-gray-400">री-ऑर्डर की जरूरत</span>
        </div>
      </div>

      {/* FILTER CONTROLS & SEARCH */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="उत्पाद का नाम, टेक्निकल नाम, बैच नंबर खोजें..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none"
          >
            <option value="all">सभी श्रेणियां (All Categories)</option>
            <option value="pesticides">कीटनाशक (Pesticides)</option>
            <option value="fertilizers">खाद व पोषण (Fertilizers)</option>
            <option value="seeds">बीज (Seeds)</option>
            <option value="fungicides">फफूंदनाशी (Fungicides)</option>
            <option value="herbicides">खरपतवारनाशी (Herbicides)</option>
            <option value="medicines">टॉनिक व PGR</option>
            <option value="implements">कृषि उपकरण</option>
            <option value="other">अन्य</option>
          </select>

          {/* Quick Filter Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold shrink-0">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                stockFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              सभी
            </button>
            <button
              onClick={() => setStockFilter('expiry_4m')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                stockFilter === 'expiry_4m' ? 'bg-white text-amber-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-600" />
              <span>4 माह अलर्ट</span>
            </button>
            <button
              onClick={() => setStockFilter('expired')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                stockFilter === 'expired' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-red-600" />
              <span>एक्सपायर्ड</span>
            </button>
            <button
              onClick={() => setStockFilter('loose')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                stockFilter === 'loose' ? 'bg-white text-sky-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Droplet className="w-3 h-3 text-sky-600" />
              <span>खुला (Loose)</span>
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                stockFilter === 'low' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              कम स्टॉक
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCTS TABLE / CARDS */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">उत्पाद व टेक्निकल विवरण</th>
                <th className="py-3.5 px-3">पैकेजिंग वेरिएंट्स व स्टॉक (Packs)</th>
                <th className="py-3.5 px-3">खुला स्टॉक (Loose)</th>
                <th className="py-3.5 px-3">एक्सपायरी अलर्ट (Batch / Expiry)</th>
                <th className="py-3.5 px-3 text-right">त्वरित एक्शन</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    कोई उत्पाद नहीं मिला। नया उत्पाद जोड़ने के लिए ऊपर <strong>"+ नया उत्पाद जोड़ें"</strong> दबाएं।
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isExpanded = expandedProductIds[p.id];
                  const hasLoose = (p.looseStock?.availableBaseQty || 0) > 0;
                  const looseDisplay = formatBaseUnitDisplay(p.looseStock?.availableBaseQty || 0, p.looseStock?.baseUnit || 'ml');

                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        {/* Column 1: Product Name & Category */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => toggleProductExpand(p.id)}
                              className="mt-0.5 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                              title="वेरिएंट्स विस्तार से देखें"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <div>
                              <div className="font-extrabold text-gray-900 text-sm">{p.hindiName}</div>
                              <div className="text-[11px] text-gray-500">{p.name}</div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold rounded text-[10px]">
                                  {p.category}
                                </span>
                                {p.productType && (
                                  <span className="text-[10px] text-gray-500">
                                    · {p.productType === 'liquid' ? 'तरल (Liquid)' : 'पाउडर / दानेदार'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Packaging Variants & Sealed Stock */}
                        <td className="py-3.5 px-3 align-top">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {p.resolvedVariants.map((v, i) => {
                              const isOutOfStock = (v.currentStockPacks || 0) <= 0;
                              return (
                                <span
                                  key={v.id || i}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border ${
                                    isOutOfStock 
                                      ? 'bg-red-50 text-red-700 border-red-200' 
                                      : 'bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold'
                                  }`}
                                >
                                  <span>{v.label}</span>
                                  <span className="font-black">({v.currentStockPacks || 0})</span>
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 font-medium">
                            कुल सीलबंद: <strong className="text-gray-900">{p.totalStockPacks} पैकेट</strong>
                          </div>
                        </td>

                        {/* Column 3: Loose Stock Pool */}
                        <td className="py-3.5 px-3 align-top">
                          {hasLoose ? (
                            <div className="p-1.5 bg-sky-50 border border-sky-200 rounded-xl inline-block">
                              <div className="flex items-center gap-1 text-sky-900 font-bold text-xs">
                                <Droplet className="w-3.5 h-3.5 text-sky-600" />
                                <span>{looseDisplay}</span>
                              </div>
                              <div className="text-[10px] text-sky-800 mt-0.5">
                                ₹{p.looseStock?.costPerBaseUnit || 0}/{p.looseStock?.baseUnit || 'ml'} (लागत)
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">खुला स्टॉक नहीं</span>
                          )}
                        </td>

                        {/* Column 4: Expiry Status & Batch */}
                        <td className="py-3.5 px-3 align-top">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${p.expiryAlert.badgeClass}`}>
                              {p.isExpired ? <ShieldAlert className="w-3 h-3" /> : p.isExpiringWithin4Months ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span>{p.expiryAlert.labelHindi}</span>
                            </span>
                            {p.batchNo && (
                              <div className="text-[10px] text-gray-500 font-mono">
                                बैच: {p.batchNo}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Column 5: Action Buttons */}
                        <td className="py-3.5 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Open Pack Button */}
                            <button
                              onClick={() => {
                                setPackOpenProduct(p);
                                const firstAvailable = p.resolvedVariants.find(v => (v.currentStockPacks || 0) > 0);
                                setSelectedVariantIdToOpen(firstAvailable?.id || p.resolvedVariants[0]?.id || '');
                                setPacksToOpenCount(1);
                              }}
                              className="px-2 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                              title="सीलबंद पैकेट खोलकर खुला स्टॉक बनाएं"
                            >
                              <Droplet className="w-3 h-3 text-sky-600" />
                              <span>पैकेट खोलें</span>
                            </button>

                            {/* Adjust Stock Button */}
                            <button
                              onClick={() => {
                                setAdjustingProduct(p);
                                setAdjustTargetType('variant');
                                setSelectedVariantIdToAdjust(p.resolvedVariants[0]?.id || '');
                                setStockAdjustQty(0);
                                setAdjustType('add');
                              }}
                              className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold"
                              title="स्टॉक एडजस्टमेंट (तौल कमी / मिलान)"
                            >
                              <Scale className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200"
                              title="उत्पाद व पैकेजिंग संपादित करें"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(p.id, p.hindiName)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="हटाएं"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED ACCORDION: DETAIL PER VARIANT & DOSE INFO */}
                      {isExpanded && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={5} className="p-3 pl-12">
                            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                                  पैकेजिंग वेरिएंट्स का पूरा ब्यौरा (Pack Sizes & Rates)
                                </span>
                                {p.standardDoseInfo && (
                                  <span className="text-[11px] text-gray-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                                    प्रमाणित डोज़: <strong>{p.standardDoseInfo.verifiedDosePer20LTank} {p.standardDoseInfo.doseUnit || 'ml'}</strong> प्रति 20L पंप
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                {p.resolvedVariants.map(v => (
                                  <div key={v.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                                    <div className="font-extrabold text-gray-900 flex items-center justify-between">
                                      <span>{v.label}</span>
                                      <span className="text-emerald-800">स्टॉक: {v.currentStockPacks || 0}</span>
                                    </div>
                                    <div className="mt-1 space-y-0.5 text-[11px] text-gray-600">
                                      <div>खरीद भाव (Cost): ₹{v.costPrice}</div>
                                      <div>बिक्री भाव (Selling): ₹{v.sellingPrice}</div>
                                      <div className="text-emerald-700 font-bold">
                                        मार्जिन: ₹{Math.max(0, v.sellingPrice - v.costPrice)} ({v.sellingPrice > 0 ? Math.round(((v.sellingPrice - v.costPrice) / v.sellingPrice) * 100) : 0}%)
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT PRODUCT & MULTI-PACKAGING VARIANTS */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">
                  {editingProduct ? 'उत्पाद व पैकेजिंग वेरिएंट्स संपादित करें' : 'इन्वेंट्री में नया उत्पाद जोड़ें'}
                </h3>
                <p className="text-xs text-gray-500">कृषि इनपुट के लिए अलग-अलग साइज (100ml, 250ml, 1L, 1kg आदि) कॉन्फ़िगर करें</p>
              </div>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* SECTION A: BASIC INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">उत्पाद का हिंदी नाम *</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. रोकेट (Profenofos 40% + Cypermethrin 4%)"
                    value={formHindiName}
                    onChange={e => setFormHindiName(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">अंग्रेज़ी / टेक्निकल नाम</label>
                  <input
                    type="text"
                    placeholder="उदा. Roket (PI Industries)"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">श्रेणी (Category)</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700"
                  >
                    <option value="pesticides">कीटनाशक (Pesticides)</option>
                    <option value="fertilizers">खाद (Fertilizers)</option>
                    <option value="seeds">बीज (Seeds)</option>
                    <option value="fungicides">फफूंदनाशी (Fungicides)</option>
                    <option value="herbicides">खरपतवारनाशी (Herbicides)</option>
                    <option value="medicines">टॉनिक व वृद्धि वर्धक</option>
                    <option value="implements">कृषि उपकरण</option>
                    <option value="other">अन्य</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">उत्पाद रूप (Product Form)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormProductType('liquid');
                        setFormDoseUnit('ml');
                      }}
                      className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 ${
                        formProductType === 'liquid' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <Droplet className="w-3.5 h-3.5" />
                      <span>तरल (Liquid)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormProductType('powder_granule');
                        setFormDoseUnit('g');
                      }}
                      className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 ${
                        formProductType === 'powder_granule' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>पाउडर / दानेदार</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION B: PACKAGING VARIANTS BUILDER */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-extrabold text-gray-900 text-xs block">पैकेजिंग साइज वेरिएंट्स (Pack Sizes)</span>
                    <span className="text-[11px] text-gray-500">अलग-अलग साइज की खरीद और बिक्री दर तय करें</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Quick Preset Buttons */}
                    {formProductType === 'liquid' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 100, unit: 'ml', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 100ml
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 250, unit: 'ml', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 250ml
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 500, unit: 'ml', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 500ml
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 1, unit: 'Ltr', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 1L
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 100, unit: 'g', type: 'Packet' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 100g
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 250, unit: 'g', type: 'Packet' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 250g
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 1, unit: 'kg', type: 'Bag' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 1kg
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => addVariantToForm()}
                      className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ नई पैकेजिंग</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formVariants.map((v, idx) => (
                    <div key={v.id || idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 block mb-0.5">साइज व पैकेजिंग प्रकार</label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="any"
                            required
                            value={v.sizeValue}
                            onChange={e => updateFormVariant(idx, 'sizeValue', Number(e.target.value))}
                            className="w-16 p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-center"
                          />
                          <select
                            value={v.sizeUnit}
                            onChange={e => updateFormVariant(idx, 'sizeUnit', e.target.value)}
                            className="p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-[11px]"
                          >
                            <option value="ml">ml</option>
                            <option value="Ltr">Ltr</option>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="Piece">नग</option>
                          </select>
                          <select
                            value={v.packagingType}
                            onChange={e => updateFormVariant(idx, 'packagingType', e.target.value)}
                            className="p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-[11px]"
                          >
                            <option value="Bottle">बोतल</option>
                            <option value="Pouch">पाउच</option>
                            <option value="Packet">पैकेट</option>
                            <option value="Bag">कट्टा/बैग</option>
                            <option value="Can">केन</option>
                            <option value="Bucket">बाल्टी</option>
                            <option value="Box">बॉक्स</option>
                            <option value="Other">अन्य</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-0.5">खरीद दर (Cost) ₹</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={v.costPrice}
                          onChange={e => updateFormVariant(idx, 'costPrice', Number(e.target.value))}
                          className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-purple-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-0.5">बिक्री दर (Sale) ₹</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={v.sellingPrice}
                          onChange={e => updateFormVariant(idx, 'sellingPrice', Number(e.target.value))}
                          className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-emerald-800"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-0.5">सीलबंद स्टॉक (Packs)</label>
                        <input
                          type="number"
                          required
                          value={v.currentStockPacks}
                          onChange={e => updateFormVariant(idx, 'currentStockPacks', Number(e.target.value))}
                          className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-extrabold text-gray-900"
                        />
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => removeFormVariant(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                          title="इस साइज को हटाएं"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION C: DOSE ASSISTANT CONFIGURATION (OPTIONAL) */}
              <div className="border-t border-gray-200 pt-3">
                <span className="font-extrabold text-gray-900 text-xs block mb-1">
                  प्रमाणित डोज़ सहायक (Dose Recommendation for POS)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-0.5">20L पंप डोज़ ({formDoseUnit})</label>
                    <input
                      type="number"
                      placeholder="उदा. 40"
                      value={formDosePerTank}
                      onChange={e => setFormDosePerTank(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-0.5">लक्षित फसलें</label>
                    <input
                      type="text"
                      placeholder="उदा. कपास, सोयाबीन, मिर्च"
                      value={formDoseTargetCrops}
                      onChange={e => setFormDoseTargetCrops(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-0.5">सुरक्षा निर्देश</label>
                    <input
                      type="text"
                      placeholder="उदा. शाम के समय स्प्रे करें"
                      value={formDoseWarning}
                      onChange={e => setFormDoseWarning(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#2D5A27] text-white rounded-xl font-extrabold text-sm shadow-sm hover:bg-[#23461e] active:scale-95 transition-all mt-3"
              >
                उत्पाद सुरक्षित करें
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PACK OPEN MODAL */}
      {packOpenProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">सीलबंद पैकेट खोलें (Pack Open)</h3>
                <p className="text-xs text-gray-500">{packOpenProduct.hindiName}</p>
              </div>
              <button onClick={() => setPackOpenProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenPackSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">कौनसा साइज खोलना है?</label>
                <select
                  value={selectedVariantIdToOpen}
                  onChange={e => setSelectedVariantIdToOpen(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800"
                >
                  {packOpenProduct.packagingVariants?.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.label} — उपलब्ध सीलबंद: {v.currentStockPacks || 0} पैकेट (लागत: ₹{v.costPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">कितने पैकेट खोलने हैं?</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={packsToOpenCount}
                  onChange={e => setPacksToOpenCount(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-extrabold text-base text-center"
                />
              </div>

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-sky-900 font-bold">
                  <Droplet className="w-4 h-4 text-sky-700" />
                  <span>परिणाम: खुला स्टॉक तैयार होगा</span>
                </div>
                <p className="text-sky-800 text-[11px]">
                  यह पैकेट सीलबंद स्टॉक से घटकर <strong>खुले स्टॉक (Loose Pool)</strong> में जमा हो जाएगा, 
                  जिससे किसान को 50g/100g/200ml जैसी खुली मात्रा बेची जा सकेगी।
                </p>
              </div>

              <button
                type="submit"
                disabled={isOpenPackSubmitting}
                className="w-full py-3 bg-[#2D5A27] text-white rounded-xl font-bold text-sm hover:bg-[#23461e] active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {isOpenPackSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>पैकेट खोलें और खुले स्टॉक में जमा करें</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STOCK ADJUSTMENT MODAL */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">स्टॉक एडजस्टमेंट (Audit & Tolerance)</h3>
                <p className="text-xs text-gray-500">{adjustingProduct.hindiName}</p>
              </div>
              <button onClick={() => setAdjustingProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyStockAdjustment} className="space-y-3 text-xs">
              {/* Target Type: Variant vs Loose */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">एडजस्टमेंट का प्रकार चुनें:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustTargetType('variant')}
                    className={`p-2 rounded-xl border text-center font-bold ${
                      adjustTargetType === 'variant' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    सीलबंद पैकेट (Packs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustTargetType('loose')}
                    className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 ${
                      adjustTargetType === 'loose' ? 'bg-sky-50 text-sky-900 border-sky-300' : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Droplet className="w-3.5 h-3.5" />
                    <span>खुला स्टॉक (Loose)</span>
                  </button>
                </div>
              </div>

              {adjustTargetType === 'variant' ? (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">साइज चुनें</label>
                  <select
                    value={selectedVariantIdToAdjust}
                    onChange={e => setSelectedVariantIdToAdjust(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    {getProductVariants(adjustingProduct).map(v => (
                      <option key={v.id} value={v.id}>
                        {v.label} — वर्तमान: {v.currentStockPacks || 0} पैकेट
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2.5 bg-sky-50 rounded-xl text-sky-900">
                  वर्तमान खुला स्टॉक: <strong>{formatBaseUnitDisplay(adjustingProduct.looseStock?.availableBaseQty || 0, adjustingProduct.looseStock?.baseUnit || 'ml')}</strong>
                </div>
              )}

              {/* Adjust Type */}
              <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`p-2 rounded-xl border ${adjustType === 'add' ? 'bg-emerald-700 text-white' : 'bg-gray-50'}`}
                >
                  + जोड़ें (Add)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('subtract')}
                  className={`p-2 rounded-xl border ${adjustType === 'subtract' ? 'bg-red-700 text-white' : 'bg-gray-50'}`}
                >
                  - घटाएं (Minus)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('set')}
                  className={`p-2 rounded-xl border ${adjustType === 'set' ? 'bg-blue-700 text-white' : 'bg-gray-50'}`}
                >
                  सीधा सेट करें
                </button>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  मात्रा ({adjustTargetType === 'loose' ? (adjustingProduct.looseStock?.baseUnit || 'ml/g') : 'पैकेट'})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={stockAdjustQty}
                  onChange={e => setStockAdjustQty(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-extrabold text-center"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">कारण (Audit Reason)</label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                >
                  <option value="शारीरिक स्टॉक मिलान (Physical Audit)">शारीरिक स्टॉक मिलान (Physical Audit)</option>
                  <option value="तौलने में नुकसान / अवशिष्ट कमी (Weighing Loss)">तौलने में नुकसान / अवशिष्ट कमी (Weighing Loss)</option>
                  <option value="फूटा / रिसन / खराब माल (Damage / Leakage)">फूटा / रिसन / खराब माल (Damage / Leakage)</option>
                  <option value="ग्राहक वापसी (Customer Return)">ग्राहक वापसी (Customer Return)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isAdjustSubmitting}
                className="w-full py-3 bg-[#2D5A27] text-white rounded-xl font-bold text-xs hover:bg-[#23461e] active:scale-95 transition-all mt-2"
              >
                {isAdjustSubmitting ? 'अपडेट हो रहा है...' : 'एडजस्टमेंट सुरक्षित करें'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingInventory;
