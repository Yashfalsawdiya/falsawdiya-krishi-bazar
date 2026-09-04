import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, IndianRupee, Truck, Calendar, CreditCard, 
  FileText, CheckCircle2, AlertCircle, ArrowDownLeft 
} from 'lucide-react';
import { AccountingSupplier, AccountingPurchase } from '../../types/accounting';
import { recordSupplierPayment } from '../../services/accountingService';

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  suppliers: AccountingSupplier[];
  purchases: AccountingPurchase[];
  initialSupplierId?: string;
  initialPurchaseId?: string;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  suppliers,
  purchases,
  initialSupplierId,
  initialPurchaseId,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'online' | 'cash' | 'bank'>('online');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const supplierId = initialSupplierId || (suppliers.length > 0 ? suppliers[0].id : '');
      setSelectedSupplierId(supplierId);
      setSelectedPurchaseId(initialPurchaseId || '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('online');
      setPaymentNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, initialSupplierId, initialPurchaseId, suppliers]);

  // Selected supplier object
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Pending invoices for this supplier
  const supplierPendingPurchases = useMemo(() => {
    if (!selectedSupplierId) return [];
    return purchases.filter(p => {
      const matchesSupplier = p.supplierId === selectedSupplierId;
      const hasUdhari = (p.unpaidSupplierUdhari || 0) > 0 || (p.paymentStatus && p.paymentStatus !== 'paid');
      return matchesSupplier && hasUdhari;
    });
  }, [purchases, selectedSupplierId]);

  // Selected purchase invoice object
  const selectedPurchase = useMemo(() => {
    if (!selectedPurchaseId) return null;
    return purchases.find(p => p.id === selectedPurchaseId) || null;
  }, [purchases, selectedPurchaseId]);

  // Determine current outstanding amount to settle
  const currentOutstanding = useMemo(() => {
    if (selectedPurchase) {
      return selectedPurchase.unpaidSupplierUdhari || 0;
    }
    if (selectedSupplier) {
      return selectedSupplier.currentOutstanding || 0;
    }
    return 0;
  }, [selectedPurchase, selectedSupplier]);

  // Auto-fill amount when purchase or supplier changes if not yet typed
  useEffect(() => {
    if (currentOutstanding > 0 && paymentAmount === 0) {
      setPaymentAmount(currentOutstanding);
    }
  }, [currentOutstanding]);

  if (!isOpen) return null;

  // Remaining calculation
  const remainingAfterPayment = Math.max(0, currentOutstanding - (paymentAmount || 0));
  const isFullySettled = paymentAmount >= currentOutstanding && currentOutstanding > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedSupplier) {
      setErrorMsg('कृपया सप्लायर चुनें।');
      return;
    }

    if (paymentAmount <= 0) {
      setErrorMsg('कृपया 0 से अधिक भुगतान राशि दर्ज करें।');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordSupplierPayment({
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        purchaseId: selectedPurchase?.id,
        invoiceNumber: selectedPurchase?.invoiceNumber,
        amount: Number(paymentAmount),
        paymentMode,
        paymentDate,
        notes: paymentNotes.trim(),
      });

      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording supplier payment:', err);
      setErrorMsg(err.message || 'भुगतान दर्ज करने में समस्या आई।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Supplier Payment दर्ज करें</h3>
              <p className="text-xs text-gray-500">थोक विक्रेता / डिस्ट्रीब्यूटर को भुगतान रिकॉर्ड करें</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Supplier Selection */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">सप्लायर / फर्म चुनें *</label>
            <select
              value={selectedSupplierId}
              onChange={e => {
                setSelectedSupplierId(e.target.value);
                setSelectedPurchaseId('');
                setPaymentAmount(0);
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="">-- सप्लायर चुनें --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.companyName ? `(${s.companyName})` : ''} — बकाया: ₹{(s.currentOutstanding || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Invoice Selection (Optional or specific pending invoice) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-gray-700">इनवॉइस / बिल संदर्भ</label>
              <span className="text-[11px] text-gray-400">
                {supplierPendingPurchases.length} बकाया इनवॉइस उपलब्ध
              </span>
            </div>
            <select
              value={selectedPurchaseId}
              onChange={e => {
                setSelectedPurchaseId(e.target.value);
                const p = purchases.find(item => item.id === e.target.value);
                if (p) {
                  setPaymentAmount(p.unpaidSupplierUdhari || 0);
                } else if (selectedSupplier) {
                  setPaymentAmount(selectedSupplier.currentOutstanding || 0);
                }
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">खाते में सामान्य जमा (On Account / All Pending Invoices)</option>
              {supplierPendingPurchases.map(p => (
                <option key={p.id} value={p.id}>
                  बिल #{p.invoiceNumber} · {p.invoiceDate} (कुल: ₹{p.grandTotal.toLocaleString()} | बाकी: ₹{p.unpaidSupplierUdhari.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Outstanding Summary Banner */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-700 font-medium block">
                {selectedPurchase ? `बिल #${selectedPurchase.invoiceNumber} पर कुल बकाया:` : 'सप्लायर पर कुल उधारी बकाया:'}
              </span>
              <span className="text-lg font-extrabold text-blue-950">
                ₹{currentOutstanding.toLocaleString()}
              </span>
            </div>
            {currentOutstanding > 0 && (
              <button
                type="button"
                onClick={() => setPaymentAmount(currentOutstanding)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                पूरा भरें (Pay Full)
              </button>
            )}
          </div>

          {/* 4. Payment Amount & Quick Chips */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">भुगतान राशि (Payment Amount) ₹ *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={paymentAmount || ''}
                onChange={e => setPaymentAmount(Math.max(0, Number(e.target.value)))}
                placeholder="राशि दर्ज करें..."
                className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-extrabold text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[500, 1000, 2000, 5000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPaymentAmount(amt)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition-all"
                >
                  +₹{amt.toLocaleString()}
                </button>
              ))}
              {currentOutstanding > 0 && (
                <button
                  type="button"
                  onClick={() => setPaymentAmount(currentOutstanding)}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-all"
                >
                  पूरा बकाया: ₹{currentOutstanding.toLocaleString()}
                </button>
              )}
            </div>
          </div>

          {/* Live Balance Status Preview */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
            <div className="flex justify-between items-center text-gray-600">
              <span>भुगतान के बाद शेष बाकी:</span>
              <span className="font-bold text-gray-900">
                ₹{remainingAfterPayment.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-gray-200 text-[11px]">
              <span>अनुमानित स्थिति (Status):</span>
              <span className={`font-extrabold px-2 py-0.5 rounded-full ${
                isFullySettled
                  ? 'bg-emerald-100 text-emerald-800'
                  : paymentAmount > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {isFullySettled ? 'Paid / Cleared (पूर्ण चुकता)' : paymentAmount > 0 ? 'Partially Paid (आंशिक भुगतान)' : 'Unpaid (अदत्त)'}
              </span>
            </div>
          </div>

          {/* 5. Payment Date & Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1">भुगतान तारीख</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">भुगतान माध्यम</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as any)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="online">ऑनलाइन (UPI / NEFT / RTGS)</option>
                <option value="cash">नकद (Cash Outflow)</option>
                <option value="bank">बैंक चेक / ड्राफ्ट</option>
              </select>
            </div>
          </div>

          {/* 6. Notes / Reference */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">टिप्पणी / संदर्भ (UTR या चेक नं.)</label>
            <input
              type="text"
              placeholder="उदा. UTR: 423987123 / चेक नं. 504210"
              value={paymentNotes}
              onChange={e => setPaymentNotes(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* 7. Cash Flow Integration Callout */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-2 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>स्वचालित कैश फ्लो इंटीग्रेशन:</strong> यह सप्लायर भुगतान आपके बिजनेस खर्च (Cash Out / Outflow) में स्वतः जुड़ जाएगा, अलग से खर्च में एंट्री नहीं करनी पड़ेगी।
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting || paymentAmount <= 0}
            className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-extrabold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <IndianRupee className="w-4 h-4" />
            <span>
              {isSubmitting ? 'भुगतान दर्ज हो रहा है...' : `सप्लायर भुगतान दर्ज करें · ₹${(paymentAmount || 0).toLocaleString()}`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
