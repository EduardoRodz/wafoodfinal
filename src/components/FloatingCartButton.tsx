import React from 'react';
import { Button } from './ui/button';
import { ShoppingCart, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose, DrawerDescription, DrawerTitle } from './ui/drawer';
import Cart from './Cart';
import { useIsMobile } from '../hooks/use-mobile';
import { useConfig } from '../context/ConfigContext';

const FloatingCartButton = () => {
  const { config } = useConfig();
  const { totalItems } = useCart();
  const isMobile = useIsMobile();

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg flex items-center justify-center p-0 animate-fade-in z-50"
          variant="default"
          aria-label="Ver carrito"
          style={{ backgroundColor: config.theme.floatingCartButtonColor }}
        >
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-destructive text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent 
        className="max-w-[500px] mx-auto w-[95%] h-[80vh] p-0 font-sans rounded-t-[20px] focus:outline-none shadow-xl flex flex-col"
      >
        <DrawerTitle className="sr-only">Tu Pedido</DrawerTitle>
        <DrawerDescription className="sr-only">
          Carrito de compras donde puedes revisar los productos seleccionados antes de hacer tu pedido
        </DrawerDescription>
        <div className="sticky top-0 z-10 bg-white pt-3 pb-2 border-b border-gray-100">
          {/* Botón para cerrar */}
          <DrawerClose className="absolute right-3 top-3 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-600" />
          </DrawerClose>

          <div className="px-6 pb-2 text-left mt-2">
            <h2 className="text-xl font-semibold">Tu Pedido</h2>
            <p className="text-sm text-gray-600">Revisa tu pedido antes de enviarlo</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 pb-6">
          <Cart />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default FloatingCartButton;
