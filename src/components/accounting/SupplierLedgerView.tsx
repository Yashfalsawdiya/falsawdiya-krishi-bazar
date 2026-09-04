import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Search, Plus, Phone, MapPin, IndianRupee, 
  Calendar, FileText, CheckCircle2, AlertTriangle, ArrowDownLeft, 
  ArrowUpRight, Trash2, Archive, ArchiveRestore, Edit3, X, Eye, 
  Receipt, ShieldCheck, Printer, Filter
} from 'lucide-react';
import { 
  AccountingSupplier, 
  AccountingPurchase, 
  SupplierLedgerEntry 
} from '../../types/accounting';
import { 
  saveAccountingSupplier, 
  archiveAccountingSupplier, 
  unarchiveAccountingSupplier, 
  deleteAccountingSupplier, 
  checkSupplierHasHistory, 
  fetchSupplierLedger 
} from '../../services/accountingService';

interface SupplierLedgerViewProps {
  suppliers: AccountingSupplier[];
  purchases: AccountingPurchase[];
  onRefreshData: () => Promise<void>;
  onOpenAddSupplier: () => void;
  onOpenRecordPayment: (supplierId: string, purchaseId?: string) => void;
  onOpenAddPurchaseForSupplier: (supplierId: string) => void;
  onViewPurchaseDetails: (purchase: AccountingPurchase) => void;
}

export const SupplierLedgerView: React.FC<SupplierLedgerViewProps> = ({
  suppliers,
  purchases,
  onRefreshData,
  onOpenAddSupplier,
  onOpenRecordPayment,
  onOpenAddPurchaseForSupplier,
  onViewPurchaseDetails,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [ledgerEntries, setLedgerEntries] = useState<SupplierLedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'active' | 'outstanding' | 'archived' | 'all'>('active');

  // Edit Supplier Modal
  const [editingSupplier, setEditingSupplier] = useState<AccountingSupplier | null>(null);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editCity, setEditCity] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Archive / Delete Confirmation Modal
  const [confirmSupplier, setConfirmSupplier] = useState<AccountingSupplier | null>(null);
  const [supplierHistoryInfo, setSupplierHistoryInfo] = useState<{
    hasHistory: boolean;
    purchaseCount: number;
    totalPurchased: number;
    totalPaid: number;
    currentOutstanding: number;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Active ledger sub-tab for selected supplier
  const [ledgerSubTab, setLedgerSubTab] = useState<'pending_invoices' | 'payment_history' | 'all_transactions'>('pending_invoices');

  // Default selection
  useEffect(() => {
    if (!selectedSupplierId && suppliers.length > 0) {
      const firstActive = suppliers.find(s => !s.isArchived) || suppliers[0];
      setSelectedSupplierId(firstActive.id);
    }
  }, [suppliers, selectedSupplierId]);

  // Load ledger entries when selected supplier changes
  useEffect(() => {
    if (selectedSupplierId) {
      setLoadingLedger(true);
      fetchSupplierLedger(selectedSupplierId)
        .then(entries => setLedgerEntries(entries))
        .catch(err => console.error('Error loading ledger:', err))
        .finally(() => setLoadingLedger(false));
    } else {
      setLedgerEntries([]);
    }
  }, [selectedSupplierId]);

  // Selected supplier object
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Purchases for selected supplier
  const selectedSupplierPurchases = useMemo(() => {
    if (!selectedSupplierId) return [];
    return purchases.filter(p => p.supplierId === selectedSupplierId);
  }, [purchases, selectedSupplierId]);

  // Pending (unpaid / partially paid) invoices for selected supplier
  const pendingInvoices = useMemo(() => {
    return selectedSupplierPurchases.filter(p => (p.unpaidSupplierUdhari || 0) > 0);
  }, [selectedSupplierPurchases]);

  // Filtered suppliers list
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        s.name.toLowerCase().includes(q) ||
        (s.companyName && s.companyName.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      if (filterType === 'active') return !s.isArchived;
      if (filterType === 'archived') return !!s.isArchived;
      if (filterType === 'outstanding') return !s.isArchived && (s.currentOutstanding || 0) > 0;
      return true; // 'all'
    });
  }, [suppliers, searchQuery, filterType]);

  // Aggregate metrics across all suppliers
  const metrics = useMemo(() => {
    const activeSuppliers = suppliers.filter(s => !s.isArchived);
    const totalPurchased = activeSuppliers.reduce((acc, s) => acc + (s.totalPurchased || 0), 0);
    const totalPaid = activeSuppliers.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
    const totalOutstanding = activeSuppliers.reduce((acc, s) => acc + (s.currentOutstanding || 0), 0);
    const withOutstandingCount = activeSuppliers.filter(s => (s.currentOutstanding || 0) > 0).length;
    const archivedCount = suppliers.filter(s => !!s.isArchived).length;
    return { totalPurchased, totalPaid, totalOutstanding, withOutstandingCount, archivedCount };
  }, [suppliers]);

  // Open Edit Modal
  const handleOpenEdit = (supp: AccountingSupplier) => {
    setEditingSupplier(supp);
    setEditName(supp.name || '');
    setEditCompany(supp.companyName || '');
    setEditPhone(supp.phone || '');
    setEditGstin(supp.gstin || '');
    setEditCity(supp.city || '');
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editName.trim()) return;

    setIsSavingEdit(true);
    try {
      await saveAccountingSupplier({
        name: editName.trim(),
        companyName: editCompany.trim(),
        phone: editPhone.trim(),
        gstin: editGstin.trim(),
        city: editCity.trim(),
        totalPurchased: editingSupplier.totalPurchased || 0,
        totalPaid: editingSupplier.totalPaid || 0,
        currentOutstanding: editingSupplier.currentOutstanding || 0,
        isArchived: editingSupplier.isArchived,
        status: editingSupplier.status,
      }, editingSupplier.id);

      await onRefreshData();
      setEditingSupplier(null);
    } catch (err: any) {
      alert('सप्लायर अपडेट करने में त्रुटि: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Delete / Archive Confirmation
  const handleOpenConfirmAction = async (supp: AccountingSupplier) => {
    setConfirmSupplier(supp);
    const info = await checkSupplierHasHistory(supp.id);
    setSupplierHistoryInfo(info);
  };

  // Archive Supplier
  const handleArchive = async () => {
    if (!confirmSupplier) return;
    setIsProcessingAction(true);
    try {
      await archiveAccountingSupplier(confirmSupplier.id);
      await onRefreshData();
      setConfirmSupplier(null);
      setSupplierHistoryInfo(null);
    } catch (err: any) {
      alert('आर्काइव करने में त्रुटि: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Unarchive Supplier
  const handleUnarchive = async (supplierId: string) => {
    try {
      await unarchiveAccountingSupplier(supplierId);
      await onRefreshData();
    } catch (err: any) {
      alert('सक्रिय करने में त्रुटि: ' + err.message);
    }
  };

  // Delete Permanently
  const handleDeletePermanently = async () => {
    if (!confirmSupplier) return;
    setIsProcessingAction(true);
    try {
      await deleteAccountingSupplier(confirmSupplier.id);
      await onRefreshData();
      if (selectedSupplierId === confirmSupplier.id) {
        setSelectedSupplierId('');
      }
      setConfirmSupplier(null);
      setSupplierHistoryInfo(null);
    } catch (err: any) {
      alert('सप्लायर हटाने में त्रुटि: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">सक्रिय सप्लायर</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">
            {suppliers.filter(s => !s.isArchived).length}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {metrics.withOutstandingCount} पर बकाया बाकी
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">कुल थोक खरीद</span>
            <Receipt className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">
            ₹{metrics.totalPurchased.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            सप्लायर आवक माल
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">कुल चुकाया गया</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">
            ₹{metrics.totalPaid.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            बिजनेस कैश आउटफ्लो
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-rose-100 bg-rose-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-800 font-bold">कुल उधारी बकाया</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-extrabold text-rose-700 mt-1">
            ₹{metrics.totalOutstanding.toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">
            सप्लायर को देना बाकी
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Supplier List, Right Selected Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Suppliers List (4 cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3.5 flex flex-col h-[740px]">
          {/* Action and Search */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              सप्लायर सूची ({filteredSuppliers.length})
            </h3>
            <button
              onClick={onOpenAddSupplier}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> नया सप्लायर
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="सप्लायर, फर्म, फोन या शहर खोजें..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-[11px]">
            {[
              { id: 'active', label: 'सक्रिय' },
              { id: 'outstanding', label: 'उधारी बाकी' },
              { id: 'archived', label: `आर्काइव्ड (${metrics.archivedCount})` },
              { id: 'all', label: 'सभी' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                  filterType === f.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Supplier Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredSuppliers.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                कोई सप्लायर नहीं मिला।
              </div>
            ) : (
              filteredSuppliers.map(supp => {
                const isSelected = supp.id === selectedSupplierId;
                const isArchived = !!supp.isArchived;
                const outstanding = supp.currentOutstanding || 0;

                return (
                  <div
                    key={supp.id}
                    onClick={() => setSelectedSupplierId(supp.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 shadow-sm'
                        : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100/60'
                    } ${isArchived ? 'opacity-70 border-dashed' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 text-xs truncate">
                            {supp.name}
                          </span>
                          {isArchived && (
                            <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-bold">
                              आर्काइव्ड
                            </span>
                          )}
                        </div>
                        {supp.companyName && (
                          <div className="text-[11px] text-gray-500 font-medium truncate">
                            {supp.companyName}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                          {supp.phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-3 h-3" /> {supp.phone}
                            </span>
                          )}
                          {supp.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> {supp.city}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                          outstanding > 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {outstanding > 0 ? `बाकी: ₹${outstanding.toLocaleString()}` : 'पूर्ण चुकता'}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1">
                          कुल खरीद: ₹{(supp.totalPurchased || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-gray-100 text-[11px]">
                      {outstanding > 0 && !isArchived && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRecordPayment(supp.id);
                          }}
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold flex items-center gap-1 transition-colors"
                        >
                          <IndianRupee className="w-3 h-3" /> भुगतान दर्ज करें
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(supp);
                        }}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                        title="संपादित करें"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {isArchived ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnarchive(supp.id);
                          }}
                          className="p-1 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 transition-colors"
                          title="पुनः सक्रिय करें"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenConfirmAction(supp);
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="आर्काइव या हटाएं"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Supplier Ledger (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[740px]">
          {selectedSupplier ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-gray-900">
                      {selectedSupplier.name}
                    </h2>
                    {selectedSupplier.isArchived ? (
                      <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                        आर्काइव्ड (Inactive)
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        सक्रिय (Active)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {selectedSupplier.companyName && `${selectedSupplier.companyName} · `}
                    {selectedSupplier.city && `${selectedSupplier.city} · `}
                    {selectedSupplier.phone && `मो: ${selectedSupplier.phone}`}
                    {selectedSupplier.gstin && ` · GST: ${selectedSupplier.gstin}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenRecordPayment(selectedSupplier.id)}
                    className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <IndianRupee className="w-3.5 h-3.5" /> Supplier Payment दर्ज करें
                  </button>
                  <button
                    onClick={() => onOpenAddPurchaseForSupplier(selectedSupplier.id)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> + खरीद इनवॉइस
                  </button>
                </div>
              </div>

              {/* Stat Cards for Selected Supplier */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                  <span className="text-[11px] text-gray-500 font-medium block">कुल खरीद</span>
                  <span className="text-base font-extrabold text-gray-900 mt-0.5 block">
                    ₹{(selectedSupplier.totalPurchased || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                  <span className="text-[11px] text-emerald-700 font-medium block">कुल चुकाया गया</span>
                  <span className="text-base font-extrabold text-emerald-800 mt-0.5 block">
                    ₹{(selectedSupplier.totalPaid || 0).toLocaleString()}
                  </span>
                </div>

                <div className={`p-3 rounded-2xl border ${
                  (selectedSupplier.currentOutstanding || 0) > 0
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-[11px] text-rose-700 font-bold block">कुल बकाया बाकी</span>
                  <span className="text-base font-extrabold text-rose-800 mt-0.5 block">
                    ₹{(selectedSupplier.currentOutstanding || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                  <span className="text-[11px] text-gray-500 font-medium block">अंतिम भुगतान तारीख</span>
                  <span className="text-xs font-bold text-gray-800 mt-1 block">
                    {selectedSupplier.lastPaymentDate || 'कोई नहीं'}
                  </span>
                </div>
              </div>

              {/* Sub Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                {[
                  { id: 'pending_invoices', label: `बकाया इनवॉइस (${pendingInvoices.length})` },
                  { id: 'payment_history', label: 'भुगतान इतिहास (Payments)' },
                  { id: 'all_transactions', label: 'खाता पासबुक (Ledger Passbook)' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setLedgerSubTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      ledgerSubTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sub-tab Content Area */}
              <div className="flex-1 overflow-y-auto pr-1">
                {/* 1. Pending Invoices */}
                {ledgerSubTab === 'pending_invoices' && (
                  <div className="space-y-2.5">
                    {pendingInvoices.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        इस सप्लायर का कोई बकाया इनवॉइस नहीं है। सभी बिल पूर्ण चुकता हैं!
                      </div>
                    ) : (
                      pendingInvoices.map(p => (
                        <div
                          key={p.id}
                          className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-gray-900 text-xs">
                                बिल #{p.invoiceNumber}
                              </span>
                              <span className="text-[11px] text-gray-500 ml-2">
                                {p.invoiceDate}
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              बाकी: ₹{p.unpaidSupplierUdhari.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>
                              उत्पाद: {p.items?.length || 0} आइटम्स (कुल बिल: ₹{p.grandTotal.toLocaleString()})
                            </span>
                            <span>
                              दिया गया: ₹{p.paidAmount.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 text-xs">
                            <button
                              onClick={() => onViewPurchaseDetails(p)}
                              className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> बिल विवरण
                            </button>
                            <button
                              onClick={() => onOpenRecordPayment(selectedSupplier.id, p.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                            >
                              <IndianRupee className="w-3.5 h-3.5" /> भुगतान करें
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 2. Payment History */}
                {ledgerSubTab === 'payment_history' && (
                  <div className="space-y-2">
                    {ledgerEntries.filter(e => e.type === 'payment_debit').length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-xs">
                        अभी तक इस सप्लायर को कोई भुगतान दर्ज नहीं हुआ है।
                      </div>
                    ) : (
                      ledgerEntries
                        .filter(e => e.type === 'payment_debit')
                        .map(entry => (
                          <div
                            key={entry.id}
                            className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-emerald-900">
                                  ₹{entry.amount.toLocaleString()} चुकाया गया
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                  {entry.paymentMode === 'online' ? 'ऑनलाइन' : entry.paymentMode === 'cash' ? 'नकद' : 'चेक'}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500">
                                तारीख: {entry.date} {entry.invoiceNo ? `· बिल #${entry.invoiceNo}` : ''}
                              </div>
                              {entry.note && (
                                <div className="text-[11px] text-gray-600 italic">
                                  टिप्पणी: {entry.note}
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <span className="text-[11px] text-gray-400 block">भुगतान बाद शेष:</span>
                              <span className="font-bold text-gray-800">
                                ₹{entry.balanceAfter.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {/* 3. All Transactions (Passbook) */}
                {ledgerSubTab === 'all_transactions' && (
                  <div className="space-y-2">
                    {loadingLedger ? (
                      <div className="py-12 text-center text-gray-400 text-xs">लेजर लोड हो रहा है...</div>
                    ) : ledgerEntries.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-xs">
                        कोई लेजर लेनदेन रिकॉर्ड नहीं मिला।
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                              <th className="py-2.5 px-2">तारीख</th>
                              <th className="py-2.5 px-2">विवरण / बिल नं.</th>
                              <th className="py-2.5 px-2 text-right">खरीद (+)</th>
                              <th className="py-2.5 px-2 text-right">भुगतान (-)</th>
                              <th className="py-2.5 px-2 text-right">शेष बाकी</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ledgerEntries.map(entry => {
                              const isCredit = entry.type === 'purchase_credit';
                              return (
                                <tr key={entry.id} className="hover:bg-gray-50/80">
                                  <td className="py-2.5 px-2 text-gray-600 font-medium">
                                    {entry.date}
                                  </td>
                                  <td className="py-2.5 px-2">
                                    <div className="font-bold text-gray-900">
                                      {entry.invoiceNo ? `बिल #${entry.invoiceNo}` : 'सप्लायर भुगतान'}
                                    </div>
                                    <div className="text-[10px] text-gray-400">
                                      {entry.note || (isCredit ? 'माल आवक खरीद' : 'भुगतान अदायगी')}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-right font-bold text-gray-900">
                                    {isCredit ? `₹${entry.amount.toLocaleString()}` : '-'}
                                  </td>
                                  <td className="py-2.5 px-2 text-right font-bold text-emerald-700">
                                    {!isCredit ? `₹${entry.amount.toLocaleString()}` : '-'}
                                  </td>
                                  <td className="py-2.5 px-2 text-right font-extrabold text-gray-900">
                                    ₹{entry.balanceAfter.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 text-gray-400 text-xs">
              बाईं ओर से सप्लायर चुनें या नया सप्लायर जोड़ें।
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDIT SUPPLIER */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                सप्लायर विवरण संपादित करें
              </h3>
              <button
                onClick={() => setEditingSupplier(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">सप्लायर का नाम *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">फर्म / कंपनी नाम</label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={e => setEditCompany(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">मोबाइल नंबर</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">GSTIN नंबर</label>
                  <input
                    type="text"
                    value={editGstin}
                    onChange={e => setEditGstin(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">शहर / मंडी</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={e => setEditCity(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  {isSavingEdit ? 'सहेजा जा रहा है...' : 'परिवर्तन सुरक्षित करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ARCHIVE / DELETE CONFIRMATION */}
      {confirmSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                सप्लायर हटाएं / आर्काइव करें
              </h3>
              <button
                onClick={() => setConfirmSupplier(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                <p className="font-bold text-gray-900 text-sm">{confirmSupplier.name}</p>
                {confirmSupplier.companyName && (
                  <p className="text-gray-600">{confirmSupplier.companyName}</p>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200 text-[11px]">
                  <span>कुल खरीद बिल: <strong>{supplierHistoryInfo?.purchaseCount || 0}</strong></span>
                  <span>बकाया बाकी: <strong>₹{(confirmSupplier.currentOutstanding || 0).toLocaleString()}</strong></span>
                </div>
              </div>

              {supplierHistoryInfo?.hasHistory ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    इतिहास सुरक्षा (Ledger & Invoices Safe)
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    इस सप्लायर के पास पुराना खरीद या भुगतान रिकॉर्ड है। पुराने इनवॉइस और खाता लेजर सुरक्षित रखने के लिए इसे <strong>आर्काइव (Inactive)</strong> किया जाएगा। यह नए बिल बनाते समय सूची में नहीं दिखेगा, परंतु पुराना इतिहास पूरी तरह सुरक्षित रहेगा।
                  </p>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={handleArchive}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all mt-2"
                  >
                    {isProcessingAction ? 'प्रक्रिया जारी है...' : 'सप्लायर आर्काइव करें (Archive)'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-600">
                    इस सप्लायर का कोई खरीद या भुगतान इतिहास नहीं है। आप इसे स्थायी रूप से हटा सकते हैं या आर्काइव कर सकते हैं।
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isProcessingAction}
                      onClick={handleDeletePermanently}
                      className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                    >
                      {isProcessingAction ? 'हटाया जा रहा है...' : 'स्थायी रूप से हटाएं'}
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingAction}
                      onClick={handleArchive}
                      className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-all"
                    >
                      आर्काइव करें
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
