import { ShippingQuoteResponse, ShiprocketPublicConfig, ShiprocketAdminSettings, Order } from '../types';

/**
 * Calculate Shipping Quote from server
 * (Queries live Shiprocket API or calibrated reliable Surface weight slabs)
 */
export async function calculateShippingQuote(params: {
  pincode: string;
  weightKg: number;
  cartTotal: number;
  isStorePickup?: boolean;
}): Promise<ShippingQuoteResponse> {
  const cleanPin = (params.pincode || '').trim().replace(/\D/g, '');
  if (cleanPin.length !== 6) {
    return {
      success: false,
      serviceable: false,
      shippingCharge: 0,
      courierName: 'एक्सप्रेस कूरियर डिलीवरी',
      estimatedDays: '2 से 4 कार्यदिवस',
      error: 'कृपया सही 6 अंकों का पिन कोड दर्ज करें।',
    };
  }

  try {
    const res = await fetch('/api/shipping/calculate-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pincode: cleanPin,
        weightKg: Math.max(0.2, params.weightKg || 1),
        cartTotal: params.cartTotal || 0,
        isStorePickup: Boolean(params.isStorePickup),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'दर प्राप्त करने में त्रुटि');
    }

    const data: ShippingQuoteResponse = await res.json();
    return data;
  } catch (err: any) {
    // Client-side fallback if server endpoint is unreachable
    console.warn('Shipping quote fetch error, using client fallback:', err.message);

    const isShamgarh = cleanPin === '458883';
    const isFree = (params.cartTotal || 0) >= 1999;

    if (params.isStorePickup) {
      return {
        success: true,
        serviceable: true,
        isStorePickup: true,
        shippingCharge: 0,
        isFreeDelivery: true,
        courierName: 'दुकान से स्वयं पिकअप (Store Pickup - Shamgarh)',
        estimatedDays: 'तुरंत (दुकान खुलने पर)',
        pickupAddress: 'डिंपल चौराहा, शामगढ़ (458883)',
      };
    }

    if (isShamgarh) {
      return {
        success: true,
        serviceable: true,
        zone: 'लोकल शामगढ़',
        courierName: 'फल्सावदिया कृषि बाजार (लोकल एक्सप्रेस डिलीवरी)',
        shippingCharge: isFree ? 0 : 20,
        isFreeDelivery: isFree,
        estimatedDays: 'आज ही या अगले 24 घंटे में',
        isStorePickupAvailable: true,
      };
    }

    // Default Surface Courier rate
    const weight = Math.max(0.5, params.weightKg || 1);
    const extraKg = Math.max(0, Math.ceil(weight - 1));
    const isMp = cleanPin.startsWith('45') || cleanPin.startsWith('46') || cleanPin.startsWith('47') || cleanPin.startsWith('48');
    const base = isMp ? 50 : 70;
    const extra = isMp ? 25 : 35;
    const calc = base + extraKg * extra;

    return {
      success: true,
      serviceable: true,
      zone: isMp ? 'मध्यप्रदेश (Intra-State)' : 'ऑल इंडिया कूरियर',
      courierName: 'Speed Post / Surface Express (Delhivery/DTDC/India Post)',
      shippingCharge: isFree ? 0 : calc,
      standardCharge: calc,
      isFreeDelivery: isFree,
      estimatedDays: isMp ? '1 से 3 कार्यदिवस' : '2 से 5 कार्यदिवस',
    };
  }
}

/**
 * Fetch Public Shipping Configuration
 */
export async function fetchShippingPublicConfig(): Promise<ShiprocketPublicConfig | null> {
  try {
    const res = await fetch('/api/shipping/config');
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch Admin Shiprocket Settings
 */
export async function fetchShiprocketAdminSettings(): Promise<ShiprocketAdminSettings | null> {
  try {
    const res = await fetch('/api/shipping/admin/settings');
    if (!res.ok) return null;
    const data = await res.json();
    return data.config || null;
  } catch (e) {
    console.error('Failed to fetch shiprocket admin settings:', e);
    return null;
  }
}

/**
 * Save Admin Shiprocket Settings
 */
export async function saveShiprocketAdminSettings(
  settings: Partial<ShiprocketAdminSettings> & { password?: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/shipping/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'सेटिंग्स सुरक्षित करने में विफलता।' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'नेटवर्क समस्या।' };
  }
}

/**
 * Test Shiprocket Credentials Connection
 */
export async function testShiprocketConnection(creds: { email: string; password?: string }): Promise<{
  success: boolean;
  message: string;
  account?: any;
}> {
  try {
    const res = await fetch('/api/shipping/admin/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || 'Shiprocket से कनेक्ट नहीं हो सका।',
      };
    }
    return {
      success: true,
      message: data.message,
      account: data.account,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'परीक्षण के दौरान नेटवर्क त्रुटि।',
    };
  }
}

/**
 * Create Shipment in Shiprocket for an Order
 */
export async function createShipmentForOrder(order: Order): Promise<{
  success: boolean;
  message?: string;
  shipment?: {
    shiprocketOrderId: number;
    shipmentId: number;
    awbCode: string;
    courierName: string;
    labelUrl: string;
    trackingUrl: string;
  };
  error?: string;
}> {
  try {
    const res = await fetch('/api/shipping/admin/create-shipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'शिपमेंट जनरेट करने में विफलता।' };
    }
    return {
      success: true,
      message: data.message,
      shipment: data.shipment,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'नेटवर्क त्रुटि।' };
  }
}

/**
 * Track Shipment using AWB Code
 */
export async function trackShipment(awb: string): Promise<any> {
  try {
    const res = await fetch(`/api/shipping/track/${encodeURIComponent(awb)}`);
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
