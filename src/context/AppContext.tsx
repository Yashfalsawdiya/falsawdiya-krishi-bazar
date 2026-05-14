import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, CropAdvice, CategoryData, AgriIssue, ImageSource } from '../types';
import { PRODUCTS, CROP_ADVICE, CATEGORIES } from '../data/mockData';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
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
  query,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { validateGmailAccount } from '../lib/authUtils';

export interface AppContent {
  branding: {
    name: string;
    tagline: string;
    logo: string | ImageSource;
    pwaIcon?: string | ImageSource;
    androidIcon?: string | ImageSource;
    splashLogo?: string | ImageSource;
    showHeroText?: boolean;
  };
  loginText?: string;
  adminEmails?: string[];
  isAppActive?: boolean;
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
  contactInfo: {
    whatsapp: string;
    address: string;
  };
  apiKeyGuideVideoUrl?: string;
  offers?: {
    show: boolean;
    title: string;
    items: { id: string; image: string | ImageSource; title: string; link?: string }[];
  };
  festivalOffer?: {
    show: boolean;
    title: string;
    subtitle: string;
    image: string | ImageSource;
    theme: 'diwali' | 'holi' | 'general' | 'monsoon' | 'rakhi' | 'navratri';
    link?: string;
  };
}

export interface UserSettings {
  geminiApiKey: string;
}

interface AppContextType {
  products: Product[];
  categories: CategoryData[];
  agriIssues: AgriIssue[];
  appContent: AppContent | null;
  user: FirebaseUser | null;
  isAdmin: boolean;
  userSettings: UserSettings | null;
  loading: boolean;
  isQuotaExceeded: boolean;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (category: Omit<CategoryData, 'id'>) => Promise<void>;
  updateCategory: (category: CategoryData) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addAgriIssue: (issue: Omit<AgriIssue, 'id'>) => Promise<void>;
  updateAgriIssue: (issue: AgriIssue) => Promise<void>;
  deleteAgriIssue: (id: string) => Promise<void>;
  updateAppContent: (content: AppContent) => Promise<void>;
  updateUserSettings: (settings: UserSettings) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  triggerDataSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Cache Keys
const CACHE_PRODUCTS = 'agri_cache_products';
const CACHE_CATEGORIES = 'agri_cache_categories';
const CACHE_ISSUES = 'agri_cache_issues';
const CACHE_CONTENT = 'agri_cache_content';
const CACHE_LAST_SYNC = 'agri_last_sync_time';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem(CACHE_PRODUCTS);
    return cached ? JSON.parse(cached) : PRODUCTS;
  });
  const [categories, setCategories] = useState<CategoryData[]>(() => {
    const cached = localStorage.getItem(CACHE_CATEGORIES);
    return cached ? JSON.parse(cached) : CATEGORIES;
  });
  const [agriIssues, setAgriIssues] = useState<AgriIssue[]>(() => {
    const cached = localStorage.getItem(CACHE_ISSUES);
    return cached ? JSON.parse(cached) : [];
  });
  const [appContent, setAppContent] = useState<AppContent | null>(() => {
    const cached = localStorage.getItem(CACHE_CONTENT);
    return cached ? JSON.parse(cached) : null;
  });
  
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  const triggerDataUpdateTimestamp = async () => {
    try {
      await setDoc(doc(db, 'settings', 'sync'), { lastUpdate: Date.now() });
    } catch (e) {
      console.error("Error updating sync timestamp:", e);
    }
  };

  const syncAllData = useCallback(async () => {
    console.log("Syncing all data with Firebase...");
    try {
      // 1. Fetch Categories
      const qCats = query(collection(db, 'categories'), orderBy('order'));
      const catsSnap = await getDocs(qCats);
      const cats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CategoryData));
      if (cats.length > 0) {
        setCategories(cats);
        localStorage.setItem(CACHE_CATEGORIES, JSON.stringify(cats));
      }

      // 2. Fetch Products
      const qProds = query(collection(db, 'products'), orderBy('hindiName'));
      const prodsSnap = await getDocs(qProds);
      const prods = prodsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(prods);
      localStorage.setItem(CACHE_PRODUCTS, JSON.stringify(prods));

      // 3. Fetch AgriIssues
      const issuesSnap = await getDocs(collection(db, 'agriIssues'));
      const issues = issuesSnap.docs.map(d => ({ id: d.id, ...d.data() } as AgriIssue));
      setAgriIssues(issues);
      localStorage.setItem(CACHE_ISSUES, JSON.stringify(issues));

      // 4. Fetch App Content
      const contentSnap = await getDoc(doc(db, 'settings', 'content'));
      if (contentSnap.exists()) {
        const content = contentSnap.data() as AppContent;
        setAppContent(content);
        localStorage.setItem(CACHE_CONTENT, JSON.stringify(content));
      }

      // Update sync time
      const now = Date.now();
      localStorage.setItem(CACHE_LAST_SYNC, now.toString());

    } catch (error) {
      console.error("Sync Error:", error);
      handleFirestoreError(error, OperationType.GET, 'full_data_sync');
    }
  }, []);

  const checkSyncStatus = useCallback(async () => {
    try {
      const syncSnap = await getDoc(doc(db, 'settings', 'sync'));
      if (syncSnap.exists()) {
        const serverLastUpdate = syncSnap.data().lastUpdate || 0;
        const localLastSync = parseInt(localStorage.getItem(CACHE_LAST_SYNC) || '0');

        if (serverLastUpdate > localLastSync) {
          await syncAllData();
        } else {
          console.log("App data is up to date (Loaded from Cache)");
        }
      } else {
        // First time or sync doc missing
        await syncAllData();
        await triggerDataUpdateTimestamp();
      }
    } catch (e) {
      console.warn("Sync check failed, using cache/mock data", e);
    }
  }, [syncAllData]);

  useEffect(() => {
    const initialize = async () => {
      // 1. Listen for Auth
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Strict Validation Check
          const validation = validateGmailAccount(firebaseUser.email, firebaseUser.emailVerified);
          if (!validation.isValid) {
            console.error("Auth Strict Validation Failed:", validation.error);
            await signOut(auth);
            setUser(null);
            alert(`प्रवेश वर्जित: ${validation.error}`);
            setLoading(false);
            return;
          }
        }

        setUser(firebaseUser);
        if (firebaseUser) {
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            const mainAdminEmail = 'yashfalsawdiya36@gmail.com';
            
            // We need content to check backup admins, but we might have it in cache
            let contentData = appContent;
            if (!contentData) {
              const snap = await getDoc(doc(db, 'settings', 'content'));
              contentData = snap.exists() ? snap.data() as AppContent : null;
            }
            
            const backupAdmins = contentData?.adminEmails || [];
            const isAdminEmail = firebaseUser.email === mainAdminEmail || backupAdmins.includes(firebaseUser.email || '');
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setIsAdmin(userData.role === 'admin' || isAdminEmail);
              setUserSettings({ geminiApiKey: userData.geminiApiKey || '' });
              
              if (isAdminEmail && userData.role !== 'admin') {
                await updateDoc(userDocRef, { role: 'admin' });
              }
            } else {
              const defaultSettings = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: isAdminEmail ? 'admin' : 'user',
                geminiApiKey: ''
              };
              await setDoc(userDocRef, defaultSettings);
              setIsAdmin(isAdminEmail);
              setUserSettings({ geminiApiKey: '' });
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'auth_init');
          }
        } else {
          setIsAdmin(false);
          setUserSettings(null);
        }
        setLoading(false);
      });

      // 2. Perform Smart Sync
      await checkSyncStatus();
    };

    initialize();
  }, [checkSyncStatus]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Add custom parameter to force account picker
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      // Perform immediate validation after login
      const validation = validateGmailAccount(result.user.email, result.user.emailVerified);
      if (!validation.isValid) {
        await signOut(auth);
        throw new Error(validation.error);
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      alert("लॉगिन में समस्या आई: " + (error.message || "अज्ञात त्रुटि"));
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      await addDoc(collection(db, 'products'), product);
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      const { id, ...data } = updatedProduct;
      await setDoc(doc(db, 'products', id), data, { merge: true });
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updatedProduct.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const addCategory = async (category: Omit<CategoryData, 'id'>) => {
    try {
      await addDoc(collection(db, 'categories'), category);
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const updateCategory = async (category: CategoryData) => {
    try {
      const { id, ...data } = category;
      await setDoc(doc(db, 'categories', id), data, { merge: true });
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${category.id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const addAgriIssue = async (issue: Omit<AgriIssue, 'id'>) => {
    try {
      await addDoc(collection(db, 'agriIssues'), issue);
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'agriIssues');
    }
  };

  const updateAgriIssue = async (issue: AgriIssue) => {
    try {
      const { id, ...data } = issue;
      await setDoc(doc(db, 'agriIssues', id), data, { merge: true });
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agriIssues/${issue.id}`);
    }
  };

  const deleteAgriIssue = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'agriIssues', id));
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `agriIssues/${id}`);
    }
  };

  const updateAppContent = async (content: AppContent) => {
    try {
      await setDoc(doc(db, 'settings', 'content'), content);
      await triggerDataUpdateTimestamp();
      await syncAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/content');
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

  return (
    <AppContext.Provider value={{ 
      products, 
      categories,
      agriIssues,
      appContent,
      user, 
      isAdmin, 
      userSettings,
      loading,
      isQuotaExceeded,
      addProduct, 
      updateProduct, 
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      addAgriIssue,
      updateAgriIssue,
      deleteAgriIssue,
      updateAppContent,
      updateUserSettings,
      login,
      logout,
      triggerDataSync: syncAllData
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
