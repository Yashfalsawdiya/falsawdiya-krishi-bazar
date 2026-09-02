import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Plus, Search, Calendar, FileText, CheckCircle2, 
  Trash2, Phone, Building2, IndianRupee, ArrowDownLeft, X, Eye
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

export const AccountingPurchases: React.FC = () => {
  const [purchases, setPurchases] = useState<AccountingPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<AccountingSupplier[]>([]);
  const [products, setProducts] = useState<AccountingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<AccountingPurchase | null>(null);

  // New Purchase Form
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

  // New Supplier Form
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
        fetchAccountingSuppliers(),
        fetchAccountingProducts(),
      ]);
      setPurchases(purchs);
      setSuppliers(supps);
      setProducts(prods);
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
        }
      }

      if (field === 'quantity' || field === 'purchasePrice' || field === 'productId') {
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
      alert('✅ थोक खरीद इनवॉइस दर्ज हो गया एवं इन्वेंट्री स्टॉक बढ़ गया!');
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
      if (!q) return true;
      return (
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        p.items.some(it => (it.hindiName || it.name).toLowerCase().includes(q))
      );
    });
  }, [purchases, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-200">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">थोक खरीद एवं सप्लायर आवक (Wholesaler Inward)</h2>
            <p className="text-xs text-gray-500">
              सप्लायर से माल खरीद, आवक इनवॉइस और स्वचालित स्टॉक व लागत वृद्धि
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold flex items-center gap-1"
          >
            <Building2 className="w-4 h-4" /> + नया सप्लायर
          </button>
          <button
            onClick={() => {
              setPurchaseItems([
                { name: '', hindiName: '', unit: 'Bottle', quantity: 1, purchasePrice: 0, total: 0 },
              ]);
              setShowAddPurchaseModal(true);
            }}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-200 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> + नया खरीद इनवॉइस
          </button>
        </div>
      </div>

      {/* Main Content List */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="इनवॉइस नंबर, सप्लायर या उत्पाद खोजें..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-gray-400 font-medium">कुल {filteredPurchases.length} इनवॉइस</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">तारीख व बिल नं.</th>
                <th className="py-3 px-3">सप्लायर / डिस्ट्रीब्यूटर</th>
                <th className="py-3 px-3">आइटम्स</th>
                <th className="py-3 px-3">कुल खरीद राशि (Total)</th>
                <th className="py-3 px-3">भुगतान स्थिति</th>
                <th className="py-3 px-3 text-right">विवरण</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    कोई खरीद रिकॉर्ड नहीं मिला। ऊपर "+ नया खरीद इनवॉइस" बटन दबाकर माल की आवक दर्ज करें।
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
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
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        p.unpaidSupplierUdhari > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.unpaidSupplierUdhari > 0 ? `बाकी: ₹${p.unpaidSupplierUdhari}` : 'पूर्ण चुकता'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setViewingPurchase(p)}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                        title="बिल देखें"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD PURCHASE INVOICE */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
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
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.companyName || s.city})
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

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4 flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-bold">मात्रा:</span>
                          <input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={e => updatePurchaseItem(idx, 'quantity', Number(e.target.value))}
                            className="w-14 p-1.5 text-center font-bold bg-white border border-gray-200 rounded-xl"
                          />
                          <select
                            value={item.unit}
                            onChange={e => updatePurchaseItem(idx, 'unit', e.target.value)}
                            className="p-1 bg-white border border-gray-200 rounded-lg text-[10px]"
                          >
                            <option value="Bottle">Bottle</option>
                            <option value="Packet">Packet</option>
                            <option value="Bag">Bag</option>
                            <option value="Ltr">Ltr</option>
                            <option value="Kg">Kg</option>
                            <option value="Gram">Gram</option>
                            <option value="Piece">Piece</option>
                          </select>
                        </div>

                        <div className="col-span-4 flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-bold">खरीद दर: ₹</span>
                          <input
                            type="number"
                            step="any"
                            value={item.purchasePrice}
                            onChange={e => updatePurchaseItem(idx, 'purchasePrice', Number(e.target.value))}
                            className="w-16 p-1.5 text-center font-bold bg-white border border-gray-200 rounded-xl"
                          />
                        </div>

                        <div className="col-span-4 text-right font-extrabold text-gray-900">
                          कुल: ₹{item.total}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>उप-कुल (Items Subtotal):</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">टैक्स (GST): ₹</span>
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
                  <label className="font-bold text-gray-700 block mb-1">चुकाई गई राशि ₹</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value))}
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
                    <option value="online">📱 ऑनलाइन (UPI / NEFT)</option>
                    <option value="cash">💵 नकद (Cash)</option>
                    <option value="bank">🏦 बैंक चेक</option>
                    <option value="udhari">📒 सप्लायर उधारी (Credit)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-md active:scale-95 transition-all mt-4"
              >
                {isSubmitting ? 'सुरक्षित हो रहा है...' : `खरीद दर्ज करें एवं स्टॉक जोड़ें · ₹${grandTotal}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
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
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all mt-4"
              >
                सप्लायर सुरक्षित करें
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PURCHASE DETAILS */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
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
              <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                <p>सप्लायर: <strong>{viewingPurchase.supplierName}</strong></p>
                {viewingPurchase.supplierPhone && <p>मोबाइल: {viewingPurchase.supplierPhone}</p>}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-gray-700">आइटम्स:</h4>
                {viewingPurchase.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded-xl">
                    <span>{it.hindiName || it.name} × {it.quantity} {it.unit}</span>
                    <strong className="font-mono">₹{it.total} (दर: ₹{it.purchasePrice})</strong>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>कुल इनवॉइस:</span>
                  <strong>₹{viewingPurchase.grandTotal}</strong>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>चुकाया गया:</span>
                  <span>₹{viewingPurchase.paidAmount}</span>
                </div>
                {viewingPurchase.unpaidSupplierUdhari > 0 && (
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>सप्लायर उधारी बाकी:</span>
                    <span>₹{viewingPurchase.unpaidSupplierUdhari}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPurchases;
