import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { YouTubeVideoItem, ImageSource } from '../types';
import { AppContent } from '../context/AppContext';
import { 
  extractYouTubeVideoId, 
  isValidYouTubeUrl, 
  formatYouTubeWatchUrl, 
  getYouTubeThumbnailSource,
  resolveVideoThumbnail,
  fetchYouTubeVideoTitle,
  normalizeVideos,
  DEFAULT_VIDEOS
} from '../utils/youtubeUtils';
import DualImageInput from './DualImageInput';
import SmartImage from './SmartImage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AdminYouTubeVideoManagerProps {
  contentForm: AppContent;
  setContentForm: React.Dispatch<React.SetStateAction<AppContent>>;
  onSaveContent?: () => Promise<void>;
}

const AdminYouTubeVideoManager: React.FC<AdminYouTubeVideoManagerProps> = ({
  contentForm,
  setContentForm,
  onSaveContent
}) => {
  // Normalize videos list ensuring at least default videos exist
  const videosList: YouTubeVideoItem[] = useMemo(() => {
    return normalizeVideos(contentForm?.videos);
  }, [contentForm?.videos]);

  const activeCount = useMemo(() => {
    return videosList.filter(v => v.isActive !== false).length;
  }, [videosList]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<YouTubeVideoItem | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<YouTubeVideoItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for Add / Edit
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formThumbnail, setFormThumbnail] = useState<string | ImageSource>('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isDetectingTitle, setIsDetectingTitle] = useState(false);
  const [formUrlError, setFormUrlError] = useState<string | null>(null);

  // Auto-dismiss status message after 4 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Derived current extracted video ID for the form
  const formExtractedId = useMemo(() => {
    return extractYouTubeVideoId(formVideoUrl);
  }, [formVideoUrl]);

  // Auto-fetch title when a valid YouTube URL is entered and title is currently empty
  const handleUrlChange = async (url: string) => {
    setFormVideoUrl(url);
    const id = extractYouTubeVideoId(url);
    if (!url.trim()) {
      setFormUrlError(null);
      return;
    }

    if (!id) {
      setFormUrlError('कृपया मान्य यूट्यूब URL दर्ज करें (जैसे: https://youtube.com/watch?v=... या /shorts/...)');
    } else {
      setFormUrlError(null);
      // If title is empty, try to auto-fetch video title
      if (!formTitle.trim()) {
        setIsDetectingTitle(true);
        const title = await fetchYouTubeVideoTitle(id);
        setIsDetectingTitle(false);
        if (title && !formTitle.trim()) {
          setFormTitle(title);
        }
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
      setStatusMessage({ type: 'info', text: 'शीर्षक स्वतः नहीं मिल सका, कृपया मैन्युअल रूप से लिखें।' });
    }
  };

  // Helper to commit videos list to contentForm and optionally save to Firestore
  const commitVideos = async (newVideos: YouTubeVideoItem[], feedbackText?: string) => {
    setContentForm(prev => ({
      ...prev,
      videos: newVideos
    }));

    if (onSaveContent) {
      try {
        setIsSaving(true);
        await onSaveContent();
        if (feedbackText) {
          setStatusMessage({ type: 'success', text: feedbackText });
        }
      } catch (err) {
        console.error("Failed to auto-save video changes:", err);
        setStatusMessage({ type: 'error', text: 'डेटा सेव करने में त्रुटि हुई।' });
      } finally {
        setIsSaving(false);
      }
    } else if (feedbackText) {
      setStatusMessage({ type: 'success', text: feedbackText });
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormVideoUrl('');
    setFormTitle('');
    setFormDescription('');
    setFormThumbnail('');
    setFormIsActive(true);
    setFormUrlError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (video: YouTubeVideoItem) => {
    setEditingVideo(video);
    setFormVideoUrl(video.videoUrl || (video.videoId ? formatYouTubeWatchUrl(video.videoId) : ''));
    setFormTitle(video.title || '');
    setFormDescription(video.description || '');
    setFormThumbnail(video.thumbnail || '');
    setFormIsActive(video.isActive !== false);
    setFormUrlError(null);
  };

  // Save new video
  const handleCreateVideo = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
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

    const videoId = id;
    const watchUrl = formatYouTubeWatchUrl(videoId);
    // If no custom thumbnail is provided, use YouTube auto thumbnail
    const thumb = formThumbnail && (typeof formThumbnail === 'string' ? formThumbnail.trim() : (formThumbnail.primary || formThumbnail.fallback))
      ? formThumbnail
      : getYouTubeThumbnailSource(videoId);

    const newVideo: YouTubeVideoItem = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: formTitle.trim(),
      videoUrl: watchUrl,
      videoId: videoId,
      description: formDescription.trim(),
      thumbnail: thumb,
      isActive: formIsActive,
      displayOrder: videosList.length + 1,
      createdAt: Date.now()
    };

    const updated = [...videosList, newVideo];
    await commitVideos(updated, 'नई वीडियो सफलतापूर्वक जोड़ी गई!');
    setIsAddModalOpen(false);
  };

  // Save edited video
  const handleUpdateVideo = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
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

    // Constraint: Cannot hide the only active video
    if (!formIsActive && editingVideo.isActive && activeCount <= 1) {
      setStatusMessage({
        type: 'error',
        text: 'कम से कम 1 वीडियो सक्रिय रखना आवश्यक है। इसे छिपाया नहीं जा सकता।'
      });
      return;
    }

    const videoId = id;
    const watchUrl = formatYouTubeWatchUrl(videoId);
    const thumb = formThumbnail && (typeof formThumbnail === 'string' ? formThumbnail.trim() : (formThumbnail.primary || formThumbnail.fallback))
      ? formThumbnail
      : getYouTubeThumbnailSource(videoId);

    const updated = videosList.map(v => {
      if (v.id === editingVideo.id) {
        return {
          ...v,
          title: formTitle.trim(),
          videoUrl: watchUrl,
          videoId: videoId,
          description: formDescription.trim(),
          thumbnail: thumb,
          isActive: formIsActive,
          updatedAt: Date.now()
        };
      }
      return v;
    });

    await commitVideos(updated, 'वीडियो जानकारी सफलतापूर्वक अपडेट की गई!');
    setEditingVideo(null);
  };

  // Toggle active/hidden
  const handleToggleStatus = async (video: YouTubeVideoItem) => {
    if (video.isActive && activeCount <= 1) {
      setStatusMessage({
        type: 'error',
        text: 'कम से कम 1 वीडियो सक्रिय रखना आवश्यक है। इसे छिपाया नहीं जा सकता।'
      });
      return;
    }

    const updated = videosList.map(v => {
      if (v.id === video.id) {
        return { ...v, isActive: !v.isActive };
      }
      return v;
    });

    await commitVideos(
      updated, 
      video.isActive ? 'वीडियो को होम पेज से छिपा दिया गया है।' : 'वीडियो को होम पेज पर सक्रिय कर दिया गया है।'
    );
  };

  // Move up or down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= videosList.length) return;

    const list = [...videosList];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Update display orders
    const updated = list.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1
    }));

    await commitVideos(updated, 'वीडियो का क्रम बदल दिया गया है!');
  };

  // Delete video
  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;

    // Check minimum 1 active video constraint
    if (videoToDelete.isActive && activeCount <= 1) {
      setStatusMessage({
        type: 'error',
        text: 'कम से कम 1 वीडियो सक्रिय रखना आवश्यक है। यह अंतिम सक्रिय वीडियो है।'
      });
      setVideoToDelete(null);
      return;
    }

    const updated = videosList
      .filter(v => v.id !== videoToDelete.id)
      .map((item, idx) => ({
        ...item,
        displayOrder: idx + 1
      }));

    await commitVideos(updated, 'वीडियो सफलतापूर्वक हटा दी गई!');
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
            <h3 className="font-bold text-[#4A3728] text-lg flex items-center gap-2">
              खेती की वीडियो प्रबंधन
              <span className="text-xs bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-semibold">
                YouTube Videos
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              होम पेज के "खेती की वीडियो" सेक्शन में प्रदर्शित होने वाले वीडियो जोड़ें, क्रम बदलें या नियंत्रित करें
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            id="admin-add-youtube-video-btn"
            onClick={openAddModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[#2D5A27] hover:bg-[#23461e] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>नई वीडियो जोड़ें</span>
          </button>
        </div>
      </div>

      {/* YouTube Channel Link Setting Card */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-red-600" />
            <h4 className="text-sm font-bold text-[#4A3728]">
              आधिकारिक यूट्यूब चैनल लिंक (Header & "चैनल देखें ↗" बटन)
            </h4>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">होम पेज पर लिंक</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
              बटन का लेबल (Button Label)
            </label>
            <input 
              type="text" 
              value={contentForm?.youtubeChannel?.label || ''}
              onChange={e => {
                if (!contentForm) return;
                setContentForm({
                  ...contentForm, 
                  youtubeChannel: {
                    ...(contentForm.youtubeChannel || { url: '', label: '' }), 
                    label: e.target.value
                  }
                });
              }}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-medium text-sm"
              placeholder="जैसे: चैनल देखें"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
              चैनल URL (Channel URL)
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={contentForm?.youtubeChannel?.url || ''}
                onChange={e => {
                  if (!contentForm) return;
                  setContentForm({
                    ...contentForm, 
                    youtubeChannel: {
                      ...(contentForm.youtubeChannel || { url: '', label: '' }), 
                      url: e.target.value
                    }
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
      </div>

      {/* Feedback Toast Banner */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "p-4 rounded-2xl flex items-center justify-between text-sm font-medium shadow-sm",
              statusMessage.type === 'success' && "bg-green-50 text-green-800 border border-green-200",
              statusMessage.type === 'error' && "bg-red-50 text-red-800 border border-red-200",
              statusMessage.type === 'info' && "bg-blue-50 text-blue-800 border border-blue-200"
            )}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
              {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600" />}
              {statusMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
              <span>{statusMessage.text}</span>
            </div>
            <button 
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
          <span className="font-bold">नियम (Add / Delete Rule): </span>
          होम पेज पर कम से कम <strong>1 वीडियो सक्रिय</strong> होना अनिवार्य है। यदि केवल 1 वीडियो सक्रिय है तो उसे डिलीट या छिपाया नहीं जा सकता। आप अपनी जरूरत अनुसार असीमित वीडियो जोड़ सकते हैं।
        </div>
      </div>

      {/* Videos List Grid */}
      <div className="space-y-4">
        {videosList.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm">
            <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">कोई वीडियो उपलब्ध नहीं है।</p>
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-2 bg-[#2D5A27] text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              पहली वीडियो जोड़ें
            </button>
          </div>
        ) : (
          videosList.map((video, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === videosList.length - 1;
            const isOnlyActive = video.isActive && activeCount <= 1;
            const isDeleteDisabled = isOnlyActive;
            const resolvedThumb = resolveVideoThumbnail(video);

            return (
              <div 
                key={video.id || idx}
                className={cn(
                  "bg-white p-5 rounded-3xl shadow-sm border transition-all duration-200",
                  video.isActive ? "border-gray-100" : "border-gray-200/80 bg-gray-50/50 opacity-80"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  {/* Left: Thumbnail & Info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                    {/* Video Thumbnail Preview */}
                    <div className="relative w-full sm:w-44 aspect-video rounded-2xl overflow-hidden bg-gray-900 shrink-0 shadow-inner group">
                      <SmartImage
                        src={resolvedThumb}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Play Badge Overlay */}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-9 h-6 bg-red-600 text-white rounded-lg flex items-center justify-center shadow-lg">
                          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                        </div>
                      </div>

                      {/* Display Order Pill */}
                      <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-400">क्रम {idx + 1}</span>
                        {video.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            सक्रिय (Active)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                            <EyeOff className="w-3 h-3" />
                            छिपा हुआ (Hidden)
                          </span>
                        )}

                        {video.videoId && (
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            ID: {video.videoId}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-[#4A3728] text-base leading-snug line-clamp-1">
                        {video.title}
                      </h4>

                      {video.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {video.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-0.5">
                        <a 
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium hover:underline truncate max-w-xs"
                        >
                          <Youtube className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{video.videoUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 ml-0.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto">
                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(idx, 'up')}
                      title="ऊपर करें (Move Up)"
                      className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(idx, 'down')}
                      title="नीचे करें (Move Down)"
                      className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Toggle Active/Hidden */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(video)}
                      title={video.isActive ? "होम पेज से छिपाएं" : "होम पेज पर दिखाएं"}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all flex items-center gap-1 text-xs font-semibold",
                        video.isActive
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          : "border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {video.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      <span className="hidden sm:inline">
                        {video.isActive ? 'सक्रिय' : 'छिपाएं'}
                      </span>
                    </button>

                    {/* Edit Video */}
                    <button
                      type="button"
                      onClick={() => openEditModal(video)}
                      title="संपादित करें (Edit)"
                      className="p-2.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-1 text-xs font-semibold"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden sm:inline">एडिट</span>
                    </button>

                    {/* Delete Video */}
                    <div className="relative group">
                      <button
                        type="button"
                        disabled={isDeleteDisabled}
                        onClick={() => setVideoToDelete(video)}
                        title={isDeleteDisabled ? "कम से कम 1 वीडियो रखना आवश्यक है।" : "हटाएं (Delete)"}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all flex items-center gap-1 text-xs font-semibold",
                          isDeleteDisabled
                            ? "border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed"
                            : "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">हटाएं</span>
                      </button>
                      {isDeleteDisabled && (
                        <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-lg text-center z-10">
                          कम से कम 1 वीडियो रखना आवश्यक है।
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD VIDEO MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
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
                    <h3 className="font-bold text-[#4A3728] text-base">नई वीडियो जोड़ें (+ Add Video)</h3>
                    <p className="text-xs text-gray-400">होम पेज वीडियो सेक्शन के लिए यूट्यूब लिंक दर्ज करें</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
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
                    onChange={e => handleUrlChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateVideo(e);
                      }
                    }}
                    placeholder="जैसे: https://www.youtube.com/watch?v=... या https://youtube.com/shorts/..."
                    className={cn(
                      "w-full bg-gray-50 border-2 rounded-2xl p-4 outline-none transition-all font-medium text-sm",
                      formUrlError 
                        ? "border-red-400 focus:border-red-500 bg-red-50/30" 
                        : "border-transparent focus:border-[#2D5A27] focus:bg-white"
                    )}
                  />
                  {formUrlError && (
                    <p className="text-xs text-red-500 ml-1 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3" /> {formUrlError}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 ml-1">
                    YouTube Watch URL, Shorts URL या Share लिंक का उपयोग करें
                  </p>
                </div>

                {/* Video Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      वीडियो का शीर्षक (Video Title) *
                    </label>
                    {formExtractedId && (
                      <button
                        type="button"
                        onClick={handleManualFetchTitle}
                        disabled={isDetectingTitle}
                        className="text-[11px] text-[#2D5A27] font-semibold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={cn("w-3 h-3", isDetectingTitle && "animate-spin")} />
                        यूट्यूब से नाम लाएं
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateVideo(e);
                      }
                    }}
                    placeholder="जैसे: आधुनिक सोयाबीन बुवाई की संपूर्ण जानकारी"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium text-sm"
                  />
                </div>

                {/* Video Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    संक्षिप्त विवरण (Short Description) - वैकल्पिक
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="वीडियो के बारे में थोड़ी जानकारी..."
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium text-sm resize-none"
                  />
                </div>

                {/* Auto Thumbnail Preview or Custom Thumbnail */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    वीडियो थंबनेल (Thumbnail) - वैकल्पिक
                  </label>
                  
                  {formExtractedId && !formThumbnail && (
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                      <div className="relative w-24 aspect-video rounded-xl overflow-hidden bg-gray-900 shrink-0">
                        <img 
                          src={`https://img.youtube.com/vi/${formExtractedId}/hqdefault.jpg`} 
                          alt="YouTube thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        <p className="font-bold text-gray-700 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          यूट्यूब थंबनेल स्वतः उपयोग होगा
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          यदि आप अपनी पसंद का कस्टम फोटो लगाना चाहते हैं तो नीचे अपलोड करें।
                        </p>
                      </div>
                    </div>
                  )}

                  <DualImageInput
                    label="कस्टम थंबनेल (Custom Image Upload)"
                    value={formThumbnail}
                    onChange={src => setFormThumbnail(src)}
                    description="यदि कस्टम थंबनेल खाली छोड़ते हैं, तो यूट्यूब का आधिकारिक थंबनेल अपने आप उपयोग होगा।"
                  />
                </div>

                {/* Active Status Switch */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <h5 className="text-xs font-bold text-[#4A3728]">होम पेज पर प्रदर्शित करें (Active)</h5>
                    <p className="text-[11px] text-gray-400">इसे बंद करने पर वीडियो होम पेज पर नहीं दिखेगी</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={cn(
                      "w-12 h-7 rounded-full p-1 transition-colors relative",
                      formIsActive ? "bg-[#2D5A27]" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
                      formIsActive ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-3 rounded-2xl text-gray-600 hover:bg-gray-100 font-bold text-sm"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleCreateVideo}
                    className="inline-flex items-center gap-2 bg-[#2D5A27] hover:bg-[#23461e] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all"
                  >
                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>वीडियो जोड़ें</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT VIDEO MODAL */}
      <AnimatePresence>
        {editingVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-gray-100 my-8"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#4A3728] text-base">वीडियो संपादित करें (Edit Video)</h3>
                    <p className="text-xs text-gray-400">वीडियो का शीर्षक, लिंक या थंबनेल बदलें</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
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
                    onChange={e => handleUrlChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateVideo(e);
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={cn(
                      "w-full bg-gray-50 border-2 rounded-2xl p-4 outline-none transition-all font-medium text-sm",
                      formUrlError 
                        ? "border-red-400 focus:border-red-500 bg-red-50/30" 
                        : "border-transparent focus:border-[#2D5A27] focus:bg-white"
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
                      वीडियो का शीर्षक (Video Title) *
                    </label>
                    {formExtractedId && (
                      <button
                        type="button"
                        onClick={handleManualFetchTitle}
                        disabled={isDetectingTitle}
                        className="text-[11px] text-[#2D5A27] font-semibold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={cn("w-3 h-3", isDetectingTitle && "animate-spin")} />
                        यूट्यूब से नाम लाएं
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateVideo(e);
                      }
                    }}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium text-sm"
                  />
                </div>

                {/* Video Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    संक्षिप्त विवरण (Short Description)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium text-sm resize-none"
                  />
                </div>

                {/* Thumbnail */}
                <div className="space-y-3">
                  <DualImageInput
                    label="वीडियो थंबनेल (Thumbnail)"
                    value={formThumbnail}
                    onChange={src => setFormThumbnail(src)}
                    description="यदि कस्टम थंबनेल खाली छोड़ते हैं, तो यूट्यूब का आधिकारिक थंबनेल अपने आप उपयोग होगा।"
                  />
                </div>

                {/* Active Status Switch */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <h5 className="text-xs font-bold text-[#4A3728]">होम पेज पर प्रदर्शित करें (Active)</h5>
                    <p className="text-[11px] text-gray-400">
                      {editingVideo.isActive && activeCount <= 1
                        ? "यह एकमात्र सक्रिय वीडियो है, इसे बंद नहीं किया जा सकता"
                        : "सक्रिय या छिपा हुआ रखें"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={editingVideo.isActive && activeCount <= 1}
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={cn(
                      "w-12 h-7 rounded-full p-1 transition-colors relative",
                      formIsActive ? "bg-[#2D5A27]" : "bg-gray-300",
                      editingVideo.isActive && activeCount <= 1 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
                      formIsActive ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingVideo(null)}
                    className="px-5 py-3 rounded-2xl text-gray-600 hover:bg-gray-100 font-bold text-sm"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleUpdateVideo}
                    className="inline-flex items-center gap-2 bg-[#2D5A27] hover:bg-[#23461e] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all"
                  >
                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>बदलाव सेव करें</span>
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
                  "{videoToDelete.title}" वीडियो को होम पेज सूची से हमेशा के लिए हटा दिया जाएगा।
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
