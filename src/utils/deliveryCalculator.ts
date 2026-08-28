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

/**
 * Parses weight in kg from unit strings like:
 * "50 kg", "25 kg बैग", "500 gm", "100 ग्राम", "5 Ltr", "250 ml", "1 क्विंटल", "1 टन"
 */
export const parseWeightFromUnit = (unitStr?: string): number => {
  if (!unitStr || typeof unitStr !== 'string') return 1.0;

  const raw = unitStr.toLowerCase().trim();

  // 1. Check Quintal / क्विंटल (100 kg)
  const quintalMatch = raw.match(/([\d.]+)\s*(?:क्विंटल|quintal|qtl)/i);
  if (quintalMatch && quintalMatch[1]) {
    const val = parseFloat(quintalMatch[1]);
    if (!isNaN(val) && val > 0) return val * 100;
  }
  if (raw.includes('क्विंटल') || raw.includes('quintal')) {
    return 100;
  }

  // 2. Check Ton / टन (1000 kg)
  const tonMatch = raw.match(/([\d.]+)\s*(?:टन|ton|tonne)/i);
  if (tonMatch && tonMatch[1]) {
    const val = parseFloat(tonMatch[1]);
    if (!isNaN(val) && val > 0) return val * 1000;
  }

  // 3. Check Kilogram (kg, kgs, किग्रा, किलोग्राम, किलो)
  const kgMatch = raw.match(/([\d.]+)\s*(?:kg|kgs|किग्रा|किलोग्राम|किलो|kilo)/i);
  if (kgMatch && kgMatch[1]) {
    const val = parseFloat(kgMatch[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  // 4. Check Grams (gm, gms, g, ग्राम, ग्रम)
  const gmMatch = raw.match(/([\d.]+)\s*(?:gm|gms|g|ग्राम|ग्रम)/i);
  if (gmMatch && gmMatch[1]) {
    const val = parseFloat(gmMatch[1]);
    if (!isNaN(val) && val > 0) return Math.max(0.01, val / 1000);
  }

  // 5. Check Liters (Ltr, Litre, लीटर, l) -> Density ~ 1 kg per liter for agri liquids
  const ltrMatch = raw.match(/([\d.]+)\s*(?:ltr|litre|liter|लीटर|ली|l)/i);
  if (ltrMatch && ltrMatch[1]) {
    const val = parseFloat(ltrMatch[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  // 6. Check Milliliters (ml, मिली, मिलीलीटर)
  const mlMatch = raw.match(/([\d.]+)\s*(?:ml|मिलीलीटर|मिली|मि\.ली\.)/i);
  if (mlMatch && mlMatch[1]) {
    const val = parseFloat(mlMatch[1]);
    if (!isNaN(val) && val > 0) return Math.max(0.01, val / 1000);
  }

  // 7. Check plain number in string if unit words exist
  const numberMatch = raw.match(/([\d.]+)/);
  if (numberMatch && numberMatch[1]) {
    const val = parseFloat(numberMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 5000) {
      return val;
    }
  }

  return 1.0; // Standard fallback: 1 kg per item
};

/**
 * Returns single product weight in kg
 */
export const getProductWeightInKg = (product: Partial<Product>): number => {
  if (typeof product.weightInKg === 'number' && product.weightInKg > 0) {
    return product.weightInKg;
  }
  return parseWeightFromUnit(product.unit);
};

/**
 * Calculates the total weight in kg of a list of cart items
 */
export const calculateCartTotalWeight = (items: CartItem[]): number => {
  if (!items || items.length === 0) return 0;

  const total = items.reduce((sum, item) => {
    const unitWeight = item.weightInKg !== undefined && item.weightInKg > 0
      ? item.weightInKg
      : getProductWeightInKg(item.product);
    return sum + (unitWeight * (item.quantity || 1));
  }, 0);

  // Round to 2 decimal places
  return Math.round(total * 100) / 100;
};

/**
 * Calculates the total weight in kg of order items
 */
export const calculateOrderTotalWeight = (items: OrderItem[]): number => {
  if (!items || items.length === 0) return 0;

  const total = items.reduce((sum, item) => {
    const unitWeight = item.weightInKg !== undefined && item.weightInKg > 0
      ? item.weightInKg
      : parseWeightFromUnit(item.unit);
    return sum + (unitWeight * (item.quantity || 1));
  }, 0);

  return Math.round(total * 100) / 100;
};

/**
 * Estimates delivery distance in km based on pincode or city/district
 */
export const estimateDeliveryDistance = (
  pincode: string = '',
  city: string = '',
  district: string = '',
  config?: DynamicDeliveryConfig
): number => {
  const cfg = config || DEFAULT_DELIVERY_CONFIG;
  const cleanPin = (pincode || '').trim();

  // 1. Direct match in pincode presets
  if (cleanPin && cfg.pincodeDistances && cfg.pincodeDistances[cleanPin] !== undefined) {
    return cfg.pincodeDistances[cleanPin];
  }

  // 2. Same store origin pincode
  if (cleanPin && cleanPin === cfg.storeOrigin.pincode) {
    return 4; // Local delivery inside Shamgarh / Falsawdiya
  }

  // 3. Known city/town text matching in Mandsaur/Malwa region
  const loc = `${city} ${district}`.toLowerCase();
  if (loc.includes('shamgarh') || loc.includes('शामगढ़') || loc.includes('falsawdiya') || loc.includes('फल्सावदिया') || loc.includes('चन्दवासा') || loc.includes('chandwasa')) {
    return 5;
  }
  if (loc.includes('bolia') || loc.includes('बोलिया') || loc.includes('अकोदिया') || loc.includes('बरखेड़ा')) {
    return 8;
  }
  if (loc.includes('garoth') || loc.includes('गरोठ') || loc.includes('मेलखेड़ा') || loc.includes('melkheda')) {
    return 18;
  }
  if (loc.includes('suwasra') || loc.includes('सुवासरा') || loc.includes('रुनिजा')) {
    return 22;
  }
  if (loc.includes('bhanpura') || loc.includes('भानपुरा') || loc.includes('navali') || loc.includes('नवली')) {
    return 35;
  }
  if (loc.includes('sitamau') || loc.includes('सीतामऊ')) {
    return 42;
  }
  if (loc.includes('gandhi sagar') || loc.includes('गांधी सागर') || loc.includes('bhawani mandi') || loc.includes('भवानी मंडी')) {
    return 45;
  }
  if (loc.includes('mandsaur') || loc.includes('मंदसौर') || loc.includes('neemuch') || loc.includes('नीमच')) {
    return 65;
  }

  // 4. Pin code difference heuristic if 6 digits
  if (cleanPin.length === 6 && /^\d+$/.test(cleanPin)) {
    const originPin = parseInt(cfg.storeOrigin.pincode) || 458883;
    const destPin = parseInt(cleanPin);
    const diff = Math.abs(destPin - originPin);

    if (diff === 0) return 5;
    if (diff <= 5) return 12;
    if (diff <= 15) return 25;
    if (diff <= 100) return 40;
    if (diff <= 500) return 65;
    return 95;
  }

  // Default fallback distance
  return 10;
};

/**
 * Finds the matching Weight Slab and Vehicle for a given total weight in kg
 */
export const findWeightSlabAndVehicle = (
  weightKg: number,
  config: DynamicDeliveryConfig
): { weightSlab: WeightSlab; vehicle: VehicleConfig } => {
  const safeWeight = Math.max(0, weightKg);
  const sortedSlabs = [...(config.weightSlabs || [])].sort((a, b) => a.minWeightKg - b.minWeightKg);

  // Match slab
  let matchedSlab = sortedSlabs.find(
    slab => safeWeight >= slab.minWeightKg && safeWeight <= slab.maxWeightKg
  );

  // Fallback to highest slab if weight exceeds all
  if (!matchedSlab && sortedSlabs.length > 0) {
    matchedSlab = sortedSlabs[sortedSlabs.length - 1];
  }

  // Default slab if none configured
  if (!matchedSlab) {
    matchedSlab = {
      id: 'ws_1',
      minWeightKg: 0,
      maxWeightKg: 10,
      vehicleId: 'bike',
      label: '0–10 किग्रा (Bike)',
    };
  }

  // Find vehicle
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

  // If dynamic delivery is completely disabled by admin, return fallback fixed charge
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

  // If rate missing in matrix, compute standard intelligent fallback
  if (typeof baseCharge !== 'number' || baseCharge < 0) {
    // Standard reasonable baseline
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
    ? `ऑर्डर मूल्य (₹${cartTotal}) न्यूनतम ₹${cfg.freeDeliveryThreshold} से अधिक है अतः डिलीवरी शुल्क शून्य (FREE) किया गया।`
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
  return estimateDeliveryDistance(pincode, '', '', config);
};
