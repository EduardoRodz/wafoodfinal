import React, { useState, useRef } from 'react';
import { Edit, Trash, Plus, Check, X, Image, ChevronUp, ChevronDown, Upload } from 'lucide-react';
import { uploadImage } from '../../services/imageService';

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

const MenuItemEditor: React.FC<MenuItemEditorProps> = ({ categories, onChange }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<MenuItem>({
    id: '',
    name: '',
    description: '',
    price: 0,
    image: 'https://placehold.co/300x200/jpeg'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Encontrar la categoría seleccionada
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  const menuItems = selectedCategory?.items || [];

  // Generar un ID basado en el nombre
  const generateIdFromName = (name: string): string => {
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

  const handleEdit = (index: number) => {
    if (selectedCategory) {
      setEditingItemIndex(index);
      setNewItem({ ...selectedCategory.items[index] });
      setShowAddForm(false);
    }
  };

  const handleAdd = () => {
    setEditingItemIndex(null);
    setNewItem({
      id: '',
      name: '',
      description: '',
      price: 0,
      image: 'https://placehold.co/300x200/jpeg'
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setEditingItemIndex(null);
    setShowAddForm(false);
    setUploadError(null);
  };

  const handleSave = () => {
    if (!newItem.name.trim()) {
      alert('El nombre del plato es obligatorio');
      return;
    }

    if (!selectedCategory) return;

    const updatedCategories = [...categories];
    const categoryIndex = updatedCategories.findIndex(cat => cat.id === selectedCategoryId);
    
    if (categoryIndex === -1) return;

    // Si estamos editando un elemento existente
    if (editingItemIndex !== null) {
      const updatedItems = [...updatedCategories[categoryIndex].items];
      updatedItems[editingItemIndex] = { ...newItem };
      updatedCategories[categoryIndex].items = updatedItems;
    } 
    // Si estamos añadiendo un nuevo elemento
    else if (showAddForm) {
      // Generar ID si no se proporcionó
      const itemToAdd = {
        ...newItem,
        id: newItem.id.trim() || generateIdFromName(newItem.name)
      };
      
      updatedCategories[categoryIndex].items = [
        ...updatedCategories[categoryIndex].items,
        itemToAdd
      ];
    }

    onChange(updatedCategories);
    handleCancel();
  };

  const handleDelete = (index: number) => {
    if (!selectedCategory) return;
    
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${selectedCategory.items[index].name}"?`)) {
      const updatedCategories = [...categories];
      const categoryIndex = updatedCategories.findIndex(cat => cat.id === selectedCategoryId);
      
      if (categoryIndex === -1) return;

      const updatedItems = [...updatedCategories[categoryIndex].items];
      updatedItems.splice(index, 1);
      updatedCategories[categoryIndex].items = updatedItems;
      
      onChange(updatedCategories);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewItem({
      ...newItem,
      name,
      // Solo actualizar el ID automáticamente si estamos añadiendo y el usuario no ha introducido un ID
      id: showAddForm && !newItem.id ? generateIdFromName(name) : newItem.id
    });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (!selectedCategory) return;
    
    // No hacer nada si intenta mover el primer elemento hacia arriba o el último hacia abajo
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === selectedCategory.items.length - 1)) {
      return;
    }
    
    const updatedCategories = [...categories];
    const categoryIndex = updatedCategories.findIndex(cat => cat.id === selectedCategoryId);
    
    if (categoryIndex === -1) return;
    
    const items = [...updatedCategories[categoryIndex].items];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Intercambiar elementos
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    
    updatedCategories[categoryIndex].items = items;
    onChange(updatedCategories);
  };

  // Función para manejar la subida de imágenes
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const result = await uploadImage(file);
      
      // Actualizar el estado con la URL de la imagen
      setNewItem({ ...newItem, image: result.url });
      
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      setUploadError(error.message || 'Error al subir la imagen');
    } finally {
      setIsUploading(false);
      // Limpiar el input para permitir seleccionar el mismo archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Función para abrir el selector de archivos
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Editor de Platos</h2>

      {/* Selector de categoría */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Categoría</label>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de elementos del menú */}
      {selectedCategory && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Platos en {selectedCategory.name}</h3>
            {!showAddForm && editingItemIndex === null && (
              <button
                onClick={handleAdd}
                className="flex items-center gap-1 text-sm py-1 px-3 bg-gray-100 hover:bg-gray-200 rounded"
              >
                <Plus size={16} /> Añadir Plato
              </button>
            )}
          </div>

          {/* Instrucciones de ordenamiento */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <p className="flex items-center">
              <span className="mr-2">ℹ️</span>
              <span>Ahora puedes cambiar el orden de los platos usando los botones <ChevronUp size={14} className="inline mx-1" /> y <ChevronDown size={14} className="inline mx-1" /> en la columna "Orden / Acciones". El orden en que aparecen aquí será el mismo que verán los clientes en el menú.</span>
            </p>
          </div>

          {/* Formulario para añadir/editar */}
          {(showAddForm || editingItemIndex !== null) && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <h4 className="font-medium mb-3">
                {editingItemIndex !== null ? 'Editar Plato' : 'Añadir Nuevo Plato'}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={handleNameChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Ej: Hamburguesa Clásica"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-1">ID (slug)</label>
                  <input
                    type="text"
                    value={newItem.id}
                    onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Ej: hamburguesa-clasica"
                    disabled={editingItemIndex !== null}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    El ID debe ser único. Se generará automáticamente si lo dejas en blanco.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm mb-1">Descripción</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                    rows={2}
                    placeholder="Breve descripción del plato"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-1">Precio</label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-1">Imagen</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newItem.image}
                      onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                      className="flex-1 p-2 border border-gray-300 rounded"
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                    <button
                      onClick={triggerFileInput}
                      disabled={isUploading}
                      className="flex items-center gap-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded"
                      type="button"
                    >
                      {isUploading ? (
                        <span>Subiendo...</span>
                      ) : (
                        <>
                          <Upload size={16} /> Subir
                        </>
                      )}
                    </button>
                    {/* Input oculto para la carga de archivos */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                  {uploadError && (
                    <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Ingresa la URL de una imagen o sube una desde tu dispositivo.
                  </p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    {newItem.image ? (
                      <img 
                        src={newItem.image} 
                        alt="Vista previa" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/300x200/jpeg';
                        }}
                      />
                    ) : (
                      <Image className="text-gray-400" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">
                      Vista previa. Recomendamos usar imágenes cuadradas de al menos 300x300 píxeles.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={handleCancel}
                    className="py-1 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
                  >
                    <Check size={16} /> Guardar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de platos */}
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imagen
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orden / Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {menuItems.length > 0 ? (
                  menuItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/300x200/jpeg';
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">ID: {item.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 line-clamp-2">{item.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.price.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="flex flex-col">
                            <button 
                              onClick={() => handleMoveItem(index, 'up')}
                              disabled={index === 0}
                              className={`text-gray-600 hover:text-gray-900 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                              title="Mover arriba"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <span className="text-xs text-center text-gray-500">{index + 1}</span>
                            <button 
                              onClick={() => handleMoveItem(index, 'down')}
                              disabled={index === menuItems.length - 1}
                              className={`text-gray-600 hover:text-gray-900 ${index === menuItems.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                              title="Mover abajo"
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>
                          <button 
                            onClick={() => handleEdit(index)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No hay platos en esta categoría. ¡Añade el primero!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default MenuItemEditor; 