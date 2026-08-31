import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types';
import { safeLocalStorageSet, sanitizeCartItemsForStorage } from '../utils/cacheManager';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, variant?: { id: string; quantity: string; price: number }) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateVariant: (cartItemId: string, newVariant: { id: string; quantity: string; price: number }) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('falsawdiya_cart');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Failed to parse cart items from localStorage on init', e);
      return [];
    }
  });

  // Save cart to localStorage when changed
  useEffect(() => {
    try {
      const cleanItems = sanitizeCartItemsForStorage(cartItems);
      safeLocalStorageSet('falsawdiya_cart', JSON.stringify(cleanItems));
    } catch (e) {
      console.warn('Safe cart save note:', e);
    }
  }, [cartItems]);

  const addToCart = (product: Product, variant?: { id: string; quantity: string; price: number }) => {
    const isVariant = variant !== undefined;
    const variantId = isVariant ? variant.id : 'default';
    const cartItemId = `${product.id}-${variantId}`;
    
    // Determine price and unit
    const price = isVariant ? variant.price : (product.price || 0);
    const unit = isVariant ? variant.quantity : (product.unit || '1 unit');

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [
        ...prevItems,
        {
          id: cartItemId,
          product,
          quantity: 1,
          price,
          unit,
        },
      ];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => (item.id === cartItemId ? { ...item, quantity } : item))
    );
  };

  const updateVariant = (cartItemId: string, newVariant: { id: string; quantity: string; price: number }) => {
    setCartItems((prevItems) => {
      const currentItem = prevItems.find((item) => item.id === cartItemId);
      if (!currentItem) return prevItems;

      const newCartItemId = `${currentItem.product.id}-${newVariant.id}`;

      // If we are changing to a variant that already exists in the cart, merge them!
      if (newCartItemId !== cartItemId) {
        const existingIndex = prevItems.findIndex((item) => item.id === newCartItemId);
        if (existingIndex > -1) {
          const updated = prevItems.map((item, idx) => {
            if (idx === existingIndex) {
              return { ...item, quantity: item.quantity + currentItem.quantity };
            }
            return item;
          });
          return updated.filter((item) => item.id !== cartItemId);
        }
      }

      // Otherwise, just update the id, unit (quantity description), and price of the current item
      return prevItems.map((item) => {
        if (item.id === cartItemId) {
          return {
            ...item,
            id: newCartItemId,
            price: newVariant.price,
            unit: newVariant.quantity,
          };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateVariant,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
