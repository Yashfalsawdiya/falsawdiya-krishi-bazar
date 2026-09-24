import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export interface AgriNewsItem {
  title: string;
  summary: string;
  date: string; // Strictly DD/MM/YYYY
  source: string;
  url: string;
  category: 'MP' | 'India' | 'Scheme' | 'Weather' | 'Crop' | 'Market' | 'Tech' | 'Innovation';
}

interface NewsCacheState {
  dateStr: string;
  timestamp: number;
  items: AgriNewsItem[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const NEWS_CACHE_FILE = path.join(DATA_DIR, 'agri-news-cache.json');
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours server cache TTL

let centralNewsCache: NewsCacheState | null = null;

// Initialize from disk if available
try {
  if (fs.existsSync(NEWS_CACHE_FILE)) {
    const raw = fs.readFileSync(NEWS_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
      centralNewsCache = parsed;
      console.log(`[Central News Cache] Restored ${parsed.items.length} items from disk cache`);
    }
  }
} catch (e) {
  console.warn('[Central News Cache] Disk cache load skipped:', e);
}

const saveCacheToDisk = (state: NewsCacheState) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(NEWS_CACHE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem in serverless
  }
};

const getTodayDateStr = (): string => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * GET /api/news/daily
 * Returns centralized agricultural news for all users.
 */
export const handleGetDailyNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const forceRefresh = req.query.forceRefresh === 'true';
    const now = Date.now();
    const todayStr = getTodayDateStr();

    // 1. Check in-memory central cache
    if (!forceRefresh && centralNewsCache && centralNewsCache.items.length > 0) {
      const isStillFresh = now - centralNewsCache.timestamp < CACHE_TTL_MS;
      if (isStillFresh) {
        console.log(`[Central News Cache Hit] Serving ${centralNewsCache.items.length} items to client`);
        res.json({
          success: true,
          cached: true,
          count: centralNewsCache.items.length,
          lastSyncedTimestamp: centralNewsCache.timestamp,
          items: centralNewsCache.items
        });
        return;
      }
    }

    // 2. Try server-side generation if GEMINI_API_KEY is available in environment
    const serverKey = process.env.GEMINI_API_KEY?.trim();
    if (serverKey) {
      try {
        console.log('[Central News Cache] Server fetching fresh news via Gemini Search Grounding...');
        const ai = new GoogleGenAI({ apiKey: serverKey });
        const currentYear = new Date().getFullYear();

        const prompt = `आज ${todayStr} (वर्ष ${currentYear}) के लिए विश्वसनीय भारतीय कृषि स्रोतों जैसे 'Krishi Jagran' (krishijagran.com), 'ICAR', 'DD Kisan', और आधिकारिक कृषि विभाग से भारत एवं विशेष रूप से मध्य प्रदेश (Madhya Pradesh) के लिए नवीनतम और ताज़ा 10-15 कृषि समाचार (Agricultural News) खोजें।
        
कृषि से जुड़े विषयों पर ही केवल वास्तविक (Real) और प्रमाणित समाचार आइटम प्रदान करें।
नियम:
1. केवल वर्तमान वर्ष (${currentYear}) के सक्रिय समाचार। 2024 या पुराने वर्ष कतई न दें।
2. "date" में समाचार की वास्तविक मूल प्रकाशन तिथि DD/MM/YYYY फॉर्मेट में ही दें।
3. JSON ऐरे रिटर्न करें।`;

        let response;
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'ARRAY' as any,
                items: {
                  type: 'OBJECT' as any,
                  properties: {
                    title: { type: 'STRING' },
                    summary: { type: 'STRING' },
                    date: { type: 'STRING' },
                    source: { type: 'STRING' },
                    url: { type: 'STRING' },
                    category: { 
                      type: 'STRING',
                      enum: ['MP', 'India', 'Scheme', 'Weather', 'Crop', 'Market', 'Tech', 'Innovation'] 
                    }
                  },
                  required: ['title', 'summary', 'date', 'source', 'url', 'category']
                }
              }
            }
          });
        } catch (searchErr) {
          console.warn('[Central News Cache] Server search grounding failed, falling back to core knowledge...');
          response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'ARRAY' as any,
                items: {
                  type: 'OBJECT' as any,
                  properties: {
                    title: { type: 'STRING' },
                    summary: { type: 'STRING' },
                    date: { type: 'STRING' },
                    source: { type: 'STRING' },
                    url: { type: 'STRING' },
                    category: { 
                      type: 'STRING',
                      enum: ['MP', 'India', 'Scheme', 'Weather', 'Crop', 'Market', 'Tech', 'Innovation'] 
                    }
                  },
                  required: ['title', 'summary', 'date', 'source', 'url', 'category']
                }
              }
            }
          });
        }

        const items: AgriNewsItem[] = JSON.parse(response.text || '[]');
        if (Array.isArray(items) && items.length > 0) {
          centralNewsCache = {
            dateStr: todayStr,
            timestamp: now,
            items
          };
          saveCacheToDisk(centralNewsCache);
          console.log(`[Central News Cache] Server successfully populated ${items.length} news items`);

          res.json({
            success: true,
            cached: false,
            count: items.length,
            lastSyncedTimestamp: now,
            items
          });
          return;
        }
      } catch (srvErr) {
        console.warn('[Central News Cache] Server-side news fetch failed:', srvErr);
      }
    }

    // 3. If cache exists even if older than TTL, serve it as stale-while-revalidate rather than empty
    if (centralNewsCache && centralNewsCache.items.length > 0) {
      console.log(`[Central News Cache Stale] Serving ${centralNewsCache.items.length} items`);
      res.json({
        success: true,
        cached: true,
        stale: true,
        count: centralNewsCache.items.length,
        lastSyncedTimestamp: centralNewsCache.timestamp,
        items: centralNewsCache.items
      });
      return;
    }

    // 4. Cache is currently empty
    res.json({
      success: false,
      cached: false,
      items: [],
      message: 'Central news cache is empty. Client will generate and sync.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'News fetch error' });
  }
};

/**
 * POST /api/news/sync
 * Allows any client device that generated fresh news to upload it to the Central Hub
 * so all subsequent farmers across India immediately get the updated feed!
 */
export const handleSyncNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, clientDate } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Valid items array required' });
      return;
    }

    const todayStr = clientDate || getTodayDateStr();
    const now = Date.now();

    centralNewsCache = {
      dateStr: todayStr,
      timestamp: now,
      items: items.slice(0, 30) // cap to reasonable length
    };

    saveCacheToDisk(centralNewsCache);
    console.log(`[Central News Hub] Synced ${centralNewsCache.items.length} news items from client device for ${todayStr}`);

    res.json({
      success: true,
      message: 'Central news cache successfully updated',
      count: centralNewsCache.items.length,
      timestamp: now
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Sync failed' });
  }
};
