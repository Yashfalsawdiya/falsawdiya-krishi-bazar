import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchOrderById } from '../services/orderService';
import { useAppContext } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import { 
  ArrowLeft, CheckCircle2, Clock, Truck, 
  MapPin, Phone, User, Package, Download, 
  AlertCircle, ShieldCheck, MessageSquare, 
  ChevronRight, Calendar, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import SmartImage from '../components/SmartImage';

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { appContent } = useAppContext();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleDownloadInvoice = () => {
    window.print();
  };

  const handleOrderSupport = () => {
    const msg = `नमस्ते! मुझे अपने ऑर्डर *#${order.orderNumber}* के संबंध में सहायता चाहिए।\nग्राहक: ${order.customerDetails.name}\nकुल राशि: ₹${order.totalAmount}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const timelineSteps = [
    { key: 'placed', label: 'ऑर्डर दर्ज (Placed)' },
    { key: 'confirmed', label: 'स्वीकृत (Confirmed)' },
    { key: 'dispatched', label: 'रवाना (Shipped)' },
    { key: 'delivered', label: 'डिलीवर (Delivered)' },
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all active:scale-95"
          title="Print / Save Invoice"
        >
          <Download className="w-3.5 h-3.5" />
          <span>रसीद (Invoice)</span>
        </button>
      </div>

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
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">लाइव ट्रैकिंग स्थिति</span>
            <h3 className="text-sm font-bold text-gray-800">
              {order.status === 'delivered' ? 'सामान डिलीवर हो चुका है' : 'ऑर्डर प्रगति पर है (In Progress)'}
            </h3>
          </div>
          {order.estimatedDeliveryDate && (
            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-bold block">अनुमानित डिलीवरी</span>
              <span className="text-xs font-bold text-[#2D5A27]">{order.estimatedDeliveryDate}</span>
            </div>
          )}
        </div>

        {/* Horizontal Step Indicator */}
        {order.status !== 'cancelled' ? (
          <div className="relative py-2">
            {/* Background Line */}
            <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-100 -translate-y-1/2 rounded-full" />
            {/* Active Line */}
            <div
              className="absolute top-1/2 left-4 h-1 bg-[#2D5A27] -translate-y-1/2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, (currentStepIdx / (timelineSteps.length - 1)) * 90))}%`,
              }}
            />

            <div className="relative flex justify-between">
              {timelineSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center max-w-[70px]">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                        isCompleted
                          ? 'bg-[#2D5A27] text-white'
                          : 'bg-white border-2 border-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-[#2D5A27]/20 scale-110' : ''}`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[9px] mt-1.5 font-bold leading-tight ${
                        isCompleted ? 'text-[#2D5A27]' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
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
