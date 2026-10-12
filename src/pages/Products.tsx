import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { 
  ShoppingBag, ArrowUpDown, ChevronDown, Building2, 
  Check, RotateCcw, SlidersHorizontal 
} from 'lucide-react';
import { cn } from '../lib/utils';
import ImageZoomModal from '../components/ImageZoomModal';
import ProductDetailModal from '../components/ProductDetailModal';
import KrishiBazaarProductCard from '../components/KrishiBazaarProductCard';
import { Product, ImageSource } from '../types';
import { sortCategoriesByOrder } from '../utils/categoryUtils';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc';

const Products: React.FC = () => {
  const navigate = useNavigate();
  const { products, categories, loadProducts, loadCategoryData } = useAppContext();
  const sortedCategories = useMemo(() => sortCategoriesByOrder(categories), [categories]);
  const { addToCart } = useCart();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ src: string | ImageSource; alt: string } | null>(null);

  // Sorting & Brand Filter states
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

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

  // Extract unique brands dynamically from products
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach((p) => {
      if (p.brand && p.brand.trim()) {
        brandsSet.add(p.brand.trim());
      }
    });
    return Array.from(brandsSet).sort((a, b) => a.localeCompare(b, 'hi'));
  }, [products]);

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
        (p.brand && p.brand.toLowerCase().includes(searchQuery)) ||
        (p.description && p.description.toLowerCase().includes(searchQuery))
      );
    };

    const matchesBrand = (p: Product) => {
      if (selectedBrand === 'all') return true;
      return (p.brand || '').trim().toLowerCase() === selectedBrand.trim().toLowerCase();
    };

    const matchesStock = (p: Product) => {
      if (!inStockOnly) return true;
      return p.inStock !== false;
    };

    // Helper to get effective price of product for sorting
    const getProductPrice = (p: Product): number => {
      if (typeof p.price === 'number' && p.price > 0) return p.price;
      if (p.variants && p.variants.length > 0 && typeof p.variants[0].price === 'number') {
        return p.variants[0].price;
      }
      return 0;
    };

    // Filter base products matching search, brand, and stock
    const baseFiltered = products.filter(p => matchesSearch(p) && matchesBrand(p) && matchesStock(p));

    // If an individual category filter is active (not 'all')
    const categoryFiltered = selectedCategory === 'all' 
      ? baseFiltered 
      : baseFiltered.filter(p => p.category === selectedCategory);

    // Apply explicit sort options if chosen
    if (sortBy === 'price-asc') {
      return [...categoryFiltered].sort((a, b) => getProductPrice(a) - getProductPrice(b));
    }
    if (sortBy === 'price-desc') {
      return [...categoryFiltered].sort((a, b) => getProductPrice(b) - getProductPrice(a));
    }
    if (sortBy === 'name-asc') {
      return [...categoryFiltered].sort((a, b) => (a.hindiName || a.name).localeCompare(b.hindiName || b.name, 'hi'));
    }

    // Default sorting behavior:
    if (selectedCategory !== 'all') {
      return [...categoryFiltered].sort(sortProductHelper);
    }

    // When "सभी (All)" is active with default sort: round-robin interleave across categories
    if (categoryFiltered.length === 0) return [];

    const categoryGroups = new Map<string, Product[]>();
    categoryFiltered.forEach(product => {
      const catKey = product.category || 'other';
      if (!categoryGroups.has(catKey)) {
        categoryGroups.set(catKey, []);
      }
      categoryGroups.get(catKey)!.push(product);
    });

    categoryGroups.forEach(group => {
      group.sort(sortProductHelper);
    });

    const orderedCategoryKeys: string[] = [];
    categories.forEach(cat => {
      if (categoryGroups.has(cat.id)) {
        orderedCategoryKeys.push(cat.id);
      }
    });
    categoryGroups.forEach((_, key) => {
      if (!orderedCategoryKeys.includes(key)) {
        orderedCategoryKeys.push(key);
      }
    });

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
  }, [products, categories, selectedCategory, searchParams, sortBy, selectedBrand, inStockOnly]);

  const handleDirectBuy = (product: Product, variant?: { id: string; quantity: string; price: number }) => {
    addToCart(product, variant || product.variants?.[0]);
    navigate('/cart');
  };

  const handleAddToCart = (product: Product, variant?: { id: string; quantity: string; price: number }) => {
    addToCart(product, variant || product.variants?.[0]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#4A3728]">कृषि बाजार (Market)</h2>
        <span className="text-xs text-gray-500 font-semibold bg-white px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
          कुल: {filteredProducts.length} उत्पाद
        </span>
      </div>
      
      {/* Category Filter Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:flex-wrap md:overflow-x-visible">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
            selectedCategory === 'all' ? "bg-[#2D5A27] text-white shadow-xs" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
          )}
        >
          सभी (All)
        </button>
        {sortedCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              selectedCategory === cat.id ? "bg-[#2D5A27] text-white shadow-xs" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Advanced Sort & Brand Filter Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort By Dropdown */}
          <div className="relative inline-flex items-center">
            <span className="absolute left-2.5 pointer-events-none text-gray-500">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#2D5A27]" />
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-gray-50 hover:bg-gray-100/80 focus:bg-white text-gray-800 text-xs font-bold pl-8 pr-7 py-2 rounded-xl border border-gray-200 outline-none focus:ring-1 focus:ring-[#2D5A27] transition-all cursor-pointer shadow-2xs"
            >
              <option value="default">क्रम: अनुशंसित (Default)</option>
              <option value="price-asc">कीमत: कम से ज्यादा (₹ Low to High)</option>
              <option value="price-desc">कीमत: ज्यादा से कम (₹ High to Low)</option>
              <option value="name-asc">नाम: A से Z</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Brand Filter Dropdown */}
          {availableBrands.length > 0 && (
            <div className="relative inline-flex items-center">
              <span className="absolute left-2.5 pointer-events-none text-gray-500">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              </span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="appearance-none bg-gray-50 hover:bg-gray-100/80 focus:bg-white text-gray-800 text-xs font-bold pl-8 pr-7 py-2 rounded-xl border border-gray-200 outline-none focus:ring-1 focus:ring-[#2D5A27] transition-all cursor-pointer shadow-2xs"
              >
                <option value="all">सभी ब्रांड (All Brands)</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>
          )}

          {/* In-Stock Toggle Button */}
          <button
            type="button"
            onClick={() => setInStockOnly(!inStockOnly)}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95",
              inStockOnly 
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold" 
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            )}
          >
            <Check className={cn("w-3.5 h-3.5", inStockOnly ? "text-emerald-700 stroke-[3]" : "text-gray-400 opacity-0")} />
            <span>केवल स्टॉक में</span>
          </button>
        </div>

        {/* Clear Filters Button */}
        {(sortBy !== 'default' || selectedBrand !== 'all' || inStockOnly) && (
          <button
            onClick={() => {
              setSortBy('default');
              setSelectedBrand('all');
              setInStockOnly(false);
            }}
            className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-100 flex items-center gap-1 transition-all active:scale-95 cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>फ़िल्टर हटाएं</span>
          </button>
        )}
      </div>

      {/* Product List - Premium Responsive Vertical Grid Matching Featured Products */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-4 lg:gap-5 2xl:gap-6">
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
