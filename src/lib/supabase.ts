import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURACIÓN DE SEGURIDAD PARA SUPABASE
 * 
 * Este archivo maneja las credenciales de Supabase de forma segura utilizando
 * variables de entorno, y proporciona inicialización asíncrona segura.
 */

// Cargar desde localStorage (guardadas por el instalador) o variables de entorno
const STORED_URL = localStorage.getItem('supabaseUrl');
const STORED_ANON_KEY = localStorage.getItem('supabaseAnonKey');
const STORED_SERVICE_KEY = localStorage.getItem('supabaseServiceKey');

// URL de Supabase (priorizar localStorage, luego variables de entorno)
const SUPABASE_URL = STORED_URL || import.meta.env?.VITE_SUPABASE_URL;

// Claves API (priorizar localStorage, luego variables de entorno)
const ANON_KEY = STORED_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = STORED_SERVICE_KEY || import.meta.env?.VITE_SUPABASE_SERVICE_KEY;

// Variables para los clientes y estado de inicialización
let supabaseClient: any = null;
let supabaseAdminClient: any = null;
let initialized = false;
let initializationPromise: Promise<void> | null = null;

// Función para validar que una clave tenga el formato JWT correcto
const validateKey = (key: string | undefined | null, role: string): boolean => {
  if (!key) return false;
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    
    // Decodificar el payload de base64
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === role;
  } catch (e) {
    console.error('Error validando clave API:', e);
    return false;
  }
};

// Función para inicializar los clientes de Supabase de forma asíncrona
const initializeSupabaseClients = async (): Promise<void> => {
  if (initialized) return;
  
  // Si ya hay una inicialización en curso, esperar a que termine
  if (initializationPromise) {
    await initializationPromise;
    return;
  }
  
  // Crear una promesa para la inicialización
  initializationPromise = (async () => {
    try {
      // Verificar la presencia de las credenciales necesarias
      if (!SUPABASE_URL) {
        console.error('URL de Supabase no configurada');
        throw new Error('URL de Supabase no configurada');
        }
      
      if (!ANON_KEY) {
        console.error('Clave anónima de Supabase no configurada');
        throw new Error('Clave anónima de Supabase no configurada');
      }
      
      if (!SERVICE_KEY) {
        console.error('Clave de servicio de Supabase no configurada');
        throw new Error('Clave de servicio de Supabase no configurada');
      }
      
      // Validar las claves antes de inicializar los clientes
      const isAnonKeyValid = validateKey(ANON_KEY, 'anon');
      const isServiceKeyValid = validateKey(SERVICE_KEY, 'service_role');
      
      if (!isAnonKeyValid) {
        console.warn('La clave anónima no tiene el formato correcto o no contiene el rol "anon"');
}

      if (!isServiceKeyValid) {
        console.warn('La clave de servicio no tiene el formato correcto o no contiene el rol "service_role"');
}

// Crear cliente estándar para operaciones regulares
      supabaseClient = createClient(SUPABASE_URL, ANON_KEY);

// Crear cliente con permisos administrativos (service_role)
      supabaseAdminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false // Desactivar detección de sesión en URL para cliente admin
  },
  global: {
    headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY
    }
  }
});

// Proteger contra exposición accidental en consola
      Object.defineProperty(supabaseClient, 'toString', {
  value: () => '[Objeto Supabase - Claves ocultas]',
  writable: false
});

      Object.defineProperty(supabaseAdminClient, 'toString', {
  value: () => '[Objeto SupabaseAdmin - Claves ocultas]',
  writable: false
});

      // Marcar como inicializado
      initialized = true;
      console.log(`Supabase configurado para: ${SUPABASE_URL}`);
      console.log(`Cliente anónimo inicializado: ${isAnonKeyValid ? 'OK' : 'ADVERTENCIA'}`);
      console.log(`Cliente admin inicializado: ${isServiceKeyValid ? 'OK' : 'ADVERTENCIA'}`);
      
    } catch (error) {
      console.error('Error inicializando clientes Supabase:', error);
      throw error;
    }
  })();

  // Esperar a que la inicialización termine
  await initializationPromise;
  initializationPromise = null;
};

// Función asíncrona para obtener el cliente estándar
export const getSupabase = async () => {
  await initializeSupabaseClients();
  return supabaseClient;
};

// Función asíncrona para obtener el cliente admin
export const getSupabaseAdmin = async () => {
  await initializeSupabaseClients();
  return supabaseAdminClient;
};

// Versiones sincrónicas para casos especiales (uso con precaución)
export const getSupabaseSync = () => {
  if (!initialized) {
    console.warn('Advertencia: Supabase no ha sido inicializado correctamente. Inicializa primero con getSupabase().');
    }
  return supabaseClient;
};

export const getSupabaseAdminSync = () => {
  if (!initialized) {
    console.warn('Advertencia: Supabase Admin no ha sido inicializado correctamente. Inicializa primero con getSupabaseAdmin().');
  }
  return supabaseAdminClient;
};

// Función para reiniciar los clientes (útil para cambios de credenciales)
export const reinitializeSupabase = () => {
  initialized = false;
  return initializeSupabaseClients();
};

// Funciones para obtener URL y claves
export const getServiceKey = async (): Promise<string | null> => {
  await initializeSupabaseClients();
  return SERVICE_KEY;
};

export const getSupabaseUrl = async (): Promise<string | null> => {
  await initializeSupabaseClients();
  return SUPABASE_URL;
};

// Inicializar Supabase automáticamente cuando se importa este módulo
// (pero sin bloquear porque es una Promise)
initializeSupabaseClients().catch(error => {
  console.error('Error en inicialización automática de Supabase:', error);
}); 