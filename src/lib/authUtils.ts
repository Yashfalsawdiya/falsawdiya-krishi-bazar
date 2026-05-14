/**
 * Utility to validate and secure authentication
 */

// List of common disposable and temporary email domains
const DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'yopmail.com',
  'temp-mail.org',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'dispostable.com',
  'getairmail.com',
  'mintemail.com',
  'jetable.org',
  'mailexpire.com',
  'trashmail.net',
  'temp-mail.net',
  'temp-mail.io',
  'dropmail.me',
  'moakt.com',
  'disposable.com',
  'fake-mail.com',
  'email-temp.com'
];

/**
 * Validates if an email is genuine and fits the stricter requirements:
 * 1. Must be a valid format
 * 2. Must be verified (should be handled by Google Auth but verified again here)
 * 3. Must be from @gmail.com domain (as requested by user)
 * 4. Must not be from a known disposable domain
 * 5. Strictly no plus addressing (e.g. user+123@gmail.com) to prevent bot accounts
 */
export const validateGmailAccount = (email: string | null, isEmailVerified: boolean): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: "ईमेल पता नहीं मिल सका।" };
  }

  if (!isEmailVerified) {
    return { isValid: false, error: "कृपया पहले अपना ईमेल गूगल से प्रमाणित (Verify) करें।" };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Strict Domain Check
  if (!normalizedEmail.endsWith('@gmail.com')) {
    return { isValid: false, error: "केवल वास्तविक @gmail.com अकाउंट ही स्वीकार्य हैं।" };
  }

  // 2. Disposable Domain Check (Double validation)
  const domain = normalizedEmail.split('@')[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { isValid: false, error: "Temporary या Disposable ईमेल स्वीकार्य नहीं हैं।" };
  }

  // 3. Plus Addressing Check (anti-spam / anti-bot)
  // Farmers/Botters often use user+1@gmail.com, user+2@gmail.com to create fake accounts
  if (normalizedEmail.includes('+')) {
    return { isValid: false, error: "Plus addressing (+) वाले ईमेल स्वीकार्य नहीं हैं।" };
  }

  // 4. Dot trick check? (Gmail ignores dots, but for AI Studio apps usually dots are treated as different emails)
  // We'll leave dots for now as some genuine users have dots in their names.

  return { isValid: true };
};
