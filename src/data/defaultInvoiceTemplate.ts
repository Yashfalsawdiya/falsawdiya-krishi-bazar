import { InvoiceTemplateConfig, Order } from '../types';

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplateConfig = {
  // 1. Header & Branding
  showLogo: true,
  logoSize: 52,
  logoBorderRadius: 12,
  logoBackground: '#ffffff',
  customLogoUrl: '',
  businessName: 'फल्सावदिया कृषि बाजार',
  businessNameFontSize: 21,
  businessNameFontWeight: '900',
  businessNameColor: '#ffffff',
  tagline: 'किसान का भरोसा, हमारी पहचान',
  taglineFontSize: 11,
  taglineColor: '#fde047',
  phone: '+91 89823 38046',
  phoneLabel: 'संपर्क:',
  showPhone: true,
  address: 'डिंपल चौराहा, शामगढ़, मध्य प्रदेश (भारत)',
  addressLabel: 'पता:',
  showAddress: true,
  contactTextColor: '#e2f1df',
  headerBgType: 'gradient',
  headerBgColor: '#2D5A27',
  headerBgGradientEnd: '#1e3d1a',
  headerPadding: 20,
  receiptBadgeText: 'ई-रसीद / TAX INVOICE',
  receiptBadgeBg: '#ffffff',
  receiptBadgeTextColor: '#2D5A27',
  receiptBadgeFontSize: 11,
  receiptBadgeBorderRadius: 999,
  showReceiptBadge: true,
  orderNumberPrefix: '#',
  orderNumberColor: '#fef08a',
  orderNumberFontSize: 15,
  dateLabel: 'दिनांक:',
  dateColor: '#e2f1df',
  dateFontSize: 10.5,

  // 2. Global Layout & Styling
  primaryColor: '#2D5A27',
  accentColor: '#fde047',
  backgroundColor: '#ffffff',
  containerPadding: 28,
  outerBorderWidth: 2,
  outerBorderColor: '#2D5A27',
  outerBorderRadius: 16,
  outerBorderStyle: 'solid',
  cardBorderRadius: 12,
  cardBgColor: '#ffffff',
  cardBorderColor: '#e5e7eb',
  detailsSectionBg: '#faf8f5',
  detailsSectionPadding: 18,
  fontFamily: '"Noto Sans Devanagari", "Plus Jakarta Sans", system-ui, sans-serif',

  // 3. Customer Details Section
  showCustomerDetails: true,
  customerDetailsHeading: '📍 ग्राहक एवं डिलीवरी विवरण (CUSTOMER DETAILS)',
  customerHeadingColor: '#2D5A27',
  customerHeadingFontSize: 11.5,
  customerCardBg: '#ffffff',
  customerCardBorderColor: '#e5e7eb',
  customerTextColor: '#111827',
  customerPhoneLabel: '📱 मोबाइल:',

  // 4. Payment Details Section
  showPaymentDetails: true,
  paymentDetailsHeading: '💳 भुगतान एवं ऑर्डर स्थिति (PAYMENT INFO)',
  paymentHeadingColor: '#2D5A27',
  paymentHeadingFontSize: 11.5,
  paymentCardBg: '#ffffff',
  paymentCardBorderColor: '#e5e7eb',
  showRazorpayId: true,
  showCourierTracking: true,
  paidBadgeBg: '#ecfdf5',
  paidBadgeTextColor: '#047857',
  paidBadgeBorderColor: '#a7f3d0',
  pendingBadgeBg: '#fffbeb',
  pendingBadgeTextColor: '#b45309',
  pendingBadgeBorderColor: '#fde68a',

  // 5. Products Table Section
  showProductsTable: true,
  tableHeading: '📦 खरीदे गए उत्पाद विवरण (ORDERED ITEMS)',
  tableHeadingColor: '#374151',
  tableHeadingFontSize: 12.5,
  tableHeaderBg: '#f3f4f6',
  tableHeaderTextColor: '#374151',
  tableBorderColor: '#e5e7eb',
  tableFontSize: 13,
  colIndexTitle: '#',
  colProductTitle: 'उत्पाद नाम एवं विवरण (Product)',
  colUnitTitle: 'पैकिंग (Unit)',
  colQtyTitle: 'मात्रा',
  colRateTitle: 'दर (Price)',
  colTotalTitle: 'कुल (Subtotal)',
  tablePriceColor: '#2D5A27',
  tableAlternateRowBg: false,
  tableAlternateColor: '#fafafa',

  // 6. Terms & Notice Section
  showTerms: true,
  termsHeading: '📋 नियम एवं शर्तें (Terms & Notice):',
  termsHeadingColor: '#1f2937',
  termsLines: [
    '1. यह कंप्यूटर द्वारा स्वतः उत्पन्न डिजिटल टैक्स इनवॉइस है।',
    '2. असली एवं प्रामाणिक कृषि उत्पाद सीधे आपके पते पर सुरक्षित पहुँचाए जाएंगे।',
    '3. किसी भी सहायता के लिए हमारे हेल्पलाइन नंबर पर संपर्क करें।'
  ],
  termsCardBg: '#f9fafb',
  termsCardBorderColor: '#d1d5db',
  termsCardBorderStyle: 'dashed',
  termsTextColor: '#4b5563',
  termsFontSize: 11,

  // 7. Summary & Totals Section
  showSummaryTotals: true,
  subtotalLabel: 'उत्पाद कुल मूल्य (Items Subtotal):',
  deliveryLabel: 'डिलीवरी शुल्क (Delivery Charges):',
  freeDeliveryText: 'मुफ़्त (FREE)',
  freeDeliveryColor: '#047857',
  paidDeliveryColor: '#b45309',
  grandTotalLabel: 'कुल देय राशि (Grand Total):',
  grandTotalColor: '#2D5A27',
  grandTotalFontSize: 17,
  summaryCardBg: '#faf8f5',
  summaryCardBorderColor: '#2D5A27',
  summaryCardBorderWidth: 1.5,

  // 8. Verified Badge & Footer Section
  showVerifiedBadge: true,
  verifiedBadgeText: '✓ VERIFIED DIGITAL INVOICE',
  verifiedBadgeSubtext: 'हस्ताक्षर की आवश्यकता नहीं है (Computer Generated)',
  verifiedBadgeBg: '#f2f8f2',
  verifiedBadgeTextColor: '#2D5A27',
  verifiedBadgeBorderColor: '#2D5A27',
  showFooter: true,
  thankYouMessage: 'धन्यवाद! आपके सुखद व समृद्ध कृषि जीवन की शुभकामनाएँ। 🌾',
  showStoreNameInFooter: true,
  footerStoreNameColor: '#2D5A27',
  footerBg: '#ffffff',
  footerBorderColor: '#e5e7eb',
  footerTextColor: '#4b5563',
};

export const mergeInvoiceTemplate = (
  saved?: Partial<InvoiceTemplateConfig> | null,
  storeDefaults?: { name?: string; tagline?: string; phone?: string; address?: string }
): InvoiceTemplateConfig => {
  if (!saved) {
    return {
      ...DEFAULT_INVOICE_TEMPLATE,
      ...(storeDefaults?.name ? { businessName: storeDefaults.name } : {}),
      ...(storeDefaults?.tagline ? { tagline: storeDefaults.tagline } : {}),
      ...(storeDefaults?.phone ? { phone: storeDefaults.phone } : {}),
      ...(storeDefaults?.address ? { address: storeDefaults.address } : {}),
    };
  }

  return {
    ...DEFAULT_INVOICE_TEMPLATE,
    ...saved,
    // Ensure terms array is preserved and valid
    termsLines: Array.isArray(saved.termsLines) && saved.termsLines.length > 0
      ? saved.termsLines
      : DEFAULT_INVOICE_TEMPLATE.termsLines,
  };
};

export const SAMPLE_INVOICE_ORDER: Order = {
  id: 'sample-order-live-preview',
  orderNumber: 'FKB-2026-0826',
  userId: 'sample-farmer-123',
  userEmail: 'farmer.sample@gmail.com',
  customerDetails: {
    name: 'रामेश्वर पाटीदार (किसान मित्र)',
    phone: '9826012345',
    addressHouse: 'मकान नं. 45, ग्राम - पिपलिया बुजुर्ग',
    addressCity: 'शामगढ़',
    addressDistrict: 'मंदसौर',
    addressState: 'मध्य प्रदेश',
    addressPincode: '458883'
  },
  items: [
    {
      productId: 'p-101',
      customId: 'FK-SOYA-01',
      name: 'JS 20-34 Certified Soybean Seeds',
      hindiName: 'सोयाबीन बीज (JS 20-34 प्रमाणित)',
      brand: 'फल्सावदिया सीड्स',
      quantity: 2,
      unit: '30 किग्रा बैग',
      price: 2600,
    },
    {
      productId: 'p-102',
      customId: 'FK-FERT-05',
      name: 'NPK 19:19:19 100% Water Soluble Fertilizer',
      hindiName: '19:19:19 घुलनशील खाद (NPK)',
      brand: 'इफको (IFFCO)',
      quantity: 3,
      unit: '1 किग्रा पैक',
      price: 180,
    },
    {
      productId: 'p-103',
      customId: 'FK-PEST-08',
      name: 'Coragen Insecticide (Chlorantraniliprole 18.5% SC)',
      hindiName: 'कोराजन कीटनाशक (Coragen)',
      brand: 'FMC इंडिया',
      quantity: 1,
      unit: '60 मिली बॉटल',
      price: 950,
    }
  ],
  itemCount: 6,
  itemsTotal: 6690,
  deliveryCharges: 0,
  totalAmount: 6690,
  paymentMethod: 'online_razorpay',
  paymentStatus: 'paid',
  razorpayPaymentId: 'pay_QwErTy123456789',
  razorpayOrderId: 'order_ABC123456789',
  razorpayMode: 'live',
  status: 'confirmed',
  courierPartner: 'भारतीय डाक (Speed Post)',
  trackingNumber: 'EM987654321IN',
  estimatedDeliveryDate: '28 अगस्त 2026',
  notes: 'खेत पर सुरक्षित डिलीवरी चाहिए',
  timeline: [
    {
      title: 'ऑर्डर प्राप्त हुआ',
      description: 'ऑर्डर सफलतापूर्वक दर्ज हो चुका है',
      timestamp: Date.now() - 3600000 * 4,
      status: 'placed'
    },
    {
      title: 'भुगतान सफल',
      description: 'Razorpay द्वारा ₹6,690 का भुगतान प्राप्त हुआ',
      timestamp: Date.now() - 3600000 * 3,
      status: 'confirmed'
    }
  ],
  createdAt: Date.now() - 3600000 * 4,
  updatedAt: Date.now()
};
