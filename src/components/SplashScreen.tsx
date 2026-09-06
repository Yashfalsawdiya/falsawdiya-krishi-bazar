import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import SmartImage from './SmartImage';

const SplashScreen: React.FC = () => {
  const { appContent } = useAppContext();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2500);
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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[1000] w-full h-full min-h-screen bg-white flex flex-col items-center justify-center p-6 sm:p-8 md:p-10 lg:p-12 overflow-hidden select-none"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring",
              damping: 12,
              stiffness: 100,
              delay: 0.2
            }}
            className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 xl:w-72 xl:h-72 relative transition-all duration-300"
          >
            <div className="absolute inset-0 bg-[#2D5A27]/5 rounded-[3rem] sm:rounded-[3.5rem] md:rounded-[4rem] lg:rounded-[4.5rem] blur-3xl animate-pulse" />
            <div className="relative w-full h-full bg-transparent rounded-[2.5rem] sm:rounded-[2.75rem] md:rounded-[3rem] lg:rounded-[3.5rem] shadow-xl p-6 sm:p-7 md:p-8 lg:p-10 border border-gray-100 flex items-center justify-center overflow-hidden">
               <SmartImage 
                 src={branding.splashLogo || branding.logo} 
                 fallbackSrc="/icon-512.png"
                 alt="Splash Logo"
                 className="w-full h-full"
                 objectFit="contain"
               />
               {/* Subtle texture to give logo depth on transparent background */}
               <div className="absolute inset-0 bg-white/40 -z-10" />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 sm:mt-9 md:mt-10 lg:mt-12 text-center max-w-xl lg:max-w-3xl px-4"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#4A3728] tracking-tight leading-tight">
              {branding.name}
            </h1>
            <p className="text-[#2D5A27] font-bold text-sm sm:text-base md:text-lg lg:text-xl mt-2 sm:mt-2.5 md:mt-3 lg:mt-3.5 tracking-widest uppercase opacity-70 sm:opacity-80">
              {branding.tagline}
            </p>
          </motion.div>

          <div className="absolute bottom-8 sm:bottom-10 md:bottom-12 lg:bottom-14 left-0 right-0 flex flex-col items-center gap-2 sm:gap-2.5 md:gap-3 px-4">
            <div className="w-12 sm:w-16 md:w-20 lg:w-24 h-1 sm:h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-full h-full bg-[#2D5A27]"
              />
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest text-center">
              Loading Your Farm Store...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
