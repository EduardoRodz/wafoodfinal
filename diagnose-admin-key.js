import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase - Usa las mismas claves que en tu aplicación
// Si necesitas probar con otras claves, puedes reemplazarlas aquí
const SUPABASE_URL = 'https://numjphltuyfbpyrnevlu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bWpwaGx0dXlmYnB5cm5ldmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjkzMDUsImV4cCI6MjA2MjgwNTMwNX0.Tzz4PO4bex6-UvaDrLs4FnN8y3x72liy5BoluRnOvCI';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bWpwaGx0dXlmYnB5cm5ldmx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzIyOTMwNSwiZXhwIjoyMDYyODA1MzA1fQ.LXilXr4H0Hzs3KeEqJPZlS4iJKrr4_GUP7FmPUJvp7c';

async function diagnoseAdminKey() {
  console.log('==========================================');
  console.log('DIAGNÓSTICO DE CLAVE DE ADMINISTRADOR SUPABASE');
  console.log('==========================================');
  console.log(`URL de Supabase: ${SUPABASE_URL}`);
  
  // Función para decodificar tokens JWT
  function decodeJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { error: 'Formato JWT inválido' };
      }
      
      // Decodificar la parte del payload (la segunda parte)
      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
      
      return payload;
    } catch (e) {
      return { error: 'Error al decodificar token: ' + e.message };
    }
  }
  
  // Verificar formato de tokens
  console.log('\n1. Verificando formato de tokens JWT...');
  
  const anonPayload = decodeJWT(ANON_KEY);
  console.log('Clave anónima:');
  console.log('- Tipo de rol:', anonPayload.role || 'No encontrado');
  console.log('- Fecha de expiración:', anonPayload.exp ? new Date(anonPayload.exp * 1000).toLocaleString() : 'No encontrada');
  
  const servicePayload = decodeJWT(SERVICE_KEY);
  console.log('\nClave de servicio:');
  console.log('- Tipo de rol:', servicePayload.role || 'No encontrado');
  console.log('- Fecha de expiración:', servicePayload.exp ? new Date(servicePayload.exp * 1000).toLocaleString() : 'No encontrada');
  
  if (servicePayload.role !== 'service_role') {
    console.log('\n❌ ERROR: La clave de servicio no tiene el rol "service_role"');
    console.log('   Este es un problema crítico que debe corregirse para poder crear usuarios.');
    return;
  } else {
    console.log('\n✅ La clave de servicio tiene el rol correcto (service_role)');
  }
  
  // Crear cliente con la clave de servicio
  console.log('\n2. Probando cliente admin con clave de servicio...');
  
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY
        }
      }
    });
    
    console.log('Cliente admin inicializado. Intentando listar usuarios...');
    
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
    
    if (error) {
      console.log('\n❌ ERROR al acceder a la API de admin:', error.message);
      console.log('\nRecomendaciones:');
      console.log('1. Verifica que la clave de servicio sea correcta');
      console.log('2. Verifica que la URL de Supabase sea correcta');
      console.log('3. Asegúrate de que el proyecto de Supabase tenga habilitadas las APIs de admin');
    } else {
      console.log('\n✅ Acceso a API de admin exitoso');
      console.log(`   Cantidad de usuarios encontrados: ${data.users.length}`);
      
      // Intentar crear un usuario de prueba
      console.log('\n3. Probando creación de usuario...');
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'test-password-123';
      
      const createResult = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      });
      
      if (createResult.error) {
        console.log('\n❌ ERROR al crear usuario de prueba:', createResult.error.message);
      } else {
        console.log('\n✅ Usuario de prueba creado exitosamente');
        console.log(`   Email: ${testEmail}`);
        
        // Eliminar el usuario de prueba
        console.log('\n4. Limpiando - Eliminando usuario de prueba...');
        const deleteResult = await supabaseAdmin.auth.admin.deleteUser(createResult.data.user.id);
        
        if (deleteResult.error) {
          console.log('\n❌ ERROR al eliminar usuario de prueba:', deleteResult.error.message);
        } else {
          console.log('\n✅ Usuario de prueba eliminado exitosamente');
        }
      }
    }
  } catch (e) {
    console.log('\n❌ ERROR CRÍTICO:', e.message);
  }
  
  console.log('\n==========================================');
  console.log('DIAGNÓSTICO COMPLETADO');
  console.log('==========================================');
}

// Ejecutar diagnóstico
diagnoseAdminKey(); 