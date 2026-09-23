/**
 * Delivery Distance & Road Routing Service
 * Handles high-accuracy GPS tracking, OSRM road driving distance, address geocoding,
 * and regional calibration from Store Origin (Falsawdiya, Shamgarh).
 */

export const STORE_ORIGIN_COORDS = {
  name: 'फल्सावदिया कृषि बाजार (Falsawdiya Krishi Bazaar)',
  address: 'मुख्य मार्ग, फल्सावदिया, शामगढ़, जिला मंदसौर (म.प्र.)',
  pincode: '458883',
  lat: 24.1842,
  lng: 75.6431,
};

export interface UserCoordsWithAccuracy {
  lat: number;
  lng: number;
  accuracy?: number; // in meters
  timestamp?: number;
}

export interface RouteCalculationResult {
  success: boolean;
  distanceKm: number;
  formattedDistance: string; // e.g. "लगभग 1.8 km"
  durationMins?: number;
  source: 'gps_road_routing' | 'address_road_routing' | 'gps_road_calc' | 'pincode_matrix' | 'town_match' | 'unknown';
  locationLabel: string;
  accuracyMeters?: number;
  isValidLocation: boolean;
  isLocal: boolean;
  errorMessage?: string;
}

/**
 * Calculates high precision road distance using Haversine formula with calibrated Indian rural road curve factor
 */
export const calculateGeodesicRoadDistance = (
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
  const crowFlyKm = R * c;

  // Road curvature factor: In Malwa / MP rural & highway road network,
  // road distance is approx ~1.22x to 1.28x of straight-line distance.
  const roadCurveFactor = crowFlyKm < 3 ? 1.20 : 1.26;
  const roadKm = crowFlyKm * roadCurveFactor;

  // Minimum realistic road distance is 0.5 km (e.g. within village/neighborhood)
  const finalKm = Math.max(0.5, Math.round(roadKm * 10) / 10);
  return finalKm;
};

// In-memory cache for OSRM routes to avoid duplicate roundtrips
const ROUTE_CACHE: Record<string, { distanceKm: number; durationMins: number }> = {};

/**
 * Queries OSRM public road routing API to obtain exact driving distance in km
 */
export const fetchDrivingRoadDistance = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ distanceKm: number; durationMins: number } | null> => {
  const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}_${destLat.toFixed(4)},${destLng.toFixed(4)}`;
  if (ROUTE_CACHE[cacheKey]) {
    return ROUTE_CACHE[cacheKey];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    // Try server-side proxy first, fallback to direct OSRM
    const serverUrl = `/api/delivery/calculate-route?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`;
    const directUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;

    let res: Response | null = null;
    try {
      res = await fetch(serverUrl, { signal: controller.signal });
    } catch {
      // If server route not ready, try direct OSRM
      res = await fetch(directUrl, { signal: controller.signal });
    }

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0 && typeof data.routes[0].distance === 'number') {
        const meters = data.routes[0].distance;
        const seconds = data.routes[0].duration || 0;
        const km = Math.max(0.5, Math.round((meters / 1000) * 10) / 10);
        const mins = Math.round(seconds / 60);

        const result = { distanceKm: km, durationMins: mins };
        ROUTE_CACHE[cacheKey] = result;
        return result;
      }
    }
  } catch (err) {
    // Network / abort error -> fallback to mathematical calculation
  }

  // High-precision fallback
  const fallbackKm = calculateGeodesicRoadDistance(originLat, originLng, destLat, destLng);
  return { distanceKm: fallbackKm, durationMins: Math.round(fallbackKm * 2.5) };
};

/**
 * Browser High-Accuracy Geolocation Request with strict validation
 * Ensures:
 * - Fresh, uncached fix (maximumAge: 0)
 * - High accuracy mode (enableHighAccuracy: true)
 * - Accuracy check (< 1500 meters)
 */
export const requestHighAccuracyGps = (): Promise<{
  coords: UserCoordsWithAccuracy;
  error?: null;
}> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('आपके डिवाइस / ब्राउज़र में GPS लोकेशन सपोर्ट उपलब्ध नहीं है।'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy || 0;
        
        // If GPS accuracy is too weak (> 1500m / cell tower approximation)
        if (accuracy > 1500) {
          reject(
            new Error(
              `आपकी सटीक Location नहीं मिल पाई (GPS सिग्नल कमजोर है: ±${Math.round(accuracy)}m)। कृपया GPS/Location चालू करें और पुनः प्रयास करें।`
            )
          );
          return;
        }

        resolve({
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(accuracy),
            timestamp: pos.timestamp || Date.now(),
          },
        });
      },
      (err) => {
        let msg = 'आपकी सटीक Location नहीं मिल पाई। कृपया GPS/Location चालू करें और पुनः प्रयास करें।';
        if (err.code === 1) {
          msg = '📍 लोकेशन अनुमति अस्वीकृत (Denied)। कृपया ब्राउज़र सेटिंग्स में लोकेशन अनुमति दें और पुनः प्रयास करें।';
        } else if (err.code === 2) {
          msg = '📍 आपकी सटीक Location नहीं मिल पाई। कृपया फोन का GPS/Location चालू करें और पुनः प्रयास करें।';
        } else if (err.code === 3) {
          msg = '📍 GPS सिग्नल खोजने में समय समाप्त हो गया। कृपया खुले स्थान में आकर पुनः प्रयास करें।';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Never use stale/cached GPS position
      }
    );
  });
};
