import express from 'express';
import path from 'path';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

// Load Firebase Config
let firebaseConfig: any = {};
try {
  const configFile = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configFile)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  }
} catch (e) {
  console.error("Error loading firebase config in server.ts:", e);
}

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to fetch Razorpay settings from Firestore or env fallback
  async function getRazorpaySettings() {
    try {
      const snap = await getDoc(doc(db, 'settings', 'razorpay'));
      if (snap.exists()) {
        const data = snap.data();
        return {
          keyId: data.keyId || process.env.RAZORPAY_KEY_ID || '',
          keySecret: data.keySecret || process.env.RAZORPAY_KEY_SECRET || '',
          isTestMode: data.isTestMode !== undefined ? data.isTestMode : true,
          gstPercentage: data.gstPercentage !== undefined ? data.gstPercentage : 18,
          platformChargePercentage: data.platformChargePercentage !== undefined ? data.platformChargePercentage : 0,
          deliveryFee: data.deliveryFee !== undefined ? data.deliveryFee : 0,
          isRazorpayEnabled: data.isRazorpayEnabled !== undefined ? data.isRazorpayEnabled : true,
          isDeliveryActive: data.isDeliveryActive !== undefined ? data.isDeliveryActive : true,
        };
      }
    } catch (e) {
      console.error("Error reading razorpay settings from Firestore:", e);
    }

    return {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      isTestMode: true,
      gstPercentage: 18,
      platformChargePercentage: 0,
      deliveryFee: 0,
      isRazorpayEnabled: true,
      isDeliveryActive: true,
    };
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Get public Razorpay configuration for frontend
  app.get('/api/razorpay/config', async (_req, res) => {
    try {
      const settings = await getRazorpaySettings();
      res.json({
        keyId: settings.keyId,
        isTestMode: settings.isTestMode,
        gstPercentage: settings.gstPercentage,
        platformChargePercentage: settings.platformChargePercentage,
        deliveryFee: settings.deliveryFee,
        isRazorpayEnabled: settings.isRazorpayEnabled,
        isDeliveryActive: settings.isDeliveryActive,
        hasKeySecret: Boolean(settings.keySecret),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load config' });
    }
  });

  // Save Razorpay settings (called by Admin Panel)
  app.post('/api/razorpay/save-config', async (req, res) => {
    try {
      const {
        keyId,
        keySecret,
        isTestMode,
        gstPercentage,
        platformChargePercentage,
        deliveryFee,
        isRazorpayEnabled,
        isDeliveryActive,
      } = req.body;

      const updatedData: any = {
        keyId: keyId || '',
        isTestMode: Boolean(isTestMode),
        gstPercentage: Number(gstPercentage) || 0,
        platformChargePercentage: Number(platformChargePercentage) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        isRazorpayEnabled: isRazorpayEnabled !== undefined ? Boolean(isRazorpayEnabled) : true,
        isDeliveryActive: isDeliveryActive !== undefined ? Boolean(isDeliveryActive) : true,
        updatedAt: Date.now(),
      };

      // Only overwrite keySecret if non-empty string provided
      if (keySecret !== undefined && keySecret !== null && keySecret !== '') {
        updatedData.keySecret = keySecret;
      }

      await setDoc(doc(db, 'settings', 'razorpay'), updatedData, { merge: true });

      res.json({ success: true, message: 'Razorpay सेटिंग सफलतापूर्वक सुरक्षित की गई!' });
    } catch (error: any) {
      console.error('Error saving Razorpay config:', error);
      res.status(500).json({ error: error.message || 'Failed to save settings' });
    }
  });

  // Create Razorpay Order server-side
  app.post('/api/razorpay/create-order', async (req, res) => {
    try {
      const { amount, currency = 'INR', receipt, notes } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'वैध राशि प्रदान करें (Invalid amount)' });
      }

      const settings = await getRazorpaySettings();

      if (!settings.keyId || !settings.keySecret) {
        return res.status(400).json({
          error: 'Razorpay Keys सेटअप नहीं हैं। एडमिन पैनल से Key ID और Key Secret सेट करें।',
        });
      }

      const instance = new Razorpay({
        key_id: settings.keyId,
        key_secret: settings.keySecret,
      });

      // Amount in paise (1 INR = 100 paise)
      const options = {
        amount: Math.round(Number(amount) * 100),
        currency: currency || 'INR',
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || { source: 'Falsawdiya Agri Market App' },
      };

      const order = await instance.orders.create(options);

      res.json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        keyId: settings.keyId,
        isTestMode: settings.isTestMode,
      });
    } catch (error: any) {
      console.error('Razorpay order creation error:', error);
      res.status(500).json({
        error: error?.error?.description || error.message || 'ऑर्डर बनाने में समस्या आई',
      });
    }
  });

  // Verify Payment Signature server-side
  app.post('/api/razorpay/verify-payment', async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        customerDetails,
        items,
        subtotal,
        gstAmount,
        platformCharge,
        deliveryFee,
        totalAmount,
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'अधूरी भुगतान जानकारी (Incomplete payment data)' });
      }

      const settings = await getRazorpaySettings();

      if (!settings.keySecret) {
        return res.status(400).json({ error: 'Razorpay Key Secret अनुपलब्ध है' });
      }

      // Compute HMAC SHA256 Signature
      const hmac = crypto.createHmac('sha256', settings.keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        console.warn('Payment signature mismatch!', {
          generatedSignature,
          receivedSignature: razorpay_signature,
        });
        return res.status(400).json({
          success: false,
          error: 'भुगतान हस्ताक्षर अमान्य है (Invalid Payment Signature)',
        });
      }

      // Payment is VERIFIED successfully! Store order record in Firestore
      const orderRecord = {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'भुगतान सफल (Paid)',
        paymentStatus: 'success',
        customerDetails: customerDetails || {},
        items: items || [],
        subtotal: subtotal || 0,
        gstAmount: gstAmount || 0,
        platformCharge: platformCharge || 0,
        deliveryFee: deliveryFee || 0,
        totalAmount: totalAmount || 0,
        isTestMode: settings.isTestMode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderRecord);

      res.json({
        success: true,
        orderId: docRef.id,
        paymentId: razorpay_payment_id,
        message: 'भुगतान सफलतापूर्वक सत्यापित किया गया!',
      });
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ error: error.message || 'भुगतान सत्यापन विफल' });
    }
  });

  // Razorpay Webhook Endpoint
  app.post('/api/razorpay/webhook', async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
      const signature = req.headers['x-razorpay-signature'];

      if (secret && signature) {
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest('hex');

        if (digest !== signature) {
          return res.status(400).json({ status: 'invalid_signature' });
        }
      }

      const event = req.body;
      console.log('Razorpay Webhook Event Received:', event.event);

      // Handle captured payment or failed payment
      if (event.event === 'payment.captured') {
        const payment = event.payload.payment.entity;
        console.log('Payment Captured:', payment.id, payment.amount);
      }

      res.json({ status: 'ok' });
    } catch (e: any) {
      console.error('Webhook error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Vite development middleware vs production static server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
