import { jsPDF } from 'jspdf';
import { AccountingExpense, AccountingExpenseCategory } from '../types/accounting';
import { HINDI_MONTH_NAMES_LIST } from '../services/accountingService';
import { loadLogoBase64 } from './invoiceGenerator';
import { renderHtmlToSafeCanvas } from './canvasRenderUtils';
import { formatTodayDdMmYyyy } from './stockExportGenerator';

export type ExpenseExportScope = 'selected_month' | 'all_months';

export interface ExpenseMonthOption {
  monthKey: string; // "YYYY-MM"
  year: number;
  month: number; // 1-12
  labelHindi: string; // "नवंबर 2026"
  labelEn: string; // "November_2026"
  count: number;
  totalAmount: number;
}

export interface ExpenseExportOptions {
  expenses: AccountingExpense[];
  categories: AccountingExpenseCategory[];
  scope: ExpenseExportScope;
  selectedMonthKey: string;
  selectedCategoryId?: string;
  onProgress?: (currentPage: number, totalPages: number) => void;
}

const ENGLISH_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function sanitizeFilePart(raw: string): string {
  return raw
    .trim()
    .replace(/[/\\?%*:|"<>#\s]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function extractExpenseMonthKey(expense: AccountingExpense): string {
  if (expense.date && /^\d{4}-\d{2}/.test(expense.date.trim())) {
    return expense.date.trim().slice(0, 7);
  }
  if (expense.timestamp) {
    const d = new Date(expense.timestamp);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthKeyLabels(monthKey: string): {
  year: number;
  month: number;
  labelHindi: string;
  labelEn: string;
} {
  const [yStr, mStr] = monthKey.split('-');
  const year = parseInt(yStr, 10) || new Date().getFullYear();
  const month = parseInt(mStr, 10) || new Date().getMonth() + 1;
  const hiFull = HINDI_MONTH_NAMES_LIST[month - 1] || `माह ${month}`;
  const hiShort = hiFull.split(' ')[0];
  const enName = ENGLISH_MONTH_NAMES[month - 1] || `Month_${month}`;

  return {
    year,
    month,
    labelHindi: `${hiShort} ${year}`,
    labelEn: `${enName}_${year}`,
  };
}

export function getAvailableExpenseMonths(expenses: AccountingExpense[]): ExpenseMonthOption[] {
  const map = new Map<string, { count: number; totalAmount: number }>();

  // Ensure current month always exists in selector
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  map.set(currentKey, { count: 0, totalAmount: 0 });

  for (const exp of expenses) {
    const key = extractExpenseMonthKey(exp);
    const cur = map.get(key) || { count: 0, totalAmount: 0 };
    cur.count += 1;
    cur.totalAmount += exp.amount || 0;
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .map(([monthKey, stats]) => {
      const labels = formatMonthKeyLabels(monthKey);
      return {
        monthKey,
        year: labels.year,
        month: labels.month,
        labelHindi: labels.labelHindi,
        labelEn: labels.labelEn,
        count: stats.count,
        totalAmount: stats.totalAmount,
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function filterExpensesForExport(options: {
  expenses: AccountingExpense[];
  scope: ExpenseExportScope;
  selectedMonthKey: string;
  selectedCategoryId?: string;
}): AccountingExpense[] {
  const { expenses, scope, selectedMonthKey, selectedCategoryId } = options;

  return expenses
    .filter((exp) => {
      if (selectedCategoryId && selectedCategoryId !== 'all' && exp.categoryId !== selectedCategoryId) {
        return false;
      }
      if (scope === 'selected_month') {
        return extractExpenseMonthKey(exp) === selectedMonthKey;
      }
      return true;
    })
    .sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
}

export function buildExpenseExportFileName(options: {
  scope: ExpenseExportScope;
  selectedMonthKey: string;
  selectedCategoryId?: string;
  categories?: AccountingExpenseCategory[];
  date?: Date;
}): string {
  const { scope, selectedMonthKey, selectedCategoryId, categories = [] } = options;

  let categoryPart = '';
  if (selectedCategoryId && selectedCategoryId !== 'all') {
    const cat = categories.find((c) => c.id === selectedCategoryId);
    const cleanCat = sanitizeFilePart(cat?.name || selectedCategoryId);
    if (cleanCat) {
      categoryPart = `_${cleanCat}`;
    }
  }

  if (scope === 'selected_month') {
    const { labelEn } = formatMonthKeyLabels(selectedMonthKey);
    return `Falsawdiya_Expenses_${labelEn}${categoryPart}.pdf`;
  }

  const todayStr = formatTodayDdMmYyyy(options.date || new Date());
  return `Falsawdiya_All_Months_Expenses_Till_${todayStr}${categoryPart}.pdf`;
}

export interface ExpenseAnalyticsSummary {
  totalAmount: number;
  cashTotal: number;
  onlineTotal: number;
  totalCount: number;
  categoryBreakdown: Array<{
    categoryId: string;
    labelHindi: string;
    amount: number;
    count: number;
    percent: number;
  }>;
  monthBreakdown: Array<{
    monthKey: string;
    labelHindi: string;
    cashAmount: number;
    onlineAmount: number;
    totalAmount: number;
    count: number;
  }>;
}

export function computeExpenseAnalytics(filteredExpenses: AccountingExpense[]): ExpenseAnalyticsSummary {
  let totalAmount = 0;
  let cashTotal = 0;
  let onlineTotal = 0;

  const catMap = new Map<string, { labelHindi: string; amount: number; count: number }>();
  const monthMap = new Map<string, { cashAmount: number; onlineAmount: number; totalAmount: number; count: number }>();

  for (const exp of filteredExpenses) {
    const amt = exp.amount || 0;
    totalAmount += amt;
    if (exp.paymentMode === 'cash') {
      cashTotal += amt;
    } else {
      onlineTotal += amt;
    }

    const catId = exp.categoryId || 'other';
    const curCat = catMap.get(catId) || {
      labelHindi: exp.categoryNameHindi || exp.categoryName || 'अन्य खर्च',
      amount: 0,
      count: 0,
    };
    curCat.amount += amt;
    curCat.count += 1;
    catMap.set(catId, curCat);

    const mKey = extractExpenseMonthKey(exp);
    const curMonth = monthMap.get(mKey) || {
      cashAmount: 0,
      onlineAmount: 0,
      totalAmount: 0,
      count: 0,
    };
    curMonth.totalAmount += amt;
    if (exp.paymentMode === 'cash') {
      curMonth.cashAmount += amt;
    } else {
      curMonth.onlineAmount += amt;
    }
    curMonth.count += 1;
    monthMap.set(mKey, curMonth);
  }

  const categoryBreakdown = Array.from(catMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      labelHindi: data.labelHindi,
      amount: data.amount,
      count: data.count,
      percent: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthBreakdown = Array.from(monthMap.entries())
    .map(([monthKey, data]) => ({
      monthKey,
      labelHindi: formatMonthKeyLabels(monthKey).labelHindi,
      ...data,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  return {
    totalAmount,
    cashTotal,
    onlineTotal,
    totalCount: filteredExpenses.length,
    categoryBreakdown,
    monthBreakdown,
  };
}

function paginateExpenseEntries(
  entries: AccountingExpense[],
  hasMonthSummary: boolean,
  categorySummaryRowsCount: number,
  monthSummaryRowsCount: number
): AccountingExpense[][] {
  // Estimate how much space Page 1 summary sections occupy
  const summaryWeight =
    4.5 +
    Math.min(10, categorySummaryRowsCount) * 0.55 +
    (hasMonthSummary ? 1.5 + Math.min(10, monthSummaryRowsCount) * 0.55 : 0);

  const firstPageRowsCapacity = Math.max(5, Math.floor(20 - summaryWeight));
  const nextPageRowsCapacity = 22;

  const pages: AccountingExpense[][] = [];
  if (entries.length === 0) {
    return [[]];
  }

  let cursor = 0;
  pages.push(entries.slice(0, firstPageRowsCapacity));
  cursor += firstPageRowsCapacity;

  while (cursor < entries.length) {
    pages.push(entries.slice(cursor, cursor + nextPageRowsCapacity));
    cursor += nextPageRowsCapacity;
  }

  return pages;
}

function buildExpensePageHtml(params: {
  pageEntries: AccountingExpense[];
  startSerial: number;
  pageNum: number;
  totalPages: number;
  scope: ExpenseExportScope;
  selectedMonthKey: string;
  selectedCategoryLabel?: string;
  analytics: ExpenseAnalyticsSummary;
  logoDataUrl: string;
  printedDate: string;
}): string {
  const {
    pageEntries,
    startSerial,
    pageNum,
    totalPages,
    scope,
    selectedMonthKey,
    selectedCategoryLabel,
    analytics,
    logoDataUrl,
    printedDate,
  } = params;

  const isFirstPage = pageNum === 1;
  const isLastPage = pageNum === totalPages;
  const periodLabel =
    scope === 'selected_month'
      ? `माह: ${formatMonthKeyLabels(selectedMonthKey).labelHindi}`
      : 'सभी महीनों की संयुक्त रिपोर्ट (All Months Combined)';

  const reportBadgeText =
    scope === 'selected_month'
      ? 'मासिक दुकान खर्च रिपोर्ट (Monthly Expense)'
      : 'संपूर्ण दुकान खर्च रिपोर्ट (All Months Expense)';

  const categorySummaryHtml =
    isFirstPage && analytics.categoryBreakdown.length > 0
      ? `
        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 800; color: #374151; margin-bottom: 6px; text-transform: uppercase;">
            श्रेणी-वार खर्च सारांश (Category-wise Summary)
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; font-size: 10.5px;">
            <thead>
              <tr style="background-color: #f3f4f6; color: #374151;">
                <th style="padding: 6px 8px; text-align: left;">खर्च की श्रेणी</th>
                <th style="padding: 6px 8px; text-align: center; width: 70px;">प्रविष्टि</th>
                <th style="padding: 6px 8px; text-align: center; width: 70px;">हिस्सा %</th>
                <th style="padding: 6px 8px; text-align: right; width: 115px;">कुल राशि (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.categoryBreakdown
                .map(
                  (c, idx) => `
                  <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'}; border-top: 1px solid #f3f4f6;">
                    <td style="padding: 6px 8px; font-weight: 700; color: #111827;">${escapeHtml(c.labelHindi)}</td>
                    <td style="padding: 6px 8px; text-align: center; color: #4b5563;">${c.count}</td>
                    <td style="padding: 6px 8px; text-align: center; color: #4b5563; font-weight: 600;">${c.percent}%</td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #be123c;">₹${c.amount.toLocaleString('en-IN')}</td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      : '';

  const monthSummaryHtml =
    isFirstPage && scope === 'all_months' && analytics.monthBreakdown.length > 0
      ? `
        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 800; color: #374151; margin-bottom: 6px; text-transform: uppercase;">
            माह-वार खर्च सारांश (Month-wise Summary)
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; font-size: 10.5px;">
            <thead>
              <tr style="background-color: #fff1f2; color: #881337;">
                <th style="padding: 6px 8px; text-align: left;">माह (Month)</th>
                <th style="padding: 6px 8px; text-align: center; width: 65px;">प्रविष्टि</th>
                <th style="padding: 6px 8px; text-align: right; width: 95px;">नकद (Cash)</th>
                <th style="padding: 6px 8px; text-align: right; width: 95px;">ऑनलाइन (UPI)</th>
                <th style="padding: 6px 8px; text-align: right; width: 110px;">माह कुल (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.monthBreakdown
                .map(
                  (m, idx) => `
                  <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'}; border-top: 1px solid #f3f4f6;">
                    <td style="padding: 6px 8px; font-weight: 800; color: #111827;">${escapeHtml(m.labelHindi)}</td>
                    <td style="padding: 6px 8px; text-align: center; color: #4b5563;">${m.count}</td>
                    <td style="padding: 6px 8px; text-align: right; color: #047857; font-weight: 700;">₹${m.cashAmount.toLocaleString('en-IN')}</td>
                    <td style="padding: 6px 8px; text-align: right; color: #1d4ed8; font-weight: 700;">₹${m.onlineAmount.toLocaleString('en-IN')}</td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 900; color: #be123c;">₹${m.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      : '';

  const entryRowsHtml =
    pageEntries.length === 0
      ? `
        <tr>
          <td colspan="6" style="padding: 24px; text-align: center; color: #6b7280; font-size: 11.5px;">
            इस अवधि में कोई खर्च दर्ज नहीं है।
          </td>
        </tr>
      `
      : pageEntries
          .map((exp, idx) => {
            const serial = startSerial + idx + 1;
            const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
            const modeText = exp.paymentMode === 'cash' ? 'नकद (Cash)' : 'ऑनलाइन (UPI)';
            const detailsParts: string[] = [];
            if (exp.recipientName?.trim()) {
              detailsParts.push(`किसे दिया: ${exp.recipientName.trim()}`);
            }
            if (exp.description?.trim()) {
              detailsParts.push(exp.description.trim());
            }
            const detailText = detailsParts.length > 0 ? detailsParts.join(' · ') : '-';

            return `
              <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
                <td style="padding: 7px 6px; text-align: center; color: #6b7280; font-weight: 700; font-size: 10.5px;">${serial}</td>
                <td style="padding: 7px 6px; font-weight: 700; color: #111827; font-size: 10.5px; white-space: nowrap;">${escapeHtml(
                  exp.date || '-'
                )}</td>
                <td style="padding: 7px 8px; font-weight: 700; color: #1f2937; font-size: 10.5px;">${escapeHtml(
                  exp.categoryNameHindi || exp.categoryName || 'अन्य'
                )}</td>
                <td style="padding: 7px 8px; color: #374151; font-size: 10.5px; line-height: 1.4;">${escapeHtml(
                  detailText
                )}</td>
                <td style="padding: 7px 6px; text-align: center; font-weight: 700; color: ${
                  exp.paymentMode === 'cash' ? '#047857' : '#1d4ed8'
                }; font-size: 10px; white-space: nowrap;">${modeText}</td>
                <td style="padding: 7px 8px; text-align: right; font-weight: 800; color: #be123c; font-size: 11px; white-space: nowrap;">₹${(
                  exp.amount || 0
                ).toLocaleString('en-IN')}</td>
              </tr>
            `;
          })
          .join('');

  const grandTotalRowHtml = isLastPage
    ? `
      <tr style="background-color: #fff1f2; border-top: 2px solid #be123c;">
        <td colspan="5" style="padding: 9px 10px; text-align: right; font-weight: 900; font-size: 11.5px; color: #881337;">
          कुल योग (${analytics.totalCount} प्रविष्टियां | नकद: ₹${analytics.cashTotal.toLocaleString(
            'en-IN'
          )} | ऑनलाइन: ₹${analytics.onlineTotal.toLocaleString('en-IN')}):
        </td>
        <td style="padding: 9px 8px; text-align: right; font-weight: 900; font-size: 13px; color: #be123c; white-space: nowrap;">
          ₹${analytics.totalAmount.toLocaleString('en-IN')}
        </td>
      </tr>
    `
    : '';

  const headerHtml = isFirstPage
    ? `
      <div style="border-bottom: 2px solid #be123c; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${logoDataUrl}" alt="Logo" style="width: 48px; height: 48px; object-fit: contain; border-radius: 10px; border: 1px solid #e5e7eb;" />
            <div>
              <h1 style="margin: 0; font-size: 21px; font-weight: 900; color: #111827; line-height: 1.2;">फल्सावदिया कृषि बाजार</h1>
              <div style="font-size: 11px; font-weight: 700; color: #2d5a27; margin-top: 2px;">किसान का भरोसा, हमारी पहचान · मो. 8982338046</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #4b5563; margin-top: 5px;">
            पता: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर – (458883)
          </div>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; background-color: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 800; margin-bottom: 5px;">
            ${reportBadgeText}
          </div>
          <div style="font-size: 10.5px; color: #111827; font-weight: 800;">${escapeHtml(periodLabel)}</div>
          ${
            selectedCategoryLabel
              ? `<div style="font-size: 10px; color: #be123c; font-weight: 700;">श्रेणी: ${escapeHtml(
                  selectedCategoryLabel
                )}</div>`
              : ''
          }
          <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">प्रिंट दिनांक: ${printedDate}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 9.5px; color: #9f1239; font-weight: 700;">कुल खर्च (Total)</div>
          <div style="font-size: 15px; font-weight: 900; color: #be123c; margin-top: 2px;">₹${analytics.totalAmount.toLocaleString(
            'en-IN'
          )}</div>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 9.5px; color: #065f46; font-weight: 700;">नकद (Cash)</div>
          <div style="font-size: 15px; font-weight: 900; color: #047857; margin-top: 2px;">₹${analytics.cashTotal.toLocaleString(
            'en-IN'
          )}</div>
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 9.5px; color: #1e40af; font-weight: 700;">ऑनलाइन (UPI)</div>
          <div style="font-size: 15px; font-weight: 900; color: #1d4ed8; margin-top: 2px;">₹${analytics.onlineTotal.toLocaleString(
            'en-IN'
          )}</div>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">कुल प्रविष्टियां</div>
          <div style="font-size: 15px; font-weight: 900; color: #111827; margin-top: 2px;">${
            analytics.totalCount
          }</div>
        </div>
      </div>
    `
    : `
      <div style="border-bottom: 1.5px solid #be123c; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 13px; font-weight: 900; color: #9f1239;">
          फल्सावदिया कृषि बाजार — ${reportBadgeText} (जारी)
        </div>
        <div style="font-size: 10.5px; color: #4b5563; font-weight: 700;">
          ${escapeHtml(periodLabel)} · ${printedDate}
        </div>
      </div>
    `;

  return `
    <div style="
      width: 794px;
      min-width: 794px;
      max-width: 794px;
      background-color: #ffffff;
      color: #111827;
      padding: 24px 28px;
      box-sizing: border-box;
      font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    ">
      ${headerHtml}
      ${categorySummaryHtml}
      ${monthSummaryHtml}

      <div style="font-size: 11px; font-weight: 800; color: #374151; margin-bottom: 6px; text-transform: uppercase;">
        दिनांक-वार खर्च विवरण (Expense Register)
      </div>
      <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 10.5px;">
        <thead>
          <tr style="background-color: #881337; color: #ffffff;">
            <th style="padding: 8px 6px; text-align: center; width: 32px;">क्र.</th>
            <th style="padding: 8px 6px; text-align: left; width: 82px;">दिनांक</th>
            <th style="padding: 8px 8px; text-align: left; width: 155px;">खर्च श्रेणी</th>
            <th style="padding: 8px 8px; text-align: left; width: 255px;">विवरण / प्राप्तकर्ता</th>
            <th style="padding: 8px 6px; text-align: center; width: 92px;">माध्यम</th>
            <th style="padding: 8px 8px; text-align: right; width: 98px;">राशि (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${entryRowsHtml}
          ${grandTotalRowHtml}
        </tbody>
      </table>

      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280;">
        <span>फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर) · दुकान खर्च लेखा रिपोर्ट</span>
        <span style="font-weight: 800; color: #1f2937;">पेज ${pageNum} / ${totalPages}</span>
      </div>
    </div>
  `;
}

export async function generateExpenseExportPdfBlob(
  options: ExpenseExportOptions
): Promise<{ success: boolean; blob?: Blob; fileName: string; count: number; totalAmount: number; totalPages: number; error?: string }> {
  const { expenses, categories, scope, selectedMonthKey, selectedCategoryId, onProgress } = options;

  const fileName = buildExpenseExportFileName({
    scope,
    selectedMonthKey,
    selectedCategoryId,
    categories,
  });

  const filtered = filterExpensesForExport({
    expenses,
    scope,
    selectedMonthKey,
    selectedCategoryId,
  });

  if (filtered.length === 0) {
    return {
      success: false,
      fileName,
      count: 0,
      totalAmount: 0,
      totalPages: 0,
      error: 'चयनित अवधि में एक्सपोर्ट करने के लिए कोई खर्च दर्ज नहीं है।',
    };
  }

  try {
    let logoDataUrl = '/icon-192.png';
    try {
      logoDataUrl = await loadLogoBase64('/icon-192.png');
    } catch {
      // fallback already set
    }

    const analytics = computeExpenseAnalytics(filtered);
    const selectedCategoryObj =
      selectedCategoryId && selectedCategoryId !== 'all'
        ? categories.find((c) => c.id === selectedCategoryId)
        : undefined;
    const selectedCategoryLabel = selectedCategoryObj
      ? selectedCategoryObj.hindiName || selectedCategoryObj.name
      : undefined;

    const pages = paginateExpenseEntries(
      filtered,
      scope === 'all_months',
      analytics.categoryBreakdown.length,
      analytics.monthBreakdown.length
    );

    const totalPages = pages.length;
    const printedDate = formatTodayDdMmYyyy(new Date());

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    let runningSerial = 0;

    for (let i = 0; i < totalPages; i++) {
      onProgress?.(i + 1, totalPages);

      const pageEntries = pages[i];
      const pageHtml = buildExpensePageHtml({
        pageEntries,
        startSerial: runningSerial,
        pageNum: i + 1,
        totalPages,
        scope,
        selectedMonthKey,
        selectedCategoryLabel,
        analytics,
        logoDataUrl,
        printedDate,
      });
      runningSerial += pageEntries.length;

      const canvas = await renderHtmlToSafeCanvas({
        html: pageHtml,
        width: 794,
        scale: 2,
        timeoutMs: 12000,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.94);

      let drawW = printableWidth;
      let drawH = (canvas.height * printableWidth) / canvas.width;
      if (drawH > printableHeight) {
        const ratio = printableHeight / drawH;
        drawW *= ratio;
        drawH = printableHeight;
      }
      const x = margin + (printableWidth - drawW) / 2;
      const y = margin;

      if (i > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', x, y, drawW, drawH, undefined, 'FAST');

      // Release offscreen canvas bitmap memory immediately for low-RAM mobile/tablet devices
      canvas.width = 0;
      canvas.height = 0;

      if (i < totalPages - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }

    const blob = pdf.output('blob');
    return {
      success: true,
      blob,
      fileName,
      count: filtered.length,
      totalAmount: analytics.totalAmount,
      totalPages,
    };
  } catch (err: unknown) {
    console.error('Error generating Expense Export PDF:', err);
    return {
      success: false,
      fileName,
      count: filtered.length,
      totalAmount: 0,
      totalPages: 0,
      error: err instanceof Error ? err.message : 'खर्च रिपोर्ट PDF बनाने में त्रुटि हुई।',
    };
  }
}

export function formatExpenseReportText(options: {
  expenses: AccountingExpense[];
  categories: AccountingExpenseCategory[];
  scope: ExpenseExportScope;
  selectedMonthKey: string;
  selectedCategoryId?: string;
}): string {
  const { expenses, categories, scope, selectedMonthKey, selectedCategoryId } = options;
  const filtered = filterExpensesForExport({
    expenses,
    scope,
    selectedMonthKey,
    selectedCategoryId,
  });

  const analytics = computeExpenseAnalytics(filtered);
  const periodLabel =
    scope === 'selected_month'
      ? `माह: ${formatMonthKeyLabels(selectedMonthKey).labelHindi}`
      : 'सभी महीनों की संयुक्त खर्च रिपोर्ट';

  const catLabel =
    selectedCategoryId && selectedCategoryId !== 'all'
      ? categories.find((c) => c.id === selectedCategoryId)?.hindiName || selectedCategoryId
      : 'सभी श्रेणियां';

  const lines: string[] = [
    '*फल्सावदिया कृषि बाजार*',
    'किसान का भरोसा, हमारी पहचान | मो: 8982338046',
    '----------------------------------',
    '*दुकान खर्च रिपोर्ट (Expense Report)*',
    periodLabel,
    `श्रेणी: ${catLabel}`,
    `प्रिंट दिनांक: ${formatTodayDdMmYyyy(new Date())}`,
    '----------------------------------',
    `*कुल खर्च: ₹${analytics.totalAmount.toLocaleString('en-IN')}* (${analytics.totalCount} प्रविष्टियां)`,
    `नकद (Cash): ₹${analytics.cashTotal.toLocaleString('en-IN')}`,
    `ऑनलाइन (UPI): ₹${analytics.onlineTotal.toLocaleString('en-IN')}`,
    '----------------------------------',
  ];

  if (filtered.length === 0) {
    lines.push('इस अवधि में कोई खर्च दर्ज नहीं है।');
    return lines.join('\n');
  }

  lines.push('*श्रेणी-वार सारांश:*');
  analytics.categoryBreakdown.forEach((c) => {
    lines.push(
      `- ${c.labelHindi}: ₹${c.amount.toLocaleString('en-IN')} (${c.count} बार, ${c.percent}%)`
    );
  });

  if (scope === 'all_months' && analytics.monthBreakdown.length > 0) {
    lines.push('');
    lines.push('*माह-वार सारांश:*');
    analytics.monthBreakdown.forEach((m) => {
      lines.push(
        `- ${m.labelHindi}: ₹${m.totalAmount.toLocaleString('en-IN')} (${m.count} बार | नकद ₹${m.cashAmount.toLocaleString(
          'en-IN'
        )}, UPI ₹${m.onlineAmount.toLocaleString('en-IN')})`
      );
    });
  }

  lines.push('');
  lines.push('*खर्च विवरण (Date-wise):*');
  filtered.forEach((exp, idx) => {
    const mode = exp.paymentMode === 'cash' ? 'नकद' : 'ऑनलाइन';
    const extra = [exp.recipientName?.trim(), exp.description?.trim()].filter(Boolean).join(' - ');
    lines.push(
      `${idx + 1}. ${exp.date} | *${exp.categoryNameHindi || exp.categoryName}* | ₹${(
        exp.amount || 0
      ).toLocaleString('en-IN')} (${mode})${extra ? `\n   विवरण: ${extra}` : ''}`
    );
  });

  lines.push('----------------------------------');
  lines.push('फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर)');

  return lines.join('\n');
}
