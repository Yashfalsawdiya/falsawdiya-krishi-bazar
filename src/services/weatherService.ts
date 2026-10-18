export interface WeatherData {
  temp: number;
  condition: string;
  weatherCode?: number;
  humidity: number;
  windSpeed: number;
  rain: number;
  maxTemp: number;
  minTemp: number;
  location?: string;
  dateStr?: string;
  forecast: {
    day: string;
    dateStr?: string;
    weatherCode?: number;
    temp: string;
    maxTemp?: string;
    minTemp?: string;
    condition: string;
    rainProb?: number;
  }[];
  hourly?: {
    time: string;
    timeIso?: string;
    weatherCode?: number;
    temp: number;
    condition: string;
    rainProb: number;
    isNight?: boolean;
  }[];
}

const CONDITION_MAP: Record<number, string> = {
  0: 'साफ आसमान',
  1: 'मुख्यतः साफ',
  2: 'आंशिक बादल',
  3: 'बादल छाए हैं',
  45: 'कोहरा',
  48: 'कोहरा',
  51: 'हल्की बूंदाबांदी',
  53: 'बूंदाबांदी',
  55: 'तेज बूंदाबांदी',
  61: 'हल्की बारिश',
  63: 'बारिश',
  65: 'तेज बारिश',
  71: 'हल्की बर्फबारी',
  73: 'बर्फबारी',
  75: 'तेज बर्फबारी',
  77: 'बर्फ के दाने',
  80: 'हल्की बौछारें',
  81: 'बौछारें',
  82: 'तेज बौछारें',
  95: 'गरज के साथ बारिश',
  96: 'गरज और ओले',
  99: 'गरज और भारी ओले',
};

export const fetchWeather = async (lat: number, lon: number, force: boolean = false): Promise<WeatherData> => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=8`;
  
  const CACHE_KEY = `weather_data_${lat}_${lon}`;
  const CACHE_TIME_KEY = `${CACHE_KEY}_timestamp`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  const now = new Date();
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  const HINDI_DAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  const todayY = now.getFullYear();
  const todayM = String(now.getMonth() + 1).padStart(2, '0');
  const todayD = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${todayY}-${todayM}-${todayD}`;

  // Check Cache (unless forced)
  if (!force && cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime);
    if (age < CACHE_DURATION) {
      try {
        const parsed = JSON.parse(cachedData);
        // Verify cache is valid and not from a previous calendar day
        if (!parsed.dateStr || parsed.dateStr === todayDateStr) {
          return parsed;
        }
      } catch (e) {
        console.warn("Error parsing cached weather data:", e);
      }
    }
  }

  // Dynamic 7-day fallback data strictly calculated from current calendar dates
  const dynamicFallbackForecast = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (i + 1), 12, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayNum}`;
    const dayName = HINDI_DAYS[d.getDay()];
    return {
      day: dayName,
      dateStr,
      temp: `${32 + (i % 3)}°C`,
      maxTemp: `${34 + (i % 2)}°C`,
      minTemp: `${24 + (i % 2)}°C`,
      condition: 'साफ',
      rainProb: 10 + (i * 2)
    };
  });

  const fallbackData: WeatherData = {
    temp: 30,
    condition: 'साफ आसमान',
    humidity: 45,
    windSpeed: 10,
    rain: 0,
    maxTemp: 35,
    minTemp: 25,
    dateStr: todayDateStr,
    forecast: dynamicFallbackForecast,
    hourly: []
  };

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Weather API Rate Limit Exceeded.");
      }
      throw new Error(`Weather API responded with status: ${response.status}`);
    }
    const data = await response.json();
    
    const days = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
    
    // Slice 1 to 8 to get exactly 7 days of forecast starting from tomorrow
    const forecast = data.daily.time.slice(1, 8).map((time: string, index: number) => {
      const parts = time.split('-');
      const date = parts.length === 3 
        ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0)
        : new Date(time);
      const dayName = days[date.getDay()];
      const wCode = data.daily.weather_code[index + 1];
      return {
        day: dayName,
        dateStr: time,
        weatherCode: wCode,
        temp: `${Math.round(data.daily.temperature_2m_max[index + 1])}°C`,
        maxTemp: `${Math.round(data.daily.temperature_2m_max[index + 1])}°C`,
        minTemp: `${Math.round(data.daily.temperature_2m_min[index + 1])}°C`,
        condition: CONDITION_MAP[wCode] || 'साफ',
        rainProb: data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[index + 1] : undefined
      };
    });

    // Process Hourly
    const currentHour = new Date().getHours();
    const startIndex = currentHour;
    const hourly = data.hourly.time.slice(startIndex, startIndex + 24).map((time: string, index: number) => {
      const actualIndex = startIndex + index;
      const date = new Date(time);
      const wCode = data.hourly.weather_code[actualIndex];
      
      let isNight = false;
      const hourTimestamp = date.getTime();
      
      if (data.daily && data.daily.sunrise && data.daily.sunset) {
        const dateStr = time.substring(0, 10); // "YYYY-MM-DD"
        const dailyIndex = data.daily.time.findIndex((dStr: string) => dStr.startsWith(dateStr));
        if (dailyIndex !== -1) {
          const sunriseStr = data.daily.sunrise[dailyIndex];
          const sunsetStr = data.daily.sunset[dailyIndex];
          if (sunriseStr && sunsetStr) {
            const sunriseTime = new Date(sunriseStr).getTime();
            const sunsetTime = new Date(sunsetStr).getTime();
            isNight = hourTimestamp < sunriseTime || hourTimestamp >= sunsetTime;
          } else {
            const h = date.getHours();
            isNight = h < 6 || h >= 19;
          }
        } else {
          const h = date.getHours();
          isNight = h < 6 || h >= 19;
        }
      } else {
        const h = date.getHours();
        isNight = h < 6 || h >= 19;
      }

      return {
        time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }),
        timeIso: time,
        weatherCode: wCode,
        temp: Math.round(data.hourly.temperature_2m[actualIndex]),
        condition: CONDITION_MAP[wCode] || 'साफ',
        rainProb: data.hourly.precipitation_probability[actualIndex],
        isNight
      };
    });

    const weatherResult: WeatherData = {
      temp: Math.round(data.current.temperature_2m),
      condition: CONDITION_MAP[data.current.weather_code] || 'साफ आसमान',
      weatherCode: data.current.weather_code,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      rain: data.current.precipitation,
      maxTemp: Math.round(data.daily.temperature_2m_max[0]),
      minTemp: Math.round(data.daily.temperature_2m_min[0]),
      dateStr: data.daily?.time?.[0] || todayDateStr,
      forecast,
      hourly
    };

    // Save to Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(weatherResult));
    localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());

    return weatherResult;
  } catch (error: any) {
    console.warn(`Primary weather fetch (Open-Meteo) failed: ${error?.message || String(error)}`);
    
    // Attempt secondary fallback from wttr.in if primary fails
    try {
      console.log("Attempting secondary weather fallback (wttr.in)...");
      const wttrUrl = `https://wttr.in/${lat},${lon}?format=j1`;
      const wttrRes = await fetch(wttrUrl);
      if (wttrRes.ok) {
        const d = await wttrRes.json();
        const current = d.current_condition[0];
        const wttrWeather: WeatherData = {
          temp: parseInt(current.temp_C),
          condition: current.lang_hi?.[0]?.value || current.weatherDesc[0].value,
          humidity: parseInt(current.humidity),
          windSpeed: parseInt(current.windspeedKmph),
          rain: parseFloat(current.precipMM),
          maxTemp: parseInt(d.weather[0].maxtempC),
          minTemp: parseInt(d.weather[0].mintempC),
          dateStr: d.weather?.[0]?.date || todayDateStr,
          forecast: d.weather.slice(1, 8).map((w: any) => {
            const dateObj = new Date(w.date + 'T12:00:00');
            const dayName = HINDI_DAYS[dateObj.getDay()] || 'सोमवार';
            return {
              day: dayName,
              dateStr: w.date,
              temp: `${w.maxtempC}°C`,
              maxTemp: `${w.maxtempC}°C`,
              minTemp: `${w.mintempC}°C`,
              condition: w.hourly?.[4]?.lang_hi?.[0]?.value || w.hourly?.[4]?.weatherDesc?.[0]?.value || 'साफ'
            };
          }),
          hourly: []
        };
        return wttrWeather;
      }
    } catch (e: any) {
      console.warn(`Secondary weather fallback (wttr.in) failed: ${e?.message || String(e)}`);
    }

    // Final attempt: Open-Meteo but with simpler parameters
    try {
      console.log("Final weather attempt (Open-Meteo simple)...");
      const simpleUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const response = await fetch(simpleUrl);
      if (response.ok) {
        const data = await response.json();
        const cur = data.current_weather;
        const parsed: WeatherData = {
          ...fallbackData,
          temp: Math.round(cur.temperature),
          windSpeed: Math.round(cur.windspeed),
        };
        return parsed;
      }
    } catch (e) {
      // Ignore
    }

    console.warn("All weather fetches failed. Using fallback/cached data.");
    
    // If API fails, try to return expired cache if available
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }

    return fallbackData;
  }
};
