import React, { useState, useEffect } from 'react';
import { CategoryEditor } from '../../components/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import { useConfig } from '../../context/ConfigContext';

const CategoriesPage: React.FC = () => {
  const { config, saveMenuOnly, loadConfigSection, tabLoading } = useConfig();
  const [categories, setCategories] = useState(config.categories || []);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Cargar categorías cuando se monta el componente
  useEffect(() => {
    const loadMenuData = async () => {
      await loadConfigSection('menu');
    };
    
    loadMenuData();
  }, [loadConfigSection]);
  
  // Actualizar categorías cuando cambia la configuración
  useEffect(() => {
    if (config.categories) {
      setCategories(config.categories);
    }
  }, [config.categories]);
  
  // Manejar cambios en las categorías
  const handleCategoriesChange = (newCategories: typeof categories) => {
    setCategories(newCategories);
    setHasChanges(true);
  };
  
  // Mover una categoría hacia arriba o abajo en la lista
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    
    if (direction === 'up' && index > 0) {
      // Intercambiar con la categoría anterior
      [newCategories[index], newCategories[index - 1]] = [newCategories[index - 1], newCategories[index]];
      setCategories(newCategories);
      setHasChanges(true);
    } else if (direction === 'down' && index < categories.length - 1) {
      // Intercambiar con la categoría siguiente
      [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
      setCategories(newCategories);
      setHasChanges(true);
    }
  };
  
  // Guardar cambios
  const handleSaveChanges = async () => {
    const saved = await saveMenuOnly(categories);
    if (saved) {
      setHasChanges(false);
    }
  };
  
  return (
    <AdminLayout 
      title="Categorías" 
      hasChanges={hasChanges}
      onSave={handleSaveChanges}
    >
      <div className="p-4">
        {tabLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="w-10 h-10 border-4 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-3">Cargando categorías...</span>
          </div>
        ) : (
          <CategoryEditor 
            categories={categories}
            onChange={handleCategoriesChange}
            onMove={handleMoveCategory}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default CategoriesPage; 