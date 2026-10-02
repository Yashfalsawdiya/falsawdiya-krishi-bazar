import React, { useEffect, useState, useMemo } from 'react';
import { fetchSchemes, Scheme } from '../services/schemeService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, 
  ChevronRight, 
  Loader2, 
  ExternalLink, 
  RefreshCw, 
  X, 
  Search, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ApiKeyModal from '../components/ApiKeyModal';
import useAiGuard from '../hooks/useAiGuard';

const Schemes: React.FC = () => {
  const { loading: appLoading } = useAppContext();
  const { 
    apiKey: effectiveApiKey, 
    requireApiKey, 
    isApiKeyModalOpen, 
    apiKeyModalMessage, 
    closeApiKeyModal 
  } = useAiGuard();
  
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const loadSchemes = async (force: boolean = false) => {
    if (appLoading) return;
    if (force) {
      setRefreshing(true);
    } else if (schemes.length === 0) {
      setLoading(true);
    }

    try {
      const data = await fetchSchemes(effectiveApiKey, force);
      if (Array.isArray(data) && data.length > 0) {
        setSchemes(data);
        if (force) {
          setSyncStatus('सभी सरकारी योजनाएं सफलतापूर्वक अपडेट की गईं');
          setTimeout(() => setSyncStatus(null), 3500);
        }
      }
    } catch (error: any) {
      console.error('[Schemes] Load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!appLoading) {
      loadSchemes(false);
    }
  }, [appLoading, effectiveApiKey]);

  // Filter & Search Logic
  const filteredSchemes = useMemo(() => {
    return schemes.filter((scheme) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        scheme.title.toLowerCase().includes(q) ||
        scheme.description.toLowerCase().includes(q) ||
        scheme.sector.toLowerCase().includes(q) ||
        scheme.subsidyDetails?.toLowerCase().includes(q) ||
        scheme.eligibility?.toLowerCase().includes(q) ||
        (Array.isArray(scheme.benefits) && scheme.benefits.some(b => b.toLowerCase().includes(q)))
      );
    });
  }, [schemes, searchQuery]);

  const handleSyncClick = () => {
    loadSchemes(true);
  };

  return (
    <div className="space-y-5 pb-12 px-1">
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={closeApiKeyModal} 
        message={apiKeyModalMessage}
      />

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center border border-emerald-100/60">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900">सरकारी योजनाएं</h1>
              <p className="text-[11px] text-gray-500 font-medium">केंद्र एवं राज्य सरकार की किसान कल्याणकारी योजनाएं</p>
            </div>
          </div>

          <button 
            onClick={handleSyncClick}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all px-3 py-2 rounded-2xl border border-gray-200 text-gray-700 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#2D5A27] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'सर्च हो रहा है...' : 'ताज़ा करें'}</span>
          </button>
        </div>

        {/* Sync Status Toast */}
        <AnimatePresence>
          {syncStatus && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatus}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="योजना खोजें... (जैसे: सोलर पंप, ट्रैक्टर, बीमा, खाद, KCC)"
            className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white text-gray-800 placeholder-gray-400 text-xs rounded-2xl pl-9 pr-9 py-2.5 outline-none transition-all shadow-xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>



      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Loader2 className="w-8 h-8 text-[#2D5A27] animate-spin" />
          <p className="text-xs font-semibold text-gray-600 text-center">
            सत्यापित सरकारी योजनाएं लोड हो रही हैं...
          </p>
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-800 mb-1">कोई योजना नहीं मिली</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
            कृपया अपने सर्च शब्द बदलकर पुनः प्रयास करें।
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-transform"
          >
            सभी योजनाएं देखें
          </button>
        </div>
      ) : (
        /* Schemes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSchemes.map((scheme, idx) => {
            const isCentral = scheme.governmentLevel?.toLowerCase().includes('central');
            return (
              <motion.div
                key={`${scheme.title}-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                onClick={() => setSelectedScheme(scheme)}
                className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_24px_-6px_rgba(45,90,39,0.12)] border border-gray-100 hover:border-[#2D5A27]/30 flex flex-col justify-between cursor-pointer transition-all duration-200 active:scale-[0.99] group relative overflow-hidden"
              >
                {/* Top Subtle Accent Bar on hover */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#2D5A27]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Modern Pill Tags Row matching user screenshots */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {scheme.governmentLevel && (
                      <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full border inline-flex items-center ${
                        isCentral 
                          ? 'bg-blue-50/80 text-blue-600 border-blue-200' 
                          : 'bg-orange-50/80 text-orange-700 border-orange-200'
                      }`}>
                        {isCentral ? 'भारत सरकार (Central)' : 'मध्य प्रदेश (State)'}
                      </span>
                    )}

                    {scheme.sector && (
                      <span className="text-[11px] font-bold px-3 py-0.5 bg-emerald-50/80 text-emerald-700 rounded-full border border-emerald-200 inline-flex items-center">
                        {scheme.sector}
                      </span>
                    )}

                    {scheme.isNew && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 inline-flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" /> नई योजना
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-gray-900 text-sm sm:text-[15px] leading-snug group-hover:text-[#2D5A27] transition-colors mb-1.5 line-clamp-2">
                    {scheme.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[11.5px] text-gray-500 line-clamp-2 leading-relaxed">
                    {scheme.description}
                  </p>
                </div>

                {/* Subsidy Highlight & Bottom bar */}
                <div className="mt-3.5 pt-3 border-t border-gray-100/90 flex items-center justify-between gap-2">
                  <div className="text-[10.5px] font-semibold text-[#2D5A27] bg-[#2D5A27]/8 px-2.5 py-1 rounded-lg border border-[#2D5A27]/10 truncate max-w-[72%] flex items-center gap-1.5">
                    <span className="truncate">{scheme.subsidyDetails ? `सहायता: ${scheme.subsidyDetails}` : 'लाभार्थी योजना'}</span>
                  </div>
                  <div className="flex items-center text-[11px] font-bold text-gray-400 group-hover:text-[#2D5A27] transition-colors shrink-0">
                    <span>विवरण</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5 text-gray-400 group-hover:text-[#2D5A27] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}



      {/* Modal for Scheme Details */}
      <AnimatePresence>
        {selectedScheme && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100"
            >
              {/* Modal Header */}
              <div className="p-5 pb-3 border-b border-gray-100 relative shrink-0 bg-gradient-to-r from-emerald-50/50 to-white">
                <button 
                  onClick={() => setSelectedScheme(null)} 
                  className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 shadow-xs transition-colors"
                  id="close-scheme-modal"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="space-y-2 pr-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedScheme.governmentLevel?.toLowerCase().includes('central') 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {selectedScheme.governmentLevel?.toLowerCase().includes('central') ? 'भारत सरकार (Central)' : 'मध्य प्रदेश (State)'}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                      {selectedScheme.sector}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D5A27] leading-tight">
                    {selectedScheme.title}
                  </h3>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-5 pt-3 space-y-4 overflow-y-auto custom-scrollbar text-xs">
                {/* Objective */}
                <section className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-3.5 bg-[#2D5A27] rounded-full" />
                    <h4 className="font-bold text-gray-800">उद्देश्य (Objective)</h4>
                  </div>
                  <p className="text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    {selectedScheme.objective || selectedScheme.description}
                  </p>
                </section>

                {/* Benefits & Subsidies */}
                <section className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-3.5 bg-blue-500 rounded-full" />
                    <h4 className="font-bold text-gray-800">लाभ एवं सहायता (Benefits & Subsidy)</h4>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-2">
                    <p className="font-bold text-blue-700 text-xs">
                      {selectedScheme.subsidyDetails}
                    </p>
                    {Array.isArray(selectedScheme.benefits) && selectedScheme.benefits.length > 0 && (
                      <ul className="space-y-1.5 pt-1">
                        {selectedScheme.benefits.map((benefit, i) => (
                          <li key={i} className="text-gray-700 flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold shrink-0">•</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                {/* Eligibility */}
                <section className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-3.5 bg-orange-500 rounded-full" />
                    <h4 className="font-bold text-gray-800">पात्रता (Eligibility)</h4>
                  </div>
                  <p className="text-gray-600 bg-orange-50/40 p-2.5 rounded-xl border border-orange-100 leading-relaxed">
                    {selectedScheme.eligibility}
                  </p>
                </section>

                {/* Documents */}
                {selectedScheme.requiredDocuments && selectedScheme.requiredDocuments.length > 0 && (
                  <section className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-3.5 bg-purple-500 rounded-full" />
                      <h4 className="font-bold text-gray-800">आवश्यक दस्तावेज (Required Documents)</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {selectedScheme.requiredDocuments.map((doc, i) => (
                        <span key={i} className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-100 font-medium">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* How to Apply */}
                <section className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-3.5 bg-teal-500 rounded-full" />
                    <h4 className="font-bold text-gray-800">आवेदन प्रक्रिया (How to Apply)</h4>
                  </div>
                  <div className="text-gray-600 bg-teal-50/40 p-2.5 rounded-xl border border-teal-100 leading-relaxed">
                    {selectedScheme.howToApply}
                  </div>
                </section>
              </div>

              {/* Modal Footer */}
              <div className="p-4 pt-2 border-t border-gray-100 shrink-0 bg-gray-50/50">
                {selectedScheme.link ? (
                  <a 
                    href={selectedScheme.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#2D5A27] text-white rounded-xl font-bold text-xs shadow-md shadow-[#2D5A27]/20 active:scale-[0.98] transition-all hover:bg-[#23471e]"
                    id="scheme-apply-link"
                  >
                    <span>आधिकारिक सरकारी वेबसाइट पर जाएँ</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <button
                    onClick={() => setSelectedScheme(null)}
                    className="w-full py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                  >
                    बंद करें
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Schemes;
