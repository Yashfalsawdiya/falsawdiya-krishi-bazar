import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ShoppingBag, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import OrderModal from '../components/OrderModal';
import ImageZoomModal from '../components/ImageZoomModal';
import ProductDetailModal from '../components/ProductDetailModal';
import { Product } from '../types';

const Products: React.FC = () => {
  const { products, categories, appContent, fetchProducts, fetchCategories } = useAppContext();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);

  const whatsappNumber = appContent?.contactInfo.whatsapp || '918982338046';

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    const cat = searchParams.get('category');
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const searchQuery = searchParams.get('search')?.toLowerCase() || '';
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery) || 
      p.hindiName.toLowerCase().includes(searchQuery) || 
      p.brand.toLowerCase().includes(searchQuery) ||
      p.description?.toLowerCase().includes(searchQuery);
    
    return matchesCategory && matchesSearch;
  });

  const handleBuyClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const confirmOrder = () => {
    if (!selectedProduct) return;
    
    const message = `*नया ऑर्डर (New Order)*\n\n` +
      `*उत्पाद:* ${selectedProduct.hindiName}\n` +
      `*कंपनी:* ${selectedProduct.brand}\n` +
      (selectedProduct.hidePrice ? '' : `*कीमत:* ₹${selectedProduct.price}\n`) +
      `*यूनिट:* ${selectedProduct.unit}\n\n` +
      `नमस्ते फल्सावदिया कृषि बाज़ार, मुझे यह प्रोडक्ट खरीदना है। कृपया इसकी उपलब्धता बताएं।`;
      
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#4A3728]">कृषि बाजार (Market)</h2>
      
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
            selectedCategory === 'all' ? "bg-[#2D5A27] text-white" : "bg-white text-gray-600 border border-gray-200"
          )}
        >
          सभी (All)
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
              selectedCategory === cat.id ? "bg-[#2D5A27] text-white" : "bg-white text-gray-600 border border-gray-200"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <motion.div
              layout
              key={product.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => {
                setSelectedProduct(product);
                setShowDetail(true);
              }}
              className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4 cursor-pointer active:scale-[0.99] transition-transform group"
            >
              <img 
                src={product.image} 
                alt={product.hindiName} 
                className="w-24 h-24 rounded-xl object-cover cursor-zoom-in" 
                referrerPolicy="no-referrer"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomImage({ src: product.image, alt: product.hindiName });
                }}
              />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-[#2D5A27] font-bold mb-1">
                    <Building2 className="w-3 h-3" />
                    {product.brand}
                  </div>
                  <h3 className="font-bold text-gray-800 leading-tight group-hover:text-[#2D5A27] transition-colors">{product.hindiName}</h3>
                  <p className="text-[10px] text-gray-500 mb-1">{product.unit}</p>
                  {product.description && (
                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug mt-1 italic">
                      {product.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  {product.hidePrice ? (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-lg">कीमत उपलब्ध नहीं</span>
                  ) : (
                    <span className="text-lg font-bold text-[#2D5A27]">₹{product.price}</span>
                  )}
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyClick(product);
                      }}
                      className="bg-[#EAB308] text-[#2D5A27] px-4 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> खरीदें
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-bold">कोई उत्पाद नहीं मिला</p>
            <p className="text-xs text-gray-400">कृपया कुछ और खोजें</p>
          </div>
        )}
      </div>

      <ProductDetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        product={selectedProduct}
        onBuy={handleBuyClick}
      />

      <OrderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmOrder}
        productName={selectedProduct?.hindiName || ''}
        price={selectedProduct?.price || 0}
        hidePrice={selectedProduct?.hidePrice}
      />

      <ImageZoomModal
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
        imageSrc={zoomImage?.src || ''}
        altText={zoomImage?.alt || ''}
      />
    </div>
  );
};

export default Products;
