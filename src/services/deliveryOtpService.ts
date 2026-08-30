import { DeliveryOtpPublicConfig, EmailOtpServerConfig } from '../types';

export interface SendOtpResult {
  success: boolean;
  message?: string;
  maskedEmail?: string;
  expiresAt?: number;
  resendCooldownSeconds?: number;
  inAppOtp?: string;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  verified?: boolean;
  message?: string;
  verifiedAt?: number;
  verifiedBy?: string;
  verifierName?: string;
  deliveryNote?: string;
  error?: string;
  remainingAttempts?: number;
}

/**
 * Fetch Public Delivery OTP config
 */
export async function getDeliveryOtpPublicConfig(): Promise<DeliveryOtpPublicConfig> {
  try {
    const res = await fetch('/api/delivery/otp-config');
    if (!res.ok) throw new Error('Failed to fetch OTP config');
    return await res.json();
  } catch (err) {
    return {
      enabled: true,
      isEmailConfigured: false,
      expiryMinutes: 15,
      resendCooldownSeconds: 60,
      showInAppOtpFallback: true,
    };
  }
}

/**
 * Admin: Fetch full Email & Delivery OTP Server Config
 */
export async function getAdminOtpConfig(): Promise<EmailOtpServerConfig & { appPasswordConfigured: boolean; appPasswordMasked: string }> {
  const res = await fetch('/api/admin/delivery/otp-config');
  if (!res.ok) throw new Error('Failed to fetch admin OTP config');
  return await res.json();
}

/**
 * Admin: Save Email & Delivery OTP Server Config
 */
export async function saveAdminOtpConfig(config: Partial<EmailOtpServerConfig>): Promise<{ success: boolean; message?: string; error?: string; config?: any }> {
  try {
    const res = await fetch('/api/admin/delivery/otp-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error saving OTP config' };
  }
}

/**
 * Admin: Dispatch a test email to verify SMTP credentials
 */
export async function sendAdminTestEmail(recipientEmail?: string): Promise<{ success: boolean; message?: string; error?: string; testResult?: any }> {
  try {
    const res = await fetch('/api/admin/delivery/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during test email' };
  }
}

/**
 * Send Delivery OTP to customer's registered email
 */
export async function sendDeliveryOtp(params: {
  orderId: string;
  orderNumber: string;
  customerEmail?: string;
  customerName?: string;
  partnerId?: string;
  partnerName?: string;
}): Promise<SendOtpResult> {
  try {
    const res = await fetch('/api/delivery/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(params),
    });
    
    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { success: false, error: 'सर्वर से अमान्य उत्तर प्राप्त हुआ।' };
    }

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'OTP भेजने में समस्या आई।',
        resendCooldownSeconds: data.remainingSeconds,
      };
    }
    return data;
  } catch (err: any) {
    console.error('sendDeliveryOtp error:', err);
    return { success: false, error: err.message || 'OTP भेजने में नेटवर्क समस्या आई।' };
  }
}

/**
 * Verify Delivery OTP and mark order delivered
 */
export async function verifyDeliveryOtp(params: {
  orderId: string;
  otp: string;
  partnerId?: string;
  partnerName?: string;
  deliveryNote?: string;
}): Promise<VerifyOtpResult> {
  try {
    const res = await fetch('/api/delivery/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(params),
    });

    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { success: false, error: 'सर्वर से अमान्य उत्तर प्राप्त हुआ।' };
    }

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'OTP सत्यापन विफल रहा।',
        remainingAttempts: data.remainingAttempts,
      };
    }
    return data;
  } catch (err: any) {
    console.error('verifyDeliveryOtp error:', err);
    return { success: false, error: err.message || 'OTP सत्यापन में नेटवर्क समस्या आई।' };
  }
}

/**
 * Customer in-app OTP fetcher for offline/weak network fallback
 */
export async function getInAppDeliveryOtp(orderId: string): Promise<{ success: boolean; inAppAvailable: boolean; otp?: string; expiresAt?: number }> {
  try {
    const res = await fetch(`/api/delivery/in-app-otp/${orderId}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return { success: false, inAppAvailable: false };
    const text = await res.text();
    if (!text) return { success: false, inAppAvailable: false };
    return JSON.parse(text);
  } catch {
    return { success: false, inAppAvailable: false };
  }
}
