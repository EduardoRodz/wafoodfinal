// Script para asignar el rol de administrador a un usuario específico en Supabase
// Para ejecutar: node set-admin-role.js

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const SUPABASE_URL = 'https://numjphltuyfbpyrnevlu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bWpwaGx0dXlmYnB5cm5ldmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjkzMDUsImV4cCI6MjA2MjgwNTMwNX0.Tzz4PO4bex6-UvaDrLs4FnN8y3x72liy5BoluRnOvCI';

// Datos del usuario a actualizar
const TARGET_EMAIL = 'eduardorweb@gmail.com';
const TARGET_ROLE = 'admin';

async function setAdminRole() {
  console.log('Iniciando script para asignar rol de administrador...');
  console.log(`Usuario objetivo: ${TARGET_EMAIL}`);
  console.log(`Rol a asignar: ${TARGET_ROLE}`);
  
  try {
    console.log('Creando cliente Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('Obteniendo lista de usuarios...');
    const { data, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error al obtener usuarios:', userError);
      throw userError;
    }
    
    console.log('Respuesta de la API:', JSON.stringify(data, null, 2));
    
    if (!data || !data.users) {
      console.error('No se recibieron datos de usuarios o formato de respuesta inesperado');
      throw new Error('Formato de respuesta inesperado');
    }
    
    // Buscar el usuario por email
    console.log('Buscando usuario por email...');
    const targetUser = data.users.find(user => user.email === TARGET_EMAIL);
    
    if (!targetUser) {
      console.error(`No se encontró usuario con email ${TARGET_EMAIL}`);
      throw new Error(`No se encontró ningún usuario con el email ${TARGET_EMAIL}`);
    }
    
    console.log(`Usuario encontrado: ${targetUser.email} (ID: ${targetUser.id})`);
    
    // Verificar si ya existe un registro en user_roles
    console.log('Verificando si existe registro en user_roles...');
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', targetUser.id)
      .maybeSingle();
    
    if (checkError) {
      console.log('Error en la consulta:', checkError);
      if (checkError.code !== 'PGRST116') { // PGRST116 es "no se encontró registro"
        throw checkError;
      }
      console.log('El usuario no tiene un rol asignado todavía');
    }
    
    if (existingRole) {
      // Actualizar rol existente
      console.log(`Actualizando rol existente de '${existingRole.role}' a '${TARGET_ROLE}'...`);
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: TARGET_ROLE })
        .eq('user_id', targetUser.id);
      
      if (updateError) {
        console.error('Error al actualizar rol:', updateError);
        throw updateError;
      }
      
      console.log(`Rol actualizado para ${targetUser.email}: ${TARGET_ROLE}`);
    } else {
      // Crear nuevo registro de rol
      console.log('Creando nuevo registro de rol...');
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: targetUser.id, role: TARGET_ROLE }]);
      
      if (insertError) {
        console.error('Error al insertar rol:', insertError);
        throw insertError;
      }
      
      console.log(`Rol asignado para ${targetUser.email}: ${TARGET_ROLE}`);
    }
    
    console.log('---------------------------------------');
    console.log(`El usuario ${TARGET_EMAIL} ahora tiene el rol de ${TARGET_ROLE}`);
    
  } catch (error) {
    console.error('Error al asignar rol de administrador:', error);
  }
}

// Ejecutar la función y manejar la promesa
setAdminRole()
  .then(() => console.log('Script completado'))
  .catch(err => console.error('Error no capturado:', err)); 