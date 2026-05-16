export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  rain: number;
  maxTemp: number;
  minTemp: number;
  location?: string;
  forecast: {
    day: string;
    temp: string;
    condition: string;
  }[];
  hourly?: {
    time: string;
    temp: number;
    condition: string;
    rainProb: number;
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=8`;
  
  const CACHE_KEY = `weather_data_${lat}_${lon}`;
  const CACHE_TIME_KEY = `${CACHE_KEY}_timestamp`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  const now = new Date();
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  // Check Cache (unless forced)
  if (!force && cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime);
    if (age < CACHE_DURATION) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        console.warn("Error parsing cached weather data:", e);
      }
    }
  }

  // Fallback Data updated to 7 days
  const fallbackData: WeatherData = {
    temp: 30,
    condition: 'साफ आसमान',
    humidity: 45,
    windSpeed: 10,
    rain: 0,
    maxTemp: 35,
    minTemp: 25,
    forecast: [
      { day: 'कल (Tomorrow)', temp: '32°C', condition: 'साफ' },
      { day: 'सोमवार', temp: '33°C', condition: 'साफ' },
      { day: 'मंगलवार', temp: '34°C', condition: 'साफ' },
      { day: 'बुधवार', temp: '35°C', condition: 'साफ' },
      { day: 'गुरुवार', temp: '34°C', condition: 'साफ' },
      { day: 'शुक्रवार', temp: '33°C', condition: 'साफ' },
      { day: 'शनिवार', temp: '32°C', condition: 'साफ' },
    ],
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
      const date = new Date(time);
      const dayName = index === 0 ? 'कल (Tomorrow)' : days[date.getDay()];
      return {
        day: dayName,
        temp: `${Math.round(data.daily.temperature_2m_max[index + 1])}°C`,
        condition: CONDITION_MAP[data.daily.weather_code[index + 1]] || 'साफ',
      };
    });

    // Process Hourly
    const currentHour = new Date().getHours();
    const startIndex = currentHour;
    const hourly = data.hourly.time.slice(startIndex, startIndex + 24).map((time: string, index: number) => {
      const actualIndex = startIndex + index;
      const date = new Date(time);
      return {
        time: date.toLocaleTimeString('hi-IN', { hour: 'numeric', minute: 'numeric', hour12: true }),
        temp: Math.round(data.hourly.temperature_2m[actualIndex]),
        condition: CONDITION_MAP[data.hourly.weather_code[actualIndex]] || 'साफ',
        rainProb: data.hourly.precipitation_probability[actualIndex]
      };
    });

    const weatherResult: WeatherData = {
      temp: Math.round(data.current.temperature_2m),
      condition: CONDITION_MAP[data.current.weather_code] || 'साफ आसमान',
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      rain: data.current.precipitation,
      maxTemp: Math.round(data.daily.temperature_2m_max[0]),
      minTemp: Math.round(data.daily.temperature_2m_min[0]),
      forecast,
      hourly
    };

    // Save to Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(weatherResult));
    localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());

    return weatherResult;
  } catch (error) {
    // Attempt secondary fallback from wttr.in if primary fails
    try {
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
          forecast: d.weather.slice(1, 8).map((w: any) => ({
            day: new Date(w.date).toLocaleDateString('hi-IN', { weekday: 'long' }),
            temp: `${w.maxtempC}°C`,
            condition: w.hourly?.[4]?.weatherDesc?.[0]?.value || 'साफ'
          })),
          hourly: []
        };
        return wttrWeather;
      }
    } catch (e) {
      // Ignore wttr failures
    }

    console.warn("Weather sync failed, using fallback/cached data.");
    
    // If API fails, try to return expired cache if available
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }

    return fallbackData;
  }
};
