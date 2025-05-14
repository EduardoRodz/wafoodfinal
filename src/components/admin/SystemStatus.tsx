import React, { useState, useEffect } from 'react';
import supabase, { supabaseAdmin, getServiceKey } from '../../lib/supabase';

interface SystemStatusProps {
  themeColor: string;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ themeColor }) => {
  const [loading, setLoading] = useState(true);
  const [statusChecks, setStatusChecks] = useState<{
    adminAccess: boolean;
    regularAccess: boolean;
    serviceKeyValid: boolean;
    error: string | null;
  }>({
    adminAccess: false,
    regularAccess: false,
    serviceKeyValid: false,
    error: null
  });

  useEffect(() => {
    async function checkSystemStatus() {
      setLoading(true);
      
      try {
        // Verificar cliente regular
        const regularCheck = await supabase.from('user_roles').select('count').limit(1);
        const regularAccess = !regularCheck.error;
        
        // Verificar token JWT
        const serviceKey = getServiceKey();
        let serviceKeyValid = false;
        
        try {
          const parts = serviceKey.split('.');
          if (parts.length === 3) {
            // Decodificar payload
            const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padding = '='.repeat((4 - base64Payload.length % 4) % 4);
            const payload = JSON.parse(atob(base64Payload + padding));
            serviceKeyValid = payload.role === 'service_role';
          }
        } catch (e) {
          console.error('Error al validar clave de servicio:', e);
        }
        
        // Verificar cliente admin
        let adminAccess = false;
        let errorMessage = null;
        
        try {
          const adminCheck = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
          adminAccess = !adminCheck.error;
          
          if (adminCheck.error) {
            errorMessage = adminCheck.error.message;
          }
        } catch (e: any) {
          errorMessage = e.message;
        }
        
        setStatusChecks({
          regularAccess,
          adminAccess,
          serviceKeyValid,
          error: errorMessage
        });
      } catch (error) {
        console.error('Error al verificar estado del sistema:', error);
      } finally {
        setLoading(false);
      }
    }
    
    checkSystemStatus();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Estado del Sistema</h2>
      
      {loading ? (
        <div className="text-center py-4">
          <div className="w-8 h-8 border-4 border-t-primary rounded-full animate-spin mx-auto mb-2" 
               style={{ borderTopColor: themeColor }}></div>
          <p className="text-sm text-gray-500">Verificando estado del sistema...</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Componente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Acceso regular a la base de datos
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    statusChecks.regularAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {statusChecks.regularAccess ? 'Funcionando' : 'Error'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Formato de clave de servicio
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    statusChecks.serviceKeyValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {statusChecks.serviceKeyValid ? 'Válido' : 'Inválido'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Acceso a API de administrador
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    statusChecks.adminAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {statusChecks.adminAccess ? 'Funcionando' : 'Error'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      
      {!loading && statusChecks.error && (
        <div className="p-4 bg-red-50 rounded-md text-sm">
          <p className="font-medium text-red-800 mb-1">Error detectado:</p>
          <p className="text-red-700">{statusChecks.error}</p>
          
          <div className="mt-4 space-y-2">
            <p className="font-medium text-red-800">Solución para "Invalid API key":</p>
            <ol className="list-decimal pl-5 text-red-700 space-y-1">
              <li>Accede al panel de control de Supabase: <a href="https://app.supabase.io/" target="_blank" rel="noopener noreferrer" className="underline">https://app.supabase.io/</a></li>
              <li>Selecciona tu proyecto</li>
              <li>Ve a Configuración &gt; API</li>
              <li>Copia la clave "service_role" (es la segunda clave)</li>
              <li>Crea un archivo <strong>.env.local</strong> en la raíz del proyecto</li>
              <li>Añade: <code className="bg-gray-100 p-1 rounded">VITE_SUPABASE_SERVICE_KEY=tu_clave_service_role</code></li>
              <li>Reinicia la aplicación</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatus; 