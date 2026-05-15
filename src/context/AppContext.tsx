import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CropAdvice, CategoryData, AgriIssue, ImageSource, UserRecord } from '../types';
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
  lastDatabaseUpdate?: number; // Last time any DB collection was modified
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
  allUsers: UserRecord[];
  loadProducts: () => Unsubscribe | undefined;
  loadCategoryData: () => Unsubscribe | undefined;
  loadAgriIssues: () => Unsubscribe | undefined;
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
  const [appContent, setAppContent] = useState<AppContent | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);

  // Sync Logic: Check if we need to sync today (after 10 AM)
  const isSyncNeeded = () => {
    // If a database update is detected via AppContent, we always need sync
    const lastProcessedUpdate = Number(localStorage.getItem('last_processed_db_update') || '0');
    const cloudLastUpdate = appContent?.lastDatabaseUpdate || 0;
    
    if (cloudLastUpdate > lastProcessedUpdate) {
      console.log("Database update detected from cloud, forcing sync...");
      return true;
    }

    const lastSyncStr = localStorage.getItem('last_agri_sync_date');
    const now = new Date();
    const todayStr = now.toDateString();
    
    // If we already synced today, no need
    if (lastSyncStr === todayStr) return false;
    
    // If it's before 10 AM, we use yesterday's cache (unless first time)
    if (now.getHours() < 10 && lastSyncStr) return false;
    
    return true;
  };

  const markSyncDone = () => {
    localStorage.setItem('last_agri_sync_date', new Date().toDateString());
    if (appContent?.lastDatabaseUpdate) {
      localStorage.setItem('last_processed_db_update', appContent.lastDatabaseUpdate.toString());
    }
  };

  const notifyDatabaseChange = async () => {
    try {
      const timestamp = Date.now();
      const contentRef = doc(db, 'settings', 'content');
      const snap = await getDoc(contentRef);
      if (snap.exists()) {
        await updateDoc(contentRef, { lastDatabaseUpdate: timestamp });
      }
      localStorage.setItem('last_processed_db_update', timestamp.toString());
    } catch (e) {
      console.error("Error notifying DB change:", e);
    }
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
    const q = query(collection(db, 'products'), orderBy('hindiName'));
    
    // First, seed from cache if available for ultra-fast load
    const cached = getCachedData<Product>('products');
    if (cached && products.length === 0) {
      setProducts(cached);
    }

    const fetch = async () => {
      try {
        let snapshot;
        // Only fetch from server if sync is needed (once a day or if cache empty)
        if (isSyncNeeded() || !cached) {
          try {
            snapshot = await getDocsFromServer(q);
            markSyncDone(); 
            const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(prods);
            setCacheData('products', prods);
          } catch (serverError) {
            console.warn("Live sync failed, using cache:", serverError);
            snapshot = await getDocsFromCache(q);
            const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(prods);
          }
        } else {
          // Already have fresh enough cache in localStorage/Firestore cache
          try {
            snapshot = await getDocsFromCache(q);
            if (!snapshot.empty) {
              const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
              setProducts(prods);
              setCacheData('products', prods);
            }
          } catch (e) {
            // Fallback to server if cache fetch fails
            snapshot = await getDocsFromServer(q);
            const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(prods);
            setCacheData('products', prods);
          }
        }
      } catch (error) {
        const err = handleFirestoreError(error, OperationType.LIST, 'products');
        if (err?.error.toLowerCase().includes('quota')) {
          setIsQuotaExceeded(true);
        }
      }
    };

    fetch();
    return () => {};
  };

  const loadCategoryData = () => {
    const q = query(collection(db, 'categories'), orderBy('order'));
    
    // Seed from cache immediately
    const cached = getCachedData<CategoryData>('categories');
    if (cached) {
      setCategories(cached);
    }

    const fetch = async (forceServer = false) => {
      try {
        let snapshot;
        // Only fetch from server if sync is needed or forced
        if (forceServer || isSyncNeeded() || !cached) {
          try {
            snapshot = await getDocsFromServer(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryData));
            if (data.length > 0) {
              setCategories(data);
              setCacheData('categories', data);
              markSyncDone(); // Mark that we did a sync check today
            }
          } catch (e) {
            console.warn("Categories server fetch failed, trying cache:", e);
            snapshot = await getDocsFromCache(q);
            if (!snapshot.empty) {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryData));
              setCategories(data);
            }
          }
        } else {
          // Use cache - zero Firestore cost
          try {
            snapshot = await getDocsFromCache(q);
            if (!snapshot.empty) {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryData));
              setCategories(data);
              setCacheData('categories', data);
            }
          } catch (e) {
            // Fallback
          }
        }
      } catch (error) {
        const err = handleFirestoreError(error, OperationType.LIST, 'categories');
        if (err?.error.toLowerCase().includes('quota')) {
          setIsQuotaExceeded(true);
        }
      }
    };

    fetch();

    // For admins or when sync is needed, we want reactive updates
    if (isAdmin || isSyncNeeded()) {
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryData));
          setCategories(data);
          setCacheData('categories', data);
        }
      }, (error) => {
        console.error("Categories snapshot failed:", error);
      });
    }

    return () => {};
  };

  const loadAgriIssues = () => {
    const q = collection(db, 'agriIssues');
    
    const cached = getCachedData<AgriIssue>('agriIssues');
    if (cached && agriIssues.length === 0) {
      setAgriIssues(cached);
    }

    const fetch = async () => {
      try {
        let snapshot;
        if (isSyncNeeded() || !cached) {
          try {
            snapshot = await getDocsFromServer(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgriIssue));
            setAgriIssues(data);
            setCacheData('agriIssues', data);
            markSyncDone();
          } catch (e) {
            snapshot = await getDocsFromCache(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgriIssue));
            setAgriIssues(data);
          }
        } else {
          try {
            snapshot = await getDocsFromCache(q);
            if (!snapshot.empty) {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgriIssue));
              setAgriIssues(data);
              setCacheData('agriIssues', data);
            }
          } catch (e) {
            // Use cached state
          }
        }
      } catch (error) {
        const err = handleFirestoreError(error, OperationType.LIST, 'agriIssues');
        if (err?.error.toLowerCase().includes('quota')) {
          setIsQuotaExceeded(true);
        }
      }
    };

    fetch();
    return () => {};
  };

  // Dedicated effect for app content - important for branding
  useEffect(() => {
    const unsubscribeContent = onSnapshot(doc(db, 'settings', 'content'), (snapshot) => {
      if (snapshot.exists()) {
        setAppContent(snapshot.data() as AppContent);
      }
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.GET, 'settings/content');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });
    return () => unsubscribeContent();
  }, []);

  // Re-trigger sync when appContent updates (reactive database changes)
  useEffect(() => {
    if (appContent?.lastDatabaseUpdate) {
      const lastProcessed = Number(localStorage.getItem('last_processed_db_update') || '0');
      if (appContent.lastDatabaseUpdate > lastProcessed) {
        console.log("Database update detected via AppContent, refreshing data...");
        loadProducts();
        loadCategoryData();
        loadAgriIssues();
      }
    }
  }, [appContent?.lastDatabaseUpdate]);

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
      const docRef = await addDoc(collection(db, 'products'), product);
      const newProduct = { ...product, id: docRef.id } as Product;
      
      // Update local state and cache
      setProducts(prev => {
        const updated = [...prev, newProduct];
        setCacheData('products', updated);
        return updated;
      });
      
      await notifyDatabaseChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      const { id, ...data } = updatedProduct;
      await setDoc(doc(db, 'products', id), data, { merge: true });
      
      // Update local state and cache
      setProducts(prev => {
        const updated = prev.map(p => p.id === id ? updatedProduct : p);
        setCacheData('products', updated);
        return updated;
      });

      await notifyDatabaseChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${updatedProduct.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      
      // Update local state and cache
      setProducts(prev => {
        const updated = prev.filter(p => p.id !== id);
        setCacheData('products', updated);
        return updated;
      });

      await notifyDatabaseChange();
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
      await notifyDatabaseChange();
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
      const docRef = await addDoc(collection(db, 'categories'), category);
      const newCategory = { ...category, id: docRef.id } as CategoryData;
      
      setCategories(prev => {
        const updated = [...prev, newCategory].sort((a, b) => a.order - b.order);
        setCacheData('categories', updated);
        return updated;
      });

      await notifyDatabaseChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const updateCategory = async (category: CategoryData) => {
    try {
      const { id, ...data } = category;
      await setDoc(doc(db, 'categories', id), data, { merge: true });
      
      setCategories(prev => {
        const updated = prev.map(c => c.id === id ? category : c).sort((a, b) => a.order - b.order);
        setCacheData('categories', updated);
        return updated;
      });

      await notifyDatabaseChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${category.id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      
      setCategories(prev => {
        const updated = prev.filter(c => c.id !== id);
        setCacheData('categories', updated);
        const lastSyncStr = localStorage.getItem('last_agri_sync_date');
        if (updated.length === 0 && lastSyncStr) {
          localStorage.removeItem('last_agri_sync_date'); // Force re-fetch if empty
        }
        return updated;
      });

      await notifyDatabaseChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const addAgriIssue = async (issue: Omit<AgriIssue, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'agriIssues'), issue);
      const newIssue = { ...issue, id: docRef.id } as AgriIssue;
      
      setAgriIssues(prev => {
        const updated = [...prev, newIssue];
        setCacheData('agriIssues', updated);
        return updated;
      });

      await notifyDatabaseChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'agriIssues');
    }
  };

  const updateAgriIssue = async (issue: AgriIssue) => {
    try {
      const { id, ...data } = issue;
      await setDoc(doc(db, 'agriIssues', id), data, { merge: true });
      
      setAgriIssues(prev => {
        const updated = prev.map(i => i.id === id ? issue : i);
        setCacheData('agriIssues', updated);
        return updated;
      });

      await notifyDatabaseChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agriIssues/${issue.id}`);
    }
  };

  const deleteAgriIssue = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'agriIssues', id));
      
      setAgriIssues(prev => {
        const updated = prev.filter(i => i.id !== id);
        setCacheData('agriIssues', updated);
        return updated;
      });

      await notifyDatabaseChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `agriIssues/${id}`);
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
