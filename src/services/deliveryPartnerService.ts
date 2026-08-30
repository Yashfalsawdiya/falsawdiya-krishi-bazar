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
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { DeliveryPartner, DeliveryPartnerAvailability, Order, OrderStatus, PartnerAssignmentStatus } from '../types';
import { getLocalOrders, saveLocalOrder, fetchOrderById } from './orderService';

const LOCAL_PARTNERS_KEY = 'falsawdiya_delivery_partners_cache';

// Seed default initial demo partners for instant out-of-the-box readiness
const DEFAULT_SEED_PARTNERS: DeliveryPartner[] = [
  {
    id: 'dp_demo_1',
    name: 'रमेश कुमार (डिलीवरी पार्टनर)',
    phone: '9826012345',
    email: 'ramesh.delivery@gmail.com',
    vehicleType: 'bike',
    vehicleTypeName: 'बाइक / मोटरसाइकिल (Bike)',
    vehicleNumber: 'MP-09-AB-1234',
    isActive: true,
    availabilityStatus: 'available',
    assignedOrdersCount: 0,
    completedDeliveriesCount: 24,
    address: 'ग्राम फल्सावदिया, देवास (म.प्र.)',
    joinedAt: Date.now() - 30 * 86400000,
    createdAt: Date.now() - 30 * 86400000,
    updatedAt: Date.now(),
  },
  {
    id: 'dp_demo_2',
    name: 'सोनू वर्मा (पिकअप ड्राइवर)',
    phone: '9826054321',
    email: 'sonu.driver@gmail.com',
    vehicleType: 'pickup',
    vehicleTypeName: 'पिकअप / छोटा हाथी (Pickup)',
    vehicleNumber: 'MP-09-CD-5678',
    isActive: true,
    availabilityStatus: 'available',
    assignedOrdersCount: 0,
    completedDeliveriesCount: 42,
    address: 'तहसील टोंकखुर्द, देवास (म.प्र.)',
    joinedAt: Date.now() - 60 * 86400000,
    createdAt: Date.now() - 60 * 86400000,
    updatedAt: Date.now(),
  }
];

// Helper to save partners locally
export const saveLocalPartners = (partners: DeliveryPartner[]) => {
  try {
    localStorage.setItem(LOCAL_PARTNERS_KEY, JSON.stringify(partners));
  } catch (e) {
    console.error("Failed to cache delivery partners locally:", e);
  }
};

// Helper to get local partners
export const getLocalPartners = (): DeliveryPartner[] => {
  try {
    const stored = localStorage.getItem(LOCAL_PARTNERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read cached delivery partners:", e);
  }
  return DEFAULT_SEED_PARTNERS;
};

// Fetch all delivery partners
export const fetchDeliveryPartners = async (): Promise<DeliveryPartner[]> => {
  const local = getLocalPartners();
  try {
    const q = query(collection(db, 'deliveryPartners'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const remoteList: DeliveryPartner[] = [];
      snap.forEach(d => {
        remoteList.push(d.data() as DeliveryPartner);
      });
      saveLocalPartners(remoteList);
      return remoteList;
    } else {
      // If collection is empty, seed initial partners to firestore
      for (const p of DEFAULT_SEED_PARTNERS) {
        try {
          await setDoc(doc(db, 'deliveryPartners', p.id), p);
        } catch (e) {
          // ignore seeding write error
        }
      }
      return DEFAULT_SEED_PARTNERS;
    }
  } catch (err) {
    console.warn("Using local cached delivery partners:", err);
    return local;
  }
};

// Real-time listener for delivery partners
export const listenDeliveryPartners = (callback: (partners: DeliveryPartner[]) => void): Unsubscribe => {
  const local = getLocalPartners();
  callback(local);

  try {
    const q = query(collection(db, 'deliveryPartners'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: DeliveryPartner[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as DeliveryPartner);
      });
      if (list.length > 0) {
        saveLocalPartners(list);
        callback(list);
      } else {
        callback(local);
      }
    }, (err) => {
      console.warn("Delivery partners listener snapshot note:", err);
      callback(local);
    });
  } catch (e) {
    console.warn("Failed to attach delivery partners listener:", e);
    return () => {};
  }
};

// Add new delivery partner
export const addDeliveryPartner = async (partnerData: Omit<DeliveryPartner, 'id' | 'createdAt' | 'updatedAt' | 'assignedOrdersCount' | 'completedDeliveriesCount' | 'joinedAt'> & { id?: string }): Promise<DeliveryPartner> => {
  const id = partnerData.id || `dp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = Date.now();

  const newPartner: DeliveryPartner = {
    ...partnerData,
    id,
    phone: partnerData.phone.replace(/\D/g, ''),
    email: partnerData.email.trim().toLowerCase(),
    isActive: partnerData.isActive ?? true,
    availabilityStatus: partnerData.availabilityStatus || 'available',
    assignedOrdersCount: 0,
    completedDeliveriesCount: 0,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Local update first
  const current = getLocalPartners();
  const updated = [newPartner, ...current.filter(p => p.id !== id)];
  saveLocalPartners(updated);

  // Firestore write
  try {
    await setDoc(doc(db, 'deliveryPartners', id), newPartner);
  } catch (err) {
    console.error("Firestore partner save error:", err);
  }

  return newPartner;
};

// Update delivery partner
export const updateDeliveryPartner = async (partner: DeliveryPartner): Promise<void> => {
  const updated: DeliveryPartner = {
    ...partner,
    phone: partner.phone.replace(/\D/g, ''),
    email: partner.email.trim().toLowerCase(),
    updatedAt: Date.now(),
  };

  // Local update
  const current = getLocalPartners();
  const list = current.map(p => p.id === updated.id ? updated : p);
  saveLocalPartners(list);

  // Firestore update
  try {
    const docRef = doc(db, 'deliveryPartners', updated.id);
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.error("Firestore partner update error:", err);
  }
};

// Toggle partner active/inactive
export const togglePartnerActiveStatus = async (partnerId: string, isActive: boolean): Promise<void> => {
  const current = getLocalPartners();
  const partner = current.find(p => p.id === partnerId);
  if (!partner) return;

  const updated: DeliveryPartner = {
    ...partner,
    isActive,
    updatedAt: Date.now(),
  };

  saveLocalPartners(current.map(p => p.id === partnerId ? updated : p));

  try {
    await updateDoc(doc(db, 'deliveryPartners', partnerId), {
      isActive,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error("Failed to toggle partner active status:", err);
  }
};

// Update partner live availability status
export const updatePartnerAvailability = async (partnerId: string, availabilityStatus: DeliveryPartnerAvailability): Promise<void> => {
  const current = getLocalPartners();
  const partner = current.find(p => p.id === partnerId);
  if (!partner) return;

  const updated: DeliveryPartner = {
    ...partner,
    availabilityStatus,
    updatedAt: Date.now(),
  };

  saveLocalPartners(current.map(p => p.id === partnerId ? updated : p));

  try {
    await updateDoc(doc(db, 'deliveryPartners', partnerId), {
      availabilityStatus,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error("Failed to update partner availability:", err);
  }
};

// Delete or archive delivery partner (with safety check)
export const deleteDeliveryPartner = async (partnerId: string): Promise<{ success: boolean; error?: string }> => {
  const localOrders = getLocalOrders();
  // Check if partner has any active in-transit / assigned orders
  const hasActiveDeliveries = localOrders.some(
    o => o.assignedPartnerId === partnerId && 
         ['assigned', 'accepted', 'picked_up', 'out_for_delivery'].includes(o.partnerAssignmentStatus || '') &&
         !['delivered', 'cancelled'].includes(o.status)
  );

  if (hasActiveDeliveries) {
    return {
      success: false,
      error: 'इस पार्टनर के पास अभी सक्रिय डिलीवरी (Active Orders) असाइन हैं। पहले उन ऑर्डर्स को दूसरे पार्टनर को रीअसाइन (Reassign) करें या पूरा करें।'
    };
  }

  // Remove locally
  const current = getLocalPartners();
  saveLocalPartners(current.filter(p => p.id !== partnerId));

  // Delete from Firestore
  try {
    await deleteDoc(doc(db, 'deliveryPartners', partnerId));
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete partner from Firestore:", err);
    return { success: true }; // Local deletion preserved
  }
};

// Check if a user (by email or phone) is a registered active delivery partner
export const findDeliveryPartnerByUser = (partners: DeliveryPartner[], email?: string | null, phone?: string | null): DeliveryPartner | null => {
  if (!partners || partners.length === 0) return null;
  
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

  return partners.find(p => {
    if (!p.isActive) return false;
    const matchEmail = cleanEmail && p.email && p.email.toLowerCase() === cleanEmail;
    const matchPhone = cleanPhone && p.phone && p.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10));
    return matchEmail || matchPhone;
  }) || null;
};

// Assign or Reassign order to Delivery Partner (Admin action)
export const assignOrderToDeliveryPartner = async (
  orderId: string, 
  partner: DeliveryPartner,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> => {
  const order = await fetchOrderById(orderId);
  if (!order) {
    return { success: false, error: 'ऑर्डर नहीं मिला।' };
  }

  const now = Date.now();
  const updatedTimeline = [
    ...(order.timeline || []),
    {
      title: 'डिलीवरी पार्टनर असाइन हुआ (Partner Assigned)',
      description: `यह ऑर्डर डिलीवरी हेतु ${partner.name} (${partner.vehicleTypeName || partner.vehicleType || 'वाहन'}) को सौंपा गया है। ${adminNote ? `नोट: ${adminNote}` : ''}`,
      timestamp: now,
      status: order.status,
    }
  ];

  const updatedOrder: Order = {
    ...order,
    assignedPartnerId: partner.id,
    assignedPartnerName: partner.name,
    assignedPartnerPhone: partner.phone,
    assignedPartnerEmail: partner.email,
    assignedVehicleType: partner.vehicleType,
    assignedVehicleNumber: partner.vehicleNumber,
    partnerAssignmentStatus: 'assigned',
    partnerAssignedAt: now,
    partnerStatusNote: adminNote || '',
    timeline: updatedTimeline,
    updatedAt: now,
  };

  // Update local order
  saveLocalOrder(updatedOrder);

  // Update Firestore order
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      assignedPartnerId: partner.id,
      assignedPartnerName: partner.name,
      assignedPartnerPhone: partner.phone,
      assignedPartnerEmail: partner.email,
      assignedVehicleType: partner.vehicleType,
      assignedVehicleNumber: partner.vehicleNumber || '',
      partnerAssignmentStatus: 'assigned',
      partnerAssignedAt: now,
      partnerStatusNote: adminNote || '',
      timeline: updatedTimeline,
      updatedAt: now,
    });
  } catch (err) {
    console.error("Failed to assign partner in Firestore:", err);
  }

  return { success: true };
};

// Partner response: Accept or Decline order
export const partnerRespondToOrder = async (
  orderId: string,
  partnerId: string,
  response: 'accept' | 'decline',
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  const order = await fetchOrderById(orderId);
  if (!order) return { success: false, error: 'ऑर्डर नहीं मिला।' };

  const now = Date.now();
  const isAccept = response === 'accept';
  const newPartnerStatus: PartnerAssignmentStatus = isAccept ? 'accepted' : 'declined';

  const timelineEvent = {
    title: isAccept ? 'पार्टनर ने डिलीवरी स्वीकार की (Accepted)' : 'पार्टनर उपलब्ध नहीं है (Declined)',
    description: isAccept 
      ? `डिलीवरी पार्टनर ${order.assignedPartnerName || 'पार्टनर'} ने ऑर्डर स्वीकार किया है और शीघ्र ही सामान पिकअप करेगा।` 
      : `डिलीवरी पार्टनर ने कारणवश डिलीवरी अस्वीकार की: ${reason || 'वर्तमान में उपलब्ध नहीं'}।`,
    timestamp: now,
    status: order.status,
  };

  const updatedTimeline = [...(order.timeline || []), timelineEvent];

  const updatedOrder: Order = {
    ...order,
    partnerAssignmentStatus: newPartnerStatus,
    partnerAcceptedAt: isAccept ? now : undefined,
    partnerDeclineReason: isAccept ? undefined : (reason || 'Not available'),
    timeline: updatedTimeline,
    updatedAt: now,
  };

  saveLocalOrder(updatedOrder);

  try {
    await updateDoc(doc(db, 'orders', orderId), {
      partnerAssignmentStatus: newPartnerStatus,
      ...(isAccept ? { partnerAcceptedAt: now } : { partnerDeclineReason: reason || 'Not available' }),
      timeline: updatedTimeline,
      updatedAt: now,
    });
  } catch (err) {
    console.error("Firestore partner response update error:", err);
  }

  return { success: true };
};

// Partner updates delivery progression: 'picked_up' | 'out_for_delivery' | 'delivered' | 'failed'
export const partnerUpdateDeliveryProgress = async (
  orderId: string,
  partnerId: string,
  progress: 'picked_up' | 'out_for_delivery' | 'delivered' | 'failed',
  note?: string,
  otp?: string
): Promise<{ success: boolean; error?: string }> => {
  const order = await fetchOrderById(orderId);
  if (!order) return { success: false, error: 'ऑर्डर नहीं मिला।' };

  const now = Date.now();
  let nextOrderStatus: OrderStatus = order.status;
  let eventTitle = '';
  let eventDesc = '';

  switch (progress) {
    case 'picked_up':
      nextOrderStatus = 'dispatched';
      eventTitle = 'सामान पिकअप हुआ (Parcel Picked Up)';
      eventDesc = `डिलीवरी पार्टनर ने वेयरहाउस/स्टोर से ऑर्डर उठा लिया है। ${note ? `(${note})` : ''}`;
      break;
    case 'out_for_delivery':
      nextOrderStatus = 'out_for_delivery';
      eventTitle = 'डिलीवरी के लिए रवाना (Out for Delivery)';
      eventDesc = `डिलीवरी पार्टनर आपके दिए गए पते पर सामान पहुँचाने निकल चुका है। ${note ? `(${note})` : ''}`;
      break;
    case 'delivered':
      nextOrderStatus = 'delivered';
      eventTitle = 'सफलतापूर्वक डिलीवर हुआ (Delivered)';
      eventDesc = `ऑर्डर किसान ग्राहक को सफलतापूर्वक सुपुर्द कर दिया गया है। ${otp ? `(OTP/पुष्टि: ${otp})` : ''} ${note ? `नोट: ${note}` : ''}`;
      break;
    case 'failed':
      eventTitle = 'डिलीवरी असफल (Delivery Attempt Failed)';
      eventDesc = `डिलीवरी पूर्ण नहीं हो सकी: ${note || 'ग्राहक उपलब्ध नहीं या पता अधूरा'}। पुनः प्रयास किया जाएगा।`;
      break;
  }

  const timelineEvent = {
    title: eventTitle,
    description: eventDesc,
    timestamp: now,
    status: nextOrderStatus,
  };

  const updatedTimeline = [...(order.timeline || []), timelineEvent];

  const updatedOrder: Order = {
    ...order,
    status: nextOrderStatus,
    partnerAssignmentStatus: progress,
    partnerStatusNote: note || '',
    ...(otp ? { deliveryProofOtp: otp } : {}),
    ...(progress === 'delivered' ? {
      deliveryOtpVerifiedAt: now,
      deliveryOtpVerifiedBy: partnerId,
      deliveryOtpNote: note || '',
    } : {}),
    timeline: updatedTimeline,
    updatedAt: now,
  };

  saveLocalOrder(updatedOrder);

  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: nextOrderStatus,
      partnerAssignmentStatus: progress,
      partnerStatusNote: note || '',
      ...(otp ? { deliveryProofOtp: otp } : {}),
      ...(progress === 'delivered' ? {
        deliveryOtpVerifiedAt: now,
        deliveryOtpVerifiedBy: partnerId,
        deliveryOtpNote: note || '',
      } : {}),
      timeline: updatedTimeline,
      updatedAt: now,
    });
  } catch (err) {
    console.error("Firestore partner progress update error:", err);
  }

  return { success: true };
};

// Fetch orders assigned to a partner
export const fetchOrdersForDeliveryPartner = async (
  partner: DeliveryPartner
): Promise<Order[]> => {
  const localOrders = getLocalOrders();
  const cleanEmail = partner.email ? partner.email.trim().toLowerCase() : '';
  const cleanPhone = partner.phone ? partner.phone.replace(/\D/g, '') : '';

  // Local filter
  const localMatches = localOrders.filter(o => 
    o.assignedPartnerId === partner.id || 
    (cleanEmail && o.assignedPartnerEmail?.toLowerCase() === cleanEmail) ||
    (cleanPhone && o.assignedPartnerPhone?.replace(/\D/g, '') === cleanPhone)
  );

  const resultMap = new Map<string, Order>();
  localMatches.forEach(o => resultMap.set(o.id, o));

  try {
    // Firestore query by partnerId
    const q1 = query(
      collection(db, 'orders'), 
      where('assignedPartnerId', '==', partner.id),
      orderBy('createdAt', 'desc')
    );
    const snap1 = await getDocs(q1);
    snap1.forEach(d => {
      const ord = d.data() as Order;
      resultMap.set(ord.id, ord);
      saveLocalOrder(ord);
    });

    if (cleanEmail) {
      const q2 = query(
        collection(db, 'orders'), 
        where('assignedPartnerEmail', '==', cleanEmail),
        orderBy('createdAt', 'desc')
      );
      const snap2 = await getDocs(q2);
      snap2.forEach(d => {
        const ord = d.data() as Order;
        resultMap.set(ord.id, ord);
        saveLocalOrder(ord);
      });
    }
  } catch (err) {
    console.warn("Firestore partner orders query fallback to local:", err);
  }

  return Array.from(resultMap.values()).sort((a, b) => b.createdAt - a.createdAt);
};

// Real-time listener for partner orders
export const listenOrdersForDeliveryPartner = (
  partner: DeliveryPartner,
  callback: (orders: Order[]) => void
): Unsubscribe => {
  const cleanEmail = partner.email ? partner.email.trim().toLowerCase() : '';
  const cleanPhone = partner.phone ? partner.phone.replace(/\D/g, '') : '';

  const getFilteredLocal = () => {
    return getLocalOrders().filter(o => 
      o.assignedPartnerId === partner.id || 
      (cleanEmail && o.assignedPartnerEmail?.toLowerCase() === cleanEmail) ||
      (cleanPhone && o.assignedPartnerPhone?.replace(/\D/g, '') === cleanPhone)
    ).sort((a, b) => b.createdAt - a.createdAt);
  };

  callback(getFilteredLocal());

  try {
    const q = query(
      collection(db, 'orders'), 
      where('assignedPartnerId', '==', partner.id),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach(d => {
        const ord = d.data() as Order;
        list.push(ord);
        saveLocalOrder(ord);
      });
      callback(list.length > 0 ? list : getFilteredLocal());
    }, (err) => {
      console.warn("Partner orders listener snapshot note:", err);
      callback(getFilteredLocal());
    });
  } catch (e) {
    console.warn("Failed to attach partner orders listener:", e);
    return () => {};
  }
};
