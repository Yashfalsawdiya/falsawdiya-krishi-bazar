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
