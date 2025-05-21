import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, Outlet } from 'react-router-dom';
import Index from './pages/Index';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConfirmError from './pages/ConfirmError';
import Installer from './pages/Installer';
import Favorites from './pages/Favorites';
import AdminPanel from './pages/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { ConfigProvider } from './context/ConfigContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { getInstallationStatus } from './services/configService';
import AdminLayout from './components/admin/AdminLayout';

// Importación diferida de componentes de administración
const GeneralSettings = lazy(() => import('./components/admin/GeneralSettings'));
const UserManager = lazy(() => import('./components/admin/UserManager'));
const SystemStatus = lazy(() => import('./components/admin/SystemStatus'));
const ImportExportData = lazy(() => import('./components/admin/ImportExportData'));
const MenuItemEditor = lazy(() => import('./components/admin/MenuItemEditor'));
const CategoryEditor = lazy(() => import('./components/admin/CategoryEditor'));
const AppearanceEditor = lazy(() => import('./components/admin/AppearanceEditor'));

import './App.css';

// Componente de carga para Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8 h-full">
    <div className="w-10 h-10 border-4 border-t-primary rounded-full animate-spin" 
         style={{ borderTopColor: '#003b29' }}></div>
    <span className="ml-3">Cargando...</span>
  </div>
);

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

  return (
    <Routes>
      {/* Ruta del instalador - solo accesible si no se ha completado */}
      <Route 
        path="/instalador" 
        element={isInstallerCompleted ? <Navigate to="/" replace /> : <Installer />} 
      />
      
      {/* Rutas del panel de administración - protegidas por autenticación */}
      <Route 
        path="/admin" 
        element={
          !isInstallerCompleted ? 
          <Navigate to="/instalador" replace /> : 
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        {/* Redirección de /admin a /admin/menu */}
        <Route index element={<Navigate to="/admin/menu" replace />} />
        
        {/* Redirección de /adminpanel legacy a /admin/menu */}
        <Route path="panel" element={<Navigate to="/admin/menu" replace />} />
        
        {/* Rutas específicas del panel de administración */}
        <Route path="menu" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout title="Menú" hasChanges={false}>
              <MenuItemEditor />
            </AdminLayout>
          </Suspense>
        } />
        
        <Route path="categorias" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout title="Categorías" hasChanges={false}>
              <CategoryEditor />
            </AdminLayout>
          </Suspense>
        } />
        
        <Route path="configuracion" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout title="Configuración General" hasChanges={false}>
              <GeneralSettings />
            </AdminLayout>
          </Suspense>
        } />
        
        <Route path="apariencia" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout title="Apariencia" hasChanges={false}>
              <AppearanceEditor />
            </AdminLayout>
          </Suspense>
        } />
        
        <Route path="usuarios" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout title="Usuarios" hasChanges={false}>
              <UserManager />
            </AdminLayout>
          </Suspense>
        } />
        
        <Route path="sistema" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout title="Estado del Sistema" hasChanges={false}>
              <SystemStatus />
            </AdminLayout>
          </Suspense>
        } />
        
        <Route path="importar" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout title="Importar/Exportar" hasChanges={false}>
              <ImportExportData />
            </AdminLayout>
          </Suspense>
        } />
      </Route>
      
      {/* Ruta legacy para compatibilidad con enlaces antiguos */}
      <Route 
        path="/adminpanel" 
        element={<Navigate to="/admin/menu" replace />}
      />
      
      {/* Ruta de favoritos */}
      <Route 
        path="/favoritos" 
        element={
          !isInstallerCompleted ? 
          <Navigate to="/instalador" replace /> : 
          <Favorites />
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
          <CartProvider>
            <FavoritesProvider>
              <AppRoutes />
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </ConfigProvider>
    </Router>
  );
};

export default App;
