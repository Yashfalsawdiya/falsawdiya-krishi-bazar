import { CourierPartnerConfig } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const COURIER_PARTNERS_CACHE_KEY = 'fkb_courier_partners_cache';

export const DEFAULT_COURIER_PARTNERS: CourierPartnerConfig[] = [
  {
    id: 'speed_post',
    name: 'Speed Post (इंडिया पोस्ट)',
    trackingUrl: 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
    isDefault: true,
    notes: 'भारतीय डाक आधिकारिक स्पीड पोस्ट ट्रैकिंग पोर्टल'
  },
  {
    id: 'delhivery',
    name: 'Delhivery',
    trackingUrl: 'https://www.delhivery.com/track/package/{trackingNumber}',
    isDefault: false,
    notes: 'डेल्हीवरी एक्सप्रेस लॉजिस्टिक्स पोर्टल'
  },
  {
    id: 'dtdc',
    name: 'DTDC',
    trackingUrl: 'https://www.dtdc.in/tracking.asp',
    isDefault: false,
    notes: 'डीटीडीसी कूरियर आधिकारिक ट्रैकिंग'
  },
  {
    id: 'blue_dart',
    name: 'Blue Dart',
    trackingUrl: 'https://www.bluedart.com/tracking',
    isDefault: false,
    notes: 'ब्लू डार्ट एक्सप्रेस ट्रैकिंग पोर्टल'
  },
  {
    id: 'ekart',
    name: 'Ekart Logistics',
    trackingUrl: 'https://ekartlogistics.com/shipmenttrack/{trackingNumber}',
    isDefault: false,
    notes: 'ई-कार्ट एक्सप्रेस ट्रैकिंग पोर्टल'
  },
  {
    id: 'shadowfax',
    name: 'Shadowfax',
    trackingUrl: 'https://tracker.shadowfax.in/',
    isDefault: false,
    notes: 'शैडोफैक्स कूरियर ट्रैकिंग'
  },
  {
    id: 'xpressbees',
    name: 'Xpressbees',
    trackingUrl: 'https://www.xpressbees.com/shipment/tracking',
    isDefault: false,
    notes: 'एक्सप्रेसबीज कूरियर ट्रैकिंग'
  },
  {
    id: 'own_delivery',
    name: 'लोकल डिलीवरी (Own Delivery)',
    trackingUrl: '',
    isDefault: false,
    notes: 'दुकान की अपनी डिलीवरी / लोकल डिलीवरी बॉय'
  }
];

/**
 * Get cached courier partners immediately (Zero latency)
 */
export const getCachedCourierPartners = (): CourierPartnerConfig[] => {
  try {
    const raw = localStorage.getItem(COURIER_PARTNERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading cached courier partners:', err);
  }
  return DEFAULT_COURIER_PARTNERS;
};

/**
 * Save courier partners to local cache
 */
export const setCachedCourierPartners = (partners: CourierPartnerConfig[]) => {
  try {
    localStorage.setItem(COURIER_PARTNERS_CACHE_KEY, JSON.stringify(partners));
  } catch (err) {
    console.warn('Error caching courier partners:', err);
  }
};

/**
 * Fetch courier partners with Stale-While-Revalidate pattern:
 * Returns cached list immediately, then updates from Firestore
 */
export const fetchCourierPartners = async (): Promise<CourierPartnerConfig[]> => {
  const cached = getCachedCourierPartners();

  try {
    const docRef = doc(db, 'settings', 'courier_partners');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.partners) && data.partners.length > 0) {
        setCachedCourierPartners(data.partners);
        return data.partners;
      }
    }
  } catch (err) {
    console.warn('Could not sync courier partners from Firestore, using local cache:', err);
  }

  return cached;
};

/**
 * Save / Update full courier partners list in Firestore and cache
 */
export const saveAllCourierPartners = async (partners: CourierPartnerConfig[]): Promise<boolean> => {
  try {
    setCachedCourierPartners(partners);

    const docRef = doc(db, 'settings', 'courier_partners');
    await setDoc(docRef, {
      partners,
      updatedAt: Date.now()
    }, { merge: true });

    return true;
  } catch (err) {
    console.error('Failed to save courier partners to Firestore:', err);
    // Still saved to local cache
    return false;
  }
};

/**
 * Add or update a single courier partner
 */
export const saveCourierPartner = async (partner: CourierPartnerConfig): Promise<CourierPartnerConfig[]> => {
  const current = getCachedCourierPartners();
  const existingIdx = current.findIndex(p => p.id === partner.id || p.name.trim().toLowerCase() === partner.name.trim().toLowerCase());

  let updated: CourierPartnerConfig[];
  const partnerToSave: CourierPartnerConfig = {
    ...partner,
    updatedAt: Date.now()
  };

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...partnerToSave
    };
  } else {
    updated = [...current, { ...partnerToSave, createdAt: Date.now() }];
  }

  await saveAllCourierPartners(updated);
  return updated;
};

/**
 * Delete a courier partner
 */
export const deleteCourierPartner = async (id: string): Promise<CourierPartnerConfig[]> => {
  const current = getCachedCourierPartners();
  const updated = current.filter(p => p.id !== id);
  await saveAllCourierPartners(updated);
  return updated;
};

/**
 * Intelligent Courier Tracking URL Resolver:
 * Replaces placeholders like {trackingNumber} or {consignment} or appends clean tracking URL.
 */
export const resolveCourierTrackingUrl = (
  trackingNumber: string,
  courierName?: string,
  customTrackingUrl?: string,
  customPartners?: CourierPartnerConfig[]
): string => {
  const cleanTrackNo = (trackingNumber || '').trim();
  const partners = customPartners && customPartners.length > 0 ? customPartners : getCachedCourierPartners();

  // 1. If customTrackingUrl is explicitly provided on the order
  if (customTrackingUrl && customTrackingUrl.trim().startsWith('http')) {
    let url = customTrackingUrl.trim();
    if (url.includes('{trackingNumber}')) {
      return url.replace('{trackingNumber}', encodeURIComponent(cleanTrackNo));
    }
    if (url.includes('{tracking_no}')) {
      return url.replace('{tracking_no}', encodeURIComponent(cleanTrackNo));
    }
    if (url.includes('{consignment}')) {
      return url.replace('{consignment}', encodeURIComponent(cleanTrackNo));
    }
    return url;
  }

  // 2. Match with configured partner by name
  if (courierName) {
    const lowerName = courierName.trim().toLowerCase();
    const matched = partners.find(p => 
      p.name.trim().toLowerCase() === lowerName ||
      lowerName.includes(p.name.trim().toLowerCase()) ||
      p.name.trim().toLowerCase().includes(lowerName)
    );

    if (matched && matched.trackingUrl && matched.trackingUrl.trim().startsWith('http')) {
      let url = matched.trackingUrl.trim();
      if (url.includes('{trackingNumber}')) {
        return url.replace('{trackingNumber}', encodeURIComponent(cleanTrackNo));
      }
      if (url.includes('{tracking_no}')) {
        return url.replace('{tracking_no}', encodeURIComponent(cleanTrackNo));
      }
      if (url.includes('{consignment}')) {
        return url.replace('{consignment}', encodeURIComponent(cleanTrackNo));
      }
      return url;
    }

    // Keyword heuristics if not matched in custom partner list
    if (lowerName.includes('delhivery')) {
      return `https://www.delhivery.com/track/package/${encodeURIComponent(cleanTrackNo)}`;
    }
    if (lowerName.includes('dtdc')) {
      return 'https://www.dtdc.in/tracking.asp';
    }
    if (lowerName.includes('blue dart') || lowerName.includes('bluedart')) {
      return 'https://www.bluedart.com/tracking';
    }
    if (lowerName.includes('ekart')) {
      return `https://ekartlogistics.com/shipmenttrack/${encodeURIComponent(cleanTrackNo)}`;
    }
    if (lowerName.includes('shadowfax')) {
      return 'https://tracker.shadowfax.in/';
    }
    if (lowerName.includes('xpressbees')) {
      return 'https://www.xpressbees.com/shipment/tracking';
    }
  }

  // 3. Default India Post Speed Post portal
  return 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
};
