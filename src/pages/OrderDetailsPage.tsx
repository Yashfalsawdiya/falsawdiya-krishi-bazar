import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchOrderById, cancelUserOrder, calculateOrderRefund } from '../services/orderService';
import { useAppContext } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import { getInAppDeliveryOtp } from '../services/deliveryOtpService';
import { 
  ArrowLeft, CheckCircle2, Clock, Truck, 
  MapPin, Phone, User, Package, Download, 
  AlertCircle, ShieldCheck, MessageSquare, 
  ChevronRight, Calendar, Sparkles, Loader2, FileCheck,
  ShoppingBag, ClipboardCheck, Bike, Check, XCircle,
  AlertTriangle, RotateCcw, HelpCircle, FileText, Ban, Key, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { generateOrderInvoicePDF } from '../utils/invoiceGenerator';
import { formatFullHindiDate } from '../lib/dateUtils';

const CANCELLATION_REASONS = [
  'गलती से दूसरा उत्पाद या मात्रा ऑर्डर हो गई (Ordered by mistake)',
  'डिलीवरी पते या फोन नंबर में बदलाव करना है (Need to change address)',
  'अब इस उत्पाद/दवा की आवश्यकता नहीं है (No longer needed)',
  'डिलीवरी समय अधिक लग रहा है (Delivery taking too long)',
  'अन्य कारण (Other reason)',
];

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { appContent, invoiceTemplate } = useAppContext();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cancellation States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  // In-App Delivery OTP States
  const [inAppOtp, setInAppOtp] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  const isJustPlaced = (location.state as any)?.justPlaced;
  const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';

  useEffect(() => {
    if (!orderId) return;
    const loadOrder = async () => {
      setLoading(true);
      const data = await fetchOrderById(orderId);
      setOrder(data);
      setLoading(false);
    };
    loadOrder();
  }, [orderId]);

  // Fetch in-app delivery OTP if order is out for delivery or dispatched
  useEffect(() => {
    if (order && (order.status === 'out_for_delivery' || order.status === 'dispatched')) {
      const fetchOtp = async () => {
        try {
          const res = await getInAppDeliveryOtp(order.id);
          if (res.success && res.otp) {
            setInAppOtp(res.otp);
          }
        } catch {
          // silently ignore in-app otp fetch errors
        }
      };
      fetchOtp();
    }
  }, [order?.id, order?.status]);

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400 font-medium">ऑर्डर विवरण लोड हो रहा है...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 px-4 space-y-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="font-bold text-gray-700 text-lg">ऑर्डर नहीं मिला</h3>
        <p className="text-xs text-gray-400">यह ऑर्डर मौजूद नहीं है या हटा दिया गया है।</p>
        <button
          onClick={() => navigate('/orders')}
          className="px-6 py-2.5 bg-[#2D5A27] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#2D5A27]/90 active:scale-95"
        >
          मेरे सभी ऑर्डर देखें (View Orders)
        </button>
      </div>
    );
  }

  const orderDate = formatFullHindiDate(order.createdAt, true);

  const handleDownloadInvoice = async () => {
    if (!order || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfMessage(null);

    try {
      const storeName = appContent?.branding?.name || 'फल्सावदिया कृषि बाजार';
      const storeTagline = appContent?.branding?.tagline || 'उच्च गुणवत्ता युक्त कृषि उत्पाद एवं किसान समाधान केंद्र';
      const phone = appContent?.contactInfo?.whatsapp || '+91 89823 38046';
      const address = appContent?.contactInfo?.address || 'मध्य प्रदेश (भारत)';

      const result = await generateOrderInvoicePDF(order, {
        storeName,
        tagline: storeTagline,
        phone,
        address,
        logo: appContent?.branding?.logo,
      }, invoiceTemplate);

      if (result.success) {
        setPdfMessage({
          type: 'success',
          text: `रसीद (${result.fileName}) सफलतापूर्वक डाउनलोड हो गई है।`,
        });
        setTimeout(() => setPdfMessage(null), 5000);
      } else {
        setPdfMessage({
          type: 'error',
          text: result.error || 'रसीद डाउनलोड करने में समस्या आई। कृपया पुनः प्रयास करें।',
        });
      }
    } catch (err: any) {
      console.error('Invoice download error:', err);
      setPdfMessage({
        type: 'error',
        text: err.message || 'रसीद जनरेट करने में असमर्थ।',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOrderSupport = () => {
    const msg = `नमस्ते! मुझे अपने ऑर्डर *#${order.orderNumber}* के संबंध में सहायता चाहिए।\nग्राहक: ${order.customerDetails.name}\nकुल राशि: ₹${order.totalAmount}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Open cancellation modal
  const handleOpenCancelModal = () => {
    setCancelError(null);
    setShowCancelModal(true);
  };

  // Process Cancellation & Refund
  const handleConfirmCancel = async () => {
    if (!order || isCancelling) return;
    setIsCancelling(true);
    setCancelError(null);

    const finalReason = cancellationReason === 'अन्य कारण (Other reason)' && customReason.trim()
      ? customReason.trim()
      : cancellationReason;

    try {
      const res = await cancelUserOrder(order.id, finalReason, 'user');
      if (res.success && res.order) {
        setOrder(res.order);
        setShowCancelModal(false);
        setCancelSuccessMsg(
          res.order.refundDetails?.deliveryChargeDeducted && res.order.refundDetails.deliveryChargeDeducted > 0
            ? `ऑर्डर सफलतापूर्वक रद्द हो गया। ₹${res.order.refundDetails.refundAmount} का रिफंड मूल Razorpay खाते में प्रोसेस कर दिया गया है।`
            : `ऑर्डर सफलतापूर्वक रद्द हो गया। पूरा ₹${res.order.refundDetails?.refundAmount || res.order.totalAmount} का रिफंड मूल Razorpay खाते में प्रोसेस कर दिया गया है।`
        );
        setTimeout(() => setCancelSuccessMsg(null), 8000);
      } else {
        setCancelError(res.error || 'ऑर्डर रद्द करने में त्रुटि हुई। कृपया पुनः प्रयास करें।');
      }
    } catch (err: any) {
      console.error('Cancel order error:', err);
      setCancelError(err.message || 'ऑर्डर रद्द करने में समस्या आई।');
    } finally {
      setIsCancelling(false);
    }
  };

  const refundCalc = calculateOrderRefund(order);
  const isAfterDispatch = order.status === 'dispatched' || order.status === 'out_for_delivery';
  const canCancel = order.status !== 'delivered' && order.status !== 'cancelled';

  const timelineSteps = [
    { 
      key: 'placed', 
      hindiTitle: 'ऑर्डर दर्ज', 
      englishStatus: '(Placed)', 
      icon: ShoppingBag 
    },
    { 
      key: 'confirmed', 
      hindiTitle: 'स्वीकृत', 
      englishStatus: '(Confirmed)', 
      icon: ClipboardCheck 
    },
    { 
      key: 'dispatched', 
      hindiTitle: 'रवाना', 
      englishStatus: '(Shipped)', 
      icon: Truck 
    },
    { 
      key: 'out_for_delivery', 
      hindiTitle: 'डिलीवरी के लिए निकला', 
      englishStatus: '(Out for Delivery)', 
      icon: Bike 
    },
    { 
      key: 'delivered', 
      hindiTitle: 'डिलीवर', 
      englishStatus: '(Delivered)', 
      icon: Check 
    },
  ];

  const statusOrderIndex: Record<OrderStatus, number> = {
    placed: 0,
    confirmed: 1,
    dispatched: 2,
    out_for_delivery: 3,
    delivered: 4,
    cancelled: -1,
  };

  const currentStepIdx = statusOrderIndex[order.status];

  return (
    <div className="space-y-4 pb-12 print:p-0">
      {/* Top Navigation */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/orders')}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 text-[#4A3728]"
            title="वापस जाएँ (Back)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-[#4A3728]">ऑर्डर विवरण (Order Details)</h2>
            <p className="text-[10px] text-gray-400 font-bold">{order.orderNumber}</p>
          </div>
        </div>

        <button
          onClick={handleDownloadInvoice}
          disabled={isGeneratingPdf}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
            isGeneratingPdf
              ? 'bg-[#2D5A27]/10 text-[#2D5A27] cursor-wait'
              : 'bg-[#2D5A27] text-white hover:bg-[#2D5A27]/90'
          }`}
          title="Download PDF Invoice"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2D5A27]" />
              <span>PDF तैयार हो रहा है...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>रसीद (Invoice)</span>
            </>
          )}
        </button>
      </div>

      {/* PDF / Cancel Alerts */}
      <AnimatePresence>
        {pdfMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 shadow-sm ${
              pdfMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {pdfMessage.type === 'success' ? (
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{pdfMessage.text}</span>
            </div>
            <button
              onClick={() => setPdfMessage(null)}
              className="text-[10px] uppercase font-bold text-gray-400 hover:text-gray-700 ml-2"
            >
              ✕
            </button>
          </motion.div>
        )}

        {cancelSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center justify-between gap-2 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cancelSuccessMsg}</span>
            </div>
            <button
              onClick={() => setCancelSuccessMsg(null)}
              className="text-[10px] uppercase font-bold text-emerald-700 hover:text-emerald-900 ml-2"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Celebration Alert (Only if just placed) */}
      {isJustPlaced && order.status !== 'cancelled' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border border-emerald-200 p-4 rounded-3xl text-center space-y-2 print:hidden"
        >
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-emerald-900">बधाई हो! आपका ऑर्डर सफलतापूर्वक प्राप्त हुआ</h3>
          <p className="text-xs text-emerald-700 max-w-sm mx-auto">
            ऑनलाइन भुगतान प्राप्त हो गया है। हमारी टीम जल्द ही आपका पार्सल पैक करके रवाना करेगी।
          </p>
        </motion.div>
      )}

      {/* =============================================================== */}
      {/* CANCELLATION & REFUND DISPLAY CARD (When Order is Cancelled) */}
      {/* =============================================================== */}
      {order.status === 'cancelled' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 border-2 border-red-100 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-red-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900">ऑर्डर रद्द कर दिया गया है (Order Cancelled)</h3>
                <p className="text-[10px] text-gray-500 font-medium">
                  रद्दीकरण समय:{' '}
                  {order.refundDetails?.cancelledAt
                    ? new Date(order.refundDetails.cancelledAt).toLocaleString('hi-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : orderDate}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
              रद्द (Cancelled)
            </span>
          </div>

          {/* Cancellation Reason */}
          {order.refundDetails?.cancellationReason && (
            <div className="bg-gray-50 p-2.5 rounded-xl text-xs text-gray-600 border border-gray-200/70">
              <span className="font-bold text-gray-700">रद्दीकरण कारण: </span>
              <span>{order.refundDetails.cancellationReason}</span>
            </div>
          )}

          {/* Refund Financial Breakdown Details */}
          <div className="bg-[#ECFDF5] p-4 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-xs text-emerald-950">रिफंड विवरण (Refund Summary)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {order.refundDetails?.refundStatus === 'processed' ? 'प्रोसेस हो गया (Processed)' : 'प्रक्रियाधीन (Pending)'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-gray-700 pt-1 border-t border-emerald-200/70">
              <div className="flex justify-between">
                <span>कुल भुगतान राशि (Total Paid):</span>
                <span className="font-bold text-gray-800">₹{order.totalAmount}</span>
              </div>

              {order.refundDetails?.deliveryChargeDeducted && order.refundDetails.deliveryChargeDeducted > 0 ? (
                <div className="flex justify-between text-amber-800">
                  <span>डिलीवरी चार्ज (शिपिंग पश्चात नॉन-रिफंडेबल):</span>
                  <span className="font-bold">- ₹{order.refundDetails.deliveryChargeDeducted}</span>
                </div>
              ) : (
                <div className="flex justify-between text-emerald-800">
                  <span>डिलीवरी शुल्क (100% रिफंड शामिल):</span>
                  <span className="font-bold">₹{order.deliveryCharges || 0}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-emerald-200 font-bold text-sm text-emerald-950">
                <span>वापस की जाने वाली रिफंड राशि:</span>
                <span className="text-base font-black text-emerald-700">
                  ₹{order.refundDetails?.refundAmount || order.totalAmount}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-emerald-800/90 space-y-1">
              <p className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>माध्यम: <strong>Razorpay Original Payment Method (UPI / Bank Account)</strong></span>
              </p>
              {order.refundDetails?.refundId && (
                <p className="text-[10px] text-gray-500">
                  रिफंड संदर्भ आईडी (Refund ID): <code className="bg-white/80 px-1 py-0.5 rounded border border-emerald-100 font-mono text-[9px]">{order.refundDetails.refundId}</code>
                </p>
              )}
              <p className="text-[10px] text-emerald-900 bg-white/60 p-2 rounded-xl border border-emerald-100">
                💡 <strong>नोट:</strong> रिफंड की राशि 24 से 48 घंटे के भीतर आपके उसी बैंक खाते या UPI में क्रेडिट हो जाएगी जिससे भुगतान किया गया था।
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* =============================================================== */}
      {/* LIVE SECURE DELIVERY OTP CARD (For Customer Verification) */}
      {/* =============================================================== */}
      {(order.status === 'out_for_delivery' || (order.partnerAssignmentStatus === 'out_for_delivery' && order.status !== 'delivered')) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[#1b3d17] via-[#2D5A27] to-[#1e441a] text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 border-2 border-emerald-500/40 relative overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-emerald-200 border border-white/20 shadow-inner">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <span>डिलीवरी सुरक्षा OTP (Delivery OTP)</span>
                </h4>
                <p className="text-xs text-emerald-200 font-medium">
                  सामान प्राप्त करने के बाद ही डिलीवरी साथी को यह कोड बताएँ
                </p>
              </div>
            </div>

            <div className="px-3 py-1 bg-emerald-500/30 border border-emerald-400/40 rounded-full text-[11px] font-black text-emerald-200 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>सुरक्षित डिलीवरी</span>
            </div>
          </div>

          {inAppOtp ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 shadow-sm">
              <div className="text-center sm:text-left">
                <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-extrabold flex items-center justify-center sm:justify-start gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> आपका 6-अंकों का गुप्त OTP कोड
                </p>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-[0.35em] text-yellow-300 mt-1 select-all">
                  {inAppOtp}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(inAppOtp);
                  setCopiedOtp(true);
                  setTimeout(() => setCopiedOtp(false), 2000);
                }}
                className="px-5 py-2.5 bg-white text-[#2D5A27] hover:bg-emerald-50 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                {copiedOtp ? <Check className="w-4 h-4 text-emerald-700" /> : <ClipboardCheck className="w-4 h-4 text-[#2D5A27]" />}
                <span>{copiedOtp ? 'कोड कॉपी हो गया!' : 'OTP कोड कॉपी करें'}</span>
              </button>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs text-emerald-100/95 leading-relaxed relative z-10 space-y-1.5">
              <p className="flex items-center gap-2 font-bold text-white">
                <Mail className="w-4 h-4 text-emerald-300" />
                <span>ईमेल व एसएमएस पर सुरक्षित OTP</span>
              </p>
              <p className="text-[11px] text-emerald-200">
                जब डिलीवरी साथी आपके दरवाजे पर सामान लेकर आएँगे और "डिलीवरी पूर्ण करें" दबाएँगे, तो 6-अंकों का OTP तुरंत आपकी ईमेल <b>{order.customerDetails?.email || 'Google Account'}</b> पर भेज दिया जाएगा।
              </p>
            </div>
          )}

          <div className="text-[11px] text-emerald-200/90 flex items-start gap-2 pt-1 border-t border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>सुरक्षा निर्देश:</strong> जब तक आप पार्सल के सभी पैकेट सही सलामत प्राप्त न कर लें, तब तक किसी को भी यह OTP साझा न करें।
            </span>
          </div>
        </motion.div>
      )}

      {/* Visual Live Tracking Timeline Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-5">
        {/* Section Title matching reference */}
        <div className="text-center space-y-1">
          <h3 className="text-base sm:text-lg font-black text-[#2D5A27] tracking-tight">
            अपना ऑर्डर ट्रैक करें
          </h3>
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">वर्तमान स्थिति:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full border ${
              order.status === 'cancelled'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'text-[#2D5A27] bg-[#ECFDF5] border-emerald-200/80'
            }`}>
              {order.status === 'delivered'
                ? 'डिलीवर हो चुका है (Delivered)'
                : order.status === 'out_for_delivery'
                ? 'डिलीवरी के लिए निकला (Out for Delivery)'
                : order.status === 'dispatched'
                ? 'पार्सल रवाना (Shipped)'
                : order.status === 'confirmed'
                ? 'स्वीकृत (Confirmed)'
                : order.status === 'placed'
                ? 'ऑर्डर दर्ज (Placed)'
                : 'रद्द (Cancelled)'}
            </span>
          </div>
        </div>

        {/* Horizontal 5-Step Indicator Matching Reference Design */}
        {order.status !== 'cancelled' ? (
          <div className="relative pt-2 pb-3">
            {/* Subtle Thin Background Line Connecting Center of 1st Circle (10%) to Center of 5th Circle (90%) */}
            <div className="absolute top-[22px] sm:top-[24px] left-[10%] right-[10%] h-[1.5px] bg-gray-200 -translate-y-1/2 rounded-full" />
            
            {/* Active Green Line */}
            {currentStepIdx >= 0 && (
              <div
                className="absolute top-[22px] sm:top-[24px] left-[10%] h-[1.5px] bg-[#2D5A27] -translate-y-1/2 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(80, Math.max(0, (currentStepIdx / (timelineSteps.length - 1)) * 80))}%`,
                }}
              />
            )}

            {/* 5 Steps Grid */}
            <div className="grid grid-cols-5 relative z-10">
              {timelineSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center px-0.5">
                    {/* Compact Lightweight Circle Icon Container */}
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-[#ECFDF5] border-[1.5px] border-[#2D5A27] text-[#2D5A27]'
                          : 'bg-[#F9FAFB] border-[1.5px] border-gray-200 text-gray-400'
                      } ${
                        isCurrent
                          ? 'ring-4 ring-[#2D5A27]/15 shadow-xs scale-105'
                          : ''
                      }`}
                    >
                      <StepIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
                    </div>

                    {/* Extra Spaced Hindi Title & English Status */}
                    <div className="mt-3.5 sm:mt-4 text-center space-y-0.5 w-full flex flex-col items-center">
                      <div className="min-h-[28px] sm:min-h-[32px] flex items-center justify-center w-full">
                        <p
                          className={`text-[10px] sm:text-[12px] font-bold leading-tight text-center px-0.5 ${
                            isCompleted ? 'text-[#2D5A27]' : 'text-gray-500'
                          }`}
                        >
                          {step.hindiTitle}
                        </p>
                      </div>
                      <p
                        className={`text-[8.5px] sm:text-[10.5px] font-medium leading-tight ${
                          isCompleted ? 'text-[#2D5A27]/80 font-semibold' : 'text-gray-400'
                        }`}
                      >
                        {step.englishStatus}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 text-red-700 p-3 rounded-2xl text-xs font-bold text-center border border-red-200">
            यह ऑर्डर रद्द (Cancelled) कर दिया गया है। रिफंड की जानकारी ऊपर दी गई है।
          </div>
        )}

        {/* Estimated Delivery Notice (if set and active) */}
        {order.estimatedDeliveryDate && order.status !== 'cancelled' && (
          <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/70 px-3.5 py-2.5 rounded-2xl text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>अनुमानित डिलीवरी तिथि:</span>
            </div>
            <span className="font-black text-[#2D5A27]">{order.estimatedDeliveryDate}</span>
          </div>
        )}

        {/* Courier / Tracking Number if dispatched */}
        {order.trackingNumber && order.status !== 'cancelled' && (
          <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-2xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="font-bold text-indigo-900">
                  कूरियर पार्टनर: {order.courierPartner || 'Speed Post / Delivery'}
                </p>
                <p className="text-[10px] text-indigo-700">ट्रैकिंग नंबर: {order.trackingNumber}</p>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Timeline Events */}
        <div className="pt-2 border-t border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-600">ऑर्डर इतिहास (Timeline Events)</h4>
          <div className="space-y-2.5">
            {order.timeline?.map((ev, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  ev.status === 'cancelled' ? 'bg-red-500' : 'bg-[#2D5A27]'
                }`} />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className={`font-bold ${ev.status === 'cancelled' ? 'text-red-700' : 'text-gray-800'}`}>
                      {ev.title}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{ev.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =============================================================== */}
      {/* USER ORDER CANCELLATION BUTTON / TRIGGER SECTION */}
      {/* =============================================================== */}
      {canCancel && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-500" />
                ऑर्डर रद्दीकरण (Order Cancellation)
              </h4>
              <p className="text-[11px] text-gray-500">
                {isAfterDispatch
                  ? 'यह ऑर्डर शिपिंग के लिए भेजा जा चुका है। इस समय रद्द करने पर डिलीवरी चार्ज काटा जाएगा व शेष उत्पाद राशि का रिफंड मिलेगा।'
                  : 'यदि आपने गलती से ऑर्डर कर दिया है, तो डिस्पैच से पूर्व रद्द कर 100% पूरा रिफंड प्राप्त कर सकते हैं।'}
              </p>
            </div>
            <button
              onClick={handleOpenCancelModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>ऑर्डर रद्द करें</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] text-gray-400">
            <span>रिफंड नीति: Razorpay मूल खाता (24-48 घंटे)</span>
            <Link to="/refund-policy" className="text-[#2D5A27] font-bold hover:underline flex items-center gap-0.5">
              रिफंड नियम पढ़ें <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* DELIVERED ORDER RETURN / REPLACEMENT NOTICE */}
      {/* =============================================================== */}
      {order.status === 'delivered' && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-[#2D5A27]" />
                वापसी एवं रिप्लेसमेंट नीति (Return / Replacement)
              </h4>
              <p className="text-[11px] text-gray-500">
                यह ऑर्डर सफलतापूर्वक डिलीवर हो चुका है। यदि उत्पाद क्षतिग्रस्त, लीक या गलत प्राप्त हुआ है, तो डिलीवरी के 24 से 48 घंटे के भीतर संपर्क करें।
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Link
              to="/refund-policy"
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center active:scale-95"
            >
              वापसी नीति देखें
            </Link>
            <button
              onClick={handleOrderSupport}
              className="px-3 py-1.5 bg-[#2D5A27] text-white hover:bg-[#2D5A27]/90 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <MessageSquare className="w-3 h-3" />
              <span>वापसी के लिए संपर्क करें</span>
            </button>
          </div>
        </div>
      )}

      {/* Ordered Items Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5 border-b border-gray-100 pb-2">
          <Package className="w-4 h-4 text-[#2D5A27]" />
          ऑर्डर किए गए उत्पाद ({order.items.length} उत्पाद)
        </h3>

        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-center py-1.5 border-b border-gray-50 last:border-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-50 border border-gray-100">
                <SmartImage src={item.image || ''} alt={item.hindiName} className="w-full h-full" objectFit="cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs text-gray-800 truncate">{item.hindiName}</p>
                <p className="text-[10px] text-gray-400 truncate">{item.name} ({item.brand})</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                    मात्रा: {item.unit} x {item.quantity}
                  </span>
                  <span className="text-xs font-bold text-gray-700">₹{item.price} प्रति यूनिट</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-black text-[#2D5A27]">₹{item.price * item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery & Payment Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Delivery Address */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#2D5A27]" />
            डिलीवरी पता (Delivery Address)
          </h4>
          <div className="text-xs text-gray-600 space-y-0.5 pt-1">
            <p className="font-bold text-gray-800">{order.customerDetails.name}</p>
            <p className="text-gray-500">{order.customerDetails.addressHouse}</p>
            <p className="text-gray-500">
              {order.customerDetails.addressCity}, {order.customerDetails.addressDistrict}
            </p>
            <p className="text-gray-500">
              {order.customerDetails.addressState} - {order.customerDetails.addressPincode}
            </p>
            <p className="font-medium text-gray-700 pt-1 flex items-center gap-1">
              <Phone className="w-3 h-3 text-gray-400" /> {order.customerDetails.phone}
            </p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-2 text-xs">
          <h4 className="font-bold text-gray-700 flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            भुगतान सारांश (Payment Info)
          </h4>
          <div className="space-y-1 text-gray-600 pt-1">
            <div className="flex justify-between">
              <span>उत्पाद मूल्य:</span>
              <span className="font-bold text-gray-800">₹{order.itemsTotal}</span>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <span>डिलीवरी शुल्क:</span>
                {order.deliverySnapshot && (
                  <p className="text-[10px] text-gray-500 font-medium">
                    {order.deliverySnapshot.vehicleEmoji} {order.deliverySnapshot.vehicleNameHindi} • {order.deliverySnapshot.totalWeightKg} kg • {order.deliverySnapshot.distanceKm} km
                  </p>
                )}
              </div>
              <span className="font-bold text-amber-800">
                {order.deliveryCharges > 0 ? `+ ₹${order.deliveryCharges}` : 'मुफ़्त'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-gray-100 font-bold text-sm text-gray-800">
              <span>कुल भुगतान राशि:</span>
              <span className="text-base font-black text-[#2D5A27]">₹{order.totalAmount}</span>
            </div>
            <div className="pt-2 text-[10px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                भुगतान स्थिति:{' '}
                {order.status === 'cancelled'
                  ? 'रिफंड प्रोसेस हो गया (Razorpay Refunded)'
                  : 'ऑनलाइन UPI (Razorpay Paid)'}
              </span>
            </div>
            {order.razorpayPaymentId && (
              <p className="text-[9px] text-gray-400">Txn ID: {order.razorpayPaymentId}</p>
            )}
          </div>
        </div>
      </div>

      {/* Support Helpline Action */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between print:hidden">
        <div>
          <h4 className="text-xs font-bold text-gray-800">ऑर्डर से जुड़ी कोई समस्या या प्रश्न है?</h4>
          <p className="text-[10px] text-gray-400">हमारी सहायता टीम आपके सहयोग के लिए सदैव तत्पर है</p>
        </div>
        <button
          onClick={handleOrderSupport}
          className="px-3.5 py-2 bg-[#25D366] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5 fill-white" />
          <span>सहायता लें</span>
        </button>
      </div>

      {/* =============================================================== */}
      {/* MANDATORY CANCELLATION CONFIRMATION MODAL */}
      {/* =============================================================== */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-9 h-9 rounded-2xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-gray-800">
                      क्या आप यह ऑर्डर रद्द करना चाहते हैं?
                    </h3>
                    <p className="text-[10px] text-gray-400">ऑर्डर: {order.orderNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  ✕
                </button>
              </div>

              {/* Policy Explanation */}
              {isAfterDispatch ? (
                // EXACT REQUIRED TEXT FOR SHIPPED / OUT_FOR_DELIVERY
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-2 text-xs text-amber-950">
                  <p className="font-bold leading-relaxed">
                    “यह ऑर्डर शिपिंग के लिए भेजा जा चुका है। इस समय ऑर्डर रद्द करने पर Delivery Charge वापस नहीं किया जाएगा। बाकी eligible product/order payment आपकी refund policy के अनुसार original payment method में वापस कर दिया जाएगा।”
                  </p>
                  <div className="pt-1 text-[10px] text-amber-800">
                    पार्सल कूरियर/डिलीवरी टीम को सौंपा जा चुका है, इसलिए डिलीवरी शुल्क नॉन-रिफंडेबल रहेगा।
                  </div>
                </div>
              ) : (
                // BEFORE DISPATCH (PLACED / CONFIRMED)
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-1.5 text-xs text-emerald-950">
                  <p className="font-bold">
                    यह ऑर्डर अभी डिस्पैच नहीं हुआ है।
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    रद्द करने पर पूरा 100% भुगतान (उत्पाद राशि + डिलीवरी शुल्क) आपके मूल Razorpay खाते/UPI में वापस कर दिया जाएगा।
                  </p>
                </div>
              )}

              {/* Financial Refund Calculation Breakdown Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <p className="font-bold text-gray-700 text-[11px] border-b border-gray-200 pb-1">
                  रिफंड गणना (Refund Calculation Breakdown):
                </p>
                <div className="space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>कुल भुगतान (Total Paid):</span>
                    <span className="font-bold text-gray-800">₹{order.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>डिलीवरी शुल्क (Delivery Charge):</span>
                    <span className={`font-bold ${isAfterDispatch && (order.deliveryCharges || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {isAfterDispatch && (order.deliveryCharges || 0) > 0
                        ? `- ₹${order.deliveryCharges} (नॉन-रिफंडेबल)`
                        : `₹${order.deliveryCharges || 0} (पूरा रिफंड)`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 text-sm font-bold">
                    <span className="text-[#2D5A27]">वापस मिलने वाला रिफंड (Refund Amount):</span>
                    <span className="text-base font-black text-[#2D5A27]">
                      ₹{refundCalc.refundAmount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">
                  रद्दीकरण का कारण चुनें (Reason for cancellation):
                </label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#2D5A27]"
                >
                  {CANCELLATION_REASONS.map((r, idx) => (
                    <option key={idx} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {cancellationReason === 'अन्य कारण (Other reason)' && (
                  <textarea
                    rows={2}
                    placeholder="कृपया कारण विस्तार से बताएं..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#2D5A27] mt-1.5"
                  />
                )}
              </div>

              {/* Error if any */}
              {cancelError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              {/* Action Buttons: "वापस जाएँ" | "ऑर्डर रद्द करें" */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold active:scale-95 transition-all"
                >
                  वापस जाएँ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isCancelling}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>रिफंड प्रोसेस हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>ऑर्डर रद्द करें</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderDetailsPage;
