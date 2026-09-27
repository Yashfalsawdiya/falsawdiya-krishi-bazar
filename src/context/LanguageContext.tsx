import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  LanguageCode, 
  LanguageOption, 
  SUPPORTED_LANGUAGES, 
  TRANSLATIONS, 
  PHRASE_MAP 
} from '../i18n/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  translateText: (text: string) => string;
  isHindi: boolean;
  isEnglish: boolean;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'falsawdiya_app_lang';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'hi') {
        return stored;
      }
    } catch {
      // Ignore localStorage access errors
    }
    return 'hi'; // Default Hindi
  });

  // Sync with document element for accessibility and CSS if needed
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      localStorage.setItem(STORAGE_KEY, language);
    } catch (e) {
      console.warn('Unable to persist language preference', e);
    }
  }, [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => (prev === 'hi' ? 'en' : 'hi'));
  }, []);

  // Standard dictionary translation by key
  const t = useCallback((key: string, fallback?: string): string => {
    const entry = TRANSLATIONS[key];
    if (entry) {
      return entry[language] || entry.hi || fallback || key;
    }
    return fallback || key;
  }, [language]);

  // Universal phrase translator for dynamic text (categories, units, statuses, etc.)
  const translateText = useCallback((text: string): string => {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();

    // If English is selected
    if (language === 'en') {
      // 1. Direct phrase map match
      if (PHRASE_MAP[trimmed]) {
        return PHRASE_MAP[trimmed];
      }
      // 2. Check if text matches any Hindi value in TRANSLATIONS
      for (const item of Object.values(TRANSLATIONS)) {
        if (item.hi === trimmed) {
          return item.en;
        }
      }
    } else {
      // If Hindi is selected
      if (PHRASE_MAP[trimmed]) {
        return PHRASE_MAP[trimmed];
      }
      for (const item of Object.values(TRANSLATIONS)) {
        if (item.en === trimmed) {
          return item.hi;
        }
      }
    }

    return text;
  }, [language]);

  const currentLanguageOption = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    translateText,
    isHindi: language === 'hi',
    isEnglish: language === 'en',
    languages: SUPPORTED_LANGUAGES,
    currentLanguageOption
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
