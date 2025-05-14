// Script para probar el cliente de administración de Supabase
import { createClient } from '@supabase/supabase-js';

console.log('Iniciando prueba del cliente de administración de Supabase...');

// Configuración de Supabase (mismas claves que en la aplicación)
const SUPABASE_URL = 'https://numjphltuyfbpyrnevlu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bWpwaGx0dXlmYnB5cm5ldmx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzIyOTMwNSwiZXhwIjoyMDYyODA1MzA1fQ.LXilXr4H0Hzs3KeEqJPZlS4iJKrr4_GUP7FmPUJvp7c';

// Decodificar el token para verificar
function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error("El token no es válido, no tiene 3 partes");
    return null;
  }
  
  try {
    // Base64Url a Base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Añadir padding
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    // Decodificar para Node.js con Buffer
    const jsonPayload = Buffer.from(base64 + padding, 'base64').toString();
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error decodificando token:", e);
    return null;
  }
}

// Mostrar información del token
const decodedToken = decodeJWT(SERVICE_KEY);
console.log('Información del token de servicio:');
console.log(decodedToken);

async function testAdminClient() {
  try {
    console.log('\nCreando cliente de administración...');
    // Crear cliente con la clave de servicio
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('\nPrueba 1: Listar usuarios');
    try {
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error('Error al listar usuarios:', error);
      } else {
        console.log(`Usuarios encontrados: ${users.users.length}`);
        console.log('Primer usuario:', users.users[0]?.email);
      }
    } catch (e) {
      console.error('Error en la prueba 1:', e);
    }
    
    console.log('\nPrueba 2: Crear un usuario de prueba');
    try {
      const testEmail = `test_${Date.now()}@example.com`;
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: 'password123',
        email_confirm: true
      });
      
      if (error) {
        console.error('Error al crear usuario:', error);
      } else {
        console.log('Usuario creado:', data.user.email);
        
        // Intentar crear rol para este usuario
        console.log('\nPrueba 3: Asignar rol al usuario');
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert([{ 
            user_id: data.user.id, 
            role: 'staff' 
          }]);
        
        if (roleError) {
          console.error('Error al asignar rol:', roleError);
        } else {
          console.log('Rol asignado correctamente');
        }
      }
    } catch (e) {
      console.error('Error en la prueba 2:', e);
    }
    
  } catch (e) {
    console.error('Error general:', e);
  }
}

testAdminClient().then(() => console.log('Pruebas completadas')); 