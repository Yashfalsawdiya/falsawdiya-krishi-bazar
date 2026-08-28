import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Order, ImageSource, InvoiceTemplateConfig } from '../types';
import { getHighResImageURL } from '../lib/utils';
import { DEFAULT_INVOICE_TEMPLATE, mergeInvoiceTemplate } from '../data/defaultInvoiceTemplate';
import { formatFullHindiDate } from '../lib/dateUtils';

export interface InvoiceStoreInfo {
  storeName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  logo?: string | ImageSource;
}

export const formatInvoiceDateTime = (timestamp: number) => {
  return formatFullHindiDate(timestamp, true);
};

export const getStatusHindi = (status: string) => {
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

export const getPaymentStatusHindi = (status: string) => {
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
export const loadLogoBase64 = async (logoSource?: string | ImageSource): Promise<string> => {
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

/**
 * Generates the clean HTML string representing the invoice layout
 * using the provided template configuration and dynamic order data.
 * This is the SINGLE SOURCE OF TRUTH for both Live Preview and PDF Rendering.
 */
export const renderInvoiceHtml = (
  order: Order,
  tpl: InvoiceTemplateConfig,
  storeInfo?: InvoiceStoreInfo,
  logoBase64Url?: string
): string => {
  const businessName = tpl.businessName || storeInfo?.storeName || 'फल्सावदिया कृषि बाजार';
  const tagline = tpl.tagline || storeInfo?.tagline || 'किसान का भरोसा, हमारी पहचान';
  const phone = tpl.phone || storeInfo?.phone || '+91 89823 38046';
  const address = tpl.address || storeInfo?.address || 'मध्य प्रदेश (भारत)';
  const logoUrl = logoBase64Url || tpl.customLogoUrl || getHighResImageURL(storeInfo?.logo) || '/icon-192.png';

  const orderDateStr = formatInvoiceDateTime(order.createdAt);
  const statusHindi = getStatusHindi(order.status);
  const paymentStatusHindi = getPaymentStatusHindi(order.paymentStatus);
  const isPaid = order.paymentStatus === 'paid';

  // Products Table Row Generator with explicit cell styling and table layout
  const itemsHtml = order.items
    .map((item, index) => {
      const subtotal = item.price * item.quantity;
      const rowBg = tpl.tableAlternateRowBg && index % 2 === 1 ? tpl.tableAlternateColor : '#ffffff';
      return `
        <tr style="border-bottom: 1px solid ${tpl.tableBorderColor}; font-size: ${tpl.tableFontSize}px; background-color: ${rowBg};">
          <td style="padding: 10px 4px; text-align: center; color: #6b7280; font-weight: 600; vertical-align: middle;">${index + 1}</td>
          <td style="padding: 10px 12px; vertical-align: middle; word-break: break-word;">
            <div style="font-weight: 700; color: #111827; font-size: ${tpl.tableFontSize + 0.5}px; line-height: 1.3;">${item.hindiName || item.name}</div>
            <div style="color: #6b7280; font-size: 11px; margin-top: 2px; line-height: 1.2;">${item.name ? `${item.name} • ` : ''}${item.brand || 'कृषि उत्पाद'}${item.customId ? ` (${item.customId})` : ''}</div>
          </td>
          <td style="padding: 10px 6px; text-align: center; color: #374151; font-weight: 600; vertical-align: middle; word-break: break-word;">${item.unit || 'यूनिट'}</td>
          <td style="padding: 10px 4px; text-align: center; font-weight: 700; color: #111827; vertical-align: middle;">${item.quantity}</td>
          <td style="padding: 10px 12px; text-align: right; color: #374151; font-weight: 600; vertical-align: middle; white-space: nowrap;">₹${item.price.toLocaleString('en-IN')}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: ${tpl.tablePriceColor}; vertical-align: middle; white-space: nowrap;">₹${subtotal.toLocaleString('en-IN')}</td>
        </tr>
      `;
    })
    .join('');

  // Terms Lines Generator
  const termsHtml = (tpl.termsLines || [])
    .map((line) => `<div style="margin-bottom: 3px;">${line}</div>`)
    .join('');

  // Header Background style
  const headerBgStyle = tpl.headerBgType === 'gradient'
    ? `linear-gradient(135deg, ${tpl.headerBgColor} 0%, ${tpl.headerBgGradientEnd || tpl.headerBgColor} 100%)`
    : tpl.headerBgColor;

  return `
    <div style="width: 794px; max-width: 794px; min-width: 794px; border: ${tpl.outerBorderWidth}px ${tpl.outerBorderStyle} ${tpl.outerBorderColor}; border-radius: ${tpl.outerBorderRadius}px; overflow: hidden; background: ${tpl.backgroundColor}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); box-sizing: border-box; font-family: ${tpl.fontFamily}; text-align: left; line-height: 1.4; color: #111827; margin: 0;">
      
      <!-- Top Header / Banner -->
      <div style="background: ${headerBgStyle}; color: #ffffff; padding: ${tpl.headerPadding}px 24px; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <!-- Left: Logo & Business Info -->
            <td style="width: 60%; vertical-align: middle; text-align: left; padding: 0;">
              <table style="border-collapse: collapse;">
                <tr>
                  ${tpl.showLogo ? `
                  <td style="vertical-align: middle; padding-right: 14px; width: ${tpl.logoSize + 4}px;">
                    <div style="width: ${tpl.logoSize}px; height: ${tpl.logoSize}px; background: ${tpl.logoBackground}; border-radius: ${tpl.logoBorderRadius}px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.12); padding: 4px; box-sizing: border-box;">
                      <img src="${logoUrl}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; display: block;" crossOrigin="anonymous" />
                    </div>
                  </td>
                  ` : ''}
                  <td style="vertical-align: middle;">
                    <h1 style="margin: 0; font-size: ${tpl.businessNameFontSize}px; font-weight: ${tpl.businessNameFontWeight}; line-height: 1.2; color: ${tpl.businessNameColor}; letter-spacing: -0.2px;">
                      ${businessName}
                    </h1>
                    ${tpl.tagline ? `
                    <p style="margin: 3px 0 0 0; font-size: ${tpl.taglineFontSize}px; color: ${tpl.taglineColor}; font-weight: 700; line-height: 1.2;">
                      ${tagline}
                    </p>
                    ` : ''}
                    <div style="margin-top: 5px; font-size: 10.5px; color: ${tpl.contactTextColor}; line-height: 1.35;">
                      ${tpl.showPhone ? `
                      <div style="font-weight: 600; margin-bottom: 2px;">
                        <span style="color: ${tpl.accentColor};">📞</span>
                        <span style="margin-left: 3px;">${tpl.phoneLabel} <strong>${phone}</strong></span>
                      </div>
                      ` : ''}
                      ${tpl.showAddress ? `
                      <div style="color: ${tpl.contactTextColor}; font-weight: 500; font-size: 10px; line-height: 1.3;">
                        <span style="color: ${tpl.accentColor};">📍</span>
                        <span style="margin-left: 3px;">${tpl.addressLabel ? `${tpl.addressLabel} ` : ''}${address}</span>
                      </div>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- Right: Tax Invoice Badge & Metadata -->
            <td style="width: 40%; vertical-align: middle; text-align: right; padding: 0;">
              ${tpl.showReceiptBadge ? `
              <div style="display: inline-block; background: ${tpl.receiptBadgeBg}; color: ${tpl.receiptBadgeTextColor}; font-size: ${tpl.receiptBadgeFontSize}px; font-weight: 900; padding: 5px 16px; border-radius: ${tpl.receiptBadgeBorderRadius}px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; text-align: center; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.15); box-sizing: border-box;">
                ${tpl.receiptBadgeText}
              </div>
              ` : ''}
              <div style="margin-top: 7px; font-size: ${tpl.orderNumberFontSize}px; font-weight: 800; font-family: monospace, monospace; color: ${tpl.orderNumberColor}; letter-spacing: 0.3px; line-height: 1.2;">
                ${tpl.orderNumberPrefix}${order.orderNumber}
              </div>
              <div style="font-size: ${tpl.dateFontSize}px; color: ${tpl.dateColor}; margin-top: 4px; font-weight: 500; white-space: nowrap; line-height: 1.2;">
                ${tpl.dateLabel} ${orderDateStr}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Customer & Payment Details Grid -->
      ${(tpl.showCustomerDetails || tpl.showPaymentDetails) ? `
      <div style="padding: ${tpl.detailsSectionPadding}px 24px; background: ${tpl.detailsSectionBg}; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <!-- Customer & Shipping Details -->
            ${tpl.showCustomerDetails ? `
            <td style="width: ${tpl.showPaymentDetails ? '50%' : '100%'}; vertical-align: top; ${tpl.showPaymentDetails ? 'padding-right: 8px;' : ''}">
              <div style="background: ${tpl.customerCardBg}; border: 1px solid ${tpl.customerCardBorderColor}; border-radius: ${tpl.cardBorderRadius}px; padding: 14px; box-sizing: border-box; min-height: 160px;">
                <div style="font-size: ${tpl.customerHeadingFontSize}px; font-weight: 800; color: ${tpl.customerHeadingColor}; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.3px;">
                  ${tpl.customerDetailsHeading}
                </div>
                <div style="font-size: 15px; font-weight: 800; color: ${tpl.customerTextColor}; margin-bottom: 4px; line-height: 1.3;">
                  ${order.customerDetails.name}
                </div>
                <div style="font-size: 12.5px; color: #4b5563; line-height: 1.45;">
                  <div>${order.customerDetails.addressHouse}</div>
                  <div>${order.customerDetails.addressCity}, ${order.customerDetails.addressDistrict}</div>
                  <div>${order.customerDetails.addressState} - <span style="font-weight: 700; color: #1f2937;">${order.customerDetails.addressPincode}</span></div>
                </div>
                <div style="font-size: 12.5px; font-weight: 700; color: #1f2937; margin-top: 8px; padding-top: 8px; border-top: 1px dashed ${tpl.customerCardBorderColor};">
                  ${tpl.customerPhoneLabel} +91 ${order.customerDetails.phone}
                </div>
              </div>
            </td>
            ` : ''}

            <!-- Order & Payment Status -->
            ${tpl.showPaymentDetails ? `
            <td style="width: ${tpl.showCustomerDetails ? '50%' : '100%'}; vertical-align: top; ${tpl.showCustomerDetails ? 'padding-left: 8px;' : ''}">
              <div style="background: ${tpl.paymentCardBg}; border: 1px solid ${tpl.paymentCardBorderColor}; border-radius: ${tpl.cardBorderRadius}px; padding: 14px; box-sizing: border-box; min-height: 160px;">
                <div style="font-size: ${tpl.paymentHeadingFontSize}px; font-weight: 800; color: ${tpl.paymentHeadingColor}; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.3px;">
                  ${tpl.paymentDetailsHeading}
                </div>
                <table style="width: 100%; font-size: 12px; line-height: 1.5; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 3px 0; vertical-align: middle; text-align: left;">ऑर्डर स्थिति:</td>
                    <td style="text-align: right; font-weight: 800; color: #111827; padding: 3px 0; vertical-align: middle;">${statusHindi}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 4px 0; vertical-align: middle; text-align: left;">भुगतान स्थिति:</td>
                    <td style="text-align: right; padding: 4px 0; vertical-align: middle;">
                      <div style="display: inline-block; background: ${isPaid ? tpl.paidBadgeBg : tpl.pendingBadgeBg}; color: ${isPaid ? tpl.paidBadgeTextColor : tpl.pendingBadgeTextColor}; border: 1px solid ${isPaid ? tpl.paidBadgeBorderColor : tpl.pendingBadgeBorderColor}; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 6px; line-height: 1.2; text-align: center; white-space: nowrap; box-sizing: border-box;">
                        ${isPaid ? '✓ ' : ''}${paymentStatusHindi}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 3px 0; vertical-align: middle; text-align: left;">भुगतान माध्यम:</td>
                    <td style="text-align: right; font-weight: 700; color: #111827; padding: 3px 0; vertical-align: middle;">
                      ${order.paymentMethod === 'online_razorpay' ? 'ऑनलाइन Razorpay (UPI/Card)' : 'अन्य भुगतान'}
                    </td>
                  </tr>
                  ${(tpl.showRazorpayId && order.razorpayPaymentId) ? `
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 3px 0; vertical-align: middle; text-align: left;">Razorpay Txn ID:</td>
                    <td style="text-align: right; font-family: monospace; font-weight: 700; color: ${tpl.primaryColor}; font-size: 11px; padding: 3px 0; vertical-align: middle;">
                      ${order.razorpayPaymentId}
                    </td>
                  </tr>
                  ` : ''}
                  ${(tpl.showCourierTracking && (order.trackingNumber || order.courierPartner)) ? `
                  <tr>
                    <td style="color: #6b7280; font-weight: 600; padding: 3px 0; vertical-align: middle; text-align: left;">कूरियर ट्रैकिंग:</td>
                    <td style="text-align: right; font-weight: 700; color: #4338ca; padding: 3px 0; vertical-align: middle;">
                      ${order.courierPartner || 'Speed Post'}: ${order.trackingNumber || 'N/A'}
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </td>
            ` : ''}
          </tr>
        </table>
      </div>
      ` : ''}

      <!-- Items Table Section -->
      ${tpl.showProductsTable ? `
      <div style="padding: 16px 24px; box-sizing: border-box;">
        <div style="font-size: ${tpl.tableHeadingFontSize}px; font-weight: 800; color: ${tpl.tableHeadingColor}; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.3px;">
          ${tpl.tableHeading}
        </div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; background: #ffffff; border: 1px solid ${tpl.tableBorderColor}; border-radius: 8px; overflow: hidden;">
          <colgroup>
            <col style="width: 36px;" />
            <col style="width: 320px;" />
            <col style="width: 90px;" />
            <col style="width: 54px;" />
            <col style="width: 110px;" />
            <col style="width: 134px;" />
          </colgroup>
          <thead>
            <tr style="background: ${tpl.tableHeaderBg}; color: ${tpl.tableHeaderTextColor}; font-size: 12px; font-weight: 800; border-bottom: 2px solid ${tpl.tableBorderColor};">
              <th style="padding: 10px 4px; text-align: center; vertical-align: middle;">${tpl.colIndexTitle}</th>
              <th style="padding: 10px 12px; text-align: left; vertical-align: middle;">${tpl.colProductTitle}</th>
              <th style="padding: 10px 6px; text-align: center; vertical-align: middle;">${tpl.colUnitTitle}</th>
              <th style="padding: 10px 4px; text-align: center; vertical-align: middle;">${tpl.colQtyTitle}</th>
              <th style="padding: 10px 12px; text-align: right; vertical-align: middle;">${tpl.colRateTitle}</th>
              <th style="padding: 10px 12px; text-align: right; vertical-align: middle;">${tpl.colTotalTitle}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Price Breakdown & Summary Section -->
      ${(tpl.showTerms || tpl.showSummaryTotals) ? `
      <div style="padding: 8px 24px 20px 24px; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <!-- Left: Terms & Notice Card -->
            ${tpl.showTerms ? `
            <td style="width: ${tpl.showSummaryTotals ? '53%' : '100%'}; vertical-align: top; ${tpl.showSummaryTotals ? 'padding-right: 12px;' : ''}">
              <div style="background: ${tpl.termsCardBg}; border: 1px ${tpl.termsCardBorderStyle} ${tpl.termsCardBorderColor}; border-radius: ${tpl.cardBorderRadius}px; padding: 14px; font-size: ${tpl.termsFontSize}px; color: ${tpl.termsTextColor}; line-height: 1.5; box-sizing: border-box;">
                <div style="font-weight: 700; color: ${tpl.termsHeadingColor}; margin-bottom: 6px;">
                  ${tpl.termsHeading}
                </div>
                ${termsHtml}
              </div>
            </td>
            ` : ''}

            <!-- Right: Exact Two-Column Grand Total Summary Card -->
            ${tpl.showSummaryTotals ? `
            <td style="width: ${tpl.showTerms ? '47%' : '100%'}; vertical-align: top; ${tpl.showTerms ? 'padding-left: 12px;' : ''}">
              <div style="background: ${tpl.summaryCardBg}; border: ${tpl.summaryCardBorderWidth}px solid ${tpl.summaryCardBorderColor}; border-radius: ${tpl.cardBorderRadius}px; padding: 14px 16px; box-sizing: border-box;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 12px; font-weight: 600; text-align: left; vertical-align: middle;">
                      ${tpl.subtotalLabel}
                    </td>
                    <td style="padding: 5px 0; text-align: right; font-size: 13px; font-weight: 700; color: #111827; vertical-align: middle; white-space: nowrap;">
                      ₹${order.itemsTotal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0 10px 0; color: #4b5563; font-size: 12px; font-weight: 600; text-align: left; vertical-align: middle;">
                      ${tpl.deliveryLabel}
                      ${order.deliverySnapshot ? `
                        <div style="font-size: 10px; color: #6b7280; font-weight: 500; margin-top: 2px; line-height: 1.2;">
                          वाहन: <strong>${order.deliverySnapshot.vehicleNameHindi}</strong> (${order.deliverySnapshot.vehicleType}) • ${order.deliverySnapshot.totalWeightKg} kg • ${order.deliverySnapshot.distanceKm} km
                        </div>
                      ` : ''}
                    </td>
                    <td style="padding: 5px 0 10px 0; text-align: right; font-size: 13px; font-weight: 700; color: ${order.deliveryCharges > 0 ? tpl.paidDeliveryColor : tpl.freeDeliveryColor}; vertical-align: middle; white-space: nowrap;">
                      ${order.deliveryCharges > 0 ? `+ ₹${order.deliveryCharges.toLocaleString('en-IN')}` : tpl.freeDeliveryText}
                    </td>
                  </tr>
                  <tr style="border-top: 1.5px solid ${tpl.summaryCardBorderColor};">
                    <td style="padding: 12px 0 2px 0; font-size: 14px; font-weight: 900; color: ${tpl.grandTotalColor}; text-align: left; vertical-align: middle;">
                      ${tpl.grandTotalLabel}
                    </td>
                    <td style="padding: 12px 0 2px 0; text-align: right; font-size: ${tpl.grandTotalFontSize}px; font-weight: 900; color: ${tpl.grandTotalColor}; vertical-align: middle; white-space: nowrap;">
                      ₹${order.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
            ` : ''}
          </tr>
        </table>
      </div>
      ` : ''}

      <!-- Footer / Verified Stamp -->
      ${(tpl.showFooter || tpl.showVerifiedBadge) ? `
      <div style="border-top: 1px solid ${tpl.footerBorderColor}; padding: 14px 24px; background: ${tpl.footerBg}; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="width: 62%; vertical-align: middle; text-align: left; padding: 0;">
              ${tpl.showFooter ? `
              <div>
                <div style="font-size: 11px; color: ${tpl.footerTextColor}; line-height: 1.4;">${tpl.thankYouMessage}</div>
                ${tpl.showStoreNameInFooter ? `
                <div style="font-size: 12px; font-weight: 800; color: ${tpl.footerStoreNameColor}; margin-top: 2px;">${businessName}</div>
                ` : ''}
              </div>
              ` : ''}
            </td>
            <td style="width: 38%; vertical-align: middle; text-align: right; padding: 0;">
              ${tpl.showVerifiedBadge ? `
              <div>
                <div style="display: inline-block; border: 1.5px solid ${tpl.verifiedBadgeBorderColor}; color: ${tpl.verifiedBadgeTextColor}; font-weight: 800; padding: 4px 12px; border-radius: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; background: ${tpl.verifiedBadgeBg}; white-space: nowrap; box-sizing: border-box;">
                  ${tpl.verifiedBadgeText}
                </div>
                ${tpl.verifiedBadgeSubtext ? `
                <div style="font-size: 9px; color: #9ca3af; margin-top: 4px; line-height: 1.2;">${tpl.verifiedBadgeSubtext}</div>
                ` : ''}
              </div>
              ` : ''}
            </td>
          </tr>
        </table>
      </div>
      ` : ''}

    </div>
  `;
};

export const generateOrderInvoicePDF = async (
  order: Order,
  storeInfo?: InvoiceStoreInfo,
  customTemplate?: InvoiceTemplateConfig
): Promise<{ success: boolean; fileName: string; error?: string }> => {
  const fileName = `Invoice-${order.orderNumber}.pdf`;
  
  // Merge template with defaults
  const tpl = mergeInvoiceTemplate(customTemplate, {
    name: storeInfo?.storeName,
    tagline: storeInfo?.tagline,
    phone: storeInfo?.phone,
    address: storeInfo?.address,
  });

  // Load logo as base64 for reliable crisp rendering in html2canvas
  const logoBase64 = await loadLogoBase64(tpl.customLogoUrl || storeInfo?.logo);

  // Create an offscreen container with EXACT 794px width (standard A4 width at 96 DPI)
  // No extra outer container padding so outer border is exactly 794px wide, identical to Live Preview!
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.minWidth = '794px';
  container.style.maxWidth = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1f2937';
  container.style.fontFamily = tpl.fontFamily;
  container.style.boxSizing = 'border-box';
  container.style.padding = '0px';
  container.style.margin = '0px';
  container.style.zIndex = '-9999';

  container.innerHTML = renderInvoiceHtml(order, tpl, storeInfo, logoBase64);

  document.body.appendChild(container);

  try {
    // Wait for web fonts and layout calculation to settle completely
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Wait for all nested images to load
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );
    await new Promise((resolve) => setTimeout(resolve, 200));

    const canvas = await html2canvas(container, {
      scale: 2, // 2x crispness for super sharp text and icons
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
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
    const margin = 8; // Clean 8mm outer page margin
    const contentWidth = pageWidth - margin * 2; // 194mm printable width
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (contentHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
    } else {
      // Multi-page handling if invoice has dozens of items
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
