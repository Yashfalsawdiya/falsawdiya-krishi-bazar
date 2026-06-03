import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Building2, Tag, Plus, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { cn } from '../lib/utils';
import OrderModal from '../components/OrderModal';
import ImageZoomModal from '../components/ImageZoomModal';
import ProductDetailModal from '../components/ProductDetailModal';
import { Product, ImageSource } from '../types';

const Products: React.FC = () => {
  const { products, categories, appContent, loadProducts, loadCategoryData } = useAppContext();
  const { addToCart } = useCart();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ src: string | ImageSource; alt: string } | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const whatsappNumber = appContent?.contactInfo.whatsapp || '918982338046';

  useEffect(() => {
    const unsubProducts = loadProducts();
    const unsubCategories = loadCategoryData();
    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubCategories) unsubCategories();
    };
  }, []);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  const filteredProducts = products
    .filter(p => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const searchQuery = searchParams.get('search')?.toLowerCase() || '';
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery) || 
        p.hindiName.toLowerCase().includes(searchQuery) || 
        p.brand.toLowerCase().includes(searchQuery) ||
        p.description?.toLowerCase().includes(searchQuery);
      
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const idA = a.customId || '';
      const idB = b.customId || '';
      if (!idA && !idB) {
        return (a.hindiName || '').localeCompare(b.hindiName || '', 'hi');
      }
      if (!idA) return 1;
      if (!idB) return -1;
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const handleBuyClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const confirmOrder = () => {
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

      {/* Category Important Information Banner */}
      {(() => {
        if (selectedCategory === 'all') return null;
        const cat = categories.find(c => c.id === selectedCategory);
        if (cat && cat.isInfoEnabled && cat.importantInfo) {
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-50 border-2 border-orange-100 rounded-3xl p-5 shadow-sm text-sm"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-extrabold text-[#4A3728] text-base mb-1">
                    महत्वपूर्ण जानकारी ({cat.name}):
                  </h4>
                  <p className="text-gray-700 leading-relaxed font-semibold">
                    {cat.importantInfo}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        }
        return null;
      })()}

      {/* Product List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product, idx) => {
            const displayPrice = product.variants && product.variants.length > 0 ? product.variants[0].price : product.price;
            const displayUnit = product.variants && product.variants.length > 0 ? product.variants[0].quantity : product.unit;
            const isInStock = product.inStock !== false;

            return (
              <motion.div
                layout
                key={`${product.id}-${idx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  setSelectedProduct(product);
                  setShowDetail(true);
                }}
                className={cn(
                  "bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4 cursor-pointer active:scale-[0.99] transition-transform group relative",
                  !isInStock && "opacity-75 grayscale-[0.5]"
                )}
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative">
                  <SmartImage 
                    src={product.image} 
                    alt={product.hindiName} 
                    className="w-full h-full cursor-zoom-in" 
                    objectFit="cover"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomImage({ src: product.image, alt: product.hindiName });
                    }}
                  />
                  {!isInStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-[8px] font-black text-white uppercase tracking-wider bg-red-600 px-1.5 py-0.5 rounded-md rotate-[-15deg]">Stock Out</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 text-[10px] text-[#2D5A27] font-bold">
                        <Building2 className="w-3 h-3" />
                        {product.brand}
                      </div>
                      {product.customId && (
                        <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-tighter">
                          {product.customId}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-800 leading-tight group-hover:text-[#2D5A27] transition-colors">{product.hindiName}</h3>
                    {product.description && (
                      <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug mt-1 italic">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end mt-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button 
                        disabled={!isInStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product, product.variants?.[0]);
                          setAddedProductId(product.id);
                          setTimeout(() => setAddedProductId(null), 1200);
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 active:scale-95 transition-all outline-none",
                          !isInStock
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : addedProductId === product.id
                              ? "bg-green-600 text-white"
                              : "bg-[#2D5A27] text-white hover:bg-[#2D5A27]/90"
                        )}
                      >
                        <Plus className="w-3 h-3" />
                        {addedProductId === product.id ? 'Added ✓' : 'Add To Cart'}
                      </button>
                      <button 
                        disabled={!isInStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          const pWithPrice = {
                            ...product,
                            price: displayPrice || 0,
                            unit: displayUnit || ''
                          };
                          handleBuyClick(pWithPrice as Product);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 active:scale-95 transition-all outline-none",
                          isInStock 
                            ? "bg-[#EAB308] text-[#2D5A27]" 
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        <ShoppingBag className="w-3 h-3" /> {isInStock ? 'खरीदें' : 'खत्म'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
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
        product={selectedProduct}
        orderSource="Store"
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
