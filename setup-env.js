/**
 * Script para verificar y configurar las claves API de Supabase
 * 
 * Este script te ayudará a configurar correctamente las claves API para
 * evitar el error "Invalid API key" al utilizar funciones administrativas.
 * 
 * Para ejecutar: node setup-env.js
 */

// Función para decodificar un token JWT
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error("Token inválido, no tiene 3 partes");
      return null;
    }
    
    // Base64Url a Base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Añadir padding
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    // Decodificar
    const jsonPayload = Buffer.from(base64 + padding, 'base64').toString();
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error decodificando token:", e);
    return null;
  }
}

// Clave de servicio por defecto
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bWpwaGx0dXlmYnB5cm5ldmx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzIyOTMwNSwiZXhwIjoyMDYyODA1MzA1fQ.LXilXr4H0Hzs3KeEqJPZlS4iJKrr4_GUP7FmPUJvp7c';

console.log('===== CONFIGURACIÓN DE CLAVES API DE SUPABASE =====');
console.log('\nVerificando clave de servicio por defecto...');

const decodedToken = decodeJWT(SERVICE_KEY);
if (decodedToken) {
  console.log('✅ Clave de servicio decodificada correctamente');
  console.log('Información de la clave:');
  console.log(' - Proyecto: ' + decodedToken.ref);
  console.log(' - Rol: ' + decodedToken.role);
  console.log(' - Fecha de emisión: ' + new Date(decodedToken.iat * 1000).toLocaleString());
  console.log(' - Fecha de expiración: ' + new Date(decodedToken.exp * 1000).toLocaleString());
} else {
  console.log('❌ No se pudo decodificar la clave de servicio');
}

console.log('\n===== SOLUCIÓN AL ERROR "INVALID API KEY" =====');
console.log(`
Si estás experimentando el error "Invalid API key" al crear o gestionar usuarios,
hay varias soluciones posibles:

1. CONFIGURAR VARIABLES DE ENTORNO (recomendado)
   Crea un archivo .env.local en la raíz del proyecto con las siguientes variables:

   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon
   VITE_SUPABASE_SERVICE_KEY=tu-clave-service-role

   Puedes obtener estas claves desde el panel de control de Supabase:
   Project Settings > API > API Keys

2. VERIFICAR ROLES Y PERMISOS EN SUPABASE
   Asegúrate de que los roles necesarios tengan los permisos adecuados:
   - El rol 'service_role' debe tener permisos para crear usuarios y modificar tablas
   - La tabla 'user_roles' debe ser accesible para escritura

3. REGENERAR CLAVES API
   Si nada más funciona, puedes intentar regenerar las claves API desde el panel de control de Supabase.

4. ACTUALIZAR IMPLEMENTACIÓN DEL CLIENTE
   La aplicación está configurada para manejar el error y usar un método alternativo para crear usuarios.
   Verifica los logs para más detalles sobre qué método se está utilizando.
`);

console.log('\n===== RECURSOS ÚTILES =====');
console.log(`
- Documentación de API Keys: https://supabase.com/docs/guides/api/api-keys
- Foro de Supabase: https://github.com/supabase/supabase/discussions
- Panel de control: https://supabase.com/dashboard
`);

console.log('\n===== FIN ====='); 