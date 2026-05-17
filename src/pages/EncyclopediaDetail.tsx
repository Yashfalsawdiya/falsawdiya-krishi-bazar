import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { ChevronLeft, Bug, Droplet, Sprout, ShoppingBag, MessageCircle, AlertCircle, Tag } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ImageSource, Product } from '../types';
import { cn } from '../lib/utils';
import ImageZoomModal from '../components/ImageZoomModal';
import ProductDetailModal from '../components/ProductDetailModal';

const EncyclopediaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { agriIssues, products, appContent, loadAgriIssues, loadProducts } = useAppContext();
  const navigate = useNavigate();
  const [zoomImage, setZoomImage] = React.useState<string | ImageSource | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  React.useEffect(() => {
    const unsubIssues = loadAgriIssues();
    const unsubProducts = loadProducts();
    return () => {
      if (unsubIssues) unsubIssues();
      if (unsubProducts) unsubProducts();
    };
  }, []);

  const issue = useMemo(() => agriIssues.find(i => i.id === id), [agriIssues, id]);
  
  const relatedProducts = useMemo(() => {
    if (!issue) return [];
    
    // 1. Start with manually linked products
    let linked = products.filter(p => issue.relatedProductIds?.includes(p.id));
    
    // 2. If no manual links, perform smart matching
    if (linked.length === 0) {
      const issueName = (issue.hindiName || "").toLowerCase();
      const issueEngName = (issue.englishName || "").toLowerCase();
      const issueDesc = (issue.description || "").toLowerCase();
      
      linked = products.filter(p => {
        const prodHindi = (p.hindiName || "").toLowerCase();
        const prodEng = (p.name || "").toLowerCase();
        const prodDesc = (p.description || "").toLowerCase();
        const prodCat = (p.category || "").toLowerCase();
        const prodBrand = (p.brand || "").toLowerCase();

        // Match Name/Description
        const nameMatch = prodHindi.includes(issueName) || 
                          prodEng.includes(issueEngName) || 
                          (issueEngName && prodEng.includes(issueEngName)) ||
                          (issueName && prodDesc.includes(issueName));

        // Category based broad matching
        let catMatch = false;
        if (issue.type === 'pest') {
          catMatch = (prodCat.includes('कीटनाशक') || prodCat.includes('insecticide') || prodDesc.includes('insecticide') || prodDesc.includes('कीटों'));
        } else if (issue.type === 'disease') {
          catMatch = (prodCat.includes('फफूंदनाशक') || prodCat.includes('fungicide') || prodDesc.includes('fungicide') || prodDesc.includes('रोगों'));
        } else if (issue.type === 'deficiency') {
          catMatch = (prodCat.includes('उर्वरक') || prodCat.includes('fertilizer') || prodCat.includes('पोषण') || prodCat.includes('nutrient') || prodDesc.includes('पोषण') || prodDesc.includes('nutrient'));
        }

        // Refine name match to be more specific for deficiencies
        if (issue.type === 'deficiency') {
          // For deficiencies, name match is very important (e.g. Zinc, Potash)
          const deficiencyKeywords = issueName.split(' ');
          const isKeyWordMatch = deficiencyKeywords.some(kw => kw.length > 2 && (prodHindi.includes(kw) || prodDesc.includes(kw)));
          return isKeyWordMatch || (catMatch && nameMatch);
        }

        return nameMatch || (catMatch && issueDesc.includes(prodHindi) && prodHindi.length > 3);
      });

      // Special case for "Aphids" (माहू) mentioned in the prompt
      if (issueName.includes('माहू') || issueEngName.includes('aphid')) {
        const aphidProducts = products.filter(p => {
          const desc = (p.description || "").toLowerCase();
          const name = (p.hindiName || "").toLowerCase();
          return desc.includes('माहू') || desc.includes('aphid') || name.includes('माहू') || name.includes('aphid');
        });
        // Add unique products
        aphidProducts.forEach(ap => {
          if (!linked.find(l => l.id === ap.id)) linked.push(ap);
        });
      }

      // Limit to a reasonable number and sort by relevance (simple heuristic)
      linked = linked.slice(0, 8);
    }
    
    return linked;
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

  const handleWhatsAppOrder = (product: Product) => {
    const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';
    const message = `नमस्ते फल्सावदिया कृषि बाज़ार,\n\n` +
                    `*मुझे कीट/रोग निर्देशिका (Encyclopedia) से यह उत्पाद चाहिए:*\n\n` +
                    `🏢 *कंपनी:* ${product.brand}\n` +
                    `💊 *उत्पाद:* ${product.hindiName || product.name}\n` +
                    `📦 *मात्रा:* ${product.unit}\n` +
                    `💰 *कीमत:* ₹${product.price}\n\n` +
                    `कृपया उपलब्धता की जानकारी दें। धन्यवाद!`;
    
    // Use window.open for better compatibility with external links
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
          className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="absolute bottom-8 left-8 right-8">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1",
              issue.type === 'pest' ? 'bg-orange-500 text-white' : 
              issue.type === 'disease' ? 'bg-blue-500 text-white' : 
              'bg-purple-500 text-white'
            )}>
              {issue.type === 'pest' ? <Bug className="w-3 h-3" /> : 
               issue.type === 'disease' ? <Droplet className="w-3 h-3" /> : 
               <Sprout className="w-3 h-3" />}
              {issue.type === 'pest' ? 'कीट' : issue.type === 'disease' ? 'रोग' : 'कमी'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight mb-1">{issue.hindiName}</h1>
          <p className="text-green-300 font-bold uppercase tracking-[0.2em] text-[11px]">{issue.englishName}</p>
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#4A3728] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#2D5A27]" />
              नियंत्रण के लिए उत्पाद
            </h3>
            <span className="text-[10px] font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
              {relatedProducts.length} विकल्प
            </span>
          </div>

          <div className="space-y-4">
            {relatedProducts.length === 0 ? (
              <div className="bg-white rounded-[32px] p-8 text-center border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-medium">फिलहाल कोई उत्पाद लिंक नहीं है।</p>
              </div>
            ) : (
              relatedProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100 group flex gap-5 overflow-hidden"
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
                        {product.hidePrice || !product.price ? (
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-lg">कीमत उपलब्ध नहीं</span>
                        ) : (
                          `₹${product.price}`
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                    <div>
                      <p className="text-[10px] font-black text-[#2D5A27] uppercase tracking-widest mb-1">{product.brand}</p>
                      <h4 className="font-black text-gray-800 text-base leading-tight truncate">{product.hindiName || product.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">{product.unit || 'Pack'}</p>
                      
                      <div className="mt-2">
                        {product.variants && product.variants.length > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                            <Tag className="w-3 h-3 text-amber-600" />
                            <span className="text-[9px] font-black text-amber-700 uppercase">मात्रा चुनें</span>
                          </div>
                        ) : (
                          product.hidePrice || !product.price ? (
                            <span className="text-[9px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg uppercase">कीमत उपलब्ध नहीं</span>
                          ) : (
                            <span className="text-sm font-black text-[#2D5A27]">₹{product.price}</span>
                          )
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                        }}
                        className="flex-1 bg-[#2D5A27]/10 text-[#2D5A27] py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-black active:scale-95 transition-all"
                      >
                        <AlertCircle className="w-4 h-4" />
                        जानकारी
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product.variants && product.variants.length > 0) {
                            setSelectedProduct(product);
                          } else {
                            handleWhatsAppOrder(product);
                          }
                        }}
                        className="flex-[1.5] bg-[#25D366] text-white py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-black shadow-lg shadow-green-100 active:scale-95 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        ऑर्डर करें
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        <ImageZoomModal 
          isOpen={!!zoomImage}
          imageSrc={zoomImage || ''} 
          altText={issue.hindiName}
          onClose={() => setZoomImage(null)} 
        />
        <ProductDetailModal 
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          onBuy={(p) => handleWhatsAppOrder(p)}
        />
      </AnimatePresence>
    </div>
  );
};

export default EncyclopediaDetail;
