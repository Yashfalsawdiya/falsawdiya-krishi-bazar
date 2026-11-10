import { 
  Product, 
  CartItem, 
  OrderItem, 
  DynamicDeliveryConfig, 
  CalculatedDeliveryQuote, 
  OrderDeliverySnapshot,
  VehicleConfig,
  WeightSlab,
  DistanceSlab,
  VillageDeliveryEntry
} from '../types';
import { DEFAULT_DELIVERY_CONFIG } from '../data/defaultDeliveryConfig';
import { 
  getCombinedVillageDirectory, 
  findVillageMatch 
} from '../data/villageDirectory';

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
  source: 'village_directory' | 'town_match' | 'pincode_matrix' | 'geocoding' | 'pincode_heuristic' | 'gps' | 'courier_service' | 'unknown';
  isLocal: boolean;
  accuracyMeters?: number;
  errorMessage?: string;
  isDeliveryDisabled?: boolean;
  disabledReason?: string;
  deliveryType?: 'local' | 'courier';
  isCourierEligible?: boolean;
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

// All-India Postal Sorting Hubs Coordinates Matrix (Calculates accurate road distance from Shamgarh, MP: 24.1884° N, 75.6417° E)
const POSTAL_HUB_COORDINATES: Record<string, { lat: number; lon: number; name: string; roadFactor?: number }> = {
  // Maharashtra (40-44)
  '400': { lat: 18.96, lon: 72.82, name: 'मुंबई (Mumbai)', roadFactor: 1.14 },
  '401': { lat: 19.69, lon: 72.76, name: 'पालघर / ठाणे ग्रामीण (Palghar/Thane)', roadFactor: 1.15 },
  '402': { lat: 18.55, lon: 73.18, name: 'रायगढ़ (Raigad)', roadFactor: 1.16 },
  '403': { lat: 15.29, lon: 74.12, name: 'गोवा (Goa)', roadFactor: 1.20 },
  '410': { lat: 18.75, lon: 73.40, name: 'लोनावला / पुणे ग्रामीण', roadFactor: 1.16 },
  '411': { lat: 18.52, lon: 73.85, name: 'पुणे शहर (Pune)', roadFactor: 1.16 },
  '412': { lat: 18.60, lon: 73.90, name: 'पुणे ग्रामीण (Pune Rural)', roadFactor: 1.16 },
  '413': { lat: 17.65, lon: 75.90, name: 'सोलापुर (Solapur)', roadFactor: 1.18 },
  '414': { lat: 19.09, lon: 74.74, name: 'अहमदनगर (Ahmednagar)', roadFactor: 1.17 },
  '415': { lat: 17.68, lon: 74.01, name: 'सातारा (Satara)', roadFactor: 1.18 },
  '416': { lat: 16.70, lon: 74.24, name: 'कोल्हापुर / सांगली (Kolhapur)', roadFactor: 1.18 },
  '421': { lat: 19.24, lon: 73.13, name: 'कल्याण / डोंबिवली (Kalyan)', roadFactor: 1.15 },
  '422': { lat: 19.99, lon: 73.78, name: 'नासिक (Nashik)', roadFactor: 1.16 },
  '423': { lat: 20.55, lon: 74.52, name: 'मालेगांव (Malegaon)', roadFactor: 1.16 },
  '424': { lat: 20.90, lon: 74.77, name: 'धुले (Dhule)', roadFactor: 1.15 },
  '425': { lat: 21.00, lon: 75.56, name: 'जलगांव (Jalgaon)', roadFactor: 1.15 },
  '431': { lat: 19.87, lon: 75.34, name: 'छत्रपति संभाजीनगर (Aurangabad)', roadFactor: 1.18 },
  '440': { lat: 21.14, lon: 79.08, name: 'नागपुर (Nagpur)', roadFactor: 1.18 },
  '441': { lat: 21.20, lon: 79.15, name: 'नागपुर ग्रामीण (Nagpur Rural)', roadFactor: 1.18 },
  '444': { lat: 20.70, lon: 77.00, name: 'अकोला / अमरावती (Akola)', roadFactor: 1.18 },
  '40': { lat: 19.07, lon: 72.87, name: 'मुंबई संभाग', roadFactor: 1.15 },
  '41': { lat: 18.52, lon: 73.85, name: 'पुणे संभाग', roadFactor: 1.16 },
  '42': { lat: 19.99, lon: 73.78, name: 'नासिक संभाग', roadFactor: 1.16 },
  '43': { lat: 19.87, lon: 75.34, name: 'मराठवाड़ा संभाग', roadFactor: 1.18 },
  '44': { lat: 21.14, lon: 79.08, name: 'विदर्भ संभाग', roadFactor: 1.18 },

  // Delhi & NCR (11, 12, 20)
  '110': { lat: 28.61, lon: 77.20, name: 'दिल्ली (Delhi)', roadFactor: 1.18 },
  '121': { lat: 28.40, lon: 77.31, name: 'फरीदाबाद (Faridabad)', roadFactor: 1.18 },
  '122': { lat: 28.45, lon: 77.02, name: 'गुरुग्राम (Gurugram)', roadFactor: 1.18 },
  '201': { lat: 28.53, lon: 77.39, name: 'नोएडा / गाजियाबाद (Noida/Ghaziabad)', roadFactor: 1.18 },
  '11': { lat: 28.61, lon: 77.20, name: 'दिल्ली एनसीआर', roadFactor: 1.18 },

  // Haryana (12, 13)
  '124': { lat: 28.89, lon: 76.60, name: 'रोहतक (Rohtak)', roadFactor: 1.18 },
  '125': { lat: 29.14, lon: 75.72, name: 'हिसार (Hisar)', roadFactor: 1.18 },
  '131': { lat: 28.99, lon: 77.01, name: 'सोनीपत (Sonipat)', roadFactor: 1.18 },
  '132': { lat: 29.39, lon: 76.96, name: 'पानीपत / करनाल (Panipat)', roadFactor: 1.18 },
  '133': { lat: 30.37, lon: 76.77, name: 'अंबाला (Ambala)', roadFactor: 1.18 },
  '12': { lat: 28.80, lon: 76.50, name: 'हरियाणा', roadFactor: 1.18 },
  '13': { lat: 29.50, lon: 76.80, name: 'हरियाणा उत्तर', roadFactor: 1.18 },

  // Punjab & Chandigarh (14, 15, 16)
  '160': { lat: 30.73, lon: 76.77, name: 'चंडीगढ़ (Chandigarh)', roadFactor: 1.18 },
  '141': { lat: 30.90, lon: 75.85, name: 'लुधियाना (Ludhiana)', roadFactor: 1.18 },
  '143': { lat: 31.63, lon: 74.87, name: 'अमृतसर (Amritsar)', roadFactor: 1.18 },
  '144': { lat: 31.32, lon: 75.57, name: 'जालंधर (Jalandhar)', roadFactor: 1.18 },
  '147': { lat: 30.33, lon: 76.38, name: 'पटियाला (Patiala)', roadFactor: 1.18 },
  '151': { lat: 30.21, lon: 74.94, name: 'बठिंडा (Bathinda)', roadFactor: 1.18 },
  '14': { lat: 31.00, lon: 75.60, name: 'पंजाब', roadFactor: 1.18 },
  '15': { lat: 30.50, lon: 75.00, name: 'पंजाब दक्षिण', roadFactor: 1.18 },
  '16': { lat: 30.73, lon: 76.77, name: 'चंडीगढ़ संभाग', roadFactor: 1.18 },

  // Himachal Pradesh, J&K (17, 18, 19)
  '171': { lat: 31.10, lon: 77.17, name: 'शिमला (Shimla)', roadFactor: 1.25 },
  '180': { lat: 32.72, lon: 74.85, name: 'जम्मू (Jammu)', roadFactor: 1.22 },
  '190': { lat: 34.08, lon: 74.79, name: 'श्रीनगर (Srinagar)', roadFactor: 1.25 },
  '17': { lat: 31.50, lon: 77.00, name: 'हिमाचल प्रदेश', roadFactor: 1.25 },
  '18': { lat: 32.80, lon: 75.00, name: 'जम्मू व कश्मीर', roadFactor: 1.22 },
  '19': { lat: 34.00, lon: 75.00, name: 'कश्मीर व लद्दाख', roadFactor: 1.25 },

  // Uttar Pradesh & Uttarakhand (20-28)
  '208': { lat: 26.44, lon: 80.33, name: 'कानपुर (Kanpur)', roadFactor: 1.20 },
  '226': { lat: 26.84, lon: 80.94, name: 'लखनऊ (Lucknow)', roadFactor: 1.20 },
  '282': { lat: 27.17, lon: 78.00, name: 'आगरा (Agra)', roadFactor: 1.18 },
  '281': { lat: 27.49, lon: 77.67, name: 'मथुरा (Mathura)', roadFactor: 1.18 },
  '202': { lat: 27.89, lon: 78.08, name: 'अलीगढ़ (Aligarh)', roadFactor: 1.18 },
  '250': { lat: 28.98, lon: 77.70, name: 'मेरठ (Meerut)', roadFactor: 1.18 },
  '248': { lat: 30.31, lon: 78.03, name: 'देहरादून (Dehradun)', roadFactor: 1.24 },
  '243': { lat: 28.36, lon: 79.43, name: 'बरेली (Bareilly)', roadFactor: 1.20 },
  '211': { lat: 25.43, lon: 81.84, name: 'प्रयागराज (Prayagraj)', roadFactor: 1.20 },
  '221': { lat: 25.31, lon: 82.97, name: 'वाराणसी (Varanasi)', roadFactor: 1.20 },
  '273': { lat: 26.76, lon: 83.37, name: 'गोरखपुर (Gorakhpur)', roadFactor: 1.20 },
  '284': { lat: 25.44, lon: 78.56, name: 'झांसी (Jhansi)', roadFactor: 1.18 },
  '20': { lat: 27.50, lon: 79.00, name: 'उत्तर प्रदेश पश्चिम', roadFactor: 1.18 },
  '21': { lat: 25.50, lon: 81.50, name: 'उत्तर प्रदेश दक्षिण', roadFactor: 1.20 },
  '22': { lat: 26.50, lon: 82.00, name: 'उत्तर प्रदेश मध्य/पूर्व', roadFactor: 1.20 },
  '24': { lat: 29.50, lon: 79.00, name: 'उत्तराखंड / बरेली', roadFactor: 1.22 },
  '25': { lat: 29.00, lon: 77.70, name: 'मेरठ संभाग', roadFactor: 1.18 },
  '27': { lat: 26.80, lon: 83.00, name: 'गोरखपुर संभाग', roadFactor: 1.20 },
  '28': { lat: 26.50, lon: 78.20, name: 'आगरा व बुंदेलखंड', roadFactor: 1.18 },

  // Rajasthan (30-34)
  '302': { lat: 26.91, lon: 75.78, name: 'जयपुर (Jaipur)', roadFactor: 1.14 },
  '301': { lat: 27.55, lon: 76.63, name: 'अलवर (Alwar)', roadFactor: 1.15 },
  '305': { lat: 26.44, lon: 74.63, name: 'अजमेर (Ajmer)', roadFactor: 1.14 },
  '311': { lat: 25.34, lon: 74.63, name: 'भीलवाड़ा (Bhilwara)', roadFactor: 1.14 },
  '312': { lat: 24.88, lon: 74.62, name: 'चित्तौड़गढ़ (Chittorgarh)', roadFactor: 1.14 },
  '313': { lat: 24.58, lon: 73.71, name: 'उदयपुर (Udaipur)', roadFactor: 1.15 },
  '314': { lat: 23.83, lon: 73.71, name: 'डूंगरपुर (Dungarpur)', roadFactor: 1.16 },
  '324': { lat: 25.21, lon: 75.86, name: 'कोटा (Kota)', roadFactor: 1.12 },
  '326': { lat: 24.59, lon: 76.16, name: 'झालावाड़ (Jhalawar)', roadFactor: 1.12 },
  '334': { lat: 28.02, lon: 73.31, name: 'बीकानेर (Bikaner)', roadFactor: 1.18 },
  '342': { lat: 26.23, lon: 73.02, name: 'जोधपुर (Jodhpur)', roadFactor: 1.18 },
  '30': { lat: 26.80, lon: 75.50, name: 'राजस्थान मध्य', roadFactor: 1.14 },
  '31': { lat: 24.80, lon: 74.20, name: 'राजस्थान दक्षिण', roadFactor: 1.15 },
  '32': { lat: 25.20, lon: 76.00, name: 'राजस्थान हाड़ौती', roadFactor: 1.12 },
  '33': { lat: 28.00, lon: 74.50, name: 'राजस्थान उत्तर', roadFactor: 1.18 },
  '34': { lat: 26.50, lon: 72.50, name: 'राजस्थान पश्चिम', roadFactor: 1.18 },

  // Gujarat (36-39)
  '380': { lat: 23.02, lon: 72.57, name: 'अहमदाबाद (Ahmedabad)', roadFactor: 1.16 },
  '382': { lat: 23.21, lon: 72.63, name: 'गांधीनगर (Gandhinagar)', roadFactor: 1.16 },
  '390': { lat: 22.30, lon: 73.18, name: 'वडोदरा (Vadodara)', roadFactor: 1.16 },
  '395': { lat: 21.17, lon: 72.83, name: 'सूरत (Surat)', roadFactor: 1.16 },
  '360': { lat: 22.30, lon: 70.80, name: 'राजकोट (Rajkot)', roadFactor: 1.18 },
  '361': { lat: 22.47, lon: 70.05, name: 'जामनगर (Jamnagar)', roadFactor: 1.18 },
  '364': { lat: 21.76, lon: 72.15, name: 'भावनगर (Bhavnagar)', roadFactor: 1.18 },
  '388': { lat: 22.56, lon: 72.92, name: 'आनंद (Anand)', roadFactor: 1.16 },
  '396': { lat: 20.38, lon: 72.91, name: 'वापी / वलसाड (Vapi/Valsad)', roadFactor: 1.16 },
  '36': { lat: 22.00, lon: 70.80, name: 'सौराष्ट्र संभाग', roadFactor: 1.18 },
  '37': { lat: 23.25, lon: 69.66, name: 'कच्छ संभाग', roadFactor: 1.20 },
  '38': { lat: 23.00, lon: 72.60, name: 'गुजरात मध्य', roadFactor: 1.16 },
  '39': { lat: 21.50, lon: 73.00, name: 'गुजरात दक्षिण', roadFactor: 1.16 },

  // Madhya Pradesh (45-48)
  '458': { lat: 24.07, lon: 75.07, name: 'मंदसौर / नीमच जिला', roadFactor: 1.15 },
  '457': { lat: 23.33, lon: 75.03, name: 'रतलाम (Ratlam)', roadFactor: 1.15 },
  '456': { lat: 23.17, lon: 75.78, name: 'उज्जैन (Ujjain)', roadFactor: 1.15 },
  '452': { lat: 22.71, lon: 75.85, name: 'इंदौर (Indore)', roadFactor: 1.15 },
  '453': { lat: 22.55, lon: 75.75, name: 'महू / इंदौर ग्रामीण (Mhow)', roadFactor: 1.15 },
  '454': { lat: 22.59, lon: 75.29, name: 'धार (Dhar)', roadFactor: 1.16 },
  '455': { lat: 22.96, lon: 76.05, name: 'देवास (Dewas)', roadFactor: 1.15 },
  '465': { lat: 23.42, lon: 76.27, name: 'शाजापुर / आगर मालवा', roadFactor: 1.15 },
  '462': { lat: 23.25, lon: 77.41, name: 'भोपाल (Bhopal)', roadFactor: 1.18 },
  '461': { lat: 22.75, lon: 77.72, name: 'नर्मदापुरम (Hoshangabad)', roadFactor: 1.18 },
  '474': { lat: 26.21, lon: 78.18, name: 'ग्वालियर (Gwalior)', roadFactor: 1.18 },
  '470': { lat: 23.83, lon: 78.73, name: 'सागर (Sagar)', roadFactor: 1.18 },
  '482': { lat: 23.18, lon: 79.98, name: 'जबलपुर (Jabalpur)', roadFactor: 1.20 },
  '486': { lat: 24.53, lon: 81.30, name: 'रीवा (Rewa)', roadFactor: 1.20 },
  '485': { lat: 24.58, lon: 80.82, name: 'सतना (Satna)', roadFactor: 1.20 },
  '45': { lat: 23.00, lon: 75.50, name: 'मालवा निमाड़', roadFactor: 1.15 },
  '46': { lat: 23.25, lon: 77.00, name: 'भोपाल संभाग', roadFactor: 1.18 },
  '47': { lat: 25.50, lon: 78.00, name: 'ग्वालियर / चंबल', roadFactor: 1.18 },
  '48': { lat: 23.50, lon: 80.50, name: 'जबलपुर / महाकौशल', roadFactor: 1.20 },

  // Chhattisgarh (49)
  '492': { lat: 21.25, lon: 81.62, name: 'रायपुर (Raipur)', roadFactor: 1.22 },
  '490': { lat: 21.21, lon: 81.38, name: 'भिलाई / दुर्ग (Bhilai)', roadFactor: 1.22 },
  '495': { lat: 22.07, lon: 82.14, name: 'बिलासपुर (Bilaspur)', roadFactor: 1.22 },
  '49': { lat: 21.50, lon: 81.80, name: 'छत्तीसगढ़', roadFactor: 1.22 },

  // South India (50-53, 56-59, 60-64, 67-69)
  '500': { lat: 17.38, lon: 78.48, name: 'हैदराबाद (Hyderabad)', roadFactor: 1.20 },
  '520': { lat: 16.50, lon: 80.64, name: 'विजयवाड़ा (Vijayawada)', roadFactor: 1.22 },
  '530': { lat: 17.68, lon: 83.21, name: 'विशाखापट्टनम (Visakhapatnam)', roadFactor: 1.24 },
  '560': { lat: 12.97, lon: 77.59, name: 'बेंगलुरु (Bengaluru)', roadFactor: 1.22 },
  '570': { lat: 12.29, lon: 76.63, name: 'मैसूर (Mysuru)', roadFactor: 1.24 },
  '580': { lat: 15.36, lon: 75.12, name: 'हुबली-धारवाड़ (Hubballi)', roadFactor: 1.20 },
  '600': { lat: 13.08, lon: 80.27, name: 'चेन्नई (Chennai)', roadFactor: 1.22 },
  '641': { lat: 11.01, lon: 76.95, name: 'कोयंबटूर (Coimbatore)', roadFactor: 1.24 },
  '682': { lat: 9.93, lon: 76.26, name: 'कोच्चि (Kochi)', roadFactor: 1.25 },
  '695': { lat: 8.52, lon: 76.93, name: 'तिरुवनंतपुरम (Thiruvananthapuram)', roadFactor: 1.25 },
  '50': { lat: 17.50, lon: 78.50, name: 'तेलंगाना', roadFactor: 1.20 },
  '51': { lat: 15.00, lon: 78.00, name: 'आंध्र प्रदेश रायलसीमा', roadFactor: 1.22 },
  '52': { lat: 16.50, lon: 80.50, name: 'आंध्र प्रदेश तटीय', roadFactor: 1.22 },
  '53': { lat: 17.70, lon: 83.20, name: 'आंध्र प्रदेश उत्तर', roadFactor: 1.24 },
  '56': { lat: 13.00, lon: 77.50, name: 'कर्नाटक दक्षिण', roadFactor: 1.22 },
  '57': { lat: 13.00, lon: 75.50, name: 'कर्नाटक पश्चिम', roadFactor: 1.24 },
  '58': { lat: 15.50, lon: 75.50, name: 'कर्नाटक उत्तर', roadFactor: 1.20 },
  '60': { lat: 13.00, lon: 80.20, name: 'तमिलनाडु उत्तर', roadFactor: 1.22 },
  '62': { lat: 9.92, lon: 78.11, name: 'मदुरै / तमिलनाडु दक्षिण', roadFactor: 1.24 },
  '64': { lat: 11.00, lon: 77.00, name: 'तमिलनाडु पश्चिम', roadFactor: 1.24 },
  '67': { lat: 11.50, lon: 75.80, name: 'केरल उत्तर', roadFactor: 1.25 },
  '68': { lat: 10.00, lon: 76.30, name: 'केरल मध्य', roadFactor: 1.25 },
  '69': { lat: 8.50, lon: 76.90, name: 'केरल दक्षिण', roadFactor: 1.25 },

  // East & North East (70-74, 75-77, 78-79, 80-85)
  '700': { lat: 22.57, lon: 88.36, name: 'कोलकाता (Kolkata)', roadFactor: 1.22 },
  '711': { lat: 22.59, lon: 88.31, name: 'हावड़ा (Howrah)', roadFactor: 1.22 },
  '734': { lat: 26.72, lon: 88.43, name: 'सिलीगुड़ी (Siliguri)', roadFactor: 1.26 },
  '751': { lat: 20.29, lon: 85.82, name: 'भुवनेश्वर (Bhubaneswar)', roadFactor: 1.24 },
  '781': { lat: 26.14, lon: 91.73, name: 'गुवाहाटी (Guwahati)', roadFactor: 1.28 },
  '800': { lat: 25.59, lon: 85.13, name: 'पटना (Patna)', roadFactor: 1.22 },
  '834': { lat: 23.34, lon: 85.30, name: 'रांची (Ranchi)', roadFactor: 1.24 },
  '70': { lat: 22.57, lon: 88.36, name: 'पश्चिम बंगाल कोलकाता', roadFactor: 1.22 },
  '71': { lat: 23.20, lon: 87.80, name: 'पश्चिम बंगाल मध्य', roadFactor: 1.22 },
  '75': { lat: 20.30, lon: 85.80, name: 'ओडिशा', roadFactor: 1.24 },
  '78': { lat: 26.10, lon: 91.70, name: 'असम व पूर्वोत्तर', roadFactor: 1.28 },
  '80': { lat: 25.60, lon: 85.10, name: 'बिहार पटना', roadFactor: 1.22 },
  '82': { lat: 23.80, lon: 86.40, name: 'झारखंड धनबाद/बोकारो', roadFactor: 1.24 },
  '83': { lat: 23.30, lon: 85.30, name: 'झारखंड रांची/जमशेदपुर', roadFactor: 1.24 },
  '84': { lat: 26.10, lon: 85.40, name: 'बिहार मुजफ्फरपुर', roadFactor: 1.24 },
  '85': { lat: 25.80, lon: 87.50, name: 'बिहार पूर्णिया', roadFactor: 1.25 },
};

/**
 * Calculates authentic road distance (in km) from Shamgarh (458883) to ANY 6-digit Indian Pincode
 */
export const calculateAllIndiaPincodeRoadDistance = (
  pincode: string
): { km: number; label: string; zone: string } | null => {
  const pin = (pincode || '').replace(/\D/g, '');
  if (pin.length !== 6) return null;

  // Specific high-precision pincode overrides (exact verified kilometers)
  const EXACT_PINCODE_OVERRIDE: Record<string, { km: number; label: string; zone: string }> = {
    // Shamgarh & Immediate Local Villages
    '458883': { km: 1.8, label: 'शामगढ़ / फल्सावदिया लोकल', zone: 'लोकल' },
    '458888': { km: 17.5, label: 'गरोठ', zone: 'मंदसौर' },
    '458389': { km: 18.0, label: 'मेलखेड़ा', zone: 'मंदसौर' },
    '458880': { km: 22.0, label: 'सुवासरा', zone: 'मंदसौर' },
    '458775': { km: 38.0, label: 'भानपुरा', zone: 'मंदसौर' },
    '458778': { km: 48.0, label: 'गांधी सागर', zone: 'मंदसौर' },
    '458990': { km: 42.0, label: 'सीतामऊ', zone: 'मंदसौर' },
    '458558': { km: 52.0, label: 'दलोदा / ढोढर', zone: 'मंदसौर' },
    '458001': { km: 68.0, label: 'मंदसौर शहर', zone: 'मंदसौर' },
    '458002': { km: 72.0, label: 'मंदसौर ग्रामीण', zone: 'मंदसौर' },
    '458667': { km: 58.0, label: 'पिपलिया मंडी / मल्हारगढ़', zone: 'मंदसौर' },
    '458441': { km: 85.0, label: 'नीमच शहर', zone: 'नीमच' },
    '458771': { km: 75.0, label: 'मनासा / कुकड़ेश्वर', zone: 'नीमच' },
    '458220': { km: 92.0, label: 'जावद / सिंगोली', zone: 'नीमच' },
    '458110': { km: 54.0, label: 'रामपुरा', zone: 'नीमच' },

    // Rajasthan Border Towns (Near Shamgarh)
    '326502': { km: 38.0, label: 'भवानी मंडी', zone: 'झालावाड़' },
    '326515': { km: 28.0, label: 'डग / चौमहला', zone: 'झालावाड़' },
    '326514': { km: 40.0, label: 'सुनेल / पिड़ावा', zone: 'झालावाड़' },
    '326516': { km: 55.0, label: 'बकानी', zone: 'झालावाड़' },
    '326001': { km: 48.0, label: 'झालावाड़', zone: 'झालावाड़' },
    '326023': { km: 52.0, label: 'झालरापाटन', zone: 'झालावाड़' },
    '324001': { km: 115.0, label: 'कोटा', zone: 'कोटा' },
    '312001': { km: 130.0, label: 'चित्तौड़गढ़', zone: 'चित्तौड़गढ़' },

    // MP Major Cities
    '457001': { km: 120.0, label: 'रतलाम', zone: 'रतलाम' },
    '457226': { km: 85.0, label: 'जावरा', zone: 'रतलाम' },
    '456001': { km: 145.0, label: 'उज्जैन', zone: 'उज्जैन' },
    '456006': { km: 148.0, label: 'नागदा', zone: 'उज्जैन' },
    '452001': { km: 195.0, label: 'इंदौर', zone: 'इंदौर' },
    '453441': { km: 210.0, label: 'महू / Dr. Ambedkar Nagar', zone: 'इंदौर' },
    '462001': { km: 240.0, label: 'भोपाल', zone: 'भोपाल' },

    // Maharashtra Exact Pincodes
    '400012': { km: 725.0, label: 'परेल / मुंबई (Parel, Mumbai)', zone: 'महाराष्ट्र' },
    '400001': { km: 730.0, label: 'दक्षिण मुंबई (Fort, Mumbai)', zone: 'महाराष्ट्र' },
    '411001': { km: 755.0, label: 'पुणे शहर (Pune)', zone: 'महाराष्ट्र' },
    '110001': { km: 605.0, label: 'नई दिल्ली (New Delhi)', zone: 'दिल्ली' },
  };

  if (EXACT_PINCODE_OVERRIDE[pin]) {
    return EXACT_PINCODE_OVERRIDE[pin];
  }

  const prefix3 = pin.slice(0, 3);
  const prefix2 = pin.slice(0, 2);

  const hub = POSTAL_HUB_COORDINATES[prefix3] || POSTAL_HUB_COORDINATES[prefix2];
  if (!hub) return null;

  // Haversine formula from Shamgarh (24.1884° N, 75.6417° E)
  const STORE_LAT = 24.1884;
  const STORE_LON = 75.6417;

  const dLat = (hub.lat - STORE_LAT) * Math.PI / 180;
  const dLon = (hub.lon - STORE_LON) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(STORE_LAT * Math.PI / 180) * Math.cos(hub.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = 6371 * c;

  // Road factor converts straight line distance to authentic road kilometers
  const roadKm = Math.round(straightKm * (hub.roadFactor || 1.18));

  return {
    km: Math.max(1, roadKm),
    label: `${hub.name} (${pin})`,
    zone: hub.name,
  };
};

/**
 * Comprehensive regional and national distance estimator from Shamgarh / Falsawdiya Store Origin
 * Strictly adheres to Automatic System Calculation (No manual guessing)
 */
export const detectDeliveryDistance = (
  address: {
    pincode?: string;
    city?: string;
    tehsil?: string;
    district?: string;
    state?: string;
    street?: string;
    coords?: { lat: number; lng: number } | null;
  },
  config?: DynamicDeliveryConfig | null
): DistanceDetectionResult => {
  const cfg = config || DEFAULT_DELIVERY_CONFIG;
  const activeTehsils = (cfg.activeTehsils && cfg.activeTehsils.length > 0)
    ? cfg.activeTehsils
    : ['शामगढ़', 'गरोठ', 'सुवासरा', 'भानपुरा', 'सीतामऊ'];

  const UNAVAILABLE_MSG = 'क्षमा करें! आपके क्षेत्र में फल्सावदिया कृषि बाजार की स्थानीय डिलीवरी सेवा अभी उपलब्ध नहीं है। डिलीवरी केवल शामगढ़ व अधिकृत ग्रामीण क्षेत्रों में ही उपलब्ध है।';

  const isTehsilActive = (tehsilName?: string): boolean => {
    if (!tehsilName) return false;
    const cleanT = tehsilName.toLowerCase().trim();
    return activeTehsils.some(at => {
      const cleanAt = at.toLowerCase().trim();
      return cleanT.includes(cleanAt) || cleanAt.includes(cleanT);
    });
  };

  const cleanPin = (address.pincode || '').trim().replace(/\D/g, '');
  const isSixDigitPin = cleanPin.length === 6;
  const cityStr = (address.city || '').trim();
  const tehsilStr = (address.tehsil || '').trim();
  const distStr = (address.district || '').toLowerCase().trim();
  const stateStr = (address.state || '').toLowerCase().trim();

  // If Village / Town is not yet filled, do not mark as disabled or calculate prematurely
  if (!cityStr || cityStr.length < 2) {
    return {
      distanceKm: 0,
      formattedDistance: '0 km',
      isValidLocation: false,
      confidence: 'invalid',
      locationLabel: 'गांव / शहर दर्ज करें',
      source: 'village_directory',
      isLocal: false,
      isDeliveryDisabled: false,
      errorMessage: 'कृपया अपना गांव या शहर दर्ज करें',
      deliveryType: 'local',
      isCourierEligible: false,
    };
  }

  // 1. PINCODE ROAD DISTANCE CHECK (Local Area only - distance > 25 km is strictly out-of-delivery zone)
  const pinResult = isSixDigitPin ? calculateAllIndiaPincodeRoadDistance(cleanPin) : null;

  if (pinResult && pinResult.km > 25) {
    return {
      distanceKm: 0,
      formattedDistance: '0 km',
      isValidLocation: false,
      confidence: 'invalid',
      locationLabel: `${cityStr || tehsilStr || pinResult.label} (${cleanPin})`,
      source: 'pincode_matrix',
      isLocal: false,
      isDeliveryDisabled: true,
      disabledReason: UNAVAILABLE_MSG,
      errorMessage: UNAVAILABLE_MSG,
      deliveryType: 'local',
      isCourierEligible: false,
    };
  }

  // 2. SMART VILLAGE DIRECTORY MATCH (Strictly matching cityStr against local village directory)
  const villageList = getCombinedVillageDirectory(cfg.villageDirectory);
  const matchedVillage = cityStr ? findVillageMatch(cityStr, tehsilStr, villageList) : null;

  if (matchedVillage) {
    const isVillageActiveLocally = matchedVillage.isActive !== false && isTehsilActive(matchedVillage.tehsil);

    if (!isVillageActiveLocally) {
      return {
        distanceKm: 0,
        formattedDistance: '0 km',
        isValidLocation: false,
        confidence: 'invalid',
        locationLabel: `${matchedVillage.nameHi} (तहसील ${matchedVillage.tehsil})`,
        source: 'village_directory',
        isLocal: false,
        isDeliveryDisabled: true,
        disabledReason: UNAVAILABLE_MSG,
        errorMessage: UNAVAILABLE_MSG,
        deliveryType: 'local',
        isCourierEligible: false,
      };
    }

    return {
      distanceKm: matchedVillage.distanceKm,
      formattedDistance: `लगभग ${matchedVillage.distanceKm} km`,
      isValidLocation: true,
      confidence: 'exact',
      locationLabel: `${matchedVillage.nameHi} (तहसील ${matchedVillage.tehsil} - ${matchedVillage.distanceKm} km)`,
      source: 'village_directory',
      isLocal: matchedVillage.distanceKm <= 10,
      deliveryType: 'local',
      isCourierEligible: false,
    };
  }

  // 3. TEHSIL-LEVEL SAFE RESOLUTION (When a specific hamlet or custom locality in Tehsil is entered)
  const TEHSIL_CALIBRATION: Record<string, { km: number; label: string }> = {
    'शामगढ़': { km: 5.0, label: 'शामगढ़ तहसील ग्रामीण' },
    'गरोठ': { km: 17.5, label: 'गरोठ तहसील' },
    'सुवासरा': { km: 22.0, label: 'सुवासरा तहसील' },
    'भानपुरा': { km: 38.0, label: 'भानपुरा तहसील' },
    'सीतामऊ': { km: 42.0, label: 'सीतामऊ तहसील' },
    'चौमहला / डग': { km: 28.0, label: 'चौमहला / डग' },
    'डग': { km: 28.0, label: 'डग' },
    'चौमहला': { km: 28.0, label: 'चौमहला' },
    'पिड़ावा / सुनेल': { km: 40.0, label: 'पिड़ावा / सुनेल' },
    'पिड़ावा': { km: 40.0, label: 'पिड़ावा' },
    'सुनेल': { km: 40.0, label: 'सुनेल' },
    'भवानी मंडी': { km: 38.0, label: 'भवानी मंडी' },
    'मंदसौर': { km: 68.0, label: 'मंदसौर तहसील' },
  };

  if (tehsilStr && tehsilStr !== 'अन्य') {
    for (const [key, val] of Object.entries(TEHSIL_CALIBRATION)) {
      if (tehsilStr.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(tehsilStr.toLowerCase())) {
        const tehsilMatchesActive = isTehsilActive(key);

        if (!tehsilMatchesActive) {
          return {
            distanceKm: 0,
            formattedDistance: '0 km',
            isValidLocation: false,
            confidence: 'invalid',
            locationLabel: `${val.label} (${cityStr || tehsilStr})`,
            source: 'town_match',
            isLocal: false,
            isDeliveryDisabled: true,
            disabledReason: UNAVAILABLE_MSG,
            errorMessage: UNAVAILABLE_MSG,
            deliveryType: 'local',
            isCourierEligible: false,
          };
        }

        return {
          distanceKm: val.km,
          formattedDistance: `लगभग ${val.km} km`,
          isValidLocation: true,
          confidence: 'high',
          locationLabel: `${val.label} (${cityStr || tehsilStr})`,
          source: 'town_match',
          isLocal: val.km <= 10,
          deliveryType: 'local',
          isCourierEligible: false,
        };
      }
    }
  }

  // 4. Local Shamgarh Specific Area Granularity (Store Origin in Falsawdiya, Shamgarh)
  const cleanCity = cityStr.toLowerCase();
  const cleanTehsil = tehsilStr.toLowerCase();
  const isShamgarhLocality = cleanPin === '458883' ||
    cleanCity.includes('शामगढ़') || cleanCity.includes('shamgarh') ||
    cleanCity.includes('फल्सावदिया') || cleanCity.includes('falsawdiya') ||
    (cleanTehsil.includes('शामगढ़') && (!cleanPin || cleanPin === '458883'));

  if (isShamgarhLocality) {
    if (cleanCity.includes('फल्सावदिया') || cleanCity.includes('falsawdiya')) {
      return {
        distanceKm: 0.8,
        formattedDistance: 'लगभग 0.8 km',
        isValidLocation: true,
        confidence: 'high',
        locationLabel: 'फल्सावदिया (लोकल दुकान क्षेत्र - 458883)',
        source: 'town_match',
        isLocal: true,
        deliveryType: 'local',
        isCourierEligible: false,
      };
    }
    if (cleanCity.includes('चंदवासा') || cleanCity.includes('chandwasa')) {
      return {
        distanceKm: 9.5,
        formattedDistance: 'लगभग 9.5 km',
        isValidLocation: true,
        confidence: 'high',
        locationLabel: 'चंदवासा (458883)',
        source: 'town_match',
        isLocal: true,
        deliveryType: 'local',
        isCourierEligible: false,
      };
    }
    if (cleanCity.includes('बोलिया') || cleanCity.includes('bolia')) {
      return {
        distanceKm: 10.5,
        formattedDistance: 'लगभग 10.5 km',
        isValidLocation: true,
        confidence: 'high',
        locationLabel: 'बोलिया (458883)',
        source: 'town_match',
        isLocal: false,
        deliveryType: 'local',
        isCourierEligible: false,
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
      deliveryType: 'local',
      isCourierEligible: false,
    };
  }

  // 5. Major Town/City matches in address text (Road Distances from Shamgarh)
  const fullLoc = `${cityStr} ${tehsilStr} ${distStr} ${stateStr}`.trim();
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
  ];

  for (const item of TOWN_MATCHES) {
    if (item.pattern.test(fullLoc)) {
      if (item.km > 25) {
        return {
          distanceKm: 0,
          formattedDistance: '0 km',
          isValidLocation: false,
          confidence: 'invalid',
          locationLabel: item.label,
          source: 'town_match',
          isLocal: false,
          isDeliveryDisabled: true,
          disabledReason: UNAVAILABLE_MSG,
          errorMessage: UNAVAILABLE_MSG,
          deliveryType: 'local',
          isCourierEligible: false,
        };
      }

      return {
        distanceKm: item.km,
        formattedDistance: `लगभग ${item.km} km`,
        isValidLocation: true,
        confidence: 'high',
        locationLabel: item.label,
        source: 'town_match',
        isLocal: item.km <= 10,
        deliveryType: 'local',
        isCourierEligible: false,
      };
    }
  }

  // 6. Outside local area or unknown location - strictly return unavailable
  return {
    distanceKm: 0,
    formattedDistance: '0 km',
    isValidLocation: false,
    confidence: 'invalid',
    locationLabel: cityStr ? `${cityStr} (${cleanPin || 'क्षेत्र'})` : 'लोकेशन अज्ञात',
    source: 'unknown',
    isLocal: false,
    isDeliveryDisabled: true,
    disabledReason: UNAVAILABLE_MSG,
    errorMessage: UNAVAILABLE_MSG,
    deliveryType: 'local',
    isCourierEligible: false,
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
  cartTotalOrConfig?: number | DynamicDeliveryConfig | null,
  deliveryTypeOption?: 'local' | 'courier' | null
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
  // 1. FIXED STANDARD FALLBACK (When dynamic matrix is toggled off)
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
      deliveryType: 'local',
      isServiceable: true,
    };
  }

  // 3. Find matched vehicle and weight slab
  const { weightSlab, vehicle } = findWeightSlabAndVehicle(safeWeight, cfg);

  // 4. Find matched distance slab
  const distanceSlab = findDistanceSlab(safeDistance, cfg);

  // 5. Lookup rate in matrix
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

  // 6. Check Free Delivery Eligibility
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
    deliveryType: 'local',
    isServiceable: true,
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
      deliveryType: quote.deliveryType || 'local',
      courierPartnerName: quote.courierPartnerName,
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
    deliveryType: quote.deliveryType || 'local',
    courierPartnerName: quote.courierPartnerName,
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
