import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { 
  LanguageCode, 
  LanguageOption, 
  SUPPORTED_LANGUAGES, 
  TRANSLATIONS 
} from '../i18n/translations';
import { inAppTranslate, translateDomTree } from '../i18n/engine';

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

  const observerRef = useRef<MutationObserver | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Sync DOM with In-App Translation Engine (Universal DOM Synchronizer)
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      localStorage.setItem(STORAGE_KEY, language);
    } catch (e) {
      console.warn('Unable to persist language preference', e);
    }

    // Immediately translate the existing DOM
    if (typeof document !== 'undefined' && document.body) {
      translateDomTree(document.body, language);
    }

    // Disconnect any previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // When language is English, observe dynamic DOM changes (e.g. data loaded from IndexedDB, modals opening)
    if (language === 'en' && typeof MutationObserver !== 'undefined' && document.body) {
      const observer = new MutationObserver(() => {
        if (debounceTimerRef.current) {
          cancelAnimationFrame(debounceTimerRef.current);
        }
        debounceTimerRef.current = requestAnimationFrame(() => {
          translateDomTree(document.body, 'en');
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (debounceTimerRef.current) {
        cancelAnimationFrame(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => (prev === 'hi' ? 'en' : 'hi'));
  }, []);

  // Standard dictionary translation by key with smart in-app fallback
  const t = useCallback((key: string, fallback?: string): string => {
    const entry = TRANSLATIONS[key];
    if (entry) {
      return entry[language] || entry.hi || fallback || key;
    }
    // If not found in primary dictionary, translate via inAppTranslate
    return inAppTranslate(fallback || key, language);
  }, [language]);

  // Universal phrase and text translator for dynamic texts (categories, units, statuses, product names, news, etc.)
  const translateText = useCallback((text: string): string => {
    if (!text || typeof text !== 'string') return text;
    return inAppTranslate(text, language);
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
