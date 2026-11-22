import { YouTubeVideoItem, ImageSource, VideoCategoryId, VideoOverride } from '../types';
import { formatHindiDate } from '../lib/dateUtils';

export interface VideoCategoryDef {
  id: VideoCategoryId;
  label: string;
}

export const VIDEO_CATEGORIES: VideoCategoryDef[] = [
  { id: 'all', label: 'सभी' },
  { id: 'crop_info', label: 'फसल जानकारी' },
  { id: 'fertilizers', label: 'खाद व उर्वरक' },
  { id: 'pesticides', label: 'कीटनाशक व रोग नियंत्रण' },
  { id: 'schemes', label: 'सरकारी योजनाएँ' },
  { id: 'mandi', label: 'मंडी भाव अपडेट' },
  { id: 'weather_irrigation', label: 'मौसम व सिंचाई सलाह' },
  { id: 'agri_tech', label: 'आधुनिक कृषि तकनीक' },
  { id: 'farmer_stories', label: 'सफल किसान कहानियाँ' },
  { id: 'app_guide', label: 'ऐप उपयोग गाइड' },
  { id: 'shorts', label: 'शॉर्ट्स / रील्स' },
  { id: 'other', label: 'अन्य' },
];

export const VIDEO_CATEGORY_MAP: Record<string, string> = VIDEO_CATEGORIES.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {} as Record<string, string>);

/**
 * Automatically classifies a video into one of the 11 concrete categories based on title/description/format.
 */
export function classifyYouTubeVideoCategory(
  title: string = '',
  description: string = '',
  isShort: boolean = false
): Exclude<VideoCategoryId, 'all'> {
  const text = `${title} ${description}`.toLowerCase();

  if (/ऐप कैसे चला|app guide|how to use app|फल्सावदिया.*ऐप|ऑर्डर कैसे करें|ऐप उपयोग/.test(text)) {
    return 'app_guide';
  }
  if (/कहानी|सफल किसान|मुनाफा|success story|लखपति किसान|करोड़पति किसान|किसान ने कमाए/.test(text)) {
    return 'farmer_stories';
  }
  if (/मंडी|भाव|msp|समर्थन मूल्य|दाम|नीलामी|तेजी मंदी|mandi|bhav|rate/.test(text)) {
    return 'mandi';
  }
  if (/योजना|सब्सिडी|पीएम किसान|pm kisan|pm-kisan|फसल बीमा|अनुदान|केवाईसी|kyc|सरकारी|scheme|subsidy/.test(text)) {
    return 'schemes';
  }
  if (/खाद|उर्वरक|यूरिया|डी.\s*ए.\s*पी|dap|npk|एनपीके|पोटाश|सल्फर|जिंक|बोरॉन|जैविक खाद|कंपोस्ट|vermicompost|fertilizer|urea|nano/.test(text)) {
    return 'fertilizers';
  }
  if (/कीट|इल्ली|माहू|सफेद मक्खी|थ्रिप्स|रोग|फफूंद|झुलसा|दवाई|स्प्रे|फंगीसाइड|कीटनाशक|खरपतवार|fungicide|pesticide|insecticide|herbicide|spray/.test(text)) {
    return 'pesticides';
  }
  if (/मौसम|बारिश|वर्षा|ओलावृष्टि|पाला|सिंचाई|ड्रिप|स्प्रिंकलर|टपक|weather|rain|irrigation|drip/.test(text)) {
    return 'weather_irrigation';
  }
  if (/ड्रोन|ट्रैक्टर|रोटावेटर|थ्रेशर|सीड ड्रिल|सोलर|मशीन|तकनीक|यंत्र|drone|tractor|machinery|agri tech/.test(text)) {
    return 'agri_tech';
  }
  if (/सोयाबीन|गेहूँ|गेहूं|चना|सरसों|मक्का|कपास|धान|लहसुन|प्याज|टमाटर|संतरा|मटर|बुवाई|कटाई|किस्म|बीज|मिट्टी|उत्पादन|खेती|फसल|crop|seed|variety/.test(text)) {
    return 'crop_info';
  }
  if (isShort) {
    return 'shorts';
  }
  return 'other';
}

export function isYouTubeShortUrl(url: string = ''): boolean {
  return /youtube\.com\/shorts\//i.test(url);
}

/**
 * Default videos to preserve existing home page content
 */
export const DEFAULT_VIDEOS: YouTubeVideoItem[] = [
  {
    id: 'v1',
    title: 'आधुनिक खेती की जानकारी',
    videoUrl: 'https://www.youtube.com/watch?v=9-3-P4mXG3A',
    videoId: '9-3-P4mXG3A',
    description: 'नई तकनीकों और आधुनिक कृषि उपकरणों के माध्यम से खेती को अधिक लाभकारी बनाएं।',
    thumbnail: {
      primary: 'https://img.youtube.com/vi/9-3-P4mXG3A/maxresdefault.jpg',
      fallback: 'https://img.youtube.com/vi/9-3-P4mXG3A/hqdefault.jpg'
    },
    isActive: true,
    category: 'agri_tech',
    isShort: false,
    source: 'manual',
    displayOrder: 1,
    createdAt: 1700000000000
  },
  {
    id: 'v2',
    title: 'मिट्टी परीक्षण कैसे करें',
    videoUrl: 'https://www.youtube.com/watch?v=6Z_L2v_p-m8',
    videoId: '6Z_L2v_p-m8',
    description: 'मिट्टी के नमूनों का सही परीक्षण और पोषक तत्वों की सटीक जांच का पूरा तरीका।',
    thumbnail: {
      primary: 'https://img.youtube.com/vi/6Z_L2v_p-m8/maxresdefault.jpg',
      fallback: 'https://img.youtube.com/vi/6Z_L2v_p-m8/hqdefault.jpg'
    },
    isActive: true,
    category: 'crop_info',
    isShort: false,
    source: 'manual',
    displayOrder: 2,
    createdAt: 1700000001000
  },
  {
    id: 'v3',
    title: 'जैविक खाद बनाने की विधि',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    description: 'घर पर उत्तम गुणवत्ता वाली वर्मी कंपोस्ट व जैविक खाद तैयार करने की आसान विधि।',
    thumbnail: {
      primary: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      fallback: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    },
    isActive: true,
    category: 'fertilizers',
    isShort: false,
    source: 'manual',
    displayOrder: 3,
    createdAt: 1700000002000
  }
];

/**
 * Extracts YouTube Video ID from any standard, shorts, mobile, or embed URL.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL regex patterns
  const patterns = [
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
    /(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/i
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // URL parsing fallback
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'v'].includes(pathParts[0]) && pathParts[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[1])) {
        return pathParts[1];
      }
    } else if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace(/^\//, '').split('?')[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    // ignore URL constructor error
  }

  return null;
}

/**
 * Validates if the string is a recognized YouTube URL or ID
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Returns formatted YouTube Watch URL
 */
export function formatYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Returns dual ImageSource for YouTube thumbnail with maxres fallback to hq
 */
export function getYouTubeThumbnailSource(videoId: string): ImageSource {
  return {
    primary: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    fallback: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  };
}

/**
 * Resolves appropriate thumbnail for display
 */
export function resolveVideoThumbnail(video: { 
  thumbnail?: string | ImageSource; 
  videoUrl?: string; 
  videoId?: string;
}): string | ImageSource {
  if (video.thumbnail) {
    if (typeof video.thumbnail === 'string' && video.thumbnail.trim().length > 0) {
      return video.thumbnail.trim();
    }
    if (typeof video.thumbnail === 'object' && (video.thumbnail.primary || video.thumbnail.fallback)) {
      return video.thumbnail;
    }
  }

  const id = video.videoId || extractYouTubeVideoId(video.videoUrl || '');
  if (id) {
    return getYouTubeThumbnailSource(id);
  }

  return '';
}

/**
 * Attempt to fetch video title from YouTube oEmbed
 */
export async function fetchYouTubeVideoTitle(urlOrId: string): Promise<string | null> {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const targetUrl = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
    const response = await fetch(`https://noembed.com/embed?url=${targetUrl}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.title && typeof data.title === 'string') {
        return data.title.trim();
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return null;
}

/**
 * Normalizes an array of videos ensuring valid IDs, order, category, and isActive flag.
 * Only falls back to DEFAULT_VIDEOS when rawVideos is null/undefined AND fallbackToDefaults is true.
 * Never injects DEFAULT_VIDEOS when an empty array [] is passed (e.g. deleted videos or empty RSS feed).
 */
export function normalizeVideos(
  rawVideos?: any[] | null,
  fallbackToDefaults: boolean = true
): YouTubeVideoItem[] {
  if (rawVideos === undefined || rawVideos === null) {
    return fallbackToDefaults ? DEFAULT_VIDEOS : [];
  }
  if (!Array.isArray(rawVideos) || rawVideos.length === 0) {
    return [];
  }

  return rawVideos.map((item, index) => {
    const videoUrl = item.videoUrl || (item.videoId ? formatYouTubeWatchUrl(item.videoId) : '');
    const videoId = item.videoId || extractYouTubeVideoId(videoUrl) || '';
    const isShort = typeof item.isShort === 'boolean'
      ? item.isShort
      : isYouTubeShortUrl(videoUrl) || /#shorts\b/i.test(`${item.title || ''} ${item.description || ''}`);

    let thumbnail = item.thumbnail;
    if (!thumbnail || (typeof thumbnail === 'string' && thumbnail.trim() === '')) {
      if (videoId) {
        thumbnail = getYouTubeThumbnailSource(videoId);
      } else {
        thumbnail = '';
      }
    }

    const category = item.category || classifyYouTubeVideoCategory(item.title || '', item.description || '', isShort);
    const publishedTimestamp = item.publishedTimestamp || item.createdAt;

    const normalizedItem: YouTubeVideoItem = {
      id: item.id || `video_${Date.now()}_${index}`,
      title: item.title || 'खेती की वीडियो',
      videoUrl,
      videoId,
      description: item.description || '',
      thumbnail,
      isActive: item.isActive !== false,
      displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : index + 1,
      category,
      isShort,
      isPinned: Boolean(item.isPinned),
      isFeatured: Boolean(item.isFeatured),
      embeddable: item.embeddable !== false,
      source: item.source || 'manual',
      createdAt: item.createdAt || Date.now(),
    };

    if (typeof item.duration === 'string' && item.duration.trim()) {
      normalizedItem.duration = item.duration.trim();
    }
    if (typeof item.durationSeconds === 'number' && !isNaN(item.durationSeconds)) {
      normalizedItem.durationSeconds = item.durationSeconds;
    }
    if (typeof item.publishedAt === 'string' && item.publishedAt.trim()) {
      normalizedItem.publishedAt = item.publishedAt.trim();
    }
    if (typeof publishedTimestamp === 'number' && !isNaN(publishedTimestamp)) {
      normalizedItem.publishedTimestamp = publishedTimestamp;
    }
    if (typeof item.updatedAt === 'number' && !isNaN(item.updatedAt)) {
      normalizedItem.updatedAt = item.updatedAt;
    }

    return normalizedItem;
  });
}

export function sanitizeSyncedVideos(rawVideos?: any[]): YouTubeVideoItem[] {
  const normalized = normalizeVideos(rawVideos, false);
  const defaultPlaceholderIds = new Set(['v1', 'v2', 'v3']);
  const defaultPlaceholderVideoIds = new Set(['9-3-P4mXG3A', '6Z_L2v_p-m8', 'dQw4w9WgXcQ']);
  return normalized.filter(
    (v) =>
      v.source !== 'manual' &&
      !defaultPlaceholderIds.has(v.id) &&
      !(v.videoId && defaultPlaceholderVideoIds.has(v.videoId))
  );
}

/**
 * Merges Admin manual videos + Server synced channel videos + Admin overrides cleanly (deduplicated by videoId).
 */
export function mergeHybridVideos(
  manualVideos: YouTubeVideoItem[],
  syncedVideos: YouTubeVideoItem[],
  overrides: Record<string, VideoOverride> = {},
  includeInactive: boolean = false
): YouTubeVideoItem[] {
  const byVideoId = new Map<string, YouTubeVideoItem>();

  const applyOverride = (item: YouTubeVideoItem): YouTubeVideoItem | null => {
    const key = item.videoId || item.id;
    const ov = key ? overrides[key] : undefined;
    if (!ov) return item;
    if (ov.isDeleted === true) return null;

    const mergedTitle = ov.title !== undefined ? ov.title : item.title;
    const mergedDesc = ov.description !== undefined ? ov.description : item.description;
    const mergedShort = ov.isShort !== undefined ? ov.isShort : item.isShort;
    const mergedCategory = ov.category !== undefined
      ? ov.category
      : item.category || classifyYouTubeVideoCategory(mergedTitle, mergedDesc || '', Boolean(mergedShort));

    return {
      ...item,
      title: mergedTitle,
      description: mergedDesc,
      isActive: ov.isActive !== undefined ? ov.isActive : item.isActive,
      isPinned: ov.isPinned !== undefined ? ov.isPinned : item.isPinned,
      isFeatured: ov.isFeatured !== undefined ? ov.isFeatured : item.isFeatured,
      isShort: mergedShort,
      category: mergedCategory,
    };
  };

  for (const item of syncedVideos) {
    const key = item.videoId || item.id;
    if (!key) continue;
    const applied = applyOverride(item);
    if (applied) {
      byVideoId.set(key, applied);
    }
  }

  for (const item of manualVideos) {
    const key = item.videoId || item.id;
    if (!key) continue;
    const existing = byVideoId.get(key);
    if (existing) {
      const mergedDuration = item.duration || existing.duration;
      const mergedDurationSec = item.durationSeconds ?? existing.durationSeconds;
      const mergedPubAt = item.publishedAt || existing.publishedAt;
      const mergedPubTs = item.publishedTimestamp || existing.publishedTimestamp;

      // Combine enriched synced metadata (like duration/publishedAt) with manual curation
      const combined: YouTubeVideoItem = {
        ...existing,
        ...item,
        source: item.source || 'manual',
      };
      if (mergedDuration) combined.duration = mergedDuration;
      if (mergedDurationSec !== undefined) combined.durationSeconds = mergedDurationSec;
      if (mergedPubAt) combined.publishedAt = mergedPubAt;
      if (mergedPubTs !== undefined) combined.publishedTimestamp = mergedPubTs;

      const applied = applyOverride(combined);
      if (applied) byVideoId.set(key, applied);
    } else {
      const ov = overrides[key];
      // For explicitly curated manual videos, only hide if not deleted
      if (!ov?.isDeleted) {
        const applied = applyOverride(item);
        if (applied) byVideoId.set(key, applied);
      }
    }
  }

  const list = Array.from(byVideoId.values()).filter((v) => includeInactive || v.isActive !== false);

  list.sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
    if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) return a.isFeatured ? -1 : 1;
    const timeA = a.publishedTimestamp || a.createdAt || 0;
    const timeB = b.publishedTimestamp || b.createdAt || 0;
    if (timeB !== timeA) return timeB - timeA;
    return (a.displayOrder || 9999) - (b.displayOrder || 9999);
  });

  return list;
}

/**
 * Formats timestamp or ISO date into strict DD MMMM YYYY full Hindi month format.
 */
export function formatVideoDateHindi(publishedAt?: string, timestamp?: number): string {
  const input = publishedAt || timestamp;
  if (!input) return '';
  return formatHindiDate(input);
}

// Local Bookmarks (0 Firestore cost)
const BOOKMARK_STORAGE_KEY = 'fkb_bookmarked_videos';

export function getBookmarkedVideoIds(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleBookmarkedVideoId(videoId: string): string[] {
  const current = getBookmarkedVideoIds();
  const exists = current.includes(videoId);
  const next = exists ? current.filter((id) => id !== videoId) : [videoId, ...current];
  try {
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage full
  }
  return next;
}

// Local Video Feed Cache (2-hour TTL, 0 Firestore cost)
const VIDEO_FEED_CACHE_KEY = 'fkb_youtube_channel_feed_v1';
const VIDEO_FEED_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export interface CachedVideoFeedPayload {
  channelKey: string;
  channelId?: string;
  channelTitle?: string;
  mode: 'api' | 'rss' | 'none';
  hasApiKeyConfigured?: boolean;
  lastSyncAt: number;
  videos: YouTubeVideoItem[];
}

export function getCachedVideoFeed(channelKey: string, allowStale: boolean = false): CachedVideoFeedPayload | null {
  try {
    const raw = localStorage.getItem(VIDEO_FEED_CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedVideoFeedPayload = JSON.parse(raw);
    if (!parsed || parsed.channelKey !== channelKey) return null;
    if (!allowStale && Date.now() - parsed.lastSyncAt > VIDEO_FEED_CACHE_TTL_MS) return null;
    return {
      ...parsed,
      videos: sanitizeSyncedVideos(parsed.videos),
    };
  } catch {
    return null;
  }
}

export function setCachedVideoFeed(payload: CachedVideoFeedPayload): void {
  try {
    localStorage.setItem(VIDEO_FEED_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota error
  }
}

