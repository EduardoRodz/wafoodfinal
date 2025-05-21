import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { 
  getConfig, 
  saveConfig as saveConfigToSupabase,
  initializeDefaultData,
  getSiteConfig,
  getAppearanceConfig,
  getMenuData,
  getInstallationStatus,
  markInstallationComplete,
  saveSiteConfig,
  saveAppearanceConfig,
  saveMenuData
} from '../services/configService';
import { config as initialConfig } from '../config';
import { initializeImageStorage } from '../services/storageService';

// Tipo para el contexto
interface ConfigContextType {
  config: typeof initialConfig;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  tabLoading: boolean;
  setTabLoading: React.Dispatch<React.SetStateAction<boolean>>;
  saveConfig: (newConfig: typeof initialConfig) => Promise<boolean>;
  saveSiteConfigOnly: (siteConfig: any) => Promise<boolean>;
  saveAppearanceOnly: (appearance: any) => Promise<boolean>;
  saveMenuOnly: (categories: any[]) => Promise<boolean>;
  loadConfigSection: (section: 'site' | 'appearance' | 'menu' | 'all') => Promise<void>;
  sectionLoaded: {
    site: boolean;
    appearance: boolean;
    menu: boolean;
  };
  setCurrentConfig: React.Dispatch<React.SetStateAction<typeof initialConfig>>;
  updateDocumentMetadata: (restaurantName: string) => void;
}

// Crear el contexto
const ConfigContext = createContext<ConfigContextType>({
  config: initialConfig,
  isLoading: true,
  setIsLoading: () => {},
  tabLoading: false,
  setTabLoading: () => {},
  saveConfig: async () => false,
  saveSiteConfigOnly: async () => false,
  saveAppearanceOnly: async () => false,
  saveMenuOnly: async () => false,
  loadConfigSection: async () => {},
  sectionLoaded: {
    site: false,
    appearance: false,
    menu: false
  },
  setCurrentConfig: () => {},
  updateDocumentMetadata: () => {}
});

// Hook personalizado para usar el contexto
export const useConfig = () => useContext(ConfigContext);

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [currentConfig, setCurrentConfig] = useState(initialConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [sectionLoaded, setSectionLoaded] = useState<{
    site: boolean;
    appearance: boolean;
    menu: boolean;
  }>({
    site: false,
    appearance: false,
    menu: false
  });

  // Utilizar refs para cachear datos y evitar consultas repetidas
  const cachedData = useRef<{
    siteConfig: any | null;
    appearanceConfig: any | null;
    menuData: any[] | null;
    lastFetchTime: {
      site: number;
      appearance: number;
      menu: number;
    }
  }>({
    siteConfig: null,
    appearanceConfig: null,
    menuData: null,
    lastFetchTime: {
      site: 0,
      appearance: 0,
      menu: 0
    }
  });

  // Función para actualizar los metadatos del documento
  const updateDocumentMetadata = useCallback((restaurantName: string) => {
    // Actualizar el título de la página
    document.title = `${restaurantName} - WAFOOD`;
    
    // Actualizar las meta etiquetas para Open Graph
    // Buscar etiquetas existentes o crearlas si no existen
    const metaTags = {
      title: document.querySelector('meta[property="og:title"]'),
      description: document.querySelector('meta[property="og:description"]'),
      type: document.querySelector('meta[property="og:type"]')
    };
    
    // Actualizar etiqueta og:title
    if (metaTags.title) {
      metaTags.title.setAttribute('content', `${restaurantName} - WAFOOD`);
    } else {
      const ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.setAttribute('content', `${restaurantName} - WAFOOD`);
      document.head.appendChild(ogTitle);
    }
    
    // Actualizar etiqueta og:description
    if (metaTags.description) {
      metaTags.description.setAttribute('content', 'Sistema de ordenar comida por WhatsApp');
    } else {
      const ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      ogDesc.setAttribute('content', 'Sistema de ordenar comida por WhatsApp');
      document.head.appendChild(ogDesc);
    }
    
    // Actualizar etiqueta og:type
    if (metaTags.type) {
      metaTags.type.setAttribute('content', 'website');
    } else {
      const ogType = document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      ogType.setAttribute('content', 'website');
      document.head.appendChild(ogType);
    }
    
    console.log(`Metadatos del documento actualizados con el restaurante: ${restaurantName}`);
  }, []);

  // Función para cargar configuración por secciones con manejo de caché
  const loadConfigSection = async (section: 'site' | 'appearance' | 'menu' | 'all') => {
    try {
      // Establecer estado de carga
      setTabLoading(true);
      console.log(`Iniciando carga de sección: ${section}`);
      
      // Función para verificar si una sección tiene datos válidos
      const hasValidData = (sectionName: 'site' | 'appearance' | 'menu') => {
        if (sectionName === 'site') {
          const valid = Boolean(currentConfig.restaurantName && currentConfig.whatsappNumber && currentConfig.currency);
          console.log(`Validación site_config: ${valid ? 'COMPLETO' : 'INCOMPLETO'}`);
          if (!valid) {
            console.log('Datos faltantes en site_config:', {
              restaurantName: currentConfig.restaurantName ? 'OK' : 'FALTA',
              whatsappNumber: currentConfig.whatsappNumber ? 'OK' : 'FALTA',
              currency: currentConfig.currency ? 'OK' : 'FALTA'
            });
          }
          return valid;
        } else if (sectionName === 'appearance') {
          const valid = Boolean(
            currentConfig.theme && 
            currentConfig.theme.primaryColor && 
            currentConfig.theme.backgroundColor
          );
          console.log(`Validación appearance_config: ${valid ? 'COMPLETO' : 'INCOMPLETO'}`);
          if (!valid) {
            console.log('Datos faltantes en appearance_config:', {
              theme: currentConfig.theme ? 'OK' : 'FALTA',
              primaryColor: currentConfig.theme?.primaryColor ? 'OK' : 'FALTA',
              backgroundColor: currentConfig.theme?.backgroundColor ? 'OK' : 'FALTA'
            });
          }
          return valid;
        } else if (sectionName === 'menu') {
          const valid = Array.isArray(currentConfig.categories) && currentConfig.categories.length > 0;
          console.log(`Validación menu: ${valid ? 'COMPLETO' : 'INCOMPLETO'} (${currentConfig.categories.length} categorías)`);
          return valid;
        }
        return false;
      };
      
      // Si está cargando la sección y ya está marcada como cargada Y tiene datos válidos, no hacemos nada
      if (section !== 'all' && sectionLoaded[section] && hasValidData(section)) {
        console.log(`La sección ${section} ya está cargada y tiene datos válidos, usando caché...`);
        setTabLoading(false);
        return;
      } else if (section !== 'all' && sectionLoaded[section]) {
        console.log(`La sección ${section} está marcada como cargada pero faltan datos, recargando...`);
      }
      
      let updatedConfig = { ...currentConfig };
      let needsUpdate = false;

      // Cargar solo las secciones necesarias
      if ((section === 'site' || section === 'all') && (!sectionLoaded.site || !hasValidData('site'))) {
        console.log('Cargando configuración del sitio desde Supabase...');
        // Cargar configuración del sitio
        const siteConfig = await getSiteConfig();
        // Almacenar en caché
        cachedData.current.siteConfig = siteConfig;
        cachedData.current.lastFetchTime.site = Date.now();
        
        // Usar directamente los valores recibidos de la base de datos
        updatedConfig = {
          ...updatedConfig,
          restaurantName: siteConfig.restaurant_name || '',
          whatsappNumber: siteConfig.whatsapp_number || '',
          currency: siteConfig.currency || '',
          openingHours: siteConfig.opening_hours || '',
          footerText: siteConfig.footer_text || '',
        };
        console.log('Datos de site_config cargados:', {
          restaurantName: updatedConfig.restaurantName,
          whatsappNumber: updatedConfig.whatsappNumber,
          currency: updatedConfig.currency
        });
        needsUpdate = true;
        setSectionLoaded(prev => ({...prev, site: true}));
      }
      
      if ((section === 'appearance' || section === 'all') && (!sectionLoaded.appearance || !hasValidData('appearance'))) {
        console.log('Cargando configuración de apariencia desde Supabase...');
        // Cargar configuración de apariencia
        const appearanceConfig = await getAppearanceConfig();
        // Almacenar en caché
        cachedData.current.appearanceConfig = appearanceConfig;
        cachedData.current.lastFetchTime.appearance = Date.now();
        
        // Validar que los datos recibidos contengan al menos los campos más importantes
        console.log('Datos de apariencia recibidos:', appearanceConfig);
        
        // Usar directamente los valores recibidos de la base de datos, con fallbacks
        updatedConfig = {
          ...updatedConfig,
          theme: {
            primaryColor: appearanceConfig.primary_color || '#003b29',
            accentColor: appearanceConfig.accent_color || '#4caf50',
            textColor: appearanceConfig.text_color || '#333333',
            backgroundColor: appearanceConfig.background_color || '#ffffff',
            cartButtonColor: appearanceConfig.cart_button_color || '#003b29',
            floatingCartButtonColor: appearanceConfig.floating_cart_button_color || '#003b29'
          }
        };
        console.log('Datos de theme aplicados:', updatedConfig.theme);
        needsUpdate = true;
        setSectionLoaded(prev => ({...prev, appearance: true}));
      }
      
      if ((section === 'menu' || section === 'all') && (!sectionLoaded.menu || !hasValidData('menu'))) {
        console.log('Cargando datos del menú desde Supabase...');
        
        try {
          // getMenuData ya implementa caché interna
          const menuData = await getMenuData();
          
          // Usar directamente los datos del menú recibidos
          updatedConfig = {
            ...updatedConfig,
            categories: menuData
          };
          needsUpdate = true;
          setSectionLoaded(prev => ({...prev, menu: true}));
          console.log(`Datos del menú cargados: ${menuData.length} categorías`);
        } catch (menuError) {
          console.error('Error al cargar el menú:', menuError);
        }
      }
      
      // Solo actualizar el estado si hubo cambios
      if (needsUpdate) {
        setCurrentConfig(updatedConfig);
        console.log(`✅ Sección '${section}' actualizada correctamente`);
      } else {
        console.log(`ℹ️ No fue necesario actualizar la sección '${section}', ya estaba cargada o sin cambios`);
      }
    } catch (error) {
      console.error(`❌ Error cargando sección '${section}' de configuración:`, error);
    } finally {
      setTabLoading(false);
    }
  };

  // Cargar la configuración inicial solo una vez al montar el componente
  useEffect(() => {
    const loadInitialConfig = async () => {
      try {
        setIsLoading(true);
        console.log('Cargando configuración inicial completa...');
        
        // Usamos la función getConfig que ya implementa la caché interna
        // Esto evitará múltiples llamadas a la BD 
        const completeConfig = await getConfig();
        
        // Actualizar estado y caché
        const now = Date.now();
        
        if (completeConfig) {
          // Usar directamente la configuración desde Supabase sin aplicar valores por defecto
          setCurrentConfig(completeConfig);
          
          // Extraer los datos específicos para la caché
          const siteConfig = {
            restaurant_name: completeConfig.restaurantName,
            whatsapp_number: completeConfig.whatsappNumber,
            currency: completeConfig.currency,
            opening_hours: completeConfig.openingHours,
            footer_text: completeConfig.footerText || '',
            installation_status: 'completed'
          };
          
          const appearanceConfig = {
            primary_color: completeConfig.theme.primaryColor,
            accent_color: completeConfig.theme.accentColor,
            text_color: completeConfig.theme.textColor,
            background_color: completeConfig.theme.backgroundColor,
            cart_button_color: completeConfig.theme.cartButtonColor,
            floating_cart_button_color: completeConfig.theme.floatingCartButtonColor
          };
          
          // Almacenar en caché local
          cachedData.current = {
            siteConfig,
            appearanceConfig,
            menuData: completeConfig.categories,
            lastFetchTime: {
              site: now,
              appearance: now,
              menu: now
            }
          };
          
          // Marcar todas las secciones como cargadas
          setSectionLoaded({
            site: true,
            appearance: true,
            menu: true
          });
          
          // Actualizar metadatos del documento
          updateDocumentMetadata(completeConfig.restaurantName);
          
          console.log('Configuración completa inicial cargada desde Supabase (datos originales sin modificar)');
        }
        
        // Inicializar el almacenamiento de imágenes solo una vez
        await initializeImageStorage();
      } catch (error) {
        console.error('Error cargando configuración inicial:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialConfig();
    
    // Escuchar eventos de configuración guardada
    const handleConfigSaved = (event: CustomEvent<any>) => {
      try {
        if (event.detail && 'config' in event.detail) {
          const { config: newConfig, success, errors } = event.detail;
          setCurrentConfig(newConfig);
          
          // Actualizar caché según las secciones actualizadas
          const now = Date.now();
          if (newConfig) {
            // Actualizar caché de sitio
            if (newConfig.restaurantName) {
              cachedData.current.siteConfig = {
                ...cachedData.current.siteConfig,
                restaurant_name: newConfig.restaurantName,
                whatsapp_number: newConfig.whatsappNumber,
                currency: newConfig.currency,
                opening_hours: newConfig.openingHours,
                footer_text: newConfig.footerText
              };
              cachedData.current.lastFetchTime.site = now;
            }
            
            // Actualizar caché de apariencia
            if (newConfig.theme) {
              cachedData.current.appearanceConfig = {
                ...cachedData.current.appearanceConfig,
                primary_color: newConfig.theme.primaryColor,
                accent_color: newConfig.theme.accentColor,
                text_color: newConfig.theme.textColor,
                background_color: newConfig.theme.backgroundColor,
                cart_button_color: newConfig.theme.cartButtonColor,
                floating_cart_button_color: newConfig.theme.floatingCartButtonColor
              };
              cachedData.current.lastFetchTime.appearance = now;
            }
            
            // Actualizar caché de menú
            if (newConfig.categories) {
              cachedData.current.menuData = newConfig.categories;
              cachedData.current.lastFetchTime.menu = now;
            }
          }
          
          if (success) {
            console.log('Configuración actualizada desde evento personalizado');
          } else {
            console.warn('Configuración actualizada con errores:', errors);
          }
        } else {
          // Compatibilidad con el formato antiguo
        const newConfig = event.detail;
        setCurrentConfig(newConfig);
          console.log('Configuración actualizada desde evento personalizado (formato antiguo)');
        }
      } catch (error) {
        console.error('Error al procesar el evento configSaved:', error);
      }
    };
    
    // Escuchar eventos de menú guardado
    const handleMenuSaved = () => {
      console.log('Evento menuSaved recibido - actualizando datos de menú');
      // En lugar de invalidar la caché y volver a cargar, utilizamos la caché
      // que ya ha sido actualizada en el servicio
      loadConfigSection('menu');
    };
    
    window.addEventListener('configSaved', handleConfigSaved as EventListener);
    window.addEventListener('menuSaved', handleMenuSaved);
    
    return () => {
      window.removeEventListener('configSaved', handleConfigSaved as EventListener);
      window.removeEventListener('menuSaved', handleMenuSaved);
    };
  }, [updateDocumentMetadata]);

  // Función para guardar la configuración completa
  const saveConfig = async (newConfig: typeof initialConfig) => {
    try {
      setIsLoading(true);
      const saved = await saveConfigToSupabase(newConfig);
      
      if (saved) {
        setCurrentConfig(newConfig);
        
        // Actualizar caché
        const now = Date.now();
        
        // Actualizar caché de sitio
        cachedData.current.siteConfig = {
          restaurant_name: newConfig.restaurantName,
          whatsapp_number: newConfig.whatsappNumber,
          currency: newConfig.currency,
          opening_hours: newConfig.openingHours,
          footer_text: newConfig.footerText,
          installation_status: 'completed'
        };
        cachedData.current.lastFetchTime.site = now;
        
        // Actualizar caché de apariencia
        cachedData.current.appearanceConfig = {
          primary_color: newConfig.theme.primaryColor,
          accent_color: newConfig.theme.accentColor,
          text_color: newConfig.theme.textColor,
          background_color: newConfig.theme.backgroundColor,
          cart_button_color: newConfig.theme.cartButtonColor,
          floating_cart_button_color: newConfig.theme.floatingCartButtonColor
        };
        cachedData.current.lastFetchTime.appearance = now;
        
        // Actualizar caché de menú
        cachedData.current.menuData = newConfig.categories;
        cachedData.current.lastFetchTime.menu = now;
        
        // Actualizar metadatos con el nuevo nombre del restaurante
        updateDocumentMetadata(newConfig.restaurantName);
      }
      
      return saved;
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para guardar solo la configuración del sitio
  const saveSiteConfigOnly = async (siteConfig: any) => {
    try {
      setIsLoading(true);
      const siteConfigData = {
        restaurant_name: siteConfig.restaurantName,
        whatsapp_number: siteConfig.whatsappNumber,
        currency: siteConfig.currency,
        opening_hours: siteConfig.openingHours,
        footer_text: siteConfig.footerText,
        installation_status: 'completed'
      };
      
      const saved = await saveSiteConfig(siteConfigData);
      
      if (saved) {
        setCurrentConfig(prev => ({
          ...prev,
          restaurantName: siteConfig.restaurantName,
          whatsappNumber: siteConfig.whatsappNumber,
          currency: siteConfig.currency,
          openingHours: siteConfig.openingHours,
          footerText: siteConfig.footerText,
        }));
        
        // Actualizar caché
        cachedData.current.siteConfig = siteConfigData;
        cachedData.current.lastFetchTime.site = Date.now();
        
        // Actualizar metadatos con el nuevo nombre del restaurante
        updateDocumentMetadata(siteConfig.restaurantName);
      }
      
      return saved;
    } catch (error) {
      console.error('Error al guardar configuración del sitio:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para guardar solo la configuración de apariencia
  const saveAppearanceOnly = async (appearance: any) => {
    try {
      setIsLoading(true);
      const appearanceData = {
        primary_color: appearance.primaryColor,
        accent_color: appearance.accentColor,
        text_color: appearance.textColor,
        background_color: appearance.backgroundColor,
        cart_button_color: appearance.cartButtonColor,
        floating_cart_button_color: appearance.floatingCartButtonColor
      };
      
      const saved = await saveAppearanceConfig(appearanceData);
      
      if (saved) {
        setCurrentConfig(prev => ({
          ...prev,
          theme: {
            primaryColor: appearance.primaryColor,
            accentColor: appearance.accentColor,
            textColor: appearance.textColor,
            backgroundColor: appearance.backgroundColor,
            cartButtonColor: appearance.cartButtonColor,
            floatingCartButtonColor: appearance.floatingCartButtonColor
          }
        }));
        
        // Actualizar caché
        cachedData.current.appearanceConfig = appearanceData;
        cachedData.current.lastFetchTime.appearance = Date.now();
      }
      
      return saved;
    } catch (error) {
      console.error('Error al guardar configuración de apariencia:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para guardar solo el menú
  const saveMenuOnly = async (categories: any[]) => {
    try {
      setIsLoading(true);
      const saved = await saveMenuData(categories);
      
      if (saved) {
        setCurrentConfig(prev => ({
          ...prev,
          categories
        }));
        
        // Actualizar caché
        cachedData.current.menuData = categories;
        cachedData.current.lastFetchTime.menu = Date.now();
      }
      
      return saved;
    } catch (error) {
      console.error('Error al guardar menú:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConfigContext.Provider value={{ 
      config: currentConfig, 
      isLoading,
      setIsLoading,
      tabLoading,
      setTabLoading,
      saveConfig, 
      saveSiteConfigOnly,
      saveAppearanceOnly,
      saveMenuOnly,
      loadConfigSection,
      sectionLoaded,
      setCurrentConfig,
      updateDocumentMetadata
    }}>
      {children}
    </ConfigContext.Provider>
  );
};

export default ConfigContext; 