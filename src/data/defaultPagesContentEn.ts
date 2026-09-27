import { LegalPagesContent } from '../types';

export const DEFAULT_LEGAL_PAGES_CONTENT_EN: Required<LegalPagesContent> = {
  aboutUs: {
    bannerTitle: 'About Us',
    bannerSubtitle: 'Falsawdiya Krishi Bazaar - Farmer Trust, Our Identity',
    introText: 'Falsawdiya Krishi Bazaar is a premier agricultural service center and digital platform dedicated to empowering farmers with certified high-quality inputs, honest transparent pricing, and scientific crop advisory.',
    missionTitle: 'Our Mission',
    missionText: 'To provide farmers with genuine, sealed agricultural inputs (seeds, fertilizers, crop protection) at fair prices, provide scientific crop care guidance, and bring modern agri-technology to every farmer\'s field.',
    visionTitle: 'Our Vision',
    visionText: 'To be the most trusted agricultural center across Shamgarh and surrounding regions, lowering farmer input costs and boosting productivity through transparent trade and digital innovation.',
    storyTitle: 'Our Journey & Background',
    storyText: 'Falsawdiya Krishi Bazaar was founded with a profound commitment to delivering 100% original, effective inputs to farmers. Located at Dimple Square, Shamgarh (Mandsaur), our center serves thousands of farming families with pride.',
    services: [
      { id: 's1', title: 'Certified Seeds', desc: 'Factory-sealed certified seeds with superior germination rates and high yield potential.' },
      { id: 's2', title: 'Fertilizers & Nutrition', desc: 'Balanced crop nutrition including NPK, water-soluble fertilizers, micronutrients, and bio-fertilizers.' },
      { id: 's3', title: 'Crop Protection Chemicals', desc: 'Comprehensive range of insecticides, fungicides, herbicides, and plant growth regulators (PGR).' },
      { id: 's4', title: 'AI Crop Doctor & Digital Advisory', desc: 'Instant disease identification from crop photos and verified scientific prevention protocols.' },
      { id: 's5', title: 'Agri Implements & Sprayers', desc: 'Battery-operated sprayers, high-pressure nozzles, delivery pipes, and modern field equipment.' },
      { id: 's6', title: 'Home & Field Delivery', desc: 'Safe, prompt doorstep delivery to farms across Shamgarh town and rural farming villages.' }
    ],
    highlights: [
      '100% Genuine, Sealed Products Guarantee',
      'CIBRC & Ministry of Agriculture Approved Brands',
      'Authentic GST Invoices on Every Purchase',
      'Free Scientific Guidance on Exact Chemical Dosages',
      'Swift Doorstep Delivery in Shamgarh Region'
    ],
    founderName: 'Falsawdiya Family',
    founderRole: 'Agri Center Directors & Operations Team',
    founderMessage: 'We believe that farmer prosperity is the true foundation of our nation. We maintain an unbreakable bond of trust with every farming family.',
    sections: [
      {
        id: 'sec_about_store',
        title: 'Store Location & Working Hours',
        content: 'Dimple Square, Near Kshatriya Khati Manglik Bhavan, Shamgarh, District Mandsaur (M.P.) - 458883. Open every day from 08:00 AM to 08:00 PM.'
      }
    ]
  },

  privacyPolicy: {
    bannerTitle: 'Privacy Policy',
    bannerSubtitle: 'Privacy & Data Protection Policy',
    lastUpdated: '24 August 2026',
    introText: 'Falsawdiya Krishi Bazaar prioritizes your personal privacy. This Privacy Policy outlines how we collect, use, and protect your information when you access our mobile app, website, or digital services.',
    contactEmail: 'yashfalsawdiya36@gmail.com',
    contactPhone: '8982338046',
    sections: [
      {
        id: 'p1',
        title: '1. What Information Do We Collect?',
        content: 'When you browse our app, place orders, or request agricultural services, the following information may be collected:',
        bullets: [
          'Name and Contact Details',
          'Mobile Number and Email Address',
          'Delivery Address and Postal PIN Code',
          'Order History and Cart Items',
          'Crop Photos uploaded for disease diagnosis',
          'Customer Support Chat & Call Inquiries'
        ]
      },
      {
        id: 'p2',
        title: '2. How We Use Your Information',
        content: 'We use your information exclusively to provide and improve our services:',
        bullets: [
          'Processing orders, generating GST bills, and fulfilling deliveries',
          'Crop disease diagnosis and personalized AI farming advice',
          'Sending order tracking updates, daily mandi bhav, and weather alerts',
          'Customer support and query resolution',
          'Adhering to statutory standards and security requirements'
        ]
      },
      {
        id: 'p3',
        title: '3. Data Security & Confidentiality',
        content: 'We employ robust technical encryption and data protection protocols. We never sell, rent, or trade your personal information to third parties for commercial advertising.'
      },
      {
        id: 'p4',
        title: '4. Payment Security',
        content: 'Online digital payments are securely processed through encrypted UPI channels. We never store or handle your UPI PIN, banking passwords, or card CVV numbers.'
      },
      {
        id: 'p5',
        title: '5. User Rights & Data Control',
        content: 'You can update your profile details at any time, manage security settings, or contact customer support to request deletion of your account records.'
      }
    ]
  },

  termsConditions: {
    bannerTitle: 'Terms & Conditions',
    bannerSubtitle: 'Rules & Terms of Use',
    lastUpdated: '24 August 2026',
    introText: 'Please read these Terms & Conditions carefully prior to using the Falsawdiya Krishi Bazaar app or services. Accessing or using our platform signifies your complete acceptance of these terms.',
    governingLaw: 'Mandsaur (Madhya Pradesh) Jurisdiction',
    sections: [
      {
        id: 't1',
        title: '1. Platform Overview & Permitted Use',
        content: 'Falsawdiya Krishi Bazaar is an agri-commerce and farmer support portal allowing farmers to browse certified products, order inputs, and receive crop advisory.'
      },
      {
        id: 't2',
        title: '2. Product Specifications & Availability',
        content: 'We make every reasonable effort to keep technical data, packaging photos, and prices accurate. Minor formulation or packaging variations may occur due to manufacturer batch changes.'
      },
      {
        id: 't3',
        title: '3. Orders, Pricing & Payment Modes',
        content: 'Orders are confirmed upon submission. All prices are listed in Indian Rupees (₹). Payments can be made via Cash on Delivery (COD) or instant digital UPI.'
      },
      {
        id: 't4',
        title: '4. Delivery & Receipt Guidelines',
        content: 'Deliveries are completed across Shamgarh and designated rural zones. Verifying container seals and expiry dates upon receipt is the customer\'s responsibility.'
      },
      {
        id: 't5',
        title: '5. Chemical Safety & Responsible Use',
        content: 'Pesticides, fungicides, and weedicides must always be mixed and applied in strict accordance with container labels, CIBRC guidelines, and protective safety equipment.'
      },
      {
        id: 't6',
        title: '6. Intellectual Property Rights',
        content: 'All app content, logos, graphics, and branding are the property of Falsawdiya Krishi Bazaar. Any unauthorized copying or automated scraping is prohibited.'
      }
    ]
  },

  refundPolicy: {
    bannerTitle: 'Return, Refund & Cancellation Policy',
    bannerSubtitle: 'Return, Refund & Order Cancellation Guidelines',
    lastUpdated: '25 August 2026',
    introText: 'Falsawdiya Krishi Bazaar is committed to providing 100% original, premium agricultural inputs to our farmers. If you need to cancel an accidental order or request a return, our policy is explained below:',
    returnWindowText: 'Within 24 to 48 hours of delivery',
    nonReturnableConditions: [
      'Packet or bottle seal broken or opened after delivery',
      'Product partially or completely consumed in field application',
      'Original invoice, batch label, or barcode missing',
      'Damage resulting from improper chemical storage or mishandling'
    ],
    refundProcessText: 'Following cancellation or return verification, refund amounts are credited back directly to the original payment source (UPI / Bank Account) within 24 to 48 hours.',
    sections: [
      {
        id: 'r1',
        title: '1. Order Cancellation Rules',
        content: 'Customers can request order cancellation directly from "My Orders / Order Details":',
        bullets: [
          'Before Dispatch (Placed / Confirmed): 100% full refund (Product price + Delivery fee) is returned to your original payment account.',
          'After Dispatch (Shipped / Out for Delivery): Due to logistics transit handover, standard delivery costs are deducted and eligible product value is refunded.',
          'After Delivery (Delivered): Standard return and replacement terms apply instead of order cancellation.'
        ]
      },
      {
        id: 'r2',
        title: '2. Refund Calculation Guidelines',
        content: 'Calculation of refundable amounts upon order cancellation:',
        bullets: [
          'Pre-dispatch cancellation = 100% Full Refund',
          'In-transit cancellation = Product Cost Refund (Standard delivery transit fee deducted)',
          'Damaged on delivery = 100% Instant Free Replacement or Complete Refund'
        ]
      }
    ]
  },

  shippingPolicy: {
    bannerTitle: 'Shipping & Delivery Policy',
    bannerSubtitle: 'Doorstep & Field Delivery Across Shamgarh',
    lastUpdated: '25 August 2026',
    introText: 'Timely input application is vital for agricultural yield. We provide dedicated same-day and scheduled delivery across Shamgarh town and surrounding rural farming villages.',
    coverageAreaText: 'Shamgarh municipal area, Mandsaur district and adjoining rural villages',
    standardDeliveryTime: 'Within 2 to 6 hours for town addresses; 12 to 24 hours for rural farmland locations',
    sections: [
      {
        id: 'sh1',
        title: '1. Serviceable Delivery Areas',
        content: 'We deliver across Shamgarh city and surrounding rural panchayats within a 15 to 25 km perimeter.'
      },
      {
        id: 'sh2',
        title: '2. Delivery Charges & Free Shipping Thresholds',
        content: 'Free home delivery is provided on qualifying orders above ₹1,000. Nominal distance charges apply for smaller orders.'
      },
      {
        id: 'sh3',
        title: '3. Package Inspection at Handover',
        content: 'Customers should inspect sealed bottle caps, batch numbers, and expiry dates before accepting the parcel and making payment.'
      }
    ]
  },

  grievanceRedressal: {
    bannerTitle: 'Grievance Redressal Policy',
    bannerSubtitle: 'Farmer Grievance Redressal Mechanism',
    lastUpdated: '25 August 2026',
    introText: 'Falsawdiya Krishi Bazaar maintains an active, time-bound grievance mechanism to promptly resolve any farmer inquiries, order disputes, or input quality questions.',
    officerName: 'Yash Falsawdiya',
    officerDesignation: 'Grievance Officer & Store Operations Lead',
    officerEmail: 'yashfalsawdiya36@gmail.com',
    officerPhone: '8982338046',
    resolutionTimeframe: 'Acknowledgment within 24 hours; complete resolution within 48 to 72 hours',
    sections: [
      {
        id: 'gr1',
        title: '1. How to Submit a Grievance',
        content: 'Farmers can raise an issue through the in-app helpline call button, WhatsApp support, or by emailing yashfalsawdiya36@gmail.com.'
      },
      {
        id: 'gr2',
        title: '2. Resolution & Escalation Process',
        content: 'Every grievance receives an internal ticket. In case of suspected damaged or sub-standard inputs, batch testing and immediate replacement are prioritized.'
      }
    ]
  },

  aiDisclaimer: {
    bannerTitle: 'AI Advisory & Knowledge Disclaimer',
    bannerSubtitle: 'AI Recommendations & Farm Advisory Disclaimer',
    lastUpdated: '25 August 2026',
    introText: 'Our AI Crop Doctor, Voice Advisor, and Knowledge Base provide automated recommendations based on crop symptoms and uploaded plant images. Please review these parameters regarding AI-assisted farming decisions.',
    sections: [
      {
        id: 'ai1',
        title: '1. Informational & Advisory Purpose',
        content: 'AI insights are intended to assist farmers with rapid preliminary identification and scientific references. They do not replace physical on-field agronomist inspections.'
      },
      {
        id: 'ai2',
        title: '2. Dosage Verification & Safe Usage',
        content: 'Always double-check recommended chemical dosages against crop growth stages, weather conditions, water pH, and product container labels prior to field spraying.'
      }
    ]
  },

  licensingDisclaimer: {
    bannerTitle: 'Licensing & Quality Disclaimers',
    bannerSubtitle: 'Government Authorized Licenses & Genuine Quality Guarantee',
    lastUpdated: '25 August 2026',
    introText: 'Falsawdiya Krishi Bazaar holds verified retail licenses for seeds, fertilizers, and pesticides issued by the Department of Agriculture, Government of Madhya Pradesh.',
    sections: [
      {
        id: 'lic_sec_1',
        title: '1. Statutory Regulatory Compliance',
        content: 'All operations strictly comply with the Insecticides Act 1968, Fertilizer Control Order (FCO) 1985, and Seeds Act 1966.'
      },
      {
        id: 'lic_sec_2',
        title: '2. 100% Original Sealed Packaging Guarantee',
        content: 'All inputs on our platform are sourced exclusively from authorized manufacturers in original factory-sealed packaging.'
      }
    ]
  }
};
