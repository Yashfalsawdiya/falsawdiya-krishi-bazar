import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Order, 
  DeliveryPartner, 
  DeliveryPartnerAvailability, 
  PartnerAssignmentStatus 
} from '../types';
import { 
  fetchDeliveryPartners, 
  findDeliveryPartnerByUser, 
  listenOrdersForDeliveryPartner, 
  partnerRespondToOrder, 
  partnerUpdateDeliveryProgress, 
  updatePartnerAvailability 
} from '../services/deliveryPartnerService';
import { 
  Truck, Package, Phone, MapPin, CheckCircle2, 
  XCircle, AlertCircle, Clock, Navigation, Check, 
  X, RefreshCw, ChevronRight, User, Shield, 
  Power, ArrowLeft, Send, Sparkles, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatFullHindiDate } from '../lib/dateUtils';

export const DeliveryOrdersPage: React.FC = () => {
  const { user, login, loading: authLoading } = useAppContext();
  const navigate = useNavigate();

  const [partnerProfile, setPartnerProfile] = useState<DeliveryPartner | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Decline Modal
  const [decliningOrder, setDecliningOrder] = useState<Order | null>(null);
  const [declineReason, setDeclineReason] = useState('गाड़ी में खराबी / उपलब्ध नहीं');

  // Complete Delivery Modal
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryOtp, setDeliveryOtp] = useState('');

  // Issue / Fail Modal
  const [failingOrder, setFailingOrder] = useState<Order | null>(null);
  const [failReason, setFailReason] = useState('किसान भाई पते पर उपलब्ध नहीं मिले');

  // Load partner profile
  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;

    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const allPartners = await fetchDeliveryPartners();
        const found = findDeliveryPartnerByUser(allPartners, user.email, user.phoneNumber);
        
        if (found) {
          setPartnerProfile(found);
          unsubscribeOrders = listenOrdersForDeliveryPartner(found, (partnerOrders) => {
            setOrders(partnerOrders);
            setLoading(false);
          });
        } else {
          setPartnerProfile(null);
          setLoading(false);
        }
      } catch (e) {
        console.error("Error loading partner portal:", e);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [user]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Toggle partner live availability
  const handleToggleAvailability = async () => {
    if (!partnerProfile) return;
    const nextStatus: DeliveryPartnerAvailability = 
      partnerProfile.availabilityStatus === 'available' ? 'off_duty' : 'available';

    setPartnerProfile(prev => prev ? ({ ...prev, availabilityStatus: nextStatus }) : null);
    await updatePartnerAvailability(partnerProfile.id, nextStatus);
    showFeedback(nextStatus === 'available' ? 'आपकी स्थिति: उपलब्ध (Ready for Delivery) सेट हो गई।' : 'आपकी स्थिति: ऑफ ड्यूटी (Off Duty) सेट हो गई।');
  };

  // Accept Order
  const handleAcceptOrder = async (order: Order) => {
    if (!partnerProfile) return;
    setActionLoadingId(order.id);
    try {
      const res = await partnerRespondToOrder(order.id, partnerProfile.id, 'accept');
      if (res.success) {
        showFeedback(`ऑर्डर ${order.orderNumber} स्वीकार कर लिया गया है!`);
      } else {
        showFeedback(res.error || 'ऑर्डर स्वीकार करने में त्रुटि।', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Decline Order
  const handleConfirmDecline = async () => {
    if (!decliningOrder || !partnerProfile) return;
    setActionLoadingId(decliningOrder.id);
    try {
      const res = await partnerRespondToOrder(decliningOrder.id, partnerProfile.id, 'decline', declineReason);
      if (res.success) {
        showFeedback(`ऑर्डर ${decliningOrder.orderNumber} अस्वीकार किया गया।`);
        setDecliningOrder(null);
      } else {
        showFeedback(res.error || 'त्रुटि हुई।', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Update Delivery Progress (Picked Up, Out for delivery, Delivered)
  const handleUpdateProgress = async (
    order: Order, 
    progress: 'picked_up' | 'out_for_delivery' | 'delivered' | 'failed',
    note?: string,
    otp?: string
  ) => {
    if (!partnerProfile) return;
    setActionLoadingId(order.id);
    try {
      const res = await partnerUpdateDeliveryProgress(order.id, partnerProfile.id, progress, note, otp);
      if (res.success) {
        if (progress === 'picked_up') {
          showFeedback('सामान वेयरहाउस से पिकअप कर लिया गया है!');
        } else if (progress === 'out_for_delivery') {
          showFeedback('ऑर्डर डिलीवरी के लिए रवाना (Out for Delivery) हो गया!');
        } else if (progress === 'delivered') {
          showFeedback('बधाई हो! ऑर्डर सफलतापूर्वक डिलीवर चिह्नित किया गया।');
          setCompletingOrder(null);
        } else if (progress === 'failed') {
          showFeedback('ऑर्डर डिलीवरी समस्या दर्ज कर दी गई है।', 'error');
          setFailingOrder(null);
        }
      } else {
        showFeedback(res.error || 'स्टेटस अपडेट करने में समस्या आई।', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 border-4 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-gray-700">डिलीवरी पोर्टल लोड हो रहा है...</p>
        <p className="text-xs text-gray-400 mt-1">कृषि साथी डिलीवरी नेटवर्क</p>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-[#2D5A27]/10 text-[#2D5A27] rounded-3xl flex items-center justify-center mb-4">
          <Truck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">डिलीवरी पार्टनर लॉगिन</h2>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          आपको सौंपे गए कृषि उत्पाद डिलीवरी ऑर्डर्स देखने और स्टेटस बदलने के लिए अपने पंजीकृत Google खाते से लॉगिन करें।
        </p>
        <button
          onClick={login}
          className="w-full bg-[#2D5A27] text-white py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <User className="w-4 h-4" /> Google से लॉगिन करें
        </button>
      </div>
    );
  }

  // Logged in but not registered as a delivery partner
  if (!partnerProfile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900">डिलीवरी पार्टनर खाता नहीं मिला</h2>
        <p className="text-xs text-gray-600 leading-relaxed font-medium">
          आपका ईमेल <b>{user.email}</b> अभी फल्सावदिया कृषि बाजार में डिलीवरी पार्टनर के रूप में पंजीकृत नहीं है।
        </p>
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-left text-xs space-y-2">
          <p className="font-bold text-gray-800">क्या करें?</p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 text-[11px]">
            <li>कृपया स्टोर एडमिन से अपना मोबाइल नंबर और Gmail ID <b>Admin Panel → Delivery Partners</b> में जुड़वाएँ।</li>
            <li>यदि आपने दूसरे Gmail से रजिस्ट्रेशन करवाया है, तो उस खाते से लॉगिन करें।</li>
          </ul>
        </div>
        <div className="flex gap-3 w-full pt-2">
          <button
            onClick={() => navigate('/profile')}
            className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl text-xs hover:bg-gray-200"
          >
            मेरी प्रोफाइल
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-[#2D5A27] text-white font-bold py-3 rounded-2xl text-xs hover:bg-[#23461e]"
          >
            होम पेज
          </button>
        </div>
      </div>
    );
  }

  // Filter orders by Active vs Completed
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'delivered');

  const displayedOrders = activeTab === 'active' ? activeOrders : completedOrders;

  return (
    <div className="space-y-5 pb-24 max-w-2xl mx-auto">
      {/* Top Header & Partner Info Bar */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <h1 className="text-base font-black text-gray-900 flex items-center justify-center gap-1.5">
              <Truck className="w-5 h-5 text-[#2D5A27]" />
              <span>डिलीवरी हेतु ऑर्डर (Delivery Portal)</span>
            </h1>
            <span className="text-[10px] text-gray-400 font-medium">फल्सावदिया कृषि बाजार डिलीवरी साथी</span>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-9 h-9 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
            title="रिफ्रेश करें"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Partner Identity Card */}
        <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-emerald-200 text-[#2D5A27] flex items-center justify-center font-black text-lg shadow-2xs">
              {partnerProfile.vehicleType === 'truck' ? '🚛' : partnerProfile.vehicleType === 'pickup' ? '🛻' : partnerProfile.vehicleType === 'tempo' ? '🚚' : partnerProfile.vehicleType === 'e_rickshaw' ? '🛺' : '🛵'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-emerald-950">{partnerProfile.name}</h3>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  डिलीवरी बॉय
                </span>
              </div>
              <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
                <span>{partnerProfile.vehicleTypeName || partnerProfile.vehicleType}</span>
                {partnerProfile.vehicleNumber && (
                  <span className="font-mono text-emerald-700">({partnerProfile.vehicleNumber})</span>
                )}
              </p>
            </div>
          </div>

          {/* Availability Toggle */}
          <button
            type="button"
            onClick={handleToggleAvailability}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-2xs border",
              partnerProfile.availabilityStatus === 'available' 
                ? "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100" 
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
            )}
          >
            <span className={cn(
              "w-2 h-2 rounded-full",
              partnerProfile.availabilityStatus === 'available' ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
            )}></span>
            <span>{partnerProfile.availabilityStatus === 'available' ? 'स्थिति: उपलब्ध (Ready)' : 'स्थिति: ऑफ ड्यूटी (Off Duty)'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-sm",
            feedback.type === 'success' ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-red-50 text-red-900 border border-red-200"
          )}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{feedback.text}</span>
        </motion.div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all",
            activeTab === 'active' ? "bg-[#2D5A27] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Package className="w-3.5 h-3.5" />
          <span>सक्रिय ऑर्डर्स ({activeOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all",
            activeTab === 'completed' ? "bg-[#2D5A27] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>डिलीवर हो चुके ({completedOrders.length})</span>
        </button>
      </div>

      {/* Orders List */}
      {displayedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-gray-200 space-y-3">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-gray-700">
            {activeTab === 'active' ? 'फिलहाल कोई सक्रिय डिलीवरी असाइन नहीं है' : 'अभी तक कोई डिलीवर हुआ ऑर्डर नहीं है'}
          </h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            {activeTab === 'active' ? 'जैसे ही एडमिन द्वारा आपको कोई नया ऑर्डर सौंपा जाएगा, वह यहाँ तुरंत दिखाई देगा।' : 'जब आप सफलतापूर्वक ऑर्डर डिलीवर करेंगे, वे यहाँ रिकॉर्ड में दर्ज होंगे।'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map((order) => {
            const isLoading = actionLoadingId === order.id;
            const pStatus = order.partnerAssignmentStatus || 'assigned';
            const totalKg = order.deliverySnapshot?.totalWeightKg || order.items.reduce((sum, i) => sum + ((i.weightInKg || 0) * i.quantity), 0);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4 hover:border-[#2D5A27]/30 transition-all"
              >
                {/* Header: Order Number, Date & Status */}
                <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {formatFullHindiDate(order.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-bold mt-1">
                      कुल वजन: <b className="text-gray-800">{totalKg > 0 ? `${totalKg} kg` : 'मानक पार्सल'}</b> • {order.items.length} उत्पाद
                    </p>
                  </div>

                  {/* Partner Workflow Status Badge */}
                  <span className={cn(
                    "text-[10px] font-black px-2.5 py-1 rounded-full border",
                    order.status === 'delivered' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                    pStatus === 'out_for_delivery' ? "bg-blue-50 text-blue-800 border-blue-200" :
                    pStatus === 'picked_up' ? "bg-purple-50 text-purple-800 border-purple-200" :
                    pStatus === 'accepted' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                    pStatus === 'declined' ? "bg-red-50 text-red-800 border-red-200" :
                    "bg-amber-50 text-amber-800 border-amber-200"
                  )}>
                    {order.status === 'delivered' ? '✓ डिलीवर हुआ' :
                     pStatus === 'out_for_delivery' ? 'डिलीवरी के लिए रवाना' :
                     pStatus === 'picked_up' ? 'वेयरहाउस से पिकअप' :
                     pStatus === 'accepted' ? 'स्वीकृत (Accepted)' :
                     pStatus === 'declined' ? 'अस्वीकृत (Declined)' :
                     'असाइन हुआ (Assigned)'}
                  </span>
                </div>

                {/* Products List (Names, quantity, pack) */}
                <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    डिलीवर किए जाने वाले उत्पाद (Products to Deliver):
                  </span>
                  <div className="space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27]"></span>
                          <span className="font-bold">{item.hindiName || item.name}</span>
                          {item.brand && (
                            <span className="text-[11px] text-gray-500 font-normal">({item.brand})</span>
                          )}
                        </div>
                        <span className="font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 text-[11px]">
                          मात्रा: {item.quantity} {item.unit || 'पैकेट'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Location & Phone Actions */}
                <div className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-100/70 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        किसान ग्राहक विवरण (Customer Info):
                      </span>
                      <p className="text-xs font-black text-gray-900">{order.customerDetails?.name || 'किसान ग्राहक'}</p>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        {order.customerDetails?.addressHouse}, {order.customerDetails?.addressCity}, {order.customerDetails?.addressDistrict} ({order.customerDetails?.addressPincode})
                      </p>
                    </div>
                  </div>

                  {/* Customer Direct Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-100/60">
                    <a
                      href={`tel:${order.customerDetails?.phone}`}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>कॉल करें (+91 {order.customerDetails?.phone})</span>
                    </a>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.customerDetails?.addressHouse || ''}, ${order.customerDetails?.addressCity || ''}, ${order.customerDetails?.addressDistrict || ''} ${order.customerDetails?.addressPincode || ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Maps में रास्ता देखें</span>
                    </a>
                  </div>
                </div>

                {/* Status-specific Workflow Actions for Partner */}
                {order.status !== 'delivered' && (
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    {/* Stage 1: Assigned -> Option to Accept or Decline */}
                    {pStatus === 'assigned' && (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-medium">
                          🔔 एडमिन ने यह ऑर्डर आपको सौंपा है। कृपया पुष्टि करें कि आप इसे डिलीवर करने के लिए उपलब्ध हैं।
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleAcceptOrder(order)}
                            className="w-full bg-[#2D5A27] hover:bg-[#23461e] text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50"
                          >
                            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                            <span>मैं यह ऑर्डर डिलीवर करूँगा (Accept)</span>
                          </button>

                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => setDecliningOrder(order)}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            <span>अभी उपलब्ध नहीं हूँ (Decline)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stage 2: Accepted -> Pickup Action */}
                    {pStatus === 'accepted' && (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-medium">
                          📦 ऑर्डर स्वीकार हो गया है। वेयरहाउस/स्टोर से सामान लेकर पिकअप मार्क करें।
                        </div>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleUpdateProgress(order, 'picked_up', 'वेयरहाउस से पार्सल प्राप्त किया')}
                          className="w-full bg-purple-700 hover:bg-purple-800 text-white py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50"
                        >
                          {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-4 h-4" />}
                          <span>सामान उठाया (Parcel Picked Up)</span>
                        </button>
                      </div>
                    )}

                    {/* Stage 3: Picked Up -> Out for Delivery Action */}
                    {pStatus === 'picked_up' && (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs font-medium">
                          🛵 पार्सल पिकअप हो चुका है। किसान के पते पर निकलते समय नीचे क्लिक करें।
                        </div>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleUpdateProgress(order, 'out_for_delivery', 'डिलीवरी पार्टनर ग्राहक के पते पर रवाना')}
                          className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50"
                        >
                          {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-4 h-4" />}
                          <span>डिलीवरी के लिए निकला (Out for Delivery)</span>
                        </button>
                      </div>
                    )}

                    {/* Stage 4: Out for Delivery -> Mark Delivered or Issue */}
                    {pStatus === 'out_for_delivery' && (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs font-medium">
                          📍 आप डिलीवरी के लिए रास्ते में हैं। किसान को सामान सुपुर्द करने के बाद डिलीवरी पूर्ण करें।
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => {
                              setDeliveryNote('');
                              setDeliveryOtp('');
                              setCompletingOrder(order);
                            }}
                            className="w-full bg-[#2D5A27] hover:bg-[#23461e] text-white py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>सफलतापूर्वक डिलीवर हुआ (Mark Delivered)</span>
                          </button>

                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => setFailingOrder(order)}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>डिलीवरी विफल / समस्या दर्ज करें</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DECLINE REASON */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {decliningOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-gray-900">
                  डिलीवरी अस्वीकार करने का कारण
                </h3>
                <p className="text-xs text-gray-500">
                  ऑर्डर संख्या: <span className="font-bold text-gray-800">{decliningOrder.orderNumber}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">कारण चुनें या लिखें:</label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-800 outline-none"
                >
                  <option value="गाड़ी में खराबी / तकनीकी समस्या">गाड़ी में खराबी / तकनीकी समस्या</option>
                  <option value="वर्तमान में उपलब्ध नहीं हूँ / अन्य कार्य">वर्तमान में उपलब्ध नहीं हूँ / अन्य कार्य</option>
                  <option value="रूट/दूरी अत्यधिक है">रूट/दूरी अत्यधिक है</option>
                  <option value="पार्सल का वजन वाहन क्षमता से अधिक है">पार्सल का वजन वाहन क्षमता से अधिक है</option>
                  <option value="स्वास्थ्य ठीक नहीं है">स्वास्थ्य ठीक नहीं है</option>
                </select>

                <input
                  type="text"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="अन्य कारण..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDecliningOrder(null)}
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  वापस जाएँ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <span>अस्वीकार करें</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: MARK AS DELIVERED CONFIRMATION */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {completingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-gray-900">
                  डिलीवरी पूर्ण पुष्टि (Mark as Delivered)
                </h3>
                <p className="text-xs text-gray-500">
                  ऑर्डर संख्या: <span className="font-bold text-gray-800">{completingOrder.orderNumber}</span>
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  ग्राहक: {completingOrder.customerDetails?.name}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    डिलीवरी नोट / टिप्पणी (वैकल्पिक):
                  </label>
                  <input
                    type="text"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="उदा. किसान के हाथ में सामान सौंपा, सब सही पाया गया"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-medium text-gray-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    ग्राहक पुष्टि / फोन अंतिम 4 अंक (वैकल्पिक):
                  </label>
                  <input
                    type="text"
                    value={deliveryOtp}
                    onChange={(e) => setDeliveryOtp(e.target.value)}
                    placeholder="उदा. 4321 या मौखिक पुष्टि"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-medium text-gray-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingOrder(null)}
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateProgress(completingOrder, 'delivered', deliveryNote, deliveryOtp)}
                  className="py-2.5 bg-[#2D5A27] hover:bg-[#23461e] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>डिलीवर चिह्नित करें</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: DELIVERY FAILED / ISSUE */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {failingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-gray-900">
                  डिलीवरी समस्या दर्ज करें (Delivery Issue)
                </h3>
                <p className="text-xs text-gray-500">
                  ऑर्डर संख्या: <span className="font-bold text-gray-800">{failingOrder.orderNumber}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">समस्या का विवरण:</label>
                <select
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-800 outline-none"
                >
                  <option value="किसान भाई पते पर उपलब्ध नहीं मिले">किसान भाई पते पर उपलब्ध नहीं मिले</option>
                  <option value="फोन स्विच ऑफ / कॉल रिसीव नहीं हुआ">फोन स्विच ऑफ / कॉल रिसीव नहीं हुआ</option>
                  <option value="गलत पता / लोकेशन नहीं मिल सकी">गलत पता / लोकेशन नहीं मिल सकी</option>
                  <option value="ग्राहक ने आज लेने से मना किया (कल चाहिए)">ग्राहक ने आज लेने से मना किया (कल चाहिए)</option>
                  <option value="खराब मौसम / रास्ता बंद होने के कारण">खराब मौसम / रास्ता बंद होने के कारण</option>
                </select>

                <input
                  type="text"
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  placeholder="अतिरिक्त विवरण..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFailingOrder(null)}
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateProgress(failingOrder, 'failed', failReason)}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <span>समस्या दर्ज करें</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryOrdersPage;
