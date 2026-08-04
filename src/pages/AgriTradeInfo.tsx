import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Plus, 
  Copy, 
  Check, 
  Share2, 
  Trash2, 
  FileText, 
  ExternalLink, 
  Building2, 
  Calendar, 
  Tag, 
  AlertTriangle, 
  X, 
  Lock, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Info
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AgriTradeNotice } from '../types';
import { 
  fetchTradeNotices, 
  syncLatestTradeNotices, 
  addCustomNotice, 
  deleteTradeNotice 
} from '../services/agriTradeNoticeService';
import ApiKeyModal from '../components/ApiKeyModal';
import { cn } from '../lib/utils';

const CATEGORIES = [
  'सभी (All)',
  'Government Orders',
  'Ban Notifications',
  'Fertilizer',
  'Pesticides',
  'Seeds',
  'Licensing',
  'Legal Updates',
  'GST',
  'Subsidy',
  'Company Circulars',
  'Others'
] as const;

export default function AgriTradeInfo() {
  const { isAdmin, userSettings } = useAppContext();
  const navigate = useNavigate();

  const [notices, setNotices] = useState<AgriTradeNotice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('सभी (All)');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

  // Modal states for adding manual notice & API key modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New notice form state
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newState, setNewState] = useState('केंद्र सरकार (भारत)');
  const [newCat, setNewCat] = useState<AgriTradeNotice['category']>('Government Orders');
  const [newSummary, setNewSummary] = useState('');
  const [newFullContent, setNewFullContent] = useState('');
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [newSource, setNewSource] = useState('आधिकारिक राजपत्र');
  const [newIsImportant, setNewIsImportant] = useState(false);

  // Load notices on mount
  useEffect(() => {
    if (!isAdmin) {
      // Access denied timeout
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }

    loadNotices();
  }, [isAdmin, navigate]);

  const loadNotices = async () => {
    setLoading(true);
    const data = await fetchTradeNotices();
    setNotices(data);
    setLoading(false);
  };

  const handleSync = async () => {
    if (!userSettings?.geminiApiKey) {
      setErrorMessage("ताज़ा सरकारी आदेश सिंक करने के लिए Gemini API Key आवश्यक है।");
      setIsApiKeyModalOpen(true);
      return;
    }

    setSyncing(true);
    setStatusMessage(null);

    const result = await syncLatestTradeNotices(userSettings.geminiApiKey);
    
    if (result.success) {
      setStatusMessage({ text: result.message, type: 'success' });
      await loadNotices();
    } else {
      setStatusMessage({ text: result.message, type: 'error' });
    }

    setSyncing(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;

    const todayStr = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    await addCustomNotice({
      title: newTitle.trim(),
      date: todayStr,
      department: newDept.trim() || 'कृषि विभाग',
      state: newState.trim() || 'केंद्र सरकार (भारत)',
      category: newCat,
      summary: newSummary.trim(),
      fullContent: newFullContent.trim() || newSummary.trim(),
      orderNumber: newOrderNumber.trim() || `ORD/${Date.now().toString().slice(-6)}`,
      pdfUrl: newPdfUrl.trim() || undefined,
      source: newSource.trim() || 'आधिकारिक राजपत्र',
      isImportant: newIsImportant
    });

    // Reset Form
    setNewTitle('');
    setNewDept('');
    setNewState('केंद्र सरकार (भारत)');
    setNewCat('Government Orders');
    setNewSummary('');
    setNewFullContent('');
    setNewOrderNumber('');
    setNewPdfUrl('');
    setNewSource('आधिकारिक राजपत्र');
    setNewIsImportant(false);
    setIsAddModalOpen(false);

    setStatusMessage({ text: "नई सूचना सफलतापूर्वक प्रकाशित की गई!", type: 'success' });
    await loadNotices();
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm("क्या आप इस सूचना को हटाना चाहते हैं?")) {
      await deleteTradeNotice(id);
      setNotices(prev => prev.filter(n => n.id !== id));
      setStatusMessage({ text: "सूचना हटा दी गई।", type: 'success' });
    }
  };

  // Format Notice for WhatsApp and Clipboard
  const getFormattedShareText = (notice: AgriTradeNotice) => {
    return `*कृषि व्यापार सूचना केंद्र*
*फल्सावदिया कृषि बाज़ार (Retailer/Distributor Hub)*

${notice.isImportant ? "🔴 *अति महत्वपूर्ण सरकारी सूचना*\n" : ""}
*शीर्षक:*
${notice.title}

🏛️ *विभाग:* ${notice.department}
📍 *क्षेत्र/राज्य:* ${notice.state || "भारत"}
📅 *प्रकाशन तिथि:* ${notice.date}
${notice.orderNumber ? `🔢 *राजपत्र/आदेश क्र.:* ${notice.orderNumber}\n` : ""}
📝 *विवरण:*
${notice.fullContent || notice.summary}

📚 *स्रोत:* ${notice.source || "आधिकारिक सूचना"}
${notice.pdfUrl ? `🔗 *अधिकारक लिंक/PDF:* ${notice.pdfUrl}\n` : ""}
━━━━━━━━━━━━━━━
*फल्सावदिया कृषि बाज़ार - एडमिन पोर्टल*`;
  };

  const handleCopy = async (notice: AgriTradeNotice, event: React.MouseEvent) => {
    event.stopPropagation();
    const text = getFormattedShareText(notice);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedIdx(notice.id);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  // Filter & Search Logic
  const filteredNotices = notices.filter(item => {
    // Category Filter
    if (selectedCategory !== 'सभी (All)' && item.category !== selectedCategory) {
      return false;
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchFull = (item.fullContent || '').toLowerCase().includes(q);
      const matchDept = item.department.toLowerCase().includes(q);
      const matchOrder = (item.orderNumber || '').toLowerCase().includes(q);
      const matchSource = item.source.toLowerCase().includes(q);
      const matchState = (item.state || '').toLowerCase().includes(q);

      return matchTitle || matchSummary || matchFull || matchDept || matchOrder || matchSource || matchState;
    }

    return true;
  });

  // Guard: If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-red-50 border border-red-200 rounded-3xl p-8 max-w-sm w-full space-y-4 shadow-xl text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-red-700">अनुमति अस्वीकृत (Access Denied)</h2>
          <p className="text-xs text-red-600 font-bold leading-relaxed">
            यह पेज केवल <strong>Admin</strong> के लिए सुरक्षित है। आपको होम पेज पर रिडायरेक्ट किया जा रहा है...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setIsApiKeyModalOpen(false)} 
        message={errorMessage} 
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#2D5A27] via-[#23471F] to-[#183315] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Only Section</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              कृषि व्यापार सूचना केंद्र
            </h1>
            <p className="text-xs text-emerald-100/90 font-medium max-w-xl">
              Retailers, Wholesalers एवं Distributors के लिए सरकारी आदेश, FCO, CIB&RC नियम, कीटनाशी बैन, लाइसेंस एवं कंपनी सर्कुलर्स का मुख्य हब।
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#2D5A27] hover:bg-emerald-50 rounded-2xl text-xs font-black shadow-md transition-all disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
              <span>{syncing ? "सिंक हो रहा है..." : "ताज़ा सिंक करें"}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>नई सूचना जोड़ें</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Alert Toast */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-2xl text-xs font-black flex items-center justify-between shadow-sm border",
              statusMessage.type === 'success' 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                : "bg-red-50 text-red-800 border-red-200"
            )}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Category Filter Section */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="उत्पाद, टेक्निकल नाम, कंपनी, आदेश क्र. या विभाग से खोजें..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-[11px] font-black shrink-0 transition-all border",
                selectedCategory === cat
                  ? "bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#2D5A27] animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-500">सरकारी व्यापार सूचनाएँ लोड हो रही हैं...</p>
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-3 shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-sm font-black text-gray-700">कोई सूचना नहीं मिली</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            चुने गए फ़िल्टर के अनुसार कोई परिणाम उपलब्ध नहीं है। आप ऊपर **"ताज़ा सिंक करें"** बटन दबाकर नई सूचनाएं खोज सकते हैं।
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((item) => {
            const isExpanded = expandedNoticeId === item.id;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white rounded-3xl p-5 border shadow-sm transition-all duration-200 flex flex-col gap-4 relative overflow-hidden",
                  item.isImportant 
                    ? "border-red-200 ring-2 ring-red-500/10 bg-red-50/10" 
                    : "border-gray-100 hover:border-gray-200"
                )}
              >
                {/* Important Tag Badge */}
                {item.isImportant && (
                  <div className="bg-red-600 text-white text-[9.5px] font-black uppercase px-3 py-1 rounded-full w-fit tracking-wider flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                    🔴 महत्वपूर्ण सरकारी सूचना
                  </div>
                )}

                {/* Top Info Tags */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-50 text-[#2D5A27] border border-emerald-200/60 font-black rounded-lg">
                      {item.category}
                    </span>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-bold rounded-lg flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-gray-500" />
                      {item.department}
                    </span>
                    {item.state && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9.5px] font-black rounded-md">
                        {item.state}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[10px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.date}</span>
                  </div>
                </div>

                {/* Title & Order Number */}
                <div className="space-y-1">
                  <h2 className="text-base font-black text-gray-900 leading-snug">
                    {item.title}
                  </h2>
                  {item.orderNumber && (
                    <p className="text-[10px] font-mono text-gray-500 font-bold">
                      क्रमांक: <span className="text-gray-800">{item.orderNumber}</span>
                    </p>
                  )}
                </div>

                {/* Summary / Content */}
                <div className="text-xs text-gray-700 font-medium leading-relaxed bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                  <p className="whitespace-pre-line">
                    {isExpanded ? (item.fullContent || item.summary) : item.summary}
                  </p>

                  {(item.fullContent && item.fullContent !== item.summary) && (
                    <button
                      onClick={() => setExpandedNoticeId(isExpanded ? null : item.id)}
                      className="mt-2 text-[11px] font-black text-[#2D5A27] flex items-center gap-1 hover:underline"
                    >
                      <span>{isExpanded ? "कम विवरण देखें" : "पूरा विवरण देखें"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Source & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <div className="text-[10px] text-gray-500 font-bold">
                    स्रोत: <span className="text-gray-800 font-black">{item.source || "आधिकारिक राजपत्र"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* PDF Link if available */}
                    {item.pdfUrl && (
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[10.5px] font-black flex items-center gap-1 border border-blue-200 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>PDF/लिंक</span>
                      </a>
                    )}

                    {/* Copy Button */}
                    <button
                      onClick={(e) => handleCopy(item, e)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10.5px] font-black flex items-center gap-1.5 transition-all border",
                        copiedIdx === item.id 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      {copiedIdx === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>कॉपी हुआ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>कॉपी</span>
                        </>
                      )}
                    </button>

                    {/* WhatsApp Share Button */}
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getFormattedShareText(item))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-[#2D5A27] text-white hover:bg-[#1f401b] rounded-xl text-[10.5px] font-black flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>शेयर</span>
                    </a>

                    {/* Delete Button (Admin Only) */}
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-all ml-1"
                      title="सूचना हटाएँ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Manual Add Notice Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[120] backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-gray-100 my-8"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#2D5A27]" />
                  नई व्यापारी सूचना जोड़ें
                </h3>
                <button onClick={() => setIsAddModalOpen(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs font-bold text-gray-700">
                <div>
                  <label className="block mb-1">सूचना शीर्षक (Title) *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="उदा: उर्वरक नियंत्रण आदेश - यूरिया स्टॉक रिपोर्टिंग..."
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#2D5A27]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1">विभाग (Department)</label>
                    <input
                      type="text"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      placeholder="उदा: CIB&RC / FCO / कृषि विभाग"
                      className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">श्रेणी (Category)</label>
                    <select
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value as any)}
                      className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white font-bold"
                    >
                      {CATEGORIES.filter(c => c !== 'सभी (All)').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1">क्षेत्र/राज्य</label>
                    <input
                      type="text"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      placeholder="उदा: मध्यप्रदेश / केंद्र सरकार"
                      className="w-full p-2.5 border rounded-xl bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">आदेश/राजपत्र क्रमांक</label>
                    <input
                      type="text"
                      value={newOrderNumber}
                      onChange={(e) => setNewOrderNumber(e.target.value)}
                      placeholder="उदा: GOV/2026/88"
                      className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1">संक्षिप्त सारांश (Summary) *</label>
                  <textarea
                    required
                    rows={2}
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    placeholder="संक्षेप में 2-3 पंक्तियों में आदेश का मुख्य बिंदु लिखें..."
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block mb-1">विस्तृत विवरण (Full Description)</label>
                  <textarea
                    rows={4}
                    value={newFullContent}
                    onChange={(e) => setNewFullContent(e.target.value)}
                    placeholder="बिंदुवार पूरा आदेश/नियम यहाँ लिखें..."
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1">स्रोत (Source)</label>
                    <input
                      type="text"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      placeholder="उदा: आधिकारिक राजपत्र"
                      className="w-full p-2.5 border rounded-xl bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">PDF / वेब लिंक (URL)</label>
                    <input
                      type="url"
                      value={newPdfUrl}
                      onChange={(e) => setNewPdfUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 border rounded-xl bg-gray-50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="importantCheck"
                    checked={newIsImportant}
                    onChange={(e) => setNewIsImportant(e.target.checked)}
                    className="w-4 h-4 text-[#2D5A27] rounded border-gray-300 focus:ring-[#2D5A27]"
                  />
                  <label htmlFor="importantCheck" className="text-xs font-black text-red-600 cursor-pointer">
                    🔴 महत्वपूर्ण सरकारी सूचना के रूप में मार्क करें
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-xl"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2D5A27] text-white font-black rounded-xl hover:bg-[#22441d]"
                  >
                    सूचना प्रकाशित करें
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
