import React, { useEffect, useState } from 'react';
import { fetchMandiBhav, MandiData, MandiItem } from '../services/mandiService';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Calendar, MapPin, Loader2, RefreshCw, AlertCircle, LineChart as ChartIcon, Key } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ApiKeyModal from '../components/ApiKeyModal';

const MandiBhav: React.FC = () => {
  const { userSettings, loading: appLoading } = useAppContext();
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
    if (appLoading) return;

    setLoading(true);
    try {
      const result = await fetchMandiBhav(mandi, userSettings?.geminiApiKey);
      setData(result);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!appLoading) {
      loadData(selectedMandi);
    }
  }, [selectedMandi, appLoading, userSettings?.geminiApiKey]);

  return (
    <div className="space-y-6 pb-10">
      <ApiKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
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
          <p className="text-sm font-bold text-gray-500">ताज़ा भाव लोड हो रहे हैं...</p>
        </div>
      ) : data ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#2D5A27]">
              <RefreshCw className="w-4 h-4" />
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
                <div 
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2D5A27]/10 rounded-2xl flex items-center justify-center">
                      <ChartIcon className="w-5 h-5 text-[#2D5A27]" />
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
              *नोट: ये भाव अनुमानित हैं और इंटरनेट से एकत्रित किए गए हैं। मंडी में माल ले जाने से पहले स्थानीय स्तर पर पुष्टि अवश्य करें। ताज़ा अपडेट के लिए रिफ्रेश बटन का उपयोग करें।
            </p>
          </div>

          <button 
            onClick={() => loadData(selectedMandi)}
            className="w-full py-4 rounded-2xl border-2 border-[#2D5A27] text-[#2D5A27] font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-[#2D5A27]/5"
          >
            <RefreshCw className="w-4 h-4" /> ताज़ा भाव प्राप्त करें (Refresh)
          </button>
        </motion.div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mx-1">
          <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-400">डेटा उपलब्ध नहीं है। कृपया नेटवर्क चेक करें।</p>
        </div>
      )}
    </div>
  );
};

export default MandiBhav;
