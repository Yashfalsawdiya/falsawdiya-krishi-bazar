import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CropAdvice } from '../types';
import { PRODUCTS, CROP_ADVICE } from '../data/mockData';
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
  banners: { id: string; image: string; title: string; subtitle: string }[];
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
  appContent: AppContent | null;
  user: FirebaseUser | null;
  isAdmin: boolean;
  userSettings: UserSettings | null;
  loading: boolean;
  isQuotaExceeded: boolean;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateAppContent: (content: AppContent) => Promise<void>;
  updateUserSettings: (settings: UserSettings) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [appContent, setAppContent] = useState<AppContent | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Check if user is admin and get settings
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          // Check if user is the main admin or a backup admin
          const mainAdminEmail = 'yashfalsawdiya36@gmail.com';
          
          // Get latest content to check backup admins
          const contentSnap = await getDoc(doc(db, 'settings', 'content'));
          const contentData = contentSnap.exists() ? contentSnap.data() as AppContent : null;
          const backupAdmins = contentData?.adminEmails || [];
          
          const isAdminEmail = firebaseUser.email === mainAdminEmail || backupAdmins.includes(firebaseUser.email || '');
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsAdmin(userData.role === 'admin' || isAdminEmail);
            setUserSettings({ geminiApiKey: userData.geminiApiKey || '' });
            
            // If they are admin by email but not in doc, update doc
            if (isAdminEmail && userData.role !== 'admin') {
              await updateDoc(userDocRef, { role: 'admin' });
            }
          } else {
            // Create default user doc
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
          const err = handleFirestoreError(error, OperationType.GET, 'auth_init');
          if (err?.error.toLowerCase().includes('quota')) {
            setIsQuotaExceeded(true);
          }
        }
      } else {
        setIsAdmin(false);
        setUserSettings(null);
      }
      setLoading(false);
    });

    // Listen for products
    const qProducts = query(collection(db, 'products'), orderBy('hindiName'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      if (!snapshot.empty) {
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        // Remove potential duplicates just in case
        const uniqueProds = Array.from(new Map(prods.map(p => [p.id, p])).values());
        setProducts(uniqueProds);
      } else {
        setProducts([]);
      }
    }, (error) => {
      const err = handleFirestoreError(error, OperationType.LIST, 'products');
      if (err?.error.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
      }
    });

    // Listen for app content
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

    return () => {
      unsubscribeAuth();
      unsubscribeProducts();
      unsubscribeContent();
    };
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
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

  return (
    <AppContext.Provider value={{ 
      products, 
      appContent,
      user, 
      isAdmin, 
      userSettings,
      loading,
      isQuotaExceeded,
      addProduct, 
      updateProduct, 
      deleteProduct,
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
