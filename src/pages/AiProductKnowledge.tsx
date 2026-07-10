import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Search, Copy, Share2, Bookmark, BookmarkCheck, ArrowLeft, 
  RotateCcw, AlertTriangle, HelpCircle, CheckCircle2, ChevronRight, FileText, 
  Sparkles, Droplets, Layers, ShieldAlert, Thermometer, ExternalLink, 
  RefreshCw, Star, Info, ClipboardCheck, Printer, Check, Leaf, Heart,
  Camera, Image as ImageIcon, X, GripVertical, Trash2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProductKnowledge, ProductKnowledgeResult, analyzeProductImage } from '../services/gemini';
import ApiKeyModal from '../components/ApiKeyModal';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query as fsQuery, 
  orderBy, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';

const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CacheEntry {
  productId: string;
  timestamp: number;
  data: ProductKnowledgeResult;
  searchQuery: string;
}

interface SmartCache {
  entries: Record<string, CacheEntry>; // key is normalized product name
  index: Record<string, string>; // key is normalized search keyword, value is normalized product name
}

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[।०.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // remove punctuation
    .replace(/\s+/g, " "); // collapse spacing
};

const getCachedResult = (query: string): ProductKnowledgeResult | null => {
  try {
    const rawCache = localStorage.getItem('pk_smart_cache');
    if (!rawCache) return null;
    const cache: SmartCache = JSON.parse(rawCache);
    if (!cache.entries || !cache.index) return null;

    const normQuery = normalizeText(query);
    const productId = cache.index[normQuery];
    if (!productId) return null;

    const entry = cache.entries[productId];
    if (!entry) return null;

    // Check expiration
    const isExpired = Date.now() - entry.timestamp > CACHE_EXPIRY_MS;
    if (isExpired) {
      return null;
    }

    return entry.data;
  } catch (e) {
    console.error("Error reading cache", e);
    return null;
  }
};

const saveToCache = (query: string, data: ProductKnowledgeResult) => {
  try {
    const rawCache = localStorage.getItem('pk_smart_cache');
    let cache: SmartCache = { entries: {}, index: {} };
    if (rawCache) {
      try {
        cache = JSON.parse(rawCache);
        if (!cache.entries) cache.entries = {};
        if (!cache.index) cache.index = {};
      } catch (e) {
        // Reset if corrupt
      }
    }

    const productId = normalizeText(data.productName);
    const normQuery = normalizeText(query);

    // Save/update the main entry
    cache.entries[productId] = {
      productId,
      timestamp: Date.now(),
      data,
      searchQuery: query
    };

    // Create index mappings
    cache.index[normQuery] = productId;
    cache.index[normalizeText(data.productName)] = productId;
    if (data.technicalName) {
      cache.index[normalizeText(data.technicalName)] = productId;
      if (data.technicalName.includes('+')) {
        const parts = data.technicalName.split('+');
        parts.forEach(part => {
          cache.index[normalizeText(part)] = productId;
        });
      }
    }
    if (data.companyName) {
      cache.index[normalizeText(data.companyName)] = productId;
    }

    // Run a quick cleanup of expired items to keep localStorage size low
    const now = Date.now();
    const activeProductIds = new Set<string>();

    const cleanedEntries: Record<string, CacheEntry> = {};
    Object.entries(cache.entries).forEach(([id, entry]) => {
      if (now - entry.timestamp <= CACHE_EXPIRY_MS) {
        cleanedEntries[id] = entry;
        activeProductIds.add(id);
      }
    });
    cache.entries = cleanedEntries;

    const cleanedIndex: Record<string, string> = {};
    Object.entries(cache.index).forEach(([keyword, id]) => {
      if (activeProductIds.has(id)) {
        cleanedIndex[keyword] = id;
      }
    });
    cache.index = cleanedIndex;

    localStorage.setItem('pk_smart_cache', JSON.stringify(cache));
  } catch (e) {
    console.error("Error saving to cache", e);
  }
};

const getSafeDocId = (productName: string): string => {
  if (!productName) return 'product_unknown';
  const cleanName = productName.toLowerCase().trim();
  
  // Calculate a simple, stable hash code for uniqueness
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    const char = cleanName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Create a clean alphanumeric prefix (characters [a-z0-9])
  const safePrefix = cleanName
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 30);
    
  return `${safePrefix || 'product'}_${Math.abs(hash)}`;
};

export default function AiProductKnowledge() {
  const navigate = useNavigate();
  const { user, userSettings } = useAppContext();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProductKnowledgeResult | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyErrorMessage, setApiKeyErrorMessage] = useState<string | undefined>();
  
  // Image Search states and refs
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageSearch, setIsImageSearch] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // History & Bookmarks
  const [bookmarkedProducts, setBookmarkedProducts] = useState<ProductKnowledgeResult[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Active Dosage Tab
  const [activeDosageTab, setActiveDosageTab] = useState<'liquid' | 'powder' | 'fertilizer'>('liquid');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Drag & Drop and Delete Confirmation states and refs
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeoutRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductKnowledgeResult | null>(null);


  // Real-time Firebase Cloud Sync & Local Cache Merging
  useEffect(() => {
    if (!user) {
      const local = localStorage.getItem('product_knowledge_bookmarks');
      if (local) {
        try {
          const parsed = JSON.parse(local) as ProductKnowledgeResult[];
          setBookmarkedProducts(parsed.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        } catch (e) {
          console.error("Error parsing local bookmarks", e);
        }
      } else {
        setBookmarkedProducts([]);
      }
      return;
    }

    console.log("Setting up Firestore sync for user:", user.uid);
    const q = fsQuery(
      collection(db, 'users', user.uid, 'savedProducts'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const firestoreProducts = snapshot.docs.map(doc => doc.data() as ProductKnowledgeResult);
      
      const localStr = localStorage.getItem('product_knowledge_bookmarks');
      let localProducts: ProductKnowledgeResult[] = [];
      if (localStr) {
        try {
          localProducts = JSON.parse(localStr);
        } catch (e) {}
      }

      const unsyncedLocal = localProducts.filter(lp => 
        !firestoreProducts.some(fp => fp.productName.toLowerCase().trim() === lp.productName.toLowerCase().trim())
      );

      if (unsyncedLocal.length > 0) {
        console.log("Migrating unsynced local products to Firestore:", unsyncedLocal.length);
        try {
          const batch = writeBatch(db);
          let startOrder = firestoreProducts.length;
          unsyncedLocal.forEach((lp) => {
            const docId = getSafeDocId(lp.productName);
            const ref = doc(db, 'users', user.uid, 'savedProducts', docId);
            batch.set(ref, {
              ...lp,
              order: startOrder++,
              createdAt: lp.createdAt || Date.now()
            });
          });
          await batch.commit();
          return;
        } catch (err) {
          console.error("Migration to Firestore failed:", err);
        }
      }

      setBookmarkedProducts(firestoreProducts);
      localStorage.setItem('product_knowledge_bookmarks', JSON.stringify(firestoreProducts));
    }, (error) => {
      console.error("Firestore savedProducts sync error:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Update Bookmark State when result changes
  useEffect(() => {
    if (result) {
      const exists = bookmarkedProducts.some(
        (b) => b.productName.toLowerCase() === result.productName.toLowerCase()
      );
      setIsBookmarked(exists);

      // Auto-switch dosage tab based on product category/formulation
      const formulationLower = result.formulation.toLowerCase();
      const catLower = result.category.toLowerCase();
      
      if (formulationLower.includes('ec') || formulationLower.includes('sl') || formulationLower.includes('sc') || formulationLower.includes('liquid') || formulationLower.includes('लिक्लीड') || formulationLower.includes('तरल')) {
        setActiveDosageTab('liquid');
      } else if (catLower.includes('fertilizer') || catLower.includes('खाद') || catLower.includes('urea') || catLower.includes('dap')) {
        setActiveDosageTab('fertilizer');
      } else {
        setActiveDosageTab('powder');
      }
    }
  }, [result, bookmarkedProducts]);

  const handleSearch = async (searchQuery: string, forceRefresh = false) => {
    if (isLoading) return;
    const term = searchQuery.trim();
    if (!term) return;

    if (!userSettings?.geminiApiKey) {
      setApiKeyErrorMessage("AI Product Knowledge उपयोग करने के लिए कृपया अपनी Gemini API Key सेट करें।");
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsLoading(true);
    setIsImageSearch(false);
    setSelectedImage(null);
    setError(null);
    setResult(null);

    // Check Cache
    if (!forceRefresh) {
      const cachedData = getCachedResult(term);
      if (cachedData) {
        setIsFromCache(true);
        setResult(cachedData);
        setIsLoading(false);
        autoSaveProduct(cachedData);
        return;
      }
    }
    setIsFromCache(false);

    try {
      const data = await getProductKnowledge(term, userSettings.geminiApiKey);
      saveToCache(term, data);
      setResult(data);
      autoSaveProduct(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "जानकारी खोजने में समस्या आई। कृपया पुनः प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        handleImageSearch(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSearch = async (base64Img: string) => {
    if (isLoading) return;
    if (!userSettings?.geminiApiKey) {
      setApiKeyErrorMessage("AI Product Knowledge उपयोग करने के लिए कृपया अपनी Gemini API Key सेट करें।");
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsLoading(true);
    setIsImageSearch(true);
    setError(null);
    setResult(null);
    setIsFromCache(false);

    try {
      const data = await analyzeProductImage(base64Img, userSettings.geminiApiKey);
      saveToCache(data.productName || "scanned_image", data);
      setResult(data);
      autoSaveProduct(data);
      if (data.productName && data.hasExactMatch) {
        setQuery(data.productName);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "इमेज का विश्लेषण करने में समस्या आई। कृपया पुनः प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // Intelligent Cloud Sync Auto Save, Delete, Order Actions
  const autoSaveProduct = async (data: ProductKnowledgeResult) => {
    if (!data || !data.productName || data.productName === "जानकारी उपलब्ध नहीं है") return;
    
    const cleanName = data.productName.toLowerCase().trim();
    const docId = getSafeDocId(data.productName);
    if (!docId) return;

    setBookmarkedProducts((prevList) => {
      const alreadyExists = prevList.some(
        p => p.productName.toLowerCase().trim() === cleanName
      );
      if (alreadyExists) return prevList;

      const newOrder = prevList.length;
      const savedProductData = {
        ...data,
        order: newOrder,
        createdAt: Date.now()
      };

      const updatedList = [...prevList, savedProductData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      localStorage.setItem('product_knowledge_bookmarks', JSON.stringify(updatedList));

      if (user) {
        const userSavedProductsRef = doc(db, 'users', user.uid, 'savedProducts', docId);
        setDoc(userSavedProductsRef, savedProductData).catch(err => {
          console.error("Error auto-saving to Firestore:", err);
        });
      }

      return updatedList;
    });
  };

  const handleDeleteProduct = async (productName: string) => {
    const docId = getSafeDocId(productName);
    
    setBookmarkedProducts((prevList) => {
      const updatedList = prevList.filter(
        p => p.productName.toLowerCase().trim() !== productName.toLowerCase().trim()
      ).map((item, idx) => ({ ...item, order: idx }));

      localStorage.setItem('product_knowledge_bookmarks', JSON.stringify(updatedList));

      if (user) {
        const userSavedProductRef = doc(db, 'users', user.uid, 'savedProducts', docId);
        deleteDoc(userSavedProductRef).then(() => {
          const batch = writeBatch(db);
          updatedList.forEach((item) => {
            const itemDocId = getSafeDocId(item.productName);
            const itemRef = doc(db, 'users', user.uid, 'savedProducts', itemDocId);
            batch.update(itemRef, { order: item.order });
          });
          return batch.commit();
        }).catch(err => {
          console.error("Error deleting from Firestore:", err);
        });
      }

      return updatedList;
    });

    if (result && result.productName.toLowerCase().trim() === productName.toLowerCase().trim()) {
      setResult(null);
    }
  };

  const saveNewOrder = async (newList: ProductKnowledgeResult[]) => {
    const orderedList = newList.map((item, idx) => ({
      ...item,
      order: idx
    }));

    setBookmarkedProducts(orderedList);
    localStorage.setItem('product_knowledge_bookmarks', JSON.stringify(orderedList));

    if (user) {
      try {
        const batch = writeBatch(db);
        orderedList.forEach((item) => {
          const itemDocId = getSafeDocId(item.productName);
          const itemRef = doc(db, 'users', user.uid, 'savedProducts', itemDocId);
          batch.set(itemRef, item, { merge: true });
        });
        await batch.commit();
      } catch (err) {
        console.error("Error saving new order to Firestore:", err);
      }
    }
  };

  // Touch handlers for Drag & Drop
  const handleTouchStart = (index: number) => {
    dragTimeoutRef.current = setTimeout(() => {
      setDraggedIndex(index);
      setIsDragging(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 300);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || draggedIndex === null) return;
    
    if (e.cancelable) {
      e.preventDefault();
    }
    
    const touch = e.touches[0];
    const clientY = touch.clientY;
    
    if (!containerRef.current) return;
    
    const children = Array.from(containerRef.current.children) as HTMLElement[];
    let targetIndex = -1;
    
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        targetIndex = i;
        break;
      }
    }
    
    if (targetIndex !== -1 && targetIndex !== draggedIndex) {
      setBookmarkedProducts((prevList) => {
        const newList = [...prevList];
        const temp = newList[draggedIndex];
        newList[draggedIndex] = newList[targetIndex];
        newList[targetIndex] = temp;
        
        const updatedList = newList.map((item, idx) => ({
          ...item,
          order: idx
        }));
        
        localStorage.setItem('product_knowledge_bookmarks', JSON.stringify(updatedList));
        setDraggedIndex(targetIndex);
        return updatedList;
      });
    }
  };

  const handleTouchEnd = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    if (isDragging) {
      setIsDragging(false);
      setDraggedIndex(null);
      saveNewOrder(bookmarkedProducts);
    }
  };

  // Mouse Down / Desktop Drag Handler
  const handleMouseDown = (index: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
    
    let currentDraggedIndex = index;
    
    const handleMouseMove = (e: MouseEvent) => {
      const clientY = e.clientY;
      if (!containerRef.current) return;
      
      const children = Array.from(containerRef.current.children) as HTMLElement[];
      let targetIndex = -1;
      
      for (let idx = 0; idx < children.length; idx++) {
        const rect = children[idx].getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          targetIndex = idx;
          break;
        }
      }
      
      if (targetIndex !== -1 && targetIndex !== currentDraggedIndex) {
        setBookmarkedProducts((prevList) => {
          const newList = [...prevList];
          const temp = newList[currentDraggedIndex];
          newList[currentDraggedIndex] = newList[targetIndex];
          newList[targetIndex] = temp;
          
          const updatedList = newList.map((item, idx) => ({
            ...item,
            order: idx
          }));
          
          localStorage.setItem('product_knowledge_bookmarks', JSON.stringify(updatedList));
          return updatedList;
        });
        currentDraggedIndex = targetIndex;
        setDraggedIndex(targetIndex);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedIndex(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      setBookmarkedProducts(finalList => {
        saveNewOrder(finalList);
        return finalList;
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const copyToClipboard = () => {
    if (!result) return;

    let dosageText = '';
    if (activeDosageTab === 'liquid') {
      dosageText = `• प्रति 15 लीटर पंप: ${result.dosageLiquid.per15L || result.dosageLiquid.per16L || "उत्पाद श्रेणी अनुसार"}
• प्रति 20 लीटर पंप: ${result.dosageLiquid.per20L || "उत्पाद श्रेणी अनुसार"}
• प्रति बीघा: ${result.dosageLiquid.perBigha || "उत्पाद श्रेणी अनुसार"}`;
    } else if (activeDosageTab === 'powder') {
      dosageText = `• प्रति 15 लीटर पंप: ${result.dosagePowder.per15L || result.dosagePowder.per16L || "उत्पाद श्रेणी अनुसार"}
• प्रति 20 लीटर पंप: ${result.dosagePowder.per20L || "उत्पाद श्रेणी अनुसार"}
• प्रति बीघा: ${result.dosagePowder.perBigha || "उत्पाद श्रेणी अनुसार"}`;
    } else {
      dosageText = `• प्रति पौधा: ${result.dosageFertilizer.perPlant || "उत्पाद श्रेणी अनुसार"}
• प्रति सिंचाई: ${result.dosageFertilizer.perIrrigation || "उत्पाद श्रेणी अनुसार"}
• प्रति बीघा: ${result.dosageFertilizer.perBigha || "उत्पाद श्रेणी अनुसार"}`;
    }

    const shareText = `*फल्सावदिया कृषि बाज़ार* - AI उत्पाद जानकारी
----------------------------------------

*उत्पाद का नाम:* ${result.productName}

*कंपनी:* ${result.companyName}

*तकनीकी नाम (Technical):* ${result.technicalName}

*श्रेणी (Category):* ${result.category}

*फॉर्मूलेशन (Formulation):* ${result.formulation}

*📋 विवरण और फायदे:*
${result.benefits}

*⭐ प्रमुख मात्रा (Dosage & Usage):*
${dosageText}

*⚠️ सावधानियां:*
${result.safetyInstructions}

----------------------------------------
📌 अधिक जानकारी के लिए फल्सावदिया कृषि बाज़ार दुकान पर विजिट करें।
📍 पता: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश – 458883
🕒 समय: सुबह 8:00 बजे से रात 8:00 बजे तक`;

    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = () => {
    if (!result) return;
    if (navigator.share) {
      navigator.share({
        title: result.productName,
        text: `फल्सावदिया कृषि बाज़ार से जानें ${result.productName} (${result.technicalName}) की पूरी जानकारी और सही मात्रा।`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      copyToClipboard();
    }
  };

  const exportPdf = async () => {
    if (!result) return;
    setIsPdfGenerating(true);
    
    // Give browser time to close any open popups or complete pending renders
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Canvas to convert modern CSS color functions (oklch, oklab, lch, lab) to sRGB rgba
    const tempColorCanvas = document.createElement('canvas');
    tempColorCanvas.width = 1;
    tempColorCanvas.height = 1;
    const tempColorCtx = tempColorCanvas.getContext('2d', { willReadFrequently: true });

    const convertColorToRgba = (colorStr: string): string => {
      if (!tempColorCtx) return '#9ca3af';
      try {
        tempColorCtx.clearRect(0, 0, 1, 1);
        tempColorCtx.fillStyle = colorStr;
        tempColorCtx.fillRect(0, 0, 1, 1);
        const imgData = tempColorCtx.getImageData(0, 0, 1, 1).data;
        const r = imgData[0];
        const g = imgData[1];
        const b = imgData[2];
        const a = (imgData[3] / 255).toFixed(3);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      } catch (e) {
        return '#9ca3af';
      }
    };

    const cleanCssValue = (value: string): string => {
      if (typeof value !== 'string') return value;
      if (!value.includes('oklch') && !value.includes('oklab') && !value.includes('lch') && !value.includes('lab')) {
        return value;
      }
      const colorRegex = /(oklch|oklab|lch|lab)\(([^)]+)\)/gi;
      return value.replace(colorRegex, (match) => {
        return convertColorToRgba(match);
      });
    };

    // Color replacement helper functions to convert CSS color spaces in stylesheet texts
    const replaceOklchWithHsl = (cssString: string) => {
      return cssString.replace(/oklch\(([^)]+)\)/gi, (match) => convertColorToRgba(match));
    };

    const replaceOklabWithHsl = (cssString: string) => {
      return cssString.replace(/oklab\(([^)]+)\)/gi, (match) => convertColorToRgba(match));
    };

    const replaceLchWithHsl = (cssString: string) => {
      return cssString.replace(/lch\(([^)]+)\)/gi, (match) => convertColorToRgba(match));
    };

    const replaceLabWithHsl = (cssString: string) => {
      return cssString.replace(/lab\(([^)]+)\)/gi, (match) => convertColorToRgba(match));
    };

    const cleanCss = (css: string) => {
      return replaceLabWithHsl(replaceLchWithHsl(replaceOklabWithHsl(replaceOklchWithHsl(css))));
    };

    // Find all style elements and backup their text content
    const styleElements = Array.from(document.querySelectorAll('style'));
    const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];

    const originalContents = styleElements.map(el => el.textContent || '');
    const tempStyleElements: HTMLStyleElement[] = [];

    // Backup original window.getComputedStyle
    const originalGetComputedStyle = window.getComputedStyle;

    try {
      // 1. Override window.getComputedStyle to intercept oklch/oklab in computed style querying (vital for html2canvas)
      window.getComputedStyle = function (elt, pseudoElt) {
        const style = originalGetComputedStyle.call(this, elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop, receiver) {
            if (prop === 'getPropertyValue') {
              return function(propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                return cleanCssValue(val);
              };
            }
            const value = Reflect.get(target, prop, receiver);
            if (typeof prop === 'string' && typeof value === 'string') {
              return cleanCssValue(value);
            }
            return value;
          }
        });
      };

      // 2. Temporarily clean styles inside style tags
      styleElements.forEach(el => {
        if (el.textContent) {
          el.textContent = cleanCss(el.textContent);
        }
      });

      // 3. Fetch, clean and temporarily override external same-origin stylesheet link elements
      await Promise.all(linkElements.map(async link => {
        const href = link.getAttribute('href');
        if (href) {
          try {
            const url = new URL(href, window.location.href);
            if (url.origin === window.location.origin) {
              const response = await fetch(href);
              if (response.ok) {
                const rawText = await response.text();
                const cleanedText = cleanCss(rawText);
                
                // Create a temporary style tag with the cleaned CSS
                const tempStyle = document.createElement('style');
                tempStyle.textContent = cleanedText;
                document.head.appendChild(tempStyle);
                tempStyleElements.push(tempStyle);
                
                // Disable the original link tag
                link.disabled = true;
              }
            }
          } catch (e) {
            console.warn("Could not process stylesheet link:", href, e);
          }
        }
      }));

      const element = document.getElementById('pdf-export-template');
      if (!element) {
        throw new Error("Export template element not found");
      }

      // Temporarily show the template off-screen but with proper styling for rendering
      const originalStyle = element.getAttribute('style') || '';
      element.setAttribute('style', 'position: fixed; left: -9999px; top: 0px; width: 794px; background: white; z-index: -9999; padding: 40px; box-sizing: border-box; display: block;');

      // Scroll to top of the offscreen template to ensure complete capture
      element.scrollTop = 0;

      const canvas = await html2canvas(element, {
        scale: 2, // High DPI capture for ultra-sharp text
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: element.scrollHeight
      });

      // Restore original hidden style
      element.setAttribute('style', originalStyle);

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const canvasHeightInMm = (canvas.height * imgWidth) / canvas.width;
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      let heightLeft = canvasHeightInMm;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, canvasHeightInMm);
      heightLeft -= pageHeight;

      // Add remaining pages if document is long
      while (heightLeft > 0) {
        position = position - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, canvasHeightInMm);
        heightLeft -= pageHeight;
      }

      // Add generation date & time metadata to filename
      const now = new Date();
      const formattedDate = now.toLocaleDateString('hi-IN').replace(/\//g, '-');
      const formattedTime = now.toLocaleTimeString('hi-IN').replace(/:/g, '-').replace(/\s+/g, '');
      
      pdf.save(`${result.productName.trim().replace(/\s+/g, '_')}_विवरण_${formattedDate}_${formattedTime}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("PDF बनाने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
    } finally {
      // Restore getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;

      // Restore original style tags content
      styleElements.forEach((el, index) => {
        el.textContent = originalContents[index];
      });

      // Re-enable original link tags
      linkElements.forEach(link => {
        link.disabled = false;
      });

      // Remove temporary styles we appended
      tempStyleElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });

      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 print:pb-0 print:space-y-4">
      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        message={apiKeyErrorMessage}
      />

      {/* Header Panel */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#2D5A27] to-[#3D7A35] text-white p-4 rounded-3xl shadow-lg print:hidden">
        <button 
          onClick={() => {
            if (result) {
              setResult(null);
              setSelectedImage(null);
            } else {
              navigate(-1);
            }
          }}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#EAB308] animate-pulse" />
            AI उत्पाद ज्ञान साथी
          </h2>
          <p className="text-xs text-white/80 font-bold">Company Products, Technicals & Fertilizers की सटीक जानकारी</p>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block text-center border-b pb-4">
        <h1 className="text-2xl font-black text-[#2D5A27]">फल्सावदिया कृषि बाज़ार</h1>
        <p className="text-xs text-gray-500">डिंपल चौराहा, शामगढ़ (म.प्र.) | संपर्क: 8982338046</p>
        <p className="text-xs text-gray-400 mt-1">दुकान समय: सुबह 8:00 बजे से रात 8:00 बजे तक</p>
      </div>

      {/* Main Search Block (Hidden on Print) */}
      <div className="space-y-4 print:hidden">
        <div className="relative">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="उत्पाद का नाम / Technical"
            className="w-full bg-white border-2 border-[#2D5A27]/20 rounded-3xl py-4 pl-12 pr-28 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27] transition-all shadow-sm"
          />
          <Search className="absolute left-4 top-4.5 w-5 h-5 text-gray-400" />
          
          <div className="absolute right-2 top-2 flex items-center gap-1.5">
            <button 
              onClick={() => setIsBottomSheetOpen(true)}
              className="p-2.5 rounded-full transition-all bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200/50"
              title="Image Search"
            >
              <Camera className="w-4.5 h-4.5" />
            </button>
            <button 
              onClick={() => handleSearch(query)}
              disabled={isLoading || !query.trim()}
              className="bg-[#2D5A27] hover:bg-[#3D7A35] text-white px-4 py-2.5 rounded-full text-xs font-black transition-all disabled:opacity-50"
            >
              खोजें
            </button>
          </div>
        </div>

        {/* Hidden File Inputs for Camera and Gallery */}
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

      {/* Selected Image Preview */}
      {selectedImage && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-4 border border-amber-100 shadow-sm flex items-center justify-between gap-4 print:hidden"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shrink-0">
              <img src={selectedImage} alt="Scanned Product" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-black text-[#2D5A27] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                स्कैन किया गया उत्पाद फोटो
              </p>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                {isLoading ? "AI फोटो का विश्लेषण कर रहा है..." : "सफलतापूर्वक पहचाना गया!"}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedImage(null);
              setResult(null);
              setQuery('');
            }}
            className="p-2 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 active:scale-90 transition-all"
            title="फ़ोटो हटाएं"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Loading Block */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 print:hidden">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#EAB308] animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[#2D5A27] font-black text-lg animate-pulse">
              {isImageSearch ? "AI उत्पाद फोटो का विश्लेषण जारी है..." : "Google और कृषि सूत्रों से शोध जारी है..."}
            </p>
            <p className="text-xs text-gray-500 font-bold mt-1">
              {isImageSearch ? "लेबल, सामग्री (Ingredients) and टेक्निकल घटकों की पहचान हो रही है" : "CIB&RC, IFFCO, ICAR और अधिकृत डेटाबेसों की जाँच हो रही है"}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-5 text-center space-y-3 print:hidden">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="font-bold text-red-900 text-lg">जानकारी लोड नहीं हो सकी</h3>
          <p className="text-xs text-red-700 font-medium leading-relaxed">{error}</p>
          <button 
            onClick={() => handleSearch(query)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full text-xs font-black transition-all active:scale-95 flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="w-4 h-4" /> पुनः प्रयास करें
          </button>
        </div>
      )}

      {/* Result Panel */}
      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back to main list button */}
          <div className="print:hidden">
            <button
              onClick={() => {
                setResult(null);
                setSelectedImage(null);
              }}
              className="flex items-center gap-2 text-xs font-black text-[#2D5A27] bg-[#2D5A27]/5 hover:bg-[#2D5A27]/10 px-4.5 py-2.5 rounded-2xl transition-all active:scale-95 border border-[#2D5A27]/10 w-fit cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← मुख्य सूची / खोज पर वापस जाएँ (Go Back)</span>
            </button>
          </div>
          {isFromCache && (
            <div className="bg-amber-50 border border-amber-200/60 rounded-3xl p-4 flex items-center justify-between gap-3 text-amber-800 print:hidden shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-amber-900">ऑफ़लाइन संग्रह (Local Cache) से तुरंत लोड किया गया</p>
                  <p className="text-[10px] text-amber-700/80 font-bold">बिना इंटरनेट या कमजोर नेटवर्क में भी तुरंत जानकारी</p>
                </div>
              </div>
              <button
                onClick={() => handleSearch(query || result.productName, true)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 shadow-xs active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                अपडेट करें
              </button>
            </div>
          )}

          {/* Quick Actions Panel */}
          <div className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-2xl shadow-sm print:hidden">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => {
                  setProductToDelete(result);
                  setIsDeleteConfirmOpen(true);
                }}
                className="p-2.5 rounded-xl transition-all bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 flex items-center gap-1.5 cursor-pointer"
                title="Delete Saved Product"
              >
                <Trash2 className="w-4.5 h-4.5 animate-none" />
                <span className="text-xs font-black">सुरक्षित सूची से हटाएं (Delete)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={copyToClipboard}
                className="bg-gray-50 hover:bg-gray-100 p-2.5 rounded-xl border border-gray-100 text-gray-600 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95"
                title="Copy details"
              >
                {isCopied ? <ClipboardCheck className="w-4.5 h-4.5 text-green-600" /> : <Copy className="w-4.5 h-4.5" />}
                <span>{isCopied ? 'कॉपी हो गया' : 'व्हाट्सएप कॉपी'}</span>
              </button>
            </div>
          </div>

          {/* Primary Info Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="bg-[#2D5A27] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                    {result.category}
                  </span>
                  {result.formulation && (
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-gray-200">
                      {result.formulation}
                    </span>
                  )}
                  {result.fracIracHracGroup && (
                    <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-200">
                      Group: {result.fracIracHracGroup}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-[#4A3728] leading-tight">{result.productName}</h3>
                <p className="text-sm text-gray-500 font-bold mt-0.5">निर्माता: {result.companyName || "विविध ब्रांड्स"}</p>
              </div>

              {/* Verified badge */}
              <div className="bg-green-50 border border-green-200 px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-right shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-[9px] text-green-700 font-black uppercase tracking-wider leading-none">अधिकृत जानकारी</p>
                  <p className="text-[8px] text-gray-400 font-bold mt-0.5">Verified Data</p>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-100 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">सक्रिय तत्व (Technical Name)</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200/50 inline-block">{result.technicalName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">एक्टिव घटक (Active Ingredient)</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5">{result.activeIngredient || "डेटाबेस अनुसार"}</p>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-100 pt-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">असर का तरीका (Mode of Action)</p>
              <p className="text-xs font-bold text-gray-700 mt-1 leading-relaxed bg-[#F5F2ED]/40 p-3 rounded-2xl border border-gray-100">
                {result.modeOfAction}
              </p>
            </div>
          </div>

          {/* ⭐ Major Section – Dosage & Usage Calculator */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-[#2D5A27] text-white p-5">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Droplets className="w-5 h-5 text-amber-400" />
                सही मात्रा और छिड़काव मार्गदर्शिका (Dosage & Spray Guide)
              </h3>
              <p className="text-xs text-white/85 font-medium mt-1">
                फसल को नुकसान से बचाने के लिए नीचे दी गई मात्रा का कड़ाई से पालन करें।
              </p>
            </div>

            {/* Dose Type Selection Tabs */}
            <div className="flex border-b border-gray-100 print:hidden">
              <button 
                onClick={() => setActiveDosageTab('liquid')}
                className={`flex-1 py-3.5 text-xs font-black text-center border-b-2 transition-all ${activeDosageTab === 'liquid' ? 'border-[#2D5A27] text-[#2D5A27] bg-[#2D5A27]/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                तरल उत्पाद (Liquid / ML)
              </button>
              <button 
                onClick={() => setActiveDosageTab('powder')}
                className={`flex-1 py-3.5 text-xs font-black text-center border-b-2 transition-all ${activeDosageTab === 'powder' ? 'border-[#2D5A27] text-[#2D5A27] bg-[#2D5A27]/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                पाउडर/दानेदार (Powder / Gram)
              </button>
              <button 
                onClick={() => setActiveDosageTab('fertilizer')}
                className={`flex-1 py-3.5 text-xs font-black text-center border-b-2 transition-all ${activeDosageTab === 'fertilizer' ? 'border-[#2D5A27] text-[#2D5A27] bg-[#2D5A27]/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                उर्वरक/खाद (Fertilizers / KG)
              </button>
            </div>

            {/* Calculations Render */}
            <div className="p-6 space-y-6">
              {/* Liquid Dose Section */}
              {activeDosageTab === 'liquid' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">प्रति 1 लीटर पानी</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageLiquid.perLiter || "N/A"}</p>
                    </div>
                    <div className="bg-[#2D5A27]/5 p-3.5 rounded-2xl border border-[#2D5A27]/10 text-center relative overflow-hidden">
                      <div className="absolute top-1 right-2 text-[8px] bg-[#2D5A27] text-white px-1 rounded-sm uppercase tracking-wider font-bold">Standard</div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">15L टंकी (Pump)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageLiquid.per15L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">16L टंकी (Pump)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageLiquid.per16L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">20L टंकी (Pump)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageLiquid.per20L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">25L टंकी (Pump)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageLiquid.per25L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center col-span-2 md:col-span-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">200L ड्रम (Tank)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageLiquid.per200L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center col-span-2 md:col-span-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">500L टैंकर (Tanker)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageLiquid.per500L || "N/A"}</p>
                    </div>
                    <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center col-span-2 md:col-span-1">
                      <p className="text-[10px] text-amber-700 font-black uppercase">प्रति 1 बीघा (Bigha)</p>
                      <p className="text-lg font-black text-amber-900 mt-1">{result.dosageLiquid.perBigha || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Powder Dose Section */}
              {activeDosageTab === 'powder' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">प्रति 1 लीटर पानी</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosagePowder.perLiter || "N/A"}</p>
                    </div>
                    <div className="bg-[#2D5A27]/5 p-3.5 rounded-2xl border border-[#2D5A27]/10 text-center relative overflow-hidden">
                      <div className="absolute top-1 right-2 text-[8px] bg-[#2D5A27] text-white px-1 rounded-sm uppercase tracking-wider font-bold">Standard</div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">15L टंकी (Pump)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosagePowder.per15L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">16L टंकी (Pump)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosagePowder.per16L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">20L टंकी (Pump)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosagePowder.per20L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">25L टंकी (Pump)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosagePowder.per25L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center col-span-2 md:col-span-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">200L ड्रम (Tank)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosagePowder.per200L || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center col-span-2 md:col-span-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">500L टैंकर (Tanker)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosagePowder.per500L || "N/A"}</p>
                    </div>
                    <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center col-span-2 md:col-span-1">
                      <p className="text-[10px] text-amber-700 font-black uppercase">प्रति 1 बीघा (Bigha)</p>
                      <p className="text-lg font-black text-amber-900 mt-1">{result.dosagePowder.perBigha || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fertilizers Section */}
              {activeDosageTab === 'fertilizer' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">प्रति पौधा</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageFertilizer.perPlant || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">प्रति गमला (Pot)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageFertilizer.perPot || "N/A"}</p>
                    </div>
                    <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center">
                      <p className="text-[10px] text-amber-700 font-black uppercase">प्रति 1 बीघा (Bigha)</p>
                      <p className="text-lg font-black text-amber-900 mt-1">{result.dosageFertilizer.perBigha || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">प्रति सिंचाई</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageFertilizer.perIrrigation || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">प्रति स्प्रे (Spray)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageFertilizer.perSpray || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">ड्रेंचिंग मात्रा (Drenching)</p>
                      <p className="text-lg font-black text-[#2D5A27] mt-1">{result.dosageFertilizer.perDrenching || "N/A"}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-2xl border border-gray-200 text-center col-span-2 md:col-span-3">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">कुल अनुशंसित मात्रा (Total Dose)</p>
                      <p className="text-lg font-black text-gray-800 mt-1">{result.dosageFertilizer.totalAmount || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Crop Specific Dosages */}
              {result.cropSpecificDosage && result.cropSpecificDosage.length > 0 && (
                <div className="border-t border-gray-100 pt-5 space-y-3">
                  <h4 className="text-sm font-black text-[#4A3728] uppercase tracking-wider flex items-center gap-1.5">
                    <Leaf className="w-4 h-4 text-green-600" />
                    फसलों के अनुसार मात्रा (Crop Specific Recommendation)
                  </h4>
                  <div className="space-y-3.5">
                    {result.cropSpecificDosage.map((item, idx) => (
                      <div key={idx} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-black text-[#2D5A27] text-sm flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {item.cropName}
                          </p>
                          <p className="text-xs text-gray-600 font-medium">उपयोग विधि: {item.usage}</p>
                          <p className="text-[10px] text-gray-400 font-bold">छिड़काव का सही समय: {item.sprayTime}</p>
                        </div>
                        <div className="bg-white border border-[#2D5A27]/20 px-4 py-2 rounded-xl text-center md:text-right">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">मात्रा / बीघा</span>
                          <span className="font-black text-[#2D5A27] text-sm">{item.dosage}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Benefits & Key Uses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-black text-[#4A3728] uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                <Check className="w-5 h-5 text-green-600" />
                मुख्य उपयोग एवं फायदे (Benefits & Uses)
              </h3>
              <div className="text-xs font-bold text-gray-700 leading-relaxed whitespace-pre-line space-y-2">
                {result.benefits || result.usage}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-black text-[#4A3728] uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                विशेषताएं (Outstanding Features)
              </h3>
              <div className="text-xs font-bold text-gray-700 leading-relaxed whitespace-pre-line space-y-2">
                {result.features || "विवरण उपलब्ध नहीं है"}
              </div>
            </div>
          </div>

          {/* Target crops, Pests, & Symptoms */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-[#4A3728] uppercase tracking-wider flex items-center gap-2 border-b pb-2">
              <Info className="w-5 h-5 text-blue-500" />
              लक्षित फसलें एवं रोग / कीट (Target Crops & Pests)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">लक्षित फसलें (Crops)</p>
                <p className="text-xs font-bold text-gray-800 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">{result.targetCrops || "डेटाबेस अनुसार"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">नुकसान / रोग / कीट (Target Pests)</p>
                <p className="text-xs font-bold text-gray-800 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">{result.targetPests || "डेटाबेस अनुसार"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">लक्षण पहचान (Symptoms)</p>
                <p className="text-xs font-bold text-gray-800 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">{result.symptoms || "डेटाबेस अनुसार"}</p>
              </div>
            </div>
          </div>

          {/* Compatibility list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-[#4A3728] uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                किसके साथ मिला सकते हैं (Compatible Products)
              </h3>
              <p className="text-xs font-bold text-green-800 bg-green-50/50 p-3.5 rounded-2xl border border-green-100 leading-relaxed">
                {result.compatibleProducts || "सामान्यतः अधिकांश कीटनाशकों और कवकनाशकों के साथ मिला सकते हैं।"}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-[#4A3728] uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                किसके साथ न मिलाएं (Incompatible Products)
              </h3>
              <p className="text-xs font-bold text-red-800 bg-red-50/50 p-3.5 rounded-2xl border border-red-100 leading-relaxed">
                {result.incompatibleProducts || "क्षारीय (Alkaline) या बोर्डो मिश्रण (Bordeaux mixture) के साथ मिश्रण न करें।"}
              </p>
            </div>
          </div>

          {/* Precautions, Safety, PHI, REI, Waiting Period */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-base font-black text-[#4A3728] uppercase tracking-wider flex items-center gap-2 border-b pb-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              सुरक्षा, सावधानियां एवं तकनीकी मापदंड (Safety & Precautions)
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50/50 p-3 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">टॉक्सिसिटी (Toxicity)</span>
                <p className="text-xs font-bold text-rose-600 mt-1">{result.toxicity || "मध्यम रूप से विषैला"}</p>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">प्रतीक्षा अवधि (Waiting Period)</span>
                <p className="text-xs font-bold text-gray-800 mt-1">{result.waitingPeriod || "N/A"}</p>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">सुरक्षित अंतराल (PHI)</span>
                <p className="text-xs font-bold text-gray-800 mt-1">{result.phi || "N/A"}</p>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">प्रवेश निषेध अवधि (REI)</span>
                <p className="text-xs font-bold text-gray-800 mt-1">{result.rei || "N/A"}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex gap-3">
                <div className="bg-rose-50 p-1.5 rounded-lg text-rose-600 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-rose-800 uppercase tracking-wider">सुरक्षा निर्देश (Safety Instructions)</p>
                  <p className="text-xs text-gray-700 font-bold leading-relaxed">{result.safetyInstructions}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">मिक्सिंग ऑर्डर (Mixing Order)</p>
                  <p className="text-xs text-gray-700 font-bold leading-relaxed">{result.mixingOrder}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600 shrink-0">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">स्प्रे का सही समय (Spray Timing & Rainfast)</p>
                  <p className="text-xs text-gray-700 font-bold leading-relaxed">
                    समय: {result.sprayTiming} | पानी से बचाव (Rainfast): {result.rainfastPeriod}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-gray-100 p-1.5 rounded-lg text-gray-600 shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">भंडारण (Storage)</p>
                  <p className="text-xs text-gray-700 font-bold leading-relaxed">{result.storage}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Web Sources / Citations */}
          {result.sources && result.sources.length > 0 && (
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-3.5 print:hidden">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">प्रमाणित जानकारी के आधिकारिक स्रोत:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.sources.map((src, i) => (
                  <a 
                    key={i} 
                    href={src.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-white border border-gray-100 hover:border-[#2D5A27] rounded-xl transition-all group shadow-2xs"
                  >
                    <div className="truncate pr-4">
                      <p className="text-xs font-bold text-gray-800 truncate group-hover:text-[#2D5A27]">{src.title}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{src.uri}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#2D5A27] shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Bookmarks & Search History Panels */}
      {!result && !isLoading && (
        <div className="space-y-6 print:hidden">
          {/* Favorite Bookmarks list */}
          {bookmarkedProducts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#4A3728] uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-500" />
                सुरक्षित उत्पाद जानकारी (Saved Products)
              </h3>
              <div 
                ref={containerRef}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex flex-col gap-3"
              >
                {bookmarkedProducts.map((prod, i) => (
                  <div 
                    key={prod.productName}
                    onClick={() => setResult(prod)}
                    className={`bg-white border p-4 rounded-2xl cursor-pointer shadow-2xs transition-all flex items-center justify-between group select-none ${draggedIndex === i ? 'opacity-40 scale-[0.98] border-amber-300 bg-amber-50/20' : 'border-gray-100 hover:border-[#2D5A27] hover:shadow-xs'}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Drag Handle */}
                      <div 
                        onTouchStart={() => handleTouchStart(i)}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={() => handleMouseDown(i)}
                        className="p-2 -ml-2 text-gray-300 hover:text-[#2D5A27] cursor-grab active:cursor-grabbing shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4.5 h-4.5" />
                      </div>

                      <div>
                        <span className="text-[9px] bg-[#2D5A27]/10 text-[#2D5A27] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                          {prod.category}
                        </span>
                        <h4 className="font-black text-gray-800 mt-1 group-hover:text-[#2D5A27] transition-all">{prod.productName}</h4>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{prod.technicalName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductToDelete(prod);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="p-2 text-gray-300 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
                        title="हटाएं (Delete)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#2D5A27] transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blank Info card */}
          {!result && (
            <div className="bg-gradient-to-br from-[#2D5A27]/5 to-[#EAB308]/5 rounded-3xl p-6 text-center space-y-4 border border-[#2D5A27]/5">
              <Leaf className="w-16 h-16 text-[#2D5A27]/25 mx-auto animate-bounce" />
              <div className="max-w-xs mx-auto">
                <h3 className="font-black text-gray-700">भारत का सबसे एडवांस कृषि इनपुट ज्ञान सिस्टम</h3>
                <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                  कोराजन, यूरिया, एनपीके, नीम तेल, बीज वैरायटी या किसी भी टेक्निकल नाम को सर्च करें और उसका सही प्रमाण, डोज़ और उपयोग तुरंत जानें।
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Sheet for Camera / Gallery */}
      <AnimatePresence>
        {isBottomSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBottomSheetOpen(false)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-2xl z-50 p-6 pb-10 border-t border-gray-100 flex flex-col space-y-4 max-w-lg mx-auto pointer-events-auto"
            >
              {/* Drag indicator bar */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />

              <div className="text-center pb-2">
                <h4 className="text-lg font-black text-[#4A3728]">AI उत्पाद फोटो खोज (Image Search)</h4>
                <p className="text-xs text-gray-500 font-bold mt-1">दवाई या खाद की बोतल/थैली की साफ़ फोटो चुनें</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* Take Photo */}
                <button
                  onClick={() => {
                    setIsBottomSheetOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  className="flex flex-col items-center justify-center p-5 bg-amber-50 hover:bg-amber-100/70 border-2 border-amber-100 rounded-2xl gap-3 transition-all active:scale-95 group animate-none"
                >
                  <div className="w-14 h-14 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Camera className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-black text-amber-900">कैमरे से फोटो लें</span>
                  <span className="text-[10px] text-amber-700/80 font-bold">Take Photo</span>
                </button>

                {/* Gallery */}
                <button
                  onClick={() => {
                    setIsBottomSheetOpen(false);
                    galleryInputRef.current?.click();
                  }}
                  className="flex flex-col items-center justify-center p-5 bg-green-50 hover:bg-green-100/70 border-2 border-green-100 rounded-2xl gap-3 transition-all active:scale-95 group animate-none"
                >
                  <div className="w-14 h-14 bg-[#2D5A27] text-white rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-black text-green-900">गैलरी से चुनें</span>
                  <span className="text-[10px] text-green-700/80 font-bold">Choose from Gallery</span>
                </button>
              </div>

              <button
                onClick={() => setIsBottomSheetOpen(false)}
                className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black transition-all active:scale-95 mt-4"
              >
                रद्द करें (Cancel)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Off-screen PDF Export Template */}
      {result && (
        <div 
          id="pdf-export-template" 
          style={{ position: 'fixed', left: '-9999px', top: '0px', width: '794px', background: 'white', display: 'block', pointerEvents: 'none' }}
          className="bg-white p-10 text-gray-800"
        >
          {/* Header */}
          <div className="border-b-4 border-[#2D5A27] pb-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/icon-192.png" 
                alt="App Logo" 
                className="w-16 h-16 rounded-full border-2 border-[#2D5A27]"
                crossOrigin="anonymous"
              />
              <div>
                <h1 className="text-2xl font-extrabold text-[#2D5A27] tracking-tight">फल्सावदिया कृषि बाज़ार</h1>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">किसान का भरोसा, हमारी पहचान</p>
                <p className="text-[10px] text-[#2D5A27] font-extrabold bg-[#2D5A27]/5 px-2.5 py-0.5 rounded-full inline-block mt-1">
                  AI उत्पाद ज्ञान साथी - विस्तृत तकनीकी रिपोर्ट
                </p>
              </div>
            </div>
            <div className="text-right text-xs font-bold text-gray-500">
              <p>दिनांक: {new Date().toLocaleDateString('hi-IN')}</p>
              <p>समय: {new Date().toLocaleTimeString('hi-IN')}</p>
              <p className="text-[10px] text-gray-400 mt-1">शामगढ़, मध्य प्रदेश</p>
            </div>
          </div>

          {/* Product Identification Summary */}
          <div className="bg-[#2D5A27]/5 p-5 rounded-2xl border border-gray-100 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-[#2D5A27] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  {result.category}
                </span>
                <h2 className="text-2xl font-black text-[#2D5A27] mt-2 leading-tight">{result.productName}</h2>
                <p className="text-sm font-bold text-gray-600 mt-1">निर्माता: <span className="text-gray-900">{result.companyName}</span></p>
              </div>
              {result.fracIracHracGroup && (
                <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-center">
                  <span className="text-[9px] text-amber-700 font-extrabold uppercase tracking-widest block">Group Code</span>
                  <span className="font-extrabold text-[#4A3728] text-xs">{result.fracIracHracGroup}</span>
                </div>
              )}
            </div>
          </div>

          {/* Technical Specifications Grid */}
          <div className="mb-6">
            <h3 className="text-sm font-extrabold text-[#4A3728] uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2D5A27]" />
              उत्पाद तकनीकी विवरण (Technical Details)
            </h3>
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 text-xs font-bold text-gray-400 w-1/3">उत्पाद का नाम (Product Name)</td>
                  <td className="py-2.5 text-xs font-black text-gray-800">{result.productName}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 text-xs font-bold text-gray-400">निर्माता कंपनी (Company)</td>
                  <td className="py-2.5 text-xs font-black text-gray-800">{result.companyName}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 text-xs font-bold text-gray-400">तकनीकी नाम (Technical Name)</td>
                  <td className="py-2.5 text-xs font-black text-gray-800">{result.technicalName}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 text-xs font-bold text-gray-400">उत्पाद श्रेणी (Category)</td>
                  <td className="py-2.5 text-xs font-black text-gray-800">{result.category}</td>
                </tr>
                {result.formulation && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 text-xs font-bold text-gray-400">फॉर्मूलेशन (Formulation)</td>
                    <td className="py-2.5 text-xs font-black text-gray-800">{result.formulation}</td>
                  </tr>
                )}
                {result.activeIngredient && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 text-xs font-bold text-gray-400">सक्रिय तत्व (Active Ingredient)</td>
                    <td className="py-2.5 text-xs font-black text-gray-800">{result.activeIngredient}</td>
                  </tr>
                )}
                {result.modeOfAction && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 text-xs font-bold text-gray-400">कार्य करने का तरीका (Mode of Action)</td>
                    <td className="py-2.5 text-xs font-bold text-gray-800 leading-relaxed">{result.modeOfAction}</td>
                  </tr>
                )}
                {result.fracIracHracGroup && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 text-xs font-bold text-gray-400">IRAC / FRAC / HRAC Group</td>
                    <td className="py-2.5 text-xs font-black text-gray-800">{result.fracIracHracGroup}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Target Crops & Pests */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">लक्षित फसलें (Target Crops)</h4>
              <p className="text-xs font-bold text-gray-800 leading-relaxed">{result.targetCrops || "सभी प्रमुख फसलें"}</p>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">लक्षित कीट / बीमारी / खरपतवार</h4>
              <p className="text-xs font-bold text-gray-800 leading-relaxed">{result.targetPests || "उत्पाद अनुसार"}</p>
            </div>
          </div>

          {/* Description & Benefits */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">मुख्य उपयोग एवं विवरण (Description)</h4>
              <p className="text-xs font-bold text-gray-700 leading-relaxed whitespace-pre-line">{result.benefits || result.usage || "विवरण उपलब्ध नहीं है"}</p>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">उत्पाद की विशेषताएं (Features)</h4>
              <p className="text-xs font-bold text-gray-700 leading-relaxed whitespace-pre-line">{result.features || "विशेषताएं उपलब्ध नहीं हैं"}</p>
            </div>
          </div>

          {/* Dosage & Usage (BIG SECTION) */}
          <div className="mb-6">
            <h3 className="text-sm font-extrabold text-[#4A3728] uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              दवा की मात्रा और उपयोग विधि (Dosage & Usage) - मुख्य सेक्शन
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <span className="text-[9px] text-gray-400 font-bold uppercase block">प्रति 15 लीटर पंप</span>
                <span className="font-extrabold text-sm text-[#2D5A27] mt-1 block">
                  {result.dosageLiquid.per15L || result.dosagePowder.per15L || "उत्पाद अनुसार"}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <span className="text-[9px] text-gray-400 font-bold uppercase block">प्रति 16 लीटर पंप</span>
                <span className="font-extrabold text-sm text-[#2D5A27] mt-1 block">
                  {result.dosageLiquid.per16L || result.dosagePowder.per16L || "उत्पाद अनुसार"}
                </span>
              </div>
              <div className="bg-[#2D5A27]/5 p-3 rounded-xl border border-[#2D5A27]/20 text-center">
                <span className="text-[9px] text-[#2D5A27] font-extrabold uppercase block">प्रति 1 बीघा (Bigha)</span>
                <span className="font-extrabold text-sm text-[#2D5A27] mt-1 block">
                  {result.dosageLiquid.perBigha || result.dosagePowder.perBigha || result.dosageFertilizer.perBigha || "उत्पाद अनुसार"}
                </span>
              </div>
            </div>

            {/* Complete Technical Dosages table */}
            <table className="w-full border border-gray-200 rounded-xl overflow-hidden text-xs text-left mb-4">
              <thead>
                <tr className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                  <th className="p-2.5">पानी / पैमाना</th>
                  <th className="p-2.5">तरल मात्रा (Liquid Dose)</th>
                  <th className="p-2.5">पाउडर मात्रा (Powder Dose)</th>
                  <th className="p-2.5">खाद मात्रा (Fertilizer)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-150">
                  <td className="p-2.5 font-bold text-gray-700">प्रति 1 लीटर पानी</td>
                  <td className="p-2.5 text-gray-600">{result.dosageLiquid.perLiter || "N/A"}</td>
                  <td className="p-2.5 text-gray-600">{result.dosagePowder.perLiter || "N/A"}</td>
                  <td className="p-2.5 text-gray-600">{result.dosageFertilizer.perPlant ? `${result.dosageFertilizer.perPlant} (प्रति पौधा)` : "N/A"}</td>
                </tr>
                <tr className="border-b border-gray-150">
                  <td className="p-2.5 font-bold text-gray-700">प्रति 15L टंकी (Pump)</td>
                  <td className="p-2.5 text-gray-600 font-bold">{result.dosageLiquid.per15L || "N/A"}</td>
                  <td className="p-2.5 text-gray-600 font-bold">{result.dosagePowder.per15L || "N/A"}</td>
                  <td className="p-2.5 text-gray-600">{result.dosageFertilizer.perPlant ? `${result.dosageFertilizer.perPlant} (प्रति पौधा)` : "N/A"}</td>
                </tr>
                <tr className="border-b border-gray-150">
                  <td className="p-2.5 font-bold text-gray-700">प्रति 200L ड्रम</td>
                  <td className="p-2.5 text-gray-600">{result.dosageLiquid.per200L || "N/A"}</td>
                  <td className="p-2.5 text-gray-600">{result.dosagePowder.per200L || "N/A"}</td>
                  <td className="p-2.5 text-gray-600">{result.dosageFertilizer.perIrrigation ? `${result.dosageFertilizer.perIrrigation} (सिंचाई)` : "N/A"}</td>
                </tr>
                <tr className="border-b border-gray-150">
                  <td className="p-2.5 font-bold text-gray-700">प्रति 500L टैंकर</td>
                  <td className="p-2.5 text-gray-600">{result.dosageLiquid.per500L || "N/A"}</td>
                  <td className="p-2.5 text-gray-600">{result.dosagePowder.per500L || "N/A"}</td>
                  <td className="p-2.5 text-gray-600">{result.dosageFertilizer.perSpray ? `${result.dosageFertilizer.perSpray} (स्प्रे)` : "N/A"}</td>
                </tr>
                <tr className="bg-amber-50/40">
                  <td className="p-2.5 font-black text-[#4A3728]">प्रति 1 बीघा (Bigha)</td>
                  <td className="p-2.5 font-black text-amber-900">{result.dosageLiquid.perBigha || "N/A"}</td>
                  <td className="p-2.5 font-black text-amber-900">{result.dosagePowder.perBigha || "N/A"}</td>
                  <td className="p-2.5 font-black text-amber-900">{result.dosageFertilizer.perBigha || "N/A"}</td>
                </tr>
              </tbody>
            </table>

            {/* Crop Specific Dosage */}
            {result.cropSpecificDosage && result.cropSpecificDosage.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-xl p-4 bg-gray-50/30">
                <h4 className="text-xs font-black text-[#2D5A27] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27]" />
                  विभिन्न फसलों के अनुसार विस्तृत मात्रा (Crop Wise Dosages)
                </h4>
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-bold">
                      <th className="py-2">फसल का नाम</th>
                      <th className="py-2">अनुशंसित डोज़</th>
                      <th className="py-2">विधि</th>
                      <th className="py-2">छिड़काव का समय</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.cropSpecificDosage.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 font-black text-gray-800">{item.cropName}</td>
                        <td className="py-2 font-black text-[#2D5A27]">{item.dosage}</td>
                        <td className="py-2 text-gray-600">{item.usage}</td>
                        <td className="py-2 text-gray-500">{item.sprayTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Management & Safety */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border border-green-150 bg-green-50/20 p-4 rounded-xl">
              <h4 className="text-xs font-extrabold text-green-700 uppercase tracking-wider mb-1.5">अनुकूलता (Compatibility)</h4>
              <p className="text-xs font-bold text-green-800 leading-relaxed">
                {result.compatibleProducts || "सभी सामान्य कीटनाशकों और कवकनाशकों के साथ सुरक्षित रूप से मिला सकते हैं।"}
              </p>
            </div>
            <div className="border border-rose-150 bg-rose-50/20 p-4 rounded-xl">
              <h4 className="text-xs font-extrabold text-rose-700 uppercase tracking-wider mb-1.5">सुरक्षा निर्देश (Safety Instructions)</h4>
              <p className="text-xs font-bold text-rose-800 leading-relaxed">
                {result.safetyInstructions || "सावधानीपूर्वक छिड़काव करें। मास्क और दस्तानों का प्रयोग करें। बच्चों की पहुँच से दूर रखें।"}
              </p>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-4 gap-3 border-t border-gray-100 pt-5 mb-8">
            <div className="text-center">
              <span className="text-[9px] text-gray-400 font-extrabold uppercase block">छिड़काव का समय</span>
              <span className="text-xs font-bold text-gray-800 mt-1 block">{result.sprayTiming || "सुबह / शाम"}</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-gray-400 font-extrabold uppercase block">वर्षा सुरक्षा काल</span>
              <span className="text-xs font-bold text-gray-800 mt-1 block">{result.rainfastPeriod || "2 घंटे"}</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-gray-400 font-extrabold uppercase block">ज़हर का स्तर</span>
              <span className="text-xs font-bold text-gray-800 mt-1 block">{result.toxicity || "सामान्य"}</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-gray-400 font-extrabold uppercase block">सुरक्षित भण्डारण</span>
              <span className="text-xs font-bold text-gray-800 mt-1 block">{result.storage || "ठंडी/सूखी जगह"}</span>
            </div>
          </div>

          {/* Professional Footer */}
          <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-center text-gray-400 text-[10px] font-bold">
            <p>Generated by Falsawdiya Krishi Bazaar AI Product Knowledge</p>
            <p>विवरण दिनांक: {new Date().toLocaleDateString('hi-IN')}</p>
            <p>फल्सावदिया कृषि बाज़ार, शामगढ़, म.प्र.</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-white rounded-3xl p-6 shadow-2xl z-50 border border-gray-100 flex flex-col space-y-4 pointer-events-auto"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                  <Trash2 className="w-6 h-6 animate-none" />
                </div>
                <h4 className="text-lg font-black text-gray-800">उत्पाद की जानकारी हटाएं?</h4>
                <p className="text-xs text-gray-500 font-bold leading-relaxed">
                  क्या आप सचमुच <span className="text-rose-600">"{productToDelete?.productName}"</span> की जानकारी को सुरक्षित सूची से हटाना चाहते हैं?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  onClick={() => {
                    if (productToDelete) {
                      handleDeleteProduct(productToDelete.productName);
                    }
                    setIsDeleteConfirmOpen(false);
                    setProductToDelete(null);
                  }}
                  className="py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer"
                >
                  हटाएं (Delete)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
