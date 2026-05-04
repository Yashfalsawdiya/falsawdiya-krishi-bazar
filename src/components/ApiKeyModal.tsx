import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, X, ExternalLink, Youtube, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const { appContent } = useAppContext();

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-3xl shadow-2xl z-[201] overflow-hidden"
          >
            <div className="bg-[#2D5A27] p-6 text-white text-center relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <Key className="w-8 h-8 text-[#EAB308]" />
              </div>
              <h3 className="text-xl font-bold">API Key आवश्यक है</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 text-center font-medium leading-relaxed">
                "कृपया अपनी API Key जनरेट करके दर्ज करें, ताकि आप ऐप की सभी फ्री AI सुविधाओं का लाभ ले सकें।"
              </p>

              <div className="space-y-2">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-2xl text-sm font-bold border border-blue-100 active:scale-95 transition-transform"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> फ्री Key यहाँ से लें
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a 
                  href={appContent?.apiKeyGuideVideoUrl || "https://www.youtube.com/results?search_query=how+to+get+gemini+api+key"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold border border-red-100 active:scale-95 transition-transform"
                >
                  <span className="flex items-center gap-2">
                    <Youtube className="w-4 h-4" /> वीडियो गाइड देखें
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              <Link 
                to="/profile" 
                onClick={onClose}
                className="w-full bg-[#2D5A27] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
              >
                प्रोफाइल में Key दर्ज करें
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ApiKeyModal;
