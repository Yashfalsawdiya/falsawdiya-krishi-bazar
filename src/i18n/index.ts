import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en.json';
import hiTranslations from '../locales/hi.json';

export type LanguageCode = 'hi' | 'en';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  shortLabel: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', shortLabel: 'हि' },
  { code: 'en', name: 'English', nativeName: 'English', shortLabel: 'EN' }
];

export const STORAGE_KEY = 'falsawdiya_app_lang';

export const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
        return stored;
      }
    } catch {
      // Ignore storage access error
    }
  }
  return 'hi';
};

const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations }
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    },
    saveMissing: true,
    missingKeyHandler: (lngs, _ns, key) => {
      // Log missing key warning in development, never show raw keys
      if (typeof window !== 'undefined' && (window as any).__DEV_I18N_LOG__) {
        console.warn(`[i18n missing key]: "${key}" for lngs:`, lngs);
      }
    }
  });

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, lng);
    } catch {
      // Ignore
    }
  }
});

export default i18n;
