import { getSupabase, getSupabaseAdmin } from '../lib/supabase';

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
    const supabaseAdmin = await getSupabaseAdmin();
    
    // Primero consultamos la tabla de autenticación para obtener todos los usuarios
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }
    
    if (!authUsers || !authUsers.users) {
      return [];
    }
    
    // Consultamos la tabla profiles para obtener los roles
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, role');
    
    if (profilesError) {
      console.error('Error al obtener roles de usuarios desde profiles:', profilesError);
    }
    
    // Creamos un mapa de ID de usuario a rol
    const userRoles: Record<string, string> = {};
    if (profilesData) {
      profilesData.forEach((record: any) => {
        userRoles[record.id] = record.role;
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
    const supabaseAdmin = await getSupabaseAdmin();
    
    // Crear usuario en autenticación
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    });
    
    if (authError) {
      throw authError;
    }
    
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
    const supabaseAdmin = await getSupabaseAdmin();
    const supabase = await getSupabase();
    
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
        .maybeSingle();
      
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
    const supabaseAdmin = await getSupabaseAdmin();
    const supabase = await getSupabase();
    
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
    const supabase = await getSupabase();
    
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
    
    // Verificar si tiene el rol en los metadatos
    if (user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin') {
      console.log('Rol admin encontrado en metadatos del usuario');
      return 'admin';
    }
    
    // Método 1: Consultar el rol en la tabla profiles
    console.log("Consultando rol en tabla profiles para:", user.id);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!profileError && profileData?.role === 'admin') {
        console.log("Rol admin encontrado en profiles:", profileData.role);
        return 'admin';
      }
      
      if (profileError) {
        console.log('No se encontró información en profiles o hubo error, verificando en user_roles');
      }
    } catch (profileQueryError) {
      console.error('Error en consulta de profiles:', profileQueryError);
    }
    
    // Método 2: Consultar el rol en la tabla user_roles
    console.log("Consultando rol en tabla user_roles para:", user.id);
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleError) {
        console.error('Error al obtener rol en user_roles:', roleError);
        // No lanzamos error para evitar que la app se rompa, continuamos con verificaciones
      } else if (roleData?.role === 'admin') {
        console.log("Rol admin encontrado en user_roles:", roleData.role);
        return 'admin';
      }
    } catch (roleQueryError) {
      console.error('Error en consulta de user_roles:', roleQueryError);
    }
    
    // Por defecto, si no se ha detectado rol admin en ninguna parte
    console.log("No se detectó rol admin, asignando rol 'staff'");
    return 'staff';
  } catch (error) {
    console.error('Error al obtener rol del usuario actual:', error);
    // Por defecto, asumimos rol de staff para no romper la aplicación
    return 'staff';
  }
}; 