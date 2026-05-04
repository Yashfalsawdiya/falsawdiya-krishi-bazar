export type Category = 'seeds' | 'fertilizers' | 'pesticides' | 'fungicides' | 'herbicides' | 'medicines' | 'implements';

export interface Product {
  id: string;
  name: string;
  hindiName: string;
  category: Category;
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
