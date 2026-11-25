/**
 * Weather Localization & Telemetry Formatting Utility
 * Maps WMO weather condition codes to accurate Hindi descriptions and formats dates/times via dateUtils.ts
 */
import { HINDI_MONTHS, formatHindiDate, formatHindiTime, parseDateSafe } from '../lib/dateUtils';

export const WMO_CODE_TO_HINDI: Record<number, string> = {
  0: 'साफ मौसम',
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
  56: 'weather.condition.drizzle',
  57: 'weather.condition.drizzle',
  61: 'weather.condition.light_rain',
  63: 'weather.condition.rain',
  65: 'weather.condition.heavy_rain',
  66: 'weather.condition.rain',
  67: 'weather.condition.heavy_rain',
  71: 'weather.condition.light_rain',
  73: 'weather.condition.rain',
  75: 'weather.condition.heavy_rain',
  77: 'weather.condition.hail',
  80: 'weather.condition.showers',
  81: 'weather.condition.showers',
  82: 'weather.condition.showers',
  85: 'weather.condition.showers',
  86: 'weather.condition.showers',
  95: 'weather.condition.thunderstorm',
  96: 'weather.condition.hail',
  99: 'weather.condition.hail',
};

export function getHindiCondition(condition: string, weatherCode?: number): string {
  if (weatherCode !== undefined && WMO_CODE_TO_HINDI[weatherCode]) {
    return WMO_CODE_TO_HINDI[weatherCode];
  }
  const c = (condition || '').toLowerCase();
  if (c.includes('ओले') || c.includes('hail')) return 'गरज और ओले';
  if (c.includes('गरज') || c.includes('thunder')) return 'गरज के साथ वर्षा';
  if (c.includes('तेज बारिश') || c.includes('heavy')) return 'तेज बारिश';
  if (c.includes('बौछार') || c.includes('shower')) return 'बौछारें';
  if (c.includes('बारिश') || c.includes('वर्षा') || c.includes('rain')) return 'बारिश';
  if (c.includes('बूंदाबांदी') || c.includes('drizzle')) return 'बूंदाबांदी';
  if (c.includes('घना कोहरा')) return 'घना कोहरा';
  if (c.includes('कोहरा') || c.includes('धुंध') || c.includes('fog') || c.includes('mist')) return 'कोहरा';
  if (c.includes('आंशिक') || c.includes('partly')) return 'आंशिक बादल';
  if (c.includes('बादल') || c.includes('cloud') || c.includes('overcast')) return 'घने बादल';
  if (c.includes('रात') || c.includes('night')) return 'साफ रात';
  if (c.includes('धूप') || c.includes('sunny') || c.includes('clear')) return 'साफ मौसम';
  return condition || 'साफ मौसम';
}

const HINDI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

/**
 * Parses YYYY-MM-DD or date object into local midday Date to eliminate any timezone / UTC shift bugs
 */
export function parseLocalDate(input: Date | string | number): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0);
  }
  if (typeof input === 'string') {
    const cleanStr = input.trim();
    const parts = cleanStr.split(/[-T ]/);
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day, 12, 0, 0);
      }
    }
  }
  const parsed = parseDateSafe(input);
  if (parsed) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0);
  }
  return new Date();
}

export function formatWeekday(dateInput: Date | string | number, lang: string = 'hi'): string {
  try {
    const date = parseLocalDate(dateInput);
    if (isNaN(date.getTime())) return '';
    if (lang === 'hi') {
      return HINDI_WEEKDAYS[date.getDay()];
    }
    return new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(date);
  } catch {
    return String(dateInput);
  }
}

export function formatFullDate(dateInput: Date | string | number, lang: string = 'hi'): string {
  try {
    const date = parseLocalDate(dateInput);
    if (isNaN(date.getTime())) return '';
    if (lang === 'hi') {
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${day} ${HINDI_MONTHS[date.getMonth()]} ${year}`;
    }
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  } catch {
    return '';
  }
}

export function formatShortDate(dateInput: Date | string | number, lang: string): string {
  return formatFullDate(dateInput, lang);
}

export function formatWeatherTime(dateInput: Date | string | number, lang: string = 'hi'): string {
  try {
    if (typeof dateInput === 'string') {
      const isoMatch = dateInput.match(/T(\d{2}):(\d{2})/);
      if (isoMatch) {
        const h24 = parseInt(isoMatch[1], 10);
        const min = isoMatch[2];
        const suffix = h24 >= 12 ? 'PM' : 'AM';
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        return `${h12}:${min} ${suffix}`;
      }
    }
    if (lang === 'hi') {
      return formatHindiTime(dateInput) || String(dateInput);
    }
    const date = new Date(dateInput);
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
  } catch {
    return String(dateInput);
  }
}

export function formatDayAndFullDateHindi(dateInput: Date | string | number): string {
  const day = formatWeekday(dateInput, 'hi');
  const full = formatHindiDate(parseLocalDate(dateInput));
  return `${day}, ${full}`;
}

export function getWindDirectionHindi(degrees?: number): string {
  if (degrees === undefined || !Number.isFinite(degrees)) return '—';
  const normalized = ((degrees % 360) + 360) % 360;
  const dirs = [
    'उत्तर',
    'उत्तर-पूर्व',
    'पूर्व',
    'दक्षिण-पूर्व',
    'दक्षिण',
    'दक्षिण-पश्चिम',
    'पश्चिम',
    'उत्तर-पश्चिम',
  ];
  const idx = Math.round(normalized / 45) % 8;
  return dirs[idx];
}

export function formatVisibilityHindi(meters?: number): string {
  if (meters === undefined || !Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} मी`;
  const km = meters / 1000;
  return `${km >= 10 ? Math.round(km) : km.toFixed(1)} किमी`;
}

export function getLocalizedCity(name: string, lang: string): string {
  if (!name) return '';
  const isEn = lang === 'en';
  if (name.includes('शामगढ़') || name.includes('Shamgarh')) {
    return isEn ? 'Shamgarh, Mandsaur (MP)' : 'शामगढ़, मंदसौर (म.प्र.)';
  }
  if (name.includes('वर्तमान') || name.includes('Current')) {
    return isEn ? 'Your Current Location' : 'आपकी वर्तमान लोकेशन';
  }
  return name;
}
