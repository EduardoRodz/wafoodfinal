import React, { ReactNode, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, LogIn } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si está cargando, mostrar un indicador de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-green-600 border-green-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar formulario de login
  if (!user) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!email || !password) {
        setLoginError('Por favor, complete todos los campos.');
        return;
      }
      
      setIsSubmitting(true);
      setLoginError('');
      
      try {
        const { success, error } = await login({ email, password });
        
        if (!success) {
          setLoginError(error?.message || 'Credenciales incorrectas. Por favor, intente de nuevo.');
        }
      } catch (error: any) {
        setLoginError(error?.message || 'Error al iniciar sesión. Por favor, intente más tarde.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 border-b pb-5">
            <CardTitle className="text-2xl text-center text-green-700">Panel de Administración</CardTitle>
            <CardDescription className="text-center">
              Inicie sesión con su cuenta de administrador para acceder
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Correo Electrónico</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="correo@ejemplo.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
                  <a 
                    href="/forgot-password" 
                    className="text-sm text-green-600 hover:underline"
                  >
                    ¿Olvidó su contraseña?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-300"
                  required
                />
              </div>
              
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{loginError}</p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Iniciar sesión</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="border-t pt-5">
            <p className="text-sm text-center w-full text-gray-500">
              Acceso exclusivo para administradores. Si necesita una cuenta, contacte al administrador del sistema.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Si hay usuario autenticado, mostrar los hijos (la ruta protegida)
  return <>{children}</>;
};

export default ProtectedRoute; 