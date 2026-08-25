// Razorpay payment integration service (Client & Server-connected)
import { RazorpayPublicConfig, RazorpayAdminSettings } from '../types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key?: string;
  amount: number; // in paise
  currency?: string;
  name: string;
  description?: string;
  image?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

// 1. Fetch public Razorpay config (Gateway status, Mode, Key ID - NO secrets)
export const fetchRazorpayPublicConfig = async (): Promise<RazorpayPublicConfig> => {
  try {
    const res = await fetch('/api/razorpay/config');
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch server razorpay config, using fallback defaults:', err);
    return {
      enabled: true,
      mode: 'test',
      keyId: '',
      isConfigured: false,
    };
  }
};

// 2. Fetch admin Razorpay settings (Masked secrets)
export const fetchRazorpayAdminSettings = async (): Promise<RazorpayAdminSettings> => {
  const res = await fetch('/api/admin/razorpay/settings');
  if (!res.ok) {
    throw new Error('एडमिन सेटिंग्स लोड नहीं हो सकीं।');
  }
  return await res.json();
};

// 3. Update admin Razorpay settings
export const updateRazorpayAdminSettings = async (payload: {
  enabled?: boolean;
  mode?: 'test' | 'live';
  testKeyId?: string;
  testKeySecret?: string;
  liveKeyId?: string;
  liveKeySecret?: string;
  webhookSecret?: string;
}): Promise<{ success: boolean; message: string; config?: any }> => {
  const res = await fetch('/api/admin/razorpay/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'सेटिंग्स अपडेट करने में विफल रहा।');
  }
  return data;
};

// 4. Test connection against Razorpay API
export const testRazorpayConnection = async (payload?: {
  mode?: 'test' | 'live';
  testKeyId?: string;
  testKeySecret?: string;
  liveKeyId?: string;
  liveKeySecret?: string;
}): Promise<{ success: boolean; message: string; mode: string }> => {
  const res = await fetch('/api/admin/razorpay/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    return {
      success: false,
      message: data.message || 'Configuration failed — कृपया Key ID/Secret और mode check करें।',
      mode: data.mode || payload?.mode || 'test',
    };
  }
  return data;
};

// 5. Create Razorpay Server Order
export const createRazorpayServerOrder = async (payload: {
  items: any[];
  customerDetails: any;
  deliveryCharges?: number;
  notes?: Record<string, string>;
}): Promise<{
  success: boolean;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  receipt: string;
  calculatedTotal: number;
  mode: 'test' | 'live';
}> => {
  const res = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Razorpay पर आर्डर बनाने में समस्या आई।');
  }
  return data;
};

// 6. Verify Payment on Server
export const verifyRazorpayPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{
  verified: boolean;
  message?: string;
  error?: string;
  paymentId?: string;
  orderId?: string;
  mode?: 'test' | 'live';
}> => {
  const res = await fetch('/api/razorpay/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.verified) {
    throw new Error(data.error || 'भुगतान सत्यापन विफल रहा (Signature Verification Failed)।');
  }
  return data;
};

// Load external Razorpay script safely
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export interface ProcessPaymentParams {
  items: any[];
  deliveryCharges?: number;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  appTitle?: string;
  onSuccess: (verificationResult: {
    paymentId: string;
    razorpayOrderId: string;
    signature: string;
    mode: 'test' | 'live';
    amountInRupees: number;
  }) => void;
  onFailure: (errorMessage: string) => void;
  onDismiss?: () => void;
}

// Complete End-to-End Secure Razorpay Checkout Flow:
// 1. Create Server Order -> 2. Open Razorpay Checkout -> 3. Server Signature Verification -> 4. Confirm
export const initiateRazorpayPayment = async ({
  items,
  deliveryCharges = 0,
  orderNumber,
  customerName,
  customerPhone,
  customerEmail,
  appTitle = 'फल्सावदिया कृषि बाजार',
  onSuccess,
  onFailure,
  onDismiss,
}: ProcessPaymentParams) => {
  try {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      onFailure('पेमेंट गेटवे लोड नहीं हो सका। कृपया इंटरनेट कनेक्शन जांचें।');
      return;
    }

    // Step 1: Create official server-side order
    const serverOrder = await createRazorpayServerOrder({
      items,
      customerDetails: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
      deliveryCharges,
      notes: {
        orderNumber: orderNumber || '',
        appTitle,
      },
    });

    // Step 2: Configure Razorpay Checkout options
    const options: RazorpayOptions = {
      key: serverOrder.keyId,
      amount: serverOrder.amount,
      currency: serverOrder.currency || 'INR',
      name: appTitle,
      description: `ऑनलाइन ऑर्डर भुगतान (${serverOrder.mode === 'live' ? 'Live Mode' : 'Test Mode'})`,
      image: '/icon-192.png',
      order_id: serverOrder.razorpayOrderId,
      prefill: {
        name: customerName,
        contact: customerPhone,
        email: customerEmail || 'farmer@krishibazaar.in',
      },
      notes: {
        receipt: serverOrder.receipt,
        source: 'Krishi Bazaar Web App',
      },
      theme: {
        color: '#2D5A27',
      },
      handler: async function (response) {
        try {
          if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
            onFailure('Payment पूरा नहीं हुआ। आपका Order अभी Confirm नहीं हुआ है। (Missing Payment Response)');
            return;
          }

          // Step 3: Server-side Payment Verification
          const verification = await verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (verification.verified) {
            onSuccess({
              paymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              mode: verification.mode || serverOrder.mode,
              amountInRupees: serverOrder.calculatedTotal,
            });
          } else {
            onFailure('Payment पूरा नहीं हुआ। आपका Order अभी Confirm नहीं हुआ है। (Verification Failed)');
          }
        } catch (verifErr: any) {
          console.error('Payment Verification Error:', verifErr);
          onFailure(verifErr.message || 'Payment पूरा नहीं हुआ। आपका Order अभी Confirm नहीं हुआ है।');
        }
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) onDismiss();
        },
        escape: true,
        backdropclose: false,
      },
    };

    // Step 4: Open Razorpay modal
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      const reason = response.error?.description || 'भुगतान विफल रहा। कृपया पुनः प्रयास करें।';
      onFailure(`Payment पूरा नहीं हुआ। आपका Order अभी Confirm नहीं हुआ है। (${reason})`);
    });
    rzp.open();
  } catch (error: any) {
    console.error('Razorpay invocation error:', error);
    onFailure(error.message || 'पेमेंट विंडो खोलने में त्रुटि हुई।');
  }
};
