import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, Phone, MapPin, IndianRupee, 
  AlertTriangle, CheckCircle2, MessageSquare, Download, 
  Printer, ArrowUpRight, ArrowDownLeft, Calendar, FileText, X,
  Edit3
} from 'lucide-react';
import { 
  AccountingCustomer, 
  CustomerLedgerEntry 
} from '../../types/accounting';
import { 
  fetchAccountingCustomers, 
  saveAccountingCustomer, 
  fetchCustomerLedger, 
  recordCustomerPayment 
} from '../../services/accountingService';

interface Props {
  initialCustomerId?: string;
}

export const AccountingCustomerLedger: React.FC<Props> = ({ initialCustomerId }) => {
  const [customers, setCustomers] = useState<AccountingCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [ledgerEntries, setLedgerEntries] = useState<CustomerLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'outstanding' | 'over_limit'>('outstanding');

  // Add / Edit Customer Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<AccountingCustomer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formVillage, setFormVillage] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState(10000);
  const [formNotes, setFormNotes] = useState('');

  // Payment Collection Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'bank'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchAccountingCustomers();
      setCustomers(data);
      if (!selectedCustomerId && data.length > 0) {
        setSelectedCustomerId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Load ledger for selected customer
  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerLedger(selectedCustomerId).then(entries => {
        setLedgerEntries(entries);
      });
    } else {
      setLedgerEntries([]);
    }
  }, [selectedCustomerId]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalOutstanding = customers.reduce((acc, c) => acc + (c.currentOutstanding || 0), 0);
    const overLimitCount = customers.filter(c => (c.currentOutstanding || 0) > (c.creditLimit || 0)).length;
    const withOutstandingCount = customers.filter(c => (c.currentOutstanding || 0) > 0).length;
    return { totalOutstanding, overLimitCount, withOutstandingCount };
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.village && c.village.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      if (filterType === 'outstanding') return (c.currentOutstanding || 0) > 0;
      if (filterType === 'over_limit') return (c.currentOutstanding || 0) > (c.creditLimit || 0);
      return true;
    });
  }, [customers, searchQuery, filterType]);

  // Save Customer (Add / Edit)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      const newId = await saveAccountingCustomer({
        name: formName.trim(),
        phone: formPhone.trim(),
        village: formVillage.trim(),
        totalPurchases: editingCustomer?.totalPurchases || 0,
        totalPaid: editingCustomer?.totalPaid || 0,
        currentOutstanding: editingCustomer?.currentOutstanding || 0,
        creditLimit: Number(formCreditLimit) || 10000,
        status: (editingCustomer?.currentOutstanding || 0) > Number(formCreditLimit) ? 'warning' : 'good',
        notes: formNotes.trim(),
      }, editingCustomer?.id);

      await loadCustomers();
      setSelectedCustomerId(newId);
      setShowCustomerModal(false);
      setEditingCustomer(null);
    } catch (err: any) {
      alert('ग्राहक सुरक्षित करने में त्रुटि: ' + err.message);
    }
  };

  // Submit Payment Collection
  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || paymentAmount <= 0) {
      alert('कृपया वैध भुगतान राशि दर्ज करें।');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await recordCustomerPayment(
        selectedCustomer.id,
        selectedCustomer.name,
        paymentAmount,
        paymentMode,
        paymentNote.trim(),
        paymentDate
      );

      await loadCustomers();
      const updatedEntries = await fetchCustomerLedger(selectedCustomer.id);
      setLedgerEntries(updatedEntries);
      setShowPaymentModal(false);
      setPaymentAmount(0);
      setPaymentNote('');
    } catch (err: any) {
      alert('भुगतान जमा करने में त्रुटि: ' + err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // 1-Click WhatsApp Reminder
  const sendWhatsAppReminder = (c: AccountingCustomer) => {
    if (!c.phone) {
      alert('ग्राहक का मोबाइल नंबर दर्ज नहीं है।');
      return;
    }

    const cleanPhone = c.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = `नमस्ते ${c.name} जी,\n\n*फल्सावदिया कृषि बाजार, शामगढ़* से सादर नमस्कार।\n\nआपकी दुकान पर वर्तमान बकाया उधारी राशि *₹${c.currentOutstanding}* है।\n\nकृपया सुविधानुसार यह बकाया राशि चुकाने की कृपा करें ताकि आपकी उधारी खाता सुविधा निरंतर चालू रहे।\n\nदुकान का पता: डिंपल चौराहा, शामगढ़ (म.प्र.)\nसंपर्क: 8982338046\n\nधन्यवाद!`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const printLedger = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center font-bold">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold">कुल बकाया उधारी (Total Market Due)</p>
            <h3 className="text-xl font-extrabold text-red-600">₹{metrics.totalOutstanding.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-400">{metrics.withOutstandingCount} किसानों पर बकाया</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold">उधारी सीमा पार (Credit Limit Exceeded)</p>
            <h3 className="text-xl font-extrabold text-amber-700">{metrics.overLimitCount} किसान</h3>
            <p className="text-[10px] text-gray-400">तुरंत वसूली अलर्ट</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold">कुल पंजीकृत खाते</p>
              <h3 className="text-xl font-extrabold text-gray-900">{customers.length} ग्राहक</h3>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingCustomer(null);
              setFormName('');
              setFormPhone('');
              setFormVillage('');
              setFormCreditLimit(10000);
              setFormNotes('');
              setShowCustomerModal(true);
            }}
            className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-200 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> नया खाता
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Customer Directory (4 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="किसान का नाम, गाँव या मोबाइल..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1 text-xs">
              {[
                { id: 'outstanding', label: 'उधारी बाकी' },
                { id: 'over_limit', label: 'लिमिट पार', icon: AlertTriangle },
                { id: 'all', label: 'सभी' },
              ].map(f => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id as any)}
                    className={`flex-1 py-1.5 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1 ${
                      filterType === f.id
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3 text-amber-500" />}
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Customers List */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
                  कोई खाता नहीं मिला।
                </div>
              ) : (
                filteredCustomers.map(c => {
                  const isSelected = c.id === selectedCustomerId;
                  const isOverLimit = (c.currentOutstanding || 0) > (c.creditLimit || 0);
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                          : 'border-gray-100 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{c.name}</h4>
                          {isOverLimit && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                              अलर्ट
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {c.phone} {c.village ? `· ${c.village}` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`font-extrabold text-sm ${
                          c.currentOutstanding > 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}>
                          ₹{c.currentOutstanding.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          लिमिट: ₹{c.creditLimit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Customer Passbook / Ledger View (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCustomer ? (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
              {/* Customer Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h3>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      selectedCustomer.currentOutstanding > selectedCustomer.creditLimit
                        ? 'bg-red-100 text-red-800'
                        : selectedCustomer.currentOutstanding > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedCustomer.currentOutstanding > 0 ? 'उधारी खाता चालू' : 'खाता चुकता'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {selectedCustomer.phone || 'मोबाइल उपलब्ध नहीं'}
                    </span>
                    {selectedCustomer.village && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {selectedCustomer.village}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => sendWhatsAppReminder(selectedCustomer)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp तगादा
                  </button>
                  <button
                    onClick={() => {
                      setEditingCustomer(selectedCustomer);
                      setFormName(selectedCustomer.name);
                      setFormPhone(selectedCustomer.phone);
                      setFormVillage(selectedCustomer.village);
                      setFormCreditLimit(selectedCustomer.creditLimit);
                      setFormNotes(selectedCustomer.notes || '');
                      setShowCustomerModal(true);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-xl text-xs"
                    title="खाता एडिट करें"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Financial Balance Summary Card */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-center">
                <div>
                  <span className="text-gray-500 block text-[11px]">कुल खरीद (Total Buy)</span>
                  <strong className="text-gray-900 text-sm font-bold">₹{selectedCustomer.totalPurchases?.toLocaleString() || 0}</strong>
                </div>
                <div className="border-x border-gray-200 px-2">
                  <span className="text-gray-500 block text-[11px]">जमा की गई राशि</span>
                  <strong className="text-emerald-700 text-sm font-bold">₹{selectedCustomer.totalPaid?.toLocaleString() || 0}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">वर्तमान बकाया उधारी</span>
                  <strong className="text-red-600 text-base font-extrabold">₹{selectedCustomer.currentOutstanding?.toLocaleString() || 0}</strong>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setPaymentAmount(selectedCustomer.currentOutstanding);
                    setShowPaymentModal(true);
                  }}
                  className="py-3 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-200 active:scale-95 transition-all"
                >
                  <IndianRupee className="w-4 h-4" /> ₹ उधारी भुगतान जमा करें (Receive Payment)
                </button>

                <button
                  onClick={printLedger}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> पासबुक प्रिंट
                </button>
              </div>

              {/* Passbook Ledger Transactions Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  खाता बही लेनदेन इतिहास (Passbook Ledger)
                </h4>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {ledgerEntries.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
                      इस खाते में अभी कोई पुराना लेनदेन दर्ज नहीं है।
                    </div>
                  ) : (
                    ledgerEntries.map(entry => {
                      const isDebit = entry.type === 'sale_debit';
                      return (
                        <div
                          key={entry.id}
                          className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between text-xs gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isDebit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">
                                {isDebit ? `सामान बिक्री #${entry.invoiceNo || ''}` : `उधारी जमा (${entry.paymentMode || 'Cash'})`}
                              </p>
                              <p className="text-[10px] text-gray-400">{entry.date} · {entry.note}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={`font-extrabold ${isDebit ? 'text-red-600' : 'text-emerald-700'}`}>
                              {isDebit ? `+ ₹${entry.amount}` : `- ₹${entry.amount}`}
                            </p>
                            <p className="text-[10px] text-gray-400">शेष: ₹{entry.balanceAfter}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
              <Users className="w-8 h-8 text-gray-300" />
              <span>बाईं तरफ से किसी किसान का खाता चुनें</span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD / EDIT CUSTOMER */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingCustomer ? 'खाता विवरण एडिट करें' : 'नया किसान खाता खोलें'}
              </h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">किसान का पूरा नाम *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. जगदीश पाटीदार"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">मोबाइल नंबर</label>
                  <input
                    type="tel"
                    placeholder="उदा. 98260XXXXX"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">गाँव / कस्बा</label>
                  <input
                    type="text"
                    placeholder="उदा. फल्सावद"
                    value={formVillage}
                    onChange={e => setFormVillage(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">अधिकतम उधारी सीमा (Credit Limit) ₹</label>
                <input
                  type="number"
                  value={formCreditLimit}
                  onChange={e => setFormCreditLimit(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">अतिरिक्त विवरण / टिप्पणी</label>
                <textarea
                  rows={2}
                  placeholder="उदा. 5 बीघा जमीन, लहसुन-सोयाबीन किसान..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-800 active:scale-95 transition-all mt-4"
              >
                खाता सुरक्षित करें
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT PAYMENT */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">उधारी जमा रसीद काटें</h3>
                <p className="text-xs text-gray-500">किसान: <strong>{selectedCustomer.name}</strong></p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollectPayment} className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center">
                <span className="text-gray-600 font-bold">वर्तमान कुल उधारी:</span>
                <span className="text-base font-extrabold text-red-600">₹{selectedCustomer.currentOutstanding}</span>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">जमा की जाने वाली राशि ₹ *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedCustomer.currentOutstanding || 999999}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-extrabold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    <option value="online">ऑनलाइन (UPI)</option>
                    <option value="bank">बैंक ट्रांसफर</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">तारीख</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">विवरण / नोट</label>
                <input
                  type="text"
                  placeholder="उदा. सोयाबीन बेचकर रुपये दिए..."
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="w-full py-3.5 bg-emerald-700 text-white rounded-xl font-extrabold text-sm shadow-md hover:bg-emerald-800 active:scale-95 transition-all mt-4 disabled:opacity-50"
              >
                {isSubmittingPayment ? 'जमा हो रहा है...' : `₹${paymentAmount} जमा करें एवं खाता अपडेट करें`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingCustomerLedger;
