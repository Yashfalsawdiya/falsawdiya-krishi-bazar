import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, IndianRupee, Sparkles, AlertTriangle, 
  Calendar, ShoppingBag, Truck, Receipt, Users, Package, 
  ArrowUpRight, ArrowDownLeft, ShieldCheck, RefreshCw, Layers, CheckCircle2,
  Wallet, Bot, Zap, Activity, Check
} from 'lucide-react';
import { 
  AccountingSummaryReport, 
  AIBusinessInsight 
} from '../../types/accounting';
import { 
  fetchAccountingReport, 
  getAIFinancialInsights 
} from '../../services/accountingService';
import { AccountingPOSBilling } from './AccountingPOSBilling';
import { AccountingSmartScanner } from './AccountingSmartScanner';
import { AccountingCustomerLedger } from './AccountingCustomerLedger';
import { AccountingInventory } from './AccountingInventory';
import { AccountingPurchases } from './AccountingPurchases';
import { AccountingExpenses } from './AccountingExpenses';

export const AccountingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'pos' | 'scanner' | 'ledger' | 'inventory' | 'purchases' | 'expenses'
  >('overview');

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [report, setReport] = useState<AccountingSummaryReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);

  // AI Insights State
  const [aiInsight, setAiInsight] = useState<AIBusinessInsight | null>(null);
  const [loadingAiInsight, setLoadingAiInsight] = useState(false);

  const loadReport = async () => {
    setLoadingReport(true);
    try {
      const now = new Date();
      let startStr = now.toISOString().split('T')[0];
      const endStr = startStr;

      if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startStr = weekAgo.toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        startStr = monthAgo.toISOString().split('T')[0];
      }

      const rep = await fetchAccountingReport(startStr, endStr);
      setReport(rep);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadReport();
    }
  }, [dateRange, activeTab]);

  const handleGenerateAiInsight = async () => {
    if (!report) return;
    setLoadingAiInsight(true);
    try {
      const insight = await getAIFinancialInsights(report);
      setAiInsight(insight);
    } catch (err: any) {
      alert('AI विश्लेषण लोड करने में समस्या: ' + err.message);
    } finally {
      setLoadingAiInsight(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Accounting Header Nav Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'वित्तीय डैशबोर्ड (Overview)', icon: TrendingUp },
          { id: 'pos', label: 'पीओएस बिक्री (POS Bill)', icon: ShoppingBag },
          { id: 'scanner', label: 'AI स्मार्ट स्कैनर (Vision)', icon: Sparkles },
          { id: 'ledger', label: 'किसान उधारी खाता (Khata)', icon: Users },
          { id: 'inventory', label: 'स्टॉक व इन्वेंट्री', icon: Package },
          { id: 'purchases', label: 'थोक खरीद (Purchases)', icon: Truck },
          { id: 'expenses', label: 'दुकान खर्च (Expenses)', icon: Receipt },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#2D5A27] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'pos' && (
        <AccountingPOSBilling onSaleComplete={() => loadReport()} />
      )}

      {activeTab === 'scanner' && (
        <AccountingSmartScanner onEntrySaved={() => loadReport()} />
      )}

      {activeTab === 'ledger' && (
        <AccountingCustomerLedger onPaymentRecorded={() => loadReport()} />
      )}

      {activeTab === 'inventory' && (
        <AccountingInventory />
      )}

      {activeTab === 'purchases' && (
        <AccountingPurchases />
      )}

      {activeTab === 'expenses' && (
        <AccountingExpenses />
      )}

      {/* OVERVIEW / SUMMARY DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Filter Bar & AI Action */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl text-xs font-bold">
              {[
                { id: 'today', label: 'आज (Today)' },
                { id: 'week', label: 'पिछला 7 दिन (Week)' },
                { id: 'month', label: 'इस माह (Month)' },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => setDateRange(d.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                    dateRange === d.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{d.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadReport}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1"
                title="रिफ्रेश करें"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={handleGenerateAiInsight}
                disabled={loadingAiInsight}
                className="px-4 py-2.5 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50"
              >
                <Bot className="w-4 h-4" />
                {loadingAiInsight ? 'AI विश्लेषण हो रहा है...' : 'AI मुनीम जी से सलाह लें (AI Insights)'}
              </button>
            </div>
          </div>

          {/* AI Insights Card (If generated) */}
          {aiInsight && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 rounded-3xl border border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-amber-900 font-extrabold text-sm sm:text-base">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  AI मुनीम जी - व्यापार स्वास्थ्य व लाभ विश्लेषण
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                  aiInsight.businessHealthScore === 'EXCELLENT'
                    ? 'bg-emerald-100 text-emerald-800'
                    : aiInsight.businessHealthScore === 'GOOD'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  स्थिति: {aiInsight.businessHealthScore}
                </span>
              </div>

              <div className="text-xs text-gray-800 space-y-2 leading-relaxed bg-white/80 p-4 rounded-2xl border border-amber-100">
                <p className="font-medium text-gray-900">{aiInsight.hindiSummary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div>
                    <span className="font-bold text-amber-900 flex items-center gap-1 mb-0.5">
                      <Zap className="w-3.5 h-3.5 text-amber-700" />
                      मोलभाव व डिस्काउंट प्रभाव:
                    </span>
                    <p className="text-gray-600">{aiInsight.bargainingImpactAdvice}</p>
                  </div>
                  <div>
                    <span className="font-bold text-blue-900 flex items-center gap-1 mb-0.5">
                      <Activity className="w-3.5 h-3.5 text-blue-700" />
                      उधारी व कैश-फ्लो स्थिति:
                    </span>
                    <p className="text-gray-600">{aiInsight.cashFlowAnalysis}</p>
                  </div>
                </div>
              </div>

              {aiInsight.keyActionItems && aiInsight.keyActionItems.length > 0 && (
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-950 text-xs">कार्रवाई योग्य प्रमुख सुझाव (Action Items):</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {aiInsight.keyActionItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-amber-200 text-[11px] text-gray-700 flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Primary Financial Metric Cards (4 Cards Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Sales */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">कुल ऑफलाइन बिक्री (Sales)</span>
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900">
                  ₹{report?.totalSalesAmount?.toLocaleString() || 0}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  कुल {report?.totalSalesCount || 0} बिक्री बिल काटे गए
                </p>
              </div>
            </div>

            {/* 2. Gross Profit */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">सकल मुनाफा (Gross Profit)</span>
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-blue-900">
                  ₹{report?.grossProfit?.toLocaleString() || 0}
                </h3>
                <p className="text-[11px] text-blue-600 font-bold mt-0.5">
                  मार्जिन: {report?.grossMarginPercent || 0}%
                </p>
              </div>
            </div>

            {/* 3. Expenses */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">दुकान खर्च (Expenses)</span>
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-rose-600">
                  ₹{report?.totalExpenses?.toLocaleString() || 0}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  दैनिक परिचालन व अन्य खर्च
                </p>
              </div>
            </div>

            {/* 4. NET PURE PROFIT */}
            <div className="bg-[#2D5A27] text-white p-5 rounded-2xl shadow-sm border border-[#23461e] flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-100">शुद्ध मुनाफा (Net Profit)</span>
                <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-white">
                  ₹{report?.netProfit?.toLocaleString() || 0}
                </h3>
                <p className="text-[11px] text-emerald-200 font-bold mt-0.5">
                  शुद्ध मार्जिन: {report?.netMarginPercent || 0}% (खर्च काटने के बाद)
                </p>
              </div>
            </div>
          </div>

          {/* Secondary Rows: Cash Flow, Galla & Udhari */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Galla & Cash Received */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  दैनिक गल्ला व नकद प्रवाह (Cash Flow)
                </span>
                <span className="text-[10px] text-gray-400">दुकान काउंटर</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">नकद बिक्री से आया:</span>
                  <strong className="text-gray-900 font-bold">+₹{report?.cashReceived?.toLocaleString() || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ऑनलाइन UPI से आया:</span>
                  <strong className="text-gray-900 font-bold">+₹{report?.onlineReceived?.toLocaleString() || 0}</strong>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">उधारी वसूली से आया:</span>
                  <div className="text-right">
                    <strong className="text-emerald-700 font-bold">+₹{report?.customerPaymentCollected?.toLocaleString() || 0}</strong>
                    {Boolean(report?.customerOnlinePaymentCollected && report.customerOnlinePaymentCollected > 0) && (
                      <span className="block text-[10px] text-gray-400 font-normal">
                        (नकद: ₹{(report?.customerCashPaymentCollected ?? 0).toLocaleString()} | UPI: ₹{(report?.customerOnlinePaymentCollected ?? 0).toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>गल्ले से खर्च निकला:</span>
                  <strong className="font-bold">-₹{report?.cashExpenses?.toLocaleString() || 0}</strong>
                </div>
                <div className="flex justify-between pt-2 border-t font-extrabold text-sm text-gray-900">
                  <span>शुद्ध नकद गल्ला शेष:</span>
                  <span className="text-emerald-800">
                    ₹{((report?.cashReceived || 0) + ((report?.customerCashPaymentCollected ?? report?.customerPaymentCollected) || 0) - (report?.cashExpenses || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Market Credit / Udhari Status */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  बाजार उधारी खाता स्थिति (Credit Ledger)
                </span>
                <button
                  onClick={() => setActiveTab('ledger')}
                  className="text-[10px] text-emerald-700 hover:underline font-bold"
                >
                  खाता बही खोलें →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">इस अवधि में दी गई नई उधारी:</span>
                  <strong className="text-amber-700 font-bold">₹{report?.newUdhariGiven?.toLocaleString() || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">इस अवधि में वसूल हुई उधारी:</span>
                  <strong className="text-emerald-700 font-bold">+₹{report?.customerPaymentCollected?.toLocaleString() || 0}</strong>
                </div>
                <div className="flex justify-between pt-2 border-t font-extrabold text-sm text-gray-900">
                  <span>कुल कुल बकाया उधारी (All Time):</span>
                  <span className="text-red-600">₹{report?.totalCustomerOutstanding?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            {/* Wholesaler / Stock Position */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  इन्वेंट्री व थोक सप्लायर स्थिति
                </span>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className="text-[10px] text-blue-700 hover:underline font-bold"
                >
                  स्टॉक देखें →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">गोदाम में वर्तमान स्टॉक लागत:</span>
                  <strong className="text-purple-900 font-bold">₹{report?.totalInventoryValuation?.toLocaleString() || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">कम स्टॉक वाले उत्पाद (Alerts):</span>
                  <strong className="text-red-600 font-bold">{report?.lowStockCount || 0} उत्पाद</strong>
                </div>
                <div className="flex justify-between pt-2 border-t font-extrabold text-sm text-gray-900">
                  <span>सप्लायर की बाकी उधारी:</span>
                  <span className="text-amber-800">₹{report?.totalSupplierOutstanding?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveTab('pos')}
              className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-3xl text-left transition-all group"
            >
              <ShoppingBag className="w-5 h-5 text-emerald-700 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-gray-900 text-xs">नया बिल बनाएं</div>
              <p className="text-[10px] text-gray-500">काउंटर बिक्री एवं पर्ची</p>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-3xl text-left transition-all group"
            >
              <Sparkles className="w-5 h-5 text-amber-700 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-gray-900 text-xs">AI बिल स्कैन करें</div>
              <p className="text-[10px] text-gray-500">फोटो खींचें और सेव करें</p>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-3xl text-left transition-all group"
            >
              <Users className="w-5 h-5 text-blue-700 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-gray-900 text-xs">उधारी जमा करें</div>
              <p className="text-[10px] text-gray-500">किसान खाता पासबुक</p>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className="p-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-3xl text-left transition-all group"
            >
              <Receipt className="w-5 h-5 text-rose-700 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-gray-900 text-xs">दुकान खर्च जोड़ें</div>
              <p className="text-[10px] text-gray-500">चाय, पेट्रोल, भाड़ा...</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingDashboard;
