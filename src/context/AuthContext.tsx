import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUser, login as loginService, logout as logoutService, LoginCredentials } from '../services/authService';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error: Error | null }>;
  logout: () => Promise<{ success: boolean; error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar si el usuario está autenticado al cargar la aplicación
  useEffect(() => {
    const checkUser = async () => {
      // No verificar usuario en la página del instalador
      if (window.location.pathname === '/instalador') {
        console.log('En la página del instalador, no se verificará el usuario');
        setUser(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { user } = await getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error('Error verificando usuario:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  // Función de login
  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const { user, error } = await loginService(credentials);
      
      if (error) {
        throw error;
      }
      
      setUser(user);
      return { success: true, error: null };
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  // Función de logout
  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await logoutService();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      return { success: true, error: null };
    } catch (error) {
      console.error('Error en logout:', error);
      return { success: false, error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}; 