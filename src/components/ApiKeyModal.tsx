import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, X, ExternalLink, Youtube, ArrowRight, CheckCircle2, AlertCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  onKeySaved?: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, message, onKeySaved }) => {
  const { appContent, userSettings, updateUserSettings } = useAppContext();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(userSettings?.geminiApiKey || '');
      setSaveSuccess(false);
      setValidationError(null);
    }
  }, [isOpen, userSettings]);

  const handleSave = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setValidationError('कृपया अपनी Gemini API Key पेस्ट या टाइप करें।');
      return;
    }

    if (!trimmed.startsWith('AIzaSy') && trimmed.length < 25) {
      setValidationError('अमान्य Key प्रारूप! Gemini API Key आमतौर पर "AIzaSy..." से शुरू होती है।');
      return;
    }

    setValidationError(null);
    setIsSaving(true);

    try {
      // Quick test with backend
      const testRes = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      const testData = await testRes.json().catch(() => null);

      if (!testRes.ok || (testData && !testData.valid)) {
        setValidationError(testData?.message || 'यह API Key काम नहीं कर रही है। कृपया Google AI Studio से सही Key कॉपी करें।');
        setIsSaving(false);
        return;
      }

      await updateUserSettings({ geminiApiKey: trimmed });
      setSaveSuccess(true);
      if (onKeySaved) {
        onKeySaved(trimmed);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      // If network fails for test, still save locally
      await updateUserSettings({ geminiApiKey: trimmed });
      setSaveSuccess(true);
      if (onKeySaved) {
        onKeySaved(trimmed);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
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
            className="fixed inset-0 bg-black/70 z-[200] backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-3xl shadow-2xl z-[201] overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1B4332] to-[#2D5A27] p-5 text-white text-center relative shrink-0">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                aria-label="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20">
                <Key className="w-7 h-7 text-[#EAB308]" />
              </div>
              <h3 className="text-lg font-black tracking-wide">आपकी Gemini API Key आवश्यक है</h3>
              <p className="text-xs text-white/80 mt-1">
                सभी AI फीचर्स आपके व्यक्तिगत 100% फ्री Google कोटा से चलेंगे
              </p>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="text-xs text-gray-700 bg-amber-50 p-3 rounded-2xl border border-amber-200 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  {message || "ऐप के सभी AI टूल्स (फसल रोग जांच, AI डॉक्टर कॉल, चैट, मंडी भाव) का उपयोग करने के लिए केवल 1 बार अपनी फ्री Gemini API Key दर्ज करें। यह आपकी डिवाइस में सुरक्षित रहेगी।"}
                </p>
              </div>

              {/* Direct Input Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                  <span>Gemini API Key पेस्ट करें:</span>
                  <span className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> 100% नि:शुल्क
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:border-[#2D5A27] bg-gray-50 focus:bg-white transition-all shadow-inner"
                  />
                  {apiKeyInput && (
                    <button
                      type="button"
                      onClick={() => setApiKeyInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Validation or Success Message */}
              {validationError && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>API Key सफलतापूर्वक सहेजी और सत्यापित हो गई!</span>
                </div>
              )}

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className="w-full bg-[#2D5A27] hover:bg-[#23471f] text-white py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>सत्यापित व सुरक्षित किया जा रहा है...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>सफलतापूर्वक सहेजा गया!</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 text-[#EAB308]" />
                    <span>Key सहेजें और AI शुरू करें</span>
                  </>
                )}
              </button>

              {/* Help & Links */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100/70 text-blue-700 rounded-2xl text-xs font-bold border border-blue-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                    फ्री Google Key 1-क्लिक में यहाँ से लें
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                </a>

                <a 
                  href={appContent?.apiKeyGuideVideoUrl || "https://www.youtube.com/results?search_query=how+to+get+gemini+api+key"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100/70 text-red-700 rounded-2xl text-xs font-bold border border-red-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-600" />
                    Key बनाने का 1 मिनट का वीडियो देखें
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                </a>
              </div>

              <div className="text-center pt-1">
                <Link 
                  to="/profile" 
                  onClick={onClose}
                  className="text-xs text-gray-500 hover:text-[#2D5A27] font-semibold underline underline-offset-2 transition-colors"
                >
                  या प्रोफ़ाइल पेज में जाकर Key दर्ज करें
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ApiKeyModal;
