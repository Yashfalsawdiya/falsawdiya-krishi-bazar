import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Order, OrderStatus, DeliveryPartner } from '../types';
import { updateOrderStatus, getLocalOrders } from '../services/orderService';
import { 
  fetchDeliveryPartners, 
  listenDeliveryPartners, 
  assignOrderToDeliveryPartner 
} from '../services/deliveryPartnerService';
import { 
  Package, Search, Filter, Clock, Truck, 
  CheckCircle2, AlertCircle, Eye, Phone, MapPin, 
  ChevronDown, Edit3, Loader2, RefreshCw, Download,
  Calendar, DollarSign, Send, Bell, BellRing, ChevronRight,
  TrendingUp, AlertTriangle, ArrowUpRight, Check, Users, UserPlus, UserCheck, X, Hash,
  ExternalLink, Copy, Globe, Shield, Plus, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateOrderInvoicePDF } from '../utils/invoiceGenerator';
import { useAppContext } from '../context/AppContext';
import { formatFullHindiDate } from '../lib/dateUtils';
import { getVehicleDisplayLabel, getVehicleIcon } from '../data/defaultDeliveryConfig';
import { VehicleIcon } from './common/VehicleIcon';
import { 
  CourierPartnerConfig, 
  listenCourierPartners, 
  resolveTrackingUrl, 
  DEFAULT_COURIER_PARTNERS, 
  getCachedCourierPartners,
  addCustomCourierPartner,
  deleteCustomCourierPartner
} from '../services/courierService';

// Web Audio API Chime generator (Zero external files, 100% reliable)
const playOrderChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // First tone (E5 - 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (G#5 - 830.61Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);

    // Third high tone (B5 - 987.77Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.25);
    gain3.gain.setValueAtTime(0.25, now + 0.25);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.25);
    osc3.stop(now + 0.8);
  } catch (e) {
    console.warn("Audio chime not allowed without user interaction:", e);
  }
};

type DateFilterType = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all' | 'custom';

const AdminOrdersManager: React.FC = () => {
  const { appContent, invoiceTemplate } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date & Status Filters
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');

  // Selected Order & Status Edit Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('confirmed');
  const [statusNote, setStatusNote] = useState('');
  const [courierPartner, setCourierPartner] = useState('');
  const [courierTrackingUrl, setCourierTrackingUrl] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('3-7 कार्य दिवस (3-7 Working Days)');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Dynamic Courier Partners State
  const [courierPartners, setCourierPartners] = useState<CourierPartnerConfig[]>(getCachedCourierPartners());
  const [showInlineAddCourier, setShowInlineAddCourier] = useState(false);
  const [inlineCourierName, setInlineCourierName] = useState('');
  const [inlineTrackingUrl, setInlineTrackingUrl] = useState('');
  const [inlineTrackingNumber, setInlineTrackingNumber] = useState('');

  // Delivery Partners State & Assign Modal
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [adminAssignNote, setAdminAssignNote] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // New Order Banner / Audio notification tracking
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const initialLoadDone = useRef(false);
  const previousOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Listen to delivery partners
    const unsubPartners = listenDeliveryPartners((list) => {
      setDeliveryPartners(list);
    });
    // Listen to courier partners
    const unsubCouriers = listenCourierPartners((list) => {
      setCourierPartners(list);
    });
    return () => {
      unsubPartners();
      unsubCouriers();
    };
  }, []);

  useEffect(() => {
    // Initial local orders for instant render (0ms delay)
    const local = getLocalOrders();
    setOrders(local);
    local.forEach(o => previousOrderIds.current.add(o.id));

    try {
      // Query with limit to optimize read load
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const remoteList: Order[] = [];
        snapshot.forEach((doc) => {
          remoteList.push(doc.data() as Order);
        });

        // Merge remote and local
        const mergedMap = new Map<string, Order>();
        local.forEach(o => mergedMap.set(o.id, o));
        remoteList.forEach(o => mergedMap.set(o.id, o));

        const sorted = Array.from(mergedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
        
        // Detect newly placed order in real-time
        if (initialLoadDone.current && sorted.length > 0) {
          const latestOrder = sorted[0];
          if (!previousOrderIds.current.has(latestOrder.id)) {
            // New order received!
            playOrderChime();
            setNewOrderAlert(latestOrder);
            setTimeout(() => {
              setNewOrderAlert(null);
            }, 8000);
          }
        }

        // Update tracking ref
        sorted.forEach(o => previousOrderIds.current.add(o.id));
        initialLoadDone.current = true;

        setOrders(sorted);
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

  // Compute Date Boundaries
  const dateBoundaries = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const endOfYesterday = startOfToday;
    const startOfWeek = startOfToday - ((now.getDay() === 0 ? 6 : now.getDay() - 1) * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return {
      startOfToday,
      startOfYesterday,
      endOfYesterday,
      startOfWeek,
      startOfMonth
    };
  }, []);

  // Filter Orders based on Date, Status, and Search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderTime = order.createdAt;

      // 1. Date Filter
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = orderTime >= dateBoundaries.startOfToday;
      } else if (dateFilter === 'yesterday') {
        matchesDate = orderTime >= dateBoundaries.startOfYesterday && orderTime < dateBoundaries.endOfYesterday;
      } else if (dateFilter === 'this_week') {
        matchesDate = orderTime >= dateBoundaries.startOfWeek;
      } else if (dateFilter === 'this_month') {
        matchesDate = orderTime >= dateBoundaries.startOfMonth;
      } else if (dateFilter === 'custom' && customDate) {
        const selStart = new Date(customDate).getTime();
        const selEnd = selStart + (24 * 60 * 60 * 1000);
        matchesDate = orderTime >= selStart && orderTime < selEnd;
      }

      // 2. Status Filter
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      // 3. Search Filter
      const search = searchQuery.toLowerCase().trim();
      const matchesSearch = !search ||
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerDetails.name.toLowerCase().includes(search) ||
        order.customerDetails.phone.includes(search) ||
        order.customerDetails.addressCity.toLowerCase().includes(search) ||
        order.items.some(i => i.hindiName.toLowerCase().includes(search) || i.name.toLowerCase().includes(search));

      return matchesDate && matchesStatus && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'amount_high') return b.totalAmount - a.totalAmount;
      if (sortBy === 'amount_low') return a.totalAmount - b.totalAmount;
      return b.createdAt - a.createdAt;
    });
  }, [orders, dateFilter, customDate, statusFilter, searchQuery, sortBy, dateBoundaries]);

  // Statistics KPI calculations
  const stats = useMemo(() => {
    const todayOrders = orders.filter(o => o.createdAt >= dateBoundaries.startOfToday);
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
    const pendingDispatch = orders.filter(o => o.status === 'placed' || o.status === 'confirmed').length;
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;

    // Status counts for current date filter
    const statusCounts: Record<string, number> = {
      all: 0,
      placed: 0,
      confirmed: 0,
      dispatched: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach(o => {
      let matchesDate = true;
      if (dateFilter === 'today') matchesDate = o.createdAt >= dateBoundaries.startOfToday;
      else if (dateFilter === 'yesterday') matchesDate = o.createdAt >= dateBoundaries.startOfYesterday && o.createdAt < dateBoundaries.endOfYesterday;
      else if (dateFilter === 'this_week') matchesDate = o.createdAt >= dateBoundaries.startOfWeek;
      else if (dateFilter === 'this_month') matchesDate = o.createdAt >= dateBoundaries.startOfMonth;
      else if (dateFilter === 'custom' && customDate) {
        const selStart = new Date(customDate).getTime();
        const selEnd = selStart + (24 * 60 * 60 * 1000);
        matchesDate = o.createdAt >= selStart && o.createdAt < selEnd;
      }

      if (matchesDate) {
        statusCounts.all++;
        if (statusCounts[o.status] !== undefined) {
          statusCounts[o.status]++;
        }
      }
    });

    return {
      todayCount: todayOrders.length,
      todaySales,
      pendingDispatch,
      deliveredCount,
      statusCounts
    };
  }, [orders, dateFilter, customDate, dateBoundaries]);

  const handleOpenStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setUpdatingOrderId(order.id);
    setNewStatus((order.status === 'placed' || order.status === 'confirmed') ? 'dispatched' : order.status);
    setStatusNote(order.notes || '');
    const defaultCourier = 'फल्सावदिया कृषि बाजार (Own Delivery)';
    const currentCourier = (order.courierPartner && order.courierPartner !== 'लोकल डिलीवरी (Own Delivery)')
      ? order.courierPartner
      : defaultCourier;
    setCourierPartner(currentCourier);

    const isCurrentOwnDelivery = Boolean(
      currentCourier.toLowerCase().includes('own delivery') ||
      currentCourier.toLowerCase().includes('फल्सावदिया') ||
      currentCourier.toLowerCase().includes('लोकल') ||
      currentCourier.toLowerCase().includes('store delivery') ||
      courierPartners.find(p => p.name.toLowerCase() === currentCourier.toLowerCase().trim() && p.isLocal)
    );

    // If own delivery, do not set external tracking number or external url
    setTrackingNumber(isCurrentOwnDelivery ? '' : (order.trackingNumber || ''));

    // Default delivery time: If empty or legacy "2-4", default to "3-7 कार्य दिवस (3-7 Working Days)"
    const rawDelivery = (order.estimatedDeliveryDate || '').trim();
    const defaultDelivery = '3-7 कार्य दिवस (3-7 Working Days)';
    const normalizedDelivery = (!rawDelivery || rawDelivery.includes('2-4'))
      ? defaultDelivery
      : rawDelivery;
    setEstimatedDeliveryDate(normalizedDelivery);

    const matched = courierPartners.find(p => p.name.toLowerCase() === currentCourier.toLowerCase());
    setCourierTrackingUrl(isCurrentOwnDelivery ? '' : (order.courierTrackingUrl || matched?.trackingUrl || ''));

    // Reset inline add form
    setShowInlineAddCourier(false);
    setInlineCourierName('');
    setInlineTrackingUrl('');
    setInlineTrackingNumber('');
  };

  // Delete a specific courier partner immediately on cross click (Protected for store own delivery)
  const handleDeleteCourierPartner = async (preset: CourierPartnerConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (preset.id === 'own_delivery' || preset.isPermanent || preset.name.includes('फल्सावदिया')) {
      return; // Cannot delete store's permanent own delivery system
    }
    try {
      // 1. Instant 0ms local state update
      const updated = courierPartners.filter((p) => p.id !== preset.id);
      setCourierPartners(updated);

      // If deleted partner was active, switch to next available partner or own delivery
      if (courierPartner.toLowerCase() === preset.name.toLowerCase()) {
        const fallback = updated[0];
        setCourierPartner(fallback ? fallback.name : 'फल्सावदिया कृषि बाजार (Own Delivery)');
        setCourierTrackingUrl(fallback ? (fallback.trackingUrl || '') : '');
      }

      // 2. Persist deletion in localStorage & Firestore
      await deleteCustomCourierPartner(preset.id);
    } catch (err) {
      console.error('Failed to delete courier partner:', err);
    }
  };

  // Inline add new courier partner directly inside the card
  const handleSaveInlineCourier = async () => {
    if (!inlineCourierName.trim()) return;
    const name = inlineCourierName.trim();
    const url = inlineTrackingUrl.trim();
    const num = inlineTrackingNumber.trim().toUpperCase();

    try {
      const isLocal = name.toLowerCase().includes('लोकल') || name.toLowerCase().includes('own delivery');
      const updated = await addCustomCourierPartner({
        name,
        trackingUrl: url,
        isLocal,
      });
      setCourierPartners(updated);
      setCourierPartner(name);
      setCourierTrackingUrl(url);
      if (num) {
        setTrackingNumber(num);
      }
      setInlineCourierName('');
      setInlineTrackingUrl('');
      setInlineTrackingNumber('');
      setShowInlineAddCourier(false);
    } catch (err) {
      console.error('Failed to add custom courier partner:', err);
    }
  };

  const handleSaveStatusUpdate = async () => {
    if (!updatingOrderId) return;
    setIsSavingStatus(true);
    try {
      const isOwnDeliverySelected = Boolean(
        courierPartner.toLowerCase().includes('own delivery') ||
        courierPartner.toLowerCase().includes('फल्सावदिया') ||
        courierPartner.toLowerCase().includes('लोकल') ||
        courierPartner.toLowerCase().includes('store delivery') ||
        courierPartners.find(p => p.name.toLowerCase() === courierPartner.toLowerCase().trim() && p.isLocal)
      );

      const effectiveTrackingNumber = isOwnDeliverySelected ? undefined : (trackingNumber.trim() || undefined);
      const effectiveCourierTrackingUrl = isOwnDeliverySelected ? undefined : (courierTrackingUrl.trim() || undefined);

      await updateOrderStatus(updatingOrderId, newStatus, statusNote, {
        courierPartner: courierPartner.trim() || undefined,
        trackingNumber: effectiveTrackingNumber,
        courierTrackingUrl: effectiveCourierTrackingUrl,
        estimatedDeliveryDate: estimatedDeliveryDate.trim() || undefined,
      });

      // Update local state instantly
      setOrders(prev => prev.map(o => {
        if (o.id === updatingOrderId) {
          return {
            ...o,
            status: newStatus,
            courierPartner,
            trackingNumber: effectiveTrackingNumber || '',
            courierTrackingUrl: effectiveCourierTrackingUrl || '',
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

  const handleOpenAssignModal = (order: Order) => {
    setAssigningOrder(order);
    setSelectedPartnerId(order.assignedPartnerId || (deliveryPartners.find(p => p.isActive && p.availabilityStatus === 'available')?.id || deliveryPartners[0]?.id || ''));
    setAdminAssignNote(order.partnerStatusNote || '');
  };

  const handleConfirmAssignPartner = async () => {
    if (!assigningOrder || !selectedPartnerId) return;
    const partner = deliveryPartners.find(p => p.id === selectedPartnerId);
    if (!partner) return;

    setIsAssigning(true);
    try {
      await assignOrderToDeliveryPartner(assigningOrder.id, partner, adminAssignNote);
      // Update local order list instantly
      setOrders(prev => prev.map(o => {
        if (o.id === assigningOrder.id) {
          return {
            ...o,
            assignedPartnerId: partner.id,
            assignedPartnerName: partner.name,
            assignedPartnerPhone: partner.phone,
            assignedPartnerEmail: partner.email,
            assignedVehicleType: partner.vehicleType,
            assignedVehicleNumber: partner.vehicleNumber,
            partnerAssignmentStatus: 'assigned',
            partnerAssignedAt: Date.now(),
            partnerStatusNote: adminAssignNote,
            updatedAt: Date.now(),
          };
        }
        return o;
      }));
      setAssigningOrder(null);
    } catch (err) {
      console.error("Failed to assign partner:", err);
    } finally {
      setIsAssigning(false);
    }
  };

  // 1-Click WhatsApp update message to customer
  const sendWhatsAppUpdate = (order: Order) => {
    const storeName = appContent?.branding?.name || 'फल्सावदिया कृषि बाजार';
    const custName = order.customerDetails.name;
    const phone = order.customerDetails.phone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;

    let msg = '';
    if (order.status === 'confirmed') {
      msg = `नमस्ते ${custName} जी!\n\n${storeName} से आपका ऑर्डर (${order.orderNumber}) स्वीकार कर लिया गया है और पैकिंग हो रही है।\nकुल राशि: ₹${order.totalAmount} (ऑनलाइन भुगतान सफल)\n\nजल्द ही आपका पार्सल रवाना किया जाएगा।\nधन्यवाद! 🙏`;
    } else if (order.status === 'dispatched') {
      const resolved = resolveTrackingUrl(order.courierPartner, order.trackingNumber, order.courierTrackingUrl, courierPartners);
      if (resolved.isLocal) {
        msg = `नमस्ते ${custName} जी!\n\nआपका ऑर्डर (${order.orderNumber}) रवाना (Shipped) कर दिया गया है।\n📦 डिलीवरी: स्थानीय डिलीवरी (लोकल स्टोर पार्टनर द्वारा)\n🔢 पर्ची / संदर्भ नं: ${order.trackingNumber || 'उपलब्ध'}\n⏱ अनुमानित समय: ${order.estimatedDeliveryDate || '3-7 कार्य दिवस (3-7 Working Days)'}\n\nधन्यवाद!\n${storeName}`;
      } else {
        msg = `नमस्ते ${custName} जी!\n\nआपका ऑर्डर (${order.orderNumber}) रवाना (Shipped) कर दिया गया है।\n📦 कूरियर: ${order.courierPartner || 'Speed Post (इंडिया पोस्ट)'}\n🔢 कंसाइनमेंट / ट्रैकिंग नं: ${order.trackingNumber || 'उपलब्ध'}\n⏱ अनुमानित समय: ${order.estimatedDeliveryDate || '3-7 कार्य दिवस (3-7 Working Days)'}\n🌐 ऑनलाइन ट्रैक करें: ${resolved.url}\n\nधन्यवाद!\n${storeName}`;
      }
    } else if (order.status === 'out_for_delivery') {
      msg = `नमस्ते ${custName} जी!\n\nआपका ऑर्डर (${order.orderNumber}) आज डिलीवरी के लिए निकल चुका है। कृपया फोन चालू रखें।\n\nधन्यवाद!\n${storeName}`;
    } else if (order.status === 'delivered') {
      msg = `नमस्ते ${custName} जी!\n\nआपका ऑर्डर (${order.orderNumber}) सफलतापूर्वक डिलीवर हो चुका है। आशा है कि आपको उत्पाद पसंद आया होगा।\n\n${storeName} से खरीदारी के लिए धन्यवाद! 🌾`;
    } else {
      msg = `नमस्ते ${custName} जी!\n\nआपके ऑर्डर (${order.orderNumber}) की वर्तमान स्थिति: ${order.status} है।\nकुल राशि: ₹${order.totalAmount}\n\nकिसी भी सहायता के लिए संपर्क करें।\nधन्यवाद!\n${storeName}`;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Real-Time New Order Popup Alert */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-emerald-400 gap-3 z-50 sticky top-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-xl animate-bounce">
                <BellRing className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-xs">नया ऑर्डर प्राप्त हुआ!</p>
                <p className="text-[11px] text-emerald-100 font-medium">
                  {newOrderAlert.orderNumber} • ₹{newOrderAlert.totalAmount} ({newOrderAlert.customerDetails.name})
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSearchQuery(newOrderAlert.orderNumber);
                setDateFilter('today');
                setNewOrderAlert(null);
              }}
              className="px-3 py-1.5 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 active:scale-95 transition-all whitespace-nowrap"
            >
              देखें
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold">आज के कुल ऑर्डर</span>
            <Package className="w-4 h-4 text-[#2D5A27]" />
          </div>
          <p className="text-xl font-black text-gray-800">{stats.todayCount}</p>
          <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> ₹{stats.todaySales.toLocaleString('en-IN')} आज की बिक्री
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold">डिस्पैच हेतु पेंडिंग</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700">{stats.pendingDispatch}</p>
          <p className="text-[10px] text-gray-400">पैकिंग व शिपिंग आवश्यक</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold">सफल डिलीवरी</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700">{stats.deliveredCount}</p>
          <p className="text-[10px] text-gray-400">कुल डिलीवर ऑर्डर</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold">डेटाबेस स्थिति</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xl font-black text-gray-800">{orders.length}</p>
          <p className="text-[10px] text-indigo-700 font-semibold">100% फ्री लोकल कैश</p>
        </div>
      </div>

      {/* Main Filter & Search Control Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        {/* Title and Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#2D5A27]" />
            <h3 className="font-bold text-gray-800 text-sm">ऑर्डर्स प्रबंधन एवं ट्रैकिंग</h3>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold text-gray-700 outline-none"
            >
              <option value="newest">नवीनतम पहले</option>
              <option value="oldest">पुराने पहले</option>
              <option value="amount_high">राशि: ज्यादा से कम</option>
              <option value="amount_low">राशि: कम से ज्यादा</option>
            </select>
          </div>
        </div>

        {/* 1. Date Grouping Pills (Today, Yesterday, This Week, etc.) */}
        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#2D5A27]" /> समय अवधि चुनें (Date Filter):
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {[
              { id: 'today', label: 'आज (Today)' },
              { id: 'yesterday', label: 'कल (Yesterday)' },
              { id: 'this_week', label: 'इस सप्ताह (This Week)' },
              { id: 'this_month', label: 'इस महीने' },
              { id: 'all', label: 'सभी ऑर्डर्स (All)' },
              { id: 'custom', label: 'कस्टम तारीख' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as DateFilterType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                  dateFilter === tab.id
                    ? 'bg-[#2D5A27] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Input if Custom is selected */}
          {dateFilter === 'custom' && (
            <div className="pt-2 flex items-center gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="p-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-[#2D5A27] font-bold text-gray-700 bg-gray-50"
              />
              <span className="text-xs text-gray-500 font-medium">तारीख के ऑर्डर्स देखें</span>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="ऑर्डर नंबर, ग्राहक का नाम, मोबाइल या दवाई का नाम खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#2D5A27] font-medium"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Status Pipeline Filter Bar with Dynamic Badges */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#2D5A27]" /> स्टेटस फ़िल्टर (Status Pipeline):
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {[
              { id: 'all', label: 'सभी (All)', count: stats.statusCounts.all },
              { id: 'dispatched', label: 'रवाना (Shipped)', count: stats.statusCounts.dispatched },
              { id: 'out_for_delivery', label: 'डिलीवरी के लिए निकला', count: stats.statusCounts.out_for_delivery },
              { id: 'delivered', label: 'डिलीवर (Delivered)', count: stats.statusCounts.delivered },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  statusFilter === tab.id
                    ? 'bg-[#2D5A27] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <Loader2 className="w-7 h-7 text-[#2D5A27] animate-spin mx-auto" />
          <p className="text-xs text-gray-400">ऑर्डर्स लोड हो रहे हैं...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200 p-6 space-y-3">
          <Package className="w-12 h-12 text-gray-300 mx-auto" />
          <div>
            <p className="font-bold text-gray-700 text-sm">चयनित अवधि में कोई ऑर्डर नहीं मिला</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {dateFilter === 'today' ? 'आज अभी तक कोई नया ऑर्डर प्राप्त नहीं हुआ है।' : 'फ़िल्टर बदलकर देखें या सर्च क्लियर करें।'}
            </p>
          </div>
          {dateFilter !== 'all' && (
            <button
              onClick={() => { setDateFilter('all'); setStatusFilter('all'); setSearchQuery(''); }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              सभी ऑर्डर्स देखें
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span className="font-bold">{filteredOrders.length} ऑर्डर प्रदर्शित</span>
            <span className="text-[11px]">कुल राशि: ₹{filteredOrders.reduce((s, o) => s + (o.status !== 'cancelled' ? o.totalAmount : 0), 0).toLocaleString('en-IN')}</span>
          </div>

          {filteredOrders.map((order) => {
            const isToday = order.createdAt >= dateBoundaries.startOfToday;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3 hover:border-gray-300 transition-all"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-[#2D5A27]">{order.orderNumber}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      order.status === 'placed' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'confirmed' ? 'bg-amber-100 text-amber-800' :
                      order.status === 'dispatched' ? 'bg-indigo-100 text-indigo-800' :
                      order.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Invoice Download */}
                    <button
                      onClick={() => generateOrderInvoicePDF(order, {
                        storeName: appContent?.branding?.name || 'फल्सावदिया कृषि बाजार',
                        tagline: appContent?.branding?.tagline || 'किसान का भरोसा, हमारी पहचान',
                        phone: appContent?.contactInfo?.whatsapp || '+91 89823 38046',
                        address: appContent?.contactInfo?.address || 'मध्य प्रदेश (भारत)',
                        logo: appContent?.branding?.logo,
                      }, invoiceTemplate)}
                      className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                      title="Invoice PDF Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>रसीद</span>
                    </button>

                    {/* Status Editor Button */}
                    <button
                      onClick={() => handleOpenStatusModal(order)}
                      className="px-3 py-1.5 bg-[#2D5A27] text-white hover:bg-[#2D5A27]/90 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>स्थिति बदलें</span>
                    </button>
                  </div>
                </div>

                {/* Customer and Shipping Details with Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-800 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#2D5A27]" /> {order.customerDetails.name}
                      </p>
                      {/* Direct Call & WhatsApp Quick Buttons */}
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${order.customerDetails.phone}`}
                          className="px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 hover:bg-gray-50 active:scale-95 flex items-center gap-1"
                          title="Call Customer"
                        >
                          <Phone className="w-2.5 h-2.5 text-emerald-600" />
                          <span>कॉल</span>
                        </a>
                        <button
                          onClick={() => sendWhatsAppUpdate(order)}
                          className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold active:scale-95 flex items-center gap-1 cursor-pointer"
                          title="Send WhatsApp Update"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>व्हाट्सएप</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>{order.customerDetails.phone}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                      <span>{order.customerDetails.addressHouse}, {order.customerDetails.addressCity}, {order.customerDetails.addressDistrict} ({order.customerDetails.addressPincode})</span>
                    </p>
                  </div>

                  <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 space-y-1">
                    <p className="font-black text-sm text-[#2D5A27]">कुल: ₹{order.totalAmount}</p>
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Razorpay Paid {order.razorpayPaymentId ? `(${order.razorpayPaymentId})` : ''}</span>
                    </p>
                    {order.deliverySnapshot ? (
                      <div className="text-[10px] bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200 inline-block font-semibold">
                        {order.deliverySnapshot.vehicleEmoji} {order.deliverySnapshot.vehicleNameHindi} • {order.deliverySnapshot.totalWeightKg}kg • {order.deliverySnapshot.distanceKm}km (₹{order.deliveryCharges})
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-500">डिलीवरी शुल्क: ₹{order.deliveryCharges || 0}</p>
                    )}
                    <p className="text-[10px] text-gray-400">
                      {formatFullHindiDate(order.createdAt, true)}
                    </p>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1 pt-1 bg-white">
                  <p className="text-[11px] font-bold text-gray-500 mb-1">सामग्री विवरण (Items):</p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 last:border-0">
                      <span className="text-gray-700 font-medium">
                        • {item.hindiName} ({item.unit}) × <span className="font-bold text-gray-900">{item.quantity}</span>
                      </span>
                      <span className="font-bold text-gray-800">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Delivery Partner Assignment Section */}
                <div className="bg-emerald-50/40 border border-emerald-100/80 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-[#2D5A27] font-bold shrink-0 shadow-2xs">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">डिलीवरी पार्टनर:</span>
                        {order.assignedPartnerName ? (
                          <span className="text-xs font-black text-emerald-950 flex items-center gap-1">
                            {order.assignedPartnerName}
                            {order.assignedPartnerPhone && (
                              <a href={`tel:${order.assignedPartnerPhone}`} className="text-[#2D5A27] font-normal hover:underline ml-1">
                                (+91 {order.assignedPartnerPhone})
                              </a>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 font-bold">अभी कोई पार्टनर असाइन नहीं है</span>
                        )}
                      </div>

                      {order.assignedPartnerName && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            order.partnerAssignmentStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            order.partnerAssignmentStatus === 'out_for_delivery' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            order.partnerAssignmentStatus === 'picked_up' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            order.partnerAssignmentStatus === 'accepted' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            order.partnerAssignmentStatus === 'declined' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {order.partnerAssignmentStatus === 'delivered' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>सामान डिलीवर हुआ</span>
                              </>
                            ) :
                             order.partnerAssignmentStatus === 'out_for_delivery' ? (
                               <>
                                 <Truck className="w-3 h-3 text-blue-700" />
                                 <span>रास्ते में है</span>
                               </>
                             ) :
                             order.partnerAssignmentStatus === 'picked_up' ? (
                               <>
                                 <Package className="w-3 h-3 text-purple-700" />
                                 <span>वेयरहाउस से पिकअप</span>
                               </>
                             ) :
                             order.partnerAssignmentStatus === 'accepted' ? (
                               <>
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                                 <span>पार्टनर ने स्वीकार किया</span>
                               </>
                             ) :
                             order.partnerAssignmentStatus === 'declined' ? (
                               <>
                                 <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
                                 <span>पार्टनर उपलब्ध नहीं</span>
                               </>
                             ) : (
                               <>
                                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                 <span>असाइन किया गया (प्रतीक्षारत)</span>
                               </>
                             )}
                          </span>
                          {order.partnerDeclineReason && (
                            <span className="text-[10px] text-red-600 font-medium truncate max-w-[200px]">
                              कारण: {order.partnerDeclineReason}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAssignModal(order)}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-[#2D5A27] border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{order.assignedPartnerName ? 'रीअसाइन / बदलें' : 'डिलीवरी पार्टनर असाइन करें'}</span>
                  </button>
                </div>

                {/* Courier & Tracking Banner if present */}
                {order.trackingNumber && (
                  <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-[11px] text-indigo-900 flex flex-wrap justify-between items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>कूरियर: <b>{order.courierPartner || 'Speed Post'}</b></span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-mono">ट्रैकिंग: <b>{order.trackingNumber}</b></span>
                    </span>
                    {order.estimatedDeliveryDate && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>डिलीवरी: <b>{order.estimatedDeliveryDate}</b></span>
                      </span>
                    )}
                    {(() => {
                      const res = resolveTrackingUrl(order.courierPartner, order.trackingNumber, order.courierTrackingUrl, courierPartners);
                      if (res.isLocal) {
                        return (
                          <span className="px-2 py-1 bg-emerald-100/90 text-emerald-800 rounded-lg border border-emerald-200 font-bold text-[10px] ml-auto">
                            लोकल डिलीवरी
                          </span>
                        );
                      }
                      return (
                        <a
                          href={res.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-white hover:bg-indigo-100/70 text-indigo-700 rounded-lg border border-indigo-200 font-bold flex items-center gap-1 text-[10px] ml-auto transition-all"
                          title="आधिकारिक ट्रैकिंग पोर्टल खोलें"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>पोर्टल खोलें ↗</span>
                        </a>
                      );
                    })()}
                  </div>
                )}

                {/* Notes if any */}
                {order.notes && (
                  <div className="bg-amber-50/70 border border-amber-100 p-2 rounded-xl text-[11px] text-amber-900">
                    <span className="font-bold">टिप्पणी: </span> {order.notes}
                  </div>
                )}
              </div>
            );
          })}
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
                  <p className="text-[10px] text-gray-400">{selectedOrder.orderNumber} • {selectedOrder.customerDetails.name}</p>
                </div>
                <button
                  onClick={() => setUpdatingOrderId(null)}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">नई स्थिति चुनें (Select Status) *</label>
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

                {/* =============================================================== */}
                {/* MODERN COURIER & DISPATCH SETTINGS CARD */}
                {/* =============================================================== */}
                <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 rounded-3xl p-4 sm:p-5 border border-emerald-200/90 shadow-xs space-y-4">
                  {/* Card Section Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#2D5A27] to-[#1e3d1a] text-white flex items-center justify-center shadow-xs shrink-0">
                        <Truck className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
                            कूरियर पार्टनर व पार्सल ट्रैकिंग
                          </h4>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                            लाइव ट्रैकिंग
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                          पार्सल डिस्पैच, आधिकारिक ट्रैकिंग लिंक व कंसाइनमेंट नंबर
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Courier Partner Selector Pills & Manual Name */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-gray-700">
                        कूरियर पार्टनर चुनें या नया नाम डालें
                      </label>
                      <span className="text-[10px] font-bold text-gray-500">
                        सक्रिय: <b className="text-gray-800">{courierPartner || 'कोई नहीं'}</b>
                      </span>
                    </div>

                    {/* Dynamic Courier Partner Preset Buttons & Plus Button */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {courierPartners.map((preset) => {
                        const isSelected = courierPartner.toLowerCase() === preset.name.toLowerCase();
                        const isPermanentStoreDelivery = preset.id === 'own_delivery' || preset.isPermanent || preset.name.includes('फल्सावदिया');

                        return (
                          <div
                            key={preset.id}
                            className={`group inline-flex items-center text-[10px] sm:text-[11px] rounded-xl border font-bold transition-all shadow-2xs ${
                              isSelected
                                ? preset.isLocal
                                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200'
                                  : 'bg-[#C4122F] text-white border-[#C4122F] ring-2 ring-red-200'
                                : 'bg-white hover:bg-emerald-50/80 text-gray-700 border-gray-200 hover:border-emerald-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setCourierPartner(preset.name);
                                if (preset.isLocal || preset.name.includes('फल्सावदिया') || preset.name.includes('Own Delivery') || preset.id === 'own_delivery') {
                                  setCourierTrackingUrl('');
                                  setTrackingNumber('');
                                } else {
                                  setCourierTrackingUrl(preset.trackingUrl || '');
                                }
                              }}
                              className={`py-1.5 flex items-center gap-1 cursor-pointer ${
                                isPermanentStoreDelivery ? 'px-3' : 'pl-2.5 pr-1.5'
                              }`}
                            >
                              <span>{preset.name}</span>
                              {preset.isLocal && !isSelected && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                                  लोकल
                                </span>
                              )}
                            </button>

                            {/* Cross (X) icon to delete this courier partner - ONLY for external/custom partners, never store own delivery */}
                            {!isPermanentStoreDelivery && (
                              <button
                                type="button"
                                title={`"${preset.name}" हटाएं`}
                                onClick={(e) => handleDeleteCourierPartner(preset, e)}
                                className={`p-1 mr-1 rounded-md transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'text-white/80 hover:text-white hover:bg-black/25 active:scale-90'
                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50 active:scale-90'
                                }`}
                              >
                                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Plus button directly after the courier partners / लोकल डिलीवरी */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowInlineAddCourier(!showInlineAddCourier);
                          if (!showInlineAddCourier) {
                            setInlineCourierName('');
                            setInlineTrackingUrl('');
                            setInlineTrackingNumber(trackingNumber || '');
                          }
                        }}
                        title="नया कूरियर पार्टनर जोड़ें"
                        className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-xl border font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                          showInlineAddCourier
                            ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-dashed border-emerald-300 hover:border-emerald-400'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>कूरियर जोड़ें</span>
                      </button>
                    </div>

                    {/* Inline Form to Add Courier Partner + Tracking Link + Consignment No directly inside card */}
                    <AnimatePresence>
                      {showInlineAddCourier && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 p-3.5 sm:p-4 rounded-2xl border-2 border-dashed border-emerald-300 shadow-sm space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                                <Plus className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                                <span>नया कूरियर पार्टनर जोड़ें (Add Courier Partner)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowInlineAddCourier(false)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* 1. Courier Name */}
                              <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-700">
                                  कूरियर पार्टनर का नाम <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="उदाँ: XpressBees, Shadowfax, Maruti Courier"
                                  value={inlineCourierName}
                                  onChange={(e) => setInlineCourierName(e.target.value)}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-emerald-200"
                                />
                              </div>

                              {/* 3. Consignment / Tracking Number */}
                              <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-700 flex items-center gap-1">
                                  <Hash className="w-3 h-3 text-red-600" />
                                  <span>ट्रैकिंग / कंसाइनमेंट नंबर (Consignment No.)</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="उदाँ: AWB123456789, TRK987654"
                                  value={inlineTrackingNumber}
                                  onChange={(e) => setInlineTrackingNumber(e.target.value.toUpperCase())}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-xl font-mono font-bold text-xs text-gray-800 outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-emerald-200 tracking-wider"
                                />
                              </div>
                            </div>

                            {/* 2. Official Tracking URL */}
                            <div className="space-y-1">
                              <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-700 flex items-center gap-1">
                                <Globe className="w-3 h-3 text-indigo-600" />
                                <span>आधिकारिक ट्रैकिंग वेबसाइट लिंक (Tracking URL Link)</span>
                              </label>
                              <input
                                type="url"
                                placeholder="उदाँ: https://www.xpressbees.com/track?awb={trackingNumber}"
                                value={inlineTrackingUrl}
                                onChange={(e) => setInlineTrackingUrl(e.target.value)}
                                className="w-full p-2 bg-white border border-gray-200 rounded-xl font-mono text-xs text-gray-800 outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-emerald-200"
                              />
                              <p className="text-[9.5px] text-gray-500 font-medium">
                                लिंक में <code className="bg-emerald-100/70 text-emerald-900 px-1 py-0.5 rounded font-bold font-mono">{'{trackingNumber}'}</code> रखने पर ग्राहक का असली ट्रैकिंग नंबर लिंक में अपने-आप जुड़ जाएगा।
                              </p>
                            </div>

                            {/* Save button and Cancel button */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleSaveInlineCourier}
                                disabled={!inlineCourierName.trim()}
                                className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>पार्टनर सुरक्षित करें व लागू करें (Save & Select)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowInlineAddCourier(false);
                                  setInlineCourierName('');
                                  setInlineTrackingUrl('');
                                  setInlineTrackingNumber('');
                                }}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                              >
                                रद्द करें
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <input
                      type="text"
                      placeholder="उदाँ: Speed Post (इंडिया पोस्ट), Delhivery, DTDC, मारुति कूरियर"
                      value={courierPartner}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCourierPartner(val);
                        const matched = courierPartners.find(p => p.name.toLowerCase() === val.toLowerCase().trim());
                        if (matched) {
                          if (matched.isLocal || matched.name.includes('फल्सावदिया') || matched.name.includes('Own Delivery')) {
                            setCourierTrackingUrl('');
                            setTrackingNumber('');
                          } else {
                            setCourierTrackingUrl(matched.trackingUrl || '');
                          }
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#2D5A27] font-bold text-xs text-gray-800 transition-all shadow-2xs"
                    />
                  </div>

                  {/* If store's own delivery is selected, hide external tracking URL & consignment number */}
                  {(() => {
                    const isOwnStoreDelivery = Boolean(
                      courierPartner.toLowerCase().includes('own delivery') ||
                      courierPartner.toLowerCase().includes('फल्सावदिया') ||
                      courierPartner.toLowerCase().includes('लोकल') ||
                      courierPartner.toLowerCase().includes('store delivery') ||
                      courierPartners.find(p => p.name.toLowerCase() === courierPartner.toLowerCase().trim() && p.isLocal)
                    );

                    if (isOwnStoreDelivery) {
                      return (
                        <div className="bg-emerald-50/90 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/90 text-emerald-950 space-y-1.5 shadow-2xs">
                          <div className="flex items-center gap-2 font-black text-xs sm:text-[13px] text-emerald-900">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>सीधी स्टोर डिलीवरी (In-App Direct Tracking)</span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-emerald-800 leading-relaxed pl-6">
                            यह आपके स्टोर की अपनी डायरेक्ट डिलीवरी है। ग्राहक सीधे ऐप में ही ऑर्डर का लाइव स्टेटस देख सकेंगे, इसलिए इसके लिए किसी बाहरी कूरियर ट्रैकिंग लिंक या कंसाइनमेंट नंबर की आवश्यकता नहीं है।
                          </p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Attached Official Tracking Website URL */}
                        <div className="bg-white/95 p-3 sm:p-3.5 rounded-2xl border border-emerald-100 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-600 flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-indigo-600" />
                              <span>आधिकारिक ट्रैकिंग वेबसाइट लिंक (Official Tracking URL)</span>
                            </label>
                            {courierTrackingUrl && (
                              <a
                                href={resolveTrackingUrl(courierPartner, trackingNumber, courierTrackingUrl, courierPartners).url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>पोर्टल टेस्ट करें</span>
                              </a>
                            )}
                          </div>
                          <input
                            type="url"
                            placeholder="उदाँ: https://www.maruticourier.com/track?awb={trackingNumber}"
                            value={courierTrackingUrl}
                            onChange={(e) => setCourierTrackingUrl(e.target.value)}
                            className="w-full p-2.5 bg-gray-50/50 focus:bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-[#2D5A27] transition-all"
                          />
                          <p className="text-[10px] text-gray-500 font-medium">
                            लिंक में <code className="bg-gray-100 px-1 py-0.5 rounded font-bold font-mono">{'{trackingNumber}'}</code> रखने पर ग्राहक का असली ट्रैकिंग नंबर लिंक में अपने-आप जुड़ जाएगा।
                          </p>
                        </div>

                        {/* Consignment / Tracking Number Field */}
                        <div className="bg-white/95 p-3 sm:p-3.5 rounded-2xl border border-emerald-100 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-600 flex items-center gap-1">
                              <Hash className="w-3.5 h-3.5 text-red-600" />
                              <span>ट्रैकिंग / कंसाइनमेंट नंबर (Consignment No.)</span>
                            </label>
                            {trackingNumber && (
                              <a
                                href={resolveTrackingUrl(courierPartner, trackingNumber, courierTrackingUrl, courierPartners).url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>पोर्टल खोलें</span>
                              </a>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="उदाँ: EM123456789IN, DL123456789"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                            className="w-full p-2.5 bg-gray-50/50 focus:bg-white border border-gray-200 rounded-xl outline-none focus:border-[#2D5A27] font-mono font-bold text-xs tracking-wider transition-all"
                          />
                          <p className="text-[10px] text-gray-500 font-medium">
                            कूरियर रसीद का कंसाइनमेंट नंबर डालें। ग्राहक को ऐप में 1-क्लिक ऑटो-कॉपी व आधिकारिक पोर्टल पर जाने का बटन मिलेगा।
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  {/* Estimated Delivery Time Field */}
                  <div className="bg-white/95 p-3 sm:p-3.5 rounded-2xl border border-emerald-100 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] uppercase tracking-wider font-extrabold text-gray-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>अनुमानित डिलीवरी समय (Estimated Delivery Time)</span>
                      </label>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        डिफ़ॉल्ट: 3-7 कार्य दिवस
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="उदाँ: 3-7 कार्य दिवस (3-7 Working Days)"
                      value={estimatedDeliveryDate}
                      onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                      className="w-full p-2.5 bg-gray-50/50 focus:bg-white border border-gray-200 rounded-xl outline-none focus:border-[#2D5A27] font-bold text-xs text-gray-800 transition-all"
                    />

                    {/* Quick Selection Chips for Delivery Time */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {[
                        '3-7 कार्य दिवस (3-7 Working Days)',
                        '1-3 कार्य दिवस (1-3 Working Days)',
                        '5-10 कार्य दिवस (5-10 Working Days)',
                        'आज ही डिलीवरी (Same Day Delivery)',
                      ].map((presetTime) => {
                        const isPresetSelected = estimatedDeliveryDate === presetTime;
                        return (
                          <button
                            key={presetTime}
                            type="button"
                            onClick={() => setEstimatedDeliveryDate(presetTime)}
                            className={`text-[10px] px-2.5 py-1 rounded-xl border font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                              isPresetSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                                : 'bg-gray-50 hover:bg-emerald-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            <span>{presetTime.split(' (')[0]}</span>
                            {isPresetSelected && <Check className="w-3 h-3 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">विशेष टिप्पणी / संदेश (Customer Note)</label>
                  <textarea
                    rows={2}
                    placeholder="उदाँ: सामान पैक हो चुका है, आज शाम को डिस्पैच किया जाएगा।"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setUpdatingOrderId(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  onClick={handleSaveStatusUpdate}
                  disabled={isSavingStatus}
                  className="flex-1 py-2.5 bg-[#2D5A27] text-white font-bold rounded-xl text-xs hover:bg-[#2D5A27]/90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isSavingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'सुरक्षित करें (Save)'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Assign Delivery Partner Modal */}
        {assigningOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssigningOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#2D5A27] flex items-center justify-center font-black">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">डिलीवरी पार्टनर असाइन करें</h3>
                    <p className="text-[10px] text-gray-400 font-medium">
                      ऑर्डर: <span className="font-bold text-[#2D5A27]">{assigningOrder.orderNumber}</span> • {assigningOrder.customerDetails.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAssigningOrder(null)}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Delivery Order Summary */}
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-1 text-xs">
                <p className="font-bold text-gray-800">
                  डिलीवरी स्थान: <span className="font-normal text-gray-600">{assigningOrder.customerDetails.addressHouse}, {assigningOrder.customerDetails.addressCity} ({assigningOrder.customerDetails.addressPincode})</span>
                </p>
                <p className="text-gray-500 text-[11px]">
                  उत्पाद: <b>{assigningOrder.items.length} आयटम</b> • कुल राशि: <b>₹{assigningOrder.totalAmount}</b>
                </p>
              </div>

              {/* Partner Selection List */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-gray-700">
                  उपलब्ध डिलीवरी पार्टनर चुनें ({deliveryPartners.filter(p => p.isActive).length} सक्रिय):
                </label>

                {deliveryPartners.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs text-center font-bold">
                    कोई डिलीवरी पार्टनर पंजीकृत नहीं है। कृपया पहले Delivery Partners टैब में पार्टनर जोड़ें।
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {deliveryPartners.map((partner) => {
                      const isSelected = selectedPartnerId === partner.id;
                      const isAvailable = partner.isActive && partner.availabilityStatus === 'available';

                      return (
                        <div
                          key={partner.id}
                          onClick={() => partner.isActive && setSelectedPartnerId(partner.id)}
                          className={`group p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            !partner.isActive 
                              ? 'opacity-50 bg-gray-50 border-gray-200 cursor-not-allowed' 
                              : isSelected 
                                ? 'bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/40 border-[#2D5A27] shadow-sm ring-1 ring-[#2D5A27]/30' 
                                : 'bg-white border-gray-200/90 hover:border-emerald-300 hover:bg-emerald-50/20 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 ${
                              isSelected 
                                ? 'bg-gradient-to-br from-[#2D5A27] to-[#1e3e1a] text-white border-emerald-800/30 shadow-sm shadow-[#2D5A27]/25' 
                                : 'bg-emerald-50/90 text-[#2D5A27] border-emerald-100/80 shadow-2xs'
                            }`}>
                              <VehicleIcon 
                                emojiOrType={partner.vehicleType} 
                                className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#2D5A27]'}`} 
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight leading-snug truncate">
                                {partner.name}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                <span>+91 {partner.phone}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-600 truncate">{getVehicleDisplayLabel(partner.vehicleType, partner.vehicleTypeName)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Modern Status Badge & Selection Indicator */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-2xs transition-all ${
                              !partner.isActive 
                                ? 'bg-gray-100 text-gray-500 border-gray-200' 
                                : isAvailable 
                                  ? 'bg-emerald-100/90 text-[#2D5A27] border-emerald-200/80' 
                                  : partner.availabilityStatus === 'on_delivery' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                              {!partner.isActive ? (
                                'निष्क्रिय'
                              ) : isAvailable ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                  <span>उपलब्ध</span>
                                </span>
                              ) : partner.availabilityStatus === 'on_delivery' ? (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-600" />
                                  <span>डिलीवरी पर</span>
                                </span>
                              ) : (
                                'ऑफ ड्यूटी'
                              )}
                            </span>

                            {/* Modern Checkmark Selector */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-[#2D5A27] text-white shadow-xs' 
                                : 'border-2 border-gray-300 group-hover:border-emerald-500'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Admin Note / Special Instructions */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  पार्टनर हेतु विशेष निर्देश (Special Note for Delivery Boy):
                </label>
                <input
                  type="text"
                  placeholder="उदा. दोपहर 3 बजे से पहले पहुँचाएँ, ग्राहक से मिलकर ओटीपी लें"
                  value={adminAssignNote}
                  onChange={(e) => setAdminAssignNote(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setAssigningOrder(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  onClick={handleConfirmAssignPartner}
                  disabled={isAssigning || !selectedPartnerId}
                  className="flex-1 py-2.5 bg-[#2D5A27] text-white font-bold rounded-xl text-xs hover:bg-[#2D5A27]/90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>असाइन करें (Assign)</span>
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
