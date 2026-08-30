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
  weightInKg?: number; // explicit product weight in kg
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
  weightInKg?: number;
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
  weightInKg?: number;
  image?: string | ImageSource;
}

export type OrderStatus = 'placed' | 'confirmed' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'online_razorpay' | 'upi_manual';
export type RefundStatus = 'not_applicable' | 'pending' | 'processed' | 'failed';

export interface RefundDetails {
  refundAmount: number;
  eligibleProductAmount: number;
  deliveryChargeDeducted: number;
  deliveryChargeRefunded: number;
  refundStatus: RefundStatus;
  refundId?: string;
  refundMethod: string;
  cancelledAt: number;
  cancellationReason?: string;
  cancelledBy: 'user' | 'admin';
  cancellationStage: 'before_dispatch' | 'after_dispatch';
  cancellationMessage?: string;
}

export interface OrderTimelineEvent {
  title: string;
  description: string;
  timestamp: number;
  status: OrderStatus;
}

export type PartnerAssignmentStatus = 'assigned' | 'accepted' | 'declined' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'failed';

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
  deliveryDetails?: OrderDeliverySnapshot;
  deliverySnapshot?: OrderDeliverySnapshot;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpayMode?: 'test' | 'live';
  refundDetails?: RefundDetails;
  status: OrderStatus;
  trackingNumber?: string;
  courierPartner?: string;
  estimatedDeliveryDate?: string;
  notes?: string;
  timeline: OrderTimelineEvent[];
  // Delivery Partner Assignment fields
  assignedPartnerId?: string;
  assignedPartnerName?: string;
  assignedPartnerPhone?: string;
  assignedPartnerEmail?: string;
  assignedVehicleType?: string;
  assignedVehicleNumber?: string;
  partnerAssignmentStatus?: PartnerAssignmentStatus;
  partnerAssignedAt?: number;
  partnerAcceptedAt?: number;
  partnerDeclineReason?: string;
  partnerStatusNote?: string;
  deliveryProofOtp?: string;
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

export interface InvoiceTemplateConfig {
  // 1. Header & Branding
  showLogo: boolean;
  logoSize: number; // in px e.g. 52
  logoBorderRadius: number; // in px e.g. 12
  logoBackground: string; // e.g. '#ffffff'
  customLogoUrl?: string;
  businessName: string;
  businessNameFontSize: number; // in px e.g. 21
  businessNameFontWeight: 'normal' | 'medium' | 'semibold' | 'bold' | '900';
  businessNameColor: string;
  tagline: string;
  taglineFontSize: number; // in px e.g. 11
  taglineColor: string;
  phone: string;
  phoneLabel: string;
  showPhone: boolean;
  address: string;
  addressLabel: string;
  showAddress: boolean;
  contactTextColor: string;
  headerBgType: 'gradient' | 'solid';
  headerBgColor: string;
  headerBgGradientEnd: string;
  headerPadding: number; // in px e.g. 20
  receiptBadgeText: string;
  receiptBadgeBg: string;
  receiptBadgeTextColor: string;
  receiptBadgeFontSize: number; // in px e.g. 11
  receiptBadgeBorderRadius: number; // in px e.g. 999
  showReceiptBadge: boolean;
  orderNumberPrefix: string;
  orderNumberColor: string;
  orderNumberFontSize: number; // in px e.g. 15
  dateLabel: string;
  dateColor: string;
  dateFontSize: number; // in px e.g. 10.5

  // 2. Global Layout & Styling
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  containerPadding: number; // in px e.g. 28
  outerBorderWidth: number; // in px e.g. 2
  outerBorderColor: string;
  outerBorderRadius: number; // in px e.g. 16
  outerBorderStyle: 'solid' | 'dashed' | 'double' | 'none';
  cardBorderRadius: number; // in px e.g. 12
  cardBgColor: string;
  cardBorderColor: string;
  detailsSectionBg: string;
  detailsSectionPadding: number; // in px e.g. 18
  fontFamily: string;

  // 3. Customer Details Section
  showCustomerDetails: boolean;
  customerDetailsHeading: string;
  customerHeadingColor: string;
  customerHeadingFontSize: number; // in px e.g. 11.5
  customerCardBg: string;
  customerCardBorderColor: string;
  customerTextColor: string;
  customerPhoneLabel: string;

  // 4. Payment Details Section
  showPaymentDetails: boolean;
  paymentDetailsHeading: string;
  paymentHeadingColor: string;
  paymentHeadingFontSize: number; // in px e.g. 11.5
  paymentCardBg: string;
  paymentCardBorderColor: string;
  showRazorpayId: boolean;
  showCourierTracking: boolean;
  paidBadgeBg: string;
  paidBadgeTextColor: string;
  paidBadgeBorderColor: string;
  pendingBadgeBg: string;
  pendingBadgeTextColor: string;
  pendingBadgeBorderColor: string;

  // 5. Products Table Section
  showProductsTable: boolean;
  tableHeading: string;
  tableHeadingColor: string;
  tableHeadingFontSize: number; // in px e.g. 12.5
  tableHeaderBg: string;
  tableHeaderTextColor: string;
  tableBorderColor: string;
  tableFontSize: number; // in px e.g. 13
  colIndexTitle: string;
  colProductTitle: string;
  colUnitTitle: string;
  colQtyTitle: string;
  colRateTitle: string;
  colTotalTitle: string;
  tablePriceColor: string;
  tableAlternateRowBg: boolean;
  tableAlternateColor: string;

  // 6. Terms & Notice Section
  showTerms: boolean;
  termsHeading: string;
  termsHeadingColor: string;
  termsLines: string[];
  termsCardBg: string;
  termsCardBorderColor: string;
  termsCardBorderStyle: 'solid' | 'dashed' | 'dotted';
  termsTextColor: string;
  termsFontSize: number; // in px e.g. 11

  // 7. Summary & Totals Section
  showSummaryTotals: boolean;
  subtotalLabel: string;
  deliveryLabel: string;
  freeDeliveryText: string;
  freeDeliveryColor: string;
  paidDeliveryColor: string;
  grandTotalLabel: string;
  grandTotalColor: string;
  grandTotalFontSize: number; // in px e.g. 17
  summaryCardBg: string;
  summaryCardBorderColor: string;
  summaryCardBorderWidth: number; // in px e.g. 1.5

  // 8. Verified Badge & Footer Section
  showVerifiedBadge: boolean;
  verifiedBadgeText: string;
  verifiedBadgeSubtext: string;
  verifiedBadgeBg: string;
  verifiedBadgeTextColor: string;
  verifiedBadgeBorderColor: string;
  showFooter: boolean;
  thankYouMessage: string;
  showStoreNameInFooter: boolean;
  footerStoreNameColor: string;
  footerBg: string;
  footerBorderColor: string;
  footerTextColor: string;
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

// ==========================================
// DYNAMIC DELIVERY CHARGE SYSTEM TYPES
// ==========================================

export type VehicleTypeId = 'bike' | 'e_rickshaw' | 'pickup' | 'tempo' | 'truck' | string;

export interface VehicleConfig {
  id: VehicleTypeId;
  name: string; // e.g. "बाइक / मोटरसाइकिल"
  shortName: string; // e.g. "Bike"
  icon: string; // '🛵', '🛺', '🛻', '🚚', '🚛'
  description: string; // e.g. "छोटे/हल्के Orders (0-10 kg)"
  maxCapacityKg: number; // e.g. 10
  isActive: boolean;
  order: number;
}

export interface WeightSlab {
  id: string;
  minWeightKg: number; // inclusive, e.g. 0
  maxWeightKg: number; // inclusive, e.g. 10 (or 99999 for highest)
  vehicleId: VehicleTypeId;
  label?: string; // e.g. "0–10 kg (Bike)"
}

export interface DistanceSlab {
  id: string;
  minDistanceKm: number; // e.g. 0
  maxDistanceKm: number; // e.g. 5, 15, 30, 50, 99999
  label: string; // "0–5 km", "5–15 km", etc.
}

export interface DeliveryRateMatrix {
  // key format: `${vehicleId}_${distanceSlabId}`, value in ₹
  [key: string]: number;
}

export interface StoreOriginLocation {
  name: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

export interface DynamicDeliveryConfig {
  isEnabled: boolean; // whether dynamic delivery mode is active
  isDeliveryActive: boolean; // whether store delivery is accepted
  defaultFixedCharge: number; // fallback fixed fee if dynamic is toggled off
  enableFreeDelivery: boolean;
  freeDeliveryThreshold: number; // Free delivery above this cart amount
  storeOrigin: StoreOriginLocation;
  vehicles: VehicleConfig[];
  weightSlabs: WeightSlab[];
  distanceSlabs: DistanceSlab[];
  rateMatrix: DeliveryRateMatrix;
  pincodeDistances?: { [pincode: string]: number };
  lastUpdated: number;
}

export interface CalculatedDeliveryQuote {
  totalWeightKg: number;
  distanceKm: number;
  vehicle: VehicleConfig;
  vehicleEmoji: string;
  vehicleNameHindi: string;
  vehicleType: string;
  weightSlab: WeightSlab;
  distanceSlab: DistanceSlab;
  baseCharge: number;
  discount: number;
  finalDeliveryCharge: number;
  isFreeDelivery: boolean;
  breakdownText: string;
  calculationNote?: string;
}

export interface OrderDeliverySnapshot {
  totalWeightKg: number;
  distanceKm: number;
  vehicleId: string;
  vehicleName: string;
  vehicleIcon: string;
  vehicleEmoji: string;
  vehicleNameHindi: string;
  vehicleType: string;
  distanceSlabLabel: string;
  weightSlabLabel: string;
  calculatedCharge: number;
  finalCharge: number;
  isFreeDelivery: boolean;
  isManuallyOverridden?: boolean;
  overrideReason?: string;
  calculatedAt: number;
}

// ==========================================
// DELIVERY PARTNER SYSTEM TYPES
// ==========================================

export type DeliveryPartnerAvailability = 'available' | 'on_delivery' | 'off_duty';

export interface DeliveryPartner {
  id: string;
  name: string; // e.g. "राहुल पटेल"
  phone: string; // 10-digit mobile number e.g. "9876543210"
  email: string; // Google login Gmail e.g. "rahul@gmail.com"
  vehicleType: string; // e.g. "bike", "pickup", "e_rickshaw", "tempo", "truck"
  vehicleTypeName?: string; // e.g. "मोटरसाइकिल / बाइक (Bike)"
  vehicleNumber?: string; // e.g. "MP-09-AB-1234"
  isActive: boolean; // Admin toggle (सक्रिय / निष्क्रिय)
  availabilityStatus: DeliveryPartnerAvailability; // Live availability status
  assignedOrdersCount: number; // Current active assigned orders
  completedDeliveriesCount: number; // Historical completed deliveries
  currentOrderId?: string; // Currently active in-transit order ID
  address?: string;
  emergencyPhone?: string;
  notes?: string;
  joinedAt: number;
  createdAt: number;
  updatedAt: number;
}



