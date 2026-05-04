import React, { useEffect, useState } from 'react';
import { fetchSchemes, Scheme } from '../services/schemeService';
import { motion } from 'motion/react';
import { Landmark, ChevronRight, Info, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Schemes: React.FC = () => {
  const { userSettings } = useAppContext();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

  const loadSchemes = async () => {
    setLoading(true);
    try {
      const data = await fetchSchemes(userSettings?.geminiApiKey);
      setSchemes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemes();
  }, [userSettings?.geminiApiKey]);

  return (
    <div className="space-y-6 pb-10">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728] flex items-center justify-center gap-2">
          <Landmark className="w-6 h-6 text-[#2D5A27]" />
          सरकारी योजनाएं (Govt Schemes)
        </h2>
        <p className="text-sm text-gray-500">किसानों के लिए लाभकारी योजनाएं</p>
        <button 
          onClick={loadSchemes}
          className="mt-2 text-[10px] font-bold text-[#2D5A27] flex items-center gap-1 mx-auto bg-[#2D5A27]/5 px-3 py-1 rounded-full border border-[#2D5A27]/10 active:scale-95 transition-transform"
        >
          <RefreshCw className="w-3 h-3" /> ताज़ा करें (Refresh)
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
          <p className="text-sm font-bold text-gray-500">योजनाएं लोड हो रही हैं...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schemes.map((scheme, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedScheme(scheme)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#2D5A27]/10 rounded-xl flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-[#2D5A27]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{scheme.title}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-1">{scheme.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
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
                <h3 className="text-lg font-bold text-[#2D5A27]">{selectedScheme.title}</h3>
                <button onClick={() => setSelectedScheme(null)} className="text-gray-400 font-bold text-xl">&times;</button>
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
    </div>
  );
};

export default Schemes;
