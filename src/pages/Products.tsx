import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';
import ImageZoomModal from '../components/ImageZoomModal';
import ProductDetailModal from '../components/ProductDetailModal';
import KrishiBazaarProductCard from '../components/KrishiBazaarProductCard';
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

  const handleDirectBuy = (product: Product, variant?: { id: string; quantity: string; price: number }) => {
    addToCart(product, variant || product.variants?.[0]);
    navigate('/cart');
  };

  const handleAddToCart = (product: Product, variant?: { id: string; quantity: string; price: number }) => {
    addToCart(product, variant || product.variants?.[0]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#4A3728]">कृषि बाजार (Market)</h2>
      
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:flex-wrap md:overflow-x-visible">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
            selectedCategory === 'all' ? "bg-[#2D5A27] text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
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
              selectedCategory === cat.id ? "bg-[#2D5A27] text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product List - Premium Responsive Vertical Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product, idx) => (
            <KrishiBazaarProductCard
              key={`${product.id}-${idx}`}
              product={product}
              index={idx}
              onSelect={(p) => {
                setSelectedProduct(p);
                setShowDetail(true);
              }}
              onZoom={(src, alt) => {
                setZoomImage({ src, alt });
              }}
              onAddToCart={handleAddToCart}
              onBuy={handleDirectBuy}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600 font-bold">कोई उत्पाद नहीं मिला</p>
            <p className="text-xs text-gray-400">कृपया कुछ और खोजें या अन्य श्रेणी चुनें</p>
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
