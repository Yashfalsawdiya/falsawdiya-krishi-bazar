import { Product, CropAdvice, Category } from '../types';

export const CATEGORIES: { id: Category; name: string; icon: string }[] = [
  { id: 'seeds', name: 'बीज (Seeds)', icon: '🌱' },
  { id: 'fertilizers', name: 'खाद (Fertilizers)', icon: '🧪' },
  { id: 'pesticides', name: 'कीटनाशक (Pesticides)', icon: '🪲' },
  { id: 'fungicides', name: 'फफूंदनाशक (Fungicides)', icon: '🍄' },
  { id: 'herbicides', name: 'खरपतवारनाशक (Herbicides)', icon: '🌿' },
  { id: 'medicines', name: 'कृषि दवाइयाँ (Medicines)', icon: '💊' },
  { id: 'implements', name: 'कृषि यंत्र (Implements)', icon: '⚙️' },
];

export const PRODUCTS: Product[] = [
  // --- SEEDS (20) ---
  { id: 's1', name: 'JS 20-34 Soybean', hindiName: 'सोयाबीन बीज JS 20-34', category: 'seeds', brand: 'Eagle Seeds', price: 4200, unit: '30kg Bag', image: 'https://images.unsplash.com/photo-1594644435-946443513146?auto=format&fit=crop&q=80&w=400', description: 'Early maturing variety, popular in Malwa.', crops: ['Soybean'] },
  { id: 's2', name: 'JS 95-60 Soybean', hindiName: 'सोयाबीन बीज JS 95-60', category: 'seeds', brand: 'Mahyco', price: 4500, unit: '30kg Bag', image: 'https://images.unsplash.com/photo-1594644435-946443513146?auto=format&fit=crop&q=80&w=400', description: 'High yield, short duration.', crops: ['Soybean'] },
  { id: 's3', name: 'RVS 2024 Soybean', hindiName: 'सोयाबीन बीज RVS 2024', category: 'seeds', brand: 'Government Certified', price: 4800, unit: '30kg Bag', image: 'https://images.unsplash.com/photo-1594644435-946443513146?auto=format&fit=crop&q=80&w=400', description: 'New variety with disease resistance.', crops: ['Soybean'] },
  { id: 's4', name: 'GW 322 Wheat', hindiName: 'गेहूँ बीज GW 322', category: 'seeds', brand: 'Shakti Vardhak', price: 2800, unit: '40kg Bag', image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=400', description: 'Most popular wheat variety in Mandsaur.', crops: ['Wheat'] },
  { id: 's5', name: 'GW 273 Wheat', hindiName: 'गेहूँ बीज GW 273', category: 'seeds', brand: 'Nuziveedu', price: 2600, unit: '40kg Bag', image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=400', description: 'Good for chapati quality.', crops: ['Wheat'] },
  { id: 's6', name: 'Lok-1 Wheat', hindiName: 'गेहूँ बीज लोक-1', category: 'seeds', brand: 'Ajeet Seeds', price: 2500, unit: '40kg Bag', image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=400', description: 'Traditional high quality wheat.', crops: ['Wheat'] },
  { id: 's7', name: 'G-2 Garlic Bulbs', hindiName: 'लहसुन बीज G-2', category: 'seeds', brand: 'Local Selection', price: 12000, unit: '100kg', image: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=400', description: 'Export quality garlic bulbs.', crops: ['Garlic'] },
  { id: 's8', name: 'Amleta Garlic', hindiName: 'अमलेटा लहसुन बीज', category: 'seeds', brand: 'Local Selection', price: 15000, unit: '100kg', image: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=400', description: 'Big bulb size, high demand.', crops: ['Garlic'] },
  { id: 's9', name: 'Pioneer Maize 3396', hindiName: 'पायनियर मक्का 3396', category: 'seeds', brand: 'Pioneer', price: 1800, unit: '4kg Bag', image: 'https://images.unsplash.com/photo-1551727041-5b347d65b633?auto=format&fit=crop&q=80&w=400', description: 'Hybrid maize for high yield.', crops: ['Maize'] },
  { id: 's10', name: 'Monsanto Dekalb 9108', hindiName: 'डेकाल्ब मक्का 9108', category: 'seeds', brand: 'Bayer', price: 1750, unit: '4kg Bag', image: 'https://images.unsplash.com/photo-1551727041-5b347d65b633?auto=format&fit=crop&q=80&w=400', description: 'Drought tolerant hybrid.', crops: ['Maize'] },
  { id: 's11', name: 'Gram RVG 202', hindiName: 'चना बीज RVG 202', category: 'seeds', brand: 'Government Certified', price: 5500, unit: '30kg Bag', image: 'https://images.unsplash.com/photo-1515942400420-2b98fed1f515?auto=format&fit=crop&q=80&w=400', description: 'Bold grain variety.', crops: ['Gram'] },
  { id: 's12', name: 'Gram Dollar (Kabuli)', hindiName: 'डॉलर चना (काबुली)', category: 'seeds', brand: 'Local Selection', price: 9000, unit: '50kg Bag', image: 'https://images.unsplash.com/photo-1515942400420-2b98fed1f515?auto=format&fit=crop&q=80&w=400', description: 'Premium kabuli gram.', crops: ['Gram'] },
  { id: 's13', name: 'Mustard Pioneer 45S46', hindiName: 'सरसों पायनियर 45S46', category: 'seeds', brand: 'Pioneer', price: 950, unit: '1kg', image: 'https://images.unsplash.com/photo-1508013861974-9f6347163835?auto=format&fit=crop&q=80&w=400', description: 'High oil content.', crops: ['Mustard'] },
  { id: 's14', name: 'Mustard Advanta 414', hindiName: 'सरसों एडवांन्टा 414', category: 'seeds', brand: 'Advanta', price: 880, unit: '1kg', image: 'https://images.unsplash.com/photo-1508013861974-9f6347163835?auto=format&fit=crop&q=80&w=400', description: 'Popular hybrid mustard.', crops: ['Mustard'] },
  { id: 's15', name: 'Onion Panchaganga', hindiName: 'प्याज बीज पंचगंगा', category: 'seeds', brand: 'Panchaganga', price: 1200, unit: '500g', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400', description: 'Dark red onion variety.', crops: ['Onion'] },
  { id: 's16', name: 'Onion Kalash', hindiName: 'प्याज बीज कलश', category: 'seeds', brand: 'Kalash Seeds', price: 1100, unit: '500g', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400', description: 'Good storage life.', crops: ['Onion'] },
  { id: 's17', name: 'Coriander Pant Haritma', hindiName: 'धनिया बीज पंत हरितमा', category: 'seeds', brand: 'Government Certified', price: 350, unit: '1kg', image: 'https://images.unsplash.com/photo-1588877329622-d007d573f299?auto=format&fit=crop&q=80&w=400', description: 'High aroma variety.', crops: ['Coriander'] },
  { id: 's18', name: 'Fenugreek (Methi) RMT-1', hindiName: 'मेथी बीज RMT-1', category: 'seeds', brand: 'Local Selection', price: 150, unit: '1kg', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Popular in Mandsaur region.', crops: ['Fenugreek'] },
  { id: 's19', name: 'Chilli US 341', hindiName: 'मिर्च बीज US 341', category: 'seeds', brand: 'Nunhems', price: 1400, unit: '10g', image: 'https://images.unsplash.com/photo-1588253518679-1299145f09e3?auto=format&fit=crop&q=80&w=400', description: 'High pungency hybrid.', crops: ['Chilli'] },
  { id: 's20', name: 'Tomato Abhilash', hindiName: 'टमाटर बीज अभिलाष', category: 'seeds', brand: 'Seminis', price: 650, unit: '10g', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Long distance transport variety.', crops: ['Tomato'] },

  // --- FERTILIZERS (20) ---
  { id: 'f1', name: 'IFFCO DAP', hindiName: 'इफको डीएपी (DAP)', category: 'fertilizers', brand: 'IFFCO', price: 1350, unit: '50kg Bag', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Essential for root development.', crops: ['All Crops'] },
  { id: 'f2', name: 'IFFCO Urea', hindiName: 'इफको यूरिया (Urea)', category: 'fertilizers', brand: 'IFFCO', price: 266, unit: '45kg Bag', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Nitrogen source for growth.', crops: ['All Crops'] },
  { id: 'f3', name: 'IFFCO NPK 12:32:16', hindiName: 'इफको एनपीके 12:32:16', category: 'fertilizers', brand: 'IFFCO', price: 1470, unit: '50kg Bag', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Balanced nutrition.', crops: ['All Crops'] },
  { id: 'f4', name: 'IFFCO NPK 19:19:19', hindiName: 'इफको एनपीके 19:19:19', category: 'fertilizers', brand: 'IFFCO', price: 150, unit: '1kg', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Water soluble fertilizer.', crops: ['All Crops'] },
  { id: 'f5', name: 'Coromandel Gromor 14:35:14', hindiName: 'ग्रोमोर 14:35:14', category: 'fertilizers', brand: 'Coromandel', price: 1550, unit: '50kg Bag', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'High phosphorus content.', crops: ['All Crops'] },
  { id: 'f6', name: 'Coromandel Gromor 10:26:26', hindiName: 'ग्रोमोर 10:26:26', category: 'fertilizers', brand: 'Coromandel', price: 1450, unit: '50kg Bag', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'High potash content.', crops: ['Potatoes', 'Garlic'] },
  { id: 'f7', name: 'MOP (Potash)', hindiName: 'एमओपी (पोटाश)', category: 'fertilizers', brand: 'IPL', price: 1700, unit: '50kg Bag', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Improves crop quality and resistance.', crops: ['Garlic', 'Wheat'] },
  { id: 'f8', name: 'Bentonite Sulphur', hindiName: 'बेंटोनाइट सल्फर', category: 'fertilizers', brand: 'Mahadhan', price: 850, unit: '10kg', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Essential for oilseeds.', crops: ['Soybean', 'Mustard'] },
  { id: 'f9', name: 'Zinc Sulfate 33%', hindiName: 'जिंक सल्फेट 33%', category: 'fertilizers', brand: 'Aries', price: 450, unit: '4kg', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Corrects zinc deficiency.', crops: ['Wheat', 'Maize'] },
  { id: 'f10', name: 'Magnesium Sulfate', hindiName: 'मैग्नीशियम सल्फेट', category: 'fertilizers', brand: 'Multiplex', price: 350, unit: '10kg', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Improves chlorophyll.', crops: ['Orange', 'Vegetables'] },
  { id: 'f11', name: 'Boron 20%', hindiName: 'बोरॉन 20%', category: 'fertilizers', brand: 'Tata Rallis', price: 280, unit: '250g', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Prevents fruit cracking.', crops: ['Orange', 'Tomato'] },
  { id: 'f12', name: 'Ferrous Sulfate', hindiName: 'फेरस सल्फेट', category: 'fertilizers', brand: 'Aries', price: 220, unit: '5kg', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Corrects iron deficiency.', crops: ['All Crops'] },
  { id: 'f13', name: 'Calcium Nitrate', hindiName: 'कैल्शियम नाइट्रेट', category: 'fertilizers', brand: 'YaraLiva', price: 1200, unit: '25kg', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Strengthens cell walls.', crops: ['Orange', 'Garlic'] },
  { id: 'f14', name: 'Humic Acid 98%', hindiName: 'ह्यूमिक एसिड 98%', category: 'fertilizers', brand: 'V-Hume', price: 450, unit: '500g', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Improves soil structure.', crops: ['All Crops'] },
  { id: 'f15', name: 'Seaweed Extract', hindiName: 'सीवीड एक्सट्रैक्ट (Sagarika)', category: 'fertilizers', brand: 'IFFCO', price: 550, unit: '1L', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Natural growth promoter.', crops: ['All Crops'] },
  { id: 'f16', name: 'SSP (Single Super Phosphate)', hindiName: 'एसएसपी (खाद)', category: 'fertilizers', brand: 'Rama Phosphates', price: 550, unit: '50kg Bag', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Source of P, S and Ca.', crops: ['Soybean', 'Garlic'] },
  { id: 'f17', name: 'Prom (Phosphate Rich Organic Manure)', hindiName: 'प्रोम (PROM)', category: 'fertilizers', brand: 'Udaipur Phosphates', price: 650, unit: '50kg Bag', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Organic alternative to DAP.', crops: ['All Crops'] },
  { id: 'f18', name: 'Liquid Nano Urea', hindiName: 'नैनो यूरिया (Liquid)', category: 'fertilizers', brand: 'IFFCO', price: 240, unit: '500ml', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Advanced nitrogen delivery.', crops: ['All Crops'] },
  { id: 'f19', name: 'Liquid Nano DAP', hindiName: 'नैनो डीएपी (Liquid)', category: 'fertilizers', brand: 'IFFCO', price: 600, unit: '500ml', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Advanced phosphorus delivery.', crops: ['All Crops'] },
  { id: 'f20', name: 'Potassium Schoenite', hindiName: 'पोटेशियम शोनाइट', category: 'fertilizers', brand: 'IFFCO', price: 950, unit: '25kg', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=400', description: 'Source of K and Mg.', crops: ['All Crops'] },

  // --- PESTICIDES (20) ---
  { id: 'p1', name: 'Confidor', hindiName: 'कॉन्फिडोर (Confidor)', category: 'pesticides', brand: 'Bayer', price: 450, unit: '100ml', image: 'https://5.imimg.com/data5/SELLER/Default/2021/6/XF/XN/XN/131464435/bayer-confidor-insecticide-500x500.jpg', description: 'Best for sucking pests.', crops: ['Soybean', 'Chilli'] },
  { id: 'p2', name: 'Coragen', hindiName: 'कोराजन (Coragen)', category: 'pesticides', brand: 'FMC', price: 1850, unit: '150ml', image: 'https://5.imimg.com/data5/SELLER/Default/2021/6/XF/XN/XN/131464435/fmc-coragen-insecticide-500x500.jpg', description: 'Best for caterpillars.', crops: ['Soybean', 'Maize'] },
  { id: 'p3', name: 'Alika', hindiName: 'अलीका (Alika)', category: 'pesticides', brand: 'Syngenta', price: 850, unit: '200ml', image: 'https://5.imimg.com/data5/SELLER/Default/2021/6/XF/XN/XN/131464435/syngenta-alika-insecticide-500x500.jpg', description: 'Dual action insecticide.', crops: ['Soybean', 'Cotton'] },
  { id: 'p4', name: 'Solomon', hindiName: 'सोलोमन (Solomon)', category: 'pesticides', brand: 'Bayer', price: 950, unit: '250ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Effective against multiple pests.', crops: ['Soybean', 'Vegetables'] },
  { id: 'p5', name: 'Belt Expert', hindiName: 'बेल्ट एक्सपर्ट', category: 'pesticides', brand: 'Bayer', price: 1200, unit: '250ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Broad spectrum insecticide.', crops: ['Soybean', 'Chilli'] },
  { id: 'p6', name: 'Ampligo', hindiName: 'एम्पलीगो (Ampligo)', category: 'pesticides', brand: 'Syngenta', price: 1650, unit: '200ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Fast acting caterpillar control.', crops: ['Soybean', 'Maize'] },
  { id: 'p7', name: 'Delegate', hindiName: 'डेलीगेट (Delegate)', category: 'pesticides', brand: 'Corteva', price: 2100, unit: '180ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Specialist for thrips and larvae.', crops: ['Chilli', 'Soybean'] },
  { id: 'p8', name: 'Exalt', hindiName: 'एक्साल्ट (Exalt)', category: 'pesticides', brand: 'Corteva', price: 1950, unit: '180ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Effective against Fall Armyworm.', crops: ['Maize'] },
  { id: 'p9', name: 'Largo', hindiName: 'लार्गो (Largo)', category: 'pesticides', brand: 'Dhanuka', price: 1450, unit: '180ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Controls various caterpillars.', crops: ['Soybean', 'Cotton'] },
  { id: 'p10', name: 'Pegasus', hindiName: 'पेगासस (Pegasus)', category: 'pesticides', brand: 'Syngenta', price: 1150, unit: '250g', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Best for whitefly and mites.', crops: ['Chilli', 'Cotton'] },
  { id: 'p11', name: 'Oberon', hindiName: 'ओबेरॉन (Oberon)', category: 'pesticides', brand: 'Bayer', price: 980, unit: '200ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Excellent miticide.', crops: ['Chilli', 'Vegetables'] },
  { id: 'p12', name: 'Rogor', hindiName: 'रोगोर (Rogor)', category: 'pesticides', brand: 'Tata Rallis', price: 320, unit: '500ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Classic systemic insecticide.', crops: ['Vegetables'] },
  { id: 'p13', name: 'Ekalux', hindiName: 'एकालक्स (Ekalux)', category: 'pesticides', brand: 'Syngenta', price: 450, unit: '500ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Contact insecticide.', crops: ['Soybean', 'Wheat'] },
  { id: 'p14', name: 'Profex Super', hindiName: 'प्रोफेक्स सुपर', category: 'pesticides', brand: 'Nagarjuna', price: 650, unit: '500ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Combination insecticide.', crops: ['Soybean', 'Cotton'] },
  { id: 'p15', name: 'Hamla 550', hindiName: 'हमला 550', category: 'pesticides', brand: 'Gharda', price: 580, unit: '500ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Effective against bollworms.', crops: ['Cotton', 'Soybean'] },
  { id: 'p16', name: 'Lancer Gold', hindiName: 'लांसर गोल्ड', category: 'pesticides', brand: 'UPL', price: 850, unit: '500g', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Systemic and contact insecticide.', crops: ['Soybean', 'Cotton'] },
  { id: 'p17', name: 'Uala', hindiName: 'उलाला (Ulala)', category: 'pesticides', brand: 'UPL', price: 1100, unit: '250g', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Best for whitefly control.', crops: ['Cotton', 'Chilli'] },
  { id: 'p18', name: 'Police', hindiName: 'पुलिस (Police)', category: 'pesticides', brand: 'Gharda', price: 750, unit: '250g', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Effective against sucking pests.', crops: ['Soybean', 'Chilli'] },
  { id: 'p19', name: 'Jump', hindiName: 'जम्प (Jump)', category: 'pesticides', brand: 'Bayer', price: 350, unit: '40g', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Specialist for thrips.', crops: ['Chilli', 'Garlic'] },
  { id: 'p20', name: 'Benevia', hindiName: 'बेनेविया (Benevia)', category: 'pesticides', brand: 'FMC', price: 2450, unit: '180ml', image: 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400', description: 'Premium sucking pest control.', crops: ['Vegetables'] },

  // --- FUNGICIDES (20) ---
  { id: 'fu1', name: 'Amistar Top', hindiName: 'एमिस्टार टॉप', category: 'fungicides', brand: 'Syngenta', price: 1250, unit: '200ml', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Broad spectrum fungicide.', crops: ['Soybean', 'Wheat'] },
  { id: 'fu2', name: 'Saaf', hindiName: 'साफ (Saaf)', category: 'fungicides', brand: 'UPL', price: 180, unit: '250g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Systemic and contact fungicide.', crops: ['Garlic', 'Soybean'] },
  { id: 'fu3', name: 'Nativo', hindiName: 'नेटिवो (Nativo)', category: 'fungicides', brand: 'Bayer', price: 950, unit: '100g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Premium fungicide for yield.', crops: ['Soybean', 'Rice'] },
  { id: 'fu4', name: 'Custodia', hindiName: 'कस्टोडिया (Custodia)', category: 'fungicides', brand: 'Adama', price: 850, unit: '250ml', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Effective against various rots.', crops: ['Soybean', 'Vegetables'] },
  { id: 'fu5', name: 'Priaxor', hindiName: 'प्रियाक्सर (Priaxor)', category: 'fungicides', brand: 'BASF', price: 1450, unit: '180ml', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Advanced disease control.', crops: ['Soybean', 'Wheat'] },
  { id: 'fu6', name: 'Opera', hindiName: 'ओपेरा (Opera)', category: 'fungicides', brand: 'BASF', price: 1100, unit: '250ml', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Improves plant health.', crops: ['Soybean', 'Maize'] },
  { id: 'fu7', name: 'Sercadis Plus', hindiName: 'सरकाडिस प्लस', category: 'fungicides', brand: 'BASF', price: 1650, unit: '200ml', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Specialist for powdery mildew.', crops: ['Orange', 'Grapes'] },
  { id: 'fu8', name: 'Merivon', hindiName: 'मेरिवोन (Merivon)', category: 'fungicides', brand: 'BASF', price: 1850, unit: '200ml', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Premium fruit fungicide.', crops: ['Orange', 'Apple'] },
  { id: 'fu9', name: 'Score', hindiName: 'स्कोर (Score)', category: 'fungicides', brand: 'Syngenta', price: 650, unit: '100ml', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Systemic fungicide for spots.', crops: ['Vegetables', 'Fruits'] },
  { id: 'fu10', name: 'Kavach', hindiName: 'कवच (Kavach)', category: 'fungicides', brand: 'Syngenta', price: 450, unit: '250g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Contact fungicide.', crops: ['Potato', 'Tomato'] },
  { id: 'fu11', name: 'Ridomil Gold', hindiName: 'रिडोमिल गोल्ड', category: 'fungicides', brand: 'Syngenta', price: 850, unit: '250g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Best for downy mildew.', crops: ['Grapes', 'Vegetables'] },
  { id: 'fu12', name: 'Antracol', hindiName: 'एन्ट्राकोल (Antracol)', category: 'fungicides', brand: 'Bayer', price: 380, unit: '250g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Zinc based contact fungicide.', crops: ['Potato', 'Orange'] },
  { id: 'fu13', name: 'Aliette', hindiName: 'एलियट (Aliette)', category: 'fungicides', brand: 'Bayer', price: 750, unit: '250g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Systemic fungicide for roots.', crops: ['Orange', 'Vegetables'] },
  { id: 'fu14', name: 'Bavistin', hindiName: 'बाविस्टिन (Bavistin)', category: 'fungicides', brand: 'Crystal', price: 220, unit: '250g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Classic systemic fungicide.', crops: ['All Crops'] },
  { id: 'fu15', name: 'Carbendazim 50% WP', hindiName: 'कार्बेन्डाजिम 50%', category: 'fungicides', brand: 'Local Selection', price: 180, unit: '250g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Affordable systemic fungicide.', crops: ['All Crops'] },
  { id: 'fu16', name: 'M-45 (Mancozeb)', hindiName: 'एम-45 (Mancozeb)', category: 'fungicides', brand: 'Indofil', price: 150, unit: '250g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Widely used contact fungicide.', crops: ['All Crops'] },
  { id: 'fu17', name: 'Z-78 (Zineb)', hindiName: 'जेड-78 (Zineb)', category: 'fungicides', brand: 'Indofil', price: 160, unit: '250g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Contact fungicide.', crops: ['All Crops'] },
  { id: 'fu18', name: 'Copper Oxychloride', hindiName: 'कॉपर ऑक्सीक्लोराइड', category: 'fungicides', brand: 'Tata Rallis', price: 350, unit: '500g', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Effective against bacterial diseases.', crops: ['Orange', 'Tomato'] },
  { id: 'fu19', name: 'Hexaconazole 5% SC', hindiName: 'हेक्साकोनाजोल 5%', category: 'fungicides', brand: 'Dhanuka', price: 280, unit: '500ml', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Systemic fungicide for blast.', crops: ['Soybean', 'Rice'] },
  { id: 'fu20', name: 'Sulphur 80% WDG', hindiName: 'सल्फर 80% WDG', category: 'fungicides', brand: 'Excel', price: 180, unit: '1kg', image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=400', description: 'Fungicide and miticide.', crops: ['Garlic', 'Grapes'] },

  // --- HERBICIDES (20) ---
  { id: 'h1', name: 'Targa Super', hindiName: 'टार्गा सुपर', category: 'herbicides', brand: 'Dhanuka', price: 650, unit: '250ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Controls narrow leaf weeds.', crops: ['Soybean', 'Cotton'] },
  { id: 'h2', name: 'Pursuit', hindiName: 'परस्यूट (Pursuit)', category: 'herbicides', brand: 'BASF', price: 550, unit: '250ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Post-emergence herbicide.', crops: ['Soybean'] },
  { id: 'h3', name: 'Odyssey', hindiName: 'ओडिसी (Odyssey)', category: 'herbicides', brand: 'BASF', price: 850, unit: '40g', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Broad spectrum weed control.', crops: ['Soybean'] },
  { id: 'h4', name: 'Iris', hindiName: 'आइरिस (Iris)', category: 'herbicides', brand: 'FMC', price: 750, unit: '250ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Controls broad leaf weeds.', crops: ['Soybean'] },
  { id: 'h5', name: 'Strongarm', hindiName: 'स्ट्रॉन्गआर्म', category: 'herbicides', brand: 'Corteva', price: 600, unit: '12.4g', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Pre-emergence herbicide.', crops: ['Soybean'] },
  { id: 'h6', name: 'Shaked', hindiName: 'शाकेद (Shaked)', category: 'herbicides', brand: 'Adama', price: 950, unit: '500ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Combination herbicide.', crops: ['Soybean'] },
  { id: 'h7', name: 'Patela', hindiName: 'पटेला (Patela)', category: 'herbicides', brand: 'Dhanuka', price: 880, unit: '500ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Effective against multiple weeds.', crops: ['Soybean'] },
  { id: 'h8', name: 'Roundup', hindiName: 'राउंडअप (Roundup)', category: 'herbicides', brand: 'Bayer', price: 450, unit: '500ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Non-selective herbicide.', crops: ['Non-crop areas'] },
  { id: 'h9', name: 'Mera 71', hindiName: 'मेरा 71', category: 'herbicides', brand: 'Excel', price: 120, unit: '100g', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Systemic herbicide powder.', crops: ['Non-crop areas'] },
  { id: 'h10', name: 'Goal', hindiName: 'गोल (Goal)', category: 'herbicides', brand: 'Corteva', price: 350, unit: '100ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Pre-emergence for vegetables.', crops: ['Onion', 'Garlic'] },
  { id: 'h11', name: 'Oxyfluorfen 23.5% EC', hindiName: 'ऑक्सीफ्लोरोफेन 23.5%', category: 'herbicides', brand: 'Adama', price: 320, unit: '100ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Selective herbicide.', crops: ['Onion', 'Garlic'] },
  { id: 'h12', name: 'Topik', hindiName: 'टोपिक (Topik)', category: 'herbicides', brand: 'Syngenta', price: 450, unit: '160g', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Best for Phalaris minor.', crops: ['Wheat'] },
  { id: 'h13', name: 'Clodinafop Propargyl', hindiName: 'क्लोडिनाफॉप प्रोपार्गिल', category: 'herbicides', brand: 'Local Selection', price: 350, unit: '160g', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Affordable wheat herbicide.', crops: ['Wheat'] },
  { id: 'h14', name: '2,4-D Ethyl Ester', hindiName: '2,4-डी इथाइल एस्टर', category: 'herbicides', brand: 'Tata Rallis', price: 420, unit: '400g', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Broad leaf weed control.', crops: ['Wheat', 'Maize'] },
  { id: 'h15', name: 'Algrip', hindiName: 'अल्ग्रिप (Algrip)', category: 'herbicides', brand: 'DuPont', price: 150, unit: '8g', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Selective herbicide for wheat.', crops: ['Wheat'] },
  { id: 'h16', name: 'Atrazine 50% WP', hindiName: 'एट्राजीन 50%', category: 'herbicides', brand: 'Tata Rallis', price: 380, unit: '500g', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Pre-emergence for maize.', crops: ['Maize', 'Sugarcane'] },
  { id: 'h17', name: 'Pendimethalin 30% EC', hindiName: 'पेंडिमेथालिन 30%', category: 'herbicides', brand: 'BASF (Stomp)', price: 650, unit: '1L', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Broad spectrum pre-emergence.', crops: ['Soybean', 'Garlic'] },
  { id: 'h18', name: 'Valer 32', hindiName: 'वेलर 32 (Valer 32)', category: 'herbicides', brand: 'PI Industries', price: 1100, unit: '1L', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Advanced pre-emergence.', crops: ['Soybean'] },
  { id: 'h19', name: 'Nominee Gold', hindiName: 'नॉमिनी गोल्ड', category: 'herbicides', brand: 'PI Industries', price: 1250, unit: '100ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Best for rice weeds.', crops: ['Rice'] },
  { id: 'h20', name: 'Paraquat Dichloride', hindiName: 'पैराक्वाट डाईक्लोराइड', category: 'herbicides', brand: 'Syngenta (Gramoxone)', price: 480, unit: '500ml', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400', description: 'Contact non-selective herbicide.', crops: ['Non-crop areas'] },

  // --- MEDICINES/GROWTH PROMOTERS (20) ---
  { id: 'm1', name: 'Planofix', hindiName: 'प्लानोफिक्स (Planofix)', category: 'medicines', brand: 'Bayer', price: 120, unit: '100ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Prevents flower drop.', crops: ['Chilli', 'Tomato', 'Orange'] },
  { id: 'm2', name: 'Miraculan', hindiName: 'मिराकुलन (Miraculan)', category: 'medicines', brand: 'Adama', price: 250, unit: '250ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Plant growth regulator.', crops: ['All Crops'] },
  { id: 'm3', name: 'Lihocin', hindiName: 'लिहोसिन (Lihocin)', category: 'medicines', brand: 'BASF', price: 350, unit: '250ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Controls excessive growth.', crops: ['Soybean', 'Cotton'] },
  { id: 'm4', name: 'Cultar', hindiName: 'कलटार (Cultar)', category: 'medicines', brand: 'Syngenta', price: 1450, unit: '100ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Induces flowering in mango/orange.', crops: ['Orange', 'Mango'] },
  { id: 'm5', name: 'Hoshi', hindiName: 'होशी (Hoshi)', category: 'medicines', brand: 'Sumitomo', price: 550, unit: '250ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Gibberellic acid based promoter.', crops: ['All Crops'] },
  { id: 'm6', name: 'Progibb', hindiName: 'प्रोजिब (Progibb)', category: 'medicines', brand: 'Sumitomo', price: 65, unit: '1g', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Pure gibberellic acid.', crops: ['Grapes', 'Vegetables'] },
  { id: 'm7', name: 'Isabion', hindiName: 'इसाबियन (Isabion)', category: 'medicines', brand: 'Syngenta', price: 750, unit: '500ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Amino acid based promoter.', crops: ['All Crops'] },
  { id: 'm8', name: 'Quantis', hindiName: 'क्वांटिस (Quantis)', category: 'medicines', brand: 'Syngenta', price: 850, unit: '500ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Heat stress management.', crops: ['Wheat', 'Soybean'] },
  { id: 'm9', name: 'Ambition', hindiName: 'एम्बिशन (Ambition)', category: 'medicines', brand: 'Bayer', price: 950, unit: '500ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Crop efficiency enhancer.', crops: ['All Crops'] },
  { id: 'm10', name: 'Biozyme', hindiName: 'बायोजाइम (Biozyme)', category: 'medicines', brand: 'Biostadt', price: 450, unit: '500ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Seaweed based growth stimulant.', crops: ['All Crops'] },
  { id: 'm11', name: 'Double', hindiName: 'डबल (Double)', category: 'medicines', brand: 'Godrej Agrovet', price: 650, unit: '250ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Homobrassinolide based promoter.', crops: ['All Crops'] },
  { id: 'm12', name: 'V-Hume', hindiName: 'वी-ह्यूम (V-Hume)', category: 'medicines', brand: 'Local Selection', price: 380, unit: '1L', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Liquid humic acid.', crops: ['All Crops'] },
  { id: 'm13', name: 'Boom Flower', hindiName: 'बूम फ्लावर', category: 'medicines', brand: 'Devidayal', price: 550, unit: '500ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Nitrobenzene based promoter.', crops: ['All Crops'] },
  { id: 'm14', name: 'Fantac Plus', hindiName: 'फेंटाक प्लस', category: 'medicines', brand: 'Coromandel', price: 780, unit: '500ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Vitamins and amino acids.', crops: ['All Crops'] },
  { id: 'm15', name: 'Tatamri', hindiName: 'टाटामरी (Tatamri)', category: 'medicines', brand: 'Tata Rallis', price: 450, unit: '250ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Growth stimulant.', crops: ['All Crops'] },
  { id: 'm16', name: 'Gibrax', hindiName: 'जिब्राक्स (Gibrax)', category: 'medicines', brand: 'Crystal', price: 320, unit: '250ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Gibberellic acid solution.', crops: ['All Crops'] },
  { id: 'm17', name: 'Ethrel', hindiName: 'इथ्रेल (Ethrel)', category: 'medicines', brand: 'Bayer', price: 280, unit: '100ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Fruit ripener.', crops: ['Orange', 'Tomato'] },
  { id: 'm18', name: 'Chamatkar', hindiName: 'चमत्कार (Chamatkar)', category: 'medicines', brand: 'Gharda', price: 450, unit: '250ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Mepiquat Chloride based PGR.', crops: ['Cotton', 'Soybean'] },
  { id: 'm19', name: 'Spic Cytozyme', hindiName: 'स्पिक साइटोजाइम', category: 'medicines', brand: 'SPIC', price: 520, unit: '500ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Multi-nutrient growth promoter.', crops: ['All Crops'] },
  { id: 'm20', name: 'Agro-Glow', hindiName: 'एग्रो-ग्लो', category: 'medicines', brand: 'Local Selection', price: 350, unit: '500ml', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', description: 'Improves fruit shine and size.', crops: ['Orange', 'Garlic'] },
  
  // --- IMPLEMENTS (3) ---
  { id: 'i1', name: 'Knapsack Sprayer', hindiName: 'नैपसैक स्प्रेयर (पंप)', category: 'implements', brand: 'Aspee', price: 2800, unit: '16L Tank', image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=400', description: 'Manual high-pressure sprayer for pesticides.', crops: ['All Crops'] },
  { id: 'i2', name: 'Battery Sprayer', hindiName: 'बैटरी स्प्रेयर पंप', category: 'implements', brand: 'Neptune', price: 4500, unit: '12V Battery', image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=400', description: 'Rechargeable battery operated sprayer for easy use.', crops: ['All Crops'] },
  { id: 'i3', name: 'Brush Cutter', hindiName: 'ब्रश कटर (घास काटने की मशीन)', category: 'implements', brand: 'STIHL', price: 18500, unit: 'Petrol Operated', image: 'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&q=80&w=400', description: 'Powerful machine for cutting grass and weeds.', crops: ['All Crops'] },
];

export const CROP_ADVICE: CropAdvice[] = [
  {
    id: 'soybean',
    name: 'Soybean',
    hindiName: 'सोयाबीन',
    image: 'https://images.unsplash.com/photo-1594644435-946443513146?auto=format&fit=crop&q=80&w=400',
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
    image: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=400',
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
    image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=400',
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
    image: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?auto=format&fit=crop&q=80&w=400',
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
