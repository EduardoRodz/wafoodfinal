import supabase, { supabaseAdmin } from '../lib/supabase';
import { defaultConfig } from '../config';

// Función para obtener la configuración desde Supabase
export const getConfig = async () => {
  try {
    // Intentar obtener la configuración más reciente de Supabase
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error al obtener configuración de Supabase:', error);
      throw error;
    }

    if (data && data.length > 0) {
      console.log('Configuración cargada desde Supabase');
      return data[0].config;
    }
    
    // Si no hay datos, intentar usar localStorage como fallback
    const storedConfig = localStorage.getItem('siteConfig');
    if (storedConfig) {
      console.log('Configuración cargada desde localStorage (fallback)');
      const parsedConfig = JSON.parse(storedConfig);
      
      // Guardar esta configuración en Supabase para futuras cargas
      await saveConfig(parsedConfig);
      
      return parsedConfig;
    }

    // Si no hay nada en localStorage, usar la configuración por defecto
    return defaultConfig;
  } catch (error) {
    console.error('Error al cargar configuración:', error);
    
    // En caso de error, intentar localStorage como último recurso
    try {
      const storedConfig = localStorage.getItem('siteConfig');
      if (storedConfig) {
        return JSON.parse(storedConfig);
      }
    } catch {}
    
    // Si todo falla, devolver la configuración predeterminada
    return defaultConfig;
  }
};

// Función para guardar la configuración en Supabase
export const saveConfig = async (newConfig: typeof defaultConfig) => {
  try {
    // Guardar en Supabase
    const { error } = await supabaseAdmin
      .from('site_config')
      .insert({ config: newConfig });
    
    if (error) {
      console.error('Error al guardar configuración en Supabase:', error);
      
      // Si hay error, guardar en localStorage como fallback
      localStorage.setItem('siteConfig', JSON.stringify(newConfig));
      
      // Disparar evento para informar a otros componentes
      const event = new CustomEvent('configSaved', { detail: newConfig });
      window.dispatchEvent(event);
      
      // Devolver false para indicar que no se guardó en Supabase (pero sí en localStorage)
      return false;
    }
    
    // Actualizar también localStorage para mantener compatibilidad hacia atrás
    localStorage.setItem('siteConfig', JSON.stringify(newConfig));
    
    // Disparar evento para informar a otros componentes
    const event = new CustomEvent('configSaved', { detail: newConfig });
    window.dispatchEvent(event);
    
    return true;
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    
    // Intentar guardar en localStorage como última opción
    try {
      localStorage.setItem('siteConfig', JSON.stringify(newConfig));
      
      // Disparar evento
      const event = new CustomEvent('configSaved', { detail: newConfig });
      window.dispatchEvent(event);
    } catch {}
    
    return false;
  }
}; 