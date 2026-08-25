import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Setup persistent storage path for Razorpay configuration
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'razorpay-config.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
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

const DEFAULT_CONFIG: RazorpayServerConfig = {
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

// In-memory config loaded from file or default
let serverConfig: RazorpayServerConfig = { ...DEFAULT_CONFIG };

const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      serverConfig = { ...DEFAULT_CONFIG, ...parsed };
    } else {
      saveConfig(DEFAULT_CONFIG);
    }
  } catch (err) {
    console.error('Error loading razorpay-config.json:', err);
  }
};

const saveConfig = (newConfig: Partial<RazorpayServerConfig>) => {
  try {
    serverConfig = { ...serverConfig, ...newConfig, lastUpdated: Date.now() };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(serverConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving razorpay-config.json:', err);
  }
};

loadConfig();

// Middleware: JSON parser with raw body retention for webhook signature validation
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Helper to get active credentials
const getActiveCredentials = () => {
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

// Public Configuration endpoint: frontend gets public key & status, NEVER secret!
app.get('/api/razorpay/config', (_req: Request, res: Response) => {
  const active = getActiveCredentials();
  res.json({
    enabled: serverConfig.enabled,
    mode: serverConfig.mode,
    keyId: active.keyId || '',
    isConfigured: Boolean(active.keyId && active.keySecret),
    webhookEnabled: Boolean(serverConfig.webhookSecret),
  });
});

// Create Order endpoint: calculates server-side amount and generates Razorpay Order
app.post('/api/razorpay/create-order', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!serverConfig.enabled) {
      res.status(403).json({
        success: false,
        error: 'Razorpay Payment Gateway is currently disabled. कृपया कुछ समय बाद पुनः प्रयास करें या सहायता से संपर्क करें।',
      });
      return;
    }

    const { items, customerDetails, deliveryCharges = 0, notes = {} } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'कार्ट में कोई उत्पाद नहीं है (Empty Cart).' });
      return;
    }

    // Server-side calculation to prevent client tampering
    let calculatedItemsTotal = 0;
    for (const item of items) {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      if (price < 0 || qty <= 0) {
        res.status(400).json({ success: false, error: 'अमान्य उत्पाद मूल्य या मात्रा (Invalid price/quantity).' });
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

    const active = getActiveCredentials();

    if (!active.keyId || !active.keySecret) {
      res.status(500).json({
        success: false,
        error: `Razorpay ${serverConfig.mode === 'live' ? 'Live' : 'Test'} Credentials अभी सेट नहीं हैं। कृपया Admin Panel में Razorpay Key ID और Secret दर्ज करें।`,
      });
      return;
    }

    const year = new Date().getFullYear();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const orderReceipt = `FKB-${year}-${randomDigits}`;

    // Call Razorpay API to create official order
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
      console.error('Razorpay Order Creation API Error:', rzpData);
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
    console.error('Error in /api/razorpay/create-order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'आर्डर बनाने के दौरान आंतरिक त्रुटि हुई।',
    });
  }
});

// Verify Payment endpoint: validates HMAC SHA256 signature
app.post('/api/razorpay/verify-payment', (req: Request, res: Response): void => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        verified: false,
        error: 'भुगतान सत्यापन विवरण अपूर्ण हैं (Missing signature/payment parameters).',
      });
      return;
    }

    const active = getActiveCredentials();
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
      saveConfig({ lastPaymentStatus: serverConfig.lastPaymentStatus });

      res.json({
        verified: true,
        message: 'भुगतान सफलतापूर्वक सत्यापित हो गया। (Payment Verified Successfully)',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        mode: serverConfig.mode,
      });
    } else {
      console.warn('Payment Signature Mismatch for:', { razorpay_order_id, razorpay_payment_id });
      res.status(400).json({
        verified: false,
        error: 'भुगतान सत्यापन विफल रहा (Invalid Signature)! कृपया सहायता से संपर्क करें।',
      });
    }
  } catch (error: any) {
    console.error('Error in /api/razorpay/verify-payment:', error);
    res.status(500).json({
      verified: false,
      error: error.message || 'भुगतान सत्यापन के दौरान त्रुटि हुई।',
    });
  }
});

// Webhook endpoint: handles Razorpay webhooks
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
        console.warn('Razorpay Webhook Signature Mismatch');
        res.status(400).json({ status: 'invalid_signature' });
        return;
      }
    }

    const event = req.body?.event;
    console.log(`Received Razorpay Webhook Event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      serverConfig.lastPaymentStatus = `Webhook Verified (${event}: ${paymentId || orderId}) - ${new Date().toLocaleTimeString('hi-IN')}`;
      saveConfig({ lastPaymentStatus: serverConfig.lastPaymentStatus });
    }

    res.json({ status: 'ok', received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. ADMIN API ROUTES FOR GATEWAY SETTINGS
// ==========================================

// Get Admin Settings (Masked Secrets)
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

// Update Admin Settings
app.post('/api/admin/razorpay/settings', (req: Request, res: Response): void => {
  try {
    const {
      enabled,
      mode,
      testKeyId,
      testKeySecret,
      liveKeyId,
      liveKeySecret,
      webhookSecret,
    } = req.body;

    const updates: Partial<RazorpayServerConfig> = {};

    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (mode === 'test' || mode === 'live') updates.mode = mode;
    if (typeof testKeyId === 'string') updates.testKeyId = testKeyId.trim();
    if (typeof liveKeyId === 'string') updates.liveKeyId = liveKeyId.trim();

    // Only update secrets if a non-empty, unmasked string was provided
    if (typeof testKeySecret === 'string' && testKeySecret.trim() && !testKeySecret.includes('••••')) {
      updates.testKeySecret = testKeySecret.trim();
    }
    if (typeof liveKeySecret === 'string' && liveKeySecret.trim() && !liveKeySecret.includes('••••')) {
      updates.liveKeySecret = liveKeySecret.trim();
    }
    if (typeof webhookSecret === 'string' && !webhookSecret.includes('••••')) {
      updates.webhookSecret = webhookSecret.trim();
    }

    saveConfig(updates);

    const active = getActiveCredentials();

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
    console.error('Error saving admin razorpay settings:', error);
    res.status(500).json({ success: false, error: error.message || 'सेटिंग्स सेव करने में त्रुटि हुई।' });
  }
});

// Test Connection / Verify Configuration API
app.post('/api/admin/razorpay/test-connection', async (req: Request, res: Response): Promise<void> => {
  try {
    const targetMode = req.body?.mode || serverConfig.mode;
    const isLive = targetMode === 'live';

    // Allow testing with newly submitted fields or saved ones
    const keyId = (isLive ? (req.body?.liveKeyId || serverConfig.liveKeyId) : (req.body?.testKeyId || serverConfig.testKeyId))?.trim();
    const keySecret = (isLive ? (req.body?.liveKeySecret || serverConfig.liveKeySecret) : (req.body?.testKeySecret || serverConfig.testKeySecret))?.trim();

    if (!keyId) {
      res.status(400).json({
        success: false,
        message: `❌ Configuration failed — कृपया ${isLive ? 'Live' : 'Test'} Key ID दर्ज करें।`,
      });
      return;
    }

    if (!keySecret || keySecret.includes('••••')) {
      // If it's masked, use the saved secret
      const actualSecret = isLive ? serverConfig.liveKeySecret : serverConfig.testKeySecret;
      if (!actualSecret) {
        res.status(400).json({
          success: false,
          message: `❌ Configuration failed — कृपया ${isLive ? 'Live' : 'Test'} Key Secret दर्ज करें।`,
        });
        return;
      }
    }

    const actualKeySecret = (!keySecret || keySecret.includes('••••')) 
      ? (isLive ? serverConfig.liveKeySecret : serverConfig.testKeySecret)
      : keySecret;

    // Test credentials against Razorpay API endpoint
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${actualKeySecret}`).toString('base64');
    
    const testRes = await fetch('https://api.razorpay.com/v1/payments?count=1', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (testRes.ok) {
      const result = {
        success: true,
        mode: targetMode,
        message: `✅ Razorpay configuration connected successfully (${isLive ? 'Live Mode' : 'Test Mode'})`,
        timestamp: Date.now(),
      };
      serverConfig.lastTestResult = result;
      saveConfig({ lastTestResult: result });

      res.json(result);
    } else {
      const errData = await testRes.json().catch(() => ({}));
      const reason = errData.error?.description || `HTTP ${testRes.status} Unauthorized`;
      
      const result = {
        success: false,
        mode: targetMode,
        message: `❌ Configuration failed — कृपया Key ID/Secret और mode check करें। (${reason})`,
        timestamp: Date.now(),
      };
      serverConfig.lastTestResult = result;
      saveConfig({ lastTestResult: result });

      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: `❌ Configuration failed — सर्वर कनेक्शन त्रुटि: ${error.message}`,
      timestamp: Date.now(),
    });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// ==========================================
// 3. VITE MIDDLEWARE & STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Falsawdiya Krishi Bazaar Server running on port ${PORT}`);
  });
}

startServer();
