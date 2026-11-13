export interface DenominationConfig {
  value: number;
  enabled: boolean;
  isCustom: boolean;
}

export interface CashAdjustment {
  id: string;
  type: 'plus' | 'minus';
  amount: number;
  note?: string;
  createdAt: string;
}

export interface CashLineItem {
  value: number;
  qty: number;
  subtotal: number;
}

export interface CashCalculationSummary {
  items: CashLineItem[];
  activeItems: CashLineItem[];
  totalNotes: number;
  noteAmount: number;
  plusTotal: number;
  minusTotal: number;
  adjustmentNet: number;
  rawGrandTotal: number;
  grandTotal: number;
  isNegativeTotal: boolean;
}

export interface CashHistoryEntry {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  denominations: CashLineItem[];
  adjustments: CashAdjustment[];
  totalNotes: number;
  noteAmount: number;
  adjustmentNet: number;
  grandTotal: number;
  fingerprint: string;
}

export interface CashCalculatorSettings {
  denominations: DenominationConfig[];
  showCustomerFields: boolean;
  showAmountInWords: boolean;
  showLogoOnReceipt: boolean;
  includeZeroNotesInReceipt: boolean;
  shopName: string;
}

export const DEFAULT_DENOMINATION_VALUES = [
  2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1,
] as const;

export const DEFAULT_CASH_SETTINGS: CashCalculatorSettings = {
  denominations: DEFAULT_DENOMINATION_VALUES.map((value) => ({
    value,
    enabled: true,
    isCustom: false,
  })),
  showCustomerFields: true,
  showAmountInWords: true,
  showLogoOnReceipt: true,
  includeZeroNotesInReceipt: false,
  shopName: 'फल्सावदिया कृषि बाजार',
};

export interface DenominationBadgeStyle {
  bgClass: string;
  textClass: string;
  borderClass: string;
  accentHex: string;
}

export function getDenominationStyle(value: number): DenominationBadgeStyle {
  switch (value) {
    case 2000:
      return {
        bgClass: 'bg-fuchsia-50',
        textClass: 'text-fuchsia-900',
        borderClass: 'border-fuchsia-200',
        accentHex: '#A21CAF',
      };
    case 1000:
      return {
        bgClass: 'bg-rose-50',
        textClass: 'text-rose-900',
        borderClass: 'border-rose-200',
        accentHex: '#BE123C',
      };
    case 500:
      return {
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-900',
        borderClass: 'border-stone-300',
        accentHex: '#57534E',
      };
    case 200:
      return {
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-900',
        borderClass: 'border-amber-200',
        accentHex: '#D97706',
      };
    case 100:
      return {
        bgClass: 'bg-purple-50',
        textClass: 'text-purple-900',
        borderClass: 'border-purple-200',
        accentHex: '#7E22CE',
      };
    case 50:
      return {
        bgClass: 'bg-cyan-50',
        textClass: 'text-cyan-900',
        borderClass: 'border-cyan-200',
        accentHex: '#0E7490',
      };
    case 20:
      return {
        bgClass: 'bg-lime-50',
        textClass: 'text-lime-900',
        borderClass: 'border-lime-200',
        accentHex: '#4D7C0F',
      };
    case 10:
      return {
        bgClass: 'bg-orange-50',
        textClass: 'text-orange-900',
        borderClass: 'border-orange-200',
        accentHex: '#C2410C',
      };
    case 5:
      return {
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-900',
        borderClass: 'border-emerald-200',
        accentHex: '#047857',
      };
    case 2:
      return {
        bgClass: 'bg-slate-100',
        textClass: 'text-slate-800',
        borderClass: 'border-slate-300',
        accentHex: '#475569',
      };
    case 1:
      return {
        bgClass: 'bg-zinc-100',
        textClass: 'text-zinc-800',
        borderClass: 'border-zinc-300',
        accentHex: '#52525B',
      };
    default:
      return {
        bgClass: 'bg-emerald-50/90',
        textClass: 'text-[#1B4316]',
        borderClass: 'border-emerald-200',
        accentHex: '#2D5A27',
      };
  }
}

export function formatIndianCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return '0';
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  return rounded.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
}

export function calculateCashSummary(
  denominations: DenominationConfig[],
  quantities: Record<number, number>,
  adjustments: CashAdjustment[]
): CashCalculationSummary {
  const enabledSorted = [...denominations]
    .filter((d) => d.enabled && d.value > 0)
    .sort((a, b) => b.value - a.value);

  const items: CashLineItem[] = enabledSorted.map((d) => {
    const rawQty = quantities[d.value];
    const qty =
      typeof rawQty === 'number' && isFinite(rawQty) && rawQty > 0
        ? Math.floor(rawQty)
        : 0;
    const subtotal = Math.round((d.value * qty + Number.EPSILON) * 100) / 100;
    return {
      value: d.value,
      qty,
      subtotal,
    };
  });

  const activeItems = items.filter((item) => item.qty > 0);
  const totalNotes = items.reduce((acc, item) => acc + item.qty, 0);
  const noteAmount =
    Math.round((items.reduce((acc, item) => acc + item.subtotal, 0) + Number.EPSILON) * 100) / 100;

  let plusTotal = 0;
  let minusTotal = 0;
  for (const adj of adjustments) {
    const amt = typeof adj.amount === 'number' && isFinite(adj.amount) && adj.amount > 0 ? adj.amount : 0;
    if (adj.type === 'plus') {
      plusTotal += amt;
    } else {
      minusTotal += amt;
    }
  }
  plusTotal = Math.round((plusTotal + Number.EPSILON) * 100) / 100;
  minusTotal = Math.round((minusTotal + Number.EPSILON) * 100) / 100;

  const adjustmentNet = Math.round((plusTotal - minusTotal + Number.EPSILON) * 100) / 100;
  const rawGrandTotal = Math.round((noteAmount + adjustmentNet + Number.EPSILON) * 100) / 100;
  const isNegativeTotal = rawGrandTotal < 0;
  const grandTotal = isNegativeTotal ? 0 : rawGrandTotal;

  return {
    items,
    activeItems,
    totalNotes,
    noteAmount,
    plusTotal,
    minusTotal,
    adjustmentNet,
    rawGrandTotal,
    grandTotal,
    isNegativeTotal,
  };
}

export function validateNewAdjustment(
  noteAmount: number,
  currentAdjustments: CashAdjustment[],
  type: 'plus' | 'minus',
  amountStr: string
): { valid: boolean; amount: number; error: string | null } {
  const parsed = parseFloat(amountStr.trim());
  if (!amountStr.trim() || isNaN(parsed) || parsed <= 0) {
    return {
      valid: false,
      amount: 0,
      error: 'कृपया 0 से अधिक सही समायोजन राशि दर्ज करें।',
    };
  }

  const cleanAmount = Math.round((parsed + Number.EPSILON) * 100) / 100;
  const currentNet = currentAdjustments.reduce(
    (sum, item) => sum + (item.type === 'plus' ? item.amount : -item.amount),
    0
  );
  const nextNet = currentNet + (type === 'plus' ? cleanAmount : -cleanAmount);
  const nextGrandTotal = Math.round((noteAmount + nextNet + Number.EPSILON) * 100) / 100;

  if (nextGrandTotal < 0) {
    return {
      valid: false,
      amount: 0,
      error: 'कुल नकद राशि (Grand Total) नकारात्मक (0 से कम) नहीं हो सकती।',
    };
  }

  return {
    valid: true,
    amount: cleanAmount,
    error: null,
  };
}

export function buildCashFingerprint(
  customerName: string,
  customerPhone: string,
  activeItems: CashLineItem[],
  adjustments: CashAdjustment[],
  grandTotal: number
): string {
  const notesPart = activeItems.map((i) => `${i.value}:${i.qty}`).join(',');
  const adjPart = adjustments.map((a) => `${a.type}:${a.amount}:${a.note || ''}`).join(',');
  return `${customerName.trim().toLowerCase()}|${customerPhone.trim()}|${notesPart}|${adjPart}|${grandTotal}`;
}

export function formatCashDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const datePart = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return isoString;
  }
}

const ONES_EN = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS_EN = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitsToWordsEn(n: number): string {
  if (n < 20) return ONES_EN[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones > 0 ? `${TENS_EN[tens]} ${ONES_EN[ones]}` : TENS_EN[tens];
}

function integerToIndianWordsEn(num: number): string {
  if (num === 0) return 'Zero';
  if (!isFinite(num) || num < 0) return '';

  const parts: string[] = [];
  let remaining = Math.floor(num);

  const crores = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crores > 0) {
    parts.push(`${integerToIndianWordsEn(crores)} Crore`);
  }

  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakhs > 0) {
    parts.push(`${twoDigitsToWordsEn(lakhs)} Lakh`);
  }

  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousands > 0) {
    parts.push(`${twoDigitsToWordsEn(thousands)} Thousand`);
  }

  const hundreds = Math.floor(remaining / 100);
  remaining %= 100;
  if (hundreds > 0) {
    parts.push(`${ONES_EN[hundreds]} Hundred`);
  }

  if (remaining > 0) {
    parts.push(twoDigitsToWordsEn(remaining));
  }

  return parts.join(' ').trim();
}

export function numberToIndianWordsEn(amount: number): string {
  if (!isFinite(amount) || isNaN(amount) || amount < 0) return '';
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const whole = Math.floor(rounded);
  const paise = Math.round((rounded - whole) * 100);

  if (whole === 0 && paise === 0) return 'Zero Rupees Only';

  const wholeWords = whole > 0 ? `${integerToIndianWordsEn(whole)} Rupees` : '';
  const paiseWords = paise > 0 ? `${twoDigitsToWordsEn(paise)} Paise` : '';

  if (wholeWords && paiseWords) {
    return `${wholeWords} and ${paiseWords} Only`;
  }
  return `${wholeWords || paiseWords} Only`;
}

export function formatCashSummaryText(params: {
  shopName: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  items: CashLineItem[];
  adjustments: CashAdjustment[];
  totalNotes: number;
  noteAmount: number;
  adjustmentNet: number;
  grandTotal: number;
  includeAmountInWords?: boolean;
}): string {
  const {
    shopName,
    createdAt,
    customerName,
    customerPhone,
    items,
    adjustments,
    totalNotes,
    noteAmount,
    adjustmentNet,
    grandTotal,
    includeAmountInWords = true,
  } = params;

  const lines: string[] = [
    `*Cash Counting Report*`,
    shopName || 'फल्सावदिया कृषि बाजार',
    `Date: ${formatCashDateTime(createdAt)}`,
  ];

  if (customerName?.trim()) {
    lines.push(`Customer: ${customerName.trim()}`);
  }
  if (customerPhone?.trim()) {
    lines.push(`Mobile: ${customerPhone.trim()}`);
  }

  lines.push('');

  const nonZero = items.filter((item) => item.qty > 0);
  if (nonZero.length === 0) {
    lines.push('No currency notes entered.');
  } else {
    for (const item of nonZero) {
      lines.push(
        `₹${formatIndianCurrency(item.value)} × ${item.qty} = ₹${formatIndianCurrency(item.subtotal)}`
      );
    }
  }

  lines.push('');
  lines.push(`Total Notes: ${totalNotes}`);
  lines.push(`Note Amount: ₹${formatIndianCurrency(noteAmount)}`);

  if (adjustments.length > 0 || adjustmentNet !== 0) {
    const sign = adjustmentNet >= 0 ? '+' : '-';
    lines.push(`Adjustment: ${sign}₹${formatIndianCurrency(Math.abs(adjustmentNet))}`);
    for (const adj of adjustments) {
      const adjSign = adj.type === 'plus' ? '+' : '-';
      const noteText = adj.note?.trim() ? ` (${adj.note.trim()})` : '';
      lines.push(`  • ${adjSign}₹${formatIndianCurrency(adj.amount)}${noteText}`);
    }
  }

  lines.push(`*Grand Total: ₹${formatIndianCurrency(grandTotal)}*`);

  if (includeAmountInWords) {
    lines.push(`(${numberToIndianWordsEn(grandTotal)})`);
  }

  return lines.join('\n');
}
