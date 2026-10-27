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
  CornerDownLeft,
  ArrowRight,
  Droplets,
  MapPin,
  ChevronUp,
  ChevronDown,
  CheckCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  LandUnitId, 
  SHAMGARH_LAND_UNITS, 
  SHAMGARH_BIGHA_ASSUMPTION_NOTE, 
  convertLandArea, 
  formatBighaAndBiswa, 
  calculateSprayerRequirements,
  PumpCapacityOption
} from '../utils/shamgarhLandMeasure';

interface HistoryItem {
  equation: string;
  result: string;
}

const AgriCalculator: React.FC = () => {
  const navigate = useNavigate();
  
  // Navigation Tabs: normal, bigha, weight, amount
  const [activeTab, setActiveTab] = useState<'normal' | 'bigha' | 'weight' | 'amount'>('normal');

  // ==========================================
  // 1️⃣ Normal Commercial Calculator State & Logic
  // ==========================================
  const [normalPrevEquation, setNormalPrevEquation] = useState('');
  const [normalDisplay, setNormalDisplay] = useState('0');
  const [normalSubDetail, setNormalSubDetail] = useState('');
  const [normalIsFinished, setNormalIsFinished] = useState(false);
  
  // Commercial Memory (M+, M-, MRC) & Grand Total (GT)
  const [memoryValue, setMemoryValue] = useState<number>(0);
  const [gtAccumulator, setGtAccumulator] = useState<number>(0);
  const lastMrcClickRef = useRef<number>(0);
  const lastGtClickRef = useRef<number>(0);

  // Custom GST Rate (%) - Persistent in LocalStorage
  const [customGSTRate, setCustomGSTRate] = useState<string>(() => {
    try {
      return localStorage.getItem('calc_custom_gst_rate') || '18';
    } catch (e) {
      return '18';
    }
  });

  const handleGSTRateChange = (newRate: string) => {
    setCustomGSTRate(newRate);
    try {
      localStorage.setItem('calc_custom_gst_rate', newRate);
    } catch (e) {}
  };

  // Step-by-Step History for 120-Step Check & Correct
  interface CalcStep {
    operand: number;
    operator: string;
  }
  const [calcSteps, setCalcSteps] = useState<CalcStep[]>([]);
  const [checkStepIndex, setCheckStepIndex] = useState<number | null>(null);
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);

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
    try {
      localStorage.setItem('calc_normal_history', JSON.stringify(normalHistory));
    } catch (e) {}
  }, [normalHistory]);

  const formatResult = (num: number): string => {
    if (isNaN(num) || !isFinite(num)) return 'Error';
    const rounded = Math.round((num + Number.EPSILON) * 10000) / 10000;
    if (Math.round(rounded) === rounded) return rounded.toString();
    const str = rounded.toString();
    if (str.includes('.')) {
      const decimalPart = str.split('.')[1];
      if (decimalPart.length > 4) {
        return parseFloat(rounded.toFixed(4)).toString();
      }
    }
    return str;
  };

  const handleNormalButtonClick = (value: string) => {
    // ------------------------------------------
    // 1. ALL CLEAR (AC)
    // ------------------------------------------
    if (value === 'AC') {
      setNormalDisplay('0');
      setNormalPrevEquation('');
      setNormalSubDetail('');
      setNormalIsFinished(false);
      setCheckStepIndex(null);
      setIsCorrecting(false);
      setCalcSteps([]);
    } 
    // ------------------------------------------
    // 2. BACKSPACE (⌫)
    // ------------------------------------------
    else if (value === '⌫' || value === 'Backspace') {
      if (isCorrecting) {
        if (normalDisplay.length > 1) {
          setNormalDisplay(normalDisplay.slice(0, -1));
        } else {
          setNormalDisplay('0');
        }
        return;
      }
      if (normalIsFinished || normalDisplay === 'Error') {
        setNormalDisplay('0');
        setNormalPrevEquation('');
        setNormalSubDetail('');
        setNormalIsFinished(false);
        setCheckStepIndex(null);
      } else {
        if (normalDisplay.length > 1) {
          setNormalDisplay(normalDisplay.slice(0, -1));
        } else {
          setNormalDisplay('0');
        }
      }
    } 
    // ------------------------------------------
    // 3. SIGN TOGGLE (+/−)
    // ------------------------------------------
    else if (value === '+/−') {
      if (normalDisplay === '0' || normalDisplay === 'Error') return;
      if (normalDisplay.startsWith('-')) {
        setNormalDisplay(normalDisplay.slice(1));
      } else {
        setNormalDisplay('-' + normalDisplay);
      }
    }
    // ------------------------------------------
    // 4. DOUBLE ZERO (00)
    // ------------------------------------------
    else if (value === '00') {
      if (isCorrecting || normalIsFinished || normalDisplay === '0' || normalDisplay === 'Error') {
        if (normalIsFinished) {
          setNormalDisplay('0');
          setNormalPrevEquation('');
          setNormalSubDetail('');
          setNormalIsFinished(false);
        }
        return;
      }
      setNormalDisplay(normalDisplay + '00');
    }
    // ------------------------------------------
    // 5. PERCENTAGE (%)
    // ------------------------------------------
    else if (value === '%') {
      try {
        const currentNum = parseFloat(normalDisplay) || 0;
        const trimmedPrev = normalPrevEquation.trim();
        const parts = trimmedPrev.split(' ');
        const lastOp = parts[parts.length - 1];
        const baseNum = parseFloat(parts[parts.length - 2]);

        if (!isNaN(baseNum) && ['+', '−', '×', '÷'].includes(lastOp)) {
          // Contextual percentage (e.g. 1000 - 10% = 100)
          const pctVal = Math.round(((baseNum * (currentNum / 100)) + Number.EPSILON) * 100) / 100;
          setNormalDisplay(formatResult(pctVal));
          setNormalSubDetail(`प्रतिशत मान: ₹${formatResult(pctVal)} (${currentNum}% of ₹${formatResult(baseNum)})`);
        } else {
          const res = formatResult(currentNum / 100);
          setNormalDisplay(res);
          setNormalSubDetail(`प्रतिशत: ${res}`);
        }
      } catch (e) {}
    } 
    // ------------------------------------------
    // 6. TAX+ (Add Custom GST)
    // ------------------------------------------
    else if (value === 'TAX+') {
      const val = parseFloat(normalDisplay) || 0;
      const rate = parseFloat(customGSTRate) || 0;
      const taxAmount = Math.round((val * (rate / 100) + Number.EPSILON) * 100) / 100;
      const finalTotal = Math.round((val + taxAmount + Number.EPSILON) * 100) / 100;
      const formattedFinal = formatResult(finalTotal);
      const formattedBase = formatResult(val);
      const formattedTax = formatResult(taxAmount);

      setNormalDisplay(formattedFinal);
      setNormalPrevEquation(`${formattedBase} + ${rate}% GST`);
      setNormalSubDetail(`मूल मूल्य: ₹${formattedBase} + GST (${rate}%): ₹${formattedTax}`);
      setGtAccumulator(prev => prev + finalTotal);
      setNormalHistory(prev => [
        { equation: `${formattedBase} + ${rate}% GST`, result: formattedFinal },
        ...prev.slice(0, 19)
      ]);
      setNormalIsFinished(true);
      setCheckStepIndex(null);
      setIsCorrecting(false);
    }
    // ------------------------------------------
    // 7. TAX− (Extract Custom GST from inclusive price)
    // ------------------------------------------
    else if (value === 'TAX−') {
      const inclusiveVal = parseFloat(normalDisplay) || 0;
      const rate = parseFloat(customGSTRate) || 0;
      const baseVal = Math.round(((inclusiveVal / (1 + rate / 100)) + Number.EPSILON) * 100) / 100;
      const taxAmount = Math.round((inclusiveVal - baseVal + Number.EPSILON) * 100) / 100;
      const formattedBase = formatResult(baseVal);
      const formattedTax = formatResult(taxAmount);
      const formattedInc = formatResult(inclusiveVal);

      setNormalDisplay(formattedBase);
      setNormalPrevEquation(`${formattedInc} − ${rate}% GST`);
      setNormalSubDetail(`मूल मूल्य: ₹${formattedBase} | टैक्स अलग किया गया: ₹${formattedTax} (${rate}% GST)`);
      setNormalHistory(prev => [
        { equation: `${formattedInc} − ${rate}% GST`, result: formattedBase },
        ...prev.slice(0, 19)
      ]);
      setNormalIsFinished(true);
      setCheckStepIndex(null);
      setIsCorrecting(false);
    }
    // ------------------------------------------
    // 8. MEMORY SUITE: M+, M−, MRC
    // ------------------------------------------
    else if (value === 'M+') {
      const val = parseFloat(normalDisplay) || 0;
      const newMem = Math.round((memoryValue + val + Number.EPSILON) * 100) / 100;
      setMemoryValue(newMem);
      setNormalSubDetail(`मेमोरी में जोड़ा (+₹${formatResult(val)}) | संचित कुल M: ₹${formatResult(newMem)}`);
      setNormalIsFinished(true);
      setCheckStepIndex(null);
    }
    else if (value === 'M−') {
      const val = parseFloat(normalDisplay) || 0;
      const newMem = Math.round((memoryValue - val + Number.EPSILON) * 100) / 100;
      setMemoryValue(newMem);
      setNormalSubDetail(`मेमोरी से घटाया (−₹${formatResult(val)}) | संचित कुल M: ₹${formatResult(newMem)}`);
      setNormalIsFinished(true);
      setCheckStepIndex(null);
    }
    else if (value === 'MRC') {
      const now = Date.now();
      if (now - lastMrcClickRef.current < 1500) {
        // Double Click -> Clear Memory (MC)
        setMemoryValue(0);
        setNormalSubDetail("मेमोरी साफ़ की गई (Memory Cleared: ₹0)");
        lastMrcClickRef.current = 0;
      } else {
        // Single Click -> Recall Memory (MR)
        setNormalDisplay(formatResult(memoryValue));
        setNormalPrevEquation("Memory Recall (MR)");
        setNormalSubDetail(`मेमोरी में संचित राशि: ₹${formatResult(memoryValue)} (दोबारा दबाने पर Clear)`);
        setNormalIsFinished(true);
        lastMrcClickRef.current = now;
      }
      setCheckStepIndex(null);
      setIsCorrecting(false);
    }
    // ------------------------------------------
    // 9. GRAND TOTAL (GT)
    // ------------------------------------------
    else if (value === 'GT') {
      const now = Date.now();
      if (now - lastGtClickRef.current < 1500) {
        // Double Click -> Clear GT
        setGtAccumulator(0);
        setNormalSubDetail("ग्रैंड टोटल साफ़ किया गया (GT Cleared: ₹0)");
        lastGtClickRef.current = 0;
      } else {
        // Single Click -> Recall GT
        setNormalDisplay(formatResult(gtAccumulator));
        setNormalPrevEquation("Grand Total (GT)");
        setNormalSubDetail(`सभी बिलों का महायोग: ₹${formatResult(gtAccumulator)} (दोबारा दबाने पर Clear)`);
        setNormalIsFinished(true);
        lastGtClickRef.current = now;
      }
      setCheckStepIndex(null);
      setIsCorrecting(false);
    }
    // ------------------------------------------
    // 10. MARK UP (MU)
    // ------------------------------------------
    else if (value === 'MU') {
      const currentVal = parseFloat(normalDisplay) || 0;
      const trimmedPrev = normalPrevEquation.trim();
      const parts = trimmedPrev.split(' ');
      const lastOp = parts[parts.length - 1];
      const prevNum = parseFloat(parts[parts.length - 2]);

      if (!isNaN(prevNum) && lastOp === '÷') {
        const marginPercent = currentVal;
        if (marginPercent < 100) {
          const sellingPrice = Math.round(((prevNum / (1 - marginPercent / 100)) + Number.EPSILON) * 100) / 100;
          const profit = Math.round((sellingPrice - prevNum + Number.EPSILON) * 100) / 100;
          const formattedSP = formatResult(sellingPrice);
          setNormalDisplay(formattedSP);
          setNormalPrevEquation(`${formatResult(prevNum)} ÷ ${marginPercent}% MU`);
          setNormalSubDetail(`लागत: ₹${formatResult(prevNum)} | ${marginPercent}% मार्जिन पर विक्रय: ₹${formattedSP} (लाभ: ₹${formatResult(profit)})`);
          setGtAccumulator(prev => prev + sellingPrice);
          setNormalIsFinished(true);
        }
      } else if (!isNaN(prevNum) && lastOp === '+') {
        const markupPercent = currentVal;
        const sellingPrice = Math.round(((prevNum * (1 + markupPercent / 100)) + Number.EPSILON) * 100) / 100;
        const profit = Math.round((sellingPrice - prevNum + Number.EPSILON) * 100) / 100;
        const formattedSP = formatResult(sellingPrice);
        setNormalDisplay(formattedSP);
        setNormalPrevEquation(`${formatResult(prevNum)} + ${markupPercent}% MU`);
        setNormalSubDetail(`लागत: ₹${formatResult(prevNum)} | ${markupPercent}% मार्क-अप पर विक्रय: ₹${formattedSP} (लाभ: ₹${formatResult(profit)})`);
        setGtAccumulator(prev => prev + sellingPrice);
        setNormalIsFinished(true);
      } else {
        // Standalone 10% standard margin
        const defaultMargin = 10;
        const sellingPrice = Math.round(((currentVal / (1 - defaultMargin / 100)) + Number.EPSILON) * 100) / 100;
        const profit = Math.round((sellingPrice - currentVal + Number.EPSILON) * 100) / 100;
        const formattedSP = formatResult(sellingPrice);
        setNormalDisplay(formattedSP);
        setNormalPrevEquation(`${formatResult(currentVal)} MU (10%)`);
        setNormalSubDetail(`लागत: ₹${formatResult(currentVal)} | 10% मार्जिन पर विक्रय: ₹${formattedSP} (लाभ: ₹${formatResult(profit)})`);
        setNormalIsFinished(true);
      }
    }
    // ------------------------------------------
    // 11. CHECK ▲ (Step Backward)
    // ------------------------------------------
    else if (value === 'Check ▲') {
      if (calcSteps.length === 0) {
        setNormalSubDetail("जाँच के लिए कोई स्टेप उपलब्ध नहीं है। गणना करने के बाद चेक करें।");
        return;
      }
      let targetIndex: number;
      if (checkStepIndex === null) {
        targetIndex = calcSteps.length - 1;
      } else {
        targetIndex = Math.max(0, checkStepIndex - 1);
      }
      setCheckStepIndex(targetIndex);
      setIsCorrecting(false);
      setNormalDisplay(formatResult(calcSteps[targetIndex].operand));
      setNormalPrevEquation(`जाँच (Check): स्टेप ${targetIndex + 1}/${calcSteps.length} [ ${calcSteps[targetIndex].operator} ]`);
      setNormalSubDetail("संख्या सुधारने के लिए 'Correct' बटन दबाएं");
    }
    // ------------------------------------------
    // 12. CHECK ▼ (Step Forward)
    // ------------------------------------------
    else if (value === 'Check ▼') {
      if (calcSteps.length === 0) {
        setNormalSubDetail("जाँच के लिए कोई स्टेप उपलब्ध नहीं है। गणना करने के बाद चेक करें।");
        return;
      }
      let targetIndex: number;
      if (checkStepIndex === null) {
        targetIndex = 0;
      } else {
        targetIndex = Math.min(calcSteps.length - 1, checkStepIndex + 1);
      }
      setCheckStepIndex(targetIndex);
      setIsCorrecting(false);
      setNormalDisplay(formatResult(calcSteps[targetIndex].operand));
      setNormalPrevEquation(`जाँच (Check): स्टेप ${targetIndex + 1}/${calcSteps.length} [ ${calcSteps[targetIndex].operator} ]`);
      setNormalSubDetail("संख्या सुधारने के लिए 'Correct' बटन दबाएं");
    }
    // ------------------------------------------
    // 13. CORRECT (Edit & Recalculate Step)
    // ------------------------------------------
    else if (value === 'Correct') {
      if (checkStepIndex === null) {
        setNormalSubDetail("पहले 'Check ▲' या 'Check ▼' से वह स्टेप चुनें जिसे सुधारना है");
        return;
      }
      if (!isCorrecting) {
        setIsCorrecting(true);
        setNormalSubDetail(`स्टेप ${checkStepIndex + 1} सुधार मोड: नई संख्या टाइप करें, फिर 'Correct' दोबारा दबाएं`);
      } else {
        // Finalize Correction & Recalculate whole chain
        const newOperand = parseFloat(normalDisplay) || 0;
        const updatedSteps = [...calcSteps];
        updatedSteps[checkStepIndex].operand = newOperand;
        setCalcSteps(updatedSteps);
        setIsCorrecting(false);
        setCheckStepIndex(null);

        // Recalculate expression
        let expr = '';
        for (let i = 0; i < updatedSteps.length; i++) {
          expr += updatedSteps[i].operand + ' ';
          if (i < updatedSteps.length - 1) {
            expr += updatedSteps[i].operator + ' ';
          }
        }
        const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        try {
          const clean = sanitized.replace(/[^0-9+\-*/.() ]/g, '');
          const newResult = new Function(`return (${clean})`)();
          const formatted = formatResult(newResult);
          setNormalDisplay(formatted);
          setNormalPrevEquation(expr + '=');
          setNormalSubDetail(`स्टेप ${checkStepIndex + 1} सुधारा गया! नया कुल योग: ₹${formatted}`);
          setNormalHistory(prev => [
            { equation: expr, result: formatted },
            ...prev.slice(0, 19)
          ]);
          setNormalIsFinished(true);
        } catch (e) {
          setNormalSubDetail("सुधार के बाद गणना में त्रुटि");
        }
      }
    }
    // ------------------------------------------
    // 14. OPERATORS (+, −, ×, ÷)
    // ------------------------------------------
    else if (['+', '−', '×', '÷'].includes(value)) {
      setCheckStepIndex(null);
      setIsCorrecting(false);

      if (normalIsFinished) {
        const prevRes = parseFloat(normalDisplay) || 0;
        setCalcSteps([{ operand: prevRes, operator: value }]);
        setNormalPrevEquation(normalDisplay + ' ' + value + ' ');
        setNormalDisplay('0');
        setNormalSubDetail('');
        setNormalIsFinished(false);
      } else {
        const currentVal = parseFloat(normalDisplay) || 0;
        setCalcSteps(prev => [...prev, { operand: currentVal, operator: value }]);

        const trimmedPrev = normalPrevEquation.trim();
        const lastChar = trimmedPrev.slice(-1);
        if (normalDisplay === '0' && ['+', '−', '×', '÷'].includes(lastChar)) {
          setNormalPrevEquation(trimmedPrev.slice(0, -1) + value + ' ');
        } else {
          setNormalPrevEquation(normalPrevEquation + (normalDisplay === '0' ? '0' : normalDisplay) + ' ' + value + ' ');
          setNormalDisplay('0');
        }
      }
    } 
    // ------------------------------------------
    // 15. EQUALS (=)
    // ------------------------------------------
    else if (value === '=') {
      if (isCorrecting && checkStepIndex !== null) {
        // Shortcut to finish correcting
        handleNormalButtonClick('Correct');
        return;
      }

      let finalExpr = normalPrevEquation + normalDisplay;
      if (!finalExpr || finalExpr.trim() === '' || normalIsFinished) return;

      const finalVal = parseFloat(normalDisplay) || 0;
      setCalcSteps(prev => [...prev, { operand: finalVal, operator: '=' }]);
      
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
          setNormalSubDetail(`परिणाम: ₹${formatted}`);
          setNormalIsFinished(true);
          setGtAccumulator(prev => prev + calcResult);
          
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
      setCheckStepIndex(null);
      setIsCorrecting(false);
    } 
    // ------------------------------------------
    // 16. DECIMAL (.)
    // ------------------------------------------
    else if (value === '.') {
      if (normalIsFinished) {
        setNormalDisplay('0.');
        setNormalPrevEquation('');
        setNormalSubDetail('');
        setNormalIsFinished(false);
        setCheckStepIndex(null);
      } else if (!normalDisplay.includes('.')) {
        setNormalDisplay(normalDisplay + '.');
      }
    } 
    // ------------------------------------------
    // 17. NUMBERS (0-9)
    // ------------------------------------------
    else {
      if (isCorrecting) {
        if (normalDisplay === '0') {
          setNormalDisplay(value);
        } else {
          setNormalDisplay(normalDisplay + value);
        }
        return;
      }

      if (normalDisplay === '0' || normalIsFinished) {
        setNormalDisplay(value);
        if (normalIsFinished) {
          setNormalPrevEquation('');
          setNormalSubDetail('');
          setNormalIsFinished(false);
          setCheckStepIndex(null);
          setCalcSteps([]);
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
  }, [normalDisplay, normalPrevEquation, normalIsFinished, activeTab, isCorrecting, checkStepIndex, calcSteps]);

  const clearNormalHistory = () => {
    setNormalHistory([]);
    try {
      localStorage.removeItem('calc_normal_history');
    } catch (e) {}
  };

  const loadFromHistory = (item: HistoryItem) => {
    setNormalDisplay(item.result);
    setNormalPrevEquation(item.equation + ' =');
    setNormalSubDetail(`इतिहास से लोड किया गया: ₹${item.result}`);
    setNormalIsFinished(true);
    setIsHistoryOpen(false);
    setCheckStepIndex(null);
  };

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

  // ==========================================
  // 4️⃣ Land & Spray Calculator (शामगढ़ पक्का बीघा)
  // ==========================================
  const [landAreaInput, setLandAreaInput] = useState<string>('1');
  const [landAreaUnit, setLandAreaUnit] = useState<LandUnitId>('shamgarh_pucca_bigha');
  const [pumpCapacity, setPumpCapacity] = useState<PumpCapacityOption>(15);

  const parsedLandVal = Math.max(0, parseFloat(landAreaInput) || 0);
  const bighaEquiv = convertLandArea(parsedLandVal, landAreaUnit, 'shamgarh_pucca_bigha');
  const acreEquiv = convertLandArea(parsedLandVal, landAreaUnit, 'acre');
  const hectareEquiv = convertLandArea(parsedLandVal, landAreaUnit, 'hectare');
  const biswaEquiv = convertLandArea(parsedLandVal, landAreaUnit, 'biswa');
  const sqFtEquiv = Math.round(parsedLandVal * (SHAMGARH_LAND_UNITS[landAreaUnit]?.sqFt || 27225));
  const sqMetersEquiv = Math.round((parsedLandVal * (SHAMGARH_LAND_UNITS[landAreaUnit]?.sqMeters || 2529.29)) * 100) / 100;
  const bighaBiswaFormatted = formatBighaAndBiswa(bighaEquiv);
  const sprayerInfo = calculateSprayerRequirements(bighaEquiv, pumpCapacity);

  const clearLandCalc = () => {
    setLandAreaInput('1');
    setLandAreaUnit('shamgarh_pucca_bigha');
    setPumpCapacity(15);
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
          <h2 className="text-2xl font-black text-gray-800 leading-tight">Agri Calculator</h2>
          <p className="text-xs text-gray-500 font-semibold">कृषि दुकान और रोज़मर्रा के हिसाब-किताब के लिए</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/50 gap-1.5 shadow-2xs">
        <button 
          onClick={() => setActiveTab('normal')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-black text-xs transition-all uppercase tracking-wide
            ${activeTab === 'normal' 
              ? 'bg-white text-[#2D5A27] shadow-sm font-extrabold border border-gray-200/40' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'}`}
        >
          <Calculator className="w-4 h-4 shrink-0" />
          <span>साधारण</span>
        </button>
        <button 
          onClick={() => setActiveTab('bigha')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-black text-xs transition-all uppercase tracking-wide
            ${activeTab === 'bigha' 
              ? 'bg-[#2D5A27] text-white shadow-sm font-extrabold' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'}`}
        >
          <Sprout className="w-4 h-4 shrink-0" />
          <span>शामगढ़ बीघा व स्प्रे</span>
        </button>
        <button 
          onClick={() => setActiveTab('weight')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-black text-xs transition-all uppercase tracking-wide
            ${activeTab === 'weight' 
              ? 'bg-white text-[#2D5A27] shadow-sm font-extrabold border border-gray-200/40' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'}`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span className="flex items-center gap-1">₹ <ArrowRight className="w-3 h-3" /> वजन</span>
        </button>
        <button 
          onClick={() => setActiveTab('amount')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-black text-xs transition-all uppercase tracking-wide
            ${activeTab === 'amount' 
              ? 'bg-white text-[#2D5A27] shadow-sm font-extrabold border border-gray-200/40' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'}`}
        >
          <Coins className="w-4 h-4 shrink-0" />
          <span className="flex items-center gap-1">वजन <ArrowRight className="w-3 h-3" /> ₹</span>
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
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200/80 relative overflow-hidden space-y-2">
                {/* Status Indicator Bar */}
                <div className="flex items-center justify-between text-[11px] font-black text-gray-400 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    {memoryValue !== 0 && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-black text-[10px] border border-emerald-200 animate-pulse">
                        M ({formatResult(memoryValue)})
                      </span>
                    )}
                    {gtAccumulator !== 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-black text-[10px] border border-blue-200">
                        GT ({formatResult(gtAccumulator)})
                      </span>
                    )}
                    {checkStepIndex !== null && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-black text-[10px] border border-amber-300 animate-pulse">
                        STEP {checkStepIndex + 1}/{calcSteps.length}
                      </span>
                    )}
                  </div>

                  <div className="text-gray-500 font-mono text-[11px] flex items-center gap-1">
                    <span>GST:</span>
                    <span className="font-black text-[#2D5A27] bg-[#2D5A27]/10 px-1.5 py-0.5 rounded text-[11px]">{customGSTRate}%</span>
                  </div>
                </div>

                {/* Equation line */}
                <div className="flex justify-end items-center text-gray-400 font-mono text-xs sm:text-sm tracking-wider h-5 overflow-hidden select-all">
                  <div>{normalPrevEquation}</div>
                </div>
                
                {/* Main Digits */}
                <div className="text-right text-4xl sm:text-5xl font-black font-mono tracking-tight text-gray-900 overflow-x-auto whitespace-nowrap py-1 scrollbar-none select-all">
                  {normalDisplay}
                </div>

                {/* Sub-detail message (Tax / Memory / Markup info) */}
                {normalSubDetail && (
                  <div className="text-right text-xs font-semibold text-[#2D5A27] font-mono tracking-tight truncate pt-0.5">
                    {normalSubDetail}
                  </div>
                )}

                {/* Custom GST Input Field & History Trigger Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/90 rounded-2xl px-3 py-1.5 shadow-2xs">
                    <span className="text-[11px] font-black text-gray-600 uppercase tracking-wide">कस्टम GST दर:</span>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.5"
                        value={customGSTRate} 
                        onChange={(e) => handleGSTRateChange(e.target.value)} 
                        className="w-12 bg-white border border-gray-300 rounded-lg px-1.5 py-0.5 text-center font-black text-gray-900 text-xs focus:ring-2 focus:ring-[#2D5A27]/30 focus:border-[#2D5A27] outline-hidden shadow-2xs" 
                        placeholder="18" 
                      />
                      <span className="text-xs font-black text-gray-700">%</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="flex items-center gap-1.5 text-xs font-black text-[#2D5A27] hover:bg-[#2D5A27]/10 transition-all bg-[#2D5A27]/5 py-2 px-3.5 rounded-2xl border border-[#2D5A27]/15 cursor-pointer shadow-2xs"
                  >
                    <History className="w-3.5 h-3.5 text-[#2D5A27]" />
                    <span>इतिहास ({normalHistory.length})</span>
                  </button>
                </div>
              </div>

              {/* History Panel */}
              {isHistoryOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white border border-gray-200 rounded-3xl p-5 shadow-inner space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-4 h-4 text-[#2D5A27]" />
                      पिछली गणनाएं (Recent Calculations)
                    </h3>
                    {normalHistory.length > 0 && (
                      <button 
                        onClick={clearNormalHistory}
                        className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
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

              {/* Commercial Keypad Grid Container */}
              <div className="space-y-3 bg-gray-50/70 p-3 sm:p-4 rounded-3xl border border-gray-200/80 shadow-2xs">
                {/* 1. TOP COMMERCIAL FUNCTION ROWS (2 Rows × 5 Columns) */}
                <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                  {/* Row 1: Tax & Audit (TAX+, TAX-, Check ▲, Check ▼, Correct) */}
                  <button
                    onClick={() => handleNormalButtonClick('TAX+')}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-2xl py-3 px-1 text-xs sm:text-sm font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                    title={`जोड़ें ${customGSTRate}% GST`}
                  >
                    TAX+
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('TAX−')}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-2xl py-3 px-1 text-xs sm:text-sm font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                    title={`अलग करें ${customGSTRate}% GST`}
                  >
                    TAX−
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('Check ▲')}
                    className="bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/80 rounded-2xl py-3 px-1 text-[11px] sm:text-xs font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-0.5 cursor-pointer"
                    title="पिछला स्टेप देखें"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Check</span>
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('Check ▼')}
                    className="bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/80 rounded-2xl py-3 px-1 text-[11px] sm:text-xs font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-0.5 cursor-pointer"
                    title="अगला स्टेप देखें"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Check</span>
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('Correct')}
                    className={`${isCorrecting ? 'bg-amber-500 text-white animate-pulse' : 'bg-sky-100 hover:bg-sky-200 text-sky-950'} border border-sky-300/80 rounded-2xl py-3 px-1 text-[11px] sm:text-xs font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer`}
                    title="स्टेप सुधारें"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Correct</span>
                  </button>

                  {/* Row 2: Memory & Margin (MRC, M-, M+, MU, GT) */}
                  <button
                    onClick={() => handleNormalButtonClick('MRC')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80 rounded-2xl py-3 px-1 text-xs sm:text-sm font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                    title="Memory Recall / Clear (2 बार दबाने पर Clear)"
                  >
                    MRC
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('M−')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80 rounded-2xl py-3 px-1 text-xs sm:text-sm font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                    title="मेमोरी से घटाएं"
                  >
                    M−
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('M+')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80 rounded-2xl py-3 px-1 text-xs sm:text-sm font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                    title="मेमोरी में जोड़ें"
                  >
                    M+
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('MU')}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-2xl py-3 px-1 text-xs sm:text-sm font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                    title="Mark Up / Selling Price"
                  >
                    MU
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('GT')}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-2xl py-3 px-1 text-xs sm:text-sm font-black active:scale-95 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                    title="Grand Total (महायोग)"
                  >
                    GT
                  </button>
                </div>

                {/* 2. MAIN NUMERIC KEYPAD (4 Columns × 6 Rows) */}
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3 pt-1">
                  {/* Row 1: AC, Backspace, Sign, Divide */}
                  <button
                    onClick={() => handleNormalButtonClick('AC')}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-black border border-red-200/70 rounded-2xl p-3.5 text-base sm:text-lg active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    AC
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('⌫')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold border border-gray-200/60 rounded-2xl p-3.5 text-base sm:text-lg active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    ⌫
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('+/−')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-black border border-gray-200/60 rounded-2xl p-3.5 text-base active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    +/−
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('÷')}
                    className="bg-[#2D5A27]/10 hover:bg-[#2D5A27]/20 text-[#2D5A27] font-black border border-[#2D5A27]/20 rounded-2xl p-3.5 text-2xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    ÷
                  </button>

                  {/* Row 2: 7, 8, 9, Multiply */}
                  <button
                    onClick={() => handleNormalButtonClick('7')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    7
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('8')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    8
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('9')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    9
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('×')}
                    className="bg-[#2D5A27]/10 hover:bg-[#2D5A27]/20 text-[#2D5A27] font-black border border-[#2D5A27]/20 rounded-2xl p-3.5 text-2xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    ×
                  </button>

                  {/* Row 3: 4, 5, 6, Subtract */}
                  <button
                    onClick={() => handleNormalButtonClick('4')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    4
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('5')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    5
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('6')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    6
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('−')}
                    className="bg-[#2D5A27]/10 hover:bg-[#2D5A27]/20 text-[#2D5A27] font-black border border-[#2D5A27]/20 rounded-2xl p-3.5 text-2xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    −
                  </button>

                  {/* Row 4: 1, 2, 3, Add */}
                  <button
                    onClick={() => handleNormalButtonClick('1')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    1
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('2')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    2
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('3')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    3
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('+')}
                    className="bg-[#2D5A27]/10 hover:bg-[#2D5A27]/20 text-[#2D5A27] font-black border border-[#2D5A27]/20 rounded-2xl p-3.5 text-2xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    +
                  </button>

                  {/* Row 5: 0, 00, Decimal, Percentage */}
                  <button
                    onClick={() => handleNormalButtonClick('0')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('00')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    00
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('.')}
                    className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold border border-gray-200/80 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    .
                  </button>
                  <button
                    onClick={() => handleNormalButtonClick('%')}
                    className="bg-gray-100 hover:bg-gray-200 text-[#2D5A27] font-black border border-gray-200/70 rounded-2xl p-3.5 text-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    %
                  </button>

                  {/* Row 6: Equals (=) spanning all 4 columns */}
                  <button
                    onClick={() => handleNormalButtonClick('=')}
                    className="bg-[#2D5A27] hover:bg-[#20401B] text-white font-black rounded-2xl p-4 text-2xl col-span-4 active:scale-95 transition-all shadow-md shadow-[#2D5A27]/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    =
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* ⭐ TAB: SHAMGARH BIGHA & SPRAY CALCULATOR */}
          {/* ======================================================== */}
          {activeTab === 'bigha' && (
            <motion.div
              key="bigha"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {/* Land Input Form Card */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#2D5A27] text-white flex items-center justify-center shrink-0">
                      <Sprout className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-800 text-sm">
                        शामगढ़ भूमि माप व रूपांतरण
                      </h3>
                      <p className="text-[10px] text-gray-400 font-bold">1 पक्का बीघा = 27,225 वर्ग फीट (20 बिस्वा)</p>
                    </div>
                  </div>
                  <button 
                    onClick={clearLandCalc}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    रीसेट (Reset)
                  </button>
                </div>

                {/* Land Area Input & Unit Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">
                    जमीन का रकबा / क्षेत्रफल (Land Area)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={landAreaInput}
                      onChange={(e) => setLandAreaInput(e.target.value)}
                      placeholder="रकबा दर्ज करें (जैसे 1.5)"
                      min="0"
                      step="any"
                      className="flex-1 px-4 py-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-base font-black focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all placeholder:text-gray-400"
                    />
                    <select
                      value={landAreaUnit}
                      onChange={(e) => setLandAreaUnit(e.target.value as LandUnitId)}
                      className="px-3 py-3.5 bg-gray-50/90 border border-gray-200/80 rounded-2xl text-xs font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="biswa">बिस्वा (Biswa)</option>
                      <option value="shamgarh_pucca_bigha">पक्का बीघा (शामगढ़)</option>
                      <option value="acre">एकड़ (Acre)</option>
                      <option value="hectare">हेक्टेयर (Hectare)</option>
                    </select>
                  </div>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: '0.5 बीघा', val: '0.5', unit: 'shamgarh_pucca_bigha' as LandUnitId },
                    { label: '1 बीघा', val: '1', unit: 'shamgarh_pucca_bigha' as LandUnitId },
                    { label: '2 बीघा', val: '2', unit: 'shamgarh_pucca_bigha' as LandUnitId },
                    { label: '5 बीघा', val: '5', unit: 'shamgarh_pucca_bigha' as LandUnitId },
                    { label: '1 एकड़', val: '1', unit: 'acre' as LandUnitId },
                    { label: '1 हेक्टेयर', val: '1', unit: 'hectare' as LandUnitId }
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLandAreaInput(chip.val);
                        setLandAreaUnit(chip.unit);
                      }}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition-all"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversion Results Grid */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-[#2D5A27]" />
                    सटीक राजस्व माप रूपांतरण (Area Equivalents)
                  </h4>
                  <span className="text-[10px] bg-green-50 text-green-800 px-2.5 py-0.5 rounded-full font-bold border border-green-200">
                    शामगढ़ मानक
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Primary Bigha output */}
                  <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-amber-800 font-black uppercase tracking-wider block">शामगढ़ पक्का बीघा</span>
                    <span className="text-xl font-black text-amber-950 mt-1 block">
                      {bighaBiswaFormatted.formatted}
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
                      ({bighaEquiv} बीघा)
                    </span>
                  </div>

                  {/* Acre */}
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">एकड़ (Acre)</span>
                    <span className="text-lg font-black text-[#2D5A27] mt-1 block font-mono">
                      {acreEquiv} <span className="text-xs">एकड़</span>
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">1 एकड़ = 1.60 बीघा</span>
                  </div>

                  {/* Hectare */}
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">हेक्टेयर (Hectare)</span>
                    <span className="text-lg font-black text-[#2D5A27] mt-1 block font-mono">
                      {hectareEquiv} <span className="text-xs">हे.</span>
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">1 हे. ≈ 3.95 बीघा</span>
                  </div>

                  {/* Biswa */}
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">कुल बिस्वा</span>
                    <span className="text-base font-black text-gray-800 mt-1 block font-mono">
                      {biswaEquiv} <span className="text-xs">बिस्वा</span>
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">1 बीघा = 20 बिस्वा</span>
                  </div>

                  {/* Square Feet */}
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">वर्ग फीट (Sq Ft)</span>
                    <span className="text-base font-black text-gray-800 mt-1 block font-mono">
                      {sqFtEquiv.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">1 बीघा = 27,225 sq ft</span>
                  </div>

                  {/* Square Meters */}
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">वर्ग मीटर (Sq M)</span>
                    <span className="text-base font-black text-gray-800 mt-1 block font-mono">
                      {sqMetersEquiv.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">1 बीघा = 2,529.29 m²</span>
                  </div>
                </div>
              </div>

              {/* Spray & Tank Requirements Card */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#2D5A27]/20 relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shrink-0">
                      <Droplets className="w-5 h-5 text-[#2D5A27]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-[#1B4316]">
                        छिड़काव व टंकी गणना (Spray Calculator)
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                        मानक: 80 से 100 लीटर पानी प्रति शामगढ़ पक्का बीघा
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pump / Container Capacity Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    स्प्रे पंप / कंटेनर क्षमता चुनें (Pump Tank / Container Size):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 15 as const, label: '15 लीटर' },
                      { id: 20 as const, label: '20 लीटर' },
                      { id: 200 as const, label: '200 लीटर ड्रम' },
                      { id: 500 as const, label: '500 लीटर टैंकर' },
                    ].map((item) => {
                      const isSelected = pumpCapacity === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPumpCapacity(item.id)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center ${
                            isSelected
                              ? 'bg-amber-400 text-stone-900 shadow-sm border border-amber-500/50 ring-2 ring-amber-400/30 font-black'
                              : 'bg-[#FAF9F6] hover:bg-emerald-50/80 text-stone-700 border border-gray-200/90 hover:border-emerald-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Spray Calculations Output */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-emerald-100/90 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">कुल आवश्यक पानी</p>
                    <p className="text-2xl sm:text-3xl font-black mt-1 text-amber-600 font-mono tracking-tight">
                      {sprayerInfo.waterLitersMin} - {sprayerInfo.waterLitersMax} <span className="text-xs font-bold text-[#2D5A27]">L</span>
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 font-medium">80-100 L/बीघा दर</p>
                  </div>

                  <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-emerald-100/90 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {pumpCapacity === 200
                        ? 'कुल स्प्रे ड्रम'
                        : pumpCapacity === 500
                        ? 'कुल स्प्रे टैंकर'
                        : 'कुल स्प्रे पंप (टंकी)'}
                    </p>
                    <p className="text-2xl sm:text-3xl font-black mt-1 text-amber-600 font-mono tracking-tight">
                      {sprayerInfo.pumpsMin === sprayerInfo.pumpsMax
                        ? sprayerInfo.pumpsMin
                        : `${sprayerInfo.pumpsMin} - ${sprayerInfo.pumpsMax}`}{' '}
                      <span className="text-xs font-bold text-[#2D5A27]">{sprayerInfo.unitLabel}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                      {pumpCapacity >= 200
                        ? `${pumpCapacity} लीटर क्षमता प्रति ${sprayerInfo.unitLabel}`
                        : `${pumpCapacity} लीटर प्रति पंप`}
                    </p>
                  </div>
                </div>

                {/* Practical Advice */}
                <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/60 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0" />
                  <p className="text-xs font-medium text-stone-800 leading-relaxed">
                    किसान भाई, अपने{' '}
                    <span className="text-[#2D5A27] font-bold">
                      {bighaBiswaFormatted.formatted}
                    </span>{' '}
                    के लिए लगभग{' '}
                    <span className="text-amber-800 font-black bg-amber-100/90 px-1.5 py-0.5 rounded-md border border-amber-300/50">
                      {sprayerInfo.pumpsMin === sprayerInfo.pumpsMax
                        ? sprayerInfo.pumpsMin
                        : `${sprayerInfo.pumpsMin} से ${sprayerInfo.pumpsMax}`}{' '}
                      {sprayerInfo.unitLabel}
                    </span>{' '}
                    घोल तैयार करें।
                  </p>
                </div>
              </div>

              {/* Official Assumption Stamp */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed font-medium">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong className="font-black text-amber-950">स्थानीय राजस्व मानक (तहसील शामगढ़): </strong>
                  {SHAMGARH_BIGHA_ASSUMPTION_NOTE} यदि किसी अन्य क्षेत्र के किसान का बीघा माप अलग हो तो ऊपर दिए गए ड्रॉपडाउन से संबंधित इकाई चुनकर गणना देखें।
                </p>
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
