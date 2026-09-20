import { FooterConfig, FooterColumn, FooterTrustHighlight } from '../types';

export const DEFAULT_FOOTER_HIGHLIGHTS: FooterTrustHighlight[] = [
  {
    id: 'h-1',
    title: '100% असली व प्रमाणित',
    subtitle: 'सरकारी अनुज्ञा प्राप्त कृषि इनपुट्स',
    icon: 'shield'
  },
  {
    id: 'h-2',
    title: '5,000+ संतुष्ट किसान',
    subtitle: 'मध्य प्रदेश का विश्वसनीय कृषि केंद्र',
    icon: 'users'
  },
  {
    id: 'h-3',
    title: 'सुरक्षित डोरस्टेप डिलीवरी',
    subtitle: 'सीधे आपके खेत व घर तक पहुंच',
    icon: 'truck'
  },
  {
    id: 'h-4',
    title: '24x7 AI व विशेषज्ञ सहायता',
    subtitle: 'फसल रोग व दवा की सही जानकारी',
    icon: 'headphones'
  }
];

export const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    id: 'col-1',
    title: 'फल्सावदिया बाजार',
    links: [
      { id: 'c1-1', label: 'हमारे बारे में (About Us)', path: '/about' },
      { id: 'c1-2', label: 'संपर्क करें (Contact Us)', path: '/contact' },
      { id: 'c1-3', label: 'मेरा प्रोफाइल (Profile)', path: '/profile' },
      { id: 'c1-4', label: 'मेरे ऑर्डर (My Orders)', path: '/my-orders' },
      { id: 'c1-5', label: 'शॉपिंग कार्ट (Cart)', path: '/cart' },
      { id: 'c1-6', label: 'सभी उत्पाद (All Products)', path: '/products' },
    ]
  },
  {
    id: 'col-2',
    title: 'कृषि सेवाएं',
    links: [
      { id: 'c2-1', label: 'AI कृषि विशेषज्ञ कॉल', path: '/ai-call' },
      { id: 'c2-2', label: 'AI उत्पाद जानकारी', path: '/ai-product-knowledge' },
      { id: 'c2-3', label: 'मंडी भाव (Mandi Bhav)', path: '/mandi' },
      { id: 'c2-4', label: 'फसल बीमारी जाँच', path: '/disease' },
      { id: 'c2-5', label: 'कीट एवं रोग निर्देशिका', path: '/encyclopedia' },
      { id: 'c2-6', label: 'सरकारी योजनाएं', path: '/schemes' },
      { id: 'c2-7', label: 'मौसम पूर्वानुमान', path: '/weather' },
    ]
  },
  {
    id: 'col-3',
    title: 'टूल्स व सहायता',
    links: [
      { id: 'c3-1', label: 'कृषि कैलकुलेटर (Calculator)', path: '/calculator' },
      { id: 'c3-2', label: 'कृषि समाचार (Agri News)', path: '/news' },
      { id: 'c3-3', label: 'मिट्टी परीक्षण मार्गदर्शिका', path: '/soil-testing' },
      { id: 'c3-4', label: 'हेल्पलाइन डायरेक्टरी', path: '/helpline' },
      { id: 'c3-5', label: 'FAQ (सहायता व प्रश्नोत्तरी)', path: '/faq' },
      { id: 'c3-6', label: 'शिपिंग व डिलीवरी नीति', path: '/shipping-policy' },
    ]
  },
  {
    id: 'col-4',
    title: 'नीतियां व सुरक्षा',
    links: [
      { id: 'c4-1', label: 'वैधानिक लाइसेंस (DAESI)', path: '/licensing-disclaimer' },
      { id: 'c4-2', label: 'रासायनिक सुरक्षा (Chemical Safety)', path: '/safety-guidelines' },
      { id: 'c4-3', label: 'गोपनीयता नीति (Privacy Policy)', path: '/privacy' },
      { id: 'c4-4', label: 'नियम एवं शर्तें (Terms)', path: '/terms' },
      { id: 'c4-5', label: 'रिफंड एवं वापसी (Refund Policy)', path: '/refund-policy' },
      { id: 'c4-6', label: 'शिकायत अधिकारी (Grievance)', path: '/grievance' },
      { id: 'c4-7', label: 'कृषि एवं AI अस्वीकरण', path: '/disclaimer' },
    ]
  }
];

export const DEFAULT_PAYMENT_METHODS = ['UPI', 'PhonePe', 'GPay', 'Cards / NetBanking'];

export function getDefaultFooterConfig(defaults?: {
  brandName?: string;
  tagline?: string;
  phone?: string;
  address?: string;
  whatsappUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
}): Required<FooterConfig> {
  return {
    brandName: defaults?.brandName || 'फल्सावदिया कृषि बाजार',
    tagline: defaults?.tagline || 'किसान का भरोसा, हमारी पहचान',
    description: 'किसानों की समृद्धि और आधुनिक कृषि क्रांति का समर्पित डिजिटल मंच। उच्च गुणवत्ता वाले प्रमाणित कीटनाशक, जैविक खाद, उन्नत बीज एवं AI आधारित डिजिटल परामर्श सीधे किसानों तक।',
    helplineTitle: 'हेल्पलाइन व ऑर्डर सहायता',
    helphoneNumber: defaults?.phone || '8982338046',
    callButtonText: 'कॉल करें',
    address: defaults?.address || 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)',
    socialTitle: 'सोशल मीडिया व कम्युनिटी',
    whatsappUrl: defaults?.whatsappUrl || 'https://wa.me/918982338046?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार',
    facebookUrl: defaults?.facebookUrl || 'https://facebook.com',
    instagramUrl: defaults?.instagramUrl || 'https://instagram.com',
    youtubeUrl: defaults?.youtubeUrl || 'https://youtube.com',
    highlights: DEFAULT_FOOTER_HIGHLIGHTS,
    columns: DEFAULT_FOOTER_COLUMNS,
    copyrightText: 'सर्वाधिकार सुरक्षित। (All Rights Reserved)',
    bottomText: '',
    paymentLabel: '100% सुरक्षित ऑनलाइन भुगतान:',
    paymentMethods: DEFAULT_PAYMENT_METHODS
  };
}

export function mergeFooterConfig(
  saved?: Partial<FooterConfig> | null,
  defaults?: {
    brandName?: string;
    tagline?: string;
    phone?: string;
    address?: string;
    whatsappUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
  }
): Required<FooterConfig> {
  const def = getDefaultFooterConfig(defaults);
  if (!saved) return def;

  return {
    brandName: saved.brandName !== undefined && saved.brandName !== '' ? saved.brandName : def.brandName,
    tagline: saved.tagline !== undefined && saved.tagline !== '' ? saved.tagline : def.tagline,
    description: saved.description !== undefined && saved.description !== '' ? saved.description : def.description,
    helplineTitle: saved.helplineTitle !== undefined && saved.helplineTitle !== '' ? saved.helplineTitle : def.helplineTitle,
    helphoneNumber: saved.helphoneNumber !== undefined && saved.helphoneNumber !== '' ? saved.helphoneNumber : def.helphoneNumber,
    callButtonText: saved.callButtonText !== undefined && saved.callButtonText !== '' ? saved.callButtonText : def.callButtonText,
    address: saved.address !== undefined && saved.address !== '' ? saved.address : def.address,
    socialTitle: saved.socialTitle !== undefined && saved.socialTitle !== '' ? saved.socialTitle : def.socialTitle,
    whatsappUrl: saved.whatsappUrl !== undefined && saved.whatsappUrl !== '' ? saved.whatsappUrl : def.whatsappUrl,
    facebookUrl: saved.facebookUrl !== undefined && saved.facebookUrl !== '' ? saved.facebookUrl : def.facebookUrl,
    instagramUrl: saved.instagramUrl !== undefined && saved.instagramUrl !== '' ? saved.instagramUrl : def.instagramUrl,
    youtubeUrl: saved.youtubeUrl !== undefined && saved.youtubeUrl !== '' ? saved.youtubeUrl : def.youtubeUrl,
    highlights: saved.highlights && saved.highlights.length > 0 ? saved.highlights : def.highlights,
    columns: saved.columns && saved.columns.length > 0 ? saved.columns : def.columns,
    copyrightText: saved.copyrightText !== undefined && saved.copyrightText !== '' ? saved.copyrightText : def.copyrightText,
    bottomText: saved.bottomText !== undefined ? saved.bottomText : def.bottomText,
    paymentLabel: saved.paymentLabel !== undefined && saved.paymentLabel !== '' ? saved.paymentLabel : def.paymentLabel,
    paymentMethods: saved.paymentMethods && saved.paymentMethods.length > 0 ? saved.paymentMethods : def.paymentMethods
  };
}
