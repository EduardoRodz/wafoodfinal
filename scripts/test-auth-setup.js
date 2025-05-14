/**
 * Script para verificar la configuración de autenticación de Supabase
 * Este script revisa la configuración de URLs y redirecciones
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://numjphltuyfbpyrnevlu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bWpwaGx0dXlmYnB5cm5ldmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjkzMDUsImV4cCI6MjA2MjgwNTMwNX0.Tzz4PO4bex6-UvaDrLs4FnN8y3x72liy5BoluRnOvCI';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bWpwaGx0dXlmYnB5cm5ldmx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzIyOTMwNSwiZXhwIjoyMDYyODA1MzA1fQ.LXilXr4H0Hzs3KeEqJPZlS4iJKrr4_GUP7FmPUJvp7c';

// Valores para probar
const TEST_EMAIL = 'test' + Date.now() + '@example.com';
const TEST_PASSWORD = 'test123456';
const DEPLOYED_URL = 'https://wafoodv2.netlify.app'; // Cambiar por la URL real desplegada

console.log('============================================================');
console.log('VERIFICADOR DE CONFIGURACIÓN DE AUTENTICACIÓN DE SUPABASE');
console.log('============================================================');

async function testSupabaseAuth() {
  try {
    console.log('\n1. Creando clientes de Supabase...');
    // Cliente regular
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Cliente admin
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('   ✅ Clientes creados correctamente');
    
    // Verificar configuración de sitios permitidos
    console.log('\n2. Verificando configuración de sitios permitidos...');
    
    // Esta función no está disponible en la API pública, pero dejamos la verificación manual
    console.log('   ℹ️ ACCIÓN MANUAL REQUERIDA:');
    console.log(`   Verifica que las siguientes URLs estén configuradas en el panel de Supabase:`);
    console.log(`   - ${DEPLOYED_URL}`);
    console.log(`   - http://localhost:8081`);
    console.log(`   - http://localhost:3000`);
    
    // Crear usuario de prueba
    console.log('\n3. Intentando crear usuario de prueba...');
    try {
      const { data: adminUserData, error: adminUserError } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true
      });
      
      if (adminUserError) {
        console.log('   ❌ Error al crear usuario:', adminUserError);
      } else {
        console.log(`   ✅ Usuario de prueba creado con email: ${TEST_EMAIL}`);
        
        // Eliminar el usuario de prueba
        console.log('\n4. Eliminando usuario de prueba...');
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(adminUserData.user.id);
        
        if (deleteError) {
          console.log('   ❌ Error al eliminar usuario:', deleteError);
        } else {
          console.log('   ✅ Usuario eliminado correctamente');
        }
      }
    } catch (e) {
      console.log('   ❌ Error en prueba de administración:', e);
    }
    
    // Probar función de reenvío
    console.log('\n5. Probando función de reenvío de correos...');
    
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: 'test@example.com',  // Email ficticio para la prueba
        options: {
          emailRedirectTo: `${DEPLOYED_URL}/adminpanel`
        }
      });
      
      if (resendError) {
        console.log('   ❌ Error al probar función de reenvío:', resendError);
      } else {
        console.log('   ✅ Función de reenvío disponible');
      }
    } catch (e) {
      console.log('   ❌ Error en prueba de reenvío:', e);
    }
    
    console.log('\n============================================================');
    console.log('RECOMENDACIONES:');
    console.log('============================================================');
    console.log('1. Verificar URLs de redirección en el panel de Supabase');
    console.log('2. Configurar un proveedor SMTP personalizado para mayor fiabilidad');
    console.log('3. Si los enlaces expiran rápidamente, aumentar el tiempo de expiración');
    console.log('4. Verificar que los correos no sean bloqueados por filtros anti-spam');
    console.log('5. Usar el dominio correcto en todas las llamadas API (local vs. producción)');
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

// Ejecutar pruebas
testSupabaseAuth(); 