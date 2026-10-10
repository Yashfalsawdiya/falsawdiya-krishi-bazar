const fs = require('fs');
const path = require('path');

const enPath = path.resolve(__dirname, '../locales/en.json');
const hiPath = path.resolve(__dirname, '../locales/hi.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));

const errors = [];

// Step 5 Bad English Patterns
const HINDI_IN_ROMAN_PATTERNS = [
  /\bis\./i,
  /\bgoes is\b/i,
  /\bhappens is\b/i,
  /\sdo\./i,
  /\sdo\)/i,
  /\bka\b/i,
  /\bke\b/i,
  /\bki\b/i,
  /\bhai\b/i,
  /\bkaren\b/i,
  /\bMajaboot\b/i,
  /\bNibhata\b/i,
  /\bSookshm\b/i,
  /\bGanna\b/i,
  /\bLagatar\b/i,
  /\bDalahan\b/i,
  /\bTilahan\b/i,
  /\bSeedhee\b/i
];

// Whitelist for Latin words in Hindi strings
const WHITELISTED_LATIN_WORDS = new Set([
  'APMC', 'Facebook', 'Instagram', 'WhatsApp', 'Google', 'Maps', 'AI', 'SMS',
  'PIN', 'OTP', 'GST', 'PDF', 'API', 'CIBRC', 'PM', 'KUSUM', 'SMAM', 'MSP',
  'PSS', 'CRI', 'JS', 'WG', 'EC', 'SC', 'SP', 'FS', 'NPK', 'DAP', 'MOP',
  'kg', 'g', 'ml', 'l', 'AM', 'PM', 'EN', 'PT', 'IST'
]);

function validatePair(enObj, hiObj, curPath = '') {
  for (const key of Object.keys(enObj)) {
    const fullPath = curPath ? `${curPath}.${key}` : key;
    if (!(key in hiObj)) {
      errors.push(`Missing key in hi.json: ${fullPath}`);
      continue;
    }

    const enVal = enObj[key];
    const hiVal = hiObj[key];

    if (typeof enVal === 'object' && enVal !== null) {
      if (typeof hiVal !== 'object' || hiVal === null) {
        errors.push(`Type mismatch at ${fullPath}: en is object, hi is not`);
      } else {
        validatePair(enVal, hiVal, fullPath);
      }
      continue;
    }

    const enStr = String(enVal).trim();
    const hiStr = String(hiVal).trim();

    // 1. Non-empty
    if (!enStr) errors.push(`Empty value in en.json at ${fullPath}`);
    if (!hiStr) errors.push(`Empty value in hi.json at ${fullPath}`);

    // 2. Key should not equal value
    if (enStr === key) errors.push(`EN value equals key at ${fullPath}`);

    // 3. Raw keys like "search_placeholder" should not be the output
    if (/^[a-z]+_[a-z_]+$/.test(enStr)) errors.push(`Raw key detected in en.json at ${fullPath}: "${enStr}"`);
    if (/^[a-z]+_[a-z_]+$/.test(hiStr)) errors.push(`Raw key detected in hi.json at ${fullPath}: "${hiStr}"`);

    // 4. No Devanagari in English
    if (/[\u0900-\u097F]/.test(enStr)) {
      errors.push(`Devanagari characters found in en.json at ${fullPath}: "${enStr}"`);
    }

    // 5. No Hindi-in-Roman bad translation patterns
    for (const pat of HINDI_IN_ROMAN_PATTERNS) {
      if (pat.test(enStr)) {
        errors.push(`Forbidden Hindi-in-Roman pattern (${pat}) at ${fullPath}: "${enStr}"`);
      }
    }

    // 6. No non-whitelisted Latin words in Hindi strings
    const latinWords = hiStr.match(/[a-zA-Z]+/g) || [];
    for (const word of latinWords) {
      if (!WHITELISTED_LATIN_WORDS.has(word)) {
        errors.push(`Non-whitelisted English word "${word}" in hi.json at ${fullPath}: "${hiStr}"`);
      }
    }
  }

  for (const key of Object.keys(hiObj)) {
    const fullPath = curPath ? `${curPath}.${key}` : key;
    if (!(key in enObj)) {
      errors.push(`Extraneous key in hi.json missing from en.json: ${fullPath}`);
    }
  }
}

validatePair(en, hi);

console.log('----------------------------------------------------');
console.log('Falsawdiya Krishi Bazaar i18n Validator Report');
console.log('----------------------------------------------------');
console.log(`Total Keys Validated: ${Object.keys(en).length} top-level sections`);
console.log(`Total Validation Errors: ${errors.length}`);

if (errors.length > 0) {
  console.error('\nFAIL: Validation failed with the following issues:');
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('\nPASS: All locales passed validation with zero errors!');
  process.exit(0);
}
