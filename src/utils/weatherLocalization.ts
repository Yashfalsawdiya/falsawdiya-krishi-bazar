/**
 * Weather Localization Utility
 * Maps WMO weather condition codes to i18n keys and formats dates/times using Intl.DateTimeFormat
 */

export const WMO_CODE_TO_HINDI: Record<number, string> = {
  0: 'साफ मौसम',
  1: 'मुख्यतः साफ',
  2: 'आंशिक बादल',
  3: 'घने बादल',
  45: 'कोहरा',
  48: 'घना कोहरा',
  51: 'हल्की बूंदाबांदी',
  53: 'बूंदाबांदी',
  55: 'मध्यम बूंदाबांदी',
  61: 'हल्की बारिश',
  63: 'बारिश',
  65: 'तेज बारिश',
  71: 'हल्की बर्फबारी/पाला',
  73: 'पाला',
  75: 'भारी पाला',
  77: 'ओलावृष्टि',
  80: 'हल्की बौछारें',
  81: 'बौछारें',
  82: 'तेज बौछारें',
  95: 'गरज के साथ वर्षा',
  96: 'गरज और ओलावृष्टि',
  99: 'भारी ओलावृष्टि'
};

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

export function getHindiCondition(condition: string, weatherCode?: number): string {
  if (weatherCode !== undefined && WMO_CODE_TO_HINDI[weatherCode]) {
    return WMO_CODE_TO_HINDI[weatherCode];
  }
  const c = condition.toLowerCase();
  if (c.includes('ओले') || c.includes('hail')) return 'ओलावृष्टि';
  if (c.includes('गरज') || c.includes('thunder')) return 'गरज के साथ वर्षा';
  if (c.includes('तेज बारिश') || c.includes('heavy')) return 'तेज बारिश';
  if (c.includes('बौछार') || c.includes('shower')) return 'बौछारें';
  if (c.includes('बारिश') || c.includes('वर्षा') || c.includes('rain')) return 'बारिश';
  if (c.includes('बूंदाबांदी') || c.includes('drizzle')) return 'बूंदाबांदी';
  if (c.includes('कोहरा') || c.includes('fog')) return 'कोहरा';
  if (c.includes('आंशिक') || c.includes('partly')) return 'आंशिक बादल';
  if (c.includes('बादल') || c.includes('cloud')) return 'घने बादल';
  if (c.includes('रात') || c.includes('night')) return 'साफ रात';
  if (c.includes('धूप') || c.includes('sunny')) return 'धूप / साफ';
  return condition || 'साफ मौसम';
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
