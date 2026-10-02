import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, X, ExternalLink, Youtube, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import useAiGuard from '../hooks/useAiGuard';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, message }) => {
  const { appContent, updateUserSettings } = useAppContext();
  const { apiKey: currentKey } = useAiGuard();
  const [inputKey, setInputKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputKey(currentKey || '');
      setSaveSuccess(false);
    }
  }, [isOpen, currentKey]);

  const handleSaveKey = async () => {
    const cleaned = inputKey.trim();
    if (!cleaned) return;

    setIsSaving(true);
    try {
      localStorage.setItem('falsawdiya_user_gemini_api_key', cleaned);
      await updateUserSettings({ geminiApiKey: cleaned });
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (e) {
      console.error("Failed to save API key from modal:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-sm max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl z-[201]"
          >
            <div className="bg-[#2D5A27] p-5 text-white text-center relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                <Key className="w-7 h-7 text-[#EAB308]" />
              </div>
              <h3 className="text-lg font-bold">API Key आवश्यक है</h3>
              <p className="text-xs text-white/80 mt-0.5">अपनी व्यक्तिगत Gemini Key दर्ज करें</p>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-600 text-center font-medium leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                {message || "ऐप के सभी AI फीचर्स केवल आपकी अपनी व्यक्तिगत API Key से चलेंगे।"}
              </p>

              {/* Direct Input Field */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 block">
                  अपनी Gemini API Key यहाँ पेस्ट करें:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27]"
                  />
                  <button
                    onClick={handleSaveKey}
                    disabled={isSaving || !inputKey.trim() || saveSuccess}
                    className="px-4 py-2.5 bg-[#2D5A27] text-white text-xs font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      "सेव करें"
                    )}
                  </button>
                </div>
                {saveSuccess && (
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <Check className="w-3.5 h-3.5" /> Key सफलतापूर्वक सहेज ली गई!
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-1 border-t border-gray-100">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 active:scale-95 transition-transform"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5" /> फ्री Key यहाँ से जनरेट करें
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <a 
                  href={appContent?.apiKeyGuideVideoUrl || "https://www.youtube.com/results?search_query=how+to+get+gemini+api+key"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100 active:scale-95 transition-transform"
                >
                  <span className="flex items-center gap-2">
                    <Youtube className="w-3.5 h-3.5" /> वीडियो गाइड देखें
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <Link 
                to="/profile" 
                onClick={onClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                प्रोफाइल पेज पर जाकर सेट करें
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ApiKeyModal;
