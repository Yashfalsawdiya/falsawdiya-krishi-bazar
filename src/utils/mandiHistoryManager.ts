import { HINDI_MONTHS, parseDateSafe } from '../lib/dateUtils';

/**
 * Falsawdiya Krishi Bazaar - Mandi Price History 30-Day Rolling Buffer Manager
 *
 * Strictly preserves a 30-day FIFO (First-In, First-Out) rolling window for mandi commodity prices.
 * - Prefers centralized authentic government history from `/api/mandi/history` / `_metadata/mandi_history_*`.
 * - Drops Day 1 when Day 31 arrives (max 30 trading days).
 * - Formats all dates using full Hindi month names (DD MMMM) per global date standard.
 */

export interface MandiHistoryPoint {
  date: string;       // Formatted full Hindi month date: "26 नवंबर"
  fullDate: string;   // ISO date: "2026-11-26"
  price: number;      // Modal rate
  minPrice: number;   // Minimum rate
  maxPrice: number;   // Maximum rate
  change: number;     // Delta compared to previous trading day (+/- ₹)
  changePercent: number; // Delta %
}

export const MAX_HISTORY_RECORDS = 30;

/**
 * Generates storage key for a specific mandi and crop
 */
export function getMandiHistoryKey(mandiName: string, commodity: string): string {
  const m = (mandiName || 'shamgarh').toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, '_');
  const c = (commodity || 'crop').toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, '_');
  return `fkb_mandi_hist_${m}_${c}`;
}

/**
 * Formats a Date or ISO date string to "DD MMMM" using full Hindi month names (e.g., "26 नवंबर")
 */
function formatDateShort(input: Date | string): string {
  const d = typeof input === 'string' ? parseDateSafe(input) : input;
  if (!d || isNaN(d.getTime())) {
    const fallback = new Date();
    return `${String(fallback.getDate()).padStart(2, '0')} ${HINDI_MONTHS[fallback.getMonth()]}`;
  }
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${HINDI_MONTHS[d.getMonth()]}`;
}

/**
 * Formats a date object to "YYYY-MM-DD"
 */
function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeHistoryLabels(points: MandiHistoryPoint[]): MandiHistoryPoint[] {
  let prevPrice = 0;
  return points.map((pt, idx) => {
    const cleanDate = pt.fullDate ? formatDateShort(pt.fullDate) : pt.date;
    const change = idx === 0 ? 0 : pt.price - prevPrice;
    const changePercent =
      idx === 0 || prevPrice <= 0 ? 0 : parseFloat(((change / prevPrice) * 100).toFixed(1));
    prevPrice = pt.price;
    return {
      ...pt,
      date: cleanDate,
      change,
      changePercent,
    };
  });
}

/**
 * Generates a realistic 30-day fallback trajectory only when zero centralized authentic history exists.
 */
function generateInitial30DayHistory(
  currentPrice: number,
  currentMin: number,
  currentMax: number,
  seedIndex: number
): MandiHistoryPoint[] {
  const result: MandiHistoryPoint[] = [];
  const base = Math.max(100, currentPrice);
  const spreadRatio = base > 0 ? (currentMax - currentMin) / base : 0.2;

  const today = new Date();
  const tradingDays: Date[] = [];

  const cursor = new Date(today);
  while (tradingDays.length < MAX_HISTORY_RECORDS) {
    if (cursor.getDay() !== 0) {
      tradingDays.unshift(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  let prevPrice = base;
  for (let i = 0; i < tradingDays.length; i++) {
    const isToday = i === tradingDays.length - 1;
    let price: number;
    let minP: number;
    let maxP: number;

    if (isToday) {
      price = currentPrice;
      minP = currentMin;
      maxP = currentMax;
    } else {
      const stepsFromToday = tradingDays.length - 1 - i;
      const wave = Math.sin(seedIndex * 7 + stepsFromToday * 0.45) * 0.04;
      const microNoise = Math.cos(seedIndex * 13 + stepsFromToday * 0.8) * 0.02;
      const deltaPercent = wave + microNoise;

      price = Math.round(base * (1 + deltaPercent));
      const dynamicSpread = Math.round(price * (spreadRatio || 0.15));
      minP = Math.max(50, price - Math.round(dynamicSpread * 0.6));
      maxP = price + Math.round(dynamicSpread * 0.4);
    }

    const change = i === 0 ? 0 : price - prevPrice;
    const changePercent = prevPrice > 0 ? parseFloat(((change / prevPrice) * 100).toFixed(1)) : 0;

    result.push({
      date: formatDateShort(tradingDays[i]),
      fullDate: formatDateISO(tradingDays[i]),
      price,
      minPrice: minP,
      maxPrice: maxP,
      change,
      changePercent,
    });

    prevPrice = price;
  }

  return result;
}

/**
 * Merges centralized 30-day authentic Govt history with live today's price, or falls back to local buffer.
 */
export function mergeCentralizedMandiHistory(
  mandiName: string,
  commodity: string,
  serverPoints: MandiHistoryPoint[] | undefined,
  currentPrice: number,
  currentMin: number,
  currentMax: number,
  seedIndex: number = 0
): { points: MandiHistoryPoint[]; isAuthentic: boolean; authenticDaysCount: number } {
  if (Array.isArray(serverPoints) && serverPoints.length > 0) {
    const sorted = [...serverPoints]
      .filter((p) => p && p.fullDate && p.price > 0)
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

    if (sorted.length > 0) {
      const todayStr = formatDateISO(new Date());
      const last = sorted[sorted.length - 1];
      if (currentPrice > 0) {
        if (last.fullDate === todayStr) {
          last.price = currentPrice;
          last.minPrice = currentMin || currentPrice;
          last.maxPrice = currentMax || currentPrice;
        } else if (last.fullDate < todayStr) {
          sorted.push({
            date: formatDateShort(todayStr),
            fullDate: todayStr,
            price: currentPrice,
            minPrice: currentMin || currentPrice,
            maxPrice: currentMax || currentPrice,
            change: 0,
            changePercent: 0,
          });
        }
      }

      const capped = sorted.slice(-MAX_HISTORY_RECORDS);
      const normalized = normalizeHistoryLabels(capped);
      return {
        points: normalized,
        isAuthentic: true,
        authenticDaysCount: normalized.length,
      };
    }
  }

  const localPoints = normalizeHistoryLabels(
    getOrUpdateCommodityHistory(mandiName, commodity, currentPrice, currentMin, currentMax, seedIndex)
  );
  return {
    points: localPoints,
    isAuthentic: false,
    authenticDaysCount: 0,
  };
}

/**
 * Retrieves the 30-day local rolling history for a commodity, archiving today's live rate.
 */
export function getOrUpdateCommodityHistory(
  mandiName: string,
  commodity: string,
  currentPrice: number,
  currentMin: number,
  currentMax: number,
  seedIndex: number = 0
): MandiHistoryPoint[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return generateInitial30DayHistory(currentPrice, currentMin, currentMax, seedIndex);
  }

  const key = getMandiHistoryKey(mandiName, commodity);
  const todayStr = formatDateISO(new Date());
  const todayShort = formatDateShort(new Date());

  let history: MandiHistoryPoint[] = [];

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        history = parsed;
      }
    }
  } catch (err) {
    console.warn('[MandiHistory] Error reading cache', err);
  }

  if (history.length === 0) {
    history = generateInitial30DayHistory(currentPrice, currentMin, currentMax, seedIndex);
    try {
      localStorage.setItem(key, JSON.stringify(history));
    } catch {
      // Quota safe
    }
    return history;
  }

  const lastEntry = history[history.length - 1];
  if (lastEntry && lastEntry.fullDate === todayStr) {
    lastEntry.price = currentPrice;
    lastEntry.minPrice = currentMin;
    lastEntry.maxPrice = currentMax;
    lastEntry.date = todayShort;
    if (history.length > 1) {
      const prev = history[history.length - 2];
      lastEntry.change = currentPrice - prev.price;
      lastEntry.changePercent =
        prev.price > 0 ? parseFloat(((lastEntry.change / prev.price) * 100).toFixed(1)) : 0;
    }
  } else {
    const prevPrice = lastEntry ? lastEntry.price : currentPrice;
    const change = currentPrice - prevPrice;
    const changePercent = prevPrice > 0 ? parseFloat(((change / prevPrice) * 100).toFixed(1)) : 0;

    history.push({
      date: todayShort,
      fullDate: todayStr,
      price: currentPrice,
      minPrice: currentMin,
      maxPrice: currentMax,
      change,
      changePercent,
    });

    if (history.length > MAX_HISTORY_RECORDS) {
      history = history.slice(-MAX_HISTORY_RECORDS);
    }
  }

  history = normalizeHistoryLabels(history);

  try {
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    // Quota safe
  }

  return history;
}

/**
 * Filter history slice for 7, 15, or 30 days
 */
export function getHistorySlice(
  history: MandiHistoryPoint[],
  days: 7 | 15 | 30
): MandiHistoryPoint[] {
  if (!history || history.length === 0) return [];
  const count = Math.min(days, history.length);
  return history.slice(-count);
}

/**
 * Calculate period metrics (overall high, low, period change)
 */
export function calculatePeriodMetrics(slice: MandiHistoryPoint[]): {
  high: number;
  low: number;
  startPrice: number;
  latestPrice: number;
  periodChange: number;
  periodChangePercent: number;
  isUp: boolean;
  isDown: boolean;
} {
  if (!slice || slice.length === 0) {
    return {
      high: 0,
      low: 0,
      startPrice: 0,
      latestPrice: 0,
      periodChange: 0,
      periodChangePercent: 0,
      isUp: false,
      isDown: false,
    };
  }

  const prices = slice.map((p) => p.price);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const startPrice = slice[0].price;
  const latestPrice = slice[slice.length - 1].price;
  const periodChange = latestPrice - startPrice;
  const periodChangePercent =
    startPrice > 0 ? parseFloat(((periodChange / startPrice) * 100).toFixed(1)) : 0;

  return {
    high,
    low,
    startPrice,
    latestPrice,
    periodChange,
    periodChangePercent,
    isUp: periodChange > 0,
    isDown: periodChange < 0,
  };
}
