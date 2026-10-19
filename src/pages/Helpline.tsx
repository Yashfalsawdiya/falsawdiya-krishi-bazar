import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  ArrowLeft, 
  PhoneCall, 
  Headphones, 
  Zap, 
  ShieldCheck, 
  Droplets, 
  Landmark, 
  ShoppingBag, 
  Copy,
  Check,
  Clock,
  AlertCircle,
  MessageCircle,
  ShieldAlert,
  Info,
  Stethoscope,
  CloudSun,
  Share2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Helpline as HelplineType } from '../types';

// Standard verified default helplines ensuring complete offline & initial load coverage
const DEFAULT_HELPLINES: HelplineType[] = [
  { 
    id: 'def-1', 
    name: 'फल्सावदिया कृषि बाजार', 
    number: '8982338046', 
    category: 'हमारी दुकान', 
    description: 'पता: डिंपल चौराहा, शामगढ़ (म.प्र.) | समय: सुबह 8:00 से रात 8:00 बजे तक (खाद, बीज, कीटनाशक व कृषि उपकरण परामर्श)', 
    order: 1 
  },
  { 
    id: 'def-2', 
    name: 'किसान कॉल सेंटर (KCC)', 
    number: '1800-180-1551', 
    category: 'कृषि सेवाएं', 
    description: 'फसल उत्पादन, उन्नत बीज, कीट-रोग नियंत्रण एवं सरकारी योजनाओं की वैज्ञानिक सलाह हेतु 24 घंटे निःशुल्क टोल-फ्री सेवा', 
    order: 2 
  },
  { 
    id: 'def-3', 
    name: 'पशु चिकित्सा हेल्पलाइन', 
    number: '1962', 
    category: 'पशुपालन विभाग', 
    description: 'बीमार दुधारू पशुओं के उपचार, कृत्रिम गर्भाधान व पशु संजीवनी मोबाइल एम्बुलेंस सेवा हेतु तुरंत डायल करें', 
    order: 3 
  },
  { 
    id: 'def-4', 
    name: 'बिजली विभाग (ग्रामीण विद्युत आपूर्ति)', 
    number: '1912', 
    category: 'बिजली विभाग', 
    description: 'कृषि फीडर बिजली कटौती, ट्रांसफार्मर जलने या विद्युत लाइन फाल्ट की त्वरित ऑनलाइन शिकायत दर्ज कराने हेतु', 
    order: 4 
  },
  { 
    id: 'def-5', 
    name: 'मौसम विभाग हेल्पलाइन (IMD)', 
    number: '18001801717', 
    category: 'मौसम विभाग', 
    description: 'दैनिक मौसम पूर्वानुमान, ओलावृष्टि, भारी बारिश व तापमान चेतावनी की सटीक सरकारी रिपोर्ट', 
    order: 5 
  },
  { 
    id: 'def-6', 
    name: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)', 
    number: '18002095959', 
    category: 'फसल बीमा सहायता', 
    description: 'प्राकृतिक आपदा, बेमौसम बारिश से फसल नुकसान की 72 घंटे में सूचना, क्लेम सर्वे व बीमा स्थिति जानने हेतु', 
    order: 6 
  },
  { 
    id: 'def-7', 
    name: 'सिंचाई विभाग हेल्पलाइन (सीएम हेल्पलाइन)', 
    number: '181', 
    category: 'सिंचाई विभाग', 
    description: 'नहर जल वितरण, टेल क्षेत्र तक पानी पहुंचाने, डैम रिलीज व सिंचाई संबंधी समस्याओं के निवारण हेतु', 
    order: 7 
  },
  { 
    id: 'def-8', 
    name: 'मंडी हेल्पलाइन (मध्य प्रदेश)', 
    number: '07552550111', 
    category: 'मंडी हेल्पलाइन', 
    description: 'कृषि उपज मंडी दैनिक भाव, ई-अनुज्ञा, नीलामी नियम एवं उपार्जन से संबंधित अधिकृत जानकारी', 
    order: 8 
  },
  { 
    id: 'def-9', 
    name: 'राष्ट्रीय आपातकालीन सेवा (ERSS)', 
    number: '112', 
    category: 'आपातकालीन सेवाएँ', 
    description: 'सभी प्रकार की आपातकालीन परिस्थितियों (पुलिस, फायर ब्रिगेड, चिकित्सा) हेतु पूरे भारत में एकल नंबर', 
    order: 9 
  },
  { 
    id: 'def-10', 
    name: 'एम्बुलेंस स्वास्थ्य सेवा', 
    number: '108', 
    category: 'आपातकालीन सेवाएँ', 
    description: 'गंभीर बीमारी, दुर्घटना या प्रसूति आपातकाल में त्वरित 108 एम्बुलेंस सेवा प्राप्त करने हेतु', 
    order: 10 
  },
  { 
    id: 'def-11', 
    name: 'पुलिस सहायता', 
    number: '100', 
    category: 'आपातकालीन सेवाएँ', 
    description: 'ग्राम सुरक्षा, चोरी, विवाद या किसी भी कानूनी सुरक्षा सहायता हेतु तुरंत डायल करें', 
    order: 11 
  },
  { 
    id: 'def-12', 
    name: 'महिला हेल्पलाइन', 
    number: '1091', 
    category: 'महिला सुरक्षा', 
    description: 'महिला सुरक्षा, कानूनी परामर्श, घरेलू व सार्वजनिक सहायता हेतु 24 घंटे सक्रिय हेल्पलाइन', 
    order: 12 
  },
  { 
    id: 'def-13', 
    name: 'एसबीआई / KCC किसान सहायता', 
    number: '1800112211', 
    category: 'बैंक / केसीसी सहायता', 
    description: 'किसान क्रेडिट कार्ड (KCC), फसल ऋण, नवीनीकरण एवं ब्याज अनुदान संबंधित बैंक मार्गदर्शन', 
    order: 13 
  }
];

const Helpline: React.FC = () => {
  const navigate = useNavigate();
  const { helplines, loadHelplines } = useAppContext();

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('सभी');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = loadHelplines();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Use admin helplines if present, otherwise fallback to standard default list
  const activeHelplines = useMemo(() => {
    if (helplines && helplines.length > 0) {
      return [...helplines].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return DEFAULT_HELPLINES;
  }, [helplines]);

  // Extract unique categories
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    activeHelplines.forEach(h => {
      if (h.category) cats.add(h.category.trim());
    });
    return ['सभी', ...Array.from(cats)];
  }, [activeHelplines]);

  // Filtered helplines based on category
  const filteredHelplines = useMemo(() => {
    return activeHelplines.filter(hp => {
      return selectedCategory === 'सभी' || hp.category === selectedCategory;
    });
  }, [activeHelplines, selectedCategory]);

  // Copy phone number to clipboard with feedback
  const handleCopyNumber = (hp: HelplineType, e: React.MouseEvent) => {
    e.stopPropagation();
    const rawNumber = hp.number.replace(/[^0-9+]/g, '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(rawNumber);
      setCopiedId(hp.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Direct Call helper
  const handleCall = (number: string) => {
    const sanitized = number.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${sanitized}`;
  };

  const getCategoryTheme = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('दुकान') || cat.includes('स्टोर')) {
      return {
        icon: ShoppingBag,
        badgeBg: 'bg-emerald-50 text-[#183D16] border-emerald-200/70',
        iconBg: 'bg-emerald-100/70 text-[#183D16]',
        accentBorder: 'border-emerald-200'
      };
    }
    if (cat.includes('कृषि')) {
      return {
        icon: Headphones,
        badgeBg: 'bg-emerald-50 text-[#2D5A27] border-emerald-200/70',
        iconBg: 'bg-emerald-100/70 text-[#2D5A27]',
        accentBorder: 'border-emerald-200'
      };
    }
    if (cat.includes('पशु')) {
      return {
        icon: Stethoscope,
        badgeBg: 'bg-teal-50 text-teal-800 border-teal-200/70',
        iconBg: 'bg-teal-100/70 text-teal-800',
        accentBorder: 'border-teal-200'
      };
    }
    if (cat.includes('बिजली')) {
      return {
        icon: Zap,
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/70',
        iconBg: 'bg-amber-100/70 text-amber-800',
        accentBorder: 'border-amber-200'
      };
    }
    if (cat.includes('मौसम')) {
      return {
        icon: CloudSun,
        badgeBg: 'bg-sky-50 text-sky-800 border-sky-200/70',
        iconBg: 'bg-sky-100/70 text-sky-800',
        accentBorder: 'border-sky-200'
      };
    }
    if (cat.includes('बीमा')) {
      return {
        icon: ShieldCheck,
        badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200/70',
        iconBg: 'bg-indigo-100/70 text-indigo-800',
        accentBorder: 'border-indigo-200'
      };
    }
    if (cat.includes('सिंचाई')) {
      return {
        icon: Droplets,
        badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200/70',
        iconBg: 'bg-cyan-100/70 text-cyan-800',
        accentBorder: 'border-cyan-200'
      };
    }
    if (cat.includes('मंडी') || cat.includes('बैंक') || cat.includes('केसीसी')) {
      return {
        icon: Landmark,
        badgeBg: 'bg-purple-50 text-purple-800 border-purple-200/70',
        iconBg: 'bg-purple-100/70 text-purple-800',
        accentBorder: 'border-purple-200'
      };
    }
    if (cat.includes('आपातकालीन') || cat.includes('महिला') || cat.includes('सुरक्षा')) {
      return {
        icon: ShieldAlert,
        badgeBg: 'bg-rose-50 text-rose-800 border-rose-200/70',
        iconBg: 'bg-rose-100/70 text-rose-800',
        accentBorder: 'border-rose-200'
      };
    }
    return {
      icon: Phone,
      badgeBg: 'bg-slate-50 text-slate-800 border-slate-200/70',
      iconBg: 'bg-slate-100 text-slate-800',
      accentBorder: 'border-slate-200'
    };
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-1 sm:px-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl shadow-xs text-gray-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
            title="वापस जाएँ (Back)"
            aria-label="वापस जाएँ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                हेल्पलाइन डायरेक्टरी
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#2D5A27]/10 text-[#2D5A27] border border-[#2D5A27]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                सत्यापित संपर्क
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
              किसान सहायता, सरकारी विभाग, दुकान संपर्क एवं आपातकालीन नंबर
            </p>
          </div>
        </div>

        {/* Emergency Quick Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-rose-50 border border-rose-200/80 px-3 py-1.5 rounded-xl text-rose-900 text-xs font-bold">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>आपातकाल: 112 / 108 पर तुरंत कॉल करें</span>
        </div>
      </div>


      {/* Category Filter Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200/80 shadow-xs">
        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categoriesList.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#2D5A27] text-white shadow-xs'
                    : 'bg-gray-100/80 hover:bg-gray-200 text-gray-700 border border-transparent'
                }`}
              >
                <span>{cat}</span>
                {cat === 'सभी' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {activeHelplines.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Helpline Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2D5A27]" />
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              {selectedCategory === 'सभी' ? 'सभी हेल्पलाइन नंबर' : `${selectedCategory} के नंबर`}
            </h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              {filteredHelplines.length} उपलब्ध
            </span>
          </div>

          {selectedCategory !== 'सभी' && (
            <button
              onClick={() => setSelectedCategory('सभी')}
              className="text-xs font-bold text-[#2D5A27] hover:underline flex items-center gap-1 cursor-pointer"
            >
              रीसेट करें
            </button>
          )}
        </div>

        {filteredHelplines.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800 text-base">कोई हेल्पलाइन नंबर नहीं मिला</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              इस श्रेणी में वर्तमान में कोई हेल्पलाइन नंबर उपलब्ध नहीं है।
            </p>
            <button
              onClick={() => setSelectedCategory('सभी')}
              className="mt-4 px-4 py-2 bg-[#2D5A27] text-white text-xs font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
            >
              सभी नंबर देखें
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            <AnimatePresence>
              {filteredHelplines.map((hp) => {
                const theme = getCategoryTheme(hp.category);
                const IconComponent = theme.icon;
                const isCopied = copiedId === hp.id;
                const isShop = hp.category.toLowerCase().includes('दुकान') || hp.name.includes('फल्सावदिया');

                return (
                  <motion.div
                    key={hp.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="bg-white rounded-2xl border border-gray-200/80 hover:border-[#2D5A27]/40 shadow-xs hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Top Content */}
                    <div>
                      {/* Category Header Strip */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${theme.badgeBg}`}>
                            {hp.category}
                          </span>
                        </div>

                        {/* Verified status */}
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700" title="सत्यापित सरकारी / अधिकृत हेल्पलाइन">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>सत्यापित</span>
                        </div>
                      </div>

                      {/* Helpline Name */}
                      <h4 className="font-bold text-gray-900 text-base leading-snug group-hover:text-[#2D5A27] transition-colors">
                        {hp.name}
                      </h4>

                      {/* Description */}
                      {hp.description && (
                        <p className="text-xs text-gray-500 font-normal leading-relaxed mt-1.5 min-h-[34px]">
                          {hp.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Phone & Actions Section */}
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5">
                      {/* Number Container */}
                      <div className="bg-gray-50/80 group-hover:bg-[#F2F8F0] border border-gray-100 rounded-xl px-3 py-2 flex items-center justify-between transition-colors">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                            हेल्पलाइन नंबर
                          </span>
                          <span className="font-mono font-black text-gray-900 group-hover:text-[#183D16] text-base sm:text-lg tracking-tight truncate block">
                            {hp.number}
                          </span>
                        </div>

                        {/* Copy Button */}
                        <button
                          onClick={(e) => handleCopyNumber(hp, e)}
                          className="p-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-800 border border-gray-200 transition-colors cursor-pointer shrink-0 relative"
                          title="नंबर कॉपी करें"
                          aria-label="नंबर कॉपी करें"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {isCopied && (
                            <span className="absolute -top-7 right-0 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
                              कॉपी हुआ!
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Action CTA Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCall(hp.number)}
                          className="flex-1 bg-[#2D5A27] hover:bg-[#183D16] text-white font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer"
                        >
                          <PhoneCall className="w-4 h-4" />
                          <span>कॉल करें</span>
                        </button>

                        {isShop && (
                          <a
                            href="https://wa.me/918982338046"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold p-2.5 rounded-xl text-xs flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-xs"
                            title="व्हाट्सएप पर चैट करें"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Advisory & Notice Banner */}
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 sm:p-5 space-y-2">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>ज़रूरी किसान सूचना एवं आपातकालीन दिशानिर्देश</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-amber-900/90 leading-relaxed pt-1">
          <div className="flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <p>
              सरकारी टोल-फ्री हेल्पलाइन (KCC, बीमा, मौसम, मंडी) सामान्यतः सुबह 6:00 से रात 10:00 बजे तक सक्रिय रहती हैं। राष्ट्रीय आपातकाल (112 / 108 / 100) 24×7 चालू रहता है।
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <p>
              फल्सावदिया कृषि बाजार दुकान संपर्क समय प्रतिदिन सुबह 8:00 AM से रात 8:00 PM तक है। खाद-बीज उपलब्धता एवं बुकिंग के लिए सीधे संपर्क कर सकते हैं।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Helpline;
