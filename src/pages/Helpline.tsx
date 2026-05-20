import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Phone, ArrowLeft, PhoneCall, Headphones, Zap, ShieldCheck, Droplets, Landmark, ShoppingBag, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

const Helpline: React.FC = () => {
  const navigate = useNavigate();
  const { helplines, loadHelplines } = useAppContext();

  useEffect(() => {
    const unsub = loadHelplines();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Grouping helplines by category
  const groupedHelplines = useMemo(() => {
    const groups: Record<string, typeof helplines> = {};
    
    // Sort helplines by order
    const sortedHelplines = [...helplines].sort((a, b) => a.order - b.order);

    sortedHelplines.forEach(hp => {
      if (!groups[hp.category]) {
        groups[hp.category] = [];
      }
      groups[hp.category].push(hp);
    });

    return groups;
  }, [helplines]);

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('दुकान')) return ShoppingBag;
    if (cat.includes('कृषि')) return Headphones;
    if (cat.includes('बिजली')) return Zap;
    if (cat.includes('बीमा')) return ShieldCheck;
    if (cat.includes('सिंचाई')) return Droplets;
    if (cat.includes('मंडी') || cat.includes('बैंक')) return Landmark;
    return Phone;
  };

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('दुकान')) return "bg-purple-100 text-purple-600";
    if (cat.includes('कृषि')) return "bg-green-100 text-green-600";
    if (cat.includes('बिजली')) return "bg-yellow-100 text-yellow-600";
    if (cat.includes('बीमा')) return "bg-orange-100 text-orange-600";
    if (cat.includes('सिंचाई')) return "bg-blue-100 text-blue-600";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">हेल्पलाइन डायरेक्टरी</h2>
      </div>

      <div className="bg-[#2D5A27] rounded-3xl p-6 text-white mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-lg font-bold">मदद के लिए डायल करें</h3>
          <p className="text-sm text-white/70 mt-1">आप किसी भी नंबर पर सीधे क्लिक करके कॉल कर सकते हैं।</p>
        </div>
        <PhoneCall className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
      </div>

      <div className="space-y-8">
        {Object.keys(groupedHelplines).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <p className="text-sm text-gray-400">जल्द ही नंबर अपडेट किए जाएंगे...</p>
          </div>
        ) : (
          Object.keys(groupedHelplines).map((category, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${getCategoryColor(category)}`}>
                  {React.createElement(getCategoryIcon(category), { className: "w-5 h-5" })}
                </div>
                <h4 className="font-bold text-gray-700">{category}</h4>
              </div>
              
              <div className="grid gap-3">
                {groupedHelplines[category].map((hp, i) => (
                  <motion.button
                    key={`${hp.id}-${i}`}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.location.href = `tel:${hp.number.replace(/[^0-9]/g, '')}`}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group transition-all"
                  >
                    <div className="text-left flex-1 min-w-0 pr-4">
                      <p className="font-bold text-gray-800 flex items-center gap-2 truncate">
                        {hp.name}
                      </p>
                      {hp.description && <p className="text-[10px] text-gray-400 font-medium truncate">{hp.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-[#2D5A27] font-mono whitespace-nowrap">{hp.number}</span>
                      <div className="bg-green-50 p-2 rounded-full group-hover:bg-[#2D5A27] group-hover:text-white transition-colors shrink-0">
                        <Phone className="w-4 h-4 text-green-600 group-hover:text-white" />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-6 text-center">
        <p className="text-sm font-bold text-yellow-800">ज़रूरी सूचना</p>
        <p className="text-xs text-yellow-700 mt-2 leading-relaxed">
          सभी टोल-फ्री नंबर सुबह 6 से रात 10 बजे तक सक्रिय रहते हैं। आपातकालीन स्थिति में 100 या 108 पर संपर्क करें।
        </p>
      </div>
    </div>
  );
};

export default Helpline;
