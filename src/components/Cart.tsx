import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { ShoppingCart, Pencil, Trash2, Plus, Minus } from 'lucide-react';
import { useFormatCurrency } from '../utils/formatCurrency';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import OrderForm from './OrderForm';
import { SheetClose } from './ui/sheet';

const Cart: React.FC = () => {
  const { config } = useConfig();
  const formatCurrency = useFormatCurrency();
  const { items, totalAmount, clearCart, addToCart, removeFromCart, removeItemCompletely } = useCart();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState<string>('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  // Precarga las imágenes cuando los elementos del carrito cambian
  useEffect(() => {
    // Resetear errores de imagen cuando cambian los elementos del carrito
    setImageErrors({});
    
    // Precarga de imágenes
    items.forEach(item => {
      if (item.image) {
        const img = new Image();
        img.onload = () => {
          // Imagen cargada exitosamente
        };
        img.onerror = () => {
          // En caso de error, marcar la imagen como fallida
          handleImageError(item.id);
        };
        img.src = item.image;
      }
    });
  }, [items.length]);
  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-gray-500 py-8">
        <ShoppingCart size={32} className="text-gray-400 mb-2" />
        <p className="text-lg">Tu carrito está vacío</p>
        <p className="text-sm text-gray-400">Añade algunos productos para comenzar</p>
      </div>
    );
  }

  const handleEditNote = (itemId: string, currentNote: string = '') => {
    setEditingItemId(itemId);
    setEditedNote(currentNote);
  };

  const handleSaveNote = (itemId: string) => {
    // Find the item and update its note
    const item = items.find(i => i.id === itemId);
    if (item) {
      // Remove old item
      removeItemCompletely(itemId);
      // Add updated item with new note and PRESERVE the original quantity
      for (let i = 0; i < item.quantity; i++) {
        addToCart({...item, note: editedNote});
      }
    }
    setEditingItemId(null);
    setEditedNote('');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditedNote('');
  };

  const handleImageError = (itemId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [itemId]: true
    }));
  };

  const handleContinueOrder = () => {
    console.log('Continuing with order');
    
    // Show success toast
    toast({
      title: "¡Perfecto!",
      description: "Continuando con tu pedido...",
    });
    
    // Show order form
    setShowOrderForm(true);
  };

  const handleBackToCart = () => {
    setShowOrderForm(false);
  };

  // Genera iniciales para la imagen de respaldo
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  if (showOrderForm) {
    return (
      <div className="mt-2">
        <OrderForm />
        <Button 
          variant="outline" 
          onClick={handleBackToCart}
          className="w-full border border-gray-300 hover:bg-gray-50 mt-3"
        >
          Volver al carrito
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id + item.note} className="py-3 px-1 border-b border-gray-100 last:border-b-0">
            <div className="flex items-start gap-3">
              {/* Imagen cuadrada con bordes redondeados */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                  {!imageErrors[item.id] && item.image ? (
                    <img 
                      src={item.image}
                      alt={item.name} 
                      className="w-full h-full object-cover transition-opacity duration-200"
                      style={{ opacity: 0.95 }}
                      loading="lazy"
                      onError={() => handleImageError(item.id)}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 font-medium">
                      {getInitials(item.name)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Información del producto y controles */}
              <div className="flex flex-grow items-center justify-between">
                {/* Nombre y precio */}
                <div className="flex flex-col">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  <span className="text-gray-500 text-sm">{formatCurrency(item.price * item.quantity)}</span>
                </div>
                
                {/* Controles de cantidad */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200"
                    aria-label="Disminuir cantidad"
                  >
                    <Minus size={14} />
                  </button>
                  
                  <span className="w-4 text-center font-medium">{item.quantity}</span>
                  
                  <button 
                    onClick={() => addToCart(item)}
                    className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Notas y botón de eliminar */}
            <div className={`mt-2 flex justify-between items-center text-sm text-gray-500 ${editingItemId === item.id ? '' : 'pl-[76px]'}`}>
              {editingItemId === item.id ? (
                <div className="w-full">
                  <textarea
                    value={editedNote}
                    onChange={(e) => setEditedNote(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-primary text-base"
                    placeholder="Agregar notas"
                    rows={2}
                    style={{ fontSize: '16px' }}
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      className="text-gray-500 text-sm hover:text-gray-700 px-2 py-1 rounded"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                    <button 
                      className="text-primary text-sm font-medium hover:text-primary/80 px-3 py-1 rounded bg-primary/10 hover:bg-primary/15"
                      onClick={() => handleSaveNote(item.id)}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    {item.note && (
                      <>
                        <span className="text-gray-600 italic text-xs truncate max-w-[150px]">{item.note}</span>
                        <button 
                          className="flex items-center text-xs text-gray-400 hover:text-primary"
                          onClick={() => handleEditNote(item.id, item.note)}
                        >
                          <Pencil size={12} />
                        </button>
                      </>
                    )}
                    {!item.note && (
                      <button 
                        className="text-xs text-gray-400 hover:text-primary"
                        onClick={() => handleEditNote(item.id)}
                      >
                        Agregar nota
                      </button>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => removeItemCompletely(item.id)}
                    className="text-red-400 hover:text-red-600 transition-colors rounded-md p-1 hover:bg-red-50"
                    aria-label="Eliminar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="py-4 flex justify-between items-center font-medium border-t border-gray-200 mt-2">
        <span className="text-lg">Total:</span>
        <span className="text-lg text-primary">{formatCurrency(totalAmount)}</span>
      </div>
      
      <Button 
        className="w-full text-white font-medium py-6 flex items-center justify-center gap-2 rounded-lg shadow-md hover:shadow-lg transition-all"
        onClick={handleContinueOrder}
        style={{ backgroundColor: config.theme?.cartButtonColor || '#003b29' }}
      >
        <ShoppingCart size={20} /> Continuar con el pedido
      </Button>
    </div>
  );
};

export default Cart;
