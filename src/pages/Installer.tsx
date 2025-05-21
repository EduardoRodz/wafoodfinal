import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Importar componentes UI
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Separator } from "../components/ui/separator";

// Importar iconos
import { Database, Server, User, Check, AlertCircle, Copy, ArrowLeft, ArrowRight, Loader2, LucideRocket, Settings, ArrowUpRight } from 'lucide-react';

// Importar configuración y utilidades
import { Category, MenuItem, defaultConfig, saveConfig } from '../config';
import InstallerGuide from '../components/InstallerGuide';
import { markInstallationComplete as markInstallationCompleteFromConfig } from '../services/configService';
import { 
  saveRestaurantConfig, 
  saveSupabaseCredentials, 
  markInstallationComplete as markInstallationCompleteFromUtils, 
  executeSQL, 
  createTablesIndividually,
  createExecSqlFunction,
  checkExecSqlFunction,
  checkRequiredTables,
  checkAndCreateStorageBucket
} from '../utils/installation';

// Esquema de validación para la sección de restaurante
const restaurantFormSchema = z.object({
  restaurantName: z.string().min(1, "El nombre del restaurante es obligatorio"),
  whatsappNumber: z.string().min(8, "Ingrese un número de WhatsApp válido"),
  currency: z.string().min(1, "La moneda es obligatoria"),
  openingHours: z.string().min(1, "El horario de apertura es obligatorio"),
});

// Esquema de validación para la sección de Supabase
const supabaseFormSchema = z.object({
  supabaseUrl: z.string().url("Ingrese una URL válida"),
  supabaseAnonKey: z.string().min(20, "La clave anónima debe tener al menos 20 caracteres"),
  supabaseServiceKey: z.string().min(20, "La clave de servicio debe tener al menos 20 caracteres"),
});

// Esquema de validación para el administrador
const adminFormSchema = z.object({
  email: z.string().email("Ingrese un correo electrónico válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// Esquema para la categoría
const categoryFormSchema = z.object({
  name: z.string().min(1, "El nombre de la categoría es obligatorio"),
  icon: z.string().min(1, "El icono es obligatorio"),
});

// Esquema para el elemento del menú
const menuItemFormSchema = z.object({
  name: z.string().min(1, "El nombre del producto es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  price: z.coerce.number().min(1, "El precio debe ser mayor que 0"),
  image: z.string().url("La URL de la imagen debe ser válida"),
});

// Función para renderizar HTML de manera segura
const RenderHTML: React.FC<{ html: string }> = ({ html }) => {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

const Installer: React.FC = () => {
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [showSqlScript, setShowSqlScript] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('supabase');
  const [installationComplete, setInstallationComplete] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "platos-principales",
      name: "Platos Principales",
      icon: "🍽️",
      items: [
        {
          id: "plato-principal-1",
          name: "Plato Principal 1",
          description: "Descripción del plato principal",
          price: 150,
          image: "https://placehold.co/300",
        }
      ]
    },
    {
      id: "bebidas",
      name: "Bebidas",
      icon: "🥤",
      items: [
        {
          id: "bebida-1",
          name: "Bebida 1",
          description: "Descripción de la bebida",
          price: 50,
          image: "https://placehold.co/300",
        }
      ]
    },
    {
      id: "postres",
      name: "Postres",
      icon: "🍰",
      items: [
        {
          id: "postre-1",
          name: "Postre 1",
          description: "Descripción del postre",
          price: 80,
          image: "https://placehold.co/300",
        }
      ]
    },
    {
      id: "entradas",
      name: "Entradas",
      icon: "🥗",
      items: [
        {
          id: "entrada-1",
          name: "Entrada 1",
          description: "Descripción de la entrada",
          price: 60,
          image: "https://placehold.co/300",
        }
      ]
    }
  ]);

  // Formulario de restaurante
  const restaurantForm = useForm({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      restaurantName: "",
      whatsappNumber: "",
      currency: "",
      openingHours: "",
    },
  });

  // Formulario de Supabase
  const supabaseForm = useForm({
    resolver: zodResolver(supabaseFormSchema),
    defaultValues: {
      supabaseUrl: "",
      supabaseAnonKey: "",
      supabaseServiceKey: "",
    },
  });

  // Formulario de administrador
  const adminForm = useForm({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Comprobar si el instalador ya se ha ejecutado
  useEffect(() => {
    const installerRun = localStorage.getItem('installerCompleted');
    if (installerRun) {
      navigate('/');
    }
  }, [navigate]);

  // Función para probar la conexión de Supabase
  const testSupabaseConnection = async () => {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = supabaseForm.getValues();
    
    setTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');
    
    try {
      // Crear un cliente de Supabase temporal para la prueba
      const tempClient = createClient(supabaseUrl, supabaseAnonKey);
      
      // Intentamos diferentes métodos para verificar la conexión
      let isConnected = false;
      let errorDetails = "";
      
      // 1. Intentar obtener la hora del servidor (método más confiable)
      try {
        const { data: serverTime } = await tempClient.rpc('now');
        if (serverTime) {
          console.log("Conexión verificada con función now():", serverTime);
          isConnected = true;
        }
      } catch (e) {
        console.log("La función now() no está disponible, probando otro método...");
        // Intentar ejecutar la función now() desde el script SQL actualizado
        try {
          const adminClient = createClient(supabaseUrl, supabaseServiceKey);
          const { error: fnError } = await adminClient.rpc('exec_sql', { 
            sql: `
              CREATE OR REPLACE FUNCTION now()
              RETURNS TIMESTAMPTZ AS $$
              BEGIN
                RETURN CURRENT_TIMESTAMP;
              END;
              $$ LANGUAGE plpgsql;
            `
          });
          
          if (!fnError) {
            console.log("Función now() creada correctamente");
            // Intentar nuevamente verificar la conexión
            const { data: retryTime } = await tempClient.rpc('now');
            if (retryTime) {
              console.log("Conexión verificada después de crear función now():", retryTime);
              isConnected = true;
            }
          }
        } catch (createError) {
          console.log("No se pudo crear la función now():", createError);
        }
      }
      
      // 2. Si el método anterior falló, intentar con auth.getSession
      if (!isConnected) {
        try {
          const { data } = await tempClient.auth.getSession();
          console.log("Conexión verificada con auth.getSession");
          isConnected = true;
        } catch (e: any) {
          errorDetails += `Error con auth.getSession: ${e.message}. `;
        }
      }
      
      // 3. Si todos los métodos anteriores fallaron, intentar configurar manualmente
      if (!isConnected) {
        setConnectionStatus('error');
        setConnectionMessage(`No se pudo verificar la conexión con Supabase. ${errorDetails}
          
          Posibles soluciones:
          
          1. Verifique que la URL y las claves API sean correctas.
          2. Asegúrese de haber ejecutado el script SQL en su base de datos Supabase.
          3. Compruebe que su proyecto Supabase esté activo y funcionando.
          4. Si está en modo desarrollo local, verifique que no hay problemas de CORS.
          
          Puede probar ejecutando esta función personalizada en el SQL Editor de Supabase:
          
          CREATE OR REPLACE FUNCTION now() RETURNS TIMESTAMPTZ AS $$
            BEGIN RETURN CURRENT_TIMESTAMP; END;
          $$ LANGUAGE plpgsql;`);
        setTestingConnection(false);
        return;
      }
      
      // Intentar verificar la clave de servicio
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        // La manera más segura de probar un rol de servicio es intentar listar usuarios
        const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
        
        if (error) {
          throw new Error(`Error con clave de servicio: ${error.message}`);
        }
        
                  // Verificar si existen las tablas necesarias o si necesitamos crearlas
          console.log("Verificando las tablas necesarias...");
          
          // Definir las tablas requeridas según el nuevo esquema
          const requiredTables = [
            'profiles', 
            'site_config', 
            'appearance_config', 
            'categories', 
            'menu_items', 
            'orders'
          ];

          // Usar la nueva función para verificar tablas
          const { allTablesExist, missingTables, error: tablesError } = await checkRequiredTables(adminClient, requiredTables);

          if (tablesError) {
            console.error("Error al verificar tablas:", tablesError);
            setConnectionStatus('error');
            setConnectionMessage(`Error al verificar las tablas de la base de datos: ${tablesError.message || 'Error desconocido'}`);
            setTestingConnection(false);
            return;
          }
        
                  if (!allTablesExist) {
            console.log("Faltan tablas necesarias:", missingTables);
            
            // Intentar crear la función exec_sql si no existe
            const { exists: execSqlExists } = await checkExecSqlFunction(supabaseUrl, supabaseServiceKey);
            
            if (!execSqlExists) {
              console.log("La función exec_sql no existe. Intentando crearla...");
              const { success: execSqlCreated, error: execSqlError } = await createExecSqlFunction(supabaseUrl, supabaseServiceKey);
              
              if (!execSqlCreated) {
                console.error("No se pudo crear la función exec_sql:", execSqlError);
              }
            }
            
            // Intentar ejecutar el script SQL directamente
            console.log("Intentando crear las tablas faltantes automáticamente...");
            
            try {
              // Usar el script SQL actualizado
              const sqlScript = `-- Schema para la inicialización de la base de datos en Supabase

-- Configurar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear función auxiliar para verificación de conexión
CREATE OR REPLACE FUNCTION now()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Configuración de seguridad de RLS (Row Level Security)
-- Nota: No es necesario configurar RLS para auth.users, ya está gestionada por Supabase

-- Tabla para perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permitir acceso a la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes antes de crearlas de nuevo
DROP POLICY IF EXISTS "Perfiles visibles para todos los usuarios autenticados" ON profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Los administradores pueden hacer todo con los perfiles" ON profiles;

-- Políticas de RLS para perfiles
-- Los usuarios pueden leer todos los perfiles
CREATE POLICY "Perfiles visibles para todos los usuarios autenticados" 
  ON profiles FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Los usuarios solo pueden actualizar su propio perfil
CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Los administradores pueden hacer todo
CREATE POLICY "Los administradores pueden hacer todo con los perfiles" 
  ON profiles FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'role', 'customer'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ===============================
-- Tabla para configuración general del restaurante
-- ===============================
CREATE TABLE IF NOT EXISTS site_config (
  id SERIAL PRIMARY KEY,
  restaurant_name TEXT NOT NULL DEFAULT 'WHATSFOOD',
  whatsapp_number TEXT NOT NULL DEFAULT '18091234567',
  currency TEXT NOT NULL DEFAULT 'RD$',
  opening_hours TEXT NOT NULL DEFAULT '8:00 AM - 10:00 PM',
  installation_status TEXT NOT NULL DEFAULT 'pending',
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla site_config
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Cualquier usuario puede leer la configuración" ON site_config;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar la configuración" ON site_config;

-- Políticas para site_config
-- Cualquier usuario puede leer la configuración
CREATE POLICY "Cualquier usuario puede leer la configuración" 
  ON site_config FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden actualizar la configuración
CREATE POLICY "Solo administradores pueden actualizar la configuración" 
  ON site_config FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ===============================
-- Tabla para configuración de apariencia
-- ===============================
CREATE TABLE IF NOT EXISTS appearance_config (
  id SERIAL PRIMARY KEY,
  primary_color TEXT NOT NULL DEFAULT '#004d2a',
  accent_color TEXT NOT NULL DEFAULT '#00873e',
  text_color TEXT NOT NULL DEFAULT '#333333',
  background_color TEXT NOT NULL DEFAULT '#FFFFFF',
  cart_button_color TEXT NOT NULL DEFAULT '#003b29',
  floating_cart_button_color TEXT NOT NULL DEFAULT '#003b29',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla appearance_config
ALTER TABLE appearance_config ENABLE ROW LEVEL SECURITY;

-- Políticas para appearance_config
-- Cualquier usuario puede leer la configuración de apariencia
CREATE POLICY "Cualquier usuario puede leer la configuración de apariencia" 
  ON appearance_config FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden actualizar la configuración de apariencia
CREATE POLICY "Solo administradores pueden actualizar la apariencia" 
  ON appearance_config FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ===============================
-- Tabla para categorías de menú
-- ===============================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  category_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🍽️',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Políticas para categories
-- Cualquier usuario puede ver las categorías
CREATE POLICY "Cualquier usuario puede ver las categorías" 
  ON categories FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden modificar las categorías
CREATE POLICY "Solo administradores pueden modificar las categorías" 
  ON categories FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ===============================
-- Tabla para ítems del menú
-- ===============================
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  item_id TEXT UNIQUE NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT NOT NULL DEFAULT 'https://placehold.co/300x200/jpeg',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Políticas para menu_items
-- Cualquier usuario puede ver los ítems del menú
CREATE POLICY "Cualquier usuario puede ver los platos" 
  ON menu_items FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden modificar los ítems del menú
CREATE POLICY "Solo administradores pueden modificar los platos" 
  ON menu_items FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ===============================
-- Tabla para órdenes
-- ===============================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para órdenes
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias órdenes" ON orders;
DROP POLICY IF EXISTS "Los administradores pueden hacer todo con las órdenes" ON orders;
DROP POLICY IF EXISTS "Los usuarios anónimos pueden crear órdenes" ON orders;

-- Políticas para órdenes
-- Los usuarios pueden ver sus propias órdenes
CREATE POLICY "Los usuarios pueden ver sus propias órdenes" 
  ON orders FOR SELECT 
  USING (auth.uid() = user_id);

-- Los administradores pueden hacer todo con las órdenes
CREATE POLICY "Los administradores pueden hacer todo con las órdenes" 
  ON orders FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Los usuarios anónimos pueden crear órdenes (para pedidos sin registro)
CREATE POLICY "Los usuarios anónimos pueden crear órdenes" 
  ON orders FOR INSERT 
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- ===============================
-- Función para actualizar timestamps
-- ===============================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualizar los timestamps
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS set_site_config_updated_at ON site_config;
DROP TRIGGER IF EXISTS set_appearance_config_updated_at ON appearance_config;
DROP TRIGGER IF EXISTS set_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS set_menu_items_updated_at ON menu_items;
DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_site_config_updated_at
  BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_appearance_config_updated_at
  BEFORE UPDATE ON appearance_config
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ===============================
-- Insertar datos por defecto
-- ===============================
-- Configuración general del restaurante
INSERT INTO site_config (restaurant_name, whatsapp_number, currency, opening_hours, installation_status)
VALUES ('WHATSFOOD', '18091234567', 'RD$', '8:00 AM - 10:00 PM', 'pending')
ON CONFLICT DO NOTHING;

-- Configuración de apariencia
INSERT INTO appearance_config (primary_color, accent_color, text_color, background_color, cart_button_color, floating_cart_button_color)
VALUES ('#004d2a', '#00873e', '#333333', '#FFFFFF', '#003b29', '#003b29')
ON CONFLICT DO NOTHING;

-- Categorías de ejemplo
INSERT INTO categories (category_id, name, icon, display_order)
VALUES 
  ('bebidas', 'Bebidas', '🥤', 1),
  ('plato-principal', 'Plato Principal', '🍽️', 2),
  ('ensaladas', 'Ensaladas', '🥗', 3),
  ('postres', 'Postres', '🍰', 4)
ON CONFLICT (category_id) DO NOTHING;

-- Platos de ejemplo
INSERT INTO menu_items (item_id, category_id, name, description, price, image, display_order)
VALUES 
  ('cafe-cappuccino', 'bebidas', 'Cappuccino', 'Rico espresso con espumosa leche', 120, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1),
  ('sandwich-vegetariano', 'plato-principal', 'Sándwich Vegetariano', 'Vegetales a la parrilla con queso', 90, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1),
  ('ensalada-griega', 'ensaladas', 'Ensalada Griega', 'Vegetales frescos con queso feta', 160, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1),
  ('brownie-chocolate', 'postres', 'Brownie de Chocolate', 'Caliente brownie de chocolate', 120, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1)
ON CONFLICT (item_id) DO NOTHING;

-- Función para ejecutar SQL dinámico
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;
              
              if (sqlScript) {
                // Ejecutar el script SQL
                const { success: tablesCreated, error: createError } = await executeSQL(
                  supabaseUrl, 
                  supabaseServiceKey, 
                  sqlScript
                );
                
                if (tablesCreated) {
                  console.log("Tablas creadas correctamente, verificando de nuevo...");
                  
                  // Verificar nuevamente si las tablas se crearon
                  const { allTablesExist: tablesExistNow } = await checkRequiredTables(adminClient, requiredTables);
                  
                  if (tablesExistNow) {
                    console.log("Todas las tablas han sido creadas correctamente");
                    
                    // Verificar el bucket para imágenes de menú - solo verificación
                    console.log("Verificando bucket para imágenes de menú...");
                    const { exists: bucketExists } = await checkAndCreateStorageBucket(adminClient, 'menu-images');
                    
                    // Preparar mensaje incluyendo información sobre el bucket
                    let connectionMsg = `Conexión exitosa con Supabase. Las tablas necesarias han sido creadas automáticamente.`;
                    
                    if (!bucketExists) {
                      connectionMsg += ` Recuerde crear manualmente el bucket 'menu-images' desde el panel de Supabase para poder subir imágenes de productos.`;
                    }
                    
                    setConnectionStatus('success');
                    setConnectionMessage(connectionMsg);
                    setSupabaseClient(adminClient);
                    setTestingConnection(false);
                    return;
                  }
                } else {
                  console.error("Error al crear tablas:", createError);
                }
              }
            } catch (autoCreateError) {
              console.error("Error al intentar crear tablas automáticamente:", autoCreateError);
            }
            
            // Si la creación automática falló, mostrar el mensaje normal
            // Guardar las credenciales en localStorage para que el instalador las use
            localStorage.setItem('supabaseUrl', supabaseUrl);
            localStorage.setItem('supabaseAnonKey', supabaseAnonKey);
            localStorage.setItem('supabaseServiceKey', supabaseServiceKey);
            
            setConnectionStatus('error');
            setConnectionMessage(`
              <p>Es necesario configurar la base de datos. Se detectaron las siguientes tablas faltantes: <strong>${missingTables.join(', ')}</strong></p>
              
              <p>Por favor, ejecute el script SQL de configuración en su base de datos Supabase:</p>
              
              <p><button id="showSqlScript" class="text-blue-600 underline">Ver script SQL de configuración</button></p>
              
              <p>O utilice la herramienta de configuración automática:</p>
              
              <p><a href="/setup-database.html" target="_blank" class="text-blue-600 underline">Abrir herramienta de configuración de base de datos</a></p>
              
              <p>Una vez completada la configuración, vuelva a esta página y haga clic en "Probar conexión" nuevamente.</p>
            `);
            
            // Agregar event listener para el botón de mostrar script SQL
            setTimeout(() => {
              const showSqlButton = document.getElementById('showSqlScript');
              if (showSqlButton) {
                showSqlButton.addEventListener('click', () => {
                  setShowSqlScript(true);
                });
              }
            }, 100);
            
            setTestingConnection(false);
            return;
          }
        
        // Verificar el bucket para imágenes de menú - solo verificación, no creación
        console.log("Verificando bucket para imágenes de menú...");
        const { exists: bucketExists, error: bucketError } = 
          await checkAndCreateStorageBucket(adminClient, 'menu-images');
        
        if (bucketError) {
          console.warn("Advertencia: Error al verificar bucket de imágenes:", bucketError);
          // No fallamos la instalación por esto, solo mostramos una advertencia
        } else if (bucketExists) {
          console.log("Bucket de imágenes verificado correctamente.");
        } else {
          console.log("El bucket 'menu-images' no existe. Recuerde crearlo manualmente desde el panel de Supabase.");
        }

        // Mensaje de éxito con información sobre el bucket
        let bucketMessage = "";
        if (bucketError) {
          bucketMessage = `<p class="mt-2"><strong>Nota:</strong> No se pudo verificar el bucket de almacenamiento para imágenes. Verifique que el bucket 'menu-images' esté creado en Supabase.</p>`;
        } else if (!bucketExists) {
          bucketMessage = `<p class="mt-2"><strong>Nota:</strong> El bucket 'menu-images' no existe en Supabase. Por favor, créelo manualmente desde el panel de Supabase para poder subir imágenes de productos.</p>`;
        }

        setConnectionStatus('success');
        setConnectionMessage(`Conexión exitosa con Supabase. Las tablas necesarias están correctamente configuradas. Ahora puede continuar con la configuración.${bucketMessage}`);
        setSupabaseClient(adminClient);
      } catch (serviceError: any) {
        // Error específico para el service role
        setConnectionStatus('error');
        setConnectionMessage(`La clave de servicio no tiene los permisos necesarios. 
          
          Asegúrese de que:
          1. Está utilizando la clave "service_role" y no la clave "anon".
          2. La clave tiene el formato correcto (comienza con "eyJ..." y tiene tres partes separadas por puntos).
          3. Su proyecto Supabase tiene los permisos de autenticación correctamente configurados.
          
          Error específico: ${serviceError.message}`);
      }
    } catch (error: any) {
      // Error general con la conexión
      setConnectionStatus('error');
      setConnectionMessage(`Error de conexión: ${error.message || 'Desconocido'}
        
        Verifique que:
        1. La URL de Supabase es correcta (debe tener el formato: https://something.supabase.co)
        2. Las claves API son correctas y están vigentes
        3. Su conexión a internet funciona correctamente
        4. El proyecto Supabase está activo y no en mantenimiento`);
    } finally {
      setTestingConnection(false);
    }
  };

  // Función para generar IDs únicos
  const generateId = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000);
  };

  // Función para crear el administrador
  const createAdmin = async () => {
    if (!supabaseClient) {
      setConnectionStatus('error');
      setConnectionMessage('No hay conexión con Supabase. Vuelve a la pestaña anterior y prueba la conexión.');
      return;
    }

    const { email, password } = adminForm.getValues();

    try {
      // Crear el usuario con rol de administrador
      console.log("Creando usuario administrador con email:", email);
      const { data, error } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'admin' }
      });

      if (error) {
        console.error("Error al crear usuario:", error);
        throw error;
      }

      if (!data || !data.user) {
        console.error("No se recibieron datos del usuario");
        throw new Error("No se recibieron datos del usuario creado");
      }

      console.log("Usuario creado correctamente:", data.user);
      
      // Variable para rastrear si alguno de los métodos tuvo éxito
      let roleAssignmentSuccess = false;

      // Método 1: Intentar asignar explícitamente el rol en la tabla profiles
      try {
        console.log("Método 1: Asignando rol de administrador en profiles...");
        const { error: roleError } = await supabaseClient
          .from('profiles')
          .upsert([
            { 
              id: data.user.id, 
              email: data.user.email,
              role: 'admin' 
            }
          ], { 
            onConflict: 'id'
          });
        
        if (roleError) {
          console.error('Error al asignar rol en profiles:', roleError);
        } else {
          console.log("Rol asignado correctamente en tabla profiles");
          roleAssignmentSuccess = true;
        }
      } catch (profilesError) {
        console.error("Error al asignar rol en profiles:", profilesError);
      }
      
      // Método 2: Si el método 1 falló, intentar con updateUser para actualizar los metadatos
      if (!roleAssignmentSuccess) {
        try {
          console.log("Método 2: Actualizando metadatos del usuario...");
          const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
            data.user.id,
            { 
              user_metadata: { role: 'admin' },
              app_metadata: { role: 'admin' }
            }
          );
          
          if (updateError) {
            console.error("Error al actualizar metadatos:", updateError);
          } else {
            console.log("Metadatos actualizados correctamente");
            roleAssignmentSuccess = true;
          }
        } catch (updateError) {
          console.error("Error al actualizar metadatos:", updateError);
        }
      }
      
      // Método 3: Si los anteriores fallaron, intentar SQL directo
      if (!roleAssignmentSuccess) {
        try {
          console.log("Método 3: Intentando SQL directo...");
          // Primero verificar si la tabla existe
          const checkTableSQL = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public'
              AND table_name = 'profiles'
            );
          `;
          
          const { data: tableExists, error: tableCheckError } = await supabaseClient.rpc('exec_sql', { sql: checkTableSQL });
          
          if (tableCheckError) {
            console.error("Error al verificar tabla:", tableCheckError);
          } else if (tableExists) {
            const insertSQL = `
              INSERT INTO profiles (id, email, role)
              VALUES ('${data.user.id}', '${data.user.email}', 'admin')
              ON CONFLICT (id) DO UPDATE SET role = 'admin';
            `;
            
            const { error: sqlError } = await supabaseClient.rpc('exec_sql', { sql: insertSQL });
            
            if (sqlError) {
              console.error("Error en SQL directo:", sqlError);
            } else {
              console.log("Rol asignado correctamente con SQL directo");
              roleAssignmentSuccess = true;
            }
          }
        } catch (sqlError) {
          console.error("Error en método SQL:", sqlError);
        }
      }
      
      // Método 4: Actualizar directamente en la tabla auth.users (requiere permisos especiales)
      if (!roleAssignmentSuccess) {
        try {
          console.log("Método 4: Intentando actualizar auth.users directamente...");
          const updateAuthUserSQL = `
            UPDATE auth.users 
            SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"') 
            WHERE id = '${data.user.id}';
          `;
          
          const { error: authUpdateError } = await supabaseClient.rpc('exec_sql', { sql: updateAuthUserSQL });
          
          if (authUpdateError) {
            console.error("Error al actualizar auth.users:", authUpdateError);
          } else {
            console.log("Actualización de auth.users completada");
            roleAssignmentSuccess = true;
          }
        } catch (authError) {
          console.error("Error al actualizar auth.users:", authError);
        }
      }
      
      // Continuar aunque haya fallado la asignación de rol
      // El usuario ya está creado y tiene role:admin en user_metadata
      console.log("Creación de usuario completada. Éxito en asignación de rol:", roleAssignmentSuccess ? "Sí" : "No");
      
      return true;
    } catch (error: any) {
      console.error("Error general en createAdmin:", error);
      setConnectionStatus('error');
      
      // Mensajes de error más específicos
      if (error.message?.includes('duplicate key')) {
        setConnectionMessage(`El email ${email} ya está registrado. Por favor utilice otro email o restablezca la contraseña.`);
      } else {
        setConnectionMessage(`Error al crear el administrador: ${error.message}`);
      }
      
      return false;
    }
  };

  // Función para completar la instalación
  const completeInstallation = async () => {
    try {
      setConnectionStatus('idle');
      setConnectionMessage('');
      
      // 1. Crear el administrador
      console.log("Iniciando creación de administrador...");
      const adminCreated = await createAdmin();
      
      if (!adminCreated) {
        console.error("No se pudo crear el administrador");
        return;
      }
      
      console.log("Administrador creado correctamente");

      // Resolver cualquier estado de error que pudiera haberse establecido
      // pero que no haya causado una interrupción completa
      setConnectionStatus('idle'); 
      setConnectionMessage('');

      // 2. Guardar la configuración
      console.log("Guardando configuración del restaurante...");
      const restaurantData = restaurantForm.getValues();
      const supabaseData = supabaseForm.getValues();

      // Crear el objeto de configuración
      const newConfig = {
        ...defaultConfig,
        restaurantName: restaurantData.restaurantName,
        whatsappNumber: restaurantData.whatsappNumber,
        currency: restaurantData.currency,
        openingHours: restaurantData.openingHours,
        categories: categories,
      };

      // Guardar la configuración en Supabase
      const configSaved = await saveRestaurantConfig(supabaseClient, newConfig);
      
      if (!configSaved) {
        console.error("Error al guardar la configuración en Supabase");
        
        // Intentar guardar en localStorage como fallback
        const localSaved = saveConfig(newConfig);
        
        if (!localSaved) {
          setConnectionStatus('error');
          setConnectionMessage("Error al guardar la configuración de la aplicación. Intente nuevamente.");
          return;
        }
      }
      console.log("Configuración guardada correctamente");

      // 3. Guardar las credenciales de Supabase en Supabase (y en localStorage como fallback)
      console.log("Guardando credenciales de Supabase en la base de datos...");
      
      // Primero verificar si existe algún registro en site_config
      const { data: existingConfigs, error: checkError } = await supabaseClient
        .from('site_config')
        .select('id')
        .limit(1);
        
      console.log("Verificando registros existentes en site_config:", existingConfigs?.length || 0);
      
      let configUpdateSuccess = false;
      
      if (existingConfigs && existingConfigs.length > 0) {
        // Existe un registro, actualizarlo
        console.log("Actualizando registro existente con ID:", existingConfigs[0].id);
        
        const { error: updateError } = await supabaseClient
          .from('site_config')
          .update({
            // Datos del restaurante del paso 2
            restaurant_name: restaurantData.restaurantName,
            whatsapp_number: restaurantData.whatsappNumber,
            currency: restaurantData.currency,
            opening_hours: restaurantData.openingHours,
            // Credenciales de Supabase
            supabase_url: supabaseData.supabaseUrl,
            supabase_anon_key: supabaseData.supabaseAnonKey,
            supabase_service_key: supabaseData.supabaseServiceKey
          })
          .eq('id', existingConfigs[0].id);
          
        if (updateError) {
          console.error("Error al actualizar site_config:", updateError);
        } else {
          console.log("✅ Datos actualizados correctamente en site_config");
          configUpdateSuccess = true;
        }
      } else {
        // No existe ningún registro, crear uno nuevo
        console.log("No hay registros en site_config, creando uno nuevo...");
        
        const { error: insertError } = await supabaseClient
          .from('site_config')
          .insert({
            // Datos del restaurante del paso 2
            restaurant_name: restaurantData.restaurantName,
            whatsapp_number: restaurantData.whatsappNumber,
            currency: restaurantData.currency,
            opening_hours: restaurantData.openingHours,
            // Estado de instalación inicial
            installation_status: 'pending',
            // Credenciales de Supabase
            supabase_url: supabaseData.supabaseUrl,
            supabase_anon_key: supabaseData.supabaseAnonKey,
            supabase_service_key: supabaseData.supabaseServiceKey
          });
          
        if (insertError) {
          console.error("Error al insertar en site_config:", insertError);
        } else {
          console.log("✅ Datos insertados correctamente en site_config");
          configUpdateSuccess = true;
        }
      }
      
      // Si fallaron los métodos anteriores, intentar con un método alternativo
      if (!configUpdateSuccess) {
        console.log("Intentando método alternativo para guardar configuración...");
        
        try {
          // Método alternativo: Usar RPC para ejecutar SQL directo
          const sqlQuery = `
            INSERT INTO site_config (
              restaurant_name, whatsapp_number, currency, opening_hours,
              installation_status, supabase_url, supabase_anon_key, supabase_service_key
            )
            VALUES (
              '${restaurantData.restaurantName.replace(/'/g, "''")}',
              '${restaurantData.whatsappNumber.replace(/'/g, "''")}',
              '${restaurantData.currency.replace(/'/g, "''")}',
              '${restaurantData.openingHours.replace(/'/g, "''")}',
              'pending',
              '${supabaseData.supabaseUrl.replace(/'/g, "''")}',
              '${supabaseData.supabaseAnonKey.replace(/'/g, "''")}',
              '${supabaseData.supabaseServiceKey.replace(/'/g, "''")}'  
            )
            ON CONFLICT (id) DO UPDATE SET
              restaurant_name = EXCLUDED.restaurant_name,
              whatsapp_number = EXCLUDED.whatsapp_number,
              currency = EXCLUDED.currency,
              opening_hours = EXCLUDED.opening_hours,
              supabase_url = EXCLUDED.supabase_url,
              supabase_anon_key = EXCLUDED.supabase_anon_key,
              supabase_service_key = EXCLUDED.supabase_service_key
          `;
          
          const { error: sqlError } = await supabaseClient.rpc('exec_sql', { sql: sqlQuery });
          
          if (sqlError) {
            console.error("Error al ejecutar SQL para guardar configuración:", sqlError);
          } else {
            console.log("✅ Datos guardados correctamente mediante SQL directo");
            configUpdateSuccess = true;
          }
        } catch (directError) {
          console.error("Error en método alternativo SQL:", directError);
        }
      }
      
      // También guardar en localStorage como respaldo para compatibilidad
      localStorage.setItem('supabaseUrl', supabaseData.supabaseUrl);
      localStorage.setItem('supabaseAnonKey', supabaseData.supabaseAnonKey);
      localStorage.setItem('supabaseServiceKey', supabaseData.supabaseServiceKey);

      // 4. Marcar el instalador como completado en Supabase
      console.log("Marcando instalación como completada...");
      let installationMarked = false;
      
      // Intentar varias veces para asegurar que se guarde correctamente
      for (let attempt = 1; attempt <= 3 && !installationMarked; attempt++) {
        try {
          console.log(`Intento ${attempt}/3 de marcar instalación como completada...`);
          
          // Primero intentar con la función de configService
          installationMarked = await markInstallationCompleteFromConfig();
          
          if (installationMarked) {
            console.log("✅ Instalación marcada como completada exitosamente");
          } else {
            console.error("Error al marcar instalación como completada, intentando método alternativo...");
            
            // Intentar directamente con el cliente de Supabase como respaldo
            try {
              // Actualizar la columna installation_status en site_config
              const { error } = await supabaseClient
                .from('site_config')
                .update({ installation_status: 'completed' })
                .order('id', { ascending: false })
                .limit(1);
              
              if (!error) {
                installationMarked = true;
                console.log("✅ Instalación marcada como completada actualizando site_config");
              } else {
                console.error("Error al actualizar installation_status:", error);
                
                // Intentar insertar un nuevo registro si la actualización falla
                const { error: insertError } = await supabaseClient
                  .from('site_config')
                  .insert({ 
                    restaurant_name: restaurantForm.getValues().restaurantName || 'WAFOOD',
                    whatsapp_number: restaurantForm.getValues().whatsappNumber || '18091234567',
                    currency: restaurantForm.getValues().currency || 'RD$',
                    opening_hours: restaurantForm.getValues().openingHours || '8:00 AM - 10:00 PM',
                    installation_status: 'completed'
                  });
                  
                if (!insertError) {
                  installationMarked = true;
                  console.log("✅ Instalación marcada como completada insertando nueva configuración");
                }
              }
            } catch (directError) {
              console.error("Error en método alternativo:", directError);
            }
            
            // Si todavía falla, intentar directamente con fetch API como último recurso
            if (!installationMarked) {
              try {
                const supabaseUrl = supabaseForm.getValues().supabaseUrl;
                const serviceKey = supabaseForm.getValues().supabaseServiceKey;
                
                const response = await fetch(`${supabaseUrl}/rest/v1/site_config`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Prefer': 'resolution=merge-duplicates'
                  },
                  body: JSON.stringify({
                    // Datos del restaurante
                    restaurant_name: restaurantData.restaurantName,
                    whatsapp_number: restaurantData.whatsappNumber,
                    currency: restaurantData.currency,
                    opening_hours: restaurantData.openingHours,
                    // Estado de instalación
                    installation_status: 'completed',
                    // Credenciales de Supabase
                    supabase_url: supabaseData.supabaseUrl,
                    supabase_anon_key: supabaseData.supabaseAnonKey,
                    supabase_service_key: supabaseData.supabaseServiceKey
                  })
                });
                
                if (response.ok) {
                  installationMarked = true;
                  console.log("✅ Instalación marcada como completada usando API fetch");
                }
              } catch (fetchError) {
                console.error("Error en método fetch:", fetchError);
              }
            }
          }
          
          // Si se logró marcar, salir del bucle
          if (installationMarked) break;
          
          // Si aún no se ha marcado y hay más intentos, esperar antes de reintentar
          if (!installationMarked && attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Error en intento ${attempt}:`, error);
        }
      }
      
      // Guardar en localStorage como respaldo final sin importar el resultado
      const randomToken = 'installer_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('installerCompleted', randomToken);
      sessionStorage.setItem('installerCompleted', randomToken);
      
      // Si no se pudo marcar después de todos los intentos, mostrar advertencia pero continuar
      if (!installationMarked) {
        console.warn("⚠️ No se pudo marcar la instalación como completada en Supabase después de múltiples intentos, pero los datos están guardados localmente.");
      }
      
      // 5. Mostrar mensaje de éxito
      setInstallationComplete(true);
    } catch (error: any) {
      console.error("Error en la instalación:", error);
      setConnectionStatus('error');
      setConnectionMessage(`Error al completar la instalación: ${error.message || 'Error desconocido'}`);
    }
  };

  // Si debemos mostrar la guía, renderizarla
  if (showGuide) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <InstallerGuide onClose={() => setShowGuide(false)} />
      </div>
    );
  }

  // Mostrar el script SQL cuando se solicite
  if (showSqlScript) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-5xl shadow-lg border-0">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-600 to-blue-500 text-white">
            <div>
              <CardTitle className="text-white text-xl font-bold">Script SQL de Inicialización</CardTitle>
              <CardDescription className="text-blue-100">
                Copie este script y ejecútelo en el SQL Editor de Supabase
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowSqlScript(false)}
              className="ml-auto bg-white text-blue-600 hover:bg-blue-50 border-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-[60vh] shadow-inner border border-gray-800">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
                <span className="text-xs text-gray-400">supabase_init.sql</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(document.querySelector('pre')?.innerText || '');
                    alert('Script copiado al portapapeles');
                  }}
                  className="h-8 px-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copiar código
                </Button>
              </div>
              <pre className="text-sm overflow-auto font-mono">
{`-- Schema para la inicialización de la base de datos en Supabase

-- Configurar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear función auxiliar para verificación de conexión
CREATE OR REPLACE FUNCTION now()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Configuración de seguridad de RLS (Row Level Security)
-- Nota: No es necesario configurar RLS para auth.users, ya está gestionada por Supabase

-- Tabla para perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permitir acceso a la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes antes de crearlas de nuevo
DROP POLICY IF EXISTS "Perfiles visibles para todos los usuarios autenticados" ON profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Los administradores pueden hacer todo con los perfiles" ON profiles;

-- Políticas de RLS para perfiles
-- Los usuarios pueden leer todos los perfiles
CREATE POLICY "Perfiles visibles para todos los usuarios autenticados" 
  ON profiles FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Los usuarios solo pueden actualizar su propio perfil
CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Los administradores pueden hacer todo
CREATE POLICY "Los administradores pueden hacer todo con los perfiles" 
  ON profiles FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'role', 'customer'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ===============================
-- Tabla para configuración general del restaurante
-- ===============================
CREATE TABLE IF NOT EXISTS site_config (
  id SERIAL PRIMARY KEY,
  restaurant_name TEXT NOT NULL DEFAULT 'WHATSFOOD',
  whatsapp_number TEXT NOT NULL DEFAULT '18091234567',
  currency TEXT NOT NULL DEFAULT 'RD$',
  opening_hours TEXT NOT NULL DEFAULT '8:00 AM - 10:00 PM',
  installation_status TEXT NOT NULL DEFAULT 'pending',
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla site_config
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Cualquier usuario puede leer la configuración" ON site_config;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar la configuración" ON site_config;

-- Políticas para site_config
-- Cualquier usuario puede leer la configuración
CREATE POLICY "Cualquier usuario puede leer la configuración" 
  ON site_config FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden actualizar la configuración
CREATE POLICY "Solo administradores pueden actualizar la configuración" 
  ON site_config FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ===============================
-- Tabla para configuración de apariencia
-- ===============================
CREATE TABLE IF NOT EXISTS appearance_config (
  id SERIAL PRIMARY KEY,
  primary_color TEXT NOT NULL DEFAULT '#004d2a',
  accent_color TEXT NOT NULL DEFAULT '#00873e',
  text_color TEXT NOT NULL DEFAULT '#333333',
  background_color TEXT NOT NULL DEFAULT '#FFFFFF',
  cart_button_color TEXT NOT NULL DEFAULT '#003b29',
  floating_cart_button_color TEXT NOT NULL DEFAULT '#003b29',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla appearance_config
ALTER TABLE appearance_config ENABLE ROW LEVEL SECURITY;

-- Políticas para appearance_config
-- Cualquier usuario puede leer la configuración de apariencia
CREATE POLICY "Cualquier usuario puede leer la configuración de apariencia" 
  ON appearance_config FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden actualizar la configuración de apariencia
CREATE POLICY "Solo administradores pueden actualizar la apariencia" 
  ON appearance_config FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ===============================
-- Tabla para categorías de menú
-- ===============================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  category_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🍽️',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Políticas para categories
-- Cualquier usuario puede ver las categorías
CREATE POLICY "Cualquier usuario puede ver las categorías" 
  ON categories FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden modificar las categorías
CREATE POLICY "Solo administradores pueden modificar las categorías" 
  ON categories FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ===============================
-- Tabla para ítems del menú
-- ===============================
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  item_id TEXT UNIQUE NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT NOT NULL DEFAULT 'https://placehold.co/300x200/jpeg',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Políticas para menu_items
-- Cualquier usuario puede ver los ítems del menú
CREATE POLICY "Cualquier usuario puede ver los platos" 
  ON menu_items FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden modificar los ítems del menú
CREATE POLICY "Solo administradores pueden modificar los platos" 
  ON menu_items FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ===============================
-- Tabla para órdenes
-- ===============================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para órdenes
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias órdenes" ON orders;
DROP POLICY IF EXISTS "Los administradores pueden hacer todo con las órdenes" ON orders;
DROP POLICY IF EXISTS "Los usuarios anónimos pueden crear órdenes" ON orders;

-- Políticas para órdenes
-- Los usuarios pueden ver sus propias órdenes
CREATE POLICY "Los usuarios pueden ver sus propias órdenes" 
  ON orders FOR SELECT 
  USING (auth.uid() = user_id);

-- Los administradores pueden hacer todo con las órdenes
CREATE POLICY "Los administradores pueden hacer todo con las órdenes" 
  ON orders FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Los usuarios anónimos pueden crear órdenes (para pedidos sin registro)
CREATE POLICY "Los usuarios anónimos pueden crear órdenes" 
  ON orders FOR INSERT 
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- ===============================
-- Función para actualizar timestamps
-- ===============================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualizar los timestamps
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS set_site_config_updated_at ON site_config;
DROP TRIGGER IF EXISTS set_appearance_config_updated_at ON appearance_config;
DROP TRIGGER IF EXISTS set_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS set_menu_items_updated_at ON menu_items;
DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_site_config_updated_at
  BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_appearance_config_updated_at
  BEFORE UPDATE ON appearance_config
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ===============================
-- Insertar datos por defecto
-- ===============================
-- Configuración general del restaurante
INSERT INTO site_config (restaurant_name, whatsapp_number, currency, opening_hours, installation_status)
VALUES ('WHATSFOOD', '18091234567', 'RD$', '8:00 AM - 10:00 PM', 'pending')
ON CONFLICT DO NOTHING;

-- Configuración de apariencia
INSERT INTO appearance_config (primary_color, accent_color, text_color, background_color, cart_button_color, floating_cart_button_color)
VALUES ('#004d2a', '#00873e', '#333333', '#FFFFFF', '#003b29', '#003b29')
ON CONFLICT DO NOTHING;

-- Categorías de ejemplo
INSERT INTO categories (category_id, name, icon, display_order)
VALUES 
  ('bebidas', 'Bebidas', '🥤', 1),
  ('plato-principal', 'Plato Principal', '🍽️', 2),
  ('ensaladas', 'Ensaladas', '🥗', 3),
  ('postres', 'Postres', '🍰', 4)
ON CONFLICT (category_id) DO NOTHING;

-- Platos de ejemplo
INSERT INTO menu_items (item_id, category_id, name, description, price, image, display_order)
VALUES 
  ('cafe-cappuccino', 'bebidas', 'Cappuccino', 'Rico espresso con espumosa leche', 120, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1),
  ('sandwich-vegetariano', 'plato-principal', 'Sándwich Vegetariano', 'Vegetales a la parrilla con queso', 90, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1),
  ('ensalada-griega', 'ensaladas', 'Ensalada Griega', 'Vegetales frescos con queso feta', 160, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1),
  ('brownie-chocolate', 'postres', 'Brownie de Chocolate', 'Caliente brownie de chocolate', 120, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1)
ON CONFLICT (item_id) DO NOTHING;

-- Función para ejecutar SQL dinámico
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
              </pre>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button 
                variant="outline"
                onClick={() => setShowSqlScript(false)}
                className="px-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Instalador
              </Button>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(document.querySelector('pre')?.innerText || '');
                  alert('Script copiado al portapapeles');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar al Portapapeles
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar el mensaje de instalación completa
  if (installationComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-green-100 opacity-50" />
          <CardHeader className="relative space-y-1 pb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-center text-2xl font-bold text-green-700">¡Instalación Completada!</CardTitle>
            <CardDescription className="text-center text-green-600">
              La configuración inicial se ha completado correctamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <p className="text-center text-gray-600">
              Ya puedes acceder a tu aplicación y comenzar a gestionarla.
            </p>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-green-700 text-sm">
              <p className="flex items-start">
                <Check className="h-5 w-5 mr-2 flex-shrink-0 text-green-500" />
                <span>Se ha creado tu cuenta de administrador</span>
              </p>
              <p className="flex items-start mt-2">
                <Check className="h-5 w-5 mr-2 flex-shrink-0 text-green-500" />
                <span>Se ha configurado la base de datos correctamente</span>
              </p>
              <p className="flex items-start mt-2">
                <Check className="h-5 w-5 mr-2 flex-shrink-0 text-green-500" />
                <span>Tu menú inicial está listo para ser personalizado</span>
              </p>
            </div>
          </CardContent>
          <CardFooter className="relative flex justify-center pb-6 pt-2">
            <Button 
              onClick={() => {
                // Forzar la recarga completa de la aplicación para reinicializar los estados
                window.location.href = '/';
              }}
              className="px-8 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-medium rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Ir a la aplicación <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="pb-6 relative bg-gradient-to-r from-[#004d2a] to-[#007844] text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full transform translate-x-1/3 -translate-y-1/3"></div>
            <CardTitle className="text-2xl font-bold flex items-center">
              <LucideRocket className="mr-2 h-6 w-6" /> WAFOOD - Asistente de Instalación
            </CardTitle>
            <CardDescription className="text-gray-100">
              Configure su aplicación de pedidos en línea en pocos pasos.
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="mt-3 text-xs bg-white/20 hover:bg-white/30 border-0 text-white"
            >
              <Settings className="mr-1 h-3 w-3" /> Ver guía de configuración
            </Button>
          </CardHeader>
          
          <CardContent className="p-0">
            <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
              <div className="border-b">
                <TabsList className="w-full rounded-none justify-between bg-white pt-2 h-auto">
                  <TabsTrigger 
                    value="supabase" 
                    className="flex flex-col items-center py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#004d2a] rounded-none data-[state=active]:shadow-none"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mb-1">
                      <Database className="h-4 w-4 text-gray-700" />
                    </div>
                    <span className="text-sm">Conexión</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="restaurant" 
                    disabled={connectionStatus !== 'success'}
                    className="flex flex-col items-center py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#004d2a] rounded-none data-[state=active]:shadow-none"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mb-1">
                      <Server className="h-4 w-4 text-gray-700" />
                    </div>
                    <span className="text-sm">Restaurante</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="admin" 
                    disabled={connectionStatus !== 'success'}
                    className="flex flex-col items-center py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#004d2a] rounded-none data-[state=active]:shadow-none"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mb-1">
                      <User className="h-4 w-4 text-gray-700" />
                    </div>
                    <span className="text-sm">Administrador</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Contenido de las pestañas */}
              <div className="p-6">
                {/* Pestaña de configuración de Supabase */}
                <TabsContent value="supabase">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const result = supabaseForm.trigger();
                    if (result) {
                      testSupabaseConnection();
                    }
                  }}>
                    <div className="space-y-6">
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-6">
                        <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                          <Database className="h-5 w-5 mr-2 text-blue-500" /> Primer Paso: Configurar Conexión
                        </h3>
                        <p className="text-sm text-blue-700">
                          Antes de configurar su restaurante, es necesario establecer la conexión con Supabase.
                          Ingrese la URL de su proyecto y las claves API que encontrará en su panel de Supabase.
                        </p>
                        <p className="text-sm text-blue-700 mt-2 flex items-center">
                          Si aún no tiene un proyecto de Supabase, puede crear uno gratis en{' '}
                          <a href="https://app.supabase.com" target="_blank" className="underline flex items-center ml-1 text-blue-800 font-medium">
                            app.supabase.com <ArrowUpRight className="h-3 w-3 ml-0.5" />
                          </a>
                        </p>
                      </div>
                      
                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="supabaseUrl" className="text-sm font-medium block mb-1.5">URL de Supabase</Label>
                          <Input
                            id="supabaseUrl"
                            placeholder="https://xxxxxxxxxxxx.supabase.co"
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...supabaseForm.register('supabaseUrl')}
                          />
                          {supabaseForm.formState.errors.supabaseUrl && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {supabaseForm.formState.errors.supabaseUrl.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1.5 ml-1">
                            Encuentra esto en Configuración del Proyecto &gt; API en tu panel de Supabase
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="supabaseAnonKey" className="text-sm font-medium block mb-1.5">Clave Anónima (anon)</Label>
                          <Input
                            id="supabaseAnonKey"
                            type="password"
                            placeholder="eyJhbGciOiJI..."
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...supabaseForm.register('supabaseAnonKey')}
                          />
                          {supabaseForm.formState.errors.supabaseAnonKey && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {supabaseForm.formState.errors.supabaseAnonKey.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1.5 ml-1">
                            Clave pública para operaciones del cliente (anon key)
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="supabaseServiceKey" className="text-sm font-medium block mb-1.5">Clave de Servicio (service_role)</Label>
                          <Input
                            id="supabaseServiceKey"
                            type="password"
                            placeholder="eyJhbGciOiJI..."
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...supabaseForm.register('supabaseServiceKey')}
                          />
                          {supabaseForm.formState.errors.supabaseServiceKey && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {supabaseForm.formState.errors.supabaseServiceKey.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1.5 ml-1">
                            Clave privada para operaciones administrativas (service_role key)
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          type="submit" 
                          disabled={testingConnection}
                          className="w-full rounded-md py-2.5 font-medium bg-[#004d2a] hover:bg-[#003b20]"
                        >
                          {testingConnection ? (
                            <>
                              <Loader2 className="animate-spin mr-2 h-4 w-4" />
                              Probando conexión...
                            </>
                          ) : (
                            'Probar Conexión'
                          )}
                        </Button>
                      </div>
                      
                      {connectionStatus === 'error' && (
                        <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50 text-red-800">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          <AlertTitle className="mb-1 text-red-800">Error de conexión</AlertTitle>
                          <AlertDescription>
                            <RenderHTML html={connectionMessage} />
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {connectionStatus === 'success' && (
                        <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
                          <Check className="h-4 w-4 mr-2 text-green-600" />
                          <AlertTitle className="mb-1 text-green-800">Conexión exitosa</AlertTitle>
                          <AlertDescription>
                            <RenderHTML html={connectionMessage} />
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </form>
                </TabsContent>

                {/* Pestaña de información del restaurante */}
                <TabsContent value="restaurant">
                  <form onSubmit={restaurantForm.handleSubmit(() => setCurrentStep('admin'))}>
                    <div className="space-y-6">
                      <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-md mb-6">
                        <h3 className="font-medium text-teal-800 mb-2 flex items-center">
                          <Server className="h-5 w-5 mr-2 text-teal-500" /> Segundo Paso: Información del Restaurante
                        </h3>
                        <p className="text-sm text-teal-700">
                          Ahora que la conexión a la base de datos está establecida, puede configurar los datos de su restaurante.
                        </p>
                      </div>
                      
                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="restaurantName" className="text-sm font-medium block mb-1.5">Nombre del Restaurante</Label>
                          <Input
                            id="restaurantName"
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...restaurantForm.register('restaurantName')}
                          />
                          {restaurantForm.formState.errors.restaurantName && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {restaurantForm.formState.errors.restaurantName.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="whatsappNumber" className="text-sm font-medium block mb-1.5">Número de WhatsApp (con código de país)</Label>
                          <Input
                            id="whatsappNumber"
                            placeholder="18091234567"
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...restaurantForm.register('whatsappNumber')}
                          />
                          {restaurantForm.formState.errors.whatsappNumber && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {restaurantForm.formState.errors.whatsappNumber.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="currency" className="text-sm font-medium block mb-1.5">Moneda</Label>
                          <Input
                            id="currency"
                            placeholder="RD$"
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...restaurantForm.register('currency')}
                          />
                          {restaurantForm.formState.errors.currency && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {restaurantForm.formState.errors.currency.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="openingHours" className="text-sm font-medium block mb-1.5">Horario de Apertura</Label>
                          <Input
                            id="openingHours"
                            placeholder="8:00 AM - 10:00 PM"
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...restaurantForm.register('openingHours')}
                          />
                          {restaurantForm.formState.errors.openingHours && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {restaurantForm.formState.errors.openingHours.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator className="my-6 bg-gray-200" />

                      <div>
                        <h3 className="text-lg font-medium mb-4">Categorías y Productos Iniciales</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Se configurarán 4 categorías con un plato cada una. Podrás personalizarlas después en el panel de administración.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {categories.map((category, index) => (
                            <div key={category.id} className="border border-gray-200 p-4 rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                              <h4 className="font-medium flex items-center gap-2 mb-2">
                                <span className="text-lg">{category.icon}</span> {category.name}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                                <div className="w-8 h-8 bg-gray-200 rounded flex-shrink-0"></div>
                                <span>{category.items[0].name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCurrentStep('supabase')}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                      </Button>
                      <Button 
                        type="submit"
                        className="bg-[#004d2a] hover:bg-[#003b20]"
                      >
                        Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                {/* Pestaña de creación de administrador */}
                <TabsContent value="admin">
                  <form onSubmit={adminForm.handleSubmit(completeInstallation)}>
                    <div className="space-y-6">
                      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-md mb-6">
                        <h3 className="font-medium text-purple-800 mb-2 flex items-center">
                          <User className="h-5 w-5 mr-2 text-purple-500" /> Paso Final: Usuario Administrador
                        </h3>
                        <p className="text-sm text-purple-700">
                          Cree el primer usuario administrador para gestionar su aplicación.
                          Este usuario tendrá acceso completo al panel de control.
                        </p>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="email" className="text-sm font-medium block mb-1.5">Correo Electrónico</Label>
                          <Input
                            id="email"
                            type="email"
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...adminForm.register('email')}
                          />
                          {adminForm.formState.errors.email && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {adminForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="password" className="text-sm font-medium block mb-1.5">Contraseña</Label>
                          <Input
                            id="password"
                            type="password"
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...adminForm.register('password')}
                          />
                          {adminForm.formState.errors.password && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {adminForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="confirmPassword" className="text-sm font-medium block mb-1.5">Confirmar Contraseña</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            className="border-gray-300 focus:border-[#004d2a] focus:ring-[#004d2a]"
                            {...adminForm.register('confirmPassword')}
                          />
                          {adminForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-red-500 mt-1 flex items-start">
                              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                              {adminForm.formState.errors.confirmPassword.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {connectionStatus === 'error' && (
                        <Alert className="mt-4 bg-red-50 border-red-200 text-red-800">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          <AlertDescription>
                            {connectionMessage.includes('<') ? 
                              <RenderHTML html={connectionMessage} /> : 
                              connectionMessage
                            }
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-6">
                        <h4 className="font-medium text-gray-800 mb-2">Resumen de la instalación</h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start">
                            <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                            <span>Conexión con Supabase establecida</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                            <span>Datos básicos del restaurante configurados</span>
                          </li>
                          <li className="flex items-start">
                            <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                            <span>Categorías y productos iniciales configurados</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCurrentStep('restaurant')}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-[#004d2a] to-[#006d3a] hover:from-[#003b20] hover:to-[#005d30] text-white px-6 shadow-sm"
                      >
                        Completar Instalación
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6 text-gray-500 text-sm pb-6">
          <p className="flex items-center justify-center gap-1">
            WAFOOD Desarrollado por Eduardo Soto {' '}
            <a 
              href="https://wa.me/18092010357?text=Hola,%20me%20interesa%20el%20sistema%20de%20WAFOOD." 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#004d2a] hover:underline font-medium flex items-center ml-1"
            >
              Contactar por WhatsApp <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Installer; 