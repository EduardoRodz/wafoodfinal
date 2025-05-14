import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CategoryMenu from '../components/CategoryMenu';
import CategorySection from '../components/CategorySection';
import FloatingCartButton from '../components/FloatingCartButton';
import { useConfig } from '../context/ConfigContext';
import { CartProvider } from '../context/CartContext';

const Index = () => {
  const { config, isLoading } = useConfig();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-grow w-full px-4 sm:px-6 md:px-8 py-2 sm:py-6">
          <div className="max-w-7xl mx-auto w-full">
            <CategoryMenu />
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                {config.categories.map((category) => (
                  <CategorySection key={category.id} category={category} />
                ))}
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
        <FloatingCartButton />
      </div>
    </CartProvider>
  );
};

export default Index;
