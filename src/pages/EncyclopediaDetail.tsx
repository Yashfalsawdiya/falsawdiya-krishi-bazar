import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { ChevronLeft, Bug, Droplet, Sprout, ShoppingBag, MessageCircle, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ImageSource } from '../types';
import { cn } from '../lib/utils';
import ImageZoomModal from '../components/ImageZoomModal';

const EncyclopediaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { agriIssues, products, appContent } = useAppContext();
  const navigate = useNavigate();
  const [zoomImage, setZoomImage] = React.useState<string | ImageSource | null>(null);

  const issue = useMemo(() => agriIssues.find(i => i.id === id), [agriIssues, id]);
  
  const relatedProducts = useMemo(() => {
    if (!issue) return [];
    return products.filter(p => issue.relatedProductIds.includes(p.id));
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

  const handleWhatsAppOrder = (product: any) => {
    const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';
    const message = `*नया ऑर्डर (New Order)*

*उत्पाद:* ${product.hindiName}
*कंपनी:* ${product.brand}
*कीमत:* ₹${product.price}
*यूनिट:* ${product.unit}

नमस्ते, मुझे यह उत्पाद खरीदना है। कृपया इसकी उपलब्धता बताएं।`;
    
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
                        ₹{product.price}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                    <div>
                      <p className="text-[10px] font-black text-[#2D5A27] uppercase tracking-widest mb-1">{product.brand}</p>
                      <h4 className="font-black text-gray-800 text-base leading-tight truncate">{product.hindiName}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">{product.unit}</p>
                    </div>
                    
                    <button 
                      onClick={() => handleWhatsAppOrder(product)}
                      className="w-full mt-3 bg-[#25D366] text-white py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-black shadow-lg shadow-green-100 active:scale-95 transition-all"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      ऑर्डर करें (Order)
                    </button>
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
      </AnimatePresence>
    </div>
  );
};

export default EncyclopediaDetail;
