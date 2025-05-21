import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

interface FavoriteButtonProps {
  itemId: string;
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ itemId, className = '' }) => {
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const favorite = isFavorite(itemId);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (favorite) {
      removeFromFavorites(itemId);
    } else {
      addToFavorites(itemId);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      className={`transition-all duration-300 ${className}`}
      aria-label={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
    >
      <Heart
        size={24}
        className={`transition-all duration-300 ${
          favorite 
            ? 'text-red-500 fill-red-500' 
            : 'text-gray-400 hover:text-red-500'
        }`}
      />
    </button>
  );
};

export default FavoriteButton; 