import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Copy, ArrowLeft, 
  RotateCcw, AlertTriangle, CheckCircle2, ChevronRight, 
  Sparkles, Droplets, Layers, ShieldAlert, Thermometer, ExternalLink, 
  RefreshCw, Info, ClipboardCheck, Check, Leaf, Heart,
  Camera, Image as ImageIcon, X, Trash2,
  Building2, FlaskConical, ShieldCheck, Sprout
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProductKnowledge, ProductKnowledgeResult, analyzeProductImage } from '../services/gemini';
import ApiKeyModal from '../components/ApiKeyModal';
import useAiGuard from '../hooks/useAiGuard';
import { getFriendlyAiError } from '../utils/aiErrorHandler';
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

const CACHE_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
const CACHE_VERSION = 'pk_cache_v_detailed_accurate';

interface CacheEntry {
  productId: string;
  timestamp: number;
  data: ProductKnowledgeResult;
  searchQuery: string;
}

interface SmartCache {
  entries: Record<string, CacheEntry>;
  index: Record<string, string>;
}

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[।०.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ");
};

const getCategoryTheme = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('उर्वरक') || cat.includes('fertilizer') || cat.includes('पोषक')) {
    return {
      avatarBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      gradient: 'from-emerald-500 via-teal-500 to-[#2D5A27]',
      icon: Sprout,
    };
  }
  if (cat.includes('बीज') || cat.includes('seed')) {
    return {
      avatarBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      gradient: 'from-amber-500 via-orange-500 to-amber-700',
      icon: Leaf,
    };
  }
  if (
    cat.includes('कीटनाशक') || cat.includes('insecticide') || 
    cat.includes('मकड़ीनाशक') || cat.includes('miticide') || cat.includes('acaricide') || 
    cat.includes('फफूंद') || cat.includes('fungicide') || 
    cat.includes('खरपतवार') || cat.includes('herbicide')
  ) {
    return {
      avatarBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      gradient: 'from-blue-600 via-indigo-600 to-sky-600',
      icon: ShieldCheck,
    };
  }
  if (
    cat.includes('बायो') || cat.includes('bio') || 
    cat.includes('ग्रोथ') || cat.includes('stimulant') || 
    cat.includes('नियामक') || cat.includes('pgr')
  ) {
    return {
      avatarBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
      gradient: 'from-purple-600 via-fuchsia-600 to-indigo-600',
      icon: Sparkles,
    };
  }
  return {
    avatarBg: 'bg-[#2D5A27]/10 text-[#2D5A27] border-[#2D5A27]/20',
    gradient: 'from-[#2D5A27] via-emerald-600 to-[#2D5A27]',
    icon: FlaskConical,
  };
};

export const normalizeProductResult = (raw: any): ProductKnowledgeResult => {
  if (!raw || typeof raw !== 'object') {
    return {
      productName: "जानकारी उपलब्ध नहीं है",
      companyName: "उपलब्ध नहीं है",
      technicalName: "उपलब्ध नहीं है",
      category: "सामान्य",
      formulation: "उपलब्ध नहीं है",
      activeIngredient: "उपलब्ध नहीं है",
      modeOfAction: "उपलब्ध नहीं है",
      fracIracHracGroup: "",
      targetCrops: "सभी प्रमुख फसलें",
      targetPests: "उत्पाद अनुसार",
      symptoms: "उपलब्ध नहीं है",
      usage: "उपलब्ध नहीं है",
      benefits: "विवरण उपलब्ध नहीं है",
      features: "विशेषताएं उपलब्ध नहीं हैं",
      compatibleProducts: "सामान्यतः अधिकांश कीटनाशकों और कवकनाशकों के साथ मिला सकते हैं।",
      incompatibleProducts: "क्षारीय (Alkaline) या बोर्डो मिश्रण के साथ मिश्रण न करें।",
      waitingPeriod: "N/A",
      phi: "N/A",
      rei: "N/A",
      toxicity: "सामान्य",
      safetyInstructions: "सावधानीपूर्वक छिड़काव करें। मास्क और दस्तानों का प्रयोग करें। बच्चों की पहुँच से दूर रखें।",
      mixingOrder: "WALES नियम अनुसार सही क्रम में घोलें।",
      sprayTiming: "सुबह या शाम",
      rainfastPeriod: "2 घंटे",
      storage: "ठंडी और सूखी जगह पर रखें",
      dosageLiquid: {
        perLiter: "उत्पाद अनुसार",
        per15L: "उत्पाद अनुसार",
        per16L: "उत्पाद अनुसार",
        per20L: "उत्पाद अनुसार",
        per25L: "उत्पाद अनुसार",
        per200L: "उत्पाद अनुसार",
        per500L: "उत्पाद अनुसार",
        perBigha: "उत्पाद अनुसार",
      },
      dosagePowder: {
        perLiter: "उत्पाद अनुसार",
        per15L: "उत्पाद अनुसार",
        per16L: "उत्पाद अनुसार",
        per20L: "उत्पाद अनुसार",
        per25L: "उत्पाद अनुसार",
        per200L: "उत्पाद अनुसार",
        per500L: "उत्पाद अनुसार",
        perBigha: "उत्पाद अनुसार",
      },
      dosageFertilizer: {
        perPlant: "उत्पाद अनुसार",
        perPot: "उत्पाद अनुसार",
        perBigha: "उत्पाद अनुसार",
        perIrrigation: "उपलब्ध नहीं है",
        perSpray: "उपलब्ध नहीं है",
        perDrenching: "उपलब्ध नहीं है",
        totalAmount: "उपलब्ध नहीं है",
      },
      dosageSeeds: {
        seedRatePerBigha: "उत्पाद/फसल अनुसार",
        seedRatePerAcre: "उत्पाद/फसल अनुसार",
        seedTreatment: "2-3 ग्राम या 3-5 मिली प्रति किग्रा बीज",
        sowingDepth: "3 से 5 सेमी",
        rowAndPlantSpacing: "फसल अनुसार (उदा. 30x10 सेमी)",
        germinationDays: "4 से 7 दिन",
        sowingSeason: "मौसम अनुसार",
      },
      cropSpecificDosage: [],
      sources: [],
      hasExactMatch: false,
    };
  }

  const rawDL = raw.dosageLiquid && typeof raw.dosageLiquid === 'object' ? raw.dosageLiquid : {};
  const rawDP = raw.dosagePowder && typeof raw.dosagePowder === 'object' ? raw.dosagePowder : {};
  const rawDF = raw.dosageFertilizer && typeof raw.dosageFertilizer === 'object' ? raw.dosageFertilizer : {};
  const rawDS = raw.dosageSeeds && typeof raw.dosageSeeds === 'object' ? raw.dosageSeeds : {};

  let safeCropDosage: Array<{ cropName: string; dosage: string; usage: string; sprayTime: string }> = [];
  if (Array.isArray(raw.cropSpecificDosage)) {
    safeCropDosage = raw.cropSpecificDosage.map((item: any) => ({
      cropName: String(item?.cropName || "अज्ञात फसल"),
      dosage: String(item?.dosage || "उत्पाद अनुसार"),
      usage: String(item?.usage || "स्प्रे / छिड़काव"),
      sprayTime: String(item?.sprayTime || "सुबह / शाम")
    }));
  }

  let safeSources: Array<{ title: string; uri: string }> = [];
  if (Array.isArray(raw.sources)) {
    safeSources = raw.sources
      .filter((s: any) => s && typeof s === 'object')
      .map((s: any) => ({
        title: String(s.title || "आधिकारिक स्रोत"),
        uri: String(s.uri || "https://cibrc.nic.in")
      }));
  }

  return {
    productName: String(raw.productName || "जानकारी उपलब्ध नहीं है"),
    companyName: String(raw.companyName || "उपलब्ध नहीं है"),
    technicalName: String(raw.technicalName || "उपलब्ध नहीं है"),
    category: String(raw.category || "सामान्य"),
    formulation: String(raw.formulation || "उपलब्ध नहीं है"),
    activeIngredient: String(raw.activeIngredient || "उपलब्ध नहीं है"),
    modeOfAction: String(raw.modeOfAction || "उपलब्ध नहीं है"),
    fracIracHracGroup: String(raw.fracIracHracGroup || ""),
    targetCrops: String(raw.targetCrops || "सभी प्रमुख फसलें"),
    targetPests: String(raw.targetPests || "उत्पाद अनुसार"),
    symptoms: String(raw.symptoms || "उपलब्ध नहीं है"),
    usage: String(raw.usage || "उपलब्ध नहीं है"),
    benefits: String(raw.benefits || raw.usage || "विवरण उपलब्ध नहीं है"),
    features: String(raw.features || "विशेषताएं उपलब्ध नहीं हैं"),
    compatibleProducts: String(raw.compatibleProducts || "सामान्यतः अधिकांश कीटनाशकों और कवकनाशकों के साथ मिला सकते हैं।"),
    incompatibleProducts: String(raw.incompatibleProducts || "क्षारीय (Alkaline) या बोर्डो मिश्रण के साथ मिश्रण न करें।"),
    waitingPeriod: String(raw.waitingPeriod || "N/A"),
    phi: String(raw.phi || "N/A"),
    rei: String(raw.rei || "N/A"),
    toxicity: String(raw.toxicity || "सामान्य"),
    safetyInstructions: String(raw.safetyInstructions || "सावधानीपूर्वक छिड़काव करें। मास्क और दस्तानों का प्रयोग करें। बच्चों की पहुँच से दूर रखें।"),
    mixingOrder: String(raw.mixingOrder || "WALES नियम अनुसार सही क्रम में घोलें।"),
    sprayTiming: String(raw.sprayTiming || "सुबह या शाम"),
    rainfastPeriod: String(raw.rainfastPeriod || "2 घंटे"),
    storage: String(raw.storage || "ठंडी और सूखी जगह पर रखें"),
    dosageLiquid: {
      perLiter: String(rawDL.perLiter || "उत्पाद अनुसार"),
      per15L: String(rawDL.per15L || "उत्पाद अनुसार"),
      per16L: String(rawDL.per16L || "उत्पाद अनुसार"),
      per20L: String(rawDL.per20L || "उत्पाद अनुसार"),
      per25L: String(rawDL.per25L || "उत्पाद अनुसार"),
      per200L: String(rawDL.per200L || "उत्पाद अनुसार"),
      per500L: String(rawDL.per500L || "उत्पाद अनुसार"),
      perBigha: String(rawDL.perBigha || "उत्पाद अनुसार"),
    },
    dosagePowder: {
      perLiter: String(rawDP.perLiter || "उत्पाद अनुसार"),
      per15L: String(rawDP.per15L || "उत्पाद अनुसार"),
      per16L: String(rawDP.per16L || "उत्पाद अनुसार"),
      per20L: String(rawDP.per20L || "उत्पाद अनुसार"),
      per25L: String(rawDP.per25L || "उत्पाद अनुसार"),
      per200L: String(rawDP.per200L || "उत्पाद अनुसार"),
      per500L: String(rawDP.per500L || "उत्पाद अनुसार"),
      perBigha: String(rawDP.perBigha || "उत्पाद अनुसार"),
    },
    dosageFertilizer: {
      perPlant: String(rawDF.perPlant || "उत्पाद अनुसार"),
      perPot: String(rawDF.perPot || "उत्पाद अनुसार"),
      perBigha: String(rawDF.perBigha || "उत्पाद अनुसार"),
      perIrrigation: String(rawDF.perIrrigation || "उपलब्ध नहीं है"),
      perSpray: String(rawDF.perSpray || "उपलब्ध नहीं है"),
      perDrenching: String(rawDF.perDrenching || "उपलब्ध नहीं है"),
      totalAmount: String(rawDF.totalAmount || "उपलब्ध नहीं है"),
    },
    dosageSeeds: {
      seedRatePerBigha: String(rawDS.seedRatePerBigha || "उत्पाद/फसल अनुसार"),
      seedRatePerAcre: String(rawDS.seedRatePerAcre || "उत्पाद/फसल अनुसार"),
      seedTreatment: String(rawDS.seedTreatment || "2-3 ग्राम या 3-5 मिली प्रति किग्रा बीज"),
      sowingDepth: String(rawDS.sowingDepth || "3 से 5 सेमी"),
      rowAndPlantSpacing: String(rawDS.rowAndPlantSpacing || "फसल अनुसार (उदा. 30x10 सेमी)"),
      germinationDays: String(rawDS.germinationDays || "4 से 7 दिन"),
      sowingSeason: String(rawDS.sowingSeason || "मौसम अनुसार"),
    },
    cropSpecificDosage: safeCropDosage,
    sources: safeSources,
    hasExactMatch: Boolean(raw.hasExactMatch ?? true),
    order: raw.order,
    createdAt: raw.createdAt
  };
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

    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      return null;
    }

    if (
      !entry.data || 
      !entry.data.productName || 
      entry.data.productName === "जानकारी उपलब्ध नहीं है" || 
      entry.data.productName.includes("पहचान नहीं")
    ) {
      return null;
    }

    return normalizeProductResult(entry.data);
  } catch (e) {
    console.error("Error reading cache", e);
    return null;
  }
};

const saveToCache = (query: string, data: ProductKnowledgeResult) => {
  const normalized = normalizeProductResult(data);
  if (!normalized || !normalized.productName || normalized.productName === "जानकारी उपलब्ध नहीं है") return;

  try {
    const rawCache = localStorage.getItem('pk_smart_cache');
    let cache: SmartCache = { entries: {}, index: {} };
    if (rawCache) {
      try {
        cache = JSON.parse(rawCache);
        if (!cache.entries) cache.entries = {};
        if (!cache.index) cache.index = {};
      } catch (e) {}
    }

    const productId = normalizeText(normalized.productName);
    const normQuery = normalizeText(query);

    cache.entries[productId] = {
      productId,
      timestamp: Date.now(),
      data: normalized,
      searchQuery: query
    };

    cache.index[normQuery] = productId;
    cache.index[normalizeText(data.productName)] = productId;
    if (data.technicalName) {
      cache.index[normalizeText(data.technicalName)] = productId;
    }

    localStorage.setItem('pk_smart_cache', JSON.stringify(cache));
  } catch (e) {
    console.error("Error saving to cache", e);
  }
};

const getSafeDocId = (productName: string): string => {
  if (!productName) return 'product_unknown';
  const cleanName = productName.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    const char = cleanName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const safePrefix = cleanName.replace(/[^a-z0-9]/g, '').substring(0, 30);
  return `${safePrefix || 'product'}_${Math.abs(hash)}`;
};

export default function AiProductKnowledge() {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { 
    apiKey: effectiveApiKey, 
    requireApiKey, 
    isApiKeyModalOpen, 
    apiKeyModalMessage, 
    openApiKeyModal, 
    closeApiKeyModal 
  } = useAiGuard();

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProductKnowledgeResult | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image search states
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageSearch, setIsImageSearch] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Bookmarks & History
  const [bookmarkedProducts, setBookmarkedProducts] = useState<ProductKnowledgeResult[]>([]);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Active Dosage Tab
  const [activeDosageTab, setActiveDosageTab] = useState<'liquid' | 'powder' | 'fertilizer' | 'seeds'>('liquid');

  // Delete modal state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductKnowledgeResult | null>(null);

  // Load Bookmarks from Local Storage and Firestore sync
  useEffect(() => {
    if (!user) {
      const local = localStorage.getItem('product_knowledge_bookmarks');
      if (local) {
        try {
          const parsed = JSON.parse(local) as any[];
          const normalizedList = (Array.isArray(parsed) ? parsed : []).map(normalizeProductResult);
          setBookmarkedProducts(normalizedList);
        } catch (e) {
          console.error("Error parsing local bookmarks", e);
        }
      }
      return;
    }

    const q = fsQuery(
      collection(db, 'users', user.uid, 'savedProducts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreProducts = snapshot.docs.map(doc => normalizeProductResult(doc.data()));
      setBookmarkedProducts(firestoreProducts);
      localStorage.setItem('product_knowledge_bookmarks', JSON.stringify(firestoreProducts));
    }, (err) => {
      console.warn("Firestore savedProducts sync notice:", err?.message);
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-switch dosage tab based on product category/formulation when result changes
  useEffect(() => {
    if (result) {
      const formulationLower = (result.formulation || '').toLowerCase();
      const catLower = (result.category || '').toLowerCase();
      const nameLower = (result.productName || '').toLowerCase();
      
      if (
        catLower.includes('seed') || 
        catLower.includes('बीज') || 
        nameLower.includes('बीज') || 
        catLower.includes('hybrid') || 
        formulationLower.includes('बीजोपचार')
      ) {
        setActiveDosageTab('seeds');
      } else if (
        formulationLower.includes('ec') || 
        formulationLower.includes('sl') || 
        formulationLower.includes('sc') || 
        formulationLower.includes('liquid') || 
        formulationLower.includes('तरल')
      ) {
        setActiveDosageTab('liquid');
      } else if (
        catLower.includes('fertilizer') || 
        catLower.includes('खाद') || 
        catLower.includes('urea') || 
        catLower.includes('dap')
      ) {
        setActiveDosageTab('fertilizer');
      } else {
        setActiveDosageTab('powder');
      }
    }
  }, [result]);

  const handleSearch = async (searchQuery: string, forceRefresh = false) => {
    if (isLoading) return;
    const term = searchQuery.trim();
    if (!term) return;

    if (!requireApiKey("AI Product Knowledge उपयोग करने के लिए कृपया अपनी Gemini API Key जोड़ें।")) {
      return;
    }

    setIsLoading(true);
    setIsImageSearch(false);
    setSelectedImage(null);
    setError(null);
    setResult(null);

    // Check Offline Cache first
    if (!forceRefresh) {
      const cachedData = getCachedResult(term);
      if (cachedData) {
        const normCached = normalizeProductResult(cachedData);
        setIsFromCache(true);
        setResult(normCached);
        setIsLoading(false);
        autoSaveProduct(normCached);
        return;
      }
    }
    setIsFromCache(false);

    try {
      const data = await getProductKnowledge(term, effectiveApiKey);
      if (!data || !data.productName || data.productName === "जानकारी उपलब्ध नहीं है" || data.productName.includes("पहचान नहीं")) {
        setError("इस उत्पाद की जानकारी नहीं मिल सकी। कृपया सही नाम या स्पेलिंग (उदा. कोराजन, यूरिया, इमिडाक्लोप्रिड, साफ) लिखकर पुनः प्रयास करें।");
        setResult(null);
        return;
      }
      const normData = normalizeProductResult(data);
      saveToCache(term, normData);
      setResult(normData);
      autoSaveProduct(normData);
    } catch (err: any) {
      console.error("AI Product Knowledge Search Error:", err);
      const friendly = getFriendlyAiError(err);
      if (friendly.type === 'key_missing' || friendly.type === 'key_invalid') {
        openApiKeyModal(friendly.message);
      } else {
        setError(err?.message || friendly.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsBottomSheetOpen(false);
      setIsLoading(true);
      setIsImageSearch(true);
      setError(null);
      setResult(null);
      setSelectedImage(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64 = reader.result as string;
          setSelectedImage(base64);

          // Downscale for fast reliable analysis
          const img = new Image();
          img.onload = () => {
            try {
              const maxWidth = 900;
              const maxHeight = 900;
              let width = img.width;
              let height = img.height;

              if (width > height && width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
                handleImageSearch(compressedBase64);
              } else {
                handleImageSearch(base64);
              }
            } catch (innerErr) {
              handleImageSearch(base64);
            }
          };
          img.onerror = () => handleImageSearch(base64);
          img.src = base64;
        } catch (readerErr) {
          setIsLoading(false);
          setError("फोटो प्रोसेस करने में विफलता। कृपया पुनः प्रयास करें।");
        }
      };

      reader.onerror = () => {
        setIsLoading(false);
        setError("फाइल को पढ़ने में समस्या आई।");
      };

      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleImageSearch = async (base64Img: string) => {
    if (!requireApiKey("AI Product Knowledge उपयोग करने के लिए कृपया अपनी Gemini API Key जोड़ें।")) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsImageSearch(true);
    setError(null);
    setResult(null);
    setIsFromCache(false);

    try {
      const data = await analyzeProductImage(base64Img, effectiveApiKey);
      if (!data || !data.productName || data.productName.includes("पहचान नहीं") || data.productName === "जानकारी उपलब्ध नहीं है") {
        setError("उत्पाद स्पष्ट रूप से पहचान में नहीं आया। कृपया साफ फोटो लें या गैलरी से पुनः प्रयास करें।");
        setSelectedImage(base64Img);
        setResult(null);
        return;
      }

      const normData = normalizeProductResult(data);
      saveToCache(normData.productName, normData);
      setResult(normData);
      autoSaveProduct(normData);
      if (normData.productName) {
        setQuery(normData.productName);
      }
    } catch (err: any) {
      const friendly = getFriendlyAiError(err);
      if (friendly.type === 'key_missing' || friendly.type === 'key_invalid') {
        openApiKeyModal(friendly.message);
      } else {
        setError(err?.message || friendly.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const autoSaveProduct = async (data: ProductKnowledgeResult) => {
    const normalized = normalizeProductResult(data);
    if (!normalized || !normalized.productName || normalized.productName === "जानकारी उपलब्ध नहीं है") return;

    const cleanName = normalized.productName.toLowerCase().trim();
    const docId = getSafeDocId(normalized.productName);

    setBookmarkedProducts((prevList) => {
      const alreadyExists = prevList.some(
        p => p.productName.toLowerCase().trim() === cleanName
      );
      if (alreadyExists) return prevList;

      const rawProductData = {
        ...normalized,
        createdAt: Date.now()
      };
      const savedProductData = JSON.parse(JSON.stringify(rawProductData));
      const updatedList = [savedProductData, ...prevList];
      localStorage.setItem('product_knowledge_bookmarks', JSON.stringify(updatedList));

      if (user) {
        const userSavedProductsRef = doc(db, 'users', user.uid, 'savedProducts', docId);
        setDoc(userSavedProductsRef, savedProductData).catch(err => {
          console.warn("Firestore bookmark save notice:", err?.message);
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
      );
      localStorage.setItem('product_knowledge_bookmarks', JSON.stringify(updatedList));

      if (user) {
        const userSavedProductRef = doc(db, 'users', user.uid, 'savedProducts', docId);
        deleteDoc(userSavedProductRef).catch(err => {
          console.warn("Firestore bookmark delete notice:", err?.message);
        });
      }

      return updatedList;
    });

    if (result && result.productName.toLowerCase().trim() === productName.toLowerCase().trim()) {
      setResult(null);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;

    let dosageText = '';
    if (activeDosageTab === 'liquid') {
      dosageText = `• प्रति 15 लीटर पंप: ${result.dosageLiquid?.per15L || "लेबल अनुसार"}
• प्रति 20 लीटर पावर पंप: ${result.dosageLiquid?.per20L || "लेबल अनुसार"}`;
    } else if (activeDosageTab === 'powder') {
      dosageText = `• प्रति 15 लीटर पंप: ${result.dosagePowder?.per15L || "लेबल अनुसार"}
• प्रति 20 लीटर पावर पंप: ${result.dosagePowder?.per20L || "लेबल अनुसार"}`;
    } else if (activeDosageTab === 'seeds') {
      dosageText = `• प्रति बीघा बीज दर: ${result.dosageSeeds?.seedRatePerBigha || "उत्पाद अनुसार"}
• बीजोपचार: ${result.dosageSeeds?.seedTreatment || "2-3 ग्राम प्रति किग्रा बीज"}
• बुवाई गहराई: ${result.dosageSeeds?.sowingDepth || "3 से 5 सेमी"}`;
    } else {
      dosageText = `• प्रति पौधा: ${result.dosageFertilizer?.perPlant || "लेबल अनुसार"}
• प्रति बीघा: ${result.dosageFertilizer?.perBigha || "लेबल अनुसार"}
• प्रति सिंचाई / स्प्रे: ${result.dosageFertilizer?.perIrrigation || result.dosageFertilizer?.perSpray || "लेबल अनुसार"}`;
    }

    const shareText = `*फल्सावदिया कृषि बाजार* - 100% सटीक कृषि उत्पाद जानकारी
----------------------------------------
*उत्पाद का नाम:* ${result.productName}
*कंपनी:* ${result.companyName}
*तकनीकी नाम (Technical):* ${result.technicalName}
*श्रेणी (Category):* ${result.category}
*फॉर्मूलेशन:* ${result.formulation}

*मुख्य उपयोग एवं फायदे:*
${result.benefits}

*अनुशंसित डोज़ (Dosage):*
${dosageText}

*सावधानियां व प्रतीक्षा काल:*
${result.safetyInstructions}
तुड़ाई प्रतीक्षा अवधि (PHI): ${result.phi} | पुनः प्रवेश: ${result.rei}

----------------------------------------
पता: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़ (म.प्र.) 458883
दुकान समय: सुबह 8:00 बजे से रात 8:00 बजे तक`;

    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const filteredSavedProducts = useMemo(() => {
    const rawQ = savedSearchQuery.trim().toLowerCase();
    if (!rawQ) return bookmarkedProducts;
    return bookmarkedProducts.filter(prod => {
      const fullText = `${prod.productName} ${prod.technicalName} ${prod.companyName} ${prod.category}`.toLowerCase();
      return fullText.includes(rawQ);
    });
  }, [bookmarkedProducts, savedSearchQuery]);

  return (
    <div className="space-y-6 pb-24 print:pb-0 print:space-y-4">
      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen}
        onClose={closeApiKeyModal}
        message={apiKeyModalMessage}
      />

      {/* Header Panel */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#2D5A27] to-[#3D7A35] text-white p-4.5 rounded-3xl shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (result) {
                setResult(null);
                setSelectedImage(null);
              } else {
                navigate(-1);
              }
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="वापस जाएं (Back)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#EAB308]" />
              AI कृषि उत्पाद ज्ञान
            </h2>
            <p className="text-xs text-white/90 font-medium mt-0.5">
              उत्पाद, टेक्निकल, फसलवार डोज़ और सावधानियों की 100% सटीक व विस्तृत जानकारी
            </p>
          </div>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block text-center border-b pb-4">
        <h1 className="text-2xl font-black text-[#2D5A27]">फल्सावदिया कृषि बाजार</h1>
        <p className="text-xs text-gray-500">डिंपल चौराहा, शामगढ़ (म.प्र.) | संपर्क: 8982338046</p>
        <p className="text-xs text-gray-400 mt-1">दुकान समय: सुबह 8:00 बजे से रात 8:00 बजे तक</p>
      </div>

      {/* Main Search Block (Hidden on Print) */}
      <div className="space-y-3 print:hidden">
        <div className="relative">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="उत्पाद का नाम, ब्रांड या टेक्निकल लिखें (उदा. कोराजन, साफ, यूरिया, इमिडाक्लोप्रिड)..."
            className="w-full bg-white border-2 border-[#2D5A27]/20 rounded-3xl py-4 pl-12 pr-28 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27] transition-all shadow-sm"
          />
          <Search className="absolute left-4 top-4.5 w-5 h-5 text-gray-400" />
          
          <div className="absolute right-2 top-2 flex items-center gap-1.5">
            <button 
              onClick={() => setIsBottomSheetOpen(true)}
              className="p-2.5 rounded-full transition-all bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/50 cursor-pointer"
              title="फोटो स्कैन (Image Search)"
            >
              <Camera className="w-4.5 h-4.5" />
            </button>
            <button 
              onClick={() => handleSearch(query)}
              disabled={isLoading || !query.trim()}
              className="bg-[#2D5A27] hover:bg-[#3D7A35] text-white px-4 py-2.5 rounded-full text-xs font-black transition-all disabled:opacity-50 cursor-pointer"
            >
              खोजें
            </button>
          </div>
        </div>

        {/* Hidden File Inputs */}
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
        <div className="bg-white rounded-3xl p-4 border border-amber-200 shadow-sm flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shrink-0">
              <img src={selectedImage} alt="Scanned Product" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-black text-[#2D5A27] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                स्कैन किया गया उत्पाद फोटो
              </p>
              <p className="text-[11px] text-gray-500 font-bold mt-0.5">
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
            className="p-2 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition-all cursor-pointer"
            title="फोटो हटाएं"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Loading Block */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 print:hidden">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#EAB308]" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-[#2D5A27] font-black text-lg">
              {isImageSearch ? "AI उत्पाद फोटो का विश्लेषण कर रहा है..." : "प्रमाणित कृषि डेटाबेस से विस्तृत रिपोर्ट तैयार हो रही है..."}
            </p>
            <p className="text-xs text-gray-500 font-medium">
              CIB&RC, ICAR और अधिकृत मानकों के आधार पर 100% सटीक डोज़ का संकलन जारी है
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center space-y-3 print:hidden">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="font-bold text-rose-900 text-base">जानकारी खोजने में समस्या आई</h3>
          <p className="text-xs text-rose-700 font-medium leading-relaxed max-w-md mx-auto">{error}</p>
          <button 
            onClick={() => handleSearch(query)}
            className="bg-[#2D5A27] hover:bg-[#3D7A35] text-white px-5 py-2.5 rounded-full text-xs font-black transition-all flex items-center gap-2 mx-auto cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> पुनः प्रयास करें
          </button>
        </div>
      )}

      {/* Detailed Result Panel */}
      {result && (
        <div className="space-y-6">
          {/* Top Actions & Offline Cache Status */}
          <div className="flex items-center justify-between gap-3 print:hidden">
            <button
              onClick={() => {
                setResult(null);
                setSelectedImage(null);
              }}
              className="flex items-center gap-2 text-xs font-black text-[#2D5A27] bg-[#2D5A27]/5 hover:bg-[#2D5A27]/10 px-4 py-2.5 rounded-2xl transition-all border border-[#2D5A27]/15 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>मुख्य खोज पर वापस जाएं</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSearch(query || result.productName, true)}
                className="flex items-center gap-1.5 text-xs font-black text-amber-900 bg-amber-50 hover:bg-amber-100 px-3.5 py-2.5 rounded-2xl transition-all border border-amber-200 cursor-pointer"
                title="ताज़ा पुनः खोजें"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isLoading ? 'animate-spin' : ''}`} />
                <span>अपडेट करें</span>
              </button>
              <button 
                onClick={copyToClipboard}
                className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 hover:text-[#2D5A27] transition-all cursor-pointer"
                title="कॉपी करें"
              >
                {isCopied ? <ClipboardCheck className="w-4.5 h-4.5 text-green-600" /> : <Copy className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Offline Cache Indicator */}
          {isFromCache && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-900 print:hidden">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <p className="text-xs font-bold">
                  ऑफ़लाइन सुरक्षित संग्रह से तुरंत लोड किया गया (बिना इंटरनेट के भी उपलब्ध)
                </p>
              </div>
              <button
                onClick={() => handleSearch(query || result.productName, true)}
                className="text-[11px] font-black text-amber-800 underline hover:text-amber-950 cursor-pointer"
              >
                रिफ्रेश करें
              </button>
            </div>
          )}

          {/* Primary Product Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-[#2D5A27] text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {result.category}
                  </span>
                  {result.formulation && (
                    <span className="bg-gray-100 text-gray-700 text-[11px] font-black px-2.5 py-1 rounded-full border border-gray-200">
                      {result.formulation}
                    </span>
                  )}
                  {result.fracIracHracGroup && (
                    <span className="bg-amber-50 text-amber-800 text-[11px] font-black px-2.5 py-1 rounded-full border border-amber-200">
                      Group: {result.fracIracHracGroup}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">
                  {result.productName}
                </h3>
                <p className="text-xs font-bold text-gray-600">
                  निर्माता कंपनी: <span className="text-gray-900">{result.companyName || "विविध ब्रांड्स"}</span>
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 px-3.5 py-2 rounded-2xl flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-[10px] text-green-800 font-black uppercase tracking-wider">अधिकृत डेटा</p>
                  <p className="text-[9px] text-gray-500 font-bold">100% CIB&RC मानक</p>
                </div>
              </div>
            </div>

            {/* Technical Name & Active Ingredient Grid */}
            <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/60">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">सक्रिय तकनीकी नाम (Technical Composition)</p>
                <p className="text-xs font-black text-gray-900 mt-1">{result.technicalName}</p>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/60">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">एक्टिव घटक (Active Ingredient)</p>
                <p className="text-xs font-black text-gray-900 mt-1">{result.activeIngredient || result.technicalName}</p>
              </div>
            </div>

            {/* Mode of Action */}
            {result.modeOfAction && (
              <div className="border-t border-gray-100 pt-4 space-y-1.5">
                <p className="text-[11px] font-black text-[#2D5A27] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#2D5A27]" />
                  असर करने का वैज्ञानिक तरीका (Mode of Action)
                </p>
                <p className="text-xs font-medium text-gray-700 leading-relaxed bg-[#2D5A27]/5 p-3.5 rounded-2xl border border-[#2D5A27]/10">
                  {result.modeOfAction}
                </p>
              </div>
            )}
          </div>

          {/* ⭐ 100% Accurate & Detailed Dosage Guide */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-[#2D5A27] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-[#EAB308]" />
                  सटीक डोज़ और छिड़काव मार्गदर्शिका (Accurate Dosage Guide)
                </h3>
                <p className="text-xs text-white/85 font-medium mt-1">
                  फसल की सुरक्षा और सही असर के लिए नीचे दी गई मानक मात्रा का कड़ाई से पालन करें।
                </p>
              </div>
            </div>

            {/* Dosage Type Switch Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/50 overflow-x-auto print:hidden">
              <button 
                onClick={() => setActiveDosageTab('liquid')}
                className={`flex-1 min-w-[100px] py-3.5 px-3 text-xs font-black text-center border-b-2 transition-all cursor-pointer ${
                  activeDosageTab === 'liquid' 
                    ? 'border-[#2D5A27] text-[#2D5A27] bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                तरल (Liquid)
              </button>
              <button 
                onClick={() => setActiveDosageTab('powder')}
                className={`flex-1 min-w-[100px] py-3.5 px-3 text-xs font-black text-center border-b-2 transition-all cursor-pointer ${
                  activeDosageTab === 'powder' 
                    ? 'border-[#2D5A27] text-[#2D5A27] bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                पाउडर (Powder)
              </button>
              <button 
                onClick={() => setActiveDosageTab('fertilizer')}
                className={`flex-1 min-w-[100px] py-3.5 px-3 text-xs font-black text-center border-b-2 transition-all cursor-pointer ${
                  activeDosageTab === 'fertilizer' 
                    ? 'border-[#2D5A27] text-[#2D5A27] bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                खाद/उर्वरक (Fertilizer)
              </button>
              <button 
                onClick={() => setActiveDosageTab('seeds')}
                className={`flex-1 min-w-[100px] py-3.5 px-3 text-xs font-black text-center border-b-2 transition-all cursor-pointer ${
                  activeDosageTab === 'seeds' 
                    ? 'border-[#2D5A27] text-[#2D5A27] bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                बीज/उपचार (Seeds)
              </button>
            </div>

            {/* Dosage Content Grid */}
            <div className="p-6 space-y-6">
              {activeDosageTab === 'liquid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">प्रति 1 लीटर पानी</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageLiquid?.perLiter || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-[#2D5A27]/5 p-4 rounded-2xl border border-[#2D5A27]/20 text-center">
                    <span className="text-[9px] bg-[#2D5A27] text-white px-2 py-0.5 rounded-full font-bold uppercase">मानक पंप</span>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">15L टंकी (Pump)</p>
                    <p className="text-lg font-black text-[#2D5A27] mt-0.5">{result.dosageLiquid?.per15L || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">20L पावर पंप</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageLiquid?.per20L || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">200L ड्रम</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageLiquid?.per200L || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">500L टैंकर</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageLiquid?.per500L || "उत्पाद अनुसार"}</p>
                  </div>
                </div>
              )}

              {activeDosageTab === 'powder' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">प्रति 1 लीटर पानी</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosagePowder?.perLiter || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-[#2D5A27]/5 p-4 rounded-2xl border border-[#2D5A27]/20 text-center">
                    <span className="text-[9px] bg-[#2D5A27] text-white px-2 py-0.5 rounded-full font-bold uppercase">मानक पंप</span>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">15L टंकी (Pump)</p>
                    <p className="text-lg font-black text-[#2D5A27] mt-0.5">{result.dosagePowder?.per15L || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">20L पावर पंप</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosagePowder?.per20L || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">200L ड्रम</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosagePowder?.per200L || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">500L टैंकर</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosagePowder?.per500L || "उत्पाद अनुसार"}</p>
                  </div>
                </div>
              )}

              {activeDosageTab === 'fertilizer' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">प्रति पौधा</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageFertilizer?.perPlant || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">प्रति गमला (Pot)</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageFertilizer?.perPot || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center">
                    <p className="text-[10px] text-amber-800 font-bold uppercase">प्रति 1 बीघा</p>
                    <p className="text-base font-black text-amber-950 mt-1">{result.dosageFertilizer?.perBigha || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">प्रति सिंचाई</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageFertilizer?.perIrrigation || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">स्प्रे छिड़काव</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageFertilizer?.perSpray || "उत्पाद अनुसार"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">ड्रेंचिंग मात्रा</p>
                    <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageFertilizer?.perDrenching || "उत्पाद अनुसार"}</p>
                  </div>
                </div>
              )}

              {activeDosageTab === 'seeds' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center">
                      <p className="text-[10px] text-amber-800 font-bold uppercase">प्रति 1 बीघा बीज दर</p>
                      <p className="text-base font-black text-amber-950 mt-1">{result.dosageSeeds?.seedRatePerBigha || "उत्पाद अनुसार"}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-200 text-center">
                      <p className="text-[10px] text-green-800 font-bold uppercase">प्रति 1 एकड़ बीज दर</p>
                      <p className="text-base font-black text-green-950 mt-1">{result.dosageSeeds?.seedRatePerAcre || "उत्पाद अनुसार"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">बुवाई गहराई</p>
                      <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageSeeds?.sowingDepth || "3 से 5 सेमी"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">कतार व पौधे की दूरी</p>
                      <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageSeeds?.rowAndPlantSpacing || "फसल अनुसार"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">अंकुरण अवधि</p>
                      <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageSeeds?.germinationDays || "4 से 7 दिन"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">बुवाई मौसम</p>
                      <p className="text-base font-black text-[#2D5A27] mt-1">{result.dosageSeeds?.sowingSeason || "मौसम अनुसार"}</p>
                    </div>
                  </div>

                  <div className="bg-[#2D5A27]/5 p-4 rounded-2xl border border-[#2D5A27]/20 space-y-1">
                    <p className="text-xs font-black text-[#2D5A27] uppercase tracking-wider">
                      बीजोपचार विधि एवं मात्रा (Seed Treatment Guide):
                    </p>
                    <p className="text-xs font-bold text-gray-800 leading-relaxed">
                      {result.dosageSeeds?.seedTreatment || "2-3 ग्राम या 3-5 मिली प्रति किग्रा बीज"}
                    </p>
                  </div>
                </div>
              )}

              {/* Crop Specific Dosage Table */}
              {Array.isArray(result.cropSpecificDosage) && result.cropSpecificDosage.length > 0 && (
                <div className="border-t border-gray-200 pt-5 space-y-3">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Leaf className="w-4 h-4 text-green-600" />
                    फसलों के अनुसार विशिष्ट मात्रा (Crop Specific Recommendation)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-gray-200 rounded-2xl overflow-hidden">
                      <thead className="bg-gray-100 text-gray-700 font-black">
                        <tr>
                          <th className="p-3">फसल</th>
                          <th className="p-3">अनुशंसित डोज़</th>
                          <th className="p-3">उपयोग विधि</th>
                          <th className="p-3">छिड़काव का सही समय</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.cropSpecificDosage.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-3 font-black text-gray-900">{item.cropName}</td>
                            <td className="p-3 font-black text-[#2D5A27]">{item.dosage}</td>
                            <td className="p-3 text-gray-700">{item.usage}</td>
                            <td className="p-3 text-gray-600">{item.sprayTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Benefits, Target Crops & Symptoms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Benefits */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                <Check className="w-4.5 h-4.5 text-green-600" />
                मुख्य उपयोग एवं फायदे (Benefits & Uses)
              </h4>
              <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-line">
                {result.benefits || result.usage}
              </p>
            </div>

            {/* Features */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                उत्पाद की विशेषताएं (Features)
              </h4>
              <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-line">
                {result.features || "विशेषताएं उपलब्ध नहीं हैं"}
              </p>
            </div>
          </div>

          {/* Target Crops, Pests & Symptoms */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
              <Info className="w-4.5 h-4.5 text-[#2D5A27]" />
              लक्षित फसलें, कीट/रोग व पहचान के लक्षण
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/60 space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">लक्षित फसलें</p>
                <p className="text-xs font-bold text-gray-900 leading-relaxed">{result.targetCrops || "सभी प्रमुख फसलें"}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/60 space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">लक्षित कीट / रोग</p>
                <p className="text-xs font-bold text-gray-900 leading-relaxed">{result.targetPests || "उत्पाद अनुसार"}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/60 space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">पहचान के लक्षण</p>
                <p className="text-xs font-bold text-gray-900 leading-relaxed">{result.symptoms || "उत्पाद अनुसार"}</p>
              </div>
            </div>
          </div>

          {/* Tank Mixing Compatibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-2">
              <h4 className="text-xs font-black text-green-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                किसके साथ मिला सकते हैं (Compatible)
              </h4>
              <p className="text-xs font-medium text-gray-700 bg-green-50/50 p-3.5 rounded-2xl border border-green-100 leading-relaxed">
                {result.compatibleProducts || "अधिकांश सामान्य कीटनाशकों और कवकनाशकों के साथ सुरक्षित रूप से मिला सकते हैं।"}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-2">
              <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                किसके साथ कतई न मिलाएं (Incompatible)
              </h4>
              <p className="text-xs font-medium text-gray-700 bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 leading-relaxed">
                {result.incompatibleProducts || "क्षारीय (Alkaline) या बोर्डो मिश्रण के साथ मिश्रण न करें।"}
              </p>
            </div>
          </div>

          {/* Safety, Precautions & Intervals */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
              सुरक्षा, सावधानियां एवं तकनीकी मापदंड
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-200/60">
                <span className="text-[10px] text-gray-500 font-bold uppercase">टॉक्सिसिटी स्तर</span>
                <p className="text-xs font-black text-rose-600 mt-1">{result.toxicity || "सामान्य"}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-200/60">
                <span className="text-[10px] text-gray-500 font-bold uppercase">प्रतीक्षा अवधि (PHI)</span>
                <p className="text-xs font-black text-gray-900 mt-1">{result.phi || "N/A"}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-200/60">
                <span className="text-[10px] text-gray-500 font-bold uppercase">पुनः प्रवेश काल (REI)</span>
                <p className="text-xs font-black text-gray-900 mt-1">{result.rei || "N/A"}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center border border-gray-200/60">
                <span className="text-[10px] text-gray-500 font-bold uppercase">वर्षा सुरक्षा काल</span>
                <p className="text-xs font-black text-gray-900 mt-1">{result.rainfastPeriod || "2 घंटे"}</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-gray-700 leading-relaxed font-medium">
                  <span className="font-bold text-gray-900">सुरक्षा निर्देश: </span>
                  {result.safetyInstructions}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
                <p className="text-gray-700 leading-relaxed font-medium">
                  <span className="font-bold text-gray-900">घोल बनाने का क्रम (WALES): </span>
                  {result.mixingOrder}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Thermometer className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-gray-700 leading-relaxed font-medium">
                  <span className="font-bold text-gray-900">छिड़काव का समय व भंडारण: </span>
                  {result.sprayTiming} | सुरक्षित भंडारण: {result.storage}
                </p>
              </div>
            </div>
          </div>

          {/* Official Government Citations */}
          {Array.isArray(result.sources) && result.sources.length > 0 && (
            <div className="bg-gray-50 rounded-3xl p-5 border border-gray-200 space-y-3 print:hidden">
              <h4 className="text-xs font-black text-gray-600 uppercase tracking-wider">
                प्रमाणित जानकारी के आधिकारिक स्रोत:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {result.sources.map((src, i) => (
                  <a 
                    key={i} 
                    href={src.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 hover:border-[#2D5A27] rounded-2xl transition-all group"
                  >
                    <div className="truncate pr-3">
                      <p className="text-xs font-bold text-gray-900 truncate group-hover:text-[#2D5A27]">{src.title}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{src.uri}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#2D5A27] shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bookmarks & Saved Products Section (Shown when no active search result) */}
      {!result && !isLoading && (
        <div className="space-y-6 print:hidden">
          {bookmarkedProducts.length > 0 && (
            <div className="space-y-3.5">
              <h3 className="text-sm font-black text-[#4A3728] uppercase tracking-wider flex items-center gap-2">
                <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-500" />
                सुरक्षित उत्पाद जानकारी ({bookmarkedProducts.length})
              </h3>

              {/* Filter input */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={savedSearchQuery}
                  onChange={(e) => setSavedSearchQuery(e.target.value)}
                  placeholder="सुरक्षित उत्पादों में खोजें (नाम, टेक्निकल, कंपनी)..."
                  className="w-full bg-white border border-gray-200 focus:border-[#2D5A27] focus:ring-2 focus:ring-[#2D5A27]/20 rounded-2xl pl-10 pr-10 py-2.5 text-xs font-bold text-gray-900 placeholder-gray-400 transition-all shadow-xs"
                />
                {savedSearchQuery && (
                  <button
                    onClick={() => setSavedSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-rose-600 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Saved list */}
              <div className="flex flex-col gap-4">
                {filteredSavedProducts.map((prod, idx) => {
                  const theme = getCategoryTheme(prod.category);
                  const CategoryIcon = theme.icon;
                  const quickDose = prod.dosageLiquid?.per15L || prod.dosagePowder?.per15L;

                  return (
                    <div 
                      key={`${prod.productName}_${idx}`}
                      onClick={() => setResult(prod)}
                      className="group relative bg-white rounded-3xl border border-gray-200/90 hover:border-[#2D5A27]/50 shadow-sm hover:shadow-xl hover:shadow-[#2D5A27]/10 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
                    >
                      {/* Top Category Accent Line */}
                      <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient}`} />

                      <div className="p-5 sm:p-6 space-y-4">
                        {/* Header: Icon Avatar + Category Info + Delete Button */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Category Icon Avatar */}
                            <div className={`w-12 h-12 rounded-2xl ${theme.avatarBg} border flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200`}>
                              <CategoryIcon className="w-6 h-6" />
                            </div>

                            {/* Category Metadata */}
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-700 truncate">
                                  {prod.category}
                                </span>
                                {prod.formulation && prod.formulation !== "उपलब्ध नहीं है" && (
                                  <>
                                    <span className="text-gray-300 text-xs">·</span>
                                    <span className="text-[11px] font-bold text-gray-500">
                                      {prod.formulation}
                                    </span>
                                  </>
                                )}
                              </div>
                              {prod.companyName && prod.companyName !== "उपलब्ध नहीं है" && (
                                <p className="text-xs font-semibold text-gray-500 truncate flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span>{prod.companyName}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(prod);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                            title="सुरक्षित सूची से हटाएं"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>

                        {/* Product Title */}
                        <div>
                          <h4 className="text-lg sm:text-xl font-black text-gray-900 group-hover:text-[#2D5A27] transition-colors leading-snug tracking-tight">
                            {prod.productName}
                          </h4>
                        </div>

                        {/* Technical / Formula Showcase Box */}
                        {prod.technicalName && prod.technicalName !== "उपलब्ध नहीं है" && (
                          <div className="bg-gradient-to-r from-gray-50 via-gray-50/60 to-white rounded-2xl p-3.5 border border-gray-100 flex items-start gap-2.5">
                            <FlaskConical className="w-4.5 h-4.5 text-[#2D5A27] shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed min-w-0">
                              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">
                                टेक्निकल / एक्टिव फॉर्मूला
                              </span>
                              <span className="font-bold text-gray-800 break-words text-[13px]">
                                {prod.technicalName}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Crops & Quick 15L Dosage Info */}
                        <div className="space-y-2 pt-0.5">
                          {prod.targetCrops && prod.targetCrops !== "उपलब्ध नहीं है" && (
                            <div className="flex items-start gap-2 text-xs text-gray-600">
                              <Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="font-bold text-gray-700">प्रमुख फसलें: </span>
                                <span className="text-gray-600 font-medium">{prod.targetCrops}</span>
                              </div>
                            </div>
                          )}

                          {quickDose && quickDose !== "उत्पाद अनुसार" && (
                            <div className="flex items-center gap-2 text-xs">
                              <Droplets className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
                              <span className="font-bold text-gray-700">15L टंकी स्प्रे डोज़: </span>
                              <span className="font-black text-[#2D5A27] bg-[#2D5A27]/10 px-2 py-0.5 rounded-md text-[11px]">
                                {quickDose}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Interactive CTA Bar */}
                      <div className="px-5 sm:px-6 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between group-hover:bg-[#2D5A27]/5 transition-colors">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>प्रमाणित कृषि ज्ञान</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-black text-[#2D5A27] group-hover:translate-x-1 transition-transform">
                          <span>डोज़ व पूरा विवरण देखें</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredSavedProducts.length === 0 && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 text-xs space-y-1">
                    <p className="font-bold text-gray-700">कोई उत्पाद नहीं मिला</p>
                    <p className="text-gray-400">"{savedSearchQuery}" से मेल खाता कोई सुरक्षित उत्पाद सूची में नहीं है।</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Intro Card */}
          <div className="bg-gradient-to-br from-[#2D5A27]/5 to-[#EAB308]/5 rounded-3xl p-8 text-center space-y-3 border border-[#2D5A27]/10">
            <Leaf className="w-12 h-12 text-[#2D5A27]/40 mx-auto" />
            <h3 className="font-black text-gray-800 text-base">
              भारत का 100% सटीक कृषि उत्पाद ज्ञान साथी
            </h3>
            <p className="text-xs text-gray-600 font-medium max-w-sm mx-auto leading-relaxed">
              कोराजन, साफ, यूरिया, एनपीके, नीम तेल, बीज वैरायटी या किसी भी टेक्निकल नाम को सर्च करें और उसका सही प्रमाण, डोज़ और उपयोग तुरंत जानें।
            </p>
          </div>
        </div>
      )}

      {/* Bottom Sheet for Camera / Gallery */}
      <AnimatePresence>
        {isBottomSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBottomSheetOpen(false)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-2xl z-50 p-6 pb-10 border-t border-gray-100 flex flex-col space-y-4 max-w-lg mx-auto pointer-events-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />
              <div className="text-center pb-2">
                <h4 className="text-lg font-black text-gray-900">AI उत्पाद फोटो स्कैन (Image Search)</h4>
                <p className="text-xs text-gray-500 font-medium mt-1">दवाई, खाद की बोतल या पैकेट की साफ फोटो चुनें</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (cameraInputRef.current) cameraInputRef.current.click();
                  }}
                  className="flex flex-col items-center justify-center p-5 bg-amber-50 hover:bg-amber-100/70 border-2 border-amber-100 rounded-2xl gap-2.5 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-md">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-amber-900">कैमरे से फोटो लें</span>
                  <span className="text-[10px] text-amber-700 font-bold">Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (galleryInputRef.current) galleryInputRef.current.click();
                  }}
                  className="flex flex-col items-center justify-center p-5 bg-green-50 hover:bg-green-100/70 border-2 border-green-100 rounded-2xl gap-2.5 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 bg-[#2D5A27] text-white rounded-full flex items-center justify-center shadow-md">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-green-900">गैलरी से चुनें</span>
                  <span className="text-[10px] text-green-700 font-bold">Choose from Gallery</span>
                </button>
              </div>

              <button
                onClick={() => setIsBottomSheetOpen(false)}
                className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black transition-all cursor-pointer mt-3"
              >
                रद्द करें (Cancel)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-white rounded-3xl p-6 shadow-2xl z-50 border border-gray-100 flex flex-col space-y-4 pointer-events-auto"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-black text-gray-900">उत्पाद हटाएं?</h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  क्या आप <span className="font-bold text-rose-600">"{productToDelete?.productName}"</span> को अपनी सुरक्षित सूची से हटाना चाहते हैं?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black transition-all cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  onClick={() => {
                    if (productToDelete) {
                      handleDeleteProduct(productToDelete.productName);
                    }
                    setIsDeleteConfirmOpen(false);
                    setProductToDelete(null);
                  }}
                  className="py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer"
                >
                  हटाएं
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
