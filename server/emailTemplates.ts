import path from 'path';
import fs from 'fs';

export interface DeliveryEmailTemplateConfig {
  subject: string;
  headerTitle: string;
  headerSubtitle: string;
  storeName: string;
  greeting: string;
  deliveryInfoText: string;
  otpHeroTitle: string;
  otpExpiryNotice: string;
  otpInstructions: string;
  securityNoticeTitle: string;
  securityNoticeText: string;
  
  // Order Table Labels
  orderNumberLabel: string;
  deliveryPartnerLabel: string;
  orderStatusLabel: string;
  orderStatusValue: string;
  
  // Agriculture Safety Section
  safetySectionTitle: string;
  safetyPoints: string[];
  
  // Footer & Contact
  contactNumber: string;
  footerContactText: string;
  tagline: string;
  copyrightText: string;
  
  // Design & Styling
  logoUrl?: string;
  showLogo: boolean;
  headerBgColor: string;
  headerTextColor: string;
  headerSubtitleColor: string;
  headerBorderColor: string;
  outerBgColor: string;
  cardBgColor: string;
  cardBorderColor: string;
  cardBorderRadius: number; // in px
  primaryColor: string;
  otpBoxBgColor: string;
  otpBoxBorderColor: string;
  otpCodeBgColor: string;
  otpCodeBorderColor: string;
  otpCodeTextColor: string;
  otpHeadingColor: string;
  securityNoticeBgColor: string;
  securityNoticeBorderColor: string;
  securityNoticeAccentColor: string;
  securityNoticeTextColor: string;
  safetyBoxBgColor: string;
  safetyBoxBorderColor: string;
  safetyBoxAccentColor: string;
  footerBgColor: string;
  footerTextColor: string;
  headingFontSize: number;
  bodyFontSize: number;
  otpFontSize: number;
  textAlignment: 'center' | 'left';
  lastUpdated?: number;
}

export const DEFAULT_SERVER_DELIVERY_TEMPLATE: DeliveryEmailTemplateConfig = {
  subject: 'डिलीवरी सत्यापन कोड [{{otp}}] - ऑर्डर #{{orderId}} | {{storeName}}',
  headerTitle: '{{storeName}}',
  headerSubtitle: 'सुरक्षित ऑर्डर डिलीवरी सत्यापन प्रणाली',
  storeName: 'फल्सावदिया कृषि बाजार',
  greeting: 'नमस्ते {{customerName}},',
  deliveryInfoText: 'आपके ऑर्डर #{{orderId}} की डिलीवरी के लिए हमारे Delivery Partner {{deliveryPartnerName}} आपके दिए गए पते पर सामान लेकर पहुँच गए हैं।',
  otpHeroTitle: 'डिलीवरी सत्यापन कोड',
  otpExpiryNotice: 'यह कोड {{otpExpiry}} मिनट के लिए मान्य है।',
  otpInstructions: 'सामान प्राप्त करने और उसकी जाँच करने के बाद ही यह OTP Delivery Partner को बताएं।',
  securityNoticeTitle: 'सुरक्षा सूचना:',
  securityNoticeText: 'सामान प्राप्त किए बिना OTP किसी व्यक्ति के साथ साझा न करें।',
  
  orderNumberLabel: 'ऑर्डर क्रमांक:',
  deliveryPartnerLabel: 'डिलीवरी साथी:',
  orderStatusLabel: 'ऑर्डर स्थिति:',
  orderStatusValue: '{{orderStatus}}',
  
  safetySectionTitle: 'कृषि उत्पाद सुरक्षा सूचना',
  safetyPoints: [
    'कृषि दवाइयों/रसायनों को मिलाने से पहले product label और recommended mixing order देखें।',
    'बिना उचित जानकारी के अलग-अलग कृषि रसायनों को आपस में mix न करें।',
    'Spray solution तैयार करते समय gloves और mask जैसे उचित protective equipment का उपयोग करें।',
    'Product label पर दिए dosage और safety instructions का पालन करें।',
  ],
  
  contactNumber: '+91 89823 38046',
  footerContactText: 'कृषि से संबंधित जानकारी के लिए संपर्क करें: WhatsApp {{storePhone}}',
  tagline: 'किसान का भरोसा, हमारी पहचान',
  copyrightText: '© {{currentYear}} {{storeName}}. सर्वाधिकार सुरक्षित।',
  
  logoUrl: '',
  showLogo: true,
  headerBgColor: '#2D5A27',
  headerTextColor: '#FFFFFF',
  headerSubtitleColor: '#E8F5E9',
  headerBorderColor: '#1E3E1A',
  outerBgColor: '#F4F6F4',
  cardBgColor: '#FFFFFF',
  cardBorderColor: '#E2E8F0',
  cardBorderRadius: 12,
  primaryColor: '#2D5A27',
  otpBoxBgColor: '#F8FAF8',
  otpBoxBorderColor: '#D1E7DD',
  otpCodeBgColor: '#FFFFFF',
  otpCodeBorderColor: '#2D5A27',
  otpCodeTextColor: '#1B4D21',
  otpHeadingColor: '#2D5A27',
  securityNoticeBgColor: '#FFFBEB',
  securityNoticeBorderColor: '#FDE68A',
  securityNoticeAccentColor: '#D97706',
  securityNoticeTextColor: '#92400E',
  safetyBoxBgColor: '#F8FAF8',
  safetyBoxBorderColor: '#E2E8F0',
  safetyBoxAccentColor: '#2D5A27',
  footerBgColor: '#F9FAFB',
  footerTextColor: '#4B5563',
  headingFontSize: 22,
  bodyFontSize: 14,
  otpFontSize: 38,
  textAlignment: 'center',
};

export interface DeliveryOtpEmailData {
  orderNumber: string;
  customerName: string;
  partnerName: string;
  otp: string;
  expiryMinutes: number;
  orderStatus?: string;
  storePhone?: string;
  storeName?: string;
  logoCidOrUrl?: string;
}

export interface TestEmailData {
  senderEmail: string;
  recipientEmail: string;
  testTime: string;
  storePhone?: string;
  storeName?: string;
  logoCidOrUrl?: string;
}

/**
 * Returns absolute path to the official app logo if it exists
 */
export function getAppLogoPath(): string | null {
  try {
    const p192 = path.join(process.cwd(), 'public', 'icon-192.png');
    if (fs.existsSync(p192)) return p192;
    const p512 = path.join(process.cwd(), 'public', 'icon-512.png');
    if (fs.existsSync(p512)) return p512;
  } catch {
    // fallback
  }
  return null;
}

/**
 * Replace placeholders
 */
export function replaceServerPlaceholders(text: string, data: Record<string, string | number>): string {
  if (!text) return '';
  const currentYear = String(data.currentYear || new Date().getFullYear());
  const storeName = String(data.storeName || 'फल्सावदिया कृषि बाजार');
  const storePhone = String(data.storePhone || '+91 89823 38046');
  const customerName = String(data.customerName || 'सम्मानित ग्राहक');
  const orderId = String(data.orderId || data.orderNumber || 'FKB-00000');
  const otp = String(data.otp || '000000');
  const otpExpiry = String(data.otpExpiry || '15');
  const deliveryPartnerName = String(data.deliveryPartnerName || 'डिलीवरी साथी');
  const orderStatus = String(data.orderStatus || 'Delivery in Progress');

  return text
    .replace(/\{\{\s*customerName\s*\}\}/g, customerName)
    .replace(/\{\{\s*orderId\s*\}\}/g, orderId)
    .replace(/\{\{\s*orderNumber\s*\}\}/g, orderId)
    .replace(/\{\{\s*otp\s*\}\}/g, otp)
    .replace(/\{\{\s*otpExpiry\s*\}\}/g, otpExpiry)
    .replace(/\{\{\s*deliveryPartnerName\s*\}\}/g, deliveryPartnerName)
    .replace(/\{\{\s*orderStatus\s*\}\}/g, orderStatus)
    .replace(/\{\{\s*storeName\s*\}\}/g, storeName)
    .replace(/\{\{\s*storePhone\s*\}\}/g, storePhone)
    .replace(/\{\{\s*currentYear\s*\}\}/g, currentYear);
}

/**
 * Renders high-craft, professional, transactional Delivery OTP Email HTML
 * from custom or default template.
 */
export function renderDeliveryOtpEmailHtml(
  data: DeliveryOtpEmailData,
  customTemplate?: Partial<DeliveryEmailTemplateConfig>
): { subject: string; html: string } {
  const t: DeliveryEmailTemplateConfig = {
    ...DEFAULT_SERVER_DELIVERY_TEMPLATE,
    ...(customTemplate || {}),
  };

  const {
    orderNumber,
    customerName,
    partnerName,
    otp,
    expiryMinutes = 15,
    orderStatus = 'Delivery in Progress',
    storePhone = t.contactNumber || '+91 89823 38046',
    storeName = t.storeName || 'फल्सावदिया कृषि बाजार',
    logoCidOrUrl = 'cid:falsawdiya-logo',
  } = data;

  const currentYear = new Date().getFullYear();

  const replacementData: Record<string, string | number> = {
    customerName: customerName || 'सम्मानित ग्राहक',
    orderId: orderNumber,
    orderNumber,
    otp,
    otpExpiry: expiryMinutes,
    deliveryPartnerName: partnerName || 'डिलीवरी साथी',
    orderStatus,
    storeName,
    storePhone,
    currentYear,
  };

  const subject = replaceServerPlaceholders(t.subject, replacementData);
  const headerTitle = replaceServerPlaceholders(t.headerTitle, replacementData);
  const headerSubtitle = replaceServerPlaceholders(t.headerSubtitle, replacementData);
  const greeting = replaceServerPlaceholders(t.greeting, replacementData);
  const deliveryInfoText = replaceServerPlaceholders(t.deliveryInfoText, replacementData);
  const otpHeroTitle = replaceServerPlaceholders(t.otpHeroTitle, replacementData);
  const otpExpiryNotice = replaceServerPlaceholders(t.otpExpiryNotice, replacementData);
  const otpInstructions = replaceServerPlaceholders(t.otpInstructions, replacementData);
  const securityNoticeTitle = replaceServerPlaceholders(t.securityNoticeTitle, replacementData);
  const securityNoticeText = replaceServerPlaceholders(t.securityNoticeText, replacementData);
  
  const orderNumberLabel = replaceServerPlaceholders(t.orderNumberLabel, replacementData);
  const deliveryPartnerLabel = replaceServerPlaceholders(t.deliveryPartnerLabel, replacementData);
  const orderStatusLabel = replaceServerPlaceholders(t.orderStatusLabel, replacementData);
  const orderStatusValue = replaceServerPlaceholders(t.orderStatusValue, replacementData);

  const safetySectionTitle = replaceServerPlaceholders(t.safetySectionTitle, replacementData);
  const safetyPoints = (t.safetyPoints || DEFAULT_SERVER_DELIVERY_TEMPLATE.safetyPoints).map((pt) =>
    replaceServerPlaceholders(pt, replacementData)
  );

  const footerContactText = replaceServerPlaceholders(t.footerContactText, replacementData);
  const tagline = replaceServerPlaceholders(t.tagline, replacementData);
  const copyrightText = replaceServerPlaceholders(t.copyrightText, replacementData);

  const showLogo = t.showLogo !== false;

  const safetyListHtml = safetyPoints
    .filter((pt) => pt.trim())
    .map((pt) => `<li style="margin-bottom: 5px; color: #4B5563; font-size: 12.5px; line-height: 1.55;">${pt}</li>`)
    .join('');

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="hi" xml:lang="hi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>${subject}</title>
  <style type="text/css">
    /* Global Reset & Typography */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
      background-color: ${t.outerBgColor};
      font-family: 'Noto Sans Devanagari', 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2D3748;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
      }
      .email-body-padding {
        padding: 22px 16px !important;
      }
      .otp-code {
        font-size: 30px !important;
        letter-spacing: 6px !important;
      }
      .header-padding {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${t.outerBgColor}; -webkit-font-smoothing: antialiased;">
  <!-- Outer Table Wrapper -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${t.outerBgColor}" style="background-color: ${t.outerBgColor}; margin: 0; padding: 24px 8px 36px 8px;">
    <tr>
      <td align="center" valign="top">
        
        <!-- Main Email Container (Card) -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: ${t.cardBgColor}; border-radius: ${t.cardBorderRadius}px; overflow: hidden; border: 1px solid ${t.cardBorderColor}; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);">
          
          <!-- BRANDED HEADER -->
          <tr>
            <td align="center" bgcolor="${t.headerBgColor}" class="header-padding" style="background-color: ${t.headerBgColor}; padding: 28px 24px; text-align: center; border-bottom: 3px solid ${t.headerBorderColor};">
              ${showLogo ? `
              <!-- Official Brand Logo -->
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 12px auto;">
                <tr>
                  <td align="center" valign="middle" style="width: 68px; height: 68px; background-color: #FFFFFF; border-radius: 50%; padding: 4px; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.18);">
                    <img src="${logoCidOrUrl}" alt="${storeName}" width="60" height="60" style="display: block; border-radius: 50%; max-width: 60px; max-height: 60px; width: 60px; height: 60px; object-fit: contain; margin: 0 auto;" />
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Store Brand Name -->
              <h1 style="margin: 0; font-size: ${t.headingFontSize}px; font-weight: 800; color: ${t.headerTextColor}; letter-spacing: 0.3px; line-height: 1.25; font-family: 'Noto Sans Devanagari', 'Noto Sans', sans-serif;">
                ${headerTitle}
              </h1>
              
              <!-- System Subtitle -->
              ${headerSubtitle ? `
              <p style="margin: 6px 0 0 0; font-size: 13px; color: ${t.headerSubtitleColor}; font-weight: 500; letter-spacing: 0.2px; line-height: 1.4; font-family: 'Noto Sans Devanagari', 'Noto Sans', sans-serif;">
                ${headerSubtitle}
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td class="email-body-padding" style="padding: 28px 26px 20px 26px; background-color: ${t.cardBgColor};">
              
              <!-- CUSTOMER GREETING & INTRO -->
              <p style="margin: 0 0 10px 0; font-size: ${t.bodyFontSize + 1}px; font-weight: 700; color: #111827; line-height: 1.4; text-align: ${t.textAlignment === 'center' ? 'center' : 'left'};">
                ${greeting}
              </p>
              <p style="margin: 0 0 22px 0; font-size: ${t.bodyFontSize}px; color: #374151; line-height: 1.6; text-align: ${t.textAlignment === 'center' ? 'center' : 'left'};">
                ${deliveryInfoText}
              </p>

              <!-- HERO OTP SECTION -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${t.otpBoxBgColor}; border: 1.5px solid ${t.otpBoxBorderColor}; border-radius: 12px; margin-bottom: 22px; overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 22px 18px 20px 18px; text-align: center;">
                    
                    <div style="font-size: 12.5px; font-weight: 700; color: ${t.otpHeadingColor}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-family: 'Noto Sans Devanagari', 'Noto Sans', sans-serif;">
                      ${otpHeroTitle}
                    </div>
                    
                    <!-- OTP Box -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="background-color: ${t.otpCodeBgColor}; border: 2px solid ${t.otpCodeBorderColor}; border-radius: 10px; padding: 10px 24px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);">
                          <span class="otp-code" style="font-size: ${t.otpFontSize}px; font-weight: 800; letter-spacing: 10px; color: ${t.otpCodeTextColor}; font-family: 'Courier New', Courier, monospace, sans-serif; display: inline-block; padding-left: 10px; text-align: center;">
                            ${otp}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 14px 0 6px 0; font-size: 13px; font-weight: 700; color: ${t.otpCodeTextColor};">
                      ${otpExpiryNotice}
                    </p>
                    <p style="margin: 0; font-size: 12.5px; color: #4B5563; line-height: 1.45;">
                      ${otpInstructions}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- SECURITY NOTICE -->
              ${securityNoticeText ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${t.securityNoticeBgColor}; border: 1px solid ${t.securityNoticeBorderColor}; border-left: 4px solid ${t.securityNoticeAccentColor}; border-radius: 8px; margin-bottom: 22px;">
                <tr>
                  <td style="padding: 12px 14px; font-size: 12.5px; color: ${t.securityNoticeTextColor}; line-height: 1.5;">
                    ${securityNoticeTitle ? `<b style="color: ${t.securityNoticeAccentColor};">${securityNoticeTitle} </b>` : ''}${securityNoticeText}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- ORDER INFORMATION TABLE -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; margin-bottom: 22px; overflow: hidden; font-size: 13px;">
                <tr>
                  <td style="padding: 11px 14px; color: #6B7280; border-bottom: 1px solid #E5E7EB; width: 40%;">
                    ${orderNumberLabel}
                  </td>
                  <td align="right" style="padding: 11px 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #E5E7EB;">
                    #${orderNumber}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 11px 14px; color: #6B7280; border-bottom: 1px solid #E5E7EB;">
                    ${deliveryPartnerLabel}
                  </td>
                  <td align="right" style="padding: 11px 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #E5E7EB;">
                    ${partnerName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 11px 14px; color: #6B7280;">
                    ${orderStatusLabel}
                  </td>
                  <td align="right" style="padding: 11px 14px; font-weight: 700; color: ${t.primaryColor};">
                    ${orderStatusValue}
                  </td>
                </tr>
              </table>

              <!-- AGRICULTURAL PRODUCT SAFETY INFORMATION -->
              ${safetyPoints.length > 0 ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${t.safetyBoxBgColor}; border: 1px solid ${t.safetyBoxBorderColor}; border-left: 4px solid ${t.safetyBoxAccentColor}; border-radius: 8px; margin-bottom: 8px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 13px; font-weight: 700; color: ${t.safetyBoxAccentColor}; margin-bottom: 8px; letter-spacing: 0.2px;">
                      ${safetySectionTitle}
                    </div>
                    <ul style="margin: 0; padding-left: 18px; color: #4B5563; font-size: 12.5px; line-height: 1.6;">
                      ${safetyListHtml}
                    </ul>
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" bgcolor="${t.footerBgColor}" style="background-color: ${t.footerBgColor}; padding: 22px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
              ${footerContactText ? `
              <p style="margin: 0 0 6px 0; font-size: 12.5px; color: ${t.footerTextColor};">
                ${footerContactText}
              </p>
              ` : ''}
              ${tagline ? `
              <p style="margin: 0; font-size: 11.5px; color: #6B7280; font-weight: 500;">
                ${storeName} • ${tagline}
              </p>
              ` : ''}
              ${copyrightText ? `
              <p style="margin: 8px 0 0 0; font-size: 10.5px; color: #9CA3AF;">
                ${copyrightText}
              </p>
              ` : ''}
            </td>
          </tr>

        </table>
        <!-- End Main Email Container -->

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * Renders clean, professional test email HTML
 */
export function renderTestEmailHtml(data: TestEmailData): string {
  const {
    senderEmail,
    recipientEmail,
    testTime,
    storePhone = '+91 89823 38046',
    storeName = 'फल्सावदिया कृषि बाजार',
    logoCidOrUrl = 'cid:falsawdiya-logo',
  } = data;

  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="hi" xml:lang="hi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>परीक्षण ईमेल सत्यापन - ${storeName}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #F4F6F4;
      font-family: 'Noto Sans Devanagari', 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2D3748;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F4;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F4F6F4" style="background-color: #F4F6F4; padding: 24px 8px 36px 8px;">
    <tr>
      <td align="center" valign="top">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);">
          
          <!-- Header -->
          <tr>
            <td align="center" bgcolor="#2D5A27" style="background-color: #2D5A27; padding: 26px 24px; text-align: center; border-bottom: 3px solid #1E3E1A;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 12px auto;">
                <tr>
                  <td align="center" valign="middle" style="width: 64px; height: 64px; background-color: #FFFFFF; border-radius: 50%; padding: 4px; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.18);">
                    <img src="${logoCidOrUrl}" alt="${storeName}" width="56" height="56" style="display: block; border-radius: 50%; max-width: 56px; max-height: 56px; width: 56px; height: 56px; object-fit: contain; margin: 0 auto;" />
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.3px; font-family: 'Noto Sans Devanagari', 'Noto Sans', sans-serif;">
                ${storeName}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #E8F5E9; font-weight: 500;">
                सुरक्षित ईमेल एवं सत्यापन प्रणाली
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 24px 20px 24px; background-color: #FFFFFF;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <div style="font-size: 15px; font-weight: 700; color: #166534; margin-bottom: 4px;">
                      ईमेल SMTP कॉन्फ़िगरेशन सफल
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #15803D;">
                      आपका Gmail SMTP और Google App Password पूरी तरह सही काम कर रहा है।
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 13.5px; color: #374151; line-height: 1.6;">
                यह एक स्वचालित परीक्षण (Test) ईमेल है। जब डिलीवरी पार्टनर किसी ऑर्डर को डिलीवर करेंगे, तो ग्राहक को इसी प्रकार उच्च गुणवत्ता युक्त व सुरक्षित Delivery OTP ईमेल प्राप्त होगा।
              </p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 13px; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 10px 14px; color: #6B7280; border-bottom: 1px solid #E5E7EB; width: 40%;">प्रेषक ईमेल (Sender):</td>
                  <td align="right" style="padding: 10px 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #E5E7EB;">${senderEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; color: #6B7280; border-bottom: 1px solid #E5E7EB;">प्राप्तकर्ता (Recipient):</td>
                  <td align="right" style="padding: 10px 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #E5E7EB;">${recipientEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; color: #6B7280;">परीक्षण समय (IST):</td>
                  <td align="right" style="padding: 10px 14px; color: #111827;">${testTime}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="#F9FAFB" style="background-color: #F9FAFB; padding: 20px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #4B5563;">
                संपर्क: WhatsApp <b>${storePhone}</b>
              </p>
              <p style="margin: 0; font-size: 11px; color: #6B7280;">
                © ${currentYear} ${storeName} • किसान का भरोसा, हमारी पहचान
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
