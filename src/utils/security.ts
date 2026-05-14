/**
 * Security utility for filtering and validating login emails.
 */

// Comprehensive list of common disposable/temporary email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  'temp-mail.org', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
  'dispostable.com', 'getnada.com', 'tempmail.com', 'throwawaymail.com',
  'sharklasers.com', 'temp-mail.io', 'yopmail.com', 'dropmail.me',
  'moakt.com', 'maildrop.cc', 'emailfake.com', 'temp-mail-alt.org',
  'crazymailing.com', 'mail-temp.com', 'mytemp.email', 'tempinbox.com'
];

/**
 * Validates if an email is a legitimate Gmail account and not a disposable one.
 * @param email The email address to validate
 * @returns { isValid: boolean, reason?: string } Result of the validation
 */
export const validateLoginEmail = (email: string | null): { isValid: boolean; reason?: string } => {
  if (!email) {
    return { isValid: false, reason: 'ईमेल पता नहीं मिला।' };
  }

  const normalizedEmail = email.toLowerCase().trim();
  
  // 1. Strict Domain Check - Only allow gmail.com
  // Note: While some organizations use Google Workspace with custom domains,
  // the user specifically requested "Google Gmail Accounts".
  if (!normalizedEmail.endsWith('@gmail.com')) {
    return { 
      isValid: false, 
      reason: 'कृपया केवल अपने व्यक्तिगत Gmail अकाउंट (@gmail.com) का उपयोग करें।' 
    };
  }

  // 2. Disposable Email Domain Check
  const domain = normalizedEmail.split('@')[1];
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { 
      isValid: false, 
      reason: 'अनधिकृत ईमेल सेवा (Disposable Email) का पता चला। कृपया असली Gmail अकाउंट का उपयोग करें।' 
    };
  }

  // 3. Fake/Suspicious pattern check (basic)
  // Check for suspicious numeric strings or random character combinations if needed
  // But gmail.com domain check is usually enough as Google verifies them.

  return { isValid: true };
};
