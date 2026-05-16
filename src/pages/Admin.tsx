import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CategoryData, Product, AgriIssue, Helpline } from '../types';
// import { CATEGORIES } from '../data/mockData'; // No longer needed
import { 
  Plus, Trash2, Edit2, X, Save, LogIn, LogOut, Loader2, 
  ShoppingBag, Sprout, ChevronRight, Image as ImageIcon, 
  Youtube as YoutubeIcon, Layout, Phone, Key,
  ListFilter, Bug, Search, Smartphone, ShieldCheck, Users, Ban, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fileToBase64, cn, compressImage, getDirectImageURL } from '../lib/utils';
import { AppContent } from '../context/AppContext';
import { ImageSource } from '../types';
import DualImageInput from '../components/DualImageInput';
import SmartImage from '../components/SmartImage';

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
  
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'encyclopedia' | 'helplines' | 'content' | 'users'>('content');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryData | null>(null);

  const [isAddingAgriIssue, setIsAddingAgriIssue] = useState(false);
  const [editingAgriIssue, setEditingAgriIssue] = useState<AgriIssue | null>(null);
  const [agriIssueToDelete, setAgriIssueToDelete] = useState<AgriIssue | null>(null);

  const [isAddingHelpline, setIsAddingHelpline] = useState(false);
  const [editingHelpline, setEditingHelpline] = useState<Helpline | null>(null);
  const [helplineToDelete, setHelplineToDelete] = useState<Helpline | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    hindiName: '',
    category: '',
    brand: '',
    price: 0,
    hidePrice: false,
    unit: '',
    description: '',
    image: { primary: '', fallback: '' },
    crops: []
  });

  const [categoryForm, setCategoryForm] = useState<Omit<CategoryData, 'id'>>({
    name: '',
    icon: { primary: '', fallback: '' },
    order: 0
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
          name: 'फल्सावदिया कृषि बाज़ार',
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
        contactInfo: {
          whatsapp: '918982338046',
          address: 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश'
        }
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
      setProductForm({ name: '', hindiName: '', category: categories[0]?.id || '', brand: '', price: 0, unit: '', description: '', image: { primary: '', fallback: '' }, crops: [] });
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
      setCategoryForm({ name: '', icon: { primary: '', fallback: '' }, order: categories.length + 1 });
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
      { name: "फल्सावदिया कृषि बाज़ार", number: "8982338046", category: "हमारी दुकान", description: "पता: डिंपल चौराहा, शामगढ़ | समय: सुबह 9:00 - शाम 7:00", order: 1 },
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
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
            activeTab === 'users' ? "bg-[#2D5A27] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Users className="w-4 h-4" /> यूज़र्स (Users)
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider">
              उत्पादों की सूची ({products.length})
            </h3>
            <button 
              onClick={() => {
                setIsAdding(true);
                setEditingProduct(null);
                setProductForm({ name: '', hindiName: '', category: categories[0]?.id || '', brand: '', price: 0, unit: '', description: '', image: { primary: '', fallback: '' }, crops: [] });
              }}
              className="bg-[#2D5A27] text-white py-2 px-4 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" /> नया जोड़ें
            </button>
          </div>

          {/* List Content */}
          <div className="space-y-3">
            {products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm text-gray-400">कोई उत्पाद नहीं मिला।</p>
              </div>
            ) : (
              products.map((product, idx) => (
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
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        {product.brand} • {product.hidePrice ? 'कीमत छुपी हुई' : `₹${product.price}/${product.unit}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingProduct(product);
                        setProductForm(product);
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
                setCategoryForm({ name: '', icon: { primary: '', fallback: '' }, order: categories.length + 1 });
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
                        setCategoryForm({ name: cat.name, icon: cat.icon, order: cat.order });
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
              helplines.map((hp) => (
                <motion.div 
                  layout
                  key={hp.id}
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
              <div key={banner.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
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
              <div key={video.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
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
                <div key={partner.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4 relative group">
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
                <button onClick={() => { setIsAdding(false); setEditingProduct(null); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">कंपनी (Brand Name)</label>
                  <input 
                    required
                    type="text" 
                    value={productForm.brand}
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
                    value={productForm.hindiName}
                    onChange={e => setProductForm({...productForm, hindiName: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: यूरिया खाद"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">कीमत सेटिंग (Price Setting)</label>
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setProductForm({...productForm, hidePrice: false})}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all",
                        !productForm.hidePrice ? "bg-white text-[#2D5A27] shadow-sm" : "text-gray-400"
                      )}
                    >
                      Price (दिखाएँ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductForm({...productForm, hidePrice: true})}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all",
                        productForm.hidePrice ? "bg-white text-red-600 shadow-sm" : "text-gray-400"
                      )}
                    >
                      Not Mentioned (छुपाएँ)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={cn("space-y-1.5 transition-opacity", productForm.hidePrice && "opacity-50 pointer-events-none")}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">कीमत (Price)</label>
                    <input 
                      required={!productForm.hidePrice}
                      type="number" 
                      value={productForm.price}
                      onChange={e => setProductForm({...productForm, price: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">इकाई (Unit)</label>
                    <input 
                      required
                      type="text" 
                      value={productForm.unit}
                      onChange={e => setProductForm({...productForm, unit: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                      placeholder="जैसे: 45kg Bag"
                    />
                  </div>
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
                    value={productForm.description}
                    onChange={e => setProductForm({...productForm, description: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium h-24 resize-none"
                  />
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
                      value={agriIssueForm.hindiName}
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
                      value={agriIssueForm.englishName}
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
                      value={agriIssueForm.description}
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
                        {products.map(product => {
                          const isSelected = agriIssueForm.relatedProductIds.includes(product.id);
                          return (
                            <div 
                              key={product.id}
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
                    value={categoryForm.name}
                    onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: कंद फसलें"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">आइकन (Emoji/Icon)</label>
                  <DualImageInput 
                    label="श्रेणी आइकन (Category Icon)"
                    value={categoryForm.icon}
                    onChange={source => setCategoryForm({...categoryForm, icon: source})}
                    description="इमोजी के लिए नीचे टेक्स्ट बॉक्स उपयोग करें, इमेज के लिए ऊपर अपलोड करें"
                  />
                  <div className="mt-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1 text-xs">इमोजी (Simple Emoji Mode)</label>
                    <input 
                      type="text" 
                      value={typeof categoryForm.icon === 'string' ? categoryForm.icon : ''}
                      onChange={e => setCategoryForm({...categoryForm, icon: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3 outline-none transition-all font-medium text-xl"
                      placeholder="जैसे: 🥕"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">क्रम (Order)</label>
                  <input 
                    required
                    type="number" 
                    value={categoryForm.order}
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
                    value={helplineForm.name}
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
                    value={helplineForm.number}
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
                    value={helplineForm.category}
                    onChange={e => setHelplineForm({...helplineForm, category: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: कृषि विभाग"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">विवरण (Short Description)</label>
                  <input 
                    type="text" 
                    value={helplineForm.description}
                    onChange={e => setHelplineForm({...helplineForm, description: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 outline-none transition-all font-medium"
                    placeholder="जैसे: सरकारी योजनाओं की जानकारी के लिए"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">क्रम (Priority Order)</label>
                  <input 
                    type="number" 
                    value={helplineForm.order}
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
