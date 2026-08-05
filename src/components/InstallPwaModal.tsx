import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

/**
 * Component to handle PWA installation prompt
 */
const InstallPwaModal: React.FC = () => {
  const { appContent } = useAppContext();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if prompt was captured globally before react mounted
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
      setIsVisible(true);
    }

    const handlePromptReady = (e: any) => {
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e);
      // Show immediately on open
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
      setIsVisible(false);
      setIsInstalled(true);
      console.log('PWA was installed');
    };

    (window as any).onPwaPromptReady = handlePromptReady;
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If no beforeinstallprompt fired within 1s, show modal anyway so user has install guidance
    const timer = setTimeout(() => {
      if (!window.matchMedia('(display-mode: standalone)').matches && !(window as any).hasDismissedInstall) {
        setIsVisible(true);
      }
    }, 1000);

    return () => {
      delete (window as any).onPwaPromptReady;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPwaPrompt;

    if (promptEvent && typeof promptEvent.prompt === 'function') {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
        (window as any).deferredPwaPrompt = null;
        setIsVisible(false);
      } catch (err) {
        console.warn("Prompt error:", err);
      }
    } else {
      // Fallback guidance if browser doesn't expose prompt object directly
      alert("ऐप इंस्टॉल करने के लिए:\n1. अपने ब्राउज़र के तीन डॉट्स (⋮) या Share बटन पर क्लिक करें।\n2. 'Install app' या 'Add to Home Screen' चुनें।");
      setIsVisible(false);
    }
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsVisible(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-8 text-center"
          >
            <button 
              onClick={() => setIsVisible(false)}
              className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 bg-[#2D5A27]/10 rounded-[28px] flex items-center justify-center mx-auto mb-6">
              <Smartphone className="w-10 h-10 text-[#2D5A27]" />
            </div>

            <h3 className="text-xl font-black text-[#4A3728] mb-2">
              मोबाइल ऐप इंस्टॉल करें
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              बेहतर अनुभव और सीधी पहुंच के लिए {appContent?.branding?.name || 'कृषि बाज़ार'} को अपने फोन पर इंस्टॉल करें।
            </p>

            <div className="space-y-4 text-left bg-gray-50 p-4 rounded-2xl mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">बिना ब्राउज़र के तेज़ी से उपयोग करें</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">AI कृषि विशेषज्ञ से तुरंत सलाह प्राप्त करें</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">ऑफ़लाइन होने पर भी जानकारी देखें</p>
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              className="w-full bg-[#2D5A27] text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-green-100 active:scale-95 transition-all"
            >
              <Download className="w-6 h-6" />
              अभी इंस्टॉल करें (Install Now)
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="mt-4 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              बाद में देखें
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstallPwaModal;
