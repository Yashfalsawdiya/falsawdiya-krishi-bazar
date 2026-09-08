import { useState, useEffect } from 'react';
import { DeviceType, DeviceBanner, DeviceBannersMap } from '../types';
import { AppContent } from '../context/AppContext';

export const DEFAULT_MOBILE_BANNERS: DeviceBanner[] = [
  {
    id: 'mob-1',
    deviceType: 'mobile',
    image: '',
    title: 'खाद और बीज पर भारी छूट!',
    subtitle: 'सीमित समय के लिए ऑफर',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mob-2',
    deviceType: 'mobile',
    image: '',
    title: 'नई किस्म के सोयाबीन बीज',
    subtitle: 'अधिक पैदावार की गारंटी',
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mob-3',
    deviceType: 'mobile',
    image: '',
    title: 'फसल सुरक्षा समाधान',
    subtitle: 'बेहतरीन कीटनाशक उपलब्ध',
    displayOrder: 3,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_TABLET_BANNERS: DeviceBanner[] = [
  {
    id: 'tab-1',
    deviceType: 'tablet',
    image: '',
    title: 'आपकी खेती, हमारी जिम्मेदारी',
    subtitle: 'टैबलेट दृश्य — भरोसेमंद कृषि उत्पाद व विशेषज्ञ मार्गदर्शन',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'tab-2',
    deviceType: 'tablet',
    image: '',
    title: 'विश्वसनीय कृषि समाधान व लाइव मंडी भाव',
    subtitle: 'समय पर सही निर्णय, हर किसान के साथ',
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_LAPTOP_BANNERS: DeviceBanner[] = [
  {
    id: 'lap-1',
    deviceType: 'laptop',
    image: '',
    title: 'आपकी खेती, हमारी जिम्मेदारी — फल्सावदिया कृषि बाजार',
    subtitle: 'लैपटॉप दृश्य — प्रमाणित खाद, बीज एवं फसल सुरक्षा समाधान शानदार कीमतों पर',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'lap-2',
    deviceType: 'laptop',
    image: '',
    title: 'सशक्त किसान, समृद्ध भारत — भरोसेमंद ब्रांड्स',
    subtitle: 'उन्नत कृषि उत्पाद, तेज व सुरक्षित डिलीवरी सीधे आपके द्वार',
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_DESKTOP_BANNERS: DeviceBanner[] = [
  {
    id: 'desk-1',
    deviceType: 'desktop',
    image: '',
    title: 'फल्सावदिया कृषि बाजार — किसानों का सच्चा साथी',
    subtitle: 'डेस्कटॉप दृश्य — आपकी खेती के लिए सभी आवश्यक कृषि उत्पाद एक ही स्थान पर',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'desk-2',
    deviceType: 'desktop',
    image: '',
    title: 'बेहतर पैदावार का संकल्प — सशक्त किसान, समृद्ध भारत',
    subtitle: 'विशाल रेंज, उचित मूल्य और विशेषज्ञ परामर्श के साथ आज ही ऑर्डर करें',
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export interface ExactDimensionPreset {
  dimensions: string; // e.g. "1920 × 720 px"
  label: string; // e.g. "मानक (Standard / Best)"
  isPrimary?: boolean;
}

export interface DeviceMetadataItem {
  id: DeviceType;
  label: string;
  hindiLabel: string;
  iconText: string;
  recommendedResolution: string;
  exactResolutions: ExactDimensionPreset[];
  aspectRatioLabel: string;
  aspectRatioFormula: string;
  aspectRatioValue: number;
  containerAspectClass: string;
  homeAspectClass: string;
  previewAspectClass: string;
  description: string;
  minWidth: number;
  maxWidth?: number;
  screenTargetText: string;
}

export const DEVICE_METADATA: Record<DeviceType, DeviceMetadataItem> = {
  mobile: {
    id: 'mobile',
    label: 'Mobile',
    hindiLabel: 'मोबाइल',
    iconText: '📱',
    recommendedResolution: '1080 × 810 px (4:3) या 1200 × 900 px',
    exactResolutions: [
      { dimensions: '1080 × 810 px', label: 'मानक Full HD मोबाइल (सर्वश्रेष्ठ)', isPrimary: true },
      { dimensions: '1200 × 900 px', label: 'अल्ट्रा HD मोबाइल' },
      { dimensions: '800 × 600 px', label: 'हल्का व तीव्र लोडिंग' },
    ],
    aspectRatioLabel: '4:3 (1.33:1)',
    aspectRatioFormula: '4:3 (1.33:1)',
    aspectRatioValue: 4 / 3,
    containerAspectClass: 'w-full aspect-[4/3]',
    homeAspectClass: 'aspect-[4/3]',
    previewAspectClass: 'aspect-[4/3] max-w-[320px] mx-auto',
    description: 'स्मार्टफोन और छोटी स्क्रीन (768px से कम) के लिए। 4:3 अनुपात में मोबाइल स्क्रीन पर फोटो व टेक्स्ट बिना किसी कटिंग के बिल्कुल स्पष्ट दिखते हैं।',
    minWidth: 0,
    maxWidth: 767,
    screenTargetText: '768px से कम स्मार्टफोन',
  },
  tablet: {
    id: 'tablet',
    label: 'Tablet',
    hindiLabel: 'टैबलेट',
    iconText: '📲',
    recommendedResolution: '1600 × 900 px या 1280 × 720 px (16:9)',
    exactResolutions: [
      { dimensions: '1600 × 900 px', label: 'हाई-रेज़ोल्यूशन टैबलेट (iPad)', isPrimary: true },
      { dimensions: '1280 × 720 px', label: 'मानक HD टैबलेट' },
      { dimensions: '1024 × 576 px', label: 'कॉम्पैक्ट टैबलेट' },
    ],
    aspectRatioLabel: '16:9 (1.78:1)',
    aspectRatioFormula: '16:9 (1.78:1)',
    aspectRatioValue: 16 / 9,
    containerAspectClass: 'w-full aspect-[16/9]',
    homeAspectClass: 'aspect-[16/9]',
    previewAspectClass: 'aspect-[16/9]',
    description: 'आईपैड और टैबलेट स्क्रीन (768px से 1023px) के लिए। 16:9 लैंडस्केप बैनर जो होम पेज पर पूर्ण चौड़ाई में बिना कटे सटीक बैठता है।',
    minWidth: 768,
    maxWidth: 1023,
    screenTargetText: '768px से 1023px टैबलेट स्क्रीन',
  },
  laptop: {
    id: 'laptop',
    label: 'Laptop',
    hindiLabel: 'लैपटॉप',
    iconText: '💻',
    recommendedResolution: '1920 × 820 px या 1600 × 685 px (21:9)',
    exactResolutions: [
      { dimensions: '1920 × 820 px', label: 'मानक फुल HD लैपटॉप (21:9)', isPrimary: true },
      { dimensions: '1600 × 685 px', label: '14-15 इंच मीडियम लैपटॉप' },
      { dimensions: '1440 × 616 px', label: 'कॉम्पैक्ट लैपटॉप स्क्रीन' },
    ],
    aspectRatioLabel: '21:9 (2.33:1)',
    aspectRatioFormula: '21:9 (7:3 = 2.33:1)',
    aspectRatioValue: 21 / 9,
    containerAspectClass: 'w-full aspect-[21/9]',
    homeAspectClass: 'aspect-[21/9]',
    previewAspectClass: 'aspect-[21/9]',
    description: 'लैपटॉप और मीडियम मॉनिटर (1024px से 1439px) के लिए। विस्तृत 21:9 वाइड-स्क्रीन बैनर जो होम पेज पर बिना किसी कटिंग के रेंडर होता है।',
    minWidth: 1024,
    maxWidth: 1439,
    screenTargetText: '1024px से 1439px लैपटॉप स्क्रीन',
  },
  desktop: {
    id: 'desktop',
    label: 'Desktop',
    hindiLabel: 'डेस्कटॉप / कंप्यूटर',
    iconText: '🖥️',
    recommendedResolution: '1920 × 720 px या 2400 × 900 px (24:9 / 8:3)',
    exactResolutions: [
      { dimensions: '1920 × 720 px', label: 'मानक वेब कंप्यूटर (24:9 / सर्वश्रेष्ठ)', isPrimary: true },
      { dimensions: '2400 × 900 px', label: 'हाई-डेफिनिशन Widescreen (HD)' },
      { dimensions: '2560 × 960 px', label: 'अल्ट्रा-वाइड 2K मॉनिटर' },
    ],
    aspectRatioLabel: '24:9 (8:3 / 2.67:1)',
    aspectRatioFormula: '24:9 (8:3 = 2.67:1)',
    aspectRatioValue: 8 / 3,
    containerAspectClass: 'w-full aspect-[24/9]',
    homeAspectClass: 'aspect-[24/9]',
    previewAspectClass: 'aspect-[24/9]',
    description: 'बड़े मॉनिटर और कंप्यूटर स्क्रीन (1440px या अधिक) के लिए। अल्ट्रा-वाइड पैनोरमा बैनर जो होम पेज पर 24:9 अनुपात में पूर्ण दिखता है।',
    minWidth: 1440,
    screenTargetText: '1440px से बड़े मॉनिटर स्क्रीन',
  },
};

export const ORDERED_DEVICE_TYPES: DeviceType[] = ['mobile', 'tablet', 'laptop', 'desktop'];

export function getDeviceCategory(width: number): DeviceType {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'laptop';
  return 'desktop';
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window === 'undefined') return 'mobile';
    return getDeviceCategory(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const current = getDeviceCategory(window.innerWidth);
      setDeviceType(prev => (prev !== current ? current : prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceType;
}

/**
 * Normalizes appContent to ensure all device categories have their banner collections.
 * Preserves existing mobile banners from appContent.banners or appContent.deviceBanners.mobile.
 */
export function normalizeDeviceBanners(content?: Partial<AppContent> | null): DeviceBannersMap {
  // 1. Mobile: Prioritize deviceBanners.mobile, else fallback to existing content.banners, else DEFAULT_MOBILE_BANNERS
  let mobileList: DeviceBanner[] = [];
  if (content?.deviceBanners?.mobile && Array.isArray(content.deviceBanners.mobile) && content.deviceBanners.mobile.length > 0) {
    mobileList = content.deviceBanners.mobile;
  } else if (content?.banners && Array.isArray(content.banners) && content.banners.length > 0) {
    mobileList = content.banners.map((b, idx) => ({
      id: b.id ? String(b.id) : `mob-${idx + 1}`,
      deviceType: 'mobile' as const,
      image: b.image || '',
      title: b.title || '',
      subtitle: b.subtitle || '',
      displayOrder: idx + 1,
      isActive: true,
      createdAt: new Date().toISOString()
    }));
  } else {
    mobileList = DEFAULT_MOBILE_BANNERS;
  }

  // 2. Tablet
  const tabletList: DeviceBanner[] = (content?.deviceBanners?.tablet && Array.isArray(content.deviceBanners.tablet) && content.deviceBanners.tablet.length > 0)
    ? content.deviceBanners.tablet
    : DEFAULT_TABLET_BANNERS;

  // 3. Laptop
  const laptopList: DeviceBanner[] = (content?.deviceBanners?.laptop && Array.isArray(content.deviceBanners.laptop) && content.deviceBanners.laptop.length > 0)
    ? content.deviceBanners.laptop
    : DEFAULT_LAPTOP_BANNERS;

  // 4. Desktop
  const desktopList: DeviceBanner[] = (content?.deviceBanners?.desktop && Array.isArray(content.deviceBanners.desktop) && content.deviceBanners.desktop.length > 0)
    ? content.deviceBanners.desktop
    : DEFAULT_DESKTOP_BANNERS;

  const sortBanners = (list: DeviceBanner[]) => 
    [...list].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return {
    mobile: sortBanners(mobileList),
    tablet: sortBanners(tabletList),
    laptop: sortBanners(laptopList),
    desktop: sortBanners(desktopList),
  };
}

/**
 * Returns active banners for a specific device.
 * Falls back safely if none configured or active.
 */
export function getActiveBannersForDevice(
  bannersMap: DeviceBannersMap, 
  device: DeviceType
): DeviceBanner[] {
  const specificList = bannersMap[device] || [];
  const activeList = specificList.filter(b => b.isActive !== false);

  if (activeList.length > 0) {
    return activeList;
  }

  // If specific list has banners but none active, return all from specific list
  if (specificList.length > 0) {
    return specificList;
  }

  // Fallback safety (never show empty space):
  // Return default for that device
  switch (device) {
    case 'tablet': return DEFAULT_TABLET_BANNERS;
    case 'laptop': return DEFAULT_LAPTOP_BANNERS;
    case 'desktop': return DEFAULT_DESKTOP_BANNERS;
    case 'mobile':
    default:
      return bannersMap.mobile.length > 0 ? bannersMap.mobile : DEFAULT_MOBILE_BANNERS;
  }
}
