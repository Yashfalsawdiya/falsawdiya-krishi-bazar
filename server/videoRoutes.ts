import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export type VideoCategorySlug =
  | 'crop_info'
  | 'fertilizers'
  | 'pesticides'
  | 'schemes'
  | 'mandi'
  | 'weather_irrigation'
  | 'agri_tech'
  | 'farmer_stories'
  | 'app_guide'
  | 'shorts'
  | 'other';

export interface SyncedYouTubeVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnail: {
    primary: string;
    fallback: string;
  };
  isActive: boolean;
  isShort: boolean;
  category: VideoCategorySlug;
  duration?: string;
  durationSeconds?: number;
  publishedAt?: string;
  publishedTimestamp?: number;
  embeddable: boolean;
  source: 'channel_api' | 'channel_rss';
}

interface ChannelCacheRecord {
  channelKey: string;
  channelId: string;
  channelTitle: string;
  mode: 'api' | 'rss' | 'none';
  lastSyncAt: number;
  videos: SyncedYouTubeVideo[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const VIDEOS_CACHE_FILE = path.join(DATA_DIR, 'youtube-videos-cache.json');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours centralized cache

const channelCaches = new Map<string, ChannelCacheRecord>();
const resolvedHandleCache = new Map<string, { channelId: string; channelTitle?: string }>();

// Restore disk cache on startup if available
try {
  if (fs.existsSync(VIDEOS_CACHE_FILE)) {
    const raw = fs.readFileSync(VIDEOS_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [key, val] of Object.entries(parsed)) {
        const rec = val as ChannelCacheRecord;
        if (rec && rec.channelId && Array.isArray(rec.videos)) {
          channelCaches.set(key, rec);
        }
      }
      console.log(`[Central Video Cache] Restored ${channelCaches.size} cached YouTube channel(s)`);
    }
  }
} catch (err) {
  console.warn('[Central Video Cache] Disk restore skipped:', err);
}

const persistCachesToDisk = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const obj: Record<string, ChannelCacheRecord> = {};
    for (const [k, v] of channelCaches.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(VIDEOS_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem in serverless environments
  }
};

function decodeXmlEntities(text: string): string {
  return (text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function classifyVideoCategory(
  title: string = '',
  description: string = '',
  isShort: boolean = false
): VideoCategorySlug {
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

function parseIsoDuration(iso: string): { label: string; seconds: number } | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return null;
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  const secs = parseInt(match[3] || '0', 10);
  const totalSeconds = hours * 3600 + mins * 60 + secs;
  if (totalSeconds <= 0) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  const label = hours > 0
    ? `${hours}:${pad(mins)}:${pad(secs)}`
    : `${mins}:${pad(secs)}`;

  return { label, seconds: totalSeconds };
}

/**
 * Resolves any YouTube Channel URL, @handle, or UC... Channel ID to an authoritative UC... channelId.
 * Works both WITH YOUTUBE_API_KEY (official API) and WITHOUT YOUTUBE_API_KEY (public channel metadata).
 */
export async function resolveYouTubeChannelId(
  channelUrlOrId: string,
  explicitChannelId?: string,
  apiKey?: string
): Promise<{ channelId: string | null; channelTitle?: string }> {
  if (explicitChannelId && /^UC[a-zA-Z0-9_-]{20,}$/.test(explicitChannelId.trim())) {
    return { channelId: explicitChannelId.trim() };
  }

  const input = (channelUrlOrId || '').trim();
  if (!input) return { channelId: null };

  // Direct Channel ID
  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(input)) {
    return { channelId: input };
  }

  // URL with /channel/UC...
  const directMatch = input.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{20,})/i);
  if (directMatch?.[1]) {
    return { channelId: directMatch[1] };
  }

  const normalizedKey = input.toLowerCase();
  const cachedResolution = resolvedHandleCache.get(normalizedKey);
  if (cachedResolution) {
    return cachedResolution;
  }

  // Normalize handle or URL
  let handle = '';
  const handleMatch = input.match(/@([a-zA-Z0-9._-]+)/);
  if (handleMatch?.[1]) {
    handle = handleMatch[1];
  }

  // 1) Official API resolution if YOUTUBE_API_KEY is configured
  if (apiKey && handle) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent('@' + handle)}&key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data: any = await res.json();
        const ch = data?.items?.[0];
        if (ch?.id) {
          const resolved = {
            channelId: ch.id as string,
            channelTitle: (ch.snippet?.title as string) || '',
          };
          resolvedHandleCache.set(normalizedKey, resolved);
          return resolved;
        }
      }
    } catch (err) {
      console.warn('[YouTube Resolver] API handle lookup fallback to public HTML:', err);
    }
  }

  // 2) Zero-API-Key fallback: extract canonical channel_id from public YouTube channel page
  let targetUrl = input;
  if (!/^https?:\/\//i.test(targetUrl)) {
    if (targetUrl.startsWith('@')) {
      targetUrl = `https://www.youtube.com/${targetUrl}`;
    } else if (/^youtube\.com/i.test(targetUrl) || /^www\.youtube\.com/i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    } else {
      targetUrl = `https://www.youtube.com/@${targetUrl}`;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'hi-IN,hi;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();
      const idMatch =
        html.match(/<meta\s+itemprop="identifier"\s+content="(UC[a-zA-Z0-9_-]{20,})"/i) ||
        html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{20,})/i) ||
        html.match(/"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]{20,})"/i) ||
        html.match(/"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]{20,})"/i);

      const titleMatch =
        html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
        html.match(/<title>([^<]+)<\/title>/i);

      if (idMatch?.[1]) {
        const channelTitle = titleMatch?.[1]
          ? decodeXmlEntities(titleMatch[1].replace(/\s*-\s*YouTube$/i, ''))
          : '';
        const resolved = { channelId: idMatch[1], channelTitle };
        resolvedHandleCache.set(normalizedKey, resolved);
        return resolved;
      }
    }
  } catch (err) {
    console.warn('[YouTube Resolver] Public HTML lookup failed:', err);
  }

  return { channelId: null };
}

/**
 * Mode A: Fetch full channel catalog using YouTube Data API v3 (2 units per 50 videos).
 */
async function fetchChannelViaYouTubeApi(
  channelId: string,
  apiKey: string,
  maxVideos: number = 100
): Promise<{ videos: SyncedYouTubeVideo[]; channelTitle: string }> {
  // Step 1: Get uploads playlist ID (1 unit)
  const chUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
  const chRes = await fetch(chUrl);
  if (!chRes.ok) {
    let errDetail = '';
    try {
      const errJson: any = await chRes.json();
      errDetail = errJson?.error?.message || '';
    } catch {
      // Ignore parse failure
    }
    throw new Error(`YouTube API channels.list failed (${chRes.status})${errDetail ? `: ${errDetail}` : ''}`);
  }
  const chData: any = await chRes.json();
  const channelItem = chData?.items?.[0];
  const uploadsPlaylistId = channelItem?.contentDetails?.relatedPlaylists?.uploads || channelId.replace(/^UC/, 'UU');
  const channelTitle = channelItem?.snippet?.title || '';

  // Step 2: Fetch video IDs from uploads playlist (1 unit per 50 videos)
  const videoIds: string[] = [];
  let pageToken = '';
  const maxPages = Math.ceil(maxVideos / 50);

  for (let page = 0; page < maxPages; page++) {
    const plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${encodeURIComponent(uploadsPlaylistId)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}&key=${encodeURIComponent(apiKey)}`;
    const plRes = await fetch(plUrl);
    if (!plRes.ok) break;
    const plData: any = await plRes.json();
    const items = Array.isArray(plData?.items) ? plData.items : [];
    for (const it of items) {
      const vid = it?.contentDetails?.videoId;
      if (vid) videoIds.push(vid);
    }
    pageToken = plData?.nextPageToken || '';
    if (!pageToken || videoIds.length >= maxVideos) break;
  }

  if (videoIds.length === 0) {
    return { videos: [], channelTitle };
  }

  // Step 3: Batch videos.list for full details, durations & embeddable status (1 unit per 50 videos)
  const videos: SyncedYouTubeVideo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batchIds = videoIds.slice(i, i + 50);
    const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(batchIds.join(','))}&key=${encodeURIComponent(apiKey)}`;
    const vRes = await fetch(vUrl);
    if (!vRes.ok) continue;
    const vData: any = await vRes.json();
    const items = Array.isArray(vData?.items) ? vData.items : [];

    for (const item of items) {
      if (item?.status?.privacyStatus && item.status.privacyStatus !== 'public') {
        continue;
      }
      const videoId = item.id;
      const snippet = item.snippet || {};
      const title = (snippet.title || 'खेती की वीडियो').trim();
      const description = (snippet.description || '').trim();
      const parsedDuration = parseIsoDuration(item?.contentDetails?.duration || '');
      const durationSeconds = parsedDuration?.seconds;
      const hasShortTag = /#shorts\b/i.test(`${title} ${description}`);
      const isShort = Boolean(
        hasShortTag ||
        (typeof durationSeconds === 'number' && durationSeconds > 0 && durationSeconds <= 62)
      );

      const publishedAt = snippet.publishedAt || '';
      const publishedTimestamp = publishedAt ? Date.parse(publishedAt) : Date.now();

      videos.push({
        id: `yt_${videoId}`,
        videoId,
        title,
        description,
        videoUrl: isShort
          ? `https://www.youtube.com/shorts/${videoId}`
          : `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: {
          primary: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          fallback: snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        },
        isActive: true,
        isShort,
        category: classifyVideoCategory(title, description, isShort),
        duration: parsedDuration?.label,
        durationSeconds,
        publishedAt,
        publishedTimestamp: isNaN(publishedTimestamp) ? Date.now() : publishedTimestamp,
        embeddable: item?.status?.embeddable !== false,
        source: 'channel_api',
      });
    }
  }

  return { videos, channelTitle };
}

/**
 * Mode B (Zero API Key): Fetch latest 15 videos from YouTube Public RSS Feed.
 */
async function fetchChannelViaPublicRSS(
  channelId: string
): Promise<{ videos: SyncedYouTubeVideo[]; channelTitle: string }> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(rssUrl, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FalsawdiyaKrishiBazaar/1.0)',
      'Accept': 'application/atom+xml,application/xml,text/xml',
    },
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`YouTube RSS feed returned ${res.status}`);
  }

  const xml = await res.text();
  const feedTitleMatch = xml.match(/<feed[\s\S]*?<title>([\s\S]*?)<\/title>/i);
  const channelTitle = feedTitleMatch?.[1] ? decodeXmlEntities(feedTitleMatch[1]) : '';

  const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  const videos: SyncedYouTubeVideo[] = [];

  for (const entry of entryMatches) {
    const vidMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
    if (!vidMatch?.[1]) continue;
    const videoId = vidMatch[1].trim();

    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1] ? decodeXmlEntities(titleMatch[1]) : 'खेती की वीडियो';

    const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/i);
    const description = descMatch?.[1] ? decodeXmlEntities(descMatch[1]) : '';

    const linkMatch = entry.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i);
    const rawLink = linkMatch?.[1] || `https://www.youtube.com/watch?v=${videoId}`;

    const pubMatch = entry.match(/<published>([^<]+)<\/published>/i);
    const publishedAt = pubMatch?.[1]?.trim() || '';
    const parsedTs = publishedAt ? Date.parse(publishedAt) : Date.now();

    const thumbMatch = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
    const fallbackThumb = thumbMatch?.[1] || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const isShort =
      /youtube\.com\/shorts\//i.test(rawLink) ||
      /#shorts\b/i.test(`${title} ${description}`);

    videos.push({
      id: `yt_${videoId}`,
      videoId,
      title,
      description,
      videoUrl: isShort ? `https://www.youtube.com/shorts/${videoId}` : `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: {
        primary: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        fallback: fallbackThumb,
      },
      isActive: true,
      isShort,
      category: classifyVideoCategory(title, description, isShort),
      publishedAt,
      publishedTimestamp: isNaN(parsedTs) ? Date.now() : parsedTs,
      embeddable: true,
      source: 'channel_rss',
    });
  }

  return { videos, channelTitle };
}

/**
 * Incrementally merges RSS videos with previously cached videos for the same channel
 * so older channel videos remain preserved even when RSS window (15) rolls forward.
 */
function mergeIncrementalChannelVideos(
  freshVideos: SyncedYouTubeVideo[],
  previousVideos: SyncedYouTubeVideo[],
  mode: 'api' | 'rss'
): SyncedYouTubeVideo[] {
  if (mode === 'api') {
    // API returns authoritative full/recent catalog with privacy & embeddable status
    return freshVideos;
  }

  // RSS incremental merge: preserve older non-duplicate items
  const map = new Map<string, SyncedYouTubeVideo>();
  for (const prev of previousVideos) {
    if (prev.videoId) map.set(prev.videoId, prev);
  }
  for (const fresh of freshVideos) {
    if (!fresh.videoId) continue;
    const prev = map.get(fresh.videoId);
    map.set(fresh.videoId, prev ? { ...prev, ...fresh } : fresh);
  }

  return Array.from(map.values()).sort(
    (a, b) => (b.publishedTimestamp || 0) - (a.publishedTimestamp || 0)
  );
}

async function syncChannelHybrid(
  channelUrl: string,
  explicitChannelId?: string,
  forceRefresh: boolean = false
): Promise<{
  channelId: string | null;
  channelTitle: string;
  mode: 'api' | 'rss' | 'none';
  hasApiKeyConfigured: boolean;
  lastSyncAt: number;
  videos: SyncedYouTubeVideo[];
  cached: boolean;
  warning?: string;
}> {
  const apiKey = (process.env.YOUTUBE_API_KEY || '').trim();
  const hasApiKeyConfigured = Boolean(apiKey);
  const cacheKey = (explicitChannelId || channelUrl || '').trim().toLowerCase();

  if (!cacheKey) {
    return {
      channelId: null,
      channelTitle: '',
      mode: 'none',
      hasApiKeyConfigured,
      lastSyncAt: Date.now(),
      videos: [],
      cached: false,
    };
  }

  const now = Date.now();
  const existing = channelCaches.get(cacheKey);
  const needsApiUpgrade = hasApiKeyConfigured && existing?.mode === 'rss';

  if (
    !forceRefresh &&
    !needsApiUpgrade &&
    existing &&
    now - existing.lastSyncAt < CACHE_TTL_MS &&
    existing.videos.length > 0
  ) {
    return {
      channelId: existing.channelId,
      channelTitle: existing.channelTitle,
      mode: existing.mode,
      hasApiKeyConfigured,
      lastSyncAt: existing.lastSyncAt,
      videos: existing.videos,
      cached: true,
    };
  }

  const resolved = await resolveYouTubeChannelId(channelUrl, explicitChannelId, apiKey || undefined);
  if (!resolved.channelId) {
    if (existing) {
      return {
        channelId: existing.channelId,
        channelTitle: existing.channelTitle,
        mode: existing.mode,
        hasApiKeyConfigured,
        lastSyncAt: existing.lastSyncAt,
        videos: existing.videos,
        cached: true,
        warning: 'चैनल लिंक तुरंत सत्यापित नहीं हो सका, पुराना कैश डेटा दिखाया जा रहा है।',
      };
    }

    return {
      channelId: null,
      channelTitle: resolved.channelTitle || '',
      mode: 'none',
      hasApiKeyConfigured,
      lastSyncAt: now,
      videos: [],
      cached: false,
      warning: 'कृपया मान्य YouTube Channel URL (@Handle या Channel ID UC...) दर्ज करें।',
    };
  }

  const channelId = resolved.channelId;
  let channelTitle = resolved.channelTitle || existing?.channelTitle || '';
  let fetchedVideos: SyncedYouTubeVideo[] = [];
  let mode: 'api' | 'rss' = 'rss';
  let warning: string | undefined;
  let apiSucceeded = false;

  // Try Mode A (Official API) first if configured
  if (apiKey) {
    try {
      const apiResult = await fetchChannelViaYouTubeApi(channelId, apiKey, 100);
      fetchedVideos = apiResult.videos;
      if (apiResult.channelTitle) channelTitle = apiResult.channelTitle;
      mode = 'api';
      apiSucceeded = true;
    } catch (err: any) {
      const errMsg = err?.message || '';
      console.warn('[YouTube Hybrid] API mode failed, falling back to free RSS:', errMsg);
      warning = errMsg.includes('API key not valid') || errMsg.includes('403') || errMsg.includes('400')
        ? 'सर्वर पर जुड़ी YouTube API Key अमान्य है या YouTube Data API v3 चालू नहीं है — अभी फ्री RSS बैकअप उपयोग हो रहा है।'
        : 'YouTube API सीमा या अस्थायी त्रुटि के कारण फ्री RSS बैकअप उपयोग किया गया।';
    }
  }

  // Fallback or Primary Mode B (Free Public RSS) only if API is not configured or failed
  if (!apiSucceeded) {
    try {
      const rssResult = await fetchChannelViaPublicRSS(channelId);
      fetchedVideos = rssResult.videos;
      if (rssResult.channelTitle) channelTitle = rssResult.channelTitle;
      mode = 'rss';
    } catch (err: any) {
      console.warn('[YouTube Hybrid] RSS fetch failed:', err?.message || err);
      if (existing) {
        return {
          channelId: existing.channelId,
          channelTitle: existing.channelTitle,
          mode: existing.mode,
          hasApiKeyConfigured,
          lastSyncAt: existing.lastSyncAt,
          videos: existing.videos,
          cached: true,
          warning: 'ताज़ा सिंक अस्थायी रूप से विफल रहा; कैश वीडियो दिखाए जा रहे हैं।',
        };
      }
      warning = 'YouTube चैनल से वीडियो लाने में अस्थायी समस्या आई।';
    }
  }

  const mergedVideos = mergeIncrementalChannelVideos(
    fetchedVideos,
    existing?.videos || [],
    mode
  );

  const record: ChannelCacheRecord = {
    channelKey: cacheKey,
    channelId,
    channelTitle,
    mode,
    lastSyncAt: now,
    videos: mergedVideos,
  };
  channelCaches.set(cacheKey, record);
  if (channelId.toLowerCase() !== cacheKey) {
    channelCaches.set(channelId.toLowerCase(), record);
  }
  persistCachesToDisk();

  return {
    channelId,
    channelTitle,
    mode,
    hasApiKeyConfigured,
    lastSyncAt: now,
    videos: mergedVideos,
    cached: false,
    warning,
  };
}

/**
 * GET /api/videos/youtube?channelUrl=...&channelId=...&forceRefresh=false
 */
export const handleGetYouTubeVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const channelUrl = typeof req.query.channelUrl === 'string' ? req.query.channelUrl : '';
    const channelId = typeof req.query.channelId === 'string' ? req.query.channelId : '';
    const forceRefresh = req.query.forceRefresh === 'true';

    const result = await syncChannelHybrid(channelUrl, channelId, forceRefresh);
    res.setHeader(
      'Cache-Control',
      forceRefresh ? 'no-store' : 'public, s-maxage=21600, stale-while-revalidate=43200'
    );
    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[GET /api/videos/youtube] Error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'वीडियो लोड करने में त्रुटि हुई',
      videos: [],
      mode: 'none',
    });
  }
};

/**
 * POST /api/videos/sync
 * Body: { channelUrl?: string, channelId?: string }
 */
export const handleSyncYouTubeVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelUrl = '', channelId = '' } = req.body || {};
    if (!channelUrl && !channelId) {
      res.status(400).json({
        success: false,
        error: 'कृपया पहले अपने YouTube चैनल का URL या Channel ID दर्ज करें।',
      });
      return;
    }

    const result = await syncChannelHybrid(String(channelUrl), String(channelId), true);
    res.json({
      success: Boolean(result.channelId),
      ...result,
      message: result.channelId
        ? `सफलतापूर्वक ${result.videos.length} वीडियो सिंक हुए (${result.mode === 'api' ? 'YouTube API v3' : 'मुफ्त YouTube RSS'})`
        : result.warning || 'चैनल की पहचान नहीं हो सकी।',
    });
  } catch (err: any) {
    console.error('[POST /api/videos/sync] Error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'चैनल सिंक करने में समस्या आई',
    });
  }
};

export function clearVideoMemoryCaches(): void {
  channelCaches.clear();
  resolvedHandleCache.clear();
}

