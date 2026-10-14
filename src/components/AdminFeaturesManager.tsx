import React, { useState } from 'react';
import { 
  SlidersHorizontal, Eye, EyeOff, CheckCircle2, Zap, 
  RotateCcw, Sparkles, Shield, Info, Check, Search,
  ExternalLink, Layers, TrendingUp, ArrowUpRight,
  ShieldCheck, CheckCircle, Activity, Lock, Unlock,
  Sliders, Radio
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { APP_FEATURES, AppFeature } from '../config/features';
import { cn } from '../lib/utils';

// Modern descriptive tags for each feature to replace plain boring text
const FEATURE_TAGS: Record<string, string[]> = {
  ai_product_knowledge: ['डोज़ कैलकुलेटर', 'उपयोग विधि', 'AI सलाह'],
  ai_call: ['रियल-टाइम वॉइस', 'Gemini Live', '24x7 कॉल'],
  disease: ['फोटो पहचान', 'पत्ती रोग', 'त्वरित समाधान'],
  mandi: ['दैनिक ताज़ा भाव', 'शामगढ़ मंडी', 'लाइव अपडेट'],
  weather: ['5-दिवसीय गाइड', 'वर्षा अलर्ट', 'तापमान'],
  schemes: ['सरकारी सब्सिडी', 'PM-किसान', 'कृषि यंत्र'],
  news: ['दैनिक कृषि समाचार', 'नवीनतम नीतियां', 'मंडी रिपोर्ट'],
  calculator: ['उर्वरक मात्रा', 'बीज दर', 'लागत बचत'],
  soil_testing: ['नमूना गाइड', 'लैब टेस्ट विधि', 'उर्वरता'],
  encyclopedia: ['कीट व रोग', 'लक्षण गाइड', 'नियंत्रण'],
  helpline: ['टोल-फ्री नंबर', 'आपातकालीन सेवा', 'वैज्ञानिक'],
  faq: ['ऑर्डर सहायता', 'डिलीवरी प्रश्न', 'त्वरित उत्तर'],
};

export const AdminFeaturesManager: React.FC = () => {
  const { appContent, updateAppContent, forcePushAllUpdates } = useAppContext();
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    return appContent?.featureToggles || {};
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ai' | 'service' | 'utility'>('all');

  // Sync if appContent changes
  React.useEffect(() => {
    if (appContent?.featureToggles) {
      setToggles(appContent.featureToggles);
    }
  }, [appContent?.featureToggles]);

  const isFeatureEnabled = (id: string): boolean => {
    if (toggles[id] === false) return false;
    return true; // Default is true (enabled)
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const updated = {
      ...toggles,
      [id]: enabled
    };
    setToggles(updated);

    // Save automatically to Firestore and update cache
    if (appContent) {
      setSaving(true);
      try {
        await updateAppContent({
          ...appContent,
          featureToggles: updated
        });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } catch (err) {
        console.error('Failed to update feature toggles:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSetAll = async (enabled: boolean) => {
    const updated: Record<string, boolean> = { ...toggles };
    APP_FEATURES.forEach(f => {
      updated[f.id] = enabled;
    });
    setToggles(updated);

    if (appContent) {
      setSaving(true);
      try {
        await updateAppContent({
          ...appContent,
          featureToggles: updated
        });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } catch (err) {
        console.error('Failed to update all feature toggles:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const filteredFeatures = APP_FEATURES.filter(f => {
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const tags = (FEATURE_TAGS[f.id] || []).join(' ').toLowerCase();
      return f.name.toLowerCase().includes(q) || 
             f.englishName.toLowerCase().includes(q) || 
             f.description.toLowerCase().includes(q) ||
             tags.includes(q);
    }
    return true;
  });

  const enabledCount = APP_FEATURES.filter(f => isFeatureEnabled(f.id)).length;
  const disabledCount = APP_FEATURES.length - enabledCount;

  return (
    <div className="space-y-6">
      {/* Modern Dashboard Header Info Card */}
      <div className="relative overflow-hidden bg-white p-5 sm:p-7 rounded-3xl border border-gray-200/90 shadow-sm">
        {/* Subtle background decoration */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-emerald-100/40 to-teal-100/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-gradient-to-tr from-amber-100/30 to-emerald-100/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D5A27] to-[#1e3d1a] flex items-center justify-center text-white shrink-0 shadow-md shadow-[#2D5A27]/20 border border-emerald-600/30">
              <Sliders className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  फ़ीचर्स नियंत्रण व दृश्यता (Features Toggle)
                </h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  लाइव स्विचबोर्ड
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
                यहाँ से आप ग्राहक ऐप के किसी भी फ़ीचर या पेज को एक क्लिक में चालू (SHOW) या छिपा (HIDE) सकते हैं। जब कोई फ़ीचर बंद किया जाता है, तो वह होम पेज, मेन्यू, फ़ूटर व डायरेक्ट लिंक सभी जगह से ब्लॉक हो जाता है।
              </p>
            </div>
          </div>

          {/* Quick Push Button */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => forcePushAllUpdates()}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95 border border-amber-400/40"
              title="सभी किसान भाइयों के ऐप में तुरंत नया फ़ीचर स्टेटस सिंक करें"
            >
              <Zap className="w-4 h-4 fill-white text-white" />
              <span>तुरंत अपडेट पुश करें (Force Push)</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="relative mt-6 pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 text-emerald-900 font-bold text-xs border border-emerald-200/80 shadow-2xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>{enabledCount} चालू (SHOW)</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50/90 text-rose-900 font-bold text-xs border border-rose-200/80 shadow-2xs">
              <EyeOff className="w-3.5 h-3.5 text-rose-600" />
              <span>{disabledCount} छिपे हुए (HIDE)</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-700 font-semibold text-xs border border-gray-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A27]" />
              <span>कुल {APP_FEATURES.length} फ़ीचर्स</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetAll(true)}
              className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl border border-emerald-200/80 transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              सभी चालू करें (Show All)
            </button>
            <button
              type="button"
              onClick={() => handleSetAll(false)}
              className="text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl border border-rose-200/80 transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              सभी छिपाएं (Hide All)
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
              selectedCategory === 'all'
                ? "bg-[#2D5A27] text-white shadow-xs"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
            )}
          >
            <span>सभी फ़ीचर्स</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-md text-[10px]",
              selectedCategory === 'all' ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            )}>
              {APP_FEATURES.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('ai')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
              selectedCategory === 'ai'
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-purple-50/60 text-purple-800 hover:bg-purple-100/60 border border-purple-200/60"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI टूल्स</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-md text-[10px]",
              selectedCategory === 'ai' ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
            )}>
              3
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('service')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
              selectedCategory === 'service'
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/60 border border-emerald-200/60"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>कृषि सेवाएं</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-md text-[10px]",
              selectedCategory === 'service' ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
            )}>
              4
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('utility')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
              selectedCategory === 'utility'
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-blue-50/60 text-blue-800 hover:bg-blue-100/60 border border-blue-200/60"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>टूल्स व सहायता</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-md text-[10px]",
              selectedCategory === 'utility' ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
            )}>
              5
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="फ़ीचर, नाम या टैग खोजें..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27]"
          />
        </div>
      </div>

      {/* Live Save Notification */}
      {savedSuccess && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-3 px-4 rounded-2xl flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
            <span>फ़ीचर सेटिंग क्लाउड पर सुरक्षित हो गई है। ऐप तुरंत अपडेट हो गया है!</span>
          </div>
        </div>
      )}

      {/* Modern Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredFeatures.map((feature) => {
          const isEnabled = isFeatureEnabled(feature.id);
          const Icon = feature.icon;
          const tags = FEATURE_TAGS[feature.id] || [];

          // Category styling helpers
          const isAi = feature.category === 'ai';
          const isService = feature.category === 'service';

          return (
            <div
              key={feature.id}
              className={cn(
                "relative bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow-xl hover:-translate-y-1",
                isEnabled
                  ? "border-gray-200/90 hover:border-[#2D5A27]/60"
                  : "border-rose-200/90 bg-gradient-to-b from-white via-rose-50/10 to-rose-50/20"
              )}
            >
              {/* Top Accent Gradient Bar */}
              <div 
                className={cn(
                  "h-1.5 w-full transition-all duration-300",
                  isEnabled
                    ? isAi 
                      ? "bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-500"
                      : isService
                      ? "bg-gradient-to-r from-[#2D5A27] via-emerald-500 to-teal-400"
                      : "bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400"
                    : "bg-gradient-to-r from-rose-500 via-red-500 to-amber-500"
                )} 
              />

              {/* Watermark Icon in background for high-end aesthetic */}
              <Icon 
                className={cn(
                  "w-28 h-28 absolute -top-4 -right-4 pointer-events-none select-none transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6",
                  isEnabled ? "text-gray-900/[0.03]" : "text-rose-900/[0.04]"
                )} 
              />

              <div className="p-5 sm:p-6 relative">
                {/* Header Row: Icon + Category Badge + Route Pill */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    {/* Rich Modern Squircle Icon Container */}
                    <div className={cn(
                      "w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-105 shadow-sm",
                      isEnabled
                        ? isAi
                          ? "bg-gradient-to-br from-purple-50 to-indigo-50 text-purple-700 border-purple-200/80 shadow-purple-500/10"
                          : isService
                          ? "bg-gradient-to-br from-emerald-50 to-teal-50 text-[#2D5A27] border-emerald-200/80 shadow-emerald-500/10"
                          : "bg-gradient-to-br from-blue-50 to-sky-50 text-blue-700 border-blue-200/80 shadow-blue-500/10"
                        : "bg-rose-50 text-rose-600 border-rose-200 shadow-rose-500/10"
                    )}>
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <div>
                      {/* Category Badge */}
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 shadow-2xs",
                        isAi 
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : isService
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      )}>
                        {isAi ? <Sparkles className="w-2.5 h-2.5" /> : isService ? <TrendingUp className="w-2.5 h-2.5" /> : <Layers className="w-2.5 h-2.5" />}
                        {isAi ? 'AI पावर्ड टूल' : isService ? 'कृषि लाइव सेवा' : 'यूटिलिटी टूल'}
                      </span>

                      {/* English Identifier */}
                      <p className="text-[11px] font-mono font-bold text-gray-400 mt-1 uppercase tracking-wider">
                        {feature.englishName}
                      </p>
                    </div>
                  </div>

                  {/* Route Pill with Open Link */}
                  <a
                    href={feature.route}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="पेज को नए टैब में खोलकर टेस्ट करें"
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-gray-500 hover:text-[#2D5A27] bg-gray-50 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-gray-200/90 hover:border-emerald-200 transition-colors cursor-pointer group/link shrink-0"
                  >
                    <span>{feature.route}</span>
                    <ArrowUpRight className="w-3 h-3 text-gray-400 group-hover/link:text-[#2D5A27] transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                  </a>
                </div>

                {/* Feature Name */}
                <h3 className="text-base sm:text-lg font-black text-gray-900 group-hover:text-[#2D5A27] transition-colors tracking-tight leading-snug">
                  {feature.name}
                </h3>

                {/* Structured Feature Description Card */}
                <div className="mt-3 p-3 rounded-2xl bg-gray-50/90 border border-gray-100/90 text-xs text-gray-600 leading-relaxed font-medium shadow-2xs">
                  <p>{feature.description}</p>
                </div>

                {/* Micro Keyword Tags */}
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100/80 text-gray-700 border border-gray-200/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Action & Control Footer */}
              <div className="p-5 sm:p-6 pt-0 relative">
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-3.5">
                  {/* Modern Status Strip */}
                  <div className="flex items-center justify-between text-xs bg-gray-50/80 p-2.5 rounded-2xl border border-gray-100">
                    <span className="text-gray-500 font-bold text-[11px]">वर्तमान स्थिति:</span>
                    {isEnabled ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-xl border border-emerald-300/80 shadow-2xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>ग्राहकों को सक्रिय (SHOW)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-xl border border-rose-300/80 shadow-2xs">
                        <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                        <span>ग्राहकों से छिपा हुआ (HIDE)</span>
                      </span>
                    )}
                  </div>

                  {/* Tactile Show/Hide Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200/60 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleToggle(feature.id, true)}
                      disabled={saving}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95",
                        isEnabled
                          ? "bg-gradient-to-r from-[#2D5A27] to-[#23481e] text-white shadow-md shadow-[#2D5A27]/20 border border-emerald-600/40"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/80"
                      )}
                    >
                      <Eye className="w-4 h-4" />
                      <span>दिखाएं (SHOW)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(feature.id, false)}
                      disabled={saving}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95",
                        !isEnabled
                          ? "bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-md shadow-rose-600/20 border border-rose-500/40"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/80"
                      )}
                    >
                      <EyeOff className="w-4 h-4" />
                      <span>छिपाएं (HIDE)</span>
                    </button>
                  </div>

                  {/* Admin Safe-Bypass Info */}
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium px-1">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
                      <span className="font-bold">एडमिन सुरक्षा: आपके लिए हमेशा खुला</span>
                    </div>

                    <a
                      href={feature.route}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-[#2D5A27] font-bold flex items-center gap-0.5 transition-colors"
                    >
                      <span>टेस्ट करें</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminFeaturesManager;
