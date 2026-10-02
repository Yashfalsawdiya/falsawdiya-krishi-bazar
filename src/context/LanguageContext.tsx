import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import i18n, { 
  SUPPORTED_LANGUAGES, 
  SupportedLanguage, 
  STORAGE_KEY,
  getInitialLanguage,
  LanguageCode
} from '../i18n';
import { getLocalized } from '../utils/localizedHelper';

export { type LanguageCode };

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  shortLabel: string;
}

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  translateText: (field: any) => string;
  isHindi: boolean;
  isEnglish: boolean;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;
  i18nInstance: typeof i18n;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    return (getInitialLanguage() as LanguageCode) || 'hi';
  });

  // Sync with document element and i18next
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      localStorage.setItem(STORAGE_KEY, language);
    } catch (e) {
      console.warn('Unable to persist language preference', e);
    }

    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // Listen to external i18n language change events
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const code = (lng === 'en' ? 'en' : 'hi') as LanguageCode;
      if (code !== language) {
        setLanguageState(code);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => {
      const next: LanguageCode = prev === 'hi' ? 'en' : 'hi';
      i18n.changeLanguage(next);
      return next;
    });
  }, []);

  // Standard dictionary translation by key
  const t = useCallback((key: string, fallback?: string): string => {
    if (!key) return fallback || '';

    // Direct lookup in i18next
    if (i18n.exists(key)) {
      return i18n.t(key);
    }

    // Try common namespace prefix if not prefixed
    const prefixes = ['common', 'header', 'nav', 'home', 'market', 'cropScan', 'agriNews', 'weather', 'product', 'cart', 'profile'];
    for (const prefix of prefixes) {
      const fullKey = `${prefix}.${key}`;
      if (i18n.exists(fullKey)) {
        return i18n.t(fullKey);
      }
    }

    // If fallback is provided, return it
    if (fallback !== undefined) {
      return fallback;
    }

    // Never return raw key with underscores to users; return clean human text or fallback
    return key;
  }, []);

  // Universal localized field retriever for dynamic database content (products, categories, banners, etc.)
  const translateText = useCallback((field: any): string => {
    if (!field) return '';
    return getLocalized(field, language);
  }, [language]);

  const mappedLanguages: LanguageOption[] = SUPPORTED_LANGUAGES.map((l: SupportedLanguage) => ({
    code: l.code as LanguageCode,
    label: l.name,
    nativeLabel: l.nativeName,
    shortLabel: l.shortLabel
  }));

  const currentLanguageOption = mappedLanguages.find(l => l.code === language) || mappedLanguages[0];

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    translateText,
    isHindi: language === 'hi',
    isEnglish: language === 'en',
    languages: mappedLanguages,
    currentLanguageOption,
    i18nInstance: i18n
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
