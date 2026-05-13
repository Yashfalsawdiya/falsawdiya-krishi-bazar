import React, { useEffect, useState } from 'react';
import { fetchSchemes, Scheme } from '../services/schemeService';
import { motion } from 'motion/react';
import { Landmark, ChevronRight, Info, Loader2, ExternalLink, RefreshCw, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ApiKeyModal from '../components/ApiKeyModal';

const Schemes: React.FC = () => {
  const { userSettings } = useAppContext();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

  const loadSchemes = async (force: boolean = false) => {
    if (!userSettings?.geminiApiKey) {
      setIsModalOpen(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchSchemes(userSettings.geminiApiKey, force);
      setSchemes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemes(false);
  }, [userSettings?.geminiApiKey]);

  return (
    <div className="space-y-6 pb-10">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728] flex items-center justify-center gap-2">
          <Landmark className="w-6 h-6 text-[#2D5A27]" />
          सरकारी योजनाएं (Govt Schemes)
        </h2>
        <p className="text-sm text-gray-500">किसानों के लिए लाभकारी योजनाएं</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-l-4 border-blue-600 rounded-xl p-4 shadow-sm space-y-2"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-800 leading-normal">
              📢 सरकारी कृषि योजनाएँ प्रतिदिन सुबह 10:00 बजे अपडेट की जाती हैं।
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              यदि सरकार द्वारा कोई नई कृषि योजना, सब्सिडी या किसान लाभ योजना जारी की जाती है, तो वह स्वतः यहाँ दिखाई देने लगेगी।
            </p>
            <p className="text-[10px] text-blue-600 font-medium italic leading-relaxed pt-1 border-t border-gray-100">
              आपके लिए कृषि से जुड़ी सरकारी योजनाएँ इंटरनेट के विभिन्न स्रोतों से खोजी और एकत्रित की जा रही हैं, ताकि आपको समय पर नई और उपयोगी जानकारी मिल सके। 🌾
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
          <p className="text-sm font-bold text-gray-500 text-center px-6">
            डेटा लोड हो रहा है, कृपया प्रतीक्षा करें...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {schemes.map((scheme: any, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedScheme(scheme)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2D5A27]/10 rounded-xl flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-[#2D5A27]" />
                </div>
                <div className="overflow-hidden">
                  <div className="flex flex-wrap gap-1 mb-0.5">
                    {scheme.category && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                        {scheme.category}
                      </span>
                    )}
                    {scheme.type && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                        {scheme.type}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800 text-xs leading-tight mb-0.5">{scheme.title}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-1">{scheme.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal for Scheme Details */}
      {selectedScheme && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#2D5A27] leading-tight">{selectedScheme.title}</h3>
                  <div className="flex gap-2">
                    {selectedScheme.category && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 uppercase tracking-wide">
                        {selectedScheme.category}
                      </span>
                    )}
                    {selectedScheme.type && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100 uppercase tracking-wide">
                        {selectedScheme.type}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedScheme(null)} className="p-1 -mr-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <section>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">विवरण (Description)</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedScheme.description}</p>
                </section>

                <section>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">लाभ (Benefits)</h4>
                  <ul className="space-y-1">
                    {selectedScheme.benefits.map((benefit, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-[#2D5A27] rounded-full mt-1.5 shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">पात्रता (Eligibility)</h4>
                  <p className="text-sm text-gray-600">{selectedScheme.eligibility}</p>
                </section>

                <section>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">आवेदन कैसे करें (How to Apply)</h4>
                  <p className="text-sm text-gray-600">{selectedScheme.howToApply}</p>
                </section>

                {selectedScheme.link && (
                  <a 
                    href={selectedScheme.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#2D5A27] text-white rounded-xl font-bold text-sm"
                  >
                    आधिकारिक वेबसाइट <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      <ApiKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Schemes;
