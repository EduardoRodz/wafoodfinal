import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import GeneralSettings from '../../components/admin/GeneralSettings';
import { useConfig } from '../../context/ConfigContext';

interface ConfigData {
  restaurantName: string;
  whatsappNumber: string;
  currency: string;
  openingHours: string;
  footerText: string;
}

const ConfigPage: React.FC = () => {
  const { config, saveSiteConfigOnly, loadConfigSection, tabLoading } = useConfig();
  const [configData, setConfigData] = useState<ConfigData>({
    restaurantName: config.restaurantName || '',
    whatsappNumber: config.whatsappNumber || '',
    currency: config.currency || '',
    openingHours: config.openingHours || '',
    footerText: config.footerText || ''
  });
  const [hasChanges, setHasChanges] = useState(false);
  
  // Cargar configuración cuando se monta el componente
  useEffect(() => {
    const loadSiteData = async () => {
      await loadConfigSection('site');
    };
    
    loadSiteData();
  }, [loadConfigSection]);
  
  // Actualizar datos cuando cambia la configuración
  useEffect(() => {
    setConfigData({
      restaurantName: config.restaurantName || '',
      whatsappNumber: config.whatsappNumber || '',
      currency: config.currency || '',
      openingHours: config.openingHours || '',
      footerText: config.footerText || ''
    });
  }, [config.restaurantName, config.whatsappNumber, config.currency, config.openingHours, config.footerText]);
  
  // Manejar cambios en la configuración
  const handleConfigChange = (newConfig: ConfigData) => {
    setConfigData(newConfig);
    setHasChanges(true);
  };
  
  // Guardar cambios
  const handleSaveChanges = async () => {
    const siteConfig = {
      restaurant_name: configData.restaurantName,
      whatsapp_number: configData.whatsappNumber,
      currency: configData.currency,
      opening_hours: configData.openingHours,
      footer_text: configData.footerText
    };
    
    const saved = await saveSiteConfigOnly(siteConfig);
    if (saved) {
      setHasChanges(false);
    }
  };
  
  return (
    <AdminLayout 
      title="Configuración General" 
      hasChanges={hasChanges}
      onSave={handleSaveChanges}
    >
      <div className="p-4">
        {tabLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="w-10 h-10 border-4 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-3">Cargando configuración...</span>
          </div>
        ) : (
          <GeneralSettings 
            config={configData}
            onChange={handleConfigChange}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default ConfigPage; 