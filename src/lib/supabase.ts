import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURACIÓN DE SEGURIDAD PARA SUPABASE
 * 
 * Este archivo primero intentará cargar las credenciales desde localStorage (instalador)
 * Si no están disponibles, usará las variables de entorno.
 * Si éstas tampoco están disponibles, usará las claves predeterminadas.
 */

// Intentar obtener las credenciales del localStorage primero (guardadas por el instalador)
const STORED_URL = localStorage.getItem('supabaseUrl');
const STORED_ANON_KEY = localStorage.getItem('supabaseAnonKey');
const STORED_SERVICE_KEY = localStorage.getItem('supabaseServiceKey');

// URL de Supabase (priorizar localStorage, luego variables de entorno, luego valor predeterminado)
const SUPABASE_URL = STORED_URL || import.meta.env?.VITE_SUPABASE_URL || 'https://ageqgrjbutdgizcthwkv.supabase.co';

// Claves API
const ANON_KEY = STORED_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZXFncmpidXRkZ2l6Y3Rod2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNDgzMzAsImV4cCI6MjA2MjgyNDMzMH0.O7E_H25eq3aetfwkegTWoG9qkJhsBDnWmRmIMxFQ-OA';

const SERVICE_KEY = STORED_SERVICE_KEY || import.meta.env?.VITE_SUPABASE_SERVICE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZXFncmpidXRkZ2l6Y3Rod2t2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI0ODMzMCwiZXhwIjoyMDYyODI0MzMwfQ.U6G67Wn1TcOTFdrqTFJJ7JeTLuz2xmpB7evJ1bCraUY';

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

// Validar claves antes de inicializar clientes
if (!validateKey(ANON_KEY, 'anon')) {
  console.error('ERROR: La clave anónima no tiene el formato correcto o no contiene el rol "anon"');
}

if (!validateKey(SERVICE_KEY, 'service_role')) {
  console.error('ERROR: La clave de servicio no tiene el formato correcto o no contiene el rol "service_role"');
}

// Crear cliente estándar para operaciones regulares
const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Crear cliente con permisos administrativos (service_role)
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false // Desactivar detección de sesión en URL para cliente admin
  },
  // Configuración específica para las APIs administrativas
  global: {
    // Asegurar que el token se pasa en todos los headers como apikey
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY
    }
  }
});

// Exportar URL y funciones para obtener claves
export const supabaseUrl = SUPABASE_URL;
export const getAnonKey = () => ANON_KEY;
export const getServiceKey = () => SERVICE_KEY;

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
console.log(`Supabase configurado para: ${SUPABASE_URL}`);
console.log(`Cliente anónimo inicializado: ${validateKey(ANON_KEY, 'anon') ? 'OK' : 'ERROR'}`);
console.log(`Cliente admin inicializado: ${validateKey(SERVICE_KEY, 'service_role') ? 'OK' : 'ERROR'}`);

// Verificar que el cliente admin está correctamente configurado
console.log("Cliente admin inicializado con rol:", validateKey(SERVICE_KEY, 'service_role') ? 'service_role' : 'ERROR');

// Verificar que el cliente tenga permisos para acceder a la API de admin si no estamos en el instalador
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

export default supabase; 