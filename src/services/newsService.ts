import { GoogleGenAI } from "@google/genai";
import { getFriendlyAiError } from "../utils/aiErrorHandler";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export interface AgriNewsItem {
  title: string;
  summary: string;
  date: string; // Strictly DD/MM/YYYY
  source: string;
  url: string;
  category: 'MP' | 'India' | 'Scheme' | 'Weather' | 'Crop' | 'Market' | 'Tech' | 'Innovation';
}

export interface AgriNewsResponse {
  items: AgriNewsItem[];
  isCached: boolean;
  isOfflineFallback: boolean;
  syncFailed: boolean;
  hasTodayNews: boolean;
  lastSyncedTime?: string;
  lastSyncedTimestamp?: number;
}

export interface AgriNewsSyncLog {
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'CACHED' | 'FALLBACK';
  message: string;
  details?: any;
}

/**
 * Maximum age for agricultural news items to be considered fresh (in days).
 * Any article older than this is excluded from the active feed.
 */
export const MAX_NEWS_AGE_DAYS = 30;

/**
 * Format any date object strictly into DD/MM/YYYY format.
 */
export const getFormattedDateString = (dateOb?: Date): string => {
  const d = dateOb || new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Parse DD/MM/YYYY string into a Date object for reliable sorting and age comparison.
 */
export const parseDDMMYYYY = (dateStr: string): Date => {
  if (!dateStr) return new Date(0);
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return new Date(0);
};

/**
 * Strict freshness validator for agricultural news articles.
 * Rejects articles that:
 * 1. Have invalid or unparseable dates.
 * 2. Are stamped with past years (e.g., 2024, 2023 when current year is 2026).
 * 3. Have publication dates older than MAX_NEWS_AGE_DAYS (30 days).
 * 4. Contain outdated year references (e.g. '2024', '2024-25', '2023-24') in the title or summary.
 */
export const validateArticleFreshness = (
  item: AgriNewsItem,
  referenceDate: Date = new Date()
): { isValid: boolean; reason?: string } => {
  if (!item || !item.title || !item.summary || !item.date) {
    return { isValid: false, reason: "Missing required fields" };
  }

  const parsedDate = parseDDMMYYYY(item.date);
  if (!parsedDate || isNaN(parsedDate.getTime()) || parsedDate.getTime() === 0) {
    return { isValid: false, reason: "Invalid date format" };
  }

  const currentYear = referenceDate.getFullYear();
  const articleYear = parsedDate.getFullYear();

  // Reject articles from older years
  if (articleYear < currentYear) {
    return { isValid: false, reason: `Article year (${articleYear}) is older than current year (${currentYear})` };
  }

  // Reject articles with dates far into the future (> 2 days ahead due to timezone differences)
  const diffTime = parsedDate.getTime() - referenceDate.getTime();
  const diffDaysAhead = diffTime / (1000 * 60 * 60 * 24);
  if (diffDaysAhead > 2) {
    return { isValid: false, reason: "Article date is in the future" };
  }

  // Check age limit (must not be older than MAX_NEWS_AGE_DAYS)
  const refMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();
  const itemMidnight = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()).getTime();
  const ageInDays = (refMidnight - itemMidnight) / (1000 * 60 * 60 * 24);
  if (ageInDays > MAX_NEWS_AGE_DAYS) {
    return { isValid: false, reason: `Article is ${Math.round(ageInDays)} days old (limit: ${MAX_NEWS_AGE_DAYS} days)` };
  }

  // Strict text inspection: reject obsolete years
  const outdatedYearRegex = /\b(?:202[0-4]|2024-25|2023-24|2022-23)\b/i;
  if (outdatedYearRegex.test(item.title)) {
    return { isValid: false, reason: "Title mentions outdated year (e.g. 2024/2024-25)" };
  }
  if (outdatedYearRegex.test(item.summary)) {
    return { isValid: false, reason: "Summary mentions outdated year (e.g. 2024/2024-25)" };
  }

  return { isValid: true };
};

/**
 * Formats a last sync epoch timestamp into a truthful, human-friendly Hindi label.
 * NEVER displays "आज" falsely if the sync occurred on an earlier date.
 */
export const formatLastSyncText = (timestampMs?: number): string | undefined => {
  if (!timestampMs || isNaN(timestampMs) || timestampMs <= 0) return undefined;

  const syncDate = new Date(timestampMs);
  const now = new Date();

  const isToday = (
    syncDate.getDate() === now.getDate() &&
    syncDate.getMonth() === now.getMonth() &&
    syncDate.getFullYear() === now.getFullYear()
  );

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = (
    syncDate.getDate() === yesterday.getDate() &&
    syncDate.getMonth() === yesterday.getMonth() &&
    syncDate.getFullYear() === yesterday.getFullYear()
  );

  const timeStr = syncDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();

  if (isToday) {
    return `${timeStr} (आज)`;
  }

  if (isYesterday) {
    return `${timeStr} (कल)`;
  }

  const months = [
    "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
  ];
  return `${syncDate.getDate()} ${months[syncDate.getMonth()]} ${syncDate.getFullYear()}, ${timeStr}`;
};

/**
 * Records diagnostic sync logs to localStorage and console for auditing and monitoring.
 */
export const recordSyncLog = (
  status: 'SUCCESS' | 'FAILED' | 'CACHED' | 'FALLBACK',
  message: string,
  details?: any
) => {
  const logEntry: AgriNewsSyncLog = {
    timestamp: new Date().toISOString(),
    status,
    message,
    details
  };

  try {
    const LOGS_KEY = 'agri_news_sync_logs_v5';
    const existingLogsStr = localStorage.getItem(LOGS_KEY);
    let logs: AgriNewsSyncLog[] = existingLogsStr ? JSON.parse(existingLogsStr) : [];
    logs.unshift(logEntry);
    if (logs.length > 25) {
      logs = logs.slice(0, 25);
    }
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    // Ignore localStorage write error
  }

  if (status === 'FAILED') {
    console.error(`[AgriNews Sync] ❌ ${message}`, details || '');
  } else if (status === 'SUCCESS') {
    console.log(`[AgriNews Sync] ✅ ${message}`, details || '');
  } else {
    console.log(`[AgriNews Sync] ℹ️ ${message}`, details || '');
  }
};

/**
 * Verified evergreen agricultural advisories (clearly tagged as guidance)
 * Used ONLY if the user is completely offline on initial install and has zero cache.
 * NEVER forges breaking news dates.
 */
export const generateFallbacks = (referenceDate: Date = new Date()): AgriNewsItem[] => {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const advisoryDate = `01/${currentMonth}/${currentYear}`;

  return [
    {
      title: "कृषि परामर्श: मुख्यमंत्री किसान कल्याण योजना ई-केवाईसी सत्यापन प्रक्रिया",
      summary: "मध्य प्रदेश कृषि विभाग द्वारा पंजीकृत लघु एवं सीमांत किसानों के बैंक खातों में डीबीटी के माध्यम से किसान कल्याण राशि प्राप्त करने हेतु आधार व ई-केवाईसी सत्यापन अनिवार्य किया गया है। किसान भाई अपने नजदीकी सहकारी बैंक या एमपी ऑनलाइन केंद्र से सत्यापन पूर्ण रखें।",
      date: advisoryDate,
      source: "कृषि विभाग, MP",
      url: "https://mpkrishi.mp.gov.in/",
      category: "MP"
    },
    {
      title: "मंडी विपणन परामर्श: सोयाबीन व मक्का उपज को सुखाकर और साफ करके लाने का सुझाव",
      summary: "कृषि उपज मंडियों में खरीफ फसलों की आवक के दौरान न्यूनतम समर्थन मूल्य और बेहतर भाव प्राप्त करने हेतु किसान भाइयों को सलाह दी जाती है कि उपज में नमी की मात्रा मानक अनुसार रखें और साफ-सफाई करके ही विक्रय हेतु लाएं।",
      date: advisoryDate,
      source: "मंडी समिति",
      url: "https://enam.gov.in/",
      category: "Market"
    },
    {
      title: "प्रधानमंत्री फसल बीमा योजना: फसल क्षति सूचना दर्ज कराने की 72 घंटे की प्रक्रिया",
      summary: "अतिवृष्टि या कीट प्रकोप से प्रभावित फसल की स्थिति में किसान भाइयों को 72 घंटे के भीतर प्रधानमंत्री फसल बीमा पोर्टल या संबंधित बीमा कंपनी के टोल-फ्री नंबर पर सूचना दर्ज कराना आवश्यक है ताकि त्वरित स्थलीय निरीक्षण हो सके।",
      date: advisoryDate,
      source: "कृषि जागरण",
      url: "https://pmfby.gov.in/",
      category: "Scheme"
    },
    {
      title: "मौसम सतर्कता: खेतों में जल निकासी की समुचित व्यवस्था रखने की सलाह",
      summary: "वर्षा एवं मौसम में उतार-चढ़ाव को देखते हुए खेतों में अनावश्यक जल-जमाव से बचाव के लिए जल निकासी की उचित व्यवस्था रखें जिससे फसलों की जड़ों में सड़न व फफूंद जनित रोगों का प्रकोप न हो।",
      date: advisoryDate,
      source: "IMD मौसम सेवा",
      url: "https://mausam.imd.gov.in/",
      category: "Weather"
    },
    {
      title: "रबी फसल तैयारी: गेहूं एवं चना बुवाई पूर्व बीजोपचार की वैज्ञानिक विधि",
      summary: "कृषि वैज्ञानिकों के अनुसार रबी फसलों में उन्नत उत्पादन के लिए प्रमाणित बीजों का चयन करें तथा बुवाई से पूर्व ट्राइकोडर्मा या उपयुक्त कवकनाशी से बीजोपचार अवश्य करें जिससे बीज जनित रोगों से सुरक्षा मिले।",
      date: advisoryDate,
      source: "ICAR अनुसंधान",
      url: "https://icar.org.in/",
      category: "Crop"
    }
  ];
};

/**
 * Deduplicates and merges news arrays while filtering out any stale or invalid items.
 * Items with duplicate titles (case-insensitive, whitespace trimmed) are merged, retaining the newer entry.
 * The resulting array is sorted strictly by publication date descending.
 */
export const mergeAndDeduplicateNews = (
  existing: AgriNewsItem[],
  newlyFetched: AgriNewsItem[],
  referenceDate: Date = new Date()
): AgriNewsItem[] => {
  const map = new Map<string, AgriNewsItem>();

  // Add existing items if they pass the freshness check
  existing.forEach(item => {
    if (validateArticleFreshness(item, referenceDate).isValid) {
      const key = item.title.trim().toLowerCase();
      map.set(key, item);
    }
  });

  // Add/Overwrite with newly fetched items if valid
  newlyFetched.forEach(item => {
    if (validateArticleFreshness(item, referenceDate).isValid) {
      const key = item.title.trim().toLowerCase();
      const current = map.get(key);
      if (!current || parseDDMMYYYY(item.date).getTime() >= parseDDMMYYYY(current.date).getTime()) {
        map.set(key, item);
      }
    }
  });

  const merged = Array.from(map.values());

  // Sort by parsed date descending (latest first)
  merged.sort((a, b) => parseDDMMYYYY(b.date).getTime() - parseDDMMYYYY(a.date).getTime());

  // Keep a maximum of 50 items for storage efficiency
  return merged.slice(0, 50);
};

export const fetchAgriNews = async (userApiKey?: string, forceRefresh: boolean = false): Promise<AgriNewsResponse> => {
  const now = new Date();
  const todayStr = getFormattedDateString(now);

  // Storage keys with versioning (v5) to cleanly purge contaminated old caches
  const CACHE_KEY = 'agri_news_cache_v5';
  const CACHE_TIME_KEY = 'agri_news_cache_time_v5';
  const CACHE_SYNC_TIMESTAMP_KEY = 'agri_news_last_sync_timestamp_v5';

  // Purge legacy contaminated caches (v4, v3, v2)
  try {
    localStorage.removeItem('agri_news_cache_v4');
    localStorage.removeItem('agri_news_cache_time_v4');
    localStorage.removeItem('agri_news_last_sync_timestamp_v4');
    localStorage.removeItem('agri_news_cache_v3');
    localStorage.removeItem('agri_news_cache_time_v3');
    localStorage.removeItem('agri_news_last_sync_v3');
    localStorage.removeItem('agri_news_cache_v2');
  } catch (e) {
    // Ignore error
  }

  const cachedDataStr = localStorage.getItem(CACHE_KEY);
  const cachedTimestampStr = localStorage.getItem(CACHE_SYNC_TIMESTAMP_KEY);
  const lastSyncTimestamp = cachedTimestampStr ? parseInt(cachedTimestampStr, 10) : undefined;
  const lastSyncFormatted = formatLastSyncText(lastSyncTimestamp);

  let currentCache: AgriNewsItem[] = [];
  if (cachedDataStr) {
    try {
      const parsed = JSON.parse(cachedDataStr);
      if (Array.isArray(parsed)) {
        currentCache = parsed.filter(item => validateArticleFreshness(item, now).isValid);
      }
    } catch (e) {
      console.warn("Error parsing cache, initializing fresh cache.", e);
    }
  }

  const CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours client cache
  const cacheTimeStr = localStorage.getItem(CACHE_TIME_KEY);
  const cacheAge = cacheTimeStr ? (now.getTime() - parseInt(cacheTimeStr, 10)) : Infinity;

  // 1. If not forcing refresh, and cache has items and is less than 2 hours old, serve cached data
  if (!forceRefresh && currentCache.length > 0 && cacheAge < CACHE_MAX_AGE_MS) {
    recordSyncLog('CACHED', `Serving cached real news for ${todayStr}`, {
      count: currentCache.length,
      lastSynced: lastSyncFormatted
    });
    return {
      items: currentCache,
      isCached: true,
      isOfflineFallback: false,
      syncFailed: false,
      hasTodayNews: currentCache.some(item => item.date === todayStr),
      lastSyncedTime: lastSyncFormatted,
      lastSyncedTimestamp: lastSyncTimestamp
    };
  }

  // 2. Centralized Real News Hub (Powered by live verified agricultural RSS feeds)
  try {
    const srvRes = await fetch(`/api/news/daily?forceRefresh=${forceRefresh ? 'true' : 'false'}`);
    if (srvRes.ok) {
      const srvJson = await srvRes.json();
      if (srvJson.success && Array.isArray(srvJson.items) && srvJson.items.length > 0) {
        const validServerItems = srvJson.items.filter((it: AgriNewsItem) => validateArticleFreshness(it, now).isValid);
        if (validServerItems.length > 0) {
          console.log(`[Central News Hub Hit] Loaded ${validServerItems.length} live news items from server`);
          const srvTimestamp = srvJson.lastSyncedTimestamp || now.getTime();
          localStorage.setItem(CACHE_KEY, JSON.stringify(validServerItems));
          localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());
          localStorage.setItem(CACHE_SYNC_TIMESTAMP_KEY, srvTimestamp.toString());

          const formattedTime = formatLastSyncText(srvTimestamp);
          recordSyncLog('SUCCESS', `Loaded ${validServerItems.length} items from Central Hub`, {
            cached: srvJson.cached,
            syncTime: formattedTime
          });

          return {
            items: validServerItems,
            isCached: srvJson.cached || false,
            isOfflineFallback: false,
            syncFailed: false,
            hasTodayNews: validServerItems.some(i => i.date === todayStr),
            lastSyncedTime: formattedTime,
            lastSyncedTimestamp: srvTimestamp
          };
        }
      }
    }
  } catch (srvErr) {
    console.warn('[Central News Hub] Server check skipped or offline:', srvErr);
  }

  // 3. Optional Gemini AI Direct Enrichment (If user provided their own key)
  if (userApiKey && userApiKey.trim() !== '') {
    try {
      const ai = getAI(userApiKey);
      if (ai) {
        const currentYear = now.getFullYear();
        const prompt = `आज ${todayStr} (वर्ष ${currentYear}) के लिए विश्वसनीय भारतीय कृषि स्रोतों जैसे 'Krishi Jagran', 'ICAR', 'DD Kisan' से मध्य प्रदेश और भारत के लिए 5-10 ताज़ा कृषि समाचार प्रदान करें। केवल वर्ष ${currentYear} के समाचार हों। प्रत्येक समाचार में शीर्षक, सारांश, वास्तविक प्रकाशन तिथि (DD/MM/YYYY), स्रोत, और श्रेणी प्रदान करें।`;

        // Strict adherence to Rule 5: Primary gemini-3.6-flash, fallback gemini-3.5-flash
        const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];
        let aiResponse: any = null;

        for (const m of models) {
          try {
            aiResponse = await ai.models.generateContent({
              model: m,
              contents: prompt,
              config: {
                systemInstruction: `You are an Agricultural News editor for 'फल्सावदिया कृषि बाजार'. Return valid JSON array of agricultural news for year ${currentYear}. Format: [{"title":"...","summary":"...","date":"DD/MM/YYYY","source":"...","url":"...","category":"Crop|Market|Weather|Scheme|MP|Tech|India|Innovation"}]`,
                responseMimeType: "application/json"
              }
            });
            if (aiResponse?.text) break;
          } catch (e) {
            console.warn(`[Gemini News] Model ${m} attempt notice:`, e);
          }
        }

        if (aiResponse?.text) {
          const fetchedItems: AgriNewsItem[] = JSON.parse(aiResponse.text);
          if (Array.isArray(fetchedItems) && fetchedItems.length > 0) {
            const validAiItems = fetchedItems.filter(item => validateArticleFreshness(item, now).isValid);
            if (validAiItems.length > 0) {
              const mergedList = mergeAndDeduplicateNews(currentCache, validAiItems, now);
              const newSyncTimestamp = Date.now();
              localStorage.setItem(CACHE_KEY, JSON.stringify(mergedList));
              localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());
              localStorage.setItem(CACHE_SYNC_TIMESTAMP_KEY, newSyncTimestamp.toString());

              const newSyncFormatted = formatLastSyncText(newSyncTimestamp);
              recordSyncLog('SUCCESS', `AI synced ${validAiItems.length} fresh articles`);

              return {
                items: mergedList,
                isCached: false,
                isOfflineFallback: false,
                syncFailed: false,
                hasTodayNews: mergedList.some(item => item.date === todayStr),
                lastSyncedTime: newSyncFormatted,
                lastSyncedTimestamp: newSyncTimestamp
              };
            }
          }
        }
      }
    } catch (aiErr) {
      console.warn('[Gemini AI News] Direct call skipped:', aiErr);
    }
  }

  // 4. If currentCache already has valid news from earlier, serve it
  if (currentCache.length > 0) {
    return {
      items: currentCache,
      isCached: true,
      isOfflineFallback: false,
      syncFailed: false,
      hasTodayNews: currentCache.some(item => item.date === todayStr),
      lastSyncedTime: lastSyncFormatted,
      lastSyncedTimestamp: lastSyncTimestamp
    };
  }

  // 5. Honest offline fallback (no fake breaking news dates)
  const fallbacks = generateFallbacks(now);
  return {
    items: fallbacks,
    isCached: true,
    isOfflineFallback: true,
    syncFailed: false,
    hasTodayNews: false,
    lastSyncedTime: undefined,
    lastSyncedTimestamp: undefined
  };
};
