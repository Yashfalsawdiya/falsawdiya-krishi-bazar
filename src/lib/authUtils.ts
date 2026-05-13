/**
 * Utility to validate if an email is a legitimate Gmail account and not a temporary/disposable one.
 */

// List of known disposable/temp mail domains
const DISPOSABLE_DOMAINS = [
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'dispostable.com',
  'getairmail.com',
  'mail.tm',
  'tempmail.plus',
  'internxt.com',
  'tempmailo.com',
  'yopmail.com'
];

export const isSecureGmailAccount = (email: string | null): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'ईमेल नहीं मिला।' };
  }

  const emailLower = email.toLowerCase();
  const domain = emailLower.split('@')[1];

  // 1. Strict Gmail Check (User requested ONLY real Gmail accounts)
  if (!emailLower.endsWith('@gmail.com')) {
    return { 
      isValid: false, 
      error: 'केवल वास्तविक @gmail.com अकाउंट ही मान्य हैं। कृपया अपनी असली Gmail ID का उपयोग करें।' 
    };
  }

  // 2. Extra check for subdomains or suspicious patterns within gmail
  if (domain !== 'gmail.com') {
    return {
      isValid: false,
      error: 'अमान्य ईमेल डोमेन। कृपया वास्तविक Gmail अकाउंट का उपयोग करें।'
    };
  }

  // 3. Disposable Domain Check (Just in case some service tries to spoof)
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return {
      isValid: false,
      error: 'Temporary या Fake ईमेल ब्लॉक कर दिए गए हैं। कृपया अपनी स्थायी Gmail ID का उपयोग करें।'
    };
  }

  // 4. Suspicious login patterns (e.g. very long local parts with too many dots - common for fake accounts)
  const localPart = emailLower.split('@')[0];
  if (localPart.length > 50 || (localPart.match(/\./g) || []).length > 5) {
    return {
      isValid: false,
      error: 'आपका ईमेल संदेहास्पद लग रहा है। कृपया एक सामान्य Gmail ID का उपयोग करें।'
    };
  }

  return { isValid: true };
};
