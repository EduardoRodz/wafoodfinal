import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURACIÓN DE SEGURIDAD PARA SUPABASE
 * 
 * Este archivo primero intentará cargar las credenciales desde Supabase,
 * si no están disponibles, usará localStorage (instalador),
 * y finalmente usará las variables de entorno o valores predeterminados.
 */

// Intentar obtener las credenciales del localStorage primero (guardadas por el instalador)
const STORED_URL = localStorage.getItem('supabaseUrl');
const STORED_ANON_KEY = localStorage.getItem('supabaseAnonKey');
const STORED_SERVICE_KEY = localStorage.getItem('supabaseServiceKey');

// URL de Supabase (priorizar localStorage, luego variables de entorno, luego valor predeterminado)
const SUPABASE_URL = STORED_URL || import.meta.env?.VITE_SUPABASE_URL;

// Claves API
const ANON_KEY = STORED_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY;

const SERVICE_KEY = STORED_SERVICE_KEY || import.meta.env?.VITE_SUPABASE_SERVICE_KEY;

// Definir URLs iniciales para los clientes temporales
const INITIAL_URL = STORED_URL || SUPABASE_URL;
const INITIAL_ANON_KEY = STORED_ANON_KEY || ANON_KEY;

// Función para decodificar base64url de manera segura en navegador
const base64UrlDecode = (str: string): string => {
  try {
    // Convertir base64url a base64 estándar
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Añadir padding si es necesario
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const base64Padded = base64 + padding;
    
    // Decodificar usando atob en navegador
    const raw = atob(base64Padded);
    
    // Convertir la cadena de bytes a string UTF-8
    const output = decodeURIComponent(
      Array.from(raw).map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    
    return output;
  } catch (e) {
    console.error('Error decodificando base64url:', e);
    // En caso de error, devolvemos un JSON vacío que igual podemos parsear
    return '{}';
  }
};

// Función para validar que una clave tenga el formato JWT correcto
const validateKey = (key: string, role: string): boolean => {
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    
    // Intentar extraer el payload
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload.role === role;
  } catch (e) {
    console.error('Error validando clave API:', e);
    return false;
  }
};

// Función para cargar credenciales desde la tabla site_config en la base de datos
const loadCredentialsFromDatabase = async (): Promise<{ url: string, anonKey: string, serviceKey: string } | null> => {
  try {
    // No intentar cargar credenciales desde la base de datos si estamos en el instalador
    if (window.location.pathname === '/instalador') {
      console.log('En página del instalador, no se intentará cargar credenciales desde la base de datos');
      return null;
    }
    
    // Método 1: Usar cliente Supabase estándar
    try {
      console.log('Método 1: Intentando obtener credenciales desde site_config con cliente Supabase...');
      // Crear un cliente temporal para la primera conexión usando localStorage
      const tempClient = createClient(INITIAL_URL, INITIAL_ANON_KEY);
      
      // Intentar obtener las credenciales de las columnas específicas en site_config
      const { data, error } = await tempClient
        .from('site_config')
        .select('supabase_url, supabase_anon_key, supabase_service_key')
        .order('id', { ascending: false })
        .limit(1);
      
      if (!error && data && data.length > 0 && 
          data[0].supabase_url && 
          data[0].supabase_anon_key && 
          data[0].supabase_service_key) {
        console.log('Credenciales obtenidas exitosamente desde site_config con cliente Supabase');
        return {
          url: data[0].supabase_url,
          anonKey: data[0].supabase_anon_key,
          serviceKey: data[0].supabase_service_key
        };
      }
    } catch (clientError) {
      console.log('Error al obtener credenciales con cliente Supabase:', clientError);
    }
    
    // Método 2: Usar fetch directo a la API REST de Supabase
    try {
      console.log('Método 2: Intentando obtener credenciales con fetch directo a API REST...');
      
      if (!STORED_URL || !STORED_ANON_KEY) {
        console.log('Faltan credenciales en localStorage para fetch directo');
      } else {
        const response = await fetch(
          `${STORED_URL}/rest/v1/site_config?select=supabase_url,supabase_anon_key,supabase_service_key&order=id.desc&limit=1`,
          {
            method: 'GET',
            headers: {
              'apikey': STORED_ANON_KEY,
              'Authorization': `Bearer ${STORED_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0 && 
              data[0].supabase_url && 
              data[0].supabase_anon_key && 
              data[0].supabase_service_key) {
            console.log('Credenciales obtenidas exitosamente con fetch directo');
            return {
              url: data[0].supabase_url,
              anonKey: data[0].supabase_anon_key,
              serviceKey: data[0].supabase_service_key
            };
          }
        } else {
          console.log('Error en fetch directo:', response.status, response.statusText);
        }
      }
    } catch (fetchError) {
      console.log('Error en fetch directo:', fetchError);
    }
    
    // Método 3: Verificar si hay un registro de configuración como prueba de instalación completa
    try {
      console.log('Método 3: Verificando si hay registros en site_config como prueba de instalación...');
      const tempClient = createClient(INITIAL_URL, INITIAL_ANON_KEY);
      
      const { count, error: countError } = await tempClient
        .from('site_config')
        .select('*', { count: 'exact', head: true });
        
      if (!countError && count && count > 0) {
        console.log(`Se encontraron ${count} registros en site_config, usando credenciales de localStorage`);
        
        // Si hay registros pero no pudimos obtener las credenciales específicas,
        // usamos las de localStorage como válidas (probablemente la instalación está completa)
        if (STORED_URL && STORED_ANON_KEY && STORED_SERVICE_KEY) {
          return {
            url: STORED_URL,
            anonKey: STORED_ANON_KEY,
            serviceKey: STORED_SERVICE_KEY
          };
        }
      }
    } catch (countError) {
      console.log('Error al verificar existencia de registros:', countError);
    }
    
    // Si todos los métodos fallan, devolver null para usar fallback
    console.log('No se encontraron credenciales válidas en la base de datos');
    return null;
  } catch (error) {
    console.error('Error al cargar credenciales desde la base de datos:', error);
    return null;
  }
};

// Intentar cargar credenciales desde Supabase (si es posible)
let supabaseCredentials: any = null;

// Función para inicializar los clientes de Supabase
const initializeSupabaseClients = async () => {
  // Intentar cargar credenciales desde Supabase si tenemos credenciales iniciales
  if (STORED_URL && STORED_ANON_KEY) {
    supabaseCredentials = await loadCredentialsFromDatabase();
  }
  
  // Usar las credenciales cargadas o las predeterminadas
  const finalUrl = supabaseCredentials?.url || SUPABASE_URL;
  const finalAnonKey = supabaseCredentials?.anonKey || ANON_KEY;
  const finalServiceKey = supabaseCredentials?.serviceKey || SERVICE_KEY;

// Validar claves antes de inicializar clientes
  if (!validateKey(finalAnonKey, 'anon')) {
  console.error('ERROR: La clave anónima no tiene el formato correcto o no contiene el rol "anon"');
}

  if (!validateKey(finalServiceKey, 'service_role')) {
  console.error('ERROR: La clave de servicio no tiene el formato correcto o no contiene el rol "service_role"');
}

// Crear cliente estándar para operaciones regulares
  const supabase = createClient(finalUrl, finalAnonKey);

// Crear cliente con permisos administrativos (service_role)
  const supabaseAdmin = createClient(finalUrl, finalServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false // Desactivar detección de sesión en URL para cliente admin
  },
  // Configuración específica para las APIs administrativas
  global: {
    // Asegurar que el token se pasa en todos los headers como apikey
    headers: {
        Authorization: `Bearer ${finalServiceKey}`,
        apikey: finalServiceKey
    }
  }
});

// Proteger contra exposición accidental en consola
Object.defineProperty(supabase, 'toString', {
  value: () => '[Objeto Supabase - Claves ocultas]',
  writable: false
});

Object.defineProperty(supabaseAdmin, 'toString', {
  value: () => '[Objeto SupabaseAdmin - Claves ocultas]',
  writable: false
});

// Log para confirmar inicialización
  console.log(`Supabase configurado para: ${finalUrl}`);
  console.log(`Cliente anónimo inicializado: ${validateKey(finalAnonKey, 'anon') ? 'OK' : 'ERROR'}`);
  console.log(`Cliente admin inicializado: ${validateKey(finalServiceKey, 'service_role') ? 'OK' : 'ERROR'}`);
  
  return { supabase, supabaseAdmin, supabaseUrl: finalUrl, serviceKey: finalServiceKey };
};

// Crear clientes iniciales con las credenciales disponibles
const { supabase, supabaseAdmin, supabaseUrl, serviceKey } = await initializeSupabaseClients();

// Verificar que el cliente admin está correctamente configurado
if (window.location.pathname !== '/instalador') {
supabaseAdmin.auth.admin.listUsers().then(({ data, error }) => {
  if (error) {
    console.error("ERROR: El cliente admin no tiene permisos para acceder a la API de admin:", error.message);
  } else {
    console.log("Cliente admin verificado: Acceso a API de admin funcionando correctamente");
  }
}).catch(err => {
  console.error("ERROR crítico con cliente admin:", err.message);
});
}

// Implementación del patrón Singleton para gestionar los clientes de Supabase
class SupabaseManager {
  private static instance: SupabaseManager;
  private initialized = false;
  private supabaseClient;
  private supabaseAdminClient;
  private supabaseUrl;
  private serviceKey;

  private constructor() {
    this.supabaseClient = supabase;
    this.supabaseAdminClient = supabaseAdmin;
    this.supabaseUrl = supabaseUrl;
    this.serviceKey = serviceKey || SERVICE_KEY;
    this.initialized = true;
  }

  public static getInstance(): SupabaseManager {
    if (!SupabaseManager.instance) {
      SupabaseManager.instance = new SupabaseManager();
    }
    return SupabaseManager.instance;
  }

  public getClient() {
    return this.supabaseClient;
  }

  public getAdminClient() {
    return this.supabaseAdminClient;
  }

  public getUrl() {
    return this.supabaseUrl;
  }

  public getServiceKey() {
    return this.serviceKey;
  }

  public isInitialized() {
    return this.initialized;
  }
}

// Función para obtener la instancia del gestor de Supabase
export const getSupabaseManager = (): SupabaseManager => {
  return SupabaseManager.getInstance();
};

// Función para obtener la clave de servicio (necesaria para SystemStatus.tsx)
export const getServiceKey = (): string => {
  return serviceKey || SERVICE_KEY;
};

export { supabaseAdmin, supabaseUrl };
export default supabase; 