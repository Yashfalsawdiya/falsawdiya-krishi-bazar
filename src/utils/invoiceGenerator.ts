import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Order, ImageSource } from '../types';
import { getHighResImageURL } from '../lib/utils';

export interface InvoiceStoreInfo {
  storeName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  logo?: string | ImageSource;
}

const formatDateTime = (timestamp: number) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return new Date(timestamp).toLocaleString();
  }
};

const getStatusHindi = (status: string) => {
  switch (status) {
    case 'placed':
      return 'दर्ज (Placed)';
    case 'confirmed':
      return 'स्वीकृत (Confirmed)';
    case 'dispatched':
      return 'रवाना (Dispatched / Shipped)';
    case 'out_for_delivery':
      return 'डिलीवरी के लिए रवाना (Out for Delivery)';
    case 'delivered':
      return 'सफलतापूर्वक डिलीवर (Delivered)';
    case 'cancelled':
      return 'रद्द (Cancelled)';
    default:
      return status;
  }
};

const getPaymentStatusHindi = (status: string) => {
  switch (status) {
    case 'paid':
      return 'भुगतान सफल (PAID)';
    case 'pending':
      return 'लंबित (PENDING)';
    case 'failed':
      return 'असफल (FAILED)';
    default:
      return status.toUpperCase();
  }
};

/**
 * Loads an image from URL or relative path and converts to Base64 Data URL
 * to avoid CORS/taint issues in html2canvas.
 */
const loadLogoBase64 = async (logoSource?: string | ImageSource): Promise<string> => {
  const url = getHighResImageURL(logoSource) || '/icon-192.png';
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 192;
        canvas.height = img.naturalHeight || 192;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (e) {
        console.warn('Canvas conversion to base64 failed, using raw url', e);
      }
      resolve(url);
    };
    img.onerror = () => {
      // If provided url fails, fallback to local icon-192.png
      if (url !== '/icon-192.png') {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = fallbackImg.naturalWidth || 192;
            canvas.height = fallbackImg.naturalHeight || 192;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(fallbackImg, 0, 0);
              resolve(canvas.toDataURL('image/png'));
              return;
            }
          } catch {
            // ignore
          }
          resolve('/icon-192.png');
        };
        fallbackImg.onerror = () => resolve('/icon-192.png');
        fallbackImg.src = '/icon-192.png';
      } else {
        resolve('/icon-192.png');
      }
    };
    img.src = url;
  });
};

export const generateOrderInvoicePDF = async (
  order: Order,
  storeInfo?: InvoiceStoreInfo
): Promise<{ success: boolean; fileName: string; error?: string }> => {
  const fileName = `Invoice-${order.orderNumber}.pdf`;
  const defaultStoreName = storeInfo?.storeName || 'फल्सावदिया कृषि बाजार';
  const defaultTagline = storeInfo?.tagline || 'किसान का भरोसा, हमारी पहचान';
  const phone = storeInfo?.phone || '+91 89823 38046';
  const address = storeInfo?.address || 'मध्य प्रदेश (भारत)';

  // Load logo as base64 for reliable crisp rendering
  const logoBase64 = await loadLogoBase64(storeInfo?.logo);

  // 1. Create a container element with fixed A4 dimensions in pixels (794px width for standard A4)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1f2937';
  container.style.fontFamily = '"Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  container.style.boxSizing = 'border-box';
  container.style.padding = '32px';
  container.style.zIndex = '-9999';

  const orderDateStr = formatDateTime(order.createdAt);
  const statusHindi = getStatusHindi(order.status);
  const paymentStatusHindi = getPaymentStatusHindi(order.paymentStatus);
  const isPaid = order.paymentStatus === 'paid';

  const itemsHtml = order.items
    .map((item, index) => {
      const subtotal = item.price * item.quantity;
      return `
        <tr style="border-bottom: 1px solid #e5e7eb; font-size: 13px;">
          <td style="padding: 11px 8px; text-align: center; color: #6b7280; font-weight: 600; vertical-align: middle;">${index + 1}</td>
          <td style="padding: 11px 12px; vertical-align: middle;">
            <div style="font-weight: 700; color: #111827; font-size: 14px; line-height: 1.3;">${item.hindiName || item.name}</div>
            <div style="color: #6b7280; font-size: 11px; margin-top: 2px; line-height: 1.2;">${item.name ? `${item.name} • ` : ''}${item.brand || 'कृषि उत्पाद'}</div>
          </td>
          <td style="padding: 11px 8px; text-align: center; color: #374151; font-weight: 600; vertical-align: middle;">${item.unit || 'यूनिट'}</td>
          <td style="padding: 11px 8px; text-align: center; font-weight: 700; color: #111827; vertical-align: middle;">${item.quantity}</td>
          <td style="padding: 11px 12px; text-align: right; color: #374151; font-weight: 600; vertical-align: middle; white-space: nowrap;">₹${item.price.toLocaleString('en-IN')}</td>
          <td style="padding: 11px 12px; text-align: right; font-weight: 700; color: #2D5A27; vertical-align: middle; white-space: nowrap;">₹${subtotal.toLocaleString('en-IN')}</td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
      * {
        box-sizing: border-box;
      }
    </style>
    <div style="border: 2px solid #2D5A27; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); box-sizing: border-box;">
      
      <!-- Top Header / Banner -->
      <div style="background: linear-gradient(135deg, #2D5A27 0%, #1e3d1a 100%); color: #ffffff; padding: 22px 28px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
        
        <!-- Left: Official Logo & Brand Info -->
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; min-width: 52px; background: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.12); padding: 4px; box-sizing: border-box;">
            <img src="${logoBase64}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; display: block;" />
          </div>
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; line-height: 1.25; color: #ffffff; letter-spacing: -0.2px;">
              ${defaultStoreName}
            </h1>
            <p style="margin: 3px 0 0 0; font-size: 11px; color: #EAB308; font-weight: 700; line-height: 1.2;">
              ${defaultTagline}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 10.5px; color: #e2f1df; font-weight: 500; line-height: 1.2;">
              📞 संपर्क: ${phone} | 📍 ${address}
            </p>
          </div>
        </div>

        <!-- Right: Tax Invoice Badge & Metadata -->
        <div style="text-align: right;">
          <div style="display: inline-block; background: #ffffff; color: #2D5A27; font-size: 11px; font-weight: 900; padding: 5px 14px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; text-align: center; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            ई-रसीद / TAX INVOICE
          </div>
          <div style="margin-top: 8px; font-size: 15px; font-weight: 800; font-family: monospace; color: #fef08a; letter-spacing: 0.3px;">
            #${order.orderNumber}
          </div>
          <div style="font-size: 11px; color: #e2f1df; margin-top: 3px; font-weight: 500;">
            दिनांक: ${orderDateStr}
          </div>
        </div>
      </div>

      <!-- Invoice Details Grid -->
      <div style="padding: 20px 28px; background: #faf8f5; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Customer & Shipping Details -->
            <td style="width: 50%; vertical-align: top; padding-right: 14px;">
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; height: 100%; box-sizing: border-box;">
                <div style="font-size: 11.5px; font-weight: 800; color: #2D5A27; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.3px;">
                  📍 ग्राहक एवं डिलीवरी विवरण (CUSTOMER DETAILS)
                </div>
                <div style="font-size: 15px; font-weight: 800; color: #111827; margin-bottom: 4px; line-height: 1.3;">
                  ${order.customerDetails.name}
                </div>
                <div style="font-size: 12.5px; color: #4b5563; line-height: 1.45;">
                  <div>${order.customerDetails.addressHouse}</div>
                  <div>${order.customerDetails.addressCity}, ${order.customerDetails.addressDistrict}</div>
                  <div>${order.customerDetails.addressState} - <span style="font-weight: 700; color: #1f2937;">${order.customerDetails.addressPincode}</span></div>
                </div>
                <div style="font-size: 12.5px; font-weight: 700; color: #1f2937; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e5e7eb;">
                  📱 मोबाइल: ${order.customerDetails.phone}
                </div>
              </div>
            </td>

            <!-- Order & Payment Status -->
            <td style="width: 50%; vertical-align: top; padding-left: 14px;">
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; height: 100%; box-sizing: border-box;">
                <div style="font-size: 11.5px; font-weight: 800; color: #2D5A27; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.3px;">
                  💳 भुगतान एवं ऑर्डर स्थिति (PAYMENT INFO)
                </div>
                <table style="width: 100%; font-size: 12px; line-height: 1.6; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 4px 0; vertical-align: middle; text-align: left;">ऑर्डर स्थिति:</td>
                    <td style="text-align: right; font-weight: 800; color: #111827; padding: 4px 0; vertical-align: middle;">${statusHindi}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 4px 0; vertical-align: middle; text-align: left;">भुगतान स्थिति:</td>
                    <td style="text-align: right; padding: 4px 0; vertical-align: middle;">
                      <span style="display: inline-block; background: ${isPaid ? '#ecfdf5' : '#fffbeb'}; color: ${isPaid ? '#047857' : '#b45309'}; border: 1px solid ${isPaid ? '#a7f3d0' : '#fde68a'}; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; line-height: 1.2; text-align: center; white-space: nowrap;">
                        ${isPaid ? '✓ ' : ''}${paymentStatusHindi}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 4px 0; vertical-align: middle; text-align: left;">भुगतान माध्यम:</td>
                    <td style="text-align: right; font-weight: 700; color: #111827; padding: 4px 0; vertical-align: middle;">
                      ${order.paymentMethod === 'online_razorpay' ? 'ऑनलाइन Razorpay (UPI/Card)' : 'अन्य भुगतान'}
                    </td>
                  </tr>
                  ${order.razorpayPaymentId ? `
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 4px 0; vertical-align: middle; text-align: left;">Razorpay Txn ID:</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 700; color: #2D5A27; font-size: 11px; padding: 4px 0; vertical-align: middle;">
                      ${order.razorpayPaymentId}
                    </td>
                  </tr>
                  ` : ''}
                  ${order.trackingNumber ? `
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 4px 0; vertical-align: middle; text-align: left;">कूरियर ट्रैकिंग:</td>
                    <td style="text-align: right; font-weight: 700; color: #4338ca; padding: 4px 0; vertical-align: middle;">
                      ${order.courierPartner || 'Speed Post'}: ${order.trackingNumber}
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Items Table Section -->
      <div style="padding: 16px 28px; box-sizing: border-box;">
        <div style="font-size: 12.5px; font-weight: 800; color: #374151; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.3px;">
          📦 खरीदे गए उत्पाद विवरण (ORDERED ITEMS)
        </div>
        <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f3f4f6; color: #374151; font-size: 12px; font-weight: 800; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 10px 8px; text-align: center; width: 40px; vertical-align: middle;">#</th>
              <th style="padding: 10px 12px; text-align: left; vertical-align: middle;">उत्पाद नाम एवं विवरण (Product)</th>
              <th style="padding: 10px 8px; text-align: center; width: 80px; vertical-align: middle;">पैकिंग (Unit)</th>
              <th style="padding: 10px 8px; text-align: center; width: 60px; vertical-align: middle;">मात्रा</th>
              <th style="padding: 10px 12px; text-align: right; width: 100px; vertical-align: middle;">दर (Price)</th>
              <th style="padding: 10px 12px; text-align: right; width: 110px; vertical-align: middle;">कुल (Subtotal)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Price Breakdown & Summary Section -->
      <div style="padding: 10px 28px 22px 28px; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Left: Terms & Notice Card -->
            <td style="width: 55%; vertical-align: top; padding-right: 18px;">
              <div style="background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 12px; padding: 14px; font-size: 11px; color: #4b5563; line-height: 1.5; box-sizing: border-box;">
                <div style="font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                  📋 नियम एवं शर्तें (Terms & Notice):
                </div>
                <div>1. यह कंप्यूटर द्वारा स्वतः उत्पन्न डिजिटल टैक्स इनवॉइस है।</div>
                <div>2. असली एवं प्रामाणिक कृषि उत्पाद सीधे आपके पते पर सुरक्षित पहुँचाए जाएंगे।</div>
                <div>3. किसी भी सहायता के लिए हेल्पलाइन <strong>${phone}</strong> पर संपर्क करें।</div>
              </div>
            </td>

            <!-- Right: Exact Two-Column Grand Total Summary Card -->
            <td style="width: 45%; vertical-align: top;">
              <div style="background: #faf8f5; border: 1.5px solid #2D5A27; border-radius: 12px; padding: 14px 16px; box-sizing: border-box;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 12px; font-weight: 600; text-align: left; vertical-align: middle;">
                      उत्पाद कुल मूल्य (Items Subtotal):
                    </td>
                    <td style="padding: 5px 0; text-align: right; font-size: 13px; font-weight: 700; color: #111827; vertical-align: middle; white-space: nowrap;">
                      ₹${order.itemsTotal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 12px; font-weight: 600; text-align: left; vertical-align: middle;">
                      डिलीवरी शुल्क (Delivery Charges):
                    </td>
                    <td style="padding: 5px 0; text-align: right; font-size: 13px; font-weight: 700; color: ${order.deliveryCharges > 0 ? '#b45309' : '#047857'}; vertical-align: middle; white-space: nowrap;">
                      ${order.deliveryCharges > 0 ? `+ ₹${order.deliveryCharges.toLocaleString('en-IN')}` : 'मुफ़्त (FREE)'}
                    </td>
                  </tr>
                  <tr style="border-top: 1.5px solid #2D5A27;">
                    <td style="padding: 9px 0 2px 0; font-size: 14px; font-weight: 900; color: #2D5A27; text-align: left; vertical-align: middle;">
                      कुल देय राशि (Grand Total):
                    </td>
                    <td style="padding: 9px 0 2px 0; text-align: right; font-size: 17px; font-weight: 900; color: #2D5A27; vertical-align: middle; white-space: nowrap;">
                      ₹${order.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Footer / Signature Stamp -->
      <div style="border-top: 1px solid #e5e7eb; padding: 14px 28px; background: #ffffff; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
        <div>
          <div style="font-size: 11px; color: #4b5563; line-height: 1.4;">धन्यवाद! आपके सुखद व समृद्ध कृषि जीवन की शुभकामनाएँ। 🌾</div>
          <div style="font-size: 12px; font-weight: 800; color: #2D5A27; margin-top: 2px;">${defaultStoreName}</div>
        </div>
        <div style="text-align: right;">
          <div style="border: 1px solid #2D5A27; color: #2D5A27; font-weight: 800; padding: 4px 10px; border-radius: 6px; display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; background: #f7faf7; white-space: nowrap;">
            ✓ VERIFIED DIGITAL INVOICE
          </div>
          <div style="font-size: 9px; color: #9ca3af; margin-top: 3px; line-height: 1;">हस्ताक्षर की आवश्यकता नहीं है (Computer Generated)</div>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for web fonts and layout calculation to settle completely
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    const canvas = await html2canvas(container, {
      scale: 2, // 2x crispness
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
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
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (contentHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
    } else {
      // Multi-page handling if invoice is long
      let heightLeft = contentHeight;
      let position = margin;
      
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft > 0) {
        position = heightLeft - contentHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
        heightLeft -= pageHeight;
      }
    }

    // Trigger direct browser automatic download
    pdf.save(fileName);

    return { success: true, fileName };
  } catch (error: any) {
    console.error('Invoice PDF Generation Error:', error);
    return {
      success: false,
      fileName,
      error: error.message || 'PDF रसीद जनरेट करने में असमर्थ। कृपया पुनः प्रयास करें।',
    };
  } finally {
    // Clean up DOM node
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
};
