import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CropAdvice, CategoryData, AgriIssue } from '../types';
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
  query,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { isSecureGmailAccount } from '../lib/authUtils';

export interface AppContent {
  branding: {
    name: string;
    tagline: string;
    logo: string;
    pwaIcon?: string;
  };
  loginText?: string;
  adminEmails?: string[];
  isAppActive?: boolean;
  banners: { id: string; image: string; title: string; subtitle: string; showText?: boolean }[];
  videos: { id: string; title: string; videoUrl: string; thumbnail: string }[];
  youtubeChannel: {
    url: string;
    label: string;
  };
  partners: { id: string; name: string; logo: string }[];
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
    items: { id: string; image: string; title: string; link?: string }[];
  };
  festivalOffer?: {
    show: boolean;
    title: string;
    subtitle: string;
    image: string;
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
  isBlocked: boolean;
  userSettings: UserSettings | null;
  loading: boolean;
  isQuotaExceeded: boolean;
  users: any[];
  onlineUsersCount: number;
  fetchProducts: (force?: boolean) => Promise<void>;
  fetchCategories: (force?: boolean) => Promise<void>;
  fetchAgriIssues: (force?: boolean) => Promise<void>;
  blockUser: (uid: string, blocked: boolean) => Promise<void>;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [categories, setCategories] = useState<CategoryData[]>(CATEGORIES);
  const [agriIssues, setAgriIssues] = useState<AgriIssue[]>([]);
  const [appContent, setAppContent] = useState<AppContent | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  // Remove background activity tracking to save writes
  useEffect(() => {
    if (!user || isBlocked) return;

    const updateActivity = async () => {
      try {
        // Only update once per session on login to save writes
        const lastUpdate = localStorage.getItem(`last_active_${user.uid}`);
        const now = Date.now();
        if (lastUpdate && now - parseInt(lastUpdate) < 1000 * 60 * 60) {
          return; // Skip if updated in last hour
        }

        await updateDoc(doc(db, 'users', user.uid), {
          lastActive: new Date().toISOString()
        });
        localStorage.setItem(`last_active_${user.uid}`, now.toString());
      } catch (e) {
        // console.error("Failed to update activity", e);
      }
    };

    updateActivity();
    // Removed interval update
  }, [user, isBlocked]);

  useEffect(() => {
    // 1. Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Strict Security Check: Verify if email is a legitimate Gmail account
        const securityCheck = isSecureGmailAccount(firebaseUser.email);
        if (!securityCheck.isValid) {
          console.error("Security Violation: Non-secure or fake email detected", firebaseUser.email);
          await signOut(auth);
          setUser(null);
          alert(securityCheck.error);
          setLoading(false);
          return;
        }

        setUser(firebaseUser);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          // Get user doc once
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsBlocked(!!userData.isBlocked);
            setIsAdmin(userData.role === 'admin' || firebaseUser.email === 'yashfalsawdiya36@gmail.com');
            setUserSettings({ geminiApiKey: userData.geminiApiKey || '' });
          } else {
            // Create doc for new user
            const isMainAdmin = firebaseUser.email === 'yashfalsawdiya36@gmail.com';
            const defaultSettings = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: isMainAdmin ? 'admin' : 'user',
              geminiApiKey: '',
              createdAt: new Date().toISOString(),
              lastActive: new Date().toISOString(),
              isBlocked: false
            };
            await setDoc(userDocRef, defaultSettings);
            setIsAdmin(isMainAdmin);
            setIsBlocked(false);
            setUserSettings({ geminiApiKey: '' });
          }
        } catch (error) {
          const err = handleFirestoreError(error, OperationType.GET, 'auth_init');
          if (err?.error.toLowerCase().includes('quota')) setIsQuotaExceeded(true);
        }
      } else {
        setIsAdmin(false);
        setIsBlocked(false);
        setUserSettings(null);
      }
      setLoading(false);
    });

    // 2. Initial Data Fetch (Runs once per app session)
    const fetchInitialData = async () => {
      try {
        // Prefer cache if available
        const contentSnap = await getDoc(doc(db, 'settings', 'content'));
        if (contentSnap.exists()) setAppContent(contentSnap.data() as AppContent);

        // We can fetch products and categories once too
        // For performance/quota, we don't use onSnapshot here anymore
      } catch (e) {}
    }
    fetchInitialData();

    return () => unsubscribeAuth();
  }, []);

  // On-demand fetching to satisfy "refresh only when clicked"
  const refreshAppData = async () => {
    try {
      setLoading(true);
      // Content
      const contentSnap = await getDoc(doc(db, 'settings', 'content'));
      if (contentSnap.exists()) setAppContent(contentSnap.data() as AppContent);

      // Categories
      const qCategories = query(collection(db, 'categories'), orderBy('order'));
      const catSnap = await getDoc(doc(db, 'settings', 'content')); // Placeholder
      // We will actually implement real fetching in the pages now to be even more efficient
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };


  // Now, we move the actual data subscriptions to be LAZY or at least less frequent
  // To keep the app functional without rewriting every page, I will keep onSnapshot 
  // but I will add logic to skip them if the component isn't mounted? 
  // No, onSnapshot is only active while the component is mounted.
  // BUT here in AppContext, they are mounted GLOBAL. 
  // I will remove the global listeners and create fetch functions instead.


  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to avoid automatic login with local/fake cached accounts
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Final security check at login time
      const securityCheck = isSecureGmailAccount(user.email);
      if (!securityCheck.isValid) {
        await signOut(auth);
        alert(securityCheck.error);
        return;
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
    console.log(`Attempting to delete product with ID: ${id}`);
    try {
      const productRef = doc(db, 'products', id);
      await deleteDoc(productRef);
      console.log(`Successfully deleted product: ${id}`);
    } catch (error: any) {
      console.error(`Failed to delete product ${id}:`, error);
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

  const blockUser = async (uid: string, blocked: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isBlocked: blocked });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const [lastFetched, setLastFetched] = useState<Record<string, number>>({});

  const fetchProducts = async (force = false) => {
    const now = Date.now();
    if (!force && lastFetched['products'] && now - lastFetched['products'] < 1000 * 60 * 30) return;

    try {
      const qProducts = query(collection(db, 'products'), orderBy('hindiName'));
      const snapshot = await getDoc(doc(db, 'settings', 'content')); // Placeholder trigger
      // Note: we can use getDocs(qProducts) here
      const { getDocs } = await import('firebase/firestore');
      const snap = await getDocs(qProducts);
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
      setLastFetched(prev => ({ ...prev, products: now }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  };

  const fetchCategories = async (force = false) => {
    const now = Date.now();
    if (!force && lastFetched['categories'] && now - lastFetched['categories'] < 1000 * 60 * 60) return;

    try {
      const qCategories = query(collection(db, 'categories'), orderBy('order'));
      const { getDocs } = await import('firebase/firestore');
      const snap = await getDocs(qCategories);
      if (!snap.empty) {
        setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryData)));
        setLastFetched(prev => ({ ...prev, categories: now }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    }
  };

  const fetchAgriIssues = async (force = false) => {
    const now = Date.now();
    if (!force && lastFetched['agriIssues'] && now - lastFetched['agriIssues'] < 1000 * 60 * 60) return;

    try {
      const { getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'agriIssues'));
      setAgriIssues(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgriIssue)));
      setLastFetched(prev => ({ ...prev, agriIssues: now }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'agriIssues');
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
      isBlocked,
      userSettings,
      loading,
      isQuotaExceeded,
      fetchProducts,
      fetchCategories,
      fetchAgriIssues,
      users,
      onlineUsersCount,
      blockUser,
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
