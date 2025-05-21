import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { MenuItem } from '../config';

interface CartItem extends MenuItem {
  quantity: number;
  note?: string;
}

interface CartContextProps {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
  addToCart: (item: MenuItem & { note?: string }) => void;
  removeFromCart: (itemId: string) => void;
  removeItemCompletely: (itemId: string) => void;
  clearCart: () => void;
  getItemQuantity: (itemId: string) => number;
}

const CartContext = createContext<CartContextProps>({
  items: [],
  totalAmount: 0,
  totalItems: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  removeItemCompletely: () => {},
  clearCart: () => {},
  getItemQuantity: () => 0,
});

export const useCart = () => useContext(CartContext);

interface CartProviderProps {
  children: ReactNode;
}

// Clave para almacenar el carrito en localStorage
const CART_STORAGE_KEY = 'wafood_cart_items';

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  // Inicializar el estado desde localStorage si existe
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    
    try {
      const storedItems = localStorage.getItem(CART_STORAGE_KEY);
      return storedItems ? JSON.parse(storedItems) : [];
    } catch (error) {
      console.error('Error al cargar el carrito desde localStorage:', error);
      return [];
    }
  });

  // Guardar en localStorage cuando cambia items
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        console.log('Carrito guardado en localStorage:', items.length, 'elementos');
      } catch (error) {
        console.error('Error al guardar el carrito en localStorage:', error);
      }
    }
  }, [items]);

  const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (item: MenuItem & { note?: string }) => {
    setItems((prevItems) => {
      // Try to find item with same ID and same note
      const existingItemIndex = prevItems.findIndex(
        (i) => i.id === item.id && i.note === item.note
      );

      if (existingItemIndex >= 0) {
        // Item exists with same note, update quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += 1;
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setItems((prevItems) => {
      const itemIndex = prevItems.findIndex((item) => item.id === itemId);
      
      if (itemIndex === -1) return prevItems;
      
      const updatedItems = [...prevItems];
      if (updatedItems[itemIndex].quantity > 1) {
        updatedItems[itemIndex].quantity -= 1;
      } else {
        updatedItems.splice(itemIndex, 1);
      }
      
      return updatedItems;
    });
  };

  const removeItemCompletely = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const getItemQuantity = (itemId: string): number => {
    return items.reduce((total, item) => {
      if (item.id === itemId) {
        return total + item.quantity;
      }
      return total;
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalAmount,
        totalItems,
        addToCart,
        removeFromCart,
        removeItemCompletely,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
