import {
  CashHistoryEntry,
  formatCashDateTime,
  formatIndianCurrency,
  getDenominationStyle,
  numberToIndianWordsEn,
} from './cashCalculatorUtils';

export interface CashHistoryPdfOptions {
  entries: CashHistoryEntry[];
  shopName?: string;
  logoUrl?: string;
  showAmountInWords?: boolean;
  showLogo?: boolean;
  onProgress?: (currentPage: number, totalPages: number) => void;
}

export interface CashHistoryPdfResult {
  success: boolean;
  fileName: string;
  totalEntries: number;
  totalPages: number;
  error?: string;
}

export function formatCashBackupPdfFileName(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `Cash_History_Backup_${dd}-${mm}-${yyyy}.pdf`;
}

function loadSafeImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = window.setTimeout(() => resolve(null), 3000);
    img.onload = () => {
      window.clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };
    img.src = url;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

// Logical A4 Page Dimensions (210mm x 297mm aspect ratio = 960 x 1358)
const PAGE_W = 960;
const PAGE_H = 1358;
const PAD_X = 42;
const CONTENT_W = PAGE_W - PAD_X * 2;
const FOOTER_H = 50;
const FIRST_PAGE_HEADER_H = 224;
const CONT_PAGE_HEADER_H = 74;

interface PlannedEntry {
  entry: CashHistoryEntry;
  indexNumber: number;
  wordLines: string[];
  hasCustomerRow: boolean;
  height: number;
}

function measureEntryCard(
  measureCtx: CanvasRenderingContext2D,
  entry: CashHistoryEntry,
  indexNumber: number,
  showAmountInWords: boolean
): PlannedEntry {
  const hasCustomerRow = Boolean(entry.customerName?.trim() || entry.customerPhone?.trim());
  const denomRows = Math.max(1, entry.denominations?.length || 0);
  const adjList = entry.adjustments || [];
  const hasAdjSection = adjList.length > 0 || entry.adjustmentNet !== 0;

  let wordLines: string[] = [];
  if (showAmountInWords) {
    measureCtx.font = 'italic 600 14px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
    wordLines = wrapTextLines(
      measureCtx,
      `Amount in Words: ${numberToIndianWordsEn(entry.grandTotal)}`,
      CONTENT_W - 44
    );
  }

  const cardTopHeaderH = 44;
  const customerBarH = hasCustomerRow ? 36 : 0;
  const tableHeaderH = 30;
  const tableRowsH = denomRows * 28;
  const adjHeaderH = hasAdjSection ? 26 + adjList.length * 22 : 0;
  const totalsBarH = 46;
  const wordsH = wordLines.length > 0 ? 10 + wordLines.length * 18 : 0;
  const bottomPad = 14;

  const height =
    cardTopHeaderH +
    customerBarH +
    10 +
    tableHeaderH +
    tableRowsH +
    (hasAdjSection ? 8 + adjHeaderH : 0) +
    10 +
    totalsBarH +
    wordsH +
    bottomPad;

  return {
    entry,
    indexNumber,
    wordLines,
    hasCustomerRow,
    height,
  };
}

export function planHistoryPdfPages(
  entries: CashHistoryEntry[],
  showAmountInWords: boolean,
  measureCtx: CanvasRenderingContext2D
): PlannedEntry[][] {
  const planned = entries.map((entry, idx) =>
    measureEntryCard(measureCtx, entry, idx + 1, showAmountInWords)
  );

  const pages: PlannedEntry[][] = [];
  let currentPage: PlannedEntry[] = [];
  let currentY = FIRST_PAGE_HEADER_H;
  const maxContentBottom = PAGE_H - FOOTER_H - 12;
  const cardGap = 16;

  for (const item of planned) {
    const needed = (currentPage.length > 0 ? cardGap : 0) + item.height;
    if (currentPage.length > 0 && currentY + needed > maxContentBottom) {
      pages.push(currentPage);
      currentPage = [item];
      currentY = CONT_PAGE_HEADER_H + item.height;
    } else {
      currentPage.push(item);
      currentY += needed;
    }
  }

  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  return pages;
}

export async function downloadCashHistoryBackupPDF(
  options: CashHistoryPdfOptions
): Promise<CashHistoryPdfResult> {
  const {
    entries,
    shopName = 'फल्सावदिया कृषि बाजार',
    logoUrl = '/icon-192.png',
    showAmountInWords = true,
    showLogo = true,
    onProgress,
  } = options;

  const now = new Date();
  const fileName = formatCashBackupPdfFileName(now);

  if (!entries || entries.length === 0) {
    return {
      success: false,
      fileName,
      totalEntries: 0,
      totalPages: 0,
      error: 'बैकअप PDF बनाने के लिए कोई सेव किया गया कैश इतिहास मौजूद नहीं है।',
    };
  }

  try {
    let logoImg: HTMLImageElement | null = null;
    if (showLogo) {
      logoImg = await loadSafeImage(logoUrl || '/icon-192.png');
      if (!logoImg && logoUrl !== '/icon-192.png') {
        logoImg = await loadSafeImage('/icon-192.png');
      }
    }

    // Prepare reusable High-DPI canvas (2x = 1920 x 2716)
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W * scale;
    canvas.height = PAGE_H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    // Sort newest first (preserving display order)
    const orderedEntries = [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const plannedPages = planHistoryPdfPages(orderedEntries, showAmountInWords, ctx);
    const totalPages = plannedPages.length;

    const totalCombinedNotes = orderedEntries.reduce((s, e) => s + (e.totalNotes || 0), 0);
    const totalCombinedAmount =
      Math.round(
        (orderedEntries.reduce((s, e) => s + (e.grandTotal || 0), 0) + Number.EPSILON) * 100
      ) / 100;

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const generatedLabel = formatCashDateTime(now.toISOString());

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      onProgress?.(pageIdx + 1, totalPages);

      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, PAGE_W, PAGE_H);

      // Top brand accent strip
      ctx.fillStyle = '#2D5A27';
      ctx.fillRect(0, 0, PAGE_W, 12);

      let cursorY = 26;

      if (pageIdx === 0) {
        // FULL DOCUMENT HEADER (Page 1)
        const logoSize = 62;
        const titleX = logoImg ? PAD_X + logoSize + 16 : PAD_X;

        if (logoImg) {
          ctx.save();
          drawRoundedRect(ctx, PAD_X, cursorY, logoSize, logoSize, 14);
          ctx.clip();
          ctx.fillStyle = '#F5F2ED';
          ctx.fillRect(PAD_X, cursorY, logoSize, logoSize);
          ctx.drawImage(logoImg, PAD_X, cursorY, logoSize, logoSize);
          ctx.restore();

          ctx.strokeStyle = '#E5E7EB';
          ctx.lineWidth = 1.5;
          drawRoundedRect(ctx, PAD_X, cursorY, logoSize, logoSize, 14);
          ctx.stroke();
        }

        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#111827';
        ctx.font = '800 26px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(shopName, titleX, cursorY + 2);

        ctx.fillStyle = '#2D5A27';
        ctx.font = '700 16px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText('कैश काउंटर इतिहास बैकअप (Cash History Backup)', titleX, cursorY + 36);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#4B5563';
        ctx.font = '600 13px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(`प्रिंट दिनांक: ${generatedLabel}`, PAGE_W - PAD_X, cursorY + 12);
        ctx.fillText('ऑफलाइन बैकअप रिपोर्ट', PAGE_W - PAD_X, cursorY + 34);
        ctx.textAlign = 'left';

        cursorY += 78;

        // Global Summary Banner
        const summaryBoxH = 88;
        ctx.fillStyle = '#ECFDF5';
        drawRoundedRect(ctx, PAD_X, cursorY, CONTENT_W, summaryBoxH, 16);
        ctx.fill();
        ctx.strokeStyle = '#A7F3D0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const colW = CONTENT_W / 3;
        const summaryMetrics = [
          { label: 'कुल सेव रिकॉर्ड (Total Entries)', val: `${orderedEntries.length}` },
          { label: 'कुल नोट संख्या (Total Notes)', val: `${totalCombinedNotes.toLocaleString('en-IN')}` },
          { label: 'कुल महायोग (Grand Total)', val: `₹ ${formatIndianCurrency(totalCombinedAmount)}` },
        ];

        summaryMetrics.forEach((metric, mIdx) => {
          const centerX = PAD_X + colW * mIdx + colW / 2;
          if (mIdx > 0) {
            ctx.strokeStyle = '#A7F3D0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PAD_X + colW * mIdx, cursorY + 14);
            ctx.lineTo(PAD_X + colW * mIdx, cursorY + summaryBoxH - 14);
            ctx.stroke();
          }
          ctx.textAlign = 'center';
          ctx.fillStyle = '#065F46';
          ctx.font = '700 13px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.fillText(metric.label, centerX, cursorY + 18);

          ctx.fillStyle = '#1B4316';
          ctx.font = '900 22px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.fillText(metric.val, centerX, cursorY + 44);
        });

        ctx.textAlign = 'left';
        cursorY += summaryBoxH + 22;
      } else {
        // CONTINUATION PAGE HEADER
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#2D5A27';
        ctx.font = '800 15px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(`${shopName} — कैश इतिहास बैकअप (जारी)`, PAD_X, cursorY + 14);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#6B7280';
        ctx.font = '600 12px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(generatedLabel, PAGE_W - PAD_X, cursorY + 14);

        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD_X, cursorY + 32);
        ctx.lineTo(PAGE_W - PAD_X, cursorY + 32);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        cursorY = CONT_PAGE_HEADER_H;
      }

      // RENDER ENTRIES ON THIS PAGE
      const pageItems = plannedPages[pageIdx];
      for (const item of pageItems) {
        const { entry, indexNumber, wordLines, hasCustomerRow, height } = item;

        // Card Container
        ctx.fillStyle = '#FFFFFF';
        drawRoundedRect(ctx, PAD_X, cursorY, CONTENT_W, height, 14);
        ctx.fill();
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Card Top Header Strip
        ctx.save();
        drawRoundedRect(ctx, PAD_X, cursorY, CONTENT_W, 44, 14);
        ctx.clip();
        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(PAD_X, cursorY, CONTENT_W, 44);
        ctx.restore();

        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD_X, cursorY + 44);
        ctx.lineTo(PAGE_W - PAD_X, cursorY + 44);
        ctx.stroke();

        ctx.textBaseline = 'middle';
        // Index Pill
        ctx.fillStyle = '#2D5A27';
        drawRoundedRect(ctx, PAD_X + 14, cursorY + 10, 44, 24, 8);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 13px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${indexNumber}`, PAD_X + 36, cursorY + 22);

        // Date & Time
        ctx.textAlign = 'left';
        ctx.fillStyle = '#111827';
        ctx.font = '700 14px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(formatCashDateTime(entry.createdAt), PAD_X + 70, cursorY + 22);

        // Card Header Right: Total Notes & Grand Total
        ctx.textAlign = 'right';
        ctx.fillStyle = '#2D5A27';
        ctx.font = '900 16px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(`₹ ${formatIndianCurrency(entry.grandTotal)}`, PAGE_W - PAD_X - 16, cursorY + 22);

        let y = cursorY + 44;

        // Customer Info Bar
        if (hasCustomerRow) {
          ctx.fillStyle = '#F9FAFB';
          ctx.fillRect(PAD_X + 1, y, CONTENT_W - 2, 36);
          ctx.strokeStyle = '#F3F4F6';
          ctx.beginPath();
          ctx.moveTo(PAD_X, y + 36);
          ctx.lineTo(PAGE_W - PAD_X, y + 36);
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.fillStyle = '#374151';
          ctx.font = '700 13px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
          const nameLabel = entry.customerName?.trim() ? `ग्राहक: ${entry.customerName.trim()}` : '';
          ctx.fillText(nameLabel, PAD_X + 16, y + 18);

          if (entry.customerPhone?.trim()) {
            ctx.textAlign = 'right';
            ctx.fillText(`मोबाइल: ${entry.customerPhone.trim()}`, PAGE_W - PAD_X - 16, y + 18);
          }
          ctx.textAlign = 'left';
          y += 36;
        }

        y += 10;

        // Denominations Table Header
        const tableX = PAD_X + 14;
        const tableW = CONTENT_W - 28;
        ctx.fillStyle = '#F3F4F6';
        drawRoundedRect(ctx, tableX, y, tableW, 30, 8);
        ctx.fill();

        ctx.fillStyle = '#4B5563';
        ctx.font = '800 12px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('नोट मूल्य (CURRENCY)', tableX + 16, y + 15);
        ctx.textAlign = 'center';
        ctx.fillText('संख्या (QTY)', tableX + tableW * 0.52, y + 15);
        ctx.textAlign = 'right';
        ctx.fillText('राशि (AMOUNT)', tableX + tableW - 14, y + 15);
        y += 30;

        // Denomination Rows
        const denomLines = entry.denominations || [];
        if (denomLines.length === 0) {
          ctx.fillStyle = '#6B7280';
          ctx.font = '600 13px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('केवल समायोजन राशि दर्ज (कोई नोट नहीं)', tableX + tableW / 2, y + 14);
          y += 28;
        } else {
          denomLines.forEach((line, lIdx) => {
            if (lIdx % 2 === 1) {
              ctx.fillStyle = '#FAFAFA';
              ctx.fillRect(tableX, y, tableW, 28);
            }
            const badge = getDenominationStyle(line.value);

            ctx.fillStyle = badge.accentHex;
            ctx.beginPath();
            ctx.arc(tableX + 16, y + 14, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#111827';
            ctx.font = '700 13.5px "Plus Jakarta Sans", system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`₹ ${formatIndianCurrency(line.value)}`, tableX + 28, y + 14);

            ctx.fillStyle = '#374151';
            ctx.font = '700 13.5px "Plus Jakarta Sans", system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${line.qty}`, tableX + tableW * 0.52, y + 14);

            ctx.fillStyle = '#111827';
            ctx.font = '800 13.5px "Plus Jakarta Sans", system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`₹ ${formatIndianCurrency(line.subtotal)}`, tableX + tableW - 14, y + 14);

            y += 28;
          });
        }

        // Adjustments Section (if any)
        const adjList = entry.adjustments || [];
        if (adjList.length > 0 || entry.adjustmentNet !== 0) {
          y += 8;
          const adjBoxH = 26 + adjList.length * 22;
          ctx.fillStyle = '#FFFBEB';
          drawRoundedRect(ctx, tableX, y, tableW, adjBoxH, 8);
          ctx.fill();
          ctx.strokeStyle = '#FDE68A';
          ctx.lineWidth = 1;
          ctx.stroke();

          const netSign = entry.adjustmentNet >= 0 ? '+' : '-';
          ctx.textAlign = 'left';
          ctx.fillStyle = '#92400E';
          ctx.font = '800 12.5px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
          ctx.fillText('प्लस / माइनस समायोजन (Adjustments):', tableX + 12, y + 13);

          ctx.textAlign = 'right';
          ctx.fillStyle = entry.adjustmentNet >= 0 ? '#166534' : '#B91C1C';
          ctx.fillText(
            `${netSign}₹ ${formatIndianCurrency(Math.abs(entry.adjustmentNet))}`,
            tableX + tableW - 12,
            y + 13
          );

          let ay = y + 26;
          for (const adj of adjList) {
            const sign = adj.type === 'plus' ? '+' : '-';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#4B5563';
            ctx.font = '600 12px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
            ctx.fillText(
              `• ${adj.note?.trim() || (adj.type === 'plus' ? 'अतिरिक्त जोड़' : 'घटाव राशि')}`,
              tableX + 18,
              ay + 9
            );
            ctx.textAlign = 'right';
            ctx.fillStyle = adj.type === 'plus' ? '#166534' : '#B91C1C';
            ctx.fillText(`${sign}₹ ${formatIndianCurrency(adj.amount)}`, tableX + tableW - 12, ay + 9);
            ay += 22;
          }
          y += adjBoxH;
        }

        y += 10;

        // Card Bottom Totals Strip
        ctx.fillStyle = '#ECFDF5';
        drawRoundedRect(ctx, tableX, y, tableW, 46, 10);
        ctx.fill();
        ctx.strokeStyle = '#A7F3D0';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#1F2937';
        ctx.font = '700 13px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(
          `कुल नोट: ${entry.totalNotes}   |   नोट राशि: ₹${formatIndianCurrency(entry.noteAmount)}`,
          tableX + 14,
          y + 23
        );

        ctx.textAlign = 'right';
        ctx.fillStyle = '#1B4316';
        ctx.font = '900 15px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(
          `Grand Total: ₹ ${formatIndianCurrency(entry.grandTotal)}`,
          tableX + tableW - 14,
          y + 23
        );
        y += 46;

        // Amount in Words
        if (wordLines.length > 0) {
          y += 10;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          ctx.fillStyle = '#4B5563';
          ctx.font = 'italic 600 13px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
          for (const wl of wordLines) {
            ctx.fillText(wl, tableX + 8, y);
            y += 18;
          }
        }

        cursorY += height + 16;
      }

      // PAGE FOOTER
      const footerY = PAGE_H - FOOTER_H;
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_X, footerY);
      ctx.lineTo(PAGE_W - PAD_X, footerY);
      ctx.stroke();

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6B7280';
      ctx.font = '600 12px "Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`${shopName} • शामगढ़ (मंदसौर) • ऑफलाइन कैश बैकअप`, PAD_X, footerY + 24);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#374151';
      ctx.font = '700 12px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`Page ${pageIdx + 1} of ${totalPages}`, PAGE_W - PAD_X, footerY + 24);

      // Add page image to jsPDF
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      if (pageIdx > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      // Yield to main thread between pages so large histories never freeze UI
      if (pageIdx < totalPages - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }

    pdf.save(fileName);
    return {
      success: true,
      fileName,
      totalEntries: orderedEntries.length,
      totalPages,
    };
  } catch (err: unknown) {
    console.error('Cash History PDF generation failed:', err);
    return {
      success: false,
      fileName,
      totalEntries: entries.length,
      totalPages: 0,
      error: err instanceof Error ? err.message : 'PDF बैकअप बनाने में त्रुटि हुई।',
    };
  }
}
