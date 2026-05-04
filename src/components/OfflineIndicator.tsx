import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';

const OfflineIndicator: React.FC = () => {
  const { isQuotaExceeded } = useAppContext();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showIndicator = isOffline || showStatus || isQuotaExceeded;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-[100] max-w-md mx-auto px-4 pt-2 transition-colors`}
        >
          <div className={`flex items-center justify-between px-4 py-2 rounded-xl shadow-lg border ${
            isOffline 
              ? "bg-red-500 text-white border-red-400" 
              : isQuotaExceeded
                ? "bg-amber-500 text-white border-amber-400"
                : "bg-green-500 text-white border-green-400"
          }`}>
            <div className="flex items-center gap-2">
              {isOffline ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold leading-none">आप ऑफलाइन हैं (Offline)</span>
                    <span className="text-[9px] opacity-90 leading-tight">कैश्ड डेटा दिखाया जा रहा है</span>
                  </div>
                </>
              ) : isQuotaExceeded ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold leading-none">सीमित मोड (Quota Limit)</span>
                    <span className="text-[9px] opacity-90 leading-tight">आज की सीमा समाप्त, कल रिसेट होगी</span>
                  </div>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  <span className="text-[11px] font-bold">वापस ऑनलाइन! (Online)</span>
                </>
              )}
            </div>
            {(isOffline || isQuotaExceeded) && (
              <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-lg">
                <Info className="w-3 h-3" />
                <span className="text-[9px] font-bold">Safe Mode</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
