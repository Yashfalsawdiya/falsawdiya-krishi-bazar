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
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      window.dispatchEvent(new Event('pwa-prompt-changed'));
      
      // Delay surfacing the prompt to give user time to engage with content
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000); // Show after 5 seconds of browsing

      return () => clearTimeout(timer);
    };

    const handleAppInstalled = () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      window.dispatchEvent(new Event('pwa-prompt-changed'));
      setIsVisible(false);
      setIsInstalled(true);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Provide globally accessible trigger
    (window as any).triggerPwaInstall = () => {
      setIsVisible(true);
    };

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      delete (window as any).triggerPwaInstall;
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;
    if (!promptEvent) return;

    // Show the install prompt
    promptEvent.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
    window.dispatchEvent(new Event('pwa-prompt-changed'));
    setIsVisible(false);
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
              <Download className="w-10 h-10 text-[#2D5A27]" />
            </div>

            <h3 className="text-xl font-black text-[#4A3728] mb-2">
              ऐप इंस्टॉल करें (Install App)
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              बेहतर अनुभव, सीधी पहुंच और बिना इंटरनेट जानकारी के लिए **{appContent?.branding?.name || 'फल्सावदिया कृषि बाज़ार'}** को अपने मोबाइल या कंप्यूटर (Desktop) पर इंस्टॉल करें।
            </p>

            <div className="space-y-4 text-left bg-gray-50 p-4 rounded-2xl mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">मोबाइल और कंप्यूटर (Desktop/Mobile) दोनों के लिए उपलब्ध</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">ऐप बाज़ार और ऐप ड्रॉवर में सीधी पहुँच</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">ऑफ़लाइन होने पर भी मंडी भाव और समाचार लोड होंगे</p>
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
