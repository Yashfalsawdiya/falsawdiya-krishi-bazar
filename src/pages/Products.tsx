import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Building2, Tag, Plus, ShoppingCart, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { cn } from '../lib/utils';
import ImageZoomModal from '../components/ImageZoomModal';
import ProductDetailModal from '../components/ProductDetailModal';
import { Product, ImageSource } from '../types';

const Products: React.FC = () => {
  const navigate = useNavigate();
  const { products, categories, loadProducts, loadCategoryData } = useAppContext();
  const { addToCart } = useCart();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ src: string | ImageSource; alt: string } | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

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

  // Standard comparator for customId / hindiName sorting
  const sortProductHelper = (a: Product, b: Product) => {
    const idA = a.customId || '';
    const idB = b.customId || '';
    if (!idA && !idB) {
      return (a.hindiName || '').localeCompare(b.hindiName || '', 'hi');
    }
    if (!idA) return 1;
    if (!idB) return -1;
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
  };

  const filteredProducts = useMemo(() => {
    const searchQuery = searchParams.get('search')?.toLowerCase() || '';

    const matchesSearch = (p: Product) => {
      if (!searchQuery) return true;
      return (
        p.name.toLowerCase().includes(searchQuery) ||
        p.hindiName.toLowerCase().includes(searchQuery) ||
        p.brand.toLowerCase().includes(searchQuery) ||
        (p.description && p.description.toLowerCase().includes(searchQuery))
      );
    };

    // If an individual category filter is active (not 'all'), preserve standard category view
    if (selectedCategory !== 'all') {
      return products
        .filter(p => p.category === selectedCategory && matchesSearch(p))
        .sort(sortProductHelper);
    }

    // When "सभी (All)" is active:
    // 1. Filter all products matching the search query
    const matchingProducts = products.filter(matchesSearch);
    if (matchingProducts.length === 0) return [];

    // 2. Group products by category
    const categoryGroups = new Map<string, Product[]>();
    matchingProducts.forEach(product => {
      const catKey = product.category || 'other';
      if (!categoryGroups.has(catKey)) {
        categoryGroups.set(catKey, []);
      }
      categoryGroups.get(catKey)!.push(product);
    });

    // 3. Sort each category group internally (e.g. FERT-01, FERT-02)
    categoryGroups.forEach(group => {
      group.sort(sortProductHelper);
    });

    // 4. Build category sequence based on configured categories
    const orderedCategoryKeys: string[] = [];
    categories.forEach(cat => {
      if (categoryGroups.has(cat.id)) {
        orderedCategoryKeys.push(cat.id);
      }
    });
    // Append any extra category keys not in the main categories list
    categoryGroups.forEach((_, key) => {
      if (!orderedCategoryKeys.includes(key)) {
        orderedCategoryKeys.push(key);
      }
    });

    // 5. Interleave in a round-robin mixed order (Fertilizer -> Seed -> Insecticide -> Fungicide -> Herbicide...)
    const mixedProducts: Product[] = [];
    let hasMore = true;
    let round = 0;

    while (hasMore) {
      hasMore = false;
      for (const catKey of orderedCategoryKeys) {
        const group = categoryGroups.get(catKey);
        if (group && round < group.length) {
          mixedProducts.push(group[round]);
          if (round + 1 < group.length) {
            hasMore = true;
          }
        }
      }
      round++;
    }

    return mixedProducts;
  }, [products, categories, selectedCategory, searchParams]);

  const handleDirectBuy = (product: Product) => {
    addToCart(product, product.variants?.[0]);
    navigate('/cart');
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
                          handleDirectBuy(pWithPrice as Product);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 active:scale-95 transition-all outline-none",
                          isInStock 
                            ? "bg-[#EAB308] text-[#2D5A27] hover:bg-amber-500" 
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        <ShoppingBag className="w-3 h-3" /> {isInStock ? 'अभी खरीदें' : 'खत्म'}
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
        onBuy={handleDirectBuy}
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
