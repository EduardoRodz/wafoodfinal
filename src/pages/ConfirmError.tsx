import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import { resendConfirmationEmail } from '../services/authService';

interface ErrorParams {
  error: string;
  error_code: string;
  error_description: string;
}

const ConfirmError: React.FC = () => {
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [errorParams, setErrorParams] = useState<ErrorParams | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Extraer los parámetros de error del hash de la URL
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
      
      console.log("Parámetros extraídos:", params);
      
      // Verificar si hay un error
      if (params.error) {
        setErrorParams({
          error: params.error,
          error_code: params.error_code || '',
          error_description: params.error_description || 'Error desconocido'
        });
      }
    }
  }, [location]);

  const handleSendNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ text: 'Por favor, ingresa tu correo electrónico', type: 'error' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const { success, error } = await resendConfirmationEmail(email);
      
      if (error) {
        throw error;
      }
      
      setMessage({ 
        text: 'Se ha enviado un nuevo enlace de confirmación a tu correo electrónico. Por favor revisa tu bandeja de entrada y también la carpeta de spam.', 
        type: 'success' 
      });
      
    } catch (error: any) {
      console.error("Error al reenviar correo:", error);
      setMessage({ 
        text: `Error al reenviar el correo de confirmación: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: config.theme.primaryColor }}>
          Error de Confirmación
        </h1>
        
        {errorParams && (
          <div className="p-4 mb-4 bg-red-100 text-red-800 rounded">
            <p className="font-medium">
              {errorParams.error_code === 'otp_expired' 
                ? 'El enlace de confirmación ha expirado.' 
                : 'Error al validar tu cuenta.'
              }
            </p>
            <p className="mt-2 text-sm">
              {errorParams.error_description}
            </p>
          </div>
        )}
        
        <div>
          <h2 className="text-lg font-medium mb-4">Solicitar un nuevo enlace de confirmación</h2>
          
          <form onSubmit={handleSendNewLink}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
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
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar Nuevo Enlace'}
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
};

export default ConfirmError; 