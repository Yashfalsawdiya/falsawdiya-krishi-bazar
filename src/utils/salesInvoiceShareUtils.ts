import { AccountingSale } from '../types/accounting';
import { formatSaleItemInvoiceTitle } from './agriPackagingUtils';
import {
  buildSalesInvoiceFileName,
  formatBillDateDdMmYyyy,
  renderSalesInvoiceCanvas,
} from './salesInvoicePdfGenerator';

export const MAX_IMAGE_SHARE_ITEMS = 10;

export interface GeneratedSalesInvoiceImage {
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

export function isSaleEligibleForImageShare(sale: AccountingSale): boolean {
  const count = Array.isArray(sale.items) ? sale.items.length : 0;
  return count <= MAX_IMAGE_SHARE_ITEMS;
}

export async function generateSalesInvoiceImage(
  sale: AccountingSale,
  customerOutstanding: number = 0,
  customLogoUrl?: string
): Promise<GeneratedSalesInvoiceImage> {
  const fileName = buildSalesInvoiceFileName(sale, 'png');
  const canvas = await renderSalesInvoiceCanvas(sale, customerOutstanding, customLogoUrl);
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('बिल इमेज तैयार नहीं हो सकी।'))),
      'image/png',
      1.0
    );
  });

  return {
    blob,
    dataUrl,
    fileName,
  };
}

export function formatDetailedSalesBillText(
  sale: AccountingSale,
  options?: {
    customerOutstanding?: number;
    includeOutstanding?: boolean;
  }
): string {
  const formattedDate = formatBillDateDdMmYyyy(sale.date, sale.timestamp);
  const formattedTime = sale.timestamp
    ? new Date(sale.timestamp).toLocaleTimeString('hi-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const paymentModeText =
    sale.paymentMode === 'cash'
      ? 'नकद (Cash)'
      : sale.paymentMode === 'online'
      ? 'ऑनलाइन (UPI)'
      : sale.paymentMode === 'split'
      ? 'नकद + UPI'
      : 'उधारी (Credit)';

  const paidAmount = (sale.cashPaid || 0) + (sale.onlinePaid || 0);

  let itemsBlock = '';
  if (sale.items && sale.items.length > 0) {
    itemsBlock = sale.items
      .map((item, idx) => {
        const title = formatSaleItemInvoiceTitle(item);
        const effectiveRate = item.effectiveSellingPrice ?? item.originalSellingPrice;
        const lineTotal = item.totalEffectiveAmount ?? item.quantity * effectiveRate;
        const discount = item.bargainingDiscountShare || 0;

        const qtyDisplay =
          item.saleType === 'loose'
            ? `${item.looseQuantity || item.quantity} ${item.looseUnit || item.unit}`
            : `${item.quantity} ${item.packagingType || item.unit || 'Pack'}${
                item.equivalentQuantityDisplay && item.quantity > 1
                  ? ` (${item.equivalentQuantityDisplay})`
                  : ''
              }`;

        const rateDisplay =
          item.saleType === 'loose' && item.looseRateAmount && item.looseRateUnit
            ? `₹${item.looseRateAmount}/${item.looseRateUnit}`
            : `₹${effectiveRate.toLocaleString('en-IN')}`;

        const extras: string[] = [];
        if (item.hindiName && item.name && item.hindiName !== item.name) {
          extras.push(item.hindiName);
        }
        if (item.batchNumber) {
          extras.push(`बैच: ${item.batchNumber}`);
        }
        if (discount > 0) {
          extras.push(`छूट: -₹${discount.toLocaleString('en-IN')}`);
        }

        const extraLine = extras.length > 0 ? `\n   (${extras.join(' | ')})` : '';
        return `${idx + 1}. *${title}*${extraLine}\n   मात्रा: ${qtyDisplay} | दर: ${rateDisplay} | कुल: ₹${lineTotal.toLocaleString('en-IN')}`;
      })
      .join('\n');
  } else {
    itemsBlock = `कुल बिक्री राशि: ₹${(sale.finalTotal || 0).toLocaleString('en-IN')}`;
  }

  const lines: string[] = [
    '*फल्सावदिया कृषि बाजार*',
    'किसान का भरोसा, हमारी पहचान',
    'पता: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर - (458883)',
    'संपर्क: 8982338046',
    '----------------------------------',
    '*बिक्री बिल (Sales Invoice)*',
    `बिल नं: #${sale.invoiceNo}`,
    `दिनांक: ${formattedDate}${formattedTime ? ` (${formattedTime})` : ''}`,
    `ग्राहक: ${sale.customerName}${sale.customerVillage ? ` (${sale.customerVillage})` : ''}`,
  ];

  if (sale.customerPhone) {
    lines.push(`मोबाइल: ${sale.customerPhone}`);
  }
  if (sale.note && sale.note.trim()) {
    lines.push(`टिप्पणी: ${sale.note.trim()}`);
  }

  lines.push(
    '',
    '*सामान का विवरण:*',
    itemsBlock,
    '----------------------------------',
    `उप-कुल (Subtotal): ₹${(sale.subtotal || sale.finalTotal).toLocaleString('en-IN')}`
  );

  if (sale.bargainingDiscount > 0) {
    lines.push(`मोलभाव / विशेष छूट: -₹${sale.bargainingDiscount.toLocaleString('en-IN')}`);
  }

  lines.push(
    `*अंतिम कुल बिल: ₹${(sale.finalTotal || 0).toLocaleString('en-IN')}*`,
    `जमा की गई राशि: ₹${paidAmount.toLocaleString('en-IN')} (${paymentModeText})`
  );

  if (sale.udhariAmount > 0) {
    lines.push(`*इस बिल पर उधारी: ₹${sale.udhariAmount.toLocaleString('en-IN')}*`);
  } else {
    lines.push('बिल स्थिति: पूर्ण भुगतान सफल');
  }

  if (
    options?.includeOutstanding &&
    typeof options.customerOutstanding === 'number' &&
    options.customerOutstanding > 0
  ) {
    lines.push(
      `किसान का वर्तमान कुल बकाया: ₹${options.customerOutstanding.toLocaleString('en-IN')}`
    );
  }

  lines.push(
    '----------------------------------',
    'फल्सावदिया कृषि बाजार से खरीदारी के लिए धन्यवाद! आपका दिन शुभ हो।'
  );

  return lines.join('\n');
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareFileOrDownloadFallback(
  blob: Blob,
  fileName: string,
  mimeType: string,
  title: string,
  text: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: mimeType });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return 'shared';
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall through to download fallback (e.g. iframe restrictions)
    }
  }

  triggerBlobDownload(blob, fileName);
  return 'downloaded';
}

export function openWhatsAppWithText(phone: string, text: string): void {
  const digits = phone.replace(/\D/g, '');
  const clean10 = digits.length >= 10 ? digits.slice(-10) : '';
  const encoded = encodeURIComponent(text);

  const url =
    clean10.length === 10
      ? `https://wa.me/91${clean10}?text=${encoded}`
      : digits.length > 0
      ? `https://wa.me/${digits}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function isMobileOrTabletDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouchMac =
    typeof document !== 'undefined' &&
    /Macintosh/i.test(ua) &&
    navigator.maxTouchPoints > 1;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || isTouchMac;
}

export function openSmsComposer(
  phone: string,
  text: string
): { opened: boolean; reason?: 'desktop' } {
  if (!isMobileOrTabletDevice()) {
    return { opened: false, reason: 'desktop' };
  }

  const digits = phone.replace(/\D/g, '');
  const clean10 = digits.length >= 10 ? digits.slice(-10) : '';
  const targetNumber =
    clean10.length === 10 ? `+91${clean10}` : digits.length > 0 ? digits : '';

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
  const separator = isIOS ? '&' : '?';
  const encodedBody = encodeURIComponent(text);

  const smsUrl = targetNumber
    ? `sms:${targetNumber}${separator}body=${encodedBody}`
    : `sms:${separator}body=${encodedBody}`;

  const link = document.createElement('a');
  link.href = smsUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { opened: true };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to textarea copy
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
