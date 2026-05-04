import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon, RefreshCw, Info } from 'lucide-react';
import { detectDisease } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { useAppContext } from '../context/AppContext';
import ApiKeyModal from '../components/ApiKeyModal';

const DiseaseDetection: React.FC = () => {
  const { appContent, userSettings } = useAppContext();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const whatsappNumber = appContent?.contactInfo.whatsapp || '918982338046';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    
    const globalKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!userSettings?.geminiApiKey && !globalKey) {
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const analysis = await detectDisease(image, userSettings?.geminiApiKey || globalKey);
      setResult(analysis);
    } catch (error) {
      console.error("Analysis failed:", error);
      setResult("क्षमा करें, जाँच करने में समस्या हुई। कृपया फिर से प्रयास करें।");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <div className="space-y-6 pb-10">
      <ApiKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728]">बीमारी की सटीक जाँच (AI Scan)</h2>
        <p className="text-sm text-gray-500">फोटो चुनें और तुरंत समाधान पाएं</p>
      </div>

      <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-white rounded-3xl border-4 border-dashed border-[#2D5A27]/20 flex flex-col items-center justify-center overflow-hidden shadow-xl transition-all">
        {image ? (
          <div className="relative w-full h-full group">
            <img src={image} alt="Crop" className="w-full h-full object-cover" />
            <button 
              onClick={reset}
              className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm active:scale-90 transition-transform"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-[#F5F2ED] rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-[#2D5A27] opacity-40" />
            </div>
            <p className="text-sm text-gray-500 font-bold mb-1">कोई फोटो नहीं चुनी गई</p>
            <p className="text-[11px] text-gray-400">पौधे के प्रभावित हिस्से की साफ़ फोटो अपलोड करें</p>
          </div>
        )}
        
        {/* Hidden Inputs */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden" 
          ref={cameraInputRef}
          onChange={handleImageUpload}
        />
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={galleryInputRef}
          onChange={handleImageUpload}
        />
      </div>

      {!result && (
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => cameraInputRef.current?.click()}
            className="bg-white border-2 border-[#2D5A27] text-[#2D5A27] py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform"
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs">कैमरा (Camera)</span>
          </button>
          <button 
            onClick={() => galleryInputRef.current?.click()}
            className="bg-white border-2 border-[#2D5A27] text-[#2D5A27] py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform"
          >
            <ImageIcon className="w-6 h-6" />
            <span className="text-xs">गैलरी (Gallery)</span>
          </button>
        </div>
      )}

      {image && !result && (
        <motion.button 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={analyzeImage}
          disabled={loading}
          className="w-full bg-[#2D5A27] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>जाँच हो रही है...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6" />
              <span>जाँच करें (Analyze Now)</span>
            </>
          )}
        </motion.button>
      )}

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="bg-[#EAB308] p-2 rounded-xl">
                <AlertCircle className="w-5 h-5 text-[#2D5A27]" />
              </div>
              <h3 className="font-bold text-[#4A3728]">जाँच का परिणाम (AI Result)</h3>
            </div>

            <div className="prose prose-sm max-w-none">
              <div className="markdown-body text-sm leading-relaxed text-gray-700">
                <Markdown>{result}</Markdown>
              </div>
            </div>
            
            <div className="pt-4 space-y-3">
              <div className="bg-blue-50 p-3 rounded-xl flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-700 font-medium">यह जानकारी AI द्वारा दी गई है। बड़े पैमाने पर छिड़काव से पहले कृषि विशेषज्ञ की सलाह अवश्य लें।</p>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={reset}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                >
                  फिर से जाँचें
                </button>
                <a 
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                    `नमस्ते फल्सावदिया कृषि बाज़ार विशेषज्ञ,\n\n` +
                    `मैंने अभी ऐप के माध्यम से अपनी फसल की जाँच की है।\n\n` +
                    `*AI द्वारा दी गई जाँच रिपोर्ट:*\n${result}\n\n` +
                    `*मेरा सवाल:* कृपया इस रिपोर्ट को देखें और मुझे सही दवा और मात्रा के बारे में विस्तार से बताएं। मैं अपनी फसल की फोटो भी साथ में भेज रहा हूँ।\n\n` +
                    `धन्यवाद!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-[2] bg-[#25D366] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                >
                  विशेषज्ञ से पूछें (WhatsApp)
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Removed duplicate import fix at bottom
export default DiseaseDetection;
