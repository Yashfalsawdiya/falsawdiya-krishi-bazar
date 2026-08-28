import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, CropAdvice, CategoryData, AgriIssue, ImageSource, UserRecord, Helpline, LegalPagesContent, InvoiceTemplateConfig, DynamicDeliveryConfig } from '../types';
import { PRODUCTS, CROP_ADVICE, CATEGORIES } from '../data/mockData';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';
import { DEFAULT_INVOICE_TEMPLATE, mergeInvoiceTemplate } from '../data/defaultInvoiceTemplate';
import { DEFAULT_DELIVERY_CONFIG } from '../data/defaultDeliveryConfig';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { cn, getDirectImageURL, getHighResImageURL } from '../lib/utils';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  query,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { validateLoginEmail } from '../utils/security';

export interface AppContent {
  branding: {
    name: string;
    tagline: string;
    logo: string | ImageSource;
    pwaIcon?: string | ImageSource;
    androidIcon?: string | ImageSource;
    splashLogo?: string | ImageSource;
  };
  loginText?: string;
  adminEmails?: string[];
  isAppActive?: boolean;
  showBannerText?: boolean;
  banners: { id: string; image: string | ImageSource; title: string; subtitle: string }[];
  videos: { id: string; title: string; videoUrl: string; thumbnail: string | ImageSource }[];
  youtubeChannel: {
    url: string;
    label: string;
  };
  partners: { id: string; name: string; logo: string | ImageSource }[];
  whatsappSection: {
    title: string;
    description: string;
    mode: 'direct' | 'group';
    groupLink: string;
  };
  facebookSection?: {
    enabled?: boolean;
    title?: string;
    description?: string;
    pageUrl?: string;
    buttonText?: string;
  };
  instagramSection?: {
    enabled?: boolean;
    title?: string;
    description?: string;
    profileUrl?: string;
    buttonText?: string;
  };
  contactInfo: {
    whatsapp: string;
    address: string;
  };
  apiKeyGuideVideoUrl?: string;
  deliveryServiceEnabled?: boolean;
  isDeliveryActive?: boolean;
  isDeliveryChargesEnabled?: boolean;
  deliveryChargesAmount?: number;
}

export interface UserSettings {
  geminiApiKey: string;
}

interface AppContextType {
  products: Product[];
  categories: CategoryData[];
  agriIssues: AgriIssue[];
  helplines: Helpline[];
  appContent: AppContent | null;
  legalPagesContent: Required<LegalPagesContent>;
  invoiceTemplate: InvoiceTemplateConfig;
  deliveryConfig: DynamicDeliveryConfig;
  user: FirebaseUser | null;
  isAdmin: boolean;
  userSettings: UserSettings | null;
  loading: boolean;
  isQuotaExceeded: boolean;
  allUsers: UserRecord[];
  loadProducts: () => Unsubscribe | undefined;
  loadCategoryData: () => Unsubscribe | undefined;
  loadAgriIssues: () => Unsubscribe | undefined;
  loadHelplines: () => Unsubscribe | undefined;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (category: Omit<CategoryData, 'id'>) => Promise<void>;
  updateCategory: (category: CategoryData) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addAgriIssue: (issue: Omit<AgriIssue, 'id'>) => Promise<void>;
  updateAgriIssue: (issue: AgriIssue) => Promise<void>;
  deleteAgriIssue: (id: string) => Promise<void>;
  addHelpline: (helpline: Omit<Helpline, 'id'>) => Promise<void>;
  updateHelpline: (helpline: Helpline) => Promise<void>;
  deleteHelpline: (id: string) => Promise<void>;
  updateAppContent: (content: AppContent) => Promise<void>;
  updateLegalPagesContent: (content: LegalPagesContent) => Promise<void>;
  resetLegalPageContent: (pageKey: keyof LegalPagesContent) => Promise<void>;
  updateInvoiceTemplate: (template: InvoiceTemplateConfig) => Promise<void>;
  resetInvoiceTemplate: () => Promise<void>;
  updateDeliveryConfig: (config: DynamicDeliveryConfig) => Promise<void>;
  resetDeliveryConfig: () => Promise<void>;
  updateUserSettings: (settings: UserSettings) => Promise<void>;
  updateUserStatus: (uid: string, isBlocked: boolean) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to pre-cache images for offline and instant loading
const preCacheImage = (src: any) => {
  if (!src) return;
  const url = typeof src === 'string' ? getDirectImageURL(src) : getDirectImageURL(src.primary || src.fallback);
  if (!url) return;
  
  const img = new Image();
  img.src = url;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>(CATEGORIES);
  const [agriIssues, setAgriIssues] = useState<AgriIssue[]>([]);
  const [helplines, setHelplines] = useState<Helpline[]>([]);
  const [appContent, setAppContent] = useState<AppContent | null>(null);

  const mergeLegalPages = (saved?: Partial<LegalPagesContent> | null): Required<LegalPagesContent> => {
    if (!saved) return DEFAULT_LEGAL_PAGES_CONTENT;
    return {
      aboutUs: { ...DEFAULT_LEGAL_PAGES_CONTENT.aboutUs, ...(saved.aboutUs || {}) },
      privacyPolicy: { ...DEFAULT_LEGAL_PAGES_CONTENT.privacyPolicy, ...(saved.privacyPolicy || {}) },
      termsConditions: { ...DEFAULT_LEGAL_PAGES_CONTENT.termsConditions, ...(saved.termsConditions || {}) },
      refundPolicy: { ...DEFAULT_LEGAL_PAGES_CONTENT.refundPolicy, ...(saved.refundPolicy || {}) },
      aiDisclaimer: { ...DEFAULT_LEGAL_PAGES_CONTENT.aiDisclaimer, ...(saved.aiDisclaimer || {}) },
      chemicalSafety: { ...DEFAULT_LEGAL_PAGES_CONTENT.chemicalSafety, ...(saved.chemicalSafety || {}) },
      contactUs: { ...DEFAULT_LEGAL_PAGES_CONTENT.contactUs, ...(saved.contactUs || {}) },
      faqHelp: { ...DEFAULT_LEGAL_PAGES_CONTENT.faqHelp, ...(saved.faqHelp || {}) },
      shippingPolicy: { ...DEFAULT_LEGAL_PAGES_CONTENT.shippingPolicy, ...(saved.shippingPolicy || {}) },
      grievanceRedressal: { ...DEFAULT_LEGAL_PAGES_CONTENT.grievanceRedressal, ...(saved.grievanceRedressal || {}) },
      licensingDisclaimer: { ...DEFAULT_LEGAL_PAGES_CONTENT.licensingDisclaimer, ...(saved.licensingDisclaimer || {}) },
    };
  };

  const [legalPagesContent, setLegalPagesContent] = useState<Required<LegalPagesContent>>(() => {
    try {
      const cached = localStorage.getItem('agri_cache_legal_pages');
      if (cached) {
        return mergeLegalPages(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Error reading cached legal pages:", e);
    }
    return DEFAULT_LEGAL_PAGES_CONTENT;
  });

  const mergeDeliveryConfig = (saved?: Partial<DynamicDeliveryConfig> | null): DynamicDeliveryConfig => {
    if (!saved) return DEFAULT_DELIVERY_CONFIG;
    return {
      ...DEFAULT_DELIVERY_CONFIG,
      ...saved,
      storeOrigin: { ...DEFAULT_DELIVERY_CONFIG.storeOrigin, ...(saved.storeOrigin || {}) },
      vehicles: (saved.vehicles && saved.vehicles.length > 0) ? saved.vehicles : DEFAULT_DELIVERY_CONFIG.vehicles,
      weightSlabs: (saved.weightSlabs && saved.weightSlabs.length > 0) ? saved.weightSlabs : DEFAULT_DELIVERY_CONFIG.weightSlabs,
      distanceSlabs: (saved.distanceSlabs && saved.distanceSlabs.length > 0) ? saved.distanceSlabs : DEFAULT_DELIVERY_CONFIG.distanceSlabs,
      rateMatrix: { ...DEFAULT_DELIVERY_CONFIG.rateMatrix, ...(saved.rateMatrix || {}) },
      pincodeDistances: { ...DEFAULT_DELIVERY_CONFIG.pincodeDistances, ...(saved.pincodeDistances || {}) },
    };
  };

  const [deliveryConfig, setDeliveryConfig] = useState<DynamicDeliveryConfig>(() => {
    try {
      const cached = localStorage.getItem('agri_cache_delivery_config');
      if (cached) {
        return mergeDeliveryConfig(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Error reading cached delivery config:", e);
    }
    return DEFAULT_DELIVERY_CONFIG;
  });

  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplateConfig>(() => {
    try {
      const cached = localStorage.getItem('agri_cache_invoice_template');
      if (cached) {
        return mergeInvoiceTemplate(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Error reading cached invoice template:", e);
    }
    return DEFAULT_INVOICE_TEMPLATE;
  });

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);

  // Sync Logic: Check if we need to sync today (after 10 AM)
  const isSyncNeeded = () => {
    const lastSyncStr = localStorage.getItem('last_agri_sync_date');
    const now = new Date();
    const todayStr = now.toDateString();
    
    // Admin always needs latest data
    if (isAdmin) return true;

    // If we haven't synced today
    if (lastSyncStr !== todayStr) {
      // If it's 10 AM or later, or if we have NO cached sync date at all
      if (now.getHours() >= 10 || !lastSyncStr) {
        return true;
      }
    }
    
    return false;
  };

  const markSyncDone = () => {
    localStorage.setItem('last_agri_sync_date', new Date().toDateString());
  };

  useEffect(() => {
    let unsubscribeUserDoc: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email || "No User");

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        // Basic check, don't sign out immediately on restore if email is briefly missing
        if (firebaseUser.email) {
          const { isValid } = validateLoginEmail(firebaseUser.email);
          if (!isValid) {
            console.warn("Invalid session detected on restore for:", firebaseUser.email);
            // We might want to allow them to stay if it was a previously accepted email,
            // but for safety we sign out. However, let's be sure it's valid first.
            await signOut(auth);
            setUser(null);
            setLoading(false);
            return;
          }
        }

        setUser(firebaseUser);

        try {
          // Setup real-time listener for user profile
          unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), async (snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.data();
              
              if (userData.isBlocked === true) {
                console.warn("User account blocked reactive check.");
                await signOut(auth);
                setUser(null);
                setLoading(false);
                alert("आपका अकाउंट ब्लॉक है। (Account Blocked)");
                return;
              }

              const mainAdminEmail = 'yashfalsawdiya36@gmail.com';
              // Check admin status against content or static list
              const contentSnap = await getDoc(doc(db, 'settings', 'content'));
              const contentData = contentSnap.exists() ? contentSnap.data() as AppContent : null;
              const backupAdmins = contentData?.adminEmails || [];
              const isAdminEmail = firebaseUser.email === mainAdminEmail || backupAdmins.includes(firebaseUser.email || '');

              setIsAdmin(userData.role === 'admin' || isAdminEmail);
              setUserSettings({ geminiApiKey: userData.geminiApiKey || '' });
            } else {
              // Create default doc if missing
              const mainAdminEmail = 'yashfalsawdiya36@gmail.com';
              const contentSnap = await getDoc(doc(db, 'settings', 'content'));
              const contentData = contentSnap.exists() ? contentSnap.data() as AppContent : null;
              const backupAdmins = contentData?.adminEmails || [];
              const isAdminEmail = firebaseUser.email === mainAdminEmail || backupAdmins.includes(firebaseUser.email || '');

              const defaultSettings = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                role: isAdminEmail ? 'admin' : 'user',
                isBlocked: false,
                geminiApiKey: ''
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), defaultSettings);
              setIsAdmin(isAdminEmail);
              setUserSettings({ geminiApiKey: '' });
            }
            setLoading(false);
          }, (error) => {
            console.error("User doc listener error:", error);
            const err = handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            if (err?.error.toLowerCase().includes('quota')) {
              setIsQuotaExceeded(true);
            }
            setLoading(false);
          });
        } catch (error) {
          console.error("Auth init error:", error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setUserSettings(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // Global data loading effect
  useEffect(() => {
    const unsubProducts = loadProducts();
    const unsubCategories = loadCategoryData();
    const unsubHelplines = loadHelplines();
    const unsubAgriIssues = loadAgriIssues();
    
    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubCategories) unsubCategories();
      if (unsubHelplines) unsubHelplines();
      if (unsubAgriIssues) unsubAgriIssues();
    };
  }, [isAdmin]);

  // Cache helpers
  const getCachedData = <T,>(key: string): T[] | null => {
    try {
      const cached = localStorage.getItem(`agri_cache_${key}`);
      if (cached) {
        return JSON.parse(cached) as T[];
      }
    } catch (e) {
      console.error(`Error reading cache for ${key}:`, e);
    }
    return null;
  };

  const prefetchImage = (url: string | ImageSource | undefined, isPriority: boolean = false) => {
    if (!url) return;
    
    // 1. Fill the browser's internal image cache (Memory Cache)
    preCacheImage(url);
    
    // 2. Trigger Service Worker caching (Disk/SW Cache)
    const directUrl = typeof url === 'string' ? getDirectImageURL(url) : getDirectImageURL(url.primary || url.fallback || '');
    if (!directUrl || directUrl.startsWith('data:')) return;
    
    // We use fetch with 'no-cors' to fill the SW cache. 
    // Status 0 (opaque) responses are explicitly allowed in vite.config.ts
    fetch(directUrl, { 
      mode: 'no-cors', 
      priority: isPriority ? 'high' : 'low',
      credentials: 'omit' 
    }).catch(() => {});
  };

  const prefetchContentImages = useCallback((content: AppContent | null) => {
    if (!content) return;
    
    // High Priority Branding
    prefetchImage(content.branding.logo, true);
    prefetchImage(content.branding.pwaIcon, true);
    prefetchImage(content.branding.androidIcon, true);
    prefetchImage(content.branding.splashLogo, true);
    
    // Content Banners
    if (content.banners) {
      content.banners.forEach(b => prefetchImage(b.image, true));
    }
    
    // Partner Logos
    if (content.partners) {
      content.partners.forEach(p => prefetchImage(p.logo));
    }

    // Video Thumbnails
    if (content.videos) {
      content.videos.forEach(v => prefetchImage(v.thumbnail));
    }
  }, []);

  const setCacheData = <T,>(key: string, data: T[]) => {
    try {
      localStorage.setItem(`agri_cache_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving cache for ${key}:`, e);
    }
  };

  const loadProducts = () => {
    // First, seed from cache if available for ultra-fast load
    const cached = getCachedData<Product>('products');
    if (cached && products.length === 0) {
      setProducts(cached);
    }

    if (!isSyncNeeded() && cached && cached.length > 0) {
      console.log("Using cached products, skipping Firebase fetch until 10 AM.");
      return undefined;
    }

    const q = query(collection(db, 'products'), orderBy('hindiName'));
    return onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
      setCacheData('products', prods);
      
      // Prefetch images for all products to ensure offline availability
      // But prioritize featured ones
      const featured = prods.filter(p => p.isFeatured);
      const others = prods.filter(p => !p.isFeatured);
      
      featured.forEach(p => prefetchImage(p.image, true));
      others.forEach(p => prefetchImage(p.image));
      
      markSyncDone();
      setIsQuotaExceeded(false);
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.LIST, 'products');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });
  };

  const loadCategoryData = () => {
    // Initial data from mock if empty, or from cache
    const cached = getCachedData<CategoryData>('categories');
    if (cached && cached.length > 0) {
      setCategories(cached);
    }

    if (!isSyncNeeded() && cached && cached.length > 0) {
      console.log("Using cached categories, skipping Firebase fetch until 10 AM.");
      return undefined;
    }

    const q = query(collection(db, 'categories'), orderBy('order'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryData));
      if (!snapshot.empty) {
        setCategories(data);
        setCacheData('categories', data);
        
        // Prefetch all category icons
        data.forEach(c => prefetchImage(c.icon));
        
        markSyncDone();
      }
      setIsQuotaExceeded(false);
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.LIST, 'categories');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });
  };

  const loadAgriIssues = () => {
    const cached = getCachedData<AgriIssue>('agriIssues');
    if (cached && agriIssues.length === 0) {
      setAgriIssues(cached);
    }

    if (!isSyncNeeded() && cached && cached.length > 0) {
      console.log("Using cached agriIssues, skipping Firebase fetch until 10 AM.");
      return undefined;
    }

    const q = collection(db, 'agriIssues');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgriIssue));
      setAgriIssues(data);
      setCacheData('agriIssues', data);
      markSyncDone();
      setIsQuotaExceeded(false);
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.LIST, 'agriIssues');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });
  };

  const loadHelplines = () => {
    const cached = getCachedData<Helpline>('helplines');
    if (cached && helplines.length === 0) {
      setHelplines(cached);
    }

    const q = query(collection(db, 'helplines'), orderBy('order'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Helpline));
      setHelplines(data);
      setCacheData('helplines', data);
      setIsQuotaExceeded(false);
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.LIST, 'helplines');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });
  };

  // Dedicated effect for app content - important for branding
  useEffect(() => {
    // Always load branding from cache first
    const cached = localStorage.getItem('agri_cache_app_content');
    if (cached) {
      setAppContent(JSON.parse(cached));
    }

    if (!isSyncNeeded() && cached) return;

    const unsubscribeContent = onSnapshot(doc(db, 'settings', 'content'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppContent;
        setAppContent(data);
        localStorage.setItem('agri_cache_app_content', JSON.stringify(data));
        prefetchContentImages(data);
        markSyncDone();
      }
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.GET, 'settings/content');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });
    return () => unsubscribeContent();
  }, [isAdmin]);

  // Dedicated effect for legal & static pages content
  useEffect(() => {
    const cached = localStorage.getItem('agri_cache_legal_pages');
    if (cached) {
      try {
        setLegalPagesContent(mergeLegalPages(JSON.parse(cached)));
      } catch (e) {
        console.error("Failed to parse cached legal pages:", e);
      }
    }

    if (!isSyncNeeded() && cached) return;

    const unsubscribeLegalPages = onSnapshot(doc(db, 'settings', 'legalPages'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<LegalPagesContent>;
        const merged = mergeLegalPages(data);
        setLegalPagesContent(merged);
        localStorage.setItem('agri_cache_legal_pages', JSON.stringify(data));
      }
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.GET, 'settings/legalPages');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });

    return () => unsubscribeLegalPages();
  }, [isAdmin]);

  // Sync invoice template settings from Firestore
  useEffect(() => {
    const cached = localStorage.getItem('agri_cache_invoice_template');
    if (cached) {
      try {
        setInvoiceTemplate(mergeInvoiceTemplate(JSON.parse(cached)));
      } catch (e) {
        console.error("Failed to parse cached invoice template:", e);
      }
    }

    if (!isSyncNeeded() && cached) return;

    const unsubscribeInvoiceTemplate = onSnapshot(doc(db, 'settings', 'invoiceTemplate'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<InvoiceTemplateConfig>;
        const merged = mergeInvoiceTemplate(data);
        setInvoiceTemplate(merged);
        localStorage.setItem('agri_cache_invoice_template', JSON.stringify(merged));
      }
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.GET, 'settings/invoiceTemplate');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });

    return () => unsubscribeInvoiceTemplate();
  }, [isAdmin]);

  // Sync dynamic delivery charge config from Firestore
  useEffect(() => {
    const cached = localStorage.getItem('agri_cache_delivery_config');
    if (cached) {
      try {
        setDeliveryConfig(mergeDeliveryConfig(JSON.parse(cached)));
      } catch (e) {
        console.error("Failed to parse cached delivery config:", e);
      }
    }

    if (!isSyncNeeded() && cached) return;

    const unsubscribeDeliveryConfig = onSnapshot(doc(db, 'settings', 'deliveryConfig'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<DynamicDeliveryConfig>;
        const merged = mergeDeliveryConfig(data);
        setDeliveryConfig(merged);
        localStorage.setItem('agri_cache_delivery_config', JSON.stringify(merged));
      }
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.GET, 'settings/deliveryConfig');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });

    return () => unsubscribeDeliveryConfig();
  }, [isAdmin]);

  // Additional effect to listen for all users if admin
  useEffect(() => {
    if (isAdmin) {
      const unsubscribeAllUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserRecord)));
      }, (error) => {
        const err = handleFirestoreError(error, OperationType.LIST, 'users');
        if (err?.error.toLowerCase().includes('quota')) {
          setIsQuotaExceeded(true);
        }
      });
      return () => unsubscribeAllUsers();
    } else {
      setAllUsers([]);
    }
  }, [isAdmin]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;

      // Strict validation for newly logged in user
      const { isValid, reason } = validateLoginEmail(loggedUser.email);
      
      if (!isValid) {
        console.warn(`Blocked login attempt from: ${loggedUser.email}. Reason: ${reason}`);
        await signOut(auth);
        alert(reason);
        return;
      }

      // Check if user is blocked immediately after login
      const userDoc = await getDoc(doc(db, 'users', loggedUser.uid));
      if (userDoc.exists() && userDoc.data().isBlocked === true) {
        await signOut(auth);
        alert("आपका अकाउंट ब्लॉक कर दिया गया है। (Your account has been blocked)");
        return;
      }
      
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        alert("लॉगिन में समस्या आई: " + (error.message || "अज्ञात त्रुटि"));
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      await addDoc(collection(db, 'products'), product);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      const { id, ...data } = updatedProduct;
      await setDoc(doc(db, 'products', id), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updatedProduct.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const addCategory = async (category: Omit<CategoryData, 'id'>) => {
    try {
      await addDoc(collection(db, 'categories'), category);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const updateCategory = async (category: CategoryData) => {
    try {
      const { id, ...data } = category;
      await setDoc(doc(db, 'categories', id), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${category.id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const addAgriIssue = async (issue: Omit<AgriIssue, 'id'>) => {
    try {
      await addDoc(collection(db, 'agriIssues'), issue);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'agriIssues');
    }
  };

  const updateAgriIssue = async (issue: AgriIssue) => {
    try {
      const { id, ...data } = issue;
      await setDoc(doc(db, 'agriIssues', id), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agriIssues/${issue.id}`);
    }
  };

  const deleteAgriIssue = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'agriIssues', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `agriIssues/${id}`);
    }
  };

  const addHelpline = async (helpline: Omit<Helpline, 'id'>) => {
    try {
      await addDoc(collection(db, 'helplines'), helpline);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'helplines');
    }
  };

  const updateHelpline = async (helpline: Helpline) => {
    try {
      const { id, ...data } = helpline;
      await setDoc(doc(db, 'helplines', id), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `helplines/${helpline.id}`);
    }
  };

  const deleteHelpline = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'helplines', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `helplines/${id}`);
    }
  };

  const updateAppContent = async (content: AppContent) => {
    try {
      await setDoc(doc(db, 'settings', 'content'), content);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/content');
    }
  };

  const updateLegalPagesContent = async (content: LegalPagesContent) => {
    try {
      await setDoc(doc(db, 'settings', 'legalPages'), content, { merge: true });
      const merged = mergeLegalPages(content);
      setLegalPagesContent(merged);
      localStorage.setItem('agri_cache_legal_pages', JSON.stringify(merged));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/legalPages');
    }
  };

  const resetLegalPageContent = async (pageKey: keyof LegalPagesContent) => {
    try {
      const updated: Required<LegalPagesContent> = {
        ...legalPagesContent,
        [pageKey]: DEFAULT_LEGAL_PAGES_CONTENT[pageKey]
      };
      await setDoc(doc(db, 'settings', 'legalPages'), updated);
      setLegalPagesContent(updated);
      localStorage.setItem('agri_cache_legal_pages', JSON.stringify(updated));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/legalPages');
    }
  };

  const updateInvoiceTemplate = async (template: InvoiceTemplateConfig) => {
    try {
      await setDoc(doc(db, 'settings', 'invoiceTemplate'), template, { merge: true });
      const merged = mergeInvoiceTemplate(template);
      setInvoiceTemplate(merged);
      localStorage.setItem('agri_cache_invoice_template', JSON.stringify(merged));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/invoiceTemplate');
      throw error;
    }
  };

  const resetInvoiceTemplate = async () => {
    try {
      const defaults = DEFAULT_INVOICE_TEMPLATE;
      await setDoc(doc(db, 'settings', 'invoiceTemplate'), defaults);
      setInvoiceTemplate(defaults);
      localStorage.setItem('agri_cache_invoice_template', JSON.stringify(defaults));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/invoiceTemplate');
      throw error;
    }
  };

  const updateDeliveryConfig = async (config: DynamicDeliveryConfig) => {
    try {
      const payload = {
        ...config,
        lastUpdated: Date.now(),
      };
      await setDoc(doc(db, 'settings', 'deliveryConfig'), payload, { merge: true });
      const merged = mergeDeliveryConfig(payload);
      setDeliveryConfig(merged);
      localStorage.setItem('agri_cache_delivery_config', JSON.stringify(merged));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/deliveryConfig');
      throw error;
    }
  };

  const resetDeliveryConfig = async () => {
    try {
      const defaults = { ...DEFAULT_DELIVERY_CONFIG, lastUpdated: Date.now() };
      await setDoc(doc(db, 'settings', 'deliveryConfig'), defaults);
      setDeliveryConfig(defaults);
      localStorage.setItem('agri_cache_delivery_config', JSON.stringify(defaults));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/deliveryConfig');
      throw error;
    }
  };

  const updateUserSettings = async (settings: UserSettings) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        geminiApiKey: settings.geminiApiKey
      });
      setUserSettings(settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateUserStatus = async (uid: string, isBlocked: boolean) => {
    if (!isAdmin) return;
    
    try {
      // Protection for Admins: Main Admin and Backup Admin cannot be blocked
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const uData = userDoc.data();
        const isMainAdmin = uData.email === 'yashfalsawdiya36@gmail.com';
        const isBackupAdmin = appContent?.adminEmails?.includes(uData.email);
        
        if (isMainAdmin || isBackupAdmin) {
          alert("एडमिन आईडी को ब्लॉक नहीं किया जा सकता। (Admin IDs cannot be blocked)");
          return;
        }
      }

      await updateDoc(doc(db, 'users', uid), { isBlocked });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  return (
    <AppContext.Provider value={{ 
      products, 
      categories,
      agriIssues,
      helplines,
      appContent,
      legalPagesContent,
      invoiceTemplate,
      deliveryConfig,
      user, 
      isAdmin, 
      userSettings,
      loading,
      isQuotaExceeded,
      allUsers,
      loadProducts,
      loadCategoryData,
      loadAgriIssues,
      loadHelplines,
      addProduct, 
      updateProduct, 
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      addAgriIssue,
      updateAgriIssue,
      deleteAgriIssue,
      addHelpline,
      updateHelpline,
      deleteHelpline,
      updateAppContent,
      updateLegalPagesContent,
      resetLegalPageContent,
      updateInvoiceTemplate,
      resetInvoiceTemplate,
      updateDeliveryConfig,
      resetDeliveryConfig,
      updateUserSettings,
      updateUserStatus,
      login,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
