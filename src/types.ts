export interface ImageSource {
  primary: string;
  fallback: string;
}

export interface CategoryData {
  id: string;
  name: string;
  icon: string | ImageSource; // Supporting legacy string icon or new dual source
  order: number;
  importantInfo?: string;
  isInfoEnabled?: boolean;
}

export interface Product {
  id: string;
  customId?: string;
  name: string;
  hindiName: string;
  category: string;
  brand: string;
  price?: number;
  hidePrice?: boolean;
  unit?: string;
  inStock?: boolean;
  image: string | ImageSource;
  description: string;
  crops: string[];
  variants?: { id: string; quantity: string; price: number }[];
  isFeatured?: boolean;
  featuredOrder?: number;
  dosage?: {
    show: boolean;
    value: string;
  };
}

export interface CropAdvice {
  id: string;
  name: string;
  hindiName: string;
  image: string | ImageSource;
  stages: {
    stage: string;
    hindiStage: string;
    advice: string;
    products: string[];
  }[];
}

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  rain: number;
  maxTemp: number;
  minTemp: number;
  location?: string;
  hindiCondition?: string;
  forecast?: {
    day: string;
    temp: string;
    condition: string;
  }[];
}

export interface AgriIssue {
  id: string;
  hindiName: string;
  englishName: string;
  type: 'pest' | 'disease' | 'deficiency';
  description: string;
  image: string | ImageSource;
  relatedProductIds: string[];
}

export interface Helpline {
  id: string;
  name: string;
  number: string;
  category: string;
  description?: string;
  order: number;
}

export interface UserRecord {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
  isBlocked?: boolean;
  geminiApiKey?: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
  unit: string;
}

export interface OrderItem {
  productId: string;
  customId?: string;
  name: string;
  hindiName: string;
  brand: string;
  quantity: number;
  unit: string;
  price: number;
  image?: string | ImageSource;
}

export type OrderStatus = 'placed' | 'confirmed' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type PaymentMethod = 'online_razorpay' | 'upi_manual';

export interface OrderTimelineEvent {
  title: string;
  description: string;
  timestamp: number;
  status: OrderStatus;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "FKB-2025-0801"
  userId?: string;
  userEmail?: string;
  customerDetails: {
    name: string;
    phone: string;
    addressHouse: string;
    addressCity: string;
    addressDistrict: string;
    addressState: string;
    addressPincode: string;
  };
  items: OrderItem[];
  itemCount: number;
  itemsTotal: number;
  deliveryCharges: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpayMode?: 'test' | 'live';
  status: OrderStatus;
  trackingNumber?: string;
  courierPartner?: string;
  estimatedDeliveryDate?: string;
  notes?: string;
  timeline: OrderTimelineEvent[];
  createdAt: number;
  updatedAt: number;
}

export interface RazorpayPublicConfig {
  enabled: boolean;
  mode: 'test' | 'live';
  keyId: string;
  isConfigured: boolean;
  webhookEnabled?: boolean;
}

export interface RazorpayAdminSettings {
  enabled: boolean;
  mode: 'test' | 'live';
  testKeyId: string;
  liveKeyId: string;
  hasTestSecret: boolean;
  hasLiveSecret: boolean;
  webhookSecret?: string;
  hasWebhookSecret?: boolean;
  webhookUrl: string;
  lastUpdated: number;
  lastPaymentStatus?: string;
  lastTestResult?: {
    success: boolean;
    mode: 'test' | 'live';
    message: string;
    timestamp: number;
  };
}

export interface AgriTradeNotice {
  id: string;
  title: string;
  date: string; // DD/MM/YYYY or readable Hindi date
  department: string; // e.g. CIB&RC, FCO, Ministry of Agriculture, Seed Division, State Agri Dept
  state?: string; // e.g. "केंद्र सरकार (भारत)", "मध्यप्रदेश", "उत्तर प्रदेश" etc.
  category: 'Government Orders' | 'Ban Notifications' | 'Fertilizer' | 'Pesticides' | 'Seeds' | 'Licensing' | 'Legal Updates' | 'GST' | 'Subsidy' | 'Company Circulars' | 'Others';
  summary: string;
  fullContent: string;
  orderNumber?: string;
  pdfUrl?: string;
  source: string;
  isImportant?: boolean;
  createdAt: number; // timestamp
}

export interface PageSectionItem {
  id: string;
  title: string;
  content: string;
  bullets?: string[];
  iconName?: string;
  badge?: string;
}

export interface AboutUsPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  introText: string;
  missionTitle: string;
  missionText: string;
  visionTitle: string;
  visionText: string;
  storyTitle: string;
  storyText: string;
  services: { id: string; title: string; desc: string }[];
  highlights: string[];
  founderName: string;
  founderRole: string;
  founderMessage: string;
  sections: PageSectionItem[];
}

export interface PrivacyPolicyPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated: string;
  introText: string;
  sections: PageSectionItem[];
  contactEmail: string;
  contactPhone: string;
}

export interface TermsConditionsPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated: string;
  introText: string;
  sections: PageSectionItem[];
  governingLaw: string;
}

export interface RefundPolicyPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated: string;
  introText: string;
  returnWindowText: string;
  nonReturnableConditions: string[];
  sections: PageSectionItem[];
  refundProcessText: string;
}

export interface AiDisclaimerPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated: string;
  introText: string;
  emergencyNotice: string;
  sections: PageSectionItem[];
}

export interface ChemicalSafetyPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated: string;
  introText: string;
  emergencyNumbers: { title: string; number: string; desc: string }[];
  dosList: string[];
  dontsList: string[];
  sections: PageSectionItem[];
}

export interface ContactUsPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  introText: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  timings: string;
  deliveryArea: string;
  emergencySupportText: string;
  customNotes?: string;
  sections: PageSectionItem[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface FaqHelpCenterPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated: string;
  introText: string;
  supportPhone: string;
  supportWhatsapp: string;
  supportTimings: string;
  faqs: FaqItem[];
  sections: PageSectionItem[];
}

export interface ShippingDeliveryPolicyPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated: string;
  introText: string;
  deliveryAreas: string[];
  estimatedTimeline: string;
  freeDeliveryThreshold: string;
  standardDeliveryFee: string;
  heavyItemNote: string;
  trackingInfo: string;
  sections: PageSectionItem[];
}

export interface GrievanceRedressalPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated: string;
  introText: string;
  officerName: string;
  officerDesignation: string;
  officerEmail: string;
  officerPhone: string;
  officerAddress: string;
  workingHours: string;
  acknowledgmentHours: string;
  resolutionDays: string;
  jurisdiction: string;
  sections: PageSectionItem[];
}

export interface LicensingDisclaimerPageData {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated: string;
  introText: string;
  operatorName: string;
  operatorPhotoUrl?: string;
  qualification: string;
  university: string;
  daesiBatchYear: string;
  licenseStatus: string;
  applicationNote: string;
  pesticideLicenseNo: string;
  fertilizerLicenseNo: string;
  seedLicenseNo: string;
  issuingAuthority: string;
  sections: PageSectionItem[];
}

export interface LegalPagesContent {
  aboutUs?: AboutUsPageData;
  privacyPolicy?: PrivacyPolicyPageData;
  termsConditions?: TermsConditionsPageData;
  refundPolicy?: RefundPolicyPageData;
  aiDisclaimer?: AiDisclaimerPageData;
  chemicalSafety?: ChemicalSafetyPageData;
  contactUs?: ContactUsPageData;
  faqHelp?: FaqHelpCenterPageData;
  shippingPolicy?: ShippingDeliveryPolicyPageData;
  grievanceRedressal?: GrievanceRedressalPageData;
  licensingDisclaimer?: LicensingDisclaimerPageData;
}


