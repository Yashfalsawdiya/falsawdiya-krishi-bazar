import { Product, CropAdvice, CategoryData } from '../types';

export const CATEGORIES: CategoryData[] = [
  { id: 'seeds', name: 'बीज (Seeds)', icon: '🌱', order: 1 },
  { id: 'fertilizers', name: 'खाद (Fertilizers)', icon: '🧪', order: 2 },
  { id: 'pesticides', name: 'कीटनाशक (Pesticides)', icon: '🪲', order: 3 },
  { id: 'fungicides', name: 'फफूंदनाशक (Fungicides)', icon: '🍄', order: 4 },
  { id: 'herbicides', name: 'खरपतवारनाशक (Herbicides)', icon: '🌿', order: 5 },
  { id: 'medicines', name: 'कृषि दवाइयाँ (Medicines)', icon: '💊', order: 6 },
  { id: 'implements', name: 'कृषि यंत्र (Implements)', icon: '⚙️', order: 7 },
];

export const PRODUCTS: Product[] = [];

export const CROP_ADVICE: CropAdvice[] = [
  {
    id: 'soybean',
    name: 'Soybean',
    hindiName: 'सोयाबीन',
    image: '',
    stages: [
      {
        stage: 'Sowing (बुवाई)',
        hindiStage: 'बुवाई (Sowing)',
        advice: 'Use treated seeds and apply basal dose of DAP. उपचारित बीजों का उपयोग करें और डीएपी की आधार खुराक डालें।',
        products: ['Soybean Seed JS-2034', 'DAP Fertilizer']
      },
      {
        stage: 'Vegetative (वानस्पतिक)',
        hindiStage: 'वानस्पतिक अवस्था (Vegetative)',
        advice: 'Spray for girdle beetle and semi-looper. गर्डल बीटल और सेमी-लूपर के लिए स्प्रे करें।',
        products: ['Chlorpyrifos', 'Imidacloprid']
      }
    ]
  },
  {
    id: 'garlic',
    name: 'Garlic',
    hindiName: 'लहसुन',
    image: '',
    stages: [
      {
        stage: 'Bulb Formation (कंद बनना)',
        hindiStage: 'कंद बनना (Bulb Formation)',
        advice: 'Apply potash and maintain moisture. पोटाश डालें और नमी बनाए रखें।',
        products: ['MOP Fertilizer', 'Garlic Special Medicine']
      }
    ]
  },
  {
    id: 'wheat',
    name: 'Wheat',
    hindiName: 'गेहूँ',
    image: '',
    stages: [
      {
        stage: 'CRI Stage (जड़ विकास)',
        hindiStage: 'जड़ विकास अवस्था (CRI Stage)',
        advice: 'First irrigation is critical at this stage. इस अवस्था में पहली सिंचाई बहुत महत्वपूर्ण है।',
        products: ['Urea', 'Zinc Sulfate']
      }
    ]
  },
  {
    id: 'orange',
    name: 'Orange',
    hindiName: 'संतरा',
    image: '',
    stages: [
      {
        stage: 'Flowering (फूल आना)',
        hindiStage: 'फूल आने की अवस्था (Flowering)',
        advice: 'Avoid heavy irrigation during flowering. फूल आने के दौरान भारी सिंचाई से बचें।',
        products: ['Planofix', 'Micronutrients']
      }
    ]
  }
];
