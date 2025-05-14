import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import { useConfig } from '../context/ConfigContext';

const ForgotPassword: React.FC = () => {
  const { config } = useConfig();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ text: 'Por favor, ingresa tu correo electrónico', type: 'error' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      console.log("Enviando solicitud de restablecimiento para:", email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) {
        console.error("Error al solicitar restablecimiento:", error);
        throw error;
      }
      
      console.log("Solicitud de restablecimiento enviada correctamente");
      setMessage({ 
        text: 'Se ha enviado un enlace de restablecimiento de contraseña a tu correo electrónico. Por favor revisa tu bandeja de entrada y también la carpeta de spam.', 
        type: 'success' 
      });
      
    } catch (error: any) {
      console.error("Error completo:", error);
      setMessage({ 
        text: `Error al enviar el correo de restablecimiento: ${error.message}`, 
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
          Recuperar Contraseña
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
                placeholder="Ingresa el correo con el que te registraste"
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
              {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
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

export default ForgotPassword; 