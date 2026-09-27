export type LanguageCode = 'hi' | 'en';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  shortLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिंदी',
    shortLabel: 'हि'
  },
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    shortLabel: 'EN'
  }
];

export interface TranslationDictionary {
  [key: string]: {
    hi: string;
    en: string;
  };
}

export const TRANSLATIONS: TranslationDictionary = {
  // Brand & Header
  'brand_tagline': {
    hi: 'किसान का भरोसा, हमारी पहचान',
    en: "Farmer's Trust, Our Identity"
  },
  'search_placeholder': {
    hi: 'दवाई, खाद, बीज या कीटनाशक खोजें...',
    en: 'Search medicines, fertilizers, seeds or pesticides...'
  },
  'search_button': {
    hi: 'खोजें',
    en: 'Search'
  },
  'helpline': {
    hi: 'हेल्पलाइन',
    en: 'Helpline'
  },
  'helpline_call': {
    hi: 'कृषि हेल्पलाइन पर कॉल करें',
    en: 'Call Agri Helpline'
  },
  'cart': {
    hi: 'कार्ट',
    en: 'Cart'
  },
  'my_orders': {
    hi: 'मेरे ऑर्डर',
    en: 'My Orders'
  },
  'profile': {
    hi: 'प्रोफाइल',
    en: 'Profile'
  },
  'admin': {
    hi: 'एडमिन',
    en: 'Admin'
  },
  'admin_panel': {
    hi: 'एडमिन पैनल',
    en: 'Admin Panel'
  },
  'language': {
    hi: 'भाषा',
    en: 'Language'
  },
  'select_language': {
    hi: 'भाषा चुनें',
    en: 'Select Language'
  },

  // Main Navigation
  'nav_home': {
    hi: 'मुख्य पृष्ठ',
    en: 'Home'
  },
  'nav_products': {
    hi: 'कृषि बाज़ार',
    en: 'Agri Market'
  },
  'nav_ai_call': {
    hi: 'AI विशेषज्ञ कॉल',
    en: 'AI Expert Call'
  },
  'nav_disease': {
    hi: 'बीमारी जाँच',
    en: 'Crop Health Scan'
  },
  'nav_mandi': {
    hi: 'मंडी भाव',
    en: 'Mandi Rates'
  },
  'nav_news': {
    hi: 'कृषि समाचार',
    en: 'Agri News'
  },
  'nav_weather': {
    hi: 'मौसम',
    en: 'Weather'
  },
  'nav_schemes': {
    hi: 'सरकारी योजनाएं',
    en: 'Govt Schemes'
  },
  'nav_calculator': {
    hi: 'कैलकुलेटर',
    en: 'Calculator'
  },
  'nav_helpline': {
    hi: 'हेल्पलाइन',
    en: 'Helpline'
  },
  'nav_encyclopedia': {
    hi: 'कीट एवं रोग निर्देशिका',
    en: 'Pest & Disease Guide'
  },
  'nav_soil_testing': {
    hi: 'मिट्टी परीक्षण',
    en: 'Soil Testing'
  },
  'nav_product_knowledge': {
    hi: 'AI उत्पाद जानकारी',
    en: 'AI Product Knowledge'
  },

  // Bottom Navigation Mobile
  'bottom_home': {
    hi: 'होम',
    en: 'Home'
  },
  'bottom_market': {
    hi: 'बाजार',
    en: 'Market'
  },
  'bottom_disease': {
    hi: 'बीमारी जाँच',
    en: 'Crop Scan'
  },
  'bottom_news': {
    hi: 'कृषि समाचार',
    en: 'Agri News'
  },
  'bottom_weather': {
    hi: 'मौसम',
    en: 'Weather'
  },

  // Side Menu Drawer
  'menu_all_services': {
    hi: 'सभी सेवाएं व नीतियां',
    en: 'All Services & Policies'
  },
  'menu_my_profile': {
    hi: 'मेरा प्रोफाइल (Profile)',
    en: 'My Profile'
  },
  'menu_about_us': {
    hi: 'हमारे बारे में (About Us)',
    en: 'About Us'
  },
  'menu_ai_call': {
    hi: 'AI कृषि विशेषज्ञ कॉल',
    en: 'AI Agri Expert Call'
  },
  'menu_ai_knowledge': {
    hi: 'AI उत्पाद जानकारी (Knowledge)',
    en: 'AI Product Knowledge'
  },
  'menu_mandi': {
    hi: 'मंडी भाव (Mandi Bhav)',
    en: 'Mandi Bhav Rates'
  },
  'menu_encyclopedia': {
    hi: 'कीट एवं रोग निर्देशिका',
    en: 'Pest & Disease Directory'
  },
  'menu_schemes': {
    hi: 'सरकारी योजनाएं',
    en: 'Government Schemes'
  },
  'menu_calculator': {
    hi: 'कृषि कैलकुलेटर (Calculator)',
    en: 'Agri Calculator'
  },
  'menu_helpline': {
    hi: 'हेल्पलाइन डायरेक्टरी',
    en: 'Helpline Directory'
  },
  'menu_policies_heading': {
    hi: 'नीतियां व कानूनी जानकारी',
    en: 'Policies & Legal Information'
  },
  'menu_licensing': {
    hi: 'Statutory Licensing (वैधानिक लाइसेंस व DAESI)',
    en: 'Statutory Licensing & DAESI'
  },
  'menu_faq': {
    hi: 'FAQ (सहायता व प्रश्नोत्तरी)',
    en: 'FAQ & Help'
  },
  'menu_shipping': {
    hi: 'Shipping & Delivery (डिलीवरी नीति)',
    en: 'Shipping & Delivery Policy'
  },
  'menu_privacy': {
    hi: 'Privacy Policy (गोपनीयता नीति)',
    en: 'Privacy Policy'
  },
  'menu_terms': {
    hi: 'Terms (नियम एवं शर्तें)',
    en: 'Terms & Conditions'
  },
  'menu_refund': {
    hi: 'Refund Policy (वापसी व रिफंड)',
    en: 'Return & Refund Policy'
  },
  'menu_disclaimer': {
    hi: 'AI Disclaimer (कृषि एवं AI अस्वीकरण)',
    en: 'AI & Agri Disclaimer'
  },
  'menu_safety': {
    hi: 'Chemical Safety (रासायनिक सुरक्षा)',
    en: 'Chemical Safety'
  },
  'menu_grievance': {
    hi: 'Grievance Officer (शिकायत अधिकारी)',
    en: 'Grievance Redressal'
  },
  'menu_contact': {
    hi: 'Contact Us (संपर्क करें)',
    en: 'Contact Us'
  },

  // Product Card & Catalog
  'add_to_cart': {
    hi: 'कार्ट में जोड़ें',
    en: 'Add to Cart'
  },
  'added': {
    hi: 'जोड़ दिया गया',
    en: 'Added'
  },
  'buy_now': {
    hi: 'अभी खरीदें',
    en: 'Buy Now'
  },
  'in_stock': {
    hi: 'स्टॉक में उपलब्ध',
    en: 'In Stock'
  },
  'out_of_stock': {
    hi: 'स्टॉक खत्म',
    en: 'Stock Out'
  },
  'stock_out_badge': {
    hi: 'स्टॉक खत्म',
    en: 'OUT OF STOCK'
  },
  'available_packs': {
    hi: 'उपलब्ध पैक:',
    en: 'Available Packs:'
  },
  'price_not_available': {
    hi: 'कीमत उपलब्ध नहीं',
    en: 'Price Not Available'
  },
  'agri_product': {
    hi: 'कृषि उत्पाद',
    en: 'Agri Product'
  },
  'zoom_image': {
    hi: 'इमेज बड़ी करें',
    en: 'Enlarge Image'
  },
  'filter_categories': {
    hi: 'श्रेणियां',
    en: 'Categories'
  },
  'all_categories': {
    hi: 'सभी श्रेणियां',
    en: 'All Categories'
  },
  'sort_by': {
    hi: 'सॉर्ट करें',
    en: 'Sort By'
  },
  'price_low_high': {
    hi: 'कीमत: कम से अधिक',
    en: 'Price: Low to High'
  },
  'price_high_low': {
    hi: 'कीमत: अधिक से कम',
    en: 'Price: High to Low'
  },
  'newest_first': {
    hi: 'नया पहले',
    en: 'Newest First'
  },
  'featured': {
    hi: 'विशेष उत्पाद',
    en: 'Featured'
  },
  'search_results': {
    hi: 'खोज परिणाम',
    en: 'Search Results'
  },
  'no_products_found': {
    hi: 'कोई उत्पाद नहीं मिला',
    en: 'No products found'
  },

  // Mandi Bhav
  'mandi_title': {
    hi: 'दैनिक ताज़ा मंडी भाव',
    en: 'Daily Mandi Rates'
  },
  'mandi_subtitle': {
    hi: 'मध्य प्रदेश व देश की प्रमुख मंडियों के ताज़ा व सटीक भाव',
    en: 'Fresh & accurate rates from major mandis across India'
  },
  'commodity': {
    hi: 'जिंस / फसल',
    en: 'Crop / Commodity'
  },
  'mandi_name': {
    hi: 'मंडी का नाम',
    en: 'Mandi Name'
  },
  'min_price': {
    hi: 'न्यूनतम भाव',
    en: 'Min Price'
  },
  'max_price': {
    hi: 'अधिकतम भाव',
    en: 'Max Price'
  },
  'modal_price': {
    hi: 'मॉडल भाव',
    en: 'Modal Price'
  },
  'arrival_date': {
    hi: 'दिनांक',
    en: 'Date'
  },
  'search_mandi': {
    hi: 'मंडी या फसल खोजें...',
    en: 'Search mandi or crop...'
  },
  'refresh_rates': {
    hi: 'भाव ताज़ा करें',
    en: 'Refresh Rates'
  },
  'live_rates': {
    hi: 'लाइव भाव',
    en: 'Live Rates'
  },

  // Agri News
  'news_title': {
    hi: 'कृषि समाचार',
    en: 'Agricultural News'
  },
  'news_subtitle': {
    hi: 'खेती-किसानी, मौसम और सरकारी नीतियों से जुड़े ताज़ा अपडेट',
    en: 'Latest updates on farming, weather, and government policies'
  },
  'read_more': {
    hi: 'पूरा पढ़ें',
    en: 'Read Full'
  },
  'source': {
    hi: 'स्रोत',
    en: 'Source'
  },

  // Government Schemes
  'schemes_title': {
    hi: 'सरकारी योजनाएं व अनुदान',
    en: 'Government Schemes & Subsidies'
  },
  'schemes_subtitle': {
    hi: 'केंद्र व राज्य सरकार की किसानों के लिए लाभकारी योजनाएं',
    en: 'Beneficial Central & State government schemes for farmers'
  },
  'central_govt': {
    hi: 'भारत सरकार (Central)',
    en: 'Central Govt'
  },
  'state_govt': {
    hi: 'मध्य प्रदेश (State)',
    en: 'State Govt (MP)'
  },
  'subsidy': {
    hi: 'अनुदान / सब्सिडी',
    en: 'Subsidy'
  },
  'view_details': {
    hi: 'विवरण',
    en: 'Details'
  },
  'apply_online': {
    hi: 'ऑनलाइन आवेदन करें',
    en: 'Apply Online'
  },
  'eligibility': {
    hi: 'पात्रता',
    en: 'Eligibility'
  },
  'documents_required': {
    hi: 'आवश्यक दस्तावेज',
    en: 'Documents Required'
  },

  // Weather
  'weather_title': {
    hi: 'मौसम पूर्वानुमान',
    en: 'Weather Forecast'
  },
  'temperature': {
    hi: 'तापमान',
    en: 'Temperature'
  },
  'humidity': {
    hi: 'नमी',
    en: 'Humidity'
  },
  'wind_speed': {
    hi: 'हवा की गति',
    en: 'Wind Speed'
  },
  'rain_chance': {
    hi: 'बारिश की संभावना',
    en: 'Rain Probability'
  },
  'agri_advisory': {
    hi: 'मौसम अनुसार कृषि सलाह',
    en: 'Agri Advisory'
  },

  // Disease Detection
  'disease_title': {
    hi: 'फसल बीमारी पहचान',
    en: 'Crop Disease Scan'
  },
  'disease_subtitle': {
    hi: 'फसल की पत्ती या पौधे की फोटो लें, AI तुरंत बताएगा रोग और समाधान',
    en: 'Take a photo of crop leaf; AI diagnoses disease and cure immediately'
  },
  'take_photo': {
    hi: 'फोटो खींचें',
    en: 'Take Photo'
  },
  'upload_photo': {
    hi: 'गैलरी से अपलोड करें',
    en: 'Upload from Gallery'
  },
  'start_scan': {
    hi: 'जाँच शुरू करें',
    en: 'Start Diagnosis'
  },
  'symptoms': {
    hi: 'रोग के लक्षण',
    en: 'Symptoms'
  },
  'cure_treatment': {
    hi: 'रोकथाम एवं उपचार',
    en: 'Prevention & Cure'
  },
  'chemical_cure': {
    hi: 'रासायनिक उपचार',
    en: 'Chemical Remedy'
  },
  'organic_cure': {
    hi: 'जैविक व घरेलू उपाय',
    en: 'Organic / Herbal Remedy'
  },

  // Shopping Cart & Checkout
  'shopping_cart': {
    hi: 'शॉपिंग कार्ट',
    en: 'Shopping Cart'
  },
  'cart_empty': {
    hi: 'आपकी कार्ट अभी खाली है',
    en: 'Your cart is empty'
  },
  'cart_empty_subtitle': {
    hi: 'खेती के लिए आवश्यक दवाई, खाद और बीज चुनें',
    en: 'Select fertilizers, seeds, and pesticides for your farm'
  },
  'start_shopping': {
    hi: 'उत्पाद देखें',
    en: 'Browse Products'
  },
  'order_summary': {
    hi: 'ऑर्डर सारांश',
    en: 'Order Summary'
  },
  'subtotal': {
    hi: 'कुल योग',
    en: 'Subtotal'
  },
  'delivery_fee': {
    hi: 'डिलीवरी शुल्क',
    en: 'Delivery Charges'
  },
  'free': {
    hi: 'निःशुल्क',
    en: 'FREE'
  },
  'total_amount': {
    hi: 'कुल भुगतान राशि',
    en: 'Total Payable Amount'
  },
  'proceed_checkout': {
    hi: 'आगे बढ़ें (चेकआउट)',
    en: 'Proceed to Checkout'
  },
  'place_order': {
    hi: 'ऑर्डर कन्फर्म करें',
    en: 'Confirm & Place Order'
  },
  'delivery_address': {
    hi: 'डिलीवरी का पता',
    en: 'Delivery Address'
  },
  'payment_method': {
    hi: 'भुगतान का तरीका',
    en: 'Payment Method'
  },
  'cash_on_delivery': {
    hi: 'कैश ऑन डिलीवरी (COD)',
    en: 'Cash on Delivery (COD)'
  },
  'online_payment': {
    hi: 'ऑनलाइन भुगतान (UPI / कार्ड)',
    en: 'Online Payment (UPI / Card)'
  },

  // Common Actions & States
  'loading': {
    hi: 'लोड हो रहा है...',
    en: 'Loading...'
  },
  'save': {
    hi: 'सहेजें',
    en: 'Save'
  },
  'cancel': {
    hi: 'रद्द करें',
    en: 'Cancel'
  },
  'confirm': {
    hi: 'पुष्टि करें',
    en: 'Confirm'
  },
  'close': {
    hi: 'बंद करें',
    en: 'Close'
  },
  'back': {
    hi: 'वापस जाएं',
    en: 'Go Back'
  },
  'edit': {
    hi: 'संपादित करें',
    en: 'Edit'
  },
  'delete': {
    hi: 'हटाएं',
    en: 'Delete'
  },
  'success': {
    hi: 'सफल',
    en: 'Success'
  },
  'error': {
    hi: 'त्रुटि',
    en: 'Error'
  },
  'retry': {
    hi: 'पुनः प्रयास करें',
    en: 'Retry'
  },
  'login_with_google': {
    hi: 'Google से लॉगिन करें',
    en: 'Sign in with Google'
  },
  'logout': {
    hi: 'लॉगआउट',
    en: 'Logout'
  },
  'customer_care': {
    hi: 'ग्राहक सेवा सहायता',
    en: 'Customer Care Support'
  },

  // Footer Highlights & Info
  'footer_certified': {
    hi: '100% प्रामाणिक उत्पाद',
    en: '100% Genuine Products'
  },
  'footer_certified_sub': {
    hi: 'सीधे अधिकृत कंपनियों से आपूर्ति',
    en: 'Directly sourced from authorized manufacturers'
  },
  'footer_expert': {
    hi: 'मुफ़्त कृषि विशेषज्ञ सलाह',
    en: 'Free Agri Expert Advice'
  },
  'footer_expert_sub': {
    hi: 'हर समस्या का वैज्ञानिक समाधान',
    en: 'Scientific solution to every problem'
  },
  'footer_fast_delivery': {
    hi: 'सुरक्षित एवं तेज़ डिलीवरी',
    en: 'Safe & Fast Delivery'
  },
  'footer_fast_delivery_sub': {
    hi: 'सीधे आपके खेत और घर तक',
    en: 'Directly to your farm and doorstep'
  },
  'footer_support': {
    hi: 'समर्पित किसान सहायता',
    en: 'Dedicated Farmer Support'
  },
  'footer_support_sub': {
    hi: 'सुबह 8:00 से रात 8:00 बजे तक',
    en: '8:00 AM to 8:00 PM Daily'
  },
  'quick_links': {
    hi: 'त्वरित लिंक्स',
    en: 'Quick Links'
  },
  'policies_title': {
    hi: 'नीतियां एवं नियम',
    en: 'Policies & Legal'
  },
  'contact_info_title': {
    hi: 'संपर्क एवं पता',
    en: 'Contact & Address'
  },
  'all_rights_reserved': {
    hi: 'सर्वाधिकार सुरक्षित',
    en: 'All Rights Reserved'
  }
};

/**
 * Universal bilingual phrase map for auto-translating common dynamic terms
 * (categories, units, common statuses, etc.)
 */
export const PHRASE_MAP: Record<string, string> = {
  // Common categories
  'कीटनाशक': 'Pesticides',
  'फफूंदनाशक': 'Fungicides',
  'खरपतवारनाशक': 'Herbicides',
  'उर्वरक': 'Fertilizers',
  'उर्वरक एवं खाद': 'Fertilizers & Manure',
  'बीज': 'Seeds',
  'कृषि यंत्र': 'Farm Equipment',
  'टॉनिक': 'Plant Tonics',
  'वृद्धि वर्धक': 'Growth Promoters',
  'जैविक खाद': 'Organic Manure',
  'कीट व रोग': 'Pests & Diseases',

  // Common units
  'लीटर': 'Liter',
  'मिली': 'ml',
  'किलोग्राम': 'Kg',
  'ग्राम': 'g',
  'पैकेट': 'Packet',
  'बोरी': 'Bag',
  'पीस': 'Piece',
  'बोतल': 'Bottle',
  'क्विंटल': 'Quintal',
  'एकड़': 'Acre',
  'बीघा': 'Bigha',
  'हेक्टेयर': 'Hectare',

  // Order statuses
  'लंबित': 'Pending',
  'स्वीकृत': 'Approved',
  'पैकिंग में': 'Packing',
  'रास्ते में': 'In Transit',
  'डिलीवर हो गया': 'Delivered',
  'रद्द': 'Cancelled',
  'सफल': 'Success',

  // Footer Highlights & Titles
  '100% असली व प्रमाणित': '100% Genuine & Certified',
  'सरकारी अनुज्ञा प्राप्त कृषि इनपुट्स': 'Govt Licensed Agri Inputs',
  '5,000+ संतुष्ट किसान': '5,000+ Happy Farmers',
  'मध्य प्रदेश का विश्वसनीय कृषि केंद्र': 'Trusted Agri Hub of MP',
  'सुरक्षित डोरस्टेप डिलीवरी': 'Secure Doorstep Delivery',
  'सीधे आपके खेत व घर तक पहुंच': 'Directly to your farm & doorstep',
  '24x7 AI व विशेषज्ञ सहायता': '24x7 AI & Expert Guidance',
  'फसल रोग व दवा की सही जानकारी': 'Accurate Crop Disease & Medicine Advisory',
  'फल्सावदिया बाजार': 'Falsawdiya Bazaar',
  'कृषि सेवाएं': 'Agri Services',
  'टूल्स व सहायता': 'Tools & Support',
  'नीतियां व सुरक्षा': 'Policies & Safety',
  'हेल्पलाइन व ऑर्डर सहायता': 'Helpline & Order Support',
  'मिस्ड कॉल या व्हाट्सएप करें': 'Call or WhatsApp',
  'हमसे सोशल मीडिया पर जुड़ें': 'Connect on Social Media',
  'सुरक्षित एवं प्रमाणित भुगतान गेटवे': '100% Safe Payments',
  'सर्वश्रेष्ठ डिजिटल किसान सेवा': 'Best Digital Farmer Service',

  // Agricultural Commodities (फसलें व उपज)
  'सोयाबीन': 'Soybean',
  'गेहूं': 'Wheat',
  'चना': 'Gram / Chickpea',
  'मक्का': 'Maize / Corn',
  'लहसुन': 'Garlic',
  'प्याज': 'Onion',
  'सरसों': 'Mustard',
  'कपास': 'Cotton',
  'धनिया': 'Coriander',
  'मेथी': 'Fenugreek',
  'अलसी': 'Flaxseed',
  'मसूर': 'Lentil',
  'उड़द': 'Black Gram',
  'मूंग': 'Green Gram',
  'तुअर': 'Pigeon Pea',
  'अरहर': 'Pigeon Pea',
  'आलू': 'Potato',
  'टमाटर': 'Tomato',
  'अदरक': 'Ginger',
  'मिर्च': 'Chilli',
  'तिल': 'Sesame',
  'ईसबगोल': 'Psyllium Husk',
  'सौंफ': 'Fennel Seed',
  'कलौंजी': 'Black Cumin',
  'अश्वगंधा': 'Ashwagandha',

  // Mandi card attributes
  'मॉडल भाव': 'Modal Price',
  'न्यूनतम': 'Min Price',
  'अधिकतम': 'Max Price',
  'गुणवत्ता': 'Quality',
  'आवक': 'Arrival',
  'सत्यापित': 'Verified',
  'डेटा स्रोत': 'Data Source',
  'ऐप पर प्राप्ति समय': 'Fetched Time',
  'सरकारी AGMARKNET': 'Govt AGMARKNET',
  'मंडी पल्स (MandiPulse)': 'MandiPulse Backup',
  'सत्यापित मंडी रिपोर्ट': 'Verified Mandi Report',
  'आधार सांकेतिक भाव': 'Base Indicative Price',
  'लोकेशन और मंडी चुनें (Select Location)': 'Select State, District & Mandi',
  'राज्य (State)': 'State',
  'जिला (District)': 'District',
  'मंडी (Mandi Name)': 'Mandi Name',

  // Reverse mapping for English to Hindi lookups
  'Pesticides': 'कीटनाशक',
  'Fungicides': 'फफूंदनाशक',
  'Herbicides': 'खरपतवारनाशक',
  'Fertilizers': 'उर्वरक',
  'Seeds': 'बीज',
  'Farm Equipment': 'कृषि यंत्र',
  'In Stock': 'स्टॉक में उपलब्ध',
  'Out of Stock': 'स्टॉक खत्म',
  'Pending': 'लंबित',
  'Delivered': 'डिलीवर हो गया',
  'Cancelled': 'रद्द'
};
