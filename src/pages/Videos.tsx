import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Video,
  Film,
  Play,
  Search,
  X,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Share2,
  Bookmark,
  ExternalLink,
  RefreshCw,
  Pin,
  Star,
  Youtube,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { YouTubeVideoItem } from '../types';
import {
  VIDEO_CATEGORY_MAP,
  normalizeVideos,
  sanitizeSyncedVideos,
  mergeHybridVideos,
  resolveVideoThumbnail,
  formatVideoDateHindi,
  getBookmarkedVideoIds,
  toggleBookmarkedVideoId,
  getCachedVideoFeed,
  setCachedVideoFeed,
  formatYouTubeWatchUrl,
} from '../utils/youtubeUtils';
import SmartImage from '../components/SmartImage';
import { cn } from '../lib/utils';

type FormatTab = 'videos' | 'shorts';

const PAGE_SIZE = 12;

const Videos: React.FC = () => {
  const { appContent } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const videoHubSettings = appContent?.videoHubSettings;
  const youtubeChannel = appContent?.youtubeChannel;
  const showShortsTab = videoHubSettings?.showShortsTab !== false;
  const autoSyncEnabled = videoHubSettings?.autoSyncEnabled !== false;

  const [activeTab, setActiveTab] = useState<FormatTab>(
    videoHubSettings?.defaultTab === 'shorts' && showShortsTab ? 'shorts' : 'videos'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [syncedVideos, setSyncedVideos] = useState<YouTubeVideoItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [resolvedChannelTitle, setResolvedChannelTitle] = useState<string>(
    videoHubSettings?.resolvedChannelTitle || ''
  );

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => getBookmarkedVideoIds());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Keep activeTab valid if admin disables shorts tab
  useEffect(() => {
    if (!showShortsTab && activeTab === 'shorts') {
      setActiveTab('videos');
    }
  }, [showShortsTab, activeTab]);

  // Fetch hybrid channel feed with 2-hour local cache + server cache fallback
  const loadChannelVideos = useCallback(
    async (forceRefresh: boolean = false) => {
      const channelUrl = (youtubeChannel?.url || '').trim();
      const channelId = (videoHubSettings?.resolvedChannelId || '').trim();
      const channelKey = (channelId || channelUrl).toLowerCase();

      if (!autoSyncEnabled || !channelKey) {
        setSyncedVideos([]);
        return;
      }

      if (!forceRefresh) {
        const freshCache = getCachedVideoFeed(channelKey, false);
        if (freshCache && freshCache.videos.length > 0) {
          setSyncedVideos(sanitizeSyncedVideos(freshCache.videos));
          if (freshCache.channelTitle) setResolvedChannelTitle(freshCache.channelTitle);
          return;
        }
      }

      // Show stale cache immediately while revalidating
      const staleCache = getCachedVideoFeed(channelKey, true);
      if (staleCache && staleCache.videos.length > 0 && syncedVideos.length === 0) {
        setSyncedVideos(sanitizeSyncedVideos(staleCache.videos));
      }

      setIsLoadingFeed(true);
      setFeedNotice(null);

      try {
        const params = new URLSearchParams();
        if (channelUrl) params.set('channelUrl', channelUrl);
        if (channelId) params.set('channelId', channelId);
        if (forceRefresh) params.set('forceRefresh', 'true');

        const res = await fetch(`/api/videos/youtube?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data?.success && Array.isArray(data.videos)) {
          const normalized = sanitizeSyncedVideos(data.videos);
          setSyncedVideos(normalized);
          if (data.channelTitle) setResolvedChannelTitle(data.channelTitle);
          setCachedVideoFeed({
            channelKey,
            channelId: data.channelId || channelId,
            channelTitle: data.channelTitle || resolvedChannelTitle,
            mode: data.mode || 'rss',
            hasApiKeyConfigured: Boolean(data.hasApiKeyConfigured),
            lastSyncAt: data.lastSyncAt || Date.now(),
            videos: normalized,
          });
          if (data.warning && normalized.length === 0) {
            setFeedNotice(data.warning);
          }
        }
      } catch {
        if (!staleCache || staleCache.videos.length === 0) {
          setFeedNotice('नेटवर्क धीमा है — सहेजे गए वीडियो दिखाए जा रहे हैं।');
        }
      } finally {
        setIsLoadingFeed(false);
      }
    },
    [
      autoSyncEnabled,
      youtubeChannel?.url,
      videoHubSettings?.resolvedChannelId,
      resolvedChannelTitle,
      syncedVideos.length,
    ]
  );

  useEffect(() => {
    loadChannelVideos(false);
  }, [youtubeChannel?.url, videoHubSettings?.resolvedChannelId, autoSyncEnabled]);

  // Merge manual videos + synced channel videos + admin overrides
  const allMergedVideos = useMemo(() => {
    const manualNormalized = normalizeVideos(appContent?.videos);
    return mergeHybridVideos(
      manualNormalized,
      syncedVideos,
      videoHubSettings?.overrides || {},
      false
    );
  }, [appContent?.videos, syncedVideos, videoHubSettings?.overrides]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, searchQuery, onlyBookmarked]);

  // Counts for tab header
  const formatCounts = useMemo(() => {
    let videos = 0;
    let shorts = 0;
    for (const v of allMergedVideos) {
      if (v.isShort) shorts++;
      else videos++;
    }
    return { videos, shorts };
  }, [allMergedVideos]);

  // Filtered list based on active format tab, search, and bookmarks
  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allMergedVideos.filter((v) => {
      const matchesFormat = showShortsTab
        ? activeTab === 'shorts'
          ? Boolean(v.isShort)
          : !v.isShort
        : true;

      if (!matchesFormat) return false;

      if (onlyBookmarked) {
        const key = v.videoId || v.id;
        if (!bookmarkedIds.includes(key)) return false;
      }

      if (q) {
        const catLabel = (VIDEO_CATEGORY_MAP[v.category || 'other'] || '').toLowerCase();
        const hay = `${v.title} ${v.description || ''} ${catLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    allMergedVideos,
    activeTab,
    searchQuery,
    onlyBookmarked,
    bookmarkedIds,
    showShortsTab,
  ]);

  const visibleVideos = useMemo(
    () => filteredVideos.slice(0, visibleCount),
    [filteredVideos, visibleCount]
  );

  // Active video player via URL query param ?v={videoId}
  const activePlayerVideoId = searchParams.get('v');
  const activePlayerVideo = useMemo(() => {
    if (!activePlayerVideoId) return null;
    return (
      allMergedVideos.find(
        (v) => v.videoId === activePlayerVideoId || v.id === activePlayerVideoId
      ) || null
    );
  }, [activePlayerVideoId, allMergedVideos]);

  // Reset description expansion when switching video
  useEffect(() => {
    setDescExpanded(false);
    if (activePlayerVideoId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activePlayerVideoId]);

  const openVideoPlayer = (video: YouTubeVideoItem) => {
    const id = video.videoId || video.id;
    if (!id) return;
    setSearchParams({ v: id });
  };

  const closeVideoPlayer = () => {
    setSearchParams({});
  };

  // Player navigation list (prefers same format or filtered list)
  const playerQueue = useMemo(() => {
    if (!activePlayerVideo) return filteredVideos;
    const inFiltered = filteredVideos.some(
      (v) => (v.videoId || v.id) === (activePlayerVideo.videoId || activePlayerVideo.id)
    );
    if (inFiltered) return filteredVideos;
    return allMergedVideos.filter((v) => Boolean(v.isShort) === Boolean(activePlayerVideo.isShort));
  }, [activePlayerVideo, filteredVideos, allMergedVideos]);

  const currentPlayerIndex = useMemo(() => {
    if (!activePlayerVideo) return -1;
    const targetKey = activePlayerVideo.videoId || activePlayerVideo.id;
    return playerQueue.findIndex((v) => (v.videoId || v.id) === targetKey);
  }, [activePlayerVideo, playerQueue]);

  const prevVideo = currentPlayerIndex > 0 ? playerQueue[currentPlayerIndex - 1] : null;
  const nextVideo =
    currentPlayerIndex >= 0 && currentPlayerIndex < playerQueue.length - 1
      ? playerQueue[currentPlayerIndex + 1]
      : null;

  const handleToggleBookmark = (video: YouTubeVideoItem) => {
    const key = video.videoId || video.id;
    if (!key) return;
    const updated = toggleBookmarkedVideoId(key);
    setBookmarkedIds(updated);
    const savedNow = updated.includes(key);
    showToast(savedNow ? 'वीडियो आपकी सेव सूची में जोड़ा गया' : 'सेव सूची से हटाया गया');
  };

  const handleShareVideo = async (video: YouTubeVideoItem) => {
    const shareUrl =
      video.videoUrl || (video.videoId ? formatYouTubeWatchUrl(video.videoId) : window.location.href);
    const shareTitle = video.title || 'फल्सावदिया कृषि बाजार वीडियो';

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareTitle} - फल्सावदिया कृषि बाजार`,
          url: shareUrl,
        });
        return;
      } catch {
        // user cancelled or unsupported, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareTitle}\n${shareUrl}`);
      showToast('वीडियो लिंक कॉपी हो गया, अब आप शेयर कर सकते हैं');
    } catch {
      showToast('लिंक साझा करने के लिए "YouTube पर देखें" का उपयोग करें');
    }
  };

  // ========================================================
  // PLAYER VIEW (Dedicated in-app YouTube Player screen)
  // ========================================================
  if (activePlayerVideo) {
    const playerKey = activePlayerVideo.videoId || activePlayerVideo.id;
    const isBookmarked = bookmarkedIds.includes(playerKey);
    const isShortPlayer = Boolean(activePlayerVideo.isShort);
    const categoryLabel = VIDEO_CATEGORY_MAP[activePlayerVideo.category || 'other'] || 'अन्य';
    const dateLabel = formatVideoDateHindi(
      activePlayerVideo.publishedAt,
      activePlayerVideo.publishedTimestamp || activePlayerVideo.createdAt
    );
    const canEmbed = activePlayerVideo.embeddable !== false && Boolean(activePlayerVideo.videoId);
    const watchUrl =
      activePlayerVideo.videoUrl ||
      (activePlayerVideo.videoId ? formatYouTubeWatchUrl(activePlayerVideo.videoId) : '#');

    return (
      <div className="max-w-5xl mx-auto pb-8 space-y-5">
        {/* Toast feedback */}
        {toastMsg && (
          <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1E3F1A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-white/15">
            <Check className="w-4 h-4 text-[#EAB308] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeVideoPlayer}
            className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-200/90 text-[#1E3F1A] hover:bg-emerald-50 font-semibold text-sm shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isShortPlayer ? 'सभी शॉर्ट्स' : 'सभी वीडियो'}</span>
          </button>

          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-200/90 text-red-700 hover:bg-red-50 font-semibold text-xs transition-colors"
          >
            <Youtube className="w-4 h-4" />
            <span>YouTube पर देखें</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Player Surface */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="bg-neutral-950 flex items-center justify-center">
            {canEmbed ? (
              isShortPlayer ? (
                <div className="w-full max-w-[360px] mx-auto aspect-[9/16] max-h-[72vh] bg-black">
                  <iframe
                    key={activePlayerVideo.videoId}
                    src={`https://www.youtube.com/embed/${activePlayerVideo.videoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
                    title={activePlayerVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full aspect-video bg-black">
                  <iframe
                    key={activePlayerVideo.videoId}
                    src={`https://www.youtube.com/embed/${activePlayerVideo.videoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
                    title={activePlayerVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )
            ) : (
              <div className="p-8 text-center text-white space-y-4 max-w-md">
                <AlertCircle className="w-10 h-10 text-[#EAB308] mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold">यह वीडियो सीधे ऐप में एम्बेड नहीं हो सका</h3>
                  <p className="text-xs text-white/75">
                    वीडियो मालिक की सेटिंग के कारण इसे सीधे YouTube ऐप/ब्राउज़र में देखा जा सकता है।
                  </p>
                </div>
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                  <span>YouTube पर वीडियो चलाएँ</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Video Details Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Unboxed Metadata Line */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#2D5A27]">
              <span>{categoryLabel}</span>
              {activePlayerVideo.duration && (
                <>
                  <span className="text-gray-300" aria-hidden="true">·</span>
                  <span className="text-gray-600 tabular-nums">{activePlayerVideo.duration}</span>
                </>
              )}
              {dateLabel && (
                <>
                  <span className="text-gray-300" aria-hidden="true">·</span>
                  <span className="text-gray-500 font-medium">{dateLabel}</span>
                </>
              )}
              {activePlayerVideo.isPinned && (
                <>
                  <span className="text-gray-300" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <Pin className="w-3 h-3" /> पिन किया गया
                  </span>
                </>
              )}
            </div>

            {/* Title */}
            <h1 className="text-lg sm:text-xl font-bold text-[#1E3F1A] leading-snug">
              {activePlayerVideo.title}
            </h1>

            {/* Description */}
            {activePlayerVideo.description && (
              <div className="pt-1">
                <p
                  className={cn(
                    'text-sm text-gray-600 leading-relaxed whitespace-pre-line',
                    !descExpanded && 'line-clamp-3'
                  )}
                >
                  {activePlayerVideo.description}
                </p>
                {activePlayerVideo.description.length > 140 && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#2D5A27] hover:underline cursor-pointer"
                  >
                    <span>{descExpanded ? 'कम दिखाएँ' : 'पूरा विवरण पढ़ें'}</span>
                    {descExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Thumb-friendly Player Action Bar */}
            <div className="pt-4 border-t border-gray-100 flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                disabled={!prevVideo}
                onClick={() => prevVideo && openVideoPlayer(prevVideo)}
                className={cn(
                  'flex-1 min-h-[48px] px-3 py-2.5 rounded-xl border font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors',
                  prevVideo
                    ? 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-[#1E3F1A] cursor-pointer'
                    : 'border-gray-100 bg-gray-50/50 text-gray-300 cursor-not-allowed'
                )}
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>पिछला</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareVideo(activePlayerVideo)}
                title="वीडियो शेयर करें"
                className="min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-emerald-50 text-[#2D5A27] inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">शेयर</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleBookmark(activePlayerVideo)}
                title={isBookmarked ? 'सेव से हटाएं' : 'बाद में देखने के लिए सेव करें'}
                className={cn(
                  'min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl border inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer',
                  isBookmarked
                    ? 'border-[#2D5A27] bg-emerald-50 text-[#2D5A27]'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                )}
              >
                <Bookmark className={cn('w-4 h-4', isBookmarked && 'fill-[#2D5A27]')} />
                <span className="hidden sm:inline">{isBookmarked ? 'सेव किया' : 'सेव करें'}</span>
              </button>

              <button
                type="button"
                disabled={!nextVideo}
                onClick={() => nextVideo && openVideoPlayer(nextVideo)}
                className={cn(
                  'flex-1 min-h-[48px] px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors',
                  nextVideo
                    ? 'bg-[#2D5A27] hover:bg-[#22471D] text-white cursor-pointer shadow-xs'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                )}
              >
                <span>अगला</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Up Next Preview Card */}
        {nextVideo && (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-2.5">
            <p className="text-xs font-bold text-[#2D5A27]">आगे देखें (Up Next)</p>
            <button
              type="button"
              onClick={() => openVideoPlayer(nextVideo)}
              className="w-full flex items-center gap-3.5 text-left group cursor-pointer rounded-xl hover:bg-gray-50 p-1.5 -m-1.5 transition-colors"
            >
              <div className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-gray-900 shrink-0">
                <SmartImage
                  src={resolveVideoThumbnail(nextVideo)}
                  alt={nextVideo.title}
                  className="w-full h-full"
                  objectFit="cover"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/95 text-[#2D5A27] flex items-center justify-center shadow">
                    <Play className="w-4 h-4 fill-[#2D5A27] ml-0.5" />
                  </div>
                </div>
                {nextVideo.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums">
                    {nextVideo.duration}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[11px] font-semibold text-gray-500">
                  {VIDEO_CATEGORY_MAP[nextVideo.category || 'other'] || 'अन्य'}
                </p>
                <h3 className="text-sm font-bold text-[#1E3F1A] line-clamp-2 group-hover:text-[#2D5A27]">
                  {nextVideo.title}
                </h3>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // LISTING VIEW
  // ========================================================
  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-6">
      {/* Toast feedback */}
      {toastMsg && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1E3F1A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-white/15">
          <Check className="w-4 h-4 text-[#EAB308] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#2D5A27] text-white flex items-center justify-center shadow-xs shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E3F1A] leading-tight">
              कृषि वीडियो केंद्र
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              {resolvedChannelTitle
                ? `${resolvedChannelTitle} · खेती, खाद व योजनाओं के वीडियो`
                : 'खेती, खाद, रोग नियंत्रण और सरकारी योजनाओं की वीडियो गाइड'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setOnlyBookmarked((v) => !v)}
            className={cn(
              'min-h-[40px] px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap',
              onlyBookmarked
                ? 'bg-[#2D5A27] text-white border-[#2D5A27]'
                : 'bg-white text-[#1E3F1A] border-gray-200 hover:bg-gray-50'
            )}
          >
            <Bookmark className={cn('w-3.5 h-3.5', onlyBookmarked && 'fill-white')} />
            <span>सेव किए गए</span>
            {bookmarkedIds.length > 0 && (
              <span className="tabular-nums opacity-85">({bookmarkedIds.length})</span>
            )}
          </button>

          {youtubeChannel?.url && (
            <a
              href={youtubeChannel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-red-50 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Youtube className="w-4 h-4" />
              <span>{youtubeChannel.label || 'चैनल देखें'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {autoSyncEnabled && youtubeChannel?.url && (
            <button
              type="button"
              disabled={isLoadingFeed}
              onClick={() => loadChannelVideos(true)}
              title="नए वीडियो रीफ्रेश करें"
              className="min-h-[40px] min-w-[40px] px-2.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-emerald-50 text-[#2D5A27] inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              <RefreshCw className={cn('w-4 h-4', isLoadingFeed && 'animate-spin')} />
            </button>
          )}
        </div>
      </div>

      {/* Format Segmented Switcher: वीडियो | शॉर्ट्स / रील्स (matches Reference Screenshots) */}
      {showShortsTab && (
        <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs grid grid-cols-2 gap-1.5 max-w-lg">
          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={cn(
              'min-h-[44px] py-2.5 px-4 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'videos'
                ? 'bg-[#2D5A27] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#1E3F1A] hover:bg-gray-50'
            )}
          >
            <Video className="w-4 h-4 shrink-0" />
            <span>वीडियो</span>
            <span
              className={cn(
                'text-xs tabular-nums',
                activeTab === 'videos' ? 'text-white/80' : 'text-gray-400'
              )}
            >
              ({formatCounts.videos})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shorts')}
            className={cn(
              'min-h-[44px] py-2.5 px-4 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'shorts'
                ? 'bg-[#2D5A27] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#1E3F1A] hover:bg-gray-50'
            )}
          >
            <Film className="w-4 h-4 shrink-0" />
            <span>शॉर्ट्स / रील्स</span>
            <span
              className={cn(
                'text-xs tabular-nums',
                activeTab === 'shorts' ? 'text-white/80' : 'text-gray-400'
              )}
            >
              ({formatCounts.shorts})
            </span>
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="वीडियो खोजें (जैसे: गेहूँ, यूरिया, मंडी भाव, पीएम किसान)..."
          className="w-full min-h-[44px] bg-white border border-gray-200/90 focus:border-[#2D5A27] rounded-2xl py-2.5 pl-10 pr-10 text-sm text-[#1E3F1A] placeholder:text-gray-400 outline-none shadow-2xs transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="खोज साफ़ करें"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Non-blocking Notice if needed */}
      {feedNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-4 py-3 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{feedNotice}</span>
        </div>
      )}

      {/* Loading Skeleton when first syncing */}
      {isLoadingFeed && allMergedVideos.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-gray-200" />
              <div className="p-4 space-y-2.5">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center mx-auto">
            {activeTab === 'shorts' ? <Film className="w-7 h-7" /> : <Video className="w-7 h-7" />}
          </div>
          <h3 className="text-base font-bold text-[#1E3F1A]">
            {onlyBookmarked
              ? 'आपने अभी कोई वीडियो सेव नहीं किया है'
              : searchQuery
              ? `"${searchQuery}" से जुड़ा कोई वीडियो नहीं मिला`
              : activeTab === 'shorts'
              ? 'अभी कोई शॉर्ट्स वीडियो उपलब्ध नहीं है'
              : 'अभी कोई वीडियो उपलब्ध नहीं है'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            खोज फ़िल्टर साफ़ करें या बाद में पुनः देखें।
          </p>
          {(searchQuery || onlyBookmarked) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setOnlyBookmarked(false);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2D5A27] text-white text-xs font-bold cursor-pointer"
            >
              सभी वीडियो दिखाएँ
            </button>
          )}
        </div>
      ) : activeTab === 'shorts' && showShortsTab ? (
        /* SHORTS / REELS 2-COLUMN PORTRAIT GRID (Matches Screenshot 193938) */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {visibleVideos.map((video, idx) => {
            const catLabel = VIDEO_CATEGORY_MAP[video.category || 'shorts'] || 'शॉर्ट्स / रील्स';
            return (
              <div
                key={`${video.videoId || video.id}-${idx}`}
                onClick={() => openVideoPlayer(video)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openVideoPlayer(video);
                  }
                }}
                className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-900 border border-gray-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
              >
                <SmartImage
                  src={resolveVideoThumbnail(video)}
                  alt={video.title}
                  className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                  objectFit="cover"
                />

                {/* Top Duration / Pin Indicator */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                  {video.isPinned ? (
                    <span className="bg-black/70 text-[#EAB308] text-[10px] font-bold px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                      <Pin className="w-3 h-3" /> पिन
                    </span>
                  ) : (
                    <span />
                  )}
                  {video.duration && (
                    <span className="bg-black/75 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg tabular-nums">
                      {video.duration}
                    </span>
                  )}
                </div>

                {/* Centered Play Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white/90 text-[#1E3F1A] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-[#1E3F1A] ml-0.5" />
                  </div>
                </div>

                {/* Measured Scrim Overlay for High Contrast Text */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3 pt-10 text-left space-y-1">
                  <p className="text-[11px] font-bold text-[#EAB308] truncate">{catLabel}</p>
                  <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                    {video.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* STANDARD 16:9 VIDEOS RESPONSIVE GRID (Matches Screenshot 193719) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {visibleVideos.map((video, idx) => {
            const key = video.videoId || video.id;
            const isBookmarked = bookmarkedIds.includes(key);
            const catLabel = VIDEO_CATEGORY_MAP[video.category || 'other'] || 'अन्य';
            const dateLabel = formatVideoDateHindi(
              video.publishedAt,
              video.publishedTimestamp || video.createdAt
            );

            return (
              <article
                key={`${key}-${idx}`}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div
                  onClick={() => openVideoPlayer(video)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openVideoPlayer(video);
                    }
                  }}
                  className="cursor-pointer flex-1 flex flex-col"
                >
                  {/* 16:9 Thumbnail Container */}
                  <div className="relative aspect-video bg-gray-900 overflow-hidden">
                    <SmartImage
                      src={resolveVideoThumbnail(video)}
                      alt={video.title}
                      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                      objectFit="cover"
                    />

                    {/* Subtle Scrim + Center Play Trigger */}
                    <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                      <div className="w-13 h-13 rounded-full bg-white/95 text-[#1E3F1A] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Play className="w-6 h-6 fill-[#1E3F1A] ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom-left Platform + Pin/Featured markers */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="bg-black/75 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                        <Youtube className="w-3.5 h-3.5 text-red-500" />
                        <span>YouTube</span>
                      </span>
                      {video.isPinned && (
                        <span className="bg-black/75 text-[#EAB308] text-[11px] font-semibold px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                          <Pin className="w-3 h-3" />
                        </span>
                      )}
                      {video.isFeatured && !video.isPinned && (
                        <span className="bg-black/75 text-[#EAB308] text-[11px] font-semibold px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[#EAB308]" />
                        </span>
                      )}
                    </div>

                    {/* Bottom-right Duration */}
                    {video.duration && (
                      <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg tabular-nums">
                        {video.duration}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col">
                    {/* Unboxed Clean Metadata */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2D5A27]">
                      <span>{catLabel}</span>
                      {dateLabel && (
                        <>
                          <span className="text-gray-300" aria-hidden="true">·</span>
                          <span className="text-gray-500 font-medium">{dateLabel}</span>
                        </>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-[#1E3F1A] line-clamp-2 leading-snug group-hover:text-[#2D5A27] transition-colors">
                      {video.title}
                    </h2>

                    {video.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Compact Card Footer Actions */}
                <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between gap-2 bg-gray-50/40">
                  <button
                    type="button"
                    onClick={() => openVideoPlayer(video)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D5A27] hover:text-[#1E3F1A] py-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-[#2D5A27]" />
                    <span>ऐप में देखें</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBookmark(video);
                      }}
                      title={isBookmarked ? 'सेव से हटाएं' : 'सेव करें'}
                      className={cn(
                        'p-2 rounded-xl transition-colors cursor-pointer',
                        isBookmarked
                          ? 'text-[#2D5A27] bg-emerald-50'
                          : 'text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      <Bookmark className={cn('w-4 h-4', isBookmarked && 'fill-[#2D5A27]')} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareVideo(video);
                      }}
                      title="शेयर करें"
                      className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#2D5A27] transition-colors cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Load More Pagination */}
      {visibleCount < filteredVideos.length && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-white border border-gray-200 hover:border-[#2D5A27] text-[#1E3F1A] font-bold text-sm shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <span>और वीडियो देखें</span>
            <span className="text-xs text-gray-500 tabular-nums">
              ({filteredVideos.length - visibleCount} शेष)
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Videos;
