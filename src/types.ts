export interface ImageSource {
  primary: string;
  fallback: string;
}

export interface CategoryData {
  id: string;
  name: string;
  icon: string | ImageSource; // Supporting legacy string icon or new dual source
  order: number;
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
