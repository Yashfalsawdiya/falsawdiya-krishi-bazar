import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { AccountingCustomer, CustomerLedgerEntry } from '../types/accounting';
import { loadLogoBase64 } from './invoiceGenerator';

export interface DownloadCustomerPassbookPdfOptions {
  customer: AccountingCustomer;
  ledgerEntries: CustomerLedgerEntry[];
  logoSource?: any;
  fileName?: string;
}

/**
 * Builds the HTML string for the customer ledger passbook to be rendered in an offscreen iframe.
 * Uses exact formatting matching the screen preview with the official logo and zero emoji.
 */
function buildCustomerPassbookHtml(
  customer: AccountingCustomer,
  ledgerEntries: CustomerLedgerEntry[],
  logoDataUrl: string
): string {
  const currentDate = new Date().toLocaleDateString('hi-IN');
  const isAllPaid = customer.currentOutstanding === 0;

  const rowsHtml = ledgerEntries.length === 0
    ? `
      <tr>
        <td colspan="7" style="padding: 28px; text-align: center; color: #9ca3af; font-size: 12px;">
          कोई लेनदेन दर्ज नहीं है।
        </td>
      </tr>
    `
    : ledgerEntries.map((entry, idx) => {
        const isDebit = entry.type === 'sale_debit';
        const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        return `
          <tr style="background-color: ${bg}; border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 8px; text-align: center; color: #9ca3af; font-size: 11px;">${idx + 1}</td>
            <td style="padding: 10px 8px; color: #1f2937; font-weight: 600; font-size: 11.5px; white-space: nowrap;">${entry.date}</td>
            <td style="padding: 10px 8px; color: #111827; font-size: 11.5px; line-height: 1.5; word-break: break-word;">
              <div style="font-weight: 700;">${isDebit ? 'सामान बिक्री' : `उधारी भुगतान (${entry.paymentMode || 'Cash'})`}</div>
              ${entry.note ? `<div style="font-size: 10px; color: #6b7280; font-weight: normal; margin-top: 2px; line-height: 1.4;">${entry.note}</div>` : ''}
            </td>
            <td style="padding: 10px 8px; color: #4b5563; font-family: monospace; font-size: 11px; white-space: nowrap;">
              ${entry.invoiceNo ? `#${entry.invoiceNo}` : '-'}
            </td>
            <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #047857; font-size: 11.5px; white-space: nowrap;">
              ${!isDebit ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
            </td>
            <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #dc2626; font-size: 11.5px; white-space: nowrap;">
              ${isDebit ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
            </td>
            <td style="padding: 10px 8px; text-align: right; font-weight: 800; color: #111827; font-size: 12px; white-space: nowrap;">
              ₹${entry.balanceAfter.toLocaleString('en-IN')}
            </td>
          </tr>
        `;
      }).join('');

  const displayAccountNumber = customer.accountNumber && customer.accountNumber.trim()
    ? customer.accountNumber.trim()
    : '-';

  return `
    <div style="
      width: 794px;
      min-width: 794px;
      max-width: 794px;
      background-color: #ffffff;
      color: #111827;
      padding: 32px 36px;
      box-sizing: border-box;
      font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      letter-spacing: 0.01em;
    ">
      <!-- HEADER -->
      <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 4px;">
          <img 
            src="${logoDataUrl}" 
            alt="Logo" 
            style="width: 48px; height: 48px; object-fit: contain; border-radius: 50%; vertical-align: middle; display: inline-block; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" 
          />
          <h2 style="font-size: 24px; font-weight: 900; color: #111827; margin: 0; line-height: 1.2; display: inline-block; letter-spacing: -0.01em;">
            फल्सावदिया कृषि बाजार
          </h2>
        </div>
        <p style="font-size: 13px; font-weight: 700; color: #065f46; margin: 3px 0 2px 0; letter-spacing: 0.01em;">किसान का भरोसा, हमारी पहचान</p>
        <p style="font-size: 12px; font-weight: 700; color: #374151; margin: 2px 0;">मोबाइल: 8982338046</p>
        <p style="font-size: 11px; color: #4b5563; margin: 2px auto 8px auto; max-width: 580px; line-height: 1.5;">पता: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर – (458883)</p>
        <div style="display: inline-block; padding: 4px 16px; background-color: #f3f4f6; color: #111827; font-weight: 800; font-size: 11.5px; border-radius: 9999px; letter-spacing: 0.01em;">
          ग्राहक खाता बही पासबुक (Customer Ledger Passbook)
        </div>
      </div>

      <!-- CUSTOMER PROFILE BOX -->
      <div style="
        display: flex; 
        justify-content: space-between; 
        background-color: #f9fafb; 
        border: 1px solid #e5e7eb; 
        border-radius: 16px; 
        padding: 14px 20px; 
        font-size: 12px; 
        margin-bottom: 18px;
        line-height: 1.8;
      ">
        <div>
          <div><strong style="color: #374151;">किसान का नाम:</strong> <span style="font-weight: 700; color: #111827; margin-left: 4px;">${customer.name}</span></div>
          <div><strong style="color: #374151;">मोबाइल नंबर:</strong> <span style="color: #111827; margin-left: 4px;">${customer.phone || 'उपलब्ध नहीं'}</span></div>
          <div><strong style="color: #374151;">गाँव / कस्बा:</strong> <span style="color: #111827; margin-left: 4px;">${customer.village || 'शामगढ़'}</span></div>
        </div>
        <div style="text-align: right;">
          <div><strong style="color: #374151;">खाता संख्या:</strong> <span style="font-family: monospace; font-weight: 800; color: #111827; margin-left: 4px;">${displayAccountNumber}</span></div>
          <div><strong style="color: #374151;">पासबुक प्रिंट दिनांक:</strong> <span style="color: #111827; margin-left: 4px;">${currentDate}</span></div>
          <div><strong style="color: #374151;">खाता स्थिति:</strong> <span style="font-weight: 800; color: ${isAllPaid ? '#047857' : '#dc2626'}; margin-left: 4px;">${isAllPaid ? 'खाता चुकता' : 'उधारी खाता चालू'}</span></div>
        </div>
      </div>

      <!-- FINANCIAL SUMMARY -->
      <div style="
        display: grid; 
        grid-template-columns: 1fr 1fr 1fr; 
        background-color: #ecfdf5; 
        border: 1px solid #a7f3d0; 
        border-radius: 16px; 
        padding: 12px; 
        text-align: center; 
        margin-bottom: 20px;
      ">
        <div style="padding: 4px 8px;">
          <span style="display: block; font-size: 10px; color: #6b7280; font-weight: 600;">कुल खरीद</span>
          <strong style="font-size: 14px; font-weight: 800; color: #111827;">₹${(customer.totalPurchases || 0).toLocaleString('en-IN')}</strong>
        </div>
        <div style="padding: 4px 8px; border-left: 1px solid #a7f3d0; border-right: 1px solid #a7f3d0;">
          <span style="display: block; font-size: 10px; color: #6b7280; font-weight: 600;">कुल जमा राशि</span>
          <strong style="font-size: 14px; font-weight: 800; color: #065f46;">₹${(customer.totalPaid || 0).toLocaleString('en-IN')}</strong>
        </div>
        <div style="padding: 4px 8px;">
          <span style="display: block; font-size: 10px; color: #6b7280; font-weight: 600;">वर्तमान शुद्ध बकाया</span>
          <strong style="font-size: 16px; font-weight: 800; color: #dc2626;">₹${(customer.currentOutstanding || 0).toLocaleString('en-IN')}</strong>
        </div>
      </div>

      <!-- SYSTEMATIC LEDGER TABLE -->
      <div style="
        border: 1px solid #e5e7eb; 
        border-radius: 16px; 
        overflow: hidden; 
        margin-bottom: 28px;
      ">
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left; table-layout: fixed;">
          <thead>
            <tr style="background-color: #f3f4f6; color: #374151; border-bottom: 1px solid #e5e7eb;">
              <th style="padding: 10px 8px; font-weight: 700; width: 36px; text-align: center;">क्र.</th>
              <th style="padding: 10px 8px; font-weight: 700; width: 85px;">दिनांक</th>
              <th style="padding: 10px 8px; font-weight: 700; width: 235px;">विवरण व संदर्भ</th>
              <th style="padding: 10px 8px; font-weight: 700; width: 95px;">बिल/रसीद नं.</th>
              <th style="padding: 10px 8px; font-weight: 700; text-align: right; color: #047857; width: 85px;">जमा (-)</th>
              <th style="padding: 10px 8px; font-weight: 700; text-align: right; color: #dc2626; width: 85px;">उधारी (+)</th>
              <th style="padding: 10px 8px; font-weight: 700; text-align: right; width: 85px;">खाता शेष</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- FOOTER / AUTHORIZED SIGNATORY -->
      <div style="
        display: flex; 
        justify-content: space-between; 
        align-items: flex-end; 
        padding-top: 16px; 
        border-top: 1px solid #e5e7eb; 
        font-size: 11px; 
        color: #6b7280;
      ">
        <div>
          <p style="margin: 0; line-height: 1.5; color: #4b5563;">नोट: यह एक अधिकृत कंप्यूटरीकृत खाता विवरणी है।</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #9ca3af;">फल्सावदिया कृषि बाजार · शामगढ़ (मंदसौर)</p>
        </div>
        <div style="text-align: center;">
          <div style="width: 140px; border-bottom: 1px solid #9ca3af; margin: 0 auto 6px auto;"></div>
          <p style="margin: 0; font-weight: 700; color: #1f2937;">अधिकृत हस्ताक्षर / मुहर</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Downloads the Customer Ledger Passbook as a clean, crisp A4 PDF file.
 * Handles fonts, logo rasterization, and responsive cross-platform download.
 */
export async function downloadCustomerPassbookPDF(
  options: DownloadCustomerPassbookPdfOptions
): Promise<{ success: boolean; fileName: string; error?: string }> {
  const { customer, ledgerEntries, logoSource } = options;
  const safeName = (customer.name || 'किसान').replace(/[\s/\\?%*:|"<>]+/g, '_');
  const fileName = options.fileName || `फल्सावदिया_पासबुक_${safeName}_#${customer.id.slice(0, 6).toUpperCase()}.pdf`;

  // Pre-load logo to Base64 to prevent canvas CORS security errors
  let logoDataUrl = '/icon-192.png';
  try {
    logoDataUrl = await loadLogoBase64(logoSource || '/icon-192.png');
  } catch (err) {
    console.warn('Failed to load logo base64 for passbook, using fallback:', err);
  }

  // Create isolated offscreen iframe to insulate html2canvas from host Tailwind v4 stylesheet issues
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
          <base href="${typeof window !== 'undefined' ? window.location.origin : ''}">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; 
              background-color: #ffffff; 
              color: #111827; 
              letter-spacing: normal;
              word-spacing: normal;
              text-rendering: optimizeLegibility;
              -webkit-font-smoothing: antialiased;
            }
            table { border-collapse: collapse; }
          </style>
        </head>
        <body style="background-color: #ffffff; margin: 0; padding: 0;">
          <div id="passbook-render-target" style="width: 794px; background-color: #ffffff;">
            ${buildCustomerPassbookHtml(customer, ledgerEntries, logoDataUrl)}
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
    await new Promise((resolve) => setTimeout(resolve, 250));

    const renderTarget = iframeDoc.getElementById('passbook-render-target') || iframeDoc.body;

    const canvas = await html2canvas(renderTarget, {
      scale: 2, // Crisp 2x retina scale for sharp Hindi glyphs
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
      onclone: (clonedDoc, clonedElement) => {
        // Strip any style tags that might contain unsupported oklch
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

    // Single or Multi-page mapping
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

    // Direct save triggers native browser / mobile download
    pdf.save(fileName);
    return { success: true, fileName };
  } catch (err: any) {
    console.error('Error generating customer passbook PDF:', err);
    return { success: false, fileName, error: err.message || 'पासबुक PDF जनरेट करने में असमर्थ' };
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}
