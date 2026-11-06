import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getRemoteFirestoreDoc, setRemoteFirestoreDoc } from './firestoreSync.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'shiprocket-config.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Ignored in read-only serverless environments
}

export interface ShiprocketServerConfig {
  enabled: boolean;
  mode: 'test' | 'live';
  email: string;
  password?: string;
  pickupLocation: string; // e.g. "Shamgarh Warehouse"
  pickupPincode: string;  // "458883"
  pickupCity: string;     // "Shamgarh"
  pickupState: string;    // "Madhya Pradesh"
  pickupAddress: string;  // "Dimple Chouraha, Near Khatik Manglik Bhawan, Shamgarh"
  pickupPhone: string;    // "918982338046"
  freeDeliveryThreshold: number; // e.g. 1999 (₹1999+ free delivery)
  baseWeightKg: number;   // 1 kg
  baseChargeMp: number;   // ₹50 for intra MP
  additionalPerKgMp: number; // ₹25
  baseChargeNeighbor: number; // ₹65 for neighbor states
  additionalPerKgNeighbor: number; // ₹30
  baseChargeRestOfIndia: number; // ₹80 for rest of India
  additionalPerKgRestOfIndia: number; // ₹40
  localShamgarhDeliveryCharge: number; // ₹20
  token?: string;
  tokenExpiresAt?: number;
  lastUpdated: number;
  lastTestResult?: {
    success: boolean;
    message: string;
    timestamp: number;
    email?: string;
    firstName?: string;
  };
}

const DEFAULT_SHIPROCKET_CONFIG: ShiprocketServerConfig = {
  enabled: true,
  mode: 'live',
  email: process.env.SHIPROCKET_EMAIL || '',
  password: process.env.SHIPROCKET_PASSWORD || '',
  pickupLocation: 'Falsawdiya Krishi Bazaar Shamgarh',
  pickupPincode: '458883',
  pickupCity: 'Shamgarh',
  pickupState: 'Madhya Pradesh',
  pickupAddress: 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर',
  pickupPhone: '918982338046',
  freeDeliveryThreshold: 1999,
  baseWeightKg: 1,
  baseChargeMp: 50,
  additionalPerKgMp: 25,
  baseChargeNeighbor: 65,
  additionalPerKgNeighbor: 30,
  baseChargeRestOfIndia: 80,
  additionalPerKgRestOfIndia: 40,
  localShamgarhDeliveryCharge: 20,
  lastUpdated: Date.now(),
};

let serverConfig: ShiprocketServerConfig = { ...DEFAULT_SHIPROCKET_CONFIG };

// Load config from local disk or Firestore
export async function loadShiprocketConfig(): Promise<ShiprocketServerConfig> {
  try {
    const remote = await getRemoteFirestoreDoc<ShiprocketServerConfig>('settings', 'shiprocket_config');
    if (remote && remote.lastUpdated) {
      serverConfig = {
        ...DEFAULT_SHIPROCKET_CONFIG,
        ...remote,
        // Keep environment variables as fallback if remote has empty credentials
        email: remote.email || process.env.SHIPROCKET_EMAIL || '',
        password: remote.password || process.env.SHIPROCKET_PASSWORD || '',
      };
      return serverConfig;
    }
  } catch (err) {
    console.warn('Could not read shiprocket config from Firestore, falling back to disk:', err);
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      serverConfig = {
        ...DEFAULT_SHIPROCKET_CONFIG,
        ...parsed,
        email: parsed.email || process.env.SHIPROCKET_EMAIL || '',
        password: parsed.password || process.env.SHIPROCKET_PASSWORD || '',
      };
      return serverConfig;
    }
  } catch {
    // Disk fallback failed
  }

  return serverConfig;
}

// Save config to disk and Firestore
export async function saveShiprocketConfig(cfg: ShiprocketServerConfig): Promise<void> {
  serverConfig = { ...cfg, lastUpdated: Date.now() };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(serverConfig, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write shiprocket config to disk:', err);
  }
  try {
    await setRemoteFirestoreDoc('settings', 'shiprocket_config', serverConfig);
  } catch (err) {
    console.warn('Could not write shiprocket config to Firestore:', err);
  }
}

// Initial load
loadShiprocketConfig().catch(() => {});

/**
 * Obtain Shiprocket Auth Token
 * Shiprocket tokens expire in 10 days. We cache them for 9 days.
 */
async function getShiprocketAuthToken(): Promise<string | null> {
  await loadShiprocketConfig();
  if (!serverConfig.email || !serverConfig.password) {
    return null;
  }

  // If we already have a valid unexpired token
  if (serverConfig.token && serverConfig.tokenExpiresAt && serverConfig.tokenExpiresAt > Date.now()) {
    return serverConfig.token;
  }

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: serverConfig.email.trim(),
        password: serverConfig.password.trim(),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Shiprocket auth failed:', res.status, errData);
      return null;
    }

    const data = await res.json();
    if (data.token) {
      serverConfig.token = data.token;
      // Expires in 9 days (9 * 24 * 60 * 60 * 1000)
      serverConfig.tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
      serverConfig.lastTestResult = {
        success: true,
        message: 'लॉगिन सफल (Connected to Shiprocket)',
        timestamp: Date.now(),
        email: data.email || serverConfig.email,
        firstName: data.first_name || 'Admin',
      };
      await saveShiprocketConfig(serverConfig);
      return data.token;
    }
  } catch (e: any) {
    console.error('Shiprocket auth request error:', e.message);
  }

  return null;
}

/**
 * Determine geographic shipping zone based on 6-digit Indian PIN Code
 * Madhya Pradesh: Starts with 45-48
 * Neighbor States:
 *   - Rajasthan: 30-34
 *   - Gujarat: 36-39
 *   - Maharashtra: 40-44
 *   - Uttar Pradesh: 20-28
 * Rest of India: All other valid pincodes
 */
function determinePincodeZone(pincode: string): 'shamgarh' | 'intra_mp' | 'neighbor_state' | 'rest_of_india' {
  const cleanPin = (pincode || '').trim().replace(/\D/g, '');
  if (cleanPin === '458883') return 'shamgarh';

  const prefix2 = parseInt(cleanPin.slice(0, 2), 10);
  if (isNaN(prefix2)) return 'rest_of_india';

  // MP: 45, 46, 47, 48
  if (prefix2 >= 45 && prefix2 <= 48) {
    return 'intra_mp';
  }

  // Neighboring States:
  // UP (20-28), RJ (30-34), GUJ (36-39), MH (40-44)
  if (
    (prefix2 >= 20 && prefix2 <= 28) ||
    (prefix2 >= 30 && prefix2 <= 34) ||
    (prefix2 >= 36 && prefix2 <= 39) ||
    (prefix2 >= 40 && prefix2 <= 44)
  ) {
    return 'neighbor_state';
  }

  return 'rest_of_india';
}

/**
 * Calculate fallback surface shipping rate using calibrated courier weight slabs
 */
function calculateFallbackCourierRate(pincode: string, weightKg: number, cartTotal: number) {
  const zone = determinePincodeZone(pincode);
  const cfg = serverConfig;

  // Free delivery threshold check
  const isFreeDeliveryEligible = cartTotal >= (cfg.freeDeliveryThreshold || 1999);

  if (zone === 'shamgarh') {
    return {
      serviceable: true,
      zone: 'लोकल शामगढ़ (Store Area)',
      courierName: 'फल्सावदिया कृषि बाजार (लोकल एक्सप्रेस डिलीवरी)',
      shippingCharge: isFreeDeliveryEligible ? 0 : (cfg.localShamgarhDeliveryCharge || 20),
      isFreeDelivery: isFreeDeliveryEligible,
      estimatedDays: 'आज ही या अगले 24 घंटे में',
      isStorePickupAvailable: true,
      pickupCharge: 0,
    };
  }

  let baseCharge = cfg.baseChargeMp;
  let perKgExtra = cfg.additionalPerKgMp;
  let zoneLabel = 'मध्यप्रदेश (Intra-State Surface)';
  let estimatedDays = '1 से 3 कार्यदिवस';

  if (zone === 'neighbor_state') {
    baseCharge = cfg.baseChargeNeighbor;
    perKgExtra = cfg.additionalPerKgNeighbor;
    zoneLabel = 'पड़ोसी राज्य (Rajasthan / Gujarat / Maharashtra / UP)';
    estimatedDays = '2 से 4 कार्यदिवस';
  } else if (zone === 'rest_of_india') {
    baseCharge = cfg.baseChargeRestOfIndia;
    perKgExtra = cfg.additionalPerKgRestOfIndia;
    zoneLabel = 'शेष भारत (All-India Surface Express)';
    estimatedDays = '3 से 6 कार्यदिवस';
  }

  // Calculate billable weight (minimum 0.5 kg, rounded up to 0.5 kg increments)
  const safeWeight = Math.max(0.5, weightKg || 1);
  const baseWeight = cfg.baseWeightKg || 1;

  let calculatedFee = baseCharge;
  if (safeWeight > baseWeight) {
    const extraKg = Math.ceil(safeWeight - baseWeight);
    calculatedFee += extraKg * perKgExtra;
  }

  const finalFee = isFreeDeliveryEligible ? 0 : calculatedFee;

  return {
    serviceable: true,
    zone: zoneLabel,
    courierName: 'Speed Post / Surface Express (Delhivery/DTDC/India Post)',
    shippingCharge: finalFee,
    standardCharge: calculatedFee,
    isFreeDelivery: isFreeDeliveryEligible,
    estimatedDays,
    isStorePickupAvailable: false,
    pickupCharge: 0,
  };
}

// ==========================================
// PUBLIC & CLIENT API HANDLERS
// ==========================================

/**
 * GET /api/shipping/config
 * Returns public shipping configuration
 */
export async function handleGetPublicShippingConfig(_req: Request, res: Response): Promise<void> {
  await loadShiprocketConfig();
  res.json({
    success: true,
    enabled: serverConfig.enabled,
    pickupPincode: serverConfig.pickupPincode,
    pickupCity: serverConfig.pickupCity,
    pickupState: serverConfig.pickupState,
    freeDeliveryThreshold: serverConfig.freeDeliveryThreshold,
    mode: serverConfig.mode,
    isShiprocketActive: Boolean(serverConfig.email && serverConfig.token),
  });
}

/**
 * POST /api/shipping/calculate-rate
 * Calculate shipping quote based on destination pincode, weight, and cart total
 */
export async function handleCalculateShippingRate(req: Request, res: Response): Promise<void> {
  try {
    const { pincode, deliveryPincode, weightKg = 1, cartTotal = 0, isStorePickup = false } = req.body;

    const rawPin = pincode || deliveryPincode || '';
    const cleanPin = String(rawPin).trim().replace(/\D/g, '');
    if (!cleanPin || cleanPin.length !== 6) {
      res.status(400).json({
        success: false,
        error: 'कृपया सही 6 अंकों का पिन कोड दर्ज करें।',
      });
      return;
    }

    const numWeight = Math.max(0.2, parseFloat(weightKg) || 1);
    const numCartTotal = Math.max(0, parseFloat(cartTotal) || 0);

    // If customer selected Store Pickup (available for anyone or specifically Shamgarh)
    if (isStorePickup) {
      res.json({
        success: true,
        serviceable: true,
        isStorePickup: true,
        shippingCharge: 0,
        isFreeDelivery: true,
        courierName: 'दुकान से स्वयं पिकअप (Store Pickup - Shamgarh)',
        estimatedDays: 'तुरंत (दुकान खुलने के समय)',
        pickupAddress: serverConfig.pickupAddress,
        pickupPincode: serverConfig.pickupPincode,
      });
      return;
    }

    // Try Shiprocket Serviceability API if configured
    let shiprocketRate: any = null;
    const token = await getShiprocketAuthToken();

    if (token && cleanPin !== '458883') {
      try {
        const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability?pickup_postcode=${serverConfig.pickupPincode}&delivery_postcode=${cleanPin}&weight=${numWeight}&cod=0`;
        const sRes = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (sRes.ok) {
          const data = await sRes.json();
          const companies = data?.data?.available_courier_companies;
          if (Array.isArray(companies) && companies.length > 0) {
            // Find best surface courier (cheapest or fastest surface provider)
            // Filter surface couriers if possible (safe for agriculture items)
            const surfaceCouriers = companies.filter((c: any) => 
              c.courier_name?.toLowerCase().includes('surface') || 
              c.is_surface || 
              !c.courier_name?.toLowerCase().includes('air')
            );
            const pool = surfaceCouriers.length > 0 ? surfaceCouriers : companies;
            pool.sort((a: any, b: any) => (a.rate || 0) - (b.rate || 0));

            const best = pool[0];
            const isFree = numCartTotal >= (serverConfig.freeDeliveryThreshold || 1999);
            const actualRate = Math.round(best.rate || 60);

            shiprocketRate = {
              serviceable: true,
              courierCompanyId: best.courier_company_id,
              courierName: best.courier_name || 'Shiprocket Surface Express',
              shippingCharge: isFree ? 0 : actualRate,
              standardCharge: actualRate,
              isFreeDelivery: isFree,
              estimatedDays: best.estimated_delivery_days ? `${best.estimated_delivery_days} कार्यदिवस` : '2 से 4 कार्यदिवस',
              etd: best.etd,
              source: 'shiprocket_live',
            };
          }
        }
      } catch (err: any) {
        console.warn('Shiprocket serviceability fetch failed, falling back:', err.message);
      }
    }

    // If Shiprocket gave a valid rate, return it!
    if (shiprocketRate) {
      res.json({
        success: true,
        ...shiprocketRate,
      });
      return;
    }

    // Reliable Calibrated Fallback (Zero downtime, guarantees checkout never breaks)
    const fallback = calculateFallbackCourierRate(cleanPin, numWeight, numCartTotal);
    res.json({
      success: true,
      ...fallback,
      source: 'calibrated_fallback',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'शिपिंग दर की गणना करने में समस्या आई।',
    });
  }
}

// ==========================================
// ADMIN API HANDLERS
// ==========================================

/**
 * GET /api/shipping/admin/settings
 */
export async function handleGetAdminShippingSettings(_req: Request, res: Response): Promise<void> {
  await loadShiprocketConfig();
  res.json({
    success: true,
    config: {
      enabled: serverConfig.enabled,
      mode: serverConfig.mode,
      email: serverConfig.email,
      hasPassword: Boolean(serverConfig.password),
      pickupLocation: serverConfig.pickupLocation,
      pickupPincode: serverConfig.pickupPincode,
      pickupCity: serverConfig.pickupCity,
      pickupState: serverConfig.pickupState,
      pickupAddress: serverConfig.pickupAddress,
      pickupPhone: serverConfig.pickupPhone,
      freeDeliveryThreshold: serverConfig.freeDeliveryThreshold,
      baseWeightKg: serverConfig.baseWeightKg,
      baseChargeMp: serverConfig.baseChargeMp,
      additionalPerKgMp: serverConfig.additionalPerKgMp,
      baseChargeNeighbor: serverConfig.baseChargeNeighbor,
      additionalPerKgNeighbor: serverConfig.additionalPerKgNeighbor,
      baseChargeRestOfIndia: serverConfig.baseChargeRestOfIndia,
      additionalPerKgRestOfIndia: serverConfig.additionalPerKgRestOfIndia,
      localShamgarhDeliveryCharge: serverConfig.localShamgarhDeliveryCharge,
      lastUpdated: serverConfig.lastUpdated,
      lastTestResult: serverConfig.lastTestResult,
      isTokenActive: Boolean(serverConfig.token && serverConfig.tokenExpiresAt && serverConfig.tokenExpiresAt > Date.now()),
    },
  });
}

/**
 * POST /api/shipping/admin/settings
 */
export async function handleSaveAdminShippingSettings(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    await loadShiprocketConfig();

    const updated: ShiprocketServerConfig = {
      ...serverConfig,
      enabled: body.enabled !== false,
      mode: body.mode === 'test' ? 'test' : 'live',
      email: (body.email !== undefined ? body.email : serverConfig.email).trim(),
      password: (body.password ? body.password : serverConfig.password).trim(),
      pickupLocation: body.pickupLocation || serverConfig.pickupLocation,
      pickupPincode: body.pickupPincode || serverConfig.pickupPincode,
      pickupCity: body.pickupCity || serverConfig.pickupCity,
      pickupState: body.pickupState || serverConfig.pickupState,
      pickupAddress: body.pickupAddress || serverConfig.pickupAddress,
      pickupPhone: body.pickupPhone || serverConfig.pickupPhone,
      freeDeliveryThreshold: Number(body.freeDeliveryThreshold) || 1999,
      baseWeightKg: Number(body.baseWeightKg) || 1,
      baseChargeMp: Number(body.baseChargeMp) || 50,
      additionalPerKgMp: Number(body.additionalPerKgMp) || 25,
      baseChargeNeighbor: Number(body.baseChargeNeighbor) || 65,
      additionalPerKgNeighbor: Number(body.additionalPerKgNeighbor) || 30,
      baseChargeRestOfIndia: Number(body.baseChargeRestOfIndia) || 80,
      additionalPerKgRestOfIndia: Number(body.additionalPerKgRestOfIndia) || 40,
      localShamgarhDeliveryCharge: Number(body.localShamgarhDeliveryCharge) || 20,
      lastUpdated: Date.now(),
    };

    // If credentials changed, reset cached token
    if (body.password && body.password !== serverConfig.password) {
      updated.token = undefined;
      updated.tokenExpiresAt = undefined;
    }

    await saveShiprocketConfig(updated);
    res.json({
      success: true,
      message: 'शिपिंग सेटिंग्स सफलतापूर्वक सुरक्षित की गईं।',
      config: updated,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'सेटिंग्स सुरक्षित करने में विफलता।',
    });
  }
}

/**
 * POST /api/shipping/admin/test-connection
 * Attempt login with Shiprocket and fetch user account info
 */
export async function handleTestShiprocketConnection(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body || {};
    const testEmail = email ? String(email).trim() : serverConfig.email;
    const testPassword = password ? String(password).trim() : serverConfig.password;

    if (!testEmail || !testPassword) {
      res.status(400).json({
        success: false,
        error: 'कृपया Shiprocket ईमेल और पासवर्ड दर्ज करें।',
      });
      return;
    }

    const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    const data = await authRes.json();

    if (!authRes.ok || !data.token) {
      const msg = data.message || 'Shiprocket से कनेक्ट नहीं हो सका। ईमेल या पासवर्ड जांचें।';
      serverConfig.lastTestResult = {
        success: false,
        message: msg,
        timestamp: Date.now(),
      };
      await saveShiprocketConfig(serverConfig);
      res.status(401).json({ success: false, error: msg });
      return;
    }

    // Store verified token
    serverConfig.email = testEmail;
    serverConfig.password = testPassword;
    serverConfig.token = data.token;
    serverConfig.tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
    serverConfig.lastTestResult = {
      success: true,
      message: `कनेक्शन सफल! खाता: ${data.first_name || ''} ${data.last_name || ''} (${data.email})`,
      timestamp: Date.now(),
      email: data.email,
      firstName: data.first_name,
    };
    await saveShiprocketConfig(serverConfig);

    res.json({
      success: true,
      message: `Shiprocket से सफलतापूर्वक कनेक्ट हुआ!`,
      account: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        company: data.company_name,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Shiprocket परीक्षण विफल रहा।',
    });
  }
}

/**
 * POST /api/shipping/admin/create-shipment
 * Create an ad-hoc order in Shiprocket and generate AWB & Label
 */
export async function handleCreateShiprocketShipment(req: Request, res: Response): Promise<void> {
  try {
    const { order } = req.body;
    if (!order || !order.id || !order.customerDetails) {
      res.status(400).json({ success: false, error: 'अमान्य ऑर्डर डेटा।' });
      return;
    }

    const token = await getShiprocketAuthToken();
    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Shiprocket कनेक्ट नहीं है। कृपया एडमिन पैनल में Shiprocket क्रेडेंशियल्स दर्ज करें।',
      });
      return;
    }

    const { customerDetails, items = [], totalAmount, orderNumber, id: orderId } = order;
    const cleanPin = (customerDetails.addressPincode || '').replace(/\D/g, '');

    // Prepare line items for Shiprocket
    const orderItems = items.map((item: any, idx: number) => ({
      name: item.hindiName || item.name || `Item ${idx + 1}`,
      sku: item.customId || item.productId || `SKU-${idx + 1}`,
      units: item.quantity || 1,
      selling_price: item.price || 100,
      discount: 0,
      tax: 0,
    }));

    // Calculate approximate parcel dimensions
    const totalWeightKg = items.reduce((acc: number, it: any) => acc + (it.weightInKg || 0.5) * (it.quantity || 1), 0);
    const safeWeight = Math.max(0.5, Math.round(totalWeightKg * 10) / 10);

    const payload = {
      order_id: orderNumber || `FKB-${orderId.slice(-6)}`,
      order_date: new Date(order.createdAt || Date.now()).toISOString().replace('T', ' ').slice(0, 19),
      pickup_location: serverConfig.pickupLocation || 'Primary',
      channel_id: '',
      comment: 'Falsawdiya Krishi Bazaar Order',
      billing_customer_name: customerDetails.name,
      billing_last_name: '',
      billing_address: `${customerDetails.addressHouse || ''}, ${customerDetails.addressCity || ''}`,
      billing_address_2: customerDetails.addressTehsil ? `Tehsil: ${customerDetails.addressTehsil}` : '',
      billing_city: customerDetails.addressDistrict || customerDetails.addressCity || 'Shamgarh',
      billing_pincode: cleanPin,
      billing_state: customerDetails.addressState || 'Madhya Pradesh',
      billing_country: 'India',
      billing_email: customerDetails.email || 'customer@falsawdiya.in',
      billing_phone: customerDetails.phone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.paymentStatus === 'paid' ? 'Prepaid' : 'COD',
      shipping_charges: order.deliveryCharges || 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: totalAmount,
      length: 20,
      breadth: 15,
      height: 10,
      weight: safeWeight,
    };

    // 1. Create Order in Shiprocket
    const createRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const createData = await createRes.json();
    if (!createRes.ok || !createData.order_id) {
      res.status(400).json({
        success: false,
        error: createData.message || 'Shiprocket पर ऑर्डर बनाने में समस्या आई।',
        details: createData,
      });
      return;
    }

    const shiprocketOrderId = createData.order_id;
    const shipmentId = createData.shipment_id;

    // 2. Generate AWB Code
    let awbCode = '';
    let courierName = 'Shiprocket Partner';

    try {
      const awbRes = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shipment_id: shipmentId }),
      });
      const awbData = await awbRes.json();
      if (awbData?.response?.data?.awb_code) {
        awbCode = awbData.response.data.awb_code;
        courierName = awbData.response.data.courier_name || courierName;
      }
    } catch (awbErr: any) {
      console.warn('AWB assign warning:', awbErr.message);
    }

    // 3. Generate Label
    let labelUrl = '';
    try {
      const labelRes = await fetch('https://apiv2.shiprocket.in/v1/external/courier/generate/label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      });
      const labelData = await labelRes.json();
      if (labelData?.label_url) {
        labelUrl = labelData.label_url;
      }
    } catch (labelErr: any) {
      console.warn('Label generate warning:', labelErr.message);
    }

    res.json({
      success: true,
      message: 'Shiprocket पर शिपमेंट सफलतापूर्वक तैयार हुआ!',
      shipment: {
        shiprocketOrderId,
        shipmentId,
        awbCode: awbCode || `SR-${shipmentId}`,
        courierName,
        labelUrl,
        trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : '',
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'शिपमेंट जनरेट करने में विफलता।',
    });
  }
}

/**
 * GET /api/shipping/track/:awb
 * Live Tracking using AWB number
 */
export async function handleTrackShipment(req: Request, res: Response): Promise<void> {
  try {
    const { awb } = req.params;
    if (!awb) {
      res.status(400).json({ success: false, error: 'AWB नंबर आवश्यक है।' });
      return;
    }

    const token = await getShiprocketAuthToken();
    if (!token) {
      res.json({
        success: true,
        tracking: {
          awb,
          status: 'IN_TRANSIT',
          currentStatus: 'पार्सल रास्ते में है (In Transit)',
          trackingUrl: `https://shiprocket.co/tracking/${awb}`,
        },
      });
      return;
    }

    const trackRes = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await trackRes.json();
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
