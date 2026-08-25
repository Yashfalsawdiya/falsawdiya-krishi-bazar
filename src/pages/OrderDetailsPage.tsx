import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchOrderById } from '../services/orderService';
import { useAppContext } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import { 
  ArrowLeft, CheckCircle2, Clock, Truck, 
  MapPin, Phone, User, Package, Download, 
  AlertCircle, ShieldCheck, MessageSquare, 
  ChevronRight, Calendar, Sparkles, Loader2, FileCheck,
  ShoppingBag, ClipboardCheck, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { generateOrderInvoicePDF } from '../utils/invoiceGenerator';

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { appContent } = useAppContext();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const orderDate = new Date(order.createdAt).toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
      });

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
    out_for_delivery: 2,
    delivered: 3,
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
            className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 text-[#4A3728]"
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

      {/* PDF Generation Status Alert */}
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
      </AnimatePresence>

      {/* Success Celebration Alert (Only if just placed) */}
      {isJustPlaced && (
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

      {/* Visual Live Tracking Timeline Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-5">
        {/* Section Title matching reference */}
        <div className="text-center space-y-1">
          <h3 className="text-lg sm:text-xl font-black text-[#2D5A27] tracking-tight">
            अपना ऑर्डर ट्रैक करें
          </h3>
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">वर्तमान स्थिति:</span>
            <span className="font-bold text-[#2D5A27] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
              {order.status === 'delivered'
                ? 'डिलीवर हो चुका है (Delivered)'
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

        {/* Horizontal Step Indicator Matching Reference Design */}
        {order.status !== 'cancelled' ? (
          <div className="relative pt-2 pb-3">
            {/* Background Line Connecting from first circle center (12.5%) to last circle center (87.5%) */}
            <div className="absolute top-[32px] sm:top-[36px] left-[12.5%] right-[12.5%] h-1 bg-gray-200 -translate-y-1/2 rounded-full" />
            
            {/* Active Green Line */}
            {currentStepIdx >= 0 && (
              <div
                className="absolute top-[32px] sm:top-[36px] left-[12.5%] h-1 bg-[#2D5A27] -translate-y-1/2 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(75, Math.max(0, (currentStepIdx / (timelineSteps.length - 1)) * 75))}%`,
                }}
              />
            )}

            {/* 4 Steps Grid */}
            <div className="grid grid-cols-4 relative z-10">
              {timelineSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center px-0.5">
                    {/* Circle Icon Container */}
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-[#DCFCE7] border-2 border-[#2D5A27] text-[#2D5A27]'
                          : 'bg-gray-50 border-2 border-gray-200 text-gray-400'
                      } ${
                        isCurrent
                          ? 'ring-4 ring-[#2D5A27]/25 shadow-md scale-105'
                          : ''
                      }`}
                    >
                      <StepIcon className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                    </div>

                    {/* Hindi Title & English Status */}
                    <div className="mt-2.5 sm:mt-3 text-center space-y-0.5 w-full">
                      <p
                        className={`text-xs sm:text-sm font-black leading-tight truncate px-0.5 ${
                          isCompleted ? 'text-[#2D5A27]' : 'text-gray-400'
                        }`}
                      >
                        {step.hindiTitle}
                      </p>
                      <p
                        className={`text-[10px] sm:text-xs font-semibold leading-tight ${
                          isCompleted ? 'text-[#2D5A27]/80' : 'text-gray-400'
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
            यह ऑर्डर रद्द (Cancelled) कर दिया गया है।
          </div>
        )}

        {/* Estimated Delivery Notice (if set) */}
        {order.estimatedDeliveryDate && (
          <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/70 px-3.5 py-2.5 rounded-2xl text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>अनुमानित डिलीवरी तिथि:</span>
            </div>
            <span className="font-black text-[#2D5A27]">{order.estimatedDeliveryDate}</span>
          </div>
        )}

        {/* Courier / Tracking Number if dispatched */}
        {order.trackingNumber && (
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
                <div className="w-2 h-2 rounded-full bg-[#2D5A27] mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-gray-800">{ev.title}</p>
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
        <div className="bg-[#F5F2ED] rounded-3xl p-4 border border-[#4A3728]/10 shadow-sm space-y-2 text-xs">
          <h4 className="font-bold text-[#4A3728] flex items-center gap-1.5 border-b border-gray-300/40 pb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            भुगतान सारांश (Payment Info)
          </h4>
          <div className="space-y-1 text-gray-600 pt-1">
            <div className="flex justify-between">
              <span>उत्पाद मूल्य:</span>
              <span className="font-bold text-gray-800">₹{order.itemsTotal}</span>
            </div>
            <div className="flex justify-between">
              <span>डिलीवरी शुल्क:</span>
              <span className="font-bold text-amber-800">
                {order.deliveryCharges > 0 ? `+ ₹${order.deliveryCharges}` : 'मुफ़्त'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-gray-300/40 font-bold text-sm text-[#4A3728]">
              <span>कुल भुगतान राशि:</span>
              <span className="text-base font-black text-[#2D5A27]">₹{order.totalAmount}</span>
            </div>
            <div className="pt-2 text-[10px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>भुगतान स्थिति: ऑनलाइन UPI (Razorpay Paid)</span>
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
    </div>
  );
};

export default OrderDetailsPage;
