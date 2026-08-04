// Razorpay service helper for frontend integration

export interface RazorpayConfig {
  keyId: string;
  isTestMode: boolean;
  gstPercentage: number;
  platformChargePercentage: number;
  deliveryFee: number;
  isRazorpayEnabled: boolean;
  isDeliveryActive?: boolean;
  hasKeySecret?: boolean;
}

export interface SaveRazorpayConfigRequest {
  keyId: string;
  keySecret?: string;
  isTestMode: boolean;
  gstPercentage: number;
  platformChargePercentage: number;
  deliveryFee: number;
  isRazorpayEnabled: boolean;
  isDeliveryActive?: boolean;
}

// Dynamically load Razorpay Checkout Script
export const loadRazorpaySDK = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Fetch current Razorpay public config
export const fetchRazorpayConfig = async (): Promise<RazorpayConfig> => {
  try {
    const res = await fetch('/api/razorpay/config');
    if (!res.ok) throw new Error('Failed to load Razorpay config');
    return await res.json();
  } catch (e) {
    console.error('Error fetching Razorpay config:', e);
    return {
      keyId: '',
      isTestMode: true,
      gstPercentage: 18,
      platformChargePercentage: 0,
      deliveryFee: 0,
      isRazorpayEnabled: true,
      isDeliveryActive: true,
    };
  }
};

// Save Razorpay config via Admin
export const saveRazorpayConfig = async (
  config: SaveRazorpayConfigRequest
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const res = await fetch('/api/razorpay/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save config');
    }
    return data;
  } catch (e: any) {
    console.error('Error saving Razorpay config:', e);
    return { success: false, error: e.message || 'Error saving settings' };
  }
};

// Create server order
export const createRazorpayOrder = async (
  amount: number,
  notes?: Record<string, string>
) => {
  const res = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      notes,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create Razorpay order');
  }

  return data;
};

// Verify payment
export const verifyRazorpayPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  customerDetails: any;
  items: any[];
  subtotal: number;
  gstAmount: number;
  platformCharge: number;
  deliveryFee: number;
  totalAmount: number;
}) => {
  const res = await fetch('/api/razorpay/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Payment verification failed');
  }

  return data;
};
