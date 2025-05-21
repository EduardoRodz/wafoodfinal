import React, { useMemo } from 'react';
import { useConfig } from '../context/ConfigContext';
import { useFavorites } from '../context/FavoritesContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OrderItem from '../components/OrderItem';
import { MenuItem } from '../config';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Favorites: React.FC = () => {
  const { config, isLoading } = useConfig();
  const { favorites } = useFavorites();
  const navigate = useNavigate();

  // Encontrar todos los elementos del menú que están en favoritos
  const favoriteItems = useMemo(() => {
    if (isLoading || !config.categories) return [];

    const items: MenuItem[] = [];
    
    // Recorrer todas las categorías y sus elementos para encontrar los favoritos
    config.categories.forEach(category => {
      category.items.forEach(item => {
        if (favorites.includes(item.id)) {
          items.push(item);
        }
      });
    });
    
    return items;
  }, [favorites, config.categories, isLoading]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow w-full px-4 sm:px-6 md:px-8 pt-0 pb-2 sm:pb-6">
        <div className="max-w-7xl mx-auto w-full pt-4">
          <div className="flex items-center mb-6">
            <button 
              onClick={() => navigate(-1)}
              className="mr-3 p-2 rounded-full hover:bg-gray-100"
              aria-label="Volver"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold">Mis Favoritos</h1>
          </div>
          
          {favoriteItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">❤️</div>
              <h2 className="text-xl font-medium mb-2">No tienes favoritos</h2>
              <p className="text-gray-500 mb-4">
                Marca tus platos favoritos tocando el corazón en cualquier elemento del menú
              </p>
              <button 
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                style={{ backgroundColor: config.theme.primaryColor }}
              >
                Explorar Menú
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favoriteItems.map((item) => (
                <div key={item.id} className="px-4 sm:px-0">
                  <OrderItem item={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Favorites; 