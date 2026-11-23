import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ListVideo,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Play,
  Film,
  Youtube,
  Check,
  X,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Video,
  ExternalLink,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { ImageSource, VideoPlaylist, YouTubeVideoItem } from '../types';
import {
  normalizeVideos,
  sanitizeSyncedVideos,
  mergeHybridVideos,
  getCachedVideoFeed,
  setCachedVideoFeed,
  resolveVideoThumbnail,
  formatYouTubeWatchUrl,
  extractYouTubeVideoId,
  formatVideoDateHindi,
} from '../utils/youtubeUtils';
import DualImageInput from './DualImageInput';
import SmartImage from './SmartImage';
import YouTubeEmbedPlayer from './YouTubeEmbedPlayer';
import { cn } from '../lib/utils';

const hasThumbValue = (thumb?: string | ImageSource): boolean => {
  if (!thumb) return false;
  if (typeof thumb === 'string') return thumb.trim().length > 0;
  return Boolean(thumb.primary?.trim() || thumb.fallback?.trim());
};

const AdminPlaylistManager: React.FC = () => {
  const {
    appContent,
    playlists,
    playlistVideos,
    addPlaylist,
    updatePlaylist,
    deletePlaylist,
    reorderPlaylists,
    addVideosToPlaylist,
    removeVideoFromPlaylist,
    reorderPlaylistVideos,
  } = useAppContext();

  // Synced channel videos so Admin can pick BOTH manual + channel-synced videos
  const [syncedChannelVideos, setSyncedChannelVideos] = useState<YouTubeVideoItem[]>([]);
  const [isLoadingSynced, setIsLoadingSynced] = useState(false);

  const hubSettings = appContent?.videoHubSettings;
  const channelUrl = (appContent?.youtubeChannel?.url || '').trim();
  const channelId = (hubSettings?.resolvedChannelId || '').trim();

  const fetchChannelVideos = useCallback(async () => {
    const key = (channelId || channelUrl).toLowerCase();
    if (!key) return;

    const cached = getCachedVideoFeed(key, true);
    if (cached && cached.videos.length > 0) {
      setSyncedChannelVideos(sanitizeSyncedVideos(cached.videos));
    }

    setIsLoadingSynced(true);
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
      // Non-blocking fallback to cache + manual videos
    } finally {
      setIsLoadingSynced(false);
    }
  }, [channelId, channelUrl]);

  useEffect(() => {
    fetchChannelVideos();
  }, [fetchChannelVideos]);

  const combinedVideosList = useMemo(() => {
    const manual = normalizeVideos(appContent?.videos);
    return mergeHybridVideos(manual, syncedChannelVideos, hubSettings?.overrides || {}, true);
  }, [appContent?.videos, syncedChannelVideos, hubSettings?.overrides]);

  const videoByKeyMap = useMemo(() => {
    const map = new Map<string, YouTubeVideoItem>();
    combinedVideosList.forEach((v) => {
      const key = v.videoId || v.id;
      if (key) map.set(key, v);
      if (v.id && v.id !== key) map.set(v.id, v);
    });
    return map;
  }, [combinedVideosList]);

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));
  }, [playlists]);

  // Helper to get ordered video items for a playlist
  const getPlaylistVideoEntries = useCallback(
    (playlistId: string) => {
      const mappings = playlistVideos
        .filter((m) => m.playlistId === playlistId)
        .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));

      return mappings.map((m) => ({
        mapping: m,
        video: videoByKeyMap.get(m.videoId) || null,
      }));
    },
    [playlistVideos, videoByKeyMap]
  );

  // Toast status
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(null), 4500);
    return () => clearTimeout(t);
  }, [statusMessage]);

  // Create / Edit Playlist Modal State
  const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<VideoPlaylist | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formThumbnail, setFormThumbnail] = useState<string | ImageSource>('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formInitialVideoIds, setFormInitialVideoIds] = useState<string[]>([]);
  const [createVideoSearch, setCreateVideoSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Manage Playlist Videos Modal State
  const [managingPlaylistId, setManagingPlaylistId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([]);
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [dragOverVideoId, setDragOverVideoId] = useState<string | null>(null);

  // Preview Modal State
  const [previewPlaylistId, setPreviewPlaylistId] = useState<string | null>(null);
  const [previewActiveVideoId, setPreviewActiveVideoId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [playlistToDelete, setPlaylistToDelete] = useState<VideoPlaylist | null>(null);

  const managingPlaylist = useMemo(
    () => sortedPlaylists.find((p) => p.id === managingPlaylistId) || null,
    [sortedPlaylists, managingPlaylistId]
  );

  const previewPlaylist = useMemo(
    () => sortedPlaylists.find((p) => p.id === previewPlaylistId) || null,
    [sortedPlaylists, previewPlaylistId]
  );

  const openCreateModal = () => {
    setEditingPlaylist(null);
    setFormName('');
    setFormDescription('');
    setFormThumbnail('');
    setFormIsActive(true);
    setFormInitialVideoIds([]);
    setCreateVideoSearch('');
    setFormError(null);
    setIsCreateEditModalOpen(true);
  };

  const openEditModal = (playlist: VideoPlaylist) => {
    setEditingPlaylist(playlist);
    setFormName(playlist.name || '');
    setFormDescription(playlist.description || '');
    setFormThumbnail(playlist.thumbnail || '');
    setFormIsActive(playlist.isActive !== false);
    setFormInitialVideoIds([]);
    setCreateVideoSearch('');
    setFormError(null);
    setIsCreateEditModalOpen(true);
  };

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('कृपया प्लेलिस्ट का नाम दर्ज करें।');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      if (editingPlaylist) {
        await updatePlaylist({
          ...editingPlaylist,
          name: formName.trim(),
          description: formDescription.trim(),
          thumbnail: formThumbnail,
          isActive: formIsActive,
        });
        setStatusMessage({
          type: 'success',
          text: `"${formName.trim()}" प्लेलिस्ट सफलतापूर्वक अपडेट हो गई!`,
        });
      } else {
        await addPlaylist(
          {
            name: formName.trim(),
            description: formDescription.trim(),
            thumbnail: formThumbnail,
            displayOrder: sortedPlaylists.length + 1,
            isActive: formIsActive,
          },
          formInitialVideoIds
        );
        setStatusMessage({
          type: 'success',
          text: `"${formName.trim()}" नई प्लेलिस्ट सफलतापूर्वक बनाई गई!`,
        });
      }
      setIsCreateEditModalOpen(false);
      setEditingPlaylist(null);
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'प्लेलिस्ट सेव करने में समस्या आई। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePlaylistActive = async (playlist: VideoPlaylist) => {
    setIsSaving(true);
    try {
      const nextActive = playlist.isActive === false;
      await updatePlaylist({
        ...playlist,
        isActive: nextActive,
      });
      setStatusMessage({
        type: 'success',
        text: nextActive
          ? `"${playlist.name}" अब किसानों को दिखाई देगी।`
          : `"${playlist.name}" को छिपा दिया गया है।`,
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'स्थिति बदलने में त्रुटि हुई।' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMovePlaylist = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedPlaylists.length) return;
    const reordered = [...sortedPlaylists];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    setIsSaving(true);
    try {
      await reorderPlaylists(reordered);
      setStatusMessage({ type: 'success', text: 'प्लेलिस्ट का क्रम अपडेट हो गया।' });
    } catch {
      setStatusMessage({ type: 'error', text: 'क्रम बदलने में त्रुटि हुई।' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeletePlaylist = async () => {
    if (!playlistToDelete) return;
    const deletedName = playlistToDelete.name;
    setIsSaving(true);
    try {
      await deletePlaylist(playlistToDelete.id);
      if (managingPlaylistId === playlistToDelete.id) setManagingPlaylistId(null);
      if (previewPlaylistId === playlistToDelete.id) setPreviewPlaylistId(null);
      setPlaylistToDelete(null);
      setStatusMessage({
        type: 'success',
        text: `"${deletedName}" प्लेलिस्ट हटा दी गई (सभी मूल वीडियो सुरक्षित हैं)।`,
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'प्लेलिस्ट हटाने में त्रुटि हुई।' });
    } finally {
      setIsSaving(false);
    }
  };

  // Manage Videos inside selected playlist
  const openManageVideos = (playlistId: string) => {
    setManagingPlaylistId(playlistId);
    setPickerSearch('');
    setSelectedAddIds([]);
    setDraggedVideoId(null);
    setDragOverVideoId(null);
  };

  const managingEntries = useMemo(() => {
    if (!managingPlaylistId) return [];
    return getPlaylistVideoEntries(managingPlaylistId);
  }, [managingPlaylistId, getPlaylistVideoEntries]);

  const managingVideoIdSet = useMemo(
    () => new Set(managingEntries.map((e) => e.mapping.videoId)),
    [managingEntries]
  );

  const availableVideosForPicker = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    return combinedVideosList.filter((v) => {
      const key = v.videoId || v.id;
      if (!key || managingVideoIdSet.has(key)) return false;
      if (!query) return true;
      return (
        (v.title || '').toLowerCase().includes(query) ||
        (v.description || '').toLowerCase().includes(query) ||
        key.toLowerCase().includes(query)
      );
    });
  }, [combinedVideosList, managingVideoIdSet, pickerSearch]);

  const handleAddSelectedVideos = async () => {
    if (!managingPlaylistId || selectedAddIds.length === 0) return;
    setIsSaving(true);
    try {
      await addVideosToPlaylist(managingPlaylistId, selectedAddIds);
      setStatusMessage({
        type: 'success',
        text: `${selectedAddIds.length} वीडियो प्लेलिस्ट में जोड़े गए!`,
      });
      setSelectedAddIds([]);
    } catch {
      setStatusMessage({ type: 'error', text: 'वीडियो जोड़ने में त्रुटि हुई।' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveFromPlaylist = async (videoId: string, title?: string) => {
    if (!managingPlaylistId) return;
    setIsSaving(true);
    try {
      await removeVideoFromPlaylist(managingPlaylistId, videoId);
      setStatusMessage({
        type: 'success',
        text: `"${title || 'वीडियो'}" को प्लेलिस्ट से हटाया गया (मूल वीडियो सुरक्षित है)।`,
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'वीडियो हटाने में त्रुटि हुई।' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMovePlaylistVideo = async (idx: number, direction: 'up' | 'down') => {
    if (!managingPlaylistId) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= managingEntries.length) return;

    const ids = managingEntries.map((e) => e.mapping.videoId);
    const temp = ids[idx];
    ids[idx] = ids[targetIdx];
    ids[targetIdx] = temp;

    setIsSaving(true);
    try {
      await reorderPlaylistVideos(managingPlaylistId, ids);
    } catch {
      setStatusMessage({ type: 'error', text: 'वीडियो क्रम बदलने में त्रुटि हुई।' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDropReorder = async (targetVideoId: string) => {
    if (!managingPlaylistId || !draggedVideoId || draggedVideoId === targetVideoId) {
      setDraggedVideoId(null);
      setDragOverVideoId(null);
      return;
    }

    const ids = managingEntries.map((e) => e.mapping.videoId);
    const fromIndex = ids.indexOf(draggedVideoId);
    const toIndex = ids.indexOf(targetVideoId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedVideoId(null);
      setDragOverVideoId(null);
      return;
    }

    const [moved] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, moved);

    setDraggedVideoId(null);
    setDragOverVideoId(null);
    setIsSaving(true);
    try {
      await reorderPlaylistVideos(managingPlaylistId, ids);
      setStatusMessage({ type: 'success', text: 'प्लेलिस्ट वीडियो क्रम सेव हो गया।' });
    } catch {
      setStatusMessage({ type: 'error', text: 'वीडियो क्रम बदलने में त्रुटि हुई।' });
    } finally {
      setIsSaving(false);
    }
  };

  // Preview Modal entries
  const previewPlayableVideos = useMemo(() => {
    if (!previewPlaylistId) return [];
    return getPlaylistVideoEntries(previewPlaylistId)
      .filter((e) => e.video && e.video.isActive !== false)
      .map((e) => e.video as YouTubeVideoItem);
  }, [previewPlaylistId, getPlaylistVideoEntries]);

  const openPreview = (playlist: VideoPlaylist) => {
    setPreviewPlaylistId(playlist.id);
    const entries = getPlaylistVideoEntries(playlist.id).filter(
      (e) => e.video && e.video.isActive !== false
    );
    const first = entries[0]?.video;
    setPreviewActiveVideoId(first ? first.videoId || first.id : null);
  };

  const activePreviewVideo = useMemo(() => {
    if (!previewActiveVideoId) return previewPlayableVideos[0] || null;
    return (
      previewPlayableVideos.find((v) => (v.videoId || v.id) === previewActiveVideoId) ||
      previewPlayableVideos[0] ||
      null
    );
  }, [previewActiveVideoId, previewPlayableVideos]);

  const filteredInitialCreateVideos = useMemo(() => {
    const q = createVideoSearch.trim().toLowerCase();
    return combinedVideosList.filter((v) => {
      const key = v.videoId || v.id;
      if (!key) return false;
      if (!q) return true;
      return (v.title || '').toLowerCase().includes(q) || key.toLowerCase().includes(q);
    });
  }, [combinedVideosList, createVideoSearch]);

  return (
    <div className="space-y-6" id="admin-playlist-manager-section">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#2D5A27] shadow-xs border border-emerald-100 shrink-0">
            <ListVideo className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-[#4A3728] text-lg flex items-center gap-2 flex-wrap">
              <span>किसान पाठशाला — Playlist Management</span>
              <span className="text-xs bg-emerald-50 text-[#2D5A27] border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold tabular-nums">
                {sortedPlaylists.length} प्लेलिस्ट
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              विषय-वार प्लेलिस्ट बनाएँ, कवर इमेज लगाएँ, वीडियो जोड़ें और ड्रैग-ड्रॉप से क्रम तय करें
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            type="button"
            disabled={isLoadingSynced}
            onClick={fetchChannelVideos}
            title="चैनल वीडियो सूची रीफ्रेश करें"
            className="inline-flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-3.5 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer"
          >
            <RefreshCw className={cn('w-4 h-4', isLoadingSynced && 'animate-spin')} />
            <span>वीडियो सूची ताज़ा करें</span>
          </button>

          <button
            type="button"
            id="admin-create-playlist-btn"
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[#2D5A27] hover:bg-[#23461e] text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>नई प्लेलिस्ट बनाएँ</span>
          </button>
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
              statusMessage.type === 'success' && 'bg-green-50 text-green-800 border border-green-200',
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
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safe Architecture Info Notice */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-950">
        <Info className="w-4 h-4 text-[#2D5A27] mt-0.5 shrink-0" />
        <div>
          <span className="font-bold">सुरक्षित मैपिंग नियम: </span>
          एक ही वीडियो को बिना डुप्लीकेट बनाए कई प्लेलिस्ट में जोड़ा जा सकता है। प्लेलिस्ट से किसी
          वीडियो को हटाने या पूरी प्लेलिस्ट डिलीट करने पर मूल YouTube वीडियो कभी डिलीट नहीं होता।
        </div>
      </div>

      {/* Playlists List */}
      {sortedPlaylists.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center mx-auto">
            <ListVideo className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-[#4A3728]">अभी कोई प्लेलिस्ट नहीं बनाई गई है</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            किसानों को विषय-वार क्रमबद्ध वीडियो दिखाने के लिए पहली प्लेलिस्ट बनाएँ (जैसे: सोयाबीन खेती, गेहूँ प्रबंधन, खाद व स्प्रे गाइड)।
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-[#2D5A27] hover:bg-[#23461e] text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>पहली प्लेलिस्ट बनाएँ</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPlaylists.map((playlist, idx) => {
            const entries = getPlaylistVideoEntries(playlist.id);
            const activeEntries = entries.filter((e) => e.video && e.video.isActive !== false);
            const fallbackThumb =
              entries.find((e) => e.video)?.video
                ? resolveVideoThumbnail(entries.find((e) => e.video)!.video!)
                : '';
            const coverSrc = hasThumbValue(playlist.thumbnail) ? playlist.thumbnail : fallbackThumb;

            return (
              <div
                key={playlist.id}
                className={cn(
                  'bg-white p-5 rounded-3xl shadow-sm border transition-all',
                  playlist.isActive !== false
                    ? 'border-gray-100'
                    : 'border-gray-200/80 bg-gray-50/60 opacity-85'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left: Cover + Metadata */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-full sm:w-48 aspect-video rounded-2xl overflow-hidden bg-gray-900 shrink-0 border border-gray-200/70">
                      {coverSrc ? (
                        <SmartImage
                          src={coverSrc}
                          alt={playlist.name}
                          className="w-full h-full"
                          objectFit="cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 gap-1">
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-[10px] font-semibold">कोई कवर इमेज नहीं</span>
                        </div>
                      )}

                      <span className="absolute top-2 left-2 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-md tabular-nums">
                        क्रम #{idx + 1}
                      </span>

                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg inline-flex items-center gap-1 tabular-nums">
                        <ListVideo className="w-3.5 h-3.5 text-[#EAB308]" />
                        <span>{activeEntries.length} वीडियो</span>
                      </span>
                    </div>

                    <div className="space-y-2 flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        {playlist.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            सक्रिय (Active)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                            <EyeOff className="w-3 h-3" />
                            छिपी हुई (Inactive)
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200 tabular-nums">
                          <Layers className="w-3 h-3 text-[#2D5A27]" />
                          कुल सक्रिय वीडियो: {activeEntries.length}
                          {entries.length > activeEntries.length && (
                            <span className="text-amber-700">
                              {' '}
                              (+{entries.length - activeEntries.length} छिपे/अनुपलब्ध)
                            </span>
                          )}
                        </span>
                      </div>

                      <h4 className="font-bold text-[#4A3728] text-base leading-snug line-clamp-1">
                        {playlist.name}
                      </h4>

                      {playlist.description ? (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {playlist.description}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">कोई विवरण नहीं जोड़ा गया</p>
                      )}

                      <p className="text-[11px] text-gray-400 font-medium">
                        अपडेट: {formatVideoDateHindi(undefined, playlist.updatedAt || playlist.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Action Controls */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0 || isSaving}
                      onClick={() => handleMovePlaylist(idx, 'up')}
                      title="प्लेलिस्ट ऊपर करें"
                      className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === sortedPlaylists.length - 1 || isSaving}
                      onClick={() => handleMovePlaylist(idx, 'down')}
                      title="प्लेलिस्ट नीचे करें"
                      className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openManageVideos(playlist.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2D5A27] hover:bg-[#22471D] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <ListVideo className="w-3.5 h-3.5" />
                      <span>वीडियो प्रबंधित करें ({entries.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openPreview(playlist)}
                      title="प्लेलिस्ट प्रीव्यू देखें"
                      className="p-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleTogglePlaylistActive(playlist)}
                      title={playlist.isActive !== false ? 'छिपाएं' : 'दिखाएं'}
                      className={cn(
                        'p-2 rounded-xl border transition-colors cursor-pointer',
                        playlist.isActive !== false
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      {playlist.isActive !== false ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(playlist)}
                      title="प्लेलिस्ट संपादित करें"
                      className="p-2 rounded-xl border border-[#2D5A27]/25 bg-[#ECFDF5] text-[#183D16] hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlaylistToDelete(playlist)}
                      title="प्लेलिस्ट हटाएं"
                      className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PLAYLIST MODAL */}
      <AnimatePresence>
        {isCreateEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 my-6"
            >
              <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D5A27] flex items-center justify-center">
                    <ListVideo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#4A3728] text-base">
                      {editingPlaylist ? 'प्लेलिस्ट संपादित करें' : 'नई प्लेलिस्ट बनाएँ'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      प्लेलिस्ट का नाम, विवरण और कवर इमेज सेट करें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateEditModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePlaylist} className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    प्लेलिस्ट का नाम *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="जैसे: सोयाबीन की उन्नत खेती — संपूर्ण गाइड"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-medium text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    प्लेलिस्ट विवरण (वैकल्पिक)
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="इस प्लेलिस्ट में किसानों को कौन-कौन सी जानकारी मिलेगी..."
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-medium text-sm resize-none"
                  />
                </div>

                <DualImageInput
                  label="प्लेलिस्ट कवर इमेज (वैकल्पिक)"
                  value={formThumbnail}
                  onChange={(src) => setFormThumbnail(src)}
                  description="कवर इमेज न चुनने पर प्लेलिस्ट के पहले वीडियो का थंबनेल स्वतः दिखेगा।"
                />

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200/70">
                  <div>
                    <p className="text-xs font-bold text-[#4A3728]">किसानों को दिखाएँ (Active)</p>
                    <p className="text-[11px] text-gray-500">
                      बंद करने पर यह प्लेलिस्ट किसान पाठशाला में छिपी रहेगी
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormIsActive((v) => !v)}
                    className={cn(
                      'w-12 h-6 rounded-full p-0.5 transition-colors relative cursor-pointer',
                      formIsActive ? 'bg-[#2D5A27]' : 'bg-gray-300'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                        formIsActive ? 'translate-x-6' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                {/* Initial Video Picker (only when creating a new playlist) */}
                {!editingPlaylist && combinedVideosList.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                        प्रारंभिक वीडियो चुनें (वैकल्पिक) — {formInitialVideoIds.length} चयनित
                      </label>
                      {formInitialVideoIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormInitialVideoIds([])}
                          className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                        >
                          सभी हटाएँ
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={createVideoSearch}
                        onChange={(e) => setCreateVideoSearch(e.target.value)}
                        placeholder="वीडियो शीर्षक से खोजें..."
                        className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] rounded-xl py-2 pl-9 pr-3 text-xs outline-none"
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-gray-100 rounded-2xl p-2 bg-gray-50/50">
                      {filteredInitialCreateVideos.map((v) => {
                        const key = v.videoId || v.id;
                        const checked = formInitialVideoIds.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setFormInitialVideoIds((prev) =>
                                prev.includes(key)
                                  ? prev.filter((id) => id !== key)
                                  : [...prev, key]
                              )
                            }
                            className={cn(
                              'w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-colors cursor-pointer',
                              checked
                                ? 'bg-emerald-50 border-[#2D5A27]/40'
                                : 'bg-white border-gray-100 hover:bg-gray-50'
                            )}
                          >
                            <div
                              className={cn(
                                'w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                                checked
                                  ? 'bg-[#2D5A27] border-[#2D5A27] text-white'
                                  : 'border-gray-300 bg-white'
                              )}
                            >
                              {checked && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <div className="w-16 aspect-video rounded-lg overflow-hidden bg-gray-900 shrink-0">
                              <SmartImage
                                src={resolveVideoThumbnail(v)}
                                alt={v.title}
                                className="w-full h-full"
                                objectFit="cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#1E3F1A] line-clamp-1">
                                {v.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                {v.isShort && (
                                  <span className="text-purple-700 font-bold">शॉर्ट्स</span>
                                )}
                                {v.duration && <span>{v.duration}</span>}
                                {v.isActive === false && (
                                  <span className="text-amber-700 font-semibold">छिपा हुआ</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateEditModalOpen(false)}
                    className="px-5 py-3 rounded-2xl text-gray-600 hover:bg-gray-100 font-bold text-sm cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 bg-[#2D5A27] hover:bg-[#23461e] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{editingPlaylist ? 'बदलाव सेव करें' : 'प्लेलिस्ट बनाएँ'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANAGE VIDEOS IN PLAYLIST MODAL (Order + Drag/Drop + Batch Add) */}
      <AnimatePresence>
        {managingPlaylist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-gray-100 my-4 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/70 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D5A27] flex items-center justify-center shrink-0">
                    <ListVideo className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#4A3728] text-base truncate">
                      {managingPlaylist.name} — वीडियो प्रबंधन
                    </h3>
                    <p className="text-xs text-gray-500">
                      ड्रैग-ड्रॉप या तीर बटन से वीडियो क्रम बदलें, या नीचे से नए वीडियो जोड़ें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManagingPlaylistId(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Two Panes */}
              <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                {/* Left Pane: Current Ordered Videos */}
                <div className="space-y-3 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-[#1E3F1A] flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-[#2D5A27]" />
                      <span>प्लेलिस्ट के वीडियो ({managingEntries.length})</span>
                    </h4>
                    <span className="text-[11px] text-gray-500">चलाने का क्रम 1 → {managingEntries.length}</span>
                  </div>

                  {managingEntries.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center space-y-2 bg-gray-50/50">
                      <ListVideo className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="text-xs font-semibold text-gray-500">
                        इस प्लेलिस्ट में अभी कोई वीडियो नहीं है।
                      </p>
                      <p className="text-[11px] text-gray-400">
                        दाईं ओर से एक या अधिक वीडियो चुनकर जोड़ें।
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                      {managingEntries.map(({ mapping, video }, idx) => {
                        const isDragging = draggedVideoId === mapping.videoId;
                        const isDragOver = dragOverVideoId === mapping.videoId;

                        return (
                          <div
                            key={mapping.id}
                            draggable
                            onDragStart={() => setDraggedVideoId(mapping.videoId)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (dragOverVideoId !== mapping.videoId) {
                                setDragOverVideoId(mapping.videoId);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverVideoId === mapping.videoId) {
                                setDragOverVideoId(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDropReorder(mapping.videoId);
                            }}
                            onDragEnd={() => {
                              setDraggedVideoId(null);
                              setDragOverVideoId(null);
                            }}
                            className={cn(
                              'flex items-center gap-2.5 p-2.5 rounded-2xl border bg-white transition-all',
                              isDragging && 'opacity-45 border-dashed border-[#2D5A27]',
                              isDragOver && 'border-[#2D5A27] ring-2 ring-emerald-200 bg-emerald-50/40',
                              !isDragging && !isDragOver && 'border-gray-200/80 hover:border-gray-300'
                            )}
                          >
                            <div
                              title="ऊपर/नीचे खींचें (Drag & Drop)"
                              className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing p-1 shrink-0"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#2D5A27] text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                              {idx + 1}
                            </span>

                            <div className="w-20 aspect-video rounded-lg overflow-hidden bg-gray-900 shrink-0">
                              {video ? (
                                <SmartImage
                                  src={resolveVideoThumbnail(video)}
                                  alt={video.title}
                                  className="w-full h-full"
                                  objectFit="cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-100">
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#1E3F1A] line-clamp-1">
                                {video ? video.title : `अज्ञात / हटाया गया वीडियो (${mapping.videoId})`}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5 flex-wrap">
                                {video?.isShort && (
                                  <span className="text-purple-700 font-bold inline-flex items-center gap-0.5">
                                    <Film className="w-3 h-3" /> शॉर्ट्स
                                  </span>
                                )}
                                {video?.duration && <span className="tabular-nums">{video.duration}</span>}
                                {video && video.isActive === false && (
                                  <span className="text-amber-700 font-bold">छिपा हुआ (किसानों को नहीं दिखेगा)</span>
                                )}
                                {!video && (
                                  <span className="text-red-600 font-bold">वीडियो उपलब्ध नहीं</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0 || isSaving}
                                onClick={() => handleMovePlaylistVideo(idx, 'up')}
                                title="ऊपर करें"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === managingEntries.length - 1 || isSaving}
                                onClick={() => handleMovePlaylistVideo(idx, 'down')}
                                title="नीचे करें"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleRemoveFromPlaylist(mapping.videoId, video?.title)}
                                title="प्लेलिस्ट से हटाएँ"
                                className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Pane: Add Existing Videos (Multi-Select Picker) */}
                <div className="space-y-3 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-[#1E3F1A] flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#2D5A27]" />
                      <span>मौजूदा वीडियो जोड़ें</span>
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      {availableVideosForPicker.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAddIds(
                              availableVideosForPicker.map((v) => v.videoId || v.id)
                            )
                          }
                          className="text-[#2D5A27] hover:underline cursor-pointer"
                        >
                          सभी चुनें
                        </button>
                      )}
                      {selectedAddIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedAddIds([])}
                          className="text-red-600 hover:underline cursor-pointer"
                        >
                          साफ़ करें ({selectedAddIds.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="मैन्युअल या चैनल सिंक वीडियो खोजें..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white rounded-xl py-2.5 pl-10 pr-3 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1 flex-1">
                    {availableVideosForPicker.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                        {combinedVideosList.length === managingEntries.length
                          ? 'सभी उपलब्ध वीडियो पहले ही इस प्लेलिस्ट में जोड़े जा चुके हैं।'
                          : 'खोज के अनुसार कोई उपलब्ध वीडियो नहीं मिला।'}
                      </div>
                    ) : (
                      availableVideosForPicker.map((v) => {
                        const key = v.videoId || v.id;
                        const checked = selectedAddIds.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setSelectedAddIds((prev) =>
                                prev.includes(key)
                                  ? prev.filter((id) => id !== key)
                                  : [...prev, key]
                              )
                            }
                            className={cn(
                              'w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-colors cursor-pointer',
                              checked
                                ? 'bg-emerald-50 border-[#2D5A27]/50'
                                : 'bg-white border-gray-100 hover:bg-gray-50'
                            )}
                          >
                            <div
                              className={cn(
                                'w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                                checked
                                  ? 'bg-[#2D5A27] border-[#2D5A27] text-white'
                                  : 'border-gray-300 bg-white'
                              )}
                            >
                              {checked && <Check className="w-3.5 h-3.5" />}
                            </div>

                            <div className="w-16 aspect-video rounded-lg overflow-hidden bg-gray-900 shrink-0">
                              <SmartImage
                                src={resolveVideoThumbnail(v)}
                                alt={v.title}
                                className="w-full h-full"
                                objectFit="cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#1E3F1A] line-clamp-1">
                                {v.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                                <span className="font-medium">
                                  {v.source === 'manual' ? 'मैन्युअल' : 'चैनल सिंक'}
                                </span>
                                {v.isShort && (
                                  <span className="text-purple-700 font-bold">· शॉर्ट्स</span>
                                )}
                                {v.duration && <span className="tabular-nums">· {v.duration}</span>}
                                {v.isActive === false && (
                                  <span className="text-amber-700 font-semibold">· छिपा हुआ</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={selectedAddIds.length === 0 || isSaving}
                    onClick={handleAddSelectedVideos}
                    className="w-full py-3 px-4 rounded-2xl bg-[#2D5A27] hover:bg-[#23461e] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>
                      {selectedAddIds.length > 0
                        ? `चयनित ${selectedAddIds.length} वीडियो प्लेलिस्ट में जोड़ें`
                        : 'ऊपर से वीडियो चुनें'}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PLAYLIST PREVIEW MODAL */}
      <AnimatePresence>
        {previewPlaylist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-gray-100 my-6 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ListVideo className="w-5 h-5 text-[#2D5A27] shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#1E3F1A] text-sm sm:text-base truncate">
                      प्रीव्यू: {previewPlaylist.name}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      किसानों को यह प्लेलिस्ट इस प्रकार दिखाई देगी ({previewPlayableVideos.length} सक्रिय वीडियो)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPlaylistId(null);
                    setPreviewActiveVideoId(null);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
                {previewPlayableVideos.length === 0 ? (
                  <div className="p-10 text-center bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                    <Video className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="text-sm font-bold text-gray-600">
                      इस प्लेलिस्ट में अभी कोई सक्रिय वीडियो नहीं है
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const pid = previewPlaylist.id;
                        setPreviewPlaylistId(null);
                        openManageVideos(pid);
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#2D5A27] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      वीडियो जोड़ें
                    </button>
                  </div>
                ) : (
                  <>
                    {activePreviewVideo && (() => {
                      const playableId =
                        activePreviewVideo.videoId ||
                        extractYouTubeVideoId(activePreviewVideo.videoUrl || '') ||
                        activePreviewVideo.id;
                      const watchUrl =
                        activePreviewVideo.videoUrl ||
                        formatYouTubeWatchUrl(playableId);
                      const curIdx = previewPlayableVideos.findIndex(
                        (v) => (v.videoId || v.id) === (activePreviewVideo.videoId || activePreviewVideo.id)
                      );
                      const nextVid =
                        curIdx >= 0 && curIdx < previewPlayableVideos.length - 1
                          ? previewPlayableVideos[curIdx + 1]
                          : null;

                      return (
                        <div className="rounded-2xl overflow-hidden border border-gray-200/80">
                          <YouTubeEmbedPlayer
                            videoId={playableId}
                            title={activePreviewVideo.title}
                            isShort={Boolean(activePreviewVideo.isShort)}
                            embeddable={activePreviewVideo.embeddable !== false}
                            watchUrl={watchUrl}
                            autoplay={false}
                            onEnded={() => {
                              if (nextVid) {
                                setPreviewActiveVideoId(nextVid.videoId || nextVid.id);
                              }
                            }}
                          />
                          <div className="p-4 bg-white flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-[#2D5A27] tabular-nums">
                                वीडियो {curIdx + 1} / {previewPlayableVideos.length}
                              </p>
                              <h4 className="font-bold text-sm sm:text-base text-[#1E3F1A] line-clamp-1">
                                {activePreviewVideo.title}
                              </h4>
                            </div>
                            <a
                              href={watchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:underline shrink-0"
                            >
                              <Youtube className="w-4 h-4" />
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        प्लेलिस्ट के सभी वीडियो ({previewPlayableVideos.length})
                      </h4>
                      <div className="space-y-2">
                        {previewPlayableVideos.map((vid, idx) => {
                          const key = vid.videoId || vid.id;
                          const isCurrent =
                            activePreviewVideo && (activePreviewVideo.videoId || activePreviewVideo.id) === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setPreviewActiveVideoId(key)}
                              className={cn(
                                'w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-colors cursor-pointer',
                                isCurrent
                                  ? 'bg-emerald-50 border-[#2D5A27] shadow-2xs'
                                  : 'bg-white border-gray-200/80 hover:bg-gray-50'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 tabular-nums',
                                  isCurrent ? 'bg-[#2D5A27] text-white' : 'bg-gray-100 text-gray-600'
                                )}
                              >
                                {idx + 1}
                              </span>
                              <div className="w-24 aspect-video rounded-xl overflow-hidden bg-gray-900 shrink-0">
                                <SmartImage
                                  src={resolveVideoThumbnail(vid)}
                                  alt={vid.title}
                                  className="w-full h-full"
                                  objectFit="cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-[#1E3F1A] line-clamp-2">
                                  {vid.title}
                                </p>
                                {vid.duration && (
                                  <span className="text-[11px] text-gray-500 tabular-nums">
                                    {vid.duration}
                                  </span>
                                )}
                              </div>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-[#2D5A27] bg-white px-2 py-1 rounded-lg border border-emerald-200 shrink-0">
                                  चल रहा है
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE PLAYLIST CONFIRMATION MODAL */}
      <AnimatePresence>
        {playlistToDelete && (
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
                  क्या आप यह प्लेलिस्ट हटाना चाहते हैं?
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong>"{playlistToDelete.name}"</strong> प्लेलिस्ट को हटा दिया जाएगा। इससे कोई भी मूल
                  YouTube वीडियो या किसान के सेव किए गए वीडियो डिलीट नहीं होंगे।
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPlaylistToDelete(null)}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleConfirmDeletePlaylist}
                  className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm cursor-pointer disabled:opacity-60"
                >
                  प्लेलिस्ट हटाएँ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPlaylistManager;
