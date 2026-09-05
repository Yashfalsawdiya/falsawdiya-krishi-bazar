import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { CloudSun, ArrowRight, Phone, ShoppingBag, Sprout, Youtube, Play, ExternalLink, Loader2, Calendar, MapPin, TrendingUp, Landmark, Key, Sparkles, Send, Tag, X as CloseIcon, BookOpen, Info, ChevronRight, ShieldCheck, FileText, RotateCcw, AlertTriangle, PhoneCall, ShieldAlert, Award, Facebook, Instagram, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { fetchWeather, WeatherData } from '../services/weatherService';
import { fetchMandiBhav, MandiData } from '../services/mandiService';
import { getDynamicAdvice, askAiQuestion } from '../services/gemini';
import ApiKeyModal from '../components/ApiKeyModal';
import { AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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
import SmartImage from '../components/SmartImage';
import { Product, ImageSource } from '../types';

const Home: React.FC = () => {
  const { products, categories, appContent, user, userSettings, loadProducts, loadCategoryData, loading: appLoading } = useAppContext();
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

  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);
  const [emblaVideoRef] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps' });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [mandi, setMandi] = useState<MandiData | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKeyErrorMessage, setApiKeyErrorMessage] = useState<string | undefined>();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ src: string | ImageSource; alt: string } | null>(null);

  const banners = appContent?.banners || BANNERS;
  const videos = appContent?.videos || [
    { id: 'v1', title: 'आधुनिक खेती की जानकारी', videoUrl: 'https://www.youtube.com/watch?v=9-3-P4mXG3A', thumbnail: '' },
    { id: 'v2', title: 'मिट्टी परीक्षण कैसे करें', videoUrl: 'https://www.youtube.com/watch?v=6Z_L2v_p-m8', thumbnail: '' },
    { id: 'v3', title: 'जैविक खाद बनाने की विधि', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: '' }
  ];
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
    // We delay slightly to ensure userSettings are loaded
    if (!appLoading) {
      fetchMandiBhav('Shamgarh', userSettings?.geminiApiKey)
        .then(setMandi)
        .catch(err => {
          console.warn("Mandi load failed, but service should have returned fallback", err);
        });
    }
  }, [appLoading, userSettings?.geminiApiKey]);

  const handleOpenChat = () => {
    if (appLoading) return;

    if (!userSettings?.geminiApiKey) {
      setApiKeyErrorMessage(undefined);
      setIsModalOpen(true);
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

    const question = userQuestion.trim();
    setLastQuestion(question);
    setUserQuestion('');
    setChatResponse(null);

    setIsAiLoading(true);
    try {
      const response = await askAiQuestion(question, weather, userSettings?.geminiApiKey);
      setChatResponse(response);
    } catch (error: any) {
      console.error("AI Question failed:", error);
      if (error.type === 'key_missing' || error.type === 'key_invalid') {
        setApiKeyErrorMessage(error.message);
        setIsModalOpen(true);
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

    if (!userSettings?.geminiApiKey) {
      setApiKeyErrorMessage(undefined);
      setIsModalOpen(true);
      return;
    }

    if (!weather) return;

    setIsAiLoading(true);
    try {
      const advice = await getDynamicAdvice(weather, "Kharif", "Soybean", userSettings?.geminiApiKey);
      setAiAdvice(advice);
    } catch (error: any) {
      console.error("AI Advice failed:", error);
      if (error.type === 'key_missing' || error.type === 'key_invalid') {
        setApiKeyErrorMessage(error.message);
        setIsModalOpen(true);
      } else {
        setAiAdvice(error.message || "सलाह उपलब्ध नहीं है।");
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleBuyClick = (product: Product) => {
    addToCart(product, product.variants?.[0]);
    navigate('/cart');
  };

  return (
    <div className="space-y-6">
      <ApiKeyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        message={apiKeyErrorMessage}
      />
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold text-gray-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {currentDate}
        </p>
        <p className="text-[10px] text-[#2D5A27] font-bold">शामगढ़ (Shamgarh)</p>
      </div>

      {/* Banner Slider */}
      <div className="overflow-hidden rounded-2xl shadow-lg" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner, idx) => (
            <div 
              key={`${banner.id}-${idx}`} 
              onClick={() => setZoomImage({ src: banner.image, alt: banner.title })}
              className="relative flex-[0_0_100%] min-w-0 aspect-[5/4] sm:aspect-[16/9] md:aspect-[21/9] md:max-h-[360px] lg:max-h-[400px] cursor-zoom-in group"
            >
                <SmartImage 
                  src={banner.image} 
                  alt={banner.title} 
                  className="absolute inset-0 w-full h-full"
                  objectFit="cover"
                  priority={idx === 0}
                />
              {appContent?.showBannerText !== false && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                  <h2 className="text-xl md:text-2xl font-bold mb-1">{banner.title}</h2>
                  <p className="text-sm md:text-base opacity-90">{banner.subtitle}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Key Prompt */}
      {user && !userSettings?.geminiApiKey && (
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
              <p className="text-[10px] text-purple-700">बिना किसी रुकावट के AI सुविधाओं का उपयोग करने के लिए अपनी Key डालें।</p>
            </div>
          </div>
          <Link to="/profile" className="bg-purple-600 text-white text-[10px] font-bold px-3 py-2 rounded-lg whitespace-nowrap">
            अभी सेट करें
          </Link>
        </motion.div>
      )}

      {/* AI Intelligence Cards (Side by side on Tablet & Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-1">
        {/* AI Voice Agent Entry Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to="/ai-call">
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 shadow-md border border-gray-100 relative overflow-hidden group active:scale-95 transition-all h-full flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#2D5A27]/10 transition-colors" />
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-[#2D5A27] rounded-2xl blur-lg opacity-20 animate-pulse" />
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#2D5A27] to-[#3D7A35] rounded-2xl flex items-center justify-center text-white relative z-10 shadow-lg">
                    <Phone className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <h3 className="text-lg sm:text-xl font-black text-[#4A3728] leading-normal pt-1 pb-0.5 truncate">AI कृषि विशेषज्ञ कॉल</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5 line-clamp-1 leading-normal py-0.5">सीधे बात करें और समस्या का हल पाएं</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
                    <span className="text-[10px] font-black text-[#2D5A27] uppercase tracking-wider truncate py-0.5">इंसानों की तरह बातचीत</span>
                  </div>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-50 rounded-full flex items-center justify-center text-[#2D5A27] group-hover:bg-[#2D5A27] group-hover:text-white transition-all shrink-0">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* AI Product Knowledge Entry Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to="/ai-product-knowledge">
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 shadow-md border border-gray-100 relative overflow-hidden group active:scale-95 transition-all h-full flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#2D5A27]/10 transition-colors" />
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-[#2D5A27] rounded-2xl blur-lg opacity-20 animate-pulse" />
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#2D5A27] to-[#3D7A35] rounded-2xl flex items-center justify-center text-white relative z-10 shadow-lg">
                    <Sprout className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <h3 className="text-lg sm:text-xl font-black text-[#4A3728] leading-normal pt-1 pb-0.5 truncate">AI उत्पाद जानकारी</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5 line-clamp-1 leading-normal py-0.5">दवाई, खाद या टेक्निकल का सही डोज़ जानें</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
                    <span className="text-[10px] font-black text-[#2D5A27] uppercase tracking-wider truncate py-0.5">सटीक डोज़ और उपयोग विधि</span>
                  </div>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-50 rounded-full flex items-center justify-center text-[#2D5A27] group-hover:bg-[#2D5A27] group-hover:text-white transition-all shrink-0">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Weather, Mandi, & Schemes Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pt-1">
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
            <CloudSun className="w-14 h-14 sm:w-16 sm:h-16 text-white/[0.12] absolute right-3 sm:right-4 bottom-2.5 sm:bottom-3 pointer-events-none" />
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
            <TrendingUp className="w-14 h-14 sm:w-16 sm:h-16 text-[#2D5A27]/[0.08] absolute right-3 sm:right-4 bottom-2.5 sm:bottom-3 pointer-events-none" />
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
            <Landmark className="w-14 h-14 sm:w-16 sm:h-16 text-white/[0.12] absolute right-3 sm:right-4 bottom-2.5 sm:bottom-3 pointer-events-none" />
          </motion.div>
        </Link>
      </div>

      {/* Categories */}
      <section className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[#4A3728]">श्रेणियाँ (Categories)</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/products?category=${cat.id}`)}
              className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-2 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="text-3xl w-10 h-10 flex items-center justify-center overflow-hidden">
                {typeof cat.icon === 'string' ? (
                  cat.icon
                ) : (
                  <SmartImage src={cat.icon} alt={cat.name} className="w-full h-full" objectFit="contain" priority={index < 4} />
                )}
              </div>
              <span className="text-[11px] font-bold text-[#2D5A27] leading-tight">{cat.name}</span>
            </motion.div>
          ))}
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
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-x-auto md:overflow-x-visible pb-2 -mx-1 px-1 snap-x">
          {featuredProducts.length === 0 ? (
            <div className="w-full col-span-full py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-gray-200" />
              <p className="text-xs text-gray-400 font-bold">आज के विशेष उत्पाद जल्द ही आएंगे!</p>
            </div>
          ) : (
            featuredProducts.map((product, idx) => {
              const displayPrice = product.variants && product.variants.length > 0 ? product.variants[0].price : product.price;
              const displayUnit = product.variants && product.variants.length > 0 ? product.variants[0].quantity : product.unit;
              const isInStock = product.inStock !== false;

              return (
                <motion.div 
                  key={`${product.id}-${idx}`} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowDetail(true);
                  }}
                  className={cn(
                    "min-w-[160px] md:min-w-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden snap-start flex flex-col cursor-pointer group hover:shadow-md transition-shadow",
                    !isInStock && "opacity-75 grayscale-[0.5]"
                  )}
                >
                  <div 
                    className="relative h-32 sm:h-36 md:h-40 overflow-hidden cursor-zoom-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomImage({ src: product.image, alt: product.hindiName });
                    }}
                  >
                    <SmartImage 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full transition-transform group-hover:scale-110" 
                      objectFit="cover"
                    />
                    {!isInStock && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg z-10">
                        Out of Stock
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      {product.customId && (
                        <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-tighter mb-1 inline-block">
                          {product.customId}
                        </span>
                      )}
                      <h4 
                        className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-[#2D5A27] transition-colors"
                      >
                        {product.hindiName}
                      </h4>
                      <p className="text-[10px] text-gray-500 mb-2">{displayUnit || (product.hidePrice ? 'किमत उपल्ध नहीं' : '')}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {product.variants && product.variants.length > 0 ? (
                        <span className="text-[10px] font-bold text-[#EAB308] bg-[#2D5A27]/5 px-2 py-1 rounded-lg border border-[#EAB308]/20 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> मात्रा चुनें
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-[#2D5A27]">
                          {product.hidePrice || !displayPrice ? (
                            <span className="text-[10px] text-gray-400 font-medium">कीमत उपलब्ध नहीं</span>
                          ) : (
                            `₹${displayPrice}`
                          )}
                        </span>
                      )}
                      <button 
                        disabled={!isInStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          const pWithPrice = {
                            ...product,
                            price: displayPrice || 0,
                            unit: displayUnit || ''
                          };
                          handleBuyClick(pWithPrice as Product);
                        }}
                        className={cn(
                          "p-2 rounded-lg shadow-sm transition-all",
                          isInStock 
                            ? "bg-[#EAB308] active:scale-90" 
                            : "bg-gray-200 cursor-not-allowed"
                        )}
                      >
                        <ShoppingBag className={cn("w-3.5 h-3.5", isInStock ? "text-[#2D5A27]" : "text-gray-400")} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </section>

      {/* WhatsApp & Social Support Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <button 
          onClick={() => {
            if (whatsappSection.mode === 'group' && whatsappSection.groupLink) {
              window.open(whatsappSection.groupLink, '_blank');
            } else {
              const message = encodeURIComponent("नमस्ते फल्सावदिया कृषि बाजार, मुझे खेती के बारे में जानकारी चाहिए।");
              window.open(`https://wa.me/${contactInfo.whatsapp}?text=${message}`, '_blank');
            }
          }}
          className="w-full bg-[#25D366]/10 border-2 border-[#25D366] rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-transform text-left"
        >
          <div className="bg-[#25D366] p-3 rounded-full shrink-0">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-[#128C7E]">{whatsappSection.title}</h4>
            <p className="text-xs text-gray-700 font-medium">{whatsappSection.description}</p>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#25D366] uppercase">
              {whatsappSection.mode === 'group' ? 'ग्रुप में शामिल हों' : 'मैसेज करें'} <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </button>

        {/* Social Media Cards (Side by Side) */}
        {(facebookSection.enabled || instagramSection.enabled) && (
          <div className={cn(
            "grid gap-3",
            facebookSection.enabled && instagramSection.enabled ? "grid-cols-2" : "grid-cols-1"
          )}>
            {/* Facebook Card */}
            {facebookSection.enabled && (
              <button 
                onClick={() => {
                  const url = facebookSection.pageUrl.trim() || 'https://www.facebook.com';
                  window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
                }}
                className="w-full bg-[#1877F2]/10 border-2 border-[#1877F2] rounded-2xl p-3 sm:p-4 flex flex-col justify-between items-start gap-2.5 active:scale-95 transition-transform text-left cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2.5 w-full">
                  <div className="bg-[#1877F2] p-2.5 rounded-full shrink-0 shadow-xs">
                    <Facebook className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-[#1877F2] truncate">{facebookSection.title}</h4>
                    <p className="text-[10px] sm:text-xs text-gray-600 font-medium line-clamp-1">{facebookSection.description}</p>
                  </div>
                </div>
                <div className="w-full pt-1.5 border-t border-[#1877F2]/20 flex items-center justify-between text-[10px] font-bold text-[#1877F2] uppercase">
                  <span className="truncate">{facebookSection.buttonText}</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </div>
              </button>
            )}

            {/* Instagram Card */}
            {instagramSection.enabled && (
              <button 
                onClick={() => {
                  const url = instagramSection.profileUrl.trim() || 'https://www.instagram.com';
                  window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
                }}
                className="w-full bg-[#E1306C]/10 border-2 border-[#E1306C] rounded-2xl p-3 sm:p-4 flex flex-col justify-between items-start gap-2.5 active:scale-95 transition-transform text-left cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2.5 w-full">
                  <div className="bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-2.5 rounded-full shrink-0 shadow-xs">
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-[#C13584] truncate">{instagramSection.title}</h4>
                    <p className="text-[10px] sm:text-xs text-gray-600 font-medium line-clamp-1">{instagramSection.description}</p>
                  </div>
                </div>
                <div className="w-full pt-1.5 border-t border-[#E1306C]/20 flex items-center justify-between text-[10px] font-bold text-[#C13584] uppercase">
                  <span className="truncate">{instagramSection.buttonText}</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </div>
              </button>
            )}
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="bg-[#F5F2ED] p-2 rounded-lg shrink-0">
            <MapPin className="w-5 h-5 text-[#2D5A27]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">हमारा पता (Our Address)</p>
            <p className="text-xs text-[#4A3728] font-bold leading-relaxed">
              {contactInfo.address}
            </p>
          </div>
        </div>
      </div>

      {/* Partner Logos Slider */}
      <section className="py-4 overflow-hidden">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">हमारे टॉप ब्रांड्स (Our Top Brands)</p>
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
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#4A3728] flex items-center gap-2">
            <Youtube className="w-6 h-6 text-red-600" />
            खेती की वीडियो (Videos)
          </h3>
          <a 
            href={youtubeChannel.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-bold text-red-600 flex items-center gap-1"
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
                  className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform"
                >
                  <div className="aspect-video relative">
                    <SmartImage 
                      src={video.thumbnail} 
                      alt={video.title} 
                      className="absolute inset-0 w-full h-full"
                      objectFit="cover"
                    />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                      <div className="bg-red-600 text-white w-14 h-10 rounded-[14px] flex items-center justify-center shadow-xl group-hover:bg-red-700 transition-colors">
                        <Play className="w-6 h-6 fill-white text-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-bold text-gray-800">{video.title}</h4>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Farming Tips */}
      <section className="bg-[#4A3728] rounded-2xl p-4 text-white space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Sprout className="w-5 h-5 text-[#EAB308]" />
            आज की सलाह (Today's Tip)
          </h3>
          <button 
            onClick={handleOpenChat}
            disabled={isAiLoading}
            className="bg-[#EAB308] text-[#2D5A27] text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI सलाह लें
          </button>
        </div>
        
        {aiAdvice ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm opacity-90 leading-relaxed bg-white/10 p-3 rounded-xl border border-white/10"
          >
            {aiAdvice}
          </motion.div>
        ) : (
          <p className="text-sm opacity-90 leading-relaxed">
            {dailyTip}
          </p>
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
