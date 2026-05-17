import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { ChevronLeft, Bug, Droplet, Sprout, ShoppingBag, MessageCircle, AlertCircle, Info, Tag, ArrowRight, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ImageSource } from '../types';
import { cn } from '../lib/utils';
import ImageZoomModal from '../components/ImageZoomModal';

const EncyclopediaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { agriIssues, products, appContent, loadAgriIssues, loadProducts } = useAppContext();
  const navigate = useNavigate();
  const [zoomImage, setZoomImage] = useState<string | ImageSource | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  useEffect(() => {
    const unsubIssues = loadAgriIssues();
    const unsubProducts = loadProducts();
    return () => {
      if (unsubIssues) unsubIssues();
      if (unsubProducts) unsubProducts();
    };
  }, []);

  useEffect(() => {
    if (selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0) {
      setSelectedVariant(selectedProduct.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProduct]);

  const issue = useMemo(() => agriIssues.find(i => i.id === id), [agriIssues, id]);
  
  // Smart Product Matching Logic
  const relatedProducts = useMemo(() => {
    if (!issue) return [];
    
    // 1. Manual matches (from admin)
    const manualMatches = products.filter(p => issue.relatedProductIds?.includes(p.id));
    
    // 2. Automatic smart matches based on name and keywords
    const keywords = [
      issue.hindiName,
      issue.englishName,
      ...(issue.description?.split(/[ ,।\n]+/).filter(w => w.length > 2) || [])
    ].map(k => k.toLowerCase());

    const autoMatches = products.filter(p => {
      // Avoid duplication
      if (issue.relatedProductIds?.includes(p.id)) return false;

      const searchStr = `${p.name} ${p.hindiName} ${p.category} ${p.description || ''}`.toLowerCase();
      
      // Match by issue name directly (strong match)
      if (searchStr.includes(issue.hindiName.toLowerCase())) return true;
      if (searchStr.includes(issue.englishName.toLowerCase())) return true;

      // Deficiency logic
      if (issue.type === 'deficiency') {
        const nutritionKeywords = ['nutrient', 'nutrition', 'micronutrient', 'fertili', 'खाद', 'पोषक', 'तत्व'];
        const isNutritionProduct = nutritionKeywords.some(nk => searchStr.includes(nk));
        if (isNutritionProduct && nutritionKeywords.some(nk => issue.hindiName.toLowerCase().includes(nk) || issue.description?.toLowerCase().includes(nk))) {
          // If product is nutrition and issue is nutrition, check if specific nutrient matches
          const specificNutrient = issue.hindiName.replace('की कमी', '').trim();
          if (searchStr.includes(specificNutrient.toLowerCase())) return true;
        }
      }

      return false;
    });

    return [...manualMatches, ...autoMatches].slice(0, 10); // Limit to top 10 matches
  }, [issue, products]);

  if (!issue) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">जानकारी नहीं मिली</h2>
        <p className="text-gray-500 text-sm mb-8">शायद यह जानकारी हटा दी गई है या लिंक गलत है।</p>
        <button 
          onClick={() => navigate('/encyclopedia')}
          className="bg-[#2D5A27] text-white py-4 px-8 rounded-2xl font-bold"
        >
          वापस जाएँ (Go Back)
        </button>
      </div>
    );
  }

  const displayPrice = selectedVariant ? selectedVariant.price : (selectedProduct?.price || 0);
  const displayUnit = selectedVariant ? selectedVariant.quantity : (selectedProduct?.unit || 'Pack');
  const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';

  return (
    <div className="min-h-screen bg-[#F5F2ED] pb-24">
      {/* Header Image */}
      <div className="relative h-[300px] w-full max-w-md mx-auto overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0"
        >
          <SmartImage 
            src={issue.image} 
            alt={issue.hindiName} 
            className="w-full h-full"
            objectFit="cover"
            onClick={() => setZoomImage(issue.image)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </motion.div>

        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 transition-transform active:scale-90"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="absolute bottom-8 left-8 right-8">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg",
              issue.type === 'pest' ? 'bg-orange-500 text-white' : 
              issue.type === 'disease' ? 'bg-blue-500 text-white' : 
              'bg-purple-500 text-white'
            )}>
              {issue.type === 'pest' ? <Bug className="w-3 h-3" /> : 
               issue.type === 'disease' ? <Droplet className="w-3 h-3" /> : 
               <Sprout className="w-3 h-3" />}
              {issue.type === 'pest' ? 'कीट' : issue.type === 'disease' ? 'रोग' : 'पोषक तत्व'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight mb-1 drop-shadow-md">{issue.hindiName}</h1>
          <p className="text-green-300 font-bold uppercase tracking-[0.2em] text-[11px] opacity-90">{issue.englishName}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto -mt-6 relative z-10 px-5 space-y-6">
        {/* Description Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-[#4A3728] mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#2D5A27]" />
            समस्या की जानकारी
          </h3>
          <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">
            {issue.description}
          </p>
        </motion.div>

        {/* Treatment Products */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-[#4A3728] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#2D5A27]" />
              समाधान के लिए उत्पाद
            </h3>
            <span className="text-[10px] font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
              {relatedProducts.length} विकल्प
            </span>
          </div>

          <div className="space-y-4">
            {relatedProducts.length === 0 ? (
              <div className="bg-white rounded-[32px] p-8 text-center border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-medium">इस समस्या के लिए फिलहाल कोई उत्पाद लिंक नहीं है।</p>
              </div>
            ) : (
              relatedProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100 group flex gap-5 overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <SmartImage 
                      src={product.image} 
                      className="w-full h-full rounded-2xl bg-gray-50 p-2" 
                      alt={product.hindiName}
                      objectFit="contain"
                    />
                    {product.price > 0 && !product.hidePrice && (
                      <div className="absolute -bottom-2 -left-1 px-3 py-1 bg-[#F59E0B] text-white rounded-full text-[10px] font-black shadow-lg">
                        ₹{product.price}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                    <div>
                      <p className="text-[10px] font-black text-[#2D5A27] uppercase tracking-widest mb-1 opacity-70">{product.brand}</p>
                      <h4 className="font-black text-gray-800 text-base leading-tight truncate">{product.hindiName}</h4>
                      
                      <div className="flex flex-col mt-1">
                        {product.variants && product.variants.length > 0 ? (
                          <span className="text-[10px] font-bold text-[#EAB308] bg-[#2D5A27]/5 px-2 py-1 rounded-lg border border-[#EAB308]/20 flex items-center gap-1 w-fit mt-1">
                            <Tag className="w-3 h-3" /> मात्रा चुनें (Select Quantity)
                          </span>
                        ) : (
                          product.hidePrice || !product.price ? (
                            <p className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 px-2 py-1 rounded-lg w-fit mt-1">कीमत उपलब्ध नहीं</p>
                          ) : (
                            <p className="text-lg font-black text-orange-600 mt-1">₹{product.price}</p>
                          )
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center text-[#2D5A27] font-bold text-[10px] gap-1 group-hover:translate-x-1 transition-transform">
                      पूरा विवरण देखें <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
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
                <div className="w-24 h-24 rounded-3xl overflow-hidden flex-shrink-0 shadow-md bg-gray-50 p-2">
                  <SmartImage 
                    src={selectedProduct.image} 
                    alt={selectedProduct.hindiName || selectedProduct.name} 
                    className="w-full h-full" 
                    objectFit="contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[#2D5A27] text-[10px] font-black uppercase tracking-wider mb-0.5">{selectedProduct.brand}</p>
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
                    {selectedProduct.variants.map((v: any) => (
                      <button
                        key={v.id}
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
                  className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black active:scale-95 transition-all text-xs"
                >
                  बंद करें
                </button>
                <a 
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                    `नमस्ते फल्सावदिया कृषि बाज़ार,\n\n` +
                    `*कृषि निर्देशिका (Encyclopedia) के अनुसार मुझे यह उत्पाद चाहिए:*\n\n` +
                    `🏢 *कंपनी:* ${selectedProduct.brand}\n` +
                    `💊 *दवाई:* ${selectedProduct.hindiName || selectedProduct.name}\n` +
                    `📦 *मात्रा:* ${displayUnit}\n` +
                    `💰 *कीमत:* ₹${displayPrice}\n\n` +
                    `विषय: ${issue.hindiName}\n\n` +
                    `कृपया उपलब्धता की जानकारी दें।\n` +
                    `धन्यवाद!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-[2] bg-[#25D366] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all text-xs"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  WhatsApp पर ऑर्डर करें
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <ImageZoomModal 
          isOpen={!!zoomImage}
          imageSrc={zoomImage || ''} 
          altText={issue.hindiName}
          onClose={() => setZoomImage(null)} 
        />
      </AnimatePresence>
    </div>
  );
};

export default EncyclopediaDetail;
