import { 
  Sparkles, Phone, Camera, TrendingUp, CloudSun, 
  Landmark, Newspaper, Calculator, TestTube2, 
  Bug, PhoneCall, HelpCircle, LucideIcon 
} from 'lucide-react';

export interface AppFeature {
  id: string;
  name: string;
  englishName: string;
  description: string;
  route: string;
  category: 'ai' | 'service' | 'utility';
  icon: LucideIcon;
  defaultEnabled: boolean;
}

export const APP_FEATURES: AppFeature[] = [
  {
    id: 'ai_product_knowledge',
    name: 'AI उत्पाद जानकारी',
    englishName: 'AI Product Knowledge',
    description: 'दवाई, खाद या टेक्निकल का सही प्रति एकड़ डोज़ और उपयोग विधि',
    route: '/ai-product-knowledge',
    category: 'ai',
    icon: Sparkles,
    defaultEnabled: true,
  },
  {
    id: 'ai_call',
    name: 'AI कृषि विशेषज्ञ वॉइस कॉल',
    englishName: 'AI Voice Expert Call',
    description: 'किसानों के साथ रियल-टाइम वॉइस कॉल पर आधुनिक कृषि सलाह',
    route: '/ai-call',
    category: 'ai',
    icon: Phone,
    defaultEnabled: true,
  },
  {
    id: 'disease',
    name: 'फसल बीमारी जाँच (Disease Scan)',
    englishName: 'Crop Disease Scan',
    description: 'पत्ती या पौधे की फोटो से बीमारी की पहचान व समाधान',
    route: '/disease',
    category: 'ai',
    icon: Camera,
    defaultEnabled: true,
  },
  {
    id: 'mandi',
    name: 'मंडी भाव (Mandi Bhav)',
    englishName: 'Live Mandi Prices',
    description: 'शामगढ़ व आसपास की मंडियों के दैनिक फसलों के ताज़ा भाव',
    route: '/mandi',
    category: 'service',
    icon: TrendingUp,
    defaultEnabled: true,
  },
  {
    id: 'weather',
    name: 'मौसम पूर्वानुमान (Weather)',
    englishName: 'Weather Forecast',
    description: 'लाइव तापमान, वर्षा अनुमान व 5-दिवसीय मौसम गाइड',
    route: '/weather',
    category: 'service',
    icon: CloudSun,
    defaultEnabled: true,
  },
  {
    id: 'schemes',
    name: 'सरकारी योजनाएं (Sarkari Schemes)',
    englishName: 'Government Schemes',
    description: 'PM-किसान, फसल बीमा, ट्रैक्टर व कृषि यंत्र सब्सिडी',
    route: '/schemes',
    category: 'service',
    icon: Landmark,
    defaultEnabled: true,
  },
  {
    id: 'news',
    name: 'कृषि समाचार (Agri News)',
    englishName: 'Daily Agriculture News',
    description: 'कृषि जगत की ताज़ा खबरें और सरकारी घोषणाएं',
    route: '/news',
    category: 'service',
    icon: Newspaper,
    defaultEnabled: true,
  },
  {
    id: 'calculator',
    name: 'कृषि कैलकुलेटर (Agri Calculator)',
    englishName: 'Fertilizer & Seed Calculator',
    description: 'फसल व एकड़ अनुसार खाद, बीज व कीटनाशक की सही मात्रा',
    route: '/calculator',
    category: 'utility',
    icon: Calculator,
    defaultEnabled: true,
  },
  {
    id: 'soil_testing',
    name: 'मिट्टी परीक्षण मार्गदर्शिका (Soil Testing)',
    englishName: 'Soil Testing Guide',
    description: 'खेत की मिट्टी का सही नमूना लेने व जांच का संपूर्ण विवरण',
    route: '/soil-testing',
    category: 'utility',
    icon: TestTube2,
    defaultEnabled: true,
  },
  {
    id: 'encyclopedia',
    name: 'कीट एवं रोग निर्देशिका (Encyclopedia)',
    englishName: 'Crop Issues Encyclopedia',
    description: 'फसलों के मुख्य रोग, कीट, पोषक तत्वों की कमी व नियंत्रण',
    route: '/encyclopedia',
    category: 'utility',
    icon: Bug,
    defaultEnabled: true,
  },
  {
    id: 'helpline',
    name: 'हेल्पलाइन डायरेक्टरी (Helplines)',
    englishName: 'Kisan Helpline Directory',
    description: 'कृषि वैज्ञानिक, मौसम विभाग व आपातकालीन किसान सहायता नंबर',
    route: '/helpline',
    category: 'utility',
    icon: PhoneCall,
    defaultEnabled: true,
  },
  {
    id: 'faq',
    name: 'FAQ (सहायता व प्रश्नोत्तरी)',
    englishName: 'Help & FAQ',
    description: 'ऑर्डर, डिलीवरी व ऐप से जुड़े आम सवालों के त्वरित जवाब',
    route: '/faq',
    category: 'utility',
    icon: HelpCircle,
    defaultEnabled: true,
  },
];

export const ROUTE_TO_FEATURE_MAP: Record<string, string> = {
  '/ai-product-knowledge': 'ai_product_knowledge',
  '/ai-call': 'ai_call',
  '/disease': 'disease',
  '/mandi': 'mandi',
  '/weather': 'weather',
  '/schemes': 'schemes',
  '/news': 'news',
  '/calculator': 'calculator',
  '/soil-testing': 'soil_testing',
  '/encyclopedia': 'encyclopedia',
  '/helpline': 'helpline',
  '/faq': 'faq',
};
