import React, { useState } from 'react';
import { 
  SlidersHorizontal, Eye, EyeOff, CheckCircle2, Zap, 
  RotateCcw, Sparkles, Shield, Info, Check, Search
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { APP_FEATURES, AppFeature } from '../config/features';
import { cn } from '../lib/utils';

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
      return f.name.toLowerCase().includes(q) || 
             f.englishName.toLowerCase().includes(q) || 
             f.description.toLowerCase().includes(q);
    }
    return true;
  });

  const enabledCount = APP_FEATURES.filter(f => isFeatureEnabled(f.id)).length;
  const disabledCount = APP_FEATURES.length - enabledCount;

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200/90 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27] shrink-0 border border-[#2D5A27]/20">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  फ़ीचर्स नियंत्रण एवं दृश्यता (App Features Toggle)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  सेंट्रलाइज़्ड कंट्रोल
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-3xl leading-relaxed">
                यहाँ से आप ग्राहक ऐप के अलग-अलग फ़ीचर्स को एक क्लिक में दिखा (SHOW) या छिपा (HIDE) सकते हैं। जब कोई फ़ीचर छिपाया जाता है, तो वह होम पेज, हेडर मेन्यू और फ़ूटर से पूरी तरह छिप जाता है।
              </p>
            </div>
          </div>

          {/* Quick Push Button */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => forcePushAllUpdates()}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              title="सभी किसान भाइयों के ऐप में तुरंत नया फ़ीचर स्टेटस सिंक करें"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ तुरंत अपडेट पुश करें</span>
            </button>
          </div>
        </div>

        {/* Status Summary & Quick Batch Actions */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {enabledCount} चालू (SHOW)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-800 font-bold border border-red-200">
              <EyeOff className="w-3.5 h-3.5 text-red-600" />
              {disabledCount} छिपे हुए (HIDE)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetAll(true)}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-all cursor-pointer active:scale-95"
            >
              सभी चालू करें (Show All)
            </button>
            <button
              type="button"
              onClick={() => handleSetAll(false)}
              className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition-all cursor-pointer active:scale-95"
            >
              सभी छिपाएं (Hide All)
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              selectedCategory === 'all'
                ? "bg-[#2D5A27] text-white shadow-xs"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
            )}
          >
            सभी फ़ीचर्स ({APP_FEATURES.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('ai')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              selectedCategory === 'ai'
                ? "bg-[#2D5A27] text-white shadow-xs"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
            )}
          >
            AI टूल्स (3)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('service')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              selectedCategory === 'service'
                ? "bg-[#2D5A27] text-white shadow-xs"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
            )}
          >
            कृषि सेवाएं (4)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('utility')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              selectedCategory === 'utility'
                ? "bg-[#2D5A27] text-white shadow-xs"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
            )}
          >
            टूल्स व सहायता (5)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="फ़ीचर खोजें..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D5A27]"
          />
        </div>
      </div>

      {/* Live Save Indicator */}
      {savedSuccess && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>फ़ीचर सेटिंग सफलतापूर्वक सेव हो गई और क्लाउड पर अपडेट हो गई!</span>
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredFeatures.map((feature) => {
          const isEnabled = isFeatureEnabled(feature.id);
          const Icon = feature.icon;

          return (
            <div
              key={feature.id}
              className={cn(
                "bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-xs flex flex-col justify-between group",
                isEnabled
                  ? "border-gray-200/90 hover:border-[#2D5A27]/50 hover:shadow-md"
                  : "border-red-200/70 bg-red-50/20"
              )}
            >
              <div>
                {/* Top Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                      isEnabled
                        ? "bg-[#2D5A27]/10 text-[#2D5A27] border-[#2D5A27]/20"
                        : "bg-red-50 text-red-600 border-red-200"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block",
                        feature.category === 'ai' 
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : feature.category === 'service'
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      )}>
                        {feature.category === 'ai' ? 'AI फ़ीचर' : feature.category === 'service' ? 'कृषि सेवा' : 'यूटिलिटी टूल'}
                      </span>
                    </div>
                  </div>

                  {/* Route Pill */}
                  <span className="text-[10px] font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200/80">
                    {feature.route}
                  </span>
                </div>

                {/* Title & English Name */}
                <h3 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-[#2D5A27] transition-colors leading-snug">
                  {feature.name}
                </h3>
                <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                  {feature.englishName}
                </p>

                {/* Description */}
                <p className="text-xs text-gray-600 mt-2 leading-relaxed font-normal">
                  {feature.description}
                </p>
              </div>

              {/* Action / Toggle Footer */}
              <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-col gap-2.5">
                {/* Live Status indicator */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">वर्तमान स्थिति:</span>
                  {isEnabled ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Eye className="w-3 h-3 text-emerald-600" />
                      ग्राहकों को दिख रहा है (SHOW)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                      <EyeOff className="w-3 h-3 text-red-600" />
                      ग्राहकों से छिपा हुआ (HIDE)
                    </span>
                  )}
                </div>

                {/* Big Tactile Toggle Button Group */}
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleToggle(feature.id, true)}
                    disabled={saving}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      isEnabled
                        ? "bg-[#2D5A27] text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>दिखाएं (SHOW)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(feature.id, false)}
                    disabled={saving}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      !isEnabled
                        ? "bg-red-600 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    )}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>छिपाएं (HIDE)</span>
                  </button>
                </div>

                {/* Subtext info */}
                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                  <Shield className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>एडमिन बाईपास: एडमिन हमेशा इस फ़ीचर को देख व टेस्ट कर सकते हैं।</span>
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
