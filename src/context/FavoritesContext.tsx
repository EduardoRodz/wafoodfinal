import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { MenuItem } from '../config';

interface FavoritesContextProps {
  favorites: string[];
  addToFavorites: (itemId: string) => void;
  removeFromFavorites: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextProps>({
  favorites: [],
  addToFavorites: () => {},
  removeFromFavorites: () => {},
  isFavorite: () => false,
});

export const useFavorites = () => useContext(FavoritesContext);

interface FavoritesProviderProps {
  children: ReactNode;
}

// Clave para almacenar favoritos en localStorage
const FAVORITES_STORAGE_KEY = 'wafood_favorites';

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  // Inicializar el estado desde localStorage si existe
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (error) {
      console.error('Error al cargar favoritos desde localStorage:', error);
      return [];
    }
  });

  // Guardar en localStorage cuando cambian los favoritos
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
        console.log('Favoritos guardados en localStorage:', favorites.length, 'elementos');
      } catch (error) {
        console.error('Error al guardar favoritos en localStorage:', error);
      }
    }
  }, [favorites]);

  const addToFavorites = (itemId: string) => {
    setFavorites((prev) => {
      if (prev.includes(itemId)) return prev;
      return [...prev, itemId];
    });
  };

  const removeFromFavorites = (itemId: string) => {
    setFavorites((prev) => prev.filter(id => id !== itemId));
  };

  const isFavorite = (itemId: string): boolean => {
    return favorites.includes(itemId);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addToFavorites,
        removeFromFavorites,
        isFavorite
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}; 