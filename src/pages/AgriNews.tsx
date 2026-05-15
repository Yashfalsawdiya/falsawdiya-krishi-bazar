import React, { useEffect, useState } from 'react';
import { fetchAgriNews, AgriNewsItem } from '../services/newsService';
import { motion } from 'motion/react';
import { Newspaper, Calendar, Tag, Loader2, ExternalLink, RefreshCw, Key } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';
import SmartImage from '../components/SmartImage';
import ApiKeyModal from '../components/ApiKeyModal';

const AgriNews: React.FC = () => {
  const { userSettings, loading: appLoading } = useAppContext();
  const [news, setNews] = useState<AgriNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadNews = async () => {
    // Wait for app state to load before judging key presence
    if (appLoading) return;

    setLoading(true);
    try {
      const data = await fetchAgriNews(userSettings?.geminiApiKey);
      setNews(data);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!appLoading) {
      loadNews();
    }
  }, [appLoading, userSettings?.geminiApiKey]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'MP': return 'bg-orange-100 text-orange-600';
      case 'India': return 'bg-blue-100 text-blue-600';
      case 'Scheme': return 'bg-green-100 text-green-600';
      case 'Weather': return 'bg-cyan-100 text-cyan-600';
      case 'Crop': return 'bg-emerald-100 text-emerald-600';
      case 'Market': return 'bg-amber-100 text-amber-600';
      case 'Tech': return 'bg-purple-100 text-purple-600';
      case 'Innovation': return 'bg-pink-100 text-pink-600';
      default: return 'bg-gray-100 text-gray-600';
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
    <div className="space-y-6 pb-10">
      <ApiKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728] flex items-center justify-center gap-2">
          <Newspaper className="w-6 h-6 text-[#2D5A27]" />
          कृषि समाचार (Agri News)
        </h2>
        <p className="text-sm text-gray-500">खेती-किसानी की ताज़ा और प्रमाणित खबरें</p>
        <button 
          onClick={loadNews}
          disabled={loading}
          className="mt-2 text-[10px] font-bold text-[#2D5A27] flex items-center gap-1 mx-auto bg-[#2D5A27]/5 px-3 py-1.5 rounded-full border border-[#2D5A27]/10 active:scale-95 transition-transform disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> ताज़ा करें (Refresh)
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-[#2D5A27] animate-spin" />
            <Newspaper className="w-6 h-6 text-[#2D5A27] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-600">गूगल न्यूज़ से ताज़ा खबरें सर्च कर रहे हैं...</p>
            <p className="text-[10px] text-gray-400 mt-1">इसमें कुछ सेकंड लग सकते हैं</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {news.length === 0 && !loading && (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-sm text-gray-500 font-bold">फिलहाल कोई नई खबर नहीं मिली।</p>
              <button onClick={loadNews} className="text-[#2D5A27] text-xs font-bold mt-2 underline">फिर से कोशिश करें</button>
            </div>
          )}
          {news.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 group hover:border-[#2D5A27]/30 transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getCategoryColor(item.category)}`}>
                  {getCategoryName(item.category)}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                  <Calendar className="w-3 h-3" />
                  {item.date}
                </div>
              </div>
              
              <h3 className="font-bold text-gray-900 leading-snug group-hover:text-[#2D5A27] transition-colors">{item.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{item.summary}</p>
              
              <div className="pt-3 flex items-center justify-between border-t border-gray-50">
                <div className="flex items-center gap-1.5 opacity-60">
                   <Tag className="w-3 h-3 text-[#2D5A27]" />
                   <span className="text-[10px] font-bold text-gray-500 lowercase">स्रोत: {item.source}</span>
                </div>
                {item.url && (
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-black text-[#2D5A27] uppercase tracking-tighter hover:underline"
                  >
                    पूरी खबर पढ़ें <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgriNews;
