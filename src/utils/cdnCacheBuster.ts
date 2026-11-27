/**
 * Falsawdiya Krishi Bazaar - Shared CDN Epoch & Client Cache Buster
 *
 * Enables long Vercel Edge CDN caching (4-6 hours) across all 10 lakh farmers
 * using ONE shared version token (`cv`), while allowing Admin's
 * "⚡ तुरंत अपडेट पुश करें" button to instantly invalidate all stale CDN
 * and device caches without needing any paid Vercel Pro plan.
 */

const CDN_EPOCH_LS_KEY = 'fkb_cdn_epoch_v1';

export function getCdnEpoch(): string {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  try {
    return window.localStorage.getItem(CDN_EPOCH_LS_KEY) || '';
  } catch {
    return '';
  }
}

export function clearAllPublicClientCaches(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const exactKeys = [
      'agri_news_cache_v5',
      'agri_news_cache_time_v5',
      'agri_schemes_cache_v3',
      'agri_schemes_cache_time_v3',
      'fkb_youtube_channel_feed_v1',
      'weather_official_warnings_v1',
    ];
    exactKeys.forEach((k) => window.localStorage.removeItem(k));

    const prefixes = [
      'mandi_v2_',
      'mandi_shared_govt_cache_v1',
      'mandi_central_hist_v1_',
      'weather_adv_v2_',
    ];
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && prefixes.some((p) => k.startsWith(p))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Non-fatal storage guard
  }
}

/**
 * Syncs the shared CDN epoch when Admin triggers a Force Push (`criticalTimestamp`).
 * Returns true if the epoch changed and stale local caches were cleared.
 */
export function syncCdnEpochFromMetadata(
  criticalTimestamp?: number,
  clearLocalIfChanged: boolean = true
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  if (!criticalTimestamp || !Number.isFinite(criticalTimestamp) || criticalTimestamp <= 0) {
    return false;
  }

  try {
    const current = Number(window.localStorage.getItem(CDN_EPOCH_LS_KEY) || '0');
    if (criticalTimestamp > current) {
      window.localStorage.setItem(CDN_EPOCH_LS_KEY, String(criticalTimestamp));
      if (clearLocalIfChanged) {
        clearAllPublicClientCaches();
      }
      return true;
    }
  } catch {
    // Non-fatal
  }
  return false;
}

/**
 * Appends the shared `cv` query param to public GET URLs so all farmers share
 * the exact same Vercel Edge CDN cache key until Admin pushes a fresh epoch.
 */
export function withCdnEpoch(url: string): string {
  const epoch = getCdnEpoch();
  if (!epoch) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}cv=${encodeURIComponent(epoch)}`;
}
