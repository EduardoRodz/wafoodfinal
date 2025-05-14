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

import './App.css';

// Componente para verificar si el instalador ya está completado
const AppRoutes: React.FC = () => {
  const [isInstallerCompleted, setIsInstallerCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    // Comprobar si el instalador ya se ha ejecutado
    const installerCompleted = localStorage.getItem('installerCompleted');
    setIsInstallerCompleted(!!installerCompleted);
    setIsLoading(false);
  }, []);

  // Mientras estamos verificando, mostrar un indicador de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando aplicación...</p>
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
