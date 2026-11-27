import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface HourlyWeatherPoint {
  time: string;
  timeIso: string;
  weatherCode: number;
  temp: number;
  feelsLike?: number;
  dewPoint?: number;
  humidity?: number;
  windSpeed?: number;
  windGusts?: number;
  windDirection?: number;
  rainProb: number;
  rainMm?: number;
  cloudCover?: number;
  visibility?: number;
  uvIndex?: number;
  cape?: number;
  condition: string;
  isNight: boolean;
}

export interface DailyWeatherPoint {
  day: string;
  dateStr: string;
  weatherCode?: number;
  temp: string;
  maxTemp: string;
  minTemp: string;
  feelsLikeMax?: number;
  feelsLikeMin?: number;
  condition: string;
  rainProb?: number;
  rainMm?: number;
  windSpeedMax?: number;
  windGustsMax?: number;
  windDirection?: number;
  uvIndexMax?: number;
  et0?: number;
  sunrise?: string;
  sunset?: string;
}

export interface WeatherForecastPayload {
  temp: number;
  feelsLike?: number;
  dewPoint?: number;
  condition: string;
  weatherCode?: number;
  humidity: number;
  windSpeed: number;
  windGusts?: number;
  windDirection?: number;
  rain: number;
  cloudCover?: number;
  pressure?: number;
  visibility?: number;
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
  et0?: number;
  soilTemp0cm?: number;
  soilMoisture?: number;
  past7DaysRainMm?: number;
  consecutiveDryDays?: number;
  maxTemp: number;
  minTemp: number;
  dateStr: string;
  forecast: DailyWeatherPoint[];
  hourly: HourlyWeatherPoint[];
  hourlyOutlook?: HourlyWeatherPoint[];
  source: 'Open-Meteo' | 'wttr.in' | 'Cache' | 'Fallback';
  fetchedAt: number;
  isStale?: boolean;
  isFallback?: boolean;
  latitude: number;
  longitude: number;
}

export interface OfficialWeatherWarning {
  id: string;
  event: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  urgency: string;
  certainty: string;
  sender: string;
  headline: string;
  description: string;
  instruction: string;
  areaDesc: string;
  effective?: string;
  expires?: string;
  sent?: string;
  isLocalMatch: boolean;
  link?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const WEATHER_CACHE_FILE = path.join(DATA_DIR, 'weather-cache.json');
const WARNINGS_CACHE_FILE = path.join(DATA_DIR, 'weather-warnings-cache.json');

const FORECAST_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes shared cache
const WARNINGS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes CAP warning cache

const HINDI_DAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

const CONDITION_MAP: Record<number, string> = {
  0: 'साफ आसमान',
  1: 'मुख्यतः साफ',
  2: 'आंशिक बादल',
  3: 'घने बादल',
  45: 'कोहरा',
  48: 'घना कोहरा',
  51: 'हल्की बूंदाबांदी',
  53: 'बूंदाबांदी',
  55: 'तेज बूंदाबांदी',
  56: 'ठंडी बूंदाबांदी',
  57: 'तेज ठंडी बूंदाबांदी',
  61: 'हल्की बारिश',
  63: 'बारिश',
  65: 'तेज बारिश',
  66: 'ठंडी बारिश',
  67: 'तेज ठंडी बारिश',
  71: 'हल्का हिमपात',
  73: 'हिमपात',
  75: 'तेज हिमपात',
  77: 'बर्फ के दाने',
  80: 'हल्की बौछारें',
  81: 'बौछारें',
  82: 'तेज बौछारें',
  85: 'हल्की बर्फ बौछार',
  86: 'तेज बर्फ बौछार',
  95: 'गरज के साथ वर्षा',
  96: 'गरज और हल्के ओले',
  99: 'गरज और भारी ओले',
};

const forecastMemoryCache = new Map<string, WeatherForecastPayload>();

// Restore disk forecast cache on startup
try {
  if (fs.existsSync(WEATHER_CACHE_FILE)) {
    const raw = fs.readFileSync(WEATHER_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, WeatherForecastPayload>;
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([k, v]) => {
        if (v && typeof v.temp === 'number' && Array.isArray(v.forecast)) {
          forecastMemoryCache.set(k, v);
        }
      });
    }
  }
} catch {
  // Ignore corrupted disk cache
}

const persistForecastCache = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const entries = Array.from(forecastMemoryCache.entries()).slice(-20);
    fs.writeFileSync(WEATHER_CACHE_FILE, JSON.stringify(Object.fromEntries(entries), null, 2), 'utf-8');
  } catch {
    // Ignored in read-only serverless environments
  }
};

interface WarningsCacheState {
  checkedAt: number;
  etag?: string;
  warnings: OfficialWeatherWarning[];
  feedStatus: 'ok' | 'unavailable';
}

let warningsMemoryCache: WarningsCacheState | null = null;

try {
  if (fs.existsSync(WARNINGS_CACHE_FILE)) {
    const raw = fs.readFileSync(WARNINGS_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as WarningsCacheState;
    if (parsed && typeof parsed.checkedAt === 'number' && Array.isArray(parsed.warnings)) {
      warningsMemoryCache = parsed;
    }
  }
} catch {
  // Ignore
}

const persistWarningsCache = (state: WarningsCacheState) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(WARNINGS_CACHE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Ignore
  }
};

function parseHindiDayFromYmd(ymd: string): string {
  const parts = ymd.split('-').map((n) => parseInt(n, 10));
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
    const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    return HINDI_DAYS[d.getDay()] || 'सोमवार';
  }
  return 'सोमवार';
}

function formatIsoClock12h(isoTime: string): string {
  const match = isoTime.match(/T(\d{2}):(\d{2})/);
  if (!match) return isoTime;
  const h24 = parseInt(match[1], 10);
  const min = match[2];
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min} ${suffix}`;
}

function getTodayYmdInOffset(utcOffsetSeconds: number): string {
  const shifted = new Date(Date.now() + utcOffsetSeconds * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentHourPrefixInOffset(utcOffsetSeconds: number): string {
  const shifted = new Date(Date.now() + utcOffsetSeconds * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  const h = String(shifted.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}`;
}

async function fetchFromOpenMeteo(lat: number, lon: number): Promise<WeatherForecastPayload> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,pressure_msl,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,et0_fao_evapotranspiration,soil_temperature_0cm,soil_moisture_0_to_1cm,cape` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,et0_fao_evapotranspiration` +
    `&timezone=auto&past_days=7&forecast_days=8`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }
    const data = await res.json();
    const utcOffsetSec = typeof data.utc_offset_seconds === 'number' ? data.utc_offset_seconds : 19800;
    const todayYmd = getTodayYmdInOffset(utcOffsetSec);
    const currentHourPrefix = getCurrentHourPrefixInOffset(utcOffsetSec);

    const dailyTimes: string[] = Array.isArray(data.daily?.time) ? data.daily.time : [];
    let todayDailyIdx = dailyTimes.findIndex((d) => d === todayYmd);
    if (todayDailyIdx === -1) {
      todayDailyIdx = Math.max(0, dailyTimes.length - 8);
    }

    // Past 7 days rainfall & dry days count (using indices before todayDailyIdx)
    const pastIndices = dailyTimes.slice(0, todayDailyIdx);
    let past7DaysRainMm = 0;
    let consecutiveDryDays = 0;
    for (let i = pastIndices.length - 1; i >= 0; i--) {
      const rainDay = Number(data.daily?.precipitation_sum?.[i] ?? 0);
      past7DaysRainMm += rainDay;
      if (rainDay < 1.0 && consecutiveDryDays === pastIndices.length - 1 - i) {
        consecutiveDryDays++;
      }
    }
    // Include today so far if 0 rain
    const todayRainSoFar = Number(data.daily?.precipitation_sum?.[todayDailyIdx] ?? 0);
    if (todayRainSoFar < 1.0 && consecutiveDryDays === pastIndices.length) {
      consecutiveDryDays++;
    }

    // Build 7-day future forecast starting tomorrow
    const forecast: DailyWeatherPoint[] = dailyTimes
      .slice(todayDailyIdx + 1, todayDailyIdx + 8)
      .map((dateStr: string, offsetIdx: number) => {
        const idx = todayDailyIdx + 1 + offsetIdx;
        const wCode = data.daily?.weather_code?.[idx];
        const maxT = Math.round(Number(data.daily?.temperature_2m_max?.[idx] ?? 0));
        const minT = Math.round(Number(data.daily?.temperature_2m_min?.[idx] ?? 0));
        return {
          day: parseHindiDayFromYmd(dateStr),
          dateStr,
          weatherCode: typeof wCode === 'number' ? wCode : undefined,
          temp: `${maxT}°C`,
          maxTemp: `${maxT}°C`,
          minTemp: `${minT}°C`,
          feelsLikeMax:
            data.daily?.apparent_temperature_max?.[idx] !== undefined
              ? Math.round(data.daily.apparent_temperature_max[idx])
              : undefined,
          feelsLikeMin:
            data.daily?.apparent_temperature_min?.[idx] !== undefined
              ? Math.round(data.daily.apparent_temperature_min[idx])
              : undefined,
          condition: CONDITION_MAP[wCode] || 'साफ आसमान',
          rainProb:
            typeof data.daily?.precipitation_probability_max?.[idx] === 'number'
              ? data.daily.precipitation_probability_max[idx]
              : undefined,
          rainMm:
            typeof data.daily?.precipitation_sum?.[idx] === 'number'
              ? Number(data.daily.precipitation_sum[idx].toFixed(1))
              : undefined,
          windSpeedMax:
            typeof data.daily?.wind_speed_10m_max?.[idx] === 'number'
              ? Math.round(data.daily.wind_speed_10m_max[idx])
              : undefined,
          windGustsMax:
            typeof data.daily?.wind_gusts_10m_max?.[idx] === 'number'
              ? Math.round(data.daily.wind_gusts_10m_max[idx])
              : undefined,
          windDirection:
            typeof data.daily?.wind_direction_10m_dominant?.[idx] === 'number'
              ? Math.round(data.daily.wind_direction_10m_dominant[idx])
              : undefined,
          uvIndexMax:
            typeof data.daily?.uv_index_max?.[idx] === 'number'
              ? Number(data.daily.uv_index_max[idx].toFixed(1))
              : undefined,
          et0:
            typeof data.daily?.et0_fao_evapotranspiration?.[idx] === 'number'
              ? Number(data.daily.et0_fao_evapotranspiration[idx].toFixed(1))
              : undefined,
          sunrise: data.daily?.sunrise?.[idx],
          sunset: data.daily?.sunset?.[idx],
        };
      });

    // Sunrise/sunset lookup map by YYYY-MM-DD
    const sunByDate = new Map<string, { sunriseNum: number; sunsetNum: number }>();
    dailyTimes.forEach((dStr: string, i: number) => {
      const sr = data.daily?.sunrise?.[i];
      const ss = data.daily?.sunset?.[i];
      if (sr && ss) {
        const srNum = Number(sr.replace(/[-:T]/g, '').slice(0, 12));
        const ssNum = Number(ss.replace(/[-:T]/g, '').slice(0, 12));
        if (!isNaN(srNum) && !isNaN(ssNum)) {
          sunByDate.set(dStr, { sunriseNum: srNum, sunsetNum: ssNum });
        }
      }
    });

    const hourlyTimes: string[] = Array.isArray(data.hourly?.time) ? data.hourly.time : [];
    let currentHourlyIdx = hourlyTimes.findIndex((t) => t.startsWith(currentHourPrefix));
    if (currentHourlyIdx === -1) {
      currentHourlyIdx = Math.max(0, hourlyTimes.findIndex((t) => t.startsWith(todayYmd)));
    }

    const mapHourlySlice = (startIdx: number, count: number): HourlyWeatherPoint[] =>
      hourlyTimes.slice(startIdx, startIdx + count).map((timeIso: string, offset: number) => {
        const i = startIdx + offset;
        const wCode = Number(data.hourly?.weather_code?.[i] ?? 0);
        const datePart = timeIso.slice(0, 10);
        const sun = sunByDate.get(datePart);
        const hourNum = parseInt(timeIso.slice(11, 13), 10);
        let isNight = hourNum < 6 || hourNum >= 19;
        if (sun) {
          const curCompact = Number(timeIso.replace(/[-:T]/g, '').slice(0, 12));
          if (!isNaN(curCompact)) {
            isNight = curCompact < sun.sunriseNum || curCompact >= sun.sunsetNum;
          }
        }

        return {
          time: formatIsoClock12h(timeIso),
          timeIso,
          weatherCode: wCode,
          temp: Math.round(Number(data.hourly?.temperature_2m?.[i] ?? 0)),
          feelsLike:
            data.hourly?.apparent_temperature?.[i] !== undefined
              ? Math.round(data.hourly.apparent_temperature[i])
              : undefined,
          dewPoint:
            data.hourly?.dew_point_2m?.[i] !== undefined
              ? Number(data.hourly.dew_point_2m[i].toFixed(1))
              : undefined,
          humidity:
            data.hourly?.relative_humidity_2m?.[i] !== undefined
              ? Math.round(data.hourly.relative_humidity_2m[i])
              : undefined,
          windSpeed:
            data.hourly?.wind_speed_10m?.[i] !== undefined
              ? Math.round(data.hourly.wind_speed_10m[i])
              : undefined,
          windGusts:
            data.hourly?.wind_gusts_10m?.[i] !== undefined
              ? Math.round(data.hourly.wind_gusts_10m[i])
              : undefined,
          windDirection:
            data.hourly?.wind_direction_10m?.[i] !== undefined
              ? Math.round(data.hourly.wind_direction_10m[i])
              : undefined,
          rainProb: Math.round(Number(data.hourly?.precipitation_probability?.[i] ?? 0)),
          rainMm:
            data.hourly?.precipitation?.[i] !== undefined
              ? Number(data.hourly.precipitation[i].toFixed(1))
              : undefined,
          cloudCover:
            data.hourly?.cloud_cover?.[i] !== undefined
              ? Math.round(data.hourly.cloud_cover[i])
              : undefined,
          visibility:
            data.hourly?.visibility?.[i] !== undefined
              ? Math.round(data.hourly.visibility[i])
              : undefined,
          uvIndex:
            data.hourly?.uv_index?.[i] !== undefined
              ? Number(data.hourly.uv_index[i].toFixed(1))
              : undefined,
          cape:
            data.hourly?.cape?.[i] !== undefined
              ? Math.round(data.hourly.cape[i])
              : undefined,
          condition: CONDITION_MAP[wCode] || 'साफ आसमान',
          isNight,
        };
      });

    const hourly = mapHourlySlice(currentHourlyIdx, 24);
    const hourlyOutlook = mapHourlySlice(currentHourlyIdx, 168); // 7 days hourly for frost/fog/spray analytics

    const cur = data.current || {};
    const curWCode = typeof cur.weather_code === 'number' ? cur.weather_code : undefined;

    return {
      temp: Math.round(Number(cur.temperature_2m ?? 0)),
      feelsLike:
        cur.apparent_temperature !== undefined ? Math.round(cur.apparent_temperature) : undefined,
      dewPoint:
        cur.dew_point_2m !== undefined ? Number(Number(cur.dew_point_2m).toFixed(1)) : undefined,
      condition: (curWCode !== undefined ? CONDITION_MAP[curWCode] : undefined) || 'साफ आसमान',
      weatherCode: curWCode,
      humidity: Math.round(Number(cur.relative_humidity_2m ?? 0)),
      windSpeed: Math.round(Number(cur.wind_speed_10m ?? 0)),
      windGusts:
        cur.wind_gusts_10m !== undefined ? Math.round(cur.wind_gusts_10m) : undefined,
      windDirection:
        cur.wind_direction_10m !== undefined ? Math.round(cur.wind_direction_10m) : undefined,
      rain: Number(Number(cur.precipitation ?? 0).toFixed(1)),
      cloudCover: cur.cloud_cover !== undefined ? Math.round(cur.cloud_cover) : undefined,
      pressure: cur.pressure_msl !== undefined ? Math.round(cur.pressure_msl) : undefined,
      visibility: hourly[0]?.visibility,
      uvIndex: hourly[0]?.uvIndex,
      sunrise: data.daily?.sunrise?.[todayDailyIdx],
      sunset: data.daily?.sunset?.[todayDailyIdx],
      et0:
        data.daily?.et0_fao_evapotranspiration?.[todayDailyIdx] !== undefined
          ? Number(Number(data.daily.et0_fao_evapotranspiration[todayDailyIdx]).toFixed(1))
          : undefined,
      soilTemp0cm:
        data.hourly?.soil_temperature_0cm?.[currentHourlyIdx] !== undefined
          ? Number(Number(data.hourly.soil_temperature_0cm[currentHourlyIdx]).toFixed(1))
          : undefined,
      soilMoisture:
        data.hourly?.soil_moisture_0_to_1cm?.[currentHourlyIdx] !== undefined
          ? Number(Number(data.hourly.soil_moisture_0_to_1cm[currentHourlyIdx]).toFixed(3))
          : undefined,
      past7DaysRainMm: Number(past7DaysRainMm.toFixed(1)),
      consecutiveDryDays,
      maxTemp: Math.round(Number(data.daily?.temperature_2m_max?.[todayDailyIdx] ?? 0)),
      minTemp: Math.round(Number(data.daily?.temperature_2m_min?.[todayDailyIdx] ?? 0)),
      dateStr: todayYmd,
      forecast,
      hourly,
      hourlyOutlook,
      source: 'Open-Meteo',
      fetchedAt: Date.now(),
      isStale: false,
      isFallback: false,
      latitude: lat,
      longitude: lon,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromWttr(lat: number, lon: number): Promise<WeatherForecastPayload> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(`https://wttr.in/${lat},${lon}?format=j1`, { signal: controller.signal });
    if (!res.ok) throw new Error(`wttr.in HTTP ${res.status}`);
    const d = await res.json();
    const cur = d.current_condition?.[0];
    if (!cur) throw new Error('wttr.in empty payload');

    const todayStr = d.weather?.[0]?.date || getTodayYmdInOffset(19800);
    const forecast: DailyWeatherPoint[] = (d.weather || []).slice(1, 8).map((w: any) => ({
      day: parseHindiDayFromYmd(w.date),
      dateStr: w.date,
      temp: `${w.maxtempC}°C`,
      maxTemp: `${w.maxtempC}°C`,
      minTemp: `${w.mintempC}°C`,
      condition: w.hourly?.[4]?.lang_hi?.[0]?.value || w.hourly?.[4]?.weatherDesc?.[0]?.value || 'साफ आसमान',
      rainProb: w.hourly?.[4]?.chanceofrain ? Number(w.hourly[4].chanceofrain) : undefined,
    }));

    return {
      temp: parseInt(cur.temp_C, 10),
      feelsLike: cur.FeelsLikeC ? parseInt(cur.FeelsLikeC, 10) : undefined,
      condition: cur.lang_hi?.[0]?.value || cur.weatherDesc?.[0]?.value || 'साफ आसमान',
      humidity: parseInt(cur.humidity, 10),
      windSpeed: parseInt(cur.windspeedKmph, 10),
      windDirection: cur.winddirDegree ? parseInt(cur.winddirDegree, 10) : undefined,
      rain: parseFloat(cur.precipMM || '0'),
      cloudCover: cur.cloudcover ? parseInt(cur.cloudcover, 10) : undefined,
      pressure: cur.pressure ? parseInt(cur.pressure, 10) : undefined,
      visibility: cur.visibility ? parseInt(cur.visibility, 10) * 1000 : undefined,
      maxTemp: parseInt(d.weather?.[0]?.maxtempC || cur.temp_C, 10),
      minTemp: parseInt(d.weather?.[0]?.mintempC || cur.temp_C, 10),
      dateStr: todayStr,
      forecast,
      hourly: [],
      source: 'wttr.in',
      fetchedAt: Date.now(),
      isStale: false,
      isFallback: false,
      latitude: lat,
      longitude: lon,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function handleGetWeatherForecast(req: Request, res: Response): Promise<void> {
  const latRaw = parseFloat(String(req.query.lat ?? '24.1864'));
  const lonRaw = parseFloat(String(req.query.lon ?? '75.6328'));
  const force = req.query.force === 'true' || req.query.force === '1';

  const lat = Number.isFinite(latRaw) && latRaw >= -90 && latRaw <= 90 ? latRaw : 24.1864;
  const lon = Number.isFinite(lonRaw) && lonRaw >= -180 && lonRaw <= 180 ? lonRaw : 75.6328;

  // Round to ~1.1km grid for optimal shared cache hit rate across village users
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = forecastMemoryCache.get(cacheKey);
  const now = Date.now();
  const todayYmd = getTodayYmdInOffset(19800);

  if (
    !force &&
    cached &&
    now - cached.fetchedAt < FORECAST_CACHE_TTL_MS &&
    cached.dateStr === todayYmd
  ) {
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.json({ success: true, data: { ...cached, isStale: false } });
    return;
  }

  try {
    const fresh = await fetchFromOpenMeteo(lat, lon);
    forecastMemoryCache.set(cacheKey, fresh);
    persistForecastCache();
    res.setHeader('Cache-Control', force ? 'no-store' : 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.json({ success: true, data: fresh });
    return;
  } catch (err) {
    console.warn('[Weather Hub] Open-Meteo primary failed, trying fallback:', err);
  }

  try {
    const fallbackWttr = await fetchFromWttr(lat, lon);
    forecastMemoryCache.set(cacheKey, fallbackWttr);
    persistForecastCache();
    res.setHeader('Cache-Control', force ? 'no-store' : 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.json({ success: true, data: fallbackWttr });
    return;
  } catch (err) {
    console.warn('[Weather Hub] wttr.in fallback failed:', err);
  }

  if (cached) {
    res.setHeader('Cache-Control', force ? 'no-store' : 'public, s-maxage=180, stale-while-revalidate=300');
    res.json({
      success: true,
      data: {
        ...cached,
        isStale: true,
      },
    });
    return;
  }

  res.status(503).json({
    success: false,
    error: 'मौसम सेवा अस्थायी रूप से उपलब्ध नहीं है। कृपया कुछ देर बाद पुनः प्रयास करें।',
  });
}

// ============================================================
// OFFICIAL NDMA SACHET CAP (IMD) WARNING HUB (MADHYA PRADESH / MANDSAUR)
// ============================================================

function extractXmlTag(xml: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<(?:cap:)?${escaped}[^>]*>([\\s\\S]*?)<\\/(?:cap:)?${escaped}>`, 'i');
  const match = xml.match(regex);
  if (!match || !match[1]) return '';
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function extractAllXmlBlocks(xml: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<(?:cap:)?${escaped}[^>]*>[\\s\\S]*?<\\/(?:cap:)?${escaped}>`, 'gi');
  return xml.match(regex) || [];
}

const LOCAL_DISTRICT_KEYWORDS = [
  'mandsaur',
  'shamgarh',
  'garoth',
  'suwasra',
  'bhanpura',
  'sitamau',
  'malhargarh',
  'neemuch',
  'मंदसौर',
  'शामगढ़',
  'गरोठ',
  'सुवासरा',
  'भानपुरा',
  'सीतामऊ',
  'नीमच',
];

const MP_KEYWORDS = [
  'madhya pradesh',
  'madhya-pradesh',
  'imd-bhopal',
  'imd bhopal',
  'bhopal',
  'mp-sdma',
  'मध्य प्रदेश',
  'मध्यप्रदेश',
  'भोपाल',
  'उज्जैन',
  'ujjain',
  'malwa',
  ...LOCAL_DISTRICT_KEYWORDS,
];

function normalizeSeverity(raw: string): OfficialWeatherWarning['severity'] {
  const s = raw.toLowerCase();
  if (s.includes('extreme')) return 'Extreme';
  if (s.includes('severe')) return 'Severe';
  if (s.includes('moderate')) return 'Moderate';
  if (s.includes('minor')) return 'Minor';
  return 'Unknown';
}

export async function handleGetOfficialWarnings(_req: Request, res: Response): Promise<void> {
  const now = Date.now();

  if (warningsMemoryCache && now - warningsMemoryCache.checkedAt < WARNINGS_CACHE_TTL_MS) {
    const activeOnly = warningsMemoryCache.warnings.filter((w) => {
      if (!w.expires) return true;
      const expMs = new Date(w.expires).getTime();
      return isNaN(expMs) || expMs > now;
    });
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.json({
      success: true,
      source: 'NDMA Sachet / IMD CAP',
      checkedAt: warningsMemoryCache.checkedAt,
      feedStatus: warningsMemoryCache.feedStatus,
      warnings: activeOnly,
    });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const headers: Record<string, string> = {};
    if (warningsMemoryCache?.etag) {
      headers['If-None-Match'] = warningsMemoryCache.etag;
    }

    const rssRes = await fetch('https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml', {
      signal: controller.signal,
      headers,
    });
    clearTimeout(timer);

    if (rssRes.status === 304 && warningsMemoryCache) {
      const updatedState: WarningsCacheState = {
        ...warningsMemoryCache,
        checkedAt: now,
        feedStatus: 'ok',
      };
      warningsMemoryCache = updatedState;
      persistWarningsCache(updatedState);
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
      res.json({
        success: true,
        source: 'NDMA Sachet / IMD CAP',
        checkedAt: now,
        feedStatus: 'ok',
        warnings: updatedState.warnings.filter((w) => !w.expires || new Date(w.expires).getTime() > now),
      });
      return;
    }

    if (!rssRes.ok) {
      throw new Error(`Sachet RSS HTTP ${rssRes.status}`);
    }

    const rssXml = await rssRes.text();
    const etag = rssRes.headers.get('etag') || undefined;
    const itemBlocks = extractAllXmlBlocks(rssXml, 'item');

    const candidateItems = itemBlocks
      .map((item) => ({
        title: extractXmlTag(item, 'title'),
        author: extractXmlTag(item, 'author'),
        link: extractXmlTag(item, 'link'),
        guid: extractXmlTag(item, 'guid'),
        pubDate: extractXmlTag(item, 'pubDate'),
      }))
      .filter((it) => {
        const hay = `${it.title} ${it.author}`.toLowerCase();
        return MP_KEYWORDS.some((kw) => hay.includes(kw));
      })
      .slice(0, 6);

    const parsedWarnings: OfficialWeatherWarning[] = [];

    for (const candidate of candidateItems) {
      if (!candidate.link) continue;
      try {
        const xmlController = new AbortController();
        const xmlTimer = setTimeout(() => xmlController.abort(), 5000);
        const capRes = await fetch(candidate.link, { signal: xmlController.signal });
        clearTimeout(xmlTimer);
        if (!capRes.ok) continue;

        const capXml = await capRes.text();
        const identifier = extractXmlTag(capXml, 'identifier') || candidate.guid || candidate.link;
        const sender = extractXmlTag(capXml, 'sender') || candidate.author || 'IMD / NDMA';
        const sent = extractXmlTag(capXml, 'sent') || candidate.pubDate;

        const infoBlocks = extractAllXmlBlocks(capXml, 'info');
        if (infoBlocks.length === 0) continue;

        // Prefer Hindi info block if present, else English/first block
        const chosenInfo =
          infoBlocks.find((blk) => /\bhi\b|hi-in/i.test(extractXmlTag(blk, 'language'))) ||
          infoBlocks.find((blk) => /en/i.test(extractXmlTag(blk, 'language'))) ||
          infoBlocks[0];

        const event = extractXmlTag(chosenInfo, 'event') || 'मौसम चेतावनी';
        const severity = normalizeSeverity(extractXmlTag(chosenInfo, 'severity'));
        const urgency = extractXmlTag(chosenInfo, 'urgency');
        const certainty = extractXmlTag(chosenInfo, 'certainty');
        const headline = extractXmlTag(chosenInfo, 'headline') || candidate.title;
        const description = extractXmlTag(chosenInfo, 'description');
        const instruction = extractXmlTag(chosenInfo, 'instruction');
        const effective = extractXmlTag(chosenInfo, 'effective');
        const expires = extractXmlTag(chosenInfo, 'expires');
        const areaDesc = extractXmlTag(chosenInfo, 'areaDesc');

        // Skip already expired warnings
        if (expires) {
          const expTime = new Date(expires).getTime();
          if (!isNaN(expTime) && expTime <= now) continue;
        }

        const areaText = `${areaDesc} ${headline} ${description}`.toLowerCase();
        const isLocalMatch = LOCAL_DISTRICT_KEYWORDS.some((kw) => areaText.includes(kw));
        const isAllMp =
          areaText.includes('all districts') ||
          areaText.includes('madhya pradesh') ||
          areaText.includes('west madhya pradesh') ||
          areaText.includes('ujjain');

        // Only include if relevant to Mandsaur/Shamgarh or broader West MP/Statewide alert
        if (!isLocalMatch && !isAllMp) continue;

        parsedWarnings.push({
          id: identifier,
          event,
          severity,
          urgency,
          certainty,
          sender,
          headline,
          description,
          instruction,
          areaDesc,
          effective,
          expires,
          sent,
          isLocalMatch,
          link: candidate.link,
        });
      } catch {
        // Non-blocking: skip individual CAP XML failures
      }
    }

    const nextState: WarningsCacheState = {
      checkedAt: now,
      etag,
      warnings: parsedWarnings,
      feedStatus: 'ok',
    };
    warningsMemoryCache = nextState;
    persistWarningsCache(nextState);

    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.json({
      success: true,
      source: 'NDMA Sachet / IMD CAP',
      checkedAt: now,
      feedStatus: 'ok',
      warnings: parsedWarnings,
    });
  } catch (err) {
    console.warn('[Weather Warnings Hub] Sachet CAP feed unavailable:', err);
    res.setHeader('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=300');
    res.json({
      success: true,
      source: 'NDMA Sachet / IMD CAP',
      checkedAt: warningsMemoryCache?.checkedAt || now,
      feedStatus: 'unavailable',
      warnings:
        warningsMemoryCache?.warnings.filter((w) => !w.expires || new Date(w.expires).getTime() > now) ||
        [],
    });
  }
}

export function clearWeatherMemoryCaches(): void {
  forecastMemoryCache.clear();
  warningsMemoryCache = null;
}

