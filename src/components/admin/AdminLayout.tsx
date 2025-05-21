import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Save, LogOut, Menu, X, Settings, Grid, Upload, Users, BarChart } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUserRole } from '../../services/userService';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  hasChanges?: boolean;
  onSave?: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  title, 
  hasChanges = false, 
  onSave 
}) => {
  const { config, isLoading: configLoading } = useConfig();
  const { user, loading, logout } = useAuth();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string>('staff');
  const [roleLoading, setRoleLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Timeout para pantalla de carga
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (loading || roleLoading) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, roleLoading]);

  // Cargar el rol del usuario actual
  useEffect(() => {
    const loadUserRole = async () => {
      if (user) {
        try {
          setRoleLoading(true);
          const timeoutId = setTimeout(() => {
            console.log("Timeout al cargar rol - estableciendo rol por defecto");
            setRoleLoading(false);
            setUserRole('staff');
          }, 5000);

          const role = await getCurrentUserRole();
          clearTimeout(timeoutId);
          setUserRole(role);
          
          if (role === 'staff' && 
              !['/admin/menu', '/admin/categorias'].includes(location.pathname)) {
            navigate('/admin/menu');
          }
        } catch (error) {
          console.error('Error al cargar el rol del usuario:', error);
          setUserRole('staff');
        } finally {
          setRoleLoading(false);
        }
      } else {
        setRoleLoading(false);
      }
    };
    
    loadUserRole();
  }, [user, navigate, location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  // Si está cargando, mostrar indicador
  if ((loading || roleLoading) && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="text-center p-4">
          <div className="w-12 h-12 border-4 border-t-primary rounded-full animate-spin mx-auto mb-4" 
               style={{ borderTopColor: '#003b29' }}></div>
          <p className="text-gray-600">Cargando...</p>
          
          {loadingTimeout && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg max-w-md">
              <p className="text-red-600 mb-2">
                La carga está tomando más tiempo del esperado.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Si no hay usuario logueado, redirigir al login
  if (!loading && !user) {
    navigate('/admin');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <header className="bg-white shadow-sm py-3 px-4 sm:py-4 sm:px-6 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="mr-2 sm:hidden p-1 rounded-full hover:bg-gray-100"
            aria-label="Menú"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base sm:text-xl font-bold truncate" style={{ color: config.theme?.primaryColor || '#003b29' }}>
            {configLoading ? 'Cargando...' : config.restaurantName} - {title}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1 py-2 px-3 sm:px-4 text-white font-medium rounded text-sm"
              style={{ backgroundColor: config.theme?.primaryColor || '#003b29' }}
            >
              <Save size={16} /> <span className="hidden sm:inline">Guardar</span>
            </button>
          )}
          
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden sm:inline text-sm text-gray-600 truncate max-w-[150px]">
              {user?.email}
            </span>
            {userRole && (
              <span className="px-2 py-0.5 text-xs rounded-full whitespace-nowrap"
                style={{
                  backgroundColor: userRole === 'admin' ? '#F3E8FF' : '#DBEAFE',
                  color: userRole === 'admin' ? '#6B21A8' : '#1E40AF'
                }}>
                {userRole === 'admin' ? 'Admin' : 'Staff'}
              </span>
            )}
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="p-2 rounded-full hover:bg-gray-100 sm:py-2 sm:px-4 sm:rounded sm:bg-gray-200 sm:hover:bg-gray-300 sm:text-gray-800 sm:font-medium"
            >
              <LogOut size={16} className="sm:hidden" />
              <span className="hidden sm:inline-flex items-center gap-1"><LogOut size={16} /> Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast de éxito */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg flex items-center justify-between z-50">
          <span>¡Cambios guardados!</span>
          <button onClick={() => setSaveSuccess(false)} className="ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Menú móvil optimizado */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute inset-0 bg-black opacity-25"></div>
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-lg" onClick={e => e.stopPropagation()}>
            {/* Encabezado del menú móvil */}
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h2 className="font-bold text-lg">Menú</h2>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Opciones del menú móvil */}
            <div className="overflow-y-auto h-full pb-20">
              <div className="p-2">
                <div className="mb-4">
                  <p className="text-xs uppercase text-gray-500 font-medium px-3 mb-1">Principal</p>
                  <div className="space-y-1">
                    <Link
                      to="/admin/menu"
                      className={`flex items-center w-full p-3 rounded-lg ${location.pathname === '/admin/menu' ? 'bg-gray-100' : ''}`}
                      style={{ color: location.pathname === '/admin/menu' ? config.theme?.primaryColor || '#003b29' : '' }}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Grid size={18} className="mr-3" /> Menú
                    </Link>
                    <Link
                      to="/admin/categorias"
                      className={`flex items-center w-full p-3 rounded-lg ${location.pathname === '/admin/categorias' ? 'bg-gray-100' : ''}`}
                      style={{ color: location.pathname === '/admin/categorias' ? config.theme?.primaryColor || '#003b29' : '' }}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Grid size={18} className="mr-3" /> Categorías
                    </Link>
                  </div>
                </div>
                
                {userRole === 'admin' && (
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-medium px-3 mb-1">Administración</p>
                    <div className="space-y-1">
                      <Link
                        to="/admin/configuracion"
                        className={`flex items-center w-full p-3 rounded-lg ${location.pathname === '/admin/configuracion' ? 'bg-gray-100' : ''}`}
                        style={{ color: location.pathname === '/admin/configuracion' ? config.theme?.primaryColor || '#003b29' : '' }}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <Settings size={18} className="mr-3" /> Configuración General
                      </Link>
                      <Link
                        to="/admin/apariencia"
                        className={`flex items-center w-full p-3 rounded-lg ${location.pathname === '/admin/apariencia' ? 'bg-gray-100' : ''}`}
                        style={{ color: location.pathname === '/admin/apariencia' ? config.theme?.primaryColor || '#003b29' : '' }}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <Settings size={18} className="mr-3" /> Apariencia
                      </Link>
                      <Link
                        to="/admin/usuarios"
                        className={`flex items-center w-full p-3 rounded-lg ${location.pathname === '/admin/usuarios' ? 'bg-gray-100' : ''}`}
                        style={{ color: location.pathname === '/admin/usuarios' ? config.theme?.primaryColor || '#003b29' : '' }}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <Users size={18} className="mr-3" /> Usuarios
                      </Link>
                      <Link
                        to="/admin/sistema"
                        className={`flex items-center w-full p-3 rounded-lg ${location.pathname === '/admin/sistema' ? 'bg-gray-100' : ''}`}
                        style={{ color: location.pathname === '/admin/sistema' ? config.theme?.primaryColor || '#003b29' : '' }}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <BarChart size={18} className="mr-3" /> Sistema
                      </Link>
                      <Link
                        to="/admin/importar"
                        className={`flex items-center w-full p-3 rounded-lg ${location.pathname === '/admin/importar' ? 'bg-gray-100' : ''}`}
                        style={{ color: location.pathname === '/admin/importar' ? config.theme?.primaryColor || '#003b29' : '' }}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <Upload size={18} className="mr-3" /> Importar/Exportar
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 p-3 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Tabs de navegación (solo para desktop) */}
          <div className="hidden sm:block border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {/* Tabs para todos los usuarios */}
              <Link
                to="/admin/menu"
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  location.pathname === '/admin/menu'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ borderColor: location.pathname === '/admin/menu' ? config.theme?.primaryColor || '#003b29' : 'transparent',
                       color: location.pathname === '/admin/menu' ? config.theme?.primaryColor || '#003b29' : '' }}
              >
                Menú
              </Link>
              <Link
                to="/admin/categorias"
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  location.pathname === '/admin/categorias'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ borderColor: location.pathname === '/admin/categorias' ? config.theme?.primaryColor || '#003b29' : 'transparent',
                       color: location.pathname === '/admin/categorias' ? config.theme?.primaryColor || '#003b29' : '' }}
              >
                Categorías
              </Link>
              
              {/* Tabs solo para administradores */}
              {userRole === 'admin' && (
                <>
                  <Link
                    to="/admin/configuracion"
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      location.pathname === '/admin/configuracion'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: location.pathname === '/admin/configuracion' ? config.theme?.primaryColor || '#003b29' : 'transparent',
                           color: location.pathname === '/admin/configuracion' ? config.theme?.primaryColor || '#003b29' : '' }}
                  >
                    Configuración General
                  </Link>
                  <Link
                    to="/admin/apariencia"
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      location.pathname === '/admin/apariencia'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: location.pathname === '/admin/apariencia' ? config.theme?.primaryColor || '#003b29' : 'transparent',
                           color: location.pathname === '/admin/apariencia' ? config.theme?.primaryColor || '#003b29' : '' }}
                  >
                    Apariencia
                  </Link>
                  <Link
                    to="/admin/usuarios"
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      location.pathname === '/admin/usuarios'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: location.pathname === '/admin/usuarios' ? config.theme?.primaryColor || '#003b29' : 'transparent',
                           color: location.pathname === '/admin/usuarios' ? config.theme?.primaryColor || '#003b29' : '' }}
                  >
                    Usuarios
                  </Link>
                  <Link
                    to="/admin/sistema"
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      location.pathname === '/admin/sistema'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: location.pathname === '/admin/sistema' ? config.theme?.primaryColor || '#003b29' : 'transparent',
                           color: location.pathname === '/admin/sistema' ? config.theme?.primaryColor || '#003b29' : '' }}
                  >
                    Sistema
                  </Link>
                  <Link
                    to="/admin/importar"
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      location.pathname === '/admin/importar'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: location.pathname === '/admin/importar' ? config.theme?.primaryColor || '#003b29' : 'transparent',
                           color: location.pathname === '/admin/importar' ? config.theme?.primaryColor || '#003b29' : '' }}
                  >
                    Importar/Exportar
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Contenido */}
          <div className="bg-white rounded-lg shadow p-3 sm:p-6">
            {children}
          </div>
        </div>
      </div>
      
      {/* Footer con créditos */}
      <footer className="bg-gray-100 py-3 text-gray-600 text-xs text-center mt-auto">
        <div className="max-w-6xl mx-auto px-4">
          WAFOOD Desarrollado por{' '}
          <a 
            href="https://wa.me/18092010357?text=Hola,%20me%20interesa%20el%20sistema%20de%20WAFOOD" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-gray-800 font-medium"
            style={{ color: config.theme?.primaryColor || '#003b29' }}
          >
            Eduardo Soto
          </a>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout; 