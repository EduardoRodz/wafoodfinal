import { getSupabaseAdmin } from '../lib/supabase';
import { config as defaultConfig } from '../config';

// Interfaces para las tablas
export interface SiteConfig {
  id?: number;
  restaurant_name: string;
  whatsapp_number: string;
  currency: string;
  opening_hours: string;
  installation_status: string;
  footer_text?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppearanceConfig {
  id?: number;
  primary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  cart_button_color: string;
  floating_cart_button_color: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id?: number;
  category_id: string;
  name: string;
  icon: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id?: number;
  item_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  display_order: number;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

// Caché interna para evitar consultas duplicadas
let cachedData = {
  menuData: null as any[] | null,
  categoriesData: null as any[] | null,
  menuItemsData: null as any[] | null,
  lastFetchTime: 0,
  cacheValid: false,
  // Añadimos un contador para realizar seguimiento de las solicitudes
  requestCounter: {
    categories: 0,
    menuItems: 0
  }
};

// Duración de la caché en milisegundos (5 minutos)
const CACHE_DURATION = 5 * 60 * 1000;

// Función para depurar las solicitudes de caché
const logCacheStatus = (source: string) => {
  console.log(`[CACHÉ ${source}] Estado actual:`, 
    `Valid: ${cachedData.cacheValid}`, 
    `Age: ${(Date.now() - cachedData.lastFetchTime)/1000}s`,
    `Requests: Cat=${cachedData.requestCounter.categories}, Items=${cachedData.requestCounter.menuItems}`
  );
};

// Función para obtener la configuración general del sitio
export const getSiteConfig = async (): Promise<SiteConfig> => {
  try {
    // Intentar obtener la configuración de la base de datos
    console.log('Consultando site_config en Supabase...');
    const supabaseAdmin = await getSupabaseAdmin();
    const { data, error, count } = await supabaseAdmin
      .from('site_config')
      .select('*', { count: 'exact' })
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error al obtener configuración del sitio:', error);
      throw error;
    }

    // Mostrar diagnóstico
    console.log(`Registros encontrados en site_config: ${count || 0}`);
    
    if (data && data.length > 0) {
      console.log('Configuración del sitio cargada desde Supabase:', data[0]);
      return data[0] as SiteConfig;
    }

    // Si no hay datos, devolver un objeto vacío sin valores predeterminados
    console.log('No se encontró configuración del sitio en la base de datos');
    return {
      restaurant_name: '',
      whatsapp_number: '',
      currency: '',
      opening_hours: '',
      installation_status: 'pending',
      footer_text: ''
    };
  } catch (error) {
    console.error('Error al cargar configuración del sitio:', error);
    
    // En caso de error, devolver un objeto vacío sin valores predeterminados
    return {
      restaurant_name: '',
      whatsapp_number: '',
      currency: '',
      opening_hours: '',
      installation_status: 'pending',
      footer_text: ''
    };
  }
};

// Función para guardar la configuración general del sitio
export const saveSiteConfig = async (config: SiteConfig): Promise<boolean> => {
  try {
    console.log('Guardando configuración del sitio:', config);
    
    // Primero verificamos si ya existe algún registro
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: existingData, error: fetchError } = await supabaseAdmin
      .from('site_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('Error al buscar configuración existente:', fetchError);
      return false;
    }
    
    let result;
    
    // Si ya existe al menos un registro, lo actualizamos usando su ID
    if (existingData && existingData.length > 0) {
      console.log(`Actualizando registro existente con ID: ${existingData[0].id}`);
      
      // Preservar valores existentes y solo actualizar los proporcionados
      const updatedConfig = {
        ...existingData[0],
        // Solo actualizar campos que no sean vacíos o undefined
        restaurant_name: config.restaurant_name || existingData[0].restaurant_name,
        whatsapp_number: config.whatsapp_number || existingData[0].whatsapp_number,
        currency: config.currency || existingData[0].currency,
        opening_hours: config.opening_hours || existingData[0].opening_hours,
        installation_status: config.installation_status || existingData[0].installation_status,
        footer_text: config.footer_text !== undefined ? config.footer_text : existingData[0].footer_text,
        updated_at: new Date().toISOString()
      };
      
      console.log('Configuración actualizada con preservación de datos:', updatedConfig);
      
      const { data, error } = await supabaseAdmin
        .from('site_config')
        .update(updatedConfig)
        .eq('id', existingData[0].id)
        .select();
      
      result = { data, error };
    } else {
      // Si no existe ningún registro, lo insertamos
      console.log('No hay registros previos, creando nueva configuración');
      const { data, error } = await supabaseAdmin
        .from('site_config')
        .insert(config)
        .select();
      
      result = { data, error };
    }
    
    if (result.error) {
      console.error('Error al guardar configuración del sitio:', result.error);
      return false;
    }
    
    console.log('Configuración del sitio guardada correctamente, respuesta:', result.data);
    return true;
  } catch (error) {
    console.error('Error al guardar configuración del sitio:', error);
    return false;
  }
};

// Función para obtener la configuración de apariencia
export const getAppearanceConfig = async (): Promise<AppearanceConfig> => {
  try {
    console.log('Consultando appearance_config en Supabase...');
    const supabaseAdmin = await getSupabaseAdmin();
    const { data, error, count } = await supabaseAdmin
      .from('appearance_config')
      .select('*', { count: 'exact' })
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error al obtener configuración de apariencia:', error);
      throw error;
    }

    console.log(`Registros encontrados en appearance_config: ${count || 0}`);
    
    if (data && data.length > 0) {
      console.log('Configuración de apariencia cargada desde Supabase:', data[0]);
      return data[0] as AppearanceConfig;
    }

    // Si no hay datos, devolver un objeto vacío sin valores predeterminados
    console.log('No se encontró configuración de apariencia en la base de datos');
    return {
      primary_color: '',
      accent_color: '',
      text_color: '',
      background_color: '',
      cart_button_color: '',
      floating_cart_button_color: ''
    };
  } catch (error) {
    console.error('Error al cargar configuración de apariencia:', error);
    
    // En caso de error, devolver un objeto vacío sin valores predeterminados
    return {
      primary_color: '',
      accent_color: '',
      text_color: '',
      background_color: '',
      cart_button_color: '',
      floating_cart_button_color: ''
    };
  }
};

// Función para guardar la configuración de apariencia
export const saveAppearanceConfig = async (config: AppearanceConfig): Promise<boolean> => {
  try {
    console.log('Guardando configuración de apariencia:', config);
    
    // Primero verificamos si ya existe algún registro
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: existingData, error: fetchError } = await supabaseAdmin
      .from('appearance_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('Error al buscar configuración de apariencia existente:', fetchError);
      return false;
    }
    
    let result;
    
    // Si ya existe al menos un registro, lo actualizamos usando su ID
    if (existingData && existingData.length > 0) {
      console.log(`Actualizando configuración de apariencia existente con ID: ${existingData[0].id}`);
      
      // Preservar valores existentes y solo actualizar los proporcionados
      const updatedConfig = {
        ...existingData[0],
        // Solo actualizar campos que no sean vacíos o undefined
        primary_color: config.primary_color || existingData[0].primary_color,
        accent_color: config.accent_color || existingData[0].accent_color,
        text_color: config.text_color || existingData[0].text_color,
        background_color: config.background_color || existingData[0].background_color,
        cart_button_color: config.cart_button_color || existingData[0].cart_button_color,
        floating_cart_button_color: config.floating_cart_button_color || existingData[0].floating_cart_button_color,
        updated_at: new Date().toISOString()
      };
      
      console.log('Configuración de apariencia actualizada con preservación de datos:', updatedConfig);
      
      const { data, error } = await supabaseAdmin
        .from('appearance_config')
        .update(updatedConfig)
        .eq('id', existingData[0].id)
        .select();
      
      result = { data, error };
    } else {
      // Si no existe ningún registro, lo insertamos
      console.log('No hay configuración de apariencia previa, creando nueva');
      const { data, error } = await supabaseAdmin
        .from('appearance_config')
        .insert(config)
        .select();
      
      result = { data, error };
    }
    
    if (result.error) {
      console.error('Error al guardar configuración de apariencia:', result.error);
      return false;
    }
    
    console.log('Configuración de apariencia guardada correctamente, respuesta:', result.data);
    return true;
  } catch (error) {
    console.error('Error al guardar configuración de apariencia:', error);
    return false;
  }
};

// Función para obtener todas las categorías con sus platos
export const getMenuData = async () => {
  try {
    const now = Date.now();
    
    // Verificar si la caché es válida (menos de 5 minutos desde la última carga)
    if (cachedData.cacheValid && 
        cachedData.menuData && 
        (now - cachedData.lastFetchTime) < CACHE_DURATION) {
      // Incrementar contador para depuración
      cachedData.requestCounter.categories++;
      cachedData.requestCounter.menuItems++;
      
      logCacheStatus('HIT');
      console.log('🟢 Usando datos de menú desde caché interna, EVITANDO consulta a Supabase');
      return cachedData.menuData;
    }
    
    logCacheStatus('MISS');
    console.log('🔴 Caché inválida o expirada - consultando a Supabase...');
    
    // 1. Obtener todas las categorías
    console.log('- Consultando tabla categories...');
    const supabaseAdmin = await getSupabaseAdmin();
    cachedData.requestCounter.categories++;
    
    const { data: categoriesData, error: categoriesError, count: categoriesCount } = await supabaseAdmin
      .from('categories')
      .select('*', { count: 'exact' })
      .order('display_order', { ascending: true });
    
    if (categoriesError) {
      console.error('Error al obtener categorías:', categoriesError);
      throw categoriesError;
    }
    
    // Mostrar diagnóstico
    console.log(`✅ Categorías encontradas: ${categoriesCount || 0}`);
    
    if (!categoriesData || categoriesData.length === 0) {
      console.log('No se encontraron categorías, devolviendo datos predeterminados');
      // No guardar en caché los datos predeterminados
      return defaultConfig.categories;
    }
    
    // Guardar categorías en caché
    cachedData.categoriesData = categoriesData;
    
    // 2. Obtener todos los platos
    console.log('- Consultando tabla menu_items...');
    cachedData.requestCounter.menuItems++;
    
    const { data: menuItemsData, error: menuItemsError, count: menuItemsCount } = await supabaseAdmin
      .from('menu_items')
      .select('*', { count: 'exact' })
      .order('display_order', { ascending: true });
    
    if (menuItemsError) {
      console.error('Error al obtener platos:', menuItemsError);
      throw menuItemsError;
    }
    
    // Guardar elementos de menú en caché
    cachedData.menuItemsData = menuItemsData;
    
    // Mostrar diagnóstico
    console.log(`✅ Platos encontrados: ${menuItemsCount || 0}`);
    
    // 3. Estructurar datos según el formato anterior para mantener compatibilidad
    console.log('- Estructurando datos del menú...');
    const formattedCategories = categoriesData.map(category => {
      // Filtrar los platos que pertenecen a esta categoría
      const categoryItems = menuItemsData
        ? menuItemsData.filter(item => item.category_id === category.category_id)
        : [];
      
      // Formatear los platos según la interfaz MenuItem del cliente
      const formattedItems = categoryItems.map(item => ({
        id: item.item_id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image
      }));
      
      // Devolver la categoría con sus platos
      return {
        id: category.category_id,
        name: category.name,
        icon: category.icon,
        items: formattedItems
      };
    });
    
    // Actualizar la caché y marcarla como válida
    console.log('✅ Datos del menú estructurados y almacenados en caché');
    cachedData.menuData = formattedCategories;
    cachedData.lastFetchTime = now;
    cachedData.cacheValid = true;
    
    return formattedCategories;
  } catch (error) {
    console.error('Error al cargar datos del menú:', error);
    
    // En caso de error, devolver datos predeterminados
    return defaultConfig.categories;
  }
};

// Función para invalidar la caché cuando se guarda nueva información
export const invalidateMenuCache = (reason = 'cambio de datos') => {
  const wasValid = cachedData.cacheValid;
  cachedData.cacheValid = false;
  
  if (wasValid) {
    console.log(`🔄 Caché de menú invalidada por: ${reason}`);
    console.log(`   Edad de la caché: ${(Date.now() - cachedData.lastFetchTime)/1000}s`);
    console.log(`   Contadores: Cat=${cachedData.requestCounter.categories}, Items=${cachedData.requestCounter.menuItems}`);
  } else {
    console.log(`ℹ️ La caché ya estaba invalidada (razón: ${reason})`);
  }
};

// Guardar una categoría
export const saveCategory = async (category: Category): Promise<boolean> => {
  try {
    // Usar directamente upsert con onConflict para manejar duplicados
    // en lugar de verificar primero si la categoría existe
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('categories')
      .upsert(category, { 
        onConflict: 'category_id',
        ignoreDuplicates: false  // Actualizar en lugar de ignorar
      });
    
    if (error) {
      // Si es un error de duplicado, intentamos actualizar explícitamente
      if (error.code === '23505') {
        console.log(`Categoría ${category.name} ya existe, intentando actualizar...`);
        
        // Obtener el ID existente
        const { data: existingData, error: fetchError } = await supabaseAdmin
          .from('categories')
          .select('id')
          .eq('category_id', category.category_id)
          .maybeSingle();
        
        if (fetchError) {
          console.error('Error al obtener categoría existente:', fetchError);
          return false;
        }
        
        if (existingData) {
          // Actualizar usando el ID existente
          const { error: updateError } = await supabaseAdmin
            .from('categories')
            .update({
              name: category.name,
              icon: category.icon,
              display_order: category.display_order
            })
            .eq('id', existingData.id);
          
          if (updateError) {
            console.error('Error al actualizar categoría:', updateError);
            return false;
          }
          
          // Invalidar caché ya que hubo cambios
          invalidateMenuCache(`actualización de categoría "${category.name}"`);
          return true;
        }
      }
      
      console.error('Error al guardar categoría:', error);
      return false;
    }
    
    // Invalidar caché ya que hubo cambios
    invalidateMenuCache(`nueva categoría "${category.name}"`);
    return true;
  } catch (error) {
    console.error('Error al guardar categoría:', error);
    return false;
  }
};

// Guardar un plato
export const saveMenuItem = async (menuItem: MenuItem): Promise<boolean> => {
  try {
    // Usar directamente upsert con onConflict para manejar duplicados
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('menu_items')
      .upsert(menuItem, { 
        onConflict: 'item_id',
        ignoreDuplicates: false  // Actualizar en lugar de ignorar
      });
    
    if (error) {
      // Si es un error de duplicado, intentamos actualizar explícitamente
      if (error.code === '23505') {
        console.log(`Ítem ${menuItem.name} ya existe, intentando actualizar...`);
        
        // Obtener el ID existente
        const { data: existingData, error: fetchError } = await supabaseAdmin
          .from('menu_items')
          .select('id')
          .eq('item_id', menuItem.item_id)
          .maybeSingle();
        
        if (fetchError) {
          console.error('Error al obtener ítem existente:', fetchError);
          return false;
        }
        
        if (existingData) {
          // Actualizar usando el ID existente
          const { error: updateError } = await supabaseAdmin
            .from('menu_items')
            .update({
              name: menuItem.name,
              description: menuItem.description,
              price: menuItem.price,
              image: menuItem.image,
              display_order: menuItem.display_order,
              is_available: menuItem.is_available
            })
            .eq('id', existingData.id);
          
          if (updateError) {
            console.error('Error al actualizar ítem:', updateError);
            return false;
          }
          
          // Invalidar caché ya que hubo cambios
          invalidateMenuCache(`actualización de ítem "${menuItem.name}"`);
          return true;
        }
      }
      
      console.error('Error al guardar ítem de menú:', error);
      return false;
    }
    
    // Invalidar caché ya que hubo cambios
    invalidateMenuCache(`nuevo ítem "${menuItem.name}"`);
    return true;
  } catch (error) {
    console.error('Error al guardar ítem de menú:', error);
    return false;
  }
};

// Eliminar una categoría
export const deleteCategory = async (categoryId: string): Promise<boolean> => {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('category_id', categoryId);
    
    if (error) {
      console.error('Error al eliminar categoría:', error);
      return false;
    }
    
    // Invalidar caché ya que hubo cambios
    invalidateMenuCache(`eliminación de categoría ID "${categoryId}"`);
    return true;
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return false;
  }
};

// Eliminar un plato
export const deleteMenuItem = async (itemId: string): Promise<boolean> => {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('menu_items')
      .delete()
      .eq('item_id', itemId);
    
    if (error) {
      console.error('Error al eliminar ítem de menú:', error);
      return false;
    }
    
    // Invalidar caché ya que hubo cambios
    invalidateMenuCache(`eliminación de ítem ID "${itemId}"`);
    return true;
  } catch (error) {
    console.error('Error al eliminar ítem de menú:', error);
    return false;
  }
};

// Guardar todos los datos del menú
export const saveMenuData = async (categories: any[]): Promise<boolean> => {
  try {
    let success = true;
    let totalCategories = categories.length;
    let totalItems = 0;
    
    // Contar el total de ítems para el mensaje de invalidación
    categories.forEach(category => {
      if (category.items && Array.isArray(category.items)) {
        totalItems += category.items.length;
      }
    });
    
    console.log(`Guardando menú completo: ${totalCategories} categorías con ${totalItems} ítems en total`);
    
    // Sincronizar las categorías primero
    for (const category of categories) {
      const categoryData: Category = {
        category_id: category.id,
        name: category.name,
        icon: category.icon,
        display_order: categories.indexOf(category)
      };
      
      const categorySuccess = await saveCategory(categoryData);
      if (!categorySuccess) {
        console.error(`Error al guardar categoría ${category.name}`);
        success = false;
      }
      
      // Sincronizar los platos de esta categoría
        for (const item of category.items) {
        const itemData: MenuItem = {
            item_id: item.id,
            category_id: category.id,
            name: item.name,
            description: item.description,
            price: item.price,
          image: item.image || '',
            display_order: category.items.indexOf(item),
            is_available: true
          };
          
        const itemSuccess = await saveMenuItem(itemData);
        if (!itemSuccess) {
          console.error(`Error al guardar ítem ${item.name}`);
          success = false;
        }
      }
    }
    
    // Invalidar caché siempre al guardar menú completo
    invalidateMenuCache(`actualización completa del menú (${totalCategories} categorías, ${totalItems} ítems)`);
    
    // Disparar evento para notificar que el menú ha sido guardado
    if (typeof window !== 'undefined') {
    const event = new CustomEvent('menuSaved');
    window.dispatchEvent(event);
      console.log('Evento menuSaved disparado');
    }
    
    return success;
  } catch (error) {
    console.error('Error al guardar datos del menú:', error);
    return false;
  }
};

// Función para guardar toda la configuración (restaurante + apariencia + menú)
export const saveConfig = async (newConfig: typeof defaultConfig): Promise<boolean> => {
  try {
    console.log('Iniciando guardado de configuración completa...');
    let allSaved = true;
    let errors = [];
    
    // 1. Guardar configuración del sitio
    const siteConfig: SiteConfig = {
      restaurant_name: newConfig.restaurantName,
      whatsapp_number: newConfig.whatsappNumber,
      currency: newConfig.currency,
      opening_hours: newConfig.openingHours,
      footer_text: newConfig.footerText, // Incluir el texto del footer
      installation_status: 'completed' // Asumimos que si se guarda, la instalación está completa
    };
    
    console.log('1/3: Guardando configuración del sitio...');
    const siteConfigSaved = await saveSiteConfig(siteConfig);
    if (!siteConfigSaved) {
      console.error('Error al guardar configuración del sitio');
      allSaved = false;
      errors.push('configuración del sitio');
    }
    
    // 2. Guardar configuración de apariencia
    const appearanceConfig: AppearanceConfig = {
      primary_color: newConfig.theme.primaryColor,
      accent_color: newConfig.theme.accentColor,
      text_color: newConfig.theme.textColor,
      background_color: newConfig.theme.backgroundColor,
      cart_button_color: newConfig.theme.cartButtonColor,
      floating_cart_button_color: newConfig.theme.floatingCartButtonColor
    };
    
    console.log('2/3: Guardando configuración de apariencia...');
    const appearanceConfigSaved = await saveAppearanceConfig(appearanceConfig);
    if (!appearanceConfigSaved) {
      console.error('Error al guardar configuración de apariencia');
      allSaved = false;
      errors.push('configuración de apariencia');
    }
    
    // 3. Guardar categorías y platos
    console.log('3/3: Guardando menú con', newConfig.categories.length, 'categorías...');
    const menuSaved = await saveMenuData(newConfig.categories);
    if (!menuSaved) {
      console.error('Se encontraron errores al guardar el menú');
      allSaved = false;
      errors.push('menú (parcialmente)');
    }
    
    // 4. Ya no intentamos inicializar datos predeterminados automáticamente
    // para evitar sobrescribir configuraciones personalizadas
    if (!allSaved) {
      console.log('Hubo errores durante el guardado.');
      // No intentamos inicializar datos predeterminados automáticamente
    }
    
    // Disparar evento para informar a otros componentes
    // Incluir información sobre posibles errores
    const event = new CustomEvent('configSaved', { 
      detail: { 
        config: newConfig,
        success: allSaved,
        errors: errors.length > 0 ? errors : null
      } 
    });
    window.dispatchEvent(event);
    
    if (!allSaved) {
      console.warn('Configuración guardada con errores en:', errors.join(', '));
    } else {
      console.log('Configuración completa guardada correctamente');
    }
    
    // Devolvemos true si al menos se guardó la configuración principal
    return siteConfigSaved;
  } catch (error) {
    console.error('Error al guardar configuración completa:', error);
    return false;
  }
};

// Función principal para obtener la configuración completa
export const getConfig = async () => {
  try {
    console.log('Iniciando carga de configuración completa...');
    
    // Obtener cada sección de la configuración
    const [siteConfig, appearanceConfig, menu] = await Promise.all([
      getSiteConfig(),
      getAppearanceConfig(),
      getMenuData()
    ]);
    
    // Combinar en un solo objeto de configuración, sin aplicar valores por defecto
    const config = {
      restaurantName: siteConfig.restaurant_name || '',
      whatsappNumber: siteConfig.whatsapp_number || '',
      currency: siteConfig.currency || '',
      openingHours: siteConfig.opening_hours || '',
      footerText: siteConfig.footer_text || '',
      theme: {
        primaryColor: appearanceConfig.primary_color || '',
        accentColor: appearanceConfig.accent_color || '',
        textColor: appearanceConfig.text_color || '',
        backgroundColor: appearanceConfig.background_color || '',
        cartButtonColor: appearanceConfig.cart_button_color || '',
        floatingCartButtonColor: appearanceConfig.floating_cart_button_color || ''
      },
      categories: menu || [],
      installationStatus: siteConfig.installation_status
    };
    
    console.log('Configuración completa cargada con éxito');
    return config;
  } catch (error) {
    console.error('Error al cargar la configuración completa:', error);
    
    // En caso de error, devolvemos un objeto vacío sin valores predeterminados
    return {
      restaurantName: '',
      whatsappNumber: '',
      currency: '',
      openingHours: '',
      footerText: '',
      theme: {
        primaryColor: '',
        accentColor: '',
        textColor: '',
        backgroundColor: '',
        cartButtonColor: '',
        floatingCartButtonColor: ''
      },
      categories: [],
      installationStatus: 'pending'
    };
  }
};

// Función para verificar el estado de instalación
export const getInstallationStatus = async (): Promise<'pending' | 'completed'> => {
  try {
    console.log('Verificando estado de instalación directamente en la base de datos...');
    
    // Verificar directamente en la base de datos usando supabaseAdmin
    const supabaseAdmin = await getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('installation_status')
      .order('id', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error al verificar estado de instalación en site_config:', error);
      
      // Intento alternativo: verificar si hay algún registro en site_config usando supabaseAdmin
      try {
        const { count, error: countError } = await supabaseAdmin
          .from('site_config')
          .select('id', { count: 'exact', head: true });
        
        if (!countError && count && count > 0) {
          console.log(`Se encontraron ${count} registros en site_config, asumiendo instalación completada`);
          return 'completed';
        }
      } catch (countErr) {
        console.error('Error al verificar existencia de registros en site_config:', countErr);
      }
      
      // Si no se pudo verificar en la base de datos, usar fallback a localStorage
      const installerCompleted = localStorage.getItem('installerCompleted');
      if (installerCompleted) {
        console.log('Instalación marcada como completada en localStorage');
        return 'completed';
      }
      
      return 'pending';
    }
    
    // Si hay datos en site_config
    if (data && data.length > 0) {
      console.log('Estado de instalación encontrado:', data[0].installation_status);
      return data[0].installation_status === 'completed' ? 'completed' : 'pending';
    }
    
    // No se encontraron registros en site_config
    console.log('No se encontraron registros en site_config');
    return 'pending';
  } catch (error) {
    console.error('Error al verificar estado de instalación:', error);
    
    // Verificar localStorage como fallback final
    const installerCompleted = localStorage.getItem('installerCompleted');
    if (installerCompleted) {
      console.log('Instalación marcada como completada en localStorage (fallback)');
      return 'completed';
    }
    
    return 'pending';
  }
};

// Función para marcar la instalación como completada
export const markInstallationComplete = async (): Promise<boolean> => {
  try {
    // Obtener registro actual si existe
    const supabaseAdmin = await getSupabaseAdmin();
    const { data, error: selectError } = await supabaseAdmin
      .from('site_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);
    
    if (selectError) {
      console.error('Error al obtener configuración:', selectError);
    }
    
    // Preparar datos para actualizar/insertar
    const updateData = (data && data.length > 0) 
      ? { ...data[0], installation_status: 'completed' }
      : { 
          restaurant_name: defaultConfig.restaurantName,
          whatsapp_number: defaultConfig.whatsappNumber,
          currency: defaultConfig.currency,
          opening_hours: defaultConfig.openingHours,
          installation_status: 'completed'
        };
    
    // Actualizar/insertar estado de instalación
    const { error: updateError } = await supabaseAdmin
      .from('site_config')
      .upsert(updateData);
    
    if (updateError) {
      console.error('Error al marcar instalación como completada:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error grave al marcar instalación como completada:', error);
    return false;
  }
};

// Función para inicializar la base de datos con datos predeterminados si está vacía
export const initializeDefaultData = async (): Promise<boolean> => {
  try {
    console.log('Verificando si se necesita inicializar datos predeterminados...');
    
    // 1. Verificar si hay datos en site_config
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: siteData, count: siteCount } = await supabaseAdmin
      .from('site_config')
      .select('*', { count: 'exact' })
      .limit(1);
    
    console.log(`Registros actuales en site_config: ${siteCount || 0}`);
    
    // 2. Verificar si hay datos en appearance_config
    const { data: appearanceData, count: appearanceCount } = await supabaseAdmin
      .from('appearance_config')
      .select('*', { count: 'exact' })
      .limit(1);
    
    console.log(`Registros actuales en appearance_config: ${appearanceCount || 0}`);
    
    // 3. Verificar si hay datos en categories
    const { data: categoriesData, count: categoriesCount } = await supabaseAdmin
      .from('categories')
      .select('*', { count: 'exact' })
      .limit(1);
    
    console.log(`Registros actuales en categories: ${categoriesCount || 0}`);
    
    let needsInitialization = false;
    
    // Inicializar site_config si está vacía
    if (!siteCount) {
      console.log('site_config vacía, inicializando datos predeterminados...');
      needsInitialization = true;
      
      const siteConfig: SiteConfig = {
        restaurant_name: defaultConfig.restaurantName,
        whatsapp_number: defaultConfig.whatsappNumber,
        currency: defaultConfig.currency,
        opening_hours: defaultConfig.openingHours,
        installation_status: 'completed'
      };
      
      const { error: siteError } = await supabaseAdmin
        .from('site_config')
        .insert(siteConfig);
      
      if (siteError) {
        console.error('Error al inicializar site_config:', siteError);
      } else {
        console.log('site_config inicializada correctamente');
      }
    }
    
    // Inicializar appearance_config si está vacía
    if (!appearanceCount) {
      console.log('appearance_config vacía, inicializando datos predeterminados...');
      needsInitialization = true;
      
      const appearanceConfig: AppearanceConfig = {
        primary_color: defaultConfig.theme.primaryColor,
        accent_color: defaultConfig.theme.accentColor,
        text_color: defaultConfig.theme.textColor,
        background_color: defaultConfig.theme.backgroundColor,
        cart_button_color: defaultConfig.theme.cartButtonColor,
        floating_cart_button_color: defaultConfig.theme.floatingCartButtonColor
      };
      
      const { error: appearanceError } = await supabaseAdmin
        .from('appearance_config')
        .insert(appearanceConfig);
      
      if (appearanceError) {
        console.error('Error al inicializar appearance_config:', appearanceError);
      } else {
        console.log('appearance_config inicializada correctamente');
      }
    }
    
    // Inicializar categorías y menú si no hay categorías
    if (!categoriesCount) {
      console.log('categories vacía, inicializando categorías y platos predeterminados...');
      needsInitialization = true;
      
      // Usar el método existente para guardar el menú completo
      const menuSaved = await saveMenuData(defaultConfig.categories);
      
      if (menuSaved) {
        console.log('Categorías y platos inicializados correctamente');
      } else {
        console.error('Error al inicializar categorías y platos');
      }
    }
    
    if (needsInitialization) {
      console.log('Se inicializaron datos predeterminados en la base de datos');
    } else {
      console.log('La base de datos ya tiene datos, no se necesita inicialización');
    }
    
    return true;
  } catch (error) {
    console.error('Error al verificar/inicializar datos predeterminados:', error);
    return false;
  }
};

// Función para obtener las credenciales de Supabase
export const getSupabaseCredentials = async (): Promise<{ url: string, anonKey: string, serviceKey: string } | null> => {
  try {
    // Verificar si existe la tabla site_config y obtener las credenciales
    const supabaseAdmin = await getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('supabase_url, supabase_anon_key, supabase_service_key')
      .order('id', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error al obtener credenciales de Supabase:', error);
      return null;
    }
    
    // Verificar que existen todas las credenciales necesarias
    if (data && data.length > 0 && 
        data[0].supabase_url && 
        data[0].supabase_anon_key && 
        data[0].supabase_service_key) {
      
      return {
        url: data[0].supabase_url,
        anonKey: data[0].supabase_anon_key,
        serviceKey: data[0].supabase_service_key
      };
    }
    
    console.log('No se encontraron credenciales de Supabase en base de datos');
    
    // Intentar obtener de localStorage como fallback
    const storedUrl = localStorage.getItem('supabaseUrl');
    const storedAnonKey = localStorage.getItem('supabaseAnonKey');
    const storedServiceKey = localStorage.getItem('supabaseServiceKey');
    
    if (storedUrl && storedAnonKey && storedServiceKey) {
      return { 
        url: storedUrl, 
        anonKey: storedAnonKey, 
        serviceKey: storedServiceKey 
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener credenciales de Supabase:', error);
    
    // Intentar obtener de localStorage como fallback
    const storedUrl = localStorage.getItem('supabaseUrl');
    const storedAnonKey = localStorage.getItem('supabaseAnonKey');
    const storedServiceKey = localStorage.getItem('supabaseServiceKey');
    
    if (storedUrl && storedAnonKey && storedServiceKey) {
      return { 
        url: storedUrl, 
        anonKey: storedAnonKey, 
        serviceKey: storedServiceKey 
      };
    }
    
    return null;
  }
};