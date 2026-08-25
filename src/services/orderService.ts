import { Order, OrderStatus, PaymentStatus } from '../types';
import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';

const LOCAL_ORDERS_KEY = 'falsawdiya_customer_orders_cache';

// Helper to save order locally for guest / offline fallback
export const saveLocalOrder = (order: Order) => {
  try {
    const existing = getLocalOrders();
    const filtered = existing.filter(o => o.id !== order.id);
    const updated = [order, ...filtered];
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to cache local order:", e);
  }
};

export const getLocalOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(LOCAL_ORDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to read local orders:", e);
    return [];
  }
};

export const getLocalOrderById = (orderId: string): Order | null => {
  const list = getLocalOrders();
  return list.find(o => o.id === orderId || o.orderNumber === orderId) || null;
};

// Generate unique readable Order Number e.g. FKB-2025-XXXX
export const generateOrderNumber = (): string => {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const timeSuffix = Date.now().toString().slice(-3);
  return `FKB-${year}-${randomDigits}${timeSuffix}`;
};

// Create a new Order in Firestore and LocalStorage
export const createNewOrder = async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'timeline'> & { id?: string }): Promise<Order> => {
  const orderId = orderData.id || `order_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
  const orderNumber = generateOrderNumber();
  const now = Date.now();

  const initialTimeline = [
    {
      title: 'ऑर्डर दर्ज हुआ (Order Placed)',
      description: `ऑनलाइन भुगतान (${orderData.paymentStatus === 'paid' ? 'सफल' : 'प्रक्रियाधीन'}) के साथ ऑर्डर प्राप्त हुआ।`,
      timestamp: now,
      status: 'placed' as OrderStatus,
    }
  ];

  const fullOrder: Order = {
    ...orderData,
    id: orderId,
    orderNumber,
    timeline: initialTimeline,
    createdAt: now,
    updatedAt: now,
  };

  // Always save locally first for instant offline availability and guests
  saveLocalOrder(fullOrder);

  // Sync to Firestore
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    await setDoc(orderDocRef, fullOrder);
  } catch (err) {
    console.warn("Firestore order sync note: saved locally and will retry.", err);
  }

  return fullOrder;
};

// Update order status & add timeline event (Admin or System)
export const updateOrderStatus = async (
  orderId: string, 
  newStatus: OrderStatus, 
  note?: string,
  extraDetails?: { trackingNumber?: string; courierPartner?: string; estimatedDeliveryDate?: string }
): Promise<void> => {
  const statusTitles: Record<OrderStatus, string> = {
    placed: 'ऑर्डर दर्ज हुआ (Order Placed)',
    confirmed: 'ऑर्डर स्वीकृत हुआ (Order Confirmed)',
    dispatched: 'पार्सल रवाना हुआ (Dispatched/Shipped)',
    out_for_delivery: 'डिलीवरी के लिए निकला (Out for Delivery)',
    delivered: 'सफलतापूर्वक डिलीवर हुआ (Delivered)',
    cancelled: 'ऑर्डर रद्द किया गया (Cancelled)',
  };

  const statusDescriptions: Record<OrderStatus, string> = {
    placed: 'ग्राहक द्वारा ऑनलाइन ऑर्डर दर्ज किया गया।',
    confirmed: 'फल्सावदिया कृषि बाजार द्वारा ऑर्डर स्वीकार व पैक किया गया।',
    dispatched: extraDetails?.courierPartner ? `पार्सल ${extraDetails.courierPartner} (ट्रैकिंग नं: ${extraDetails.trackingNumber || 'N/A'}) द्वारा रवाना किया गया।` : 'सामान कूरियर/डिलीवरी पार्टनर को सुपुर्द कर दिया गया है।',
    out_for_delivery: 'डिलीवरी पार्टनर आपके पते पर सामान पहुँचाने निकल चुका है।',
    delivered: 'उत्पाद किसान ग्राहक तक सफलतापूर्वक पहुँचा दिया गया है।',
    cancelled: note || 'ऑर्डर रद्द कर दिया गया है।',
  };

  const newEvent = {
    title: statusTitles[newStatus],
    description: note || statusDescriptions[newStatus],
    timestamp: Date.now(),
    status: newStatus,
  };

  // Update local cache
  const local = getLocalOrderById(orderId);
  if (local) {
    local.status = newStatus;
    local.timeline = [...(local.timeline || []), newEvent];
    local.updatedAt = Date.now();
    if (extraDetails?.trackingNumber) local.trackingNumber = extraDetails.trackingNumber;
    if (extraDetails?.courierPartner) local.courierPartner = extraDetails.courierPartner;
    if (extraDetails?.estimatedDeliveryDate) local.estimatedDeliveryDate = extraDetails.estimatedDeliveryDate;
    if (note) local.notes = note;
    saveLocalOrder(local);
  }

  // Update Firestore
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    const existingSnap = await getDoc(orderDocRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data() as Order;
      const updatedTimeline = [...(data.timeline || []), newEvent];
      await updateDoc(orderDocRef, {
        status: newStatus,
        timeline: updatedTimeline,
        updatedAt: Date.now(),
        ...(extraDetails || {}),
        ...(note ? { notes: note } : {})
      });
    }
  } catch (err) {
    console.error("Failed to update order status in Firestore:", err);
  }
};

// Fetch all orders for current user (or match by phone / email / local cache)
export const fetchUserOrders = async (userId?: string, userEmail?: string, userPhone?: string): Promise<Order[]> => {
  const localOrders = getLocalOrders();
  const remoteOrdersMap = new Map<string, Order>();

  localOrders.forEach(o => remoteOrdersMap.set(o.id, o));

  if (!userId && !userEmail && !userPhone) {
    return Array.from(remoteOrdersMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  try {
    let orderDocs: any[] = [];

    if (userId) {
      const q = query(collection(db, 'orders'), where('userId', '==', userId));
      const snap = await getDocs(q);
      snap.forEach(d => orderDocs.push(d.data() as Order));
    } else if (userEmail) {
      const q = query(collection(db, 'orders'), where('userEmail', '==', userEmail));
      const snap = await getDocs(q);
      snap.forEach(d => orderDocs.push(d.data() as Order));
    }

    if (userPhone) {
      const qPhone = query(collection(db, 'orders'), where('customerDetails.phone', '==', userPhone));
      const snapPhone = await getDocs(qPhone);
      snapPhone.forEach(d => orderDocs.push(d.data() as Order));
    }

    orderDocs.forEach(o => {
      remoteOrdersMap.set(o.id, o);
      saveLocalOrder(o);
    });
  } catch (err) {
    console.warn("Could not query firestore orders, using local cached orders:", err);
  }

  return Array.from(remoteOrdersMap.values()).sort((a, b) => b.createdAt - a.createdAt);
};

// Fetch single order details by id or orderNumber
export const fetchOrderById = async (orderId: string): Promise<Order | null> => {
  // Check local cache first
  const local = getLocalOrderById(orderId);
  
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    const snap = await getDoc(orderDocRef);
    if (snap.exists()) {
      const data = snap.data() as Order;
      saveLocalOrder(data);
      return data;
    }

    // Try finding by orderNumber query
    const q = query(collection(db, 'orders'), where('orderNumber', '==', orderId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const data = querySnap.docs[0].data() as Order;
      saveLocalOrder(data);
      return data;
    }
  } catch (err) {
    console.warn("Firestore fetch error, fallback to local:", err);
  }

  return local;
};
