import React, { useEffect, useState } from 'react';
import { fetchSchemes, Scheme } from '../services/schemeService';
import { motion } from 'motion/react';
import { Landmark, ChevronRight, Info, Loader2, ExternalLink, RefreshCw, X, Key } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ApiKeyModal from '../components/ApiKeyModal';

const Schemes: React.FC = () => {
  const { userSettings, loading: appLoading } = useAppContext();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const loadSchemes = async (force: boolean = false) => {
    if (appLoading) return;

    if (!userSettings?.geminiApiKey) {
      setErrorMessage(undefined);
      setIsModalOpen(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchSchemes(userSettings?.geminiApiKey, force);
      setSchemes(data);
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
      loadSchemes(false);
    }
  }, [appLoading, userSettings?.geminiApiKey]);

  return (
    <div className="space-y-6 pb-10">
      <ApiKeyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        message={errorMessage}
      />
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728] flex items-center justify-center gap-2">
          <Landmark className="w-6 h-6 text-[#2D5A27]" />
          सरकारी योजनाएं (Govt Schemes)
        </h2>
        <p className="text-sm text-gray-500">किसानों के लिए लाभकारी योजनाएं</p>
        <button 
          onClick={() => loadSchemes(true)}
          className="mt-2 text-[10px] font-bold text-[#2D5A27] flex items-center gap-1 mx-auto bg-[#2D5A27]/5 px-3 py-1 rounded-full border border-[#2D5A27]/10 active:scale-95 transition-transform"
        >
          <RefreshCw className="w-3 h-3" /> ताज़ा करें (Refresh)
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
          <p className="text-sm font-bold text-gray-500 text-center px-6">
            नवीनतम सरकारी योजनाएं खोजी जा रही हैं... <br/>
            (Fetching latest schemes)
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
                <div className="overflow-hidden flex-1">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {scheme.governmentLevel && (
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                        scheme.governmentLevel.toLowerCase().includes('central') 
                          ? 'bg-blue-50 text-blue-600 border-blue-100' 
                          : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {scheme.governmentLevel.toLowerCase().includes('central') ? 'केंद्र सरकार' : 'राज्य सरकार'}
                      </span>
                    )}
                    {scheme.sector && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100">
                        {scheme.sector}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800 text-xs leading-tight mb-1">{scheme.title}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-2">{scheme.description}</p>
                  
                  {scheme.subsidyDetails && (
                    <div className="mt-2 text-[9px] font-medium text-[#2D5A27] bg-[#2D5A27]/5 px-2 py-0.5 rounded-md inline-block">
                      सहायता: {scheme.subsidyDetails}
                    </div>
                  )}
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-gray-100 relative shrink-0">
              <button 
                onClick={() => setSelectedScheme(null)} 
                className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full transition-colors"
                id="close-scheme-modal"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="space-y-3 pr-8">
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${
                    selectedScheme.governmentLevel?.toLowerCase().includes('central') 
                      ? 'bg-blue-50 text-blue-600 border-blue-100' 
                      : 'bg-orange-50 text-orange-600 border-orange-100'
                  }`}>
                    {selectedScheme.governmentLevel?.toLowerCase().includes('central') ? 'भारत सरकार (Central)' : 'राज्य सरकार (State)'}
                  </span>
                  <span className="text-[10px] font-bold px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 uppercase tracking-wider">
                    {selectedScheme.sector}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#2D5A27] leading-tight mt-1">{selectedScheme.title}</h3>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 pt-4 space-y-6 overflow-y-auto custom-scrollbar">
              <section className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-[#2D5A27] rounded-full" />
                  <h4 className="text-sm font-bold text-gray-800">उद्देश्य (Objective)</h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {selectedScheme.objective || selectedScheme.description}
                </p>
              </section>

              <div className="grid grid-cols-1 gap-6">
                <section className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                    <h4 className="text-sm font-bold text-gray-800">लाभ एवं सहायता (Benefits & Subsidy)</h4>
                  </div>
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                    <p className="text-sm font-bold text-blue-700 underline decoration-blue-200 underline-offset-4">
                      {selectedScheme.subsidyDetails}
                    </p>
                    <ul className="space-y-2">
                      {selectedScheme.benefits.map((benefit, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2 italic">
                          <span className="text-blue-500 font-bold">•</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                    <h4 className="text-sm font-bold text-gray-800">पात्रता (Eligibility)</h4>
                  </div>
                  <p className="text-sm text-gray-600 bg-orange-50/30 p-3 rounded-xl border border-orange-100">
                    {selectedScheme.eligibility}
                  </p>
                </section>

                {selectedScheme.requiredDocuments && selectedScheme.requiredDocuments.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
                      <h4 className="text-sm font-bold text-gray-800">आवश्यक दस्तावेज (Required Documents)</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedScheme.requiredDocuments.map((doc, i) => (
                        <span key={i} className="text-[11px] bg-purple-50 text-purple-700 px-3 py-1 rounded-lg border border-purple-100 font-medium italic">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-4 bg-teal-500 rounded-full" />
                    <h4 className="text-sm font-bold text-gray-800">आवेदन प्रक्रिया (How to Apply)</h4>
                  </div>
                  <div className="text-sm text-gray-600 bg-teal-50/30 p-3 rounded-xl border border-teal-100 leading-relaxed italic">
                    {selectedScheme.howToApply}
                  </div>
                </section>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-2 shrink-0">
              {selectedScheme.link && (
                <a 
                  href={selectedScheme.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 bg-[#2D5A27] text-white rounded-2xl font-bold text-base shadow-lg shadow-[#2D5A27]/20 active:scale-[0.98] transition-transform"
                  id="scheme-apply-link"
                >
                  आधिकारिक वेबसाइट पर जाएँ <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Schemes;
