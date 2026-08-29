import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon, 
  RefreshCw, Info, ShoppingCart, ArrowRight, X, Tag, Wheat, Droplets, 
  MessageSquare, Send, Sparkles, Bot, History, Trash2, ChevronRight, 
  RotateCcw, FileText, HelpCircle, Check, MessageCircle, Plus, Eye, Layers,
  AlertTriangle
} from 'lucide-react';
import { detectDisease, DiseaseAnalysis, askDiseaseReportChat, ReportChatMessage } from '../services/gemini';
import { fetchWeather } from '../services/weatherService';
import { compressImageFile, compressMultipleImageFiles } from '../utils/imageCompressor';
import { motion, AnimatePresence } from 'motion/react';
import { getFriendlyAiError } from '../utils/aiErrorHandler';
import SmartImage from '../components/SmartImage';
import Markdown from 'react-markdown';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import ApiKeyModal from '../components/ApiKeyModal';

export interface DiseaseChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface DiseaseScanRecord {
  id: string;
  timestamp: number;
  dateStr: string;
  image: string; // Primary image for backward compatibility
  images?: string[]; // Array of all uploaded photos
  cropName?: string;
  analysisResult: DiseaseAnalysis;
  chatMessages: DiseaseChatMessage[];
}

const MAX_PHOTOS = 5;

const SUGGESTED_QUESTIONS = [
  '• यह बीमारी क्यों हुई?',
  '• दूसरा Product बताओ',
  '• सस्ता विकल्प',
  '• Premium विकल्प',
  '• Organic उपाय',
  '• 20 लीटर डोज़',
  '• 500 लीटर डोज़',
  '• Tank Mix क्रम',
  '• कितने दिन में ठीक होगा?',
  '• दोबारा Spray कब करें?',
  '• किन दवाओं के साथ न मिलाएँ?',
  '• बचाव कैसे करें?'
];

const DiseaseDetection: React.FC = () => {
  const navigate = useNavigate();
  const { appContent, deliveryConfig, userSettings, products, categories, loading: appLoading } = useAppContext();
  const { addToCart } = useCart();
  const isDeliveryActive = deliveryConfig?.isDeliveryActive !== false && appContent?.isDeliveryActive !== false;
  
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  
  // Multi-image state
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isAddPhotoPickerOpen, setIsAddPhotoPickerOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DiseaseAnalysis | null>(null);
  
  // Modals & Errors
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  
  // Scan History & Chat States
  const [scanHistory, setScanHistory] = useState<DiseaseScanRecord[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<DiseaseChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentWeatherSummary, setCurrentWeatherSummary] = useState<string>('शामगढ़, मंदसौर (30°C, साफ आसमान)');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const addMoreCameraRef = useRef<HTMLInputElement>(null);
  const addMoreGalleryRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const getCategoryName = (catId: string) => {
    if (!categories) return catId;
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : catId;
  };

  // Load Saved Scan History on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('agri_disease_scans_history');
      if (saved) {
        const parsed: DiseaseScanRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScanHistory(parsed);
        }
      }
    } catch (e) {
      console.warn("Error loading scan history:", e);
    }

    // Fetch Weather for Chat Context
    fetchWeather(24.18, 75.61)
      .then(w => {
        if (w) {
          setCurrentWeatherSummary(`तापमान: ${w.temp}°C, आर्द्रता: ${w.humidity}%, मौसम: ${w.condition}`);
        }
      })
      .catch(() => {});
  }, []);

  // Auto Scroll Chat to Bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0) {
      setSelectedVariant(selectedProduct.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProduct]);

  const displayPrice = selectedVariant ? selectedVariant.price : (selectedProduct?.price || 0);
  const displayUnit = selectedVariant ? selectedVariant.quantity : (selectedProduct?.unit || 'Pack');

  const whatsappNumber = appContent?.contactInfo.whatsapp || '918982338046';

  // Find matching products from shop
  const matchedProducts = products.filter(p => {
    if (!analysisResult?.keywords) return false;
    const searchStr = `${p.name} ${p.hindiName} ${p.category} ${p.description || ''}`.toLowerCase();
    return analysisResult.keywords.some(k => searchStr.includes(k.toLowerCase()));
  }) || [];

  // Handle Initial Image Upload (Camera or Gallery)
  const handleInitialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const fileList = Array.from(files).slice(0, MAX_PHOTOS);
      const compressedList = await compressMultipleImageFiles(fileList, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.82
      });

      if (compressedList.length > 0) {
        setImages(compressedList);
        setActiveImageIndex(0);
        setAnalysisResult(null);
        setActiveScanId(null);
        setChatMessages([]);
        if (compressedList.length > 1) {
          showToast(`✅ ${compressedList.length} फोटो जोड़ी गईं`);
        }
      }
    } catch (err) {
      console.error("Image compression error:", err);
      showToast("⚠️ फोटो लोड करने में समस्या आई, कृपया पुनः प्रयास करें।");
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Handle Add More Images
  const handleAddMoreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - images.length;
    if (remainingSlots <= 0) {
      showToast(`⚠️ आप अधिकतम ${MAX_PHOTOS} फोटो ही जोड़ सकते हैं।`);
      e.target.value = '';
      return;
    }

    setIsCompressing(true);
    try {
      const fileList = Array.from(files).slice(0, remainingSlots);
      const newCompressedList = await compressMultipleImageFiles(fileList, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.82
      });

      if (newCompressedList.length > 0) {
        const updatedImages = [...images, ...newCompressedList];
        setImages(updatedImages);
        setActiveImageIndex(updatedImages.length - 1);
        setAnalysisResult(null);
        setActiveScanId(null);
        setChatMessages([]);
        showToast(`✅ ${newCompressedList.length} और फोटो जोड़ी गईं (${updatedImages.length}/${MAX_PHOTOS})`);
      }
    } catch (err) {
      console.error("Add more images error:", err);
      showToast("⚠️ फोटो जोड़ने में समस्या आई।");
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Remove a specific photo
  const handleRemoveImage = (indexToRemove: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    setImages(updated);
    if (activeImageIndex >= updated.length) {
      setActiveImageIndex(Math.max(0, updated.length - 1));
    }
    setAnalysisResult(null);
    setActiveScanId(null);
    setChatMessages([]);
    showToast("🗑️ फोटो हटाई गई");
  };

  // Analyze Single or Multiple Images
  const analyzeImages = async () => {
    if (images.length === 0) return;
    if (appLoading) return;

    const effectiveApiKey = userSettings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!effectiveApiKey) {
      setErrorMessage(undefined);
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const analysis = await detectDisease(images, effectiveApiKey);
      setAnalysisResult(analysis);

      // Create new Scan Record with unique ID and initial chat history
      const newScanId = `scan_${Date.now()}`;
      const now = new Date();
      const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + 
                      ' ' + now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });

      let detectedTitle = 'फसल रोग रिपोर्ट';
      if (analysis.keywords && analysis.keywords.length > 0) {
        detectedTitle = analysis.keywords.slice(0, 2).join(', ');
      }

      const photoCountText = images.length > 1 ? ` (${images.length} फोटो की संयुक्त जाँच)` : '';

      const welcomeMsg: DiseaseChatMessage = {
        id: `msg_welcome_${Date.now()}`,
        sender: 'ai',
        text: `नमस्ते! मैं **फल्सावदिया कृषि बाजार** का AI कृषि विशेषज्ञ हूँ।\n\nआपकी **${detectedTitle}${photoCountText}** जाँच रिपोर्ट तैयार है। इस बीमारी, डोज़ (मात्रा), टैंक मिक्स क्रम, सस्ते/ऑर्गेनिक विकल्प या छिड़काव समय के बारे में नीचे कोई भी सवाल पूछें!`,
        timestamp: Date.now()
      };

      const newScanRecord: DiseaseScanRecord = {
        id: newScanId,
        timestamp: Date.now(),
        dateStr,
        image: images[0], // primary
        images: images,   // all photos
        cropName: detectedTitle,
        analysisResult: analysis,
        chatMessages: [welcomeMsg]
      };

      const updatedHistory = [newScanRecord, ...scanHistory];
      setScanHistory(updatedHistory);
      setActiveScanId(newScanId);
      setChatMessages([welcomeMsg]);

      try {
        localStorage.setItem('agri_disease_scans_history', JSON.stringify(updatedHistory));
      } catch (e) {
        console.warn("Could not save scan history:", e);
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
      const friendlyError = getFriendlyAiError(error);
      
      if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
        setErrorMessage(friendlyError.message);
        setIsModalOpen(true);
      } else {
        setAnalysisResult({ 
          analysis: friendlyError.message,
          keywords: [] 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (inputQuery?: string) => {
    const queryText = (inputQuery || chatInputText).trim();
    if (!queryText || chatLoading || !analysisResult) return;

    const userMsg: DiseaseChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: Date.now()
    };

    const updatedMsgs = [...chatMessages, userMsg];
    setChatMessages(updatedMsgs);
    setChatInputText('');
    setChatLoading(true);

    const geminiHistory: ReportChatMessage[] = chatMessages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      text: m.text
    }));

    try {
      const effectiveApiKey = userSettings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
      const aiReply = await askDiseaseReportChat({
        reportAnalysis: analysisResult.analysis,
        userQuestion: queryText,
        chatHistory: geminiHistory,
        location: "शामगढ़, मंदसौर, मध्य प्रदेश",
        weatherSummary: currentWeatherSummary,
        userApiKey: effectiveApiKey
      });

      const aiMsg: DiseaseChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: Date.now()
      };

      const finalMsgs = [...updatedMsgs, aiMsg];
      setChatMessages(finalMsgs);

      // Persist to active scan record
      if (activeScanId) {
        setScanHistory(prevHistory => {
          const newHistory = prevHistory.map(scan => {
            if (scan.id === activeScanId) {
              return { ...scan, chatMessages: finalMsgs };
            }
            return scan;
          });
          try {
            localStorage.setItem('agri_disease_scans_history', JSON.stringify(newHistory));
          } catch (e) {}
          return newHistory;
        });
      }
    } catch (err: any) {
      const friendlyError = getFriendlyAiError(err);
      const errorMsg: DiseaseChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: `⚠️ ${friendlyError.message || "उत्तर प्राप्त करने में समस्या आई।"}\n\nयदि उत्तर न मिले तो कृपया पूरी फसल या पत्तियों की स्पष्ट फोटो पुनः अपलोड करके पूछें।`,
        timestamp: Date.now()
      };
      const finalMsgs = [...updatedMsgs, errorMsg];
      setChatMessages(finalMsgs);
    } finally {
      setChatLoading(false);
    }
  };

  const loadHistoryScan = (scan: DiseaseScanRecord) => {
    const scanImages = scan.images && scan.images.length > 0 ? scan.images : (scan.image ? [scan.image] : []);
    setImages(scanImages);
    setActiveImageIndex(0);
    setAnalysisResult(scan.analysisResult);
    setActiveScanId(scan.id);
    setChatMessages(scan.chatMessages || []);
    setIsHistoryOpen(false);
  };

  const deleteHistoryScan = (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = scanHistory.filter(s => s.id !== scanId);
    setScanHistory(updated);
    try {
      localStorage.setItem('agri_disease_scans_history', JSON.stringify(updated));
    } catch (err) {}

    if (activeScanId === scanId) {
      if (updated.length > 0) {
        loadHistoryScan(updated[0]);
      } else {
        reset();
      }
    }
  };

  const reset = () => {
    setImages([]);
    setActiveImageIndex(0);
    setAnalysisResult(null);
    setActiveScanId(null);
    setChatMessages([]);
  };

  const activeImage = images[activeImageIndex] || images[0] || null;

  return (
    <div className="space-y-6 pb-10">
      <ApiKeyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        message={errorMessage}
      />

      {/* Floating Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] bg-gray-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20"
          >
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Scan History Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#4A3728]">
            बीमारी की सटीक जाँच (AI Scan)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            फोटो अपलोड करें और रिपोर्ट के साथ AI से पूछें
          </p>
        </div>
        {scanHistory.length > 0 && (
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="bg-[#2D5A27]/10 text-[#2D5A27] px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#2D5A27]/20 active:scale-95 transition-all shadow-sm border border-[#2D5A27]/20 shrink-0"
          >
            <History className="w-4 h-4" />
            <span>इतिहास ({scanHistory.length})</span>
          </button>
        )}
      </div>

      {/* Hidden File Inputs */}
      {/* 1. Initial Single/Multi Uploads */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        ref={cameraInputRef}
        onChange={handleInitialUpload}
      />
      <input 
        type="file" 
        accept="image/*" 
        multiple
        className="hidden" 
        ref={galleryInputRef}
        onChange={handleInitialUpload}
      />

      {/* 2. Add More Inputs */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        ref={addMoreCameraRef}
        onChange={handleAddMoreUpload}
      />
      <input 
        type="file" 
        accept="image/*" 
        multiple
        className="hidden" 
        ref={addMoreGalleryRef}
        onChange={handleAddMoreUpload}
      />

      {/* Main Photo Preview & Upload Area */}
      <div className="bg-white rounded-3xl p-4 shadow-xl border border-gray-100 space-y-4">
        {/* Large Main Photo Frame */}
        <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-gray-50 rounded-3xl border-4 border-dashed border-[#2D5A27]/20 flex flex-col items-center justify-center overflow-hidden shadow-inner transition-all">
          {isCompressing ? (
            <div className="text-center p-8 space-y-3">
              <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-700">फोटो तैयार (Compress) हो रही है...</p>
              <p className="text-[10px] text-gray-400">कृपया एक क्षण प्रतीक्षा करें</p>
            </div>
          ) : activeImage ? (
            <div className="relative w-full h-full group">
              <img 
                src={activeImage} 
                alt="Crop Problem" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
              
              {/* Photo Indicator Badge */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                <Layers className="w-3.5 h-3.5 text-yellow-300" />
                <span>फोटो {activeImageIndex + 1} of {images.length}</span>
              </div>

              {/* Delete / Clear Action Buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button 
                  onClick={() => handleRemoveImage(activeImageIndex)}
                  className="bg-red-600/90 hover:bg-red-700 text-white p-2 rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-md"
                  title="यह फोटो हटाएं"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={reset}
                  className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-md"
                  title="सभी हटाएं"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-[#F5F2ED] rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Camera className="w-10 h-10 text-[#2D5A27] opacity-40" />
              </div>
              <p className="text-sm text-gray-700 font-bold mb-1">कोई फोटो नहीं चुनी गई</p>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[240px] mx-auto">
                पौधे के प्रभावित हिस्से की साफ़ फोटो अपलोड करें
              </p>
            </div>
          )}
        </div>

        {/* Multi-Photo Thumbnail Strip & 'Add More' Controls */}
        {images.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold text-[#4A3728]">
                चुनी गई Photos ({images.length}/{MAX_PHOTOS}):
              </span>
              {images.length < MAX_PHOTOS && !analysisResult && (
                <span className="text-[10px] font-bold text-[#2D5A27] bg-[#2D5A27]/10 px-2 py-0.5 rounded-full">
                  +{MAX_PHOTOS - images.length} और जोड़ सकते हैं
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 px-1 scrollbar-none">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 cursor-pointer transition-all border-2 ${
                    activeImageIndex === idx
                      ? 'border-[#2D5A27] ring-2 ring-[#2D5A27]/30 scale-105 shadow-md'
                      : 'border-gray-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Crop thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}

              {/* Add More Thumbnail Tile (Clean '+' Only) */}
              {images.length < MAX_PHOTOS && !analysisResult && (
                <button
                  onClick={() => setIsAddPhotoPickerOpen(true)}
                  disabled={isCompressing}
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#2D5A27]/50 bg-emerald-50/70 hover:bg-emerald-100/70 text-[#2D5A27] flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm group cursor-pointer"
                  title="और फोटो जोड़ें (Add Photo)"
                >
                  <div className="w-8 h-8 rounded-full bg-[#2D5A27] text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Initial Upload Action Buttons (when no photos) */}
        {images.length === 0 && !analysisResult && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button 
              onClick={() => cameraInputRef.current?.click()}
              disabled={isCompressing}
              className="bg-white border-2 border-[#2D5A27] text-[#2D5A27] py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 transition-all hover:bg-emerald-50/40"
            >
              <Camera className="w-6 h-6" />
              <span className="text-xs">कैमरा (Camera)</span>
            </button>
            <button 
              onClick={() => galleryInputRef.current?.click()}
              disabled={isCompressing}
              className="bg-white border-2 border-[#2D5A27] text-[#2D5A27] py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 transition-all hover:bg-emerald-50/40"
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-xs">गैलरी (Gallery)</span>
            </button>
          </div>
        )}

        {/* Analyze Action Button */}
        {images.length > 0 && !analysisResult && (
          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={analyzeImages}
            disabled={loading || isCompressing}
            className="w-full bg-[#2D5A27] hover:bg-green-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>
                  {images.length > 1 
                    ? `AI सभी ${images.length} फोटो की संयुक्त जाँच कर रहा है...`
                    : 'AI जाँच हो रही है...'}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                <span>
                  {images.length > 1 
                    ? `सभी ${images.length} Photos की संयुक्त जाँच करें (AI Scan)`
                    : 'जाँच करें (Analyze Now)'}
                </span>
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* ============================================================ */}
      {/* AI ANALYSIS REPORT & ACTIONS */}
      {/* ============================================================ */}
      <AnimatePresence>
        {analysisResult && (
          <div className="space-y-6">
            {/* AI Report Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-[#EAB308] p-2 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-[#2D5A27]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#4A3728]">
                      जाँच का परिणाम (AI Result)
                    </h3>
                    {activeScanId && (
                      <p className="text-[10px] text-gray-400 font-medium">रिपोर्ट ID: {activeScanId}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="prose prose-sm max-w-none">
                <div className="markdown-body text-sm leading-relaxed text-gray-700">
                  <Markdown>{analysisResult.analysis}</Markdown>
                </div>
              </div>
              
              <div className="pt-4 space-y-3">
                <div className="bg-blue-50 p-3 rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700 font-medium">
                    यह जानकारी AI द्वारा {images.length > 1 ? `${images.length} तस्वीरों के आधार पर` : 'दी गई है'}। बड़े पैमाने पर छिड़काव से पहले कृषि विशेषज्ञ की सलाह अवश्य लें।
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={reset}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                  >
                    फिर से जाँचें
                  </button>
                  <a 
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                      `नमस्ते फल्सावदिया कृषि बाजार विशेषज्ञ,\n\n` +
                      `मैंने अभी ऐप के माध्यम से अपनी फसल की जाँच की है (${images.length} फोटो स्कैन)।\n\n` +
                      `*AI द्वारा दी गई जाँच रिपोर्ट:*\n${analysisResult.analysis}\n\n` +
                      `*मेरा सवाल:* कृपया इस रिपोर्ट को देखें और मुझे सही दवा और मात्रा के बारे में विस्तार से बताएं।\n\n` +
                      `धन्यवाद!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-[2] bg-[#25D366] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                  >
                    विशेषज्ञ से पूछें (WhatsApp)
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Matched Products Section */}
            {matchedProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-[#2D5A27]" />
                    दुकान पर उपलब्ध समाधान (Available at Shop)
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {matchedProducts.map((product, idx) => (
                    <div 
                      key={`${product.id}-${idx}`}
                      onClick={() => setSelectedProduct(product)}
                      className="w-full text-left bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer relative group"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                          <SmartImage 
                            src={product.image} 
                            alt={product.name} 
                            className="w-full h-full" 
                            objectFit="cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-base leading-tight mb-1">
                            {product.hindiName || product.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] bg-[#2D5A27] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm">
                              {product.brand || getCategoryName(product.category)}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">
                              📦 {product.unit || 'Pack'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product, product.variants?.[0]);
                                setAddedProductId(product.id);
                                setTimeout(() => setAddedProductId(null), 1200);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all outline-none ${
                                addedProductId === product.id 
                                  ? "bg-green-600 text-white" 
                                  : "bg-[#2D5A27] text-white hover:bg-[#2D5A27]/90"
                              }`}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              {addedProductId === product.id ? 'Added ✓' : 'Add To Cart'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* CONTEXT-AWARE AI CHAT SECTION FOR THIS DISEASE SCAN REPORT */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden space-y-0"
            >
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-[#2D5A27] via-emerald-800 to-[#1f3f1b] p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md relative">
                    <Bot className="w-6 h-6 text-yellow-300" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#2D5A27] animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-snug flex items-center gap-1.5">
                      <span>💬 AI से इस रिपोर्ट के बारे में पूछें</span>
                      <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                    </h3>
                    <p className="text-[11px] text-green-100 font-medium opacity-90">
                      इसी फसल रिपोर्ट ({images.length} Photos) के संदर्भ में सीधा समाधान
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggested Questions Section */}
              <div className="p-4 bg-emerald-50/60 border-b border-emerald-100/50 space-y-2">
                <p className="text-xs font-bold text-[#2D5A27] flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                  <span>सुझाये गए प्रश्न (टैप करें):</span>
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChatMessage(q)}
                      disabled={chatLoading}
                      className="whitespace-nowrap bg-white hover:bg-[#2D5A27] text-[#2D5A27] hover:text-white border border-[#2D5A27]/20 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Messages Thread */}
              <div className="p-4 max-h-[380px] overflow-y-auto space-y-3 bg-gray-50/50">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-[#2D5A27] text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-gray-100 text-[10px] font-bold text-[#2D5A27]">
                          <Bot className="w-3.5 h-3.5 text-[#2D5A27]" />
                          <span>फल्सावदिया कृषि विशेषज्ञ</span>
                        </div>
                      )}
                      <div className="markdown-body leading-relaxed">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                      <span
                        className={`text-[9px] block text-right mt-1 font-medium ${
                          msg.sender === 'user' ? 'text-green-200' : 'text-gray-400'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm flex items-center gap-2.5 text-xs text-gray-600">
                      <Loader2 className="w-4 h-4 text-[#2D5A27] animate-spin" />
                      <span className="font-bold text-[#2D5A27]">AI कृषि विशेषज्ञ उत्तर सोच रहे हैं...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder="इस रिपोर्ट से संबंधित कोई भी प्रश्न पूछें..."
                  disabled={chatLoading}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#2D5A27] transition-all"
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  disabled={chatLoading || !chatInputText.trim()}
                  className="bg-[#2D5A27] hover:bg-green-800 text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-1.5 text-xs shadow-md disabled:opacity-40 active:scale-95 transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>भेजें</span>
                </button>
              </div>

              {/* AI Disclaimer Footer Note */}
              <div className="pt-2">
                <Link 
                  to="/disclaimer" 
                  className="bg-amber-50/90 border border-amber-200 hover:border-amber-300 rounded-2xl p-3 flex items-center justify-between text-amber-900 transition-all text-xs"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold text-[11px]">AI विश्लेषण व सलाह केवल सामान्य मार्गदर्शन हेतु है। पूरा अस्वीकरण पढ़ें।</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* SCAN HISTORY DRAWER / MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-[40px] z-[101] shadow-2xl p-6 pb-10 flex flex-col"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#2D5A27]" />
                  <h3 className="font-extrabold text-[#4A3728] text-base">पिछली जाँच का इतिहास (Scan History)</h3>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto py-4 space-y-3 flex-1">
                {scanHistory.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    कोई पुराना इतिहास नहीं मिला।
                  </div>
                ) : (
                  scanHistory.map((scan) => (
                    <div
                      key={scan.id}
                      onClick={() => loadHistoryScan(scan)}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        activeScanId === scan.id
                          ? 'bg-emerald-50/80 border-[#2D5A27] shadow-sm'
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-gray-200">
                          <img
                            src={scan.image || scan.images?.[0]}
                            alt="Scan Thumb"
                            className="w-full h-full object-cover"
                          />
                          {(scan.images?.length || 0) > 1 && (
                            <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[8px] font-bold px-1 rounded">
                              {scan.images?.length} 📷
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate">
                            {scan.cropName || 'फसल बीमारी रिपोर्ट'}
                          </h4>
                          <p className="text-[11px] text-gray-400 font-medium">{scan.dateStr}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-[#2D5A27]/10 text-[#2D5A27] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {scan.chatMessages?.length || 0} सन्देश
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => deleteHistoryScan(scan.id, e)}
                          className="p-2 text-gray-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                          title="हटाएं"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setIsHistoryOpen(false)}
                className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all mt-2"
              >
                बंद करें (Close)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Photo Picker Modal / Action Sheet */}
      <AnimatePresence>
        {isAddPhotoPickerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddPhotoPickerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[120]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-3xl z-[121] shadow-2xl p-6 border border-gray-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="bg-[#2D5A27]/10 p-2 rounded-2xl text-[#2D5A27]">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#4A3728] text-base">फोटो जोड़ें (Add Photo)</h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      उपलब्ध स्लॉट: {MAX_PHOTOS - images.length} (अधिकतम {MAX_PHOTOS})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddPhotoPickerOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => {
                    setIsAddPhotoPickerOpen(false);
                    setTimeout(() => addMoreCameraRef.current?.click(), 100);
                  }}
                  className="bg-emerald-50/60 hover:bg-emerald-50 border-2 border-[#2D5A27] text-[#2D5A27] py-4 px-3 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs">
                    <Camera className="w-6 h-6 text-[#2D5A27]" />
                  </div>
                  <span className="text-xs font-extrabold">कैमरा (Camera)</span>
                  <span className="text-[9px] text-gray-500 font-medium text-center">सीधा फोटो खींचें</span>
                </button>

                <button
                  onClick={() => {
                    setIsAddPhotoPickerOpen(false);
                    setTimeout(() => addMoreGalleryRef.current?.click(), 100);
                  }}
                  className="bg-emerald-50/60 hover:bg-emerald-50 border-2 border-[#2D5A27] text-[#2D5A27] py-4 px-3 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs">
                    <ImageIcon className="w-6 h-6 text-[#2D5A27]" />
                  </div>
                  <span className="text-xs font-extrabold">गैलरी (Gallery)</span>
                  <span className="text-[9px] text-gray-500 font-medium text-center">गैलरी से चुनें</span>
                </button>
              </div>

              <button
                onClick={() => setIsAddPhotoPickerOpen(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                रद्द करें (Cancel)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Details Sheet */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[101] shadow-2xl p-6 pb-12"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              
              <div className="flex gap-4 mb-6">
                <div className="w-24 h-24 rounded-3xl overflow-hidden flex-shrink-0 shadow-md bg-gray-50">
                  <SmartImage 
                    src={selectedProduct.image} 
                    alt={selectedProduct.hindiName || selectedProduct.name} 
                    className="w-full h-full" 
                    objectFit="cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[#2D5A27] text-[10px] font-black uppercase tracking-wider mb-0.5">{selectedProduct.brand || 'Local Brand'}</p>
                  <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{selectedProduct.hindiName || selectedProduct.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white border border-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">मात्रा: {displayUnit}</span>
                  </div>
                  {selectedProduct.hidePrice || !displayPrice ? (
                    <p className="text-sm font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl inline-block mt-1">कीमत उपलब्ध नहीं</p>
                  ) : (
                    <p className="text-2xl font-black text-[#2D5A27]">₹{displayPrice}</p>
                  )}
                </div>
              </div>

              {/* Variants Selection */}
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="mb-6 space-y-3">
                  <h4 className="text-xs font-black text-[#2D5A27] uppercase tracking-widest flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    मात्रा चुनें (Select Quantity)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.variants.map((v: any, vIdx: number) => (
                      <button
                        key={`${v.id || 'variant'}-${vIdx}`}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border-2 ${
                          selectedVariant?.id === v.id
                            ? "bg-[#2D5A27] border-[#2D5A27] text-white shadow-md active:scale-95"
                            : "bg-gray-50 border-gray-100 text-gray-500"
                        }`}
                      >
                        {v.quantity}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-3xl p-5 mb-6 border border-gray-100">
                <h4 className="text-xs font-black text-[#2D5A27] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  ऑर्डर की पूरी जानकारी
                </h4>
                
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">🏢 कंपनी (Brand):</span>
                    <span className="text-gray-900 font-black text-sm">{selectedProduct.brand}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">💊 दवाई (Full Name):</span>
                    <span className="text-gray-900 font-black text-sm">
                      {selectedProduct.hindiName || selectedProduct.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">📦 मात्रा (Quantity):</span>
                    <span className="text-gray-900 font-black text-sm">{displayUnit}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">💰 कीमत (Price):</span>
                    {selectedProduct.hidePrice || !displayPrice ? (
                      <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">कीमत उपलब्ध नहीं</span>
                    ) : (
                      <span className="text-[#2D5A27] font-black text-lg">₹{displayPrice}</span>
                    )}
                  </div>
                  <div className="py-2">
                    <span className="text-gray-500 text-sm font-medium block mb-1">🌱 उपयोग (Best For):</span>
                    <p className="text-gray-700 text-xs font-bold leading-relaxed bg-white/50 p-2 rounded-lg border border-gray-100">
                      {selectedProduct.description}
                    </p>
                  </div>
                </div>

                {!isDeliveryActive && (
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-start gap-2 shadow-sm">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-orange-800 font-black leading-tight">
                      ⚠️ Note/Disclaimer: आपको स्वयं “फल्सावदिया कृषि बाजार” दुकान पर आकर यह उत्पाद खरीदना होगा
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      if (!selectedProduct) return;
                      const mappedProduct = {
                        ...selectedProduct,
                        price: displayPrice,
                        unit: displayUnit
                      };
                      addToCart(mappedProduct, selectedVariant || undefined);
                      setAddedProductId(selectedProduct.id);
                      setTimeout(() => setAddedProductId(null), 1200);
                    }}
                    className={`flex-1 ${
                      addedProductId === selectedProduct.id 
                        ? "bg-green-600 text-white shadow-lg shadow-green-100" 
                        : "bg-[#2D5A27] text-white hover:bg-[#2D5A27]/90 shadow-lg shadow-green-50"
                    } py-4 rounded-2xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs outline-none`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {addedProductId === selectedProduct.id ? 'Added ✓' : 'Add To Cart'}
                  </button>
                  <button 
                    onClick={() => {
                      if (!selectedProduct) return;
                      const mappedProduct = {
                        ...selectedProduct,
                        price: displayPrice,
                        unit: displayUnit
                      };
                      addToCart(mappedProduct, selectedVariant || undefined);
                      setSelectedProduct(null);
                      navigate('/cart');
                    }}
                    className="flex-1 bg-[#EAB308] text-[#2D5A27] hover:bg-amber-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 active:scale-95 transition-all text-xs outline-none"
                  >
                    <ArrowRight className="w-4 h-4" />
                    अभी खरीदें (Buy Now)
                  </button>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="w-full bg-gray-100 text-gray-500 py-3 rounded-2xl font-semibold active:scale-95 transition-all text-xs outline-none"
                >
                  बंद करें (Close)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiseaseDetection;
