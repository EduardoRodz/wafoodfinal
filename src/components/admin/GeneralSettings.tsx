import React, { useState, useEffect } from 'react';

interface GeneralSettingsProps {
  config: {
    restaurantName?: string;
    whatsappNumber?: string;
    currency?: string;
    openingHours?: string;
    footerText?: string;
  };
  onChange: (newSettings: {
    restaurantName: string;
    whatsappNumber: string;
    currency: string;
    openingHours: string;
    footerText: string;
  }) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ config, onChange }) => {
  // Estados locales para los campos principales
  const [localSettings, setLocalSettings] = useState({
    restaurantName: '',
    whatsappNumber: '',
    currency: '',
    openingHours: '',
    footerText: ''
  });
  
  // Actualizar estados locales cuando cambia config
  useEffect(() => {
    console.log('Config recibido en GeneralSettings:', config);
    if (config) {
      // Asegurar que config siempre sea un objeto válido
      const safeConfig = config || {};
      
      setLocalSettings({
        restaurantName: safeConfig.restaurantName || '',
        whatsappNumber: safeConfig.whatsappNumber || '',
        currency: safeConfig.currency || '',
        openingHours: safeConfig.openingHours || '',
        footerText: safeConfig.footerText || ''
      });
    }
  }, [config]);

  // Función que maneja los cambios asegurando que respetamos los tipos
  const handleConfigChange = (field: string, value: any) => {
    // Actualizar estado local
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Enviar todos los cambios al componente padre
    onChange({
      ...localSettings,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Configuración General</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del Restaurante</label>
          <input
            type="text"
            value={localSettings.restaurantName}
            onChange={(e) => handleConfigChange('restaurantName', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ingrese el nombre del restaurante"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Número de WhatsApp</label>
          <input
            type="text"
            value={localSettings.whatsappNumber}
            onChange={(e) => handleConfigChange('whatsappNumber', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ej: 123456789 (sin espacios ni símbolos)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formato: código de país + número, sin espacios ni símbolos. Ej: 18091234567
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Símbolo de Moneda</label>
          <input
            type="text"
            value={localSettings.currency}
            onChange={(e) => handleConfigChange('currency', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ej: $"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Horario de Apertura</label>
          <input
            type="text"
            value={localSettings.openingHours}
            onChange={(e) => handleConfigChange('openingHours', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ej: 9:00 AM - 10:00 PM"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Texto del Pie de Página</label>
        <input
          type="text"
          value={localSettings.footerText}
          onChange={(e) => handleConfigChange('footerText', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Ej: © 2023 Mi Restaurante. Todos los derechos reservados."
        />
        <p className="text-xs text-gray-500 mt-1">
          Este texto se mostrará en el pie de página de su sitio web.
        </p>
      </div>
    </div>
  );
};

export default GeneralSettings; 