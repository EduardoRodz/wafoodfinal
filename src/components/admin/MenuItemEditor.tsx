import React, { useState, memo, useRef, useCallback } from 'react';
import { Trash, Plus, ChevronUp, ChevronDown, Edit, AlertTriangle, GripVertical } from 'lucide-react';
import MenuItemForm from './MenuItemForm';
import { v4 as uuidv4 } from 'uuid';
import { useConfig } from '../../context/ConfigContext';
import { useFormatCurrency } from '../../utils/formatCurrency';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  items: MenuItem[];
}

interface MenuItemEditorProps {
  categories: Category[];
  onChange: (categories: Category[]) => void;
}

// Componente para renderizar cada elemento de menú con soporte para arrastrar y soltar
const SortableMenuItemCard = memo<{
  item: MenuItem;
  index: number;
  totalItems: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}>(({ item, index, totalItems, onEdit, onDelete, onMove }) => {
  const { config } = useConfig();
  const formatCurrency = useFormatCurrency();
  
  // Configurar el comportamiento del elemento arrastrable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
    position: 'relative' as const
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="bg-white border rounded-lg shadow-sm mb-4 overflow-hidden"
    >
      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[100px_1fr]">
        {/* Imagen */}
        <div className="bg-gray-100">
          <div className="w-full h-full aspect-square overflow-hidden">
            <img 
              src={item.image} 
              alt={item.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                const imgSrc = item.image;
                const imgTarget = e.target as HTMLImageElement;
                
                if (imgSrc.includes('?t=')) {
                  const baseUrl = imgSrc.split('?')[0];
                  imgTarget.src = `${baseUrl}?cache=${Date.now()}`;
                } else {
                  imgTarget.src = 'https://placehold.co/400x300/jpeg';
                }
              }}
              crossOrigin="anonymous"
            />
          </div>
        </div>
        
        {/* Contenido */}
        <div className="p-3 flex flex-col justify-between">
          <div>
            <h3 className="font-medium text-sm sm:text-base">{item.name}</h3>
            <p className="text-xs text-gray-500 line-clamp-1 mt-1 mb-2">
              {item.description || <span className="italic">Sin descripción</span>}
            </p>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                {formatCurrency(item.price)}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                ID: {item.id}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-3 pt-2 border-t">
            {/* Botones de posición y drag handle */}
            <div className="flex items-center gap-1">
              <button 
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 touch-manipulation"
                {...attributes}
                {...listeners}
                aria-label="Arrastrar para reordenar"
              >
                <GripVertical size={16} />
              </button>
              <button 
                onClick={() => onMove(index, 'up')}
                disabled={index === 0}
                className={`p-1.5 rounded-full ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'}`}
                aria-label="Mover arriba"
              >
                <ChevronUp size={16} />
              </button>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{index + 1}</span>
              <button 
                onClick={() => onMove(index, 'down')}
                disabled={index === totalItems - 1}
                className={`p-1.5 rounded-full ${index === totalItems - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'}`}
                aria-label="Mover abajo"
              >
                <ChevronDown size={16} />
              </button>
            </div>
            
            {/* Botones de acción */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onEdit(index)}
                className="p-1.5 rounded-full text-blue-600 hover:bg-blue-50"
                aria-label="Editar plato"
              >
                <Edit size={16} />
              </button>
              <button 
                onClick={() => onDelete(index)}
                className="p-1.5 rounded-full text-red-600 hover:bg-red-50"
                aria-label="Eliminar plato"
              >
                <Trash size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
SortableMenuItemCard.displayName = 'SortableMenuItemCard';

const MenuItemEditor: React.FC<MenuItemEditorProps> = ({ categories, onChange }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Encontrar la categoría seleccionada
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  const menuItems = selectedCategory?.items || [];

  // Configurar sensores para DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Distancia mínima para iniciar el arrastre
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Delay para activar en dispositivos táctiles
        tolerance: 5, // Tolerancia de movimiento
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Manejar el fin del arrastre
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = menuItems.findIndex(item => item.id === active.id);
      const newIndex = menuItems.findIndex(item => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        handleReorderItems(oldIndex, newIndex);
      }
    }
  };

  // Función para reordenar elementos
  const handleReorderItems = (oldIndex: number, newIndex: number) => {
    if (!selectedCategory) return;
    
    const updatedCategories = [...categories];
    const categoryIndex = updatedCategories.findIndex(cat => cat.id === selectedCategoryId);
    
    if (categoryIndex === -1) return;
    
    // Usar arrayMove de dnd-kit para reordenar
    updatedCategories[categoryIndex].items = arrayMove(
      [...updatedCategories[categoryIndex].items],
      oldIndex,
      newIndex
    );
    
    onChange(updatedCategories);
  };

  // Generar un ID basado en el nombre
  const generateIdFromName = (name: string): string => {
    if (!name) return uuidv4().substring(0, 8);
    
    const baseId = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    // Si el ID ya existe, añadir un número
    let newId = baseId;
    let counter = 1;
    
    while (selectedCategory?.items.some(item => item.id === newId)) {
      newId = `${baseId}-${counter}`;
      counter++;
    }

    return newId;
  };

  // Abrir el modal para editar un elemento
  const handleEdit = (index: number) => {
    if (selectedCategory) {
      setEditingItem({ ...selectedCategory.items[index] });
      setEditingItemIndex(index);
      setIsModalOpen(true);
    }
  };

  // Abrir el modal para añadir un nuevo elemento
  const handleAdd = () => {
    setEditingItem({
      id: '',
      name: '',
      description: '',
      price: 0,
      image: 'https://placehold.co/300x200/jpeg'
    });
    setEditingItemIndex(null);
    setIsModalOpen(true);
  };

  // Cerrar el modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setEditingItemIndex(null);
  };

  // Abrir diálogo de confirmación para eliminar
  const handleConfirmDelete = (index: number) => {
    setDeleteIndex(index);
    setDeleteConfirmOpen(true);
  };

  // Eliminar elemento
  const handleDelete = () => {
    if (!selectedCategory || deleteIndex === null) return;
    
    const updatedCategories = [...categories];
    const categoryIndex = updatedCategories.findIndex(cat => cat.id === selectedCategoryId);
    
    if (categoryIndex === -1) return;
    
    // Eliminar el elemento
    updatedCategories[categoryIndex].items.splice(deleteIndex, 1);
    
    onChange(updatedCategories);
    setDeleteConfirmOpen(false);
    setDeleteIndex(null);
  };

  // Guardar cambios en un elemento
  const handleSave = (item: MenuItem) => {
    if (!selectedCategory) return;
    
    const updatedCategories = [...categories];
    const categoryIndex = updatedCategories.findIndex(cat => cat.id === selectedCategoryId);
    
    if (categoryIndex === -1) return;
    
    if (editingItemIndex !== null) {
      // Actualizar elemento existente
      updatedCategories[categoryIndex].items[editingItemIndex] = item;
    } else {
      // Añadir nuevo elemento
      // Si no se ha establecido un ID, generar uno basado en el nombre
      if (!item.id) {
        item.id = generateIdFromName(item.name);
      }
      updatedCategories[categoryIndex].items.push(item);
    }
    
    onChange(updatedCategories);
    handleCloseModal();
  };

  // Mover elemento arriba o abajo
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (!selectedCategory) return;
    
    // No hacer nada si intenta mover el primer elemento hacia arriba o el último hacia abajo
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === selectedCategory.items.length - 1)) {
      return;
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    handleReorderItems(index, newIndex);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-semibold">Editor de Platos</h2>
        
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 py-2 px-4 bg-green-600 text-white font-medium rounded text-sm hover:bg-green-700"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Añadir Plato</span>
          <span className="sm:hidden">Añadir</span>
        </button>
      </div>

      {/* Selector de categoría */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Categoría</label>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          {categories.length === 0 ? (
            <option value="" disabled>No hay categorías disponibles</option>
          ) : (
            categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name} ({category.items.length} platos)
              </option>
            ))
          )}
        </select>
      </div>

      {/* Mensaje si no hay categorías */}
      {categories.length === 0 && (
        <div className="text-center py-8 px-4 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">No hay categorías disponibles para añadir platos.</p>
          <p className="text-gray-500 mt-2">Primero debes crear al menos una categoría en la sección "Categorías".</p>
        </div>
      )}

      {/* Lista de elementos del menú */}
      {selectedCategory && (
        <>
          {/* Instrucciones */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <p className="flex items-center">
              <span className="mr-2">ℹ️</span>
              <span>Puedes cambiar el orden de los platos usando los botones de flechas o arrastrando con el ícono de agarre. El orden aquí será el mismo que verán los clientes en el menú.</span>
            </p>
          </div>

          {/* Lista de platos con soporte para drag and drop */}
          {menuItems.length === 0 ? (
            <div className="text-center py-8 px-4 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">No hay platos en esta categoría</p>
              <button 
                onClick={handleAdd}
                className="mt-2 text-blue-500 hover:underline"
              >
                Añadir el primer plato
              </button>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={menuItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 gap-3">
                  {menuItems.map((item, index) => (
                    <SortableMenuItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      totalItems={menuItems.length}
                      onEdit={handleEdit}
                      onDelete={handleConfirmDelete}
                      onMove={handleMoveItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {/* Modal para editar/añadir plato */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h3 className="font-medium">
                {editingItemIndex !== null ? 'Editar Plato' : 'Añadir Nuevo Plato'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <MenuItemForm
                item={editingItem}
                onChange={setEditingItem}
                onSave={() => handleSave(editingItem)}
                onCancel={handleCloseModal}
                isNew={editingItemIndex === null}
                generateId={generateIdFromName}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium mb-2">Confirmar eliminación</h3>
              <p className="text-gray-600">
                ¿Estás seguro de que deseas eliminar este plato? Esta acción no se puede deshacer.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuItemEditor; 