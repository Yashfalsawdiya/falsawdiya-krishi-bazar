import React, { useMemo, useState } from 'react';
import {
  X,
  FileText,
  Download,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Eye,
  Loader2,
  Layers,
  ListChecks,
  Filter,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  TrendingDown,
  Package,
} from 'lucide-react';
import { AccountingProduct, StockManagementConfig } from '../../types/accounting';
import { ACCOUNTING_PRODUCT_CATEGORIES } from './ProductBasicInfoFields';
import { getProductVariants } from '../../utils/agriPackagingUtils';
import {
  StockExportScope,
  StockPriceMode,
  StockReportType,
  buildStockExportFileName,
  buildBatchReportRows,
  buildLowStockReportRows,
  generateStockExportPdfBlob,
  formatStockListText,
} from '../../utils/stockExportGenerator';
import {
  copyTextToClipboard,
  openWhatsAppWithText,
  shareFileOrDownloadFallback,
  triggerBlobDownload,
} from '../../utils/salesInvoiceShareUtils';

interface StockExportModalProps {
  products: AccountingProduct[];
  initialCategory?: string;
  stockManagementEnabled?: boolean;
  stockConfig?: StockManagementConfig;
  onClose: () => void;
}

export const StockExportModal: React.FC<StockExportModalProps> = ({
  products,
  initialCategory = 'all',
  stockManagementEnabled = false,
  stockConfig,
  onClose,
}) => {
  const effectiveStockEnabled = Boolean(stockManagementEnabled || stockConfig?.enabled);
  const defaultLowThreshold = stockConfig?.defaultLowStockThreshold ?? 10;
  const expiryWarningDays = stockConfig?.expiryWarningDays ?? 122;

  const [scope, setScope] = useState<StockExportScope>(
    initialCategory !== 'all' ? 'single_category' : 'category_combined'
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialCategory !== 'all'
      ? initialCategory
      : ACCOUNTING_PRODUCT_CATEGORIES[0]?.id || 'pesticides'
  );
  const [priceMode, setPriceMode] = useState<StockPriceMode>('admin_margin');
  const [reportType, setReportType] = useState<StockReportType>('standard_stock');

  const [pdfActionLoading, setPdfActionLoading] = useState<'download' | 'share' | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [showTextPreview, setShowTextPreview] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  const effectiveReportType: StockReportType =
    priceMode === 'rate_list' || !effectiveStockEnabled ? 'standard_stock' : reportType;

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const catId = p.category || 'other';
      map.set(catId, (map.get(catId) || 0) + 1);
    }
    return map;
  }, [products]);

  const targetProducts = useMemo(() => {
    if (scope === 'single_category') {
      return products.filter((p) => (p.category || 'other') === selectedCategoryId);
    }
    return products;
  }, [products, scope, selectedCategoryId]);

  const totalVariantsCount = useMemo(
    () => targetProducts.reduce((sum, p) => sum + getProductVariants(p).length, 0),
    [targetProducts]
  );

  // Live report-specific item counts when Stock Management is ON
  const reportCounts = useMemo(() => {
    if (!effectiveStockEnabled) {
      return {
        batch_detailed: 0,
        near_expiry: 0,
        expired_stock: 0,
        low_stock: 0,
      };
    }
    return {
      batch_detailed: buildBatchReportRows({
        products,
        scope,
        selectedCategoryId,
        reportType: 'batch_detailed',
        defaultLowThreshold,
        expiryWarningDays,
      }).length,
      near_expiry: buildBatchReportRows({
        products,
        scope,
        selectedCategoryId,
        reportType: 'near_expiry',
        defaultLowThreshold,
        expiryWarningDays,
      }).length,
      expired_stock: buildBatchReportRows({
        products,
        scope,
        selectedCategoryId,
        reportType: 'expired_stock',
        defaultLowThreshold,
        expiryWarningDays,
      }).length,
      low_stock: buildLowStockReportRows({
        products,
        scope,
        selectedCategoryId,
        defaultLowThreshold,
        expiryWarningDays,
      }).length,
    };
  }, [
    effectiveStockEnabled,
    products,
    scope,
    selectedCategoryId,
    defaultLowThreshold,
    expiryWarningDays,
  ]);

  const isReportEmpty = useMemo(() => {
    if (targetProducts.length === 0) return true;
    if (effectiveReportType === 'standard_stock') return false;
    return (reportCounts[effectiveReportType] || 0) === 0;
  }, [targetProducts.length, effectiveReportType, reportCounts]);

  const fileName = useMemo(
    () =>
      buildStockExportFileName({
        scope,
        selectedCategoryId,
        priceMode,
        reportType: effectiveReportType,
      }),
    [scope, selectedCategoryId, priceMode, effectiveReportType]
  );

  const formattedText = useMemo(
    () =>
      formatStockListText({
        products,
        scope,
        selectedCategoryId,
        priceMode,
        reportType: effectiveReportType,
        stockManagementEnabled: effectiveStockEnabled,
        stockConfig,
      }),
    [
      products,
      scope,
      selectedCategoryId,
      priceMode,
      effectiveReportType,
      effectiveStockEnabled,
      stockConfig,
    ]
  );

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ text, type });
  };

  const handlePdfAction = async (mode: 'download' | 'share') => {
    if (pdfActionLoading || isReportEmpty) return;
    setPdfActionLoading(mode);
    setProgress({ current: 0, total: 0 });
    setToastMsg(null);

    try {
      const res = await generateStockExportPdfBlob({
        products,
        scope,
        selectedCategoryId,
        priceMode,
        reportType: effectiveReportType,
        stockManagementEnabled: effectiveStockEnabled,
        stockConfig,
        onProgress: (currentPage, totalPages) => {
          setProgress({ current: currentPage, total: totalPages });
        },
      });

      if (!res.success || !res.blob) {
        showToast(res.error || 'स्टॉक PDF बनाने में त्रुटि हुई।', 'error');
        return;
      }

      if (mode === 'download') {
        triggerBlobDownload(res.blob, res.fileName);
        showToast(
          `स्टॉक PDF (${res.fileName}) सफलतापूर्वक डाउनलोड हो गई! (${res.count} प्रविष्टि, ${res.totalPages} पेज)`
        );
        return;
      }

      const shareTitle =
        effectiveReportType === 'near_expiry'
          ? 'फल्सावदिया कृषि बाजार - निकट एक्सपायरी अलर्ट रिपोर्ट'
          : effectiveReportType === 'expired_stock'
          ? 'फल्सावदिया कृषि बाजार - एक्सपायर्ड स्टॉक रिपोर्ट'
          : effectiveReportType === 'low_stock'
          ? 'फल्सावदिया कृषि बाजार - कम स्टॉक ऑर्डर रिपोर्ट'
          : effectiveReportType === 'batch_detailed'
          ? 'फल्सावदिया कृषि बाजार - बैच-वार स्टॉक रिपोर्ट'
          : priceMode === 'admin_margin'
          ? 'फल्सावदिया कृषि बाजार - स्टॉक व मूल्य सूची'
          : 'फल्सावदिया कृषि बाजार - उत्पाद रेट लिस्ट';

      const outcome = await shareFileOrDownloadFallback(
        res.blob,
        res.fileName,
        'application/pdf',
        shareTitle,
        `${shareTitle} (${res.count} प्रविष्टि)`
      );

      if (outcome === 'shared') {
        showToast('स्टॉक PDF सफलतापूर्वक शेयर की गई!');
      } else if (outcome === 'downloaded') {
        showToast(
          `इस ब्राउज़र पर डायरेक्ट फाइल शेयर सपोर्ट न होने से PDF (${res.fileName}) डाउनलोड हो गई है — अब आप इसे WhatsApp में भेज सकते हैं।`,
          'info'
        );
      }
    } catch {
      showToast('स्टॉक PDF तैयार करने में समस्या आई।', 'error');
    } finally {
      setPdfActionLoading(null);
    }
  };

  const handleCopyText = async () => {
    const ok = await copyTextToClipboard(formattedText);
    if (ok) {
      setCopiedText(true);
      showToast('पूरी स्टॉक सूची टेक्स्ट के रूप में कॉपी हो गई!');
      window.setTimeout(() => setCopiedText(false), 2500);
    } else {
      showToast('टेक्स्ट कॉपी नहीं हो सका।', 'error');
    }
  };

  const handleWhatsAppShare = async () => {
    if (formattedText.length > 3200) {
      await copyTextToClipboard(formattedText);
      showToast(
        'सूची बड़ी होने के कारण पूरा टेक्स्ट क्लिपबोर्ड पर कॉपी कर दिया गया है और संक्षिप्त संदेश WhatsApp में खुल रहा है (या आप पूरी सूची PDF के रूप में शेयर करें)।',
        'info'
      );
      const shortSummary =
        formattedText.slice(0, 2600) + '\n...\n(पूरी सूची क्लिपबोर्ड पर कॉपी है या PDF शेयर करें)';
      openWhatsAppWithText('', shortSummary);
      return;
    }
    openWhatsAppWithText('', formattedText);
  };

  const handleNativeTextShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'फल्सावदिया कृषि बाजार - स्टॉक सूची',
          text: formattedText,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await handleCopyText();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 max-h-[92vh] overflow-y-auto p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-[#2D5A27] shrink-0" />
              <span>स्टॉक सूची एक्सपोर्ट व शेयर (Stock Export)</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Complete List, Category-wise Combined, या किसी 1 श्रेणी की PDF और टेक्स्ट तैयार करें
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer shrink-0"
            aria-label="बंद करें"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast Banner */}
        {toastMsg && (
          <div
            className={`p-3 rounded-2xl border text-xs font-bold flex items-start justify-between gap-2 ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toastMsg.type === 'info'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-start gap-2">
              {toastMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
              ) : toastMsg.type === 'info' ? (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{toastMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="p-0.5 rounded-lg hover:bg-black/5 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Option 1: Export Scope */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#2D5A27]" />
            <span>1. स्टॉक सूची का प्रकार चुनें (Export Scope)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScope('category_combined')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                scope === 'category_combined'
                  ? 'bg-emerald-50 border-[#2D5A27] text-[#1B4316] ring-1 ring-[#2D5A27]'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Category-wise Combined</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                सभी श्रेणियां क्रम से एक PDF में
              </p>
            </button>

            <button
              type="button"
              onClick={() => setScope('complete')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                scope === 'complete'
                  ? 'bg-emerald-50 border-[#2D5A27] text-[#1B4316] ring-1 ring-[#2D5A27]'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <ListChecks className="w-3.5 h-3.5 shrink-0" />
                <span>Complete Stock List</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                सभी {products.length} उत्पाद A–Z क्रम में
              </p>
            </button>

            <button
              type="button"
              onClick={() => setScope('single_category')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                scope === 'single_category'
                  ? 'bg-emerald-50 border-[#2D5A27] text-[#1B4316] ring-1 ring-[#2D5A27]'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span>Category-wise PDF</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                केवल चुनी हुई 1 श्रेणी की सूची
              </p>
            </button>
          </div>

          {scope === 'single_category' && (
            <div className="pt-1">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]"
              >
                {ACCOUNTING_PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nameHindi} ({categoryCounts.get(cat.id) || 0} उत्पाद)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Option 2: Price Mode (Both Options Requested by Admin) */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#2D5A27]" />
            <span>2. दर विवरण विकल्प चुनें (PDF व Text प्रारूप)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPriceMode('admin_margin')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                priceMode === 'admin_margin'
                  ? 'bg-emerald-50 border-[#2D5A27] text-[#1B4316] ring-1 ring-[#2D5A27]'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <ShieldCheck className="w-4 h-4 text-[#2D5A27] shrink-0" />
                <span>Admin स्टॉक व मार्जिन सूची</span>
              </div>
              <p className="text-[10.5px] text-gray-500 mt-1 leading-snug">
                {effectiveStockEnabled
                  ? 'खरीद दर, बिक्री दर, मुनाफा (%), बैच व एक्सपायरी रिपोर्ट विकल्प सहित'
                  : 'खरीद दर (Cost), बिक्री दर (Selling), मुनाफा (%) व पैकेजिंग साइज (बिना स्टॉक मात्रा के)'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setPriceMode('rate_list');
                setReportType('standard_stock');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                priceMode === 'rate_list'
                  ? 'bg-blue-50 border-blue-600 text-blue-950 ring-1 ring-blue-600'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <Tag className="w-4 h-4 text-blue-600 shrink-0" />
                <span>ग्राहक / स्टाफ रेट लिस्ट</span>
              </div>
              <p className="text-[10.5px] text-gray-500 mt-1 leading-snug">
                केवल पैकेजिंग साइज, बिक्री दर व डोज़ (बिना खरीद दर व मार्जिन के)
              </p>
            </button>
          </div>
        </div>

        {/* Option 3: Advanced ERP Report Types (Only when Stock Management is ON + Admin Mode) */}
        {effectiveStockEnabled && priceMode === 'admin_margin' && (
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#2D5A27]" />
              <span>3. बैच, एक्सपायरी व स्टॉक रिपोर्ट प्रकार</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportType('standard_stock')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  reportType === 'standard_stock'
                    ? 'bg-emerald-50 border-[#2D5A27] text-[#1B4316] ring-1 ring-[#2D5A27]'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-extrabold">
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 shrink-0" />
                    सामान्य स्टॉक व मार्जिन
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200">
                    {targetProducts.length}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  बिक्री योग्य पैक स्टॉक व मुनाफा सारांश
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('batch_detailed')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  reportType === 'batch_detailed'
                    ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-extrabold">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    बैच-वार विस्तृत रिपोर्ट
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200">
                    {reportCounts.batch_detailed}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  प्रत्येक बैच नं., Mfg/Expiry व बैच खरीद दर
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('near_expiry')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  reportType === 'near_expiry'
                    ? 'bg-amber-50 border-amber-700 text-amber-950 ring-1 ring-amber-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-extrabold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                    निकट एक्सपायरी अलर्ट ({expiryWarningDays} दिन)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-amber-200 text-amber-800">
                    {reportCounts.near_expiry}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  आगामी 4 माह में एक्सपायर होने वाले बैच
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('expired_stock')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  reportType === 'expired_stock'
                    ? 'bg-red-50 border-red-700 text-red-950 ring-1 ring-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-extrabold">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                    एक्सपायर्ड स्टॉक हानि रिपोर्ट
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-red-200 text-red-700">
                    {reportCounts.expired_stock}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  बिक्री से बंद एक्सपायर्ड बैच व लागत हानि
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('low_stock')}
                className={`sm:col-span-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  reportType === 'low_stock'
                    ? 'bg-orange-50 border-orange-700 text-orange-950 ring-1 ring-orange-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-extrabold">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 shrink-0 text-orange-700" />
                    कम व खत्म स्टॉक ऑर्डर रिपोर्ट (Low & Out-of-Stock)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-orange-200 text-orange-800">
                    {reportCounts.low_stock} साइज
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  न्यूनतम सीमा (&lt;= {defaultLowThreshold} पैक) से कम या 0 स्टॉक वाले पैकेजिंग साइज
                </p>
              </button>
            </div>
          </div>
        )}

        {/* File & Summary Info Box */}
        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-600">
              {effectiveReportType === 'standard_stock' ? 'चयनित उत्पाद / पैकेजिंग:' : 'रिपोर्ट में प्रविष्टियां:'}
            </span>
            <span className="font-black text-gray-900">
              {effectiveReportType === 'standard_stock'
                ? `${targetProducts.length} उत्पाद (${totalVariantsCount} साइज)`
                : `${reportCounts[effectiveReportType]} प्रविष्टि`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-gray-500 shrink-0">फ़ाइल नाम:</span>
            <span className="font-mono font-bold text-[#2D5A27] truncate">{fileName}</span>
          </div>
        </div>

        {isReportEmpty && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>इस रिपोर्ट प्रकार के लिए वर्तमान में कोई मिलान प्रविष्टि नहीं है।</span>
          </div>
        )}

        {/* PDF Download & Share Actions */}
        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-black text-[#1B4316]">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#2D5A27]" />
              <span>A4 PDF रिपोर्ट (प्रिंट व WhatsApp के लिए)</span>
            </span>
            {pdfActionLoading && progress.total > 0 && (
              <span className="text-[11px] font-bold text-[#2D5A27]">
                पेज {progress.current} / {progress.total}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePdfAction('share')}
              disabled={pdfActionLoading !== null || isReportEmpty}
              className="py-2.5 px-3 bg-[#2D5A27] hover:bg-[#1f411b] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              {pdfActionLoading === 'share' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>PDF शेयर करें</span>
            </button>

            <button
              type="button"
              onClick={() => handlePdfAction('download')}
              disabled={pdfActionLoading !== null || isReportEmpty}
              className="py-2.5 px-3 bg-white hover:bg-emerald-50 text-[#1B4316] border border-emerald-300 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {pdfActionLoading === 'download' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PDF डाउनलोड</span>
            </button>
          </div>
        </div>

        {/* Text Copy & Share */}
        <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-gray-800">
              स्टॉक टेक्स्ट (Copy / WhatsApp / Share)
            </span>
            <button
              type="button"
              onClick={() => setShowTextPreview((v) => !v)}
              className="text-[11px] font-bold text-[#2D5A27] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showTextPreview ? 'टेक्स्ट छुपाएँ' : 'टेक्स्ट प्रीव्यू देखें'}</span>
            </button>
          </div>

          {showTextPreview && (
            <pre className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] font-sans text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {formattedText}
            </pre>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              disabled={isReportEmpty}
              className="py-2.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {copiedText ? (
                <Check className="w-3.5 h-3.5 text-[#2D5A27]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedText ? 'कॉपी हुआ' : 'टेक्स्ट कॉपी'}</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              disabled={isReportEmpty}
              className="py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-[#1B4316] border border-emerald-200 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleNativeTextShare}
              disabled={isReportEmpty}
              className="py-2.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Text शेयर</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockExportModal;
