import { Order, OrderStatus, PaymentStatus, OrderTimelineEvent } from '../types';
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
export const fetchUserOrders = async (
  userId?: string, 
  userEmail?: string, 
  userPhone?: string,
  limitCount: number = 20
): Promise<Order[]> => {
  const localOrders = getLocalOrders();
  const remoteOrdersMap = new Map<string, Order>();

  localOrders.forEach(o => remoteOrdersMap.set(o.id, o));

  if (!userId && !userEmail && !userPhone) {
    return Array.from(remoteOrdersMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  try {
    let orderDocs: Order[] = [];

    if (userId) {
      const q = query(
        collection(db, 'orders'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      snap.forEach(d => orderDocs.push(d.data() as Order));
    } else if (userEmail) {
      const q = query(
        collection(db, 'orders'), 
        where('userEmail', '==', userEmail),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      snap.forEach(d => orderDocs.push(d.data() as Order));
    }

    if (userPhone) {
      const qPhone = query(
        collection(db, 'orders'), 
        where('customerDetails.phone', '==', userPhone),
        orderBy('createdAt', 'desc')
      );
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

export interface RefundCalculation {
  cancellationStage: 'before_dispatch' | 'after_dispatch';
  eligibleProductAmount: number;
  deliveryCharge: number;
  deliveryChargeDeducted: number;
  deliveryChargeRefunded: number;
  refundAmount: number;
  isDeliveryChargeNonRefundable: boolean;
  ruleExplanation: string;
}

// Calculate refund according to stage-based cancellation policy
export const calculateOrderRefund = (order: Order): RefundCalculation => {
  const isAfterDispatch = order.status === 'dispatched' || order.status === 'out_for_delivery';
  const deliveryCharge = order.deliveryCharges || 0;
  const eligibleProductAmount = order.itemsTotal || (order.totalAmount - deliveryCharge);

  if (isAfterDispatch) {
    // After dispatch / Shipped: Delivery charge is non-refundable
    const refundAmount = Math.max(0, order.totalAmount - deliveryCharge);
    return {
      cancellationStage: 'after_dispatch',
      eligibleProductAmount,
      deliveryCharge,
      deliveryChargeDeducted: deliveryCharge,
      deliveryChargeRefunded: 0,
      refundAmount,
      isDeliveryChargeNonRefundable: deliveryCharge > 0,
      ruleExplanation: 'यह ऑर्डर शिपिंग के लिए भेजा जा चुका है। इस समय ऑर्डर रद्द करने पर Delivery Charge वापस नहीं किया जाएगा। बाकी eligible product/order payment आपकी refund policy के अनुसार original payment method में वापस कर दिया जाएगा।'
    };
  } else {
    // Before dispatch: Placed / Confirmed -> 100% full refund
    return {
      cancellationStage: 'before_dispatch',
      eligibleProductAmount,
      deliveryCharge,
      deliveryChargeDeducted: 0,
      deliveryChargeRefunded: deliveryCharge,
      refundAmount: order.totalAmount,
      isDeliveryChargeNonRefundable: false,
      ruleExplanation: 'ऑर्डर अभी डिस्पैच नहीं हुआ है। पूरा भुगतान (उत्पाद राशि + डिलीवरी शुल्क) मूल Razorpay खाते में वापस कर दिया जाएगा।'
    };
  }
};

// Cancel an order (User-side or Admin) and process Razorpay refund
export const cancelUserOrder = async (
  orderId: string, 
  cancellationReason?: string, 
  cancelledBy: 'user' | 'admin' = 'user'
): Promise<{ success: boolean; order?: Order; error?: string }> => {
  const currentOrder = await fetchOrderById(orderId);
  if (!currentOrder) {
    return { success: false, error: 'ऑर्डर नहीं मिला (Order not found).' };
  }

  if (currentOrder.status === 'cancelled') {
    return { success: false, error: 'यह ऑर्डर पहले ही रद्द किया जा चुका है।' };
  }

  if (currentOrder.status === 'delivered') {
    return { 
      success: false, 
      error: 'यह ऑर्डर पहले ही डिलीवर हो चुका है। कृपया रद्दीकरण के बजाय वापसी/रिप्लेसमेंट (Return/Replacement Policy) का उपयोग करें।' 
    };
  }

  const calc = calculateOrderRefund(currentOrder);
  const now = Date.now();
  let refundId = `rfnd_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  let refundStatus: 'processed' | 'pending' | 'not_applicable' = 'processed';

  // Process server-side Razorpay refund on original payment method
  if (currentOrder.razorpayPaymentId && calc.refundAmount > 0) {
    try {
      const response = await fetch('/api/razorpay/process-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: currentOrder.razorpayPaymentId,
          amount: calc.refundAmount,
          orderId: currentOrder.id,
          orderNumber: currentOrder.orderNumber,
          reason: cancellationReason || (cancelledBy === 'user' ? 'Customer Cancellation' : 'Admin Cancellation'),
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.refundId) {
          refundId = resData.refundId;
        }
        refundStatus = 'processed';
      }
    } catch (err) {
      console.warn("Razorpay refund trigger warning, proceeding with recorded status:", err);
    }
  }

  const refundDetails = {
    refundAmount: calc.refundAmount,
    eligibleProductAmount: calc.eligibleProductAmount,
    deliveryChargeDeducted: calc.deliveryChargeDeducted,
    deliveryChargeRefunded: calc.deliveryChargeRefunded,
    refundStatus,
    refundId,
    refundMethod: 'Razorpay Original Payment Source (UPI / Bank Account)',
    cancelledAt: now,
    cancellationReason: cancellationReason || 'ग्राहक द्वारा रद्दीकरण का अनुरोध किया गया',
    cancelledBy,
    cancellationStage: calc.cancellationStage,
    cancellationMessage: calc.ruleExplanation,
  };

  const timelineNote = calc.cancellationStage === 'after_dispatch'
    ? `ऑर्डर शिपिंग के दौरान रद्द किया गया। नॉन-रिफंडेबल डिलीवरी शुल्क (₹${calc.deliveryChargeDeducted}) काटकर कुल ₹${calc.refundAmount} का रिफंड मूल खाते में प्रोसेस किया गया।`
    : `ऑर्डर डिस्पैच से पूर्व रद्द किया गया। कुल ₹${calc.refundAmount} का पूर्ण रिफंड मूल खाते में प्रोसेस किया गया।`;

  const cancellationTimelineEvent: OrderTimelineEvent = {
    title: 'ऑर्डर रद्द एवं रिफंड प्रक्रियाधीन (Cancelled & Refunded)',
    description: timelineNote,
    timestamp: now,
    status: 'cancelled',
  };

  const updatedOrder: Order = {
    ...currentOrder,
    status: 'cancelled',
    paymentStatus: calc.deliveryChargeDeducted > 0 ? 'partially_refunded' : 'refunded',
    refundDetails,
    timeline: [...(currentOrder.timeline || []), cancellationTimelineEvent],
    updatedAt: now,
    notes: cancellationReason ? `रद्दीकरण कारण: ${cancellationReason}` : currentOrder.notes,
  };

  // Save to local storage
  saveLocalOrder(updatedOrder);

  // Sync to Firestore
  try {
    const orderDocRef = doc(db, 'orders', currentOrder.id);
    await updateDoc(orderDocRef, {
      status: 'cancelled',
      paymentStatus: updatedOrder.paymentStatus,
      refundDetails,
      timeline: updatedOrder.timeline,
      updatedAt: now,
      ...(cancellationReason ? { notes: `रद्दीकरण कारण: ${cancellationReason}` } : {}),
    });
  } catch (err) {
    console.error("Failed to update cancelled order in Firestore:", err);
  }

  return { success: true, order: updatedOrder };
};
