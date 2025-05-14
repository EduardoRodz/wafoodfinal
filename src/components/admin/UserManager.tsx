import React, { useState, useEffect } from 'react';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  User, 
  CreateUserData, 
  UpdateUserData 
} from '../../services/userService';
import { Plus, Edit, Trash2, X, Check } from 'lucide-react';

interface UserManagerProps {
  currentUserEmail: string;
  themeColor: string;
}

const UserManager: React.FC<UserManagerProps> = ({ currentUserEmail, themeColor }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | JSX.Element | null>(null);
  
  // Estado para formulario de creación/edición
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CreateUserData | UpdateUserData>({
    email: '',
    password: '',
    role: 'staff',
    id: ''
  });
  
  // Estado para confirmación de eliminación
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Estado para mostrar mensaje de éxito
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Cargar usuarios
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const userList = await getUsers();
      setUsers(userList);
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadUsers();
  }, []);
  
  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Abrir formulario para editar
  const handleEditUser = (user: User) => {
    setFormData({
      id: user.id,
      email: user.email,
      password: '',
      role: user.role
    });
    setIsEditing(true);
    setShowForm(true);
  };
  
  // Abrir formulario para crear
  const handleAddUser = () => {
    setFormData({
      email: '',
      password: '',
      role: 'staff',
      id: ''
    });
    setIsEditing(false);
    setShowForm(true);
  };
  
  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isEditing) {
        // Actualizar usuario
        const updateData = formData as UpdateUserData;
        if (!updateData.password) delete updateData.password; // No enviar si está vacío
        
        const { success, error } = await updateUser(updateData);
        if (!success && error) {
          throw error;
        }
      } else {
        // Crear usuario
        console.log("Intentando crear usuario desde UserManager...");
        const { user, error } = await createUser(formData as CreateUserData);
        
        if (!user && error) {
          // Formatear mensaje de error
          let errorMessage = error.message || 'Error al crear usuario';
          
          // Detectar error específico de API key inválida
          if (errorMessage.includes('Invalid API key') || 
              errorMessage.includes('service_role') || 
              errorMessage.includes('Error de autenticación')) {
            setError(
              <div>
                <p className="font-semibold mb-2">Error de autenticación con Supabase:</p>
                <p className="mb-2">{errorMessage}</p>
                <p className="text-sm">
                  Parece que hay un problema con la clave de servicio (service_role).
                  <br />
                  Consulta la{" "}
                  <button 
                    type="button"
                    onClick={() => {
                      // Intentar acceder a la función setActiveTab del padre
                      const event = new CustomEvent('setActiveTab', { detail: 'system' });
                      window.dispatchEvent(event);
                      setShowForm(false);
                    }}
                    className="text-blue-600 underline font-medium"
                  >
                    pestaña de Sistema
                  </button> para más información.
                </p>
              </div>
            );
            return;
          }
          
          throw new Error(errorMessage);
        } else if (user) {
          // Mostrar un mensaje de éxito más informativo
          setSaveSuccess(true);
          // Verificar si el usuario fue creado con método alternativo (requiere confirmación)
          // El ID de usuario es un UUID válido pero el usuario podría necesitar confirmar su correo
          setTimeout(() => {
            setSaveSuccess(false);
          }, 5000);
        }
      }
      
      // Recargar lista de usuarios
      await loadUsers();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error en formulario de usuario:', err);
      setError(err.message || 'Error al procesar el usuario');
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar confirmación de eliminación
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await deleteUser(userToDelete.id);
      if (!success && error) {
        throw error;
      }
      
      // Recargar lista de usuarios
      await loadUsers();
      setUserToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario');
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizar formulario
  const renderForm = () => (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {isEditing ? 'Editar Usuario' : 'Añadir Usuario'}
          </h3>
          <button 
            onClick={() => setShowForm(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                {isEditing ? 'Nueva Contraseña (dejar en blanco para mantener la actual)' : 'Contraseña'}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                required={!isEditing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Rol</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="admin">Administrador</option>
                <option value="staff">Personal</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Administrador: Acceso completo. Personal: Solo menú y categorías.
              </p>
            </div>
            
            {!isEditing && (
              <div className="p-2 bg-yellow-50 text-yellow-700 rounded text-sm">
                <p>Nota: Es posible que el usuario necesite confirmar su correo electrónico antes de poder iniciar sesión.</p>
                <p>Si el correo de confirmación no llega, revise la carpeta de spam o intente nuevamente.</p>
              </div>
            )}
            
            {error && (
              <div className="p-2 bg-red-100 text-red-700 rounded text-sm">
                {error}
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white rounded"
                style={{ backgroundColor: themeColor }}
                disabled={loading}
              >
                {loading ? 'Procesando...' : isEditing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
  
  // Renderizar confirmación de eliminación
  const renderDeleteConfirmation = () => (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-red-600">Eliminar Usuario</h3>
          <button 
            onClick={() => setUserToDelete(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="mb-4">
          ¿Estás seguro de que deseas eliminar al usuario <strong>{userToDelete?.email}</strong>?
          Esta acción no se puede deshacer.
        </p>
        
        {error && (
          <div className="p-2 mb-4 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setUserToDelete(null)}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmDelete}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            disabled={loading}
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Gestión de Usuarios</h2>
        <button
          onClick={handleAddUser}
          className="flex items-center gap-1 py-2 px-4 text-white rounded"
          style={{ backgroundColor: themeColor }}
        >
          <Plus size={16} /> Añadir Usuario
        </button>
      </div>
      
      {error && !showForm && !userToDelete && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {loading && !showForm && !userToDelete ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 border-4 border-t-primary rounded-full animate-spin mx-auto mb-4" 
               style={{ borderTopColor: themeColor }}></div>
          <p className="text-gray-500">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Correo Electrónico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Creación
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {user.email}
                      </div>
                      {user.email === currentUserEmail && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Tú
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' ? 'Administrador' : 'Personal'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar usuario"
                      >
                        <Edit size={18} />
                      </button>
                      {user.email !== currentUserEmail && (
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {showForm && renderForm()}
      {userToDelete && renderDeleteConfirmation()}
    </div>
  );
};

export default UserManager; 