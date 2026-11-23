import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Youtube, ExternalLink } from 'lucide-react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  loadVideoById: (videoId: string) => void;
  cueVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeAPI(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window unavailable'));
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve();
  }
  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise<void>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeoutId = setTimeout(() => {
      reject(new Error('YouTube IFrame API load timeout'));
    }, 6000);

    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeoutId);
      if (typeof previousReady === 'function') {
        try {
          previousReady();
        } catch {
          // ignore
        }
      }
      resolve();
    };

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        clearTimeout(timeoutId);
        ytApiPromise = null;
        reject(new Error('Failed to load YouTube IFrame API'));
      };
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

interface YouTubeEmbedPlayerProps {
  videoId: string;
  title: string;
  isShort?: boolean;
  embeddable?: boolean;
  watchUrl: string;
  autoplay?: boolean;
  onEnded?: () => void;
  onErrorAction?: React.ReactNode;
}

const YouTubeEmbedPlayer: React.FC<YouTubeEmbedPlayerProps> = ({
  videoId,
  title,
  isShort = false,
  embeddable = true,
  watchUrl,
  autoplay = true,
  onEnded,
  onErrorAction,
}) => {
  const hostContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const loadedVideoIdRef = useRef<string>('');
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useFallbackIframe, setUseFallbackIframe] = useState(false);

  // Initialize official YT.Player once; reuse via loadVideoById to preserve mobile autoplay
  useEffect(() => {
    if (!videoId || embeddable === false) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setErrorMessage(null);

    if (useFallbackIframe) {
      return;
    }

    if (playerRef.current && loadedVideoIdRef.current) {
      if (loadedVideoIdRef.current !== videoId) {
        loadedVideoIdRef.current = videoId;
        setIsLoading(true);
        try {
          playerRef.current.loadVideoById(videoId);
          setTimeout(() => {
            if (!cancelled) setIsLoading(false);
          }, 900);
        } catch {
          setUseFallbackIframe(true);
        }
      }
      return;
    }

    setIsLoading(true);
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 4500);

    loadYouTubeIframeAPI()
      .then(() => {
        if (cancelled || !hostContainerRef.current || !window.YT?.Player) return;

        // Clear any leftover nodes inside host before mounting YT iframe
        hostContainerRef.current.innerHTML = '';
        const mountDiv = document.createElement('div');
        mountDiv.className = 'w-full h-full';
        hostContainerRef.current.appendChild(mountDiv);

        loadedVideoIdRef.current = videoId;
        playerRef.current = new window.YT.Player(mountDiv, {
          videoId,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            enablejsapi: 1,
            loop: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (!cancelled) {
                clearTimeout(safetyTimer);
                setIsLoading(false);
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              // 0 === YT.PlayerState.ENDED, 1 === PLAYING, 3 === BUFFERING
              if (event.data === 1) {
                setIsLoading(false);
              } else if (event.data === 0) {
                onEndedRef.current?.();
              }
            },
            onError: (event) => {
              if (cancelled) return;
              clearTimeout(safetyTimer);
              setIsLoading(false);
              const code = Number(event.data);
              if (code === 100) {
                setErrorMessage('यह वीडियो निजी (Private) है या YouTube से हटा दिया गया है।');
              } else if (code === 101 || code === 150) {
                setErrorMessage(
                  'वीडियो मालिक द्वारा इस वीडियो को ऐप में एम्बेड करने की अनुमति बंद (Embedding Disabled) की गई है।'
                );
              } else {
                setErrorMessage('यह वीडियो वर्तमान में ऐप प्लेयर में लोड नहीं हो सका।');
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(safetyTimer);
          setUseFallbackIframe(true);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [videoId, embeddable, autoplay, useFallbackIframe]);

  // Destroy player on unmount only
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
        loadedVideoIdRef.current = '';
      }
    };
  }, []);

  if (embeddable === false || errorMessage) {
    return (
      <div className="bg-neutral-950 flex items-center justify-center min-h-[240px] sm:min-h-[320px]">
        <div className="p-8 text-center text-white space-y-4 max-w-md">
          <AlertCircle className="w-10 h-10 text-[#EAB308] mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold">यह वीडियो सीधे ऐप में एम्बेड नहीं हो सका</h3>
            <p className="text-xs text-white/75">
              {errorMessage ||
                'वीडियो मालिक की सेटिंग के कारण इसे सीधे YouTube ऐप/ब्राउज़र में देखा जा सकता है।'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {onErrorAction}
            {watchUrl && watchUrl !== '#' && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors"
              >
                <Youtube className="w-4 h-4" />
                <span>YouTube पर वीडियो चलाएँ</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const fallbackEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${
    autoplay ? 1 : 0
  }&rel=0&playsinline=1&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin : ''
  )}`;

  return (
    <div className="bg-neutral-950 flex items-center justify-center relative">
      <div
        className={
          isShort
            ? 'relative w-full max-w-[360px] mx-auto aspect-[9/16] max-h-[72vh] bg-black'
            : 'relative w-full aspect-video bg-black'
        }
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-neutral-950/90 text-white pointer-events-none">
            <Loader2 className="w-8 h-8 animate-spin text-[#EAB308]" />
            <p className="text-xs font-semibold text-white/85">वीडियो प्लेयर लोड हो रहा है...</p>
          </div>
        )}

        {useFallbackIframe ? (
          <iframe
            key={videoId}
            src={fallbackEmbedUrl}
            title={title}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setErrorMessage('वीडियो लोड करने में समस्या आई।');
            }}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div
            ref={hostContainerRef}
            className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
          />
        )}
      </div>
    </div>
  );
};

export default YouTubeEmbedPlayer;
