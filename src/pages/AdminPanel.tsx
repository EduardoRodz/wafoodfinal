import React, { useState, useEffect } from 'react';
import { config as defaultConfig } from '../config';
import { ColorPicker, CategoryEditor, MenuItemEditor, GeneralSettings, UserManager, SystemStatus } from '../components/admin';
import { X, Save, LogOut, Users, AlertCircle } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { getCurrentUserRole } from '../services/userService';
import ResendConfirmation from '../components/admin/ResendConfirmation';

// Tipo para nuestro archivo de configuración editable
interface EditableConfig {
  restaurantName: string;
  whatsappNumber: string;
  currency: string;
  openingHours: string;
  theme: {
    primaryColor: string;
    accentColor: string;
    textColor: string;
    backgroundColor: string;
    cartButtonColor: string;
    floatingCartButtonColor: string;
  };
  cashDenominations: {
    value: number;
    label: string;
  }[];
  categories: {
    id: string;
    name: string;
    icon: string;
    items: {
      id: string;
      name: string;
      description: string;
      price: number;
      image: string;
    }[];
  }[];
  footerText: string;
}

const AdminPanel: React.FC = () => {
  const { config, saveConfig } = useConfig();
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editableConfig, setEditableConfig] = useState<EditableConfig>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState('menu');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string>('staff');
  const [roleLoading, setRoleLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  // Timeout para pantalla de carga
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (loading || roleLoading) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 segundos de espera máxima
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, roleLoading]);

  // Reintentar carga
  const handleRetry = () => {
    setLoadingTimeout(false);
    window.location.reload();
  };

  // Cargar el rol del usuario actual
  useEffect(() => {
    const loadUserRole = async () => {
      if (user) {
        try {
          setRoleLoading(true);
          // Establecer un timeout de seguridad para evitar carga infinita
          const timeoutId = setTimeout(() => {
            console.log("Timeout al cargar rol - estableciendo rol por defecto");
            setRoleLoading(false);
            setUserRole('staff'); // Establecer rol por defecto si hay timeout
          }, 5000); // 5 segundos máximo

          const role = await getCurrentUserRole();
          clearTimeout(timeoutId); // Limpiar el timeout si la petición termina bien
          setUserRole(role);
          
          // Si es staff, establecer el tab activo a "menu"
          if (role === 'staff' && activeTab !== 'menu' && activeTab !== 'categories') {
            setActiveTab('menu');
          }
        } catch (error) {
          console.error('Error al cargar el rol del usuario:', error);
          // En caso de error, asignar un rol predeterminado
          setUserRole('staff');
        } finally {
          setRoleLoading(false);
        }
      } else {
        setRoleLoading(false);
      }
    };
    
    loadUserRole();
  }, [user, activeTab]);

  // Actualizar la copia editable cuando cambia la configuración
  useEffect(() => {
    setEditableConfig(JSON.parse(JSON.stringify(config)));
  }, [config]);

  // Añadir oyente para cambio de pestaña desde componentes hijos
  useEffect(() => {
    const handleSetActiveTab = (event: CustomEvent) => {
      if (event.detail && typeof event.detail === 'string') {
        setActiveTab(event.detail);
      }
    };
    
    window.addEventListener('setActiveTab', handleSetActiveTab as EventListener);
    
    return () => {
      window.removeEventListener('setActiveTab', handleSetActiveTab as EventListener);
    };
  }, []);

  // Autenticar usuario con Supabase
  const handleLogin = async () => {
    try {
      setLoginError('');
      const { success, error } = await login({ email, password });
      
      if (!success) {
        setLoginError(error?.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error('Error en login:', error);
      setLoginError('Error inesperado al iniciar sesión');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  // Actualizar la configuración
  const handleConfigChange = (newConfig: EditableConfig) => {
    setEditableConfig(newConfig);
    setHasChanges(true);
  };

  // Actualizar una sección específica
  const updateConfigSection = (section: keyof EditableConfig, value: any) => {
    const newConfig = { ...editableConfig, [section]: value };
    handleConfigChange(newConfig);
  };

  // Guardar cambios
  const handleSaveChanges = () => {
    // Usar el contexto para guardar la configuración
    const success = saveConfig(editableConfig);
    
    if (success) {
      // Guardar también en localStorage para persistencia
      localStorage.setItem('siteConfig', JSON.stringify(editableConfig));
      
      // Notificar al usuario
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setHasChanges(false);
      
      // Enviar un evento para que otras pestañas/ventanas actualicen su estado
      const saveEvent = new CustomEvent('configSaved', { detail: editableConfig });
      window.dispatchEvent(saveEvent);
    } else {
      alert('Hubo un error al guardar la configuración. Por favor, intenta de nuevo.');
    }
  };

  // Mover categoría arriba o abajo
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === editableConfig.categories.length - 1)
    ) {
      return; // No hacer nada si está al principio o al final
    }

    const newCategories = [...editableConfig.categories];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newCategories[index], newCategories[swapIndex]] = [newCategories[swapIndex], newCategories[index]];
    
    updateConfigSection('categories', newCategories);
  };

  // Si está cargando, mostrar indicador
  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-primary rounded-full animate-spin mx-auto mb-4" 
               style={{ borderTopColor: config.theme.primaryColor }}></div>
          <p className="text-gray-600">Cargando...</p>
          
          {loadingTimeout && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg max-w-md">
              <p className="text-red-600 mb-2">
                La carga está tomando más tiempo del esperado. Puede haber un problema con la conexión o la autenticación.
              </p>
              <button 
                onClick={handleRetry}
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

  // Si no hay usuario logueado, mostrar página de login
  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: config.theme.primaryColor }}>
              Panel de Administración
            </h1>
            
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              {loginError && (
                <div className="p-3 bg-red-100 text-red-700 rounded">
                  {loginError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-2 px-4 text-white font-medium rounded"
                style={{ backgroundColor: config.theme.primaryColor }}
              >
                Iniciar Sesión
              </button>
              
              <div className="flex justify-between mt-2">
                <a 
                  href="/forgot-password" 
                  className="text-sm text-gray-600 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </a>
                <button
                  type="button"
                  onClick={() => setShowResendForm(!showResendForm)}
                  className="text-sm text-gray-600 hover:underline"
                >
                  {showResendForm ? 'Ocultar opciones' : '¿No recibiste el correo de confirmación?'}
                </button>
              </div>
            </form>
          </div>
          
          {showResendForm && (
            <ResendConfirmation themeColor={config.theme.primaryColor} />
          )}
        </div>
      </div>
    );
  }

  // Panel principal de administración
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold" style={{ color: config.theme.primaryColor }}>
          Panel de Administración - {editableConfig.restaurantName}
        </h1>
        
        <div className="flex items-center gap-4">
          {hasChanges && (
            <button
              onClick={handleSaveChanges}
              className="flex items-center gap-1 py-2 px-4 text-white font-medium rounded"
              style={{ backgroundColor: config.theme.primaryColor }}
            >
              <Save size={18} /> Guardar Cambios
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {user.email}
              {userRole === 'admin' ? (
                <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                  Admin
                </span>
              ) : (
                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  Personal
                </span>
              )}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded hover:bg-gray-300"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Toast de éxito */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg flex items-center justify-between z-50">
          <span>¡Cambios guardados correctamente!</span>
          <button onClick={() => setSaveSuccess(false)} className="ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Tabs de navegación */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {/* Tabs solo para administradores */}
              {userRole === 'admin' && (
                <>
                  <button
                    onClick={() => setActiveTab('general')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'general'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: activeTab === 'general' ? config.theme.primaryColor : 'transparent',
                           color: activeTab === 'general' ? config.theme.primaryColor : '' }}
                  >
                    Configuración General
                  </button>
                  <button
                    onClick={() => setActiveTab('appearance')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'appearance'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: activeTab === 'appearance' ? config.theme.primaryColor : 'transparent',
                           color: activeTab === 'appearance' ? config.theme.primaryColor : '' }}
                  >
                    Apariencia
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'users'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: activeTab === 'users' ? config.theme.primaryColor : 'transparent',
                           color: activeTab === 'users' ? config.theme.primaryColor : '' }}
                  >
                    Usuarios
                  </button>
                  <button
                    onClick={() => setActiveTab('system')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'system'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: activeTab === 'system' ? config.theme.primaryColor : 'transparent',
                           color: activeTab === 'system' ? config.theme.primaryColor : '' }}
                  >
                    <div className="flex items-center gap-1">
                      <AlertCircle size={16} />
                      <span>Sistema</span>
                    </div>
                  </button>
                </>
              )}
              
              {/* Tabs para todos los usuarios (en orden inverso para staff) */}
              <button
                onClick={() => setActiveTab('menu')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'menu'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ borderColor: activeTab === 'menu' ? config.theme.primaryColor : 'transparent',
                       color: activeTab === 'menu' ? config.theme.primaryColor : '' }}
              >
                Menú
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'categories'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ borderColor: activeTab === 'categories' ? config.theme.primaryColor : 'transparent',
                       color: activeTab === 'categories' ? config.theme.primaryColor : '' }}
              >
                Categorías
              </button>
            </nav>
          </div>

          {/* Contenido de los tabs */}
          <div className="bg-white rounded-lg shadow p-6">
            {activeTab === 'general' && userRole === 'admin' && (
              <GeneralSettings 
                config={editableConfig} 
                onChange={(newGeneralSettings) => {
                  const updatedConfig = {...editableConfig, ...newGeneralSettings};
                  handleConfigChange(updatedConfig);
                }}
              />
            )}

            {activeTab === 'appearance' && userRole === 'admin' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Colores del Sitio</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ColorPicker
                    label="Color Primario"
                    value={editableConfig.theme.primaryColor}
                    onChange={(color) => {
                      const newTheme = {...editableConfig.theme, primaryColor: color};
                      updateConfigSection('theme', newTheme);
                    }}
                  />
                  
                  <ColorPicker
                    label="Color de Acento"
                    value={editableConfig.theme.accentColor}
                    onChange={(color) => {
                      const newTheme = {...editableConfig.theme, accentColor: color};
                      updateConfigSection('theme', newTheme);
                    }}
                  />
                  
                  <ColorPicker
                    label="Color de Texto"
                    value={editableConfig.theme.textColor}
                    onChange={(color) => {
                      const newTheme = {...editableConfig.theme, textColor: color};
                      updateConfigSection('theme', newTheme);
                    }}
                  />
                  
                  <ColorPicker
                    label="Color de Fondo"
                    value={editableConfig.theme.backgroundColor}
                    onChange={(color) => {
                      const newTheme = {...editableConfig.theme, backgroundColor: color};
                      updateConfigSection('theme', newTheme);
                    }}
                  />
                  
                  <ColorPicker
                    label="Color del Botón del Carrito"
                    value={editableConfig.theme.cartButtonColor}
                    onChange={(color) => {
                      const newTheme = {...editableConfig.theme, cartButtonColor: color};
                      updateConfigSection('theme', newTheme);
                    }}
                  />
                  
                  <ColorPicker
                    label="Color del Botón Flotante"
                    value={editableConfig.theme.floatingCartButtonColor}
                    onChange={(color) => {
                      const newTheme = {...editableConfig.theme, floatingCartButtonColor: color};
                      updateConfigSection('theme', newTheme);
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <CategoryEditor 
                categories={editableConfig.categories}
                onChange={(categories) => updateConfigSection('categories', categories)}
                onMove={moveCategory}
              />
            )}

            {activeTab === 'menu' && (
              <MenuItemEditor 
                categories={editableConfig.categories}
                onChange={(categories) => updateConfigSection('categories', categories)}
              />
            )}
            
            {activeTab === 'users' && userRole === 'admin' && (
              <UserManager
                currentUserEmail={user.email}
                themeColor={config.theme.primaryColor}
              />
            )}
            
            {activeTab === 'system' && userRole === 'admin' && (
              <SystemStatus
                themeColor={config.theme.primaryColor}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 