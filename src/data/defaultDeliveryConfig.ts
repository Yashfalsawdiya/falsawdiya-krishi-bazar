import { DynamicDeliveryConfig } from '../types';

export const DEFAULT_DELIVERY_CONFIG: DynamicDeliveryConfig = {
  isEnabled: true,
  isDeliveryActive: true,
  defaultFixedCharge: 40,
  enableFreeDelivery: false,
  freeDeliveryThreshold: 0,
  storeOrigin: {
    name: 'फल्सावदिया कृषि बाजार (Falsawdiya Krishi Bazaar)',
    address: 'फल्सावदिया, मुख्य बस स्टैंड के पास',
    city: 'शामगढ़',
    district: 'मंदसौर',
    state: 'मध्यप्रदेश',
    pincode: '458883',
    latitude: 24.1842,
    longitude: 75.6431,
  },
  vehicles: [
    {
      id: 'bike',
      name: 'बाइक / मोटरसाइकिल (Bike)',
      shortName: 'Bike',
      icon: '🛵',
      description: 'छोटे व हल्के ऑर्डर्स (0 से 10 किग्रा)',
      maxCapacityKg: 10,
      isActive: true,
      order: 1,
    },
    {
      id: 'e_rickshaw',
      name: 'ई-रिक्शा (E-Rickshaw)',
      shortName: 'E-Rickshaw',
      icon: '🛺',
      description: 'मध्यम वजन वाले ऑर्डर्स (10 से 30 किग्रा)',
      maxCapacityKg: 30,
      isActive: true,
      order: 2,
    },
    {
      id: 'pickup',
      name: 'पिकअप (Pickup 4x4 / Bolero)',
      shortName: 'Pickup',
      icon: '🛻',
      description: 'भारी / हेवी ऑर्डर्स (30 से 100 किग्रा)',
      maxCapacityKg: 100,
      isActive: true,
      order: 3,
    },
    {
      id: 'tempo',
      name: 'छोटा हाथी / टेम्पो (Tempo)',
      shortName: 'Tempo',
      icon: '🚚',
      description: 'बल्क / ज्यादा वजन वाले ऑर्डर्स (100 से 300 किग्रा)',
      maxCapacityKg: 300,
      isActive: true,
      order: 4,
    },
    {
      id: 'truck',
      name: 'ट्रक / भारी लोडर (Truck)',
      shortName: 'Truck',
      icon: '🚛',
      description: 'अत्यधिक बड़े बल्क ऑर्डर्स (300+ किग्रा)',
      maxCapacityKg: 5000,
      isActive: true,
      order: 5,
    },
  ],
  weightSlabs: [
    {
      id: 'ws_1',
      minWeightKg: 0,
      maxWeightKg: 10,
      vehicleId: 'bike',
      label: '0–10 किग्रा (Bike)',
    },
    {
      id: 'ws_2',
      minWeightKg: 10.001,
      maxWeightKg: 30,
      vehicleId: 'e_rickshaw',
      label: '10–30 किग्रा (E-Rickshaw)',
    },
    {
      id: 'ws_3',
      minWeightKg: 30.001,
      maxWeightKg: 100,
      vehicleId: 'pickup',
      label: '30–100 किग्रा (Pickup)',
    },
    {
      id: 'ws_4',
      minWeightKg: 100.001,
      maxWeightKg: 300,
      vehicleId: 'tempo',
      label: '100–300 किग्रा (Tempo)',
    },
    {
      id: 'ws_5',
      minWeightKg: 300.001,
      maxWeightKg: 99999,
      vehicleId: 'truck',
      label: '300+ किग्रा (Truck)',
    },
  ],
  distanceSlabs: [
    {
      id: 'ds_1',
      minDistanceKm: 0,
      maxDistanceKm: 5,
      label: '0–5 किमी',
    },
    {
      id: 'ds_2',
      minDistanceKm: 5.001,
      maxDistanceKm: 15,
      label: '5–15 किमी',
    },
    {
      id: 'ds_3',
      minDistanceKm: 15.001,
      maxDistanceKm: 30,
      label: '15–30 किमी',
    },
    {
      id: 'ds_4',
      minDistanceKm: 30.001,
      maxDistanceKm: 50,
      label: '30–50 किमी',
    },
    {
      id: 'ds_5',
      minDistanceKm: 50.001,
      maxDistanceKm: 99999,
      label: '50+ किमी',
    },
  ],
  rateMatrix: {
    // Bike Rates
    'bike_ds_1': 30,
    'bike_ds_2': 50,
    'bike_ds_3': 80,
    'bike_ds_4': 140,
    'bike_ds_5': 220,

    // E-Rickshaw Rates
    'e_rickshaw_ds_1': 60,
    'e_rickshaw_ds_2': 100,
    'e_rickshaw_ds_3': 180,
    'e_rickshaw_ds_4': 300,
    'e_rickshaw_ds_5': 480,

    // Pickup Rates
    'pickup_ds_1': 150,
    'pickup_ds_2': 250,
    'pickup_ds_3': 400,
    'pickup_ds_4': 650,
    'pickup_ds_5': 1000,

    // Tempo Rates
    'tempo_ds_1': 250,
    'tempo_ds_2': 400,
    'tempo_ds_3': 650,
    'tempo_ds_4': 1000,
    'tempo_ds_5': 1600,

    // Truck Rates
    'truck_ds_1': 600,
    'truck_ds_2': 900,
    'truck_ds_3': 1400,
    'truck_ds_4': 2200,
    'truck_ds_5': 3500,
  },
  pincodeDistances: {
    '458883': 3, // Shamgarh / Falsawdiya local
    '458888': 18, // Garoth
    '458880': 22, // Suwasra
    '458775': 35, // Bhanpura
    '458990': 42, // Sitamau
    '458001': 65, // Mandsaur city
    '458389': 28, // Melkheda
    '458778': 48, // Gandhi Sagar
    '326502': 38, // Bhawani Mandi
    '326501': 45, // Jhalawar border
  },
  lastUpdated: Date.now(),
};
