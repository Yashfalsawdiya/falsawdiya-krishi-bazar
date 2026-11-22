import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, Plus, Trash2, Calendar, Coffee, Fuel, 
  Truck, Users, Zap, Home, Package, Wrench, Tag, 
  PlusCircle, IndianRupee, Search, X,
  Wallet, Smartphone, Banknote, Share2,
  AlertTriangle, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { 
  AccountingExpense, 
  AccountingExpenseCategory 
} from '../../types/accounting';
import { 
  fetchAccountingExpenses, 
  saveAccountingExpense, 
  deleteAccountingExpense, 
  fetchExpenseCategories, 
  addCustomExpenseCategory 
} from '../../services/accountingService';
import { ExpenseExportModal } from './ExpenseExportModal';
import {
  extractExpenseMonthKey,
  formatMonthKeyLabels,
  getAvailableExpenseMonths,
} from '../../utils/expenseExportGenerator';
import { formatHindiDate } from '../../lib/dateUtils';

interface AccountingExpensesProps {
  onExpenseChange?: () => void;
}

export const AccountingExpenses: React.FC<AccountingExpensesProps> = ({ onExpenseChange }) => {
  const { isAdmin } = useAppContext();
  const [expenses, setExpenses] = useState<AccountingExpense[]>([]);
  const [categories, setCategories] = useState<AccountingExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showExportModal, setShowExportModal] = useState(false);

  // New Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('tea_refreshment');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
  const [recipientName, setRecipientName] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Custom Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatHindi, setNewCatHindi] = useState('');

  // Delete Confirmation & Inline Notification State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<AccountingExpense | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [exps, cats] = await Promise.all([
        fetchAccountingExpenses(),
        fetchExpenseCategories(),
      ]);
      setExpenses(exps);
      setCategories(cats);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableMonths = useMemo(() => {
    const months = getAvailableExpenseMonths(expenses);
    if (!months.some(m => m.monthKey === selectedMonthKey)) {
      const labels = formatMonthKeyLabels(selectedMonthKey);
      return [
        {
          monthKey: selectedMonthKey,
          year: labels.year,
          month: labels.month,
          labelHindi: labels.labelHindi,
          labelEn: labels.labelEn,
          count: 0,
          totalAmount: 0,
        },
        ...months,
      ];
    }
    return months;
  }, [expenses, selectedMonthKey]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // 7 days ago
    const weekAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return expenses.filter(exp => {
      if (categoryFilter !== 'all' && exp.categoryId !== categoryFilter) {
        return false;
      }

      if (dateFilter === 'today') return exp.date === today;
      if (dateFilter === 'week') return exp.date >= weekAgoDate;
      if (dateFilter === 'month') return extractExpenseMonthKey(exp) === selectedMonthKey;
      return true;
    });
  }, [expenses, dateFilter, selectedMonthKey, categoryFilter]);

  // Aggregate Metrics
  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  }, [filteredExpenses]);

  const cashExpensesTotal = useMemo(() => {
    return filteredExpenses.filter(e => e.paymentMode === 'cash').reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const onlineExpensesTotal = useMemo(() => {
    return filteredExpenses.filter(e => e.paymentMode === 'online').reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpenses]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { hindi: string; amount: number; count: number }> = {};
    for (const exp of filteredExpenses) {
      const catId = exp.categoryId || 'other';
      if (!map[catId]) {
        map[catId] = {
          hindi: exp.categoryNameHindi || exp.categoryName || 'अन्य',
          amount: 0,
          count: 0,
        };
      }
      map[catId].amount += exp.amount || 0;
      map[catId].count += 1;
    }
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [filteredExpenses]);

  // Handle Save Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (expenseAmount <= 0) {
      setFormError('कृपया वैध खर्च राशि दर्ज करें।');
      return;
    }

    const cat = categories.find(c => c.id === selectedCatId) || categories[0];

    setIsSubmitting(true);
    try {
      await saveAccountingExpense({
        date: expenseDate,
        timestamp: Date.now(),
        categoryId: cat.id,
        categoryName: cat.name,
        categoryNameHindi: cat.hindiName,
        amount: Number(expenseAmount),
        paymentMode,
        recipientName: recipientName.trim(),
        description: description.trim(),
      });

      await loadData();
      onExpenseChange?.();
      setShowAddModal(false);
      setExpenseAmount(0);
      setRecipientName('');
      setDescription('');
      setStatusToast({ type: 'success', text: 'नया खर्च सफलतापूर्वक सुरक्षित हो गया।' });
    } catch (err: any) {
      setFormError('खर्च सुरक्षित करने में त्रुटि: ' + (err?.message || 'अज्ञात त्रुटि'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Custom Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatHindi.trim()) return;

    try {
      const created = await addCustomExpenseCategory(
        newCatName.trim() || newCatHindi.trim(),
        newCatHindi.trim()
      );
      setCategories(prev => [...prev, created]);
      setSelectedCatId(created.id);
      setShowCategoryModal(false);
      setNewCatName('');
      setNewCatHindi('');
      setStatusToast({ type: 'success', text: `नई श्रेणी "${created.hindiName}" जोड़ी गई।` });
    } catch (err: any) {
      setStatusToast({
        type: 'error',
        text: 'कैटेगरी बनाने में त्रुटि: ' + (err?.message || 'अज्ञात त्रुटि'),
      });
    }
  };

  const handleRequestDeleteExpense = (exp: AccountingExpense) => {
    if (!isAdmin) {
      setStatusToast({ type: 'error', text: 'केवल एडमिन ही खर्च हटा सकते हैं।' });
      return;
    }
    setDeleteError(null);
    setDeleteConfirmTarget(exp);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!deleteConfirmTarget) return;
    if (!isAdmin) {
      setDeleteError('केवल एडमिन ही खर्च हटा सकते हैं।');
      return;
    }

    const targetId = deleteConfirmTarget.id;
    setIsDeletingExpense(true);
    setDeleteError(null);
    try {
      await deleteAccountingExpense(targetId);
      // Immediately update local state so list & monthly totals refresh instantaneously
      setExpenses(prev => prev.filter(item => item.id !== targetId));
      setDeleteConfirmTarget(null);
      setStatusToast({ type: 'success', text: 'खर्च रिकॉर्ड सफलतापूर्वक हटा दिया गया।' });
      onExpenseChange?.();
    } catch (err: any) {
      let readableMsg = err?.message || 'खर्च हटाने में त्रुटि हुई। कृपया पुनः प्रयास करें।';
      try {
        const parsed = JSON.parse(readableMsg);
        if (parsed?.error) readableMsg = parsed.error;
      } catch {
        // Not JSON error string; use raw message
      }
      setDeleteError(`खर्च हटाने में असफल: ${readableMsg}`);
    } finally {
      setIsDeletingExpense(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Inline Status Toast (Success / Error) */}
      {statusToast && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold ${
            statusToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusToast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">दुकान के खर्च (Store Expenses)</h2>
            <p className="text-xs text-gray-500">
              चाय-पानी, पेट्रोल, भाड़ा, हमाली, बिजली, किराया व अन्य दैनिक व्यावसायिक खर्च
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-4 h-4" /> एक्सपोर्ट / शेयर
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold flex items-center gap-1"
          >
            <Tag className="w-4 h-4" /> + नई कैटेगरी
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setExpenseAmount(0);
              setShowAddModal(true);
            }}
            className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> + नया खर्च जोड़ें
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center font-bold">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold">
              कुल खर्च (
              {dateFilter === 'today'
                ? 'आज'
                : dateFilter === 'week'
                ? 'इस सप्ताह'
                : dateFilter === 'month'
                ? formatMonthKeyLabels(selectedMonthKey).labelHindi
                : 'सभी समय'}
              )
            </p>
            <h3 className="text-xl font-extrabold text-rose-600">₹{totalExpenseAmount.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-400">{filteredExpenses.length} प्रविष्टियां</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold">नकद चुकाया (Cash Expenses)</p>
            <h3 className="text-xl font-extrabold text-gray-900">₹{cashExpensesTotal.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-400">गल्ले से नकद निकासी</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold">ऑनलाइन चुकाया (UPI / Bank)</p>
            <h3 className="text-xl font-extrabold text-gray-900">₹{onlineExpensesTotal.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-400">बैंक खाते से भुगतान</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Category Breakdown + List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Category Breakdown Pills (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">खर्च वार विश्लेषण (Category Breakdown)</h3>
            
            <div className="space-y-2">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400 p-4 text-center">कोई खर्च दर्ज नहीं</p>
              ) : (
                categoryBreakdown.map(([catId, data]) => {
                  const percent = totalExpenseAmount > 0 ? Math.round((data.amount / totalExpenseAmount) * 100) : 0;
                  return (
                    <div key={catId} className="p-3 bg-gray-50 rounded-2xl space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-800">{data.hindi}</span>
                        <span className="text-rose-600 font-extrabold">₹{data.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{data.count} बार</span>
                        <span>{percent}% खर्च हिस्सा</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Expenses List (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl text-xs font-bold overflow-x-auto">
                {[
                  { id: 'today', label: 'आज (Today)' },
                  { id: 'week', label: 'इस सप्ताह' },
                  { id: 'month', label: 'माह अनुसार' },
                  { id: 'all', label: 'सभी' },
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDateFilter(d.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                      dateFilter === d.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {dateFilter === 'month' && (
                  <select
                    value={selectedMonthKey}
                    onChange={e => setSelectedMonthKey(e.target.value)}
                    aria-label="माह चुनें"
                    className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    {availableMonths.map(m => (
                      <option key={m.monthKey} value={m.monthKey}>
                        {m.labelHindi} ({m.count})
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value="all">सभी श्रेणियां</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.hindiName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expenses List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredExpenses.length === 0 ? (
                <div className="p-12 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
                  इस अवधि में कोई खर्च दर्ज नहीं है।
                </div>
              ) : (
                filteredExpenses.map(exp => (
                  <div
                    key={exp.id}
                    className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center font-bold">
                        {exp.paymentMode === 'cash' ? (
                          <Banknote className="w-4 h-4" />
                        ) : (
                          <Smartphone className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">{exp.categoryNameHindi || exp.categoryName}</h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                            {exp.paymentMode === 'cash' ? 'नकद' : 'ऑनलाइन'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {formatHindiDate(exp.date || exp.timestamp)} {exp.recipientName ? `· ${exp.recipientName}` : ''} {exp.description ? `· ${exp.description}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-rose-600 tabular-nums">
                        ₹{exp.amount?.toLocaleString()}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteExpense(exp)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="खर्च हटाएं"
                          aria-label="खर्च हटाएं"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD EXPENSE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                दुकान का खर्च दर्ज करें
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="font-bold text-gray-700 block mb-1">खर्च की श्रेणी (Category) *</label>
                <select
                  value={selectedCatId}
                  onChange={e => setSelectedCatId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.hindiName} ({cat.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">खर्च राशि ₹ *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="उदा. 150"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(Number(e.target.value))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-extrabold text-rose-600 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">भुगतान माध्यम</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="cash">नकद (Cash)</option>
                    <option value="online">ऑनलाइन (UPI / QR)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">तारीख</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">किसे दिया (Recipient / Vendor)</label>
                <input
                  type="text"
                  placeholder="उदा. राधे टी स्टॉल / ड्राइवर रमेश..."
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">विवरण / नोट</label>
                <input
                  type="text"
                  placeholder="उदा. 10 कप चाय व नाश्ता..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-sm shadow-sm active:scale-95 transition-all mt-4"
              >
                {isSubmitting ? 'सुरक्षित हो रहा है...' : `खर्च सेव करें · ₹${expenseAmount}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM CATEGORY */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">नई खर्च श्रेणी बनाएं</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">श्रेणी का हिंदी नाम *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. प्रिंटर स्याही व स्टेशनरी"
                  value={newCatHindi}
                  onChange={e => setNewCatHindi(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">अंग्रेज़ी नाम</label>
                <input
                  type="text"
                  placeholder="उदा. Stationery & Ink"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-md mt-3"
              >
                श्रेणी जोड़ें
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXPENSE REPORT EXPORT & SHARE */}
      {showExportModal && (
        <ExpenseExportModal
          expenses={expenses}
          categories={categories}
          initialMonthKey={selectedMonthKey}
          initialCategoryId={categoryFilter}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* MODAL: DELETE EXPENSE CONFIRMATION */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-gray-900">
                  खर्च रिकॉर्ड हटाने की पुष्टि
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  क्या आप इस खर्च को हटाना चाहते हैं? यह कार्रवाई वापस नहीं की जा सकेगी।
                </p>
              </div>
              <button
                type="button"
                disabled={isDeletingExpense}
                onClick={() => {
                  setDeleteConfirmTarget(null);
                  setDeleteError(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">
                  {deleteConfirmTarget.categoryNameHindi || deleteConfirmTarget.categoryName}
                </p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {deleteConfirmTarget.date} · {deleteConfirmTarget.paymentMode === 'cash' ? 'नकद' : 'ऑनलाइन'}
                  {deleteConfirmTarget.recipientName ? ` · ${deleteConfirmTarget.recipientName}` : ''}
                </p>
              </div>
              <span className="text-sm font-extrabold text-rose-600 tabular-nums shrink-0">
                ₹{deleteConfirmTarget.amount?.toLocaleString()}
              </span>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeletingExpense}
                onClick={() => {
                  setDeleteConfirmTarget(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                रद्द करें
              </button>
              <button
                type="button"
                disabled={isDeletingExpense}
                onClick={handleConfirmDeleteExpense}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDeletingExpense ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>हटाया जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>हाँ, खर्च हटाएं</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingExpenses;
