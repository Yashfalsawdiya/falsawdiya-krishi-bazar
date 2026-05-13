export interface CategoryData {
  id: string;
  name: string;
  icon: string;
  fallbackIcon?: string;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  hindiName: string;
  category: string;
  brand: string;
  price: number;
  hidePrice?: boolean;
  unit: string;
  image: string;
  description: string;
  crops: string[];
}

export interface CropAdvice {
  id: string;
  name: string;
  hindiName: string;
  image: string;
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
  image: string;
  relatedProductIds: string[];
}
