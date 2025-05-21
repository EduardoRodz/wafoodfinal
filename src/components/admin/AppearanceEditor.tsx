import React, { useState, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { ModernColorPicker } from './index';
import { hexToRgba } from '../../utils/colorUtils';

interface AppearanceEditorProps {
  // Propiedades opcionales
}

const AppearanceEditor: React.FC<AppearanceEditorProps> = () => {
  const { config, saveAppearanceOnly, loadConfigSection, tabLoading, setTabLoading } = useConfig();
  const [formData, setFormData] = useState({
    primaryColor: config.theme?.primaryColor || '#003b29',
    accentColor: config.theme?.accentColor || '#4caf50',
    textColor: config.theme?.textColor || '#333333',
    backgroundColor: config.theme?.backgroundColor || '#ffffff',
    cartButtonColor: config.theme?.cartButtonColor || '#003b29',
    floatingCartButtonColor: config.theme?.floatingCartButtonColor || '#003b29'
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Efecto para cargar los datos de apariencia
  useEffect(() => {
    const loadAppearanceData = async () => {
      console.log("AppearanceEditor - Cargando datos de apariencia...");
      setTabLoading(true);
      try {
        await loadConfigSection('appearance');
      } catch (error) {
        console.error("Error al cargar datos de apariencia:", error);
      } finally {
        setTabLoading(false);
      }
    };

    loadAppearanceData();
  }, [loadConfigSection, setTabLoading]);

  // Actualizar formData cuando cambia config
  useEffect(() => {
    if (config.theme) {
      setFormData({
        primaryColor: config.theme.primaryColor || '#003b29',
        accentColor: config.theme.accentColor || '#4caf50',
        textColor: config.theme.textColor || '#333333',
        backgroundColor: config.theme.backgroundColor || '#ffffff',
        cartButtonColor: config.theme.cartButtonColor || '#003b29',
        floatingCartButtonColor: config.theme.floatingCartButtonColor || '#003b29'
      });
      console.log("AppearanceEditor - Datos de formulario actualizados desde config:", config.theme);
    }
  }, [config.theme]);

  // Manejar cambios en los campos
  const handleColorChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  // Guardar cambios
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      console.log("AppearanceEditor - Guardando cambios de apariencia:", formData);
      
      // Formato para el servicio de configuración
      const appearanceData = {
        primary_color: formData.primaryColor,
        accent_color: formData.accentColor,
        text_color: formData.textColor,
        background_color: formData.backgroundColor,
        cart_button_color: formData.cartButtonColor,
        floating_cart_button_color: formData.floatingCartButtonColor
      };
      
      const success = await saveAppearanceOnly(appearanceData);
      
      if (success) {
        setSaveSuccess(true);
        setHasChanges(false);
        
        // Ocultar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error al guardar configuración de apariencia:", error);
    } finally {
      setSaving(false);
    }
  };

  // Si está cargando, mostrar indicador
  if (tabLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-t-primary rounded-full animate-spin mb-4"
             style={{ borderTopColor: config.theme?.primaryColor || '#003b29' }}></div>
        <p className="text-gray-600">Cargando configuración de apariencia...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Mensaje de éxito */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          ¡Configuración de apariencia guardada con éxito!
        </div>
      )}

      <div className="space-y-6">
        <div className="border rounded-lg p-4 shadow-sm">
          <h3 className="font-medium text-lg mb-4">Colores Principales</h3>
          
          {/* Color Primario */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Color Primario
              <span className="text-xs text-gray-500 ml-2">(usado para botones y acentos)</span>
            </label>
            <ModernColorPicker
              color={formData.primaryColor}
              onChange={color => handleColorChange('primaryColor', color)}
              showPreview={true}
              previewLabel="Vista previa"
              previewStyle={{
                button: {
                  backgroundColor: formData.primaryColor,
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontWeight: 500
                },
                text: {
                  color: formData.primaryColor
                }
              }}
              previewComponents={[
                { type: 'button', label: 'Botón', className: 'px-4 py-2 rounded' },
                { type: 'text', label: 'Texto de ejemplo', className: 'font-medium' }
              ]}
            />
          </div>
          
          {/* Color de Acento */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Color de Acento
              <span className="text-xs text-gray-500 ml-2">(usado para destacar elementos)</span>
            </label>
            <ModernColorPicker
              color={formData.accentColor}
              onChange={color => handleColorChange('accentColor', color)}
            />
          </div>
          
          {/* Color de Texto */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Color de Texto
            </label>
            <ModernColorPicker
              color={formData.textColor}
              onChange={color => handleColorChange('textColor', color)}
              showPreview={true}
              previewComponents={[
                { type: 'text', label: 'Ejemplo de texto con este color', className: 'text-base' }
              ]}
              previewStyle={{
                text: {
                  color: formData.textColor
                }
              }}
            />
          </div>
          
          {/* Color de Fondo */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Color de Fondo
            </label>
            <ModernColorPicker
              color={formData.backgroundColor}
              onChange={color => handleColorChange('backgroundColor', color)}
              showPreview={true}
              previewComponents={[
                { 
                  type: 'custom', 
                  render: () => (
                    <div 
                      style={{ 
                        backgroundColor: formData.backgroundColor, 
                        border: '1px solid #e2e8f0', 
                        padding: '12px', 
                        borderRadius: '4px' 
                      }}
                    >
                      <p style={{ color: formData.textColor }}>Vista previa del color de fondo</p>
                    </div>
                  )
                }
              ]}
            />
          </div>
        </div>
        
        {/* Colores de Botones */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h3 className="font-medium text-lg mb-4">Colores de Botones</h3>
          
          {/* Color de Botón del Carrito */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Color de Botón del Carrito
            </label>
            <ModernColorPicker
              color={formData.cartButtonColor}
              onChange={color => handleColorChange('cartButtonColor', color)}
              showPreview={true}
              previewComponents={[
                { 
                  type: 'button', 
                  label: 'Ver carrito', 
                  className: 'px-4 py-2 rounded flex items-center gap-2 text-white'
                }
              ]}
              previewStyle={{
                button: {
                  backgroundColor: formData.cartButtonColor,
                  color: '#ffffff'
                }
              }}
            />
          </div>
          
          {/* Color de Botón Flotante del Carrito */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Color de Botón Flotante del Carrito
            </label>
            <ModernColorPicker
              color={formData.floatingCartButtonColor}
              onChange={color => handleColorChange('floatingCartButtonColor', color)}
              showPreview={true}
              previewComponents={[
                { 
                  type: 'custom', 
                  render: () => (
                    <div className="flex items-center justify-center">
                      <div 
                        style={{ 
                          backgroundColor: formData.floatingCartButtonColor,
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: '48px',
                          height: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>🛒</span>
                      </div>
                    </div>
                  )
                }
              ]}
            />
          </div>
        </div>
        
        {/* Botón Guardar */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveChanges}
            disabled={saving || !hasChanges}
            className={`
              flex items-center gap-2 px-4 py-2 rounded text-white
              ${(!hasChanges || saving) ? 'bg-gray-400 cursor-not-allowed' : ''}
            `}
            style={{ 
              backgroundColor: (!hasChanges || saving) ? undefined : formData.primaryColor
            }}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-t-white rounded-full animate-spin"></span> 
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceEditor; 