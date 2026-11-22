import { jsPDF } from 'jspdf';
import {
  AccountingProduct,
  PackagingVariant,
  StockManagementConfig,
} from '../types/accounting';
import { ACCOUNTING_PRODUCT_CATEGORIES } from '../components/accounting/ProductBasicInfoFields';
import { getProductVariants, formatBaseUnitDisplay } from './agriPackagingUtils';
import { loadLogoBase64 } from './invoiceGenerator';
import { renderHtmlToSafeCanvas } from './canvasRenderUtils';
import {
  calculateProductHealthSummary,
  calculateVariantStockSummary,
  EnrichedBatch,
  formatBatchDateHindiDisplay,
} from './batchInventoryUtils';
import { formatHindiDate } from '../lib/dateUtils';

export type StockExportScope = 'complete' | 'category_combined' | 'single_category';
export type StockPriceMode = 'admin_margin' | 'rate_list';
export type StockReportType =
  | 'standard_stock'
  | 'batch_detailed'
  | 'near_expiry'
  | 'expired_stock'
  | 'low_stock';

export interface StockExportOptions {
  products: AccountingProduct[];
  scope: StockExportScope;
  selectedCategoryId?: string;
  priceMode: StockPriceMode;
  reportType?: StockReportType;
  stockManagementEnabled?: boolean;
  stockConfig?: StockManagementConfig;
  onProgress?: (currentPage: number, totalPages: number) => void;
}

interface EnrichedStockProduct {
  product: AccountingProduct;
  variants: PackagingVariant[];
  categoryId: string;
  categoryLabelHi: string;
  categorySlugEn: string;
}

export interface BatchReportRow {
  serialNo: number;
  product: AccountingProduct;
  variant: PackagingVariant;
  categoryLabelHi: string;
  batch?: EnrichedBatch;
  isUnbatched?: boolean;
  batchNumberDisplay: string;
  mfgDisplay: string;
  expiryDisplay: string;
  statusLabel: string;
  statusColor: string;
  daysRemaining: number;
  qtyPacks: number;
  purchaseCost: number;
  sellingPrice: number;
  valuation: number;
}

export interface LowStockReportRow {
  serialNo: number;
  product: AccountingProduct;
  variant: PackagingVariant;
  categoryLabelHi: string;
  saleablePacks: number;
  expiredPacks: number;
  threshold: number;
  suggestedOrderPacks: number;
  costPrice: number;
  sellingPrice: number;
}

const CATEGORY_ENGLISH_SLUGS: Record<string, string> = {
  pesticides: 'Pesticides',
  fungicides: 'Fungicides',
  herbicides: 'Herbicides',
  medicines: 'PGR_Medicines',
  fertilizers: 'Fertilizers',
  micronutrients: 'Micronutrients',
  seeds: 'Seeds',
  implements: 'Implements',
  other: 'Other',
};

function sanitizeFilePart(raw: string): string {
  return raw
    .trim()
    .replace(/[/\\?%*:|"<>#\s]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function formatTodayDdMmYyyy(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function getStockCategoryMeta(categoryId: string): {
  id: string;
  nameHindi: string;
  shortLabel: string;
  slugEn: string;
} {
  const found = ACCOUNTING_PRODUCT_CATEGORIES.find((c) => c.id === categoryId);
  if (found) {
    return {
      id: found.id,
      nameHindi: found.nameHindi,
      shortLabel: found.shortLabel,
      slugEn: CATEGORY_ENGLISH_SLUGS[found.id] || sanitizeFilePart(found.id) || 'Category',
    };
  }
  const fallback = categoryId || 'other';
  return {
    id: fallback,
    nameHindi: fallback,
    shortLabel: fallback,
    slugEn: sanitizeFilePart(fallback) || 'Other',
  };
}

export function buildStockExportFileName(options: {
  scope: StockExportScope;
  selectedCategoryId?: string;
  priceMode: StockPriceMode;
  reportType?: StockReportType;
  date?: Date;
}): string {
  const dateStr = formatTodayDdMmYyyy(options.date || new Date());
  const isRateList = options.priceMode === 'rate_list';
  const rType: StockReportType = isRateList ? 'standard_stock' : options.reportType || 'standard_stock';

  const catPart =
    options.scope === 'single_category' && options.selectedCategoryId
      ? `_${getStockCategoryMeta(options.selectedCategoryId).slugEn}`
      : '';

  if (rType === 'batch_detailed') {
    return `Falsawdiya_Batch_Stock_Report${catPart}_${dateStr}.pdf`;
  }
  if (rType === 'near_expiry') {
    return `Falsawdiya_Near_Expiry_Report${catPart}_${dateStr}.pdf`;
  }
  if (rType === 'expired_stock') {
    return `Falsawdiya_Expired_Stock${catPart}_${dateStr}.pdf`;
  }
  if (rType === 'low_stock') {
    return `Falsawdiya_Low_Stock_Report${catPart}_${dateStr}.pdf`;
  }

  if (options.scope === 'single_category' && options.selectedCategoryId) {
    const catSlug = getStockCategoryMeta(options.selectedCategoryId).slugEn;
    return isRateList
      ? `Falsawdiya_Stock_Rate_List_${catSlug}_${dateStr}.pdf`
      : `Falsawdiya_Stock_${catSlug}_${dateStr}.pdf`;
  }

  if (options.scope === 'category_combined') {
    return isRateList
      ? `Falsawdiya_Stock_Rate_List_Category_Wise_${dateStr}.pdf`
      : `Falsawdiya_Category_Wise_Stock_${dateStr}.pdf`;
  }

  return isRateList
    ? `Falsawdiya_Stock_Rate_List_Complete_${dateStr}.pdf`
    : `Falsawdiya_Complete_Stock_List_${dateStr}.pdf`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function prepareEnrichedProducts(
  products: AccountingProduct[],
  scope: StockExportScope,
  selectedCategoryId?: string
): EnrichedStockProduct[] {
  const filtered =
    scope === 'single_category' && selectedCategoryId && selectedCategoryId !== 'all'
      ? products.filter((p) => (p.category || 'other') === selectedCategoryId)
      : products;

  const enriched: EnrichedStockProduct[] = filtered.map((p) => {
    const catId = p.category || 'other';
    const meta = getStockCategoryMeta(catId);
    return {
      product: p,
      variants: getProductVariants(p),
      categoryId: catId,
      categoryLabelHi: meta.nameHindi,
      categorySlugEn: meta.slugEn,
    };
  });

  if (scope === 'category_combined') {
    const catOrderMap = new Map<string, number>();
    ACCOUNTING_PRODUCT_CATEGORIES.forEach((c, idx) => catOrderMap.set(c.id, idx));

    return enriched.sort((a, b) => {
      const orderA = catOrderMap.has(a.categoryId) ? catOrderMap.get(a.categoryId)! : 999;
      const orderB = catOrderMap.has(b.categoryId) ? catOrderMap.get(b.categoryId)! : 999;
      if (orderA !== orderB) return orderA - orderB;
      if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId);
      return (a.product.hindiName || a.product.name || '').localeCompare(
        b.product.hindiName || b.product.name || '',
        'hi'
      );
    });
  }

  return enriched.sort((a, b) =>
    (a.product.hindiName || a.product.name || '').localeCompare(
      b.product.hindiName || b.product.name || '',
      'hi'
    )
  );
}

/**
 * Extracts rows for Batch-wise, Near Expiry, and Expired Stock reports
 */
export function buildBatchReportRows(params: {
  products: AccountingProduct[];
  scope: StockExportScope;
  selectedCategoryId?: string;
  reportType: 'batch_detailed' | 'near_expiry' | 'expired_stock';
  defaultLowThreshold?: number;
  expiryWarningDays?: number;
}): BatchReportRow[] {
  const {
    products,
    scope,
    selectedCategoryId,
    reportType,
    defaultLowThreshold = 10,
    expiryWarningDays = 122,
  } = params;

  const enriched = prepareEnrichedProducts(products, scope, selectedCategoryId);
  const rows: BatchReportRow[] = [];

  for (const entry of enriched) {
    for (const v of entry.variants) {
      const summary = calculateVariantStockSummary(
        entry.product,
        v,
        defaultLowThreshold,
        expiryWarningDays
      );

      for (const b of summary.batches) {
        const qty = Math.max(0, Number(b.remainingPackQuantity) || 0);
        if (b.status === 'expired_written_off' || qty <= 0) continue;

        if (reportType === 'near_expiry') {
          if (b.alert.status !== 'critical' && b.alert.status !== 'warning') continue;
        } else if (reportType === 'expired_stock') {
          if (b.alert.status !== 'expired') continue;
        }

        const statusColor =
          b.alert.status === 'expired'
            ? '#dc2626'
            : b.alert.status === 'critical'
            ? '#b45309'
            : b.alert.status === 'warning'
            ? '#d97706'
            : b.alert.status === 'no_date'
            ? '#6b7280'
            : '#047857';

        rows.push({
          serialNo: 0,
          product: entry.product,
          variant: v,
          categoryLabelHi: entry.categoryLabelHi,
          batch: b,
          batchNumberDisplay: b.batchNumber || 'बिना बैच नं.',
          mfgDisplay: b.manufacturingDate ? formatBatchDateHindiDisplay(b.manufacturingDate, b.mfgDisplay) : '-',
          expiryDisplay: b.expiryDate ? formatBatchDateHindiDisplay(b.expiryDate, b.expiryDisplay) : 'तिथि नहीं',
          statusLabel: b.alert.labelHindi,
          statusColor,
          daysRemaining: b.alert.daysRemaining,
          qtyPacks: qty,
          purchaseCost: b.effectivePurchaseCost,
          sellingPrice: v.sellingPrice || entry.product.defaultSellingPrice || 0,
          valuation: Math.round(qty * b.effectivePurchaseCost),
        });
      }

      if (reportType === 'batch_detailed' && summary.unbatchedPacks > 0) {
        const fallbackCost = Number(v.costPrice) || Number(entry.product.costPrice) || 0;
        rows.push({
          serialNo: 0,
          product: entry.product,
          variant: v,
          categoryLabelHi: entry.categoryLabelHi,
          isUnbatched: true,
          batchNumberDisplay: 'सामान्य (बिना बैच)',
          mfgDisplay: '-',
          expiryDisplay: 'तिथि नहीं',
          statusLabel: 'बैच प्रविष्टि शेष',
          statusColor: '#6b7280',
          daysRemaining: 9999,
          qtyPacks: summary.unbatchedPacks,
          purchaseCost: fallbackCost,
          sellingPrice: v.sellingPrice || entry.product.defaultSellingPrice || 0,
          valuation: Math.round(summary.unbatchedPacks * fallbackCost),
        });
      }
    }
  }

  if (reportType === 'near_expiry' || reportType === 'expired_stock') {
    rows.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  return rows.map((r, i) => ({ ...r, serialNo: i + 1 }));
}

export function buildLowStockReportRows(params: {
  products: AccountingProduct[];
  scope: StockExportScope;
  selectedCategoryId?: string;
  defaultLowThreshold?: number;
  expiryWarningDays?: number;
}): LowStockReportRow[] {
  const {
    products,
    scope,
    selectedCategoryId,
    defaultLowThreshold = 10,
    expiryWarningDays = 122,
  } = params;

  const enriched = prepareEnrichedProducts(products, scope, selectedCategoryId);
  const rows: LowStockReportRow[] = [];

  for (const entry of enriched) {
    for (const v of entry.variants) {
      const summary = calculateVariantStockSummary(
        entry.product,
        v,
        defaultLowThreshold,
        expiryWarningDays
      );
      if (!summary.isLowStock && !summary.isOutOfStock) continue;

      const targetMinimumOrder = Math.max(1, summary.lowStockThreshold * 2 - summary.saleablePacks);
      rows.push({
        serialNo: 0,
        product: entry.product,
        variant: v,
        categoryLabelHi: entry.categoryLabelHi,
        saleablePacks: summary.saleablePacks,
        expiredPacks: summary.batchedExpiredPacks,
        threshold: summary.lowStockThreshold,
        suggestedOrderPacks: targetMinimumOrder,
        costPrice: v.costPrice || entry.product.costPrice || 0,
        sellingPrice: v.sellingPrice || entry.product.defaultSellingPrice || 0,
      });
    }
  }

  // Sort: Out-of-stock (0) first, then lowest remaining qty
  rows.sort((a, b) => a.saleablePacks - b.saleablePacks);

  return rows.map((r, i) => ({ ...r, serialNo: i + 1 }));
}

type PageRowItem =
  | {
      kind: 'category_header';
      categoryId: string;
      categoryLabel: string;
      count: number;
      weight: number;
    }
  | {
      kind: 'product';
      serialNo: number;
      item: EnrichedStockProduct;
      weight: number;
    };

function estimateProductWeight(item: EnrichedStockProduct): number {
  const vCount = Math.max(1, item.variants.length);
  const hasDose = Boolean(
    item.product.standardDoseInfo?.verifiedDosePer20LTank ||
      item.product.standardDoseInfo?.verifiedDosePerBigha
  );
  const hasSubName = Boolean(
    item.product.name && item.product.name.trim() !== item.product.hindiName?.trim()
  );
  return 1.0 + Math.max(0, vCount - 1) * 0.42 + (hasDose ? 0.25 : 0) + (hasSubName ? 0.15 : 0);
}

function paginateStockRows(
  enriched: EnrichedStockProduct[],
  scope: StockExportScope
): PageRowItem[][] {
  const rows: PageRowItem[] = [];

  if (scope === 'category_combined') {
    const categoryCounts = new Map<string, number>();
    for (const entry of enriched) {
      categoryCounts.set(entry.categoryId, (categoryCounts.get(entry.categoryId) || 0) + 1);
    }

    let lastCat = '';
    let serial = 0;
    for (const entry of enriched) {
      if (entry.categoryId !== lastCat) {
        lastCat = entry.categoryId;
        rows.push({
          kind: 'category_header',
          categoryId: entry.categoryId,
          categoryLabel: entry.categoryLabelHi,
          count: categoryCounts.get(entry.categoryId) || 0,
          weight: 1.15,
        });
      }
      serial += 1;
      rows.push({
        kind: 'product',
        serialNo: serial,
        item: entry,
        weight: estimateProductWeight(entry),
      });
    }
  } else {
    enriched.forEach((entry, idx) => {
      rows.push({
        kind: 'product',
        serialNo: idx + 1,
        item: entry,
        weight: estimateProductWeight(entry),
      });
    });
  }

  const pages: PageRowItem[][] = [];
  let currentPage: PageRowItem[] = [];
  let currentWeight = 0;

  const firstPageLimit = 14.5;
  const nextPageLimit = 19.5;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const limit = pages.length === 0 ? firstPageLimit : nextPageLimit;

    // Avoid orphaned category header at the bottom of a page
    const nextRowWeight =
      row.kind === 'category_header' && i + 1 < rows.length ? rows[i + 1].weight : 0;
    const effectiveNeeded =
      row.kind === 'category_header' ? row.weight + nextRowWeight : row.weight;

    if (currentPage.length > 0 && currentWeight + effectiveNeeded > limit) {
      pages.push(currentPage);
      currentPage = [row];
      currentWeight = row.weight;
    } else {
      currentPage.push(row);
      currentWeight += row.weight;
    }
  }

  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  return pages;
}

function paginateFlatRows<T>(rows: T[], firstPageCount = 13, nextPageCount = 18): T[][] {
  if (rows.length === 0) return [[]];
  const pages: T[][] = [];
  let idx = 0;
  pages.push(rows.slice(0, firstPageCount));
  idx = firstPageCount;
  while (idx < rows.length) {
    pages.push(rows.slice(idx, idx + nextPageCount));
    idx += nextPageCount;
  }
  return pages;
}

function buildReportHeaderHtml(params: {
  isFirstPage: boolean;
  docTitleText: string;
  scopeBadgeText: string;
  printedDate: string;
  logoDataUrl: string;
  summaryCardsHtml: string;
  accentColor?: string;
}): string {
  const {
    isFirstPage,
    docTitleText,
    scopeBadgeText,
    printedDate,
    logoDataUrl,
    summaryCardsHtml,
    accentColor = '#2d5a27',
  } = params;

  if (!isFirstPage) {
    return `
      <div style="border-bottom: 1.5px solid ${accentColor}; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 13px; font-weight: 900; color: #1b4316;">
          फल्सावदिया कृषि बाजार — ${escapeHtml(docTitleText)} (जारी)
        </div>
        <div style="font-size: 10.5px; color: #4b5563; font-weight: 700;">
          ${escapeHtml(scopeBadgeText)} · ${printedDate}
        </div>
      </div>
    `;
  }

  return `
    <div style="border-bottom: 2px solid ${accentColor}; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${logoDataUrl}" alt="Logo" style="width: 48px; height: 48px; object-fit: contain; border-radius: 10px; border: 1px solid #e5e7eb;" />
          <div>
            <h1 style="margin: 0; font-size: 21px; font-weight: 900; color: #1b4316; line-height: 1.2;">फल्सावदिया कृषि बाजार</h1>
            <div style="font-size: 11px; font-weight: 700; color: #2d5a27; margin-top: 2px;">किसान का भरोसा, हमारी पहचान · मो. 8982338046</div>
          </div>
        </div>
        <div style="font-size: 10px; color: #4b5563; margin-top: 5px;">
          पता: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर – (458883)
        </div>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 800; margin-bottom: 5px;">
          ${escapeHtml(docTitleText)}
        </div>
        <div style="font-size: 10.5px; color: #374151; font-weight: 700;">${escapeHtml(scopeBadgeText)}</div>
        <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">प्रिंट दिनांक: ${printedDate}</div>
      </div>
    </div>
    ${summaryCardsHtml}
  `;
}

function buildStockPageHtml(params: {
  pageRows: PageRowItem[];
  pageNum: number;
  totalPages: number;
  scope: StockExportScope;
  selectedCategoryId?: string;
  priceMode: StockPriceMode;
  stockManagementEnabled: boolean;
  defaultLowThreshold: number;
  expiryWarningDays: number;
  totalProducts: number;
  totalVariants: number;
  totalCategories: number;
  totalStockPacks: number;
  totalStockValue: number;
  avgMarginPercent: number;
  logoDataUrl: string;
  printedDate: string;
}): string {
  const {
    pageRows,
    pageNum,
    totalPages,
    scope,
    selectedCategoryId,
    priceMode,
    stockManagementEnabled,
    defaultLowThreshold,
    expiryWarningDays,
    totalProducts,
    totalVariants,
    totalCategories,
    totalStockPacks,
    totalStockValue,
    avgMarginPercent,
    logoDataUrl,
    printedDate,
  } = params;

  const isAdminMode = priceMode === 'admin_margin';
  const showStockQty = stockManagementEnabled && isAdminMode;
  const isFirstPage = pageNum === 1;

  const scopeBadgeText =
    scope === 'single_category' && selectedCategoryId
      ? `श्रेणी: ${getStockCategoryMeta(selectedCategoryId).nameHindi}`
      : scope === 'category_combined'
      ? 'सभी श्रेणियां (Category-wise Combined)'
      : 'संपूर्ण स्टॉक सूची (Complete List)';

  const docTitleText = isAdminMode
    ? 'स्टॉक उत्पाद व मूल्य सूची (Stock & Margin Report)'
    : 'उत्पाद पैकेजिंग व बिक्री दर सूची (Product Rate List)';

  const colCount = isAdminMode ? 6 : 5;

  const tableRowsHtml =
    pageRows.length === 0
      ? `
        <tr>
          <td colspan="${colCount}" style="padding: 28px; text-align: center; color: #6b7280; font-size: 12px;">
            चयनित श्रेणी में कोई उत्पाद उपलब्ध नहीं है।
          </td>
        </tr>
      `
      : pageRows
          .map((row, rIdx) => {
            if (row.kind === 'category_header') {
              return `
                <tr style="background-color: #ecfdf5; border-top: 1.5px solid #047857; border-bottom: 1px solid #a7f3d0;">
                  <td colspan="${colCount}" style="padding: 8px 12px; font-weight: 800; font-size: 12px; color: #064e3b;">
                    <span>${escapeHtml(row.categoryLabel)}</span>
                    <span style="float: right; font-size: 11px; color: #047857; font-weight: 700;">
                      कुल उत्पाद: ${row.count}
                    </span>
                  </td>
                </tr>
              `;
            }

            const { product, variants, categoryLabelHi } = row.item;
            const bg = rIdx % 2 === 0 ? '#ffffff' : '#f9fafb';
            const formText =
              product.productType === 'liquid'
                ? 'तरल (Liquid)'
                : product.productType === 'powder_granule'
                ? 'पाउडर/दानेदार'
                : 'अन्य';

            const doseParts: string[] = [];
            if (product.standardDoseInfo?.verifiedDosePer20LTank) {
              doseParts.push(
                `पंप: ${product.standardDoseInfo.verifiedDosePer20LTank} ${
                  product.standardDoseInfo.doseUnit || 'ml'
                }/20L`
              );
            }
            if (product.standardDoseInfo?.verifiedDosePerBigha) {
              doseParts.push(
                `बीघा: ${product.standardDoseInfo.verifiedDosePerBigha} ${
                  product.standardDoseInfo.doseBighaUnit || 'kg'
                }`
              );
            }

            const packLinesHtml = variants
              .map((v) => {
                const packLabel = escapeHtml(v.label || `${v.sizeValue} ${v.sizeUnit}`);
                let stockTag = '';
                if (showStockQty) {
                  const vSum = calculateVariantStockSummary(
                    product,
                    v,
                    defaultLowThreshold,
                    expiryWarningDays
                  );
                  const qty = vSum.saleablePacks;
                  if (qty <= 0) {
                    stockTag =
                      vSum.batchedExpiredPacks > 0
                        ? ` <span style="color:#dc2626;font-weight:700;">(स्टॉक: 0 · ${vSum.batchedExpiredPacks} एक्सपायर)</span>`
                        : ` <span style="color:#dc2626;font-weight:700;">(स्टॉक: 0 - खत्म)</span>`;
                  } else if (vSum.isLowStock) {
                    stockTag = ` <span style="color:#b45309;font-weight:700;">(स्टॉक: ${qty} - कम)</span>`;
                  } else {
                    stockTag = ` <span style="color:#047857;font-weight:700;">(स्टॉक: ${qty})</span>`;
                  }
                }
                return `<div style="line-height: 1.45; white-space: nowrap;">• ${packLabel}${stockTag}</div>`;
              })
              .join('');

            const sellingLinesHtml = variants
              .map(
                (v) =>
                  `<div style="line-height: 1.45; font-weight: 800; color: #065f46; white-space: nowrap;">₹${(
                    v.sellingPrice || 0
                  ).toLocaleString('en-IN')}</div>`
              )
              .join('');

            if (isAdminMode) {
              const costLinesHtml = variants
                .map(
                  (v) =>
                    `<div style="line-height: 1.45; font-weight: 700; color: #1f2937; white-space: nowrap;">₹${(
                      v.costPrice || 0
                    ).toLocaleString('en-IN')}</div>`
                )
                .join('');

              const marginLinesHtml = variants
                .map((v) => {
                  const s = v.sellingPrice || 0;
                  const c = v.costPrice || 0;
                  const diff = s - c;
                  const pct = s > 0 ? Math.round((diff / s) * 100) : 0;
                  const color = diff >= 0 ? '#047857' : '#dc2626';
                  return `<div style="line-height: 1.45; font-weight: 700; color: ${color}; white-space: nowrap;">₹${diff.toLocaleString(
                    'en-IN'
                  )} (${pct}%)</div>`;
                })
                .join('');

              const health = showStockQty
                ? calculateProductHealthSummary(product, defaultLowThreshold, expiryWarningDays)
                : null;

              return `
                <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
                  <td style="padding: 8px 6px; text-align: center; color: #6b7280; font-weight: 700; font-size: 11px;">${row.serialNo}</td>
                  <td style="padding: 8px 8px;">
                    <div style="font-weight: 800; font-size: 12px; color: #111827; line-height: 1.35;">${escapeHtml(
                      product.hindiName || product.name
                    )}</div>
                    ${
                      product.name && product.name.trim() !== product.hindiName?.trim()
                        ? `<div style="font-size: 10.5px; color: #4b5563; margin-top: 1px; line-height: 1.3;">${escapeHtml(
                            product.name
                          )}</div>`
                        : ''
                    }
                    <div style="font-size: 9.5px; color: #4b5563; margin-top: 3px; line-height: 1.3;">
                      <span style="background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-weight: 700;">${escapeHtml(
                        categoryLabelHi
                      )}</span>
                      <span style="margin-left: 4px;">· ${formText}</span>
                      ${
                        product.hsnCode
                          ? `<span style="margin-left: 4px; font-family: monospace;">· HSN: ${escapeHtml(
                              product.hsnCode
                            )}</span>`
                          : ''
                      }
                      ${
                        showStockQty && health
                          ? (() => {
                              const looseAvail = product.looseStock?.availableBaseQty || 0;
                              const looseText =
                                looseAvail > 0
                                  ? ` · <span style="color:#1d4ed8;font-weight:700;">खुला: ${escapeHtml(
                                      formatBaseUnitDisplay(
                                        looseAvail,
                                        product.looseStock?.baseUnit || 'g'
                                      )
                                    )}</span>`
                                  : '';
                              const batchText =
                                health.activeBatchesCount > 0
                                  ? ` · <span style="color:#0f766e;font-weight:700;">${health.activeBatchesCount} बैच</span>`
                                  : '';
                              return `<span style="margin-left: 4px; color: ${
                                health.saleablePacks > 0 ? '#047857' : '#dc2626'
                              }; font-weight: 700;">· बिक्री योग्य: ${health.saleablePacks}</span>${batchText}${looseText}`;
                            })()
                          : ''
                      }
                    </div>
                  </td>
                  <td style="padding: 8px 6px; font-size: 10.5px; color: #1f2937; font-weight: 600;">${packLinesHtml}</td>
                  <td style="padding: 8px 6px; text-align: right; font-size: 10.5px;">${costLinesHtml}</td>
                  <td style="padding: 8px 6px; text-align: right; font-size: 10.5px;">${sellingLinesHtml}</td>
                  <td style="padding: 8px 8px; text-align: right; font-size: 10.5px;">${marginLinesHtml}</td>
                </tr>
              `;
            }

            // Rate List Mode (No Cost Price)
            return `
              <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
                <td style="padding: 8px 6px; text-align: center; color: #6b7280; font-weight: 700; font-size: 11px;">${row.serialNo}</td>
                <td style="padding: 8px 8px;">
                  <div style="font-weight: 800; font-size: 12px; color: #111827; line-height: 1.35;">${escapeHtml(
                    product.hindiName || product.name
                  )}</div>
                  ${
                    product.name && product.name.trim() !== product.hindiName?.trim()
                      ? `<div style="font-size: 10.5px; color: #4b5563; margin-top: 1px; line-height: 1.3;">${escapeHtml(
                          product.name
                        )}</div>`
                      : ''
                  }
                  <div style="font-size: 9.5px; color: #4b5563; margin-top: 3px; line-height: 1.3;">
                    <span style="background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-weight: 700;">${escapeHtml(
                      categoryLabelHi
                    )}</span>
                    <span style="margin-left: 4px;">· ${formText}</span>
                    ${
                      product.hsnCode
                        ? `<span style="margin-left: 4px; font-family: monospace;">· HSN: ${escapeHtml(
                            product.hsnCode
                          )}</span>`
                        : ''
                    }
                  </div>
                </td>
                <td style="padding: 8px 6px; font-size: 10.5px; color: #1f2937; font-weight: 600;">${packLinesHtml}</td>
                <td style="padding: 8px 8px; text-align: right; font-size: 11px;">${sellingLinesHtml}</td>
                <td style="padding: 8px 8px; font-size: 10px; color: #374151; line-height: 1.4;">
                  ${doseParts.length > 0 ? escapeHtml(doseParts.join(' | ')) : '-'}
                </td>
              </tr>
            `;
          })
          .join('');

  const summaryCardsHtml = `
    <div style="display: grid; grid-template-columns: ${
      isAdminMode ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr'
    }; gap: 10px; margin-bottom: 14px;">
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
        <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">कुल उत्पाद</div>
        <div style="font-size: 15px; font-weight: 900; color: #111827; margin-top: 2px;">${totalProducts}</div>
      </div>
      ${
        showStockQty
          ? `
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
          <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">बिक्री योग्य पैक स्टॉक</div>
          <div style="font-size: 15px; font-weight: 900; color: #065f46; margin-top: 2px;">${totalStockPacks.toLocaleString('en-IN')}</div>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
          <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">स्टॉक लागत मूल्य</div>
          <div style="font-size: 15px; font-weight: 900; color: #111827; margin-top: 2px;">₹${totalStockValue.toLocaleString('en-IN')}</div>
        </div>
      `
          : `
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
          <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">श्रेणियां</div>
          <div style="font-size: 15px; font-weight: 900; color: #111827; margin-top: 2px;">${totalCategories}</div>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
          <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">कुल पैकेजिंग साइज</div>
          <div style="font-size: 15px; font-weight: 900; color: #065f46; margin-top: 2px;">${totalVariants}</div>
        </div>
      `
      }
      ${
        isAdminMode
          ? `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 8px 12px;">
          <div style="font-size: 9.5px; color: #065f46; font-weight: 700;">औसत लाभ मार्जिन</div>
          <div style="font-size: 15px; font-weight: 900; color: #047857; margin-top: 2px;">${avgMarginPercent}%</div>
        </div>
      `
          : ''
      }
    </div>
  `;

  const headerHtml = buildReportHeaderHtml({
    isFirstPage,
    docTitleText,
    scopeBadgeText,
    printedDate,
    logoDataUrl,
    summaryCardsHtml,
  });

  const tableHeaderHtml = isAdminMode
    ? `
      <thead>
        <tr style="background-color: #1b4316; color: #ffffff; font-size: 10.5px;">
          <th style="padding: 8px 6px; text-align: center; width: 32px;">क्र.</th>
          <th style="padding: 8px 8px; text-align: left; width: 250px;">उत्पाद, टेक्निकल नाम व श्रेणी</th>
          <th style="padding: 8px 6px; text-align: left; width: 145px;">पैकेजिंग साइज</th>
          <th style="padding: 8px 6px; text-align: right; width: 85px;">खरीद दर</th>
          <th style="padding: 8px 6px; text-align: right; width: 85px;">बिक्री दर</th>
          <th style="padding: 8px 8px; text-align: right; width: 125px;">मुनाफा (Margin)</th>
        </tr>
      </thead>
    `
    : `
      <thead>
        <tr style="background-color: #1b4316; color: #ffffff; font-size: 10.5px;">
          <th style="padding: 8px 6px; text-align: center; width: 34px;">क्र.</th>
          <th style="padding: 8px 8px; text-align: left; width: 280px;">उत्पाद, टेक्निकल नाम व श्रेणी</th>
          <th style="padding: 8px 6px; text-align: left; width: 165px;">पैकेजिंग साइज व यूनिट</th>
          <th style="padding: 8px 8px; text-align: right; width: 95px;">बिक्री दर (₹)</th>
          <th style="padding: 8px 8px; text-align: left; width: 148px;">सुझावित डोज़ विवरण</th>
        </tr>
      </thead>
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

      <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 11px;">
        ${tableHeaderHtml}
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280;">
        <span>फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर) · ${isAdminMode ? 'आंतरिक एडमिन रिपोर्ट' : 'उत्पाद मूल्य सूची'}</span>
        <span style="font-weight: 800; color: #1f2937;">पेज ${pageNum} / ${totalPages}</span>
      </div>
    </div>
  `;
}

function buildBatchReportPageHtml(params: {
  pageRows: BatchReportRow[];
  allRows: BatchReportRow[];
  pageNum: number;
  totalPages: number;
  reportType: 'batch_detailed' | 'near_expiry' | 'expired_stock';
  scope: StockExportScope;
  selectedCategoryId?: string;
  expiryWarningDays: number;
  logoDataUrl: string;
  printedDate: string;
}): string {
  const {
    pageRows,
    allRows,
    pageNum,
    totalPages,
    reportType,
    scope,
    selectedCategoryId,
    expiryWarningDays,
    logoDataUrl,
    printedDate,
  } = params;

  const isFirstPage = pageNum === 1;
  const scopeBadgeText =
    scope === 'single_category' && selectedCategoryId
      ? `श्रेणी: ${getStockCategoryMeta(selectedCategoryId).nameHindi}`
      : 'सभी श्रेणियां';

  const docTitleText =
    reportType === 'near_expiry'
      ? `निकट एक्सपायरी अलर्ट रिपोर्ट (${expiryWarningDays} दिन / ~4 माह)`
      : reportType === 'expired_stock'
      ? 'एक्सपायर्ड स्टॉक हानि रिपोर्ट (Expired Stock Report)'
      : 'बैच-वार विस्तृत स्टॉक रिपोर्ट (Batch-wise Stock Report)';

  const totalPacks = allRows.reduce((s, r) => s + r.qtyPacks, 0);
  const totalValuation = allRows.reduce((s, r) => s + r.valuation, 0);
  const alertOrExpCount = allRows.filter(
    (r) =>
      r.batch &&
      (r.batch.alert.status === 'expired' ||
        r.batch.alert.status === 'critical' ||
        r.batch.alert.status === 'warning')
  ).length;

  const thirdLabel =
    reportType === 'expired_stock'
      ? 'कुल लागत हानि (Loss)'
      : reportType === 'near_expiry'
      ? 'जोखिम पर स्टॉक मूल्य'
      : 'कुल बैच स्टॉक मूल्य';

  const fourthLabel =
    reportType === 'near_expiry'
      ? 'चेतावनी विंडो'
      : reportType === 'expired_stock'
      ? 'प्रभावित उत्पाद'
      : 'चेतावनी / एक्सपायर बैच';

  const fourthValue =
    reportType === 'near_expiry'
      ? `${expiryWarningDays} दिन`
      : reportType === 'expired_stock'
      ? `${new Set(allRows.map((r) => r.product.id)).size} उत्पाद`
      : `${alertOrExpCount} बैच`;

  const summaryCardsHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px;">
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
        <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">कुल बैच प्रविष्टियां</div>
        <div style="font-size: 15px; font-weight: 900; color: #111827; margin-top: 2px;">${allRows.length}</div>
      </div>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
        <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">कुल पैक मात्रा</div>
        <div style="font-size: 15px; font-weight: 900; color: ${reportType === 'expired_stock' ? '#dc2626' : '#065f46'}; margin-top: 2px;">${totalPacks.toLocaleString('en-IN')}</div>
      </div>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
        <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">${thirdLabel}</div>
        <div style="font-size: 15px; font-weight: 900; color: #111827; margin-top: 2px;">₹${totalValuation.toLocaleString('en-IN')}</div>
      </div>
      <div style="background: ${reportType === 'expired_stock' ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${reportType === 'expired_stock' ? '#fecaca' : '#fde68a'}; border-radius: 10px; padding: 8px 12px;">
        <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">${fourthLabel}</div>
        <div style="font-size: 15px; font-weight: 900; color: ${reportType === 'expired_stock' ? '#b91c1c' : '#b45309'}; margin-top: 2px;">${fourthValue}</div>
      </div>
    </div>
  `;

  const headerHtml = buildReportHeaderHtml({
    isFirstPage,
    docTitleText,
    scopeBadgeText,
    printedDate,
    logoDataUrl,
    summaryCardsHtml,
    accentColor: reportType === 'expired_stock' ? '#b91c1c' : reportType === 'near_expiry' ? '#b45309' : '#2d5a27',
  });

  const rowsHtml = pageRows
    .map((r, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
      const vLabel = r.variant.label || `${r.variant.sizeValue} ${r.variant.sizeUnit}`;
      return `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
          <td style="padding: 7px 6px; text-align: center; color: #6b7280; font-weight: 700; font-size: 10.5px;">${r.serialNo}</td>
          <td style="padding: 7px 6px;">
            <div style="font-weight: 800; font-size: 11px; color: #111827;">${escapeHtml(r.product.hindiName || r.product.name)}</div>
            <div style="font-size: 9.5px; color: #4b5563; margin-top: 1px;">${escapeHtml(vLabel)} · ${escapeHtml(r.categoryLabelHi)}</div>
          </td>
          <td style="padding: 7px 6px; font-family: monospace; font-weight: 700; font-size: 10.5px; color: #1f2937;">
            ${escapeHtml(r.batchNumberDisplay)}
          </td>
          <td style="padding: 7px 6px; font-size: 10px; color: #374151;">
            <div>Mfg: ${escapeHtml(r.mfgDisplay)}</div>
            <div style="font-weight: 800; color: ${r.statusColor}; margin-top: 1px;">Exp: ${escapeHtml(r.expiryDisplay)}</div>
          </td>
          <td style="padding: 7px 6px; font-size: 9.5px; font-weight: 700; color: ${r.statusColor};">
            ${escapeHtml(r.statusLabel)}
          </td>
          <td style="padding: 7px 6px; text-align: right; font-size: 10.5px; font-weight: 800; color: #111827;">
            ${r.qtyPacks} पैक
          </td>
          <td style="padding: 7px 6px; text-align: right; font-size: 10px;">
            <div style="color: #374151; font-weight: 700;">खरीद: ₹${r.purchaseCost.toLocaleString('en-IN')}</div>
            <div style="color: #047857; font-weight: 700;">मूल्य: ₹${r.valuation.toLocaleString('en-IN')}</div>
          </td>
        </tr>
      `;
    })
    .join('');

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

      <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 10.5px;">
        <thead>
          <tr style="background-color: #1b4316; color: #ffffff; font-size: 10px;">
            <th style="padding: 8px 6px; text-align: center; width: 32px;">क्र.</th>
            <th style="padding: 8px 6px; text-align: left; width: 190px;">उत्पाद व पैकेजिंग</th>
            <th style="padding: 8px 6px; text-align: left; width: 95px;">बैच नंबर</th>
            <th style="padding: 8px 6px; text-align: left; width: 105px;">Mfg / Expiry</th>
            <th style="padding: 8px 6px; text-align: left; width: 120px;">स्थिति (Status)</th>
            <th style="padding: 8px 6px; text-align: right; width: 70px;">शेष मात्रा</th>
            <th style="padding: 8px 6px; text-align: right; width: 105px;">दर / कुल मूल्य</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280;">
        <span>फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर) · बैच व एक्सपायरी ERP रिपोर्ट</span>
        <span style="font-weight: 800; color: #1f2937;">पेज ${pageNum} / ${totalPages}</span>
      </div>
    </div>
  `;
}

function buildLowStockPageHtml(params: {
  pageRows: LowStockReportRow[];
  allRows: LowStockReportRow[];
  pageNum: number;
  totalPages: number;
  scope: StockExportScope;
  selectedCategoryId?: string;
  defaultLowThreshold: number;
  logoDataUrl: string;
  printedDate: string;
}): string {
  const {
    pageRows,
    allRows,
    pageNum,
    totalPages,
    scope,
    selectedCategoryId,
    defaultLowThreshold,
    logoDataUrl,
    printedDate,
  } = params;

  const isFirstPage = pageNum === 1;
  const scopeBadgeText =
    scope === 'single_category' && selectedCategoryId
      ? `श्रेणी: ${getStockCategoryMeta(selectedCategoryId).nameHindi}`
      : 'सभी श्रेणियां';

  const outCount = allRows.filter((r) => r.saleablePacks <= 0).length;
  const lowCount = allRows.filter((r) => r.saleablePacks > 0).length;
  const estOrderCost = allRows.reduce((s, r) => s + r.suggestedOrderPacks * r.costPrice, 0);

  const summaryCardsHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px;">
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 8px 12px;">
        <div style="font-size: 9.5px; color: #991b1b; font-weight: 700;">स्टॉक खत्म (Out of Stock)</div>
        <div style="font-size: 15px; font-weight: 900; color: #dc2626; margin-top: 2px;">${outCount} साइज</div>
      </div>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 8px 12px;">
        <div style="font-size: 9.5px; color: #92400e; font-weight: 700;">कम स्टॉक (Low Stock)</div>
        <div style="font-size: 15px; font-weight: 900; color: #b45309; margin-top: 2px;">${lowCount} साइज</div>
      </div>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
        <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">डिफ़ॉल्ट सीमा</div>
        <div style="font-size: 15px; font-weight: 900; color: #111827; margin-top: 2px;">&lt;= ${defaultLowThreshold} पैक</div>
      </div>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px;">
        <div style="font-size: 9.5px; color: #6b7280; font-weight: 700;">अनुमानित ऑर्डर बजट</div>
        <div style="font-size: 15px; font-weight: 900; color: #065f46; margin-top: 2px;">₹${Math.round(estOrderCost).toLocaleString('en-IN')}</div>
      </div>
    </div>
  `;

  const headerHtml = buildReportHeaderHtml({
    isFirstPage,
    docTitleText: 'कम व खत्म स्टॉक ऑर्डर रिपोर्ट (Low & Out-of-Stock)',
    scopeBadgeText,
    printedDate,
    logoDataUrl,
    summaryCardsHtml,
    accentColor: '#b45309',
  });

  const rowsHtml = pageRows
    .map((r, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
      const vLabel = r.variant.label || `${r.variant.sizeValue} ${r.variant.sizeUnit}`;
      const isZero = r.saleablePacks <= 0;
      return `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
          <td style="padding: 7px 6px; text-align: center; color: #6b7280; font-weight: 700;">${r.serialNo}</td>
          <td style="padding: 7px 8px;">
            <div style="font-weight: 800; font-size: 11.5px; color: #111827;">${escapeHtml(r.product.hindiName || r.product.name)}</div>
            <div style="font-size: 9.5px; color: #4b5563;">${escapeHtml(r.categoryLabelHi)}</div>
          </td>
          <td style="padding: 7px 6px; font-weight: 700; color: #1f2937;">${escapeHtml(vLabel)}</td>
          <td style="padding: 7px 6px; text-align: right; font-weight: 800; color: ${isZero ? '#dc2626' : '#b45309'};">
            ${isZero ? '0 (खत्म)' : `${r.saleablePacks} शेष`}
            ${r.expiredPacks > 0 ? `<div style="font-size:9px;color:#dc2626;">(${r.expiredPacks} एक्सपायर्ड)</div>` : ''}
          </td>
          <td style="padding: 7px 6px; text-align: center; color: #4b5563; font-weight: 700;">${r.threshold}</td>
          <td style="padding: 7px 6px; text-align: right; font-weight: 800; color: #047857;">+${r.suggestedOrderPacks} पैक</td>
          <td style="padding: 7px 6px; text-align: right; color: #1f2937; font-weight: 700;">₹${r.costPrice.toLocaleString('en-IN')}</td>
        </tr>
      `;
    })
    .join('');

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

      <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 10.5px;">
        <thead>
          <tr style="background-color: #1b4316; color: #ffffff; font-size: 10px;">
            <th style="padding: 8px 6px; text-align: center; width: 32px;">क्र.</th>
            <th style="padding: 8px 8px; text-align: left; width: 210px;">उत्पाद व श्रेणी</th>
            <th style="padding: 8px 6px; text-align: left; width: 120px;">पैकेजिंग साइज</th>
            <th style="padding: 8px 6px; text-align: right; width: 95px;">उपलब्ध स्टॉक</th>
            <th style="padding: 8px 6px; text-align: center; width: 65px;">न्यूनतम सीमा</th>
            <th style="padding: 8px 6px; text-align: right; width: 100px;">सुझावित ऑर्डर</th>
            <th style="padding: 8px 6px; text-align: right; width: 85px;">खरीद दर</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280;">
        <span>फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर) · कम स्टॉक व खरीद ऑर्डर रिपोर्ट</span>
        <span style="font-weight: 800; color: #1f2937;">पेज ${pageNum} / ${totalPages}</span>
      </div>
    </div>
  `;
}

export async function generateStockExportPdfBlob(
  options: StockExportOptions
): Promise<{ success: boolean; blob?: Blob; fileName: string; count: number; totalPages: number; error?: string }> {
  const {
    products,
    scope,
    selectedCategoryId,
    priceMode,
    stockConfig,
    onProgress,
  } = options;

  const stockManagementEnabled = Boolean(options.stockManagementEnabled || stockConfig?.enabled);
  const defaultLowThreshold = stockConfig?.defaultLowStockThreshold ?? 10;
  const expiryWarningDays = stockConfig?.expiryWarningDays ?? 122;
  const effectiveReportType: StockReportType =
    priceMode === 'rate_list' || !stockManagementEnabled
      ? 'standard_stock'
      : options.reportType || 'standard_stock';

  const fileName = buildStockExportFileName({
    scope,
    selectedCategoryId,
    priceMode,
    reportType: effectiveReportType,
  });

  let itemCount = 0;

  try {
    let logoDataUrl = '/icon-192.png';
    try {
      logoDataUrl = await loadLogoBase64('/icon-192.png');
    } catch {
      // fallback already set
    }

    const printedDate = formatHindiDate(new Date());
    let pageHtmlList: string[] = [];

    if (
      effectiveReportType === 'batch_detailed' ||
      effectiveReportType === 'near_expiry' ||
      effectiveReportType === 'expired_stock'
    ) {
      const rows = buildBatchReportRows({
        products,
        scope,
        selectedCategoryId,
        reportType: effectiveReportType,
        defaultLowThreshold,
        expiryWarningDays,
      });
      if (rows.length === 0) {
        return {
          success: false,
          fileName,
          count: 0,
          totalPages: 0,
          error:
            effectiveReportType === 'near_expiry'
              ? `अगले ${expiryWarningDays} दिनों में एक्सपायर होने वाला कोई बैच नहीं मिला।`
              : effectiveReportType === 'expired_stock'
              ? 'कोई एक्सपायर्ड बैच स्टॉक उपलब्ध नहीं है।'
              : 'एक्सपोर्ट करने के लिए कोई बैच स्टॉक डेटा उपलब्ध नहीं है।',
        };
      }
      itemCount = rows.length;
      const pages = paginateFlatRows(rows, 13, 18);
      pageHtmlList = pages.map((pageRows, idx) =>
        buildBatchReportPageHtml({
          pageRows,
          allRows: rows,
          pageNum: idx + 1,
          totalPages: pages.length,
          reportType: effectiveReportType,
          scope,
          selectedCategoryId,
          expiryWarningDays,
          logoDataUrl,
          printedDate,
        })
      );
    } else if (effectiveReportType === 'low_stock') {
      const rows = buildLowStockReportRows({
        products,
        scope,
        selectedCategoryId,
        defaultLowThreshold,
        expiryWarningDays,
      });
      if (rows.length === 0) {
        return {
          success: false,
          fileName,
          count: 0,
          totalPages: 0,
          error: 'कोई कम या खत्म स्टॉक उत्पाद नहीं मिला — सभी उत्पाद पर्याप्त स्टॉक में हैं।',
        };
      }
      itemCount = rows.length;
      const pages = paginateFlatRows(rows, 14, 19);
      pageHtmlList = pages.map((pageRows, idx) =>
        buildLowStockPageHtml({
          pageRows,
          allRows: rows,
          pageNum: idx + 1,
          totalPages: pages.length,
          scope,
          selectedCategoryId,
          defaultLowThreshold,
          logoDataUrl,
          printedDate,
        })
      );
    } else {
      const enriched = prepareEnrichedProducts(products, scope, selectedCategoryId);
      if (enriched.length === 0) {
        return {
          success: false,
          fileName,
          count: 0,
          totalPages: 0,
          error: 'एक्सपोर्ट करने के लिए चयनित श्रेणी में कोई उत्पाद उपलब्ध नहीं है।',
        };
      }
      itemCount = enriched.length;
      const totalProducts = enriched.length;
      const totalVariants = enriched.reduce((sum, e) => sum + e.variants.length, 0);
      const totalCategories = new Set(enriched.map((e) => e.categoryId)).size;

      let marginSum = 0;
      let marginCount = 0;
      let totalStockPacks = 0;
      let totalStockValue = 0;

      for (const e of enriched) {
        for (const v of e.variants) {
          if ((v.sellingPrice || 0) > 0 && (v.costPrice || 0) > 0) {
            marginSum += Math.max(0, ((v.sellingPrice - v.costPrice) / v.sellingPrice) * 100);
            marginCount++;
          }
        }
        if (stockManagementEnabled) {
          const health = calculateProductHealthSummary(
            e.product,
            defaultLowThreshold,
            expiryWarningDays
          );
          totalStockPacks += health.saleablePacks;
          totalStockValue += health.totalValuation;
        }
      }
      totalStockValue = Math.round(totalStockValue);
      const avgMarginPercent = marginCount > 0 ? Math.round(marginSum / marginCount) : 0;

      const pages = paginateStockRows(enriched, scope);
      pageHtmlList = pages.map((pageRows, idx) =>
        buildStockPageHtml({
          pageRows,
          pageNum: idx + 1,
          totalPages: pages.length,
          scope,
          selectedCategoryId,
          priceMode,
          stockManagementEnabled,
          defaultLowThreshold,
          expiryWarningDays,
          totalProducts,
          totalVariants,
          totalCategories,
          totalStockPacks,
          totalStockValue,
          avgMarginPercent,
          logoDataUrl,
          printedDate,
        })
      );
    }

    const totalPages = pageHtmlList.length;
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

    for (let i = 0; i < totalPages; i++) {
      onProgress?.(i + 1, totalPages);

      const canvas = await renderHtmlToSafeCanvas({
        html: pageHtmlList[i],
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
      count: itemCount,
      totalPages,
    };
  } catch (err: unknown) {
    console.error('Error generating Stock Export PDF:', err);
    return {
      success: false,
      fileName,
      count: itemCount,
      totalPages: 0,
      error: err instanceof Error ? err.message : 'स्टॉक PDF बनाने में त्रुटि हुई।',
    };
  }
}

export function formatStockListText(options: {
  products: AccountingProduct[];
  scope: StockExportScope;
  selectedCategoryId?: string;
  priceMode: StockPriceMode;
  reportType?: StockReportType;
  stockManagementEnabled?: boolean;
  stockConfig?: StockManagementConfig;
}): string {
  const {
    products,
    scope,
    selectedCategoryId,
    priceMode,
    stockConfig,
  } = options;
  const stockManagementEnabled = Boolean(options.stockManagementEnabled || stockConfig?.enabled);
  const defaultLowThreshold = stockConfig?.defaultLowStockThreshold ?? 10;
  const expiryWarningDays = stockConfig?.expiryWarningDays ?? 122;
  const effectiveReportType: StockReportType =
    priceMode === 'rate_list' || !stockManagementEnabled
      ? 'standard_stock'
      : options.reportType || 'standard_stock';

  const printedDate = formatHindiDate(new Date());
  const isAdminMode = priceMode === 'admin_margin';
  const showStockQty = stockManagementEnabled && isAdminMode;

  const scopeTitle =
    scope === 'single_category' && selectedCategoryId
      ? `श्रेणी: ${getStockCategoryMeta(selectedCategoryId).nameHindi}`
      : scope === 'category_combined'
      ? 'सभी श्रेणियां (Category-wise)'
      : 'संपूर्ण उत्पाद सूची (Complete List)';

  if (
    effectiveReportType === 'batch_detailed' ||
    effectiveReportType === 'near_expiry' ||
    effectiveReportType === 'expired_stock'
  ) {
    const rows = buildBatchReportRows({
      products,
      scope,
      selectedCategoryId,
      reportType: effectiveReportType,
      defaultLowThreshold,
      expiryWarningDays,
    });
    const title =
      effectiveReportType === 'near_expiry'
        ? `*निकट एक्सपायरी चेतावनी रिपोर्ट (${expiryWarningDays} दिन)*`
        : effectiveReportType === 'expired_stock'
        ? '*एक्सपायर्ड स्टॉक हानि रिपोर्ट*'
        : '*बैच-वार विस्तृत स्टॉक रिपोर्ट*';

    const lines: string[] = [
      '*फल्सावदिया कृषि बाजार*',
      'किसान का भरोसा, हमारी पहचान | मो: 8982338046',
      '----------------------------------',
      title,
      scopeTitle,
      `दिनांक: ${printedDate} | कुल बैच: ${rows.length}`,
      '----------------------------------',
    ];

    if (rows.length === 0) {
      lines.push('कोई मिलान बैच उपलब्ध नहीं है।');
    } else {
      rows.forEach((r) => {
        const vLabel = r.variant.label || `${r.variant.sizeValue} ${r.variant.sizeUnit}`;
        lines.push(
          `${r.serialNo}. *${r.product.hindiName || r.product.name}* (${vLabel})`
        );
        lines.push(
          `   बैच: ${r.batchNumberDisplay} | Mfg: ${r.mfgDisplay} | Exp: ${r.expiryDisplay}`
        );
        lines.push(
          `   शेष: ${r.qtyPacks} पैक | खरीद: ₹${r.purchaseCost} | कुल: ₹${r.valuation.toLocaleString('en-IN')} | [${r.statusLabel}]`
        );
      });
    }

    lines.push('----------------------------------');
    lines.push('फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर)');
    return lines.join('\n');
  }

  if (effectiveReportType === 'low_stock') {
    const rows = buildLowStockReportRows({
      products,
      scope,
      selectedCategoryId,
      defaultLowThreshold,
      expiryWarningDays,
    });
    const lines: string[] = [
      '*फल्सावदिया कृषि बाजार*',
      'किसान का भरोसा, हमारी पहचान | मो: 8982338046',
      '----------------------------------',
      '*कम व खत्म स्टॉक ऑर्डर रिपोर्ट (Low Stock)*',
      scopeTitle,
      `दिनांक: ${printedDate} | प्रभावित साइज: ${rows.length} (सीमा <= ${defaultLowThreshold})`,
      '----------------------------------',
    ];
    if (rows.length === 0) {
      lines.push('कोई कम या खत्म स्टॉक उत्पाद नहीं है।');
    } else {
      rows.forEach((r) => {
        const vLabel = r.variant.label || `${r.variant.sizeValue} ${r.variant.sizeUnit}`;
        lines.push(
          `${r.serialNo}. *${r.product.hindiName || r.product.name}* (${vLabel}) - शेष: ${r.saleablePacks} पैक | सीमा: ${r.threshold} | सुझावित ऑर्डर: +${r.suggestedOrderPacks} पैक`
        );
      });
    }
    lines.push('----------------------------------');
    lines.push('फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर)');
    return lines.join('\n');
  }

  const enriched = prepareEnrichedProducts(products, scope, selectedCategoryId);

  const lines: string[] = [
    '*फल्सावदिया कृषि बाजार*',
    'किसान का भरोसा, हमारी पहचान | मो: 8982338046',
    '----------------------------------',
    isAdminMode
      ? '*स्टॉक उत्पाद व मूल्य सूची (Admin Report)*'
      : '*उत्पाद पैकेजिंग व बिक्री दर सूची (Rate List)*',
    scopeTitle,
    `दिनांक: ${printedDate} | कुल उत्पाद: ${enriched.length}`,
    '----------------------------------',
  ];

  if (enriched.length === 0) {
    lines.push('कोई उत्पाद उपलब्ध नहीं है।');
    return lines.join('\n');
  }

  let currentCat = '';
  enriched.forEach((entry, idx) => {
    if (scope === 'category_combined' && entry.categoryId !== currentCat) {
      currentCat = entry.categoryId;
      lines.push('');
      lines.push(`[ ${entry.categoryLabelHi} ]`);
    }

    const p = entry.product;
    const subName = p.name && p.name.trim() !== p.hindiName?.trim() ? ` (${p.name.trim()})` : '';
    const hsnPart = p.hsnCode ? ` [HSN: ${p.hsnCode}]` : '';
    lines.push(`${idx + 1}. *${p.hindiName || p.name}*${subName}${hsnPart}`);

    if (scope !== 'category_combined') {
      lines.push(`   श्रेणी: ${entry.categoryLabelHi}`);
    }

    entry.variants.forEach((v) => {
      const packLabel = v.label || `${v.sizeValue} ${v.sizeUnit}`;
      if (isAdminMode) {
        const diff = (v.sellingPrice || 0) - (v.costPrice || 0);
        const pct = (v.sellingPrice || 0) > 0 ? Math.round((diff / v.sellingPrice) * 100) : 0;
        let stockText = '';
        if (showStockQty) {
          const vSum = calculateVariantStockSummary(p, v, defaultLowThreshold, expiryWarningDays);
          stockText = ` | स्टॉक: ${vSum.saleablePacks}${
            vSum.batchedExpiredPacks > 0 ? ` (${vSum.batchedExpiredPacks} एक्सपायर)` : ''
          }`;
        }
        lines.push(
          `   - ${packLabel}: खरीद ₹${(v.costPrice || 0).toLocaleString('en-IN')} | बिक्री ₹${(
            v.sellingPrice || 0
          ).toLocaleString('en-IN')} | लाभ ₹${diff.toLocaleString('en-IN')} (${pct}%)${stockText}`
        );
      } else {
        lines.push(
          `   - ${packLabel}: ₹${(v.sellingPrice || 0).toLocaleString('en-IN')}`
        );
      }
    });

    if (showStockQty && p.looseStock && p.looseStock.availableBaseQty > 0) {
      lines.push(
        `   खुला स्टॉक: ${formatBaseUnitDisplay(
          p.looseStock.availableBaseQty,
          p.looseStock.baseUnit
        )}`
      );
    }
  });

  lines.push('----------------------------------');
  lines.push('फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर)');

  return lines.join('\n');
}
