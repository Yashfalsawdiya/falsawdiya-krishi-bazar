import React, { useEffect, useState } from 'react';
import { fetchMandiBhav, MandiData, MandiItem } from '../services/mandiService';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Calendar, MapPin, Loader2, RefreshCw, AlertCircle, ChevronDown, ChevronUp, LineChart as ChartIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const MandiBhav: React.FC = () => {
  const { userSettings } = useAppContext();
  const [data, setData] = useState<MandiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMandi, setSelectedMandi] = useState('शामगढ़ (Shamgarh)');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<7 | 15 | 30>(7);

  const mandis = [
    'शामगढ़ (Shamgarh)',
    'मंदसौर (Mandsaur)',
    'नीमच (Neemuch)',
    'रतलाम (Ratlam)'
  ];

  const loadData = async (mandi: string) => {
    setLoading(true);
    try {
      const result = await fetchMandiBhav(mandi, userSettings?.geminiApiKey);
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

  const toggleExpand = (commodity: string) => {
    setExpandedItem(expandedItem === commodity ? null : commodity);
  };

  const getFilteredHistory = (history: any[]) => {
    if (!history) return [];
    return history.slice(-timeFilter);
  };

  const calculateStats = (history: any[]) => {
    if (!history || history.length === 0) return { high: 0, low: 0, avg: 0 };
    const prices = history
      .map(h => typeof h.price === 'string' ? parseInt(h.price) : h.price)
      .filter(p => !isNaN(p) && p !== undefined && p !== null);
      
    if (prices.length === 0) return { high: 0, low: 0, avg: 0 };
    
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    return { high, low, avg };
  };

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
                  onClick={() => toggleExpand(item.commodity)}
                  className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
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
                    {expandedItem === item.commodity ? <ChevronUp className="w-5 h-5 text-gray-300" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedItem === item.commodity && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-gray-50/50"
                    >
                      <div className="px-4 pb-6 pt-4 space-y-4">
                        {/* Time Period Selector */}
                        <div className="flex items-center justify-between pb-2">
                          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">बाज़ार का ट्रेंड (Market Trend)</h4>
                          <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                            {[7, 15, 30].map((days) => (
                              <button
                                key={days}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTimeFilter(days as 7 | 15 | 30);
                                }}
                                className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${
                                  timeFilter === days 
                                    ? "bg-[#2D5A27] text-white shadow-sm" 
                                    : "text-gray-400 hover:text-gray-600"
                                }`}
                              >
                                {days} दिन
                              </button>
                            ))}
                          </div>
                        </div>

                        {(() => {
                          const history = getFilteredHistory(item.history || []);
                          const stats = calculateStats(history);
                          const isUp = history.length >= 2 && history[history.length - 1].price >= history[0].price;
                          const chartColor = isUp ? '#22C55E' : '#EF4444'; // Green-500 or Red-500

                          return (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center">
                                  <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Highest (सबसे ऊँचा)</p>
                                  <p className="text-sm font-black text-[#2D5A27]">₹{stats.high}</p>
                                </div>
                                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center">
                                  <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Lowest (सबसे कम)</p>
                                  <p className="text-sm font-black text-red-500">₹{stats.low}</p>
                                </div>
                                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center">
                                  <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Average (औसत)</p>
                                  <p className="text-sm font-black text-orange-500">₹{stats.avg}</p>
                                </div>
                              </div>

                              <div className="h-48 w-full bg-white rounded-2xl p-2 pr-4 shadow-sm border border-gray-100">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={history}>
                                    <defs>
                                      <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis 
                                      dataKey="date" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fontSize: 8, fontWeight: 700, fill: '#9CA3AF' }}
                                    />
                                    <YAxis 
                                      hide={true}
                                      domain={['dataMin - 50', 'dataMax + 50']}
                                    />
                                    <Tooltip 
                                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 700 }}
                                      labelStyle={{ color: chartColor, marginBottom: '2px' }}
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="price" 
                                      stroke={chartColor} 
                                      strokeWidth={3}
                                      fillOpacity={1} 
                                      fill={`url(#gradient-${idx})`} 
                                      animationDuration={1000}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>

                              <div className="flex items-center justify-between px-2">
                                <p className={`text-[10px] font-bold flex items-center gap-1 ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                                  {isUp ? <TrendingUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 rotate-180" />}
                                  {timeFilter} दिनों में बाज़ार {isUp ? 'ऊपर' : 'नीचे'} गया है।
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold italic">
                                  *अंदाज़ित डेटा
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
