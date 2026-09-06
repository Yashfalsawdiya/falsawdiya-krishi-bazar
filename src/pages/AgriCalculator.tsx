import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Scale, 
  Coins, 
  IndianRupee, 
  History, 
  Trash2, 
  ArrowRightLeft, 
  ArrowLeft, 
  Info, 
  Sprout, 
  RefreshCw, 
  CheckCircle2,
  Delete,
  CornerDownLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HistoryItem {
  equation: string;
  result: string;
}

const AgriCalculator: React.FC = () => {
  const navigate = useNavigate();
  
  // Navigation Tabs: normal, weight, amount
  const [activeTab, setActiveTab] = useState<'normal' | 'weight' | 'amount'>('normal');

  // ==========================================
  // 1️⃣ Normal Calculator State & Logic
  // ==========================================
  const [normalPrevEquation, setNormalPrevEquation] = useState('');
  const [normalDisplay, setNormalDisplay] = useState('0');
  const [normalIsFinished, setNormalIsFinished] = useState(false);
  const [normalHistory, setNormalHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('calc_normal_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Save normal calculator history to local storage
  useEffect(() => {
    localStorage.setItem('calc_normal_history', JSON.stringify(normalHistory));
  }, [normalHistory]);

  const formatResult = (num: number): string => {
    if (Math.round(num) === num) return num.toString();
    const str = num.toString();
    if (str.includes('.')) {
      const decimalPart = str.split('.')[1];
      if (decimalPart.length > 4) {
        return parseFloat(num.toFixed(4)).toString();
      }
    }
    return str;
  };

  const handleNormalButtonClick = (value: string) => {
    if (value === 'AC') {
      setNormalDisplay('0');
      setNormalPrevEquation('');
      setNormalIsFinished(false);
    } else if (value === '⌫' || value === 'Backspace') {
      if (normalIsFinished) {
        setNormalDisplay('0');
        setNormalPrevEquation('');
        setNormalIsFinished(false);
      } else {
        if (normalDisplay.length > 1) {
          setNormalDisplay(normalDisplay.slice(0, -1));
        } else {
          setNormalDisplay('0');
        }
      }
    } else if (value === '%') {
      try {
        const parsed = parseFloat(normalDisplay);
        if (!isNaN(parsed)) {
          const res = formatResult(parsed / 100);
          setNormalDisplay(res);
        }
      } catch (e) {}
    } else if (['+', '−', '×', '÷'].includes(value)) {
      if (normalIsFinished) {
        setNormalPrevEquation(normalDisplay + ' ' + value + ' ');
        setNormalDisplay('0');
        setNormalIsFinished(false);
      } else {
        // Allow updating operator if display is currently empty/0
        const trimmedPrev = normalPrevEquation.trim();
        const lastChar = trimmedPrev.slice(-1);
        if (normalDisplay === '0' && ['+', '−', '×', '÷'].includes(lastChar)) {
          setNormalPrevEquation(trimmedPrev.slice(0, -1) + value + ' ');
        } else {
          setNormalPrevEquation(normalPrevEquation + (normalDisplay === '0' ? '0' : normalDisplay) + ' ' + value + ' ');
          setNormalDisplay('0');
        }
      }
    } else if (value === '=') {
      let finalExpr = normalPrevEquation + normalDisplay;
      if (!finalExpr || finalExpr.trim() === '' || normalIsFinished) return;
      
      const sanitized = finalExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');
      
      try {
        const clean = sanitized.replace(/[^0-9+\-*/.() ]/g, '');
        const calcResult = new Function(`return (${clean})`)();
        if (typeof calcResult === 'number' && !isNaN(calcResult) && isFinite(calcResult)) {
          const formatted = formatResult(calcResult);
          setNormalDisplay(formatted);
          setNormalPrevEquation(finalExpr + ' =');
          setNormalIsFinished(true);
          
          setNormalHistory(prev => [
            { equation: finalExpr, result: formatted },
            ...prev.slice(0, 19)
          ]);
        } else {
          setNormalDisplay('Error');
        }
      } catch (err) {
        setNormalDisplay('Error');
      }
    } else if (value === '.') {
      if (normalIsFinished) {
        setNormalDisplay('0.');
        setNormalPrevEquation('');
        setNormalIsFinished(false);
      } else if (!normalDisplay.includes('.')) {
        setNormalDisplay(normalDisplay + '.');
      }
    } else {
      // Numbers
      if (normalDisplay === '0' || normalIsFinished) {
        setNormalDisplay(value);
        if (normalIsFinished) {
          setNormalPrevEquation('');
          setNormalIsFinished(false);
        }
      } else {
        setNormalDisplay(normalDisplay + value);
      }
    }
  };

  // Keyboard support for Normal Calculator
  useEffect(() => {
    if (activeTab !== 'normal') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= '0' && key <= '9') {
        handleNormalButtonClick(key);
      } else if (key === '.') {
        handleNormalButtonClick('.');
      } else if (key === '+') {
        handleNormalButtonClick('+');
      } else if (key === '-') {
        handleNormalButtonClick('−');
      } else if (key === '*' || key.toLowerCase() === 'x') {
        handleNormalButtonClick('×');
      } else if (key === '/') {
        handleNormalButtonClick('÷');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleNormalButtonClick('=');
      } else if (key === 'Backspace') {
        handleNormalButtonClick('⌫');
      } else if (key === 'Escape') {
        handleNormalButtonClick('AC');
      } else if (key === '%') {
        handleNormalButtonClick('%');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [normalDisplay, normalPrevEquation, normalIsFinished, activeTab]);

  const clearNormalHistory = () => {
    setNormalHistory([]);
    localStorage.removeItem('calc_normal_history');
  };

  const loadFromHistory = (item: HistoryItem) => {
    setNormalDisplay(item.result);
    setNormalPrevEquation(item.equation + ' =');
    setNormalIsFinished(true);
    setIsHistoryOpen(false);
  };

  // Normal Keys Array
  const normalKeys = [
    { label: 'AC', className: 'bg-red-50 hover:bg-red-100/80 text-red-600 font-bold border border-red-100 rounded-2xl p-4 text-lg active:scale-95 transition-all' },
    { label: '⌫', className: 'bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-2xl p-4 text-lg active:scale-95 transition-all' },
    { label: '%', className: 'bg-gray-50 hover:bg-gray-100 text-[#2D5A27] font-semibold rounded-2xl p-4 text-lg active:scale-95 transition-all' },
    { label: '÷', className: 'bg-[#2D5A27]/5 hover:bg-[#2D5A27]/10 text-[#2D5A27] font-black rounded-2xl p-4 text-xl active:scale-95 transition-all' },
    
    { label: '7', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '8', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '9', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '×', className: 'bg-[#2D5A27]/5 hover:bg-[#2D5A27]/10 text-[#2D5A27] font-black rounded-2xl p-4 text-xl active:scale-95 transition-all' },
    
    { label: '4', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '5', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '6', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '−', className: 'bg-[#2D5A27]/5 hover:bg-[#2D5A27]/10 text-[#2D5A27] font-black rounded-2xl p-4 text-xl active:scale-95 transition-all' },
    
    { label: '1', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '2', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '3', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '+', className: 'bg-[#2D5A27]/5 hover:bg-[#2D5A27]/10 text-[#2D5A27] font-black rounded-2xl p-4 text-xl active:scale-95 transition-all' },
    
    { label: '0', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '.', className: 'bg-white hover:bg-gray-50/80 text-gray-800 font-semibold border border-gray-100 rounded-2xl p-4 text-xl active:scale-95 transition-all shadow-2xs' },
    { label: '=', className: 'bg-[#2D5A27] hover:bg-[#20401B] text-white font-bold rounded-2xl p-4 text-xl col-span-2 active:scale-95 transition-all shadow-md shadow-[#2D5A27]/20 flex items-center justify-center gap-1' },
  ];

  // ==========================================
  // 2️⃣ Weight Calculator State & Logic (₹ ➜ Weight)
  // ==========================================
  const [weightPricePerKg, setWeightPricePerKg] = useState<string>('');
  const [weightCustomerAmount, setWeightCustomerAmount] = useState<string>('');
  const [weightResult, setWeightResult] = useState<{ grams: number; kgs: number } | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);

  useEffect(() => {
    const price = parseFloat(weightPricePerKg);
    const amount = parseFloat(weightCustomerAmount);

    if (weightPricePerKg !== '' && (isNaN(price) || price <= 0)) {
      setWeightResult(null);
      setWeightError("कीमत 0 से अधिक होनी चाहिए।");
      return;
    }

    if (weightCustomerAmount !== '' && (isNaN(amount) || amount < 0)) {
      setWeightResult(null);
      setWeightError("राशि नकारात्मक नहीं हो सकती।");
      return;
    }

    setWeightError(null);

    if (!weightPricePerKg || !weightCustomerAmount) {
      setWeightResult(null);
      return;
    }

    if (amount === 0) {
      setWeightResult({ grams: 0, kgs: 0 });
      return;
    }

    const kgs = amount / price;
    const grams = kgs * 1000;

    setWeightResult({
      grams: parseFloat(grams.toFixed(2)),
      kgs: parseFloat(kgs.toFixed(4))
    });
  }, [weightPricePerKg, weightCustomerAmount]);

  const clearWeightCalc = () => {
    setWeightPricePerKg('');
    setWeightCustomerAmount('');
    setWeightResult(null);
    setWeightError(null);
  };

  // ==========================================
  // 3️⃣ Amount Calculator State & Logic (Weight ➜ ₹)
  // ==========================================
  const [amountPricePerKg, setAmountPricePerKg] = useState<string>('');
  const [weightKgInput, setWeightKgInput] = useState<string>('');
  const [weightGramInput, setWeightGramInput] = useState<string>('');
  const [amountResult, setAmountResult] = useState<number | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Live calculation of amount based on price & kg quantity
  useEffect(() => {
    const price = parseFloat(amountPricePerKg);
    const kgs = parseFloat(weightKgInput) || 0;

    if (amountPricePerKg !== '' && (isNaN(price) || price <= 0)) {
      setAmountResult(null);
      setAmountError("कीमत 0 से अधिक होनी चाहिए।");
      return;
    }

    if (weightKgInput !== '' && kgs < 0) {
      setAmountResult(null);
      setAmountError("वजन नकारात्मक नहीं हो सकता।");
      return;
    }

    setAmountError(null);

    if (!amountPricePerKg || (!weightKgInput && !weightGramInput)) {
      setAmountResult(null);
      return;
    }

    const total = price * kgs;
    setAmountResult(parseFloat(total.toFixed(2)));
  }, [amountPricePerKg, weightKgInput, weightGramInput]);

  // Handle bidirectional Grams ↔ KG conversion
  const handleKgInput = (val: string) => {
    if (val === '') {
      setWeightKgInput('');
      setWeightGramInput('');
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      setWeightKgInput(val);
      return;
    }
    setWeightKgInput(val);
    setWeightGramInput(parseFloat((num * 1000).toFixed(4)).toString());
  };

  const handleGramInput = (val: string) => {
    if (val === '') {
      setWeightGramInput('');
      setWeightKgInput('');
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      setWeightGramInput(val);
      return;
    }
    setWeightGramInput(val);
    setWeightKgInput(parseFloat((num / 1000).toFixed(6)).toString());
  };

  const clearAmountCalc = () => {
    setAmountPricePerKg('');
    setWeightKgInput('');
    setWeightGramInput('');
    setAmountResult(null);
    setAmountError(null);
  };




  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-1">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <button 
          onClick={() => navigate(-1)} 
          className="lg:hidden p-2.5 bg-white hover:bg-gray-50 border border-gray-100 rounded-full shadow-sm text-gray-700 transition-all active:scale-95"
          title="वापस जाएँ (Back)"
        >
          <ArrowLeft className="w-5.5 h-5.5 text-gray-700" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-800 leading-tight">Calculator</h2>
          <p className="text-xs text-gray-500 font-semibold">कृषि दुकान और रोज़मर्रा के हिसाब-किताब के लिए</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="grid grid-cols-3 bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50 gap-1.5 shadow-2xs">
        <button 
          onClick={() => setActiveTab('normal')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl font-black text-[10px] sm:text-xs transition-all uppercase tracking-wide
            ${activeTab === 'normal' 
              ? 'bg-white text-[#2D5A27] shadow-sm font-extrabold border border-gray-200/40' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'}`}
        >
          <Calculator className="w-4 h-4 shrink-0" />
          <span>साधारण</span>
        </button>
        <button 
          onClick={() => setActiveTab('weight')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl font-black text-[10px] sm:text-xs transition-all uppercase tracking-wide
            ${activeTab === 'weight' 
              ? 'bg-white text-[#2D5A27] shadow-sm font-extrabold border border-gray-200/40' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'}`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span>₹ ➔ वजन</span>
        </button>
        <button 
          onClick={() => setActiveTab('amount')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl font-black text-[10px] sm:text-xs transition-all uppercase tracking-wide
            ${activeTab === 'amount' 
              ? 'bg-white text-[#2D5A27] shadow-sm font-extrabold border border-gray-200/40' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'}`}
        >
          <Coins className="w-4 h-4 shrink-0" />
          <span>वजन ➔ ₹</span>
        </button>
      </div>

      {/* Main Container with AnimatePresence */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* 1️⃣ TAB: NORMAL CALCULATOR */}
          {/* ======================================================== */}
          {activeTab === 'normal' && (
            <motion.div
              key="normal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Display card */}
              <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 relative overflow-hidden">
                <div className="flex justify-end items-center mb-1 text-gray-400 font-mono text-sm tracking-wider h-6 overflow-hidden select-all">
                  <div>{normalPrevEquation}</div>
                </div>
                
                <div className="text-right text-4xl sm:text-5xl font-black font-mono tracking-tight text-gray-800 overflow-x-auto whitespace-nowrap py-2 scrollbar-none select-all">
                  {normalDisplay}
                </div>

                {/* History Trigger & Mode bar */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100/80">
                  <button 
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="flex items-center gap-1.5 text-xs font-black text-[#2D5A27] hover:bg-[#2D5A27]/10 transition-all bg-[#2D5A27]/5 py-1.5 px-3 rounded-xl"
                  >
                    <History className="w-3.5 h-3.5 text-[#2D5A27]" />
                    <span>इतिहास (History)</span>
                  </button>
                </div>
              </div>

              {/* History Panel */}
              {isHistoryOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white border border-gray-100 rounded-3xl p-5 shadow-inner space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-4 h-4 text-[#2D5A27]" />
                      पिछली गणनाएं (Recent Calculations)
                    </h3>
                    {normalHistory.length > 0 && (
                      <button 
                        onClick={clearNormalHistory}
                        className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>सब मिटाएं</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                    {normalHistory.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-4">कोई इतिहास उपलब्ध नहीं है। गणना करने पर यहाँ दिखाई देगा।</p>
                    ) : (
                      normalHistory.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => loadFromHistory(item)}
                          className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent hover:border-gray-100 transition-all group"
                        >
                          <div className="text-left font-mono text-xs text-gray-500 group-hover:text-gray-800 transition-all">
                            {item.equation}
                          </div>
                          <div className="flex items-center gap-2 font-mono font-bold text-sm text-[#2D5A27]">
                            <span>= {item.result}</span>
                            <CornerDownLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#2D5A27] transition-all" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* Keypad Grid */}
              <div className="grid grid-cols-4 gap-3 bg-gray-50/50 p-2 rounded-3xl border border-gray-100">
                {normalKeys.map((key, index) => (
                  <button
                    key={index}
                    onClick={() => handleNormalButtonClick(key.label)}
                    className={`${key.className}`}
                  >
                    {key.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* 2️⃣ TAB: WEIGHT CALCULATOR (₹ ➜ Weight) */}
          {/* ======================================================== */}
          {activeTab === 'weight' && (
            <motion.div
              key="weight"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {/* Form Input fields */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
                    <Scale className="w-4.5 h-4.5 text-[#2D5A27]" />
                    रुपए से वजन गणना (Budget to Weight)
                  </h3>
                  <button 
                    onClick={clearWeightCalc}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    साफ़ करें (Clear)
                  </button>
                </div>

                {weightError && (
                  <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-100">
                    {weightError}
                  </div>
                )}

                {/* Price input */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">
                    प्रति किलो कीमत (Price per KG)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-black text-sm">₹</span>
                    </div>
                    <input 
                      type="number"
                      value={weightPricePerKg}
                      onChange={(e) => setWeightPricePerKg(e.target.value)}
                      placeholder="जैसे 270 (प्रति किलो)"
                      min="0"
                      className="block w-full pl-8 pr-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all placeholder:text-gray-400 placeholder:font-medium"
                    />
                  </div>
                </div>

                {/* Amount input */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">
                    ग्राहक का बजट (Customer Amount)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-black text-sm">₹</span>
                    </div>
                    <input 
                      type="number"
                      value={weightCustomerAmount}
                      onChange={(e) => setWeightCustomerAmount(e.target.value)}
                      placeholder="जैसे 40 (जितने का सामान देना है)"
                      min="0"
                      className="block w-full pl-8 pr-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all placeholder:text-gray-400 placeholder:font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Weight Result Output Block */}
              <div className="bg-[#2D5A27] text-white rounded-3xl p-6 shadow-md relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                
                <h4 className="text-xs font-black uppercase tracking-widest text-white/70 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-300" />
                  ज़रूरी तौल वजन (Calculated Output Weight)
                </h4>

                {weightResult ? (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Grams Output */}
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/5 text-center">
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-wider">ग्राम (Grams)</p>
                        <p className="text-2xl sm:text-3xl font-black mt-1 text-amber-300 font-mono">
                          {weightResult.grams} <span className="text-xs text-white">g</span>
                        </p>
                      </div>

                      {/* KG Output */}
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/5 text-center">
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-wider">किलोग्राम (KGs)</p>
                        <p className="text-2xl sm:text-3xl font-black mt-1 text-white font-mono">
                          {weightResult.kgs} <span className="text-xs text-white/80">kg</span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                      <p className="text-[11px] font-semibold text-center leading-relaxed">
                        दुकानदार भाई, ग्राहक को तराजू पर <span className="text-amber-300 font-black">{weightResult.grams} g</span> तौलकर दें।
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-white/60 italic text-xs font-medium">
                    कृपया प्रति किलो कीमत और बजट राशि दर्ज करें। live वजन यहाँ आ जाएगा।
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* 3️⃣ TAB: AMOUNT CALCULATOR (Weight ➜ ₹) */}
          {/* ======================================================== */}
          {activeTab === 'amount' && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {/* Form Input fields */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
                    <Coins className="w-4.5 h-4.5 text-[#2D5A27]" />
                    वजन से कीमत गणना (Weight to Cost)
                  </h3>
                  <button 
                    onClick={clearAmountCalc}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    साफ़ करें (Clear)
                  </button>
                </div>

                {amountError && (
                  <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-100">
                    {amountError}
                  </div>
                )}

                {/* Price input */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">
                    प्रति किलो कीमत (Price per KG)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-black text-sm">₹</span>
                    </div>
                    <input 
                      type="number"
                      value={amountPricePerKg}
                      onChange={(e) => setAmountPricePerKg(e.target.value)}
                      placeholder="जैसे 270 (प्रति किलो)"
                      min="0"
                      className="block w-full pl-8 pr-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all placeholder:text-gray-400 placeholder:font-medium"
                    />
                  </div>
                </div>

                {/* Weight Inputs: Dual linked fields */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">
                      वजन मात्रा (Quantity) - Gram ↔ KG Auto-Convert
                    </label>
                    <span className="text-[9px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                      <ArrowRightLeft className="w-2.5 h-2.5" />
                      स्मार्ट ऑटो-कन्वर्ट
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Kilograms (KG) Field */}
                    <div className="space-y-1.5">
                      <div className="relative">
                        <input 
                          type="number"
                          value={weightKgInput}
                          onChange={(e) => handleKgInput(e.target.value)}
                          placeholder="0"
                          step="any"
                          min="0"
                          className="block w-full pr-12 pl-4 py-3 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-base font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all placeholder:text-gray-400"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          <span className="text-gray-400 font-bold text-xs">KG</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium text-center">किलोग्राम में</p>
                    </div>

                    {/* Grams Field */}
                    <div className="space-y-1.5">
                      <div className="relative">
                        <input 
                          type="number"
                          value={weightGramInput}
                          onChange={(e) => handleGramInput(e.target.value)}
                          placeholder="0"
                          min="0"
                          className="block w-full pr-12 pl-4 py-3 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-base font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all placeholder:text-gray-400"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          <span className="text-gray-400 font-bold text-xs">g</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium text-center">ग्राम में</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Result Card */}
              <div className="bg-[#2D5A27] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col items-center text-center space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-white/70">
                    कुल भुगतान राशि (Total Payable Amount)
                  </h4>
                  
                  {amountResult !== null ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="text-4xl sm:text-5xl font-black text-amber-300 font-mono">
                          ₹ {amountResult}
                        </span>
                      </div>
                      <div className="bg-black/20 py-1.5 px-4 rounded-full text-[11px] font-bold border border-white/5">
                        {amountPricePerKg} प्रति किलो दर से कुल {weightKgInput} KG का मूल्य
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-white/60 italic text-xs font-medium">
                      कृपया प्रति किलो मूल्य और वजन मात्रा दर्ज करें। live कीमत यहाँ आ जाएगी।
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}


        </AnimatePresence>
      </div>
    </div>
  );
};

export default AgriCalculator;
