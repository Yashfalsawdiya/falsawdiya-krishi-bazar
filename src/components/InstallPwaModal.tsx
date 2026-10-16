import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, CheckCircle2, Share, PlusSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SmartImage from './SmartImage';

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

  const appName = appContent?.branding?.name || 'फल्सावदिया कृषि बाजार';

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          {/* Frosted Modern Backdrop with ambient blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          {/* Elevated Modern Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 320 }}
            className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-6 sm:p-8 text-center border border-gray-100/90"
          >
            {/* Top Subtle Emerald Gradient Accent Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-emerald-500 via-[#2D5A27] to-teal-500 rounded-full" />

            {/* Tactile Close Button */}
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 bg-gray-100/70 hover:bg-gray-200/80 active:scale-90 rounded-full text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Floating Logo Badge with ambient glow */}
            <div className="relative mx-auto mb-4 group inline-block">
              <div className="w-20 h-20 sm:w-22 sm:h-22 bg-white rounded-3xl shadow-md border border-gray-100 flex items-center justify-center p-2.5 transition-transform duration-300 group-hover:scale-105 relative">
                <SmartImage 
                  src={appContent?.branding?.logo} 
                  fallbackSrc="/icon-192.png" 
                  alt="App Logo" 
                  className="w-full h-full object-contain relative z-10" 
                  priority
                />
                {/* Floating Download Indicator Badge */}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#2D5A27] text-white flex items-center justify-center shadow-md border-2 border-white z-20">
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
              <div className="absolute -inset-1.5 bg-emerald-500/15 rounded-3xl blur-md -z-10" />
            </div>

            {/* Modal Title & Subtitle */}
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
              मोबाइल ऐप इंस्टॉल करें
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-5 leading-relaxed font-medium">
              तेज़ और आसान उपयोग के लिए <span className="font-bold text-gray-700">{appName}</span> को अपने फोन पर इंस्टॉल करें।
            </p>

            {isIOS ? (
              // iOS Safari-specific install guide
              <div className="space-y-3 text-left bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/80 p-4.5 rounded-2xl mb-5 shadow-2xs">
                <p className="text-xs font-bold text-[#2D5A27] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#2D5A27]" />
                  iPhone / iPad पर इंस्टॉल करने का तरीका:
                </p>
                <div className="flex items-start gap-2.5 text-xs text-gray-700">
                  <div className="p-1.5 bg-white rounded-xl shadow-xs text-[#2D5A27] mt-0.5 border border-emerald-100 shrink-0">
                    <Share className="w-3.5 h-3.5" />
                  </div>
                  <p className="leading-snug">1. Safari ब्राउज़र में नीचे <strong>Share (शेयर)</strong> बटन दबाएं</p>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-gray-700">
                  <div className="p-1.5 bg-white rounded-xl shadow-xs text-[#2D5A27] mt-0.5 border border-emerald-100 shrink-0">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </div>
                  <p className="leading-snug">2. नीचे स्क्रॉल करके <strong>'Add to Home Screen'</strong> (होम स्क्रीन में जोड़ें) चुनें</p>
                </div>
              </div>
            ) : (
              // Android / Chrome / Desktop features highlight
              <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white border border-emerald-100/90 rounded-2xl p-4 sm:p-4.5 mb-5 text-left shadow-2xs space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-800 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 leading-snug">
                    बिना ब्राउज़र के 1-क्लिक में सीधा उपयोग करें
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-800 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 leading-snug">
                    AI कृषि डॉक्टर व मंडी भाव तुरंत देखें
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-800 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 leading-snug">
                    ऑफ़लाइन होने पर भी आवश्यक जानकारी उपलब्ध
                  </p>
                </div>
              </div>
            )}

            {/* Install Button */}
            {!isIOS && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-[#2D5A27] to-[#1f421a] hover:from-[#23481f] hover:to-[#173313] text-white py-3.5 sm:py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-md shadow-[#2D5A27]/25 hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer group"
              >
                <Download className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:translate-y-0.5" />
                <span>अभी इंस्टॉल करें (Install App)</span>
              </button>
            )}

            {/* Dismiss / Later Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors py-2 block w-full rounded-xl hover:bg-gray-100/70 cursor-pointer"
            >
              {isIOS ? 'समझ गया (Got It)' : 'बाद में देखें'}
            </button>

            {/* Trust Footer */}
            <div className="mt-2 pt-2.5 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>सुरक्षित व हल्का • 0 MB अतिरिक्त स्टोरेज</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstallPwaModal;
