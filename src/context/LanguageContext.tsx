import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import i18n, { 
  STORAGE_KEY,
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

const KNOWN_HINDI_MAP: Record<string, string> = {
  // Navigation & Header
  'nav_home': 'होम',
  'nav.home': 'होम',
  'bottom_home': 'होम',
  'nav_products': 'उत्पाद / बाजार',
  'nav.market': 'बाजार',
  'bottom_market': 'बाजार',
  'nav_ai_call': 'AI वॉइस कॉल',
  'nav_disease': 'रोग पहचान',
  'nav.crop_scan': 'रोग पहचान',
  'bottom_disease': 'रोग पहचान',
  'nav_mandi': 'मंडी भाव',
  'nav_news': 'कृषि समाचार',
  'nav.agri_news': 'कृषि समाचार',
  'bottom_news': 'कृषि समाचार',
  'nav_weather': 'मौसम',
  'nav.weather': 'मौसम',
  'bottom_weather': 'मौसम',
  'nav_schemes': 'सरकारी योजनाएं',
  'nav_calculator': 'Agri Calculator',

  // Actions & Buttons
  'profile': 'प्रोफाइल',
  'cart': 'कार्ट',
  'search_button': 'खोजें',
  'search_placeholder': 'उत्पाद खोजें (दवा, खाद, बीज)...',
  'helpline': 'हेल्पलाइन',
  'helpline_call': 'हेल्पलाइन पर कॉल करें',
  'my_orders': 'ऑर्डर',
  'admin': 'एडमिन',
  'admin_panel': 'एडमिन पैनल',
  'loading': 'लोड हो रहा है...',
  'brand_tagline': 'किसान का भरोसा, हमारी पहचान',

  // Menu items
  'menu_my_profile': 'मेरी प्रोफाइल',
  'menu_about_us': 'हमारे बारे में',
  'menu_ai_call': 'AI वॉइस कॉल',
  'menu_ai_knowledge': 'AI उत्पाद ज्ञान',
  'menu_mandi': 'मंडी भाव',
  'menu_encyclopedia': 'रोग व कीट ज्ञानकोष',
  'menu_schemes': 'सरकारी योजनाएं',
  'menu_calculator': 'Agri Calculator',
  'menu_helpline': 'किसान हेल्पलाइन',
  'menu_licensing': 'लाइसेंस एवं प्रमाणीकरण',
  'menu_faq': 'अक्सर पूछे जाने वाले प्रश्न',
  'menu_shipping': 'डिलीवरी एवं शिपिंग नीति',
  'menu_privacy': 'गोपनीयता नीति',
  'menu_terms': 'नियम एवं शर्तें',
  'menu_refund': 'रिफंड एवं वापसी नीति',
  'menu_disclaimer': 'अस्वीकरण',
  'menu_safety': 'सुरक्षा दिशानिर्देश',
  'menu_grievance': 'शिकायत निवारण',
  'menu_contact': 'संपर्क करें',
  'menu_policies_heading': 'नीतियां एवं कानूनी दस्तावेज',
  'menu_all_services': 'सभी सेवाएं'
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const language: LanguageCode = 'hi';

  const setLanguage = useCallback((_lang: LanguageCode) => {
    // Permanent Hindi lock
  }, []);

  const toggleLanguage = useCallback(() => {
    // Permanent Hindi lock
  }, []);

  // Standard dictionary translation by key - 100% resilient
  const t = useCallback((key: string, fallback?: string): string => {
    if (!key) return fallback || '';

    // 1. Direct hit in verified Hindi map
    if (KNOWN_HINDI_MAP[key]) {
      return KNOWN_HINDI_MAP[key];
    }

    // 2. Direct lookup in i18next
    try {
      if (i18n.exists(key)) {
        const val = i18n.t(key);
        if (typeof val === 'string' && !val.startsWith("key '") && !val.includes('returned an object')) {
          return val;
        }
      }

      // Try namespace prefix
      const prefixes = ['common', 'header', 'nav', 'home', 'market', 'cropScan', 'agriNews', 'weather', 'product', 'cart', 'profile'];
      for (const prefix of prefixes) {
        const fullKey = `${prefix}.${key}`;
        if (i18n.exists(fullKey)) {
          const val = i18n.t(fullKey);
          if (typeof val === 'string' && !val.startsWith("key '") && !val.includes('returned an object')) {
            return val;
          }
        }
      }
    } catch {
      // Ignore lookup error
    }

    // 3. Fallback if provided and not generic English key
    if (fallback !== undefined) {
      return fallback;
    }

    // 4. Return human-readable label if unknown
    return key;
  }, []);

  // Localized field retriever for dynamic database content
  const translateText = useCallback((field: any): string => {
    if (!field) return '';
    return getLocalized(field, 'hi');
  }, []);

  const hindiOption: LanguageOption = {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिंदी',
    shortLabel: 'हि'
  };

  const value: LanguageContextType = {
    language: 'hi',
    setLanguage,
    toggleLanguage,
    t,
    translateText,
    isHindi: true,
    isEnglish: false,
    languages: [hindiOption],
    currentLanguageOption: hindiOption,
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
