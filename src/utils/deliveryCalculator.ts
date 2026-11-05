import { 
  Product, 
  CartItem, 
  OrderItem, 
  DynamicDeliveryConfig, 
  CalculatedDeliveryQuote, 
  OrderDeliverySnapshot,
  VehicleConfig,
  WeightSlab,
  DistanceSlab
} from '../types';
import { DEFAULT_DELIVERY_CONFIG } from '../data/defaultDeliveryConfig';

// Store Origin Coordinates (Falsawdiya / Shamgarh, Mandsaur, Madhya Pradesh)
export const STORE_ORIGIN = {
  name: 'Falsawdiya Krishi Bazaar',
  location: 'Falsawdiya, Shamgarh, Dist. Mandsaur, MP',
  pincode: '458883',
  lat: 24.1842,
  lng: 75.6431,
};

export interface ProductWeightDetail {
  netWeightKg: number;
  packagingAllowanceKg: number;
  totalItemWeightKg: number;
  packagingType: 'bottle' | 'pouch' | 'bag' | 'bucket' | 'box' | 'container' | 'standard';
  packagingLabelHindi: string;
  sourceText: string;
}

/**
 * AI/Smart Parser to determine Packaging Type from name, description & unit
 */
export const detectPackagingType = (
  unitStr: string = '',
  nameStr: string = '',
  descStr: string = ''
): { type: 'bottle' | 'pouch' | 'bag' | 'bucket' | 'box' | 'container' | 'standard'; labelHindi: string } => {
  const combined = `${unitStr} ${nameStr} ${descStr}`.toLowerCase();

  if (combined.includes('बैग') || combined.includes('bag') || combined.includes('बोरी') || combined.includes('bori') || combined.includes('बोरा') || combined.includes('sack')) {
    return { type: 'bag', labelHindi: 'बैग / बोरी (Bag)' };
  }
  if (combined.includes('बोतल') || combined.includes('bottle') || combined.includes('लीटर') || combined.includes('ltr') || combined.includes('liter') || combined.includes('ml') || combined.includes('मिली') || combined.includes('लिक्विड') || combined.includes('liquid') || combined.includes('ec') || combined.includes('sc') || combined.includes('sl')) {
    return { type: 'bottle', labelHindi: 'बोतल / कैन (Bottle/Can)' };
  }
  if (combined.includes('पाउच') || combined.includes('pouch') || combined.includes('पैकेट') || combined.includes('packet') || combined.includes('pkt') || combined.includes('सचेत') || combined.includes('sachet') || combined.includes('wp') || combined.includes('wg') || combined.includes('sp')) {
    return { type: 'pouch', labelHindi: 'पाउच / पैकेट (Pouch)' };
  }
  if (combined.includes('बाल्टी') || combined.includes('bucket') || combined.includes('ड्रम') || combined.includes('drum') || combined.includes('जार') || combined.includes('jar')) {
    return { type: 'bucket', labelHindi: 'बाल्टी / ड्रम (Bucket/Drum)' };
  }
  if (combined.includes('बॉक्स') || combined.includes('box') || combined.includes('डिब्बा') || combined.includes('carton')) {
    return { type: 'box', labelHindi: 'बॉक्स / डिब्बा (Box)' };
  }

  return { type: 'standard', labelHindi: 'स्टैंडर्ड पैकिंग (Packaging)' };
};

/**
 * Calculates reasonable packaging weight allowance (Section 4 of specs)
 */
export const calculatePackagingAllowance = (
  netWeightKg: number,
  packagingType: 'bottle' | 'pouch' | 'bag' | 'bucket' | 'box' | 'container' | 'standard'
): number => {
  switch (packagingType) {
    case 'bottle':
      if (netWeightKg <= 0.1) return 0.02; // 100ml bottle
      if (netWeightKg <= 0.25) return 0.04; // 250ml bottle
      if (netWeightKg <= 0.5) return 0.06; // 500ml bottle
      if (netWeightKg <= 1.0) return 0.09; // 1L bottle
      if (netWeightKg <= 5.0) return 0.28; // 5L can / jar
      return 0.5; // Large container
    case 'pouch':
      if (netWeightKg <= 0.1) return 0.008; // 100g pouch
      if (netWeightKg <= 0.5) return 0.015; // 500g pouch
      if (netWeightKg <= 1.0) return 0.025; // 1kg pouch
      return 0.08; // 5kg pack
    case 'bag':
      if (netWeightKg <= 10) return 0.1; // 10kg bag
      if (netWeightKg <= 30) return 0.2; // 30kg seed bag
      if (netWeightKg <= 50) return 0.3; // 50kg DAP/Urea bag
      return 0.5; // > 50kg bulk bag
    case 'bucket':
      if (netWeightKg <= 10) return 0.45;
      return 0.85;
    case 'box':
      return Math.min(0.2, Math.max(0.04, netWeightKg * 0.04));
    default:
      return Math.min(0.15, Math.max(0.02, netWeightKg * 0.02));
  }
};

/**
 * Parses net weight in kg from text strings (unit, product name, description)
 */
export const parseNetWeightFromText = (
  unitStr?: string,
  nameStr?: string,
  descStr?: string
): { weightKg: number; matchedText: string } => {
  const sources = [unitStr, nameStr, descStr].filter(Boolean) as string[];

  for (const raw of sources) {
    const text = raw.toLowerCase().trim();

    // 1. Quintal / क्विंटल (100 kg)
    const quintalMatch = text.match(/([\d.]+)\s*(?:क्विंटल|quintal|qtl)/i);
    if (quintalMatch && quintalMatch[1]) {
      const val = parseFloat(quintalMatch[1]);
      if (!isNaN(val) && val > 0) return { weightKg: val * 100, matchedText: `${val} Quintal` };
    }
    if (text.includes('क्विंटल') || text.includes('quintal')) {
      return { weightKg: 100, matchedText: '1 Quintal' };
    }

    // 2. Ton / टन (1000 kg)
    const tonMatch = text.match(/([\d.]+)\s*(?:टन|ton|tonne)/i);
    if (tonMatch && tonMatch[1]) {
      const val = parseFloat(tonMatch[1]);
      if (!isNaN(val) && val > 0) return { weightKg: val * 1000, matchedText: `${val} Ton` };
    }

    // 3. Kilogram (kg, kgs, किग्रा, किलोग्राम, किलो)
    const kgMatch = text.match(/([\d.]+)\s*(?:kg|kgs|किग्रा|किलोग्राम|किलो|kilo)/i);
    if (kgMatch && kgMatch[1]) {
      const val = parseFloat(kgMatch[1]);
      if (!isNaN(val) && val > 0) return { weightKg: val, matchedText: `${val} kg` };
    }

    // 4. Liters (Ltr, Litre, लीटर, l) -> Density ~ 1 kg per liter for standard agri solutions
    const ltrMatch = text.match(/([\d.]+)\s*(?:ltr|litre|liter|लीटर|ली|l\b)/i);
    if (ltrMatch && ltrMatch[1]) {
      const val = parseFloat(ltrMatch[1]);
      if (!isNaN(val) && val > 0) return { weightKg: val, matchedText: `${val} Ltr` };
    }

    // 5. Milliliters (ml, मिली, मिलीलीटर)
    const mlMatch = text.match(/([\d.]+)\s*(?:ml|मिलीलीटर|मिली|मि\.ली\.)/i);
    if (mlMatch && mlMatch[1]) {
      const val = parseFloat(mlMatch[1]);
      if (!isNaN(val) && val > 0) return { weightKg: Math.max(0.01, val / 1000), matchedText: `${val} ml` };
    }

    // 6. Grams (gm, gms, g, ग्राम, ग्रम)
    const gmMatch = text.match(/([\d.]+)\s*(?:gm|gms|g\b|ग्राम|ग्रम)/i);
    if (gmMatch && gmMatch[1]) {
      const val = parseFloat(gmMatch[1]);
      if (!isNaN(val) && val > 0) return { weightKg: Math.max(0.01, val / 1000), matchedText: `${val} g` };
    }
  }

  // Fallback: If no unit keyword matched, check plain number in unitStr
  if (unitStr) {
    const numberMatch = unitStr.match(/([\d.]+)/);
    if (numberMatch && numberMatch[1]) {
      const val = parseFloat(numberMatch[1]);
      if (!isNaN(val) && val > 0 && val <= 5000) {
        return { weightKg: val, matchedText: `${val} Unit` };
      }
    }
  }

  // Safe default: 1 kg per item if not specified
  return { weightKg: 1.0, matchedText: '1 kg (Standard Estimate)' };
};

/**
 * Smart Product Weight Calculation including Net Weight + Packaging Allowance
 */
export const getSmartProductWeightDetail = (
  unit?: string,
  product?: Partial<Product>
): ProductWeightDetail => {
  const unitStr = unit || product?.unit || '';
  const nameStr = `${product?.hindiName || ''} ${product?.name || ''}`;
  const descStr = product?.description || '';

  // 1. Net weight extraction
  const { weightKg: netWeightKg, matchedText } = parseNetWeightFromText(unitStr, nameStr, descStr);

  // 2. Packaging detection & allowance
  const { type: packagingType, labelHindi: packagingLabelHindi } = detectPackagingType(unitStr, nameStr, descStr);
  const packagingAllowanceKg = calculatePackagingAllowance(netWeightKg, packagingType);

  const totalItemWeightKg = Math.round((netWeightKg + packagingAllowanceKg) * 1000) / 1000;

  return {
    netWeightKg: Math.round(netWeightKg * 1000) / 1000,
    packagingAllowanceKg: Math.round(packagingAllowanceKg * 1000) / 1000,
    totalItemWeightKg,
    packagingType,
    packagingLabelHindi,
    sourceText: matchedText,
  };
};

/**
 * Calculates total shipping weight in kg for cart items
 * Approx. Total Shipping Weight = (Net Product Weight + Packaging Allowance) × Quantity
 */
export const calculateCartTotalWeight = (items: CartItem[]): number => {
  if (!items || items.length === 0) return 0;

  const total = items.reduce((sum, item) => {
    const detail = getSmartProductWeightDetail(item.unit, item.product);
    return sum + (detail.totalItemWeightKg * (item.quantity || 1));
  }, 0);

  return Math.round(total * 100) / 100;
};

/**
 * Calculates total shipping weight in kg for order items
 */
export const calculateOrderTotalWeight = (items: OrderItem[]): number => {
  if (!items || items.length === 0) return 0;

  const total = items.reduce((sum, item) => {
    const detail = getSmartProductWeightDetail(item.unit, {
      hindiName: item.hindiName,
      name: item.name,
      unit: item.unit,
    });
    return sum + (detail.totalItemWeightKg * (item.quantity || 1));
  }, 0);

  return Math.round(total * 100) / 100;
};

/**
 * Haversine formula for calculating realistic road distance in km from GPS coordinates
 */
export const calculateCoordinatesDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const crowFlyDistance = R * c;

  // Road curvature factor: In local town / rural roads, road distance is ~1.20x (local) to ~1.26x (highways)
  const roadFactor = crowFlyDistance < 3 ? 1.20 : 1.26;
  const roadDistance = crowFlyDistance * roadFactor;

  // Minimum realistic road distance is 0.5 km (same neighborhood/village)
  return Math.max(0.5, Math.round(roadDistance * 10) / 10);
};

export interface DistanceDetectionResult {
  distanceKm: number;
  formattedDistance: string;
  isValidLocation: boolean;
  confidence: 'exact' | 'high' | 'approximate' | 'invalid';
  locationLabel: string;
  source: 'gps' | 'pincode_matrix' | 'town_match' | 'geocoding' | 'pincode_heuristic' | 'unknown';
  isLocal: boolean;
  accuracyMeters?: number;
  errorMessage?: string;
}

// In-memory geocoding cache to prevent duplicate external requests
const GEOCODE_CACHE: Record<string, { lat: number; lng: number; displayName: string }> = {};

/**
 * Async Geocoding helper using OpenStreetMap / Geolocation services to resolve exact coordinates
 */
export const geocodeAddressAsync = async (
  addressText: string,
  pincode?: string
): Promise<{ lat: number; lng: number; displayName: string } | null> => {
  const cleanPin = (pincode || '').trim().replace(/\D/g, '');
  const query = [addressText, cleanPin, 'India'].filter(Boolean).join(', ').trim();
  if (!query || query.length < 4) return null;

  if (GEOCODE_CACHE[query]) {
    return GEOCODE_CACHE[query];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s fast timeout

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const result = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name || query,
        };
        GEOCODE_CACHE[query] = result;
        return result;
      }
    }
  } catch {
    // Network / abort / offline fallback
  }

  return null;
};

/**
 * Comprehensive regional and national distance estimator from Shamgarh / Falsawdiya Store Origin
 * Strictly adheres to Automatic System Calculation (No manual guessing)
 */
export const detectDeliveryDistance = (
  address: {
    pincode?: string;
    city?: string;
    district?: string;
    state?: string;
    street?: string;
    coords?: { lat: number; lng: number } | null;
  },
  config?: DynamicDeliveryConfig | null
): DistanceDetectionResult => {
  const cfg = config || DEFAULT_DELIVERY_CONFIG;

  // 1. If GPS coordinates provided from browser geolocation (Highest accuracy)
  if (address.coords && address.coords.lat && address.coords.lng) {
    const originLat = cfg.storeOrigin?.latitude || STORE_ORIGIN.lat;
    const originLng = cfg.storeOrigin?.longitude || STORE_ORIGIN.lng;
    const dist = calculateCoordinatesDistanceKm(originLat, originLng, address.coords.lat, address.coords.lng);
    return {
      distanceKm: dist,
      formattedDistance: `लगभग ${dist} km`,
      isValidLocation: true,
      confidence: 'exact',
      locationLabel: `GPS वास्तविक लोकेशन (सटीक दूरी: लगभग ${dist} km)`,
      source: 'gps',
      isLocal: dist <= 10,
    };
  }

  const cleanPin = (address.pincode || '').trim().replace(/\D/g, '');
  const cityStr = (address.city || '').toLowerCase().trim();
  const distStr = (address.district || '').toLowerCase().trim();
  const streetStr = (address.street || '').toLowerCase().trim();
  const stateStr = (address.state || '').toLowerCase().trim();
  const fullLoc = `${streetStr} ${cityStr} ${distStr} ${stateStr}`.trim();

  // Check if minimum address details are present
  const hasBasicAddressText = cityStr.length >= 2 || distStr.length >= 2 || streetStr.length >= 3;
  const isSixDigitPin = cleanPin.length === 6 && /^[1-9][0-9]{5}$/.test(cleanPin);

  // 2. Local Shamgarh Specific Area Granularity (Store Origin in Falsawdiya, Shamgarh)
  if (cleanPin === '458883' || fullLoc.includes('शामगढ़') || fullLoc.includes('shamgarh') || fullLoc.includes('फल्सावदिया') || fullLoc.includes('falsawdiya')) {
    if (fullLoc.includes('फल्सावदिया') || fullLoc.includes('falsawdiya')) {
      return {
        distanceKm: 0.8,
        formattedDistance: 'लगभग 0.8 km',
        isValidLocation: true,
        confidence: 'high',
        locationLabel: 'फल्सावदिया (लोकल दुकान क्षेत्र - 458883)',
        source: 'town_match',
        isLocal: true,
      };
    }
    if (fullLoc.includes('चंदवासा') || fullLoc.includes('chandwasa')) {
      return {
        distanceKm: 9.5,
        formattedDistance: 'लगभग 9.5 km',
        isValidLocation: true,
        confidence: 'high',
        locationLabel: 'चंदवासा (458883)',
        source: 'town_match',
        isLocal: true,
      };
    }
    if (fullLoc.includes('बोलिया') || fullLoc.includes('bolia')) {
      return {
        distanceKm: 10.5,
        formattedDistance: 'लगभग 10.5 km',
        isValidLocation: true,
        confidence: 'high',
        locationLabel: 'बोलिया (458883)',
        source: 'town_match',
        isLocal: false,
      };
    }
    // Shamgarh Town Center (Station, Mandi, Market, Subhash Nagar, etc.)
    return {
      distanceKm: 1.8,
      formattedDistance: 'लगभग 1.8 km',
      isValidLocation: true,
      confidence: 'high',
      locationLabel: 'शामगढ़ शहर (458883)',
      source: 'town_match',
      isLocal: true,
    };
  }

  // 3. Known Regional Town/Village names in address text (Road Distances from Falsawdiya)
  const TOWN_MATCHES: Array<{ pattern: RegExp; km: number; label: string }> = [
    { pattern: /बोलिया|bolia|अकोदिया|खजूरी/i, km: 10.5, label: 'बोलिया / आसपास' },
    { pattern: /गरोठ|garoth|खड़ावदा/i, km: 17.5, label: 'गरोठ क्षेत्र' },
    { pattern: /मेलखेड़ा|melkheda/i, km: 18.0, label: 'मेलखेड़ा' },
    { pattern: /सुवासरा|suwasra|रुनिजा|runija/i, km: 22.0, label: 'सुवासरा' },
    { pattern: /चौमहला|chaumahla|choumehla|डग|dag/i, km: 28.0, label: 'चौमहला / डग' },
    { pattern: /भानपुरा|bhanpura|नवली|navali/i, km: 38.0, label: 'भानपुरा' },
    { pattern: /गांधी\s*सागर|gandhi\s*sagar/i, km: 48.0, label: 'गांधी सागर' },
    { pattern: /सीतामऊ|sitamau|लदूना|laduna/i, km: 42.0, label: 'सीतामऊ' },
    { pattern: /भवानी\s*मंडी|bhawani\s*mandi/i, km: 38.0, label: 'भवानी मंडी' },
    { pattern: /सुनेल|sunel|पिड़ावा|pirawa/i, km: 40.0, label: 'सुनेल / पिड़ावा' },
    { pattern: /दलोदा|dalauda|dhodhar|ढोढर/i, km: 52.0, label: 'दलोदा' },
    { pattern: /पिपलिया|piplia|मल्हारगढ़|malhargarh/i, km: 58.0, label: 'पिपलिया मंडी' },
    { pattern: /झालावाड़|jhalawar|झालरापाटन/i, km: 45.0, label: 'झालावाड़' },
    { pattern: /मंदसौर|mandsaur|mandsour/i, km: 68.0, label: 'मंदसौर शहर' },
    { pattern: /मनासा|manasa|कुकड़ेश्वर/i, km: 75.0, label: 'मनासा' },
    { pattern: /जावरा|jawra|jaora/i, km: 85.0, label: 'जावरा' },
    { pattern: /नीमच|neemuch|nimach/i, km: 85.0, label: 'नीमच' },
    { pattern: /कोटा|kota/i, km: 110.0, label: 'कोटा' },
    { pattern: /रतलाम|ratlam/i, km: 120.0, label: 'रतलाम' },
    { pattern: /चित्तौड़|chittorgarh/i, km: 130.0, label: 'चित्तौड़गढ़' },
    { pattern: /उज्जैन|ujjain/i, km: 145.0, label: 'उज्जैन' },
    { pattern: /इंदौर|indore/i, km: 195.0, label: 'इंदौर' },
    { pattern: /भोपाल|bhopal/i, km: 240.0, label: 'भोपाल' },
  ];

  for (const item of TOWN_MATCHES) {
    if (item.pattern.test(fullLoc)) {
      return {
        distanceKm: item.km,
        formattedDistance: `लगभग ${item.km} km`,
        isValidLocation: true,
        confidence: 'high',
        locationLabel: item.label,
        source: 'town_match',
        isLocal: item.km <= 10,
      };
    }
  }

  // 4. Direct Pincode Match from Admin Config / Regional Map
  const KNOWN_PINCODES: Record<string, { km: number; label: string }> = {
    // Shamgarh & Immediate Local Villages
    '458883': { km: 1.8, label: 'शामगढ़ / फल्सावदिया लोकल' },
    '458888': { km: 17.5, label: 'गरोठ' },
    '458389': { km: 18.0, label: 'मेलखेड़ा' },
    '458880': { km: 22.0, label: 'सुवासरा' },
    '458775': { km: 38.0, label: 'भानपुरा' },
    '458778': { km: 48.0, label: 'गांधी सागर' },
    '458990': { km: 42.0, label: 'सीतामऊ' },
    '458558': { km: 52.0, label: 'दलोदा / ढोढर' },
    '458001': { km: 68.0, label: 'मंदसौर शहर' },
    '458002': { km: 72.0, label: 'मंदसौर ग्रामीण' },
    '458667': { km: 58.0, label: 'पिपलिया मंडी / मल्हारगढ़' },
    '458441': { km: 85.0, label: 'नीमच शहर' },
    '458771': { km: 75.0, label: 'मनासा / कुकड़ेश्वर' },
    '458220': { km: 92.0, label: 'जावद / सिंगोली' },
    '458110': { km: 54.0, label: 'रामपुरा' },

    // Rajasthan Border Towns (Near Shamgarh)
    '326502': { km: 38.0, label: 'भवानी मंडी' },
    '326515': { km: 28.0, label: 'डग / चौमहला' },
    '326514': { km: 40.0, label: 'सुनेल / पिड़ावा' },
    '326516': { km: 55.0, label: 'बकानी' },
    '326001': { km: 45.0, label: 'झालावाड़' },
    '326023': { km: 50.0, label: 'झालरापाटन' },
    '324001': { km: 110.0, label: 'कोटा' },
    '312001': { km: 130.0, label: 'चित्तौड़गढ़' },

    // MP Major Cities
    '457001': { km: 120.0, label: 'रतलाम' },
    '457226': { km: 85.0, label: 'जावरा' },
    '456001': { km: 145.0, label: 'उज्जैन' },
    '456006': { km: 148.0, label: 'नागदा' },
    '452001': { km: 195.0, label: 'इंदौर' },
    '462001': { km: 240.0, label: 'भोपाल' },
  };

  // Check Admin configured pincode table first
  if (isSixDigitPin && cfg.pincodeDistances && cfg.pincodeDistances[cleanPin] !== undefined) {
    const dist = cfg.pincodeDistances[cleanPin];
    return {
      distanceKm: dist,
      formattedDistance: `लगभग ${dist} km`,
      isValidLocation: true,
      confidence: 'high',
      locationLabel: `पिनकोड ${cleanPin} (एडमिन दर)`,
      source: 'pincode_matrix',
      isLocal: dist <= 10,
    };
  }

  // Check built-in regional pincode map
  if (isSixDigitPin && KNOWN_PINCODES[cleanPin]) {
    const info = KNOWN_PINCODES[cleanPin];
    return {
      distanceKm: info.km,
      formattedDistance: `लगभग ${info.km} km`,
      isValidLocation: true,
      confidence: 'high',
      locationLabel: `${info.label} (${cleanPin})`,
      source: 'pincode_matrix',
      isLocal: info.km <= 10,
    };
  }

  // 5. Pin code Geographic Zone matching (Only if valid 6-digit pin provided)
  if (isSixDigitPin) {
    const prefix3 = cleanPin.substring(0, 3);
    const prefix2 = cleanPin.substring(0, 2);

    if (prefix3 === '458') {
      // Mandsaur & Neemuch district area
      return {
        distanceKm: 45.0,
        formattedDistance: 'लगभग 45 km',
        isValidLocation: true,
        confidence: 'approximate',
        locationLabel: `मंदसौर/नीमच जिला क्षेत्र (${cleanPin})`,
        source: 'pincode_heuristic',
        isLocal: false,
      };
    }
    if (prefix3 === '326') {
      // Jhalawar / Rajasthan border area
      return {
        distanceKm: 50.0,
        formattedDistance: 'लगभग 50 km',
        isValidLocation: true,
        confidence: 'approximate',
        locationLabel: `झालावाड़ सीमावर्ती क्षेत्र (${cleanPin})`,
        source: 'pincode_heuristic',
        isLocal: false,
      };
    }
    if (prefix3 === '457' || prefix3 === '456') {
      // Ratlam / Ujjain area
      return {
        distanceKm: 120.0,
        formattedDistance: 'लगभग 120 km',
        isValidLocation: true,
        confidence: 'approximate',
        locationLabel: `मालवा संभाग (${cleanPin})`,
        source: 'pincode_heuristic',
        isLocal: false,
      };
    }
    if (prefix3 === '452' || prefix3 === '453') {
      // Indore region
      return {
        distanceKm: 195.0,
        formattedDistance: 'लगभग 195 km',
        isValidLocation: true,
        confidence: 'approximate',
        locationLabel: `इंदौर संभाग (${cleanPin})`,
        source: 'pincode_heuristic',
        isLocal: false,
      };
    }
    if (prefix2 === '45' || prefix2 === '46' || prefix2 === '47' || prefix2 === '48') {
      // Madhya Pradesh general
      return {
        distanceKm: 220.0,
        formattedDistance: 'लगभग 220 km',
        isValidLocation: true,
        confidence: 'approximate',
        locationLabel: `मध्य प्रदेश (${cleanPin})`,
        source: 'pincode_heuristic',
        isLocal: false,
      };
    }
    if (prefix2 === '30' || prefix2 === '31' || prefix2 === '32' || prefix2 === '33' || prefix2 === '34') {
      // Rajasthan general
      return {
        distanceKm: 180.0,
        formattedDistance: 'लगभग 180 km',
        isValidLocation: true,
        confidence: 'approximate',
        locationLabel: `राजस्थान (${cleanPin})`,
        source: 'pincode_heuristic',
        isLocal: false,
      };
    }

    // Other Indian postal zones (valid 6-digit pin)
    return {
      distanceKm: 350.0,
      formattedDistance: 'लगभग 350 km',
      isValidLocation: true,
      confidence: 'approximate',
      locationLabel: `अखिल भारतीय क्षेत्र (${cleanPin})`,
      source: 'pincode_heuristic',
      isLocal: false,
    };
  }

  // 6. Invalid / Incomplete Location - DO NOT GUESS OR FAKE
  return {
    distanceKm: 0,
    formattedDistance: '0 km',
    isValidLocation: false,
    confidence: 'invalid',
    locationLabel: 'लोकेशन अज्ञात',
    source: 'unknown',
    isLocal: false,
    errorMessage: 'आपकी सटीक Location नहीं मिल पाई। कृपया GPS/Location चालू करें और पुनः प्रयास करें।',
  };
};

/**
 * Finds the matching Weight Slab and Vehicle for a given total weight in kg
 */
export const findWeightSlabAndVehicle = (
  weightKg: number,
  config: DynamicDeliveryConfig
): { weightSlab: WeightSlab; vehicle: VehicleConfig } => {
  const safeWeight = Math.max(0.01, weightKg);
  
  // Filter only active vehicles
  const activeVehicles = (config.vehicles || []).filter(v => v.isActive !== false);
  const activeVehicleIds = new Set(activeVehicles.map(v => v.id));
  
  // Get active weight slabs
  const allWeightSlabs = (config.weightSlabs || []);
  const activeWeightSlabs = allWeightSlabs.filter(ws => activeVehicleIds.has(ws.vehicleId));
  const slabsToSearch = activeWeightSlabs.length > 0 ? activeWeightSlabs : allWeightSlabs;
  
  const sortedSlabs = [...slabsToSearch].sort((a, b) => a.minWeightKg - b.minWeightKg);

  let matchedSlab = sortedSlabs.find(
    slab => safeWeight >= slab.minWeightKg && safeWeight <= slab.maxWeightKg
  );

  if (!matchedSlab && sortedSlabs.length > 0) {
    matchedSlab = sortedSlabs[sortedSlabs.length - 1];
  }

  if (!matchedSlab) {
    matchedSlab = {
      id: 'ws_1',
      minWeightKg: 0,
      maxWeightKg: 10,
      vehicleId: 'bike',
      label: '0–10 किग्रा (Bike)',
    };
  }

  let vehicle = (config.vehicles || []).find(v => v.id === matchedSlab!.vehicleId);
  if (!vehicle) {
    vehicle = {
      id: matchedSlab.vehicleId,
      name: 'डिलीवरी वाहन (Delivery Vehicle)',
      shortName: 'Vehicle',
      icon: '🚚',
      description: 'ऑर्डर डिलीवरी',
      maxCapacityKg: 100,
      isActive: true,
      order: 1,
    };
  }

  return { weightSlab: matchedSlab, vehicle };
};

/**
 * Finds the matching Distance Slab for a given distance in km
 */
export const findDistanceSlab = (
  distanceKm: number,
  config: DynamicDeliveryConfig
): DistanceSlab => {
  const safeDist = Math.max(0, distanceKm);
  const sortedSlabs = [...(config.distanceSlabs || [])].sort((a, b) => a.minDistanceKm - b.minDistanceKm);

  let matchedSlab = sortedSlabs.find(
    slab => safeDist >= slab.minDistanceKm && safeDist <= slab.maxDistanceKm
  );

  if (!matchedSlab && sortedSlabs.length > 0) {
    matchedSlab = sortedSlabs[sortedSlabs.length - 1];
  }

  if (!matchedSlab) {
    matchedSlab = {
      id: 'ds_1',
      minDistanceKm: 0,
      maxDistanceKm: 5,
      label: '0–5 किमी',
    };
  }

  return matchedSlab;
};

/**
 * Calculates the complete dynamic delivery fee quote
 */
export const calculateDynamicDeliveryCharge = (
  totalWeightKg: number,
  distanceKm: number,
  configOrCartTotal?: DynamicDeliveryConfig | number | null,
  cartTotalOrConfig?: number | DynamicDeliveryConfig | null
): CalculatedDeliveryQuote => {
  let cfg: DynamicDeliveryConfig = DEFAULT_DELIVERY_CONFIG;
  let cartTotal: number = 0;

  if (typeof configOrCartTotal === 'object' && configOrCartTotal !== null) {
    cfg = configOrCartTotal;
    cartTotal = typeof cartTotalOrConfig === 'number' ? cartTotalOrConfig : 0;
  } else if (typeof configOrCartTotal === 'number') {
    cartTotal = configOrCartTotal;
    if (typeof cartTotalOrConfig === 'object' && cartTotalOrConfig !== null) {
      cfg = cartTotalOrConfig;
    }
  }

  const safeWeight = Math.max(0.1, Math.round(totalWeightKg * 100) / 100);
  const safeDistance = Math.max(1, Math.round(distanceKm * 10) / 10);

  if (!cfg.isEnabled) {
    const fixedFee = cfg.defaultFixedCharge ?? 40;
    const isFree = cfg.enableFreeDelivery && cfg.freeDeliveryThreshold > 0 && cartTotal >= cfg.freeDeliveryThreshold;
    const standardVehicle: VehicleConfig = {
      id: 'standard',
      name: 'स्टैंडर्ड डिलीवरी (Standard Delivery)',
      shortName: 'Standard',
      icon: '🚚',
      description: 'स्टैंडर्ड फिक्स डिलीवरी चार्ज',
      maxCapacityKg: 50,
      isActive: true,
      order: 1,
    };
    return {
      totalWeightKg: safeWeight,
      distanceKm: safeDistance,
      vehicle: standardVehicle,
      vehicleEmoji: '🚚',
      vehicleNameHindi: 'स्टैंडर्ड डिलीवरी',
      vehicleType: 'Standard',
      weightSlab: {
        id: 'fixed',
        minWeightKg: 0,
        maxWeightKg: 99999,
        vehicleId: 'standard',
        label: 'स्टैंडर्ड डिलीवरी',
      },
      distanceSlab: {
        id: 'fixed',
        minDistanceKm: 0,
        maxDistanceKm: 99999,
        label: 'सभी क्षेत्र',
      },
      baseCharge: fixedFee,
      discount: isFree ? fixedFee : 0,
      finalDeliveryCharge: isFree ? 0 : fixedFee,
      isFreeDelivery: isFree,
      breakdownText: isFree 
        ? `₹${cfg.freeDeliveryThreshold} से अधिक के ऑर्डर पर मुफ्त डिलीवरी लागू`
        : `स्टैंडर्ड डिलीवरी शुल्क: ₹${fixedFee}`,
      calculationNote: isFree ? `ऑर्डर मूल्य ₹${cartTotal} (मुफ्त डिलीवरी लागू)` : `फिक्स डिलीवरी दर लागू`,
    };
  }

  // 1. Find matched vehicle and weight slab
  const { weightSlab, vehicle } = findWeightSlabAndVehicle(safeWeight, cfg);

  // 2. Find matched distance slab
  const distanceSlab = findDistanceSlab(safeDistance, cfg);

  // 3. Lookup rate in matrix
  const matrixKey = `${vehicle.id}_${distanceSlab.id}`;
  let baseCharge = cfg.rateMatrix?.[matrixKey];

  if (typeof baseCharge !== 'number' || baseCharge < 0) {
    const baseVehicleRate = vehicle.id === 'bike' ? 30 
      : vehicle.id === 'e_rickshaw' ? 60 
      : vehicle.id === 'pickup' ? 150 
      : vehicle.id === 'tempo' ? 250 
      : 600;
    const distanceMultiplier = safeDistance <= 5 ? 1 
      : safeDistance <= 15 ? 1.6 
      : safeDistance <= 30 ? 2.6 
      : safeDistance <= 50 ? 4.2 
      : 6.5;
    baseCharge = Math.round(baseVehicleRate * distanceMultiplier);
  }

  // 4. Check Free Delivery Eligibility
  const isFreeDelivery = cfg.enableFreeDelivery && 
    cfg.freeDeliveryThreshold > 0 && 
    cartTotal >= cfg.freeDeliveryThreshold;

  const discount = isFreeDelivery ? baseCharge : 0;
  const finalDeliveryCharge = isFreeDelivery ? 0 : baseCharge;

  const breakdownText = `${vehicle.icon} ${vehicle.shortName} (${safeWeight} kg) × ${distanceSlab.label} (${safeDistance} km) = ₹${baseCharge}`;
  const calculationNote = isFreeDelivery 
    ? `ऑर्डर मूल्य (₹${cartTotal}) न्यूनतम ₹${cfg.freeDeliveryThreshold} से अधिक होने पर मुफ़्त डिलीवरी लागू हुई।`
    : `${vehicle.name} (${safeWeight} kg) • दूरी: ${safeDistance} km (${distanceSlab.label})`;

  return {
    totalWeightKg: safeWeight,
    distanceKm: safeDistance,
    vehicle,
    vehicleEmoji: vehicle.icon || '🚚',
    vehicleNameHindi: vehicle.name || 'डिलीवरी वाहन',
    vehicleType: vehicle.shortName || 'वाहन',
    weightSlab,
    distanceSlab,
    baseCharge,
    discount,
    finalDeliveryCharge,
    isFreeDelivery,
    breakdownText,
    calculationNote,
  };
};

/**
 * Generates an immutable OrderDeliverySnapshot to store permanently inside Order doc
 */
export const createOrderDeliverySnapshot = (
  quote: CalculatedDeliveryQuote,
  manualOverride?: { finalCharge: number; reason: string }
): OrderDeliverySnapshot => {
  if (manualOverride && typeof manualOverride.finalCharge === 'number') {
    return {
      totalWeightKg: quote.totalWeightKg,
      distanceKm: quote.distanceKm,
      vehicleId: quote.vehicle.id,
      vehicleName: quote.vehicle.name,
      vehicleIcon: quote.vehicle.icon,
      vehicleEmoji: quote.vehicleEmoji || quote.vehicle.icon || '🚚',
      vehicleNameHindi: quote.vehicleNameHindi || quote.vehicle.name,
      vehicleType: quote.vehicleType || quote.vehicle.shortName || 'Vehicle',
      distanceSlabLabel: quote.distanceSlab.label,
      weightSlabLabel: quote.weightSlab.label || `${quote.totalWeightKg} kg`,
      calculatedCharge: quote.baseCharge,
      finalCharge: Math.max(0, manualOverride.finalCharge),
      isFreeDelivery: manualOverride.finalCharge === 0,
      isManuallyOverridden: true,
      overrideReason: manualOverride.reason,
      calculatedAt: Date.now(),
    };
  }

  return {
    totalWeightKg: quote.totalWeightKg,
    distanceKm: quote.distanceKm,
    vehicleId: quote.vehicle.id,
    vehicleName: quote.vehicle.name,
    vehicleIcon: quote.vehicle.icon,
    vehicleEmoji: quote.vehicleEmoji || quote.vehicle.icon || '🚚',
    vehicleNameHindi: quote.vehicleNameHindi || quote.vehicle.name,
    vehicleType: quote.vehicleType || quote.vehicle.shortName || 'Vehicle',
    distanceSlabLabel: quote.distanceSlab.label,
    weightSlabLabel: quote.weightSlab.label || `${quote.totalWeightKg} kg`,
    calculatedCharge: quote.baseCharge,
    finalCharge: quote.finalDeliveryCharge,
    isFreeDelivery: quote.isFreeDelivery,
    isManuallyOverridden: false,
    calculatedAt: Date.now(),
  };
};

// Aliases for clean ergonomics
export const calculateCartWeight = calculateCartTotalWeight;
export const calculateOrderWeight = calculateOrderTotalWeight;
export const createDeliverySnapshot = createOrderDeliverySnapshot;
export const estimateDistanceByPincode = (pincode: string, config?: DynamicDeliveryConfig): number => {
  const res = detectDeliveryDistance({ pincode }, config);
  return res.distanceKm;
};
export const estimateDeliveryDistance = (
  pincode: string = '',
  city: string = '',
  district: string = '',
  config?: DynamicDeliveryConfig
): number => {
  const res = detectDeliveryDistance({ pincode, city, district }, config);
  return res.distanceKm;
};
