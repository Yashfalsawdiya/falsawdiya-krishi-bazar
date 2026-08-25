import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { fetchUserOrders } from '../services/orderService';
import { Order, OrderStatus } from '../types';
import { 
  Package, ArrowRight, ChevronRight, Clock, 
  CheckCircle2, Truck, AlertCircle, ShoppingBag, 
  Search, RefreshCw, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { getCustomerDetails } from '../utils/customerStorage';

const getStatusBadge = (status: OrderStatus) => {
  switch (status) {
    case 'placed':
      return {
        label: 'ऑर्डर दर्ज हुआ (Placed)',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Clock
      };
    case 'confirmed':
      return {
        label: 'स्वीकृत एवं पैकिंग (Confirmed)',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Package
      };
    case 'dispatched':
      return {
        label: 'पार्सल रवाना (Shipped)',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: Truck
      };
    case 'out_for_delivery':
      return {
        label: 'डिलीवरी के लिए निकला',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: Truck
      };
    case 'delivered':
      return {
        label: 'सफलतापूर्वक डिलीवर (Delivered)',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2
      };
    case 'cancelled':
      return {
        label: 'रद्द (Cancelled)',
        bg: 'bg-red-50 text-red-700 border-red-200',
        icon: AlertCircle
      };
    default:
      return {
        label: status,
        bg: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: Clock
      };
  }
};

const MyOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    const details = getCustomerDetails();
    const list = await fetchUserOrders(user?.uid, user?.email || undefined, details.phone || undefined);
    setOrders(list);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  const filteredOrders = orders.filter((order) => {
    const search = searchQuery.toLowerCase().trim();
    const matchesSearch = !search || 
      order.orderNumber.toLowerCase().includes(search) ||
      order.items.some(i => i.hindiName.toLowerCase().includes(search) || i.name.toLowerCase().includes(search));
    return matchesSearch;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#4A3728]">मेरे ऑर्डर (My Orders)</h2>
          <p className="text-xs text-gray-500">आपके सभी पिछले और वर्तमान ऑर्डर की स्थिति</p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 active:scale-95"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Bar (if user has orders) */}
      {orders.length > 0 && (
        <div className="relative">
          <input
            type="text"
            placeholder="ऑर्डर नंबर या दवाई का नाम खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#2D5A27]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="py-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <div className="w-8 h-8 border-3 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 font-medium">ऑर्डर लोड हो रहे हैं...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 px-6 bg-white rounded-3xl border border-dashed border-gray-200 space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-gray-700 text-base">कोई ऑर्डर नहीं मिला</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              {searchQuery ? 'खोज के अनुसार कोई ऑर्डर नहीं है।' : 'आपने अभी तक कोई ऑनलाइन ऑर्डर नहीं किया है।'}
            </p>
          </div>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-2.5 bg-[#2D5A27] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#2D5A27]/90 active:scale-95 transition-all"
          >
            उत्पाद देखें (Shop Now)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const BadgeIcon = badge.icon;
            const orderDate = new Date(order.createdAt).toLocaleDateString('hi-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#2D5A27]/30 hover:shadow-md transition-all cursor-pointer space-y-3"
              >
                {/* Top Row: Order No, Date and Status */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">ऑर्डर आईडी</span>
                    <p className="font-black text-xs text-[#2D5A27]">{order.orderNumber}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{orderDate}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                    <BadgeIcon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {/* Items Thumbnails and Summary */}
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3 overflow-hidden shrink-0">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border-2 border-white shadow-sm shrink-0"
                      >
                        <SmartImage
                          src={item.image || ''}
                          alt={item.hindiName}
                          className="w-full h-full"
                          objectFit="cover"
                        />
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {order.items.map((i) => i.hindiName).join(', ')}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {order.items.length} उत्पाद ({order.itemCount} मात्रा) • ऑनलाइन UPI
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Total and Action */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold">कुल राशि: </span>
                    <span className="text-sm font-black text-[#2D5A27]">₹{order.totalAmount}</span>
                  </div>
                  <span className="text-[#2D5A27] font-bold flex items-center gap-1 text-xs hover:underline">
                    ट्रैकिंग व विवरण <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
