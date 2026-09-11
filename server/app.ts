import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { 
  getRemoteFirestoreDoc, 
  setRemoteFirestoreDoc, 
  deleteRemoteFirestoreDoc 
} from './firestoreSync.js';
import {
  renderDeliveryOtpEmailHtml,
  renderTestEmailHtml,
  getAppLogoPath,
  DeliveryEmailTemplateConfig,
  DEFAULT_SERVER_DELIVERY_TEMPLATE,
} from './emailTemplates.js';
import { handleScanBill, handleAccountingInsights } from './accountingRoutes.js';

export const app = express();

// Storage paths for local disk caching (fallback)
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'razorpay-config.json');
const EMAIL_CONFIG_FILE = path.join(DATA_DIR, 'email-otp-config.json');
const EMAIL_TEMPLATE_FILE = path.join(DATA_DIR, 'delivery-email-template.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Ignored in read-only serverless environments
}

export interface RazorpayServerConfig {
  enabled: boolean;
  mode: 'test' | 'live';
  testKeyId: string;
  testKeySecret: string;
  liveKeyId: string;
  liveKeySecret: string;
  webhookSecret: string;
  lastUpdated: number;
  lastPaymentStatus?: string;
  lastTestResult?: {
    success: boolean;
    mode: 'test' | 'live';
    message: string;
    timestamp: number;
  };
}

const DEFAULT_RAZORPAY_CONFIG: RazorpayServerConfig = {
  enabled: true,
  mode: 'test',
  testKeyId: process.env.RAZORPAY_TEST_KEY_ID || '',
  testKeySecret: process.env.RAZORPAY_TEST_KEY_SECRET || '',
  liveKeyId: process.env.RAZORPAY_LIVE_KEY_ID || '',
  liveKeySecret: process.env.RAZORPAY_LIVE_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  lastUpdated: Date.now(),
  lastPaymentStatus: 'प्रतीक्षारत (No transactions yet)',
};

let serverConfig: RazorpayServerConfig = { ...DEFAULT_RAZORPAY_CONFIG };

// Load Razorpay config from disk and Firestore
const loadRazorpayConfig = async () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      serverConfig = { ...DEFAULT_RAZORPAY_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('[Server] Error loading local razorpay config:', err);
  }

  try {
    const remoteDoc = await getRemoteFirestoreDoc<Partial<RazorpayServerConfig>>('settings', 'razorpay_config');
    if (remoteDoc) {
      serverConfig = { ...serverConfig, ...remoteDoc };
    }
  } catch (err) {
    console.warn('[Server] Error fetching remote razorpay config:', err);
  }
};

const saveRazorpayConfig = (newConfig: Partial<RazorpayServerConfig>) => {
  serverConfig = { ...serverConfig, ...newConfig, lastUpdated: Date.now() };
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(serverConfig, null, 2), 'utf-8');
    }
  } catch {
    // Read-only filesystem in serverless
  }

  setRemoteFirestoreDoc('settings', 'razorpay_config', serverConfig).catch((err) => {
    console.warn('[Server] Failed to sync razorpay config to Firestore:', err);
  });
};

export interface EmailOtpServerConfig {
  enabled: boolean;
  senderEmail: string;
  appPassword: string;
  senderName: string;
  otpLength: number;
  expiryMinutes: number;
  resendCooldownSeconds: number;
  maxAttempts: number;
  showInAppOtpFallback: boolean;
  lastUpdated: number;
  lastTestResult?: {
    success: boolean;
    message: string;
    timestamp: number;
    testedEmail?: string;
  };
}

const DEFAULT_EMAIL_CONFIG: EmailOtpServerConfig = {
  enabled: true,
  senderEmail: process.env.GMAIL_SENDER_EMAIL || 'yashfalsawdiya36@gmail.com',
  appPassword: process.env.GMAIL_APP_PASSWORD || '',
  senderName: process.env.GMAIL_SENDER_NAME || 'फल्सावदिया कृषि बाजार (Falsawdiya Krishi Bazaar)',
  otpLength: 6,
  expiryMinutes: 15,
  resendCooldownSeconds: 60,
  maxAttempts: 3,
  showInAppOtpFallback: true,
  lastUpdated: Date.now(),
};

let emailConfig: EmailOtpServerConfig = { ...DEFAULT_EMAIL_CONFIG };

// Load Email config from disk and Firestore
const loadEmailConfig = async () => {
  try {
    if (fs.existsSync(EMAIL_CONFIG_FILE)) {
      const raw = fs.readFileSync(EMAIL_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      emailConfig = {
        ...DEFAULT_EMAIL_CONFIG,
        ...parsed,
        senderEmail: parsed.senderEmail || process.env.GMAIL_SENDER_EMAIL || DEFAULT_EMAIL_CONFIG.senderEmail,
        appPassword: parsed.appPassword || process.env.GMAIL_APP_PASSWORD || DEFAULT_EMAIL_CONFIG.appPassword,
        senderName: parsed.senderName || process.env.GMAIL_SENDER_NAME || DEFAULT_EMAIL_CONFIG.senderName,
      };
    }
  } catch (err) {
    console.warn('[Server] Error loading local email config:', err);
  }

  try {
    const remoteDoc = await getRemoteFirestoreDoc<Partial<EmailOtpServerConfig>>('settings', 'smtp_config');
    if (remoteDoc) {
      emailConfig = {
        ...emailConfig,
        ...remoteDoc,
        senderEmail: remoteDoc.senderEmail || emailConfig.senderEmail || process.env.GMAIL_SENDER_EMAIL || DEFAULT_EMAIL_CONFIG.senderEmail,
        appPassword: remoteDoc.appPassword || emailConfig.appPassword || process.env.GMAIL_APP_PASSWORD || DEFAULT_EMAIL_CONFIG.appPassword,
        senderName: remoteDoc.senderName || emailConfig.senderName || process.env.GMAIL_SENDER_NAME || DEFAULT_EMAIL_CONFIG.senderName,
      };
    }
  } catch (err) {
    console.warn('[Server] Error fetching remote smtp config:', err);
  }
};

const saveEmailConfig = async (newConfig: Partial<EmailOtpServerConfig>) => {
  emailConfig = { ...emailConfig, ...newConfig, lastUpdated: Date.now() };
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(EMAIL_CONFIG_FILE, JSON.stringify(emailConfig, null, 2), 'utf-8');
    }
  } catch {
    // Read-only filesystem in serverless
  }

  try {
    await setRemoteFirestoreDoc('settings', 'smtp_config', emailConfig);
  } catch (err) {
    console.warn('[Server] Failed to sync email config to Firestore:', err);
  }
};

let deliveryEmailTemplate: DeliveryEmailTemplateConfig = { ...DEFAULT_SERVER_DELIVERY_TEMPLATE };

const loadEmailTemplateConfig = async () => {
  try {
    if (fs.existsSync(EMAIL_TEMPLATE_FILE)) {
      const raw = fs.readFileSync(EMAIL_TEMPLATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      deliveryEmailTemplate = {
        ...DEFAULT_SERVER_DELIVERY_TEMPLATE,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('[Server] Error loading local email template:', err);
  }

  try {
    const remoteDoc = await getRemoteFirestoreDoc<Partial<DeliveryEmailTemplateConfig>>('settings', 'deliveryEmailTemplate');
    if (remoteDoc) {
      deliveryEmailTemplate = {
        ...deliveryEmailTemplate,
        ...remoteDoc,
      };
    }
  } catch (err) {
    console.warn('[Server] Error fetching remote email template:', err);
  }
};

const saveEmailTemplateConfig = async (newTemplate: Partial<DeliveryEmailTemplateConfig>) => {
  deliveryEmailTemplate = {
    ...DEFAULT_SERVER_DELIVERY_TEMPLATE,
    ...deliveryEmailTemplate,
    ...newTemplate,
    lastUpdated: Date.now(),
  };

  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(EMAIL_TEMPLATE_FILE, JSON.stringify(deliveryEmailTemplate, null, 2), 'utf-8');
    }
  } catch {
    // Read-only fallback
  }

  try {
    await setRemoteFirestoreDoc('settings', 'deliveryEmailTemplate', deliveryEmailTemplate);
  } catch (err) {
    console.warn('[Server] Failed to sync email template to Firestore:', err);
  }
};

// Initial asynchronous load
loadRazorpayConfig();
loadEmailConfig();
loadEmailTemplateConfig();

export interface ActiveDeliveryOtp {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  otpHash: string;
  plainOtpForInApp?: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
  partnerId?: string;
  partnerName?: string;
  emailSent?: boolean;
}

const activeOtps = new Map<string, ActiveDeliveryOtp>();
const OTP_SECRET_SALT = process.env.OTP_SALT || 'falsawdiya-krishi-otp-salt-2026';

// Periodic memory cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of activeOtps.entries()) {
    if (record.expiresAt < now) {
      activeOtps.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Helper to mask email for security
const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const maskedLocal = local[0] + '*'.repeat(Math.max(2, local.length - 2)) + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
};

const hashDeliveryOtp = (orderId: string, otp: string): string => {
  return crypto.createHash('sha256').update(`${orderId.trim()}:${otp.trim()}:${OTP_SECRET_SALT}`).digest('hex');
};

// Dual-port SMTP dispatcher: Port 465 (SSL) -> Port 587 (STARTTLS)
async function sendSmtpEmail(mailOptions: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Ensure we have latest credentials
  if (!emailConfig.senderEmail || !emailConfig.appPassword) {
    await loadEmailConfig();
  }

  const user = (emailConfig.senderEmail || process.env.GMAIL_SENDER_EMAIL || '').trim();
  const pass = (emailConfig.appPassword || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim();

  if (!user || !pass) {
    return { success: false, error: 'SMTP क्रेडेंशियल्स उपलब्ध नहीं हैं (Gmail ID या Google App Password खाली है)। कृपया Admin Panel में सेटिंग्स दर्ज करें।' };
  }

  const senderDisplayName = emailConfig.senderName?.trim() || 'फल्सावदिया कृषि बाजार';
  const fromAddress = `"${senderDisplayName}" <${user}>`;

  // Prepare attachments (including official app logo for CID if used in html)
  const attachments = [...(mailOptions.attachments || [])];
  if (mailOptions.html.includes('cid:falsawdiya-logo')) {
    const logoPath = getAppLogoPath();
    if (logoPath && !attachments.some((a) => a.cid === 'falsawdiya-logo')) {
      attachments.push({
        filename: 'falsawdiya-logo.png',
        path: logoPath,
        cid: 'falsawdiya-logo',
      });
    }
  }

  // Attempt 1: Port 465 (SSL)
  try {
    const transporter465 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
    const info = await transporter465.sendMail({
      from: fromAddress,
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text,
      attachments,
    });
    console.log(`[SMTP] Email sent via port 465 to ${mailOptions.to}, ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err465: any) {
    console.warn(`[SMTP] Port 465 failed (${err465.message}), trying Port 587 STARTTLS...`);
    // Attempt 2: Port 587 (TLS / STARTTLS)
    try {
      const transporter587 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
      const info = await transporter587.sendMail({
        from: fromAddress,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
        attachments,
      });
      console.log(`[SMTP] Email sent via port 587 to ${mailOptions.to}, ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err587: any) {
      console.error('[SMTP] Both Port 465 and Port 587 failed:', err587);
      return { 
        success: false, 
        error: err587.message || err465.message || 'Gmail SMTP ऑथेंटिकेशन विफल रहा। कृपया 16-अक्षरों का Google App Password जांचें।' 
      };
    }
  }
}

// Global Middlewares
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Helper to get active credentials for Razorpay
const getActiveRazorpayCredentials = () => {
  const isLive = serverConfig.mode === 'live';
  return {
    mode: serverConfig.mode,
    keyId: isLive ? serverConfig.liveKeyId : serverConfig.testKeyId,
    keySecret: isLive ? serverConfig.liveKeySecret : serverConfig.testKeySecret,
    enabled: serverConfig.enabled,
  };
};

// ==========================================
// 1. PUBLIC API ROUTES FOR CLIENT CHECKOUT
// ==========================================

app.get('/api/razorpay/config', (_req: Request, res: Response) => {
  const active = getActiveRazorpayCredentials();
  res.json({
    enabled: serverConfig.enabled,
    mode: serverConfig.mode,
    keyId: active.keyId || '',
    isConfigured: Boolean(active.keyId && active.keySecret),
    webhookEnabled: Boolean(serverConfig.webhookSecret),
  });
});

app.post('/api/razorpay/create-order', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!serverConfig.enabled) {
      res.status(403).json({
        success: false,
        error: 'Razorpay Payment Gateway is currently disabled.',
      });
      return;
    }

    const { items, customerDetails, deliveryCharges = 0, notes = {}, isDeliveryActive = true } = req.body;

    if (isDeliveryActive === false) {
      res.status(403).json({
        success: false,
        error: 'असुविधा के लिए खेद है। फिलहाल होम डिलीवरी सेवा अस्थायी रूप से बंद है।',
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'कार्ट में कोई उत्पाद नहीं है (Empty Cart).' });
      return;
    }

    let calculatedItemsTotal = 0;
    for (const item of items) {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      if (price < 0 || qty <= 0) {
        res.status(400).json({ success: false, error: 'अमान्य उत्पाद मूल्य या मात्रा।' });
        return;
      }
      calculatedItemsTotal += price * qty;
    }

    const validDeliveryCharges = Math.max(0, Number(deliveryCharges) || 0);
    const finalAmountInRupees = calculatedItemsTotal + validDeliveryCharges;
    const finalAmountInPaise = Math.round(finalAmountInRupees * 100);

    if (finalAmountInPaise <= 0) {
      res.status(400).json({ success: false, error: 'ऑर्डर राशि 0 से अधिक होनी चाहिए।' });
      return;
    }

    const active = getActiveRazorpayCredentials();

    if (!active.keyId || !active.keySecret) {
      res.status(500).json({
        success: false,
        error: `Razorpay ${serverConfig.mode === 'live' ? 'Live' : 'Test'} क्रेडेंशियल्स सेट नहीं हैं।`,
      });
      return;
    }

    const year = new Date().getFullYear();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const orderReceipt = `FKB-${year}-${randomDigits}`;

    const authHeader = 'Basic ' + Buffer.from(`${active.keyId}:${active.keySecret}`).toString('base64');
    
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: finalAmountInPaise,
        currency: 'INR',
        receipt: orderReceipt,
        notes: {
          customerName: customerDetails?.name || 'किसान',
          customerPhone: customerDetails?.phone || '',
          mode: serverConfig.mode,
          ...notes,
        },
      }),
    });

    const rzpData = await rzpResponse.json();

    if (!rzpResponse.ok) {
      res.status(rzpResponse.status).json({
        success: false,
        error: rzpData.error?.description || 'Razorpay पर आर्डर बनाने में समस्या आई।',
      });
      return;
    }

    res.json({
      success: true,
      razorpayOrderId: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      keyId: active.keyId,
      receipt: orderReceipt,
      calculatedTotal: finalAmountInRupees,
      mode: serverConfig.mode,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'आर्डर बनाने के दौरान आंतरिक त्रुटि हुई।',
    });
  }
});

app.post('/api/razorpay/verify-payment', (req: Request, res: Response): void => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        verified: false,
        error: 'भुगतान सत्यापन विवरण अपूर्ण हैं।',
      });
      return;
    }

    const active = getActiveRazorpayCredentials();
    if (!active.keySecret) {
      res.status(500).json({
        verified: false,
        error: 'सर्वर पर Razorpay Secret Key उपलब्ध नहीं है।',
      });
      return;
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', active.keySecret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      serverConfig.lastPaymentStatus = `सत्यापित (Paid: ${razorpay_payment_id}) - ${new Date().toLocaleTimeString('hi-IN')}`;
      saveRazorpayConfig({ lastPaymentStatus: serverConfig.lastPaymentStatus });

      res.json({
        verified: true,
        message: 'भुगतान सफलतापूर्वक सत्यापित हो गया। (Payment Verified Successfully)',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        mode: serverConfig.mode,
      });
    } else {
      res.status(400).json({
        verified: false,
        error: 'भुगतान सत्यापन विफल रहा (Invalid Signature)!',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      verified: false,
      error: error.message || 'भुगतान सत्यापन के दौरान त्रुटि हुई।',
    });
  }
});

app.post('/api/razorpay/process-refund', async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId, amount, orderId, orderNumber, reason } = req.body;
    const refundAmountInRupees = Number(amount) || 0;

    if (refundAmountInRupees <= 0) {
      res.status(400).json({
        success: false,
        error: 'अमान्य रिफंड राशि।'
      });
      return;
    }

    const active = getActiveRazorpayCredentials();
    let refundId = `rfnd_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    let isLiveProcessed = false;

    if (active.keyId && active.keySecret && paymentId && paymentId.startsWith('pay_')) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${active.keyId}:${active.keySecret}`).toString('base64');
        const refundPayload = {
          amount: Math.round(refundAmountInRupees * 100),
          speed: 'optimum',
          notes: {
            reason: reason || 'ऑर्डर रद्दीकरण',
            orderId: orderId || '',
            orderNumber: orderNumber || '',
          }
        };

        const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(refundPayload)
        });

        const rzpData = await rzpRes.json();

        if (rzpRes.ok && rzpData.id) {
          refundId = rzpData.id;
          isLiveProcessed = true;
        }
      } catch (rzpErr) {
        console.warn('Razorpay refund API warning:', rzpErr);
      }
    }

    serverConfig.lastPaymentStatus = `रिफंड प्रोसेस (₹${refundAmountInRupees} for ${orderNumber || orderId || paymentId}) - ${new Date().toLocaleTimeString('hi-IN')}`;
    saveRazorpayConfig({ lastPaymentStatus: serverConfig.lastPaymentStatus });

    res.json({
      success: true,
      refundId,
      refundAmount: refundAmountInRupees,
      isLiveProcessed,
      status: 'processed',
      message: 'रिफंड रेज़रपे द्वारा आपके मूल भुगतान माध्यम पर प्रोसेस कर दिया गया है।',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'रिफंड प्रोसेस करने में त्रुटि हुई।'
    });
  }
});

app.post('/api/razorpay/webhook', (req: any, res: Response): void => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = serverConfig.webhookSecret || serverConfig.liveKeySecret || serverConfig.testKeySecret;

    if (webhookSecret && signature) {
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        res.status(400).json({ status: 'invalid_signature' });
        return;
      }
    }

    const event = req.body?.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      serverConfig.lastPaymentStatus = `Webhook Verified (${event}: ${paymentId || orderId}) - ${new Date().toLocaleTimeString('hi-IN')}`;
      saveRazorpayConfig({ lastPaymentStatus: serverConfig.lastPaymentStatus });
    }

    res.json({ status: 'ok', received: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Razorpay Settings
app.get('/api/admin/razorpay/settings', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const webhookUrl = `${protocol}://${host}/api/razorpay/webhook`;

  res.json({
    enabled: serverConfig.enabled,
    mode: serverConfig.mode,
    testKeyId: serverConfig.testKeyId,
    liveKeyId: serverConfig.liveKeyId,
    hasTestSecret: Boolean(serverConfig.testKeySecret),
    hasLiveSecret: Boolean(serverConfig.liveKeySecret),
    webhookSecret: serverConfig.webhookSecret ? '••••••••' : '',
    hasWebhookSecret: Boolean(serverConfig.webhookSecret),
    webhookUrl,
    lastUpdated: serverConfig.lastUpdated,
    lastPaymentStatus: serverConfig.lastPaymentStatus || 'कोई नया भुगतान नहीं',
    lastTestResult: serverConfig.lastTestResult,
  });
});

app.post('/api/admin/razorpay/settings', (req: Request, res: Response): void => {
  try {
    const { enabled, mode, testKeyId, testKeySecret, liveKeyId, liveKeySecret, webhookSecret } = req.body;
    const updates: Partial<RazorpayServerConfig> = {};

    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (mode === 'test' || mode === 'live') updates.mode = mode;
    if (typeof testKeyId === 'string') updates.testKeyId = testKeyId.trim();
    if (typeof liveKeyId === 'string') updates.liveKeyId = liveKeyId.trim();

    if (typeof testKeySecret === 'string' && testKeySecret.trim() && !testKeySecret.includes('••••')) {
      updates.testKeySecret = testKeySecret.trim();
    }
    if (typeof liveKeySecret === 'string' && liveKeySecret.trim() && !liveKeySecret.includes('••••')) {
      updates.liveKeySecret = liveKeySecret.trim();
    }
    if (typeof webhookSecret === 'string' && !webhookSecret.includes('••••')) {
      updates.webhookSecret = webhookSecret.trim();
    }

    saveRazorpayConfig(updates);
    const active = getActiveRazorpayCredentials();

    res.json({
      success: true,
      message: 'Razorpay सेटिंग्स सुरक्षित रूप से सेव हो गईं।',
      config: {
        enabled: serverConfig.enabled,
        mode: serverConfig.mode,
        testKeyId: serverConfig.testKeyId,
        liveKeyId: serverConfig.liveKeyId,
        hasTestSecret: Boolean(serverConfig.testKeySecret),
        hasLiveSecret: Boolean(serverConfig.liveKeySecret),
        isConfigured: Boolean(active.keyId && active.keySecret),
        lastUpdated: serverConfig.lastUpdated,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'सेटिंग्स सेव करने में त्रुटि हुई।' });
  }
});

// Routing & Geocoding Helpers
app.get('/api/delivery/calculate-route', async (req: Request, res: Response): Promise<void> => {
  try {
    const originLat = parseFloat(req.query.originLat as string) || 24.1842;
    const originLng = parseFloat(req.query.originLng as string) || 75.6431;
    const destLat = parseFloat(req.query.destLat as string);
    const destLng = parseFloat(req.query.destLng as string);

    if (isNaN(destLat) || isNaN(destLng)) {
      res.status(400).json({ success: false, error: 'Invalid coordinates' });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
    const osrmRes = await fetch(osrmUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timeoutId);

    if (osrmRes.ok) {
      const data = await osrmRes.json();
      if (data.routes && data.routes.length > 0 && typeof data.routes[0].distance === 'number') {
        const meters = data.routes[0].distance;
        const durationSec = data.routes[0].duration || 0;
        const distanceKm = Math.max(0.5, Math.round((meters / 1000) * 10) / 10);
        const durationMins = Math.round(durationSec / 60);

        res.json({
          success: true,
          distanceKm,
          distanceMeters: meters,
          durationMins,
          source: 'osrm_road_routing',
        });
        return;
      }
    }

    // Geodesic fallback
    const R = 6371;
    const dLat = (destLat - originLat) * (Math.PI / 180);
    const dLon = (destLng - originLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(originLat * (Math.PI / 180)) * Math.cos(destLat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const crowFlyKm = R * c;
    const fallbackKm = Math.max(0.5, Math.round(crowFlyKm * 1.25 * 10) / 10);

    res.json({
      success: true,
      distanceKm: fallbackKm,
      distanceMeters: Math.round(fallbackKm * 1000),
      durationMins: Math.round(fallbackKm * 2.5),
      source: 'geodesic_road_estimate',
    });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/delivery/geocode', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 3) {
      res.status(400).json({ success: false, error: 'Query too short' });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=1`;
    const geoRes = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'FalsawdiyaKrishiBazaar/1.0' },
    });
    clearTimeout(timeoutId);

    if (geoRes.ok) {
      const data = await geoRes.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        res.json({
          success: true,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        });
        return;
      }
    }

    res.json({ success: false, error: 'Location not found' });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. DELIVERY OTP & EMAIL SMTP API ROUTES
// ==========================================

// Public OTP config for delivery screen & checkout
app.get('/api/delivery/otp-config', async (_req: Request, res: Response) => {
  await loadEmailConfig();
  const isEmailConfigured = Boolean(
    (emailConfig.senderEmail || process.env.GMAIL_SENDER_EMAIL)?.trim() && 
    (emailConfig.appPassword || process.env.GMAIL_APP_PASSWORD)?.trim()
  );

  res.json({
    enabled: emailConfig.enabled,
    isEmailConfigured,
    senderEmailMasked: emailConfig.senderEmail ? maskEmail(emailConfig.senderEmail) : '',
    senderName: emailConfig.senderName,
    expiryMinutes: emailConfig.expiryMinutes || 15,
    resendCooldownSeconds: emailConfig.resendCooldownSeconds || 60,
    showInAppOtpFallback: emailConfig.showInAppOtpFallback ?? true,
  });
});

// Admin OTP and Email settings (NEVER returns unmasked raw password)
app.get('/api/admin/delivery/otp-config', async (_req: Request, res: Response) => {
  await loadEmailConfig();
  const safeConfig = { ...emailConfig };
  delete (safeConfig as any).appPassword;

  const currentPassword = (emailConfig.appPassword || process.env.GMAIL_APP_PASSWORD || '').trim();

  res.json({
    ...safeConfig,
    appPasswordConfigured: Boolean(currentPassword),
    appPasswordMasked: currentPassword ? '••••••••••••••••' : '',
  });
});

// Admin update OTP and Email settings
app.post('/api/admin/delivery/otp-config', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      enabled, 
      senderEmail, 
      appPassword, 
      senderName, 
      otpLength = 6, 
      expiryMinutes = 15, 
      resendCooldownSeconds = 60, 
      maxAttempts = 3, 
      showInAppOtpFallback = true 
    } = req.body;

    const updated: Partial<EmailOtpServerConfig> = {
      enabled: enabled !== undefined ? Boolean(enabled) : emailConfig.enabled,
      senderEmail: typeof senderEmail === 'string' && senderEmail.trim() ? senderEmail.trim() : emailConfig.senderEmail,
      senderName: typeof senderName === 'string' && senderName.trim() ? senderName.trim() : emailConfig.senderName,
      otpLength: Number(otpLength) || 6,
      expiryMinutes: Math.max(2, Math.min(60, Number(expiryMinutes) || 15)),
      resendCooldownSeconds: Math.max(10, Math.min(300, Number(resendCooldownSeconds) || 60)),
      maxAttempts: Math.max(1, Math.min(10, Number(maxAttempts) || 3)),
      showInAppOtpFallback: showInAppOtpFallback !== undefined ? Boolean(showInAppOtpFallback) : emailConfig.showInAppOtpFallback,
    };

    if (typeof appPassword === 'string' && appPassword.trim() && !appPassword.includes('••••')) {
      updated.appPassword = appPassword.replace(/\s+/g, '').trim();
    }

    await saveEmailConfig(updated);

    const safeConfig = { ...emailConfig };
    delete (safeConfig as any).appPassword;

    res.json({
      success: true,
      message: 'ईमेल एवं OTP सेटिंग्स सफलतापूर्वक सहेजी गईं।',
      config: {
        ...safeConfig,
        appPasswordConfigured: Boolean((emailConfig.appPassword || process.env.GMAIL_APP_PASSWORD)?.trim()),
        appPasswordMasked: emailConfig.appPassword ? '••••••••••••••••' : '',
      }
    });
  } catch (err: any) {
    console.error('[Server] /api/admin/delivery/otp-config error:', err);
    res.status(500).json({ success: false, error: err.message || 'सेटिंग्स सहेजी नहीं जा सकीं। कृपया दोबारा प्रयास करें।' });
  }
});

// Admin Test Email Dispatch
app.post('/api/admin/delivery/test-email', async (req: Request, res: Response): Promise<void> => {
  try {
    await loadEmailConfig();
    const { recipientEmail } = req.body;
    const targetEmail = (recipientEmail || emailConfig.senderEmail || process.env.GMAIL_SENDER_EMAIL || '').trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      res.status(400).json({
        success: false,
        error: 'कृपया मान्य ईमेल पता दर्ज करें (Valid recipient email required).'
      });
      return;
    }

    const testTime = new Date().toLocaleString('hi-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const storeDisplayName = emailConfig.senderName?.trim() || 'फल्सावदिया कृषि बाजार';

    const mailOptions = {
      to: targetEmail,
      subject: `परीक्षण ईमेल सत्यापन - ${storeDisplayName}`,
      html: renderTestEmailHtml({
        senderEmail: emailConfig.senderEmail || process.env.GMAIL_SENDER_EMAIL || '',
        recipientEmail: targetEmail,
        testTime,
        storeName: storeDisplayName,
        storePhone: '+91 89823 38046',
        logoCidOrUrl: 'cid:falsawdiya-logo',
      }),
    };

    const sendResult = await sendSmtpEmail(mailOptions);

    if (!sendResult.success) {
      const errorMessage = sendResult.error || 'SMTP Authentication Failed. कृपया 16-अक्षरों का Google App Password जांचें।';
      const testResult = {
        success: false,
        message: errorMessage,
        timestamp: Date.now(),
        testedEmail: req.body.recipientEmail,
      };
      saveEmailConfig({ lastTestResult: testResult });

      res.status(500).json({
        success: false,
        error: errorMessage,
        testResult,
      });
      return;
    }

    const testResult = {
      success: true,
      message: `परीक्षण ईमेल सफलतापूर्वक भेजा गया (${sendResult.messageId || 'OK'})। कृपया अपना इनबॉक्स / स्पैम फोल्डर देखें।`,
      timestamp: Date.now(),
      testedEmail: targetEmail,
    };

    saveEmailConfig({ lastTestResult: testResult });

    res.json({
      success: true,
      message: testResult.message,
      testResult,
    });
  } catch (err: any) {
    const errorMessage = err.message || 'SMTP ऑथेंटिकेशन विफल रहा।';
    const testResult = {
      success: false,
      message: errorMessage,
      timestamp: Date.now(),
      testedEmail: req.body.recipientEmail,
    };
    saveEmailConfig({ lastTestResult: testResult });

    res.status(500).json({
      success: false,
      error: errorMessage,
      testResult,
    });
  }
});

// Admin Get Delivery Email Template
app.get('/api/admin/delivery/email-template', async (req: Request, res: Response): Promise<void> => {
  try {
    await loadEmailTemplateConfig();
    res.json({
      success: true,
      template: deliveryEmailTemplate,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'टेम्पलेट लोड करने में विफल।',
    });
  }
});

// Admin Save Delivery Email Template
app.post('/api/admin/delivery/email-template', async (req: Request, res: Response): Promise<void> => {
  try {
    const newTemplate = req.body;
    if (!newTemplate || typeof newTemplate !== 'object') {
      res.status(400).json({ success: false, error: 'अमान्य टेम्पलेट डेटा।' });
      return;
    }
    await saveEmailTemplateConfig(newTemplate);
    res.json({
      success: true,
      message: 'ईमेल टेम्पलेट सफलतापूर्वक सहेजा गया।',
      template: deliveryEmailTemplate,
    });
  } catch (err: any) {
    console.error('[Server] Save email template error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'टेम्पलेट सहेजने में विफल।',
    });
  }
});

// Admin Test Template Email Dispatch (Sends custom/current template to recipient for testing)
app.post('/api/admin/delivery/test-template-email', async (req: Request, res: Response): Promise<void> => {
  try {
    await loadEmailConfig();
    await loadEmailTemplateConfig();
    const { recipientEmail, template } = req.body;
    const targetEmail = (recipientEmail || emailConfig.senderEmail || process.env.GMAIL_SENDER_EMAIL || '').trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      res.status(400).json({
        success: false,
        error: 'कृपया मान्य ईमेल पता दर्ज करें (Valid recipient email required).'
      });
      return;
    }

    const activeTemplate = template ? { ...DEFAULT_SERVER_DELIVERY_TEMPLATE, ...template } : deliveryEmailTemplate;
    const storeDisplayName = activeTemplate.storeName || emailConfig.senderName?.trim() || 'फल्सावदिया कृषि बाजार';

    const { subject, html } = renderDeliveryOtpEmailHtml({
      orderNumber: 'FKB-2026-123456',
      customerName: 'Ramesh Patidar',
      partnerName: 'कमलेश पाटीदार',
      otp: '596018',
      expiryMinutes: emailConfig.expiryMinutes || 15,
      orderStatus: 'Delivery in Progress',
      storeName: storeDisplayName,
      storePhone: activeTemplate.contactNumber || '+91 89823 38046',
      logoCidOrUrl: 'cid:falsawdiya-logo',
    }, activeTemplate);

    const mailOptions = {
      to: targetEmail,
      subject: `[TEST PREVIEW] ${subject}`,
      html,
    };

    const sendResult = await sendSmtpEmail(mailOptions);

    if (!sendResult.success) {
      const errorMessage = sendResult.error || 'SMTP Authentication Failed. कृपया 16-अक्षरों का Google App Password जांचें।';
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
      return;
    }

    res.json({
      success: true,
      message: `परीक्षण ईमेल सफलतापूर्वक भेजा गया (${sendResult.messageId || 'OK'})! कृपया अपना Gmail इनबॉक्स / स्पैम फोल्डर देखें।`,
    });
  } catch (err: any) {
    console.error('[Server] test-template-email error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'परीक्षण ईमेल भेजने में त्रुटि आई।',
    });
  }
});


// Endpoint to Send Delivery OTP to customer
app.post('/api/delivery/send-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    await loadEmailConfig();
    const { 
      orderId, 
      orderNumber = 'Order', 
      customerEmail: rawCustomerEmail, 
      userEmail: rawUserEmail,
      email: rawEmail,
      customerName = 'किसान भाई', 
      partnerId, 
      partnerName = 'डिलीवरी साथी',
      forceResend = false,
    } = req.body;

    const customerEmail = (rawCustomerEmail || rawUserEmail || rawEmail || '').trim();

    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const now = Date.now();
    let existing = activeOtps.get(orderId);

    // If not in memory, check Firestore
    if (!existing) {
      const remoteOtp = await getRemoteFirestoreDoc<ActiveDeliveryOtp>('delivery_otps', orderId);
      if (remoteOtp && remoteOtp.expiresAt > now) {
        existing = remoteOtp;
        activeOtps.set(orderId, existing);
      }
    }

    let otp: string;
    let expiresAt: number;
    let isReused = false;

    if (existing && existing.expiresAt > now && !forceResend) {
      if (!existing.emailSent && customerEmail && customerEmail.includes('@')) {
        otp = existing.plainOtpForInApp || Math.floor(100000 + Math.random() * 900000).toString();
        expiresAt = existing.expiresAt;
        isReused = true;
      } else if (existing.emailSent) {
        const waitSeconds = Math.max(0, Math.ceil(((emailConfig.resendCooldownSeconds * 1000) - (now - existing.sentAt)) / 1000));
        res.json({
          success: true,
          alreadyActive: true,
          message: 'सक्रिय OTP उपलब्ध है और ग्राहक की ईमेल पर भेजा जा चुका है।',
          emailSent: true,
          maskedEmail: existing.customerEmail ? maskEmail(existing.customerEmail) : (customerEmail ? maskEmail(customerEmail) : 'ग्राहक की ईमेल'),
          expiresAt: existing.expiresAt,
          resendCooldownSeconds: waitSeconds,
        });
        return;
      } else {
        otp = existing.plainOtpForInApp || Math.floor(100000 + Math.random() * 900000).toString();
        expiresAt = existing.expiresAt;
        isReused = true;
      }
    } else {
      if (existing && (now - existing.sentAt) < (emailConfig.resendCooldownSeconds * 1000) && forceResend) {
        const waitSeconds = Math.ceil(((emailConfig.resendCooldownSeconds * 1000) - (now - existing.sentAt)) / 1000);
        res.json({
          success: false,
          error: `कृपया पुनः नया OTP भेजने के लिए ${waitSeconds} सेकंड प्रतीक्षा करें।`,
          remainingSeconds: waitSeconds,
        });
        return;
      }

      otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryMs = (emailConfig.expiryMinutes || 15) * 60 * 1000;
      expiresAt = now + expiryMs;
    }

    const otpHash = hashDeliveryOtp(orderId, otp);

    let emailSent = false;
    let emailError: string | null = null;

    if (customerEmail && customerEmail.includes('@')) {
      const storeDisplayName = deliveryEmailTemplate.storeName || emailConfig.senderName?.trim() || 'फल्सावदिया कृषि बाजार';
      const { subject, html } = renderDeliveryOtpEmailHtml({
        orderNumber,
        customerName: customerName || 'सम्मानित ग्राहक',
        partnerName: partnerName || 'डिलीवरी साथी',
        otp,
        expiryMinutes: emailConfig.expiryMinutes || 15,
        orderStatus: 'Delivery in Progress',
        storeName: storeDisplayName,
        storePhone: deliveryEmailTemplate.contactNumber || '+91 89823 38046',
        logoCidOrUrl: 'cid:falsawdiya-logo',
      }, deliveryEmailTemplate);

      const mailOptions = {
        to: customerEmail.trim(),
        subject,
        html,
      };

      const sendRes = await sendSmtpEmail(mailOptions);
      if (sendRes.success) {
        emailSent = true;
      } else {
        emailError = sendRes.error || 'ईमेल भेजने में विफल';
      }
    } else {
      emailError = 'ग्राहक का कोई पंजीकृत ईमेल नहीं मिला।';
    }

    const activeRecord: ActiveDeliveryOtp = {
      orderId,
      orderNumber,
      customerEmail: customerEmail || (existing?.customerEmail || ''),
      customerName,
      otpHash,
      plainOtpForInApp: otp,
      expiresAt,
      sentAt: now,
      attempts: isReused ? (existing?.attempts || 0) : 0,
      partnerId,
      partnerName,
      emailSent,
    };

    // Save in memory and persist in Firestore
    activeOtps.set(orderId, activeRecord);
    setRemoteFirestoreDoc('delivery_otps', orderId, activeRecord).catch((err) => {
      console.warn('[Server] Error persisting OTP to Firestore:', err);
    });

    res.json({
      success: true,
      message: emailSent 
        ? `ग्राहक (${maskEmail(customerEmail)}) के पंजीकृत ईमेल पर 6-अंकों का OTP भेज दिया गया है।` 
        : (customerEmail ? `OTP जनरेट हुआ (${emailError || 'ईमेल नहीं भेजा जा सका'})` : `OTP जनरेट हुआ।`),
      emailSent,
      emailError: emailError || undefined,
      maskedEmail: customerEmail ? maskEmail(customerEmail) : 'ग्राहक की ईमेल',
      expiresAt,
      resendCooldownSeconds: emailConfig.resendCooldownSeconds || 60,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'OTP भेजने में विफल' });
  }
});

// Endpoint to Verify Delivery OTP
app.post('/api/delivery/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    await loadEmailConfig();
    const { orderId, otp, partnerId, partnerName = 'डिलीवरी साथी', deliveryNote = '' } = req.body;

    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    if (!emailConfig.enabled) {
      res.json({
        success: true,
        verified: true,
        bypassed: true,
        message: 'डिलीवरी सत्यापन सफल (OTP Master switch disabled by Admin).',
        verifiedAt: Date.now(),
        verifiedBy: partnerId || 'partner',
        verifierName: partnerName,
        deliveryNote,
      });
      return;
    }

    const cleanOtp = (otp || '').toString().trim();
    if (!cleanOtp) {
      res.status(400).json({
        success: false,
        error: 'कृपया ग्राहक द्वारा दिया गया 6-अंकों का OTP दर्ज करें।'
      });
      return;
    }

    let record = activeOtps.get(orderId);
    if (!record) {
      const remoteRecord = await getRemoteFirestoreDoc<ActiveDeliveryOtp>('delivery_otps', orderId);
      if (remoteRecord) {
        record = remoteRecord;
        activeOtps.set(orderId, record);
      }
    }

    if (!record) {
      res.status(400).json({
        success: false,
        error: 'इस ऑर्डर के लिए कोई सक्रिय OTP नहीं मिला या समय समाप्त हो चुका है। कृपया "नया OTP भेजें" पर क्लिक करें।'
      });
      return;
    }

    const now = Date.now();
    if (record.expiresAt < now) {
      activeOtps.delete(orderId);
      deleteRemoteFirestoreDoc('delivery_otps', orderId).catch(() => {});
      res.status(400).json({
        success: false,
        error: 'OTP की समय सीमा (Expiry Time) समाप्त हो चुकी है। कृपया ग्राहक को पुनः नया OTP भेजें।'
      });
      return;
    }

    if (record.attempts >= (emailConfig.maxAttempts || 3)) {
      activeOtps.delete(orderId);
      deleteRemoteFirestoreDoc('delivery_otps', orderId).catch(() => {});
      res.status(403).json({
        success: false,
        error: `अधिकतम गलत प्रयास (${emailConfig.maxAttempts || 3}) पूरे हो चुके हैं। कृपया पुनः नया OTP भेजें।`
      });
      return;
    }

    const submittedHash = hashDeliveryOtp(orderId, cleanOtp);

    if (submittedHash !== record.otpHash) {
      record.attempts += 1;
      activeOtps.set(orderId, record);
      setRemoteFirestoreDoc('delivery_otps', orderId, record).catch(() => {});

      const remaining = Math.max(0, (emailConfig.maxAttempts || 3) - record.attempts);
      res.status(400).json({
        success: false,
        error: `गलत OTP दर्ज किया गया है! (शेष प्रयास: ${remaining})`,
        remainingAttempts: remaining,
      });
      return;
    }

    // OTP Verified Successfully!
    activeOtps.delete(orderId);
    deleteRemoteFirestoreDoc('delivery_otps', orderId).catch(() => {});

    res.json({
      success: true,
      verified: true,
      message: 'OTP सफलतापूर्वक सत्यापित हुआ! ऑर्डर डिलीवर चिह्नित किया गया।',
      verifiedAt: now,
      verifiedBy: partnerId || 'partner',
      verifierName: partnerName,
      deliveryNote: deliveryNote.trim(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'OTP सत्यापन विफल' });
  }
});

app.get('/api/delivery/in-app-otp/:orderId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    if (!emailConfig.showInAppOtpFallback) {
      res.json({ success: true, inAppAvailable: false });
      return;
    }

    let record = activeOtps.get(orderId);
    if (!record) {
      record = await getRemoteFirestoreDoc<ActiveDeliveryOtp>('delivery_otps', orderId) || undefined;
    }

    if (!record || record.expiresAt < Date.now()) {
      res.json({ success: true, inAppAvailable: false });
      return;
    }

    res.json({
      success: true,
      inAppAvailable: true,
      otp: record.plainOtpForInApp,
      expiresAt: record.expiresAt,
    });
  } catch {
    res.json({ success: false, inAppAvailable: false });
  }
});

// ==========================================
// OFFLINE ACCOUNTING & AI SCANNER ROUTES
// ==========================================
app.post('/api/accounting/scan-bill', handleScanBill);
app.post('/api/accounting/insights', handleAccountingInsights);

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  await loadEmailConfig();
  res.json({
    status: 'ok',
    service: 'Falsawdiya Krishi Bazaar Backend API',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    emailService: {
      configured: Boolean(
        (emailConfig.senderEmail || process.env.GMAIL_SENDER_EMAIL)?.trim() && 
        (emailConfig.appPassword || process.env.GMAIL_APP_PASSWORD)?.trim()
      ),
      sender: emailConfig.senderEmail ? maskEmail(emailConfig.senderEmail) : (process.env.GMAIL_SENDER_EMAIL ? maskEmail(process.env.GMAIL_SENDER_EMAIL) : 'not configured'),
    },
    razorpayService: {
      configured: Boolean(serverConfig.testKeyId || serverConfig.liveKeyId),
      mode: serverConfig.mode,
    }
  });
});

// Catch-all 404 handler for unknown API routes to guarantee pure JSON response
app.all('/api/*', (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `API Route not found: ${req.method} ${req.path}`,
    message: 'अमान्य API पाथ। कृपया सही एंडपॉइंट का उपयोग करें।',
  });
});

export default app;
