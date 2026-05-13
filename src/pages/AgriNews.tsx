import React, { useEffect, useState } from 'react';
import { fetchAgriNews, AgriNewsItem } from '../services/newsService';
import { motion } from 'motion/react';
import { Newspaper, Calendar, Tag, Loader2, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const AgriNews: React.FC = () => {
  const { userSettings } = useAppContext();
  const [news, setNews] = useState<AgriNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await fetchAgriNews(userSettings?.geminiApiKey);
      setNews(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [userSettings?.geminiApiKey]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Policy': return 'bg-blue-100 text-blue-600';
      case 'Market': return 'bg-green-100 text-green-600';
      case 'Technology': return 'bg-purple-100 text-purple-600';
      case 'Weather': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728] flex items-center justify-center gap-2">
          <Newspaper className="w-6 h-6 text-[#2D5A27]" />
          कृषि समाचार (Agri News)
        </h2>
        <p className="text-sm text-gray-500">खेती-किसानी की ताज़ा खबरें</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-l-4 border-[#2D5A27] rounded-xl p-4 shadow-sm space-y-2"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#2D5A27] shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-800 leading-normal">
              📰 कृषि समाचार प्रतिदिन सुबह 10:00 बजे अपडेट किए जाते हैं।
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              यदि कोई नया कृषि समाचार उपलब्ध होगा, तो वह स्वतः यहाँ दिखाई देने लगेगा। अन्यथा, पिछला समाचार ही दिखाई देगा।
            </p>
            <p className="text-[10px] text-[#2D5A27] font-medium italic leading-relaxed pt-1 border-t border-gray-100">
              आपके लिए कृषि से जुड़े समाचार इंटरनेट के विभिन्न स्रोतों से एकत्रित किए जा रहे हैं, ताकि आपको नई और उपयोगी जानकारी समय पर मिल सके। 🌾
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
          <p className="text-sm font-bold text-gray-500">डेटा लोड हो रहा है, कृपया प्रतीक्षा करें...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3"
            >
              <div className="flex justify-between items-start gap-2">
                <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${getCategoryColor(item.category)}`}>
                  {item.category}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                  <Calendar className="w-3 h-3" />
                  {item.date}
                </div>
              </div>
              
              <h3 className="font-bold text-gray-800 leading-tight">{item.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{item.summary}</p>
              
              <div className="pt-2 flex items-center justify-between border-t border-gray-50">
                <span className="text-[10px] font-bold text-gray-400">स्रोत: {item.source}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgriNews;
