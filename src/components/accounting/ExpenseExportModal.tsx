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
  Calendar,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { AccountingExpense, AccountingExpenseCategory } from '../../types/accounting';
import {
  ExpenseExportScope,
  buildExpenseExportFileName,
  computeExpenseAnalytics,
  filterExpensesForExport,
  formatExpenseReportText,
  generateExpenseExportPdfBlob,
  getAvailableExpenseMonths,
} from '../../utils/expenseExportGenerator';
import {
  copyTextToClipboard,
  openWhatsAppWithText,
  shareFileOrDownloadFallback,
  triggerBlobDownload,
} from '../../utils/salesInvoiceShareUtils';

interface ExpenseExportModalProps {
  expenses: AccountingExpense[];
  categories: AccountingExpenseCategory[];
  initialMonthKey: string;
  initialCategoryId?: string;
  onClose: () => void;
}

export const ExpenseExportModal: React.FC<ExpenseExportModalProps> = ({
  expenses,
  categories,
  initialMonthKey,
  initialCategoryId = 'all',
  onClose,
}) => {
  const [scope, setScope] = useState<ExpenseExportScope>('selected_month');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(initialMonthKey);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId || 'all');

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

  const monthOptions = useMemo(() => getAvailableExpenseMonths(expenses), [expenses]);

  const filteredExpenses = useMemo(
    () =>
      filterExpensesForExport({
        expenses,
        scope,
        selectedMonthKey,
        selectedCategoryId,
      }),
    [expenses, scope, selectedMonthKey, selectedCategoryId]
  );

  const analytics = useMemo(() => computeExpenseAnalytics(filteredExpenses), [filteredExpenses]);

  const fileName = useMemo(
    () =>
      buildExpenseExportFileName({
        scope,
        selectedMonthKey,
        selectedCategoryId,
        categories,
      }),
    [scope, selectedMonthKey, selectedCategoryId, categories]
  );

  const formattedText = useMemo(
    () =>
      formatExpenseReportText({
        expenses,
        categories,
        scope,
        selectedMonthKey,
        selectedCategoryId,
      }),
    [expenses, categories, scope, selectedMonthKey, selectedCategoryId]
  );

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ text, type });
  };

  const handlePdfAction = async (mode: 'download' | 'share') => {
    if (pdfActionLoading || filteredExpenses.length === 0) return;
    setPdfActionLoading(mode);
    setProgress({ current: 0, total: 0 });
    setToastMsg(null);

    try {
      const res = await generateExpenseExportPdfBlob({
        expenses,
        categories,
        scope,
        selectedMonthKey,
        selectedCategoryId,
        onProgress: (currentPage, totalPages) => {
          setProgress({ current: currentPage, total: totalPages });
        },
      });

      if (!res.success || !res.blob) {
        showToast(res.error || 'खर्च रिपोर्ट PDF बनाने में त्रुटि हुई।', 'error');
        return;
      }

      if (mode === 'download') {
        triggerBlobDownload(res.blob, res.fileName);
        showToast(
          `खर्च रिपोर्ट PDF (${res.fileName}) डाउनलोड हो गई! (${res.count} प्रविष्टियां, ${res.totalPages} पेज)`
        );
        return;
      }

      const shareTitle =
        scope === 'selected_month'
          ? 'फल्सावदिया कृषि बाजार - मासिक खर्च रिपोर्ट'
          : 'फल्सावदिया कृषि बाजार - संपूर्ण खर्च रिपोर्ट';

      const outcome = await shareFileOrDownloadFallback(
        res.blob,
        res.fileName,
        'application/pdf',
        shareTitle,
        `${shareTitle} · कुल खर्च ₹${res.totalAmount.toLocaleString('en-IN')}`
      );

      if (outcome === 'shared') {
        showToast('खर्च रिपोर्ट PDF सफलतापूर्वक शेयर की गई!');
      } else if (outcome === 'downloaded') {
        showToast(
          `डायरेक्ट फाइल शेयर सपोर्ट न होने से PDF (${res.fileName}) डाउनलोड हो गई है — अब आप इसे WhatsApp में भेज सकते हैं।`,
          'info'
        );
      }
    } catch {
      showToast('खर्च PDF तैयार करने में समस्या आई।', 'error');
    } finally {
      setPdfActionLoading(null);
    }
  };

  const handleCopyText = async () => {
    const ok = await copyTextToClipboard(formattedText);
    if (ok) {
      setCopiedText(true);
      showToast('खर्च रिपोर्ट का पूरा टेक्स्ट कॉपी हो गया!');
      window.setTimeout(() => setCopiedText(false), 2500);
    } else {
      showToast('टेक्स्ट कॉपी नहीं हो सका।', 'error');
    }
  };

  const handleWhatsAppShare = async () => {
    if (formattedText.length > 3200) {
      await copyTextToClipboard(formattedText);
      showToast(
        'रिपोर्ट लंबी होने के कारण पूरा टेक्स्ट क्लिपबोर्ड पर कॉपी कर दिया गया है और संक्षिप्त सारांश WhatsApp में खुल रहा है (पूरी सूची के लिए PDF शेयर करें)।',
        'info'
      );
      const shortSummary =
        formattedText.slice(0, 2600) +
        '\n...\n(पूरी सूची क्लिपबोर्ड पर कॉपी है या PDF शेयर करें)';
      openWhatsAppWithText('', shortSummary);
      return;
    }
    openWhatsAppWithText('', formattedText);
  };

  const handleNativeTextShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'फल्सावदिया कृषि बाजार - दुकान खर्च रिपोर्ट',
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
              <FileText className="w-4.5 h-4.5 text-rose-600 shrink-0" />
              <span>खर्च रिपोर्ट एक्सपोर्ट व शेयर (Expense Export)</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              चुने हुए महीने या सभी महीनों की Combined खर्च PDF व टेक्स्ट रिपोर्ट तैयार करें
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

        {/* Inline Toast Banner */}
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

        {/* Option 1: Scope Selector */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-rose-600" />
            <span>1. रिपोर्ट अवधि चुनें (Report Scope)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope('selected_month')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                scope === 'selected_month'
                  ? 'bg-rose-50 border-rose-600 text-rose-950 ring-1 ring-rose-600'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
                <span>चुना हुआ महीना (Monthly PDF)</span>
              </div>
              <p className="text-[10.5px] text-gray-500 mt-1">
                मासिक सारांश, श्रेणी-वार खर्च व सभी एंट्रीज़
              </p>
            </button>

            <button
              type="button"
              onClick={() => setScope('all_months')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                scope === 'all_months'
                  ? 'bg-rose-50 border-rose-600 text-rose-950 ring-1 ring-rose-600'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <Layers className="w-4 h-4 text-rose-600 shrink-0" />
                <span>सभी महीने (All Months Combined)</span>
              </div>
              <p className="text-[10.5px] text-gray-500 mt-1">
                माह-वार सारांश + श्रेणी सारांश + संपूर्ण रजिस्टर
              </p>
            </button>
          </div>
        </div>

        {/* Month & Category Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {scope === 'selected_month' && (
            <div>
              <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-rose-600" />
                <span>महीना चुनें (Month Selector)</span>
              </label>
              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="w-full p-2.5 bg-rose-50/50 border border-rose-200 rounded-xl text-xs font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {monthOptions.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.labelHindi} ({m.count} खर्च · ₹{m.totalAmount.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={scope === 'all_months' ? 'sm:col-span-2' : ''}>
            <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1 mb-1">
              <Filter className="w-3 h-3 text-gray-500" />
              <span>खर्च श्रेणी फ़िल्टर (वैकल्पिक)</span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">सभी श्रेणियां (All Categories)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.hindiName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Analytics Summary */}
        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2 rounded-xl border border-gray-100">
              <div className="text-[10px] font-bold text-gray-500">कुल खर्च</div>
              <div className="text-sm font-black text-rose-600">
                ₹{analytics.totalAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-400">{analytics.totalCount} प्रविष्टियां</div>
            </div>
            <div className="bg-white p-2 rounded-xl border border-gray-100">
              <div className="text-[10px] font-bold text-gray-500">नकद (Cash)</div>
              <div className="text-sm font-black text-emerald-700">
                ₹{analytics.cashTotal.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-400">गल्ले से</div>
            </div>
            <div className="bg-white p-2 rounded-xl border border-gray-100">
              <div className="text-[10px] font-bold text-gray-500">ऑनलाइन (UPI)</div>
              <div className="text-sm font-black text-blue-700">
                ₹{analytics.onlineTotal.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-gray-400">बैंक / UPI</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-gray-200/70">
            <span className="font-semibold text-gray-500 shrink-0">फ़ाइल नाम:</span>
            <span className="font-mono font-bold text-rose-700 truncate">{fileName}</span>
          </div>
        </div>

        {/* PDF Download & Share */}
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-black text-rose-950">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-rose-600" />
              <span>A4 खर्च रिपोर्ट PDF (सारांश + पूरा विवरण)</span>
            </span>
            {pdfActionLoading && progress.total > 0 && (
              <span className="text-[11px] font-bold text-rose-700">
                पेज {progress.current} / {progress.total}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePdfAction('share')}
              disabled={pdfActionLoading !== null || filteredExpenses.length === 0}
              className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
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
              disabled={pdfActionLoading !== null || filteredExpenses.length === 0}
              className="py-2.5 px-3 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
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
              खर्च टेक्स्ट सारांश (Copy / WhatsApp / Share)
            </span>
            <button
              type="button"
              onClick={() => setShowTextPreview((v) => !v)}
              className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
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
              disabled={filteredExpenses.length === 0}
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
              disabled={filteredExpenses.length === 0}
              className="py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-[#1B4316] border border-emerald-200 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleNativeTextShare}
              disabled={filteredExpenses.length === 0}
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

export default ExpenseExportModal;
