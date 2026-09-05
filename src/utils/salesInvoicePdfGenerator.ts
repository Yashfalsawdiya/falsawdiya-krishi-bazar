import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { AccountingSale } from '../types/accounting';

export interface GenerateInvoicePdfOptions {
  sale: AccountingSale;
  customerOutstanding?: number;
  fileName?: string;
}

export interface InvoiceHtmlMeta {
  pageNum?: number;
  totalPages?: number;
  monthTitle?: string;
}

/**
 * Renders the clean, dedicated printable sales invoice HTML string
 * for offscreen rasterization and PDF generation.
 */
function buildInvoiceHtml(
  sale: AccountingSale, 
  customerOutstanding: number = 0,
  meta?: InvoiceHtmlMeta
): string {
  const paymentModeText = 
    sale.paymentMode === 'cash' ? 'नकद (Cash)' :
    sale.paymentMode === 'online' ? 'ऑनलाइन (UPI)' :
    sale.paymentMode === 'split' ? 'नकद + UPI' : 'उधारी (Credit)';

  const paidAmount = (sale.cashPaid || 0) + (sale.onlinePaid || 0);

  const formattedTime = sale.timestamp 
    ? new Date(sale.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  const itemsHtml = (sale.items && sale.items.length > 0)
    ? sale.items.map((item, idx) => {
        const effectiveRate = item.effectiveSellingPrice ?? item.originalSellingPrice;
        const lineTotal = item.totalEffectiveAmount ?? (item.quantity * effectiveRate);
        const discount = item.bargainingDiscountShare || 0;
        const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';

        const variantBadge = item.variantLabel ? `<span style="font-size: 10px; color: #065f46; font-weight: 700; background-color: #d1fae5; padding: 1px 5px; border-radius: 4px; margin-left: 4px; border: 1px solid #a7f3d0;">${item.variantLabel}</span>` : '';
        const looseBadge = item.saleType === 'loose' ? `<span style="font-size: 10px; color: #1e40af; font-weight: 700; background-color: #dbeafe; padding: 1px 5px; border-radius: 4px; margin-left: 4px; border: 1px solid #bfdbfe;">💧 खुला (${item.looseQuantity || item.quantity} ${item.looseUnit || item.unit})</span>` : '';
        const batchBadge = item.batchNumber ? `<span style="font-size: 9px; color: #6b7280; margin-left: 4px;">बैच: ${item.batchNumber}</span>` : '';

        const qtyDisplay = item.saleType === 'loose'
          ? `${item.looseQuantity || item.quantity} ${item.looseUnit || item.unit}`
          : `${item.quantity} ${item.unit}`;

        return `
          <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px; text-align: center; color: #6b7280;">${idx + 1}</td>
            <td style="padding: 8px;">
              <div style="font-weight: 700; color: #111827; font-size: 12px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                <span>${item.hindiName || item.name}</span>
                ${variantBadge}
                ${looseBadge}
              </div>
              <div style="display: flex; gap: 8px; align-items: center; margin-top: 2px;">
                ${item.hindiName && item.name && item.hindiName !== item.name ? `<span style="font-size: 10px; color: #6b7280;">${item.name}</span>` : ''}
                ${batchBadge}
              </div>
            </td>
            <td style="padding: 8px; text-align: center; font-weight: 700; color: #1f2937;">${qtyDisplay}</td>
            <td style="padding: 8px; text-align: right; color: #4b5563;">₹${(item.originalSellingPrice || effectiveRate).toLocaleString()}</td>
            <td style="padding: 8px; text-align: right; color: #047857; font-weight: 700;">${discount > 0 ? `-₹${discount.toLocaleString()}` : '-'}</td>
            <td style="padding: 8px; text-align: right; color: #111827; font-weight: 700;">₹${effectiveRate.toLocaleString()}</td>
            <td style="padding: 8px; text-align: right; color: #111827; font-weight: 800; font-size: 12px;">₹${lineTotal.toLocaleString()}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="7" style="padding: 16px; text-align: center; color: #6b7280;">
          कुल बिक्री राशि: ₹${sale.finalTotal.toLocaleString()}
        </td>
      </tr>
    `;

  return `
    <div style="
      width: 794px;
      min-width: 794px;
      max-width: 794px;
      background-color: #ffffff;
      color: #111827;
      font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      padding: 28px 32px;
      box-sizing: border-box;
      line-height: 1.4;
    ">
      <!-- HEADER -->
      <div style="border-bottom: 2px solid #047857; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 26px;">🌱</span>
            <div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px;">फल्सावदिया कृषि बाजार</h1>
              <div style="font-size: 11px; font-weight: 700; color: #047857;">Falsawdiya Krishi Bazaar</div>
            </div>
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #065f46; margin-top: 4px;">
            किसान का भरोसा, हमारी पहचान · उच्च गुणवत्ता कीटनाशक, बीज एवं उर्वरक
          </div>
          <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">
            डिंपल चौराहा, शामगढ़ (जिला मन्दसौर, म.प्र.) | पिन: 458883
          </div>
          <div style="font-size: 11px; color: #4b5563;">
            संपर्क: <strong style="color: #111827;">8982338046, 98260XXXXX</strong>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="display: inline-block; background-color: #d1fae5; color: #065f46; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 6px; border: 1px solid #a7f3d0; margin-bottom: 6px;">
            बिक्री बिल / SALES INVOICE
          </div>
          <div style="font-size: 12px; color: #4b5563;">
            <div>बिल नंबर: <strong style="color: #111827; font-family: monospace;">#${sale.invoiceNo}</strong></div>
            <div>दिनांक: <strong style="color: #111827;">${sale.date}${formattedTime ? ` (${formattedTime})` : ''}</strong></div>
            ${meta?.monthTitle ? `<div style="font-size: 10px; color: #047857; font-weight: 600; margin-top: 2px;">माह: ${meta.monthTitle}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- CUSTOMER & PAYMENT INFO -->
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between;">
        <div>
          <div style="font-size: 10px; font-weight: 700; color: #065f46; text-transform: uppercase; margin-bottom: 2px;">
            ग्राहक का विवरण (Customer Details)
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #111827;">
            ${sale.customerName}
          </div>
          <div style="font-size: 11px; color: #374151; margin-top: 2px;">
            ${sale.customerVillage ? `गाँव: <strong>${sale.customerVillage}</strong>` : ''}
            ${sale.customerVillage && sale.customerPhone ? ' · ' : ''}
            ${sale.customerPhone ? `मो: <strong>${sale.customerPhone}</strong>` : ''}
          </div>
          ${sale.note ? `<div style="font-size: 11px; color: #065f46; font-style: italic; margin-top: 2px;">टिप्पणी: ${sale.note}</div>` : ''}
        </div>

        <div style="text-align: right;">
          <div style="font-size: 10px; font-weight: 700; color: #065f46; text-transform: uppercase; margin-bottom: 2px;">
            भुगतान विवरण (Payment Info)
          </div>
          <div style="font-size: 12px; color: #374151;">
            भुगतान माध्यम: <strong style="color: #111827; background: #ffffff; padding: 2px 8px; border-radius: 4px; border: 1px solid #d1fae5;">${paymentModeText}</strong>
          </div>
          <div style="font-size: 11px; margin-top: 4px; color: ${sale.udhariAmount > 0 ? '#b45309' : '#047857'}; font-weight: 700;">
            ${sale.udhariAmount > 0 ? 'आंशिक उधारी बिल' : 'पूर्ण भुगतान सफल'}
          </div>
        </div>
      </div>

      <!-- PRODUCTS TABLE -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #065f46; color: #ffffff; text-align: left;">
            <th style="padding: 8px; text-align: center; width: 32px;">#</th>
            <th style="padding: 8px;">सामान / उत्पाद का नाम</th>
            <th style="padding: 8px; text-align: center; width: 70px;">मात्रा</th>
            <th style="padding: 8px; text-align: right; width: 75px;">मूल भाव</th>
            <th style="padding: 8px; text-align: right; width: 60px;">छूट</th>
            <th style="padding: 8px; text-align: right; width: 75px;">शुद्ध दर</th>
            <th style="padding: 8px; text-align: right; width: 90px;">कुल योग</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- SUMMARY / TOTALS -->
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; display: flex; justify-content: space-between;">
        <div style="width: 48%; border-right: 1px solid #e5e7eb; padding-right: 12px;">
          <div style="font-size: 11px; color: #4b5563;">
            <div><strong>बिल संदर्भ:</strong> #${sale.invoiceNo}</div>
            <div><strong>दिनांक:</strong> ${sale.date}</div>
          </div>
          <div style="margin-top: 10px; font-size: 10px; color: #6b7280; line-height: 1.5;">
            <strong style="color: #065f46;">नियम व शर्तें:</strong><br/>
            1. बीज व कीटनाशक का उपयोग कृषि विशेषज्ञ के परामर्शानुसार ही करें।<br/>
            2. यह कंप्यूटर द्वारा अधिकृत बिक्री बिल है।
          </div>
        </div>

        <div style="width: 48%; padding-left: 12px; text-align: right; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #4b5563;">
            <span>उप-कुल (Subtotal):</span>
            <strong style="color: #111827;">₹${(sale.subtotal || sale.finalTotal).toLocaleString()}</strong>
          </div>

          ${sale.bargainingDiscount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #047857; font-weight: 700;">
              <span>मोलभाव / विशेष छूट:</span>
              <span>-₹${sale.bargainingDiscount.toLocaleString()}</span>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #d1d5db; padding-top: 6px; padding-bottom: 4px; margin-top: 6px;">
            <span style="font-size: 13px; font-weight: 800; color: #111827;">अंतिम कुल बिल:</span>
            <span style="font-size: 16px; font-weight: 900; color: #064e3b;">₹${sale.finalTotal.toLocaleString()}</span>
          </div>

          <div style="display: flex; justify-content: space-between; background-color: #ecfdf5; padding: 4px 8px; border-radius: 4px; border: 1px solid #a7f3d0; margin-bottom: 4px; color: #047857; font-weight: 700;">
            <span>जमा की गई राशि:</span>
            <span>₹${paidAmount.toLocaleString()}</span>
          </div>

          ${sale.udhariAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; background-color: #fef2f2; padding: 4px 8px; border-radius: 4px; border: 1px solid #fecaca; margin-bottom: 4px; color: #b91c1c; font-weight: 800;">
              <span>इस बिल पर उधारी:</span>
              <span>₹${sale.udhariAmount.toLocaleString()}</span>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 4px; margin-top: 4px; font-size: 11px; color: #4b5563;">
            <span>किसान का वर्तमान कुल बकाया:</span>
            <strong style="color: ${customerOutstanding > 0 ? '#dc2626' : '#047857'}; font-size: 12px;">₹${customerOutstanding.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <!-- FOOTER / SIGNATURE -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <div style="font-size: 11px; color: #6b7280;">
          <div>धन्यवाद! आपका दिन शुभ हो। फल्सावदिया कृषि बाजार में पुनः पधारें।</div>
          <div style="font-size: 9px; color: #9ca3af; margin-top: 2px;">
            ${meta?.pageNum ? `<span style="font-weight: 700; color: #047857; margin-right: 8px;">पेज: ${meta.pageNum} / ${meta.totalPages} (बिल #${sale.invoiceNo})</span>` : ''}फल्सावदिया कृषि लेखा बही प्रबंधन प्रणाली
          </div>
        </div>

        <div style="text-align: center;">
          <div style="width: 150px; border-bottom: 1px solid #9ca3af; margin-bottom: 4px;"></div>
          <div style="font-weight: 700; font-size: 11px; color: #1f2937;">वास्ते: फल्सावदिया कृषि बाजार</div>
          <div style="font-size: 10px; color: #6b7280;">अधिकृत हस्ताक्षर / मुहर</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Directly downloads the Sales Invoice as a crisp, single-page A4 PDF file.
 */
export async function downloadSalesInvoicePDF(
  sale: AccountingSale,
  customerOutstanding: number = 0
): Promise<{ success: boolean; fileName: string; error?: string }> {
  const fileName = `फल्सावदिया_बिल_${sale.invoiceNo}.pdf`;

  // Create an isolated offscreen iframe so parent Tailwind v4 stylesheets (containing oklch)
  // are never evaluated by html2canvas
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.zIndex = '-99999';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('प्रिंटिंग फ्रेम तैयार नहीं किया जा सका।');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; 
              background-color: #ffffff; 
              color: #111827; 
            }
            table { border-collapse: collapse; }
          </style>
        </head>
        <body style="background-color: #ffffff; margin: 0; padding: 0;">
          <div id="invoice-render-target" style="width: 794px; background-color: #ffffff;">
            ${buildInvoiceHtml(sale, customerOutstanding)}
          </div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Wait for fonts & layout
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await iframeDoc.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    const renderTarget = iframeDoc.getElementById('invoice-render-target') || iframeDoc.body;

    const canvas = await html2canvas(renderTarget, {
      scale: 2, // 2x resolution for crisp Hindi font and numbers
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
      onclone: (clonedDoc, clonedElement) => {
        // Strip any style tags or stylesheet links that might contain unsupported oklch
        const allStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        allStyles.forEach(s => {
          if (s.textContent && s.textContent.includes('oklch')) {
            s.remove();
          }
        });

        if (clonedElement) {
          clonedElement.style.position = 'static';
          clonedElement.style.left = '0px';
          clonedElement.style.top = '0px';
          clonedElement.style.display = 'block';
          clonedElement.style.visibility = 'visible';
        }
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Initialize A4 PDF (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8; // 8mm margin
    const contentWidth = pageWidth - margin * 2; // 194mm printable width
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    // Single page check: if within A4 bounds, write 1 page only!
    if (contentHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
    } else {
      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft > 0) {
        position = heightLeft - contentHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
    }

    // Save PDF
    pdf.save(fileName);
    return { success: true, fileName };
  } catch (err: any) {
    console.error('Error generating sales invoice PDF:', err);
    return { success: false, fileName, error: err.message || 'PDF जनरेट करने में असमर्थ' };
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

export interface ExportMonthlyPOSBillsPdfOptions {
  sales: AccountingSale[];
  monthLabel: string;
  fileName: string;
  onProgress?: (current: number, total: number, currentInvoiceNo: string) => void;
}

/**
 * Exports all POS bills for a selected month into a single consolidated PDF document.
 * GUARANTEES:
 * - One Bill = Exactly One PDF Page (Page 1 -> Bill 1, Page 2 -> Bill 2, etc.)
 * - Zero blank pages
 * - Complete professional styling with shop branding, customer details, products, & totals
 */
export async function exportMonthlyPOSBillsPDF(
  options: ExportMonthlyPOSBillsPdfOptions
): Promise<{ success: boolean; fileName: string; error?: string; count: number; totalAmount: number }> {
  const { sales, monthLabel, fileName, onProgress } = options;

  if (!sales || sales.length === 0) {
    return {
      success: false,
      fileName,
      error: 'इस महीने में कोई नकद बिक्री बिल नहीं मिला।',
      count: 0,
      totalAmount: 0,
    };
  }

  // Sort chronologically ascending so bills appear in sequence
  const sortedSales = [...sales].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const totalAmount = sortedSales.reduce((sum, s) => sum + (s.finalTotal || 0), 0);

  // Create isolated offscreen iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.zIndex = '-99999';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('प्रिंटिंग फ्रेम तैयार नहीं किया जा सका।');
    }

    // Initialize A4 PDF (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8; // 8mm margin
    const printableWidth = pageWidth - margin * 2; // 194mm printable width
    const printableHeight = pageHeight - margin * 2; // 281mm printable height

    for (let i = 0; i < sortedSales.length; i++) {
      const sale = sortedSales[i];
      if (onProgress) {
        onProgress(i + 1, sortedSales.length, sale.invoiceNo);
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { 
                font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; 
                background-color: #ffffff; 
                color: #111827; 
              }
              table { border-collapse: collapse; }
            </style>
          </head>
          <body style="background-color: #ffffff; margin: 0; padding: 0;">
            <div id="invoice-render-target" style="width: 794px; background-color: #ffffff;">
              ${buildInvoiceHtml(sale, 0, {
                pageNum: i + 1,
                totalPages: sortedSales.length,
                monthTitle: monthLabel,
              })}
            </div>
          </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait for fonts & layout
      if (iframeDoc.fonts && iframeDoc.fonts.ready) {
        await iframeDoc.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));

      const renderTarget = iframeDoc.getElementById('invoice-render-target') || iframeDoc.body;

      const canvas = await html2canvas(renderTarget, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
        onclone: (clonedDoc, clonedElement) => {
          const allStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          allStyles.forEach((s) => {
            if (s.textContent && s.textContent.includes('oklch')) {
              s.remove();
            }
          });

          if (clonedElement) {
            clonedElement.style.position = 'static';
            clonedElement.style.left = '0px';
            clonedElement.style.top = '0px';
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Fit strictly within exactly 1 single A4 page
      let w = printableWidth;
      let h = (canvas.height * printableWidth) / canvas.width;
      if (h > printableHeight) {
        const scaleFactor = printableHeight / h;
        w = w * scaleFactor;
        h = printableHeight;
      }
      const x = margin + (printableWidth - w) / 2;
      const y = margin;

      // Only add a new page after page 1
      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'JPEG', x, y, w, h, undefined, 'FAST');
    }

    // Save final PDF
    pdf.save(fileName);
    return {
      success: true,
      fileName,
      count: sortedSales.length,
      totalAmount,
    };
  } catch (err: any) {
    console.error('Error generating monthly POS bills PDF:', err);
    return {
      success: false,
      fileName,
      error: err.message || 'मासिक PDF तैयार करने में असमर्थ',
      count: 0,
      totalAmount: 0,
    };
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

