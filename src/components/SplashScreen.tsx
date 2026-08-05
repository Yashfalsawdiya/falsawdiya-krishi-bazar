import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import SmartImage from './SmartImage';

const SplashScreen: React.FC = () => {
  const { appContent } = useAppContext();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1600);
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
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center p-6 w-full h-full select-none"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.4,
              ease: "easeOut"
            }}
            className="w-44 h-44 relative flex items-center justify-center"
          >
            <SmartImage 
              src={branding.splashLogo || branding.logo} 
              fallbackSrc="/icon-512.png"
              alt="Splash Logo"
              className="w-full h-full object-contain filter drop-shadow-sm"
              objectFit="contain"
            />
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-6 text-center"
          >
            <h1 className="text-2xl font-black text-[#2D5A27] tracking-tight">{branding.name}</h1>
            <p className="text-[#4A3728] font-bold text-xs mt-1.5 tracking-wider uppercase opacity-80">{branding.tagline}</p>
          </motion.div>

          <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2">
            <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="w-full h-full bg-[#2D5A27]"
              />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">फल्सावदिया कृषि बाज़ार...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
