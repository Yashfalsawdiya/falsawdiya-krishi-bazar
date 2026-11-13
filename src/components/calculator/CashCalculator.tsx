import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FolderOpen,
  History,
  Image as ImageIcon,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Share2,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { idbGet, idbSet } from '../../utils/idbStorage';
import {
  buildCashFingerprint,
  calculateCashSummary,
  CashAdjustment,
  CashCalculatorSettings,
  CashHistoryEntry,
  CashLineItem,
  DEFAULT_CASH_SETTINGS,
  DEFAULT_DENOMINATION_VALUES,
  formatCashDateTime,
  formatCashSummaryText,
  formatIndianCurrency,
  getDenominationStyle,
  numberToIndianWordsEn,
  validateNewAdjustment,
} from '../../utils/cashCalculatorUtils';
import {
  GeneratedCashReceipt,
  generateCashReceiptImage,
  shareOrDownloadReceiptImage,
} from '../../utils/cashReceiptGenerator';
import { downloadCashHistoryBackupPDF } from '../../utils/cashHistoryPdfGenerator';

const CASH_SETTINGS_STORAGE_KEY = 'falsawdiya_cash_calc_settings_v1';
const CASH_HISTORY_IDB_KEY = 'falsawdiya_cash_calc_history_v1';

type SubView = 'counter' | 'history' | 'settings';
type HistoryDateRange = 'all' | 'today' | 'month';

interface ShareTarget {
  createdAt: string;
  customerName: string;
  customerPhone: string;
  items: CashLineItem[];
  adjustments: CashAdjustment[];
  totalNotes: number;
  noteAmount: number;
  adjustmentNet: number;
  grandTotal: number;
}

function loadSavedSettings(): CashCalculatorSettings {
  try {
    const raw = localStorage.getItem(CASH_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_CASH_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CashCalculatorSettings>;
    const validDenominations = Array.isArray(parsed.denominations)
      ? parsed.denominations.filter(
          (d) => d && typeof d.value === 'number' && isFinite(d.value) && d.value > 0
        )
      : DEFAULT_CASH_SETTINGS.denominations;

    return {
      denominations:
        validDenominations.length > 0
          ? validDenominations
          : DEFAULT_CASH_SETTINGS.denominations,
      showCustomerFields:
        typeof parsed.showCustomerFields === 'boolean'
          ? parsed.showCustomerFields
          : DEFAULT_CASH_SETTINGS.showCustomerFields,
      showAmountInWords:
        typeof parsed.showAmountInWords === 'boolean'
          ? parsed.showAmountInWords
          : DEFAULT_CASH_SETTINGS.showAmountInWords,
      showLogoOnReceipt:
        typeof parsed.showLogoOnReceipt === 'boolean'
          ? parsed.showLogoOnReceipt
          : DEFAULT_CASH_SETTINGS.showLogoOnReceipt,
      includeZeroNotesInReceipt:
        typeof parsed.includeZeroNotesInReceipt === 'boolean'
          ? parsed.includeZeroNotesInReceipt
          : DEFAULT_CASH_SETTINGS.includeZeroNotesInReceipt,
      shopName:
        typeof parsed.shopName === 'string' && parsed.shopName.trim()
          ? parsed.shopName
          : DEFAULT_CASH_SETTINGS.shopName,
    };
  } catch {
    return DEFAULT_CASH_SETTINGS;
  }
}

const CashCalculator: React.FC = () => {
  const { appContent } = useAppContext();

  const resolvedLogoUrl = useMemo(() => {
    const logo = appContent?.branding?.logo;
    if (!logo) return '/icon-192.png';
    if (typeof logo === 'string') return logo || '/icon-192.png';
    return logo.primary || logo.fallback || '/icon-192.png';
  }, [appContent?.branding?.logo]);

  // Sub-navigation inside Cash Calculator
  const [subView, setSubView] = useState<SubView>('counter');

  // Persistent Settings (localStorage)
  const [settings, setSettings] = useState<CashCalculatorSettings>(loadSavedSettings);
  useEffect(() => {
    try {
      localStorage.setItem(CASH_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota issues
    }
  }, [settings]);

  // Persistent History (IndexedDB via idbStorage)
  const [historyEntries, setHistoryEntries] = useState<CashHistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    idbGet<CashHistoryEntry[]>(CASH_HISTORY_IDB_KEY).then((saved) => {
      if (!active) return;
      if (Array.isArray(saved)) {
        setHistoryEntries(saved);
      }
      setHistoryLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const persistHistory = async (nextEntries: CashHistoryEntry[]) => {
    setHistoryEntries(nextEntries);
    await idbSet(CASH_HISTORY_IDB_KEY, nextEntries);
  };

  // ==========================================
  // Counter State
  // ==========================================
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [adjustments, setAdjustments] = useState<CashAdjustment[]>([]);
  const [adjAmountInput, setAdjAmountInput] = useState('');
  const [adjNoteInput, setAdjNoteInput] = useState('');
  const [adjError, setAdjError] = useState<string | null>(null);
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState<string | null>(null);

  // Toast Feedback Banner
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    window.setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 3000);
  };

  // Confirmation Modals
  const [confirmClearCounter, setConfirmClearCounter] = useState(false);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<CashHistoryEntry | null>(null);
  const [confirmClearAllHistory, setConfirmClearAllHistory] = useState(false);

  // History Filters & Expanded Card
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateRange, setHistoryDateRange] = useState<HistoryDateRange>('all');
  const [historyExactDate, setHistoryExactDate] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Settings Custom Denomination Input
  const [newDenomInput, setNewDenomInput] = useState('');
  const [denomError, setDenomError] = useState<string | null>(null);

  // Share Modal State
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [whatsappInput, setWhatsappInput] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<GeneratedCashReceipt | null>(null);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);

  // PDF Backup Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState<string>('');

  // Derived Cash Summary
  const summary = useMemo(
    () => calculateCashSummary(settings.denominations, quantities, adjustments),
    [settings.denominations, quantities, adjustments]
  );

  const currentFingerprint = useMemo(
    () =>
      buildCashFingerprint(
        customerName,
        customerPhone,
        summary.activeItems,
        adjustments,
        summary.grandTotal
      ),
    [customerName, customerPhone, summary.activeItems, adjustments, summary.grandTotal]
  );

  // Live current clock display in Counter header
  const [liveClock, setLiveClock] = useState(() => new Date().toISOString());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveClock(new Date().toISOString());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  // ==========================================
  // Counter Handlers
  // ==========================================
  const handleQtyChange = (denomValue: number, rawVal: string) => {
    setAdjError(null);
    if (rawVal === '') {
      setQuantities((prev) => {
        const next = { ...prev };
        delete next[denomValue];
        return next;
      });
      return;
    }
    const clean = Math.max(0, Math.floor(Number(rawVal) || 0));
    setQuantities((prev) => ({
      ...prev,
      [denomValue]: Math.min(clean, 9999999),
    }));
  };

  const handleQtyStep = (denomValue: number, delta: number) => {
    setAdjError(null);
    setQuantities((prev) => {
      const current = prev[denomValue] || 0;
      const nextVal = Math.max(0, current + delta);
      if (nextVal === 0) {
        const next = { ...prev };
        delete next[denomValue];
        return next;
      }
      return { ...prev, [denomValue]: nextVal };
    });
  };

  const handleAddAdjustment = (type: 'plus' | 'minus') => {
    const check = validateNewAdjustment(
      summary.noteAmount,
      adjustments,
      type,
      adjAmountInput
    );
    if (!check.valid) {
      setAdjError(check.error);
      return;
    }

    const newAdj: CashAdjustment = {
      id: `adj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      amount: check.amount,
      note: adjNoteInput.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setAdjustments((prev) => [...prev, newAdj]);
    setAdjAmountInput('');
    setAdjNoteInput('');
    setAdjError(null);
  };

  const handleRemoveAdjustment = (adjId: string) => {
    const remaining = adjustments.filter((a) => a.id !== adjId);
    const remainingNet = remaining.reduce(
      (sum, item) => sum + (item.type === 'plus' ? item.amount : -item.amount),
      0
    );
    if (summary.noteAmount + remainingNet < 0) {
      setAdjError('इस समायोजन को हटाने पर कुल राशि नकारात्मक हो जाएगी। पहले घटाव राशि हटाएँ।');
      return;
    }
    setAdjustments(remaining);
    setAdjError(null);
  };

  const executeClearCounter = () => {
    setCustomerName('');
    setCustomerPhone('');
    setQuantities({});
    setAdjustments([]);
    setAdjAmountInput('');
    setAdjNoteInput('');
    setAdjError(null);
    setLastSavedFingerprint(null);
    setConfirmClearCounter(false);
  };

  const handleClearCounterClick = () => {
    const hasData =
      summary.totalNotes > 0 ||
      adjustments.length > 0 ||
      customerName.trim() !== '' ||
      customerPhone.trim() !== '';
    if (!hasData) {
      executeClearCounter();
      return;
    }
    setConfirmClearCounter(true);
  };

  const handleSaveEntry = async () => {
    if (summary.totalNotes === 0 && adjustments.length === 0) {
      showToast('सेव करने के लिए कम से कम एक नोट या समायोजन राशि दर्ज करें।', 'error');
      return;
    }

    if (
      lastSavedFingerprint === currentFingerprint ||
      (historyEntries[0] && historyEntries[0].fingerprint === currentFingerprint)
    ) {
      showToast('यह कैश हिसाब पहले ही सेव हो चुका है।', 'error');
      return;
    }

    const newEntry: CashHistoryEntry = {
      id: `cash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      denominations: summary.activeItems,
      adjustments: [...adjustments],
      totalNotes: summary.totalNotes,
      noteAmount: summary.noteAmount,
      adjustmentNet: summary.adjustmentNet,
      grandTotal: summary.grandTotal,
      fingerprint: currentFingerprint,
    };

    const nextEntries = [newEntry, ...historyEntries];
    await persistHistory(nextEntries);
    setLastSavedFingerprint(currentFingerprint);
    showToast('कैश हिसाब इतिहास में सफलतापूर्वक सेव हो गया!');
  };

  // ==========================================
  // Share Modal Handlers
  // ==========================================
  const openShareModal = async (target: ShareTarget) => {
    if (target.totalNotes === 0 && target.adjustments.length === 0) {
      showToast('शेयर करने के लिए पहले नोट संख्या या राशि दर्ज करें।', 'error');
      return;
    }
    setShareTarget(target);
    setWhatsappInput(target.customerPhone.replace(/\D/g, '').slice(-10));
    setCopiedText(false);
    setGeneratedReceipt(null);
    setIsGeneratingReceipt(true);
    try {
      const receipt = await generateCashReceiptImage({
        shopName: settings.shopName,
        logoUrl: resolvedLogoUrl,
        createdAt: target.createdAt,
        customerName: target.customerName,
        customerPhone: target.customerPhone,
        items: target.items,
        adjustments: target.adjustments,
        totalNotes: target.totalNotes,
        noteAmount: target.noteAmount,
        adjustmentNet: target.adjustmentNet,
        grandTotal: target.grandTotal,
        showAmountInWords: settings.showAmountInWords,
        showLogo: settings.showLogoOnReceipt,
        includeZeroNotes: settings.includeZeroNotesInReceipt,
      });
      setGeneratedReceipt(receipt);
    } catch (err) {
      console.error('Receipt generation failed:', err);
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const shareSummaryText = useMemo(() => {
    if (!shareTarget) return '';
    return formatCashSummaryText({
      shopName: settings.shopName,
      createdAt: shareTarget.createdAt,
      customerName: shareTarget.customerName,
      customerPhone: shareTarget.customerPhone,
      items: shareTarget.items,
      adjustments: shareTarget.adjustments,
      totalNotes: shareTarget.totalNotes,
      noteAmount: shareTarget.noteAmount,
      adjustmentNet: shareTarget.adjustmentNet,
      grandTotal: shareTarget.grandTotal,
      includeAmountInWords: settings.showAmountInWords,
    });
  }, [shareTarget, settings.shopName, settings.showAmountInWords]);

  const handleCopyShareText = async () => {
    if (!shareSummaryText) return;
    try {
      await navigator.clipboard.writeText(shareSummaryText);
      setCopiedText(true);
      showToast('कैश रिपोर्ट टेक्स्ट कॉपी हो गया!');
      window.setTimeout(() => setCopiedText(false), 2500);
    } catch {
      showToast('टेक्स्ट कॉपी नहीं हो सका।', 'error');
    }
  };

  const handleDirectWhatsApp = () => {
    if (!shareSummaryText) return;
    const digits = whatsappInput.replace(/\D/g, '');
    const encoded = encodeURIComponent(shareSummaryText);
    const url =
      digits.length === 10
        ? `https://wa.me/91${digits}?text=${encoded}`
        : digits.length > 10
        ? `https://wa.me/${digits}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareReceiptImage = async () => {
    if (!generatedReceipt) return;
    const outcome = await shareOrDownloadReceiptImage(
      generatedReceipt.blob,
      generatedReceipt.fileName,
      shareSummaryText
    );
    if (outcome === 'downloaded') {
      showToast('HD रसीद इमेज डाउनलोड हो गई! अब आप इसे WhatsApp पर भेज सकते हैं।');
    } else if (outcome === 'shared') {
      showToast('रसीद सफलतापूर्वक शेयर की गई!');
    }
  };

  const handleNativeTextShare = async () => {
    if (!shareSummaryText) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Cash Counting Report',
          text: shareSummaryText,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await handleCopyShareText();
  };

  // ==========================================
  // History Handlers
  // ==========================================
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    const now = new Date();
    const todayYmd = now.toISOString().slice(0, 10);
    const currentMonthYm = now.toISOString().slice(0, 7);

    return historyEntries.filter((entry) => {
      const entryDateObj = new Date(entry.createdAt);
      const entryYmd = !isNaN(entryDateObj.getTime())
        ? entryDateObj.toISOString().slice(0, 10)
        : '';

      if (historyExactDate && entryYmd !== historyExactDate) {
        return false;
      }
      if (!historyExactDate) {
        if (historyDateRange === 'today' && entryYmd !== todayYmd) return false;
        if (historyDateRange === 'month' && !entryYmd.startsWith(currentMonthYm)) return false;
      }

      if (q) {
        const hay = `${entry.customerName} ${entry.customerPhone} ${entry.grandTotal}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [historyEntries, historySearch, historyDateRange, historyExactDate]);

  const filteredGrandTotal = useMemo(
    () =>
      Math.round(
        (filteredHistory.reduce((sum, item) => sum + item.grandTotal, 0) + Number.EPSILON) * 100
      ) / 100,
    [filteredHistory]
  );

  const handleLoadEntryToCounter = (entry: CashHistoryEntry) => {
    const nextQty: Record<number, number> = {};
    const missingDenoms: number[] = [];

    for (const item of entry.denominations) {
      if (item.qty > 0) {
        nextQty[item.value] = item.qty;
        const exists = settings.denominations.some((d) => d.value === item.value);
        if (!exists) {
          missingDenoms.push(item.value);
        }
      }
    }

    if (missingDenoms.length > 0) {
      setSettings((prev) => ({
        ...prev,
        denominations: [
          ...prev.denominations,
          ...missingDenoms.map((val) => ({
            value: val,
            enabled: true,
            isCustom: true,
          })),
        ].sort((a, b) => b.value - a.value),
      }));
    } else {
      // Ensure denominations used in saved entry are enabled
      const usedSet = new Set(entry.denominations.map((d) => d.value));
      setSettings((prev) => ({
        ...prev,
        denominations: prev.denominations.map((d) =>
          usedSet.has(d.value) ? { ...d, enabled: true } : d
        ),
      }));
    }

    setCustomerName(entry.customerName);
    setCustomerPhone(entry.customerPhone);
    setQuantities(nextQty);
    setAdjustments(entry.adjustments || []);
    setAdjError(null);
    setLastSavedFingerprint(entry.fingerprint);
    setSubView('counter');
    showToast('पुरानी कैश एंट्री काउंटर में लोड की गई!');
  };

  const handleConfirmDeleteEntry = async () => {
    if (!deleteEntryTarget) return;
    const next = historyEntries.filter((e) => e.id !== deleteEntryTarget.id);
    await persistHistory(next);
    setDeleteEntryTarget(null);
    showToast('एंट्री इतिहास से हटाई गई।');
  };

  const handleConfirmClearAllHistory = async () => {
    await persistHistory([]);
    setConfirmClearAllHistory(false);
    showToast('सारा कैश इतिहास साफ़ किया गया।');
  };

  const handleExportHistoryPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfProgressText('PDF तैयार हो रही है...');

    try {
      // Read directly from IndexedDB (read-only) to guarantee full history backup
      const storedEntries = await idbGet<CashHistoryEntry[]>(CASH_HISTORY_IDB_KEY);
      const entriesToExport =
        Array.isArray(storedEntries) && storedEntries.length > 0
          ? storedEntries
          : historyEntries;

      if (entriesToExport.length === 0) {
        showToast('PDF बैकअप के लिए कोई इतिहास उपलब्ध नहीं है।', 'error');
        return;
      }

      const result = await downloadCashHistoryBackupPDF({
        entries: entriesToExport,
        shopName: settings.shopName,
        logoUrl: resolvedLogoUrl,
        showAmountInWords: settings.showAmountInWords,
        showLogo: settings.showLogoOnReceipt,
        onProgress: (currentPage, totalPages) => {
          setPdfProgressText(`PDF बन रही है... (${currentPage}/${totalPages})`);
        },
      });

      if (result.success) {
        showToast(
          `PDF बैकअप (${result.fileName}) सफलतापूर्वक डाउनलोड हो गया! (${result.totalEntries} एंट्री, ${result.totalPages} पेज)`
        );
      } else {
        showToast(result.error || 'PDF बैकअप डाउनलोड नहीं हो सका।', 'error');
      }
    } catch {
      showToast('PDF बैकअप बनाते समय त्रुटि हुई।', 'error');
    } finally {
      setIsExportingPdf(false);
      setPdfProgressText('');
    }
  };

  // ==========================================
  // Settings Handlers
  // ==========================================
  const handleAddCustomDenomination = () => {
    const parsed = parseFloat(newDenomInput.trim());
    if (!newDenomInput.trim() || isNaN(parsed) || parsed <= 0 || parsed > 10000000) {
      setDenomError('कृपया 1 से 1,00,00,000 के बीच सही मूल्य दर्ज करें।');
      return;
    }
    const cleanVal = Math.round((parsed + Number.EPSILON) * 100) / 100;
    const duplicate = settings.denominations.some((d) => d.value === cleanVal);
    if (duplicate) {
      setDenomError(`₹${formatIndianCurrency(cleanVal)} पहले से सूची में मौजूद है।`);
      return;
    }

    setSettings((prev) => ({
      ...prev,
      denominations: [
        ...prev.denominations,
        { value: cleanVal, enabled: true, isCustom: true },
      ].sort((a, b) => b.value - a.value),
    }));
    setNewDenomInput('');
    setDenomError(null);
    showToast(`नया नोट ₹${formatIndianCurrency(cleanVal)} जोड़ा गया!`);
  };

  const handleToggleDenomination = (val: number) => {
    const enabledCount = settings.denominations.filter((d) => d.enabled).length;
    const target = settings.denominations.find((d) => d.value === val);
    if (target?.enabled && enabledCount <= 1) {
      showToast('कम से कम एक नोट मूल्य सक्रिय रहना आवश्यक है।', 'error');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      denominations: prev.denominations.map((d) =>
        d.value === val ? { ...d, enabled: !d.enabled } : d
      ),
    }));
  };

  const handleDeleteDenomination = (val: number) => {
    if (settings.denominations.length <= 1) {
      showToast('कम से कम एक नोट मूल्य सूची में रहना जरूरी है।', 'error');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      denominations: prev.denominations.filter((d) => d.value !== val),
    }));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[val];
      return next;
    });
  };

  const handleRestoreDefaultDenominations = () => {
    setSettings((prev) => {
      const customOnes = prev.denominations.filter(
        (d) => d.isCustom && !DEFAULT_DENOMINATION_VALUES.includes(d.value as never)
      );
      const defaults = DEFAULT_DENOMINATION_VALUES.map((value) => ({
        value,
        enabled: true,
        isCustom: false,
      }));
      return {
        ...prev,
        denominations: [...defaults, ...customOnes].sort((a, b) => b.value - a.value),
      };
    });
    setDenomError(null);
    showToast('सभी डिफ़ॉल्ट भारतीय नोट वापस बहाल हो गए!');
  };

  const enabledDenominations = useMemo(
    () =>
      [...settings.denominations]
        .filter((d) => d.enabled)
        .sort((a, b) => b.value - a.value),
    [settings.denominations]
  );

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 shadow-xs ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="p-1 rounded-lg hover:bg-black/5"
            aria-label="बंद करें"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Bar: Counter | History | Settings */}
      <div className="bg-white rounded-2xl p-1.5 border border-gray-200/80 shadow-2xs grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setSubView('counter')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subView === 'counter'
              ? 'bg-[#2D5A27] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Banknote className="w-4 h-4 shrink-0" />
          <span>काउंटर (Counter)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubView('history')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subView === 'history'
              ? 'bg-[#2D5A27] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <History className="w-4 h-4 shrink-0" />
          <span>इतिहास ({historyEntries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubView('settings')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            subView === 'settings'
              ? 'bg-[#2D5A27] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>सेटिंग्स</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-VIEW 1: CASH COUNTER */}
      {/* ======================================================== */}
      {subView === 'counter' && (
        <div className="space-y-4">
          {/* Date/Time Strip & Optional Customer Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#2D5A27]/10 text-[#2D5A27] flex items-center justify-center shrink-0">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-800">नकद गिनती (Cash Counter)</h3>
                  <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#2D5A27]" />
                    {formatCashDateTime(liveClock)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearCounterClick}
                className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>साफ़ करें</span>
              </button>
            </div>

            {settings.showCustomerFields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ग्राहक का नाम (वैकल्पिक)"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all placeholder:text-gray-400 placeholder:font-medium"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="मोबाइल नंबर (वैकल्पिक)"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all placeholder:text-gray-400 placeholder:font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Denomination Rows Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-black text-gray-400 uppercase tracking-wider px-1 pb-1 border-b border-gray-100">
              <span>नोट मूल्य (Currency)</span>
              <span>संख्या (Qty)</span>
              <span>कुल राशि (₹)</span>
            </div>

            <div className="divide-y divide-gray-100">
              {enabledDenominations.map((denom) => {
                const qty = quantities[denom.value] || 0;
                const subtotal =
                  Math.round((denom.value * qty + Number.EPSILON) * 100) / 100;
                const badge = getDenominationStyle(denom.value);

                return (
                  <div
                    key={denom.value}
                    className="py-2.5 flex items-center justify-between gap-2 sm:gap-3"
                  >
                    {/* Left: Styled Note Badge */}
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-[76px] sm:min-w-[96px]">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-black font-mono w-full ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                      >
                        ₹{formatIndianCurrency(denom.value)}
                      </span>
                      <span className="text-gray-400 font-bold text-xs hidden sm:inline">×</span>
                    </div>

                    {/* Center: Stepper + Numeric Input */}
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-1 max-w-[205px] justify-center">
                      <button
                        type="button"
                        onClick={() => handleQtyStep(denom.value, -1)}
                        disabled={qty <= 0}
                        className="w-8 h-9 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 flex items-center justify-center text-gray-700 active:scale-95 transition-all cursor-pointer shrink-0"
                        aria-label={`₹${denom.value} घटाएँ`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={quantities[denom.value] !== undefined ? quantities[denom.value] : ''}
                        onChange={(e) => handleQtyChange(denom.value, e.target.value)}
                        placeholder="0"
                        className={`w-full min-w-[58px] h-9 px-2 rounded-xl border text-center text-sm sm:text-base font-black font-mono focus:outline-none focus:ring-2 focus:ring-[#2D5A27] transition-all ${
                          qty > 0
                            ? 'bg-emerald-50/40 border-emerald-300 text-[#1B4316]'
                            : 'bg-gray-50/70 border-gray-200 text-gray-800'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => handleQtyStep(denom.value, 1)}
                        className="w-8 h-9 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-[#2D5A27] active:scale-95 transition-all cursor-pointer shrink-0"
                        aria-label={`₹${denom.value} बढ़ाएँ`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Right: Line Total */}
                    <div className="text-right min-w-[78px] sm:min-w-[100px]">
                      <span
                        className={`font-mono text-sm sm:text-base font-black ${
                          subtotal > 0 ? 'text-[#2D5A27]' : 'text-gray-400'
                        }`}
                      >
                        ₹{formatIndianCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plus / Minus Adjustment Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-gray-800">
                  अतिरिक्त जोड़ / घटाव (Plus / Minus Adjustment)
                </h4>
                <p className="text-[11px] text-gray-500 font-medium">
                  अतिरिक्त नकद, सिक्के, छूट या खर्च अलग से जोड़ें/घटाएँ (नोट गिनती अलग सुरक्षित रहेगी)
                </p>
              </div>
            </div>

            {adjError && (
              <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="relative sm:col-span-4">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-black text-sm pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={adjAmountInput}
                  onChange={(e) => {
                    setAdjAmountInput(e.target.value);
                    setAdjError(null);
                  }}
                  placeholder="राशि (जैसे 80)"
                  className="w-full pl-8 pr-3 py-2.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white"
                />
              </div>

              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={adjNoteInput}
                  onChange={(e) => setAdjNoteInput(e.target.value)}
                  placeholder="विवरण (वैकल्पिक: भाड़ा / छूट)"
                  className="w-full px-3.5 py-2.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-4">
                <button
                  type="button"
                  onClick={() => handleAddAdjustment('plus')}
                  className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#2D5A27] border border-emerald-200 font-black text-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>जोड़ें (Plus)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAdjustment('minus')}
                  className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black text-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                  <span>घटाएँ (Minus)</span>
                </button>
              </div>
            </div>

            {adjustments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  सक्रिय समायोजन ({adjustments.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {adjustments.map((adj) => (
                    <span
                      key={adj.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        adj.type === 'plus'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      <span className="font-mono font-black">
                        {adj.type === 'plus' ? '+' : '-'}₹{formatIndianCurrency(adj.amount)}
                      </span>
                      {adj.note && <span className="text-[11px] opacity-80">({adj.note})</span>}
                      <button
                        type="button"
                        onClick={() => handleRemoveAdjustment(adj.id)}
                        className="p-0.5 rounded-full hover:bg-black/10 cursor-pointer"
                        aria-label="समायोजन हटाएँ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Summary & Sticky Actions Card (#2D5A27 Green Card) */}
          <div className="bg-[#2D5A27] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-white/75">
                  कुल नकद राशि (Grand Total)
                </p>
                <p className="text-3xl sm:text-4xl font-black text-amber-300 font-mono mt-0.5">
                  ₹ {formatIndianCurrency(summary.grandTotal)}
                </p>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl border border-white/10 text-xs font-black">
                  <span>{summary.totalNotes}</span>
                  <span className="text-white/80 font-bold">कुल नोट</span>
                </div>
                <p className="text-[11px] font-semibold text-white/80">
                  नोट राशि: ₹{formatIndianCurrency(summary.noteAmount)}
                  {summary.adjustmentNet !== 0 && (
                    <span className="ml-2 text-amber-200 font-bold">
                      ({summary.adjustmentNet >= 0 ? '+' : '-'}₹
                      {formatIndianCurrency(Math.abs(summary.adjustmentNet))})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {settings.showAmountInWords && (
              <div className="bg-black/20 px-3.5 py-2.5 rounded-2xl border border-white/10 text-xs font-semibold text-white/95 italic">
                {numberToIndianWordsEn(summary.grandTotal)}
              </div>
            )}

            {/* Action Buttons: Save | Share | Clear */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSaveEntry}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>सेव (Save)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  openShareModal({
                    createdAt: new Date().toISOString(),
                    customerName: customerName.trim(),
                    customerPhone: customerPhone.trim(),
                    items: summary.items,
                    adjustments: [...adjustments],
                    totalNotes: summary.totalNotes,
                    noteAmount: summary.noteAmount,
                    adjustmentNet: summary.adjustmentNet,
                    grandTotal: summary.grandTotal,
                  })
                }
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-white hover:bg-gray-100 text-[#1B4316] font-black text-xs sm:text-sm shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>शेयर (Share)</span>
              </button>

              <button
                type="button"
                onClick={handleClearCounterClick}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-white/10 hover:bg-red-500/80 text-white border border-white/20 font-black text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>साफ़ करें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-VIEW 2: CASH HISTORY */}
      {/* ======================================================== */}
      {subView === 'history' && (
        <div className="space-y-4">
          {/* Search & Date Filter Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-[#2D5A27]" />
                <h3 className="text-sm font-black text-gray-800">
                  सेव किया गया कैश इतिहास (Saved History)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {historyEntries.length > 0 && (
                  <>
                    <button
                      type="button"
                      disabled={isExportingPdf}
                      onClick={handleExportHistoryPdf}
                      className="text-[11px] font-bold text-[#2D5A27] bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 px-2.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExportingPdf ? 'PDF बन रही...' : 'PDF बैकअप'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAllHistory(true)}
                      className="text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl border border-red-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>सब हटाएँ</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search + Date Input */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="relative sm:col-span-7">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="नाम, मोबाइल या राशि से खोजें..."
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white"
                />
              </div>

              <div className="relative sm:col-span-5">
                <input
                  type="date"
                  value={historyExactDate}
                  onChange={(e) => setHistoryExactDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white"
                />
              </div>
            </div>

            {/* Quick Date Chips */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: 'सभी' },
                    { id: 'today', label: 'आज' },
                    { id: 'month', label: 'इस महीने' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setHistoryExactDate('');
                      setHistoryDateRange(tab.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !historyExactDate && historyDateRange === tab.id
                        ? 'bg-[#2D5A27] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                {historyExactDate && (
                  <button
                    type="button"
                    onClick={() => setHistoryExactDate('')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>तारीख हटाएँ</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="text-xs font-black text-[#2D5A27] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                कुल ({filteredHistory.length}): ₹{formatIndianCurrency(filteredGrandTotal)}
              </div>
            </div>
          </div>

          {/* History List */}
          {!historyLoaded ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center text-xs font-bold text-gray-400">
              इतिहास लोड हो रहा है...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center space-y-2">
              <History className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-600">कोई सेव किया गया कैश हिसाब नहीं मिला।</p>
              <p className="text-xs text-gray-400">
                काउंटर टैब में नोट गिनकर &quot;सेव (Save)&quot; बटन दबाएँ।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((entry) => {
                const isExpanded = expandedHistoryId === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs overflow-hidden"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedHistoryId(isExpanded ? null : entry.id)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/70 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-black text-gray-900 truncate">
                          {entry.customerName || formatCashDateTime(entry.createdAt)}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-gray-500">
                          <span>{formatCashDateTime(entry.createdAt)}</span>
                          {entry.customerPhone && (
                            <span className="flex items-center gap-1 text-gray-700 font-bold">
                              <Phone className="w-3 h-3 text-[#2D5A27]" />
                              {entry.customerPhone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <p className="text-base sm:text-lg font-black text-[#2D5A27] font-mono">
                            ₹{formatIndianCurrency(entry.grandTotal)}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500">
                            {entry.totalNotes} नोट
                            {entry.adjustmentNet !== 0 && (
                              <span className="ml-1 text-amber-700">
                                ({entry.adjustmentNet >= 0 ? '+' : '-'}₹
                                {formatIndianCurrency(Math.abs(entry.adjustmentNet))})
                              </span>
                            )}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3">
                        <div className="space-y-1.5">
                          {entry.denominations.map((line) => {
                            const style = getDenominationStyle(line.value);
                            return (
                              <div
                                key={line.value}
                                className="flex items-center justify-between text-xs font-bold bg-white px-3 py-2 rounded-xl border border-gray-100"
                              >
                                <span
                                  className={`px-2 py-0.5 rounded-lg border font-mono ${style.bgClass} ${style.textClass} ${style.borderClass}`}
                                >
                                  ₹{formatIndianCurrency(line.value)}
                                </span>
                                <span className="text-gray-600 font-mono">× {line.qty}</span>
                                <span className="text-gray-900 font-mono font-black">
                                  ₹{formatIndianCurrency(line.subtotal)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {entry.adjustments && entry.adjustments.length > 0 && (
                          <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-1 text-xs">
                            <p className="font-black text-gray-600">समायोजन (Adjustments):</p>
                            {entry.adjustments.map((adj) => (
                              <div key={adj.id} className="flex justify-between font-bold">
                                <span className="text-gray-600">
                                  {adj.note || (adj.type === 'plus' ? 'अतिरिक्त जोड़' : 'घटाव')}
                                </span>
                                <span
                                  className={`font-mono ${
                                    adj.type === 'plus' ? 'text-[#2D5A27]' : 'text-red-600'
                                  }`}
                                >
                                  {adj.type === 'plus' ? '+' : '-'}₹
                                  {formatIndianCurrency(adj.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-700 bg-emerald-50/70 px-3 py-2 rounded-xl border border-emerald-100">
                          <span>नोट राशि: ₹{formatIndianCurrency(entry.noteAmount)}</span>
                          <span className="text-[#2D5A27] font-black">
                            Grand Total: ₹{formatIndianCurrency(entry.grandTotal)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleLoadEntryToCounter(entry)}
                            className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 text-xs font-black cursor-pointer"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-[#2D5A27]" />
                            <span>काउंटर में खोलें</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openShareModal({
                                createdAt: entry.createdAt,
                                customerName: entry.customerName,
                                customerPhone: entry.customerPhone,
                                items: entry.denominations,
                                adjustments: entry.adjustments || [],
                                totalNotes: entry.totalNotes,
                                noteAmount: entry.noteAmount,
                                adjustmentNet: entry.adjustmentNet,
                                grandTotal: entry.grandTotal,
                              })
                            }
                            className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-[#2D5A27] hover:bg-[#20401B] text-white text-xs font-black cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>शेयर</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteEntryTarget(entry)}
                            className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-black cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>हटाएँ</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-VIEW 3: SETTINGS */}
      {/* ======================================================== */}
      {subView === 'settings' && (
        <div className="space-y-4">
          {/* Add Custom Denomination Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
              <div>
                <h3 className="text-sm font-black text-gray-800">
                  करेंसी नोट प्रबंधन (Currency Denominations)
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">
                  नया कस्टम नोट मूल्य जोड़ें, या आवश्यकता अनुसार किसी नोट को चालू/बंद करें
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestoreDefaultDenominations}
                className="text-xs font-bold text-[#2D5A27] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>डिफ़ॉल्ट वापस लाएँ</span>
              </button>
            </div>

            {denomError && (
              <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-200">
                {denomError}
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-black text-sm pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="any"
                  value={newDenomInput}
                  onChange={(e) => {
                    setNewDenomInput(e.target.value);
                    setDenomError(null);
                  }}
                  placeholder="नया मूल्य दर्ज करें (जैसे 5000)"
                  className="w-full pl-8 pr-3 py-2.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomDenomination}
                className="px-4 py-2.5 rounded-2xl bg-[#2D5A27] hover:bg-[#20401B] text-white font-black text-xs sm:text-sm flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>जोड़ें (Add)</span>
              </button>
            </div>

            {/* Denominations List */}
            <div className="space-y-2 pt-1">
              {[...settings.denominations]
                .sort((a, b) => b.value - a.value)
                .map((denom) => {
                  const style = getDenominationStyle(denom.value);
                  return (
                    <div
                      key={denom.value}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-gray-100 bg-gray-50/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-3 py-1 rounded-xl border font-mono text-xs sm:text-sm font-black ${style.bgClass} ${style.textClass} ${style.borderClass}`}
                        >
                          ₹{formatIndianCurrency(denom.value)}
                        </span>
                        {denom.isCustom && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg">
                            कस्टम
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleDenomination(denom.value)}
                          className={`px-3 py-1 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                            denom.enabled
                              ? 'bg-emerald-50 text-[#2D5A27] border-emerald-200'
                              : 'bg-gray-200/70 text-gray-500 border-gray-300'
                          }`}
                        >
                          {denom.enabled ? 'चालू (Active)' : 'बंद'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDenomination(denom.value)}
                          className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="नोट हटाएँ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Display & Receipt Preferences */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-3">
            <h4 className="text-sm font-black text-gray-800 border-b border-gray-100 pb-2">
              रसीद और फॉर्म सेटिंग्स (Preferences)
            </h4>

            {(
              [
                {
                  key: 'showCustomerFields',
                  title: 'ग्राहक का नाम व मोबाइल फील्ड दिखाएँ',
                  desc: 'काउंटर में वैकल्पिक नाम और मोबाइल नंबर इनपुट दिखाने के लिए',
                },
                {
                  key: 'showAmountInWords',
                  title: 'शब्दों में राशि (Amount in Words) दिखाएँ',
                  desc: 'कुल राशि और HD रसीद में शब्दों में राशि प्रिंट करने के लिए',
                },
                {
                  key: 'showLogoOnReceipt',
                  title: 'HD इमेज रसीद पर दुकान का लोगो दिखाएँ',
                  desc: 'इमेज स्लिप के ऊपर फल्सावदिया कृषि बाजार का लोगो जोड़ने के लिए',
                },
                {
                  key: 'includeZeroNotesInReceipt',
                  title: 'रसीद में 0 मात्रा वाले नोट भी दिखाएँ',
                  desc: 'बंद रखने पर रसीद में केवल गिने गए नोट ही दिखेंगे (साफ़ रसीद)',
                },
              ] as const
            ).map((opt) => {
              const checked = settings[opt.key];
              return (
                <div
                  key={opt.key}
                  onClick={() =>
                    setSettings((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))
                  }
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-800">{opt.title}</p>
                    <p className="text-[11px] text-gray-500">{opt.desc}</p>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                      checked ? 'bg-[#2D5A27]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* History Management inside Settings */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-sm font-black text-gray-800">
                इतिहास डेटा प्रबंधन (History Management)
              </h4>
              <span className="text-xs font-bold text-[#2D5A27] bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                {historyEntries.length} रिकॉर्ड सेव
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              सभी एंट्री आपके डिवाइस के ऑफलाइन IndexedDB में सुरक्षित रहती हैं।
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isExportingPdf || historyEntries.length === 0}
                onClick={handleExportHistoryPdf}
                className="py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-[#2D5A27] border border-emerald-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>
                  {isExportingPdf
                    ? pdfProgressText || 'PDF बन रही है...'
                    : 'PDF Backup डाउनलोड करें'}
                </span>
              </button>
              <button
                type="button"
                disabled={historyEntries.length === 0}
                onClick={() => setConfirmClearAllHistory(true)}
                className="py-2.5 px-3 rounded-2xl bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 border border-red-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>सारा इतिहास हटाएँ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SHARE CASH REPORT (WHATSAPP + HD IMAGE + TEXT) */}
      {/* ======================================================== */}
      {shareTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">
                  कैश रिपोर्ट शेयर करें (Share Cash Report)
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Grand Total: ₹{formatIndianCurrency(shareTarget.grandTotal)} ({shareTarget.totalNotes} नोट)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareTarget(null)}
                className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Direct WhatsApp Chat */}
            <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-[#1B4316]">
                <MessageCircle className="w-4 h-4 text-[#2D5A27]" />
                <span>Direct WhatsApp Chat पर टेक्स्ट भेजें</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={whatsappInput}
                  onChange={(e) => setWhatsappInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="मोबाइल नंबर (वैकल्पिक)"
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]"
                />
                <button
                  type="button"
                  onClick={handleDirectWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-[#2D5A27] hover:bg-[#20401B] text-white text-xs font-black shrink-0 cursor-pointer"
                >
                  WhatsApp भेजें
                </button>
              </div>
            </div>

            {/* 2. HD Image Receipt */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-gray-800">
                  <ImageIcon className="w-4 h-4 text-[#2D5A27]" />
                  <span>HD इमेज रसीद (Image Receipt)</span>
                </div>
                {isGeneratingReceipt && (
                  <span className="text-[11px] font-bold text-gray-500">बन रही है...</span>
                )}
              </div>

              {generatedReceipt && (
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-white max-h-52 overflow-y-auto">
                  <img
                    src={generatedReceipt.dataUrl}
                    alt="Cash Counting Receipt Preview"
                    className="w-full h-auto block"
                  />
                </div>
              )}

              <button
                type="button"
                disabled={!generatedReceipt || isGeneratingReceipt}
                onClick={handleShareReceiptImage}
                className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 border border-gray-300 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#2D5A27]" />
                <span>HD रसीद शेयर / डाउनलोड करें</span>
              </button>
            </div>

            {/* 3. Summary Text Copy / System Share */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyShareText}
                className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-4 h-4 text-[#2D5A27]" />
                    <span>कॉपी हो गया</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Text कॉपी करें</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNativeTextShare}
                className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Text शेयर करें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRMATION DIALOGS */}
      {/* ======================================================== */}
      {confirmClearCounter && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <h4 className="text-sm font-black text-gray-900">क्या वर्तमान गिनती साफ़ करें?</h4>
            <p className="text-xs text-gray-600 font-medium">
              काउंटर में दर्ज सभी नोट संख्या, ग्राहक विवरण और समायोजन रीसेट हो जाएंगे।
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmClearCounter(false)}
                className="py-2.5 rounded-xl bg-gray-100 text-gray-700 font-black text-xs cursor-pointer"
              >
                नहीं, रहने दें
              </button>
              <button
                type="button"
                onClick={executeClearCounter}
                className="py-2.5 rounded-xl bg-red-600 text-white font-black text-xs cursor-pointer"
              >
                हाँ, साफ़ करें
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteEntryTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <h4 className="text-sm font-black text-gray-900">एंट्री हटाने की पुष्टि करें</h4>
            <p className="text-xs text-gray-600 font-medium">
              क्या आप ₹{formatIndianCurrency(deleteEntryTarget.grandTotal)} वाली यह कैश एंट्री इतिहास से स्थायी रूप से हटाना चाहते हैं?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteEntryTarget(null)}
                className="py-2.5 rounded-xl bg-gray-100 text-gray-700 font-black text-xs cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEntry}
                className="py-2.5 rounded-xl bg-red-600 text-white font-black text-xs cursor-pointer"
              >
                हटाएँ
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClearAllHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <h4 className="text-sm font-black text-gray-900">सारा इतिहास साफ़ करें?</h4>
            <p className="text-xs text-gray-600 font-medium">
              इससे सभी {historyEntries.length} सेव किए गए कैश रिकॉर्ड स्थायी रूप से हट जाएंगे।
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmClearAllHistory(false)}
                className="py-2.5 rounded-xl bg-gray-100 text-gray-700 font-black text-xs cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllHistory}
                className="py-2.5 rounded-xl bg-red-600 text-white font-black text-xs cursor-pointer"
              >
                सब हटाएँ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashCalculator;
