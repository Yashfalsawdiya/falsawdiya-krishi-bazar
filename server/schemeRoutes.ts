import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export interface SchemeItem {
  title: string;
  description: string;
  objective: string;
  benefits: string[];
  subsidyDetails: string;
  sector: string;
  governmentLevel: 'Central' | 'State' | string;
  eligibility: string;
  requiredDocuments: string[];
  howToApply: string;
  link?: string;
  category?: string;
  type?: string;
}

interface SchemeCacheState {
  timestamp: number;
  items: SchemeItem[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SCHEMES_CACHE_FILE = path.join(DATA_DIR, 'agri-schemes-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours cache TTL

let centralSchemesCache: SchemeCacheState | null = null;

// Initialize from disk if available
try {
  if (fs.existsSync(SCHEMES_CACHE_FILE)) {
    const raw = fs.readFileSync(SCHEMES_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
      centralSchemesCache = parsed;
      console.log(`[Central Scheme Cache] Restored ${parsed.items.length} schemes from disk cache`);
    }
  }
} catch (e) {
  console.warn('[Central Scheme Cache] Disk cache load skipped:', e);
}

const saveCacheToDisk = (state: SchemeCacheState) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SCHEMES_CACHE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem in serverless
  }
};

/**
 * GET /api/schemes/all
 * Returns centralized government schemes for all users.
 */
export const handleGetSchemes = async (req: Request, res: Response): Promise<void> => {
  try {
    const forceRefresh = req.query.forceRefresh === 'true';
    const now = Date.now();

    // 1. Check in-memory central cache
    if (!forceRefresh && centralSchemesCache && centralSchemesCache.items.length > 0) {
      const isStillFresh = now - centralSchemesCache.timestamp < CACHE_TTL_MS;
      if (isStillFresh) {
        console.log(`[Central Scheme Cache Hit] Serving ${centralSchemesCache.items.length} schemes to client`);
        res.json({
          success: true,
          cached: true,
          count: centralSchemesCache.items.length,
          lastSyncedTimestamp: centralSchemesCache.timestamp,
          items: centralSchemesCache.items
        });
        return;
      }
    }

    // 2. Try server-side generation if GEMINI_API_KEY is available
    const serverKey = process.env.GEMINI_API_KEY?.trim();
    if (serverKey) {
      try {
        console.log('[Central Scheme Cache] Server fetching fresh schemes via Gemini...');
        const ai = new GoogleGenAI({ apiKey: serverKey });
        const dateStr = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

        const prompt = `आज ${dateStr} तक की जानकारी के अनुसार भारत (Central Govt) और मध्य प्रदेश (MP State Govt) की नवीनतम और सबसे महत्वपूर्ण 20 कृषि योजनाओं (Government Schemes for Farmers) की बहुत ही विस्तृत और प्रोफेशनल सूची प्रदान करें।
        
प्रत्येक योजना में निम्नलिखित जानकारी शामिल होनी चाहिए (Strictly JSON array):
- title: योजना का पूरा नाम
- governmentLevel: 'Central' या 'State'
- description: संक्षिप्त विवरण
- objective: योजना का मुख्य उद्देश्य (विस्तार से)
- benefits: किसान को मिलने वाले लाभ (Array of strings)
- subsidyDetails: सब्सिडी या वित्तीय सहायता का विवरण
- sector: संबंधित क्षेत्र (जैस Infrastructure, Irrigation, Solar, Tractor, Insurance, Fertilizer, Dairy आदि)
- eligibility: कौन आवेदन कर सकता है
- requiredDocuments: आवश्यक दस्तावेज (Array of strings)
- howToApply: आवेदन कैसे करें
- link: आधिकारिक सरकारी वेबसाइट लिंक`;

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
                    governmentLevel: { type: 'STRING' },
                    description: { type: 'STRING' },
                    objective: { type: 'STRING' },
                    benefits: { type: 'ARRAY' as any, items: { type: 'STRING' } },
                    subsidyDetails: { type: 'STRING' },
                    sector: { type: 'STRING' },
                    eligibility: { type: 'STRING' },
                    requiredDocuments: { type: 'ARRAY' as any, items: { type: 'STRING' } },
                    howToApply: { type: 'STRING' },
                    link: { type: 'STRING' }
                  },
                  required: ['title', 'governmentLevel', 'description', 'objective', 'benefits', 'subsidyDetails', 'sector', 'eligibility', 'requiredDocuments', 'howToApply']
                }
              }
            }
          });
        } catch (searchErr) {
          console.warn('[Central Scheme Cache] Search grounding failed, using standard model generation...');
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
                    governmentLevel: { type: 'STRING' },
                    description: { type: 'STRING' },
                    objective: { type: 'STRING' },
                    benefits: { type: 'ARRAY' as any, items: { type: 'STRING' } },
                    subsidyDetails: { type: 'STRING' },
                    sector: { type: 'STRING' },
                    eligibility: { type: 'STRING' },
                    requiredDocuments: { type: 'ARRAY' as any, items: { type: 'STRING' } },
                    howToApply: { type: 'STRING' },
                    link: { type: 'STRING' }
                  },
                  required: ['title', 'governmentLevel', 'description', 'objective', 'benefits', 'subsidyDetails', 'sector', 'eligibility', 'requiredDocuments', 'howToApply']
                }
              }
            }
          });
        }

        const items: SchemeItem[] = JSON.parse(response.text || '[]');
        if (Array.isArray(items) && items.length > 0) {
          centralSchemesCache = {
            timestamp: now,
            items
          };
          saveCacheToDisk(centralSchemesCache);
          console.log(`[Central Scheme Cache] Server successfully populated ${items.length} schemes`);

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
        console.warn('[Central Scheme Cache] Server-side schemes fetch failed:', srvErr);
      }
    }

    // 3. Stale cache fallback
    if (centralSchemesCache && centralSchemesCache.items.length > 0) {
      console.log(`[Central Scheme Cache Stale] Serving ${centralSchemesCache.items.length} schemes`);
      res.json({
        success: true,
        cached: true,
        stale: true,
        count: centralSchemesCache.items.length,
        lastSyncedTimestamp: centralSchemesCache.timestamp,
        items: centralSchemesCache.items
      });
      return;
    }

    // 4. Cache empty
    res.json({
      success: false,
      cached: false,
      items: [],
      message: 'Central schemes cache is empty. Client will generate and sync.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Schemes fetch error' });
  }
};

/**
 * POST /api/schemes/sync
 * Allows any client device that loaded fresh schemes to store it into the Central Hub
 * so all subsequent users across India get instant access without API quotas!
 */
export const handleSyncSchemes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Valid items array required' });
      return;
    }

    const now = Date.now();
    centralSchemesCache = {
      timestamp: now,
      items: items.slice(0, 40)
    };

    saveCacheToDisk(centralSchemesCache);
    console.log(`[Central Schemes Hub] Synced ${centralSchemesCache.items.length} schemes from client device`);

    res.json({
      success: true,
      message: 'Central schemes cache successfully updated',
      count: centralSchemesCache.items.length,
      timestamp: now
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Sync failed' });
  }
};
