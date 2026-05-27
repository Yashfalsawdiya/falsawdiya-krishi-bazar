import { Product, CartItem } from '../types';

export interface CustomerDetails {
  name: string;
  phone: string;
  addressHouse: string;
  addressCity: string;
  addressDistrict: string;
  addressState: string;
  addressPincode: string;
}

const STORAGE_KEY = 'falsawdiya_customer_details';

export const getCustomerDetails = (): CustomerDetails => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse customer details from localStorage', error);
  }
  return {
    name: '',
    phone: '',
    addressHouse: '',
    addressCity: '',
    addressDistrict: '',
    addressState: '',
    addressPincode: '',
  };
};

export const saveCustomerDetails = (details: CustomerDetails): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
  } catch (error) {
    console.error('Failed to save customer details to localStorage', error);
  }
};

interface OrderProductInfo {
  name: string;
  englishName: string;
  brand: string;
  quantity: string;
  price: string;
  id: string;
}

export const formatWhatsAppOrderMessage = (
  items: OrderProductInfo[],
  details: CustomerDetails,
  totalAmount: number,
  orderSource = "Store",
  deliveryCharges?: number
): string => {
  // Header with dynamically computed source
  let message = `*नया ऑर्डर (New Order From ${orderSource})*\n\n`;
  message += `━━━━━━━━━━━━━━━\n\n`;

  // Customer Details
  message += `*ग्राहक जानकारी (Customer Details)*\n\n`;
  message += `• नाम: ${details.name || 'Customer Name'}\n`;
  message += `• मोबाइल नंबर: ${details.phone || '0123456789'}\n\n`;

  // Delivery Address
  message += `*डिलीवरी पता (Delivery Address)*\n\n`;
  const house = details.addressHouse || 'मकान नंबर, मोहल्ले/गली का नाम';
  const city = details.addressCity || 'शहर/गांव का नाम';
  const district = details.addressDistrict || 'जिले का नाम';
  const state = details.addressState || 'राज्य का नाम';
  const pincode = details.addressPincode || '123456';
  message += `${house}, ${city},\n${district}, ${state} - ${pincode}\n\n`;

  message += `━━━━━━━━━━━━━━━\n\n`;

  // Products Section (Uniform format for single & multiple items as requested)
  message += `*ऑर्डर किए गए उत्पाद (Ordered Products)*\n\n`;
  
  items.forEach((item, index) => {
    const displayProductHeader = item.name === item.englishName ? item.name : `${item.name} (${item.englishName})`;
    message += `${index + 1}. उत्पाद: ${displayProductHeader}\n`;
    message += `कंपनी: ${item.brand}\n`;
    message += `मात्रा: ${item.quantity}\n`;
    message += `कीमत: ₹${item.price}\n`;
    message += `\n`;
  });

  message += `━━━━━━━━━━━━━━━\n\n`;

  // Total amount and delivery charges breakdown
  if (deliveryCharges !== undefined && deliveryCharges >= 0) {
    message += `उत्पाद कुल (Products Total): ₹${totalAmount}\n`;
    message += `डिलीवरी शुल्क (Delivery Charges): ₹${deliveryCharges}\n\n`;
    message += `*कुल राशि (Final Total): ₹${totalAmount + deliveryCharges}*\n\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
  } else {
    // Total amount (Only for Cart orders or when source implies billing)
    if (orderSource === "Cart" || orderSource === "Cart Order") {
      message += `*कुल राशि (Total Amount): ₹${totalAmount}*\n\n`;
      message += `━━━━━━━━━━━━━━━\n\n`;
    }
  }

  // Verification & Thank you
  message += `धन्यवाद\n`;

  return message;
};

/**
 * Quick helper to map a standard CartItem array to OrderProductInfo array
 */
export const mapCartItemsToOrderProducts = (cartItems: CartItem[]): OrderProductInfo[] => {
  return cartItems.map(item => {
    const displayQty = item.quantity > 1 ? `${item.unit} x ${item.quantity}` : `${item.unit}`;
    return {
      name: item.product.hindiName || item.product.name,
      englishName: item.product.name,
      brand: item.product.brand || 'N/A',
      quantity: displayQty,
      price: String(item.price * item.quantity),
      id: item.product.customId || item.product.id || '',
    };
  });
};

/**
 * Quick helper to map a single Product to OrderProductInfo array
 */
export const mapSingleProductToOrderProducts = (product: Product, quantity = 1, customUnit?: string, customPrice?: number): OrderProductInfo[] => {
  const displayUnit = customUnit || product.unit || '1 unit';
  const displayPrice = customPrice !== undefined ? customPrice : (product.price || 0);
  const displayQty = quantity > 1 ? `${displayUnit} x ${quantity}` : displayUnit;
  return [
    {
      name: product.hindiName || product.name,
      englishName: product.name,
      brand: product.brand || 'N/A',
      quantity: displayQty,
      price: String(displayPrice * quantity),
      id: product.customId || product.id || '',
    }
  ];
};
