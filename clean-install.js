/**
 * Script para limpiar la instalación de WaFood
 * 
 * Este script elimina las claves de localStorage relacionadas con la instalación
 * para permitir ejecutar el instalador nuevamente.
 */

// Instrucciones para el usuario
console.log('='.repeat(50));
console.log('LIMPIEZA DE INSTALACIÓN DE WAFOOD');
console.log('='.repeat(50));
console.log('\nEste script permite limpiar la instalación actual para reiniciar');
console.log('completamente el proceso de instalación.\n');

// Lista de claves que hay que eliminar para reiniciar la instalación
const keysToRemove = [
  'installerCompleted',
  'supabaseUrl',
  'supabaseAnonKey',
  'supabaseServiceKey',
  'siteConfig'
];

console.log('Para limpiar la instalación, sigue estos pasos:\n');
console.log('1. Abre la aplicación en el navegador (http://localhost:5173 o la URL de despliegue)');
console.log('2. Abre las herramientas de desarrollo (F12 o clic derecho > Inspeccionar)');
console.log('3. Ve a la pestaña "Console" (Consola)');
console.log('4. Copia y pega el siguiente código:\n');

console.log('// Código para limpiar la instalación:');
console.log(`
try {
  ${keysToRemove.map(key => `localStorage.removeItem('${key}');`).join('\n  ')}
  console.log('✅ Instalación limpiada correctamente. Recarga la página para iniciar el instalador.');
} catch (error) {
  console.error('❌ Error al limpiar la instalación:', error);
}
`);

console.log('\nUna vez limpiada la instalación, recarga la página y verás el instalador nuevamente.');
console.log('\nAlternativamente, puedes ejecutar este mismo script en el navegador abriendo:');
console.log('http://localhost:5173/clean-install.html (reemplaza con tu URL de despliegue si es diferente)\n');

console.log('='.repeat(50)); 