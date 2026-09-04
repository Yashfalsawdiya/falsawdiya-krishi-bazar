import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, Phone, MapPin, IndianRupee, 
  AlertTriangle, CheckCircle2, MessageSquare, 
  Printer, ArrowUpRight, ArrowDownLeft, FileText, X,
  Edit3, Eye, ChevronRight, Share2, ShoppingBag, ShieldCheck
} from 'lucide-react';
import { 
  AccountingCustomer, 
  CustomerLedgerEntry,
  AccountingSale
} from '../../types/accounting';
import { 
  fetchAccountingCustomers, 
  saveAccountingCustomer, 
  fetchCustomerLedger, 
  recordCustomerPayment,
  fetchAccountingSaleById,
  fetchAccountingSaleByInvoiceNo
} from '../../services/accountingService';

interface Props {
  initialCustomerId?: string;
  onPaymentRecorded?: () => void;
}

export const AccountingCustomerLedger: React.FC<Props> = ({ initialCustomerId, onPaymentRecorded }) => {
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

  // Sales Invoice Detail Modal
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<AccountingSale | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);

  // Passbook Print Modal
  const [showPassbookModal, setShowPassbookModal] = useState(false);

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

      if (filterType === 'outstanding') {
        return (c.currentOutstanding || 0) > 0;
      }
      if (filterType === 'over_limit') {
        return (c.currentOutstanding || 0) > (c.creditLimit || 0);
      }
      return true;
    });
  }, [customers, searchQuery, filterType]);

  // Save / Update Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('कृपया किसान का नाम दर्ज करें।');
      return;
    }

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

      // Notify parent to refresh dashboard & cash flow instantly
      if (onPaymentRecorded) {
        onPaymentRecorded();
      }
    } catch (err: any) {
      alert('भुगतान जमा करने में त्रुटि: ' + err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Smart WhatsApp Messenger: Tagada (Reminder) or Payment Confirmation
  const sendWhatsAppMessage = (c: AccountingCustomer) => {
    if (!c.phone) {
      alert('ग्राहक का मोबाइल नंबर दर्ज नहीं है।');
      return;
    }

    const digitsOnly = c.phone.replace(/\D/g, '');
    const cleanPhone = digitsOnly.slice(-10);
    if (cleanPhone.length !== 10) {
      alert('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।');
      return;
    }
    const formattedPhone = `91${cleanPhone}`;

    let message = '';
    if (c.currentOutstanding > 0) {
      message = `नमस्ते ${c.name} जी,

फल्सावदिया कृषि बाजार की ओर से आपके खाते की एक विनम्र याद दिलाना है।

आपके खाते में वर्तमान बकाया राशि:
₹${c.currentOutstanding.toLocaleString()}

कृपया अपनी सुविधा अनुसार बकाया राशि का भुगतान कर दें।

आपके सहयोग के लिए धन्यवाद।

🌱 फल्सावदिया कृषि बाजार
किसान का भरोसा, हमारी पहचान`;
    } else {
      message = `नमस्ते ${c.name} जी,

आपके खाते में भुगतान सफलतापूर्वक दर्ज कर लिया गया है।

आपके खाते की वर्तमान बकाया राशि: ₹0 (खाता चुकता)

धन्यवाद।

🌱 फल्सावदिया कृषि बाजार
किसान का भरोसा, हमारी पहचान`;
    }

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Open Full Sale Invoice Detail
  const handleOpenSaleDetail = async (entry: CustomerLedgerEntry) => {
    setLoadingSale(true);
    setShowSaleModal(true);
    setSelectedSale(null);

    try {
      let sale: AccountingSale | null = null;
      if (entry.saleId) {
        sale = await fetchAccountingSaleById(entry.saleId);
      }
      if (!sale && entry.invoiceNo) {
        sale = await fetchAccountingSaleByInvoiceNo(entry.invoiceNo);
      }

      if (sale) {
        setSelectedSale(sale);
      } else {
        // Fallback representation if original sale record is not found
        setSelectedSale({
          id: entry.id,
          invoiceNo: entry.invoiceNo || 'OFF-BILL',
          date: entry.date,
          timestamp: entry.timestamp,
          customerId: entry.customerId,
          customerName: entry.customerName,
          customerPhone: selectedCustomer?.phone,
          customerVillage: selectedCustomer?.village,
          items: [],
          subtotal: entry.amount,
          bargainingDiscount: 0,
          finalTotal: entry.amount,
          totalCOGS: 0,
          grossProfit: 0,
          grossMarginPercent: 0,
          paymentMode: (entry.paymentMode as any) || 'cash',
          cashPaid: 0,
          onlinePaid: 0,
          udhariAmount: entry.amount,
          createdAt: entry.timestamp,
          note: entry.note,
        });
      }
    } catch (err) {
      console.error('Error opening sale detail:', err);
    } finally {
      setLoadingSale(false);
    }
  };

  // Send Specific Invoice on WhatsApp
  const sendInvoiceOnWhatsApp = (sale: AccountingSale) => {
    const phone = sale.customerPhone || selectedCustomer?.phone || '';
    const digitsOnly = phone.replace(/\D/g, '');
    const cleanPhone = digitsOnly.slice(-10);

    let itemsText = '';
    if (sale.items && sale.items.length > 0) {
      itemsText = sale.items.map((it, idx) => {
        const rate = it.effectiveSellingPrice || it.originalSellingPrice;
        const total = it.totalEffectiveAmount || (it.quantity * rate);
        return `${idx + 1}. *${it.hindiName || it.name}*\n   मात्रा: ${it.quantity} ${it.unit} | दर: ₹${rate}\n   कुल: ₹${total}`;
      }).join('\n');
    } else {
      itemsText = `सामान बिक्री: ₹${sale.finalTotal || sale.subtotal}`;
    }

    const paid = (sale.cashPaid || 0) + (sale.onlinePaid || 0);

    const message = `🌱 *फल्सावदिया कृषि बाजार*
किसान का भरोसा, हमारी पहचान
📍 डिंपल चौराहा, शामगढ़ (म.प्र.)
📞 संपर्क: 8982338046

🧾 *बिक्री बिल (Sales Invoice)*
बिल नं: #${sale.invoiceNo}
दिनांक: ${sale.date}
ग्राहक: ${sale.customerName} ${sale.customerVillage ? `(${sale.customerVillage})` : ''}

📦 *सामान का विवरण:*
${itemsText}

----------------------------------
उप-कुल (Subtotal): ₹${sale.subtotal || sale.finalTotal}
${sale.bargainingDiscount ? `छूट/मोलभाव: -₹${sale.bargainingDiscount}\n` : ''}कुल बिल राशि: *₹${sale.finalTotal}*
जमा की गई राशि: ₹${paid} (${sale.paymentMode === 'cash' ? 'नकद' : sale.paymentMode === 'online' ? 'UPI' : sale.paymentMode === 'split' ? 'नकद + UPI' : 'उधारी'})
बिल पर उधारी: *₹${sale.udhariAmount || 0}*
----------------------------------
*खाते में वर्तमान कुल बकाया:* ₹${selectedCustomer?.currentOutstanding || 0}

फल्सावदिया कृषि बाजार से खरीदारी के लिए धन्यवाद!
पुनः पधारें।`;

    const targetUrl = cleanPhone.length === 10
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(targetUrl, '_blank');
  };

  const handlePrintPassbook = () => {
    setShowPassbookModal(true);
  };

  const executePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Print Stylesheet to guarantee ONLY the passbook prints without page clutter */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-customer-passbook, #printable-customer-passbook * {
            visibility: visible !important;
          }
          #printable-customer-passbook {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            z-index: 9999999 !important;
            display: block !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

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
        {/* LEFT COLUMN: Customer Directory (5 Cols) */}
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

            {/* Filter Chips */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <button
                onClick={() => setFilterType('outstanding')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterType === 'outstanding'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                बकाया वाले ({metrics.withOutstandingCount})
              </button>
              <button
                onClick={() => setFilterType('over_limit')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterType === 'over_limit'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                सीमा पार ({metrics.overLimitCount})
              </button>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterType === 'all'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                सभी ({customers.length})
              </button>
            </div>

            {/* List of Customers */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-xs">ग्राहक खाते लोड हो रहे हैं...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">कोई ग्राहक नहीं मिला।</div>
              ) : (
                filteredCustomers.map(cust => {
                  const isSelected = cust.id === selectedCustomerId;
                  const isOverLimit = (cust.currentOutstanding || 0) > (cust.creditLimit || 0);
                  const isPaidCleared = (cust.currentOutstanding || 0) === 0;

                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-xs">{cust.name}</span>
                          {isPaidCleared ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              खाता चुकता
                            </span>
                          ) : isOverLimit ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> सीमा पार
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                              उधारी चालू
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                          {cust.phone && <span>{cust.phone}</span>}
                          {cust.village && <span>· {cust.village}</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`block font-extrabold text-sm ${
                          (cust.currentOutstanding || 0) > 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}>
                          ₹{cust.currentOutstanding?.toLocaleString() || 0}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          सीमा: ₹{cust.creditLimit?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Customer Ledger & Passbook (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCustomer ? (
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-5">
              {/* Customer Header & Quick Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-gray-900">{selectedCustomer.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedCustomer.currentOutstanding > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
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
                  {/* Dynamic WhatsApp Button: Tagada vs Payment Confirmation */}
                  <button
                    onClick={() => sendWhatsAppMessage(selectedCustomer)}
                    className={`px-3 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                      selectedCustomer.currentOutstanding > 0
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    }`}
                  >
                    {selectedCustomer.currentOutstanding > 0 ? (
                      <>
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp तकादा
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> WhatsApp भुगतान पुष्टि
                      </>
                    )}
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
                  onClick={handlePrintPassbook}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-gray-600" /> पासबुक प्रिंट
                </button>
              </div>

              {/* Passbook Ledger Transactions Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    खाता बही लेनदेन इतिहास (Passbook Ledger)
                  </h4>
                  <span className="text-[11px] text-gray-400">
                    बिक्री बिल पर क्लिक करके पूरा इनवॉइस देखें
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
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
                          onClick={() => {
                            if (isDebit || entry.invoiceNo || entry.saleId) {
                              handleOpenSaleDetail(entry);
                            }
                          }}
                          className={`p-3 rounded-2xl flex items-center justify-between text-xs gap-3 border transition-all ${
                            isDebit 
                              ? 'bg-red-50/40 border-red-100 hover:bg-red-50 hover:border-red-300 cursor-pointer group' 
                              : 'bg-emerald-50/40 border-emerald-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isDebit ? 'bg-red-100 text-red-700 group-hover:scale-105 transition-transform' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900">
                                  {isDebit ? `सामान बिक्री #${entry.invoiceNo || ''}` : `उधारी जमा (${entry.paymentMode || 'Cash'})`}
                                </p>
                                {isDebit && (
                                  <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Eye className="w-2.5 h-2.5" /> बिल देखें
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500">{entry.date} · {entry.note}</p>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className={`font-extrabold ${isDebit ? 'text-red-600' : 'text-emerald-700'}`}>
                                {isDebit ? `+ ₹${entry.amount.toLocaleString()}` : `- ₹${entry.amount.toLocaleString()}`}
                              </p>
                              <p className="text-[10px] text-gray-400">शेष: ₹{entry.balanceAfter.toLocaleString()}</p>
                            </div>
                            {isDebit && (
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                            )}
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
                <span className="text-base font-extrabold text-red-600">₹{selectedCustomer.currentOutstanding.toLocaleString()}</span>
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
                {isSubmittingPayment ? 'जमा हो रहा है...' : `₹${paymentAmount.toLocaleString()} जमा करें एवं खाता अपडेट करें`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPLETE SALES INVOICE DETAIL */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-700" />
                  बिक्री विवरण / Sales Invoice
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedSale ? `बिल #${selectedSale.invoiceNo} · दिनांक: ${selectedSale.date}` : 'बिल विवरण लोड हो रहा है...'}
                </p>
              </div>
              <button onClick={() => setShowSaleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingSale ? (
              <div className="p-12 text-center text-gray-400 text-xs">
                बिल का संपूर्ण विवरण लोड हो रहा है...
              </div>
            ) : selectedSale ? (
              <div className="space-y-4 text-xs">
                {/* Shop & Customer Branding Header */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-emerald-950">🌱 फल्सावदिया कृषि बाजार</h4>
                    <p className="text-[11px] text-emerald-800">किसान का भरोसा, हमारी पहचान</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">डिंपल चौराहा, शामगढ़ (म.प्र.) · संपर्क: 8982338046</p>
                  </div>
                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200">
                    <p className="font-bold text-gray-900">ग्राहक: {selectedSale.customerName}</p>
                    <p className="text-[11px] text-gray-600">
                      {selectedSale.customerVillage ? `गाँव: ${selectedSale.customerVillage}` : ''}
                      {selectedSale.customerPhone ? ` · मो: ${selectedSale.customerPhone}` : ''}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-bold mt-1">
                      भुगतान: {selectedSale.paymentMode === 'cash' ? 'नकद' : selectedSale.paymentMode === 'online' ? 'ऑनलाइन (UPI)' : selectedSale.paymentMode === 'split' ? 'नकद + UPI' : 'उधारी'}
                    </p>
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                        <th className="p-2.5 font-bold">#</th>
                        <th className="p-2.5 font-bold">सामान / उत्पाद का नाम</th>
                        <th className="p-2.5 font-bold text-center">मात्रा</th>
                        <th className="p-2.5 font-bold text-right">मूल भाव</th>
                        <th className="p-2.5 font-bold text-right">छूट</th>
                        <th className="p-2.5 font-bold text-right">शुद्ध दर</th>
                        <th className="p-2.5 font-bold text-right">कुल योग</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-2.5 text-gray-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-gray-900">
                              {it.hindiName || it.name}
                              {it.hindiName && it.name && (
                                <span className="block text-[10px] text-gray-400 font-normal">{it.name}</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-bold text-gray-800">
                              {it.quantity} {it.unit}
                            </td>
                            <td className="p-2.5 text-right text-gray-500">
                              ₹{it.originalSellingPrice || it.effectiveSellingPrice}
                            </td>
                            <td className="p-2.5 text-right text-emerald-600 font-bold">
                              {it.bargainingDiscountShare > 0 ? `-₹${it.bargainingDiscountShare}` : '-'}
                            </td>
                            <td className="p-2.5 text-right text-gray-900 font-bold">
                              ₹{it.effectiveSellingPrice}
                            </td>
                            <td className="p-2.5 text-right font-extrabold text-gray-900">
                              ₹{it.totalEffectiveAmount || (it.quantity * it.effectiveSellingPrice)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-gray-400">
                            सामान बिक्री विवरण उपलब्ध (राशि: ₹{selectedSale.finalTotal})
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <p><strong>बिल नंबर:</strong> #{selectedSale.invoiceNo}</p>
                    <p><strong>दिनांक:</strong> {selectedSale.date}</p>
                    {selectedSale.note && <p><strong>टिप्पणी:</strong> {selectedSale.note}</p>}
                  </div>

                  <div className="space-y-1 text-xs text-right">
                    <div className="flex justify-between">
                      <span className="text-gray-500">उप-कुल (Subtotal):</span>
                      <strong className="text-gray-900 font-bold">₹{(selectedSale.subtotal || selectedSale.finalTotal).toLocaleString()}</strong>
                    </div>
                    {selectedSale.bargainingDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>मोलभाव / कुल छूट:</span>
                        <strong className="font-bold">-₹{selectedSale.bargainingDiscount.toLocaleString()}</strong>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-gray-900 border-t pt-1">
                      <span>अंतिम कुल बिल:</span>
                      <span className="text-emerald-900">₹{selectedSale.finalTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-700 font-bold">
                      <span>जमा की गई राशि:</span>
                      <span>₹{((selectedSale.cashPaid || 0) + (selectedSale.onlinePaid || 0)).toLocaleString()}</span>
                    </div>
                    {selectedSale.udhariAmount > 0 && (
                      <div className="flex justify-between text-xs text-red-600 font-extrabold">
                        <span>इस बिल पर उधारी:</span>
                        <span>₹{selectedSale.udhariAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-gray-500 border-t pt-1">
                      <span>किसान का वर्तमान कुल बकाया:</span>
                      <span className="font-bold text-red-600">₹{(selectedCustomer?.currentOutstanding || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: WhatsApp & Print */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => sendInvoiceOnWhatsApp(selectedSale)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-200 active:scale-95 transition-all"
                  >
                    <Share2 className="w-4 h-4" /> WhatsApp पर बिल भेजें
                  </button>
                  <button
                    onClick={executePrint}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-4 h-4" /> प्रिंट करें
                  </button>
                  <button
                    onClick={() => setShowSaleModal(false)}
                    className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xs transition-all"
                  >
                    बंद करें
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL: PROFESSIONAL CUSTOMER PASSBOOK VIEW & PRINT */}
      {showPassbookModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 print-hidden">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-700" />
                ग्राहक खाता बही पासबुक (Customer Ledger Passbook)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={executePrint}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-200 active:scale-95 transition-all"
                >
                  <Printer className="w-4 h-4" /> प्रिंट करें / PDF सेव करें
                </button>
                <button
                  onClick={() => setShowPassbookModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE PASSBOOK DOCUMENT (Isolate with #printable-customer-passbook) */}
            <div id="printable-customer-passbook" className="space-y-5 bg-white p-6 rounded-2xl border border-gray-200">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-extrabold text-gray-900">🌱 फल्सावदिया कृषि बाजार</h2>
                <p className="text-xs font-bold text-emerald-800">किसान का भरोसा, हमारी पहचान</p>
                <p className="text-[11px] text-gray-500">डिंपल चौराहा, शामगढ़ (म.प्र.) · मोबाइल: 8982338046</p>
                <div className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-900 font-extrabold text-xs rounded-full">
                  ग्राहक खाता बही पासबुक (Customer Ledger Passbook)
                </div>
              </div>

              {/* Customer Profile Box */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl text-xs border border-gray-200">
                <div className="space-y-1">
                  <p><strong>किसान का नाम:</strong> {selectedCustomer.name}</p>
                  <p><strong>मोबाइल नंबर:</strong> {selectedCustomer.phone || 'उपलब्ध नहीं'}</p>
                  <p><strong>गाँव / कस्बा:</strong> {selectedCustomer.village || 'शामगढ़'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p><strong>खाता संख्या:</strong> #{selectedCustomer.id.slice(0, 8).toUpperCase()}</p>
                  <p><strong>पासबुक प्रिंट दिनांक:</strong> {new Date().toLocaleDateString('hi-IN')}</p>
                  <p><strong>खाता स्थिति:</strong> <span className="font-bold text-emerald-700">{selectedCustomer.currentOutstanding === 0 ? 'खाता चुकता' : 'उधारी खाता चालू'}</span></p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-center text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px]">कुल खरीद</span>
                  <strong className="text-gray-900 text-sm font-extrabold">₹{selectedCustomer.totalPurchases?.toLocaleString() || 0}</strong>
                </div>
                <div className="border-x border-emerald-200">
                  <span className="text-gray-500 block text-[10px]">कुल जमा राशि</span>
                  <strong className="text-emerald-800 text-sm font-extrabold">₹{selectedCustomer.totalPaid?.toLocaleString() || 0}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">वर्तमान शुद्ध बकाया</span>
                  <strong className="text-red-600 text-base font-extrabold">₹{selectedCustomer.currentOutstanding?.toLocaleString() || 0}</strong>
                </div>
              </div>

              {/* Systematic Ledger Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                      <th className="p-2.5 font-bold">क्र.</th>
                      <th className="p-2.5 font-bold">दिनांक</th>
                      <th className="p-2.5 font-bold">विवरण व संदर्भ</th>
                      <th className="p-2.5 font-bold">बिल/रसीद नं.</th>
                      <th className="p-2.5 font-bold text-right text-emerald-700">जमा (-)</th>
                      <th className="p-2.5 font-bold text-right text-red-600">उधारी (+)</th>
                      <th className="p-2.5 font-bold text-right">खाता शेष</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-400">
                          कोई लेनदेन दर्ज नहीं है।
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((entry, idx) => {
                        const isDebit = entry.type === 'sale_debit';
                        return (
                          <tr key={entry.id} className="hover:bg-gray-50/50">
                            <td className="p-2.5 text-gray-400">{idx + 1}</td>
                            <td className="p-2.5 text-gray-800 font-semibold">{entry.date}</td>
                            <td className="p-2.5 font-bold text-gray-900">
                              {isDebit ? 'सामान बिक्री' : `उधारी भुगतान (${entry.paymentMode || 'Cash'})`}
                              <span className="block text-[10px] text-gray-400 font-normal">{entry.note}</span>
                            </td>
                            <td className="p-2.5 text-gray-600 font-mono text-[11px]">
                              {entry.invoiceNo ? `#${entry.invoiceNo}` : '-'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">
                              {!isDebit ? `₹${entry.amount.toLocaleString()}` : '-'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-red-600">
                              {isDebit ? `₹${entry.amount.toLocaleString()}` : '-'}
                            </td>
                            <td className="p-2.5 text-right font-extrabold text-gray-900">
                              ₹{entry.balanceAfter.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Authorized Signatory Stamp Box */}
              <div className="flex justify-between items-end pt-8 text-xs text-gray-500">
                <div>
                  <p>नोट: यह एक अधिकृत कंप्यूटरीकृत खाता विवरणी है।</p>
                  <p className="text-[10px] text-gray-400">फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर)</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-gray-400 mb-1"></div>
                  <p className="font-bold text-gray-800">अधिकृत हस्ताक्षर / मुहर</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingCustomerLedger;
