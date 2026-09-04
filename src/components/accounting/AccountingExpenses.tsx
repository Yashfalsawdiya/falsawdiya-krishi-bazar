import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, Plus, Trash2, Calendar, Coffee, Fuel, 
  Truck, Users, Zap, Home, Package, Wrench, Tag, 
  PlusCircle, IndianRupee, Search, X,
  Wallet, Smartphone, Banknote
} from 'lucide-react';
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

export const AccountingExpenses: React.FC = () => {
  const [expenses, setExpenses] = useState<AccountingExpense[]>([]);
  const [categories, setCategories] = useState<AccountingExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // First day of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    // 7 days ago
    const weekAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return expenses.filter(exp => {
      if (categoryFilter !== 'all' && exp.categoryId !== categoryFilter) {
        return false;
      }

      if (dateFilter === 'today') return exp.date === today;
      if (dateFilter === 'week') return exp.date >= weekAgoDate;
      if (dateFilter === 'month') return exp.date >= startOfMonth;
      return true;
    });
  }, [expenses, dateFilter, categoryFilter]);

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
    if (expenseAmount <= 0) {
      alert('कृपया वैध खर्च राशि दर्ज करें।');
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
      setShowAddModal(false);
      setExpenseAmount(0);
      setRecipientName('');
      setDescription('');
    } catch (err: any) {
      alert('खर्च सुरक्षित करने में त्रुटि: ' + err.message);
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
    } catch (err: any) {
      alert('कैटेगरी बनाने में त्रुटि: ' + err.message);
    }
  };

  const handleDeleteExpense = async (id: string, name: string) => {
    if (!window.confirm(`क्या आप इस खर्च (${name}) को डिलीट करना चाहते हैं?`)) return;
    try {
      await deleteAccountingExpense(id);
      await loadData();
    } catch (err: any) {
      alert('डिलीट करने में त्रुटि: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold flex items-center gap-1"
          >
            <Tag className="w-4 h-4" /> + नई कैटेगरी
          </button>
          <button
            onClick={() => {
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
            <p className="text-xs text-gray-500 font-bold">कुल खर्च ({dateFilter === 'today' ? 'आज' : dateFilter === 'week' ? 'इस सप्ताह' : 'इस माह'})</p>
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
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl text-xs font-bold">
                {[
                  { id: 'today', label: 'आज (Today)' },
                  { id: 'week', label: 'इस सप्ताह' },
                  { id: 'month', label: 'इस माह (Month)' },
                  { id: 'all', label: 'सभी' },
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDateFilter(d.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      dateFilter === d.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

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
                          {exp.date} {exp.recipientName ? `· ${exp.recipientName}` : ''} {exp.description ? `· ${exp.description}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-rose-600">
                        ₹{exp.amount?.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.categoryNameHindi)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="हटाएं"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
    </div>
  );
};

export default AccountingExpenses;
