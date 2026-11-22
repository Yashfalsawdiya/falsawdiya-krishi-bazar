// Universal Hindi date & time formatting helper
// STRICT GLOBAL STANDARD: Always displays dates in "DD MMMM YYYY" with FULL Hindi month names.
// NEVER uses abbreviated/short month names (e.g. "अक्टू॰", "नव॰", "दिस॰") or raw numeric dates in UI.

export const HINDI_MONTHS = [
  'जनवरी',
  'फरवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितंबर',
  'अक्टूबर',
  'नवंबर',
  'दिसंबर',
];

/**
 * Parses timestamps, Date objects, ISO strings, YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY safely
 * in the local calendar timezone (eliminating UTC midnight day-shift bugs).
 */
export const parseDateSafe = (input: number | string | Date | undefined | null): Date | null => {
  if (input === undefined || input === null || input === '') return null;

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) return null;
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  // Numeric epoch timestamp passed as string
  if (/^\d{10,15}$/.test(raw)) {
    const num = Number(raw);
    const d = new Date(raw.length === 10 ? num * 1000 : num);
    return isNaN(d.getTime()) ? null : d;
  }

  // Strictly match YYYY-MM-DD (avoid UTC shift by constructing local midday Date)
  const ymdMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
    return null;
  }

  // Strictly match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
    return null;
  }

  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Formats a date or timestamp into strict "DD MMMM YYYY" format with full Hindi month name.
 * Example: "22 नवंबर 2026", "01 जनवरी 2027", "05 दिसंबर 2026"
 */
export const formatHindiDate = (
  input: number | string | Date | undefined | null
): string => {
  const date = parseDateSafe(input);
  if (!date) {
    return typeof input === 'string' ? input.trim() : '';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = HINDI_MONTHS[date.getMonth()] || '';
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

/**
 * Formats month-year strings (e.g. "06/2028", "2028-06", or Date/timestamp)
 * into full Hindi month + year ("जून 2028").
 */
export const formatHindiMonthYear = (
  input: number | string | Date | undefined | null
): string => {
  if (input === undefined || input === null || input === '') return '';

  if (typeof input === 'string') {
    const raw = input.trim();
    const mmYyyy = raw.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (mmYyyy) {
      const m = parseInt(mmYyyy[1], 10);
      const y = parseInt(mmYyyy[2], 10);
      if (m >= 1 && m <= 12) {
        return `${HINDI_MONTHS[m - 1]} ${y}`;
      }
    }
    const yyyyMm = raw.match(/^(\d{4})[\/\-](\d{1,2})$/);
    if (yyyyMm) {
      const y = parseInt(yyyyMm[1], 10);
      const m = parseInt(yyyyMm[2], 10);
      if (m >= 1 && m <= 12) {
        return `${HINDI_MONTHS[m - 1]} ${y}`;
      }
    }
  }

  const date = parseDateSafe(input);
  if (!date) return typeof input === 'string' ? input.trim() : '';
  return `${HINDI_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Formats time cleanly in 12-hour format (e.g. "04:30 PM").
 */
export const formatHindiTime = (
  input: number | string | Date | undefined | null
): string => {
  const date = parseDateSafe(input);
  if (!date) return '';

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');

  return `${hoursStr}:${minutes} ${ampm}`;
};

/**
 * Formats a date & time into "DD MMMM YYYY, hh:mm AM/PM".
 * Example: "22 नवंबर 2026, 04:30 PM"
 */
export const formatHindiDateTime = (
  input: number | string | Date | undefined | null
): string => {
  const date = parseDateSafe(input);
  if (!date) {
    return typeof input === 'string' ? input.trim() : '';
  }

  const datePart = formatHindiDate(date);
  const timePart = formatHindiTime(date);
  return `${datePart}, ${timePart}`;
};

/**
 * Formats a timestamp / date into a clean Hindi date string with full month name.
 * Example: "26 अगस्त 2026, 04:30 PM" or "26 अगस्त 2026"
 */
export const formatFullHindiDate = (
  timestamp: number | string | Date,
  includeTime: boolean = true
): string => {
  try {
    const date = parseDateSafe(timestamp);
    if (!date) {
      return String(timestamp || '');
    }
    return includeTime ? formatHindiDateTime(date) : formatHindiDate(date);
  } catch {
    return String(timestamp || '');
  }
};

