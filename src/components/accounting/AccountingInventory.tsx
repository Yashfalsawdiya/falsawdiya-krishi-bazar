import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Search, Plus, AlertTriangle, Edit3, Trash2, 
  RefreshCw, TrendingUp, DollarSign, Layers, ArrowUpDown, X, CheckCircle2
} from 'lucide-react';
import { AccountingProduct } from '../../types/accounting';
import { 
  fetchAccountingProducts, 
  saveAccountingProduct, 
  deleteAccountingProduct 
} from '../../services/accountingService';

export const AccountingInventory: React.FC = () => {
  const [products, setProducts] = useState<AccountingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AccountingProduct | null>(null);
  
  // Form State
  const [formHindiName, setFormHindiName] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('pesticides');
  const [formUnit, setFormUnit] = useState('Bottle');
  const [formCurrentStock, setFormCurrentStock] = useState<number>(0);
  const [formMinStockAlert, setFormMinStockAlert] = useState<number>(5);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formHsnCode, setFormHsnCode] = useState('');
  const [formBatchNo, setFormBatchNo] = useState('');

  // Quick Stock Adjust Modal
  const [adjustingProduct, setAdjustingProduct] = useState<AccountingProduct | null>(null);
  const [stockAdjustQty, setStockAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');

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

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        p.hindiName?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        (p.customId && p.customId.toLowerCase().includes(q))
      );

      if (!matchesCat || !matchesSearch) return false;

      if (stockFilter === 'low') return (p.currentStock || 0) <= (p.minStockAlert || 5) && (p.currentStock || 0) > 0;
      if (stockFilter === 'out') return (p.currentStock || 0) <= 0;
      return true;
    });
  }, [products, categoryFilter, searchQuery, stockFilter]);

  // Inventory Totals
  const inventoryMetrics = useMemo(() => {
    const totalItems = products.length;
    const totalValuationCost = products.reduce((acc, p) => acc + ((p.currentStock || 0) * (p.costPrice || 0)), 0);
    const totalValuationSelling = products.reduce((acc, p) => acc + ((p.currentStock || 0) * (p.defaultSellingPrice || 0)), 0);
    const potentialProfit = totalValuationSelling - totalValuationCost;
    const lowStockCount = products.filter(p => (p.currentStock || 0) <= (p.minStockAlert || 5)).length;

    return { totalItems, totalValuationCost, totalValuationSelling, potentialProfit, lowStockCount };
  }, [products]);

  // Handle Save / Edit Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHindiName.trim()) {
      alert('कृपया उत्पाद का हिंदी नाम दर्ज करें।');
      return;
    }

    try {
      await saveAccountingProduct({
        hindiName: formHindiName.trim(),
        name: formName.trim() || formHindiName.trim(),
        category: formCategory,
        unit: formUnit,
        currentStock: Number(formCurrentStock) || 0,
        minStockAlert: Number(formMinStockAlert) || 5,
        costPrice: Number(formCostPrice) || 0,
        defaultSellingPrice: Number(formSellingPrice) || 0,
        hsnCode: formHsnCode.trim(),
        batchNo: formBatchNo.trim(),
      }, editingProduct?.id);

      await loadProducts();
      setShowProductModal(false);
      setEditingProduct(null);
    } catch (err: any) {
      alert('उत्पाद सुरक्षित करने में त्रुटि: ' + err.message);
    }
  };

  // Handle Stock Adjust
  const handleApplyStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    let newStock = adjustingProduct.currentStock || 0;
    if (adjustType === 'add') {
      newStock += Number(stockAdjustQty);
    } else if (adjustType === 'subtract') {
      newStock = Math.max(0, newStock - Number(stockAdjustQty));
    } else {
      newStock = Math.max(0, Number(stockAdjustQty));
    }

    try {
      await saveAccountingProduct({
        ...adjustingProduct,
        currentStock: newStock,
      }, adjustingProduct.id);

      await loadProducts();
      setAdjustingProduct(null);
      setStockAdjustQty(0);
    } catch (err: any) {
      alert('स्टॉक अपडेट करने में त्रुटि: ' + err.message);
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

  const openEditModal = (p: AccountingProduct) => {
    setEditingProduct(p);
    setFormHindiName(p.hindiName);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormUnit(p.unit);
    setFormCurrentStock(p.currentStock || 0);
    setFormMinStockAlert(p.minStockAlert || 5);
    setFormCostPrice(p.costPrice || 0);
    setFormSellingPrice(p.defaultSellingPrice || 0);
    setFormHsnCode(p.hsnCode || '');
    setFormBatchNo(p.batchNo || '');
    setShowProductModal(true);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormHindiName('');
    setFormName('');
    setFormCategory('pesticides');
    setFormUnit('Bottle');
    setFormCurrentStock(0);
    setFormMinStockAlert(5);
    setFormCostPrice(0);
    setFormSellingPrice(0);
    setFormHsnCode('');
    setFormBatchNo('');
    setShowProductModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Valuation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold">कुल उत्पाद (Inventory SKUs)</p>
            <h3 className="text-xl font-extrabold text-gray-900">{inventoryMetrics.totalItems} प्रकार के माल</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold">स्टॉक कुल खरीद लागत (Cost)</p>
            <h3 className="text-xl font-extrabold text-purple-900">₹{inventoryMetrics.totalValuationCost.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold">स्टॉक अनुमानित बिक्री मूल्य</p>
            <h3 className="text-xl font-extrabold text-emerald-800">₹{inventoryMetrics.totalValuationSelling.toLocaleString()}</h3>
            <p className="text-[10px] text-emerald-600 font-bold">(संभावित लाभ: +₹{inventoryMetrics.potentialProfit.toLocaleString()})</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold">कम स्टॉक अलर्ट</p>
              <h3 className="text-xl font-extrabold text-red-600">{inventoryMetrics.lowStockCount} उत्पाद</h3>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-200 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> नया माल
          </button>
        </div>
      </div>

      {/* Main Inventory Table Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        {/* Search & Filters Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="उत्पाद का नाम, HSN या बैच नंबर खोजें..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="all">सभी श्रेणियां</option>
              <option value="fertilizers">खाद (Fertilizers)</option>
              <option value="pesticides">कीटनाशक (Pesticides)</option>
              <option value="seeds">बीज (Seeds)</option>
              <option value="fungicides">फफूंदनाशी (Fungicides)</option>
              <option value="herbicides">खरपतवारनाशी (Herbicides)</option>
              <option value="medicines">टॉनिक व वृद्धि वर्धक</option>
              <option value="implements">कृषि उपकरण</option>
            </select>

            {/* Stock Filter Pills */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  stockFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                सभी
              </button>
              <button
                onClick={() => setStockFilter('low')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  stockFilter === 'low' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500'
                }`}
              >
                कम स्टॉक
              </button>
              <button
                onClick={() => setStockFilter('out')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  stockFilter === 'out' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500'
                }`}
              >
                खत्म (Out)
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Items List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">उत्पाद का नाम (Product Name)</th>
                <th className="py-3 px-3">श्रेणी</th>
                <th className="py-3 px-3">वर्तमान स्टॉक (Stock)</th>
                <th className="py-3 px-3">औसत खरीद लागत (Cost)</th>
                <th className="py-3 px-3">बिक्री मूल्य (Selling)</th>
                <th className="py-3 px-3">मार्जिन %</th>
                <th className="py-3 px-3 text-right">एक्शन</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    कोई उत्पाद नहीं मिला। नया माल जोड़ने के लिए ऊपर "+ नया माल" बटन दबाएं।
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isLow = (p.currentStock || 0) <= (p.minStockAlert || 5);
                  const isOut = (p.currentStock || 0) <= 0;
                  const marginPercent = p.defaultSellingPrice > 0 
                    ? Math.round(((p.defaultSellingPrice - p.costPrice) / p.defaultSellingPrice) * 100) 
                    : 0;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900 text-sm">{p.hindiName}</div>
                        <div className="text-[11px] text-gray-400">{p.name} {p.batchNo ? `· Batch: ${p.batchNo}` : ''}</div>
                      </td>

                      <td className="py-3 px-3 font-medium text-gray-600">
                        {p.category}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-extrabold text-sm ${
                            isOut ? 'text-red-600' : isLow ? 'text-amber-700' : 'text-gray-900'
                          }`}>
                            {p.currentStock} {p.unit}
                          </span>
                          <button
                            onClick={() => {
                              setAdjustingProduct(p);
                              setStockAdjustQty(0);
                            }}
                            className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold text-gray-700"
                            title="त्वरित स्टॉक एडजस्ट करें"
                          >
                            +/-
                          </button>
                        </div>
                        {isLow && (
                          <span className="text-[10px] text-red-600 font-bold block">
                            (न्यूनतम सीमा: {p.minStockAlert})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-bold text-gray-700">
                        ₹{p.costPrice} /{p.unit}
                      </td>

                      <td className="py-3 px-3 font-bold text-emerald-800">
                        ₹{p.defaultSellingPrice} /{p.unit}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] ${
                          marginPercent > 15 ? 'bg-emerald-100 text-emerald-800' : marginPercent > 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {marginPercent}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                            title="एडिट करें"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.hindiName)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="डिलीट करें"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* MODAL: ADD / EDIT PRODUCT */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingProduct ? 'उत्पाद विवरण संपादित करें' : 'इन्वेंट्री में नया उत्पाद जोड़ें'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">उत्पाद का हिंदी नाम *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. क्लोरोपायरीफॉस 20% EC"
                  value={formHindiName}
                  onChange={e => setFormHindiName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">अंग्रेज़ी / टेक्निकल नाम</label>
                <input
                  type="text"
                  placeholder="उदा. Chlorpyrifos 20% EC (Dhanuka)"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">श्रेणी (Category)</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
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
                  <label className="font-bold text-gray-700 block mb-1">इकाई (Unit)</label>
                  <select
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Bottle">Bottle (बोतल)</option>
                    <option value="Packet">Packet (पैकेट)</option>
                    <option value="Bag">Bag / बोरी (कट्टा)</option>
                    <option value="Ltr">Ltr (लीटर)</option>
                    <option value="Kg">Kg (किलोग्राम)</option>
                    <option value="Gram">Gram (ग्राम)</option>
                    <option value="Piece">Piece (नग)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">औसत खरीद लागत (Cost Price) ₹</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formCostPrice}
                    onChange={e => setFormCostPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-purple-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">बिक्री मूल्य (Selling Price) ₹</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formSellingPrice}
                    onChange={e => setFormSellingPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">वर्तमान स्टॉक (Current Stock)</label>
                  <input
                    type="number"
                    step="any"
                    value={formCurrentStock}
                    onChange={e => setFormCurrentStock(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">न्यूनतम चेतावनी सीमा (Min Alert)</label>
                  <input
                    type="number"
                    value={formMinStockAlert}
                    onChange={e => setFormMinStockAlert(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">HSN कोड (वैकल्पिक)</label>
                  <input
                    type="text"
                    placeholder="उदा. 3808"
                    value={formHsnCode}
                    onChange={e => setFormHsnCode(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">बैच नंबर (वैकल्पिक)</label>
                  <input
                    type="text"
                    placeholder="उदा. B-2026-09"
                    value={formBatchNo}
                    onChange={e => setFormBatchNo(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-700 text-white rounded-xl font-extrabold text-sm shadow-md hover:bg-emerald-800 active:scale-95 transition-all mt-4"
              >
                उत्पाद सुरक्षित करें
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK STOCK ADJUSTMENT */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">स्टॉक एडजस्ट करें</h3>
                <p className="text-xs text-gray-500">{adjustingProduct.hindiName}</p>
              </div>
              <button onClick={() => setAdjustingProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyStockAdjustment} className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl text-center">
                <span className="text-gray-500 text-[11px] block">मौजूदा स्टॉक</span>
                <strong className="text-lg font-extrabold text-gray-900">
                  {adjustingProduct.currentStock} {adjustingProduct.unit}
                </strong>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
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
                <label className="font-bold text-gray-700 block mb-1">मात्रा ({adjustingProduct.unit})</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={stockAdjustQty}
                  onChange={e => setStockAdjustQty(Number(e.target.value))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-extrabold text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md hover:bg-emerald-800 active:scale-95 transition-all mt-3"
              >
                स्टॉक अपडेट करें
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingInventory;
