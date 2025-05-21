import React, { useState, useEffect, lazy, Suspense } from 'react';
import { config as defaultConfig } from '../config';
import { X, Save, LogOut, Menu, Settings, Grid, Upload } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { getCurrentUserRole } from '../services/userService';
import ResendConfirmation from '../components/admin/ResendConfirmation';
import { 
  ColorPicker, 
  ModernColorPicker, 
  CategoryEditor, 
  MenuItemEditor 
} from '../components/admin';

// Lazy load de componentes para reducir el tamaño inicial de carga
const GeneralSettings = lazy(() => import('../components/admin/GeneralSettings'));
const UserManager = lazy(() => import('../components/admin/UserManager'));
const SystemStatus = lazy(() => import('../components/admin/SystemStatus'));
const ImportExportData = lazy(() => import('../components/admin/ImportExportData'));

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

// Configuración mínima para inicialización (sin valores por defecto)
const fallbackConfig: EditableConfig = {
  restaurantName: "",
  whatsappNumber: "",
  currency: "",
  openingHours: "",
  theme: {
    primaryColor: "",
    accentColor: "",
    textColor: "",
    backgroundColor: "",
    cartButtonColor: "",
    floatingCartButtonColor: ""
  },
  categories: [],
  footerText: ""
};

// Componente de carga para usar con Suspense
const LoadingFallback = ({ message = 'Cargando...' }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="w-10 h-10 border-4 border-t-primary rounded-full animate-spin mb-4" 
         style={{ borderTopColor: '#003b29' }}></div>
    <p className="text-gray-600">{message}</p>
  </div>
);

const AdminPanel: React.FC = () => {
  const { config, saveConfig, isLoading: configLoading, setIsLoading, loadConfigSection, 
          sectionLoaded, saveSiteConfigOnly, saveAppearanceOnly, saveMenuOnly } = useConfig();
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editableConfig, setEditableConfig] = useState<EditableConfig>(fallbackConfig);
  const [activeTab, setActiveTab] = useState('menu');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string>('staff');
  const [roleLoading, setRoleLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [configLoadAttempted, setConfigLoadAttempted] = useState(false);

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

  // Forzar avance después de un tiempo si no se carga la configuración
  useEffect(() => {
    const forceAdvanceTimeout = setTimeout(() => {
      if (!configLoadAttempted) {
        console.warn("Forzando avance debido a timeout de carga de configuración");
        setConfigLoadAttempted(true);
      }
    }, 5000);

    return () => clearTimeout(forceAdvanceTimeout);
  }, []);

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
          
          if (role === 'staff' && activeTab !== 'menu' && activeTab !== 'categories') {
            setActiveTab('menu');
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
  }, [user, activeTab]);

  // Actualizar la copia editable cuando cambia la configuración
  useEffect(() => {
    if (config) {
      try {
        // Crear una copia segura de la configuración
        const configCopy = JSON.parse(JSON.stringify(config));
        
        // Asegurar que todas las propiedades existan
        const safeConfig = {
          restaurantName: configCopy.restaurantName || '',
          whatsappNumber: configCopy.whatsappNumber || '',
          currency: configCopy.currency || '',
          openingHours: configCopy.openingHours || '',
          footerText: configCopy.footerText || '',
          theme: configCopy.theme || {
            primaryColor: '',
            accentColor: '',
            textColor: '',
            backgroundColor: '',
            cartButtonColor: '',
            floatingCartButtonColor: ''
          },
          categories: Array.isArray(configCopy.categories) ? configCopy.categories : [],
        };
        
        setEditableConfig(safeConfig);
        setConfigLoadAttempted(true);
        console.log("✅ Configuración cargada desde Supabase:", safeConfig);
      } catch (error) {
        console.error("❌ Error al procesar la configuración:", error);
        // Si hay un error, usar fallbackConfig
        setEditableConfig(fallbackConfig);
        setConfigLoadAttempted(true);
      }
    }
  }, [config]);

  // Efecto para cargar los datos específicos cuando cambia la pestaña activa
  useEffect(() => {
    if (!user) return; // No hacer nada si no hay usuario
    
    // Usar referencia para controlar el estado de montaje
    const isComponentMounted = { current: true };
    
    // El tiempo de debounce para evitar cargas rápidas consecutivas
    const DEBOUNCE_TIME = 150; // ms
    
    const loadTabData = async () => {
      // Si no hay pestaña activa, salir
      if (!activeTab) return;
      
      // Log para depuración
      console.log(`[⏳ AdminPanel] Iniciando carga para pestaña: ${activeTab}`);
      
      // Determinar qué sección cargar basado en la pestaña activa
      let sectionToLoad: 'site' | 'appearance' | 'menu';
      
      switch (activeTab) {
        case 'menu':
        case 'categories':
          sectionToLoad = 'menu';
          break;
        case 'appearance':
          sectionToLoad = 'appearance';
          // Para la pestaña de apariencia, siempre forzar la recarga desde la base de datos
          if (isComponentMounted.current) {
            console.log(`[🔄 AdminPanel] Forzando carga de datos de apariencia desde la base de datos`);
            try {
              setTabLoading(true);
              // Forzar recarga desde la base de datos para la sección 'appearance'
              await loadConfigSection('appearance');
            } finally {
              if (isComponentMounted.current) {
                setTabLoading(false);
              }
            }
            return; // Salir después de forzar la carga
          }
          break;
        case 'general':
        case 'users':
        case 'system':
          sectionToLoad = 'site';
          break;
        default:
          sectionToLoad = 'menu';
      }
      
      // Verificar si ya tenemos los datos cargados para esta sección
      if (sectionLoaded[sectionToLoad]) {
        console.log(`[✅ AdminPanel] La sección ${sectionToLoad} ya está cargada, usando datos existentes`);
        // Asegurar que el estado de carga se actualice correctamente
        if (tabLoading && isComponentMounted.current) {
          setTabLoading(false);
        }
        return;
      }
      
      // Solo iniciar carga si no estamos ya cargando
      if (!tabLoading) {
        try {
          // Establecer estado de carga
          if (isComponentMounted.current) {
            console.log(`[🔄 AdminPanel] Cargando datos para sección: ${sectionToLoad}`);
            setTabLoading(true);
          }
          
          // Cargar datos
          await loadConfigSection(sectionToLoad);
          
          if (isComponentMounted.current) {
            console.log(`[✅ AdminPanel] Carga completada para sección: ${sectionToLoad}`);
          }
        } catch (error) {
          console.error(`[❌ AdminPanel] Error al cargar datos para la pestaña ${activeTab}:`, error);
          // No agregar ningún valor por defecto, solo manejar el error
        } finally {
          // Solo actualizar estado si el componente sigue montado
          if (isComponentMounted.current) {
            setTabLoading(false);
          }
        }
      } else {
        console.log(`[⏳ AdminPanel] Ya hay una carga en progreso para pestaña: ${activeTab}`);
      }
    };
    
    // Usar debounce para evitar múltiples cargas cuando se cambia rápidamente de pestaña
    const timerId = setTimeout(loadTabData, DEBOUNCE_TIME);
    
    // Limpieza
    return () => {
      clearTimeout(timerId);
      isComponentMounted.current = false;
    };
    
    // Mantener solo estas dependencias para evitar bucles
    // El estado tabLoading y sectionLoaded se manejan dentro del efecto
  }, [activeTab, user, loadConfigSection]);

  // Añadir oyente para cambio de pestaña desde componentes hijos
  useEffect(() => {
    const handleSetActiveTab = (event: CustomEvent) => {
      if (event.detail && typeof event.detail === 'string') {
        setActiveTab(event.detail);
        setShowMobileMenu(false); // Cerrar menú móvil al cambiar de tab
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
  const handleSaveChanges = async () => {
    try {
      console.log('Guardando configuración con valores:', editableConfig);
      // Mostrar estado de guardado
      setSaveSuccess(false);
      setIsLoading(true);
      
      // Si hay cambios en la apariencia, guardar primero esa sección
      if (activeTab === 'appearance') {
        // Asegurar que todos los colores tengan valores, no espacios en blanco
        const primaryColor = editableConfig.theme?.primaryColor?.trim() || '#003b29';
        const accentColor = editableConfig.theme?.accentColor?.trim() || '#4caf50';
        const textColor = editableConfig.theme?.textColor?.trim() || '#333333';
        const backgroundColor = editableConfig.theme?.backgroundColor?.trim() || '#ffffff';
        const cartButtonColor = editableConfig.theme?.cartButtonColor?.trim() || '#003b29';
        const floatingCartButtonColor = editableConfig.theme?.floatingCartButtonColor?.trim() || '#003b29';
        
        // Crear objeto con los valores seguros
        const themeData = {
          primaryColor,
          accentColor,
          textColor,
          backgroundColor,
          cartButtonColor,
          floatingCartButtonColor
        };
        
        console.log('AdminPanel - Guardando datos de apariencia:', themeData);
        
        // Guardar solo la configuración de apariencia si estamos en esa pestaña
        const saveResult = await saveAppearanceOnly(themeData);
        
        if (saveResult) {
          console.log('AdminPanel - Datos de apariencia guardados exitosamente');
        } else {
          console.error('AdminPanel - Error al guardar datos de apariencia');
          alert('Ha ocurrido un error al guardar los colores. Por favor, intenta de nuevo.');
          setIsLoading(false);
          return;
        }
        
        console.log('AdminPanel - Resultado del guardado de apariencia:', saveResult);
      } else if (activeTab === 'general') {
        // Guardar solo la configuración del sitio si estamos en esa pestaña
        await saveSiteConfigOnly({
          restaurantName: editableConfig.restaurantName || '',
          whatsappNumber: editableConfig.whatsappNumber || '',
          currency: editableConfig.currency || '',
          openingHours: editableConfig.openingHours || '',
          footerText: editableConfig.footerText || ''
        });
      } else if (activeTab === 'menu' || activeTab === 'categories') {
        // Guardar solo el menú si estamos en esas pestañas
        await saveMenuOnly(editableConfig.categories);
      } else {
        // Guardar toda la configuración para otros casos
        await saveConfig(editableConfig);
      }
      
      // Recargar los datos para mostrar los cambios actualizados
      await loadConfigSection(activeTab === 'menu' || activeTab === 'categories' ? 'menu' : 
                             activeTab === 'appearance' ? 'appearance' : 'site');
      
      // Notificar al usuario
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setHasChanges(false);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Ha ocurrido un error al guardar la configuración. Por favor, intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mover categoría arriba o abajo
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === editableConfig.categories.length - 1)
    ) {
      return;
    }

    const newCategories = [...editableConfig.categories];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newCategories[index], newCategories[swapIndex]] = [newCategories[swapIndex], newCategories[index]];
    
    updateConfigSection('categories', newCategories);
  };

  // Si está cargando, mostrar indicador (pero sólo por un tiempo razonable)
  if ((loading || roleLoading) && !configLoadAttempted) {
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

  // Si no hay usuario logueado, mostrar página de login
  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: editableConfig.theme?.primaryColor || '#003b29' }}>
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
                style={{ backgroundColor: editableConfig.theme?.primaryColor || '#003b29' }}
              >
                Iniciar Sesión
              </button>
              
              <div className="flex flex-col sm:flex-row justify-between mt-2 gap-2">
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
                  {showResendForm ? 'Ocultar opciones' : '¿No recibiste el correo?'}
                </button>
              </div>
            </form>
          </div>
          
          {showResendForm && (
            <ResendConfirmation themeColor={editableConfig.theme?.primaryColor || '#003b29'} />
          )}
        </div>
      </div>
    );
  }

  // Panel principal de administración
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
          <h1 className="text-base sm:text-xl font-bold truncate" style={{ color: editableConfig.theme?.primaryColor || '#003b29' }}>
            {configLoading ? 'Cargando...' : editableConfig.restaurantName}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSaveChanges}
              className="flex items-center gap-1 py-2 px-3 sm:px-4 text-white font-medium rounded text-sm"
              style={{ backgroundColor: editableConfig.theme?.primaryColor || '#003b29' }}
              disabled={configLoading || tabLoading}
            >
              <Save size={16} /> <span className="hidden sm:inline">Guardar</span>
            </button>
          )}
          
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden sm:inline text-sm text-gray-600 truncate max-w-[150px]">
              {user.email}
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
                    <button
                      onClick={() => { setActiveTab('menu'); setShowMobileMenu(false); }}
                      className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'menu' ? 'bg-gray-100' : ''}`}
                      style={{ color: activeTab === 'menu' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
                    >
                      <Grid size={18} className="mr-3" /> Menú
                    </button>
                    <button
                      onClick={() => { setActiveTab('categories'); setShowMobileMenu(false); }}
                      className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'categories' ? 'bg-gray-100' : ''}`}
                      style={{ color: activeTab === 'categories' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
                    >
                      <Grid size={18} className="mr-3" /> Categorías
                    </button>
                  </div>
                </div>
                
                {userRole === 'admin' && (
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-medium px-3 mb-1">Administración</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => { setActiveTab('general'); setShowMobileMenu(false); }}
                        className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'general' ? 'bg-gray-100' : ''}`}
                        style={{ color: activeTab === 'general' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
                      >
                        <Settings size={18} className="mr-3" /> Configuración General
                      </button>
                      <button
                        onClick={() => { setActiveTab('appearance'); setShowMobileMenu(false); }}
                        className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'appearance' ? 'bg-gray-100' : ''}`}
                        style={{ color: activeTab === 'appearance' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
                      >
                        <Settings size={18} className="mr-3" /> Apariencia
                      </button>
                      <button
                        onClick={() => { setActiveTab('users'); setShowMobileMenu(false); }}
                        className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'users' ? 'bg-gray-100' : ''}`}
                        style={{ color: activeTab === 'users' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
                      >
                        <Settings size={18} className="mr-3" /> Usuarios
                      </button>
                      <button
                        onClick={() => { setActiveTab('system'); setShowMobileMenu(false); }}
                        className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'system' ? 'bg-gray-100' : ''}`}
                        style={{ color: activeTab === 'system' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
                      >
                        <Settings size={18} className="mr-3" /> Sistema
                      </button>
                      <button
                        onClick={() => { setActiveTab('import-export'); setShowMobileMenu(false); }}
                        className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'import-export' ? 'bg-gray-100' : ''}`}
                        style={{ color: activeTab === 'import-export' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
                      >
                        <Upload size={18} className="mr-3" /> Importar/Exportar
                      </button>
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
              <button
                onClick={() => setActiveTab('menu')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'menu'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ borderColor: activeTab === 'menu' ? editableConfig.theme?.primaryColor || '#003b29' : 'transparent',
                       color: activeTab === 'menu' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
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
                style={{ borderColor: activeTab === 'categories' ? editableConfig.theme?.primaryColor || '#003b29' : 'transparent',
                       color: activeTab === 'categories' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
              >
                Categorías
              </button>
              
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
                    style={{ borderColor: activeTab === 'general' ? editableConfig.theme?.primaryColor || '#003b29' : 'transparent',
                           color: activeTab === 'general' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
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
                    style={{ borderColor: activeTab === 'appearance' ? editableConfig.theme?.primaryColor || '#003b29' : 'transparent',
                           color: activeTab === 'appearance' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
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
                    style={{ borderColor: activeTab === 'users' ? editableConfig.theme?.primaryColor || '#003b29' : 'transparent',
                           color: activeTab === 'users' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
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
                    style={{ borderColor: activeTab === 'system' ? editableConfig.theme?.primaryColor || '#003b29' : 'transparent',
                           color: activeTab === 'system' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
                  >
                    Sistema
                  </button>
                  <button
                    onClick={() => setActiveTab('import-export')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'import-export'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    style={{ borderColor: activeTab === 'import-export' ? editableConfig.theme?.primaryColor || '#003b29' : 'transparent',
                           color: activeTab === 'import-export' ? editableConfig.theme?.primaryColor || '#003b29' : '' }}
                  >
                    Importar/Exportar
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Título móvil de la sección actual */}
          <div className="sm:hidden mb-3">
            <h2 className="text-lg font-semibold" style={{ color: editableConfig.theme?.primaryColor || '#003b29' }}>
              {activeTab === 'menu' && "Menú"}
              {activeTab === 'categories' && "Categorías"}
              {activeTab === 'general' && "Configuración General"}
              {activeTab === 'appearance' && "Apariencia"}
              {activeTab === 'users' && "Usuarios"}
              {activeTab === 'system' && "Sistema"}
              {activeTab === 'import-export' && "Importar/Exportar"}
            </h2>
          </div>

          {/* Contenido de los tabs - Lazy loading */}
          <div className="bg-white rounded-lg shadow p-3 sm:p-6">
            {/* Indicador de carga específico para la pestaña */}
            {tabLoading ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div 
                  className="w-10 h-10 border-4 border-t-primary rounded-full animate-spin mb-4" 
                  style={{ borderTopColor: editableConfig.theme?.primaryColor || '#003b29' }}
                ></div>
                <p className="text-gray-600">Cargando datos...</p>
              </div>
            ) : (
              <Suspense fallback={<LoadingFallback message={`Cargando ${activeTab}...`} />}>
                {activeTab === 'general' && userRole === 'admin' && (
                  <GeneralSettings 
                    config={editableConfig} 
                    onChange={(newGeneralSettings) => {
                      // Preservar las propiedades que no maneja el GeneralSettings
                      const updatedConfig = {
                        ...editableConfig,
                        ...newGeneralSettings,
                        // Preservar explícitamente theme y categories
                        theme: editableConfig.theme || fallbackConfig.theme,
                        categories: editableConfig.categories || fallbackConfig.categories
                      };
                      handleConfigChange(updatedConfig);
                    }}
                  />
                )}

                {activeTab === 'appearance' && userRole === 'admin' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex justify-between items-center mb-6 pb-2 border-b">
                        <h2 className="text-xl font-semibold">Colores y Apariencia</h2>
                        <button 
                          onClick={async () => {
                            try {
                              setTabLoading(true);
                              await loadConfigSection('appearance');
                              alert('Colores actualizados desde la base de datos');
                            } catch (error) {
                              console.error('Error al recargar colores:', error);
                              alert('Error al cargar colores');
                            } finally {
                              setTabLoading(false);
                            }
                          }}
                          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded flex items-center"
                          disabled={tabLoading || configLoading}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          {tabLoading ? 'Cargando...' : 'Actualizar colores'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ModernColorPicker
                          label="Color Primario"
                          value={editableConfig.theme?.primaryColor || '#003b29'}
                          onChange={(color) => {
                            const newTheme = {
                              ...(editableConfig.theme || {}),
                              primaryColor: color
                            };
                            updateConfigSection('theme', newTheme);
                          }}
                        />
                        
                        <ModernColorPicker
                          label="Color de Acento"
                          value={editableConfig.theme?.accentColor || '#4caf50'}
                          onChange={(color) => {
                            const newTheme = {
                              ...(editableConfig.theme || {}),
                              accentColor: color
                            };
                            updateConfigSection('theme', newTheme);
                          }}
                        />
                        
                        <ModernColorPicker
                          label="Color de Texto"
                          value={editableConfig.theme?.textColor || '#333333'}
                          onChange={(color) => {
                            const newTheme = {
                              ...(editableConfig.theme || {}),
                              textColor: color
                            };
                            updateConfigSection('theme', newTheme);
                          }}
                        />
                        
                        <ModernColorPicker
                          label="Color de Fondo"
                          value={editableConfig.theme?.backgroundColor || '#ffffff'}
                          onChange={(color) => {
                            const newTheme = {
                              ...(editableConfig.theme || {}),
                              backgroundColor: color
                            };
                            updateConfigSection('theme', newTheme);
                          }}
                        />
                        
                        <ModernColorPicker
                          label="Color Botón Carrito"
                          value={editableConfig.theme?.cartButtonColor || '#003b29'}
                          onChange={(color) => {
                            const newTheme = {
                              ...(editableConfig.theme || {}),
                              cartButtonColor: color
                            };
                            updateConfigSection('theme', newTheme);
                          }}
                        />
                        
                        <ModernColorPicker
                          label="Color Botón Flotante"
                          value={editableConfig.theme?.floatingCartButtonColor || '#003b29'}
                          onChange={(color) => {
                            const newTheme = {
                              ...(editableConfig.theme || {}),
                              floatingCartButtonColor: color
                            };
                            updateConfigSection('theme', newTheme);
                          }}
                        />
                      </div>

                      <div className="mt-8 pt-5 border-t">
                        <h3 className="text-lg font-medium mb-4">Vista Previa</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded" style={{backgroundColor: editableConfig.theme?.backgroundColor || '#ffffff'}}>
                            <h4 className="font-medium" style={{color: editableConfig.theme?.primaryColor || '#003b29'}}>Título Principal</h4>
                            <p style={{color: editableConfig.theme?.textColor || '#333333'}}>Este es un texto de ejemplo para ver cómo se verán los colores en tu sitio.</p>
                            <button className="mt-2 px-4 py-2 rounded text-white" style={{backgroundColor: editableConfig.theme?.cartButtonColor || '#003b29'}}>
                              Botón de Carrito
                            </button>
                          </div>
                          
                          <div className="p-4 rounded border" style={{backgroundColor: editableConfig.theme?.backgroundColor || '#ffffff'}}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium" style={{color: editableConfig.theme?.primaryColor || '#003b29'}}>Elemento del Menú</span>
                              <span className="text-sm font-bold" style={{color: editableConfig.theme?.accentColor || '#4caf50'}}>$10.99</span>
                            </div>
                            <p className="text-sm" style={{color: editableConfig.theme?.textColor || '#333333'}}>Descripción del elemento del menú con todos los detalles.</p>
                            <div className="flex justify-end mt-2">
                              <button className="px-2 py-1 rounded-full text-xs text-white" style={{backgroundColor: editableConfig.theme?.floatingCartButtonColor || '#003b29'}}>
                                Agregar al Carrito
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
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
                    themeColor={editableConfig.theme?.primaryColor || '#003b29'}
                  />
                )}
                
                {activeTab === 'system' && userRole === 'admin' && (
                  <SystemStatus
                    themeColor={editableConfig.theme?.primaryColor || '#003b29'}
                  />
                )}

                {activeTab === 'import-export' && userRole === 'admin' && (
                  <ImportExportData
                    themeColor={editableConfig.theme?.primaryColor || '#003b29'}
                  />
                )}
              </Suspense>
            )}
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
            style={{ color: editableConfig.theme?.primaryColor || '#003b29' }}
          >
            Eduardo Soto
          </a>
        </div>
      </footer>
    </div>
  );
};

export default AdminPanel; 