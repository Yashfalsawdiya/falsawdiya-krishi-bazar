import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, FileText, Download, Trash2, Search, Filter, 
  Eye, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, 
  Printer, ArrowUpDown, ChevronDown, Check, ShieldCheck,
  CreditCard, Wallet, IndianRupee, Layers, ExternalLink, X
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { AccountingSale, MonthlyPOSExportMeta } from '../../types/accounting';
import { 
  fetchAccountingSalesForMonth, 
  fetchAllPOSSalesForHistory,
  getMonthlyPOSExportMeta, 
  saveMonthlyPOSExportMeta, 
  deleteMonthlyPOSBills,
  HINDI_MONTH_NAMES_LIST 
} from '../../services/accountingService';
import { 
  exportMonthlyPOSBillsPDF, 
  downloadSalesInvoicePDF 
} from '../../utils/salesInvoicePdfGenerator';
import { PrintableSalesInvoice } from './PrintableSalesInvoice';

interface POSMonthlyHistoryProps {
  onBackToBilling?: () => void;
  onSaleDeleted?: () => void;
}

export const POSMonthlyHistory: React.FC<POSMonthlyHistoryProps> = ({ 
  onBackToBilling,
  onSaleDeleted 
}) => {
  // Current Date Defaults
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-indexed (1-12)

  // Selected Month State
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Data States
  const [sales, setSales] = useState<AccountingSale[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allSalesMonths, setAllSalesMonths] = useState<Array<{ year: number; month: number; count: number }>>([]);
  const [exportMeta, setExportMeta] = useState<MonthlyPOSExportMeta | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [dayFilter, setDayFilter] = useState<string>('all');

  // PDF Export Progress State
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; invoiceNo: string }>({
    current: 0,
    total: 0,
    invoiceNo: ''
  });
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Single Bill Invoice Modal State
  const [viewingSale, setViewingSale] = useState<AccountingSale | null>(null);
  const [isPrintingSingle, setIsPrintingSingle] = useState<boolean>(false);
  const [isDownloadingSinglePdf, setIsDownloadingSinglePdf] = useState<boolean>(false);

  // Delete Dialog States
  const [showExportRequiredModal, setShowExportRequiredModal] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [deleteConfirmedCheckbox, setDeleteConfirmedCheckbox] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Month Key (e.g. "2026-09")
  const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const selectedMonthNameHindi = HINDI_MONTH_NAMES_LIST[selectedMonth - 1] || `माह ${selectedMonth}`;

  // 1. Fetch available months list across all sales
  const loadAvailableMonths = async () => {
    try {
      const allSales = await fetchAllPOSSalesForHistory();
      const monthMap = new Map<string, { year: number; month: number; count: number }>();

      // Always ensure current month and last 3 months exist in map
      for (let i = 0; i < 6; i++) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;
        monthMap.set(key, { year: y, month: m, count: 0 });
      }

      // Count bills per month
      allSales.forEach(s => {
        let y: number | null = null;
        let m: number | null = null;

        if (s.date && s.date.includes('-')) {
          const parts = s.date.split('-');
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
        } else if (s.timestamp) {
          const d = new Date(s.timestamp);
          y = d.getFullYear();
          m = d.getMonth() + 1;
        }

        if (y && m) {
          const key = `${y}-${String(m).padStart(2, '0')}`;
          const current = monthMap.get(key) || { year: y, month: m, count: 0 };
          current.count += 1;
          monthMap.set(key, current);
        }
      });

      const list = Array.from(monthMap.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      setAllSalesMonths(list);
    } catch (err) {
      console.error('Error loading available months:', err);
    }
  };

  // 2. Fetch sales for the selected month
  const loadMonthData = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const [fetchedSales, meta] = await Promise.all([
        fetchAccountingSalesForMonth(selectedYear, selectedMonth),
        getMonthlyPOSExportMeta(selectedMonthKey)
      ]);

      setSales(fetchedSales);
      setExportMeta(meta);
    } catch (err) {
      console.error('Error fetching monthly data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableMonths();
  }, []);

  useEffect(() => {
    loadMonthData();
  }, [selectedYear, selectedMonth]);

  // Unique days list in current month's sales
  const availableDays = useMemo(() => {
    const days = new Set<string>();
    sales.forEach(s => {
      if (s.date) {
        days.add(s.date);
      }
    });
    return Array.from(days).sort().reverse();
  }, [sales]);

  // Filter and Search Logic
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Payment filter
      if (paymentFilter !== 'all' && sale.paymentMode !== paymentFilter) {
        return false;
      }

      // Day filter
      if (dayFilter !== 'all' && sale.date !== dayFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invoiceMatch = sale.invoiceNo?.toLowerCase().includes(q);
        const nameMatch = sale.customerName?.toLowerCase().includes(q);
        const phoneMatch = sale.customerPhone?.toLowerCase().includes(q);
        const itemsMatch = sale.items?.some(it => 
          (it.hindiName && it.hindiName.toLowerCase().includes(q)) ||
          (it.name && it.name.toLowerCase().includes(q))
        );
        return invoiceMatch || nameMatch || phoneMatch || itemsMatch;
      }

      return true;
    }).sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [sales, paymentFilter, dayFilter, searchQuery, sortOrder]);

  // Financial Summaries for the selected month
  const monthlyMetrics = useMemo(() => {
    const totalBills = sales.length;
    const totalSalesAmount = sales.reduce((sum, s) => sum + (s.finalTotal || 0), 0);
    const totalCashCollected = sales.reduce((sum, s) => sum + (s.cashPaid || 0), 0);
    const totalOnlineCollected = sales.reduce((sum, s) => sum + (s.onlinePaid || 0), 0);
    const totalPaid = totalCashCollected + totalOnlineCollected;
    const totalUdhari = sales.reduce((sum, s) => sum + (s.udhariAmount || 0), 0);

    return {
      totalBills,
      totalSalesAmount,
      totalCashCollected,
      totalOnlineCollected,
      totalPaid,
      totalUdhari,
    };
  }, [sales]);

  // Check if current month is exported
  const isMonthExported = useMemo(() => {
    if (!exportMeta) return false;
    return exportMeta.isExported === true && (exportMeta.billsExportedCount || 0) >= sales.length;
  }, [exportMeta, sales.length]);

  // Handler: Export Monthly PDF (1 Bill = 1 Page)
  const handleExportMonthlyPDF = async () => {
    if (sales.length === 0) {
      alert('इस महीने में कोई नकद बिक्री बिल उपलब्ध नहीं है।');
      return;
    }

    setIsExportingPdf(true);
    setExportSuccessMessage(null);
    setExportProgress({ current: 0, total: sales.length, invoiceNo: '' });

    const cleanMonthName = selectedMonthNameHindi.split(' ')[0];
    const fileName = `फल्सावदिया_POS_नकद_बिक्री_इतिहास_${cleanMonthName}_${selectedYear}.pdf`;

    try {
      const result = await exportMonthlyPOSBillsPDF({
        sales,
        monthLabel: `${selectedMonthNameHindi} ${selectedYear}`,
        fileName,
        onProgress: (current, total, currentInvoiceNo) => {
          setExportProgress({ current, total, invoiceNo: currentInvoiceNo });
        }
      });

      if (result.success) {
        // Save export metadata
        const now = Date.now();
        const exportDateStr = new Date(now).toLocaleString('hi-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const newMeta: MonthlyPOSExportMeta = {
          monthKey: selectedMonthKey,
          year: selectedYear,
          month: selectedMonth,
          isExported: true,
          lastExportDate: exportDateStr,
          lastExportTimestamp: now,
          billsExportedCount: result.count,
          totalSalesAmount: result.totalAmount,
          fileName,
        };

        await saveMonthlyPOSExportMeta(newMeta);
        setExportMeta(newMeta);
        setExportSuccessMessage(`सफलतापूर्वक ${result.count} बिलों का PDF डाउनलोड हो गया! प्रत्येक बिल को अलग A4 पेज पर संकलित किया गया है।`);
      } else {
        alert('PDF एक्सपोर्ट में त्रुटि: ' + (result.error || 'अज्ञात त्रुटि'));
      }
    } catch (err: any) {
      console.error('Error during monthly PDF export:', err);
      alert('PDF एक्सपोर्ट में त्रुटि: ' + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handler: Click Delete Button
  const handleDeleteButtonClick = () => {
    if (sales.length === 0) {
      alert('इस महीने में डिलीट करने के लिए कोई बिल नहीं है।');
      return;
    }

    if (!isMonthExported) {
      // Must export first!
      setShowExportRequiredModal(true);
    } else {
      // Allow confirmation
      setDeleteConfirmedCheckbox(false);
      setShowDeleteConfirmModal(true);
    }
  };

  // Handler: Confirm Manual Delete of Month's Bills
  const handleConfirmDeleteMonth = async () => {
    if (!deleteConfirmedCheckbox) return;

    setIsDeleting(true);
    try {
      const saleIds = sales.map(s => s.id);
      const res = await deleteMonthlyPOSBills(saleIds, selectedYear, selectedMonth);

      if (res.success) {
        setShowDeleteConfirmModal(false);
        setActionMessage({
          type: 'success',
          text: `✓ ${selectedMonthNameHindi} ${selectedYear} के कुल ${res.deletedCount} नकद बिल सफलतापूर्वक हटाए गए। स्टॉक एवं खाता बही सुरक्षित है।`
        });
        // Reload data
        await loadMonthData();
        await loadAvailableMonths();
        onSaleDeleted?.();
      } else {
        alert('डिलीट करने में त्रुटि: ' + res.error);
      }
    } catch (err: any) {
      console.error('Error deleting monthly bills:', err);
      alert('डिलीट करने में त्रुटि: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler: Download single bill PDF
  const handleDownloadSinglePdf = async (sale: AccountingSale) => {
    setIsDownloadingSinglePdf(true);
    try {
      const res = await downloadSalesInvoicePDF(sale, 0);
      if (!res.success && res.error) {
        alert('PDF जनरेट करने में त्रुटि: ' + res.error);
      }
    } catch (err: any) {
      alert('PDF डाउनलोड करने में त्रुटि: ' + err.message);
    } finally {
      setIsDownloadingSinglePdf(false);
    }
  };

  // Handler: Print single bill
  const handlePrintSingle = () => {
    setIsPrintingSingle(true);
    setTimeout(() => {
      window.print();
      setIsPrintingSingle(false);
    }, 300);
  };

  return (
    <div className="space-y-6" id="pos-monthly-history-container">
      {/* TOP HEADER & CONTROLS */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  नकद बिक्री बिल इतिहास (Monthly Bill History)
                </h2>
                {isMonthExported ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> PDF सुरक्षित (Exported)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> PDF लंबित (Not Exported)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                माह अनुसार सभी नकद POS बिल सुरक्षित संग्रहीत हैं। 1-बिल-1-पेज PDF एक्सपोर्ट करें और बैकअप के बाद सुरक्षित हटाएँ।
              </p>
            </div>
          </div>

          {/* Month Selector & Back button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {onBackToBilling && (
              <button
                onClick={onBackToBilling}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                ← नया बिल बनाएं
              </button>
            )}

            <div className="relative flex items-center">
              <select
                id="pos-history-month-selector"
                value={`${selectedYear}-${selectedMonth}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number);
                  setSelectedYear(y);
                  setSelectedMonth(m);
                }}
                className="appearance-none pl-3.5 pr-9 py-2.5 bg-emerald-50/70 border border-emerald-200 text-emerald-900 font-extrabold text-xs rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer shadow-sm"
              >
                {allSalesMonths.map(({ year, month, count }) => {
                  const label = HINDI_MONTH_NAMES_LIST[month - 1] || `माह ${month}`;
                  return (
                    <option key={`${year}-${month}`} value={`${year}-${month}`}>
                      {label} {year} {count > 0 ? `(${count} बिल)` : '(0 बिल)'}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-emerald-700 absolute right-3 pointer-events-none" />
            </div>

            <button
              onClick={loadMonthData}
              title="डेटा रिफ्रेश करें"
              className="p-2.5 text-gray-600 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50 border border-gray-200 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS: EXPORT PDF & DELETE HISTORY */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            {exportMeta?.lastExportDate ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                अंतिम PDF एक्सपोर्ट: {exportMeta.lastExportDate} ({exportMeta.billsExportedCount} बिल)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                इस महीने की PDF अभी तक एक्सपोर्ट नहीं की गई है। डिलीट करने से पहले PDF एक्सपोर्ट अनिवार्य है।
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Export PDF Button */}
            <button
              id="export-monthly-pdf-button"
              onClick={handleExportMonthlyPDF}
              disabled={isExportingPdf || sales.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExportingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  PDF तैयार हो रहा है ({exportProgress.current}/{exportProgress.total})...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  पूरे महीने का PDF Export करें ({sales.length} बिल)
                </>
              )}
            </button>

            {/* Delete History Button */}
            <button
              id="delete-monthly-history-button"
              onClick={handleDeleteButtonClick}
              disabled={isDeleting || sales.length === 0}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-extrabold rounded-xl border transition-all ${
                isMonthExported 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-sm' 
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isMonthExported ? 'माह की बिल हिस्ट्री डिलीट करें' : 'पहले PDF Export करना अनिवार्य है'}
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              इस महीने की History Delete करें
            </button>
          </div>
        </div>

        {/* Action success / error banner */}
        {actionMessage && (
          <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Export success banner */}
        {exportSuccessMessage && (
          <div className="p-3.5 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessMessage}</span>
            </div>
            <button onClick={() => setExportSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* MONTHLY SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">कुल बिल (Total Bills)</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{monthlyMetrics.totalBills}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">{selectedMonthNameHindi.split(' ')[0]} {selectedYear}</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">कुल नकद बिक्री (Sales)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">₹{monthlyMetrics.totalSalesAmount.toLocaleString()}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">सकल बिक्री राशि</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">प्राप्त राशि (Collected)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">₹{monthlyMetrics.totalPaid.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
            नकद: ₹{monthlyMetrics.totalCashCollected.toLocaleString()} | UPI: ₹{monthlyMetrics.totalOnlineCollected.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500">उधारी / बाकी (Credit Due)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${monthlyMetrics.totalUdhari > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
            ₹{monthlyMetrics.totalUdhari.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">खाता बही में दर्ज बाकी राशि</div>
        </div>
      </div>

      {/* SEARCH, FILTERS & BILLS LIST CONTAINER */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="बिल नंबर (#OFF-...), ग्राहक का नाम, मोबाइल नंबर या उत्पाद खोजें..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Day filter */}
              {availableDays.length > 0 && (
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 text-xs text-gray-700 font-bold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">सभी तारीखें ({sales.length})</option>
                  {availableDays.map(d => (
                    <option key={d} value={d}>दिनांक: {d}</option>
                  ))}
                </select>
              )}

              {/* Payment Method filter */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 text-xs text-gray-700 font-bold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">सभी भुगतान माध्यम</option>
                <option value="cash">नकद (Cash)</option>
                <option value="online">ऑनलाइन (UPI)</option>
                <option value="split">मिश्रित (Cash + UPI)</option>
                <option value="credit">उधारी (Credit)</option>
              </select>

              {/* Sort Order */}
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-xs text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                title="तारीख के अनुसार क्रम बदलें"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                {sortOrder === 'desc' ? 'नवीनतम पहले' : 'पुराने पहले'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <span>
              दिखाए जा रहे बिल: <strong className="text-gray-900">{filteredSales.length}</strong> (कुल: {sales.length})
            </span>
            {(searchQuery || paymentFilter !== 'all' || dayFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPaymentFilter('all');
                  setDayFilter('all');
                }}
                className="text-emerald-700 hover:text-emerald-900 font-bold underline"
              >
                फ़िल्टर साफ़ करें
              </button>
            )}
          </div>
        </div>

        {/* BILLS TABLE (Desktop) & CARDS (Mobile) */}
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs font-bold">मासिक बिल लोड हो रहे हैं...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div className="text-sm font-bold text-gray-700">
              {sales.length === 0 
                ? `${selectedMonthNameHindi} ${selectedYear} में कोई नकद बिक्री बिल नहीं मिला।` 
                : 'दिए गए फ़िल्टर के अनुसार कोई बिल नहीं मिला।'}
            </div>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {sales.length === 0 
                ? 'नया बिल बनाने के लिए "नया बिल बनाएं" काउंटर पर जाएँ।' 
                : 'कृपया खोज शब्द या फ़िल्टर बदलकर दोबारा प्रयास करें।'}
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">बिल सं. (Invoice)</th>
                    <th className="py-3.5 px-4">दिनांक व समय</th>
                    <th className="py-3.5 px-4">ग्राहक (Customer)</th>
                    <th className="py-3.5 px-4">सामान (Items)</th>
                    <th className="py-3.5 px-4">भुगतान माध्यम</th>
                    <th className="py-3.5 px-4 text-right">कुल राशि</th>
                    <th className="py-3.5 px-4 text-right">प्राप्त / बाकी</th>
                    <th className="py-3.5 px-4 text-center">एक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSales.map((sale) => {
                    const formattedTime = sale.timestamp 
                      ? new Date(sale.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : '';
                    const itemsSummary = sale.items?.map(it => it.hindiName || it.name).join(', ');

                    return (
                      <tr key={sale.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                          #{sale.invoiceNo}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900">{sale.date}</div>
                          {formattedTime && <div className="text-[10px] text-gray-400">{formattedTime}</div>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{sale.customerName}</div>
                          {sale.customerPhone && (
                            <div className="text-[10px] text-gray-400">{sale.customerPhone}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-[220px]">
                          <div className="text-[11px] text-gray-600 truncate font-medium" title={itemsSummary}>
                            <span className="font-bold text-gray-800">{sale.items?.length || 0} आयटम:</span> {itemsSummary}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            sale.paymentMode === 'cash' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : sale.paymentMode === 'online'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : sale.paymentMode === 'split'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {sale.paymentMode === 'cash' ? 'नकद (Cash)' :
                             sale.paymentMode === 'online' ? 'ऑनलाइन (UPI)' :
                             sale.paymentMode === 'split' ? 'नकद + UPI' : 'उधारी (Credit)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-gray-900 text-sm">
                          ₹{sale.finalTotal?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-[11px]">
                          <div className="text-emerald-700 font-bold">
                            प्राप्त: ₹{((sale.cashPaid || 0) + (sale.onlinePaid || 0)).toLocaleString()}
                          </div>
                          {sale.udhariAmount > 0 && (
                            <div className="text-rose-600 font-bold">
                              बाकी: ₹{sale.udhariAmount.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingSale(sale)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors border border-emerald-200"
                              title="बिल देखें व प्रिंट करें"
                            >
                              <Eye className="w-3.5 h-3.5" /> बिल देखें
                            </button>
                            <button
                              onClick={() => handleDownloadSinglePdf(sale)}
                              disabled={isDownloadingSinglePdf}
                              className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors border border-gray-200"
                              title="PDF डाउनलोड करें"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-700" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-gray-100">
              {filteredSales.map((sale) => {
                const formattedTime = sale.timestamp 
                  ? new Date(sale.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : '';
                const itemsSummary = sale.items?.map(it => it.hindiName || it.name).join(', ');

                return (
                  <div key={sale.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-extrabold text-emerald-800 text-xs">
                        #{sale.invoiceNo}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {sale.date} {formattedTime && `· ${formattedTime}`}
                      </div>
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-black text-gray-900">{sale.customerName}</div>
                        {sale.customerPhone && (
                          <div className="text-[10px] text-gray-400">{sale.customerPhone}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-gray-900">₹{sale.finalTotal?.toLocaleString()}</div>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          sale.paymentMode === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {sale.paymentMode === 'cash' ? 'नकद' : sale.paymentMode === 'online' ? 'UPI' : 'मिश्रित'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-xl">
                      <span className="font-bold text-gray-700">{sale.items?.length || 0} उत्पाद:</span> {itemsSummary}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px]">
                        <span className="text-emerald-700 font-bold">
                          जमा: ₹{((sale.cashPaid || 0) + (sale.onlinePaid || 0)).toLocaleString()}
                        </span>
                        {sale.udhariAmount > 0 && (
                          <span className="text-rose-600 font-bold ml-2">
                            बाकी: ₹{sale.udhariAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingSale(sale)}
                          className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" /> बिल देखें
                        </button>
                        <button
                          onClick={() => handleDownloadSinglePdf(sale)}
                          className="p-1.5 bg-gray-100 text-gray-700 rounded-lg border border-gray-200"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: PDF EXPORT PROGRESS OVERLAY */}
      {isExportingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Download className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-gray-900">
                {selectedMonthNameHindi.split(' ')[0]} {selectedYear} का PDF तैयार हो रहा है
              </h3>
              <p className="text-xs text-gray-500">
                प्रत्येक बिल को 1 स्वतंत्र A4 पेज पर उच्च रिज़ॉल्यूशन में तैयार किया जा रहा है।
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-200 rounded-full"
                  style={{ 
                    width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0}%` 
                  }}
                />
              </div>

              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>{exportProgress.current} / {exportProgress.total} बिल प्रोसेस हुए</span>
                <span>
                  {exportProgress.total > 0 
                    ? Math.round((exportProgress.current / exportProgress.total) * 100) 
                    : 0}%
                </span>
              </div>
              {exportProgress.invoiceNo && (
                <div className="text-[10px] text-emerald-700 font-mono">
                  वर्तमान बिल: #{exportProgress.invoiceNo}
                </div>
              )}
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-[11px] text-emerald-800 text-left">
              💡 <strong>कृपया ध्यान दें:</strong> इस दौरान ब्राउज़र टैब को बंद न करें। पूरा होते ही PDF फाइल अपने आप डाउनलोड हो जाएगी।
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EXPORT REQUIRED WARNING (When Admin clicks delete without exporting) */}
      {showExportRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-gray-900">
                PDF Export अनिवार्य है!
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                इस महीने (<strong>{selectedMonthNameHindi.split(' ')[0]} {selectedYear}</strong>) की Bill History अभी PDF में Export नहीं की गई है।
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                सुरक्षा नियम:
              </div>
              <p className="text-[11px] leading-relaxed">
                बिना PDF बैकअप लिए बिल इतिहास डिलीट करने की अनुमति नहीं है। इससे आपके पुराने बिलों का कानूनी व वित्तीय रिकॉर्ड सुरक्षित रहता है।
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => setShowExportRequiredModal(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                onClick={() => {
                  setShowExportRequiredModal(false);
                  handleExportMonthlyPDF();
                }}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" /> अभी PDF Export करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM DELETE MODAL (Enabled only after PDF exported) */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-gray-900">
                क्या आपने इस महीने के सभी Bills का PDF Export कर लिया है?
              </h3>
              <p className="text-xs text-gray-500">
                माह: <strong>{selectedMonthNameHindi.split(' ')[0]} {selectedYear}</strong> · कुल बिल: <strong>{sales.length}</strong>
              </p>
            </div>

            {/* Warning Box */}
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-2.5">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                स्थायी विलोपन की चेतावनी:
              </div>
              <p className="text-[11px] leading-relaxed text-rose-800">
                एक बार delete करने के बाद इस महीने के सभी नकद बिक्री बिल (कुल राशि: <strong>₹{monthlyMetrics.totalSalesAmount.toLocaleString()}</strong>) हमेशा के लिए हट जाएंगे। कृपया सुनिश्चित करें कि आपने PDF फाइल को अपने कंप्यूटर या फोन में सुरक्षित सेव कर लिया है।
              </p>
              <div className="text-[10px] text-emerald-800 bg-white/70 p-2 rounded-xl border border-rose-100">
                ✓ <strong>स्टॉक सुरक्षा:</strong> आपके इन्वेंट्री स्टॉक एवं ग्राहक बही खाता (Ledger) में दर्ज उधारी बैलेंस पर कोई नकारात्मक प्रभाव नहीं पड़ेगा।
              </div>
            </div>

            {/* Verification Checkbox */}
            <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={deleteConfirmedCheckbox}
                onChange={(e) => setDeleteConfirmedCheckbox(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
              />
              <span className="text-xs text-gray-800 font-bold leading-tight">
                हाँ, मैंने PDF सुरक्षित कर लिया है और मैं {selectedMonthNameHindi.split(' ')[0]} {selectedYear} की हिस्ट्री डिलीट करने की पुष्टि करता हूँ।
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-colors"
              >
                रद्द करें (Cancel)
              </button>

              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  handleExportMonthlyPDF();
                }}
                disabled={isDeleting}
                className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> दोबारा PDF Export करें
              </button>

              <button
                onClick={handleConfirmDeleteMonth}
                disabled={!deleteConfirmedCheckbox || isDeleting}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> डिलीट हो रहा है...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> हाँ, History Delete करें
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: FULL SALES INVOICE VIEW MODAL */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto space-y-4 p-5 sm:p-6 max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  बिक्री बिल इनवॉइस (#{viewingSale.invoiceNo})
                </h3>
                <p className="text-xs text-gray-500">
                  दिनांक: {viewingSale.date} · ग्राहक: {viewingSale.customerName}
                </p>
              </div>
              <button
                onClick={() => setViewingSale(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Preview Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-inner">
                <PrintableSalesInvoice
                  sale={viewingSale}
                  customerOutstanding={0}
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
              <div className="text-xs text-gray-500 font-mono">
                अंतिम कुल: <strong className="text-emerald-800 text-sm">₹{viewingSale.finalTotal?.toLocaleString()}</strong>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePrintSingle}
                  className="flex-1 sm:flex-none py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> A4 प्रिंट
                </button>
                <button
                  onClick={() => handleDownloadSinglePdf(viewingSale)}
                  disabled={isDownloadingSinglePdf}
                  className="flex-1 sm:flex-none py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-gray-200 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-emerald-700" /> {isDownloadingSinglePdf ? 'PDF बन रहा है...' : 'PDF फाइल'}
                </button>
                <button
                  onClick={() => setViewingSale(null)}
                  className="py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold"
                >
                  बंद करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE PRINT PORTAL FOR SINGLE INVOICE PRINT */}
      {typeof document !== 'undefined' && isPrintingSingle && viewingSale && createPortal(
        <div id="active-history-print-portal">
          <PrintableSalesInvoice
            sale={viewingSale}
            customerOutstanding={0}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default POSMonthlyHistory;
