import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Edit, Trash, Plus, Check, X, ChevronUp, ChevronDown, Edit2, AlertTriangle, GripVertical } from 'lucide-react';
import { deleteCategory } from '../../services/configService';
import { useToast } from '../../hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
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

// Emoji comunes para uso como iconos
const commonEmojiOptions = ['🍽️', '🍛', '🍔', '🍕', '🍝', '🥗', '🍣', '🍰', '🥪', '🍱', '🍗', '🍹', '☕', '🥤'];

// Tipo de datos para una categoría
interface Category {
  id: string;
  name: string;
  icon: string;
  items: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
  }[];
}

// Props para el componente
interface CategoryEditorProps {
  categories: Category[];
  onChange: (categories: Category[]) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}

// Componente de formulario de categoría
interface CategoryFormProps {
  initialData?: Category;
  onSave: (category: Category) => void;
  onCancel: () => void;
}

// Componente para el formulario de creación/edición de categorías
const CategoryForm: React.FC<CategoryFormProps> = ({ initialData, onSave, onCancel }) => {
  const [category, setCategory] = useState<Category>(
    initialData || {
      id: '',
      name: '',
      icon: '🍽️',
      items: []
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category.name.trim()) {
      alert('El nombre de la categoría es obligatorio');
      return;
    }
    
    // Si es una nueva categoría, generar ID si no se ha especificado
    if (!initialData && !category.id) {
      const id = category.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .trim();
      
      onSave({
        ...category,
        id: id || uuidv4().substring(0, 8)
      });
    } else {
      onSave(category);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre *</label>
          <input
            type="text"
            value={category.name}
            onChange={(e) => setCategory({ ...category, name: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Platos Principales"
            required
          />
        </div>
        
        {!initialData && (
          <div>
            <label className="block text-sm font-medium mb-1">ID (opcional)</label>
            <input
              type="text"
              value={category.id}
              onChange={(e) => setCategory({ ...category, id: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Se generará automáticamente"
            />
            <p className="text-xs text-gray-500 mt-1">
              Identificador único para la categoría. Se generará automáticamente si lo dejas en blanco.
            </p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1">Icono</label>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {commonEmojiOptions.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setCategory({ ...category, icon: emoji })}
                className={`h-10 flex items-center justify-center text-lg rounded hover:bg-gray-100 ${
                  category.icon === emoji ? 'bg-blue-100 border border-blue-300' : 'bg-white border border-gray-300'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={category.icon}
            onChange={(e) => setCategory({ ...category, icon: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="O ingresa un emoji personalizado"
            maxLength={2}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded shadow-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded shadow-sm hover:bg-green-700"
        >
          Guardar
        </button>
      </div>
    </form>
  );
};

// Optimizar renderizado de lista de items con soporte para drag and drop
const SortableCategoryListItem: React.FC<{
  category: Category;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}> = React.memo(({ category, index, isFirst, isLast, onEdit, onDelete, onMove }) => {
  // Configurar comportamiento arrastrable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });
  
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
      className="bg-white border rounded-lg shadow-sm mb-3 overflow-hidden"
    >
      <div className="flex justify-between items-center p-3 sm:p-4">
        <div className="flex items-center">
          <button
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mr-1 touch-manipulation"
            {...attributes}
            {...listeners}
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical size={20} />
          </button>
          <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg mr-3">
            {category.icon}
          </span>
          <div>
            <h3 className="font-medium">{category.name}</h3>
            <p className="text-xs text-gray-500">{category.items.length} platos</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => onMove(index, 'up')}
            disabled={isFirst}
            className={`p-2 rounded-full ${isFirst ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-500'}`}
            aria-label="Mover arriba"
          >
            <ChevronUp size={18} />
          </button>
          <button 
            onClick={() => onMove(index, 'down')}
            disabled={isLast}
            className={`p-2 rounded-full ${isLast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-500'}`}
            aria-label="Mover abajo"
          >
            <ChevronDown size={18} />
          </button>
          <button 
            onClick={() => onEdit(category)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Editar categoría"
          >
            <Edit2 size={18} />
          </button>
          <button 
            onClick={() => onDelete(category.id)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-500"
            aria-label="Eliminar categoría"
          >
            <Trash size={18} />
          </button>
        </div>
      </div>
    </div>
  );
});
SortableCategoryListItem.displayName = 'SortableCategoryListItem';

// Componente principal
const CategoryEditor: React.FC<CategoryEditorProps> = ({ categories, onChange, onMove }) => {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      const oldIndex = categories.findIndex(category => category.id === active.id);
      const newIndex = categories.findIndex(category => category.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Reordenar categorías
        const updatedCategories = arrayMove([...categories], oldIndex, newIndex);
        onChange(updatedCategories);
      }
    }
  };

  // Función para abrir el modal de edición
  const openEditModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
    } else {
      setEditingCategory(null); // Nueva categoría
    }
    setIsModalOpen(true);
  };

  // Función para cerrar el modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  // Función para guardar los cambios
  const handleSave = (category: Category) => {
    let updatedCategories;
    
    if (editingCategory) {
      // Editar categoría existente
      updatedCategories = categories.map(cat => 
        cat.id === category.id ? category : cat
      );
    } else {
      // Añadir nueva categoría
      updatedCategories = [...categories, category];
    }
    
    onChange(updatedCategories);
    closeModal();
    
    toast({
      title: editingCategory ? "Categoría actualizada" : "Categoría creada",
      description: `La categoría "${category.name}" ha sido ${editingCategory ? 'actualizada' : 'creada'} exitosamente.`,
      variant: "success",
    });
  };

  // Abrir diálogo de confirmación para eliminar
  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  // Eliminar categoría
  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      // Intentar eliminar del servidor
      await deleteCategory(deleteId);
      
      // Actualizar estado local
      const updatedCategories = categories.filter(cat => cat.id !== deleteId);
      onChange(updatedCategories);
      
      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada exitosamente.",
        variant: "success",
      });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar la categoría. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Categorías del Menú</h2>
        <button
          onClick={() => openEditModal()}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-1"
        >
          <Plus size={16} /> 
          <span className="hidden sm:inline">Añadir Categoría</span>
          <span className="sm:hidden">Añadir</span>
        </button>
      </div>

      {/* Instrucciones */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        <p>Puedes reordenar las categorías usando los botones de flechas o arrastrando con el icono de agarre. Este orden se mostrará a los clientes.</p>
      </div>
      
      {/* Lista de categorías con drag and drop */}
      {categories.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-2">No hay categorías disponibles</p>
          <button 
            onClick={() => openEditModal()} 
            className="text-blue-500 hover:underline"
          >
            Añadir tu primera categoría
          </button>
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={categories.map(category => category.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {categories.map((category, index) => (
                <SortableCategoryListItem
                  key={category.id}
                  category={category}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === categories.length - 1}
                  onEdit={openEditModal}
                  onDelete={confirmDelete}
                  onMove={onMove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal para crear/editar categoría */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <h3 className="font-medium">
                {editingCategory ? 'Editar Categoría' : 'Añadir Nueva Categoría'}
              </h3>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <CategoryForm
              initialData={editingCategory || undefined}
              onSave={handleSave}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="text-center mb-6">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Confirmar eliminación</h3>
              <p className="text-gray-500">
                ¿Estás seguro de eliminar esta categoría? Esta acción eliminará también todos los platos asociados y no se puede deshacer.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
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

export default CategoryEditor; 