/**
 * Weather Localization Utility
 * Maps WMO weather condition codes to i18n keys and formats dates/times using Intl.DateTimeFormat
 */

export const WMO_CODE_TO_KEY: Record<number, string> = {
  0: 'weather.condition.clear',
  1: 'weather.condition.mostly_clear',
  2: 'weather.condition.partly_cloudy',
  3: 'weather.condition.overcast',
  45: 'weather.condition.fog',
  48: 'weather.condition.fog',
  51: 'weather.condition.drizzle',
  53: 'weather.condition.drizzle',
  55: 'weather.condition.drizzle',
  61: 'weather.condition.light_rain',
  63: 'weather.condition.rain',
  65: 'weather.condition.heavy_rain',
  71: 'weather.condition.light_rain',
  73: 'weather.condition.rain',
  75: 'weather.condition.heavy_rain',
  77: 'weather.condition.hail',
  80: 'weather.condition.showers',
  81: 'weather.condition.showers',
  82: 'weather.condition.showers',
  95: 'weather.condition.thunderstorm',
  96: 'weather.condition.hail',
  99: 'weather.condition.hail'
};

/**
 * Text condition fallback to i18n key
 */
export function getConditionKeyFromText(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('ओले') || c.includes('hail')) return 'weather.condition.hail';
  if (c.includes('गरज') || c.includes('thunder')) return 'weather.condition.thunderstorm';
  if (c.includes('तेज बारिश') || c.includes('heavy')) return 'weather.condition.heavy_rain';
  if (c.includes('बौछार') || c.includes('shower')) return 'weather.condition.showers';
  if (c.includes('बारिश') || c.includes('वर्षा') || c.includes('rain')) return 'weather.condition.rain';
  if (c.includes('बूंदाबांदी') || c.includes('drizzle')) return 'weather.condition.drizzle';
  if (c.includes('कोहरा') || c.includes('fog')) return 'weather.condition.fog';
  if (c.includes('आंशिक') || c.includes('partly')) return 'weather.condition.partly_cloudy';
  if (c.includes('बादल') || c.includes('cloud')) return 'weather.condition.overcast';
  if (c.includes('रात') || c.includes('night')) return 'weather.condition.clear_night';
  if (c.includes('धूप') || c.includes('sunny')) return 'weather.condition.sunny';
  return 'weather.condition.clear';
}

/**
 * Formats day name using Intl.DateTimeFormat according to selected locale
 */
export function formatWeekday(dateInput: Date | string | number, lang: string): string {
  try {
    const date = new Date(dateInput);
    const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
    return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats time according to selected locale (e.g. 2:00 pm)
 */
export function formatWeatherTime(dateInput: Date | string | number, lang: string): string {
  try {
    const date = new Date(dateInput);
    const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Translates city and state locations
 */
export function getLocalizedCity(name: string, lang: string): string {
  if (!name) return '';
  const isEn = lang === 'en';

  if (name.includes('शामगढ़') || name.includes('Shamgarh')) {
    return isEn ? 'Shamgarh, Madhya Pradesh' : 'शामगढ़, मध्य प्रदेश';
  }
  if (name.includes('वर्तमान') || name.includes('Current')) {
    return isEn ? 'Your Current Location' : 'आपकी वर्तमान लोकेशन';
  }
  return name;
}
