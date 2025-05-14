import supabase from '../lib/supabase';

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
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      throw error;
    }
    
    return { user, error: null };
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    return { user: null, error: error as Error };
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const { user, error } = await getCurrentUser();
  return !error && user !== null;
};

export const loginWithEmail = async (credentials: LoginCredentials) => {
  try {
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