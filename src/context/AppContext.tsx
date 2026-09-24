import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, CropAdvice, CategoryData, AgriIssue, ImageSource, UserRecord, Helpline, LegalPagesContent, InvoiceTemplateConfig, DynamicDeliveryConfig, DeliveryEmailTemplateConfig, DeviceType, DeviceBanner, DeviceBannersMap, YouTubeVideoItem, FooterConfig } from '../types';
import { PRODUCTS, CROP_ADVICE, CATEGORIES } from '../data/mockData';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';
import { DEFAULT_INVOICE_TEMPLATE, mergeInvoiceTemplate } from '../data/defaultInvoiceTemplate';
import { DEFAULT_DELIVERY_EMAIL_TEMPLATE, mergeDeliveryEmailTemplate } from '../data/defaultDeliveryEmailTemplate';
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
  writeBatch,
  getDoc,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  query,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  setPersistence, 
  browserSessionPersistence, 
  inMemoryPersistence, 
  User as FirebaseUser 
} from 'firebase/auth';
import { validateLoginEmail } from '../utils/security';
import { safeLocalStorageSet, sanitizeProductForStorage, cleanupStorageQuota } from '../utils/cacheManager';
import { loadAllCachedData, syncDataIfVersionChanged, bumpMetadataVersion, forcePushMetadataVersion, IDB_KEYS } from '../utils/dataSyncManager';
import { idbSet } from '../utils/idbStorage';
import { sortCategoriesByOrder } from '../utils/categoryUtils';

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
  deviceBanners?: DeviceBannersMap;
  videos: YouTubeVideoItem[];
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
  footer?: FooterConfig;
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
  deliveryEmailTemplate: DeliveryEmailTemplateConfig;
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
  removeFeaturedProduct: (productId: string) => Promise<void>;
  reorderFeaturedProducts: (reorderedProducts: Product[]) => Promise<void>;
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
  updateFooterContent: (footer: FooterConfig) => Promise<void>;
  updateLegalPagesContent: (content: LegalPagesContent) => Promise<void>;
  resetLegalPageContent: (pageKey: keyof LegalPagesContent) => Promise<void>;
  updateInvoiceTemplate: (template: InvoiceTemplateConfig) => Promise<void>;
  resetInvoiceTemplate: () => Promise<void>;
  updateDeliveryEmailTemplate: (template: DeliveryEmailTemplateConfig) => Promise<void>;
  resetDeliveryEmailTemplate: () => Promise<void>;
  updateDeliveryConfig: (config: DynamicDeliveryConfig) => Promise<void>;
  resetDeliveryConfig: () => Promise<void>;
  forcePushAllUpdates: (message?: string) => Promise<void>;
  forceSyncCatalog: () => Promise<void>;
  updateUserSettings: (settings: UserSettings) => Promise<void>;
  updateUserStatus: (uid: string, isBlocked: boolean) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}


const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to pre-cache images for offline and instant loading
const preCacheImage = (src: any, isBanner: boolean = false) => {
  if (!src) return;
  const url = typeof src === 'string' 
    ? getDirectImageURL(src) 
    : getDirectImageURL(isBanner ? (src.fallback || src.primary) : (src.primary || src.fallback));
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

  const [deliveryEmailTemplate, setDeliveryEmailTemplate] = useState<DeliveryEmailTemplateConfig>(() => {
    try {
      const cached = localStorage.getItem('agri_cache_delivery_email_template');
      if (cached) {
        return mergeDeliveryEmailTemplate(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Error reading cached delivery email template:", e);
    }
    return DEFAULT_DELIVERY_EMAIL_TEMPLATE;
  });


  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('falsawdiya_user_gemini_api_key')?.trim();
      if (cached && cached.length > 5) {
        return { geminiApiKey: cached };
      }
    }
    return null;
  });
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
              const backupAdmins = appContent?.adminEmails || [];
              const isAdminEmail = firebaseUser.email === mainAdminEmail || backupAdmins.includes(firebaseUser.email || '');

              setIsAdmin(userData.role === 'admin' || isAdminEmail);
              const loadedKey = userData.geminiApiKey?.trim() || '';
              if (loadedKey) {
                localStorage.setItem('falsawdiya_user_gemini_api_key', loadedKey);
              }
              setUserSettings({ geminiApiKey: loadedKey });
            } else {
              // Create default doc if missing
              const mainAdminEmail = 'yashfalsawdiya36@gmail.com';
              const backupAdmins = appContent?.adminEmails || [];
              const isAdminEmail = firebaseUser.email === mainAdminEmail || backupAdmins.includes(firebaseUser.email || '');

              const cachedDeviceKey = typeof window !== 'undefined' ? localStorage.getItem('falsawdiya_user_gemini_api_key')?.trim() || '' : '';
              const defaultSettings = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                role: isAdminEmail ? 'admin' : 'user',
                isBlocked: false,
                geminiApiKey: cachedDeviceKey
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), defaultSettings);
              setIsAdmin(isAdminEmail);
              setUserSettings({ geminiApiKey: cachedDeviceKey });
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

  // Global data loading effect: Offline-First IndexedDB + Single Metadata Version Check
  useEffect(() => {
    let isMounted = true;

    async function initData() {
      // 1. Instant 0ms load from IndexedDB
      const cached = await loadAllCachedData();
      if (!isMounted) return;

      if (cached.products.length > 0) setProducts(cached.products);
      if (cached.categories.length > 0) setCategories(sortCategoriesByOrder(cached.categories));
      if (cached.agriIssues.length > 0) setAgriIssues(cached.agriIssues);
      if (cached.helplines.length > 0) setHelplines(cached.helplines);
      if (cached.appContent) {
        setAppContent(cached.appContent);
        prefetchContentImages(cached.appContent);
      }
      if (cached.legalPages) setLegalPagesContent(mergeLegalPages(cached.legalPages));
      if (cached.deliveryConfig) setDeliveryConfig(mergeDeliveryConfig(cached.deliveryConfig));
      if (cached.invoiceTemplate) setInvoiceTemplate(mergeInvoiceTemplate(cached.invoiceTemplate));
      if (cached.deliveryEmailTemplate) setDeliveryEmailTemplate(mergeDeliveryEmailTemplate(cached.deliveryEmailTemplate));

      // 2. Intelligent single version check (consumes at most 1 Read, 0 reads if not updated)
      try {
        const syncRes = await syncDataIfVersionChanged(db, { isAdmin });
        if (!isMounted) return;
        if (syncRes.updated && syncRes.newData) {
          if (syncRes.newData.products) setProducts(syncRes.newData.products);
          if (syncRes.newData.categories) setCategories(sortCategoriesByOrder(syncRes.newData.categories));
          if (syncRes.newData.agriIssues) setAgriIssues(syncRes.newData.agriIssues);
          if (syncRes.newData.helplines) setHelplines(syncRes.newData.helplines);
          if (syncRes.newData.appContent) {
            setAppContent(syncRes.newData.appContent);
            prefetchContentImages(syncRes.newData.appContent);
          }
          if (syncRes.newData.legalPages) setLegalPagesContent(mergeLegalPages(syncRes.newData.legalPages));
          if (syncRes.newData.deliveryConfig) setDeliveryConfig(mergeDeliveryConfig(syncRes.newData.deliveryConfig));
          if (syncRes.newData.invoiceTemplate) setInvoiceTemplate(mergeInvoiceTemplate(syncRes.newData.invoiceTemplate));
          if (syncRes.newData.deliveryEmailTemplate) setDeliveryEmailTemplate(mergeDeliveryEmailTemplate(syncRes.newData.deliveryEmailTemplate));
        }
      } catch (err) {
        console.warn('Background sync check warning:', err);
      }
    }

    initData();

    // 3. Admin-only live listeners (only when logged in as admin to observe live admin panel changes)
    let unsubAdminProducts: Unsubscribe | undefined;
    let unsubAdminContent: Unsubscribe | undefined;
    let unsubAdminLegal: Unsubscribe | undefined;
    let unsubAdminDelivery: Unsubscribe | undefined;
    let unsubAdminInvoice: Unsubscribe | undefined;
    let unsubAdminEmailTpl: Unsubscribe | undefined;

    if (isAdmin) {
      unsubAdminContent = onSnapshot(doc(db, 'settings', 'content'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as AppContent;
          setAppContent(data);
          idbSet(IDB_KEYS.APP_CONTENT, data);
        }
      });

      unsubAdminLegal = onSnapshot(doc(db, 'settings', 'legalPages'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<LegalPagesContent>;
          const merged = mergeLegalPages(data);
          setLegalPagesContent(merged);
          idbSet(IDB_KEYS.LEGAL_PAGES, merged);
        }
      });

      unsubAdminDelivery = onSnapshot(doc(db, 'settings', 'deliveryConfig'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<DynamicDeliveryConfig>;
          const merged = mergeDeliveryConfig(data);
          setDeliveryConfig(merged);
          idbSet(IDB_KEYS.DELIVERY_CONFIG, merged);
        }
      });

      unsubAdminInvoice = onSnapshot(doc(db, 'settings', 'invoiceTemplate'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<InvoiceTemplateConfig>;
          const merged = mergeInvoiceTemplate(data);
          setInvoiceTemplate(merged);
          idbSet(IDB_KEYS.INVOICE_TEMPLATE, merged);
        }
      });

      unsubAdminEmailTpl = onSnapshot(doc(db, 'settings', 'deliveryEmailTemplate'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<DeliveryEmailTemplateConfig>;
          const merged = mergeDeliveryEmailTemplate(data);
          setDeliveryEmailTemplate(merged);
          idbSet(IDB_KEYS.DELIVERY_EMAIL_TEMPLATE, merged);
        }
      });
    }

    return () => {
      isMounted = false;
      if (unsubAdminProducts) unsubAdminProducts();
      if (unsubAdminContent) unsubAdminContent();
      if (unsubAdminLegal) unsubAdminLegal();
      if (unsubAdminDelivery) unsubAdminDelivery();
      if (unsubAdminInvoice) unsubAdminInvoice();
      if (unsubAdminEmailTpl) unsubAdminEmailTpl();
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

  const prefetchImage = (url: string | ImageSource | undefined, isPriority: boolean = false, isBanner: boolean = false) => {
    if (!url) return;
    
    // 1. Fill the browser's internal image cache (Memory Cache)
    preCacheImage(url, isBanner);
    
    // 2. Trigger Service Worker caching (Disk/SW Cache)
    const directUrl = typeof url === 'string' 
      ? getDirectImageURL(url) 
      : getDirectImageURL(isBanner ? (url.fallback || url.primary || '') : (url.primary || url.fallback || ''));
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
    
    // Content Banners (Only banners prioritize cloud HD image)
    if (content.banners) {
      content.banners.forEach(b => prefetchImage(b.image, true, true));
    }
    if (content.deviceBanners) {
      Object.values(content.deviceBanners).forEach(list => {
        if (Array.isArray(list)) {
          list.forEach(b => prefetchImage(b.image, true, true));
        }
      });
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
      let payloadToStore = data;
      if (key === 'products' && Array.isArray(data)) {
        payloadToStore = (data as unknown as Product[]).map(sanitizeProductForStorage) as unknown as T[];
      }
      safeLocalStorageSet(`agri_cache_${key}`, JSON.stringify(payloadToStore));
    } catch (e) {
      console.warn(`Error saving cache for ${key}:`, e);
    }
  };

  const loadProducts = () => {
    // Products are preloaded via IndexedDB and synced via single version check
    return undefined;
  };

  const loadCategoryData = () => {
    // Categories are preloaded via IndexedDB and synced via single version check
    return undefined;
  };

  const loadAgriIssues = () => {
    // AgriIssues are preloaded via IndexedDB and synced via single version check
    return undefined;
  };

  const loadHelplines = () => {
    // Helplines are preloaded via IndexedDB and synced via single version check
    return undefined;
  };

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
      // Free up storage quota proactively before Firebase Auth attempts to store auth token
      cleanupStorageQuota();

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (firstErr: any) {
        const errMsg = String(firstErr?.message || firstErr || '').toLowerCase();
        if (errMsg.includes('quota') || firstErr?.code === 'auth/network-request-failed') {
          console.warn("Retrying login with emergency storage clearance & session persistence...");
          cleanupStorageQuota();
          try {
            await setPersistence(auth, browserSessionPersistence);
          } catch (_) {
            try { await setPersistence(auth, inMemoryPersistence); } catch (_) {}
          }
          result = await signInWithPopup(auth, provider);
        } else {
          throw firstErr;
        }
      }

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
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        const isNetworkOrQuota = error.code === 'auth/network-request-failed' || String(error.message || '').toLowerCase().includes('quota');
        if (isNetworkOrQuota) {
          alert("नेटवर्क या ब्राउज़र स्टोरेज सीमा के कारण समस्या आई। कृपया दोबारा लॉगिन करें। (Storage/Network issue resolved, please try logging in again)");
        } else {
          alert("लॉगिन में समस्या आई: " + (error.message || "अज्ञात त्रुटि"));
        }
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'products'), product);
      const newProd = { id: docRef.id, ...product } as Product;
      setProducts(prev => {
        const updated = [...prev, newProd];
        setCacheData('products', updated);
        idbSet(IDB_KEYS.PRODUCTS, updated);
        return updated;
      });
      await bumpMetadataVersion(db, 'products');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === updatedProduct.id ? updatedProduct : p);
      setCacheData('products', updated);
      idbSet(IDB_KEYS.PRODUCTS, updated);
      return updated;
    });
    try {
      const { id, ...data } = updatedProduct;
      await setDoc(doc(db, 'products', id), data, { merge: true });
      await bumpMetadataVersion(db, 'products');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updatedProduct.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      setCacheData('products', updated);
      idbSet(IDB_KEYS.PRODUCTS, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, 'products', id));
      await bumpMetadataVersion(db, 'products');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const removeFeaturedProduct = async (productId: string) => {
    // 1. Optimistically update local React state & local cache
    setProducts(prev => {
      const target = prev.find(p => p.id === productId);
      if (!target) return prev;

      // Re-index remaining featured products sequentially
      const remainingFeatured = prev
        .filter(p => p.isFeatured && p.id !== productId)
        .sort((a, b) => {
          const orderA = typeof a.featuredOrder === 'number' ? a.featuredOrder : 9999;
          const orderB = typeof b.featuredOrder === 'number' ? b.featuredOrder : 9999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.hindiName || '').localeCompare(b.hindiName || '');
        })
        .map((p, idx) => ({ ...p, featuredOrder: idx + 1 }));

      const remainingMap = new Map(remainingFeatured.map(p => [p.id, p]));

      const next = prev.map(p => {
        if (p.id === productId) {
          return { ...p, isFeatured: false, featuredOrder: 0 };
        }
        if (remainingMap.has(p.id)) {
          return remainingMap.get(p.id)!;
        }
        return p;
      });

      setCacheData('products', next);
      return next;
    });

    // 2. Persist update to Firestore
    try {
      const batch = writeBatch(db);
      // Remove featured flag and reset order for the target product
      batch.update(doc(db, 'products', productId), {
        isFeatured: false,
        featuredOrder: 0
      });

      // Update remaining featured products ordering in Firestore
      const remainingFeatured = products
        .filter(p => p.isFeatured && p.id !== productId)
        .sort((a, b) => {
          const orderA = typeof a.featuredOrder === 'number' ? a.featuredOrder : 9999;
          const orderB = typeof b.featuredOrder === 'number' ? b.featuredOrder : 9999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.hindiName || '').localeCompare(b.hindiName || '');
        });

      remainingFeatured.forEach((p, idx) => {
        batch.update(doc(db, 'products', p.id), {
          featuredOrder: idx + 1
        });
      });

      await batch.commit();
    } catch (error) {
      console.warn("Batch remove featured write failed, trying individual fallback:", error);
      try {
        await setDoc(doc(db, 'products', productId), { isFeatured: false, featuredOrder: 0 }, { merge: true });
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.UPDATE, `products/${productId}`);
      }
    }
  };

  const reorderFeaturedProducts = async (reorderedProducts: Product[]) => {
    // 1. Assign clean 1-based sequential ordering
    const normalized = reorderedProducts.map((p, idx) => ({
      ...p,
      isFeatured: true,
      featuredOrder: idx + 1
    }));

    const orderMap = new Map(normalized.map(p => [p.id, p]));

    // 2. Optimistically update local React state & local storage cache
    setProducts(prev => {
      const nextProducts = prev.map(p => orderMap.get(p.id) || p);
      setCacheData('products', nextProducts);
      return nextProducts;
    });

    // 3. Persist batch update to Firestore
    try {
      const batch = writeBatch(db);
      normalized.forEach(p => {
        batch.update(doc(db, 'products', p.id), {
          featuredOrder: p.featuredOrder
        });
      });
      await batch.commit();
    } catch (error) {
      console.warn("Batch reorder write failed, falling back to individual updates:", error);
      try {
        await Promise.all(
          normalized.map(p => 
            setDoc(doc(db, 'products', p.id), { featuredOrder: p.featuredOrder }, { merge: true })
          )
        );
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.UPDATE, 'products/reorder');
      }
    }
  };

  const addCategory = async (category: Omit<CategoryData, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'categories'), category);
      const newCat: CategoryData = { id: docRef.id, ...category };
      setCategories(prev => {
        const updated = sortCategoriesByOrder([...prev, newCat]);
        setCacheData('categories', updated);
        idbSet(IDB_KEYS.CATEGORIES, updated);
        return updated;
      });
      await bumpMetadataVersion(db, 'categories');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const updateCategory = async (category: CategoryData) => {
    setCategories(prev => {
      const updated = sortCategoriesByOrder(prev.map(c => c.id === category.id ? category : c));
      setCacheData('categories', updated);
      idbSet(IDB_KEYS.CATEGORIES, updated);
      return updated;
    });
    try {
      const { id, ...data } = category;
      await setDoc(doc(db, 'categories', id), data, { merge: true });
      await bumpMetadataVersion(db, 'categories');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${category.id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    setCategories(prev => {
      const updated = prev.filter(c => c.id !== id);
      setCacheData('categories', updated);
      idbSet(IDB_KEYS.CATEGORIES, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, 'categories', id));
      await bumpMetadataVersion(db, 'categories');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const addAgriIssue = async (issue: Omit<AgriIssue, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'agriIssues'), issue);
      const newIssue: AgriIssue = { id: docRef.id, ...issue };
      setAgriIssues(prev => {
        const updated = [...prev, newIssue];
        setCacheData('agriIssues', updated);
        idbSet(IDB_KEYS.AGRI_ISSUES, updated);
        return updated;
      });
      await bumpMetadataVersion(db, 'agriIssues');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'agriIssues');
    }
  };

  const updateAgriIssue = async (issue: AgriIssue) => {
    setAgriIssues(prev => {
      const updated = prev.map(i => i.id === issue.id ? issue : i);
      setCacheData('agriIssues', updated);
      idbSet(IDB_KEYS.AGRI_ISSUES, updated);
      return updated;
    });
    try {
      const { id, ...data } = issue;
      await setDoc(doc(db, 'agriIssues', id), data, { merge: true });
      await bumpMetadataVersion(db, 'agriIssues');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agriIssues/${issue.id}`);
    }
  };

  const deleteAgriIssue = async (id: string) => {
    setAgriIssues(prev => {
      const updated = prev.filter(i => i.id !== id);
      setCacheData('agriIssues', updated);
      idbSet(IDB_KEYS.AGRI_ISSUES, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, 'agriIssues', id));
      await bumpMetadataVersion(db, 'agriIssues');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `agriIssues/${id}`);
    }
  };

  const addHelpline = async (helpline: Omit<Helpline, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'helplines'), helpline);
      const newHelpline: Helpline = { id: docRef.id, ...helpline };
      setHelplines(prev => {
        const updated = [...prev, newHelpline];
        setCacheData('helplines', updated);
        idbSet(IDB_KEYS.HELPLINES, updated);
        return updated;
      });
      await bumpMetadataVersion(db, 'helplines');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'helplines');
    }
  };

  const updateHelpline = async (helpline: Helpline) => {
    setHelplines(prev => {
      const updated = prev.map(h => h.id === helpline.id ? helpline : h);
      setCacheData('helplines', updated);
      idbSet(IDB_KEYS.HELPLINES, updated);
      return updated;
    });
    try {
      const { id, ...data } = helpline;
      await setDoc(doc(db, 'helplines', id), data, { merge: true });
      await bumpMetadataVersion(db, 'helplines');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `helplines/${helpline.id}`);
    }
  };

  const deleteHelpline = async (id: string) => {
    setHelplines(prev => {
      const updated = prev.filter(h => h.id !== id);
      setCacheData('helplines', updated);
      idbSet(IDB_KEYS.HELPLINES, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, 'helplines', id));
      await bumpMetadataVersion(db, 'helplines');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `helplines/${id}`);
    }
  };

  const updateAppContent = async (content: AppContent) => {
    setAppContent(content);
    safeLocalStorageSet('agri_cache_app_content', JSON.stringify(content));
    idbSet(IDB_KEYS.APP_CONTENT, content);
    prefetchContentImages(content);
    try {
      await setDoc(doc(db, 'settings', 'content'), content);
      await bumpMetadataVersion(db, 'content');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/content');
    }
  };

  const updateFooterContent = async (footer: FooterConfig) => {
    const updated: AppContent = {
      ...(appContent || {
        branding: { name: 'फल्सावदिया कृषि बाजार', tagline: 'किसान का भरोसा, हमारी पहचान', logo: '' },
        banners: [],
        videos: [],
        youtubeChannel: { url: '', label: '' },
        partners: [],
        whatsappSection: { title: '', description: '', mode: 'group' as const, groupLink: '' },
        contactInfo: { whatsapp: '', address: '' }
      }),
      footer
    };
    await updateAppContent(updated);
  };

  const updateLegalPagesContent = async (content: LegalPagesContent) => {
    try {
      await setDoc(doc(db, 'settings', 'legalPages'), content, { merge: true });
      const merged = mergeLegalPages(content);
      setLegalPagesContent(merged);
      localStorage.setItem('agri_cache_legal_pages', JSON.stringify(merged));
      idbSet(IDB_KEYS.LEGAL_PAGES, merged);
      await bumpMetadataVersion(db, 'legalPages');
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
      idbSet(IDB_KEYS.LEGAL_PAGES, updated);
      await bumpMetadataVersion(db, 'legalPages');
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
      idbSet(IDB_KEYS.INVOICE_TEMPLATE, merged);
      await bumpMetadataVersion(db, 'invoiceTemplate');
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
      idbSet(IDB_KEYS.INVOICE_TEMPLATE, defaults);
      await bumpMetadataVersion(db, 'invoiceTemplate');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/invoiceTemplate');
      throw error;
    }
  };

  const updateDeliveryEmailTemplate = async (template: DeliveryEmailTemplateConfig) => {
    try {
      const payload = {
        ...template,
        lastUpdated: Date.now(),
      };
      await setDoc(doc(db, 'settings', 'deliveryEmailTemplate'), payload, { merge: true });
      const merged = mergeDeliveryEmailTemplate(payload);
      setDeliveryEmailTemplate(merged);
      localStorage.setItem('agri_cache_delivery_email_template', JSON.stringify(merged));
      idbSet(IDB_KEYS.DELIVERY_EMAIL_TEMPLATE, merged);
      await bumpMetadataVersion(db, 'deliveryEmailTemplate');

      // Also notify local server if running
      try {
        await fetch('/api/admin/delivery/email-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        });
      } catch (e) {
        console.warn("Server email template sync notice:", e);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/deliveryEmailTemplate');
      throw error;
    }
  };

  const resetDeliveryEmailTemplate = async () => {
    try {
      const defaults = { ...DEFAULT_DELIVERY_EMAIL_TEMPLATE, lastUpdated: Date.now() };
      await setDoc(doc(db, 'settings', 'deliveryEmailTemplate'), defaults);
      setDeliveryEmailTemplate(defaults);
      localStorage.setItem('agri_cache_delivery_email_template', JSON.stringify(defaults));
      idbSet(IDB_KEYS.DELIVERY_EMAIL_TEMPLATE, defaults);
      await bumpMetadataVersion(db, 'deliveryEmailTemplate');

      try {
        await fetch('/api/admin/delivery/email-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaults),
        });
      } catch (e) {
        console.warn("Server email template sync notice:", e);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/deliveryEmailTemplate');
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
      idbSet(IDB_KEYS.DELIVERY_CONFIG, merged);
      await bumpMetadataVersion(db, 'deliveryConfig');

      // Synchronize with appContent so that any legacy consumers stay perfectly updated
      if (appContent) {
        const updatedAppContent = {
          ...appContent,
          isDeliveryActive: config.isDeliveryActive,
        };
        setAppContent(updatedAppContent);
        localStorage.setItem('agri_cache_app_content', JSON.stringify(updatedAppContent));
        idbSet(IDB_KEYS.APP_CONTENT, updatedAppContent);
        try {
          await setDoc(doc(db, 'settings', 'appContent'), { isDeliveryActive: config.isDeliveryActive }, { merge: true });
        } catch (e) {
          console.warn("Synced delivery active to appContent settings:", e);
        }
      }
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
      idbSet(IDB_KEYS.DELIVERY_CONFIG, defaults);
      await bumpMetadataVersion(db, 'deliveryConfig');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/deliveryConfig');
      throw error;
    }
  };

  const forcePushAllUpdates = async (message?: string) => {
    try {
      await forcePushMetadataVersion(db, message);
      const syncRes = await syncDataIfVersionChanged(db, { forceSync: true, isAdmin: true });
      if (syncRes.updated && syncRes.newData) {
        if (syncRes.newData.products) setProducts(syncRes.newData.products);
        if (syncRes.newData.categories) setCategories(sortCategoriesByOrder(syncRes.newData.categories));
        if (syncRes.newData.agriIssues) setAgriIssues(syncRes.newData.agriIssues);
        if (syncRes.newData.helplines) setHelplines(syncRes.newData.helplines);
        if (syncRes.newData.appContent) setAppContent(syncRes.newData.appContent);
        if (syncRes.newData.deliveryConfig) setDeliveryConfig(mergeDeliveryConfig(syncRes.newData.deliveryConfig));
      }
    } catch (error) {
      console.error("Force push all updates error:", error);
      throw error;
    }
  };

  const forceSyncCatalog = async () => {
    try {
      const syncRes = await syncDataIfVersionChanged(db, { forceSync: true, isAdmin });
      if (syncRes.updated && syncRes.newData) {
        if (syncRes.newData.products) setProducts(syncRes.newData.products);
        if (syncRes.newData.categories) setCategories(sortCategoriesByOrder(syncRes.newData.categories));
        if (syncRes.newData.agriIssues) setAgriIssues(syncRes.newData.agriIssues);
        if (syncRes.newData.helplines) setHelplines(syncRes.newData.helplines);
        if (syncRes.newData.appContent) setAppContent(syncRes.newData.appContent);
        if (syncRes.newData.deliveryConfig) setDeliveryConfig(mergeDeliveryConfig(syncRes.newData.deliveryConfig));
      }
    } catch (error) {
      console.error("Manual catalog sync error:", error);
    }
  };

  const updateUserSettings = async (settings: UserSettings) => {
    const key = settings.geminiApiKey?.trim() || '';
    if (typeof window !== 'undefined') {
      localStorage.setItem('falsawdiya_user_gemini_api_key', key);
    }
    setUserSettings({ geminiApiKey: key });

    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        geminiApiKey: key
      });
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
      deliveryEmailTemplate,
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
      removeFeaturedProduct,
      reorderFeaturedProducts,
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
      updateFooterContent,
      updateLegalPagesContent,
      resetLegalPageContent,
      updateInvoiceTemplate,
      resetInvoiceTemplate,
      updateDeliveryEmailTemplate,
      resetDeliveryEmailTemplate,
      updateDeliveryConfig,
      resetDeliveryConfig,
      forcePushAllUpdates,
      forceSyncCatalog,
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
