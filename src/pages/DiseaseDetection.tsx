import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon, RefreshCw, Info, ShoppingCart, ArrowRight, X } from 'lucide-react';
import { detectDisease, DiseaseAnalysis } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import Markdown from 'react-markdown';
import { useAppContext } from '../context/AppContext';
import ApiKeyModal from '../components/ApiKeyModal';

const DiseaseDetection: React.FC = () => {
  const { appContent, userSettings, products } = useAppContext();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DiseaseAnalysis | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const whatsappNumber = appContent?.contactInfo.whatsapp || '918982338046';

  // Find matching products from shop
  const matchedProducts = products.filter(p => {
    if (!analysisResult?.keywords) return false;
    const searchStr = `${p.name} ${p.hindiName} ${p.category} ${p.description || ''}`.toLowerCase();
    return analysisResult.keywords.some(k => searchStr.includes(k.toLowerCase()));
  }) || [];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    
    if (!userSettings?.geminiApiKey) {
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const analysis = await detectDisease(image, userSettings.geminiApiKey);
      if (analysis.analysis === "USER_API_KEY_REQUIRED") {
        setIsModalOpen(true);
        return;
      }
      setAnalysisResult(analysis);
    } catch (error: any) {
      console.error("Analysis failed:", error);
      if (error.message === "USER_API_KEY_REQUIRED") {
        setIsModalOpen(true);
      } else {
        setAnalysisResult({ 
          analysis: "क्षमा करें, जाँच करने में समस्या हुई। कृपया फिर से प्रयास करें।",
          keywords: [] 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysisResult(null);
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

      {!analysisResult && (
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

      {image && !analysisResult && (
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
        {analysisResult && (
          <div className="space-y-6">
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
                  <Markdown>{analysisResult.analysis}</Markdown>
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
                      `*AI द्वारा दी गई जाँच रिपोर्ट:*\n${analysisResult.analysis}\n\n` +
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

            {/* Matched Products Section */}
            {matchedProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-[#2D5A27]" />
                    दुकान पर उपलब्ध समाधान (Available at Shop)
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {matchedProducts.map((product, idx) => (
                    <button 
                      key={`${product.id}-${idx}`}
                      onClick={() => setSelectedProduct(product)}
                      className="w-full text-left bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-all"
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                        <SmartImage 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full" 
                          objectFit="cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-base leading-tight mb-1">
                          {product.hindiName || product.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] bg-[#2D5A27] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm">
                            {product.brand || product.category}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">
                            📦 {product.unit || 'Pack'}
                          </span>
                        </div>
                        <p className="text-lg font-black text-orange-600 mt-1">₹{product.price}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Product Order Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[101] shadow-2xl p-6 pb-12"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              
              <div className="flex gap-4 mb-6">
                <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-md">
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[#2D5A27] text-[10px] font-black uppercase tracking-wider mb-0.5">{selectedProduct.brand || 'Local Brand'}</p>
                  <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{selectedProduct.hindiName || selectedProduct.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">मात्रा: {selectedProduct.unit || 'N/A'}</span>
                  </div>
                  <p className="text-2xl font-black text-[#2D5A27]">₹{selectedProduct.price}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-5 mb-6 border border-gray-100">
                <h4 className="text-xs font-black text-[#2D5A27] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  ऑर्डर की पूरी जानकारी
                </h4>
                
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">🏢 कंपनी (Brand):</span>
                    <span className="text-gray-900 font-black text-sm">{selectedProduct.brand || 'Branded'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">💊 दवाई (Full Name):</span>
                    <span className="text-gray-900 font-black text-sm">
                      {selectedProduct.hindiName || selectedProduct.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">📦 मात्रा (Quantity):</span>
                    <span className="text-gray-900 font-black text-sm">{selectedProduct.unit || 'प्रति पैक'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">💰 कीमत (Price):</span>
                    <span className="text-[#2D5A27] font-black text-lg">₹{selectedProduct.price}</span>
                  </div>
                  <div className="py-2">
                    <span className="text-gray-500 text-sm font-medium block mb-1">🌱 उपयोग (Best For):</span>
                    <p className="text-gray-700 text-xs font-bold leading-relaxed bg-white/50 p-2 rounded-lg border border-gray-100">
                      {selectedProduct.description}
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-start gap-2 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-orange-800 font-black leading-tight">
                    *नोट: आपको स्वयं "फल्सावदिया कृषि बाज़ार" दुकान पर आकर यह दवाई खरीदनी होगी।
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black active:scale-95 transition-all"
                >
                  बंद करें
                </button>
                <a 
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                    `नमस्ते फल्सावदिया कृषि बाज़ार,\n\n` +
                    `*फ़सल डॉक्टर जाँच रिपोर्ट के अनुसार मुझे यह उत्पाद चाहिए:*\n\n` +
                    `🏢 *कंपनी:* ${selectedProduct.brand || 'उपलब्ध ब्रांड'}\n` +
                    `💊 *दवाई:* ${selectedProduct.name || selectedProduct.hindiName}\n` +
                    `📦 *मात्रा:* ${selectedProduct.unit || 'पैकेट'}\n` +
                    `💰 *कीमत:* ₹${selectedProduct.price}\n\n` +
                    `कृपया उपलब्धता की जानकारी दें, ताकि मैं आपकी दुकान पर आकर इसे खरीद सकूँ।\n` +
                    `धन्यवाद!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-[2] bg-[#25D366] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all text-xs"
                >
                  WhatsApp पर ऑर्डर करें
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Removed duplicate import fix at bottom
export default DiseaseDetection;
