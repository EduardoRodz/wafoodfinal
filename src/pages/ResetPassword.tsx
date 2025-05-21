import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { useConfig } from '../context/ConfigContext';

interface AuthParams {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  type: string;
}

interface ErrorParams {
  error: string;
  error_code: string;
  error_description: string;
}

const ResetPassword: React.FC = () => {
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [authParams, setAuthParams] = useState<AuthParams | null>(null);
  const [errorParams, setErrorParams] = useState<ErrorParams | null>(null);
  const [email, setEmail] = useState('');
  const [isSendingNewLink, setIsSendingNewLink] = useState(false);

  // Extraer los parámetros de autenticación o error del hash de la URL
  useEffect(() => {
    console.log("URL hash:", location.hash);
    
    const hash = location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      
      // Extraer todos los parámetros
      const params: any = {};
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
      
      console.log("Extracted params:", params);
      
      // Verificar si hay un error
      if (params.error) {
        setErrorParams({
          error: params.error,
          error_code: params.error_code || '',
          error_description: params.error_description || 'Error desconocido'
        });
      }
      // Si no hay error y hay token de acceso, establecer los parámetros de autenticación
      else if (params.access_token) {
        setAuthParams(params as AuthParams);
      }
    }
  }, [location]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }
    
    if (password.length < 6) {
      setMessage({ text: 'La contraseña debe tener al menos 6 caracteres', type: 'error' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      console.log("Intentando cambiar contraseña con tokens:", authParams);
      
      // Si tenemos los parámetros de autenticación, establecer la sesión primero
      if (authParams) {
        console.log("Estableciendo sesión con tokens...");
        
        const supabase = await getSupabase();
        
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: authParams.access_token,
          refresh_token: authParams.refresh_token || '',
        });
        
        if (sessionError) {
          console.error("Error al establecer sesión:", sessionError);
          throw new Error(`Error al establecer la sesión: ${sessionError.message}`);
        }
        
        console.log("Sesión establecida correctamente");
      } else {
        throw new Error("No se encontraron tokens de autenticación en la URL");
      }
      
      // Actualizar la contraseña
      console.log("Actualizando contraseña...");
      const supabase = await getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      
      if (error) {
        console.error("Error al actualizar contraseña:", error);
        throw error;
      }
      
      console.log("Contraseña actualizada correctamente");
      setMessage({ 
        text: 'Contraseña actualizada correctamente. Serás redirigido al panel de administración...', 
        type: 'success' 
      });
      
      // Redirigir después de unos segundos
      setTimeout(() => {
        navigate('/adminpanel');
      }, 3000);
      
    } catch (error: any) {
      console.error("Error completo:", error);
      setMessage({ 
        text: `Error al actualizar la contraseña: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ text: 'Por favor, ingresa tu correo electrónico', type: 'error' });
      return;
    }
    
    setIsSendingNewLink(true);
    setMessage(null);
    
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) {
        throw error;
      }
      
      setMessage({ 
        text: 'Se ha enviado un nuevo enlace de restablecimiento a tu correo electrónico. Por favor revisa tu bandeja de entrada y carpeta de spam.', 
        type: 'success' 
      });
      
    } catch (error: any) {
      setMessage({ 
        text: `Error al enviar el enlace: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setIsSendingNewLink(false);
    }
  };

  // Si hay un error en la URL, mostrar mensaje apropiado y formulario para solicitar nuevo enlace
  if (errorParams) {
    const isExpiredLink = errorParams.error_code === 'otp_expired';
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: config.theme.backgroundColor }}>
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: config.theme.primaryColor }}>
            Error al Restablecer Contraseña
          </h1>
          
          <div className="p-4 mb-4 bg-red-100 text-red-800 rounded">
            <p className="font-medium">
              {isExpiredLink 
                ? 'El enlace ha expirado.' 
                : 'Error al validar el enlace de restablecimiento.'
              }
            </p>
            <p className="mt-2 text-sm">
              {errorParams.error_description}
            </p>
          </div>
          
          <div className="mt-6">
            <h2 className="text-lg font-medium mb-4">Solicitar un nuevo enlace</h2>
            
            <form onSubmit={handleSendNewLink}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isSendingNewLink}
                    placeholder="Ingresa tu correo electrónico"
                  />
                </div>
                
                {message && (
                  <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full py-2 px-4 text-white font-medium rounded"
                  style={{ backgroundColor: config.theme.primaryColor }}
                  disabled={isSendingNewLink}
                >
                  {isSendingNewLink ? 'Enviando...' : 'Enviar Nuevo Enlace'}
                </button>
                
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/adminpanel')}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Volver al panel de administración
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: config.theme.backgroundColor }}>
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: config.theme.primaryColor }}>
          Restablecer Contraseña
        </h1>
        
        {!authParams && (
          <div className="p-4 mb-4 bg-yellow-100 text-yellow-800 rounded">
            <p>No se ha detectado un token de acceso válido en la URL. Si llegaste aquí desde un enlace de restablecimiento de contraseña, asegúrate de usar el enlace completo del correo electrónico.</p>
            
            <div className="mt-2 text-sm">
              <p>URL actual: {window.location.href}</p>
            </div>
            
            <div className="mt-4">
              <p className="font-medium">¿No tienes un enlace válido?</p>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Solicitar un nuevo enlace de restablecimiento
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleResetPassword}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nueva Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading || !authParams}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Confirmar Contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading || !authParams}
              />
            </div>
            
            {message && (
              <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.text}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full py-2 px-4 text-white font-medium rounded"
              style={{ backgroundColor: config.theme.primaryColor }}
              disabled={loading || !authParams}
            >
              {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => navigate('/adminpanel')}
                className="text-sm text-gray-600 hover:underline"
              >
                Volver al panel de administración
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword; 