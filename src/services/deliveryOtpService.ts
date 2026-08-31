import { DeliveryOtpPublicConfig, EmailOtpServerConfig } from '../types';

export interface SendOtpResult {
  success: boolean;
  message?: string;
  emailSent?: boolean;
  emailError?: string;
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
  try {
    const res = await fetch('/api/admin/delivery/otp-config', {
      headers: { 'Accept': 'application/json' },
    });
    const text = await res.text();
    if (!text) {
      throw new Error('सर्वर से कोई उत्तर प्राप्त नहीं हुआ।');
    }
    const data = JSON.parse(text);
    return data;
  } catch (err: any) {
    console.error('getAdminOtpConfig error:', err);
    throw err;
  }
}

/**
 * Admin: Save Email & Delivery OTP Server Config
 */
export async function saveAdminOtpConfig(config: Partial<EmailOtpServerConfig>): Promise<{ success: boolean; message?: string; error?: string; config?: any }> {
  try {
    const res = await fetch('/api/admin/delivery/otp-config', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(config),
    });
    const text = await res.text();
    if (!text) {
      return { success: res.ok, error: res.ok ? undefined : `सर्वर त्रुटि (${res.status})` };
    }
    const data = JSON.parse(text);
    return data;
  } catch (err: any) {
    console.error('saveAdminOtpConfig error:', err);
    return { success: false, error: err.message || 'नेटवर्क त्रुटि: सेटिंग्स सेव नहीं हो सकीं।' };
  }
}

/**
 * Admin: Dispatch a test email to verify SMTP credentials
 */
export async function sendAdminTestEmail(recipientEmail?: string): Promise<{ success: boolean; message?: string; error?: string; testResult?: any }> {
  try {
    const res = await fetch('/api/admin/delivery/test-email', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ recipientEmail }),
    });
    
    const text = await res.text();
    if (!text) {
      return { 
        success: false, 
        error: `सर्वर से खाली रिस्पांस प्राप्त हुआ (HTTP ${res.status})। कृपया सुनिश्चित करें कि सर्वर चालू है।` 
      };
    }

    try {
      const data = JSON.parse(text);
      return data;
    } catch {
      return { 
        success: false, 
        error: `अमान्य रिस्पांस फॉर्मेट (HTTP ${res.status}): ${text.substring(0, 100)}` 
      };
    }
  } catch (err: any) {
    console.error('sendAdminTestEmail error:', err);
    return { success: false, error: err.message || 'परीक्षण ईमेल भेजने में नेटवर्क समस्या आई।' };
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
  forceResend?: boolean;
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
