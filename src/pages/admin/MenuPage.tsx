import React, { useState, useEffect } from 'react';
import { MenuItemEditor } from '../../components/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import { useConfig } from '../../context/ConfigContext';

const MenuPage: React.FC = () => {
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
  
  // Guardar cambios
  const handleSaveChanges = async () => {
    const saved = await saveMenuOnly(categories);
    if (saved) {
      setHasChanges(false);
    }
  };
  
  return (
    <AdminLayout 
      title="Menú" 
      hasChanges={hasChanges}
      onSave={handleSaveChanges}
    >
      <div className="p-4">
        {tabLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="w-10 h-10 border-4 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-3">Cargando menú...</span>
          </div>
        ) : (
          <MenuItemEditor 
            categories={categories}
            onChange={handleCategoriesChange}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default MenuPage; 