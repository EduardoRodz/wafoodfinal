import React, { useState, useEffect, useRef } from 'react';
import { MenuItem } from '../config';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { Plus, Minus } from 'lucide-react';
import { Button } from './ui/button';
import { useFormatCurrency } from '../utils/formatCurrency';
import FavoriteButton from './FavoriteButton';

interface OrderItemProps {
  item: MenuItem;
}

function OrderItem({ item }: OrderItemProps) {
  const { config } = useConfig();
  const formatCurrency = useFormatCurrency();
  const { addToCart, removeFromCart, getItemQuantity } = useCart();
  const [note, setNote] = useState('');
  const [tempQuantity, setTempQuantity] = useState(0);
  const quantity = getItemQuantity(item.id);
  const [showNote, setShowNote] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(item.image);
  const imgRef = useRef<HTMLImageElement>(null);

  // Efecto para preparar la imagen cuando cambia item.image
  useEffect(() => {
    if (item.image) {
      // Resetear el estado de error al cambiar la imagen
      setImageError(false);
      setImageSrc(item.image);
      
      // Precarga la imagen para evitar parpadeos
      const img = new Image();
      img.onload = () => {
        // Imagen cargada correctamente
        if (imgRef.current) {
          imgRef.current.style.opacity = '1';
        }
      };
      img.onerror = () => {
        // Si falla, intentar una vez sin parámetros de cache
        if (item.image.includes('?')) {
          const baseUrl = item.image.split('?')[0];
          setImageSrc(`${baseUrl}?cache=${Date.now()}`);
        } else {
          handleImageError();
        }
      };
      img.src = item.image;
    }
  }, [item.image]);

  const handleAddToCart = () => {
    // Agregar al carrito con la cantidad tempQuantity
    for (let i = 0; i < tempQuantity; i++) {
      addToCart({ ...item, note });
    }
    // Resetear la cantidad temporal después de agregar al carrito
    setTempQuantity(0);
  };

  const handleRemoveFromCart = () => {
    removeFromCart(item.id);
    if (quantity === 1) {
      setNote('');
      setShowNote(false);
    }
  };

  const increaseTemp = () => {
    setTempQuantity(prev => prev + 1);
  };

  const decreaseTemp = () => {
    setTempQuantity(prev => prev > 0 ? prev - 1 : 0);
  };

  // Manejar errores de carga de imagen
  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
      
      // Si la URL tiene parámetro de tiempo o caché
      if (item.image.includes('?')) {
        // Intentar con la URL base sin parámetros
        const baseUrl = item.image.split('?')[0];
        setImageSrc(`${baseUrl}?nocache=${Date.now()}`);
      } else {
        // Si no tiene parámetros, intentar forzar recarga
        setImageSrc(`${item.image}?cache=${Date.now()}`);
      }
    } else {
      // Si ya intentamos recargar una vez, usar placeholder local
      setImageSrc('/placeholder.svg');
    }
  };

  // Cálculo de la proporción de aspecto para forzar 4:3 en la imagen
  const aspectRatioStyle = {
    paddingBottom: '100%', // Cambio de 75% (4:3) a 100% (1:1) para hacerlo cuadrado
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 transition-transform duration-150 ease-in-out hover:scale-[1.01] w-full max-w-full sm:max-w-xs mx-auto"
         style={{
           '--tw-shadow': '0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)',
           '--tw-shadow-colored': '0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -2px var(--tw-shadow-color)',
           boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)'
         } as React.CSSProperties}>
      <div className="w-full relative bg-gray-100" style={aspectRatioStyle}>
        <img 
          ref={imgRef}
          src={imageSrc}
          alt={item.name} 
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          onError={handleImageError}
          loading="lazy"
          crossOrigin="anonymous"
          style={{ opacity: 0.9 }} // Inicio con opacidad menor para suavizar la transición
        />
        
        {/* Botón de favoritos */}
        <div className="absolute top-2 right-2">
          <FavoriteButton itemId={item.id} className="bg-white bg-opacity-70 p-1 rounded-full" />
        </div>
      </div>
      
      <div className="p-3 sm:p-4 space-y-2">
        <h3 className="font-bold text-base text-left">{item.name}</h3>
        <p className="text-gray-600 text-xs text-left">{item.description}</p>
        
        <div className="flex justify-between items-center">
          <p className="font-bold text-lg text-green-800">{formatCurrency(item.price)}</p>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={decreaseTemp}
              className="rounded-full w-8 h-8 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 touch-manipulation"
              aria-label="Disminuir cantidad"
            >
              <Minus size={14} />
            </button>
            
            <span className="font-medium text-base w-4 text-center">{tempQuantity}</span>
            
            <button 
              onClick={increaseTemp}
              className="rounded-full w-8 h-8 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 touch-manipulation"
              aria-label="Aumentar cantidad"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <button 
            onClick={() => setShowNote(!showNote)}
            className="text-xs text-gray-500 hover:text-primary font-medium mx-auto block touch-manipulation"
          >
            {showNote ? 'Ocultar notas' : note ? 'Editar notas' : 'Agregar notas'}
          </button>
          
          {showNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Ponle picante"
              className="w-full p-2 border border-gray-300 rounded text-xs"
              rows={2}
            />
          )}
          
          <Button 
            onClick={handleAddToCart} 
            className="w-full text-white flex items-center justify-center gap-1 py-1 text-sm touch-manipulation"
            style={{ 
              backgroundColor: config.theme.cartButtonColor,
              opacity: tempQuantity > 0 ? 1 : 0.6
            }}
            disabled={tempQuantity === 0}
          >
            <Plus size={14} /> Agregar al pedido
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OrderItem;
