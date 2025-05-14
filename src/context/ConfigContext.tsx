import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { defaultConfig, saveConfig as saveConfigToStorage } from '../config';
import { getConfig, saveConfig as saveConfigToSupabase } from '../services/configService';
import { initializeImageStorage } from '../services/imageService';

// Tipo de contexto
interface ConfigContextType {
  config: typeof initialConfig;
  saveConfig: (newConfig: typeof initialConfig) => Promise<boolean>;
  isLoading: boolean;
}

// Crear el contexto
const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  saveConfig: async () => false,
  isLoading: true
});

// Hook personalizado para usar el contexto
export const useConfig = () => useContext(ConfigContext);

// Proveedor del contexto
interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [currentConfig, setCurrentConfig] = useState(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar la configuración desde Supabase
  const loadConfig = async () => {
    try {
      const config = await getConfig();
      setCurrentConfig(config);
      console.log('Configuración cargada desde Supabase');
      
      // Inicializar el almacenamiento de imágenes
      await initializeImageStorage();
    } catch (error) {
      console.error('Error cargando configuración:', error);
      setCurrentConfig(defaultConfig); // Usar configuración por defecto si hay error
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar la configuración inicial
  useEffect(() => {
    loadConfig();
    
    // Escuchar cambios en el evento configSaved para actualizar en tiempo real
    const handleConfigSaved = (event: CustomEvent<any>) => {
      try {
        const newConfig = event.detail;
        setCurrentConfig(newConfig);
        console.log('Configuración actualizada desde evento personalizado');
      } catch (error) {
        console.error('Error al procesar el evento configSaved:', error);
      }
    };
    
    window.addEventListener('configSaved', handleConfigSaved as EventListener);
    
    return () => {
      window.removeEventListener('configSaved', handleConfigSaved as EventListener);
    };
  }, []);

  // Función para guardar la configuración
  const saveConfig = async (newConfig: typeof initialConfig) => {
    try {
      // Guardar en Supabase
      const success = await saveConfigToSupabase(newConfig);
      
      // Actualizar el estado local independientemente del resultado
      setCurrentConfig(newConfig);
      
      return success;
    } catch (error) {
      console.error('Error guardando configuración:', error);
      return false;
    }
  };

  return (
    <ConfigContext.Provider value={{ config: currentConfig, saveConfig, isLoading }}>
      {children}
    </ConfigContext.Provider>
  );
};

export default ConfigContext; 