import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CategoryData, Product, AgriIssue, Helpline } from '../types';
// import { CATEGORIES } from '../data/mockData'; // No longer needed
import { 
  Plus, Trash2, Edit2, X, Save, LogIn, LogOut, Loader2, 
  ShoppingBag, Sprout, ChevronRight, Image as ImageIcon, 
  Youtube as YoutubeIcon, Layout, Phone, Key, Star, ArrowUp, ArrowDown,
  ListFilter, Bug, Search, Smartphone, ShieldCheck, Users, Ban, CheckCircle,
  Truck, FileText, Facebook, Instagram, Package, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fileToBase64, cn, compressImage, getDirectImageURL } from '../lib/utils';
import { AppContent } from '../context/AppContext';
import { ImageSource } from '../types';
import DualImageInput from '../components/DualImageInput';
import SmartImage from '../components/SmartImage';
import AdminPagesManager from '../components/AdminPagesManager';
import AdminOrdersManager from '../components/AdminOrdersManager';
import AdminRazorpayManager from '../components/AdminRazorpayManager';

const Admin: React.FC = () => {
  const { 
    products, addProduct, updateProduct, deleteProduct,
    categories, addCategory, updateCategory, deleteCategory,
    agriIssues, addAgriIssue, updateAgriIssue, deleteAgriIssue,
    helplines, addHelpline, updateHelpline, deleteHelpline,
    appContent, updateAppContent,
    user, isAdmin, login, logout, loading,
    allUsers, updateUserStatus,
    loadProducts, loadCategoryData, loadAgriIssues, loadHelplines
  } = useAppContext();

  React.useEffect(() => {
    if (isAdmin) {
      const unsubProducts = loadProducts();
      const unsubCats = loadCategoryData();
      const unsubIssues = loadAgriIssues();
      const unsubHelplines = loadHelplines();
      return () => {
        if (unsubProducts) unsubProducts();
        if (unsubCats) unsubCats();
        if (unsubIssues) unsubIssues();
        if (unsubHelplines) unsubHelplines();
      };
    }
  }, [isAdmin]);
  
  const [activeTab, setActiveTab] = useState<'orders' | 'content' | 'products' | 'categories' | 'encyclopedia' | 'helplines' | 'users' | 'featured' | 'categoryInfo' | 'legalPages' | 'razorpay'>('orders');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryData | null>(null);

  const [editingCategoryForInfo, setEditingCategoryForInfo] = useState<CategoryData | null>(null);
  const [categoryInfoText, setCategoryInfoText] = useState('');
  const [categoryInfoEnabled, setCategoryInfoEnabled] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [isAddingAgriIssue, setIsAddingAgriIssue] = useState(false);
  const [editingAgriIssue, setEditingAgriIssue] = useState<AgriIssue | null>(null);
  const [agriIssueToDelete, setAgriIssueToDelete] = useState<AgriIssue | null>(null);

  const [isAddingHelpline, setIsAddingHelpline] = useState(false);
  const [editingHelpline, setEditingHelpline] = useState<Helpline | null>(null);
  const [helplineToDelete, setHelplineToDelete] = useState<Helpline | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [productForm, setProductForm] = useState<Partial<Product>>({
    customId: '',
    name: '',
    hindiName: '',
    category: '',
    brand: '',
    price: undefined,
    unit: '',
    inStock: true,
    description: '',
    image: { primary: '', fallback: '' },
    crops: [],
    variants: [],
    isFeatured: false,
    featuredOrder: 0,
    dosage: { show: false, value: '' }
  });

  const [categoryForm, setCategoryForm] = useState<Omit<CategoryData, 'id'>>({
    name: '',
    icon: { primary: '', fallback: '' },
    order: 0,
    importantInfo: '',
    isInfoEnabled: false
  });

  const [agriIssueForm, setAgriIssueForm] = useState<Omit<AgriIssue, 'id'>>({
    hindiName: '',
    englishName: '',
    type: 'pest',
    description: '',
    image: { primary: '', fallback: '' },
    relatedProductIds: []
  });

  const [helplineForm, setHelplineForm] = useState<Omit<Helpline, 'id'>>({
    name: '',
    number: '',
    category: '',
    description: '',
    order: 0
  });

  const [contentForm, setContentForm] = useState<AppContent | null>(null);

  // Set default category if not set
  React.useEffect(() => {
    if (!productForm.category && categories.length > 0) {
      setProductForm(prev => ({ ...prev, category: categories[0].id }));
    }
  }, [categories]);

  React.useEffect(() => {
    if (appContent) {
      setContentForm(appContent);
    } else {
      setContentForm({
        banners: [
          { id: '1', image: '', title: 'खाद और बीज पर भारी छूट!', subtitle: 'सीमित समय के लिए ऑफर' },
          { id: '2', image: '', title: 'नई किस्म के सोयाबीन बीज', subtitle: 'अधिक पैदावार की गारंटी' },
          { id: '3', image: '', title: 'फसल सुरक्षा समाधान', subtitle: 'बेहतरीन कीटनाशक उपलब्ध' }
        ],
        videos: [
          { id: 'v1', title: 'आधुनिक खेती की जानकारी', videoUrl: 'https://www.youtube.com/watch?v=9-3-P4mXG3A', thumbnail: '' },
          { id: 'v2', title: 'मिट्टी परीक्षण कैसे करें', videoUrl: 'https://www.youtube.com/watch?v=6Z_L2v_p-m8', thumbnail: '' },
          { id: 'v3', title: 'जैविक खाद बनाने की विधि', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: '' }
        ],
        branding: {
          name: 'फल्सावदिया कृषि बाजार',
          tagline: 'किसान का भरोसा, हमारी पहचान',
          logo: '',
          pwaIcon: '',
          androidIcon: '',
          splashLogo: ''
        },
        loginText: 'ऐप की सुविधाओं का उपयोग करने के लिए कृपया अपनी Gmail ID से लॉगिन करें।',
        adminEmails: [],
        isAppActive: true,
        showBannerText: true,
        youtubeChannel: {
          url: 'https://youtube.com/@falsawdiya',
          label: 'हमारा कृषि चैनल'
        },
        partners: [
          { id: 'p1', name: 'Bayer', logo: '' },
          { id: 'p2', name: 'Syngenta', logo: '' },
          { id: 'p3', name: 'UPL', logo: '' }
        ],
        whatsappSection: {
          title: 'WhatsApp पर जुड़ें',
          description: 'सीधे फोटो भेजें और घर बैठे सामान मंगाएं या दुकान पर आकर ले जाएं।',
          mode: 'direct',
          groupLink: ''
        },
        facebookSection: {
          enabled: true,
          title: 'Facebook पर जुड़ें',
          description: 'हमसे Facebook पर जुड़ें और अपडेट पाएं',
          pageUrl: '',
          buttonText: 'पेज पर जाएं'
        },
        instagramSection: {
          enabled: true,
          title: 'Instagram पर जुड़ें',
          description: 'हमसे Instagram पर जुड़ें और अपडेट पाएं',
          profileUrl: '',
          buttonText: 'प्रोफाइल देखें'
        },
        contactInfo: {
          whatsapp: '918982338046',
          address: 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश'
        },
        isDeliveryActive: true,
        isDeliveryChargesEnabled: false,
        deliveryChargesAmount: 40
      });
    }
  }, [appContent]);

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingProduct) {
        await updateProduct({ ...editingProduct, ...productForm } as Product);
        setEditingProduct(null);
      } else {
        await addProduct(productForm as Omit<Product, 'id'>);
      }
      setIsAdding(false);
      setProductForm({ 
        name: '', 
        hindiName: '', 
        category: categories[0]?.id || '', 
        brand: '', 
        price: undefined, 
        unit: '', 
        inStock: true,
        description: '', 
        image: { primary: '', fallback: '' }, 
        crops: [],
        variants: [],
        isFeatured: false,
        featuredOrder: products.filter(p => p.isFeatured).length + 1,
        dosage: { show: false, value: '' }
      });
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Normalize icon: if it's an object with both sources empty, convert to empty string
      let normalizedIcon = categoryForm.icon;
      if (typeof normalizedIcon !== 'string' && !normalizedIcon.primary && !normalizedIcon.fallback) {
        normalizedIcon = '';
      }

      const finalCategoryData = { ...categoryForm, icon: normalizedIcon };

      if (editingCategory) {
        await updateCategory({ ...editingCategory, ...finalCategoryData } as CategoryData);
        setEditingCategory(null);
      } else {
        await addCategory(finalCategoryData as Omit<CategoryData, 'id'>);
      }
      setIsAddingCategory(false);
      setCategoryForm({ name: '', icon: { primary: '', fallback: '' }, order: categories.length + 1, importantInfo: '', isInfoEnabled: false });
    } catch (error) {
      console.error("Error saving category:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgriIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingAgriIssue) {
        await updateAgriIssue({ ...editingAgriIssue, ...agriIssueForm } as AgriIssue);
        setEditingAgriIssue(null);
      } else {
        await addAgriIssue(agriIssueForm);
      }
      setIsAddingAgriIssue(false);
      setAgriIssueForm({ hindiName: '', englishName: '', type: 'pest', description: '', image: { primary: '', fallback: '' }, relatedProductIds: [] });
    } catch (error) {
      console.error("Error saving agri issue:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleHelplineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingHelpline) {
        await updateHelpline({ ...editingHelpline, ...helplineForm } as Helpline);
        setEditingHelpline(null);
      } else {
        await addHelpline(helplineForm);
      }
      setIsAddingHelpline(false);
      setHelplineForm({ name: '', number: '', category: '', description: '', order: helplines.length + 1 });
    } catch (error) {
      console.error("Error saving helpline:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const seedInitialHelplines = async () => {
    const initialHelplines: Omit<Helpline, 'id'>[] = [
      { name: "फल्सावदिया कृषि बाजार", number: "8982338046", category: "हमारी दुकान", description: "पता: डिंपल चौराहा, शामगढ़ | समय: सुबह 8:00 बजे से रात 8:00 बजे तक (08:00 AM – 08:00 PM)", order: 1 },
      { name: "पशु चिकित्सा हेल्पलाइन", number: "1962", category: "पशुपालन विभाग", description: "बीमार पशुओं के लिए त्वरित मदद", order: 2 },
      { name: "बिजली विभाग (ग्रामीण)", number: "1912", category: "बिजली विभाग", description: "बिजली कटौती या फाल्ट की शिकायत", order: 3 },
      { name: "किसान कॉल सेंटर (KCC)", number: "1800-180-1551", category: "कृषि सेवाएं", description: "कृषि संबंधी किसी भी सलाह के लिए", order: 4 },
      { name: "मौसम विभाग हेल्पलाइन", number: "18001801717", category: "मौसम विभाग", description: "मौसम की जानकारी के लिए", order: 5 },
      { name: "फसल बीमा हेल्पलाइन", number: "18002095959", category: "फसल बीमा सहायता", description: "क्लेम और पॉलिसी की जानकारी", order: 6 },
      { name: "सिंचाई विभाग हेल्पलाइन", number: "181", category: "सिंचाई विभाग", description: "नहर या पानी की समस्या के लिए", order: 7 },
      { name: "मंडी हेल्पलाइन", number: "07552550111", category: "मंडी हेल्पलाइन", description: "मंडी भाव और अन्य जानकारी", order: 8 },
      { name: "एम्बुलेंस", number: "108", category: "आपातकालीन सेवाएँ", description: "स्वास्थ्य आपातकाल के लिए", order: 9 },
      { name: "पुलिस सहायता", number: "100", category: "आपातकालीन सेवाएँ", description: "किसी भी कानूनी मदद के लिए", order: 10 },
      { name: "महिला हेल्पलाइन", number: "1091", category: "महिला हेल्पलाइन", description: "महिलाओं की सुरक्षा के लिए", order: 11 },
      { name: "बैंक / KCC सहायता", number: "1800112211", category: "बैंक / केसीसी सहायता", description: "किसान क्रेडिट कार्ड जानकारी", order: 12 }
    ];

    setIsSaving(true);
    try {
      for (const h of initialHelplines) {
        await addHelpline(h);
      }
      alert('शुरुआती हेल्पलाइन नंबर जोड़ दिए गए हैं!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentForm) return;
    setIsSaving(true);
    try {
      await updateAppContent(contentForm);
      alert('कंटेंट सुरक्षित कर दिया गया है!');
    } catch (error) {
      console.error("Error saving content:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
        <p className="text-sm text-gray-500 font-bold">लोड हो रहा है...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full">
          <div className="w-16 h-16 bg-transparent rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-sm border border-gray-100">
            <SmartImage 
              src={appContent?.branding?.logo} 
              alt="Logo" 
              className="w-full h-full" 
              objectFit="contain" 
            />
          </div>
          <h2 className="text-xl font-bold text-[#4A3728] mb-2">एडमिन लॉगिन</h2>
          <p className="text-sm text-gray-500 mb-8">डेटा बदलने के लिए कृपया लॉगिन करें</p>
          <button 
            onClick={login}
            className="w-full bg-[#2D5A27] text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            <LogIn className="w-5 h-5" /> Google से लॉगिन करें
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6 text-center">
        <div className="bg-orange-50 p-8 rounded-3xl border-2 border-orange-100 max-w-sm w-full shadow-lg">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold text-orange-800 mb-2">पहुँच वर्जित (Access Denied)</h2>
          <p className="text-sm text-orange-700 mb-8">आपके पास एडमिन अधिकार नहीं हैं। कृपया मुख्य एडमिन से संपर्क करें।</p>
          <button 
            onClick={logout}
            className="w-full bg-white text-orange-800 border-2 border-orange-200 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
          >
            <LogOut className="w-5 h-5" /> लॉगआउट करें
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">क्या आप सुनिश्चित हैं?</h3>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                  आप <span className="font-bold text-gray-900">"{productToDelete.hindiName}"</span> को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setProductToDelete(null)}
                    className="py-4 px-6 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors active:scale-95"
                  >
                    नहीं (Cancel)
                  </button>
                  <button 
                    onClick={async () => {
                      const id = productToDelete.id;
                      const name = productToDelete.hindiName;
                      setProductToDelete(null);
                      try {
                        await deleteProduct(id);
                        alert(`"${name}" सफलतापूर्वक डिलीट कर दिया गया है।`);
                      } catch (error) {
                        console.error("Delete operation failed:", error);
                        alert("डिलीट करने में समस्या आई। कृपया पुनः प्रयास करें।");
                      }
                    }}
                    className="py-4 px-6 bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-colors active:scale-95"
                  >
                    हाँ (Delete)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {categoryToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCategoryToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">क्या आप सुनिश्चित हैं?</h3>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                  आप श्रेणी <span className="font-bold text-gray-900">"{categoryToDelete.name}"</span> को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setCategoryToDelete(null)}
                    className="py-4 px-6 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors active:scale-95"
                  >
                    नहीं (Cancel)
                  </button>
                  <button 
                    onClick={async () => {
                      const id = categoryToDelete.id;
                      const name = categoryToDelete.name;
                      setCategoryToDelete(null);
                      try {
                        await deleteCategory(id);
                        alert(`"${name}" सफलतापूर्वक डिलीट कर दिया गया है।`);
                      } catch (error) {
                        console.error("Delete operation failed:", error);
                        alert("डिलीट करने में समस्या आई। कृपया पुनः प्रयास करें।");
                      }
                    }}
                    className="py-4 px-6 bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-colors active:scale-95"
                  >
                    हाँ (Delete)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {agriIssueToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAgriIssueToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">क्या आप सुनिश्चित हैं?</h3>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                  आप <span className="font-bold text-gray-900">"{agriIssueToDelete.hindiName}"</span> को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setAgriIssueToDelete(null)}
                    className="py-4 px-6 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors active:scale-95"
                  >
                    नहीं (Cancel)
                  </button>
                  <button 
                    onClick={async () => {
                      const id = agriIssueToDelete.id;
                      const name = agriIssueToDelete.hindiName;
                      setAgriIssueToDelete(null);
                      try {
                        await deleteAgriIssue(id);
                        alert(`"${name}" सफलतापूर्वक डिलीट कर दिया गया है।`);
                      } catch (error) {
                        console.error("Delete operation failed:", error);
                        alert("डिलीट करने में समस्या आई। कृपया पुनः प्रयास करें।");
                      }
                    }}
                    className="py-4 px-6 bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-colors active:scale-95"
                  >
                    हाँ (Delete)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2D5A27] rounded-xl flex items-center justify-center text-white font-bold">A</div>
          <div>
            <h2 className="text-lg font-bold text-[#4A3728]">एडमिन पैनल</h2>
            <p className="text-[10px] text-gray-400 font-medium">{user.email}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('orders')}
          className={cn(
            "flex-1 min-w-[130px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'orders' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Package className="w-4 h-4" /> ऑर्डर्स (Orders)
        </button>
        <button 
          onClick={() => setActiveTab('content')}
          className={cn(
            "flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'content' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Layout className="w-4 h-4" /> कंटेंट (Content)
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={cn(
            "flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'products' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <ShoppingBag className="w-4 h-4" /> उत्पाद (Products)
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={cn(
            "flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'categories' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <ListFilter className="w-4 h-4" /> श्रेणियाँ (Categories)
        </button>
        <button 
          onClick={() => setActiveTab('categoryInfo')}
          className={cn(
            "flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'categoryInfo' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <ShieldCheck className="w-4 h-4" /> महत्वपूर्ण जानकारी (Category Info)
        </button>
        <button 
          onClick={() => setActiveTab('encyclopedia')}
          className={cn(
            "flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'encyclopedia' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Bug className="w-4 h-4" /> कीड़े/रोग (Encyclopedia)
        </button>
        <button 
          onClick={() => setActiveTab('helplines')}
          className={cn(
            "flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'helplines' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Phone className="w-4 h-4" /> हेल्पलाइन (Helplines)
        </button>
        <button 
          onClick={() => setActiveTab('featured')}
          className={cn(
            "flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'featured' ? "bg-amber-500 text-white shadow-md shadow-amber-100" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Star className="w-4 h-4" /> विशेष उत्पाद (Featured)
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'users' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Users className="w-4 h-4" /> यूज़र्स (Users)
        </button>
        <button 
          onClick={() => setActiveTab('razorpay')}
          className={cn(
            "flex-1 min-w-[130px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'razorpay' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <CreditCard className="w-4 h-4" /> Razorpay गेटवे
        </button>
        <button 
          onClick={() => setActiveTab('legalPages')}
          className={cn(
            "flex-1 min-w-[130px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'legalPages' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <FileText className="w-4 h-4" /> नीतियां (Legal & Info)
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Header Action Row */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider flex items-center gap-1.5">
              {productSearchQuery || productCategoryFilter !== 'all' ? (
                <>खोजे गए उत्पाद ({products.filter(p => {
                  const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
                  const query = productSearchQuery.trim().toLowerCase();
                  if (!query) return matchesCategory;
                  return matchesCategory && (
                    p.hindiName?.toLowerCase().includes(query) ||
                    p.name?.toLowerCase().includes(query) ||
                    p.brand?.toLowerCase().includes(query) ||
                    p.customId?.toLowerCase().includes(query) ||
                    p.id?.toLowerCase().includes(query)
                  );
                }).length} / {products.length})</>
              ) : (
                <>उत्पादों की सूची ({products.length})</>
              )}
            </h3>
            <button 
              onClick={() => {
                setIsAdding(true);
                setEditingProduct(null);
                setProductForm({ 
                  name: '', 
                  hindiName: '', 
                  category: categories[0]?.id || '', 
                  brand: '', 
                  price: undefined, 
                  unit: '', 
                  inStock: true,
                  description: '', 
                  image: { primary: '', fallback: '' }, 
                  crops: [],
                  variants: [],
                  isFeatured: false,
                  featuredOrder: products.filter(p => p.isFeatured).length + 1,
                  dosage: { show: false, value: '' }
                });
              }}
              className="bg-[#2D5A27] text-white py-2 px-4 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" /> नया जोड़ें
            </button>
          </div>

          {/* Search and Filters Block */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text"
                value={productSearchQuery}
                onChange={e => setProductSearchQuery(e.target.value)}
                placeholder="उत्पाद का नाम, ब्रांड या उत्पाद ID से खोजें..."
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl py-3 pl-12 pr-10 outline-none transition-all font-medium text-sm text-gray-800"
              />
              {productSearchQuery && (
                <button 
                  onClick={() => setProductSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category horizontal filters */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">
                श्रेणी के अनुसार फ़िल्टर करें (Filter by Category)
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-none">
                <button
                  onClick={() => setProductCategoryFilter('all')}
                  className={cn(
                    "px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border",
                    productCategoryFilter === 'all' 
                      ? "bg-[#2D5A27] text-white border-transparent shadow-sm" 
                      : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                  )}
                >
                  सभी श्रेणियां (All)
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setProductCategoryFilter(cat.id)}
                    className={cn(
                      "px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border",
                      productCategoryFilter === cat.id 
                        ? "bg-[#2D5A27] text-white border-transparent shadow-sm" 
                        : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="space-y-3 mt-1">
            {products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm text-gray-400">कोई उत्पाद नहीं मिला।</p>
              </div>
            ) : products.filter(p => {
              const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
              const query = productSearchQuery.trim().toLowerCase();
              if (!query) return matchesCategory;
              return matchesCategory && (
                p.hindiName?.toLowerCase().includes(query) ||
                p.name?.toLowerCase().includes(query) ||
                p.brand?.toLowerCase().includes(query) ||
                p.customId?.toLowerCase().includes(query) ||
                p.id?.toLowerCase().includes(query)
              );
            }).length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm text-gray-400">खोजे गए मापदंडों के अनुसार कोई उत्पाद नहीं मिला।</p>
              </div>
            ) : (
              products
                .filter(p => {
                  const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
                  const query = productSearchQuery.trim().toLowerCase();
                  if (!query) return matchesCategory;
                  return matchesCategory && (
                    p.hindiName?.toLowerCase().includes(query) ||
                    p.name?.toLowerCase().includes(query) ||
                    p.brand?.toLowerCase().includes(query) ||
                    p.customId?.toLowerCase().includes(query) ||
                    p.id?.toLowerCase().includes(query)
                  );
                })
                .sort((a, b) => {
                  const idA = a.customId || '';
                  const idB = b.customId || '';
                  if (!idA && !idB) {
                    return (a.hindiName || '').localeCompare(b.hindiName || '', 'hi');
                  }
                  if (!idA) return 1;
                  if (!idB) return -1;
                  return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
                })
                .map((product, idx) => (
                  <motion.div 
                    layout
                    key={`${product.id}-${idx}`} 
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <SmartImage src={product.image} alt="" className="w-14 h-14 rounded-xl shadow-sm" objectFit="cover" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#2D5A27] rounded-full border-2 border-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{product.hindiName}</h4>
                        <div className="flex flex-wrap gap-1.5 items-center mt-0.5">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                            {product.brand}
                          </p>
                          {product.customId && (
                            <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 font-black">
                              ID: {product.customId}
                            </span>
                          )}
                          {product.category && (
                            <span className="text-[9px] bg-green-50 text-[#2D5A27] px-1.5 py-0.5 rounded border border-green-100 font-bold">
                              {categories.find(c => c.id === product.category)?.name || product.category}
                            </span>
                          )}
                          {product.isFeatured && (
                            <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shadow-sm shadow-amber-100">
                              <Star className="w-2 h-2 fill-current" /> विशेष
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setProductForm({
                            ...product,
                            customId: product.customId || ''
                          });
                        }}
                        className="p-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setProductToDelete(product)}
                        className="p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
            )}
          </div>
        </>
      ) : activeTab === 'categories' ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider">
              श्रेणियों की सूची ({categories.length})
            </h3>
            <button 
              onClick={() => {
                setIsAddingCategory(true);
                setEditingCategory(null);
                setCategoryForm({ name: '', icon: { primary: '', fallback: '' }, order: categories.length + 1, importantInfo: '', isInfoEnabled: false });
              }}
              className="bg-[#2D5A27] text-white py-2 px-4 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" /> नई जोड़ें
            </button>
          </div>

          {/* Categories List */}
          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm text-gray-400">कोई श्रेणी नहीं मिली।</p>
              </div>
            ) : (
              categories.map((cat, idx) => (
                <motion.div 
                  layout
                  key={`${cat.id}-${idx}`} 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl shadow-inner overflow-hidden">
                      {typeof cat.icon === 'string' ? cat.icon : (
                        <SmartImage src={cat.icon} alt={cat.name} className="w-full h-full" objectFit="contain" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{cat.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        Order: {cat.order}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryForm({ name: cat.name, icon: cat.icon, order: cat.order, importantInfo: cat.importantInfo || '', isInfoEnabled: cat.isInfoEnabled || false });
                        setIsAddingCategory(true);
                      }}
                      className="p-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCategoryToDelete(cat)}
                      className="p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      ) : activeTab === 'categoryInfo' ? (
        <>
          <div className="bg-amber-50/50 border-2 border-amber-500/10 rounded-3xl p-6 mb-6">
            <h3 className="font-extrabold text-[#4A3728] text-lg mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              Category में Important Information Management
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              यहाँ से आप ऐप की प्रत्येक श्रेणी (Category) के अनुसार विशेष महत्वपूर्ण सूचना, Safety Instructions, दिशा-निर्देश, Disclaimer या Customer Notes सेट कर सकते हैं। जब कोई ग्राहक उस श्रेणी के उत्पादों को देखेगा, तो यह सूचना स्वतः ही सबसे ऊपर दिखाई देगी। श्रेणी के सूचना संदेश को सक्रिय (Enable) या निष्क्रिय (Disable) करने के लिए Toggle का उपयोग करें।
            </p>
          </div>

          {/* Category Info List */}
          <div className="space-y-4">
            {categories.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm text-gray-400 font-medium">कोई श्रेणी उपलब्ध नहीं है।</p>
              </div>
            ) : (
              categories.map((cat, idx) => {
                const hasMessage = !!cat.importantInfo;
                const isEnabled = !!cat.isInfoEnabled;

                return (
                  <motion.div 
                    layout
                    key={`cat-info-${cat.id}-${idx}`} 
                    className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all animate-fadeIn"
                  >
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl shadow-inner overflow-hidden shrink-0">
                          {typeof cat.icon === 'string' ? cat.icon : (
                            <SmartImage src={cat.icon} alt={cat.name} className="w-full h-full" objectFit="contain" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-[#4A3728] text-base leading-none">{cat.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                            Status: {hasMessage ? (isEnabled ? "🟢 सक्रिय (Show)" : "🔴 निष्क्रिय (Hide)") : "⚪ सेट नहीं है"}
                          </p>
                        </div>
                      </div>

                      {hasMessage ? (
                        <div className="bg-amber-50/40 border border-amber-500/10 rounded-2xl p-4 text-xs text-gray-700 font-semibold leading-relaxed whitespace-pre-wrap">
                          <span className="text-amber-800 font-black block mb-0.5">💬 महत्वपूर्ण जानकारी:</span>
                          {cat.importantInfo}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic bg-gray-50/50 rounded-2xl p-3 border border-dashed border-gray-100">
                          कोई सूचना या निर्देश संदेश सेट नहीं किया गया है। ग्राहकों को इस श्रेणी में कोई अलर्ट बॉक्स दिखाई नहीं देगा।
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-50">
                      {/* TOGGLE SWITCH */}
                      <div className="flex items-center gap-2 bg-gray-50 py-1.5 px-3 rounded-full border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                          {isEnabled ? "सक्रिय (On)" : "बंद (Off)"}
                        </span>
                        <button
                          type="button"
                          disabled={!hasMessage}
                          onClick={async () => {
                            if (!hasMessage) return;
                            await updateCategory({
                              ...cat,
                              isInfoEnabled: !cat.isInfoEnabled
                            });
                          }}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0 disabled:opacity-40 disabled:cursor-not-allowed",
                            isEnabled ? "bg-[#2D5A27]" : "bg-gray-300"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              isEnabled ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      {/* EDIT / ADD NEW */}
                      {hasMessage ? (
                        <button 
                          onClick={() => {
                            setEditingCategoryForInfo(cat);
                            setCategoryInfoText(cat.importantInfo || '');
                            setCategoryInfoEnabled(cat.isInfoEnabled || false);
                          }}
                          className="flex items-center gap-1 py-1.5 px-3 text-xs bg-blue-50 text-blue-700 font-extrabold rounded-full border border-blue-100 hover:bg-blue-100 transition-all active:scale-95"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> सुधारें (Edit)
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingCategoryForInfo(cat);
                            setCategoryInfoText('');
                            setCategoryInfoEnabled(true);
                          }}
                          className="flex items-center gap-1 py-1.5 px-3 text-xs bg-[#2D5A27] text-white font-extrabold rounded-full hover:bg-[#2D5A27]/90 transition-all shadow-sm active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" /> नया संदेश जोड़ें
                        </button>
                      )}

                      {/* DELETE / CLEAR MESSAGE */}
                      {hasMessage && (
                        <button 
                          onClick={async () => {
                            if (window.confirm(`क्या आप ${cat.name} का सूचना संदेश हटाना चाहते हैं?`)) {
                              await updateCategory({
                                ...cat,
                                importantInfo: '',
                                isInfoEnabled: false
                              });
                            }
                          }}
                          className="flex items-center gap-1 py-1.5 px-3 text-xs bg-red-50 text-red-600 font-extrabold rounded-full border border-red-100 hover:bg-red-100 transition-all active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> हटाएँ (Delete)
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </>
      ) : activeTab === 'encyclopedia' ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider">
              विश्वकोश सूची ({agriIssues.length})
            </h3>
            <button 
              onClick={() => {
                setIsAddingAgriIssue(true);
                setEditingAgriIssue(null);
                setAgriIssueForm({ hindiName: '', englishName: '', type: 'pest', description: '', image: { primary: '', fallback: '' }, relatedProductIds: [] });
              }}
              className="bg-[#2D5A27] text-white py-2 px-4 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" /> नया जोड़ें
            </button>
          </div>

          <div className="space-y-3">
            {agriIssues.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm text-gray-400">कोई डेटा नहीं मिला।</p>
              </div>
            ) : (
              agriIssues.map((issue, idx) => (
                <motion.div 
                  layout
                  key={`${issue.id}-${idx}`} 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-50 shadow-sm">
                      <SmartImage src={issue.image} alt="" className="w-full h-full" objectFit="cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{issue.hindiName}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        {issue.englishName} • {
                          issue.type === 'pest' ? 'कीट' : 
                          issue.type === 'disease' ? 'रोग' : 'पोषक तत्व की कमी'
                        } • {issue.relatedProductIds?.length || 0} उत्पाद
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingAgriIssue(issue);
                        setAgriIssueForm(issue);
                        setIsAddingAgriIssue(true);
                      }}
                      className="p-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setAgriIssueToDelete(issue)}
                      className="p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      ) : activeTab === 'helplines' ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider">
              हेल्पलाइन डायरेक्टरी ({helplines.length})
            </h3>
            <div className="flex gap-2">
              {helplines.length === 0 && (
                <button 
                  onClick={seedInitialHelplines}
                  className="bg-blue-600 text-white py-2 px-4 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" /> शुरूआती नंबर जोड़ें
                </button>
              )}
              <button 
                onClick={() => {
                  setIsAddingHelpline(true);
                  setEditingHelpline(null);
                  setHelplineForm({ name: '', number: '', category: '', description: '', order: helplines.length + 1 });
                }}
                className="bg-[#2D5A27] text-white py-2 px-4 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" /> नया जोड़ें
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {helplines.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm text-gray-400">कोई हेल्पलाइन नहीं मिली।</p>
              </div>
            ) : (
              helplines.map((hp, idx) => (
                <motion.div 
                  layout
                  key={`${hp.id}-${idx}`}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner bg-gray-100 text-gray-600">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">
                        {hp.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        {hp.category} • {hp.number} • क्रम: {hp.order}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingHelpline(hp);
                        setHelplineForm(hp);
                        setIsAddingHelpline(true);
                      }}
                      className="p-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`क्या आप वाकई "${hp.name}" को हटाना चाहते हैं?`)) {
                          deleteHelpline(hp.id);
                        }
                      }}
                      className="p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      ) : activeTab === 'featured' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#4A3728] text-lg">होम स्क्रीन प्रोडक्ट मैनेजमेंट</h3>
              <p className="text-xs text-gray-400 font-medium tracking-tight">Home screen पर दिखने वाले विशेष उत्पाद तय करें</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-[2rem] flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm shadow-amber-200">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-900">Featured Products कैसे काम करता है?</h4>
              <p className="text-[11px] text-amber-800/80 leading-relaxed font-medium">
                यहाँ लिस्ट में वो उत्पाद हैं जिन्हें आपने "Featured" मार्क किया है। Home Page पर ये इसी "क्रम (Order)" में दिखाई देंगे। आप ऊपर/नीचे एरो बटन से इनकी स्थिति बदल सकते हैं।
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {products.filter(p => p.isFeatured).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 font-bold">कोई Featured प्रोडक्ट नहीं मिला।</p>
                <p className="text-xs text-gray-300 mt-1 font-medium">उत्पाद टैब में जाकर किसी प्रोडक्ट को "Featured" बनाएं।</p>
              </div>
            ) : (
              products
                .filter(p => p.isFeatured)
                .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0))
                .map((product, idx, array) => (
                  <motion.div 
                    layout
                    key={`${product.id}-feat`} 
                    className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-white shadow-sm z-10">
                          {idx + 1}
                        </div>
                        <SmartImage src={product.image} alt={product.name} className="w-16 h-16 rounded-2xl shadow-sm" objectFit="cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{product.hindiName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 font-black">
                            ID: {product.customId || product.id.substring(0, 5)}
                          </span>
                          <span className="text-[9px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded border border-gray-100 font-bold uppercase">
                            क्रम: {product.featuredOrder}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex flex-col gap-1">
                        <button 
                          type="button"
                          disabled={idx === 0}
                          onClick={async () => {
                            if (idx === 0) return;
                            const prevProd = array[idx - 1];
                            const currentProd = product;
                            const tempOrder = prevProd.featuredOrder || 0;
                            await updateProduct({ ...prevProd, featuredOrder: currentProd.featuredOrder });
                            await updateProduct({ ...currentProd, featuredOrder: tempOrder });
                          }}
                          className={cn(
                            "p-2 rounded-xl transition-all active:scale-95",
                            idx === 0 ? "text-gray-200 cursor-not-allowed" : "text-amber-500 bg-amber-50 hover:bg-amber-100"
                          )}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          disabled={idx === array.length - 1}
                          onClick={async () => {
                            if (idx === array.length - 1) return;
                            const nextProd = array[idx + 1];
                            const currentProd = product;
                            const tempOrder = nextProd.featuredOrder || 0;
                            await updateProduct({ ...nextProd, featuredOrder: currentProd.featuredOrder });
                            await updateProduct({ ...currentProd, featuredOrder: tempOrder });
                          }}
                          className={cn(
                            "p-2 rounded-xl transition-all active:scale-95",
                            idx === array.length - 1 ? "text-gray-200 cursor-not-allowed" : "text-amber-500 bg-amber-50 hover:bg-amber-100"
                          )}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={async () => {
                          if (confirm(`क्या आप वाकई "${product.hindiName}" को Featured से हटाना चाहते हैं?`)) {
                            await updateProduct({ ...product, isFeatured: false });
                          }
                        }}
                        className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
            )}
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider">
              यूज़र्स सूची ({allUsers.length})
            </h3>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="ईमेल से खोजें (Search by Email)..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#2D5A27] shadow-sm transition-all"
            />
          </div>

          <div className="space-y-3">
            {allUsers
              .filter(u => u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
              .map((u) => {
                const isMainAdmin = u.email === 'yashfalsawdiya36@gmail.com';
                const isBackupAdmin = appContent?.adminEmails?.includes(u.email);
                const canManage = !isMainAdmin && !isBackupAdmin;

                return (
                  <motion.div 
                    layout
                    key={u.uid}
                    className={cn(
                      "bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between",
                      u.isBlocked ? "border-red-100 bg-red-50/10" : "border-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner",
                        u.isBlocked ? "bg-red-100 text-red-600" : "bg-gray-100 text-[#4A3728]"
                      )}>
                        {u.displayName?.[0] || u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-800">{u.displayName || 'Anonymous'}</h4>
                          {!canManage && (
                            <span className="bg-[#2D5A27]/10 text-[#2D5A27] text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase">Admin</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                    
                    {canManage && (
                      <button 
                        onClick={() => {
                          const action = u.isBlocked ? 'अनब्लॉक' : 'ब्लॉक';
                          if (confirm(`क्या आप वाकई इस यूजर को ${action} करना चाहते हैं?`)) {
                            updateUserStatus(u.uid, !u.isBlocked);
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95",
                          u.isBlocked 
                            ? "bg-green-50 text-green-600 hover:bg-green-100" 
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        )}
                      >
                        {u.isBlocked ? <CheckCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                        <span className="text-[8px] font-bold uppercase">{u.isBlocked ? 'Unblock' : 'Block'}</span>
                      </button>
                    )}
                  </motion.div>
                );
              })}
            
            {allUsers.filter(u => u.email.toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm text-gray-400">कोई यूजर नहीं मिला।</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'orders' ? (
        <AdminOrdersManager />
      ) : activeTab === 'razorpay' ? (
        <AdminRazorpayManager />
      ) : activeTab === 'legalPages' ? (
        <AdminPagesManager />
      ) : (
        <form onSubmit={handleContentSubmit} className="space-y-8">
          {/* Branding Settings */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
              <Sprout className="w-5 h-5 text-[#2D5A27]" />
              ऐप ब्रांडिंग (App Branding)
            </h3>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">ऐप का नाम (App Name)</label>
                <input 
                  type="text" 
                  value={contentForm?.branding?.name || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, branding: {...(contentForm.branding || {name: '', tagline: '', logo: ''}), name: e.target.value}});
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">टैगलाइन (Tagline)</label>
                <input 
                  type="text" 
                  value={contentForm?.branding?.tagline || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, branding: {...(contentForm.branding || {name: '', tagline: '', logo: ''}), tagline: e.target.value}});
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                />
              </div>
              <DualImageInput 
                label="ऐप लोगो (App Logo) *"
                value={contentForm?.branding?.logo}
                onChange={source => {
                  if (!contentForm) return;
                  setContentForm({...contentForm, branding: {...(contentForm.branding || {name: '', tagline: '', logo: ''}), logo: source}});
                }}
              />
              <DualImageInput 
                label="PWA होम स्क्रीन आइकन (PWA/Home Icon)"
                value={contentForm?.branding?.pwaIcon}
                onChange={source => {
                  if (!contentForm) return;
                  setContentForm({...contentForm, branding: {...(contentForm.branding || {name: '', tagline: '', logo: ''}), pwaIcon: source}});
                }}
              />
              <DualImageInput 
                label="एंड्रॉयड इंस्टॉल आइकन (Android Install Icon)"
                value={contentForm?.branding?.androidIcon}
                onChange={source => {
                  if (!contentForm) return;
                  setContentForm({...contentForm, branding: {...(contentForm.branding || {name: '', tagline: '', logo: ''}), androidIcon: source}});
                }}
              />
              <DualImageInput 
                label="स्प्लैश स्क्रीन लोगो (Splash Screen Logo)"
                value={contentForm?.branding?.splashLogo}
                onChange={source => {
                  if (!contentForm) return;
                  setContentForm({...contentForm, branding: {...(contentForm.branding || {name: '', tagline: '', logo: ''}), splashLogo: source}});
                }}
              />
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">लॉगिन स्क्रीन टेक्स्ट (Login Screen Text)</label>
                <textarea 
                  value={contentForm?.loginText || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, loginText: e.target.value});
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium h-24 resize-none"
                  placeholder="जैसे: ऐप की सुविधाओं का उपयोग करने के लिए कृपया अपनी Gmail ID से लॉगिन करें।"
                />
              </div>
            </div>
          </div>

          {/* Admin Access Settings */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
              <Key className="w-5 h-5 text-[#2D5A27]" />
              एडमिन और ऐप कंट्रोल (Admin & App Control)
            </h3>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              {/* App Status Switch */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <h4 className="font-bold text-gray-700">ऐप स्टेटस (App Status)</h4>
                  <p className="text-[10px] text-gray-500">इसे बंद करने पर किसान ऐप का उपयोग नहीं कर पाएंगे।</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, isAppActive: !contentForm.isAppActive});
                  }}
                  className={cn(
                    "w-14 h-8 rounded-full relative transition-colors duration-200",
                    contentForm?.isAppActive !== false ? "bg-[#2D5A27]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-200",
                    contentForm?.isAppActive !== false ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">बैकअप एडमिन ईमेल (Backup Admin Emails)</p>
                {[0, 1].map((index) => (
                  <div key={index} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">बैकअप ईमेल {index + 1}</label>
                    <input 
                      type="email" 
                      value={contentForm?.adminEmails?.[index] || ''}
                      onChange={e => {
                        if (!contentForm) return;
                        const newEmails = [...(contentForm.adminEmails || [])];
                        newEmails[index] = e.target.value;
                        setContentForm({...contentForm, adminEmails: newEmails});
                      }}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                      placeholder="example@gmail.com"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
              <YoutubeIcon className="w-5 h-5 text-red-600" />
              यूट्यूब चैनल लिंक (YouTube Channel)
            </h3>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">चैनल का नाम/लेबल (Label)</label>
                <input 
                  type="text" 
                  value={contentForm?.youtubeChannel?.label || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, youtubeChannel: {...(contentForm.youtubeChannel || {url: '', label: ''}), label: e.target.value}});
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: हमारा कृषि चैनल"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">चैनल URL (Channel Link)</label>
                <input 
                  type="text" 
                  value={contentForm?.youtubeChannel?.url || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, youtubeChannel: {...(contentForm.youtubeChannel || {url: '', label: ''}), url: e.target.value}});
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: https://youtube.com/@yourchannel"
                />
              </div>
            </div>
          </div>

          {/* Hero Banners */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#2D5A27]" />
                मुख्य बैनर (Hero Banners)
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Text ON/OFF</span>
                <button 
                  type="button"
                  onClick={() => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, showBannerText: contentForm.showBannerText !== false ? false : true});
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors duration-200",
                    contentForm?.showBannerText !== false ? "bg-[#2D5A27]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200",
                    contentForm?.showBannerText !== false ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>
            {contentForm?.banners.map((banner, idx) => (
              <div key={`${banner.id}-${idx}`} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">बैनर #{idx + 1}</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">शीर्षक (Title)</label>
                    <input 
                      type="text" 
                      value={banner.title}
                      onChange={e => {
                        const newBanners = [...contentForm.banners];
                        newBanners[idx].title = e.target.value;
                        setContentForm({...contentForm, banners: newBanners});
                      }}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">उप-शीर्षक (Subtitle)</label>
                    <input 
                      type="text" 
                      value={banner.subtitle}
                      onChange={e => {
                        const newBanners = [...contentForm.banners];
                        newBanners[idx].subtitle = e.target.value;
                        setContentForm({...contentForm, banners: newBanners});
                      }}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    />
                  </div>
                  <DualImageInput 
                    label="बैनर फोटो (Banner Image)"
                    value={banner.image}
                    onChange={source => {
                      const newBanners = [...contentForm.banners];
                      newBanners[idx].image = source;
                      setContentForm({...contentForm, banners: newBanners});
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* YouTube Videos */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
              <YoutubeIcon className="w-5 h-5 text-red-600" />
              यूट्यूब वीडियो (YouTube Videos)
            </h3>
            {contentForm?.videos.map((video, idx) => (
              <div key={`${video.id}-${idx}`} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">वीडियो #{idx + 1}</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">वीडियो नाम (Title)</label>
                    <input 
                      type="text" 
                      value={video.title}
                      onChange={e => {
                        const newVideos = [...contentForm.videos];
                        newVideos[idx].title = e.target.value;
                        setContentForm({...contentForm, videos: newVideos});
                      }}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">यूट्यूब वीडियो लिंक (Video URL)</label>
                    <input 
                      type="text" 
                      value={video.videoUrl}
                      onChange={e => {
                        const newVideos = [...contentForm.videos];
                        newVideos[idx].videoUrl = e.target.value;
                        setContentForm({...contentForm, videos: newVideos});
                      }}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                      placeholder="जैसे: https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  <DualImageInput 
                    label="वीडियो थंबनेल (Thumbnail)"
                    value={video.thumbnail}
                    onChange={source => {
                      const newVideos = [...contentForm.videos];
                      newVideos[idx].thumbnail = source;
                      setContentForm({...contentForm, videos: newVideos});
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Partner Logos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
                <Sprout className="w-5 h-5 text-[#2D5A27]" />
                कंपनियों के लोगो (Partner Logos)
              </h3>
              <button 
                type="button"
                onClick={() => {
                  if (!contentForm) return;
                  const newPartners = [...(contentForm.partners || [])];
                  newPartners.push({ id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36), name: '', logo: '' });
                  setContentForm({...contentForm, partners: newPartners});
                }}
                className="text-[#2D5A27] bg-[#2D5A27]/10 p-2 rounded-xl flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
              >
                <Plus className="w-3 h-3" /> कंपनी जोड़ें
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {contentForm?.partners?.map((partner, idx) => (
                <div key={`${partner.id}-${idx}`} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4 relative group">
                  <button 
                    type="button"
                    onClick={() => {
                      if (!contentForm) return;
                      const newPartners = contentForm.partners.filter(p => p.id !== partner.id);
                      setContentForm({...contentForm, partners: newPartners});
                    }}
                    className="absolute top-4 right-4 p-2 text-red-500 bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">कंपनी का नाम (Company Name)</label>
                      <input 
                        type="text" 
                        value={partner.name}
                        onChange={e => {
                          if (!contentForm) return;
                          const newPartners = [...contentForm.partners];
                          newPartners[idx].name = e.target.value;
                          setContentForm({...contentForm, partners: newPartners});
                        }}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                        placeholder="जैसे: Bayer"
                      />
                    </div>
                    <DualImageInput 
                      label="कंपनी लोगो (Company Logo)"
                      value={partner.logo}
                      onChange={source => {
                        if (!contentForm) return;
                        const newPartners = [...contentForm.partners];
                        newPartners[idx].logo = source;
                        setContentForm({...contentForm, partners: newPartners});
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Section Details */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#25D366]" />
              WhatsApp सेक्शन (WhatsApp Section)
            </h3>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">सेक्शन टाइटल (Section Title)</label>
                <input 
                  type="text" 
                  value={contentForm?.whatsappSection?.title || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      whatsappSection: { ...contentForm.whatsappSection, title: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: WhatsApp पर जुड़ें"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">सेक्शन जानकारी (Section Description)</label>
                <textarea 
                  value={contentForm?.whatsappSection?.description || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      whatsappSection: { ...contentForm.whatsappSection, description: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium min-h-[80px]"
                  placeholder="जैसे: सीधे फोटो भेजें और घर बैठे सामान मंगाएं..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp मोड (WhatsApp Mode)</label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (!contentForm) return;
                      setContentForm({
                        ...contentForm,
                        whatsappSection: { ...contentForm.whatsappSection, mode: 'direct' }
                      });
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all",
                      contentForm?.whatsappSection?.mode === 'direct' ? "bg-white text-[#2D5A27] shadow-sm" : "text-gray-400"
                    )}
                  >
                    सीधा मैसेज (Direct)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!contentForm) return;
                      setContentForm({
                        ...contentForm,
                        whatsappSection: { ...contentForm.whatsappSection, mode: 'group' }
                      });
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all",
                      contentForm?.whatsappSection?.mode === 'group' ? "bg-white text-[#2D5A27] shadow-sm" : "text-gray-400"
                    )}
                  >
                    ग्रुप लिंक (Group)
                  </button>
                </div>
              </div>

              {contentForm?.whatsappSection?.mode === 'group' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp ग्रुप लिंक (Group Link)</label>
                  <input 
                    type="text" 
                    value={contentForm?.whatsappSection?.groupLink || ''}
                    onChange={e => {
                      if (!contentForm) return;
                      setContentForm({
                        ...contentForm, 
                        whatsappSection: { ...contentForm.whatsappSection, groupLink: e.target.value }
                      });
                    }}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: https://chat.whatsapp.com/..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Facebook Section Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1877F2] flex items-center gap-2">
                <Facebook className="w-5 h-5 text-[#1877F2]" />
                Facebook कार्ड सेटिंग्स (Facebook Card Settings)
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  {contentForm?.facebookSection?.enabled !== false ? 'कार्ड चालू' : 'कार्ड बंद'}
                </span>
                <button 
                  type="button"
                  onClick={() => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      facebookSection: {
                        ...(contentForm.facebookSection || {}),
                        enabled: contentForm.facebookSection?.enabled !== false ? false : true
                      }
                    });
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors duration-200",
                    contentForm?.facebookSection?.enabled !== false ? "bg-[#1877F2]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200",
                    contentForm?.facebookSection?.enabled !== false ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">मुख्य शीर्षक (Card Title)</label>
                <input 
                  type="text" 
                  value={contentForm?.facebookSection?.title ?? 'Facebook पर जुड़ें'}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      facebookSection: { ...(contentForm.facebookSection || {}), title: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#1877F2] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: Facebook पर जुड़ें"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">सबटाइटल/विवरण (Subtitle / Description)</label>
                <input 
                  type="text" 
                  value={contentForm?.facebookSection?.description ?? 'हमसे Facebook पर जुड़ें और अपडेट पाएं'}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      facebookSection: { ...(contentForm.facebookSection || {}), description: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#1877F2] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: हमसे Facebook पर जुड़ें और अपडेट पाएं"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Facebook पेज / प्रोफाइल URL (Link) *</label>
                <input 
                  type="text" 
                  value={contentForm?.facebookSection?.pageUrl ?? ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      facebookSection: { ...(contentForm.facebookSection || {}), pageUrl: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#1877F2] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: https://facebook.com/yourpage या https://www.facebook.com"
                />
                <p className="text-[10px] text-gray-400 ml-1">खाली रहने पर डिफॉल्ट Facebook लिंक खुलेगा।</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">बटन टेक्स्ट (Button / Action Text)</label>
                <input 
                  type="text" 
                  value={contentForm?.facebookSection?.buttonText ?? 'पेज पर जाएं'}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      facebookSection: { ...(contentForm.facebookSection || {}), buttonText: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#1877F2] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: पेज पर जाएं"
                />
              </div>
            </div>
          </div>

          {/* Instagram Section Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#E1306C] flex items-center gap-2">
                <Instagram className="w-5 h-5 text-[#E1306C]" />
                Instagram कार्ड सेटिंग्स (Instagram Card Settings)
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  {contentForm?.instagramSection?.enabled !== false ? 'कार्ड चालू' : 'कार्ड बंद'}
                </span>
                <button 
                  type="button"
                  onClick={() => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      instagramSection: {
                        ...(contentForm.instagramSection || {}),
                        enabled: contentForm.instagramSection?.enabled !== false ? false : true
                      }
                    });
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors duration-200",
                    contentForm?.instagramSection?.enabled !== false ? "bg-[#E1306C]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200",
                    contentForm?.instagramSection?.enabled !== false ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">मुख्य शीर्षक (Card Title)</label>
                <input 
                  type="text" 
                  value={contentForm?.instagramSection?.title ?? 'Instagram पर जुड़ें'}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      instagramSection: { ...(contentForm.instagramSection || {}), title: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#E1306C] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: Instagram पर जुड़ें"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">सबटाइटल/विवरण (Subtitle / Description)</label>
                <input 
                  type="text" 
                  value={contentForm?.instagramSection?.description ?? 'हमसे Instagram पर जुड़ें और अपडेट पाएं'}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      instagramSection: { ...(contentForm.instagramSection || {}), description: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#E1306C] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: हमसे Instagram पर जुड़ें और अपडेट पाएं"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Instagram प्रोफाइल URL (Link) *</label>
                <input 
                  type="text" 
                  value={contentForm?.instagramSection?.profileUrl ?? ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      instagramSection: { ...(contentForm.instagramSection || {}), profileUrl: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#E1306C] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: https://instagram.com/yourprofile या https://www.instagram.com"
                />
                <p className="text-[10px] text-gray-400 ml-1">खाली रहने पर डिफॉल्ट Instagram लिंक खुलेगा।</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">बटन टेक्स्ट (Button / Action Text)</label>
                <input 
                  type="text" 
                  value={contentForm?.instagramSection?.buttonText ?? 'प्रोफाइल देखें'}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({
                      ...contentForm, 
                      instagramSection: { ...(contentForm.instagramSection || {}), buttonText: e.target.value }
                    });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#E1306C] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: प्रोफाइल देखें"
                />
              </div>
            </div>
          </div>

          {/* AI Guide Settings */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
              <YoutubeIcon className="w-5 h-5 text-red-600" />
              AI वीडियो गाइड सेटिंग्स (AI Video Guide)
            </h3>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">YouTube वीडियो लिंक (API Key Guide)</label>
                <input 
                  type="text" 
                  value={contentForm?.apiKeyGuideVideoUrl || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({ ...contentForm, apiKeyGuideVideoUrl: e.target.value });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: https://www.youtube.com/watch?v=..."
                />
                <p className="text-[10px] text-gray-400 ml-1">यह लिंक 'प्रोफाइल' और 'API Key पॉपअप' में दिखाई देगा।</p>
              </div>
            </div>
          </div>

          {/* Delivery & Order Management - Global Settings for Razorpay Orders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#2D5A27]" />
                डिलीवरी और ऑर्डर सेटिंग्स (Delivery & Order Control)
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2D5A27]/10 text-[#2D5A27] px-2.5 py-1 rounded-lg">
                ऑनलाइन चेकआउट पर लागू
              </span>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              {/* Delivery Service Status Toggle */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-105">
                <div className="pr-4">
                  <h4 className="text-xs font-bold text-gray-800">डिलीवरी सेवा चालू/बंद करें (Delivery Service Status)</h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    <strong>ON होने पर:</strong> कार्ट चेकआउट में ऑनलाइन डिलीवरी चालू रहेगी।<br/>
                    <strong>OFF होने पर:</strong> चेकआउट में डिलीवरी अस्थायी रूप से ब्लॉक रहेगी और ग्राहकों को सूचना दिखेगी।
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, isDeliveryActive: contentForm.isDeliveryActive !== false ? false : true});
                  }}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    contentForm?.isDeliveryActive !== false ? "bg-[#2D5A27]" : "bg-gray-300"
                  }`}
                >
                  <span 
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      contentForm?.isDeliveryActive !== false ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">वर्तमान डिलीवरी स्थिति:</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  contentForm?.isDeliveryActive !== false 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-amber-50 text-amber-750 border border-amber-200"
                }`}>
                  {contentForm?.isDeliveryActive !== false ? "● डिलीवरी चालू (Delivery Active)" : "○ डिलीवरी अस्थायी रूप से बंद (Delivery Suspended)"}
                </span>
              </div>

              {/* Order Receiver WhatsApp Number */}
              <div className="space-y-2.5 pt-4 border-t border-gray-100 font-sans">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">दुकान / सपोर्ट WhatsApp नंबर (बिना + के)</label>
                <div className="relative font-sans">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2D5A27]">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    value={contentForm?.contactInfo?.whatsapp || ''}
                    onChange={e => {
                      if (!contentForm) return;
                      setContentForm({...contentForm, contactInfo: {...contentForm.contactInfo, whatsapp: e.target.value.replace(/\D/g, '')}});
                    }}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 pl-10 outline-none transition-all font-semibold text-gray-800"
                    placeholder="जैसे: 918982338046"
                  />
                </div>
                <p className="text-[10px] text-gray-400 ml-1">यहाँ डाला गया नंबर कस्टमर सपोर्ट और सहायता चैट के लिए उपयोग होगा।</p>
              </div>

              {/* Delivery Charges Toggle & Amount */}
              <div className="space-y-3 pt-4 border-t border-gray-100 font-sans">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-105">
                  <div className="pr-4">
                    <h4 className="text-xs font-bold text-gray-800">डिलिवरी शुल्क लागू करें (Enable Delivery Charges)</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      <strong>ON होने पर:</strong> Razorpay ऑनलाइन चेकआउट में निर्धारित डिलीवरी शुल्क आटोमेटिक जुड़कर आएगा।<br/>
                      <strong>OFF होने पर:</strong> ग्राहकों के लिए डिलीवरी शुल्क ₹0 (मुफ़्त / Free) रहेगा।
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!contentForm) return;
                      setContentForm({...contentForm, isDeliveryChargesEnabled: !contentForm.isDeliveryChargesEnabled});
                    }}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      contentForm?.isDeliveryChargesEnabled ? "bg-[#2D5A27]" : "bg-gray-300"
                    }`}
                  >
                    <span 
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        contentForm?.isDeliveryChargesEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {contentForm?.isDeliveryChargesEnabled && (
                  <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-gray-100 space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">डिलीवरी शुल्क राशि (Delivery Charges Amount in ₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                      <input 
                        type="number"
                        min="0"
                        value={contentForm?.deliveryChargesAmount !== undefined ? contentForm.deliveryChargesAmount : ''}
                        onChange={e => {
                          if (!contentForm) return;
                          const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                          setContentForm({ ...contentForm, deliveryChargesAmount: val });
                        }}
                        className="w-full bg-white border-2 border-gray-200 focus:border-[#2D5A27] rounded-xl py-2.5 pl-7 pr-3 outline-none font-semibold text-xs text-gray-800"
                        placeholder="जैसे: 40"
                      />
                    </div>

                    <div className="flex gap-1.5 flex-wrap items-center">
                      <span className="text-[10px] font-bold text-gray-400 mr-1">त्वरित चयन (Presets):</span>
                      {[20, 40, 60, 80, 100].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            if (!contentForm) return;
                            setContentForm({ ...contentForm, deliveryChargesAmount: amt });
                          }}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                            contentForm?.deliveryChargesAmount === amt
                              ? 'bg-[#2D5A27] text-white border-transparent shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#2D5A27]" />
              संपर्क जानकारी (Contact Info)
            </h3>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp नंबर (बिना + के)</label>
                <input 
                  type="text" 
                  value={contentForm?.contactInfo.whatsapp || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, contactInfo: {...contentForm.contactInfo, whatsapp: e.target.value}});
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  placeholder="जैसे: 918982338046"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">दुकान का पता (Shop Address)</label>
                <textarea 
                  value={contentForm?.contactInfo.address || ''}
                  onChange={e => {
                    if (!contentForm) return;
                    setContentForm({...contentForm, contactInfo: {...contentForm.contactInfo, address: e.target.value}});
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium h-24 resize-none"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-[#2D5A27] text-white py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50 sticky bottom-4 z-10"
          >
            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            सभी बदलाव सुरक्षित करें (Save All Content)
          </button>
        </form>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {(isAdding || editingProduct) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-[#4A3728]">{editingProduct ? 'उत्पाद सुधारें' : 'नया उत्पाद'}</h3>
                  <p className="text-xs text-gray-400 font-medium">कृपया सभी जानकारी ध्यान से भरें</p>
                </div>
                <button onClick={() => { 
                  setIsAdding(false); 
                  setEditingProduct(null); 
                  setProductForm({ 
                    customId: '',
                    name: '', 
                    hindiName: '', 
                    category: categories[0]?.id || '', 
                    brand: '', 
                    price: undefined, 
                    unit: '', 
                    inStock: true,
                    description: '', 
                    image: { primary: '', fallback: '' }, 
                    crops: [],
                    variants: [],
                    isFeatured: false,
                    featuredOrder: products.filter(p => p.isFeatured).length + 1,
                    dosage: { show: false, value: '' }
                  });
                }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">उत्पाद ID (Product SKU - जैसे: PEST-01)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={productForm.customId || ''}
                      onChange={e => setProductForm({...productForm, customId: e.target.value})}
                      className="flex-1 bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium uppercase"
                      placeholder="जैसे: FERT-01"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cat = categories.find(c => c.id === productForm.category);
                        const catName = (cat?.name || '').toLowerCase();
                        let prefix = 'PROD';
                        if (catName.includes('कीट') || catName.includes('pest') || catName.includes('insect')) prefix = 'PEST';
                        else if (catName.includes('फफूँद') || catName.includes('fung')) prefix = 'FUNG';
                        else if (catName.includes('खाद') || catName.includes('fert') || catName.includes('उर्वरक')) prefix = 'FERT';
                        else if (catName.includes('बीज') || catName.includes('seed')) prefix = 'SEED';
                        else if (catName.includes('खरपतवार') || catName.includes('herb')) prefix = 'HERB';
                        
                        // Count existing products with this prefix to suggest next number
                        const samePrefixProds = products.filter(p => p.customId?.startsWith(prefix));
                        const nextNum = samePrefixProds.length + 1;
                        const suggestedId = `${prefix}-${nextNum.toString().padStart(2, '0')}`;
                        setProductForm({...productForm, customId: suggestedId});
                      }}
                      className="px-4 bg-gray-100 text-[#2D5A27] rounded-2xl text-[10px] font-black uppercase whitespace-nowrap hover:bg-gray-200 transition-colors"
                    >
                      Auto ID
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">कंपनी (Brand Name)</label>
                  <input 
                    required
                    type="text" 
                    value={productForm.brand || ''}
                    onChange={e => setProductForm({...productForm, brand: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: Bayer, Syngenta"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">नाम (Hindi Name)</label>
                  <input 
                    required
                    type="text" 
                    value={productForm.hindiName || ''}
                    onChange={e => setProductForm({...productForm, hindiName: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: यूरिया खाद"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">स्टॉक स्थिति (Stock Status)</label>
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setProductForm({...productForm, inStock: true})}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5",
                        productForm.inStock !== false ? "bg-white text-[#2D5A27] shadow-sm" : "text-gray-400"
                      )}
                    >
                      <CheckCircle className="w-3 h-3" /> Available (उपलब्ध)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductForm({...productForm, inStock: false})}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5",
                        productForm.inStock === false ? "bg-white text-red-600 shadow-sm" : "text-gray-400"
                      )}
                    >
                      <Ban className="w-3 h-3" /> Out of Stock (खत्म)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col items-start">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">मुख्य स्क्रीन पर? (Featured?)</label>
                    <button 
                      type="button"
                      onClick={() => setProductForm({...productForm, isFeatured: !productForm.isFeatured})}
                      className={cn(
                        "w-full py-3.5 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs",
                        productForm.isFeatured ? "bg-amber-500 text-white shadow-lg shadow-amber-100" : "bg-gray-100 text-gray-400"
                      )}
                    >
                      {productForm.isFeatured ? 'हाँ (Featured)' : 'नहीं'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">क्रम (Order)</label>
                    <input 
                      type="number" 
                      value={productForm.featuredOrder || 0}
                      onChange={e => setProductForm({...productForm, featuredOrder: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-medium text-sm"
                      placeholder="जैसे: 1"
                    />
                  </div>
                </div>

                {/* Variants Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">मात्रा और मूल्य (Variants)</label>
                    <button 
                      type="button"
                      onClick={() => {
                        const newVariants = [...(productForm.variants || [])];
                        newVariants.push({ id: Math.random().toString(36).substring(7), quantity: '', price: 0 });
                        setProductForm({ ...productForm, variants: newVariants });
                      }}
                      className="text-[#2D5A27] bg-[#2D5A27]/10 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Quantity जोड़ें
                    </button>
                  </div>
                  
                  {productForm.variants && productForm.variants.length > 0 && (
                    <div className="space-y-3">
                      {productForm.variants.map((variant, idx) => (
                        <div key={variant.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end p-3 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
                            <input 
                              type="text" 
                              value={variant.quantity || ''}
                              onChange={e => {
                                const v = [...(productForm.variants || [])];
                                v[idx].quantity = e.target.value;
                                setProductForm({ ...productForm, variants: v });
                              }}
                              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-medium"
                              placeholder="जैसे: 50 ML"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price</label>
                            <input 
                              type="number" 
                              value={variant.price || 0}
                              onChange={e => {
                                const v = [...(productForm.variants || [])];
                                v[idx].price = Number(e.target.value);
                                setProductForm({ ...productForm, variants: v });
                              }}
                              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-medium"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              const v = (productForm.variants || []).filter(item => item.id !== variant.id);
                              setProductForm({ ...productForm, variants: v });
                            }}
                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">श्रेणी (Category)</label>
                  <select 
                    value={productForm.category}
                    onChange={e => setProductForm({...productForm, category: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium appearance-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <DualImageInput 
                  label="उत्पाद फोटो (Product Photo)"
                  value={productForm.image}
                  onChange={source => setProductForm({...productForm, image: source})}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">विवरण (Description)</label>
                  <textarea 
                    value={productForm.description || ''}
                    onChange={e => setProductForm({...productForm, description: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium h-24 resize-none"
                  />
                </div>

                {/* Dosage Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Dosage / Usage (खुराक और उपयोग)</label>
                    <button 
                      type="button"
                      onClick={() => setProductForm({...productForm, dosage: { show: !productForm.dosage?.show, value: productForm.dosage?.value || '' }})}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors duration-200",
                        productForm.dosage?.show ? "bg-[#2D5A27]" : "bg-gray-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200",
                        productForm.dosage?.show ? "left-5.5" : "left-0.5"
                      )} />
                    </button>
                  </div>
                  
                  {productForm.dosage?.show && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <textarea 
                        value={productForm.dosage?.value || ''}
                        onChange={e => setProductForm({...productForm, dosage: { show: true, value: e.target.value }})}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium h-24 resize-none"
                        placeholder="डोज और उपयोग की विधि यहाँ लिखें..."
                      />
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-[#2D5A27] text-white py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50 mt-4"
                >
                  {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  जानकारी सुरक्षित करें
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AgriIssue Modal */}
      <AnimatePresence>
        {isAddingAgriIssue && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-[#4A3728]">{editingAgriIssue ? 'विश्वकोश सुधारें' : 'नया जोड़ें'}</h3>
                  <p className="text-xs text-gray-400 font-medium">कीट, रोग या कमी की जानकारी भरें</p>
                </div>
                <button onClick={() => { setIsAddingAgriIssue(false); setEditingAgriIssue(null); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleAgriIssueSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">हिंदी नाम (Hindi Name)</label>
                    <input 
                      required
                      type="text" 
                      value={agriIssueForm.hindiName || ''}
                      onChange={e => setAgriIssueForm({...agriIssueForm, hindiName: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                      placeholder="जैसे: माहू (Aphids)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">अंग्रेजी नाम (English Name)</label>
                    <input 
                      required
                      type="text" 
                      value={agriIssueForm.englishName || ''}
                      onChange={e => setAgriIssueForm({...agriIssueForm, englishName: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                      placeholder="जैसे: Aphids"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">प्रकार (Type)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['pest', 'disease', 'deficiency'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAgriIssueForm({...agriIssueForm, type})}
                          className={cn(
                            "py-3 rounded-xl text-[10px] font-bold uppercase transition-all border-2",
                            agriIssueForm.type === type 
                              ? "bg-[#2D5A27] border-[#2D5A27] text-white" 
                              : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                          )}
                        >
                          {type === 'pest' ? 'कीट' : type === 'disease' ? 'रोग' : 'कमी'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <DualImageInput 
                    label="समस्या की फोटो (Photo)"
                    value={agriIssueForm.image}
                    onChange={source => setAgriIssueForm({...agriIssueForm, image: source})}
                  />

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">संक्षिप्त विवरण (Short Description)</label>
                    <textarea 
                      value={agriIssueForm.description || ''}
                      onChange={e => setAgriIssueForm({...agriIssueForm, description: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium h-24 resize-none"
                    />
                  </div>

                  {/* Related Products Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">संबंधित उत्पाद जोड़ें (Link Products)</label>
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="उत्पाद खोजें..."
                          className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-xs outline-none"
                          onChange={(e) => {
                            // Filter products logic if needed, but we'll show all for now
                          }}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {products.map((product, idx) => {
                          const isSelected = agriIssueForm.relatedProductIds.includes(product.id);
                          return (
                            <div 
                              key={`${product.id}-${idx}`}
                              onClick={() => {
                                const newIds = isSelected 
                                  ? agriIssueForm.relatedProductIds.filter(id => id !== product.id)
                                  : [...agriIssueForm.relatedProductIds, product.id];
                                setAgriIssueForm({...agriIssueForm, relatedProductIds: newIds});
                              }}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border-2",
                                isSelected ? "bg-[#2D5A27]/5 border-[#2D5A27]/20" : "bg-white border-transparent hover:border-gray-100"
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                isSelected ? "bg-[#2D5A27] border-[#2D5A27]" : "bg-white border-gray-300"
                              )}>
                                {isSelected && <Save className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                                <SmartImage src={product.image} alt={product.hindiName} className="w-full h-full" objectFit="cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-gray-700 truncate">{product.hindiName}</p>
                                <p className="text-[9px] text-gray-400">{product.brand}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-gray-400 italic">
                        {agriIssueForm.relatedProductIds.length} उत्पाद चुने गए
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-[#2D5A27] text-white py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50 mt-4"
                >
                  {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  विश्वकोश में सुरक्षित करें
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {isAddingCategory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-[#4A3728]">{editingCategory ? 'श्रेणी सुधारें' : 'नई श्रेणी'}</h3>
                  <p className="text-xs text-gray-400 font-medium">श्रेणी की जानकारी भरें</p>
                </div>
                <button onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">नाम (Category Name)</label>
                  <input 
                    required
                    type="text" 
                    value={categoryForm.name || ''}
                    onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: कंद फसलें"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">आइकन (Icon)</label>
                  <DualImageInput 
                    label="श्रेणी आइकन (Category Icon)"
                    value={categoryForm.icon}
                    onChange={source => setCategoryForm({...categoryForm, icon: source})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">क्रम (Order)</label>
                  <input 
                    required
                    type="number" 
                    value={categoryForm.order || 0}
                    onChange={e => setCategoryForm({...categoryForm, order: Number(e.target.value)})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-[#2D5A27] text-white py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50 mt-4"
                >
                  {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  श्रेणी सुरक्षित करें
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Info Custom Advisory Modal */}
      <AnimatePresence>
        {editingCategoryForInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[120] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-[#4A3728]">
                    {editingCategoryForInfo.name} के लिए सूचना संशोधन
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">Important Information Management</p>
                </div>
                <button 
                  onClick={() => setEditingCategoryForInfo(null)} 
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSavingInfo(true);
                  try {
                    await updateCategory({
                      ...editingCategoryForInfo,
                      importantInfo: categoryInfoText,
                      isInfoEnabled: categoryInfoEnabled
                    });
                    setEditingCategoryForInfo(null);
                  } catch (error) {
                    console.error("Error saving category info advisory:", error);
                  } finally {
                    setIsSavingInfo(false);
                  }
                }} 
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    महत्वपूर्ण सूचना (Information Message)
                  </label>
                  <textarea 
                    required
                    rows={6}
                    value={categoryInfoText}
                    onChange={e => setCategoryInfoText(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium text-sm leading-relaxed text-gray-700"
                    placeholder="जैसे: खाद उपयोग संबंधी निर्देश और दिशा-निर्देश यहाँ लिखें..."
                  />
                  <p className="text-[10px] text-gray-400 italic font-medium ml-1">
                    यह संदेश ग्राहकों को संबंधित श्रेणी के बाजार पृष्ठ और उत्पादों के विवरण बॉक्स में दिखाई देगा।
                  </p>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <h4 className="text-sm font-bold text-[#4A3728]">सूचना प्रदर्शित करें (Enable / Show)</h4>
                    <p className="text-[10px] text-gray-400 font-medium">यदि सक्षम है, तभी किसानों को अलर्ट बॉक्स दिखाई देगा।</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategoryInfoEnabled(!categoryInfoEnabled)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0",
                      categoryInfoEnabled ? "bg-[#2D5A27]" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        categoryInfoEnabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setEditingCategoryForInfo(null)}
                    className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-[1.5rem] font-bold active:scale-95 transition-all text-sm"
                  >
                    रद्द करें
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSavingInfo}
                    className="flex-1 bg-[#2D5A27] text-white py-4 rounded-[1.5rem] font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-50 text-sm"
                  >
                    {isSavingInfo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    सुरक्षित करें
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isAddingHelpline || editingHelpline) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[110] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-[#4A3728]">{editingHelpline ? 'हेल्पलाइन सुधारें' : 'नई हेल्पलाइन'}</h3>
                  <p className="text-xs text-gray-400 font-medium">किसानों के लिए जरूरी नंबर</p>
                </div>
                <button onClick={() => { setIsAddingHelpline(false); setEditingHelpline(null); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleHelplineSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">नाम (Name)</label>
                  <input 
                    required
                    type="text" 
                    value={helplineForm.name || ''}
                    onChange={e => setHelplineForm({...helplineForm, name: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: किसान कॉल सेंटर"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">नंबर (Number)</label>
                  <input 
                    required
                    type="text" 
                    value={helplineForm.number || ''}
                    onChange={e => setHelplineForm({...helplineForm, number: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium font-mono"
                    placeholder="जैसे: 1551"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">कैटेगरी (Category)</label>
                  <input 
                    required
                    type="text" 
                    value={helplineForm.category || ''}
                    onChange={e => setHelplineForm({...helplineForm, category: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: कृषि विभाग"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">विवरण (Short Description)</label>
                  <input 
                    type="text" 
                    value={helplineForm.description || ''}
                    onChange={e => setHelplineForm({...helplineForm, description: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: सरकारी योजनाओं की जानकारी के लिए"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">क्रम (Priority Order)</label>
                  <input 
                    type="number" 
                    value={helplineForm.order || 0}
                    onChange={e => setHelplineForm({...helplineForm, order: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-[#2D5A27] text-white py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50 mt-4"
                >
                  {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  हेल्पलाइन सुरक्षित करें
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
