import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Order, OrderStatus } from '../types';
import { updateOrderStatus } from '../services/orderService';
import { getLocalOrders } from '../services/orderService';
import { 
  Package, Search, Filter, Clock, Truck, 
  CheckCircle2, AlertCircle, Eye, Phone, MapPin, 
  ChevronDown, Edit3, Loader2, RefreshCw, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from './SmartImage';
import { generateOrderInvoicePDF } from '../utils/invoiceGenerator';
import { useAppContext } from '../context/AppContext';

const AdminOrdersManager: React.FC = () => {
  const { appContent } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Status update form states
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('confirmed');
  const [statusNote, setStatusNote] = useState('');
  const [courierPartner, setCourierPartner] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  useEffect(() => {
    // Initial local orders
    const local = getLocalOrders();
    setOrders(local);

    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const remoteList: Order[] = [];
        snapshot.forEach((doc) => {
          remoteList.push(doc.data() as Order);
        });

        // Merge remote and local
        const mergedMap = new Map<string, Order>();
        local.forEach(o => mergedMap.set(o.id, o));
        remoteList.forEach(o => mergedMap.set(o.id, o));

        setOrders(Array.from(mergedMap.values()).sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      }, (err) => {
        console.warn("Firestore orders listener note:", err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      setLoading(false);
    }
  }, []);

  const handleOpenStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setUpdatingOrderId(order.id);
    setNewStatus(order.status);
    setStatusNote(order.notes || '');
    setCourierPartner(order.courierPartner || 'Speed Post (इंडिया पोस्ट)');
    setTrackingNumber(order.trackingNumber || '');
    setEstimatedDeliveryDate(order.estimatedDeliveryDate || '2-4 कार्य दिवस');
  };

  const handleSaveStatusUpdate = async () => {
    if (!updatingOrderId) return;
    setIsSavingStatus(true);
    try {
      await updateOrderStatus(updatingOrderId, newStatus, statusNote, {
        courierPartner: courierPartner.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        estimatedDeliveryDate: estimatedDeliveryDate.trim() || undefined,
      });

      // Update in local state instantly
      setOrders(prev => prev.map(o => {
        if (o.id === updatingOrderId) {
          return {
            ...o,
            status: newStatus,
            courierPartner,
            trackingNumber,
            estimatedDeliveryDate,
            notes: statusNote,
            updatedAt: Date.now(),
          };
        }
        return o;
      }));

      setUpdatingOrderId(null);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsSavingStatus(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = statusFilter === 'all' || order.status === statusFilter;
    const search = searchQuery.toLowerCase().trim();
    const matchesSearch = !search ||
      order.orderNumber.toLowerCase().includes(search) ||
      order.customerDetails.name.toLowerCase().includes(search) ||
      order.customerDetails.phone.includes(search) ||
      order.customerDetails.addressCity.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#2D5A27]" />
            <h3 className="font-bold text-gray-800 text-sm">ऑनलाइन ऑर्डर्स प्रबंधन (Orders Management)</h3>
          </div>
          <span className="text-xs font-bold bg-[#2D5A27]/10 text-[#2D5A27] px-2.5 py-1 rounded-full">
            {orders.length} कुल ऑर्डर
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="ऑर्डर नंबर, ग्राहक का नाम या मोबाइल खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#2D5A27]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { id: 'all', label: 'सभी' },
            { id: 'placed', label: 'दर्ज (Placed)' },
            { id: 'confirmed', label: 'स्वीकृत (Confirmed)' },
            { id: 'dispatched', label: 'रवाना (Shipped)' },
            { id: 'out_for_delivery', label: 'आउट फॉर डिलीवरी' },
            { id: 'delivered', label: 'डिलीवर (Delivered)' },
            { id: 'cancelled', label: 'रद्द (Cancelled)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <Loader2 className="w-7 h-7 text-[#2D5A27] animate-spin mx-auto" />
          <p className="text-xs text-gray-400">ऑर्डर्स लोड हो रहे हैं...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200 p-6 space-y-2">
          <Package className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="font-bold text-gray-700 text-sm">कोई ऑर्डर नहीं मिला</p>
          <p className="text-xs text-gray-400">नए ग्राहक ऑर्डर्स यहाँ रीयल-टाइम दिखाई देंगे।</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3 hover:border-gray-300 transition-all"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <span className="font-black text-xs text-[#2D5A27]">{order.orderNumber}</span>
                  <p className="text-[10px] text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('hi-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateOrderInvoicePDF(order, {
                      storeName: appContent?.branding?.name || 'फल्सावदिया कृषि बाजार',
                      tagline: appContent?.branding?.tagline || 'किसान का भरोसा, हमारी पहचान',
                      phone: appContent?.contactInfo?.whatsapp || '+91 89823 38046',
                      address: appContent?.contactInfo?.address || 'मध्य प्रदेश (भारत)',
                      logo: appContent?.branding?.logo,
                    })}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    title="Invoice PDF Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>रसीद</span>
                  </button>
                  <button
                    onClick={() => handleOpenStatusModal(order)}
                    className="px-3 py-1.5 bg-[#2D5A27]/10 hover:bg-[#2D5A27]/20 text-[#2D5A27] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>स्थिति बदलें ({order.status})</span>
                  </button>
                </div>
              </div>

              {/* Customer and Shipping Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="font-bold text-gray-800 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#2D5A27]" /> {order.customerDetails.name} ({order.customerDetails.phone})
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {order.customerDetails.addressHouse}, {order.customerDetails.addressCity}, {order.customerDetails.addressDistrict} ({order.customerDetails.addressPincode})
                  </p>
                </div>
                <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
                  <p className="font-black text-sm text-[#2D5A27]">कुल: ₹{order.totalAmount}</p>
                  <p className="text-[10px] text-emerald-700 font-bold">
                    ✓ Razorpay Online Paid {order.razorpayPaymentId ? `(${order.razorpayPaymentId})` : ''}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 pt-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                    <span className="text-gray-700 font-medium">
                      • {item.hindiName} ({item.unit}) x {item.quantity}
                    </span>
                    <span className="font-bold text-gray-800">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Tracking info if present */}
              {order.trackingNumber && (
                <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-xl text-[11px] text-indigo-900 flex justify-between items-center">
                  <span>कूरियर: {order.courierPartner}</span>
                  <span className="font-bold">ट्रैकिंग: {order.trackingNumber}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Order Status Modal */}
      <AnimatePresence>
        {updatingOrderId && selectedOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUpdatingOrderId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">ऑर्डर स्थिति अपडेट करें</h3>
                  <p className="text-[10px] text-gray-400">{selectedOrder.orderNumber}</p>
                </div>
                <button
                  onClick={() => setUpdatingOrderId(null)}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">नई स्थिति (Select Status) *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:border-[#2D5A27]"
                  >
                    <option value="placed">ऑर्डर दर्ज (Placed)</option>
                    <option value="confirmed">स्वीकृत व पैकिंग (Confirmed)</option>
                    <option value="dispatched">पार्सल रवाना (Shipped / Dispatched)</option>
                    <option value="out_for_delivery">आउट फॉर डिलीवरी (Out for Delivery)</option>
                    <option value="delivered">सफलतापूर्वक डिलीवर (Delivered)</option>
                    <option value="cancelled">रद्द (Cancelled)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">कूरियर पार्टनर का नाम</label>
                  <input
                    type="text"
                    placeholder="उदाँ: Speed Post (इंडिया पोस्ट), Delhivery, DTDC"
                    value={courierPartner}
                    onChange={(e) => setCourierPartner(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">ट्रैकिंग नंबर / डॉकेट नंबर</label>
                  <input
                    type="text"
                    placeholder="उदाँ: SP123456789IN"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">अनुमानित डिलीवरी समय</label>
                  <input
                    type="text"
                    placeholder="उदाँ: 2-3 कार्य दिवस (2-3 Working Days)"
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">विशेष टिप्पणी / संदेश</label>
                  <textarea
                    rows={2}
                    placeholder="उदाँ: सामान पैक हो चुका है, कल सुबह डिस्पैच किया जाएगा।"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setUpdatingOrderId(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 active:scale-95 transition-all"
                >
                  रद्द करें
                </button>
                <button
                  onClick={handleSaveStatusUpdate}
                  disabled={isSavingStatus}
                  className="flex-1 py-2.5 bg-[#2D5A27] text-white font-bold rounded-xl text-xs hover:bg-[#2D5A27]/90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSavingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'सुरक्षित करें (Save)'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOrdersManager;
