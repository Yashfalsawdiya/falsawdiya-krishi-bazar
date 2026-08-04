import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Key,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Percent,
  Truck,
  HelpCircle,
  ShieldCheck,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  fetchRazorpayConfig,
  saveRazorpayConfig,
  RazorpayConfig,
} from '../services/razorpay';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface OrderRecord {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  status: string;
  paymentStatus: string;
  customerDetails: {
    name?: string;
    phone?: string;
    addressHouse?: string;
    addressCity?: string;
    addressDistrict?: string;
    addressState?: string;
    addressPincode?: string;
  };
  items: Array<{
    id?: string;
    name?: string;
    hindiName?: string;
    brand?: string;
    quantity: number;
    price: number;
    unit?: string;
  }>;
  subtotal: number;
  gstAmount: number;
  platformCharge: number;
  deliveryFee: number;
  totalAmount: number;
  isTestMode?: boolean;
  createdAt: number;
}

const RazorpayAdminSection: React.FC = () => {
  const [config, setConfig] = useState<RazorpayConfig>({
    keyId: '',
    isTestMode: true,
    gstPercentage: 18,
    platformChargePercentage: 0,
    deliveryFee: 0,
    isRazorpayEnabled: true,
    isDeliveryActive: true,
    hasKeySecret: false,
  });

  const [keySecretInput, setKeySecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'orders' | 'testGuide'>('settings');

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Listen to live orders from Firestore
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const orderList = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as OrderRecord[];
        setOrders(orderList);
      },
      (err) => {
        console.error('Error fetching orders:', err);
        handleFirestoreError(err, OperationType.LIST, 'orders');
      }
    );

    return () => unsub();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRazorpayConfig();
      setConfig(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      const result = await saveRazorpayConfig({
        keyId: config.keyId.trim(),
        keySecret: keySecretInput.trim() ? keySecretInput.trim() : undefined,
        isTestMode: config.isTestMode,
        gstPercentage: Number(config.gstPercentage) || 0,
        platformChargePercentage: Number(config.platformChargePercentage) || 0,
        deliveryFee: Number(config.deliveryFee) || 0,
        isRazorpayEnabled: config.isRazorpayEnabled,
        isDeliveryActive: config.isDeliveryActive !== false,
      });

      if (result.success) {
        setSaveSuccessMsg('Razorpay सेटअप और शुल्क दरें सफलतापूर्वक अपडेट कर दी गईं!');
        setKeySecretInput('');
        loadConfig();
      } else {
        setSaveErrorMsg(result.error || 'सेटिंग सुरक्षित करने में समस्या आई।');
      }
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'त्रुटि हुई');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.customerDetails?.name?.toLowerCase().includes(q) ||
      o.customerDetails?.phone?.includes(q) ||
      o.razorpayPaymentId?.toLowerCase().includes(q) ||
      o.razorpayOrderId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1A3A16] to-[#2D5A27] text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-extrabold text-amber-300 mb-2 backdrop-blur-sm">
              <CreditCard className="w-3.5 h-3.5" /> Razorpay E-Commerce Checkout
            </div>
            <h2 className="text-xl font-black">Razorpay पेमेंट गेटवे & ऑर्डर्स मैनेजमेंट</h2>
            <p className="text-xs text-white/80 mt-1 max-w-xl">
              बिना कोड बदले एडमिन पैनल से सीधे Key ID, Secret, GST, प्लेटफ़ॉर्म चार्ज और टेस्ट मोड/लाइव मोड कंट्रोल करें।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm ${
                config.isTestMode
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-emerald-400 text-emerald-950'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              {config.isTestMode ? 'TEST MODE (परीक्षण मोड)' : 'LIVE MODE (लाइव मोड)'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'settings'
              ? 'bg-[#2D5A27] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Key className="w-4 h-4" /> Keys & शुल्क सेटिंग्स
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'orders'
              ? 'bg-[#2D5A27] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> प्राप्त ऑर्डर्स ({orders.length})
        </button>

        <button
          onClick={() => setActiveSubTab('testGuide')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'testGuide'
              ? 'bg-[#2D5A27] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-amber-300" /> टेस्ट कैसे करें? (Test Guide)
        </button>
      </div>

      {/* TAB 1: Razorpay API Keys & Settings Form */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSave} className="space-y-6">
          {saveSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {saveErrorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{saveErrorMsg}</span>
            </div>
          )}

          {/* Settings Group 1: Status & Mode */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-[#2D5A27]" /> गेटवे स्थिति & मोड कंट्रोल (Gateway Status)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Delivery Status Toggle */}
              <div className="flex items-center justify-between p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/60">
                <div>
                  <label className="text-xs font-black text-emerald-900 block flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#2D5A27]" /> डिलीवरी सेवा (Delivery Status)
                  </label>
                  <p className="text-[10px] text-emerald-800 mt-0.5">
                    {config.isDeliveryActive !== false
                      ? "चालू है (Active)"
                      : "बंद है (Suspended Popup)"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.isDeliveryActive !== false}
                  onChange={(e) => setConfig({ ...config, isDeliveryActive: e.target.checked })}
                  className="w-5 h-5 accent-[#2D5A27] cursor-pointer"
                />
              </div>

              {/* Enable / Disable Razorpay */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <label className="text-xs font-bold text-gray-800 block">
                    Razorpay भुगतान (Gateway)
                  </label>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    चेकआउट पेज पर ऑनलाइन भुगतान
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.isRazorpayEnabled}
                  onChange={(e) => setConfig({ ...config, isRazorpayEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[#2D5A27] cursor-pointer"
                />
              </div>

              {/* Test Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60">
                <div>
                  <label className="text-xs font-black text-amber-900 block flex items-center gap-1.5">
                    टेस्ट मोड (Test Mode)
                  </label>
                  <p className="text-[10px] text-amber-800 mt-0.5">
                    परीक्षण मोड चालू/बंद करें
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.isTestMode}
                  onChange={(e) => setConfig({ ...config, isTestMode: e.target.checked })}
                  className="w-5 h-5 accent-amber-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Settings Group 2: Credentials */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#2D5A27]" /> Razorpay API Credentials (Key ID & Secret)
              </h3>
              <a
                href="https://dashboard.razorpay.com/#/app/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                Razorpay Dashboard खोलें <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-4 text-xs">
              {/* Key ID */}
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 mb-1">
                  Razorpay Key ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder={config.isTestMode ? 'rzp_test_XXXXXXXXXXXXXX' : 'rzp_live_XXXXXXXXXXXXXX'}
                  value={config.keyId}
                  onChange={(e) => setConfig({ ...config, keyId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800 focus:border-[#2D5A27] focus:bg-white outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  उदा: {config.isTestMode ? 'rzp_test_1234567890ABCD' : 'rzp_live_1234567890ABCD'}
                </p>
              </div>

              {/* Key Secret */}
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 mb-1 flex items-center justify-between">
                  <span>
                    Razorpay Key Secret {config.hasKeySecret ? '(पहलें से सुरक्षित है)' : '*'}
                  </span>
                  {config.hasKeySecret && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      ✓ Secret Saved
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder={
                      config.hasKeySecret
                        ? 'सुरक्षित है (बदलने के लिए नया Secret टाइप करें)'
                        : 'Key Secret दर्ज करें...'
                    }
                    value={keySecretInput}
                    onChange={(e) => setKeySecretInput(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800 focus:border-[#2D5A27] focus:bg-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  नोट: Key Secret सर्वर-साइड सुरक्षित रहता है और कभी भी किसी यूजर को नहीं दिखता।
                </p>
              </div>
            </div>
          </div>

          {/* Settings Group 3: Charges & Taxes */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Percent className="w-4 h-4 text-[#2D5A27]" /> कर और अतिरिक्त शुल्क सेटिंग्स (GST & Charges)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* GST % */}
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 mb-1">
                  GST प्रतिशत (GST %)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={config.gstPercentage}
                    onChange={(e) =>
                      setConfig({ ...config, gstPercentage: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:border-[#2D5A27] focus:bg-white outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">उदा: 18% या 0%</p>
              </div>

              {/* Platform Charge % */}
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 mb-1">
                  प्लेटफ़ॉर्म चार्ज % (Platform Fee)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={config.platformChargePercentage}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        platformChargePercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:border-[#2D5A27] focus:bg-white outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">उदा: 2% या 3%</p>
              </div>

              {/* Fixed Delivery Fee */}
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-amber-600" /> फिक्स्ड डिलीवरी शुल्क (Delivery Fee ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={config.deliveryFee}
                    onChange={(e) =>
                      setConfig({ ...config, deliveryFee: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:border-[#2D5A27] focus:bg-white outline-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">उदा: ₹50 या मुफ़्त डिलीवरी के लिए ₹0</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-[#2D5A27] text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-[#1E3E1B] transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                सुरक्षित हो रहा है...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Razorpay सेटिंग्स सुरक्षित करें (Save Razorpay Settings)
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 2: Live Received Orders List */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="ग्राहक नाम, मोबाइल नंबर या Payment ID से खोजें..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 outline-none focus:border-[#2D5A27]"
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 text-xs">
              कोई ऑनलाइन ऑर्डर प्राप्त नहीं हुआ है।
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ✓ {order.status || 'भुगतान सफल'}
                      </span>
                      {order.isTestMode && (
                        <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md ml-1.5 border border-amber-200">
                          TEST ORDER
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold">
                      {new Date(order.createdAt).toLocaleString('hi-IN')}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-black text-gray-800">{order.customerDetails?.name || 'अज्ञात ग्राहक'}</p>
                      <p className="text-[#2D5A27] font-bold mt-0.5">📞 {order.customerDetails?.phone}</p>
                      <p className="text-gray-500 text-[11px] mt-1">
                        📍 {order.customerDetails?.addressHouse}, {order.customerDetails?.addressCity},{' '}
                        {order.customerDetails?.addressDistrict}, {order.customerDetails?.addressState} -{' '}
                        {order.customerDetails?.addressPincode}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-1 text-[11px]">
                      <p className="text-gray-500">
                        Payment ID: <span className="font-mono text-gray-800 font-bold">{order.razorpayPaymentId}</span>
                      </p>
                      <p className="text-gray-500">
                        Order ID: <span className="font-mono text-gray-800">{order.razorpayOrderId}</span>
                      </p>
                    </div>
                  </div>

                  {/* Order items */}
                  <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/50 space-y-1">
                    <p className="text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-1">
                      खरीदे गए उत्पाद (Items):
                    </p>
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-gray-700">
                        <span>
                          {item.hindiName || item.name} ({item.unit}) x {item.quantity}
                        </span>
                        <span className="font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total Breakdown */}
                  <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <div className="text-[10px] text-gray-500 space-x-2">
                      <span>सबटोटल: ₹{order.subtotal}</span>
                      {order.gstAmount > 0 && <span>| GST: +₹{order.gstAmount}</span>}
                      {order.platformCharge > 0 && <span>| चार्ज: +₹{order.platformCharge}</span>}
                      {order.deliveryFee > 0 && <span>| डिलीवरी: +₹{order.deliveryFee}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-semibold block">कुल भुगतान</span>
                      <span className="text-base font-black text-[#2D5A27]">₹{order.totalAmount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Testing Guide & Instructions */}
      {activeSubTab === 'testGuide' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5 text-xs">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">
                Razorpay पेमेंट गेटवे कैसे टेस्ट करें? (Testing Instructions)
              </h3>
              <p className="text-gray-500 text-[11px]">
                बिना असली पैसे खर्च किए पूरा ऑनलाइन ऑर्डर फ्लो टेस्ट करने की स्टेप-बाय-स्टेप गाइड
              </p>
            </div>
          </div>

          <div className="space-y-4 text-gray-700 leading-relaxed">
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 space-y-2">
              <h4 className="font-black text-amber-950 text-sm flex items-center gap-1.5">
                <span className="bg-amber-500 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">
                  1
                </span>
                टेस्ट मोड ऑन करें (Turn ON Test Mode)
              </h4>
              <p className="text-[11px] text-amber-900">
                ऊपर <strong>"Keys & शुल्क सेटिंग्स"</strong> टैब में जाएं और{' '}
                <strong>"टेस्ट मोड एक्टिवेट करें"</strong> चेकबॉक्स को ऑन रखें।
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200/80 space-y-2">
              <h4 className="font-black text-blue-950 text-sm flex items-center gap-1.5">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">
                  2
                </span>
                Razorpay टेस्ट Keys डालें (Enter Test Keys)
              </h4>
              <p className="text-[11px] text-blue-900">
                अपने Razorpay Dashboard (https://dashboard.razorpay.com) से Test Key ID (उदाँ:
                <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono font-bold text-blue-800 ml-1">
                  rzp_test_...
                </code>
                ) और Test Key Secret कॉपी करके एडमिन पैनल में पेस्ट करें और सेव बटन दबाएं।
              </p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
              <h4 className="font-black text-emerald-950 text-sm flex items-center gap-1.5">
                <span className="bg-emerald-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">
                  3
                </span>
                एप में ऑर्डर प्लेस करें (Place Test Order)
              </h4>
              <p className="text-[11px] text-emerald-900">
                एप के किसी भी उत्पाद को कार्ट में जोड़ें और <strong>"ऑनलाइन भुगतान करें (Razorpay)"</strong> पर
                क्लिक करें। जब Razorpay का पॉपअप खुलेगा, तब नीचे दिए गए टेस्ट क्रेडेंशियल का उपयोग करें:
              </p>

              <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="font-bold text-gray-600 font-sans">परीक्षण UPI ID (Success):</span>
                  <span className="text-emerald-700 font-bold">success@razorpay</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="font-bold text-gray-600 font-sans">परीक्षण UPI ID (Failure):</span>
                  <span className="text-rose-600 font-bold">failure@razorpay</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="font-bold text-gray-600 font-sans">टेस्ट कार्ड नंबर:</span>
                  <span className="text-gray-800">4111 1111 1111 1111</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600 font-sans">कार्ड Expiry / CVV / OTP:</span>
                  <span className="text-gray-800">12/28 | CVV: 123 | OTP: 123456</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200/80 space-y-2">
              <h4 className="font-black text-purple-950 text-sm flex items-center gap-1.5">
                <span className="bg-purple-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">
                  4
                </span>
                लाइव मोड में स्विच करना (Go Live Anytime)
              </h4>
              <p className="text-[11px] text-purple-900">
                जब आप असली ग्राहकों से ऑनलाइन पेमेंट प्राप्त करने के लिए तैयार हों, तो बस अपने Razorpay Dashboard
                से <strong>Live Key ID</strong> और <strong>Live Key Secret</strong> पेस्ट करें, <strong>"टेस्ट मोड"</strong> Uncheck
                करें और Save कर दें! कोड में 1 लाइन का भी बदलाव नहीं करना पड़ेगा।
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RazorpayAdminSection;
