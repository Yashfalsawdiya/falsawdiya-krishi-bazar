import {
  CashAdjustment,
  CashLineItem,
  formatCashDateTime,
  formatIndianCurrency,
  getDenominationStyle,
  numberToIndianWordsEn,
} from './cashCalculatorUtils';

export interface CashReceiptOptions {
  shopName: string;
  logoUrl?: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  items: CashLineItem[];
  adjustments: CashAdjustment[];
  totalNotes: number;
  noteAmount: number;
  adjustmentNet: number;
  grandTotal: number;
  showAmountInWords: boolean;
  showLogo: boolean;
  includeZeroNotes: boolean;
}

export interface GeneratedCashReceipt {
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

function loadSafeImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = window.setTimeout(() => {
      resolve(null);
    }, 3500);

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
    const testLine = `${current} ${words[i]}`;
    if (ctx.measureText(testLine).width <= maxWidth) {
      current = testLine;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

export async function generateCashReceiptImage(
  options: CashReceiptOptions
): Promise<GeneratedCashReceipt> {
  const {
    shopName,
    logoUrl,
    createdAt,
    customerName,
    customerPhone,
    items,
    adjustments,
    totalNotes,
    noteAmount,
    adjustmentNet,
    grandTotal,
    showAmountInWords,
    showLogo,
    includeZeroNotes,
  } = options;

  const displayItems = includeZeroNotes
    ? items
    : items.filter((item) => item.qty > 0);

  let logoImg: HTMLImageElement | null = null;
  if (showLogo) {
    logoImg = await loadSafeImage(logoUrl || '/icon-192.png');
    if (!logoImg && logoUrl && logoUrl !== '/icon-192.png') {
      logoImg = await loadSafeImage('/icon-192.png');
    }
  }

  const width = 900;
  const padX = 56;
  const contentWidth = width - padX * 2;
  const hasCustomer = Boolean(customerName?.trim() || customerPhone?.trim());
  const hasAdjustments = adjustments.length > 0 || adjustmentNet !== 0;

  // Pre-measure words lines
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  let wordLines: string[] = [];
  if (showAmountInWords && tempCtx) {
    tempCtx.font = 'italic 700 22px system-ui, -apple-system, sans-serif';
    wordLines = wrapTextLines(tempCtx, numberToIndianWordsEn(grandTotal), contentWidth - 40);
  }

  // Dynamic height calculation
  const headerBlockHeight = 148;
  const customerBlockHeight = hasCustomer ? (customerName?.trim() && customerPhone?.trim() ? 98 : 66) : 0;
  const tableHeaderHeight = 52;
  const rowHeight = 56;
  const rowsCount = Math.max(1, displayItems.length);
  const tableBodyHeight = rowsCount * rowHeight;
  const adjustmentDetailHeight = hasAdjustments ? 56 + adjustments.length * 32 : 0;
  const summaryBlockHeight = 134 + adjustmentDetailHeight;
  const wordsBlockHeight = wordLines.length > 0 ? 34 + wordLines.length * 30 : 0;
  const footerHeight = 84;

  const totalHeight =
    24 + // top bar + outer pad
    headerBlockHeight +
    (hasCustomer ? customerBlockHeight + 24 : 18) +
    tableHeaderHeight +
    tableBodyHeight +
    28 +
    summaryBlockHeight +
    (wordsBlockHeight > 0 ? 22 + wordsBlockHeight : 14) +
    footerHeight;

  const scale = 2; // 2x Retina HD output (1800px wide)
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.scale(scale, scale);

  // Outer Card Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Top Accent Bar (#2D5A27)
  ctx.fillStyle = '#2D5A27';
  ctx.fillRect(0, 0, width, 16);

  // Header Section
  let y = 52;
  const logoSize = 72;
  const textStartX = logoImg ? padX + logoSize + 20 : padX;

  if (logoImg) {
    ctx.save();
    drawRoundedRect(ctx, padX, y, logoSize, logoSize, 18);
    ctx.clip();
    ctx.fillStyle = '#F5F2ED';
    ctx.fillRect(padX, y, logoSize, logoSize);
    ctx.drawImage(logoImg, padX, y, logoSize, logoSize);
    ctx.restore();

    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, padX, y, logoSize, logoSize, 18);
    ctx.stroke();
  }

  ctx.fillStyle = '#111827';
  ctx.font = '800 32px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(shopName || 'फल्सावदिया कृषि बाजार', textStartX, y + 6);

  ctx.fillStyle = '#2D5A27';
  ctx.font = '700 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('Cash Counting Receipt', textStartX, y + 46);

  ctx.fillStyle = '#6B7280';
  ctx.font = '600 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatCashDateTime(createdAt), width - padX, y + 24);
  ctx.textAlign = 'left';

  y += headerBlockHeight - 24;

  // Header Divider
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(width - padX, y);
  ctx.stroke();

  y += 22;

  // Customer Details Block
  if (hasCustomer) {
    ctx.fillStyle = '#F9FAFB';
    drawRoundedRect(ctx, padX, y, contentWidth, customerBlockHeight, 16);
    ctx.fill();
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.stroke();

    let cy = y + 18;
    if (customerName?.trim()) {
      ctx.fillStyle = '#6B7280';
      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Customer:', padX + 22, cy);
      ctx.fillStyle = '#111827';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(customerName.trim(), padX + 145, cy - 1);
      cy += 34;
    }
    if (customerPhone?.trim()) {
      ctx.fillStyle = '#6B7280';
      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Mobile:', padX + 22, cy);
      ctx.fillStyle = '#111827';
      ctx.font = '700 21px system-ui, -apple-system, sans-serif';
      ctx.fillText(customerPhone.trim(), padX + 145, cy);
    }

    y += customerBlockHeight + 24;
  }

  // Table Header
  ctx.fillStyle = '#F3F4F6';
  drawRoundedRect(ctx, padX, y, contentWidth, tableHeaderHeight, 12);
  ctx.fill();

  ctx.fillStyle = '#4B5563';
  ctx.font = '800 18px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('CURRENCY', padX + 24, y + tableHeaderHeight / 2);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', padX + contentWidth * 0.52, y + tableHeaderHeight / 2);
  ctx.textAlign = 'right';
  ctx.fillText('TOTAL (₹)', width - padX - 24, y + tableHeaderHeight / 2);

  y += tableHeaderHeight;

  // Table Rows
  if (displayItems.length === 0) {
    ctx.fillStyle = '#6B7280';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No currency notes recorded', width / 2, y + rowHeight / 2);
    y += rowHeight;
  } else {
    displayItems.forEach((item, index) => {
      if (index % 2 === 1) {
        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(padX, y, contentWidth, rowHeight);
      }

      const style = getDenominationStyle(item.value);
      const midY = y + rowHeight / 2;

      // Accent dot
      ctx.fillStyle = style.accentHex;
      ctx.beginPath();
      ctx.arc(padX + 24, midY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111827';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`₹ ${formatIndianCurrency(item.value)}`, padX + 44, midY);

      ctx.fillStyle = '#374151';
      ctx.font = '700 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.qty}`, padX + contentWidth * 0.52, midY);

      ctx.fillStyle = '#111827';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${formatIndianCurrency(item.subtotal)}`, width - padX - 24, midY);

      ctx.strokeStyle = '#F3F4F6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX + 12, y + rowHeight);
      ctx.lineTo(width - padX - 12, y + rowHeight);
      ctx.stroke();

      y += rowHeight;
    });
  }

  y += 24;

  // Summary Box
  ctx.fillStyle = '#ECFDF5';
  drawRoundedRect(ctx, padX, y, contentWidth, summaryBlockHeight, 20);
  ctx.fill();
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  let sy = y + 26;
  ctx.textBaseline = 'top';

  // Sub-row: Note Amount & Total Notes
  ctx.fillStyle = '#374151';
  ctx.font = '700 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Total Notes: ${totalNotes}`, padX + 26, sy);
  ctx.textAlign = 'right';
  ctx.fillText(`Note Amount: ₹${formatIndianCurrency(noteAmount)}`, width - padX - 26, sy);
  sy += 34;

  if (hasAdjustments) {
    const sign = adjustmentNet >= 0 ? '+' : '-';
    ctx.fillStyle = adjustmentNet >= 0 ? '#166534' : '#B91C1C';
    ctx.font = '700 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Adjustments:', padX + 26, sy);
    ctx.textAlign = 'right';
    ctx.fillText(`${sign}₹${formatIndianCurrency(Math.abs(adjustmentNet))}`, width - padX - 26, sy);
    sy += 32;

    for (const adj of adjustments) {
      const adjSign = adj.type === 'plus' ? '+' : '-';
      ctx.fillStyle = '#4B5563';
      ctx.font = '600 17px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`• ${adj.note?.trim() || (adj.type === 'plus' ? 'Added' : 'Subtracted')}`, padX + 34, sy);
      ctx.textAlign = 'right';
      ctx.fillText(`${adjSign}₹${formatIndianCurrency(adj.amount)}`, width - padX - 26, sy);
      sy += 30;
    }
    sy += 8;
  }

  // Divider inside summary box
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX + 24, sy);
  ctx.lineTo(width - padX - 24, sy);
  ctx.stroke();
  sy += 18;

  // Grand Total Highlight Row
  ctx.fillStyle = '#1B4316';
  ctx.font = '900 30px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Grand Total', padX + 26, sy);

  ctx.fillStyle = '#2D5A27';
  ctx.font = '900 34px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`₹ ${formatIndianCurrency(grandTotal)}`, width - padX - 26, sy - 2);

  y += summaryBlockHeight;

  // Amount in Words
  if (wordLines.length > 0) {
    y += 22;
    ctx.fillStyle = '#1F2937';
    ctx.font = 'italic 700 21px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    for (const line of wordLines) {
      ctx.fillText(line, width / 2, y);
      y += 30;
    }
  } else {
    y += 14;
  }

  // Footer
  y += 18;
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX + 40, y);
  ctx.lineTo(width - padX - 40, y);
  ctx.stroke();

  y += 22;
  ctx.fillStyle = '#6B7280';
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Generated via Falsawdiya Krishi Bazaar • Shamgarh', width / 2, y);

  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create receipt image blob'))),
      'image/png',
      1.0
    );
  });

  const stamp = new Date(createdAt).toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return {
    blob,
    dataUrl,
    fileName: `Cash-Receipt-${stamp}.png`,
  };
}

export async function shareOrDownloadReceiptImage(
  blob: Blob,
  fileName: string,
  summaryText: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'image/png' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: 'Cash Counting Receipt',
        text: summaryText,
      });
      return 'shared';
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall through to download fallback
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'downloaded';
}
