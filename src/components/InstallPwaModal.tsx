import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, CheckCircle, Share, PlusSquare } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

/**
 * Component to handle PWA installation prompt with cross-platform support (Android, iOS Safari, Chrome, Edge, Desktop)
 */
const InstallPwaModal: React.FC = () => {
  const { appContent } = useAppContext();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone (installed) mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed prompt in this session
    const hasDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (hasDismissed) {
      return;
    }

    // Detect iOS devices (iPhone, iPad, iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    setIsIOS(isAppleDevice);

    if (isAppleDevice) {
      // For iOS Safari, show prompt after 5 seconds of browsing
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent automatic browser mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);

      // Surface prompt after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 4000);

      return () => clearTimeout(timer);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome/Edge/Android native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsVisible(false);
    } else if (isIOS) {
      // Keep visible so iOS user reads the instructions
    } else {
      // Fallback for browsers without beforeinstallprompt
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-6 sm:p-8 text-center"
          >
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#2D5A27]/10 rounded-[28px] flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Smartphone className="w-8 h-8 sm:w-10 sm:h-10 text-[#2D5A27]" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-[#4A3728] mb-1.5">
              मोबाइल ऐप इंस्टॉल करें
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 leading-relaxed">
              तेज़ और आसान उपयोग के लिए {appContent?.branding?.name || 'कृषि बाजार'} को अपने फोन पर इंस्टॉल करें।
            </p>

            {isIOS ? (
              // iOS Safari-specific install guide
              <div className="space-y-3 text-left bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl mb-6">
                <p className="text-xs font-bold text-[#2D5A27] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  iPhone / iPad पर इंस्टॉल करने का तरीका:
                </p>
                <div className="flex items-start gap-2.5 text-xs text-gray-700">
                  <div className="p-1 bg-white rounded-lg shadow-xs text-[#2D5A27] mt-0.5">
                    <Share className="w-3.5 h-3.5" />
                  </div>
                  <p>1. Safari के नीचे <strong>Share (शेयर)</strong> बटन दबाएं</p>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-gray-700">
                  <div className="p-1 bg-white rounded-lg shadow-xs text-[#2D5A27] mt-0.5">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </div>
                  <p>2. नीचे स्क्रॉल करके <strong>'Add to Home Screen'</strong> (होम स्क्रीन में जोड़ें) चुनें</p>
                </div>
              </div>
            ) : (
              // Android / Chrome features
              <div className="space-y-3 text-left bg-gray-50 p-4 rounded-2xl mb-6">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">बिना ब्राउज़र के 1-क्लिक में सीधा उपयोग करें</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">AI कृषि डॉक्टर व मंडी भाव तुरंत देखें</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">ऑफ़लाइन होने पर भी आवश्यक जानकारी उपलब्ध</p>
                </div>
              </div>
            )}

            {!isIOS && (
              <button
                onClick={handleInstallClick}
                className="w-full bg-[#2D5A27] hover:bg-[#2D5A27]/90 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-[#2D5A27]/20 active:scale-95 transition-all"
              >
                <Download className="w-5 h-5" />
                अभी इंस्टॉल करें (Install App)
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="mt-3 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors py-1 block w-full"
            >
              {isIOS ? 'समझ गया (Got It)' : 'बाद में देखें'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstallPwaModal;
