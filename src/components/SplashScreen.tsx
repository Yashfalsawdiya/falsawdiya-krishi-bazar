import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import SmartImage from './SmartImage';
import { ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';

const SplashScreen: React.FC = () => {
  const { appContent } = useAppContext();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(timer);
  }, []);

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान',
    logo: '',
    splashLogo: ''
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[1000] w-full h-full min-h-screen bg-gradient-to-b from-[#F3F7F2] via-[#FAF8F5] to-[#EEF5EC] flex flex-col items-center justify-center p-6 sm:p-8 md:p-10 overflow-hidden select-none"
        >
          {/* Ambient Natural Lighting & Agricultural Mesh */}
          <div className="absolute -top-28 -right-28 w-80 sm:w-96 h-80 sm:h-96 bg-amber-200/35 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -left-28 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-300/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#2D5A27_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.035] pointer-events-none" />

          {/* Center Hero: Floating Brand Card & Agriculture Highlights */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Floating Store Logo with Halo */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ 
                type: "spring",
                damping: 14,
                stiffness: 120,
                delay: 0.15
              }}
              className="relative group"
            >
              {/* Organic glowing background halo */}
              <div className="absolute -inset-3 bg-gradient-to-tr from-emerald-500/25 via-teal-400/20 to-amber-300/25 rounded-[3rem] blur-xl animate-pulse" />

              {/* Crisp Pure White Squircle Card */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 bg-white/95 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl shadow-emerald-950/15 border-2 border-emerald-100 flex items-center justify-center p-5 sm:p-6 overflow-hidden">
                <SmartImage 
                  src={branding.splashLogo || branding.logo} 
                  fallbackSrc="/icon-512.png"
                  alt="Splash Logo"
                  className="w-full h-full object-contain relative z-10 drop-shadow-xs"
                  priority
                />
              </div>
            </motion.div>

            {/* Brand Title and Agricultural Tagline */}
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-6 sm:mt-7 max-w-xl px-4"
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#263D20] tracking-tight leading-tight">
                {branding.name}
              </h1>
              <p className="text-xs sm:text-sm md:text-base font-bold text-[#5c4028] mt-1.5 tracking-wide">
                {branding.tagline}
              </p>

              {/* Agricultural Feature Pillars */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mt-5">
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-sm border border-emerald-200/80 text-[11px] sm:text-xs font-bold text-emerald-900 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>प्रमाणित खाद-बीज</span>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-sm border border-emerald-200/80 text-[11px] sm:text-xs font-bold text-emerald-900 shadow-2xs">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>दैनिक ताज़ा मंडी भाव</span>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-sm border border-emerald-200/80 text-[11px] sm:text-xs font-bold text-emerald-900 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AI फसल डॉक्टर</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Subtle Rolling Farm Landscape Contours at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden pointer-events-none opacity-20">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full text-emerald-600 fill-current">
              <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,50 L1200,120 L0,120 Z" />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
