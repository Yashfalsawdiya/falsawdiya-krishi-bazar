import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { CloudSun, ArrowRight, Phone, ShoppingBag, Sprout, Youtube, Play, ExternalLink, Loader2, Calendar, MapPin, TrendingUp, Landmark, Key, Sparkles, Send, Tag, X as CloseIcon, BookOpen, Info, ChevronRight, ChevronLeft, ShieldCheck, FileText, RotateCcw, AlertTriangle, PhoneCall, ShieldAlert, Award, Facebook, Instagram, Plus, MessageCircle, Copy, Check, Store, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { fetchWeather, WeatherData } from '../services/weatherService';
import { fetchMandiBhav, MandiData } from '../services/mandiService';
import { getDynamicAdvice, askAiQuestion } from '../services/gemini';
import ApiKeyModal from '../components/ApiKeyModal';
import useAiGuard from '../hooks/useAiGuard';
import { AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  useDeviceType, 
  normalizeDeviceBanners, 
  getActiveBannersForDevice 
} from '../utils/deviceBanners';
import { normalizeVideos, resolveVideoThumbnail } from '../utils/youtubeUtils';
import { DeviceBanner } from '../types';
import { sortCategoriesByOrder } from '../utils/categoryUtils';

const BANNERS = [
  {
    id: 1,
    image: '',
    title: 'खाद और बीज पर भारी छूट!',
    subtitle: 'सीमित समय के लिए ऑफर'
  },
  {
    id: 2,
    image: '',
    title: 'नई किस्म के सोयाबीन बीज',
    subtitle: 'अधिक पैदावार की गारंटी'
  },
  {
    id: 3,
    image: '',
    title: 'फसल सुरक्षा समाधान',
    subtitle: 'बेहतरीन कीटनाशक उपलब्ध'
  }
];

const VIDEOS = [
  {
    id: 'v1',
    title: 'आधुनिक खेती की जानकारी',
    videoId: '9-3-P4mXG3A',
    thumbnail: ''
  },
  {
    id: 'v2',
    title: 'मिट्टी परीक्षण कैसे करें',
    videoId: '6Z_L2v_p-m8',
    thumbnail: ''
  },
  {
    id: 'v3',
    title: 'जैविक खाद बनाने की विधि',
    videoId: 'dQw4w9WgXcQ',
    thumbnail: ''
  }
];

const PARTNERS = [
  "Bayer", "Syngenta", "UPL", "PI Industries", "Dhanuka", "IFFCO", "Rallis India", "Corteva", "FMC India", "Sumitomo",
  "BASF", "Coromandel", "Chambal", "Crystal", "Indo Gulf", "Adama India", "Kaveri Seeds", "Godrej", "Nuziveedu", "Bharat Rasayan"
];

import { MONTHLY_TIPS } from '../data/seasonalTips';

import ImageZoomModal from '../components/ImageZoomModal';
import ProductDetailModal from '../components/ProductDetailModal';
import FeaturedProductCard from '../components/FeaturedProductCard';
import SmartImage from '../components/SmartImage';
import { Product, ImageSource } from '../types';

const Home: React.FC = () => {
  const { products, categories, appContent, user, loadProducts, loadCategoryData, loading: appLoading } = useAppContext();
  const sortedCategories = useMemo(() => sortCategoriesByOrder(categories), [categories]);
  const { 
    apiKey: effectiveApiKey, 
    requireApiKey, 
    isApiKeyModalOpen, 
    apiKeyModalMessage, 
    openApiKeyModal, 
    closeApiKeyModal 
  } = useAiGuard();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubProducts = loadProducts();
    const unsubCategories = loadCategoryData();
    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubCategories) unsubCategories();
    };
  }, []);

  const deviceType = useDeviceType();
  const [selectedBannerIndex, setSelectedBannerIndex] = useState(0);

  const deviceBannersMap = React.useMemo(() => {
    return normalizeDeviceBanners(appContent);
  }, [appContent]);

  const activeDeviceBanners = React.useMemo(() => {
    return getActiveBannersForDevice(deviceBannersMap, deviceType);
  }, [deviceBannersMap, deviceType]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: activeDeviceBanners.length > 1 },
    activeDeviceBanners.length > 1 ? [Autoplay({ delay: 4500, stopOnInteraction: false })] : []
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedBannerIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on('select', onSelect);
    emblaApi.reInit();

    const handleResize = () => {
      emblaApi.reInit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      emblaApi.off('select', onSelect);
      window.removeEventListener('resize', handleResize);
    };
  }, [emblaApi, activeDeviceBanners]);

  const [emblaVideoRef] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps' });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [mandi, setMandi] = useState<MandiData | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ src: string | ImageSource; alt: string } | null>(null);

  const banners = appContent?.banners || BANNERS;
  const videos = React.useMemo(() => {
    const list = normalizeVideos(appContent?.videos);
    return list.filter(v => v.isActive !== false);
  }, [appContent?.videos]);
  const partners = appContent?.partners || PARTNERS.map((name, i) => ({ id: `p${i}`, name, logo: '' }));
  const whatsappSection = appContent?.whatsappSection || {
    title: 'WhatsApp पर जुड़ें',
    description: 'सीधे फोटो भेजें और घर बैठे सामान मंगाएं या दुकान पर आकर ले जाएं।',
    mode: 'direct',
    groupLink: ''
  };
  const facebookSection = {
    enabled: appContent?.facebookSection?.enabled !== false,
    title: appContent?.facebookSection?.title || 'Facebook पर जुड़ें',
    description: appContent?.facebookSection?.description || 'हमसे Facebook पर जुड़ें और अपडेट पाएं',
    pageUrl: appContent?.facebookSection?.pageUrl || 'https://www.facebook.com',
    buttonText: appContent?.facebookSection?.buttonText || 'पेज पर जाएं'
  };

  const instagramSection = {
    enabled: appContent?.instagramSection?.enabled !== false,
    title: appContent?.instagramSection?.title || 'Instagram पर जुड़ें',
    description: appContent?.instagramSection?.description || 'हमसे Instagram पर जुड़ें और अपडेट पाएं',
    profileUrl: appContent?.instagramSection?.profileUrl || 'https://www.instagram.com',
    buttonText: appContent?.instagramSection?.buttonText || 'प्रोफाइल देखें'
  };

  const contactInfo = appContent?.contactInfo || {
    whatsapp: '918982338046',
    address: 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)',
    timings: 'सुबह 8:00 बजे से रात 8:00 बजे तक (08:00 AM – 08:00 PM)'
  };
  const youtubeChannel = appContent?.youtubeChannel || {
    url: 'https://www.youtube.com/@FalsawdiyaKrishiBazaar',
    label: 'चैनल देखें'
  };

  const featuredProducts = products
    .filter(p => p.isFeatured)
    .sort((a, b) => {
      const orderA = typeof a.featuredOrder === 'number' ? a.featuredOrder : 9999;
      const orderB = typeof b.featuredOrder === 'number' ? b.featuredOrder : 9999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.hindiName || '').localeCompare(b.hindiName || '');
    });

  const currentDate = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Logic to get a daily tip based on the month and day
  const getDailyTip = () => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    const tipsForMonth = MONTHLY_TIPS[month] || [];
    
    // Use modulo to cycle through tips if the month has more days than tips (though we have ~30 per month)
    const tipIndex = (day - 1) % tipsForMonth.length;
    return tipsForMonth[tipIndex] || "खेती से जुड़ी जानकारी के लिए ऐप देखते रहें।";
  };

  const dailyTip = getDailyTip();

  useEffect(() => {
    fetchWeather(24.1864, 75.6328).then(setWeather).catch(console.warn);
  }, []);

  useEffect(() => {
    if (!appLoading && effectiveApiKey) {
      fetchMandiBhav('Shamgarh', effectiveApiKey)
        .then(setMandi)
        .catch(err => {
          console.warn("Mandi load failed", err);
        });
    }
  }, [appLoading, effectiveApiKey]);

  const handleOpenChat = () => {
    if (appLoading) return;

    if (!requireApiKey("AI कृषि चैट का उपयोग करने के लिए कृपया अपनी Gemini API Key जोड़ें।")) {
      return;
    }
    setIsChatOpen(true);
    setChatResponse(null);
    setLastQuestion(null);
    setUserQuestion('');
  };

  const handleAskQuestion = async () => {
    if (!userQuestion.trim()) return;
    
    if (appLoading) return;

    if (!requireApiKey("AI से प्रश्न पूछने के लिए कृपया अपनी Gemini API Key जोड़ें।")) {
      return;
    }

    const question = userQuestion.trim();
    setLastQuestion(question);
    setUserQuestion('');
    setChatResponse(null);

    setIsAiLoading(true);
    try {
      const response = await askAiQuestion(question, weather, effectiveApiKey);
      setChatResponse(response);
    } catch (error: any) {
      console.error("AI Question failed:", error);
      if (error.type === 'key_missing' || error.type === 'key_invalid') {
        openApiKeyModal(error.message);
        setIsChatOpen(false);
      } else {
        setChatResponse(error.message || "त्रुटि हुई। कृपया पुनः प्रयास करें।");
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGetAiAdvice = async () => {
    if (appLoading) return;

    if (!requireApiKey("AI कृषि सलाह प्राप्त करने के लिए कृपया अपनी Gemini API Key जोड़ें।")) {
      return;
    }

    if (!weather) return;

    setIsAiLoading(true);
    try {
      const advice = await getDynamicAdvice(weather, "Kharif", "Soybean", effectiveApiKey);
      setAiAdvice(advice);
    } catch (error: any) {
      console.error("AI Advice failed:", error);
      if (error.type === 'key_missing' || error.type === 'key_invalid') {
        openApiKeyModal(error.message);
      } else {
        setAiAdvice(error.message || "सलाह उपलब्ध नहीं है।");
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleBuyClick = (product: Product, variant?: { id: string; quantity: string; price: number }) => {
    addToCart(product, variant || product.variants?.[0]);
    navigate('/cart');
  };

  return (
    <div className="space-y-6">
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={closeApiKeyModal} 
        message={apiKeyModalMessage}
      />
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold text-gray-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {currentDate}
        </p>
        <p className="text-[10px] text-[#2D5A27] font-bold">शामगढ़ (Shamgarh)</p>
      </div>

      {/* Banner Slider */}
      <div 
        className={cn(
          "w-full overflow-hidden rounded-2xl shadow-lg relative group/slider",
          deviceType === 'mobile' && "aspect-[4/3]",
          deviceType === 'tablet' && "aspect-[16/9]",
          deviceType === 'laptop' && "aspect-[21/9]",
          deviceType === 'desktop' && "aspect-[24/9]"
        )} 
        ref={emblaRef}
      >
        <div className="flex h-full w-full">
          {activeDeviceBanners.map((banner, idx) => {
            const hasLink = Boolean(banner.link);
            const hasImage = Boolean(banner.image);
            const isContain = banner.fitMode === 'contain';

            return (
              <div 
                key={`${banner.id}-${idx}`} 
                onClick={() => {
                  if (banner.link) {
                    if (banner.link.startsWith('http://') || banner.link.startsWith('https://')) {
                      window.open(banner.link, '_blank', 'noopener,noreferrer');
                    } else {
                      navigate(banner.link);
                    }
                  } else if (banner.image) {
                    setZoomImage({ src: banner.image, alt: banner.title || 'Hero Banner' });
                  }
                }}
                className={cn(
                  "relative flex-[0_0_100%] min-w-0 w-full h-full group",
                  hasLink ? "cursor-pointer" : hasImage ? "cursor-zoom-in" : "cursor-default"
                )}
              >
                {banner.image ? (
                  isContain ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-gray-950">
                      {/* Ambient blur background for safe no-crop fit */}
                      <div 
                        className="absolute inset-0 w-full h-full bg-cover bg-center filter blur-xl opacity-35 scale-110"
                        style={{ backgroundImage: `url(${typeof banner.image === 'string' ? banner.image : banner.image.primary})` }}
                      />
                      <SmartImage 
                        src={banner.image} 
                        alt={banner.title || 'Hero Banner'} 
                        className="relative z-10 w-full h-full"
                        objectFit="contain"
                        priority={idx === 0}
                      />
                    </div>
                  ) : (
                    <SmartImage 
                      src={banner.image} 
                      alt={banner.title || 'Hero Banner'} 
                      className="absolute inset-0 w-full h-full"
                      objectFit="cover"
                      priority={idx === 0}
                    />
                  )
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-emerald-900 via-green-800 to-[#1f3d1b] flex items-center justify-center p-6" />
                )}

                {appContent?.showBannerText !== false && (banner.title || banner.subtitle) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-5 sm:p-6 md:p-8 text-white pointer-events-none">
                    {banner.title && (
                      <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 drop-shadow-md">
                        {banner.title}
                      </h2>
                    )}
                    {banner.subtitle && (
                      <p className="text-xs sm:text-sm md:text-base opacity-90 drop-shadow-sm font-medium">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Slide Indicators (Dots) */}
        {activeDeviceBanners.length > 1 && (
          <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full pointer-events-auto">
            {activeDeviceBanners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  emblaApi?.scrollTo(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                  selectedBannerIndex === i ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                )}
                title={`स्लाइड ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Next / Previous arrows on Laptop and Desktop */}
        {activeDeviceBanners.length > 1 && (deviceType === 'laptop' || deviceType === 'desktop') && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                emblaApi?.scrollPrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity backdrop-blur-xs z-10 cursor-pointer shadow-md"
              title="पिछला बैनर"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                emblaApi?.scrollNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity backdrop-blur-xs z-10 cursor-pointer shadow-md"
              title="अगला बैनर"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* API Key Prompt */}
      {!effectiveApiKey && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl">
              <Key className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-purple-900">अपनी API Key सेट करें</h4>
              <p className="text-[10px] text-purple-700">फसल रोग पहचान, AI वॉइस कॉल, ताज़ा मंडी भाव और कृषि सलाह के लिए अपनी Key जोड़ें।</p>
            </div>
          </div>
          <button 
            onClick={() => openApiKeyModal()}
            className="bg-purple-600 text-white text-[10px] font-bold px-3 py-2 rounded-lg whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
          >
            अभी सेट करें
          </button>
        </motion.div>
      )}

      {/* AI Intelligence Cards (Side by side on Tablet & Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-4 xl:gap-6 2xl:gap-8 pt-1">
        {/* AI Voice Agent Entry Section */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <Link to="/ai-call" id="card-ai-agri-call" className="block h-full group focus:outline-none">
            <div className="relative h-full bg-gradient-to-br from-white via-white to-emerald-50/40 rounded-3xl p-5 sm:p-6 border border-gray-200/90 hover:border-emerald-600/40 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer active:scale-[0.99]">
              {/* Ambient decorative glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-emerald-500/10 to-teal-500/0 rounded-full blur-2xl group-hover:scale-125 group-hover:opacity-100 opacity-40 transition-all duration-500 pointer-events-none" />

              <div>
                {/* Header Row: Clean Icon Pod + Live Status Chip */}
                <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-emerald-50 text-[#183D16] border border-emerald-200/80 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-[#2D5A27] group-hover:text-white transition-all duration-300">
                    <PhoneCall className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#183D16] border border-emerald-200/80 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                    </span>
                    <span>लाइव वॉयस कॉल</span>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="relative z-10 space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-gray-900 group-hover:text-[#2D5A27] transition-colors tracking-tight">
                    AI कृषि विशेषज्ञ कॉल
                  </h3>
                  <p className="text-xs sm:text-[13px] text-gray-600 font-medium leading-relaxed">
                    सीधे बोलकर बात करें और फसल समस्या का तुरंत समाधान पाएं
                  </p>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2 relative z-10">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  इंसानों की तरह बातचीत
                </span>
                
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-800 group-hover:bg-[#2D5A27] group-hover:text-white group-hover:border-[#2D5A27] font-bold text-xs transition-all duration-300 shadow-2xs">
                  <span>कॉल करें</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* AI Product Knowledge Entry Section */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="h-full"
        >
          <Link to="/ai-product-knowledge" id="card-ai-product-knowledge" className="block h-full group focus:outline-none">
            <div className="relative h-full bg-gradient-to-br from-white via-white to-amber-50/30 rounded-3xl p-5 sm:p-6 border border-gray-200/90 hover:border-emerald-600/40 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer active:scale-[0.99]">
              {/* Ambient decorative glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-amber-500/10 to-emerald-500/0 rounded-full blur-2xl group-hover:scale-125 group-hover:opacity-100 opacity-40 transition-all duration-500 pointer-events-none" />

              <div>
                {/* Header Row: Clean Icon Pod + Smart Guide Chip */}
                <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-[#2D5A27] group-hover:text-white transition-all duration-300">
                    <Sprout className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>स्मार्ट डोज़ गाइड</span>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="relative z-10 space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-gray-900 group-hover:text-[#2D5A27] transition-colors tracking-tight">
                    AI उत्पाद जानकारी
                  </h3>
                  <p className="text-xs sm:text-[13px] text-gray-600 font-medium leading-relaxed">
                    दवाई, खाद या टेक्निकल का सही प्रति एकड़ डोज़ और उपयोग विधि जानें
                  </p>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2 relative z-10">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  सटीक डोज़ और उपयोग विधि
                </span>
                
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-800 group-hover:bg-[#2D5A27] group-hover:text-white group-hover:border-[#2D5A27] font-bold text-xs transition-all duration-300 shadow-2xs">
                  <span>डोज़ जानें</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Weather, Mandi, & Schemes Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 xl:gap-6 2xl:gap-8 pt-1">
        <Link to="/weather" className="col-span-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-[#2D5A27] to-[#3D7A35] rounded-2xl p-4 text-white h-full flex flex-col justify-between shadow-md relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <CloudSun className="w-8 h-8 text-[#EAB308]" />
                <span className="text-[10px] font-bold opacity-70 uppercase">मौसम</span>
              </div>
              {weather ? (
                <div className="mt-2">
                  <h2 className="text-2xl font-bold leading-none">{weather.temp}°C</h2>
                  <p className="text-[10px] font-medium mt-1 truncate">{weather.condition}</p>
                </div>
              ) : (
                <Loader2 className="w-5 h-5 animate-spin opacity-50 my-2" />
              )}
            </div>
          </motion.div>
        </Link>

        <Link to="/mandi" className="col-span-1">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-4 border border-gray-100 h-full flex flex-col justify-between shadow-sm relative group overflow-hidden"
          >
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <TrendingUp className="w-8 h-8 text-[#2D5A27]" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">मंडी भाव</span>
              </div>
              {mandi ? (
                <div className="animate-in fade-in duration-500 mt-2">
                  <p className="text-[10px] font-bold text-gray-500 truncate">{mandi.items[0]?.commodity}</p>
                  <h2 className="text-xl font-bold text-[#2D5A27] leading-none">₹{mandi.items[0]?.avgPrice}</h2>
                  <p className="text-[9px] text-gray-400 mt-1 truncate">{mandi.mandiName} मंडी</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1 my-2">
                  <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-100 rounded animate-pulse mt-1" />
                </div>
              )}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <ArrowRight className="w-3 h-3 text-gray-300" />
            </div>
          </motion.div>
        </Link>

        {/* Government Schemes Banner (Takes full width of mobile, 1 column on md+) */}
        <Link to="/schemes" className="col-span-2 md:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#2D5A27] to-[#3D7A35] rounded-2xl p-4 text-white shadow-md flex items-center justify-between overflow-hidden relative h-full"
          >
            <div className="relative z-10">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#EAB308] shrink-0" />
                सरकारी योजनाएं
              </h3>
              <p className="text-xs text-white/80 mt-1">PM-Kisan, सब्सिडी और बीमा</p>
              <div className="mt-3 inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm">
                अभी देखें <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* Categories */}
      <section className="pt-2">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-[#2A1F18] tracking-tight">
              श्रेणियाँ (Categories)
            </h3>
            <span className="text-[10px] font-extrabold bg-[#2D5A27]/10 text-[#2D5A27] px-2 py-0.5 rounded-full border border-[#2D5A27]/15">
              {sortedCategories.length}
            </span>
          </div>
          <Link 
            to="/products" 
            className="text-xs font-bold text-[#2D5A27] hover:text-[#1E3F1A] flex items-center gap-1 transition-colors"
          >
            <span>सभी उत्पाद</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-10 gap-2.5 sm:gap-3.5 xl:gap-4 2xl:gap-5">
          {sortedCategories.map((cat, index) => {
            const nameMatch = (cat.name || '').match(/^(.*?)(?:\s*\((.*?)\))?$/);
            const mainName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : cat.name;
            const subName = nameMatch && nameMatch[2] ? nameMatch[2].trim() : '';

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                onClick={() => navigate(`/products?category=${cat.id}`)}
                className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-emerald-50/30 p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-gray-200/80 hover:border-[#2D5A27]/30 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col items-center text-center justify-between gap-2 cursor-pointer active:scale-95 select-none overflow-hidden"
              >
                {/* Subtle top hover line indicator */}
                <div className="absolute top-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-[#2D5A27]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Modern Icon Vessel / Pod */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-b from-[#F7FAF6] to-[#EEF5EC] group-hover:from-[#EAF4E6] group-hover:to-[#DCEBD9] border border-emerald-900/5 group-hover:border-[#2D5A27]/20 flex items-center justify-center p-2 shadow-2xs group-hover:scale-105 transition-all duration-300 shrink-0">
                  {typeof cat.icon === 'string' ? (
                    <span className="text-2xl sm:text-3xl leading-none select-none">{cat.icon}</span>
                  ) : (
                    <SmartImage 
                      src={cat.icon} 
                      alt={cat.name} 
                      className="w-full h-full object-contain filter drop-shadow-2xs" 
                      objectFit="contain" 
                      priority={index < 4} 
                    />
                  )}
                </div>

                {/* Typography with clean Hindi and English hierarchy */}
                <div className="w-full flex flex-col items-center">
                  <span className="font-extrabold text-[11px] sm:text-xs text-[#1E3F1A] group-hover:text-[#2D5A27] transition-colors leading-tight line-clamp-1">
                    {mainName}
                  </span>
                  {subName ? (
                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 group-hover:text-emerald-700/80 transition-colors tracking-tight line-clamp-1 mt-0.5">
                      {subName}
                    </span>
                  ) : (
                    <span className="text-[9px] text-transparent leading-tight select-none">
                      -
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[#4A3728]">विशेष उत्पाद (Featured)</h3>
          <Link to="/products" className="text-sm font-bold text-[#2D5A27] flex items-center gap-1">
            सभी देखें <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 xl:gap-5 2xl:gap-6 overflow-x-auto md:overflow-x-visible pb-3 -mx-1 px-1 snap-x">
          {featuredProducts.length === 0 ? (
            <div className="w-full col-span-full py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-gray-200" />
              <p className="text-xs text-gray-400 font-bold">आज के विशेष उत्पाद जल्द ही आएंगे!</p>
            </div>
          ) : (
            featuredProducts.map((product, idx) => (
              <FeaturedProductCard
                key={`${product.id}-${idx}`}
                product={product}
                index={idx}
                onSelect={(p) => {
                  setSelectedProduct(p);
                  setShowDetail(true);
                }}
                onZoom={(src, alt) => {
                  setZoomImage({ src, alt });
                }}
                onBuy={(p, variant) => {
                  handleBuyClick(p, variant);
                }}
              />
            ))
          )}
        </div>
      </section>

      {/* Partner Logos Slider */}
      <section className="py-4 overflow-hidden">
        <p className="text-[11px] font-semibold text-gray-500 mb-4 text-center">Popular Brands</p>
        <div className="relative flex overflow-x-hidden">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 120,
                ease: "linear",
              },
            }}
            className="flex gap-6 items-center whitespace-nowrap"
          >
            {[...partners, ...partners].map((partner, idx) => (
              <div key={`${partner.id}-${idx}`} className="flex flex-col items-center gap-1.5">
                  <div className="h-14 min-w-[80px] px-4 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                    {partner.logo ? (
                      <SmartImage 
                        src={partner.logo} 
                        alt={partner.name} 
                        className="h-8 w-auto max-w-[120px]"
                        objectFit="contain"
                      />
                    ) : (
                      <span className="text-[10px] font-black text-[#2D5A27]">{partner.name}</span>
                    )}
                  </div>
                {partner.logo && <span className="text-[9px] font-bold text-gray-500 text-center">{partner.name}</span>}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* YouTube Videos Section */}
      {videos.length > 0 && (
        <section className="space-y-3" id="home-youtube-videos-section">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#4A3728] flex items-center gap-2">
              <Youtube className="w-6 h-6 text-red-600" />
              खेती की वीडियो (Videos)
            </h3>
            <a 
              href={youtubeChannel.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-bold text-red-600 flex items-center gap-1 hover:underline transition-colors"
            >
              {youtubeChannel.label} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="overflow-hidden -mx-4 px-4" ref={emblaVideoRef}>
            <div className="flex gap-4">
              {videos.map((video, idx) => (
                <div key={`${video.id}-${idx}`} className="flex-[0_0_85%] sm:flex-[0_0_45%] md:flex-[0_0_31%] lg:flex-[0_0_23%] min-w-0">
                  <a 
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform group"
                  >
                    <div className="aspect-video relative bg-gray-900">
                      <SmartImage 
                        src={resolveVideoThumbnail(video)} 
                        alt={video.title} 
                        className="absolute inset-0 w-full h-full"
                        objectFit="cover"
                      />
                      <div className="absolute inset-0 bg-black/15 flex items-center justify-center group-hover:bg-black/25 transition-colors">
                        <div className="bg-red-600 text-white w-14 h-10 rounded-[14px] flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                          <Play className="w-6 h-6 fill-white text-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-2">{video.title}</h4>
                      {video.description && (
                        <p className="text-xs text-gray-500 line-clamp-1 mt-1">{video.description}</p>
                      )}
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WhatsApp, Social Media & Address Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4 xl:gap-6 2xl:gap-8">
        {/* Modern WhatsApp Card */}
        <div 
          onClick={() => {
            if (whatsappSection.mode === 'group' && whatsappSection.groupLink) {
              window.open(whatsappSection.groupLink, '_blank');
            } else {
              const message = encodeURIComponent("नमस्ते फल्सावदिया कृषि बाजार, मुझे खेती के बारे में जानकारी चाहिए।");
              window.open(`https://wa.me/${contactInfo.whatsapp}?text=${message}`, '_blank');
            }
          }}
          className="bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border border-emerald-200/80 hover:border-emerald-400 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 text-left cursor-pointer active:scale-[0.99] group relative overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-[#25D366]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#25D366]/20 transition-colors" />

          {/* Top Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#1ebe57] text-white flex items-center justify-center shadow-md shadow-[#25D366]/25 group-hover:scale-105 transition-transform shrink-0">
                <MessageCircle className="w-6 h-6 fill-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse shrink-0" />
                  <span className="text-[10px] font-bold text-[#128C7E] uppercase tracking-wider">
                    {whatsappSection.mode === 'group' ? 'कृषि समुदाय ग्रुप' : 'सीधी सहायता'}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm sm:text-base text-gray-900 group-hover:text-[#128C7E] transition-colors truncate">
                  {whatsappSection.title}
                </h4>
              </div>
            </div>
            <span className="bg-emerald-100/90 text-[#128C7E] border border-emerald-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
              WhatsApp
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-600 font-medium leading-relaxed line-clamp-2">
            {whatsappSection.description}
          </p>

          {/* Action Row */}
          <div className="pt-2 border-t border-emerald-100/80 flex items-center justify-between mt-auto text-xs font-bold text-[#128C7E]">
            <span className="flex items-center gap-1.5 group-hover:gap-2 transition-all">
              {whatsappSection.mode === 'group' ? 'ग्रुप में शामिल हों' : 'मैसेज करें'}
            </span>
            <span className="w-7 h-7 rounded-xl bg-[#25D366] group-hover:bg-[#20ba59] text-white flex items-center justify-center shadow-xs group-hover:translate-x-0.5 transition-all">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Social Media Cards (Side by Side) */}
        {(facebookSection.enabled || instagramSection.enabled) && (
          <div className={cn(
            "grid gap-3",
            facebookSection.enabled && instagramSection.enabled ? "grid-cols-2" : "grid-cols-1"
          )}>
            {/* Modern Facebook Card */}
            {facebookSection.enabled && (
              <div 
                onClick={() => {
                  const url = facebookSection.pageUrl.trim() || 'https://www.facebook.com';
                  window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
                }}
                className="bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 border border-blue-200/80 hover:border-blue-400 rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between gap-3 active:scale-[0.99] transition-all text-left cursor-pointer shadow-xs hover:shadow-md group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#1877F2] to-[#0D65D9] text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                    <Facebook className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full border border-blue-200/60">
                    Facebook
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 group-hover:text-[#1877F2] transition-colors truncate">
                    {facebookSection.title}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">
                    {facebookSection.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-blue-100/80 flex items-center justify-between text-[10px] sm:text-xs font-extrabold text-[#1877F2]">
                  <span className="truncate">{facebookSection.buttonText || 'प्रोफाइल देखें'}</span>
                  <span className="w-6 h-6 rounded-lg bg-blue-50 group-hover:bg-[#1877F2] group-hover:text-white text-[#1877F2] flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            )}

            {/* Modern Instagram Card */}
            {instagramSection.enabled && (
              <div 
                onClick={() => {
                  const url = instagramSection.profileUrl.trim() || 'https://www.instagram.com';
                  window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
                }}
                className="bg-gradient-to-br from-pink-50/70 via-white to-purple-50/30 border border-pink-200/80 hover:border-pink-400 rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between gap-3 active:scale-[0.99] transition-all text-left cursor-pointer shadow-xs hover:shadow-md group relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform shrink-0">
                    <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-pink-600 bg-pink-100/70 px-2 py-0.5 rounded-full border border-pink-200/60">
                    Instagram
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 group-hover:text-[#DD2A7B] transition-colors truncate">
                    {instagramSection.title}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">
                    {instagramSection.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-pink-100/80 flex items-center justify-between text-[10px] sm:text-xs font-extrabold text-[#DD2A7B]">
                  <span className="truncate">{instagramSection.buttonText || 'प्रोफाइल देखें'}</span>
                  <span className="w-6 h-6 rounded-lg bg-pink-50 group-hover:bg-[#DD2A7B] group-hover:text-white text-[#DD2A7B] flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modern Address & Store Card */}
        <div 
          onClick={() => {
            const mapQuery = encodeURIComponent("डिंपल चौराहा क्षत्रिय खाती मांगलिक भवन शामगढ़ मंदसौर 458883");
            window.open(`https://www.google.com/maps/search/?api=1&query=${mapQuery}`, '_blank');
          }}
          className="bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border border-emerald-200/80 hover:border-[#2D5A27]/60 rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 active:scale-[0.99] transition-all text-left cursor-pointer shadow-xs hover:shadow-md group relative overflow-hidden"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#2D5A27] to-[#1E3F1A] text-white flex items-center justify-center shadow-md shadow-[#2D5A27]/20 group-hover:scale-105 transition-transform shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/70 block">
                  हमारा स्थायी पता
                </span>
                <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 group-hover:text-[#2D5A27] transition-colors leading-snug">
                  फल्सावदिया कृषि बाजार
                </h4>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200/70 shrink-0">
              शामगढ़
            </span>
          </div>

          {/* Address Content & Timings */}
          <div className="space-y-2">
            <p className="text-xs sm:text-[13px] font-medium text-gray-700 leading-relaxed">
              {contactInfo.address || 'डिम्पल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)'}
            </p>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-emerald-100/80 text-[11px] font-semibold text-gray-600 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
              <span>दुकान समय: <strong className="text-gray-900 font-bold">सुबह 8:00 से रात 8:00 बजे तक</strong></span>
            </div>
          </div>

          {/* Modern Action Footer (matching Facebook / Instagram social cards) */}
          <div className="pt-2.5 border-t border-emerald-100/80 flex items-center justify-between text-xs font-extrabold text-[#2D5A27]">
            <span className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>गूगल मैप पर लोकेशन देखें</span>
            </span>
            <span className="w-7 h-7 rounded-xl bg-emerald-50 group-hover:bg-[#2D5A27] group-hover:text-white text-[#2D5A27] flex items-center justify-center transition-all shadow-2xs">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* Farming Tips */}
      <section className="bg-gradient-to-br from-[#EEF7EC] via-[#F4F9F2] to-[#E5F2E1] rounded-2xl sm:rounded-3xl 2xl:rounded-[2rem] p-4 sm:p-5 2xl:p-7 border border-[#CDE5C8] shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-[#1B4318] text-sm sm:text-base flex items-center gap-2">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#2D5A27]/10 border border-[#2D5A27]/15 flex items-center justify-center text-[#2D5A27] shrink-0">
              <Sprout className="w-4 h-4 text-[#2D5A27]" />
            </span>
            <span>
              आज की सलाह
              <span className="text-xs font-medium text-[#2D5A27]/80 font-sans ml-1.5 hidden sm:inline">
                (Today's Tip)
              </span>
            </span>
          </h3>

          <button 
            onClick={handleOpenChat}
            disabled={isAiLoading}
            className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-[#2D5A27] hover:bg-[#23461e] active:scale-95 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 shrink-0 cursor-pointer"
            title="खेती से जुड़ा सवाल पूछें और AI कृषि सहायक से बात करें"
          >
            {isAiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300 transition-transform group-hover:rotate-12" />
            )}
            <span>AI से कृषि सलाह लें</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        
        {aiAdvice ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs sm:text-sm leading-relaxed text-[#1F3A1D] bg-white/85 backdrop-blur-xs p-3.5 rounded-xl border border-[#CDE5C8] font-medium"
          >
            {aiAdvice}
          </motion.div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-[#263D23] font-medium leading-relaxed">
              {dailyTip}
            </p>
            <p className="text-[11px] text-[#42603E]/80 hidden sm:block">
              खेती से जुड़ा सवाल पूछें और AI कृषि सहायक से सीधे बात करें
            </p>
          </div>
        )}
      </section>

      {/* AI Chat Modal */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/60 z-[250] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-white rounded-3xl shadow-2xl z-[251] overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="bg-[#2D5A27] p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Sparkles className="w-5 h-5 text-[#EAB308]" />
                  </div>
                  <div>
                    <h3 className="font-bold">AI कृषि सहायक</h3>
                    <p className="text-[10px] opacity-70">अपना प्रश्न पूछें</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {lastQuestion && (
                  <div className="flex justify-end">
                    <div className="bg-[#2D5A27] text-white p-3 rounded-2xl rounded-tr-none text-sm max-w-[85%] shadow-sm font-medium">
                      {lastQuestion}
                    </div>
                  </div>
                )}

                {chatResponse ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#F5F2ED] p-4 rounded-2xl rounded-tl-none text-sm text-[#4A3728] leading-relaxed whitespace-pre-wrap shadow-sm border border-[#E8E2D8]"
                  >
                    {chatResponse}
                  </motion.div>
                ) : !lastQuestion && (
                  <div className="text-center py-10">
                    <p className="text-sm text-gray-400 font-medium">
                      आप अपना प्रश्न नीचे लिख सकते हैं।
                    </p>
                  </div>
                )}
                
                {isAiLoading && (
                  <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-xs bg-[#2D5A27]/5 p-3 rounded-xl w-fit">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI उत्तर तैयार कर रहा है...
                  </div>
                )}

                <AnimatePresence>
                  {/* Mic error removed */}
                </AnimatePresence>
              </div>

              <div className="p-5 bg-gray-50 border-t border-gray-100">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={userQuestion}
                      onChange={(e) => setUserQuestion(e.target.value)}
                      placeholder="यहाँ अपना प्रश्न लिखें..."
                      className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A27]"
                      onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                    />
                  </div>
                  <button 
                    onClick={handleAskQuestion}
                    disabled={isAiLoading || !userQuestion.trim()}
                    className="bg-[#2D5A27] text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 text-center mt-3">
                  AI द्वारा दी गई सलाह सामान्य जानकारी के लिए है।
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProductDetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        product={selectedProduct}
        onBuy={handleBuyClick}
      />

      <ImageZoomModal
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
        imageSrc={zoomImage?.src || ''}
        altText={zoomImage?.alt || ''}
      />
    </div>
  );
};

export default Home;
