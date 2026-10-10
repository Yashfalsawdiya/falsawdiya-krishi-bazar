import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import hiTranslations from '../locales/hi.json';
import enTranslations from '../locales/en.json';

export type LanguageCode = 'hi';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  shortLabel: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', shortLabel: 'हि' }
];

export const STORAGE_KEY = 'falsawdiya_app_lang';

export const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, 'hi');
    } catch {
      // Ignore
    }
  }
  return 'hi';
};

const initialLang = 'hi';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      hi: { translation: hiTranslations },
      en: { translation: enTranslations }
    },
    lng: initialLang,
    fallbackLng: 'hi',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    },
    returnObjects: false
  });

if (typeof document !== 'undefined') {
  document.documentElement.lang = 'hi';
}

export default i18n;
