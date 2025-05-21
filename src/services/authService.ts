import { getSupabase } from '../lib/supabase';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: any | null;
  error: Error | null;
}

export const login = async ({ email, password }: LoginCredentials): Promise<AuthResponse> => {
  try {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error en login:', error);
    return { user: null, error: error as Error };
  }
};

export const logout = async (): Promise<{ error: Error | null }> => {
  try {
    const supabase = await getSupabase();
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }
    
    return { error: null };
  } catch (error) {
    console.error('Error en logout:', error);
    return { error: error as Error };
  }
};

export const getCurrentUser = async (): Promise<{ user: any | null, error: Error | null }> => {
  try {
    // No verificar usuario en la página del instalador
    if (window.location.pathname === '/instalador') {
      console.log('En la página del instalador, no se verificará el usuario');
      return { user: null, error: null };
    }
    
    const supabase = await getSupabase();
    
    // Verificar si hay una sesión almacenada antes de intentar obtener el usuario
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      // No hay sesión, por lo que no hay usuario autenticado
      return { user: null, error: null };
    }
    
    // Hay sesión, intentamos obtener el usuario
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Si hay un error relacionado con token inválido o claim faltante,
      // es probable que la sesión esté corrupta o haya expirado
      if (error.message?.includes('invalid claim') || error.message?.includes('JWT')) {
        console.warn('Sesión inválida detectada, cerrando sesión...');
        // Intentar limpiar la sesión localmente
        await supabase.auth.signOut({ scope: 'local' });
        return { user: null, error: null };
      }
      
      throw error;
    }
    
    return { user, error: null };
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    // Intenta limpiar la sesión local en caso de error para prevenir futuros problemas
    try {
      const supabase = await getSupabase();
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.error('Error adicional al intentar cerrar sesión:', signOutError);
    }
    return { user: null, error: error as Error };
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const { user, error } = await getCurrentUser();
  return !error && user !== null;
};

export const loginWithEmail = async (credentials: LoginCredentials) => {
  try {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return { data: null, error };
  }
};

export const resendConfirmationEmail = async (email: string) => {
  try {
    console.log('Intentando reenviar correo de confirmación a:', email);
    
    // Obtener la URL base actual
    const baseUrl = window.location.origin;
    const redirectUrl = `${baseUrl}/adminpanel`;
    
    console.log('URL de redirección:', redirectUrl);
    
    const supabase = await getSupabase();
    
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.error('Error al reenviar correo de confirmación:', error);
      throw error;
    }
    
    console.log('Correo de confirmación reenviado correctamente');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error al reenviar correo de confirmación:', error);
    return { success: false, error };
  }
}; 