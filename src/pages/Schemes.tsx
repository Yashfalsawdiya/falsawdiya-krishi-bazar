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
  Key, 
  Search, 
  ShieldCheck, 
  Award, 
  Sparkles, 
  Tag, 
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ApiKeyModal from '../components/ApiKeyModal';
import useAiGuard from '../hooks/useAiGuard';

type FilterType = 'all' | 'central' | 'state' | 'subsidy' | 'irrigation' | 'credit';

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
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
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
      // 1. Text Search Match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        scheme.title.toLowerCase().includes(q) ||
        scheme.description.toLowerCase().includes(q) ||
        scheme.sector.toLowerCase().includes(q) ||
        scheme.subsidyDetails?.toLowerCase().includes(q) ||
        scheme.eligibility?.toLowerCase().includes(q) ||
        (Array.isArray(scheme.benefits) && scheme.benefits.some(b => b.toLowerCase().includes(q)))
      );

      if (!matchesSearch) return false;

      // 2. Category Tab Filter
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'central') {
        return scheme.governmentLevel?.toLowerCase().includes('central');
      }
      if (selectedFilter === 'state') {
        return scheme.governmentLevel?.toLowerCase().includes('state') || scheme.governmentLevel?.toLowerCase().includes('mp');
      }
      if (selectedFilter === 'subsidy') {
        const text = `${scheme.sector} ${scheme.title} ${scheme.subsidyDetails}`.toLowerCase();
        return text.includes('यंत्र') || text.includes('ट्रैक्टर') || text.includes('सब्सिडी') || text.includes('अनुदान') || text.includes('machin');
      }
      if (selectedFilter === 'irrigation') {
        const text = `${scheme.sector} ${scheme.title} ${scheme.subsidyDetails}`.toLowerCase();
        return text.includes('सिंचाई') || text.includes('सोलर') || text.includes('पंप') || text.includes('ड्रिप') || text.includes('solar');
      }
      if (selectedFilter === 'credit') {
        const text = `${scheme.sector} ${scheme.title} ${scheme.subsidyDetails}`.toLowerCase();
        return text.includes('ऋण') || text.includes('बीमा') || text.includes('क्रेडिट') || text.includes('kcc') || text.includes('पेंशन');
      }
      return true;
    });
  }, [schemes, searchQuery, selectedFilter]);

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
      <div className="bg-gradient-to-br from-[#2D5A27] to-[#1E3D1A] rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <Landmark className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">सरकारी योजनाएं</h1>
              <p className="text-[11px] text-emerald-100">केंद्र एवं राज्य सरकार की किसान कल्याणकारी योजनाएं</p>
            </div>
          </div>

          <button 
            onClick={handleSyncClick}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 active:scale-95 transition-all px-3 py-2 rounded-2xl border border-white/20 backdrop-blur-sm shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
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
              className="mt-2 text-xs bg-emerald-800/80 border border-emerald-400/40 text-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{syncStatus}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-emerald-200 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="योजना खोजें... (जैसे: सोलर पंप, ट्रैक्टर, बीमा, खाद, KCC)"
            className="w-full bg-white/10 border border-white/20 focus:border-white/40 focus:bg-white/15 text-white placeholder-emerald-200/70 text-xs rounded-2xl pl-9 pr-9 py-2.5 outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors border ${
            selectedFilter === 'all'
              ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#2D5A27]/30'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>सभी ({schemes.length})</span>
        </button>

        <button
          onClick={() => setSelectedFilter('central')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors border ${
            selectedFilter === 'central'
              ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#2D5A27]/30'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-blue-600" />
          <span>भारत सरकार</span>
        </button>

        <button
          onClick={() => setSelectedFilter('state')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors border ${
            selectedFilter === 'state'
              ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#2D5A27]/30'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
          <span>मध्य प्रदेश</span>
        </button>

        <button
          onClick={() => setSelectedFilter('subsidy')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors border ${
            selectedFilter === 'subsidy'
              ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#2D5A27]/30'
          }`}
        >
          <Tag className="w-3.5 h-3.5 text-emerald-600" />
          <span>यंत्र व सब्सिडी</span>
        </button>

        <button
          onClick={() => setSelectedFilter('irrigation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors border ${
            selectedFilter === 'irrigation'
              ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#2D5A27]/30'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
          <span>सिंचाई व सोलर</span>
        </button>

        <button
          onClick={() => setSelectedFilter('credit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors border ${
            selectedFilter === 'credit'
              ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#2D5A27]/30'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-purple-600" />
          <span>ऋण व बीमा</span>
        </button>
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
            कृपया अपने सर्च शब्द बदलें अथवा 'सभी' फ़िल्टर चुनें।
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
            className="px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-transform"
          >
            सभी योजनाएं देखें
          </button>
        </div>
      ) : (
        /* Schemes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSchemes.map((scheme, idx) => (
            <motion.div
              key={`${scheme.title}-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              onClick={() => setSelectedScheme(scheme)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all hover:border-[#2D5A27]/30 hover:shadow-md"
            >
              <div>
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {scheme.isNew && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" /> नई योजना
                    </span>
                  )}

                  {scheme.governmentLevel && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                      scheme.governmentLevel.toLowerCase().includes('central') 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {scheme.governmentLevel.toLowerCase().includes('central') ? (
                        <>
                          <Award className="w-2.5 h-2.5" />
                          <span>भारत सरकार</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>मध्य प्रदेश</span>
                        </>
                      )}
                    </span>
                  )}

                  {scheme.sector && (
                    <span className="text-[9px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100">
                      {scheme.sector}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1.5">
                  {scheme.title}
                </h3>

                {/* Description */}
                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                  {scheme.description}
                </p>
              </div>

              {/* Subsidy Highlight & Bottom bar */}
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold text-[#2D5A27] bg-[#2D5A27]/8 px-2.5 py-1 rounded-lg truncate">
                  {scheme.subsidyDetails ? `सहायता: ${scheme.subsidyDetails}` : 'लाभार्थी योजना'}
                </div>
                <div className="flex items-center text-[10px] font-bold text-gray-400 shrink-0">
                  <span>विवरण</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* AI Key Advisory (Non-blocking, helpful footer) */}
      <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>ताज़ा योजनाओं का केंद्रीकृत सर्वर सिंक सक्रिय है (सभी किसानों हेतु निःशुल्क)।</span>
        </div>
        <button
          onClick={() => requireApiKey("नवीनतम योजनाएं खोजने के लिए कृपया अपनी Gemini API Key सक्रिय करें।")}
          className="text-[11px] font-bold text-[#2D5A27] hover:underline shrink-0"
        >
          {effectiveApiKey ? 'API Key सक्रिय' : 'AI Key जोड़ें'}
        </button>
      </div>

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
