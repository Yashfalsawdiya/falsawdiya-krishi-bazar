import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { CourierPartnerConfig } from '../types';
export type { CourierPartnerConfig };

const STORAGE_KEY = 'falsawdiya_courier_partners_cache';

export const SYSTEM_OWN_DELIVERY_PARTNER: CourierPartnerConfig = {
  id: 'own_delivery',
  name: 'फल्सावदिया कृषि बाजार (Own Delivery)',
  trackingUrl: '',
  isLocal: true,
  isDefault: true,
  isPermanent: true,
};

export const DEFAULT_COURIER_PARTNERS: CourierPartnerConfig[] = [
  SYSTEM_OWN_DELIVERY_PARTNER,
  {
    id: 'speed_post',
    name: 'Speed Post (इंडिया पोस्ट)',
    trackingUrl: 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
    isLocal: false,
    isDefault: true,
  },
  {
    id: 'delhivery',
    name: 'Delhivery',
    trackingUrl: 'https://www.delhivery.com/track/package/{trackingNumber}',
    isLocal: false,
    isDefault: true,
  },
  {
    id: 'dtdc',
    name: 'DTDC',
    trackingUrl: 'https://www.dtdc.in/tracking/shipment-tracking.asp?trackingNumber={trackingNumber}',
    isLocal: false,
    isDefault: true,
  },
  {
    id: 'bluedart',
    name: 'Blue Dart',
    trackingUrl: 'https://www.bluedart.com/tracking?track={trackingNumber}',
    isLocal: false,
    isDefault: true,
  },
];

/**
 * Normalizes courier partners list so that the store's own delivery
 * system 'फल्सावदिया कृषि बाजार (Own Delivery)' is ALWAYS guaranteed
 * to be saved and positioned at index 0 (first number per).
 */
export const normalizeCourierPartners = (list: CourierPartnerConfig[]): CourierPartnerConfig[] => {
  if (!Array.isArray(list) || list.length === 0) {
    return DEFAULT_COURIER_PARTNERS;
  }

  // Filter out any legacy or duplicate own delivery entries
  const others = list.filter(
    (p) => p && p.id !== 'own_delivery' &&
           !p.name?.includes('लोकल डिलीवरी') &&
           !p.name?.includes('फल्सावदिया कृषि बाजार')
  );

  return [SYSTEM_OWN_DELIVERY_PARTNER, ...others];
};

export const getCachedCourierPartners = (): CourierPartnerConfig[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeCourierPartners(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to parse cached courier partners:', e);
  }
  return DEFAULT_COURIER_PARTNERS;
};

export const setCachedCourierPartners = (partners: CourierPartnerConfig[]) => {
  try {
    const normalized = normalizeCourierPartners(partners);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Failed to save courier partners in cache:', e);
  }
};

/**
 * Real-time listener for courier partners configuration.
 * Syncs Firestore settings/courier_partners with fallback to cached/default.
 */
export const listenCourierPartners = (
  callback: (partners: CourierPartnerConfig[]) => void
): (() => void) => {
  // Immediately call with cached
  callback(getCachedCourierPartners());

  try {
    const docRef = doc(db, 'settings', 'courier_partners');
    const unsub = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.partners) && data.partners.length > 0) {
            const normalized = normalizeCourierPartners(data.partners);
            setCachedCourierPartners(normalized);
            callback(normalized);
            return;
          }
        }
        // If not exists yet in Firestore, ensure default is returned
        callback(getCachedCourierPartners());
      },
      (error) => {
        console.warn('Courier partners Firestore listener fallback:', error);
        callback(getCachedCourierPartners());
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Firestore listen error for courier partners:', err);
    return () => {};
  }
};

/**
 * Save updated list of courier partners to Firestore & cache.
 */
export const saveCourierPartners = async (
  partners: CourierPartnerConfig[]
): Promise<void> => {
  setCachedCourierPartners(partners);
  try {
    const docRef = doc(db, 'settings', 'courier_partners');
    await setDoc(docRef, {
      partners,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not save courier partners to Firestore (saved locally):', err);
  }
};

/**
 * Add a new courier partner with name & official tracking URL.
 */
export const addCustomCourierPartner = async (
  partner: Omit<CourierPartnerConfig, 'id'>
): Promise<CourierPartnerConfig[]> => {
  const current = getCachedCourierPartners();
  const newPartner: CourierPartnerConfig = {
    ...partner,
    id: `courier_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: partner.name.trim(),
    trackingUrl: partner.trackingUrl ? partner.trackingUrl.trim() : '',
    isLocal: Boolean(partner.isLocal),
  };

  const updated = [...current, newPartner];
  await saveCourierPartners(updated);
  return updated;
};

/**
 * Update an existing courier partner (edit name, tracking URL, isLocal).
 */
export const updateCustomCourierPartner = async (
  updatedPartner: CourierPartnerConfig
): Promise<CourierPartnerConfig[]> => {
  const current = getCachedCourierPartners();
  const updated = current.map((p) => (p.id === updatedPartner.id ? {
    ...updatedPartner,
    name: updatedPartner.name.trim(),
    trackingUrl: updatedPartner.trackingUrl ? updatedPartner.trackingUrl.trim() : '',
    isLocal: Boolean(updatedPartner.isLocal),
  } : p));
  await saveCourierPartners(updated);
  return updated;
};

/**
 * Delete any courier partner by ID.
 * The store's permanent system delivery 'own_delivery' cannot be deleted.
 */
export const deleteCustomCourierPartner = async (
  partnerId: string
): Promise<CourierPartnerConfig[]> => {
  if (partnerId === 'own_delivery') {
    return getCachedCourierPartners();
  }
  const current = getCachedCourierPartners();
  const updated = current.filter((p) => p.id !== partnerId && p.id !== 'own_delivery');
  const final = normalizeCourierPartners(updated);
  setCachedCourierPartners(final);
  await saveCourierPartners(final);
  return final;
};

/**
 * Reset courier partners list to system defaults.
 */
export const resetDefaultCourierPartners = async (): Promise<CourierPartnerConfig[]> => {
  await saveCourierPartners(DEFAULT_COURIER_PARTNERS);
  return DEFAULT_COURIER_PARTNERS;
};

/**
 * Resolves the final destination tracking URL for a given order.
 * Replaces {trackingNumber} placeholder with real consignment number.
 */
export const resolveTrackingUrl = (
  courierPartnerName?: string,
  trackingNumber?: string,
  explicitTrackingUrl?: string,
  partnersList?: CourierPartnerConfig[]
): { url: string; isLocal: boolean; displayName: string } => {
  const name = (courierPartnerName || '').trim();
  const trackNo = (trackingNumber || '').trim();

  // 1. Detect if it's local / own delivery
  const isLocalName = 
    name.toLowerCase().includes('लोकल') || 
    name.toLowerCase().includes('own delivery') || 
    name.toLowerCase().includes('लोकल डिलीवरी') ||
    name.toLowerCase().includes('फल्सावदिया') ||
    name.toLowerCase().includes('store delivery');

  const partners = partnersList && partnersList.length > 0 ? partnersList : getCachedCourierPartners();
  const matchedPartner = partners.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );

  if (isLocalName || matchedPartner?.isLocal) {
    return {
      url: '',
      isLocal: true,
      displayName: name || 'फल्सावदिया कृषि बाजार (Own Delivery)',
    };
  }

  // 2. Determine raw URL template
  let rawUrl = explicitTrackingUrl || matchedPartner?.trackingUrl || '';

  // Fallback defaults based on known keywords if no URL attached
  if (!rawUrl) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('delhivery')) {
      rawUrl = 'https://www.delhivery.com/track/package/{trackingNumber}';
    } else if (lowerName.includes('dtdc')) {
      rawUrl = 'https://www.dtdc.in/tracking/shipment-tracking.asp?trackingNumber={trackingNumber}';
    } else if (lowerName.includes('blue dart') || lowerName.includes('bluedart')) {
      rawUrl = 'https://www.bluedart.com/tracking?track={trackingNumber}';
    } else {
      // Default to India Post
      rawUrl = 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
    }
  }

  // 3. Replace {trackingNumber} or {consignmentNumber} placeholder if present
  let resolvedUrl = rawUrl;
  if (trackNo && (resolvedUrl.includes('{trackingNumber}') || resolvedUrl.includes('{consignmentNumber}'))) {
    resolvedUrl = resolvedUrl
      .replace(/{trackingNumber}/g, encodeURIComponent(trackNo))
      .replace(/{consignmentNumber}/g, encodeURIComponent(trackNo));
  }

  return {
    url: resolvedUrl,
    isLocal: false,
    displayName: name || 'Speed Post (इंडिया पोस्ट)',
  };
};
