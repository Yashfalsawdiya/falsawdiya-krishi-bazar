import React, { useEffect, useState } from 'react';
import { fetchAgriNews, AgriNewsItem, getFormattedDateString } from '../services/newsService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Newspaper, 
  Calendar, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  AlertTriangle, 
  WifiOff, 
  Sparkles,
  Info,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';
import ApiKeyModal from '../components/ApiKeyModal';

const AgriNews: React.FC = () => {
  const { userSettings, loading: appLoading } = useAppContext();
  
  // State variables
  const [news, setNews] = useState<AgriNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [silentSyncing, setSilentSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  
  // Metadata for smart banners
  const [hasTodayNews, setHasTodayNews] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | undefined>();

  // Tips to rotate while loading news
  const newsTips = [
    "विश्वसनीय समाचार स्रोतों से ताज़ा खेती-किसानी की खबरें खोजी जा रही हैं...",
    "फसल, मौसम, सरकारी योजनाओं और एमएसपी (MSP) के नए अपडेट आ रहे हैं...",
    "कृषि जागरण और विश्वसनीय पोर्टल्स से लाइव समाचार खोज जारी है...",
    "ऑफ़लाइन पढ़ने के लिए लोकल कैश सुरक्षित रूप से तैयार किया जा रहा है...",
    "पुरानी खबरों को सहेज कर आज की खबरों की जांच की जा रही है..."
  ];
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Rotate tips during loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % newsTips.length);
      }, 2400);
    }
    return () => clearInterval(interval);
  }, [loading]);

  /**
   * Helper to convert DD/MM/YYYY into a beautiful Hindi date string (e.g. 17 जुलाई 2026)
   */
  const convertToHindiDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const year = parts[2];
      const months = [
        "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
        "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
      ];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    return dateStr;
  };

  /**
   * Loads or Syncs Agricultural News
   */
  const loadNews = async (force: boolean = false) => {
    if (appLoading) return;

    if (force) {
      setLoading(true);
    } else {
      // If not forced, let's show silent loading if we have some existing news
      if (news.length === 0) {
        setLoading(true);
      } else {
        setSilentSyncing(true);
      }
    }

    try {
      const response = await fetchAgriNews(userSettings?.geminiApiKey, force);
      
      setNews(response.items);
      setHasTodayNews(response.hasTodayNews);
      setIsOfflineFallback(response.isOfflineFallback);
      setSyncFailed(response.syncFailed);
      setLastSyncedTime(response.lastSyncedTime);

    } catch (error: any) {
      console.error("AgriNews Load failed", error);
      if (error.type === 'key_missing' || error.type === 'key_invalid') {
        setErrorMessage(error.message);
        setIsModalOpen(true);
      }
      setSyncFailed(true);
    } finally {
      setLoading(false);
      setSilentSyncing(false);
    }
  };

  // Mount/Initial trigger
  useEffect(() => {
    if (!appLoading) {
      // Load news initially from cache, and auto-checks / background-syncs if needed
      loadNews(false);
    }
  }, [appLoading, userSettings?.geminiApiKey]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'MP': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'India': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Scheme': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Weather': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      case 'Crop': return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'Market': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Tech': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Innovation': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getCategoryName = (cat: string) => {
    switch (cat) {
      case 'MP': return 'मध्य प्रदेश';
      case 'India': return 'भारत';
      case 'Scheme': return 'योजनाएँ';
      case 'Weather': return 'मौसम';
      case 'Crop': return 'फसल';
      case 'Market': return 'मंडी भाव';
      case 'Tech': return 'तकनीक';
      case 'Innovation': return 'नवाचार';
      default: return cat;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <ApiKeyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        message={errorMessage}
      />

      {/* Styled Page Header */}
      <div className="text-center bg-gradient-to-br from-[#2D5A27]/10 via-[#2D5A27]/5 to-transparent p-6 rounded-3xl border border-[#2D5A27]/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-full blur-2xl -z-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -z-10" />
        
        <div className="flex justify-center mb-2">
          <div className="bg-[#2D5A27] text-white p-2.5 rounded-2xl shadow-lg shadow-[#2D5A27]/20 flex items-center justify-center">
            <Newspaper className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-[#2D5A27] tracking-tight">कृषि समाचार (Agri News)</h2>
        <p className="text-xs text-gray-500 font-medium mt-1">
          फल्सावदिया कृषि बाज़ार • खेती-किसानी की ताज़ा, प्रमाणित और दैनिक खबरें
        </p>

        <div className="flex items-center justify-center gap-2 mt-4">
          <button 
            onClick={() => loadNews(true)}
            disabled={loading || silentSyncing}
            className="text-[11px] font-black text-[#2D5A27] flex items-center gap-1.5 bg-white px-4 py-2 rounded-full border border-[#2D5A27]/15 shadow-sm hover:bg-[#2D5A27]/5 active:scale-95 transition-all disabled:opacity-50"
            id="btn-sync-news"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-[#2D5A27]", (loading || silentSyncing) && "animate-spin")} />
            {loading || silentSyncing ? "अपडेट हो रहा है..." : "ताज़ा खबरें प्राप्त करें (Sync)"}
          </button>
          
          {lastSyncedTime && (
            <span className="text-[9px] text-gray-400 font-bold bg-gray-100/70 border border-gray-200/50 px-2.5 py-1.5 rounded-full">
              अंतिम अपडेट: {lastSyncedTime}
            </span>
          )}
        </div>
      </div>

      {/* SMART STATUS BANNERS */}
      <AnimatePresence mode="popLayout">
        {syncFailed && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-3 shadow-sm"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5">
              <p className="text-xs font-black text-rose-800">आज नई समाचार प्राप्त नहीं हो सकीं।</p>
              <p className="text-[10px] text-rose-700/90 font-bold">अंतिम उपलब्ध समाचार प्रदर्शित की जा रही हैं। (सर्वर / नेटवर्क त्रुटि)</p>
            </div>
          </motion.div>
        )}

        {isOfflineFallback && !syncFailed && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-2xl flex items-start gap-3 shadow-sm"
          >
            <WifiOff className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-black text-blue-800">ऑफलाइन मोड</p>
              <p className="text-[10px] text-blue-700/90 font-bold">यह समाचार अंतिम सफल अपडेट के अनुसार दिखाई जा रही हैं।</p>
            </div>
          </motion.div>
        )}

        {!hasTodayNews && !syncFailed && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-black text-amber-800">📰 आज कोई नई कृषि समाचार उपलब्ध नहीं है।</p>
              <p className="text-[10px] text-amber-700/90 font-bold">नीचे पिछली उपलब्ध समाचार दिखाई जा रही हैं।</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT PORTION */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-[#2D5A27] animate-spin" />
            <Newspaper className="w-7 h-7 text-[#2D5A27] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="text-center space-y-1 max-w-[300px]">
            <p className="text-sm font-black text-gray-700">नवीनतम समाचार लोड हो रहे हैं</p>
            <p className="text-[10.5px] text-gray-400 font-bold leading-relaxed min-h-[32px]">
              {newsTips[currentTipIndex]}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {news.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-gray-500">कोई समाचार उपलब्ध नहीं हैं।</p>
              <button 
                onClick={() => loadNews(true)} 
                className="mt-3 px-5 py-2 bg-[#2D5A27] text-white text-[11px] font-black rounded-full"
              >
                पुनः प्रयास करें
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {news.map((item, idx) => {
                const isTodayItem = item.date === getFormattedDateString();
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                    className={cn(
                      "bg-white rounded-2xl p-5 border shadow-sm flex flex-col gap-3.5 group hover:shadow-md hover:border-[#2D5A27]/25 transition-all duration-300 relative overflow-hidden",
                      isTodayItem ? "border-[#2D5A27]/30 ring-1 ring-[#2D5A27]/5" : "border-gray-100"
                    )}
                  >
                    {isTodayItem && (
                      <div className="absolute top-0 right-0 bg-[#2D5A27] text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                        आज की ताज़ा खबर
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                        getCategoryColor(item.category)
                      )}>
                        {getCategoryName(item.category)}
                      </span>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200/50">
                        <Calendar className="w-3.5 h-3.5 text-[#2D5A27]" />
                        {convertToHindiDate(item.date)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xs sm:text-sm font-black text-gray-800 leading-snug group-hover:text-[#2D5A27] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-gray-600 leading-relaxed font-bold">
                        {item.summary}
                      </p>
                    </div>
                    
                    <div className="pt-3 flex items-center justify-between border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-emerald-50 border border-[#2D5A27]/10 rounded-full flex items-center justify-center font-black text-[10px] text-[#2D5A27]">
                          {item.source ? item.source.charAt(0) : 'K'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">प्रमाणित स्रोत</span>
                          <span className="text-[10px] font-black text-gray-700">{item.source || "कृषि जागरण"}</span>
                        </div>
                      </div>

                      {item.url && item.url.startsWith("http") && (
                        <a 
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-[#2D5A27] flex items-center gap-0.5 hover:underline"
                        >
                          विवरण देखें <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Bottom Information Tip Card */}
          <div className="bg-[#2D5A27]/5 border border-[#2D5A27]/10 rounded-2xl p-4 flex gap-3 items-start">
            <Sparkles className="w-4.5 h-4.5 text-[#2D5A27] shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5">
              <p className="text-[10px] text-[#2D5A27] font-black">कृषक बंधु टिप:</p>
              <p className="text-[9.5px] text-[#2D5A27]/90 font-bold leading-relaxed">
                फल्सावदिया कृषि बाज़ार हमेशा 'कृषि जागरण' एवं आधिकारिक सरकारी पोर्टलों जैसे प्रामाणिक स्रोतों से ही खबरें संकलित करता है। किसी भी योजना के लिए आवेदन करने से पहले आधिकारिक वेबसाइट लिंक पर जाकर पुष्टि अवश्य करें।
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgriNews;
