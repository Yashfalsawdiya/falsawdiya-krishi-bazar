import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Youtube,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit3,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  X,
  ExternalLink,
  Info,
  Play,
  Sparkles,
  Link as LinkIcon,
  Video,
  CheckCircle2,
  RefreshCw,
  Pin,
  Star,
  Film,
  Radio,
  ListVideo,
} from 'lucide-react';
import {
  YouTubeVideoItem,
  ImageSource,
  VideoHubSettings,
  VideoOverride,
} from '../types';
import { AppContent, useAppContext } from '../context/AppContext';
import {
  extractYouTubeVideoId,
  formatYouTubeWatchUrl,
  getYouTubeThumbnailSource,
  resolveVideoThumbnail,
  fetchYouTubeVideoTitle,
  normalizeVideos,
  sanitizeSyncedVideos,
  mergeHybridVideos,
  getCachedVideoFeed,
  setCachedVideoFeed,
  formatVideoDateHindi,
} from '../utils/youtubeUtils';
import DualImageInput from './DualImageInput';
import SmartImage from './SmartImage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AdminYouTubeVideoManagerProps {
  contentForm: AppContent;
  setContentForm: React.Dispatch<React.SetStateAction<AppContent>>;
  onSaveContent?: (nextContent?: AppContent) => Promise<void>;
}

const AdminYouTubeVideoManager: React.FC<AdminYouTubeVideoManagerProps> = ({
  contentForm,
  setContentForm,
  onSaveContent,
}) => {
  const {
    playlists,
    playlistVideos,
    setVideoPlaylists,
    cleanupVideoPlaylistMappings,
  } = useAppContext();

  const sortedPlaylists = useMemo(
    () => [...playlists].sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999)),
    [playlists]
  );

  const playlistByIdMap = useMemo(() => {
    const map = new Map<string, (typeof playlists)[number]>();
    sortedPlaylists.forEach((p) => map.set(p.id, p));
    return map;
  }, [sortedPlaylists]);

  // Manual curated videos (shown on Home Page + Video Hub)
  const manualVideosList: YouTubeVideoItem[] = useMemo(() => {
    return normalizeVideos(contentForm?.videos);
  }, [contentForm?.videos]);

  const hubSettings: VideoHubSettings = contentForm?.videoHubSettings || {};
  const overrides = hubSettings.overrides || {};

  // Synced channel videos from Hybrid Backend (/api/videos/youtube)
  const [syncedChannelVideos, setSyncedChannelVideos] = useState<YouTubeVideoItem[]>([]);
  const [isSyncingChannel, setIsSyncingChannel] = useState(false);
  const [hasApiKeyConfigured, setHasApiKeyConfigured] = useState<boolean>(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<YouTubeVideoItem | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<YouTubeVideoItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for Add / Edit
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formThumbnail, setFormThumbnail] = useState<string | ImageSource>('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsShort, setFormIsShort] = useState(false);
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formSelectedPlaylistIds, setFormSelectedPlaylistIds] = useState<string[]>([]);
  const [isDetectingTitle, setIsDetectingTitle] = useState(false);
  const [formUrlError, setFormUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Load initial synced channel cache on mount if channel URL exists
  const fetchChannelStatus = useCallback(async () => {
    const channelUrl = (contentForm?.youtubeChannel?.url || '').trim();
    const channelId = (hubSettings?.resolvedChannelId || '').trim();
    const key = (channelId || channelUrl).toLowerCase();
    if (!key) return;

    const cached = getCachedVideoFeed(key, true);
    if (cached) {
      setSyncedChannelVideos(sanitizeSyncedVideos(cached.videos));
      if (typeof cached.hasApiKeyConfigured === 'boolean') {
        setHasApiKeyConfigured(cached.hasApiKeyConfigured);
      }
    }

    try {
      const params = new URLSearchParams();
      if (channelUrl) params.set('channelUrl', channelUrl);
      if (channelId) params.set('channelId', channelId);
      const res = await fetch(`/api/videos/youtube?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && Array.isArray(data.videos)) {
        const normalized = sanitizeSyncedVideos(data.videos);
        setSyncedChannelVideos(normalized);
        setHasApiKeyConfigured(Boolean(data.hasApiKeyConfigured));
        setCachedVideoFeed({
          channelKey: key,
          channelId: data.channelId || channelId,
          channelTitle: data.channelTitle || '',
          mode: data.mode || 'rss',
          hasApiKeyConfigured: Boolean(data.hasApiKeyConfigured),
          lastSyncAt: data.lastSyncAt || Date.now(),
          videos: normalized,
        });
      }
    } catch {
      // Non-blocking
    }
  }, [contentForm?.youtubeChannel?.url, hubSettings?.resolvedChannelId]);

  useEffect(() => {
    fetchChannelStatus();
  }, [fetchChannelStatus]);

  // Combined view list (for unified admin controls)
  const combinedVideosList = useMemo(() => {
    return mergeHybridVideos(manualVideosList, syncedChannelVideos, overrides, true);
  }, [manualVideosList, syncedChannelVideos, overrides]);

  const formExtractedId = useMemo(() => extractYouTubeVideoId(formVideoUrl), [formVideoUrl]);

  const handleUrlChange = async (url: string) => {
    setFormVideoUrl(url);
    const id = extractYouTubeVideoId(url);
    if (!url.trim()) {
      setFormUrlError(null);
      return;
    }

    if (!id) {
      setFormUrlError(
        'कृपया मान्य यूट्यूब URL दर्ज करें (जैसे: https://youtube.com/watch?v=... या /shorts/...)'
      );
      return;
    }

    setFormUrlError(null);
    if (/youtube\.com\/shorts\//i.test(url)) {
      setFormIsShort(true);
    }

    if (!formTitle.trim()) {
      setIsDetectingTitle(true);
      const title = await fetchYouTubeVideoTitle(id);
      setIsDetectingTitle(false);
      if (title && !formTitle.trim()) {
        setFormTitle(title);
      }
    }
  };

  const handleManualFetchTitle = async () => {
    if (!formExtractedId) return;
    setIsDetectingTitle(true);
    const title = await fetchYouTubeVideoTitle(formExtractedId);
    setIsDetectingTitle(false);
    if (title) {
      setFormTitle(title);
      setStatusMessage({ type: 'success', text: 'वीडियो का शीर्षक स्वतः भर दिया गया है।' });
    } else {
      setStatusMessage({ type: 'info', text: 'शीर्षक स्वतः नहीं मिल सका, कृपया मैन्युअल लिखें।' });
    }
  };

  const commitContentUpdate = async (
    updater: (prev: AppContent) => AppContent,
    feedbackText?: string
  ) => {
    const nextSnapshot = updater(contentForm);
    setContentForm(nextSnapshot);

    if (onSaveContent) {
      try {
        setIsSaving(true);
        await onSaveContent(nextSnapshot);
        if (feedbackText) {
          setStatusMessage({ type: 'success', text: feedbackText });
        }
      } catch (err) {
        console.error('Failed to save video changes:', err);
        setStatusMessage({ type: 'error', text: 'डेटा सेव करने में त्रुटि हुई।' });
      } finally {
        setIsSaving(false);
      }
    } else if (feedbackText) {
      setStatusMessage({ type: 'success', text: feedbackText });
    }
  };

  // Sync entire channel via Hybrid API / RSS route
  const handleSyncChannelNow = async () => {
    const channelUrl = (contentForm?.youtubeChannel?.url || '').trim();
    const channelId = (hubSettings?.resolvedChannelId || '').trim();

    if (!channelUrl && !channelId) {
      setStatusMessage({
        type: 'error',
        text: 'कृपया पहले अपने YouTube चैनल का URL या @Handle दर्ज करें।',
      });
      return;
    }

    setIsSyncingChannel(true);
    try {
      const res = await fetch('/api/videos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl, channelId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatusMessage({
          type: 'error',
          text: data?.error || data?.message || 'चैनल सिंक करने में समस्या आई।',
        });
        return;
      }

      const normalized = sanitizeSyncedVideos(data.videos || []);
      setSyncedChannelVideos(normalized);
      setHasApiKeyConfigured(Boolean(data.hasApiKeyConfigured));

      const cacheKey = (data.channelId || channelUrl).toLowerCase();
      setCachedVideoFeed({
        channelKey: cacheKey,
        channelId: data.channelId,
        channelTitle: data.channelTitle || '',
        mode: data.mode || 'rss',
        hasApiKeyConfigured: Boolean(data.hasApiKeyConfigured),
        lastSyncAt: data.lastSyncAt || Date.now(),
        videos: normalized,
      });

      await commitContentUpdate(
        (prev) => ({
          ...prev,
          videoHubSettings: {
            ...(prev.videoHubSettings || {}),
            resolvedChannelId: data.channelId || prev.videoHubSettings?.resolvedChannelId,
            resolvedChannelTitle: data.channelTitle || prev.videoHubSettings?.resolvedChannelTitle,
            lastSyncAt: data.lastSyncAt || Date.now(),
            lastSyncMode: data.mode || 'rss',
            lastSyncCount: normalized.length,
          },
        }),
        `${normalized.length} वीडियो सफलतापूर्वक सिंक और सेव हुए (${
          data.mode === 'api' ? 'YouTube API v3' : 'मुफ्त YouTube RSS'
        })।`
      );
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'नेटवर्क त्रुटि: चैनल सिंक नहीं हो सका।',
      });
    } finally {
      setIsSyncingChannel(false);
    }
  };

  const updateHubSetting = (patch: Partial<VideoHubSettings>) => {
    setContentForm((prev) => ({
      ...prev,
      videoHubSettings: {
        ...(prev.videoHubSettings || {}),
        ...patch,
      },
    }));
  };

  // Update override for any video (especially channel-synced videos) or direct fields for manual videos
  const updateVideoMetadata = async (
    video: YouTubeVideoItem,
    patch: Partial<VideoOverride>
  ) => {
    const key = video.videoId || video.id;
    const isManual = manualVideosList.some((m) => m.id === video.id || m.videoId === video.videoId);

    await commitContentUpdate((prev) => {
      const updatedManual = isManual
        ? normalizeVideos(prev.videos).map((m) =>
            m.id === video.id || (video.videoId && m.videoId === video.videoId)
              ? {
                  ...m,
                  ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
                  ...(patch.isPinned !== undefined ? { isPinned: patch.isPinned } : {}),
                  ...(patch.isFeatured !== undefined ? { isFeatured: patch.isFeatured } : {}),
                  ...(patch.isShort !== undefined ? { isShort: patch.isShort } : {}),
                  ...(patch.category !== undefined ? { category: patch.category } : {}),
                  updatedAt: Date.now(),
                }
              : m
          )
        : prev.videos;

      const prevOverrides = prev.videoHubSettings?.overrides || {};
      const existingOv = prevOverrides[key] || { videoId: key };

      return {
        ...prev,
        videos: updatedManual,
        videoHubSettings: {
          ...(prev.videoHubSettings || {}),
          overrides: {
            ...prevOverrides,
            [key]: {
              ...existingOv,
              ...patch,
              videoId: key,
              updatedAt: Date.now(),
            },
          },
        },
      };
    }, 'वीडियो सेटिंग सफलतापूर्वक सेव की गई।');
  };

  const openAddModal = () => {
    setFormVideoUrl('');
    setFormTitle('');
    setFormDescription('');
    setFormThumbnail('');
    setFormIsActive(true);
    setFormIsShort(false);
    setFormIsPinned(false);
    setFormIsFeatured(false);
    setFormSelectedPlaylistIds([]);
    setFormUrlError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (video: YouTubeVideoItem) => {
    const targetKey = video.videoId || video.id;
    const assignedIds = playlistVideos
      .filter((m) => m.videoId === targetKey)
      .map((m) => m.playlistId);

    setEditingVideo(video);
    setFormVideoUrl(video.videoUrl || (video.videoId ? formatYouTubeWatchUrl(video.videoId) : ''));
    setFormTitle(video.title || '');
    setFormDescription(video.description || '');
    setFormThumbnail(video.thumbnail || '');
    setFormIsActive(video.isActive !== false);
    setFormIsShort(Boolean(video.isShort));
    setFormIsPinned(Boolean(video.isPinned));
    setFormIsFeatured(Boolean(video.isFeatured));
    setFormSelectedPlaylistIds(Array.from(new Set(assignedIds)));
    setFormUrlError(null);
  };

  const handleCreateVideo = async (
    e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent
  ) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    const id = extractYouTubeVideoId(formVideoUrl);
    if (!id) {
      setFormUrlError('कृपया एक वैध यूट्यूब वीडियो URL दर्ज करें।');
      return;
    }
    if (!formTitle.trim()) {
      setFormUrlError('कृपया वीडियो का शीर्षक दर्ज करें।');
      return;
    }

    const watchUrl = formIsShort
      ? `https://www.youtube.com/shorts/${id}`
      : formatYouTubeWatchUrl(id);
    const thumb =
      formThumbnail &&
      (typeof formThumbnail === 'string'
        ? formThumbnail.trim()
        : formThumbnail.primary || formThumbnail.fallback)
        ? formThumbnail
        : getYouTubeThumbnailSource(id);

    const newVideo: YouTubeVideoItem = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: formTitle.trim(),
      videoUrl: watchUrl,
      videoId: id,
      description: formDescription.trim(),
      thumbnail: thumb,
      isActive: formIsActive,
      isShort: formIsShort,
      isPinned: formIsPinned,
      isFeatured: formIsFeatured,
      source: 'manual',
      displayOrder: manualVideosList.length + 1,
      createdAt: Date.now(),
    };

    const updated = [...manualVideosList, newVideo];
    await commitContentUpdate(
      (prev) => ({ ...prev, videos: updated }),
      'नई वीडियो सफलतापूर्वक जोड़ी गई!'
    );
    if (formSelectedPlaylistIds.length > 0) {
      await setVideoPlaylists(id, formSelectedPlaylistIds);
    }
    setIsAddModalOpen(false);
  };

  const handleUpdateVideo = async (
    e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent
  ) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!editingVideo) return;

    const id = extractYouTubeVideoId(formVideoUrl);
    if (!id) {
      setFormUrlError('कृपया एक वैध यूट्यूब वीडियो URL दर्ज करें।');
      return;
    }
    if (!formTitle.trim()) {
      setFormUrlError('कृपया वीडियो का शीर्षक दर्ज करें।');
      return;
    }

    const oldKey = editingVideo.videoId || editingVideo.id;
    const isManual = manualVideosList.some((m) => m.id === editingVideo.id);

    if (isManual) {
      const watchUrl = formIsShort
        ? `https://www.youtube.com/shorts/${id}`
        : formatYouTubeWatchUrl(id);
      const thumb =
        formThumbnail &&
        (typeof formThumbnail === 'string'
          ? formThumbnail.trim()
          : formThumbnail.primary || formThumbnail.fallback)
          ? formThumbnail
          : getYouTubeThumbnailSource(id);

      const updated = manualVideosList.map((v) =>
        v.id === editingVideo.id
          ? {
              ...v,
              title: formTitle.trim(),
              videoUrl: watchUrl,
              videoId: id,
              description: formDescription.trim(),
              thumbnail: thumb,
              isActive: formIsActive,
              isShort: formIsShort,
              isPinned: formIsPinned,
              isFeatured: formIsFeatured,
              updatedAt: Date.now(),
            }
          : v
      );

      await commitContentUpdate(
        (prev) => ({ ...prev, videos: updated }),
        'वीडियो जानकारी सफलतापूर्वक अपडेट की गई!'
      );
      if (oldKey && oldKey !== id) {
        await cleanupVideoPlaylistMappings(oldKey);
      }
      await setVideoPlaylists(id, formSelectedPlaylistIds);
    } else {
      await updateVideoMetadata(editingVideo, {
        title: formTitle.trim(),
        description: formDescription.trim(),
        isActive: formIsActive,
        isShort: formIsShort,
        isPinned: formIsPinned,
        isFeatured: formIsFeatured,
      });
      await setVideoPlaylists(oldKey, formSelectedPlaylistIds);
    }
    setEditingVideo(null);
  };

  const handleMoveManual = async (manualIdx: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? manualIdx - 1 : manualIdx + 1;
    if (targetIndex < 0 || targetIndex >= manualVideosList.length) return;

    const list = [...manualVideosList];
    const temp = list[manualIdx];
    list[manualIdx] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = list.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1,
    }));

    await commitContentUpdate(
      (prev) => ({ ...prev, videos: updated }),
      'वीडियो का क्रम बदल दिया गया है!'
    );
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    const targetVideo = videoToDelete;
    const targetKey = targetVideo.videoId || targetVideo.id;
    const isManual = manualVideosList.some(
      (m) => m.id === targetVideo.id || (targetVideo.videoId && m.videoId === targetVideo.videoId)
    );

    if (!isManual) {
      await updateVideoMetadata(targetVideo, { isActive: false, isDeleted: true });
      await cleanupVideoPlaylistMappings(targetKey);
      setSyncedChannelVideos((prev) =>
        prev.filter((v) => (v.videoId || v.id) !== targetKey)
      );
      setVideoToDelete(null);
      setStatusMessage({ type: 'success', text: 'वीडियो सफलतापूर्वक हटा दी गई!' });
      return;
    }

    const updated = manualVideosList
      .filter((v) => v.id !== targetVideo.id)
      .map((item, idx) => ({
        ...item,
        displayOrder: idx + 1,
      }));

    await commitContentUpdate(
      (prev) => ({ ...prev, videos: updated }),
      'वीडियो सफलतापूर्वक हटा दी गई!'
    );
    await cleanupVideoPlaylistMappings(targetKey);
    setVideoToDelete(null);
  };

  return (
    <div className="space-y-6" id="admin-youtube-videos-section">
      {/* Header with Title & Add Button */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-sm border border-red-100">
            <Youtube className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-[#4A3728] text-lg flex items-center gap-2 flex-wrap">
              <span>कृषि वीडियो व हाइब्रिड चैनल प्रबंधन</span>
              <span className="text-xs bg-emerald-50 text-[#2D5A27] border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {hasApiKeyConfigured || hubSettings.lastSyncMode === 'api'
                  ? 'YouTube API v3 + RSS'
                  : 'फ्री YouTube RSS हाइब्रिड'}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              चैनल से ऑटो-सिंक करें या होम पेज व किसान पाठशाला के लिए मैन्युअल वीडियो जोड़ें और प्लेलिस्ट तय करें
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            type="button"
            disabled={isSyncingChannel}
            onClick={handleSyncChannelNow}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncingChannel && 'animate-spin')} />
            <span>{isSyncingChannel ? 'सिंक हो रहा है...' : 'चैनल अभी सिंक करें'}</span>
          </button>

          <button
            type="button"
            id="admin-add-youtube-video-btn"
            onClick={openAddModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[#2D5A27] hover:bg-[#23461e] text-white px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>नई वीडियो जोड़ें</span>
          </button>
        </div>
      </div>

      {/* YouTube Channel & Hybrid Video Hub Settings Card */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-red-600" />
            <h4 className="text-sm font-bold text-[#4A3728]">
              YouTube चैनल कनेक्शन व ऑटो-सिंक सेटिंग्स
            </h4>
          </div>
          {hubSettings.lastSyncAt && (
            <span className="text-[11px] text-gray-500 font-medium">
              अंतिम सिंक: {formatVideoDateHindi(undefined, hubSettings.lastSyncAt)} ·{' '}
              {hubSettings.lastSyncCount ?? syncedChannelVideos.length} वीडियो
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
              बटन का लेबल (Button Label)
            </label>
            <input
              type="text"
              value={contentForm?.youtubeChannel?.label || ''}
              onChange={(e) => {
                if (!contentForm) return;
                setContentForm({
                  ...contentForm,
                  youtubeChannel: {
                    ...(contentForm.youtubeChannel || { url: '', label: '' }),
                    label: e.target.value,
                  },
                });
              }}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-medium text-sm"
              placeholder="जैसे: चैनल देखें"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
              YouTube चैनल URL या @Handle *
            </label>
            <div className="relative">
              <input
                type="text"
                value={contentForm?.youtubeChannel?.url || ''}
                onChange={(e) => {
                  if (!contentForm) return;
                  setContentForm({
                    ...contentForm,
                    youtubeChannel: {
                      ...(contentForm.youtubeChannel || { url: '', label: '' }),
                      url: e.target.value,
                    },
                  });
                }}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 pr-10 outline-none transition-all font-medium text-sm"
                placeholder="जैसे: https://www.youtube.com/@FalsawdiyaKrishiBazaar"
              />
              {contentForm?.youtubeChannel?.url && (
                <a
                  href={contentForm.youtubeChannel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors"
                  title="चैनल खोलें"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Optional Channel ID & Hub Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
              Channel ID (UC... स्वतः भरता है)
            </label>
            <input
              type="text"
              value={hubSettings.resolvedChannelId || ''}
              onChange={(e) => updateHubSetting({ resolvedChannelId: e.target.value.trim() })}
              className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white rounded-xl p-2.5 outline-none text-xs font-mono"
              placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <p className="text-xs font-bold text-[#4A3728]">ऑटो-सिंक (Auto-Sync)</p>
              <p className="text-[10px] text-gray-500">चैनल से नए वीडियो खुद लाएँ</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = hubSettings.autoSyncEnabled === false;
                commitContentUpdate(
                  (prev) => ({
                    ...prev,
                    videoHubSettings: {
                      ...(prev.videoHubSettings || {}),
                      autoSyncEnabled: nextVal,
                    },
                  }),
                  nextVal ? 'ऑटो-सिंक चालू कर दिया गया।' : 'ऑटो-सिंक बंद कर दिया गया।'
                );
              }}
              className={cn(
                'w-11 h-6 rounded-full p-0.5 transition-colors relative cursor-pointer',
                hubSettings.autoSyncEnabled !== false ? 'bg-[#2D5A27]' : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                  hubSettings.autoSyncEnabled !== false ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <p className="text-xs font-bold text-[#4A3728]">शॉर्ट्स / रील्स टैब</p>
              <p className="text-[10px] text-gray-500">वीडियो पेज पर शॉर्ट्स दिखाएँ</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = hubSettings.showShortsTab === false;
                commitContentUpdate(
                  (prev) => ({
                    ...prev,
                    videoHubSettings: {
                      ...(prev.videoHubSettings || {}),
                      showShortsTab: nextVal,
                    },
                  }),
                  nextVal ? 'शॉर्ट्स / रील्स टैब चालू किया गया।' : 'शॉर्ट्स / रील्स टैब बंद किया गया।'
                );
              }}
              className={cn(
                'w-11 h-6 rounded-full p-0.5 transition-colors relative cursor-pointer',
                hubSettings.showShortsTab !== false ? 'bg-[#2D5A27]' : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                  hubSettings.showShortsTab !== false ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'p-4 rounded-2xl flex items-center justify-between text-sm font-medium shadow-sm',
              statusMessage.type === 'success' &&
                'bg-green-50 text-green-800 border border-green-200',
              statusMessage.type === 'error' && 'bg-red-50 text-red-800 border border-red-200',
              statusMessage.type === 'info' && 'bg-blue-50 text-blue-800 border border-blue-200'
            )}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              )}
              {statusMessage.type === 'error' && (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              {statusMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rule Notice */}
      <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-800">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold">नियम व हाइब्रिड मोड: </span>
          बिना API Key के फ्री RSS से नवीनतम 15 चैनल वीडियो अपने आप आते हैं; सर्वर पर{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">YOUTUBE_API_KEY</code> जुड़ने पर
          सभी पुराने वीडियो व समय (Duration) भी स्वतः जुड़ जाएंगे। आप किसी भी वीडियो को पिन, Featured,
          शॉर्ट्स, छिपाने या हटाने (Delete) का कार्य सीधे यहाँ से कर सकते हैं।
        </div>
      </div>

      {/* Videos List Grid */}
      <div className="space-y-4">
        {combinedVideosList.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm">
            <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">अभी कोई वीडियो उपलब्ध नहीं है।</p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-2 bg-[#2D5A27] text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              पहली वीडियो जोड़ें
            </button>
          </div>
        ) : (
          combinedVideosList.map((video, idx) => {
            const manualIdx = manualVideosList.findIndex((m) => m.id === video.id);
            const isManual = manualIdx !== -1;
            const isFirst = isManual && manualIdx === 0;
            const isLast = isManual && manualIdx === manualVideosList.length - 1;
            const resolvedThumb = resolveVideoThumbnail(video);
            const videoKey = video.videoId || video.id;
            const assignedPlaylistNames = playlistVideos
              .filter((m) => m.videoId === videoKey)
              .map((m) => playlistByIdMap.get(m.playlistId)?.name)
              .filter((name): name is string => Boolean(name));

            return (
              <div
                key={`${video.videoId || video.id}-${idx}`}
                className={cn(
                  'bg-white p-5 rounded-3xl shadow-sm border transition-all duration-200',
                  video.isActive ? 'border-gray-100' : 'border-gray-200/80 bg-gray-50/50 opacity-80'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left: Thumbnail & Info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-full sm:w-44 aspect-video rounded-2xl overflow-hidden bg-gray-900 shrink-0 shadow-inner">
                      <SmartImage
                        src={resolvedThumb}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-9 h-6 bg-red-600 text-white rounded-lg flex items-center justify-center shadow-lg">
                          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                        </div>
                      </div>

                      <span className="absolute top-2 left-2 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {isManual ? `होम #${manualIdx + 1}` : 'चैनल सिंक'}
                      </span>

                      {video.duration && (
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums">
                          {video.duration}
                        </span>
                      )}
                    </div>

                    {/* Details & Playlist Chips */}
                    <div className="space-y-2 flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        {video.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            सक्रिय
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                            <EyeOff className="w-3 h-3" />
                            छिपा हुआ
                          </span>
                        )}

                        {video.isShort && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                            <Film className="w-3 h-3" />
                            शॉर्ट्स
                          </span>
                        )}

                        {video.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Pin className="w-3 h-3" />
                            पिन
                          </span>
                        )}

                        {video.isFeatured && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                            <Star className="w-3 h-3 fill-amber-500" />
                            Featured
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-[#4A3728] text-base leading-snug line-clamp-1">
                        {video.title}
                      </h4>

                      {video.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{video.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {assignedPlaylistNames.map((plName, pIdx) => (
                          <span
                            key={`${plName}-${pIdx}`}
                            className="inline-flex items-center gap-1 bg-emerald-50 text-[#2D5A27] border border-emerald-200/80 rounded-xl px-2.5 py-1 text-[11px] font-bold"
                          >
                            <ListVideo className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{plName}</span>
                          </span>
                        ))}

                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium hover:underline truncate max-w-[220px]"
                        >
                          <Youtube className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{video.videoId || 'YouTube'}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions Controls */}
                  <div className="flex items-center gap-1.5 self-end lg:self-center shrink-0 flex-wrap justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 w-full lg:w-auto">
                    {isManual && (
                      <>
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveManual(manualIdx, 'up')}
                          title="ऊपर करें"
                          className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveManual(manualIdx, 'down')}
                          title="नीचे करें"
                          className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Pin Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        updateVideoMetadata(video, { isPinned: !video.isPinned })
                      }
                      title={video.isPinned ? 'पिन हटाएं' : 'सबसे ऊपर पिन करें'}
                      className={cn(
                        'p-2 rounded-xl border transition-all cursor-pointer',
                        video.isPinned
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      <Pin className="w-4 h-4" />
                    </button>

                    {/* Featured Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        updateVideoMetadata(video, { isFeatured: !video.isFeatured })
                      }
                      title={video.isFeatured ? 'Featured हटाएं' : 'Featured बनाएं'}
                      className={cn(
                        'p-2 rounded-xl border transition-all cursor-pointer',
                        video.isFeatured
                          ? 'border-yellow-300 bg-yellow-50 text-amber-600'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      <Star className={cn('w-4 h-4', video.isFeatured && 'fill-amber-500')} />
                    </button>

                    {/* Short vs Video Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        updateVideoMetadata(video, { isShort: !video.isShort })
                      }
                      title={video.isShort ? 'सामान्य वीडियो बनाएं' : 'शॉर्ट्स में डालें'}
                      className={cn(
                        'p-2 rounded-xl border transition-all cursor-pointer',
                        video.isShort
                          ? 'border-purple-200 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      <Film className="w-4 h-4" />
                    </button>

                    {/* Toggle Active/Hidden */}
                    <button
                      type="button"
                      onClick={() =>
                        updateVideoMetadata(video, { isActive: !video.isActive })
                      }
                      title={video.isActive ? 'छिपाएं' : 'दिखाएं'}
                      className={cn(
                        'p-2 rounded-xl border transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer',
                        video.isActive
                          ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {video.isActive ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => openEditModal(video)}
                      title="संपादित करें (Edit)"
                      className="p-2 rounded-xl border border-[#2D5A27]/25 text-[#183D16] bg-[#ECFDF5] hover:bg-emerald-100 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button (Works for BOTH Manual & Synced videos) */}
                    <button
                      type="button"
                      onClick={() => setVideoToDelete(video)}
                      title="वीडियो हटाएं (Delete)"
                      className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT VIDEO MODAL */}
      <AnimatePresence>
        {(isAddModalOpen || editingVideo) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-gray-100 my-8"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#4A3728] text-base">
                      {editingVideo ? 'वीडियो संपादित करें (Edit Video)' : 'नई वीडियो जोड़ें (+ Add Video)'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      होम पेज और किसान पाठशाला के लिए यूट्यूब लिंक व विवरण सेट करें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingVideo(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Video URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      YouTube Video URL *
                    </label>
                    {formExtractedId && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> मान्य ID: {formExtractedId}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={formVideoUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... या /shorts/..."
                    className={cn(
                      'w-full bg-gray-50 border-2 rounded-2xl p-3.5 outline-none transition-all font-medium text-sm',
                      formUrlError
                        ? 'border-red-400 focus:border-red-500 bg-red-50/30'
                        : 'border-transparent focus:border-[#2D5A27] focus:bg-white'
                    )}
                  />
                  {formUrlError && (
                    <p className="text-xs text-red-500 ml-1 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3" /> {formUrlError}
                    </p>
                  )}
                </div>

                {/* Video Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      वीडियो का शीर्षक *
                    </label>
                    {formExtractedId && (
                      <button
                        type="button"
                        onClick={handleManualFetchTitle}
                        disabled={isDetectingTitle}
                        className="text-[11px] text-[#2D5A27] font-semibold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={cn('w-3 h-3', isDetectingTitle && 'animate-spin')} />
                        यूट्यूब से नाम लाएं
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="जैसे: आधुनिक सोयाबीन बुवाई की संपूर्ण जानकारी"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-medium text-sm"
                  />
                </div>

                {/* Video Format */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    वीडियो प्रकार (Format)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setFormIsShort(false)}
                      className={cn(
                        'py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                        !formIsShort ? 'bg-white text-[#2D5A27] shadow-xs' : 'text-gray-500'
                      )}
                    >
                      वीडियो (16:9)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormIsShort(true)}
                      className={cn(
                        'py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                        formIsShort ? 'bg-white text-[#2D5A27] shadow-xs' : 'text-gray-500'
                      )}
                    >
                      शॉर्ट्स (9:16)
                    </button>
                  </div>
                </div>

                {/* Video Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    संक्षिप्त विवरण (वैकल्पिक)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="वीडियो के बारे में थोड़ी जानकारी..."
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-medium text-sm resize-none"
                  />
                </div>

                {/* Thumbnail */}
                <DualImageInput
                  label="कस्टम थंबनेल (वैकल्पिक)"
                  value={formThumbnail}
                  onChange={(src) => setFormThumbnail(src)}
                  description="खाली छोड़ने पर यूट्यूब का आधिकारिक थंबनेल स्वतः उपयोग होगा।"
                />

                {/* Optional Multi-Select Playlists Picker */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <ListVideo className="w-3.5 h-3.5 text-[#2D5A27]" />
                      <span>प्लेलिस्ट में जोड़ें (वैकल्पिक)</span>
                    </label>
                    {formSelectedPlaylistIds.length > 0 && (
                      <span className="text-[11px] font-bold text-[#2D5A27]">
                        {formSelectedPlaylistIds.length} चयनित
                      </span>
                    )}
                  </div>

                  {sortedPlaylists.length === 0 ? (
                    <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/70 text-[11px] text-gray-500">
                      अभी कोई प्लेलिस्ट उपलब्ध नहीं है। आप Admin → Playlist Management से प्लेलिस्ट बना सकते हैं या इस वीडियो को बिना प्लेलिस्ट के सेव कर सकते हैं।
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-gray-50/70 border border-gray-200/70">
                      {sortedPlaylists.map((pl) => {
                        const checked = formSelectedPlaylistIds.includes(pl.id);
                        return (
                          <button
                            key={pl.id}
                            type="button"
                            onClick={() =>
                              setFormSelectedPlaylistIds((prev) =>
                                prev.includes(pl.id)
                                  ? prev.filter((id) => id !== pl.id)
                                  : [...prev, pl.id]
                              )
                            }
                            className={cn(
                              'w-full flex items-center justify-between gap-2.5 p-2 rounded-xl border text-left transition-colors cursor-pointer',
                              checked
                                ? 'bg-emerald-50 border-[#2D5A27]/40 text-[#1E3F1A]'
                                : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-700'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                                  checked
                                    ? 'bg-[#2D5A27] border-[#2D5A27] text-white'
                                    : 'border-gray-300 bg-white'
                                )}
                              >
                                {checked && <Check className="w-3 h-3" />}
                              </div>
                              <span className="text-xs font-bold truncate">{pl.name}</span>
                            </div>
                            {pl.isActive === false && (
                              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md shrink-0">
                                छिपी हुई
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Toggles: Active / Pin / Featured */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormIsActive((v) => !v)}
                    className={cn(
                      'p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer',
                      formIsActive
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    )}
                  >
                    {formIsActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span>{formIsActive ? 'सक्रिय' : 'छिपा हुआ'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormIsPinned((v) => !v)}
                    className={cn(
                      'p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer',
                      formIsPinned
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    )}
                  >
                    <Pin className="w-4 h-4" />
                    <span>{formIsPinned ? 'पिन किया' : 'पिन करें'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormIsFeatured((v) => !v)}
                    className={cn(
                      'p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer',
                      formIsFeatured
                        ? 'bg-yellow-50 border-yellow-300 text-amber-800'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    )}
                  >
                    <Star className={cn('w-4 h-4', formIsFeatured && 'fill-amber-500')} />
                    <span>{formIsFeatured ? 'Featured' : 'सामान्य'}</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingVideo(null);
                    }}
                    className="px-5 py-3 rounded-2xl text-gray-600 hover:bg-gray-100 font-bold text-sm"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={editingVideo ? handleUpdateVideo : handleCreateVideo}
                    className="inline-flex items-center gap-2 bg-[#2D5A27] hover:bg-[#23461e] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all cursor-pointer"
                  >
                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{editingVideo ? 'बदलाव सेव करें' : 'वीडियो जोड़ें'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {videoToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 p-6 space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-[#4A3728]">
                  क्या आप इस वीडियो को हटाना चाहते हैं?
                </h3>
                <p className="text-xs text-gray-500">
                  "{videoToDelete.title}" वीडियो को सूची से हटा दिया जाएगा।
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVideoToDelete(null)}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteVideo}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all"
                >
                  वीडियो हटाएँ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminYouTubeVideoManager;
