import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon, RefreshCw, Info, ShoppingCart, ArrowRight, X, Tag, Wheat, Droplets } from 'lucide-react';
import { detectDisease, DiseaseAnalysis } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { getFriendlyAiError } from '../utils/aiErrorHandler';
import SmartImage from '../components/SmartImage';
import Markdown from 'react-markdown';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import ApiKeyModal from '../components/ApiKeyModal';
import OrderModal from '../components/OrderModal';

const DiseaseDetection: React.FC = () => {
  const { appContent, userSettings, products, categories, loading: appLoading } = useAppContext();
  const { addToCart } = useCart();
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DiseaseAnalysis | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const getCategoryName = (catId: string) => {
    if (!categories) return catId;
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : catId;
  };

  useEffect(() => {
    if (selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0) {
      setSelectedVariant(selectedProduct.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProduct]);

  const displayPrice = selectedVariant ? selectedVariant.price : (selectedProduct?.price || 0);
  const displayUnit = selectedVariant ? selectedVariant.quantity : (selectedProduct?.unit || 'Pack');
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
    
    if (appLoading) return;

    if (!userSettings?.geminiApiKey) {
      setErrorMessage(undefined);
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const analysis = await detectDisease(image, userSettings?.geminiApiKey);
      setAnalysisResult(analysis);
    } catch (error: any) {
      console.error("Analysis failed:", error);
      const friendlyError = getFriendlyAiError(error);
      
      if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
        setErrorMessage(friendlyError.message);
        setIsModalOpen(true);
      } else {
        setAnalysisResult({ 
          analysis: friendlyError.message,
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
      <ApiKeyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        message={errorMessage}
      />
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728]">बीमारी की सटीक जाँच (AI Scan)</h2>
        <p className="text-sm text-gray-500">फोटो चुनें और तुरंत समाधान पाएं</p>
      </div>

      <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-white rounded-3xl border-4 border-dashed border-[#2D5A27]/20 flex flex-col items-center justify-center overflow-hidden shadow-xl transition-all">
        {image && image !== "" ? (
          <div className="relative w-full h-full group">
            <img src={image} alt="Crop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                    <div 
                      key={`${product.id}-${idx}`}
                      onClick={() => setSelectedProduct(product)}
                      className="w-full text-left bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer relative group"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
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
                              {product.brand || getCategoryName(product.category)}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">
                              📦 {product.unit || 'Pack'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product, product.variants?.[0]);
                                setAddedProductId(product.id);
                                setTimeout(() => setAddedProductId(null), 1200);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all outline-none ${
                                addedProductId === product.id 
                                  ? "bg-green-600 text-white" 
                                  : "bg-[#2D5A27] text-white hover:bg-[#2D5A27]/90"
                              }`}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              {addedProductId === product.id ? 'Added ✓' : 'Add To Cart'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
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
                <div className="w-24 h-24 rounded-3xl overflow-hidden flex-shrink-0 shadow-md bg-gray-50">
                  <SmartImage 
                    src={selectedProduct.image} 
                    alt={selectedProduct.hindiName || selectedProduct.name} 
                    className="w-full h-full" 
                    objectFit="cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[#2D5A27] text-[10px] font-black uppercase tracking-wider mb-0.5">{selectedProduct.brand || 'Local Brand'}</p>
                  <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{selectedProduct.hindiName || selectedProduct.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white border border-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">मात्रा: {displayUnit}</span>
                  </div>
                  {selectedProduct.hidePrice || !displayPrice ? (
                    <p className="text-sm font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl inline-block mt-1">कीमत उपलब्ध नहीं</p>
                  ) : (
                    <p className="text-2xl font-black text-[#2D5A27]">₹{displayPrice}</p>
                  )}
                </div>
              </div>

              {/* Variants Selection */}
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="mb-6 space-y-3">
                  <h4 className="text-xs font-black text-[#2D5A27] uppercase tracking-widest flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    मात्रा चुनें (Select Quantity)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.variants.map((v: any, vIdx: number) => (
                      <button
                        key={`${v.id || 'variant'}-${vIdx}`}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border-2 ${
                          selectedVariant?.id === v.id
                            ? "bg-[#2D5A27] border-[#2D5A27] text-white shadow-md active:scale-95"
                            : "bg-gray-50 border-gray-100 text-gray-500"
                        }`}
                      >
                        {v.quantity}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-3xl p-5 mb-6 border border-gray-100">
                <h4 className="text-xs font-black text-[#2D5A27] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  ऑर्डर की पूरी जानकारी
                </h4>
                
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">🏢 कंपनी (Brand):</span>
                    <span className="text-gray-900 font-black text-sm">{selectedProduct.brand}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">💊 दवाई (Full Name):</span>
                    <span className="text-gray-900 font-black text-sm">
                      {selectedProduct.hindiName || selectedProduct.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">📦 मात्रा (Quantity):</span>
                    <span className="text-gray-900 font-black text-sm">{displayUnit}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                    <span className="text-gray-500 text-sm font-medium">💰 कीमत (Price):</span>
                    {selectedProduct.hidePrice || !displayPrice ? (
                      <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">कीमत उपलब्ध नहीं</span>
                    ) : (
                      <span className="text-[#2D5A27] font-black text-lg">₹{displayPrice}</span>
                    )}
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

              <div className="space-y-3">
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      if (!selectedProduct) return;
                      const mappedProduct = {
                        ...selectedProduct,
                        price: displayPrice,
                        unit: displayUnit
                      };
                      addToCart(mappedProduct, selectedVariant || undefined);
                      setAddedProductId(selectedProduct.id);
                      setTimeout(() => setAddedProductId(null), 1200);
                    }}
                    className={`flex-1 ${
                      addedProductId === selectedProduct.id 
                        ? "bg-green-600 text-white shadow-lg shadow-green-100" 
                        : "bg-[#2D5A27] text-white hover:bg-[#2D5A27]/90 shadow-lg shadow-green-50"
                    } py-4 rounded-2xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs outline-none`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {addedProductId === selectedProduct.id ? 'Added ✓' : 'Add To Cart'}
                  </button>
                  <button 
                    onClick={() => setIsOrderModalOpen(true)}
                    className="flex-1 bg-[#25D366] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-green-100 active:scale-95 transition-all text-xs outline-none"
                  >
                    WhatsApp पर ऑर्डर करें
                  </button>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="w-full bg-gray-100 text-gray-500 py-3 rounded-2xl font-semibold active:scale-95 transition-all text-xs outline-none"
                >
                  बंद करें (Close)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <OrderModal 
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onConfirm={() => {
          setIsOrderModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct ? {
          ...selectedProduct,
          price: displayPrice,
          unit: displayUnit
        } : null}
        orderSource="Disease Detection"
      />
    </div>
  );
};

// Removed duplicate import fix at bottom
export default DiseaseDetection;
