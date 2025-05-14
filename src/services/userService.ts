import supabase, { supabaseAdmin } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
  last_sign_in_at: string | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  role: 'admin' | 'staff';
}

export interface UpdateUserData {
  id: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'staff';
}

// Obtener todos los usuarios
export const getUsers = async (): Promise<User[]> => {
  try {
    // Primero consultamos la tabla de autenticación para obtener todos los usuarios
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }
    
    if (!authUsers || !authUsers.users) {
      return [];
    }
    
    // Consultamos la tabla personalizada de roles de usuario
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*');
    
    if (roleError) {
      console.error('Error al obtener roles de usuario:', roleError);
    }
    
    // Creamos un mapa de ID de usuario a rol
    const userRoles: Record<string, string> = {};
    if (roleData) {
      roleData.forEach((record: any) => {
        userRoles[record.user_id] = record.role;
      });
    }
    
    // Combinamos los datos
    return authUsers.users.map(user => ({
      id: user.id,
      email: user.email || '',
      role: (userRoles[user.id] as 'admin' | 'staff') || 'staff',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    }));
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return [];
  }
};

// Crear un nuevo usuario
export const createUser = async (userData: CreateUserData): Promise<{ user: User | null; error: Error | null }> => {
  try {
    console.log("Intentando crear usuario con cliente admin...");
    console.log("Email:", userData.email, "Rol:", userData.role);
    
    // Verificamos que el cliente admin esté correctamente configurado
    if (!supabaseAdmin) {
      console.error("Cliente admin de Supabase no disponible");
      throw new Error("Error de configuración: Cliente admin no disponible");
    }
    
    // Verificar si tenemos acceso a la API de admin antes de intentar crear el usuario
    try {
      const testAccess = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
      if (testAccess.error) {
        console.error("Error de acceso a API admin:", testAccess.error);
        throw new Error("Error de autenticación: No se puede acceder a la API de administrador. Verifique que la clave de servicio sea correcta.");
      } else {
        console.log("Acceso a API admin confirmado, procediendo a crear usuario...");
      }
    } catch (accessError: any) {
      console.error("Error verificando acceso a API admin:", accessError);
      throw new Error(`Error de acceso: ${accessError.message || 'No se puede acceder a la API de administrador'}`);
    }
    
    // Crear usuario con el cliente admin usando la clave de servicio
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true // Auto-confirmar el email con el cliente admin
    });
    
    if (authError) {
      console.error("Error al crear usuario con cliente admin:", authError);
      
      // Proporcionar mensajes de error más específicos
      if (authError.message?.includes('Invalid API key')) {
        throw new Error('Error de autenticación: La clave API de servicio es inválida. Contacte al administrador del sistema.');
      }
      
      if (authError.message?.includes('service_role key required')) {
        throw new Error('Error de autenticación: Se requiere una clave de servicio válida para crear usuarios. La clave actual no tiene privilegios de service_role.');
      }
      
      if (authError.message?.includes('User already registered')) {
        throw new Error(`El correo ${userData.email} ya está registrado. Utilice otro correo electrónico.`);
      }
      
      // Error genérico si no coincide con ninguno de los anteriores
      throw authError;
    }
    
    if (!authData || !authData.user) {
      throw new Error('No se pudo crear el usuario. Respuesta vacía del servidor.');
    }
    
    console.log('Usuario creado correctamente con cliente admin:', authData.user.email);
    
    // Guardar rol en tabla personalizada usando supabaseAdmin para asegurar permisos
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert([{
        user_id: authData.user.id,
        role: userData.role
      }]);
    
    if (roleError) {
      console.error('Error al guardar rol del usuario:', roleError);
      // Continuamos aunque haya error en la asignación de rol para no perder el usuario creado
    }
    
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        role: userData.role,
        created_at: authData.user.created_at,
        last_sign_in_at: null
      },
      error: null
    };
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    return { user: null, error: error as Error };
  }
};

// Actualizar un usuario existente
export const updateUser = async (userData: UpdateUserData): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Actualizar datos de autenticación si es necesario
    if (userData.email || userData.password) {
      const updateData: any = {};
      if (userData.email) updateData.email = userData.email;
      if (userData.password) updateData.password = userData.password;
      
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userData.id,
        updateData
      );
      
      if (authError) {
        throw authError;
      }
    }
    
    // Actualizar rol si es necesario
    if (userData.role) {
      // Verificar si ya existe un registro para este usuario
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userData.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 es "no se encontró registro"
        console.error('Error al verificar rol existente:', checkError);
      }
      
      if (existingRole) {
        // Actualizar rol existente
        const { error: updateRoleError } = await supabase
          .from('user_roles')
          .update({ role: userData.role })
          .eq('user_id', userData.id);
        
        if (updateRoleError) {
          console.error('Error al actualizar rol:', updateRoleError);
        }
      } else {
        // Crear nuevo registro de rol
        const { error: insertRoleError } = await supabase
          .from('user_roles')
          .insert([{ user_id: userData.id, role: userData.role }]);
        
        if (insertRoleError) {
          console.error('Error al insertar rol:', insertRoleError);
        }
      }
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return { success: false, error: error as Error };
  }
};

// Eliminar un usuario
export const deleteUser = async (userId: string): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Eliminar usuario de autenticación
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      throw authError;
    }
    
    // Eliminar registro de rol
    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (roleError) {
      console.error('Error al eliminar rol:', roleError);
      // No bloqueamos el proceso por error al eliminar el rol
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return { success: false, error: error as Error };
  }
};

// Obtener el rol del usuario actual
export const getCurrentUserRole = async (): Promise<string> => {
  try {
    // Intentar obtener el usuario autenticado
    console.log("Obteniendo usuario actual...");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Si hay error o no hay usuario, manejarlo adecuadamente
    if (authError) {
      console.error('Error al obtener usuario:', authError);
      throw authError;
    }
    
    if (!user) {
      console.error('No se encontró usuario autenticado');
      throw new Error('No se encontró usuario autenticado');
    }
    
    console.log("Usuario autenticado:", user.email);
    
    // Si el usuario es eduardorweb@gmail.com, siempre retornar 'admin'
    if (user.email === 'eduardorweb@gmail.com') {
      console.log('Usuario admin predeterminado detectado:', user.email);
      return 'admin';
    }
    
    // Consultar el rol del usuario en la base de datos
    console.log("Consultando rol en tabla user_roles para:", user.id);
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleError) {
        console.error('Error al obtener rol:', roleError);
        // No lanzamos error para evitar que la app se rompa, usamos rol por defecto
        return 'staff';
      }
      
      const role = roleData?.role || 'staff';
      console.log("Rol obtenido:", role);
      return role;
    } catch (roleQueryError) {
      console.error('Error en consulta de rol:', roleQueryError);
      return 'staff';
    }
  } catch (error) {
    console.error('Error al obtener rol del usuario actual:', error);
    // Por defecto, asumimos rol de staff para no romper la aplicación
    return 'staff';
  }
}; 