import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Index from './pages/Index';
import AdminPanel from './pages/AdminPanel';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConfirmError from './pages/ConfirmError';
import Installer from './pages/Installer';
import ProtectedRoute from './components/ProtectedRoute';
import { ConfigProvider } from './context/ConfigContext';
import { AuthProvider } from './context/AuthContext';
import { getInstallationStatus } from './services/configService';

import './App.css';

// Componente para verificar si el instalador ya está completado
const AppRoutes: React.FC = () => {
  const [isInstallerCompleted, setIsInstallerCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    // Comprobar si el instalador ya se ha ejecutado verificando en la base de datos
    const checkInstallationStatus = async () => {
      try {
        setIsLoading(true);
        
        // 1. Verificar en la base de datos mediante la función getInstallationStatus
        try {
          console.log('Verificando estado de instalación en Supabase...');
          const status = await getInstallationStatus();
          console.log('Estado obtenido desde la base de datos:', status);
          
          if (status === 'completed') {
            console.log('✅ Instalación marcada como completada en la base de datos');
            setIsInstallerCompleted(true);
            
            // Actualizar localStorage por compatibilidad
            if (!localStorage.getItem('installerCompleted')) {
              localStorage.setItem('installerCompleted', 'completed_from_db');
            }
            
            setIsLoading(false);
            return;
          }
        } catch (dbError) {
          console.error('Error al verificar estado en la base de datos:', dbError);
        }
        
        // 2. Verificar directamente con fetch API como método alternativo
        try {
          const storedUrl = localStorage.getItem('supabaseUrl');
          const storedAnonKey = localStorage.getItem('supabaseAnonKey');
          
          if (storedUrl && storedAnonKey) {
            console.log('Intentando verificar estado con fetch API...');
            
            const response = await fetch(
              `${storedUrl}/rest/v1/site_config?select=installation_status&order=id.desc&limit=1`,
              {
                method: 'GET',
                headers: {
                  'apikey': storedAnonKey,
                  'Authorization': `Bearer ${storedAnonKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.length > 0) {
                console.log('Estado obtenido con fetch API:', data[0].installation_status);
                
                if (data[0].installation_status === 'completed') {
                  console.log('✅ Instalación marcada como completada según fetch API');
                  setIsInstallerCompleted(true);
                  localStorage.setItem('installerCompleted', 'completed_from_fetch');
                  setIsLoading(false);
                  return;
                }
              }
            }
          }
        } catch (fetchError) {
          console.error('Error al verificar con fetch API:', fetchError);
        }
        
        // 3. Verificar si hay registros en site_config como indicador de instalación
        try {
          const storedUrl = localStorage.getItem('supabaseUrl');
          const storedAnonKey = localStorage.getItem('supabaseAnonKey');
          
          if (storedUrl && storedAnonKey) {
            console.log('Verificando existencia de registros en site_config...');
            
            const response = await fetch(
              `${storedUrl}/rest/v1/site_config?select=count`,
              {
                method: 'HEAD',
                headers: {
                  'apikey': storedAnonKey,
                  'Authorization': `Bearer ${storedAnonKey}`,
                  'Prefer': 'count=exact'
                }
              }
            );
            
            if (response.ok) {
              const count = response.headers.get('content-range')?.split('/')[1];
              if (count && parseInt(count) > 0) {
                console.log(`✅ Se encontraron ${count} registros en site_config, asumiendo instalación completa`);
                setIsInstallerCompleted(true);
                localStorage.setItem('installerCompleted', 'completed_record_exists');
                setIsLoading(false);
                return;
              }
            }
          }
        } catch (countError) {
          console.error('Error al verificar existencia de registros:', countError);
        }
        
        // 4. Último recurso: verificar localStorage
        const localInstallStatus = localStorage.getItem('installerCompleted');
        if (localInstallStatus) {
          console.log('✅ Instalación marcada como completada según localStorage');
          setIsInstallerCompleted(true);
          setIsLoading(false);
          return;
        }
        
        // 5. Si se llegó hasta aquí, la instalación no está completa
        console.log('❌ No se pudo verificar que la instalación esté completa, mostrando instalador');
        setIsInstallerCompleted(false);
        setIsLoading(false);
      } catch (error) {
        console.error('Error crítico al verificar estado de instalación:', error);
        
        // Si hay un error crítico pero las credenciales existen, tratamos de continuar
        const hasCredentials = localStorage.getItem('supabaseUrl') && 
                               localStorage.getItem('supabaseAnonKey') &&
                               localStorage.getItem('installerCompleted');
                               
        setIsInstallerCompleted(Boolean(hasCredentials));
        setIsLoading(false);
      }
    };
    
    checkInstallationStatus();
  }, []);

  // Mientras estamos verificando, mostrar un indicador de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando instalación...</p>
        </div>
      </div>
    );
  }

  // Verificar si estamos intentando acceder al adminpanel
  const isAdminPath = location.pathname === '/adminpanel';

  return (
    <Routes>
      {/* Ruta del instalador - solo accesible si no se ha completado */}
      <Route 
        path="/instalador" 
        element={isInstallerCompleted ? <Navigate to="/" replace /> : <Installer />} 
      />
      
      {/* Panel de administración - protegido por autenticación */}
      <Route 
        path="/adminpanel" 
        element={
          !isInstallerCompleted ? 
          <Navigate to="/instalador" replace /> : 
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } 
      />
      
      {/* Ruta principal - redirige al instalador si no se ha completado */}
      <Route 
        path="/" 
        element={
          !isInstallerCompleted ? 
          <Navigate to="/instalador" replace /> : 
          <Index />
        } 
      />
      
      {/* Rutas de autenticación */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/confirm-error" element={<ConfirmError />} />
      
      {/* Ruta por defecto para URL no encontradas */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ConfigProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ConfigProvider>
    </Router>
  );
};

export default App;
