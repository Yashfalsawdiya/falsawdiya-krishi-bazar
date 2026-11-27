import { withCdnEpoch } from '../utils/cdnCacheBuster';

export interface HourlyWeatherPoint {
  time: string;
  timeIso?: string;
  weatherCode?: number;
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
  isNight?: boolean;
}

export interface DailyWeatherPoint {
  day: string;
  dateStr?: string;
  weatherCode?: number;
  temp: string;
  maxTemp?: string;
  minTemp?: string;
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

export interface WeatherData {
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
  location?: string;
  dateStr?: string;
  forecast: DailyWeatherPoint[];
  hourly?: HourlyWeatherPoint[];
  hourlyOutlook?: HourlyWeatherPoint[];
  source?: 'Open-Meteo' | 'wttr.in' | 'Cache' | 'Fallback';
  fetchedAt?: number;
  isStale?: boolean;
  isFallback?: boolean;
  latitude?: number;
  longitude?: number;
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

export interface OfficialWarningsResult {
  source: string;
  checkedAt: number;
  feedStatus: 'ok' | 'unavailable';
  warnings: OfficialWeatherWarning[];
}

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

const HINDI_DAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const CLIENT_CACHE_TTL_MS = 20 * 60 * 1000;

function getTodayYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatClock12h(isoTime: string): string {
  const match = isoTime.match(/T(\d{2}):(\d{2})/);
  if (!match) return isoTime;
  const h24 = parseInt(match[1], 10);
  const min = match[2];
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min} ${suffix}`;
}

function parseDirectOpenMeteoResponse(data: any, lat: number, lon: number): WeatherData {
  const todayYmd = getTodayYmd();
  const dailyTimes: string[] = Array.isArray(data.daily?.time) ? data.daily.time : [];
  let todayDailyIdx = dailyTimes.findIndex((d) => d === todayYmd);
  if (todayDailyIdx === -1) {
    todayDailyIdx = Math.max(0, dailyTimes.length - 8);
  }

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
  const todayRainSoFar = Number(data.daily?.precipitation_sum?.[todayDailyIdx] ?? 0);
  if (todayRainSoFar < 1.0 && consecutiveDryDays === pastIndices.length) {
    consecutiveDryDays++;
  }

  const forecast: DailyWeatherPoint[] = dailyTimes
    .slice(todayDailyIdx + 1, todayDailyIdx + 8)
    .map((dateStr: string, offsetIdx: number) => {
      const idx = todayDailyIdx + 1 + offsetIdx;
      const parts = dateStr.split('-').map((n) => parseInt(n, 10));
      const d =
        parts.length === 3
          ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
          : new Date(dateStr);
      const wCode = data.daily?.weather_code?.[idx];
      const maxT = Math.round(Number(data.daily?.temperature_2m_max?.[idx] ?? 0));
      const minT = Math.round(Number(data.daily?.temperature_2m_min?.[idx] ?? 0));
      return {
        day: HINDI_DAYS[d.getDay()] || 'सोमवार',
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

  const now = new Date();
  const currentHourPrefix = `${todayYmd}T${String(now.getHours()).padStart(2, '0')}`;
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
        time: formatClock12h(timeIso),
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
          data.hourly?.cape?.[i] !== undefined ? Math.round(data.hourly.cape[i]) : undefined,
        condition: CONDITION_MAP[wCode] || 'साफ आसमान',
        isNight,
      };
    });

  const hourly = mapHourlySlice(currentHourlyIdx, 24);
  const hourlyOutlook = mapHourlySlice(currentHourlyIdx, 168);
  const cur = data.current || {};
  const curCode = typeof cur.weather_code === 'number' ? cur.weather_code : undefined;

  return {
    temp: Math.round(Number(cur.temperature_2m ?? 0)),
    feelsLike:
      cur.apparent_temperature !== undefined ? Math.round(cur.apparent_temperature) : undefined,
    dewPoint:
      cur.dew_point_2m !== undefined ? Number(Number(cur.dew_point_2m).toFixed(1)) : undefined,
    condition: (curCode !== undefined ? CONDITION_MAP[curCode] : undefined) || 'साफ आसमान',
    weatherCode: curCode,
    humidity: Math.round(Number(cur.relative_humidity_2m ?? 0)),
    windSpeed: Math.round(Number(cur.wind_speed_10m ?? 0)),
    windGusts: cur.wind_gusts_10m !== undefined ? Math.round(cur.wind_gusts_10m) : undefined,
    windDirection: cur.wind_direction_10m !== undefined ? Math.round(cur.wind_direction_10m) : undefined,
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
}

export const fetchWeather = async (
  lat: number,
  lon: number,
  force: boolean = false
): Promise<WeatherData> => {
  const latKey = lat.toFixed(2);
  const lonKey = lon.toFixed(2);
  const CACHE_KEY = `weather_adv_v2_${latKey}_${lonKey}`;
  const todayDateStr = getTodayYmd();

  let parsedCached: WeatherData | null = null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const candidate = JSON.parse(raw) as WeatherData;
      if (candidate && typeof candidate.temp === 'number' && Array.isArray(candidate.forecast)) {
        parsedCached = candidate;
      }
    }
  } catch {
    // Ignore invalid localStorage payload
  }

  if (
    !force &&
    parsedCached &&
    parsedCached.fetchedAt &&
    Date.now() - parsedCached.fetchedAt < CLIENT_CACHE_TTL_MS &&
    parsedCached.dateStr === todayDateStr &&
    !parsedCached.isFallback
  ) {
    return parsedCached;
  }

  // 1. Primary: Centralized Express Weather Hub (/api/weather/forecast)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const hubRes = await fetch(
      withCdnEpoch(
        `/api/weather/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}${
          force ? '&force=true' : ''
        }`
      ),
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (hubRes.ok) {
      const json = await hubRes.json();
      if (json?.success && json.data && typeof json.data.temp === 'number') {
        const result: WeatherData = json.data;
        if (!result.isFallback) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(result));
          } catch {
            // Quota guard
          }
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('[Weather] Centralized hub unavailable, trying direct Open-Meteo:', err);
  }

  // 2. Fallback: Direct Open-Meteo call (works even if static build / hub offline)
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
      `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,et0_fao_evapotranspiration,soil_temperature_0cm,soil_moisture_0_to_1cm,cape` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,et0_fao_evapotranspiration` +
      `&timezone=auto&past_days=7&forecast_days=8`;

    const res = await fetch(url);
    if (res.ok) {
      const raw = await res.json();
      const parsed = parseDirectOpenMeteoResponse(raw, lat, lon);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
      } catch {
        // Ignore quota errors
      }
      return parsed;
    }
  } catch (err) {
    console.warn('[Weather] Direct Open-Meteo failed:', err);
  }

  // 3. Secondary Fallback: wttr.in
  try {
    const wttrRes = await fetch(`https://wttr.in/${lat},${lon}?format=j1`);
    if (wttrRes.ok) {
      const d = await wttrRes.json();
      const current = d.current_condition?.[0];
      if (current) {
        const wttrWeather: WeatherData = {
          temp: parseInt(current.temp_C, 10),
          feelsLike: current.FeelsLikeC ? parseInt(current.FeelsLikeC, 10) : undefined,
          condition: current.lang_hi?.[0]?.value || current.weatherDesc?.[0]?.value || 'साफ आसमान',
          humidity: parseInt(current.humidity, 10),
          windSpeed: parseInt(current.windspeedKmph, 10),
          windDirection: current.winddirDegree ? parseInt(current.winddirDegree, 10) : undefined,
          rain: parseFloat(current.precipMM || '0'),
          cloudCover: current.cloudcover ? parseInt(current.cloudcover, 10) : undefined,
          pressure: current.pressure ? parseInt(current.pressure, 10) : undefined,
          visibility: current.visibility ? parseInt(current.visibility, 10) * 1000 : undefined,
          maxTemp: parseInt(d.weather?.[0]?.maxtempC || current.temp_C, 10),
          minTemp: parseInt(d.weather?.[0]?.mintempC || current.temp_C, 10),
          dateStr: d.weather?.[0]?.date || todayDateStr,
          forecast: (d.weather || []).slice(1, 8).map((w: any) => {
            const dateObj = new Date(`${w.date}T12:00:00`);
            return {
              day: HINDI_DAYS[dateObj.getDay()] || 'सोमवार',
              dateStr: w.date,
              temp: `${w.maxtempC}°C`,
              maxTemp: `${w.maxtempC}°C`,
              minTemp: `${w.mintempC}°C`,
              condition: w.hourly?.[4]?.lang_hi?.[0]?.value || w.hourly?.[4]?.weatherDesc?.[0]?.value || 'साफ आसमान',
              rainProb: w.hourly?.[4]?.chanceofrain ? Number(w.hourly[4].chanceofrain) : undefined,
            };
          }),
          hourly: [],
          source: 'wttr.in',
          fetchedAt: Date.now(),
          isStale: false,
          isFallback: false,
          latitude: lat,
          longitude: lon,
        };
        return wttrWeather;
      }
    }
  } catch (err) {
    console.warn('[Weather] wttr.in fallback failed:', err);
  }

  // 4. Stale Cache (honestly flagged isStale: true)
  if (parsedCached) {
    return {
      ...parsedCached,
      source: 'Cache',
      isStale: true,
    };
  }

  // 5. Last-resort safe offline fallback (honestly flagged isFallback: true so UI warns farmer)
  const now = new Date();
  const dynamicFallbackForecast: DailyWeatherPoint[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (i + 1), 12, 0, 0);
    return {
      day: HINDI_DAYS[d.getDay()],
      dateStr: getTodayYmd(d),
      temp: '—',
      maxTemp: '—',
      minTemp: '—',
      condition: 'डेटा अनुपलब्ध',
      rainProb: undefined,
    };
  });

  return {
    temp: 0,
    condition: 'ऑफलाइन / मौसम डेटा अनुपलब्ध',
    humidity: 0,
    windSpeed: 0,
    rain: 0,
    maxTemp: 0,
    minTemp: 0,
    dateStr: todayDateStr,
    forecast: dynamicFallbackForecast,
    hourly: [],
    source: 'Fallback',
    fetchedAt: Date.now(),
    isStale: true,
    isFallback: true,
    latitude: lat,
    longitude: lon,
  };
};

export const fetchOfficialWarnings = async (): Promise<OfficialWarningsResult> => {
  const CACHE_KEY = 'weather_official_warnings_v1';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(withCdnEpoch('/api/weather/warnings'), { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      if (json?.success) {
        const result: OfficialWarningsResult = {
          source: json.source || 'NDMA Sachet / IMD CAP',
          checkedAt: typeof json.checkedAt === 'number' ? json.checkedAt : Date.now(),
          feedStatus: json.feedStatus === 'ok' ? 'ok' : 'unavailable',
          warnings: Array.isArray(json.warnings) ? json.warnings : [],
        };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(result));
        } catch {
          // Ignore quota error
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('[Weather] Official warnings fetch failed:', err);
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as OfficialWarningsResult;
      const now = Date.now();
      return {
        ...cached,
        feedStatus: 'unavailable',
        warnings: (cached.warnings || []).filter(
          (w) => !w.expires || new Date(w.expires).getTime() > now
        ),
      };
    }
  } catch {
    // Ignore
  }

  return {
    source: 'NDMA Sachet / IMD CAP',
    checkedAt: Date.now(),
    feedStatus: 'unavailable',
    warnings: [],
  };
};
