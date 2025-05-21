/**
 * Script para limpiar la instalación de WaFood
 * 
 * Este script elimina las claves de localStorage relacionadas con la instalación
 * y también limpia los datos de Supabase para permitir ejecutar el instalador nuevamente.
 */

// Instrucciones para el usuario
console.log('='.repeat(50));
console.log('LIMPIEZA DE INSTALACIÓN DE WAFOOD');
console.log('='.repeat(50));
console.log('\nEste script te ayudará a limpiar la instalación para poder ejecutar');
console.log('completamente el proceso de instalación.\n');
console.log('PASOS:');
console.log('1. Copia el código que aparece abajo');
console.log('2. Pégalo en la consola del navegador en la página de tu aplicación');
console.log('3. Presiona Enter para ejecutarlo');
console.log('4. Recarga la página para iniciar el instalador nuevamente\n');

// Claves de localStorage a eliminar
const keysToRemove = [
  'installerCompleted',
  'siteConfig',
  'supabaseUrl',
  'supabaseAnonKey',
  'supabaseServiceKey',
  'sb-supabase-auth-token',
  'sb-supabase-auth-token-SUPABASE_URL'
];

// Código para limpiar localStorage
console.log('='.repeat(50));
console.log('CÓDIGO PARA LIMPIAR LOCALSTORAGE:');
console.log('='.repeat(50));

console.log(`
try {
  ${keysToRemove.map(key => `localStorage.removeItem('${key}');`).join('\n  ')}
  console.log('✅ LocalStorage limpiado correctamente.');
  
  // Intentar limpiar también los datos en Supabase
  const cleanSupabaseData = async () => {
    try {
      // Obtener las credenciales de Supabase
      const supabaseUrl = localStorage.getItem('supabaseUrl') || prompt('Ingresa la URL de Supabase:');
      const supabaseServiceKey = localStorage.getItem('supabaseServiceKey') || prompt('Ingresa la clave de servicio de Supabase:');
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ No se pudieron obtener las credenciales de Supabase.');
        return;
      }
      
      // Crear un cliente de Supabase
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Restablecer el estado de instalación
      const { error: configError } = await supabase
        .from('site_config')
        .upsert({ 
          key: 'installation_status', 
          value: 'pending',
          description: 'Estado de la instalación del sistema'
        });
      
      if (configError) {
        console.error('❌ Error al restablecer el estado de instalación:', configError);
      } else {
        console.log('✅ Estado de instalación restablecido en Supabase.');
      }
      
      console.log('✅ Limpieza completa. Recarga la página para iniciar el instalador.');
    } catch (error) {
      console.error('❌ Error al limpiar datos en Supabase:', error);
      console.log('Por favor, ejecuta el script SQL manualmente en el panel de Supabase:');
      console.log(\`
        UPDATE site_config 
        SET value = '"pending"' 
        WHERE key = 'installation_status';
      \`);
    }
  };
  
  cleanSupabaseData();
} catch (error) {
  console.error('❌ Error al limpiar la instalación:', error);
}
`);

console.log('\nUna vez limpiada la instalación, recarga la página y verás el instalador nuevamente.');
console.log('='.repeat(50)); 