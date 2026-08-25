import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  Phone, 
  MessageCircle, 
  Sparkles, 
  Truck, 
  CreditCard, 
  RotateCcw, 
  Bot, 
  ShieldCheck, 
  PhoneCall, 
  FileText, 
  AlertTriangle, 
  ShieldAlert,
  Clock,
  Layers,
  X,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';

export const HelpFaq: React.FC = () => {
  const { appContent, legalPagesContent } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>('faq_1');

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const faqData = legalPagesContent?.faqHelp || DEFAULT_LEGAL_PAGES_CONTENT.faqHelp;

  // Extract unique categories from faqs
  const categories = useMemo(() => {
    const cats = new Set<string>();
    (faqData.faqs || []).forEach(f => {
      if (f.category) cats.add(f.category.trim());
    });
    return Array.from(cats);
  }, [faqData.faqs]);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    let list = faqData.faqs || [];
    if (selectedCategory !== 'all') {
      list = list.filter(f => f.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(f => 
        f.question.toLowerCase().includes(q) || 
        f.answer.toLowerCase().includes(q) ||
        (f.category && f.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [faqData.faqs, selectedCategory, searchQuery]);

  const toggleAccordion = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#2D5A27] via-[#24481f] to-[#1b3717] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#EAB308]/10 rounded-full -ml-18 -mb-18 blur-xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner mb-1">
            <HelpCircle className="w-7 h-7 text-[#EAB308]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
            {faqData.bannerTitle || 'सहायता केंद्र एवं प्रश्नोत्तरी'}
          </h1>
          <p className="text-sm font-semibold text-[#EAB308]">
            {faqData.bannerSubtitle || 'Help Center & FAQ - फल्सावदिया कृषि बाजार'}
          </p>

          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-medium text-green-100 mt-2">
            <Clock className="w-3.5 h-3.5 text-yellow-300" />
            <span>हेल्पलाइन समय: {faqData.supportTimings || 'सुबह 8:00 से रात 8:00 तक'}</span>
          </div>

          {/* Search Box */}
          <div className="w-full max-w-sm pt-3 relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="अपने सवाल खोजें (उदा. डिलीवरी, ऑर्डर, रिफंड)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white text-gray-800 placeholder-gray-400 pl-10 pr-9 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#EAB308] shadow-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category Pills Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
            }`}
          >
            सभी प्रश्न ({faqData.faqs?.length || 0})
          </button>
          {categories.map((cat, idx) => {
            const count = (faqData.faqs || []).filter(f => f.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                  isActive
                    ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Intro text */}
      {faqData.introText && !searchQuery && selectedCategory === 'all' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-[#2D5A27] font-bold">
            <Sparkles className="w-4 h-4 text-[#2D5A27]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">किसान सहायता मार्गदर्शन</h2>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
            {faqData.introText}
          </p>
        </motion.div>
      )}

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            return (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * idx }}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  isExpanded ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleAccordion(item.id)}
                  className="w-full p-4 text-left flex items-start justify-between gap-3 select-none"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    {item.category && (
                      <span className="inline-block text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {item.category}
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-[#4A3728] leading-snug">
                      {item.question}
                    </h3>
                  </div>
                  <div className={`p-1.5 rounded-full mt-0.5 shrink-0 transition-transform duration-200 ${
                    isExpanded ? 'bg-[#2D5A27] text-white rotate-180' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-100 bg-[#F5F2ED]/40 px-4 py-3.5 text-xs text-gray-700 font-medium leading-relaxed"
                    >
                      <p className="whitespace-pre-line text-gray-800">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#4A3728]">कोई प्रश्न नहीं मिला</p>
              <p className="text-xs text-gray-500 mt-1">
                "{searchQuery}" से संबंधित कोई सवाल नहीं मिला। आप सीधे हमारी किसान हेल्पलाइन पर संपर्क कर सकते हैं।
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
            >
              सभी प्रश्न देखें
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Sections if any */}
      {faqData.sections && faqData.sections.length > 0 && (
        <div className="space-y-4">
          {faqData.sections.map((sec, idx) => (
            <motion.div
              key={sec.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-2"
            >
              <div className="flex items-center gap-2 text-[#2D5A27]">
                <Layers className="w-4 h-4" />
                <h2 className="text-xs font-bold text-[#4A3728] uppercase">{sec.title}</h2>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
                {sec.content}
              </p>
              {sec.bullets && sec.bullets.length > 0 && (
                <ul className="space-y-1 pt-1 bg-[#F5F2ED]/50 p-3 rounded-xl">
                  {sec.bullets.map((b, bIdx) => (
                    <li key={bIdx} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className="text-[#2D5A27] font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Direct Contact Support Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#2D5A27] via-[#24481f] to-[#1b3717] rounded-3xl p-5 text-white shadow-md space-y-3"
      >
        <div className="flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-[#EAB308]" />
          <div>
            <h2 className="text-sm font-black text-white">क्या आपको अपना समाधान नहीं मिला?</h2>
            <p className="text-[11px] text-green-100 font-medium">हमारे कृषि सलाहकार आपकी सहायता के लिए तैयार हैं</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <a
            href={`tel:${(faqData.supportPhone || '8982338046').replace(/\D/g, '')}`}
            className="bg-white text-[#2D5A27] py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>कॉल करें ({faqData.supportPhone || '8982338046'})</span>
          </a>
          <a
            href={`https://wa.me/91${(faqData.supportWhatsapp || '8982338046').replace(/\D/g, '')}?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार,%20मुझे%20सहायता%20चाहिए`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp चैट</span>
          </a>
        </div>
      </motion.div>

      {/* Quick Navigation Footer Links */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Link 
            to="/about"
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" /> <span className="truncate">हमारे बारे में</span>
          </Link>
          <Link 
            to="/terms"
            className="bg-white border border-gray-200 hover:border-amber-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" /> <span className="truncate">नियम एवं शर्तें</span>
          </Link>
          <Link 
            to="/privacy"
            className="bg-white border border-gray-200 hover:border-blue-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">गोपनीयता नीति</span>
          </Link>
          <Link 
            to="/refund-policy"
            className="bg-white border border-gray-200 hover:border-rose-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" /> <span className="truncate">वापसी नीति</span>
          </Link>
          <Link 
            to="/disclaimer"
            className="bg-white border border-gray-200 hover:border-yellow-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" /> <span className="truncate">AI अस्वीकरण</span>
          </Link>
          <Link 
            to="/safety-guidelines"
            className="bg-white border border-gray-200 hover:border-red-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" /> <span className="truncate">सुरक्षा निर्देश</span>
          </Link>
        </div>
        <Link 
          to="/contact"
          className="w-full bg-[#2D5A27]/10 hover:bg-[#2D5A27]/20 text-[#2D5A27] py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors text-center"
        >
          <PhoneCall className="w-3.5 h-3.5" /> संपर्क करें (Contact Us)
        </Link>
        <Link 
          to="/"
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors text-center"
        >
          मुख्य पृष्ठ (Home)
        </Link>
      </div>
    </div>
  );
};

export default HelpFaq;
