import React, { useState } from 'react';
import { resendConfirmationEmail } from '../../services/authService';

interface ResendConfirmationProps {
  themeColor: string;
}

const ResendConfirmation: React.FC<ResendConfirmationProps> = ({ themeColor }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ text: 'Por favor, ingresa un correo electrónico', type: 'error' });
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
        text: 'Se ha reenviado el correo de confirmación. Por favor revisa tu bandeja de entrada y también la carpeta de spam.', 
        type: 'success' 
      });
      setEmail(''); // Limpiar el campo después de enviar
      
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Reenviar Correo de Confirmación</h2>
      
      <p className="mb-4 text-gray-600">
        Si no has recibido el correo de confirmación, puedes solicitar que se te envíe nuevamente.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ingresa tu correo electrónico"
            disabled={loading}
          />
        </div>
        
        {message && (
          <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}
        
        <button
          type="submit"
          className="px-4 py-2 text-white rounded"
          style={{ backgroundColor: themeColor }}
          disabled={loading}
        >
          {loading ? 'Enviando...' : 'Reenviar Correo'}
        </button>
      </form>
    </div>
  );
};

export default ResendConfirmation; 