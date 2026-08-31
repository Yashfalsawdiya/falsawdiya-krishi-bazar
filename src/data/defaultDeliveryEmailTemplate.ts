import { DeliveryEmailTemplateConfig } from '../types';

export interface EmailPlaceholderData {
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  otp?: string;
  otpExpiry?: number | string;
  deliveryPartnerName?: string;
  orderStatus?: string;
  storeName?: string;
  storePhone?: string;
  currentYear?: number | string;
}

export const DUMMY_EMAIL_PREVIEW_DATA: EmailPlaceholderData = {
  customerName: 'Ramesh Patidar',
  orderId: 'FKB-2026-123456',
  orderNumber: 'FKB-2026-123456',
  otp: '596018',
  otpExpiry: '15',
  deliveryPartnerName: 'कमलेश पाटीदार',
  orderStatus: 'Delivery in Progress',
  storeName: 'फल्सावदिया कृषि बाजार',
  storePhone: '+91 89823 38046',
  currentYear: new Date().getFullYear(),
};

export const DEFAULT_DELIVERY_EMAIL_TEMPLATE: DeliveryEmailTemplateConfig = {
  // Content fields
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
  
  // Order Table Labels
  orderNumberLabel: 'ऑर्डर क्रमांक:',
  deliveryPartnerLabel: 'डिलीवरी साथी:',
  orderStatusLabel: 'ऑर्डर स्थिति:',
  orderStatusValue: '{{orderStatus}}',
  
  // Agriculture Safety Section
  safetySectionTitle: 'कृषि उत्पाद सुरक्षा सूचना',
  safetyPoints: [
    'कृषि दवाइयों/रसायनों को मिलाने से पहले product label और recommended mixing order देखें।',
    'बिना उचित जानकारी के अलग-अलग कृषि रसायनों को आपस में mix न करें।',
    'Spray solution तैयार करते समय gloves और mask जैसे उचित protective equipment का उपयोग करें।',
    'Product label पर दिए dosage और safety instructions का पालन करें।',
  ],
  
  // Footer & Contact
  contactNumber: '+91 89823 38046',
  footerContactText: 'कृषि से संबंधित जानकारी के लिए संपर्क करें: WhatsApp {{storePhone}}',
  tagline: 'किसान का भरोसा, हमारी पहचान',
  copyrightText: '© {{currentYear}} {{storeName}}. सर्वाधिकार सुरक्षित।',
  
  // Design & Styling
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

/**
 * Safely replaces dynamic placeholders in strings
 */
export function replaceEmailPlaceholders(text: string, data: EmailPlaceholderData): string {
  if (!text) return '';
  const currentYear = String(data.currentYear || new Date().getFullYear());
  const storeName = data.storeName || 'फल्सावदिया कृषि बाजार';
  const storePhone = data.storePhone || '+91 89823 38046';
  const customerName = data.customerName || 'सम्मानित ग्राहक';
  const orderId = data.orderId || data.orderNumber || 'FKB-00000';
  const otp = data.otp || '000000';
  const otpExpiry = String(data.otpExpiry || '15');
  const deliveryPartnerName = data.deliveryPartnerName || 'डिलीवरी साथी';
  const orderStatus = data.orderStatus || 'Delivery in Progress';

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
 * Merges saved template configuration with fallback defaults
 */
export function mergeDeliveryEmailTemplate(
  saved?: Partial<DeliveryEmailTemplateConfig> | null,
  overrides?: Partial<DeliveryEmailTemplateConfig>
): DeliveryEmailTemplateConfig {
  const merged: DeliveryEmailTemplateConfig = {
    ...DEFAULT_DELIVERY_EMAIL_TEMPLATE,
    ...(saved || {}),
    ...(overrides || {}),
  };

  // Ensure array for safety points
  if (!Array.isArray(merged.safetyPoints) || merged.safetyPoints.length === 0) {
    merged.safetyPoints = [...DEFAULT_DELIVERY_EMAIL_TEMPLATE.safetyPoints];
  }

  return merged;
}

/**
 * Generates email-client compatible HTML from template configuration and dynamic data
 */
export function renderDeliveryEmailTemplateHtml(
  template: DeliveryEmailTemplateConfig,
  data: EmailPlaceholderData = DUMMY_EMAIL_PREVIEW_DATA,
  logoSrcOverride?: string
): string {
  const t = mergeDeliveryEmailTemplate(template);

  // Dynamic values
  const storeName = t.storeName || data.storeName || 'फल्सावदिया कृषि बाजार';
  const storePhone = t.contactNumber || data.storePhone || '+91 89823 38046';
  const effectiveData: EmailPlaceholderData = {
    ...data,
    storeName,
    storePhone,
    currentYear: data.currentYear || new Date().getFullYear(),
  };

  const subject = replaceEmailPlaceholders(t.subject, effectiveData);
  const headerTitle = replaceEmailPlaceholders(t.headerTitle, effectiveData);
  const headerSubtitle = replaceEmailPlaceholders(t.headerSubtitle, effectiveData);
  const greeting = replaceEmailPlaceholders(t.greeting, effectiveData);
  const deliveryInfoText = replaceEmailPlaceholders(t.deliveryInfoText, effectiveData);
  const otpHeroTitle = replaceEmailPlaceholders(t.otpHeroTitle, effectiveData);
  const otpCode = effectiveData.otp || '596018';
  const otpExpiryNotice = replaceEmailPlaceholders(t.otpExpiryNotice, effectiveData);
  const otpInstructions = replaceEmailPlaceholders(t.otpInstructions, effectiveData);
  const securityNoticeTitle = replaceEmailPlaceholders(t.securityNoticeTitle, effectiveData);
  const securityNoticeText = replaceEmailPlaceholders(t.securityNoticeText, effectiveData);
  
  const orderNumberLabel = replaceEmailPlaceholders(t.orderNumberLabel, effectiveData);
  const deliveryPartnerLabel = replaceEmailPlaceholders(t.deliveryPartnerLabel, effectiveData);
  const orderStatusLabel = replaceEmailPlaceholders(t.orderStatusLabel, effectiveData);
  const orderStatusValue = replaceEmailPlaceholders(t.orderStatusValue, effectiveData);

  const safetySectionTitle = replaceEmailPlaceholders(t.safetySectionTitle, effectiveData);
  const safetyPoints = (t.safetyPoints || []).map((pt) => replaceEmailPlaceholders(pt, effectiveData));

  const footerContactText = replaceEmailPlaceholders(t.footerContactText, effectiveData);
  const tagline = replaceEmailPlaceholders(t.tagline, effectiveData);
  const copyrightText = replaceEmailPlaceholders(t.copyrightText, effectiveData);

  const logoSrc = logoSrcOverride || t.logoUrl || '/icon-192.png';
  const showLogo = t.showLogo !== false;

  const safetyListHtml = safetyPoints
    .filter((pt) => pt.trim())
    .map((pt) => `<li style="margin-bottom: 5px; color: #4B5563; font-size: 12.5px; line-height: 1.55;">${pt}</li>`)
    .join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="hi" xml:lang="hi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>${subject}</title>
  <style type="text/css">
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
        padding: 20px 16px !important;
      }
      .otp-code {
        font-size: 30px !important;
        letter-spacing: 6px !important;
      }
      .header-padding {
        padding: 22px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${t.outerBgColor}; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${t.outerBgColor}" style="background-color: ${t.outerBgColor}; margin: 0; padding: 24px 8px 36px 8px;">
    <tr>
      <td align="center" valign="top">
        
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: ${t.cardBgColor}; border-radius: ${t.cardBorderRadius}px; overflow: hidden; border: 1px solid ${t.cardBorderColor}; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);">
          
          <!-- BRANDED HEADER -->
          <tr>
            <td align="center" bgcolor="${t.headerBgColor}" class="header-padding" style="background-color: ${t.headerBgColor}; padding: 26px 24px; text-align: center; border-bottom: 3px solid ${t.headerBorderColor};">
              ${showLogo ? `
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 12px auto;">
                <tr>
                  <td align="center" valign="middle" style="width: 66px; height: 66px; background-color: #FFFFFF; border-radius: 50%; padding: 4px; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.18);">
                    <img src="${logoSrc}" alt="${storeName}" width="58" height="58" style="display: block; border-radius: 50%; max-width: 58px; max-height: 58px; width: 58px; height: 58px; object-fit: contain; margin: 0 auto;" />
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <h1 style="margin: 0; font-size: ${t.headingFontSize}px; font-weight: 800; color: ${t.headerTextColor}; letter-spacing: 0.3px; line-height: 1.25; font-family: 'Noto Sans Devanagari', 'Noto Sans', sans-serif;">
                ${headerTitle}
              </h1>
              
              ${headerSubtitle ? `
              <p style="margin: 6px 0 0 0; font-size: 13px; color: ${t.headerSubtitleColor}; font-weight: 500; letter-spacing: 0.2px; line-height: 1.4; font-family: 'Noto Sans Devanagari', 'Noto Sans', sans-serif;">
                ${headerSubtitle}
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td class="email-body-padding" style="padding: 26px 24px 18px 24px; background-color: ${t.cardBgColor};">
              
              <!-- CUSTOMER GREETING & INTRO -->
              <p style="margin: 0 0 10px 0; font-size: ${t.bodyFontSize + 1}px; font-weight: 700; color: #111827; line-height: 1.4; text-align: ${t.textAlignment === 'center' ? 'center' : 'left'};">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px 0; font-size: ${t.bodyFontSize}px; color: #374151; line-height: 1.6; text-align: ${t.textAlignment === 'center' ? 'center' : 'left'};">
                ${deliveryInfoText}
              </p>

              <!-- HERO OTP SECTION -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${t.otpBoxBgColor}; border: 1.5px solid ${t.otpBoxBorderColor}; border-radius: 12px; margin-bottom: 20px; overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 20px 16px 18px 16px; text-align: center;">
                    
                    <div style="font-size: 12px; font-weight: 700; color: ${t.otpHeadingColor}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-family: 'Noto Sans Devanagari', 'Noto Sans', sans-serif;">
                      ${otpHeroTitle}
                    </div>
                    
                    <!-- OTP Box -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="background-color: ${t.otpCodeBgColor}; border: 2px solid ${t.otpCodeBorderColor}; border-radius: 10px; padding: 8px 22px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);">
                          <span class="otp-code" style="font-size: ${t.otpFontSize}px; font-weight: 800; letter-spacing: 8px; color: ${t.otpCodeTextColor}; font-family: 'Courier New', Courier, monospace, sans-serif; display: inline-block; padding-left: 8px; text-align: center;">
                            ${otpCode}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 12px 0 5px 0; font-size: 13px; font-weight: 700; color: ${t.otpCodeTextColor};">
                      ${otpExpiryNotice}
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #4B5563; line-height: 1.45;">
                      ${otpInstructions}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- SECURITY NOTICE -->
              ${securityNoticeText ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${t.securityNoticeBgColor}; border: 1px solid ${t.securityNoticeBorderColor}; border-left: 4px solid ${t.securityNoticeAccentColor}; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 14px; font-size: 12.5px; color: ${t.securityNoticeTextColor}; line-height: 1.5;">
                    ${securityNoticeTitle ? `<b style="color: ${t.securityNoticeAccentColor};">${securityNoticeTitle} </b>` : ''}${securityNoticeText}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- ORDER INFORMATION TABLE -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; margin-bottom: 20px; overflow: hidden; font-size: 13px;">
                <tr>
                  <td style="padding: 10px 14px; color: #6B7280; border-bottom: 1px solid #E5E7EB; width: 40%;">
                    ${orderNumberLabel}
                  </td>
                  <td align="right" style="padding: 10px 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #E5E7EB;">
                    #${effectiveData.orderId || effectiveData.orderNumber}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; color: #6B7280; border-bottom: 1px solid #E5E7EB;">
                    ${deliveryPartnerLabel}
                  </td>
                  <td align="right" style="padding: 10px 14px; font-weight: 700; color: #111827; border-bottom: 1px solid #E5E7EB;">
                    ${effectiveData.deliveryPartnerName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; color: #6B7280;">
                    ${orderStatusLabel}
                  </td>
                  <td align="right" style="padding: 10px 14px; font-weight: 700; color: ${t.primaryColor};">
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
            <td align="center" bgcolor="${t.footerBgColor}" style="background-color: ${t.footerBgColor}; padding: 20px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
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
}
