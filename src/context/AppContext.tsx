import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CropAdvice, CategoryData, AgriIssue, ImageSource, UserRecord, Helpline } from '../types';
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
  helplines: Helpline[];
  appContent: AppContent | null;
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
  clearAllProducts: () => Promise<void>;
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
  updateUserSettings: (settings: UserSettings) => Promise<void>;
  updateUserStatus: (uid: string, isBlocked: boolean) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>(CATEGORIES);
  const [agriIssues, setAgriIssues] = useState<AgriIssue[]>([]);
  const [helplines, setHelplines] = useState<Helpline[]>([]);
  const [appContent, setAppContent] = useState<AppContent | null>(null);
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
      markSyncDone();
      setIsQuotaExceeded(false);
    }, (error) => {
      console.error("Products listener error:", error);
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
        markSyncDone();
      }
      setIsQuotaExceeded(false);
    }, (error) => {
      console.error("Categories listener error:", error);
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
      console.error("AgriIssues listener error:", error);
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
      console.error("Helplines listener error:", error);
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

  const clearAllProducts = async () => {
    if (!isAdmin) {
      console.warn("Only admins can clear all products.");
      return;
    }
    
    try {
      const q = collection(db, 'products');
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'products', d.id)));
      await Promise.all(deletePromises);
      setProducts([]);
      localStorage.removeItem('last_agri_sync_date'); // Clear sync flag to force refresh
      console.log("All products deleted from Firestore.");
    } catch (error) {
      console.error("Error clearing products:", error);
    }
  };

  // One-time cleanup effect for Admins requested by user
  useEffect(() => {
    const performCleanup = async () => {
      const cleanupDone = localStorage.getItem('products_cleanup_v1');
      if (isAdmin && !cleanupDone) {
        console.log("Performing requested products cleanup...");
        await clearAllProducts();
        localStorage.setItem('products_cleanup_v1', 'true');
        alert("सभी पुराने प्रोडक्ट्स डिलीट कर दिए गए हैं। (All old products have been deleted as requested)");
      }
    };
    performCleanup();
  }, [isAdmin]);

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
      clearAllProducts,
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
