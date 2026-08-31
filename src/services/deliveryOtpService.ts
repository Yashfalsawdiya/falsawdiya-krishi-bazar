import { DeliveryOtpPublicConfig, EmailOtpServerConfig } from '../types';

export function toSafeString(val: any, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (typeof val.message === 'string') return val.message;
    if (typeof val.error === 'string') return val.error;
    if (typeof val.code === 'string') return `त्रुटि (${val.code}): ${typeof val.message === 'string' ? val.message : 'सर्वर समस्या'}`;
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

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

export interface BackendHealthStatus {
  isReachable: boolean;
  status?: string;
  environment?: string;
  emailConfigured?: boolean;
  senderEmail?: string;
  error?: string;
}

/**
 * Safe JSON parser that guards against empty strings, HTML 404s, and malformed inputs
 */
async function parseJsonResponse<T = any>(res: Response): Promise<{ ok: boolean; status: number; data: T | null; rawText: string; error?: string }> {
  try {
    const rawText = await res.text();
    const contentType = res.headers.get('content-type') || '';

    if (!rawText || rawText.trim() === '') {
      return {
        ok: false,
        status: res.status,
        data: null,
        rawText: '',
        error: `सर्वर से खाली उत्तर प्राप्त हुआ (HTTP ${res.status})।`,
      };
    }

    // Check if the response is actually HTML (typical of static hosts like GitHub Pages or 404 fallback)
    if (contentType.includes('text/html') || rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
      return {
        ok: false,
        status: res.status,
        data: null,
        rawText,
        error: 'लाइव बैकएंड API उपलब्ध नहीं है (Static Host/HTML response)। कृपया Node.js/Express सर्वर या Environment Variables जांचें।',
      };
    }

    try {
      const data = JSON.parse(rawText) as T;
      return {
        ok: res.ok,
        status: res.status,
        data,
        rawText,
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        data: null,
        rawText,
        error: `अमान्य रिस्पांस फॉर्मेट (HTTP ${res.status})।`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: res.status,
      data: null,
      rawText: '',
      error: err.message || 'नेटवर्क रिस्पांस पढ़ने में त्रुटि।',
    };
  }
}

/**
 * Check backend server health
 */
export async function checkBackendHealth(): Promise<BackendHealthStatus> {
  try {
    const res = await fetch('/api/health', {
      headers: { 'Accept': 'application/json' },
    });
    const parsed = await parseJsonResponse<any>(res);
    if (parsed.ok && parsed.data?.status === 'ok') {
      return {
        isReachable: true,
        status: 'online',
        environment: parsed.data.environment,
        emailConfigured: parsed.data.emailService?.configured,
        senderEmail: parsed.data.emailService?.sender,
      };
    }
    return {
      isReachable: false,
      error: parsed.error || `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      isReachable: false,
      error: err.message || 'बैकएंड सर्वर से कनेक्शन नहीं हो सका।',
    };
  }
}

/**
 * Fetch Public Delivery OTP config
 */
export async function getDeliveryOtpPublicConfig(): Promise<DeliveryOtpPublicConfig> {
  try {
    const res = await fetch('/api/delivery/otp-config', {
      headers: { 'Accept': 'application/json' }
    });
    const parsed = await parseJsonResponse<DeliveryOtpPublicConfig>(res);
    if (parsed.ok && parsed.data) {
      return parsed.data;
    }
    return {
      enabled: true,
      isEmailConfigured: false,
      expiryMinutes: 15,
      resendCooldownSeconds: 60,
      showInAppOtpFallback: true,
    };
  } catch {
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
    const parsed = await parseJsonResponse<EmailOtpServerConfig & { appPasswordConfigured: boolean; appPasswordMasked: string }>(res);
    if (parsed.ok && parsed.data) {
      return parsed.data;
    }
    throw new Error(toSafeString(parsed.error, `सर्वर त्रुटि (${res.status})`));
  } catch (err: any) {
    console.error('getAdminOtpConfig error:', err);
    throw new Error(toSafeString(err?.message || err, 'कॉन्फ़िगरेशन लोड नहीं हो सका'));
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
    
    const parsed = await parseJsonResponse<any>(res);
    if (parsed.data) {
      return {
        success: Boolean(parsed.data.success),
        message: toSafeString(parsed.data.message, parsed.data.success ? 'ईमेल एवं OTP सेटिंग्स सफलतापूर्वक सहेजी गईं।' : undefined),
        error: !parsed.data.success ? toSafeString(parsed.data.error || parsed.data.message, 'सेटिंग्स सहेजने में विफल') : undefined,
        config: parsed.data.config,
      };
    }
    return {
      success: false,
      error: toSafeString(parsed.error, `सेटिंग्स सहेजने में विफल (HTTP ${res.status})`),
    };
  } catch (err: any) {
    console.error('saveAdminOtpConfig error:', err);
    return { success: false, error: toSafeString(err?.message || err, 'नेटवर्क त्रुटि: सेटिंग्स सेव नहीं हो सकीं।') };
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
    
    const parsed = await parseJsonResponse<any>(res);
    if (parsed.data) {
      return {
        success: Boolean(parsed.data.success),
        message: toSafeString(parsed.data.message, parsed.data.success ? 'टेस्ट ईमेल सफलतापूर्वक भेजा गया!' : undefined),
        error: !parsed.data.success ? toSafeString(parsed.data.error || parsed.data.message, 'टेस्ट ईमेल भेजने में विफल।') : undefined,
        testResult: parsed.data.testResult,
      };
    }
    return { 
      success: false, 
      error: toSafeString(parsed.error, `सर्वर रिस्पांस त्रुटि (HTTP ${res.status})`) 
    };
  } catch (err: any) {
    console.error('sendAdminTestEmail error:', err);
    return { success: false, error: toSafeString(err?.message || err, 'परीक्षण ईमेल भेजने में नेटवर्क समस्या आई।') };
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
    
    const parsed = await parseJsonResponse<SendOtpResult & { remainingSeconds?: number }>(res);
    if (parsed.data) {
      if (!parsed.ok || !parsed.data.success) {
        return {
          success: false,
          error: parsed.data.error || 'OTP भेजने में समस्या आई।',
          resendCooldownSeconds: parsed.data.remainingSeconds,
        };
      }
      return parsed.data;
    }
    return {
      success: false,
      error: parsed.error || 'सर्वर से अमान्य उत्तर प्राप्त हुआ।',
    };
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

    const parsed = await parseJsonResponse<VerifyOtpResult>(res);
    if (parsed.data) {
      if (!parsed.ok || !parsed.data.success) {
        return {
          success: false,
          error: parsed.data.error || 'OTP सत्यापन विफल रहा।',
          remainingAttempts: parsed.data.remainingAttempts,
        };
      }
      return parsed.data;
    }
    return {
      success: false,
      error: parsed.error || 'OTP सत्यापन में विफल।',
    };
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
    const parsed = await parseJsonResponse<{ success: boolean; inAppAvailable: boolean; otp?: string; expiresAt?: number }>(res);
    if (parsed.ok && parsed.data) {
      return parsed.data;
    }
    return { success: false, inAppAvailable: false };
  } catch {
    return { success: false, inAppAvailable: false };
  }
}
