import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Search, Plus, Edit3, Trash2, 
  RefreshCw, TrendingUp, DollarSign, Layers, X, CheckCircle2,
  Boxes, ChevronDown, ChevronUp, Percent, Sparkles, Tag
} from 'lucide-react';
import { 
  AccountingProduct, 
  PackagingVariant, 
  PackagingType, 
  SizeUnit 
} from '../../types/accounting';
import { 
  fetchAccountingProducts, 
  saveAccountingProduct, 
  deleteAccountingProduct 
} from '../../services/accountingService';
import { 
  normalizeToBaseUnit, 
  getProductVariants 
} from '../../utils/agriPackagingUtils';
import { 
  ProductBasicInfoFields, 
  ACCOUNTING_PRODUCT_CATEGORIES 
} from './ProductBasicInfoFields';

export const AccountingInventory: React.FC = () => {
  const [products, setProducts] = useState<AccountingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
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
  const [formDosePerBigha, setFormDosePerBigha] = useState<number | ''>('');
  const [formDoseBighaUnit, setFormDoseBighaUnit] = useState<string>('kg');
  const [formDoseWarning, setFormDoseWarning] = useState('');

  // Variants in Form
  const [formVariants, setFormVariants] = useState<PackagingVariant[]>([]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchAccountingProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error loading products master:', err);
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

  // Resolved Variants for all products
  const enrichedProducts = useMemo(() => {
    return products.map(p => {
      const variants = getProductVariants(p);
      return {
        ...p,
        resolvedVariants: variants,
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
        (p.hsnCode && p.hsnCode.toLowerCase().includes(q))
      );

      return matchesCat && matchesSearch;
    });
  }, [enrichedProducts, categoryFilter, searchQuery]);

  // Summary Metrics: Total Products, Categories breakdown & Average Margin
  const metrics = useMemo(() => {
    const totalItems = products.length;
    let pesticidesCount = 0;
    let fertilizersCount = 0;
    let seedsCount = 0;
    let otherCount = 0;
    let totalMarginPercentSum = 0;
    let variantCount = 0;

    enrichedProducts.forEach(p => {
      if (p.category === 'pesticides') pesticidesCount++;
      else if (p.category === 'fertilizers') fertilizersCount++;
      else if (p.category === 'seeds') seedsCount++;
      else otherCount++;

      p.resolvedVariants.forEach(v => {
        if (v.sellingPrice > 0 && v.costPrice > 0) {
          const margin = ((v.sellingPrice - v.costPrice) / v.sellingPrice) * 100;
          totalMarginPercentSum += Math.max(0, margin);
          variantCount++;
        }
      });
    });

    const avgMarginPercent = variantCount > 0 ? Math.round(totalMarginPercentSum / variantCount) : 0;

    return { 
      totalItems, 
      pesticidesCount,
      fertilizersCount,
      seedsCount,
      otherCount,
      avgMarginPercent
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
      setFormDosePerBigha(p.standardDoseInfo.verifiedDosePerBigha || '');
      setFormDoseBighaUnit(
        p.standardDoseInfo.doseBighaUnit ||
        (isLiquid ? 'ml' : (p.category === 'fertilizers' ? 'kg' : 'g'))
      );
      setFormDoseWarning(p.standardDoseInfo.warningNote || '');
    } else {
      setFormDosePerTank('');
      setFormDoseUnit(isLiquid ? 'ml' : 'g');
      setFormDosePerBigha('');
      setFormDoseBighaUnit(isLiquid ? 'ml' : (p.category === 'fertilizers' ? 'kg' : 'g'));
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
    setFormDosePerBigha('');
    setFormDoseBighaUnit('ml');
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

  // Handle Save Product (Product Master & Pricing Only - No Stock Quantities Required)
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
      const firstVar = formVariants[0];
      const avgCost = formVariants.reduce((sum, v) => sum + (Number(v.costPrice) || 0), 0) / formVariants.length;
      const primarySelling = firstVar.sellingPrice || 0;

      const doseInfo = (
        (formDosePerTank !== '' && Number(formDosePerTank) > 0) ||
        (formDosePerBigha !== '' && Number(formDosePerBigha) > 0) ||
        formDoseWarning.trim()
      ) ? {
        verifiedDosePer20LTank: (formDosePerTank !== '' && Number(formDosePerTank) > 0) ? Number(formDosePerTank) : undefined,
        doseUnit: formDoseUnit,
        verifiedDosePerBigha: (formDosePerBigha !== '' && Number(formDosePerBigha) > 0) ? Number(formDosePerBigha) : undefined,
        doseBighaUnit: formDoseBighaUnit,
        warningNote: formDoseWarning.trim() || undefined,
      } : undefined;

      // Variants with zeroed stock (stock tracking removed)
      const sanitizedVariants: PackagingVariant[] = formVariants.map(v => ({
        ...v,
        costPrice: Number(v.costPrice) || 0,
        sellingPrice: Number(v.sellingPrice) || 0,
        currentStockPacks: 0,
      }));

      await saveAccountingProduct({
        hindiName: formHindiName.trim(),
        name: formName.trim() || formHindiName.trim(),
        category: formCategory,
        productType: formProductType,
        unit: firstVar.sizeUnit === 'Ltr' || firstVar.sizeUnit === 'ml' ? 'Bottle' : (firstVar.sizeUnit === 'kg' ? 'Bag' : 'Packet'),
        currentStock: 0,
        minStockAlert: 0,
        costPrice: Math.round(avgCost * 100) / 100,
        defaultSellingPrice: primarySelling,
        hsnCode: formHsnCode.trim(),
        packagingVariants: sanitizedVariants,
        hasMultipleVariants: sanitizedVariants.length > 1,
        standardDoseInfo: doseInfo,
      }, editingProduct?.id);

      await loadProducts();
      setShowProductModal(false);
      setEditingProduct(null);
    } catch (err: any) {
      alert('उत्पाद सुरक्षित करने में त्रुटि: ' + (err.message || err));
    }
  };

  const handleDelete = async (productId: string, name: string) => {
    if (!window.confirm(`क्या आप वाकई "${name}" को हटाना चाहते हैं?`)) return;
    try {
      await deleteAccountingProduct(productId);
      await loadProducts();
    } catch (err: any) {
      alert('डिलीट करने में त्रुटि: ' + (err.message || err));
    }
  };

  return (
    <div className="space-y-4">
      {/* TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">स्टॉक (उत्पाद एवं मूल्य सूची)</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              मास्टर डेटा व मूल्य निर्धारण
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            उत्पादों की खरीद दर (Cost Price), बिक्री दर (Selling Price) और पैकेजिंग साइज मास्टर प्रबंधन
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
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-bold hover:bg-[#23461e] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ नया उत्पाद जोड़ें</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div 
          onClick={() => setCategoryFilter('all')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'all' ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">कुल उत्पाद</span>
            <Boxes className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.totalItems}</p>
          <span className="text-[10px] text-gray-400">सभी पंजीकृत आइटम</span>
        </div>

        <div 
          onClick={() => setCategoryFilter('pesticides')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'pesticides' ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">कीटनाशक</span>
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.pesticidesCount}</p>
          <span className="text-[10px] text-gray-400">स्प्रे व तकनीकी दवाइयां</span>
        </div>

        <div 
          onClick={() => setCategoryFilter('fertilizers')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'fertilizers' ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">उर्वरक / खाद</span>
            <Tag className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.fertilizersCount}</p>
          <span className="text-[10px] text-gray-400">NPK, यूरिया, सूक्ष्म पोषक</span>
        </div>

        <div 
          onClick={() => setCategoryFilter('seeds')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'seeds' ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">उन्नत बीज</span>
            <Tag className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.seedsCount}</p>
          <span className="text-[10px] text-gray-400">फसल व सब्जी बीज</span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">अन्य उत्पाद</span>
            <Tag className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.otherCount}</p>
          <span className="text-[10px] text-gray-400">उपकरण, स्प्रेयर आदि</span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">औसत लाभ मार्जिन</span>
            <Percent className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-emerald-700 mt-1">{metrics.avgMarginPercent}%</p>
          <span className="text-[10px] text-gray-400">बिक्री दर के आधार पर</span>
        </div>
      </div>

      {/* FILTER CONTROLS & SEARCH */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="उत्पाद का नाम, तकनीकी नाम, HSN खोजें..."
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
            {ACCOUNTING_PRODUCT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nameHindi}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PRODUCTS MASTER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">उत्पाद व टेक्निकल विवरण</th>
                <th className="py-3.5 px-3">पैकेजिंग साइज (Pack Sizes)</th>
                <th className="py-3.5 px-3">खरीद दर (Cost Price)</th>
                <th className="py-3.5 px-3">बिक्री दर (Selling Price)</th>
                <th className="py-3.5 px-3">लाभ / मार्जिन</th>
                <th className="py-3.5 px-4 text-right">त्वरित एक्शन</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    कोई उत्पाद नहीं मिला। नया उत्पाद जोड़ने के लिए ऊपर <strong>"+ नया उत्पाद जोड़ें"</strong> दबाएं।
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isExpanded = expandedProductIds[p.id];
                  const firstVar = p.resolvedVariants[0];
                  const primaryCost = firstVar?.costPrice || p.costPrice || 0;
                  const primarySelling = firstVar?.sellingPrice || p.defaultSellingPrice || 0;
                  const primaryMargin = primarySelling - primaryCost;
                  const marginPercent = primarySelling > 0 ? Math.round((primaryMargin / primarySelling) * 100) : 0;

                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        {/* Column 1: Product Name & Category */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2">
                            {p.resolvedVariants.length > 1 && (
                              <button
                                onClick={() => toggleProductExpand(p.id)}
                                className="mt-0.5 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                title="सभी साइज विस्तार से देखें"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <div>
                              <div className="font-extrabold text-gray-900 text-sm">{p.hindiName}</div>
                              {p.name && p.name !== p.hindiName && (
                                <div className="text-[11px] text-gray-500">{p.name}</div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold rounded text-[10px]">
                                  {p.category}
                                </span>
                                {p.productType && (
                                  <span className="text-[10px] text-gray-500">
                                    · {p.productType === 'liquid' ? 'तरल (Liquid)' : 'पाउडर / दानेदार'}
                                  </span>
                                )}
                                {p.hsnCode && (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    · HSN: {p.hsnCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Packaging Sizes */}
                        <td className="py-3.5 px-3 align-top">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {p.resolvedVariants.map((v, i) => (
                              <span
                                key={v.id || i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-gray-50 text-gray-800 border border-gray-200 font-semibold"
                              >
                                {v.label || `${v.sizeValue} ${v.sizeUnit}`}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Column 3: Cost Price */}
                        <td className="py-3.5 px-3 align-top">
                          {p.resolvedVariants.length === 1 ? (
                            <span className="font-bold text-gray-900 text-xs">
                              ₹{primaryCost}
                            </span>
                          ) : (
                            <div className="text-xs">
                              <span className="font-bold text-gray-900">₹{primaryCost}</span>
                              <span className="text-[10px] text-gray-400 block font-normal">
                                ({p.resolvedVariants.length} साइज उपलब्ध)
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Column 4: Selling Price */}
                        <td className="py-3.5 px-3 align-top">
                          {p.resolvedVariants.length === 1 ? (
                            <span className="font-bold text-emerald-800 text-xs">
                              ₹{primarySelling}
                            </span>
                          ) : (
                            <div className="text-xs">
                              <span className="font-bold text-emerald-800">₹{primarySelling}</span>
                              <span className="text-[10px] text-gray-400 block font-normal">
                                ({firstVar?.label || 'प्राइमरी'})
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Column 5: Margin / Profit */}
                        <td className="py-3.5 px-3 align-top">
                          <div className="text-xs">
                            <span className={`font-bold ${primaryMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              ₹{primaryMargin} ({marginPercent}%)
                            </span>
                            <span className="text-[10px] text-gray-400 block">प्रति नग लाभ</span>
                          </div>
                        </td>

                        {/* Column 6: Action Buttons */}
                        <td className="py-3.5 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200 transition-colors"
                              title="मूल्य व उत्पाद संपादित करें"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(p.id, p.hindiName)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="हटाएं"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED ACCORDION: DETAIL PER VARIANT & DOSE INFO */}
                      {isExpanded && (
                        <tr className="bg-gray-50/60">
                          <td colSpan={6} className="p-3 pl-12">
                            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                                  सभी पैकेजिंग साइज व मूल्य विवरण (Rate Card)
                                </span>
                                {p.standardDoseInfo && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {p.standardDoseInfo.verifiedDosePer20LTank && (
                                      <span className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                                        पंप डोज़: <strong>{p.standardDoseInfo.verifiedDosePer20LTank} {p.standardDoseInfo.doseUnit || 'ml'}</strong> / 20L
                                      </span>
                                    )}
                                    {p.standardDoseInfo.verifiedDosePerBigha && (
                                      <span className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                                        प्रति बीघा: <strong>{p.standardDoseInfo.verifiedDosePerBigha} {p.standardDoseInfo.doseBighaUnit || 'kg'}</strong> / बीघा
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                {p.resolvedVariants.map(v => {
                                  const cost = v.costPrice || 0;
                                  const selling = v.sellingPrice || 0;
                                  const diff = selling - cost;
                                  const mPct = selling > 0 ? Math.round((diff / selling) * 100) : 0;
                                  return (
                                    <div key={v.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                                      <div className="font-extrabold text-gray-900">
                                        {v.label}
                                      </div>
                                      <div className="mt-1.5 space-y-1 text-[11px] text-gray-600">
                                        <div className="flex justify-between">
                                          <span>खरीद दर (Cost):</span>
                                          <strong className="text-gray-800">₹{cost}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>बिक्री दर (Selling):</span>
                                          <strong className="text-emerald-800">₹{selling}</strong>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-gray-200 text-emerald-700 font-bold">
                                          <span>मुनाफा (Margin):</span>
                                          <span>₹{diff} ({mPct}%)</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
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

      {/* MODAL: ADD / EDIT PRODUCT & MULTI-PACKAGING SIZES (MASTER & PRICING ONLY) */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">
                  {editingProduct ? 'उत्पाद व मूल्य सूची संपादित करें' : 'नया उत्पाद जोड़ें'}
                </h3>
                <p className="text-xs text-gray-500">उत्पाद की खरीद दर (Cost Price) और बिक्री दर (Selling Price) दर्ज करें</p>
              </div>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* SECTION A: BASIC INFO */}
              <ProductBasicInfoFields
                values={{
                  hindiName: formHindiName,
                  name: formName,
                  category: formCategory,
                  productType: formProductType,
                }}
                onChange={updated => {
                  if (updated.hindiName !== undefined) setFormHindiName(updated.hindiName);
                  if (updated.name !== undefined) setFormName(updated.name);
                  if (updated.category !== undefined) {
                    setFormCategory(updated.category);
                    if (formProductType !== 'liquid') {
                      if (updated.category === 'fertilizers') {
                        setFormDoseBighaUnit('kg');
                      } else {
                        setFormDoseBighaUnit('g');
                      }
                    }
                  }
                  if (updated.productType !== undefined) {
                    setFormProductType(updated.productType);
                    setFormDoseUnit(updated.productType === 'liquid' ? 'ml' : 'g');
                    if (updated.productType === 'liquid') {
                      setFormDoseBighaUnit('ml');
                    } else if (formCategory === 'fertilizers') {
                      setFormDoseBighaUnit('kg');
                    } else {
                      setFormDoseBighaUnit('g');
                    }
                  }
                }}
                existingProducts={products}
                currentProductId={editingProduct?.id}
                onSelectExistingProduct={p => openEditModal(p)}
                accentColor="emerald"
              />

              {/* HSN CODE (OPTIONAL) */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">HSN कोड (वैकल्पिक)</label>
                <input
                  type="text"
                  placeholder="उदा. 3808"
                  value={formHsnCode}
                  onChange={e => setFormHsnCode(e.target.value)}
                  className="w-full sm:w-1/2 p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs"
                />
              </div>

              {/* SECTION B: PACKAGING SIZES & PRICING (NO QUANTITY/INVENTORY FIELDS) */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-extrabold text-gray-900 text-xs block">पैकेजिंग साइज व मूल्य दरें (Pack Sizes & Rates)</span>
                    <span className="text-[11px] text-gray-500">प्रत्येक साइज की खरीद दर और बिक्री दर तय करें</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
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
                          onClick={() => addVariantToForm({ val: 500, unit: 'g', type: 'Packet' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 500g
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
                      <span>+ नई साइज</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formVariants.map((v, idx) => {
                    const cost = Number(v.costPrice) || 0;
                    const selling = Number(v.sellingPrice) || 0;
                    const marginVal = selling - cost;
                    const marginPct = selling > 0 ? Math.round((marginVal / selling) * 100) : 0;

                    return (
                      <div key={v.id || idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-5">
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
                              className="p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-[11px] flex-1"
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

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-gray-500 block mb-0.5">खरीद दर (Cost) ₹</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={v.costPrice}
                            onChange={e => updateFormVariant(idx, 'costPrice', Number(e.target.value))}
                            className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-900"
                            placeholder="0"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-gray-500 block mb-0.5">बिक्री दर (Sale) ₹</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={v.sellingPrice}
                            onChange={e => updateFormVariant(idx, 'sellingPrice', Number(e.target.value))}
                            className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-emerald-800"
                            placeholder="0"
                          />
                        </div>

                        <div className="sm:col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => removeFormVariant(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                            title="इस साइज को हटाएं"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Live margin pill */}
                        <div className="sm:col-span-12 flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/60">
                          <span className="text-gray-500">
                            {v.label}
                          </span>
                          <span className={`font-bold ${marginVal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            मुनाफा: ₹{marginVal} ({marginPct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION C: DOSE ASSISTANT CONFIGURATION (OPTIONAL FOR POS ADVICE) */}
              <div className="border-t border-gray-200 pt-3">
                <span className="font-extrabold text-gray-900 text-xs block mb-1">
                  प्रमाणित डोज़ सहायक (Dose Recommendation for POS)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                      20L पंप डोज़ ({formDoseUnit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder={formProductType === 'liquid' ? 'उदा. 40' : 'उदा. 25'}
                      value={formDosePerTank}
                      onChange={e => setFormDosePerTank(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                      प्रति बीघा डोज़ ({formDoseBighaUnit === 'kg' ? 'किलो' : formDoseBighaUnit === 'g' ? 'ग्राम' : formDoseBighaUnit === 'ml' ? 'ml' : 'लीटर'})
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        placeholder={
                          formDoseBighaUnit === 'kg'
                            ? 'उदा. 20 (किलो/बीघा)'
                            : formDoseBighaUnit === 'g'
                            ? 'उदा. 500 (ग्राम/बीघा)'
                            : formDoseBighaUnit === 'Ltr'
                            ? 'उदा. 1 (लीटर/बीघा)'
                            : 'उदा. 250 (ml/बीघा)'
                        }
                        value={formDosePerBigha}
                        onChange={e => setFormDosePerBigha(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                      />
                      <select
                        value={formDoseBighaUnit}
                        onChange={e => setFormDoseBighaUnit(e.target.value)}
                        className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 shrink-0 cursor-pointer"
                      >
                        {formProductType === 'liquid' ? (
                          <>
                            <option value="ml">ml / बीघा</option>
                            <option value="Ltr">लीटर / बीघा</option>
                          </>
                        ) : (
                          <>
                            <option value="kg">किलो / बीघा</option>
                            <option value="g">ग्राम / बीघा</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                      सुझाव निर्देश (वैकल्पिक)
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. शाम के समय स्प्रे करें"
                      value={formDoseWarning}
                      onChange={e => setFormDoseWarning(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#2D5A27] text-white rounded-xl font-extrabold text-sm shadow-sm hover:bg-[#23461e] active:scale-95 transition-all mt-3"
              >
                उत्पाद व मूल्य सुरक्षित करें
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingInventory;
