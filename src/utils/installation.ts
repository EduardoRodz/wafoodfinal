import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Tipos de conexión
export enum ConnectionStatus {
  Idle = 'idle',
  Testing = 'testing',
  Success = 'success',
  Error = 'error'
}

// Esquemas de validación
export const restaurantFormSchema = z.object({
  restaurantName: z.string().min(1, "El nombre del restaurante es obligatorio"),
  whatsappNumber: z.string().min(8, "Ingrese un número de WhatsApp válido"),
  currency: z.string().min(1, "La moneda es obligatoria"),
  openingHours: z.string().min(1, "El horario de apertura es obligatorio"),
});

export const supabaseFormSchema = z.object({
  supabaseUrl: z.string().url("Ingrese una URL válida"),
  supabaseAnonKey: z.string().min(20, "La clave anónima debe tener al menos 20 caracteres"),
  supabaseServiceKey: z.string().min(20, "La clave de servicio debe tener al menos 20 caracteres"),
});

export const adminFormSchema = z.object({
  email: z.string().email("Ingrese un correo electrónico válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// Función para ejecutar SQL directamente
export const executeSQL = async (
  supabaseUrl: string,
  supabaseServiceKey: string,
  sql: string
): Promise<{ success: boolean; error?: any; message?: string }> => {
  try {
    // Dividir el SQL en instrucciones individuales
    // Esto es una aproximación simple - no maneja todos los casos pero funciona para la mayoría
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Ejecutando ${statements.length} instrucciones SQL...`);
    
    // Intentar con el endpoint /rest/v1/query primero
    const queryEndpoint = `${supabaseUrl}/rest/v1/query`;
    
    // Ejecutar cada instrucción por separado
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Omitir comentarios
      if (stmt.startsWith('--')) continue;
      
      try {
        // Intentar con el endpoint /rest/v1/query
        const response = await fetch(queryEndpoint, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({
            query: stmt
      })
    });

    if (!response.ok) {
          // Si falla, intentar con el endpoint /sql
          const sqlEndpoint = `${supabaseUrl}/sql`;
          
          const sqlResponse = await fetch(sqlEndpoint, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=ignore-duplicates,return=minimal'
            },
            body: JSON.stringify({
              query: stmt
            })
          });
          
          if (!sqlResponse.ok) {
            const errorText = await sqlResponse.text();
            console.warn(`Advertencia en instrucción ${i+1}: ${errorText}`);
            // No lanzar error, seguir con la siguiente instrucción
          }
        }
      } catch (stmtError) {
        console.warn(`Error en instrucción ${i+1}:`, stmtError);
        // No lanzar error, seguir con la siguiente instrucción
      }
    }

    return { success: true, message: `Ejecutadas ${statements.length} instrucciones SQL` };
  } catch (error) {
    console.error("Error al ejecutar SQL:", error);
    return { success: false, error };
  }
};

// Función para crear el administrador
export const createAdmin = async (supabaseClient: any, adminData: { email: string; password: string }) => {
  if (!supabaseClient) return false;

  try {
    // Crear el usuario
    const { data: user, error: authError } = await supabaseClient.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true,
      user_metadata: {
        role: 'admin'
      }
    });

    if (authError) throw authError;

    // Crear el perfil del administrador
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        role: 'admin'
      });

    if (profileError) throw profileError;

    return true;
  } catch (error) {
    console.error('Error al crear el administrador:', error);
    return false;
  }
};

// Función para verificar si el instalador ya se ha completado
export const checkInstallationStatus = async (supabaseUrl?: string, supabaseKey?: string): Promise<boolean> => {
  try {
    // Primero intentar usar las credenciales proporcionadas
    let client;
    
    if (supabaseUrl && supabaseKey) {
      client = createClient(supabaseUrl, supabaseKey);
    } else {
      // Si no se proporcionan, intentar usar las almacenadas en localStorage (para compatibilidad)
      const storedUrl = localStorage.getItem('supabaseUrl');
      const storedKey = localStorage.getItem('supabaseAnonKey');
      
      if (!storedUrl || !storedKey) {
        return false; // No hay credenciales, el instalador no se ha completado
      }
      
      client = createClient(storedUrl, storedKey);
    }
    
    // Verificar si existe el registro de estado de instalación en site_config
    const { data, error } = await client
      .from('site_config')
      .select('installation_status')
      .order('id', { ascending: false })
      .limit(1);
    
    if (error) {
      console.log('Error al verificar estado de instalación en Supabase:', error.message);
      
      // Verificar el método antiguo (localStorage) para compatibilidad
      const localInstallStatus = localStorage.getItem('installerCompleted');
      return !!localInstallStatus;
    }
    
    if (data && data.length > 0) {
      return data[0].installation_status === 'completed';
    }
    
    // Si no hay datos, verificar el método antiguo (localStorage)
    const localInstallStatus = localStorage.getItem('installerCompleted');
    return !!localInstallStatus;
  } catch (error) {
    console.error('Error al verificar estado de instalación:', error);
    
    // Fallback a localStorage si hay error
    const localInstallStatus = localStorage.getItem('installerCompleted');
    return !!localInstallStatus;
  }
};

// Función para marcar el instalador como completado
export const markInstallationComplete = async (supabaseClient: any): Promise<boolean> => {
  try {
    if (!supabaseClient) return false;
    
    // Guardar en Supabase que la instalación está completa
    const { error } = await supabaseClient
      .from('site_config')
      .upsert({ 
        key: 'installation_status', 
        value: 'completed',
        description: 'Estado de la instalación del sistema'
      });
    
    if (error) {
      console.error('Error al marcar instalación como completada en Supabase:', error);
      
      // Fallback a localStorage
      const randomName = 'installer_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('installerCompleted', randomName);
      
      return false;
    }
    
    // También guardar en localStorage para compatibilidad con código existente
    const randomName = 'installer_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('installerCompleted', randomName);
    
    return true;
  } catch (error) {
    console.error('Error al marcar instalación como completada:', error);
    
    // Fallback a localStorage
    const randomName = 'installer_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('installerCompleted', randomName);
    
    return false;
  }
};

// Función para guardar la configuración del restaurante
export const saveRestaurantConfig = async (supabaseClient: any, config: any) => {
  if (!supabaseClient) return false;

  try {
    const { error } = await supabaseClient
      .from('site_config')
      .upsert({ 
        key: 'restaurant_config',
        value: config,
        description: 'Configuración general del restaurante'
      });

    if (error) throw error;
    
    // También guardar en localStorage para compatibilidad
    localStorage.setItem('siteConfig', JSON.stringify(config));
    
    return true;
  } catch (error) {
    console.error('Error al guardar la configuración:', error);
    
    // Fallback a localStorage
    localStorage.setItem('siteConfig', JSON.stringify(config));
    
    return false;
  }
};

// Función para guardar las credenciales de Supabase en la propia base de datos
export const saveSupabaseCredentials = async (supabaseClient: any, credentials: {
  url: string;
  anonKey: string;
  serviceKey: string;
}): Promise<boolean> => {
  try {
    if (!supabaseClient) return false;
    
    // Obtener el registro de configuración existente
    const { data, error: getError } = await supabaseClient
      .from('site_config')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    
    if (getError) {
      console.error('Error al verificar site_config:', getError);
      
      // Si no se puede verificar, intentar insertar un nuevo registro
      const { error: insertError } = await supabaseClient
        .from('site_config')
        .insert({
          restaurant_name: 'WAFOOD',
          whatsapp_number: '18091234567',
          currency: 'RD$',
          opening_hours: '8:00 AM - 10:00 PM',
          installation_status: 'pending',
          supabase_url: credentials.url,
          supabase_anon_key: credentials.anonKey,
          supabase_service_key: credentials.serviceKey
        });
      
      if (insertError) {
        console.error('Error al insertar credenciales en site_config:', insertError);
        
        // Fallback a localStorage
        localStorage.setItem('supabaseUrl', credentials.url);
        localStorage.setItem('supabaseAnonKey', credentials.anonKey);
        localStorage.setItem('supabaseServiceKey', credentials.serviceKey);
        
        return false;
      }
    } else if (data && data.length > 0) {
      // Si existe el registro, actualizarlo con las nuevas credenciales
      const { error: updateError } = await supabaseClient
        .from('site_config')
        .update({
          supabase_url: credentials.url,
          supabase_anon_key: credentials.anonKey,
          supabase_service_key: credentials.serviceKey
        })
        .eq('id', data[0].id);
      
      if (updateError) {
        console.error('Error al actualizar credenciales en site_config:', updateError);
        
        // Fallback a localStorage
        localStorage.setItem('supabaseUrl', credentials.url);
        localStorage.setItem('supabaseAnonKey', credentials.anonKey);
        localStorage.setItem('supabaseServiceKey', credentials.serviceKey);
        
        return false;
      }
    }
    
    // También guardar en localStorage para compatibilidad
    localStorage.setItem('supabaseUrl', credentials.url);
    localStorage.setItem('supabaseAnonKey', credentials.anonKey);
    localStorage.setItem('supabaseServiceKey', credentials.serviceKey);
    
    return true;
  } catch (error) {
    console.error('Error al guardar credenciales de Supabase:', error);
    
    // Fallback a localStorage
    localStorage.setItem('supabaseUrl', credentials.url);
    localStorage.setItem('supabaseAnonKey', credentials.anonKey);
    localStorage.setItem('supabaseServiceKey', credentials.serviceKey);
    
    return false;
  }
};

// Función para obtener las credenciales de Supabase
export const getSupabaseCredentials = async (supabaseClient: any): Promise<{
  url: string;
  anonKey: string;
  serviceKey: string;
} | null> => {
  try {
    if (!supabaseClient) {
      // Si no hay cliente, intentar obtener de localStorage
      const url = localStorage.getItem('supabaseUrl');
      const anonKey = localStorage.getItem('supabaseAnonKey');
      const serviceKey = localStorage.getItem('supabaseServiceKey');
      
      if (url && anonKey && serviceKey) {
        return { url, anonKey, serviceKey };
      }
      
      return null;
    }
    
    // Obtener credenciales de Supabase
    const { data, error } = await supabaseClient
      .from('site_config')
      .select('value')
      .eq('key', 'supabase_credentials')
      .single();
    
    if (error || !data) {
      console.error('Error al obtener credenciales de Supabase:', error);
      
      // Fallback a localStorage
      const url = localStorage.getItem('supabaseUrl');
      const anonKey = localStorage.getItem('supabaseAnonKey');
      const serviceKey = localStorage.getItem('supabaseServiceKey');
      
      if (url && anonKey && serviceKey) {
        return { url, anonKey, serviceKey };
      }
      
      return null;
    }
    
    return data.value;
  } catch (error) {
    console.error('Error al obtener credenciales de Supabase:', error);
    
    // Fallback a localStorage
    const url = localStorage.getItem('supabaseUrl');
    const anonKey = localStorage.getItem('supabaseAnonKey');
    const serviceKey = localStorage.getItem('supabaseServiceKey');
    
    if (url && anonKey && serviceKey) {
      return { url, anonKey, serviceKey };
    }
    
    return null;
  }
};

// Función para crear tablas una por una
export const createTablesIndividually = async (
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    // Crear cliente de Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Crear tabla profiles
    try {
      const { error } = await supabase.rpc('create_table_if_not_exists', {
        table_name: 'profiles',
        table_definition: `
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL DEFAULT 'customer',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `
      });
      
      if (error) console.warn("Error al crear tabla profiles:", error.message);
    } catch (e) {
      console.warn("Error al crear tabla profiles:", e);
      
      // Intentar crear la tabla directamente con SQL
      await executeSQL(supabaseUrl, supabaseServiceKey, `
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL DEFAULT 'customer',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    }
    
    // 2. Habilitar RLS para profiles
    await executeSQL(supabaseUrl, supabaseServiceKey, `
      ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
    `);
    
    // 3. Crear políticas para profiles
    await executeSQL(supabaseUrl, supabaseServiceKey, `
      CREATE POLICY "Perfiles visibles para todos los usuarios autenticados" 
        ON profiles FOR SELECT 
        USING (auth.role() = 'authenticated');
      
      CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
        ON profiles FOR UPDATE 
        USING (auth.uid() = id);
      
      CREATE POLICY "Los administradores pueden hacer todo con los perfiles" 
        ON profiles FOR ALL 
        USING (auth.jwt() ->> 'role' = 'admin');
    `);
    
    // 4. Crear tabla site_config
    await executeSQL(supabaseUrl, supabaseServiceKey, `
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
      
      ALTER TABLE IF EXISTS site_config ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Cualquier usuario puede leer la configuración" 
        ON site_config FOR SELECT 
        TO authenticated, anon;
      
      CREATE POLICY "Solo administradores pueden actualizar la configuración" 
        ON site_config FOR ALL 
        USING (auth.jwt() ->> 'role' = 'admin');
    `);
    
    // 5. Crear tabla appearance_config
    await executeSQL(supabaseUrl, supabaseServiceKey, `
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
      
      ALTER TABLE IF EXISTS appearance_config ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Cualquier usuario puede leer la configuración de apariencia" 
        ON appearance_config FOR SELECT 
        TO authenticated, anon;
      
      CREATE POLICY "Solo administradores pueden actualizar la apariencia" 
        ON appearance_config FOR ALL 
        USING (auth.jwt() ->> 'role' = 'admin');
    `);
    
    // 6. Crear tabla categories
    await executeSQL(supabaseUrl, supabaseServiceKey, `
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        category_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '🍽️',
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Cualquier usuario puede ver las categorías" 
        ON categories FOR SELECT 
        TO authenticated, anon;
      
      CREATE POLICY "Solo administradores pueden modificar las categorías" 
        ON categories FOR ALL 
        USING (auth.jwt() ->> 'role' = 'admin');
    `);
    
    // 7. Crear tabla menu_items
    await executeSQL(supabaseUrl, supabaseServiceKey, `
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
      
      ALTER TABLE IF EXISTS menu_items ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Cualquier usuario puede ver los platos" 
        ON menu_items FOR SELECT 
        TO authenticated, anon;
      
      CREATE POLICY "Solo administradores pueden modificar los platos" 
        ON menu_items FOR ALL 
        USING (auth.jwt() ->> 'role' = 'admin');
    `);

    // 8. Crear tabla orders
    await executeSQL(supabaseUrl, supabaseServiceKey, `
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
      
      ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Los usuarios pueden ver sus propias órdenes" 
        ON orders FOR SELECT 
        USING (auth.uid() = user_id);
      
      CREATE POLICY "Los administradores pueden hacer todo con las órdenes" 
        ON orders FOR ALL 
        USING (auth.jwt() ->> 'role' = 'admin');
      
      CREATE POLICY "Los usuarios anónimos pueden crear órdenes" 
        ON orders FOR INSERT 
        WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');
    `);
    
    // 9. Insertar datos iniciales
    await executeSQL(supabaseUrl, supabaseServiceKey, `
      INSERT INTO site_config (restaurant_name, whatsapp_number, currency, opening_hours, installation_status)
      VALUES ('WHATSFOOD', '18091234567', 'RD$', '8:00 AM - 10:00 PM', 'pending')
      ON CONFLICT DO NOTHING;
      
      INSERT INTO appearance_config (primary_color, accent_color, text_color, background_color, cart_button_color, floating_cart_button_color)
      VALUES ('#004d2a', '#00873e', '#333333', '#FFFFFF', '#003b29', '#003b29')
      ON CONFLICT DO NOTHING;
      
      INSERT INTO categories (category_id, name, icon, display_order)
      VALUES 
        ('bebidas', 'Bebidas', '🥤', 1),
        ('plato-principal', 'Plato Principal', '🍽️', 2),
        ('ensaladas', 'Ensaladas', '🥗', 3),
        ('postres', 'Postres', '🍰', 4)
      ON CONFLICT (category_id) DO NOTHING;
      
      INSERT INTO menu_items (item_id, category_id, name, description, price, image, display_order)
      VALUES 
        ('cafe-cappuccino', 'bebidas', 'Cappuccino', 'Rico espresso con espumosa leche', 120, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1),
        ('sandwich-vegetariano', 'plato-principal', 'Sándwich Vegetariano', 'Vegetales a la parrilla con queso', 90, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1),
        ('ensalada-griega', 'ensaladas', 'Ensalada Griega', 'Vegetales frescos con queso feta', 160, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1),
        ('brownie-chocolate', 'postres', 'Brownie de Chocolate', 'Caliente brownie de chocolate', 120, 'https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff', 1)
      ON CONFLICT (item_id) DO NOTHING;
    `);
    
    return { success: true };
  } catch (error) {
    console.error("Error al crear tablas individualmente:", error);
    return { success: false, error };
  }
};

// Función para crear la función exec_sql
export const createExecSqlFunction = async (
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    console.log("Intentando crear la función exec_sql...");
    
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
    `;
    
    // Intentar crear la función usando el endpoint correcto
    const queryEndpoint = `${supabaseUrl}/rest/v1/query`;
    const response = await fetch(queryEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({
        query: createFunctionSql
      })
    });
    
    if (!response.ok) {
      // Si falla, intentar con el endpoint /sql
      const sqlEndpoint = `${supabaseUrl}/sql`;
      
      const sqlResponse = await fetch(sqlEndpoint, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates,return=minimal'
        },
        body: JSON.stringify({
          query: createFunctionSql
        })
      });
      
      if (!sqlResponse.ok) {
        const errorText = await sqlResponse.text();
        console.error("Error al crear función exec_sql:", errorText);
        return { success: false, error: errorText };
      }
    }
    
    console.log("Función exec_sql creada correctamente");
    return { success: true };
  } catch (error) {
    console.error("Error al crear función exec_sql:", error);
    return { success: false, error };
  }
};

// Función para verificar si la función exec_sql existe
export const checkExecSqlFunction = async (
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ exists: boolean; error?: any }> => {
  try {
    // Crear cliente de Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Intentar usar la función exec_sql con una consulta simple
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1'
    });
    
    if (error) {
      if (error.message.includes('function "exec_sql" does not exist')) {
        return { exists: false };
      } else {
        // Otro tipo de error, pero la función existe
        return { exists: true, error };
      }
    }
    
    return { exists: true };
  } catch (error) {
    console.error("Error al verificar función exec_sql:", error);
    return { exists: false, error };
  }
};

// Función para verificar la existencia de las tablas requeridas
export const checkRequiredTables = async (
  supabaseClient: any,
  customRequiredTables?: string[]
): Promise<{ 
  allTablesExist: boolean; 
  missingTables: string[];
  error?: any;
}> => {
  try {
    // Lista de tablas requeridas para la aplicación
    const requiredTables = customRequiredTables || ['profiles', 'site_config', 'appearance_config', 'categories', 'menu_items', 'orders'];
    const missingTables: string[] = [];
    
    // Consulta para verificar la existencia de tablas
    const checkTableSQL = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1);
    `;
    
    // Verificar si existe la función rpc para consultas SQL
    try {
      const { data, error } = await supabaseClient.rpc('exec_sql', { 
        sql: checkTableSQL.replace('$1', `ARRAY['${requiredTables.join("','")}']`) 
      });
      
      if (error) {
        // Si hay error con la función exec_sql, intentar método alternativo
        console.log("Error al usar exec_sql para verificar tablas:", error);
        return await checkTablesIndividually(supabaseClient, requiredTables);
      }
      
      // Procesar los resultados si no hay error
      if (data && Array.isArray(data)) {
        const existingTables = data.map(row => row.table_name);
        
        for (const table of requiredTables) {
          if (!existingTables.includes(table)) {
            missingTables.push(table);
          }
        }
      } else {
        // Si no hay datos claros, intentar método alternativo
        return await checkTablesIndividually(supabaseClient, requiredTables);
      }
    } catch (rpcError) {
      console.log("Error en RPC para verificar tablas:", rpcError);
      // Intentar método alternativo
      return await checkTablesIndividually(supabaseClient, requiredTables);
    }
    
    return { 
      allTablesExist: missingTables.length === 0, 
      missingTables 
    };
  } catch (error) {
    console.error("Error al verificar tablas requeridas:", error);
    return { 
      allTablesExist: false, 
      missingTables: ['error_verificando_tablas'],
      error 
    };
  }
};

// Función auxiliar para verificar tablas individualmente
export async function checkTablesIndividually(
  supabaseClient: any,
  requiredTables: string[]
): Promise<{ 
  allTablesExist: boolean; 
  missingTables: string[];
  error?: any;
}> {
  try {
    const missingTables: string[] = [];
    
    // Verificar cada tabla individualmente
    for (const table of requiredTables) {
      try {
        // Intentar seleccionar un registro de la tabla
        const { error } = await supabaseClient
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
          missingTables.push(table);
        }
      } catch (tableError) {
        console.warn(`Error al verificar tabla ${table}:`, tableError);
        missingTables.push(table);
      }
    }
    
    return { 
      allTablesExist: missingTables.length === 0, 
      missingTables 
    };
  } catch (error) {
    console.error("Error al verificar tablas individualmente:", error);
    return { 
      allTablesExist: false, 
      missingTables: requiredTables,
      error 
    };
  }
}

// Función para verificar el bucket de almacenamiento (solo verificación, sin creación)
export const checkAndCreateStorageBucket = async (
  supabaseClient: any,
  bucketName: string = 'menu-images'
): Promise<{ 
  exists: boolean; 
  created: boolean;
  error?: any;
}> => {
  try {
    console.log(`Verificando bucket de almacenamiento '${bucketName}'...`);
    
    // Verificar si el bucket existe
    const { data: bucketData, error: bucketError } = await supabaseClient
      .storage
      .getBucket(bucketName);
    
    // Si no hay error, el bucket existe
    if (!bucketError) {
      console.log(`El bucket '${bucketName}' ya existe.`);
      return { exists: true, created: false };
    }
    
    // Si el error es que no se encontró el recurso, informar pero no intentar crearlo
    if (bucketError.message.includes('The resource was not found')) {
      console.log(`El bucket '${bucketName}' no existe, pero no se intentará crear automáticamente.`);
      return { exists: false, created: false };
    }
    
    // Otro tipo de error
    console.error(`Error al verificar bucket '${bucketName}':`, bucketError);
    return { exists: false, created: false, error: bucketError };
  } catch (error) {
    console.error(`Error general al verificar bucket '${bucketName}':`, error);
    return { exists: false, created: false, error };
  }
};
