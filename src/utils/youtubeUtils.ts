import { YouTubeVideoItem, ImageSource } from '../types';

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
    // Standard watch URL: youtube.com/watch?v=XXXXX
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/i,
    // Shortened URL: youtu.be/XXXXX
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    // Shorts URL: youtube.com/shorts/XXXXX
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    // Embed URL: youtube.com/embed/XXXXX
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    // V URL: youtube.com/v/XXXXX
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
    // General fallback matching 11 chars after last slash or parameter
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
 * Normalizes an array of videos ensuring valid IDs, order, and isActive flag.
 * If list is empty, returns DEFAULT_VIDEOS.
 */
export function normalizeVideos(rawVideos?: any[]): YouTubeVideoItem[] {
  if (!rawVideos || !Array.isArray(rawVideos) || rawVideos.length === 0) {
    return DEFAULT_VIDEOS;
  }

  return rawVideos.map((item, index) => {
    const videoUrl = item.videoUrl || (item.videoId ? formatYouTubeWatchUrl(item.videoId) : '');
    const videoId = item.videoId || extractYouTubeVideoId(videoUrl) || '';
    
    let thumbnail = item.thumbnail;
    if (!thumbnail || (typeof thumbnail === 'string' && thumbnail.trim() === '')) {
      if (videoId) {
        thumbnail = getYouTubeThumbnailSource(videoId);
      } else {
        thumbnail = '';
      }
    }

    return {
      id: item.id || `video_${Date.now()}_${index}`,
      title: item.title || 'खेती की वीडियो',
      videoUrl: videoUrl,
      videoId: videoId,
      description: item.description || '',
      thumbnail: thumbnail,
      isActive: item.isActive !== false, // default true
      displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : index + 1,
      createdAt: item.createdAt || Date.now()
    };
  });
}
