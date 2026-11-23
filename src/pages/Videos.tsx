import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Video,
  Film,
  Play,
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
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListVideo,
  Calendar,
  SkipForward,
  RotateCcw,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ImageSource, VideoPlaylist, YouTubeVideoItem } from '../types';
import {
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
  extractYouTubeVideoId,
  getYouTubeThumbnailSource,
} from '../utils/youtubeUtils';
import SmartImage from '../components/SmartImage';
import YouTubeEmbedPlayer from '../components/YouTubeEmbedPlayer';
import { cn } from '../lib/utils';

type FormatTab = 'videos' | 'shorts';

const PAGE_SIZE = 12;

const hasThumbValue = (thumb?: string | ImageSource): boolean => {
  if (!thumb) return false;
  if (typeof thumb === 'string') return thumb.trim().length > 0;
  return Boolean(thumb.primary?.trim() || thumb.fallback?.trim());
};

const Videos: React.FC = () => {
  const { appContent, playlists, playlistVideos } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const videoHubSettings = appContent?.videoHubSettings;
  const youtubeChannel = appContent?.youtubeChannel;
  const showShortsTab = videoHubSettings?.showShortsTab !== false;
  const autoSyncEnabled = videoHubSettings?.autoSyncEnabled !== false;

  const [activeTab, setActiveTab] = useState<FormatTab>(
    videoHubSettings?.defaultTab === 'shorts' && showShortsTab ? 'shorts' : 'videos'
  );
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
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [playlistCompleted, setPlaylistCompleted] = useState(false);

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

  // Recently Added Videos sorted strictly newest first
  const recentlyAddedVideos = useMemo(() => {
    return [...allMergedVideos].sort((a, b) => {
      const timeA = a.publishedTimestamp || a.createdAt || 0;
      const timeB = b.publishedTimestamp || b.createdAt || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (a.displayOrder || 9999) - (b.displayOrder || 9999);
    });
  }, [allMergedVideos]);

  // Canonical video lookup map (supports videoId and id)
  const videoByKeyMap = useMemo(() => {
    const map = new Map<string, YouTubeVideoItem>();
    allMergedVideos.forEach((v) => {
      const key = v.videoId || v.id;
      if (key) map.set(key, v);
      if (v.id && v.id !== key) map.set(v.id, v);
    });
    return map;
  }, [allMergedVideos]);

  // Active Playlists sorted by displayOrder with resolved active videos
  const activePlaylistsWithVideos = useMemo(() => {
    return [...playlists]
      .filter((pl) => pl.isActive !== false)
      .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999))
      .map((playlist) => {
        const orderedVideos = playlistVideos
          .filter((m) => m.playlistId === playlist.id)
          .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999))
          .map((m) => videoByKeyMap.get(m.videoId))
          .filter((v): v is YouTubeVideoItem => Boolean(v && v.isActive !== false));

        const fallbackCover = orderedVideos[0] ? resolveVideoThumbnail(orderedVideos[0]) : '';
        const coverImage = hasThumbValue(playlist.thumbnail) ? playlist.thumbnail : fallbackCover;

        return {
          playlist,
          videos: orderedVideos,
          coverImage,
        };
      });
  }, [playlists, playlistVideos, videoByKeyMap]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, onlyBookmarked]);

  // Counts for tab header
  const formatCounts = useMemo(() => {
    let videos = 0;
    let shorts = 0;
    for (const v of recentlyAddedVideos) {
      if (v.isShort) shorts++;
      else videos++;
    }
    return { videos, shorts };
  }, [recentlyAddedVideos]);

  // Filtered Recently Added list based on active format tab and bookmarks
  const filteredVideos = useMemo(() => {
    return recentlyAddedVideos.filter((v) => {
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

      return true;
    });
  }, [recentlyAddedVideos, activeTab, onlyBookmarked, bookmarkedIds, showShortsTab]);

  const visibleVideos = useMemo(
    () => filteredVideos.slice(0, visibleCount),
    [filteredVideos, visibleCount]
  );

  // URL Params: ?playlist={playlistId} and/or ?v={videoId}
  const activePlaylistParam = searchParams.get('playlist');
  const activeVideoParam = searchParams.get('v');

  const activePlaylistEntry = useMemo(() => {
    if (!activePlaylistParam) return null;
    const trimmed = activePlaylistParam.trim();
    return activePlaylistsWithVideos.find((entry) => entry.playlist.id === trimmed) || null;
  }, [activePlaylistParam, activePlaylistsWithVideos]);

  const activePlayerVideo = useMemo(() => {
    if (!activeVideoParam) return null;
    const trimmedParam = activeVideoParam.trim();
    const extractedId = extractYouTubeVideoId(trimmedParam);

    // Prefer lookup in current playlist if in playlist view
    if (activePlaylistEntry) {
      const inPlaylist = activePlaylistEntry.videos.find(
        (v) =>
          v.videoId === trimmedParam ||
          v.id === trimmedParam ||
          (extractedId ? v.videoId === extractedId : false)
      );
      if (inPlaylist) return inPlaylist;
    }

    const matched = allMergedVideos.find(
      (v) =>
        v.videoId === trimmedParam ||
        v.id === trimmedParam ||
        (extractedId ? v.videoId === extractedId : false)
    );
    if (matched) return matched;

    if (extractedId && /^[a-zA-Z0-9_-]{11}$/.test(extractedId)) {
      return {
        id: extractedId,
        videoId: extractedId,
        videoUrl: formatYouTubeWatchUrl(extractedId),
        title: 'किसान पाठशाला वीडियो',
        description: '',
        thumbnail: getYouTubeThumbnailSource(extractedId),
        isActive: true,
        embeddable: true,
        source: 'manual',
      } as YouTubeVideoItem;
    }

    return null;
  }, [activeVideoParam, activePlaylistEntry, allMergedVideos]);

  // Reset description expansion & completion state when switching playlist/video
  useEffect(() => {
    setDescExpanded(false);
    setPlaylistCompleted(false);
    if (activeVideoParam || activePlaylistParam) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeVideoParam, activePlaylistParam]);

  const openStandaloneVideo = (video: YouTubeVideoItem) => {
    const id = video.videoId || video.id;
    if (!id) return;
    setSearchParams({ v: id });
  };

  const openPlaylistDetail = (playlist: VideoPlaylist) => {
    setSearchParams({ playlist: playlist.id });
  };

  const openVideoInPlaylist = (
    playlistId: string,
    video: YouTubeVideoItem,
    replaceHistory: boolean = false
  ) => {
    const id = video.videoId || video.id;
    if (!id) return;
    setPlaylistCompleted(false);
    setSearchParams(
      { playlist: playlistId, v: id },
      replaceHistory ? { replace: true } : undefined
    );
  };

  const closeToMainView = () => {
    setSearchParams({});
  };

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
      video.videoUrl ||
      (video.videoId ? formatYouTubeWatchUrl(video.videoId) : window.location.href);
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

  // Standalone Player navigation list
  const standaloneQueue = useMemo(() => {
    if (!activePlayerVideo) return filteredVideos;
    const inFiltered = filteredVideos.some(
      (v) => (v.videoId || v.id) === (activePlayerVideo.videoId || activePlayerVideo.id)
    );
    if (inFiltered) return filteredVideos;
    return recentlyAddedVideos.filter(
      (v) => Boolean(v.isShort) === Boolean(activePlayerVideo.isShort)
    );
  }, [activePlayerVideo, filteredVideos, recentlyAddedVideos]);

  const currentStandaloneIndex = useMemo(() => {
    if (!activePlayerVideo) return -1;
    const targetKey = activePlayerVideo.videoId || activePlayerVideo.id;
    return standaloneQueue.findIndex((v) => (v.videoId || v.id) === targetKey);
  }, [activePlayerVideo, standaloneQueue]);

  const prevStandaloneVideo =
    currentStandaloneIndex > 0 ? standaloneQueue[currentStandaloneIndex - 1] : null;
  const nextStandaloneVideo =
    currentStandaloneIndex >= 0 && currentStandaloneIndex < standaloneQueue.length - 1
      ? standaloneQueue[currentStandaloneIndex + 1]
      : null;

  // ========================================================
  // 1. PLAYLIST DETAIL VIEW (?playlist={playlistId} & optional ?v={videoId})
  // ========================================================
  if (activePlaylistParam) {
    if (!activePlaylistEntry) {
      return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">
          <button
            type="button"
            onClick={closeToMainView}
            className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-200/90 text-[#1E3F1A] hover:bg-emerald-50 font-semibold text-sm shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>सभी प्लेलिस्ट व वीडियो</span>
          </button>

          <div className="bg-white rounded-3xl border border-gray-200/80 p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <ListVideo className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1E3F1A]">प्लेलिस्ट उपलब्ध नहीं है</h2>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
                यह प्लेलिस्ट वर्तमान में सक्रिय नहीं है या हटा दी गई है। कृपया किसान पाठशाला से अन्य प्लेलिस्ट देखें।
              </p>
            </div>
            <button
              type="button"
              onClick={closeToMainView}
              className="inline-flex items-center gap-2 bg-[#2D5A27] hover:bg-[#22471D] text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>किसान पाठशाला पर वापस जाएँ</span>
            </button>
          </div>
        </div>
      );
    }

    const { playlist, videos: playlistQueue, coverImage } = activePlaylistEntry;
    const selectedPlaylistVideo = activeVideoParam
      ? activePlayerVideo &&
        playlistQueue.some(
          (v) => (v.videoId || v.id) === (activePlayerVideo.videoId || activePlayerVideo.id)
        )
        ? activePlayerVideo
        : playlistQueue[0] || null
      : null;

    const currentIndex = selectedPlaylistVideo
      ? playlistQueue.findIndex(
          (v) =>
            (v.videoId || v.id) ===
            (selectedPlaylistVideo.videoId || selectedPlaylistVideo.id)
        )
      : -1;
    const prevPlaylistVideo = currentIndex > 0 ? playlistQueue[currentIndex - 1] : null;
    const nextPlaylistVideo =
      currentIndex >= 0 && currentIndex < playlistQueue.length - 1
        ? playlistQueue[currentIndex + 1]
        : null;

    const handlePlaylistVideoEnded = () => {
      if (!autoPlayNext) return;
      if (nextPlaylistVideo) {
        openVideoInPlaylist(playlist.id, nextPlaylistVideo, true);
      } else {
        setPlaylistCompleted(true);
      }
    };

    return (
      <div className="max-w-5xl mx-auto pb-8 space-y-5">
        {toastMsg && (
          <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1E3F1A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-white/15">
            <Check className="w-4 h-4 text-[#EAB308] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Top Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={closeToMainView}
            className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-200/90 text-[#1E3F1A] hover:bg-emerald-50 font-semibold text-sm shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>किसान पाठशाला</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoPlayNext((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer',
              autoPlayNext
                ? 'bg-emerald-50 border-[#2D5A27]/35 text-[#2D5A27]'
                : 'bg-white border-gray-200 text-gray-500'
            )}
          >
            <SkipForward className="w-4 h-4" />
            <span>ऑटो-नेक्स्ट: {autoPlayNext ? 'चालू' : 'बंद'}</span>
          </button>
        </div>

        {/* Active Video Player when a track is playing */}
        {selectedPlaylistVideo && (() => {
          const playerKey = selectedPlaylistVideo.videoId || selectedPlaylistVideo.id;
          const isBookmarked = bookmarkedIds.includes(playerKey);
          const dateLabel = formatVideoDateHindi(
            selectedPlaylistVideo.publishedAt,
            selectedPlaylistVideo.publishedTimestamp || selectedPlaylistVideo.createdAt
          );
          const playableVideoId =
            selectedPlaylistVideo.videoId ||
            extractYouTubeVideoId(selectedPlaylistVideo.videoUrl || '') ||
            playerKey;
          const watchUrl =
            selectedPlaylistVideo.videoUrl ||
            (playableVideoId ? formatYouTubeWatchUrl(playableVideoId) : '#');

          return (
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
              <YouTubeEmbedPlayer
                videoId={playableVideoId}
                title={selectedPlaylistVideo.title}
                isShort={Boolean(selectedPlaylistVideo.isShort)}
                embeddable={selectedPlaylistVideo.embeddable !== false}
                watchUrl={watchUrl}
                autoplay={true}
                onEnded={handlePlaylistVideoEnded}
                onErrorAction={
                  nextPlaylistVideo ? (
                    <button
                      type="button"
                      onClick={() => openVideoInPlaylist(playlist.id, nextPlaylistVideo, true)}
                      className="inline-flex items-center gap-1.5 bg-[#2D5A27] hover:bg-[#22471D] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>अगला वीडियो चलाएँ</span>
                    </button>
                  ) : undefined
                }
              />

              {/* Playlist Completed Banner */}
              {playlistCompleted && (
                <div className="p-4 sm:p-5 bg-emerald-50 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#2D5A27] shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <p className="text-sm font-bold text-[#1E3F1A]">
                        प्लेलिस्ट के सभी वीडियो पूरे हो चुके हैं
                      </p>
                      <p className="text-xs text-gray-600">
                        आप इस प्लेलिस्ट को फिर से देख सकते हैं या अन्य विषय-वार प्लेलिस्ट चुन सकते हैं।
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {playlistQueue[0] && (
                      <button
                        type="button"
                        onClick={() => openVideoInPlaylist(playlist.id, playlistQueue[0], true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D5A27] text-white text-xs font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>फिर से चलाएँ</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeToMainView}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-[#1E3F1A] text-xs font-bold cursor-pointer"
                    >
                      <ListVideo className="w-3.5 h-3.5" />
                      <span>सभी प्लेलिस्ट</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Video Metadata & Controls */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-[#2D5A27] border border-emerald-200 px-2.5 py-1 rounded-xl font-bold tabular-nums">
                      <ListVideo className="w-3.5 h-3.5" />
                      <span>
                        {playlist.name} ({currentIndex + 1} / {playlistQueue.length})
                      </span>
                    </span>
                    {selectedPlaylistVideo.duration && (
                      <span className="text-gray-600 tabular-nums">
                        {selectedPlaylistVideo.duration}
                      </span>
                    )}
                    {dateLabel && (
                      <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{dateLabel}</span>
                      </span>
                    )}
                  </div>

                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
                  >
                    <Youtube className="w-4 h-4" />
                    <span>YouTube पर देखें</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <h1 className="text-lg sm:text-xl font-bold text-[#1E3F1A] leading-snug">
                  {selectedPlaylistVideo.title}
                </h1>

                {selectedPlaylistVideo.description && (
                  <div>
                    <p
                      className={cn(
                        'text-sm text-gray-600 leading-relaxed whitespace-pre-line',
                        !descExpanded && 'line-clamp-3'
                      )}
                    >
                      {selectedPlaylistVideo.description}
                    </p>
                    {selectedPlaylistVideo.description.length > 140 && (
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

                <div className="pt-4 border-t border-gray-100 flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    disabled={!prevPlaylistVideo}
                    onClick={() =>
                      prevPlaylistVideo && openVideoInPlaylist(playlist.id, prevPlaylistVideo)
                    }
                    className={cn(
                      'flex-1 min-h-[48px] px-3 py-2.5 rounded-xl border font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors',
                      prevPlaylistVideo
                        ? 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-[#1E3F1A] cursor-pointer'
                        : 'border-gray-100 bg-gray-50/50 text-gray-300 cursor-not-allowed'
                    )}
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                    <span>पिछला</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareVideo(selectedPlaylistVideo)}
                    title="वीडियो शेयर करें"
                    className="min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-emerald-50 text-[#2D5A27] inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">शेयर</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(selectedPlaylistVideo)}
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
                    disabled={!nextPlaylistVideo}
                    onClick={() =>
                      nextPlaylistVideo && openVideoInPlaylist(playlist.id, nextPlaylistVideo)
                    }
                    className={cn(
                      'flex-1 min-h-[48px] px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors',
                      nextPlaylistVideo
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
          );
        })()}

        {/* Playlist Info Header Card (Cover Image, Name, Description, Total Videos) */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
            <div className="relative w-full sm:w-64 aspect-video rounded-2xl overflow-hidden bg-gray-900 shrink-0 border border-gray-200/80">
              {coverImage ? (
                <SmartImage
                  src={coverImage}
                  alt={playlist.name}
                  className="w-full h-full"
                  objectFit="cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-950 text-white/70">
                  <ListVideo className="w-10 h-10" />
                </div>
              )}
              <div className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-xs font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5 tabular-nums">
                <ListVideo className="w-3.5 h-3.5 text-[#EAB308]" />
                <span>{playlistQueue.length} वीडियो</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D5A27] bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl tabular-nums">
                <ListVideo className="w-3.5 h-3.5" />
                <span>प्लेलिस्ट · कुल {playlistQueue.length} वीडियो</span>
              </div>

              <h2 className="text-lg sm:text-2xl font-extrabold text-[#1E3F1A] leading-snug">
                {playlist.name}
              </h2>

              {playlist.description && (
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {playlist.description}
                </p>
              )}

              {!selectedPlaylistVideo && playlistQueue.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => openVideoInPlaylist(playlist.id, playlistQueue[0])}
                    className="inline-flex items-center gap-2 bg-[#2D5A27] hover:bg-[#22471D] text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>पहला वीडियो चलाएँ (Play All)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ordered Playlist Videos Queue */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[#1E3F1A] flex items-center gap-2">
              <Video className="w-4 h-4 text-[#2D5A27]" />
              <span>प्लेलिस्ट के सभी वीडियो ({playlistQueue.length})</span>
            </h3>
            <span className="text-[11px] font-medium text-gray-500">
              क्रमवार देखने के लिए किसी भी वीडियो पर टैप करें
            </span>
          </div>

          {playlistQueue.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <Video className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs font-semibold text-gray-500">
                इस प्लेलिस्ट में अभी कोई सक्रिय वीडियो नहीं जोड़ा गया है।
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {playlistQueue.map((vid, idx) => {
                const vidKey = vid.videoId || vid.id;
                const isPlaying =
                  selectedPlaylistVideo &&
                  (selectedPlaylistVideo.videoId || selectedPlaylistVideo.id) === vidKey;
                const dateLabel = formatVideoDateHindi(
                  vid.publishedAt,
                  vid.publishedTimestamp || vid.createdAt
                );

                return (
                  <button
                    key={`${vidKey}-${idx}`}
                    type="button"
                    onClick={() => openVideoInPlaylist(playlist.id, vid)}
                    className={cn(
                      'w-full flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer',
                      isPlaying
                        ? 'bg-emerald-50/90 border-[#2D5A27] shadow-2xs'
                        : 'bg-white border-gray-200/80 hover:bg-gray-50'
                    )}
                  >
                    <span
                      className={cn(
                        'w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 tabular-nums',
                        isPlaying
                          ? 'bg-[#2D5A27] text-white'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {isPlaying ? <Play className="w-3.5 h-3.5 fill-white ml-0.5" /> : idx + 1}
                    </span>

                    <div className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-gray-900 shrink-0">
                      <SmartImage
                        src={resolveVideoThumbnail(vid)}
                        alt={vid.title}
                        className="w-full h-full"
                        objectFit="cover"
                      />
                      {vid.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums">
                          {vid.duration}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPlaying && (
                          <span className="text-[10px] font-bold text-[#2D5A27] bg-white border border-emerald-200 px-2 py-0.5 rounded-lg">
                            अब चल रहा है
                          </span>
                        )}
                        {vid.isShort && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-0.5">
                            <Film className="w-3 h-3" /> शॉर्ट्स
                          </span>
                        )}
                        {dateLabel && (
                          <span className="text-[11px] text-gray-500 font-medium">{dateLabel}</span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-[#1E3F1A] line-clamp-2 leading-snug">
                        {vid.title}
                      </h4>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========================================================
  // 2. STANDALONE SINGLE VIDEO PLAYER VIEW (?v={videoId})
  // ========================================================
  if (activeVideoParam && !activePlayerVideo) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">
        <button
          type="button"
          onClick={closeToMainView}
          className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-200/90 text-[#1E3F1A] hover:bg-emerald-50 font-semibold text-sm shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>सभी वीडियो</span>
        </button>

        <div className="bg-white rounded-3xl border border-gray-200/80 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#1E3F1A]">वीडियो उपलब्ध नहीं है</h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
              चयनित वीडियो हटा दिया गया है या इसकी वीडियो ID मान्य नहीं है। कृपया किसान पाठशाला से कोई अन्य वीडियो चुनें।
            </p>
          </div>
          <button
            type="button"
            onClick={closeToMainView}
            className="inline-flex items-center gap-2 bg-[#2D5A27] hover:bg-[#22471D] text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>किसान पाठशाला के सभी वीडियो देखें</span>
          </button>
        </div>
      </div>
    );
  }

  if (activePlayerVideo) {
    const playerKey = activePlayerVideo.videoId || activePlayerVideo.id;
    const isBookmarked = bookmarkedIds.includes(playerKey);
    const isShortPlayer = Boolean(activePlayerVideo.isShort);
    const dateLabel = formatVideoDateHindi(
      activePlayerVideo.publishedAt,
      activePlayerVideo.publishedTimestamp || activePlayerVideo.createdAt
    );
    const playableVideoId =
      activePlayerVideo.videoId ||
      extractYouTubeVideoId(activePlayerVideo.videoUrl || '') ||
      playerKey;
    const watchUrl =
      activePlayerVideo.videoUrl ||
      (playableVideoId ? formatYouTubeWatchUrl(playableVideoId) : '#');
    const channelDisplayName =
      resolvedChannelTitle || youtubeChannel?.label || 'फल्सावदिया कृषि बाजार';

    return (
      <div className="max-w-5xl mx-auto pb-8 space-y-5">
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
            onClick={closeToMainView}
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
          <YouTubeEmbedPlayer
            videoId={playableVideoId}
            title={activePlayerVideo.title}
            isShort={isShortPlayer}
            embeddable={activePlayerVideo.embeddable !== false}
            watchUrl={watchUrl}
            autoplay={true}
            onErrorAction={
              <button
                type="button"
                onClick={closeToMainView}
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>सभी वीडियो देखें</span>
              </button>
            }
          />

          {/* Video Details Body */}
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-16 h-10 sm:w-20 sm:h-12 rounded-xl overflow-hidden bg-gray-900 border border-gray-200 shrink-0">
                <SmartImage
                  src={resolveVideoThumbnail(activePlayerVideo)}
                  alt={activePlayerVideo.title}
                  className="w-full h-full"
                  objectFit="cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700">
                  <Youtube className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{channelDisplayName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-gray-500 mt-0.5">
                  {dateLabel && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{dateLabel}</span>
                    </span>
                  )}
                  {activePlayerVideo.duration && (
                    <>
                      {dateLabel && <span className="text-gray-300" aria-hidden="true">·</span>}
                      <span className="text-gray-600 tabular-nums">{activePlayerVideo.duration}</span>
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
              </div>
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-[#1E3F1A] leading-snug">
              {activePlayerVideo.title}
            </h1>

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

            <div className="pt-4 border-t border-gray-100 flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                disabled={!prevStandaloneVideo}
                onClick={() => prevStandaloneVideo && openStandaloneVideo(prevStandaloneVideo)}
                className={cn(
                  'flex-1 min-h-[48px] px-3 py-2.5 rounded-xl border font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors',
                  prevStandaloneVideo
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
                disabled={!nextStandaloneVideo}
                onClick={() => nextStandaloneVideo && openStandaloneVideo(nextStandaloneVideo)}
                className={cn(
                  'flex-1 min-h-[48px] px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors',
                  nextStandaloneVideo
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
        {nextStandaloneVideo && (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-2.5">
            <p className="text-xs font-bold text-[#2D5A27]">आगे देखें (Up Next)</p>
            <button
              type="button"
              onClick={() => openStandaloneVideo(nextStandaloneVideo)}
              className="w-full flex items-center gap-3.5 text-left group cursor-pointer rounded-xl hover:bg-gray-50 p-1.5 -m-1.5 transition-colors"
            >
              <div className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-gray-900 shrink-0">
                <SmartImage
                  src={resolveVideoThumbnail(nextStandaloneVideo)}
                  alt={nextStandaloneVideo.title}
                  className="w-full h-full"
                  objectFit="cover"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/95 text-[#2D5A27] flex items-center justify-center shadow">
                    <Play className="w-4 h-4 fill-[#2D5A27] ml-0.5" />
                  </div>
                </div>
                {nextStandaloneVideo.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums">
                    {nextStandaloneVideo.duration}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                {formatVideoDateHindi(
                  nextStandaloneVideo.publishedAt,
                  nextStandaloneVideo.publishedTimestamp || nextStandaloneVideo.createdAt
                ) && (
                  <p className="text-[11px] font-medium text-gray-500">
                    {formatVideoDateHindi(
                      nextStandaloneVideo.publishedAt,
                      nextStandaloneVideo.publishedTimestamp || nextStandaloneVideo.createdAt
                    )}
                  </p>
                )}
                <h3 className="text-sm font-bold text-[#1E3F1A] line-clamp-2 group-hover:text-[#2D5A27]">
                  {nextStandaloneVideo.title}
                </h3>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // 3. MAIN KISAN PATHSHALA LISTING VIEW
  // Section A (Top): Playlists Grid (Cover Image, Name, Video Count)
  // Section B (Below): Recently Added Videos (Newest First, No Categories)
  // ========================================================
  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-6">
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
              किसान पाठशाला
            </h1>
            {resolvedChannelTitle && (
              <p className="text-xs text-gray-600 font-medium">{resolvedChannelTitle}</p>
            )}
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

      {/* SECTION A: PLAYLISTS GRID (Top) */}
      {activePlaylistsWithVideos.length > 0 && (
        <section className="space-y-3.5" aria-labelledby="playlists-section-heading">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="playlists-section-heading"
              className="text-base sm:text-lg font-extrabold text-[#1E3F1A] flex items-center gap-2"
            >
              <ListVideo className="w-5 h-5 text-[#2D5A27]" />
              <span>विषय-वार प्लेलिस्ट</span>
            </h2>
            <span className="text-xs font-semibold text-gray-500 tabular-nums">
              {activePlaylistsWithVideos.length} प्लेलिस्ट
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {activePlaylistsWithVideos.map(({ playlist, videos: plVideos, coverImage }) => (
              <article
                key={playlist.id}
                onClick={() => openPlaylistDetail(playlist)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPlaylistDetail(playlist);
                  }
                }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden cursor-pointer group flex flex-col"
              >
                <div className="relative aspect-video bg-gray-900 overflow-hidden">
                  {coverImage ? (
                    <SmartImage
                      src={coverImage}
                      alt={playlist.name}
                      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                      objectFit="cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E3F1A] to-[#2D5A27] text-white/80">
                      <ListVideo className="w-12 h-12" />
                    </div>
                  )}

                  {/* YouTube-style Right Vertical Playlist Overlay */}
                  <div className="absolute inset-y-0 right-0 w-24 sm:w-28 bg-black/75 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 text-white px-2">
                    <span className="text-base sm:text-lg font-extrabold tabular-nums">
                      {plVideos.length}
                    </span>
                    <ListVideo className="w-5 h-5 text-[#EAB308]" />
                    <span className="text-[10px] font-bold tracking-wide">वीडियो</span>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-[#1E3F1A] line-clamp-2 leading-snug group-hover:text-[#2D5A27] transition-colors">
                      {playlist.name}
                    </h3>
                    <p className="text-xs font-semibold text-[#2D5A27] inline-flex items-center gap-1.5 tabular-nums">
                      <ListVideo className="w-3.5 h-3.5" />
                      <span>{plVideos.length} वीडियो</span>
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center shrink-0 group-hover:bg-[#2D5A27] group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* SECTION B: RECENTLY ADDED VIDEOS (Below Playlists, Sorted Newest First) */}
      <section className="space-y-4" aria-labelledby="recent-videos-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2
            id="recent-videos-heading"
            className="text-base sm:text-lg font-extrabold text-[#1E3F1A] flex items-center gap-2"
          >
            <Video className="w-5 h-5 text-[#2D5A27]" />
            <span>हाल ही में जोड़े गए वीडियो</span>
          </h2>

          {showShortsTab && (
            <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs grid grid-cols-2 gap-1.5 w-full sm:w-auto sm:min-w-[320px]">
              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className={cn(
                  'min-h-[42px] py-2 px-4 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap',
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
                  'min-h-[42px] py-2 px-4 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap',
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
                : activeTab === 'shorts'
                ? 'अभी कोई शॉर्ट्स वीडियो उपलब्ध नहीं है'
                : 'अभी कोई वीडियो उपलब्ध नहीं है'}
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {onlyBookmarked
                ? 'सेव किए गए वीडियो देखने के लिए किसी भी वीडियो पर बुकमार्क आइकन दबाएँ।'
                : 'नए कृषि वीडियो देखने के लिए कुछ समय बाद पुनः जाँच करें।'}
            </p>
            {onlyBookmarked && (
              <button
                type="button"
                onClick={() => setOnlyBookmarked(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2D5A27] text-white text-xs font-bold cursor-pointer"
              >
                सभी वीडियो दिखाएँ
              </button>
            )}
          </div>
        ) : activeTab === 'shorts' && showShortsTab ? (
          /* SHORTS / REELS PORTRAIT GRID */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {visibleVideos.map((video, idx) => {
              const dateLabel = formatVideoDateHindi(
                video.publishedAt,
                video.publishedTimestamp || video.createdAt
              );
              return (
                <div
                  key={`${video.videoId || video.id}-${idx}`}
                  onClick={() => openStandaloneVideo(video)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openStandaloneVideo(video);
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

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-white/90 text-[#1E3F1A] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-[#1E3F1A] ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3 pt-10 text-left space-y-1">
                    {dateLabel && (
                      <p className="text-[11px] font-semibold text-[#EAB308] truncate">
                        {dateLabel}
                      </p>
                    )}
                    <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                      {video.title}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* STANDARD 16:9 RECENTLY ADDED VIDEOS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {visibleVideos.map((video, idx) => {
              const key = video.videoId || video.id;
              const isBookmarked = bookmarkedIds.includes(key);
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
                    onClick={() => openStandaloneVideo(video)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openStandaloneVideo(video);
                      }
                    }}
                    className="cursor-pointer flex-1 flex flex-col"
                  >
                    <div className="relative aspect-video bg-gray-900 overflow-hidden">
                      <SmartImage
                        src={resolveVideoThumbnail(video)}
                        alt={video.title}
                        className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                        objectFit="cover"
                      />

                      <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                        <div className="w-13 h-13 rounded-full bg-white/95 text-[#1E3F1A] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <Play className="w-6 h-6 fill-[#1E3F1A] ml-0.5" />
                        </div>
                      </div>

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

                      {video.duration && (
                        <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg tabular-nums">
                          {video.duration}
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                      {dateLabel && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{dateLabel}</span>
                        </div>
                      )}

                      <h3 className="text-base font-bold text-[#1E3F1A] line-clamp-2 leading-snug group-hover:text-[#2D5A27] transition-colors">
                        {video.title}
                      </h3>

                      {video.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {video.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between gap-2 bg-gray-50/40">
                    <button
                      type="button"
                      onClick={() => openStandaloneVideo(video)}
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
      </section>
    </div>
  );
};

export default Videos;
