import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, 
  Trash2, Plus, ArrowRight, RefreshCw, ZoomIn, ZoomOut, 
  RotateCw, FileText, Check, X, ShieldAlert, ArrowUpRight,
  Truck, ShoppingBag, Receipt
} from 'lucide-react';
import { 
  AIScanResult, 
  AIScanExtractedItem, 
  AccountingProduct, 
  AccountingSupplier, 
  AccountingCustomer,
  AccountingExpenseCategory
} from '../../types/accounting';
import { 
  scanBillWithAI, 
  fetchAccountingProducts, 
  fetchAccountingSuppliers, 
  fetchAccountingCustomers,
  fetchExpenseCategories,
  createWholesalerPurchase,
  createOfflineSale,
  saveAccountingExpense,
  saveAccountingProduct
} from '../../services/accountingService';
import { compressImage, fileToBase64 } from '../../lib/utils';

interface Props {
  onEntrySaved?: (type: string, id: string) => void;
}

export const AccountingSmartScanner: React.FC<Props> = ({ onEntrySaved }) => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Existing DB context for matching
  const [products, setProducts] = useState<AccountingProduct[]>([]);
  const [suppliers, setSuppliers] = useState<AccountingSupplier[]>([]);
  const [customers, setCustomers] = useState<AccountingCustomer[]>([]);
  const [categories, setCategories] = useState<AccountingExpenseCategory[]>([]);

  // Editable Review State
  const [docType, setDocType] = useState<'wholesaler_invoice' | 'customer_bill' | 'expense_receipt'>('wholesaler_invoice');
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [extractedItems, setExtractedItems] = useState<AIScanExtractedItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>('other');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'udhari'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Image Zoom & Rotate
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetchAccountingProducts(),
      fetchAccountingSuppliers(),
      fetchAccountingCustomers(),
      fetchExpenseCategories(),
    ]).then(([p, s, c, cats]) => {
      setProducts(p);
      setSuppliers(s);
      setCustomers(c);
      setCategories(cats);
    });
  }, []);

  const handleImageSelected = async (selectedFile: File) => {
    setScanError(null);
    setScanResult(null);
    setFile(selectedFile);

    try {
      // Compress image client side
      const rawBase64 = await fileToBase64(selectedFile);
      const compressedBase64 = await compressImage(rawBase64, 1280, 0.85);
      setImagePreview(compressedBase64);
      startOcrScan(compressedBase64);
    } catch (err: any) {
      setScanError('फोटो प्रोसेस करने में त्रुटि: ' + err.message);
    }
  };

  const startOcrScan = async (base64Data: string) => {
    setIsScanning(true);
    setScanError(null);
    try {
      const result = await scanBillWithAI(base64Data, {
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          hindiName: p.hindiName,
          unit: p.unit,
          costPrice: p.costPrice,
          defaultSellingPrice: p.defaultSellingPrice,
        })),
        suppliers: suppliers.map(s => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          companyName: s.companyName,
        })),
        customers: customers.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          village: c.village,
        })),
      });

      setScanResult(result);

      // Populate form for review
      if (result.documentType === 'customer_bill') {
        setDocType('customer_bill');
      } else if (result.documentType === 'expense_receipt') {
        setDocType('expense_receipt');
      } else {
        setDocType('wholesaler_invoice');
      }

      setPartyName(result.partyName || '');
      setPartyPhone(result.partyPhone || '');
      setInvoiceNumber(result.invoiceNumber || `SCAN-${Date.now().toString().slice(-5)}`);
      setInvoiceDate(result.date || new Date().toISOString().split('T')[0]);
      setExtractedItems(result.items || []);
      setDiscountAmount(result.discount || 0);
      setTaxAmount(result.taxAmount || 0);
      setPaidAmount(result.grandTotal || 0);
      setNotes(result.rawNotes || '');

      if (result.suggestedExpenseCategory) {
        const found = categories.find(c => c.id === result.suggestedExpenseCategory);
        if (found) setExpenseCategoryId(found.id);
      }
    } catch (err: any) {
      setScanError(err.message || 'AI स्कैनिंग विफल रही। कृपया पुनः प्रयास करें या मैन्युअल एंट्री करें।');
    } finally {
      setIsScanning(false);
    }
  };

  // Calculations for editable items
  const itemsSubtotal = extractedItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
  const calculatedGrandTotal = Math.max(0, itemsSubtotal - discountAmount + taxAmount);

  // Edit item line
  const handleItemChange = (index: number, field: keyof AIScanExtractedItem, value: any) => {
    setExtractedItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : copy[index].quantity;
        const rate = field === 'unitPrice' ? Number(value) : copy[index].unitPrice;
        copy[index].totalPrice = Math.round(qty * rate * 100) / 100;
      }
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setExtractedItems(prev => [
      ...prev,
      {
        name: '',
        hindiName: '',
        quantity: 1,
        unit: 'Bottle',
        unitPrice: 0,
        totalPrice: 0,
        confidence: 1.0,
      },
    ]);
  };

  // Save Confirmed Entry into Firestore
  const handleSaveConfirmedEntry = async () => {
    if (extractedItems.length === 0 && docType !== 'expense_receipt') {
      alert('कृपया बिल में कम से कम 1 उत्पाद रखें।');
      return;
    }

    setIsSaving(true);
    try {
      if (docType === 'wholesaler_invoice') {
        // 1. Save as Wholesaler Inward Purchase
        // Find or match supplier
        const matchedSupplier = suppliers.find(s => 
          s.name.toLowerCase() === partyName.trim().toLowerCase() ||
          (partyPhone && s.phone === partyPhone.trim())
        );

        // Auto-match or create missing products in inventory
        const finalPurchaseItems = [];
        for (const it of extractedItems) {
          let matchedProdId = it.matchedProductId;
          if (!matchedProdId) {
            const foundProd = products.find(p => 
              p.hindiName.toLowerCase() === (it.hindiName || '').toLowerCase() ||
              p.name.toLowerCase() === it.name.toLowerCase()
            );
            if (foundProd) {
              matchedProdId = foundProd.id;
            } else {
              // Create new product in inventory automatically!
              matchedProdId = await saveAccountingProduct({
                name: it.name || it.hindiName || 'Unknown Product',
                hindiName: it.hindiName || it.name || 'अज्ञात उत्पाद',
                category: 'pesticides',
                unit: it.unit || 'Bottle',
                currentStock: 0, // Will be incremented by purchase
                minStockAlert: 5,
                costPrice: it.unitPrice,
                defaultSellingPrice: Math.round(it.unitPrice * 1.15), // 15% default markup
              });
            }
          }

          finalPurchaseItems.push({
            productId: matchedProdId,
            name: it.name,
            hindiName: it.hindiName,
            unit: it.unit,
            quantity: it.quantity,
            purchasePrice: it.unitPrice,
            total: it.totalPrice,
          });
        }

        const grandTot = calculatedGrandTotal;
        const paid = Math.min(paidAmount, grandTot);
        const unpaid = Math.max(0, grandTot - paid);

        const purchaseId = await createWholesalerPurchase({
          invoiceNumber: invoiceNumber.trim() || `PUR-${Date.now().toString().slice(-6)}`,
          supplierId: matchedSupplier?.id,
          supplierName: partyName.trim() || 'थोक विक्रेता (Wholesaler)',
          supplierPhone: partyPhone.trim(),
          invoiceDate,
          timestamp: Date.now(),
          items: finalPurchaseItems,
          subtotal: itemsSubtotal,
          taxAmount,
          discountAmount,
          grandTotal: grandTot,
          paidAmount: paid,
          unpaidSupplierUdhari: unpaid,
          paymentMode,
          invoiceImageUrl: imagePreview,
          isAiScanned: true,
          notes: notes.trim(),
        });

        alert('थोक खरीद इनवॉइस सफलतापूर्वक दर्ज हो गया एवं इन्वेंट्री स्टॉक अपडेट हो गया!');
        if (onEntrySaved) onEntrySaved('purchase', purchaseId);
      } else if (docType === 'customer_bill') {
        // 2. Save as Customer Retail Sale
        const matchedCust = customers.find(c => 
          c.name.toLowerCase() === partyName.trim().toLowerCase() ||
          (partyPhone && c.phone === partyPhone.trim())
        );

        const saleItems = extractedItems.map(it => {
          const cost = it.unitPrice * 0.85; // fallback cost estimation if missing
          return {
            productId: it.matchedProductId || '',
            name: it.name,
            hindiName: it.hindiName || it.name,
            unit: it.unit,
            quantity: it.quantity,
            costPrice: cost,
            originalSellingPrice: it.unitPrice,
            effectiveSellingPrice: it.unitPrice,
            totalCost: cost * it.quantity,
            totalOriginalAmount: it.totalPrice,
            totalEffectiveAmount: it.totalPrice,
            bargainingDiscountShare: 0,
            lineGrossProfit: it.totalPrice - (cost * it.quantity),
            lineMarginPercent: 15,
            isBelowCost: false,
          };
        });

        const grandTot = calculatedGrandTotal;
        const paid = Math.min(paidAmount, grandTot);
        const udhari = Math.max(0, grandTot - paid);

        const saleId = await createOfflineSale({
          invoiceNo: invoiceNumber.trim() || `OFF-${Date.now().toString().slice(-6)}`,
          date: invoiceDate,
          timestamp: Date.now(),
          customerId: matchedCust?.id,
          customerName: partyName.trim() || 'नकद ग्राहक',
          customerPhone: partyPhone.trim(),
          items: saleItems,
          subtotal: itemsSubtotal,
          bargainingDiscount: discountAmount,
          finalTotal: grandTot,
          totalCOGS: saleItems.reduce((acc, it) => acc + it.totalCost, 0),
          grossProfit: grandTot - saleItems.reduce((acc, it) => acc + it.totalCost, 0),
          grossMarginPercent: 15,
          paymentMode,
          cashPaid: paymentMode === 'cash' ? paid : 0,
          onlinePaid: paymentMode === 'online' ? paid : 0,
          udhariAmount: udhari,
          scannedReceiptUrl: imagePreview,
          isAiScanned: true,
          note: notes.trim(),
        });

        alert('ग्राहक बिक्री पर्ची सफलतापूर्वक सेव हो गई!');
        if (onEntrySaved) onEntrySaved('sale', saleId);
      } else {
        // 3. Save as Business Expense
        const selectedCat = categories.find(c => c.id === expenseCategoryId) || categories[0];
        const expenseId = await saveAccountingExpense({
          date: invoiceDate,
          timestamp: Date.now(),
          categoryId: selectedCat?.id || 'other',
          categoryName: selectedCat?.name || 'Other',
          categoryNameHindi: selectedCat?.hindiName || 'अन्य खर्च',
          amount: calculatedGrandTotal || itemsSubtotal || 0,
          paymentMode: paymentMode === 'online' ? 'online' : 'cash',
          recipientName: partyName.trim(),
          description: `${notes.trim()} (बिल #${invoiceNumber})`.trim(),
          receiptImageUrl: imagePreview,
          isAiScanned: true,
        });

        alert('दुकान का खर्च सफलतापूर्वक दर्ज हो गया!');
        if (onEntrySaved) onEntrySaved('expense', expenseId);
      }

      // Reset
      setScanResult(null);
      setImagePreview(null);
      setFile(null);
    } catch (err: any) {
      alert('सेव करने में त्रुटि: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI स्मार्ट बिल स्कैनर (Gemini OCR Vision)</h2>
            <p className="text-xs text-gray-500">
              थोक खरीद बिल, हस्तलिखित कच्ची पर्ची, या खर्च रसीद की फोटो खींचें · 100% सटीक रिव्यू स्क्रीन
            </p>
          </div>
        </div>

        {imagePreview && (
          <button
            onClick={() => {
              setImagePreview(null);
              setScanResult(null);
              setFile(null);
            }}
            className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 bg-red-50 px-3 py-2 rounded-xl"
          >
            <Trash2 className="w-4 h-4" /> नई फोटो लें (Reset)
          </button>
        )}
      </div>

      {/* Hidden File / Camera Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            handleImageSelected(e.target.files[0]);
          }
        }}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            handleImageSelected(e.target.files[0]);
          }
        }}
      />

      {/* Upload Screen (If no preview) */}
      {!imagePreview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => cameraInputRef.current?.click()}
            className="p-8 sm:p-12 bg-white hover:bg-emerald-50/50 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-3xl cursor-pointer text-center space-y-4 transition-all group shadow-sm"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">कैमरा से फोटो खींचें</h3>
              <p className="text-xs text-gray-500 mt-1">दुकान पर आए बिल या पर्ची का तुरंत फोटो लें</p>
            </div>
            <span className="inline-block px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-bold shadow-sm">
              कैमरा खोलें (Live Camera)
            </span>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 sm:p-12 bg-white hover:bg-blue-50/50 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-3xl cursor-pointer text-center space-y-4 transition-all group shadow-sm"
          >
            <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">गैलरी / फाइल से अपलोड करें</h3>
              <p className="text-xs text-gray-500 mt-1">मोबाइल गैलरी से बिल या पर्ची चुनें</p>
            </div>
            <span className="inline-block px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm">
              फाइल चुनें (Choose File)
            </span>
          </div>
        </div>
      )}

      {/* Scanning Loader */}
      {isScanning && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Gemini AI बिल का विश्लेषण कर रहा है...</h3>
            <p className="text-xs text-gray-500 mt-1">
              उत्पादों के नाम, मात्रा, दर, छूट और कुल राशि की पहचान की जा रही है...
            </p>
          </div>
          <div className="max-w-xs mx-auto bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* Error Message */}
      {scanError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="font-bold">स्कैनिंग में समस्या आई</p>
            <p>{scanError}</p>
          </div>
        </div>
      )}

      {/* DUAL PANEL REVIEW & CONFIRM SCREEN */}
      {imagePreview && !isScanning && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Zoomable Bill Image (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  मूल बिल / पर्ची की फोटो
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                    title="ज़ूम इन"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                    title="ज़ूम आउट"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRotation(prev => (prev + 90) % 360)}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                    title="घुमाएं"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Image Box */}
              <div className="w-full h-80 sm:h-96 bg-gray-950 rounded-2xl overflow-hidden flex items-center justify-center relative border border-gray-800">
                <img
                  src={imagePreview}
                  alt="Scanned Bill"
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                />
              </div>

              {scanResult && (
                <div className="p-3 bg-gray-50 rounded-2xl text-[11px] text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>दस्तावेज़ प्रकार:</span>
                    <strong className="text-gray-900">{scanResult.documentTypeHindi}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>हस्तलिखित (Handwritten):</span>
                    <strong>{scanResult.isHandwritten ? 'हाँ (कच्ची पर्ची)' : 'नहीं (प्रिंटेड बिल)'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>OCR विश्वसनीयता स्कोर:</span>
                    <span className="font-bold text-emerald-700">{Math.round(scanResult.confidenceScore * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Editable Form & Items Review (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
              {/* Review Header Banner */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-700" />
                <div>
                  <p className="font-bold">सत्यापन आवश्यक (Review Before Saving)</p>
                  <p className="text-[11px] text-amber-800">
                    कृपया AI द्वारा निकाली गई दरों व मात्रा को बाईं ओर की फोटो से मिला लें। आप किसी भी फ़ील्ड को यहाँ बदल सकते हैं।
                  </p>
                </div>
              </div>

              {/* Document Conversion Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">
                  यह बिल किस श्रेणी में दर्ज करना है?
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  {[
                    { id: 'wholesaler_invoice', label: 'थोक खरीद (Purchase)', icon: Truck },
                    { id: 'customer_bill', label: 'ग्राहक बिक्री (Sale)', icon: ShoppingBag },
                    { id: 'expense_receipt', label: 'दुकान खर्च (Expense)', icon: Receipt },
                  ].map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setDocType(t.id as any)}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                          docType === t.id
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    {docType === 'wholesaler_invoice' ? 'थोक व्यापारी / सप्लायर' : docType === 'customer_bill' ? 'किसान / ग्राहक' : 'प्राप्तकर्ता / वेंडर'}
                  </label>
                  <input
                    type="text"
                    value={partyName}
                    onChange={e => setPartyName(e.target.value)}
                    placeholder="उदा. धानुका एग्रीटेक / श्याम पाटीदार"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">मोबाइल नंबर</label>
                  <input
                    type="tel"
                    value={partyPhone}
                    onChange={e => setPartyPhone(e.target.value)}
                    placeholder="उदा. 98260XXXXX"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">बिल / इनवॉइस नंबर</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder="उदा. INV-2026-981"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">बिल की तारीख</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* If Expense, show category selector */}
              {docType === 'expense_receipt' && (
                <div className="text-xs">
                  <label className="font-bold text-gray-700 block mb-1">खर्च की श्रेणी (Expense Category)</label>
                  <select
                    value={expenseCategoryId}
                    onChange={e => setExpenseCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.hindiName} ({cat.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Items Table (For Purchase & Sale) */}
              {docType !== 'expense_receipt' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">
                      निकाले गए उत्पाद ({extractedItems.length})
                    </h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" /> + नया उत्पाद पंक्ति जोड़ें
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {extractedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="दवाई/खाद का नाम (Hindi/English)"
                            value={item.hindiName || item.name}
                            onChange={e => {
                              handleItemChange(idx, 'hindiName', e.target.value);
                              handleItemChange(idx, 'name', e.target.value);
                            }}
                            className="flex-1 p-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4 flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 font-bold">मात्रा:</span>
                            <input
                              type="number"
                              step="any"
                              value={item.quantity}
                              onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-14 p-1.5 text-center font-bold bg-white border border-gray-200 rounded-xl"
                            />
                            <select
                              value={item.unit}
                              onChange={e => handleItemChange(idx, 'unit', e.target.value)}
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
                            <span className="text-[10px] text-gray-500 font-bold">दर: ₹</span>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                              className="w-16 p-1.5 text-center font-bold bg-white border border-gray-200 rounded-xl"
                            />
                          </div>

                          <div className="col-span-4 text-right font-extrabold text-gray-900">
                            कुल: ₹{item.totalPrice}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Totals & Discounts */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>उप-कुल (Items Subtotal):</span>
                  <span>₹{itemsSubtotal}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">छूट: ₹</span>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={e => setDiscountAmount(Number(e.target.value))}
                      className="w-20 p-1 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-gray-500">टैक्स (GST): ₹</span>
                    <input
                      type="number"
                      value={taxAmount}
                      onChange={e => setTaxAmount(Number(e.target.value))}
                      className="w-20 p-1 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-gray-900 pt-2 border-t border-gray-300">
                  <span>अंतिम कुल योग (Grand Total):</span>
                  <span className="text-amber-900">₹{calculatedGrandTotal}</span>
                </div>
              </div>

              {/* Payment Status & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">भुगतान का माध्यम</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none font-bold"
                  >
                    <option value="cash">नकद (Cash)</option>
                    <option value="online">ऑनलाइन (UPI/Bank)</option>
                    <option value="udhari">उधारी (Credit Due)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">तुरंत चुकाई/प्राप्त राशि ₹</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveConfirmedEntry}
                  className="w-full py-3.5 px-6 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl font-extrabold text-sm sm:text-base shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    'सुरक्षित हो रहा है...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      डेटा की पुष्टि करें एवं सेव करें (Confirm & Save Entry) · ₹{calculatedGrandTotal}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingSmartScanner;
