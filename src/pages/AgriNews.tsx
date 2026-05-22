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
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const loadNews = async () => {
    // Wait for app state to load before judging key presence
    if (appLoading) return;

    if (!userSettings?.geminiApiKey) {
      setErrorMessage(undefined);
      setIsModalOpen(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchAgriNews(userSettings?.geminiApiKey);
      setNews(data);
    } catch (error: any) {
      console.error(error);
      if (error.type === 'key_missing' || error.type === 'key_invalid') {
        setErrorMessage(error.message);
        setIsModalOpen(true);
      }
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
      <ApiKeyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        message={errorMessage}
      />
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
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
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
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4 group hover:shadow-md hover:border-[#2D5A27]/20 transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getCategoryColor(item.category).replace('bg-', 'bg-opacity-50 border-').replace('text-', 'text-')}`}>
                  {getCategoryName(item.category)}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded-lg">
                  <Calendar className="w-3 h-3 text-[#2D5A27]" />
                  {item.date}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900 leading-tight group-hover:text-[#2D5A27] transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                  {item.summary}
                </p>
              </div>
              
              <div className="pt-4 flex items-center justify-between border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center font-bold text-[10px] text-[#2D5A27] border border-gray-200">
                    {item.source.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">स्रोत</span>
                    <span className="text-[10px] font-bold text-gray-700">{item.source}</span>
                  </div>
                </div>
                
                {/* 'पूरी खबर' button has been removed */}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgriNews;
