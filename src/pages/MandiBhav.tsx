import React, { useEffect, useState } from 'react';
import { fetchMandiBhav, MandiData, MandiItem } from '../services/mandiService';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Calendar, MapPin, Loader2, Info, AlertCircle, ChevronDown, ChevronUp, LineChart as ChartIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ApiKeyModal from '../components/ApiKeyModal';

const MandiBhav: React.FC = () => {
  const { userSettings } = useAppContext();
  const [data, setData] = useState<MandiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMandi, setSelectedMandi] = useState('शामगढ़ (Shamgarh)');
  const [currentTime, setCurrentTime] = useState(new Date());

  const mandis = [
    'शामगढ़ (Shamgarh)',
    'मंदसौर (Mandsaur)',
    'नीमच (Neemuch)',
    'रतलाम (Ratlam)'
  ];

  const loadData = async (mandi: string) => {
    if (!userSettings?.geminiApiKey) {
      setIsModalOpen(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchMandiBhav(mandi, userSettings.geminiApiKey);
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedMandi);
  }, [selectedMandi, userSettings?.geminiApiKey]);

  return (
    <div className="space-y-6 pb-10">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728] flex items-center justify-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#2D5A27]" />
          आज का मंडी भाव (Mandi Bhav)
        </h2>
        <div className="flex flex-col items-center mt-1">
          <p className="text-sm text-gray-500">मंडियों के ताज़ा और सटीक भाव</p>
          <div className="flex items-center gap-2 mt-1 bg-[#2D5A27]/5 px-3 py-1 rounded-full border border-[#2D5A27]/10">
            <Calendar className="w-3 h-3 text-[#2D5A27]" />
            <span className="text-[11px] font-bold text-[#2D5A27]">
              {currentTime.toLocaleDateString('hi-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Info Card - New */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-l-4 border-orange-500 rounded-xl p-4 shadow-sm space-y-2"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-800 leading-normal">
              📈 मंडी भाव प्रतिदिन दो बार अपडेट किए जाते हैं — दोपहर 02:00 बजे और शाम 07:00 बजे।
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              यदि नए मंडी भाव उपलब्ध होंगे, तो वे स्वतः यहाँ दिखाई देने लगेंगे। अन्यथा, पिछले उपलब्ध भाव ही दिखाई देंगे।
            </p>
            <p className="text-[10px] text-orange-600 font-medium italic leading-relaxed pt-1 border-t border-gray-100">
              आपके लिए मंडी भाव विभिन्न कृषि मंडियों और इंटरनेट स्रोतों से एकत्रित किए जा रहे हैं, ताकि आपको सही और उपयोगी बाजार जानकारी समय पर मिल सके। 🌾
            </p>
          </div>
        </div>
      </motion.div>

      {/* Mandi Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
        {mandis.map((mandi) => (
          <button
            key={mandi}
            onClick={() => setSelectedMandi(mandi)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedMandi === mandi 
                ? "bg-[#2D5A27] text-white shadow-md" 
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {mandi}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
          <p className="text-sm font-bold text-gray-500">डेटा लोड हो रहा है, कृपया प्रतीक्षा करें...</p>
        </div>
      ) : data ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#2D5A27]">
              <ChartIcon className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-tight">अंतिम अपडेट: {data.date}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-tight">{data.mandiName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {data.items.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2D5A27]/10 rounded-2xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-[#2D5A27]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{item.commodity}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">प्रति {item.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-black text-[#2D5A27]">₹{item.avgPrice}</div>
                      <div className="text-[10px] font-bold text-gray-400">
                        ₹{item.minPrice} - ₹{item.maxPrice}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-[#F5F2ED] rounded-3xl p-5 border border-[#4A3728]/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#EAB308] shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
              *नोट: ये भाव अनुमानित हैं और इंटरनेट से एकत्रित किए गए हैं। मंडी में माल ले जाने से पहले स्थानीय स्तर पर पुष्टि अवश्य करें। ताज़ा बाजार जानकारी के लिए मंडी के आधिकारिक सूत्रों पर निर्भर रहें।
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mx-1">
          <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-400">डेटा उपलब्ध नहीं है। कृपया नेटवर्क चेक करें।</p>
        </div>
      )}
      
      <ApiKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default MandiBhav;
