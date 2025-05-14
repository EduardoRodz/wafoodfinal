import React, { useState } from 'react';
import { MenuItem } from '../config';
import { useCart } from '../context/CartContext';
import { Plus, Minus } from 'lucide-react';
import { Button } from './ui/button';
import { formatCurrency } from '../utils/formatCurrency';
import { defaultConfig } from '../config';

interface OrderItemProps {
  item: MenuItem;
}

const OrderItem: React.FC<OrderItemProps> = ({ item }) => {
  const { addToCart, removeFromCart, getItemQuantity } = useCart();
  const [note, setNote] = useState('');
  const [tempQuantity, setTempQuantity] = useState(0);
  const quantity = getItemQuantity(item.id);
  const [showNote, setShowNote] = useState(false);

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

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 transition-transform duration-150 ease-in-out hover:scale-[1.01] w-full max-w-full sm:max-w-xs mx-auto"
         style={{
           '--tw-shadow': '0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)',
           '--tw-shadow-colored': '0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -2px var(--tw-shadow-color)',
           boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)'
         } as React.CSSProperties}>
      <div className="w-full h-40 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-3 sm:p-4 space-y-2">
        <h3 className="font-bold text-base text-left">{item.name}</h3>
        <p className="text-gray-600 text-xs text-left">{item.description}</p>
        
        <div className="flex justify-between items-center">
          <p className="font-bold text-lg text-green-800">{formatCurrency(item.price)}</p>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={decreaseTemp}
              className="rounded-full w-7 h-7 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              <Minus size={14} />
            </button>
            
            <span className="font-medium text-base w-4 text-center">{tempQuantity}</span>
            
            <button 
              onClick={increaseTemp}
              className="rounded-full w-7 h-7 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <button 
            onClick={() => setShowNote(!showNote)}
            className="text-xs text-gray-500 hover:text-primary font-medium mx-auto block"
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
            className="w-full text-white flex items-center justify-center gap-1 py-1 text-sm"
            style={{ 
              backgroundColor: tempQuantity > 0 ? defaultConfig.theme.cartButtonColor : 'black',
            }}
            disabled={tempQuantity === 0}
          >
            <Plus size={14} /> Agregar al pedido
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderItem;
