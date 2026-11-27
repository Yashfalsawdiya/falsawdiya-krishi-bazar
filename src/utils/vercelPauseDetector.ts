import { useEffect, useState } from 'react';
import { MonthlyLimitNoticeConfig } from '../types';

export const VERCEL_PAUSE_EVENT = 'fkb:vercel_pause_state';

export const DEFAULT_MONTHLY_LIMIT_NOTICE: Required<MonthlyLimitNoticeConfig> = {
  enabled: false,
  autoDetectVercelPause: true,
  badgeText: 'मासिक निःशुल्क सेवा सीमा सूचना',
  title: 'इस माह की निःशुल्क सेवा सीमा पूर्ण हो चुकी है',
  message:
    'नमस्ते किसान भाइयों,\n\n' +
    'फल्सावदिया कृषि बाजार को आप सभी तक पूरी तरह निःशुल्क (₹0 शुल्क) पहुँचाने के लिए एडमिन द्वारा हर संभव प्रयास किया जाता है। आम तौर पर ऐसे ऐप और लाइव सेवाएँ चलाने में हर महीने लाखों रुपये का सर्वर खर्च आता है, फिर भी एडमिन अपनी ओर से हर महीने की उपलब्ध सीमा तक यह पूरी सुविधा आपको बिना किसी शुल्क के उपलब्ध कराता है।\n\n' +
    'इस महीने बड़ी संख्या में किसान भाइयों के उपयोग के कारण इस माह की निःशुल्क सर्वर सीमा पूर्ण हो चुकी है, जिसके कारण ऐप की सेवाएँ अस्थायी रूप से रुक गई हैं।\n\n' +
    'अब आपसे केवल इतना विनम्र सहयोग अपेक्षित है कि कृपया अगले महीने की 1 तारीख तक प्रतीक्षा करें। नया माह शुरू होते ही यह सभी सेवाएँ फिर से आपके लिए निःशुल्क चालू हो जाएँगी।\n\n' +
    'आपके धैर्य, विश्वास और सहयोग के लिए हृदय से धन्यवाद।',
  signature: 'टीम फल्सावदिया कृषि बाजार',
};

let isPausedFlag = false;
let isInterceptorInstalled = false;
let nativeFetchRef: typeof window.fetch | null = null;

function notifyPauseListeners(nextState: boolean) {
  if (isPausedFlag === nextState) return;
  isPausedFlag = nextState;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VERCEL_PAUSE_EVENT, { detail: { paused: nextState } }));
  }
}

function isSameOriginApiRequest(input: RequestInfo | URL): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!rawUrl) return false;
    if (rawUrl.startsWith('/api/')) return true;
    const parsed = new URL(rawUrl, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

async function checkVercelPausedResponse(res: Response): Promise<boolean> {
  if (res.status === 402) {
    return true;
  }
  const vercelError = (res.headers.get('x-vercel-error') || '').toUpperCase();
  if (vercelError.includes('DEPLOYMENT_PAUSED') || vercelError.includes('PAYMENT_REQUIRED')) {
    return true;
  }
  if (res.status === 503 || res.status === 403) {
    try {
      const text = (await res.clone().text()).toLowerCase();
      if (
        text.includes('deployment_paused') ||
        text.includes('deployment is temporarily paused') ||
        text.includes('deployment has been paused') ||
        text.includes('payment_required')
      ) {
        return true;
      }
    } catch {
      // Ignore stream clone errors
    }
  }
  return false;
}

/**
 * Installs a lightweight fetch listener (once) that detects if Vercel has paused
 * the deployment (HTTP 402 / DEPLOYMENT_PAUSED) for installed PWA users.
 */
export function installVercelPauseInterceptor(): void {
  if (typeof window === 'undefined' || isInterceptorInstalled || typeof window.fetch !== 'function') {
    return;
  }
  isInterceptorInstalled = true;
  const originalFetch = window.fetch.bind(window);
  nativeFetchRef = originalFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);
    if (isSameOriginApiRequest(input)) {
      const paused = await checkVercelPausedResponse(response);
      if (paused) {
        notifyPauseListeners(true);
      }
    }
    return response;
  };
}

export async function recheckVercelAvailability(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const fetcher = nativeFetchRef || window.fetch.bind(window);
    const res = await fetcher(`/api/health?t=${Date.now()}`, { cache: 'no-store' });
    const paused = await checkVercelPausedResponse(res);
    if (!paused && res.ok) {
      notifyPauseListeners(false);
      return true;
    }
    if (paused) {
      notifyPauseListeners(true);
    }
    return false;
  } catch {
    return false;
  }
}

export function useVercelPauseDetected(): boolean {
  const [paused, setPaused] = useState<boolean>(isPausedFlag);

  useEffect(() => {
    installVercelPauseInterceptor();
    setPaused(isPausedFlag);

    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ paused?: boolean }>).detail;
      setPaused(Boolean(detail?.paused));
    };
    window.addEventListener(VERCEL_PAUSE_EVENT, handler);
    return () => window.removeEventListener(VERCEL_PAUSE_EVENT, handler);
  }, []);

  return paused;
}
