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
    name: 'फल्सावदिया कृषि बाज़ार',
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
          className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center p-8 max-w-md mx-auto"
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
            className="w-40 h-40 relative"
          >
            <div className="absolute inset-0 bg-[#2D5A27]/5 rounded-[3rem] blur-3xl animate-pulse" />
            <div className="relative w-full h-full bg-white rounded-[2.5rem] shadow-xl p-6 border border-gray-100 flex items-center justify-center overflow-hidden">
               <SmartImage 
                 src={branding.splashLogo || branding.logo} 
                 fallbackSrc="/icon-512.png"
                 alt="Splash Logo"
                 className="w-full h-full"
                 objectFit="contain"
               />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <h1 className="text-2xl font-black text-[#4A3728] tracking-tight">{branding.name}</h1>
            <p className="text-[#2D5A27] font-bold text-sm mt-2 tracking-widest uppercase opacity-70">{branding.tagline}</p>
          </motion.div>

          <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2">
            <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-full h-full bg-[#2D5A27]"
              />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading Your Farm Store...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
