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

export interface DeviceMetadataItem {
  id: DeviceType;
  label: string;
  hindiLabel: string;
  iconText: string;
  recommendedResolution: string;
  aspectRatioLabel: string;
  containerAspectClass: string;
  description: string;
  minWidth: number;
  maxWidth?: number;
}

export const DEVICE_METADATA: Record<DeviceType, DeviceMetadataItem> = {
  mobile: {
    id: 'mobile',
    label: 'Mobile',
    hindiLabel: 'मोबाइल',
    iconText: '📱',
    recommendedResolution: '1080 × 864 px (5:4) या 1080 × 1080 px (1:1)',
    aspectRatioLabel: '5:4 / 4:3',
    containerAspectClass: 'aspect-[5/4] sm:aspect-[4/3] max-h-[360px]',
    description: 'स्मार्टफोन और छोटी स्क्रीन (768px से कम) के लिए। पोर्ट्रेट या स्क्वायर बैनर जो फोन में बिना कटिंग के शानदार दिखे।',
    minWidth: 0,
    maxWidth: 767,
  },
  tablet: {
    id: 'tablet',
    label: 'Tablet',
    hindiLabel: 'टैबलेट',
    iconText: '📲',
    recommendedResolution: '1600 × 900 px या 1280 × 800 px (16:9 / 16:10)',
    aspectRatioLabel: '16:9 / 16:10',
    containerAspectClass: 'aspect-[16/9] md:max-h-[380px]',
    description: 'आईपैड और टैबलेट स्क्रीन (768px से 1023px) के लिए। चौड़ा लैंडस्केप बैनर जो दोनों तरफ से सुरक्षित हो।',
    minWidth: 768,
    maxWidth: 1023,
  },
  laptop: {
    id: 'laptop',
    label: 'Laptop',
    hindiLabel: 'लैपटॉप',
    iconText: '💻',
    recommendedResolution: '1920 × 700 px या 1600 × 600 px (21:9 / 16:7)',
    aspectRatioLabel: '21:9 / 16:7',
    containerAspectClass: 'aspect-[21/9] max-h-[380px]',
    description: 'लैपटॉप और मीडियम मॉनिटर स्क्रीन (1024px से 1439px) के लिए। विस्तृत वाइड-स्क्रीन बैनर।',
    minWidth: 1024,
    maxWidth: 1439,
  },
  desktop: {
    id: 'desktop',
    label: 'Desktop',
    hindiLabel: 'डेस्कटॉप / कंप्यूटर',
    iconText: '🖥️',
    recommendedResolution: '2560 × 800 px या 1920 × 640 px (24:9 / 3:1)',
    aspectRatioLabel: '24:9 / 3:1',
    containerAspectClass: 'aspect-[24/9] max-h-[420px]',
    description: 'बड़े मॉनिटर और वाइड कंप्यूटर स्क्रीन (1440px या अधिक) के लिए। अल्ट्रा-वाइड पैनोरमा बैनर।',
    minWidth: 1440,
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
