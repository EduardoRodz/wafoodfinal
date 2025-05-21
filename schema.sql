-- Schema para la inicialización de la base de datos en Supabase

-- Configurar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

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
-- DROP TABLE IF EXISTS site_config; -- Comentado para evitar pérdida de datos en producción
CREATE TABLE IF NOT EXISTS site_config (
  id SERIAL PRIMARY KEY,
  restaurant_name TEXT NOT NULL DEFAULT 'WHATSFOOD',
  whatsapp_number TEXT NOT NULL DEFAULT '18091234567',
  currency TEXT NOT NULL DEFAULT 'RD$',
  opening_hours TEXT NOT NULL DEFAULT '8:00 AM - 10:00 PM',
  installation_status TEXT NOT NULL DEFAULT 'pending',
  footer_text TEXT,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_service_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla site_config
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Cualquier usuario puede leer la configuración" ON site_config;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar la configuración" ON site_config;
DROP POLICY IF EXISTS "Permitir acceso anónimo a site_config" ON site_config;

-- Políticas para site_config
-- Cualquier usuario puede leer la configuración
CREATE POLICY "Cualquier usuario puede leer la configuración" 
  ON site_config FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden actualizar la configuración
CREATE POLICY "Solo administradores pueden actualizar la configuración" 
  ON site_config FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Permitir acceso anónimo a site_config para verificar estado de instalación
-- Esto permitirá verificar el estado de instalación sin necesidad de estar autenticado
CREATE POLICY "Permitir acceso anónimo a site_config" 
  ON site_config FOR SELECT 
  USING (true);

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
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

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
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

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
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

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
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

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
-- Función para verificar el estado de instalación
-- ===============================
CREATE OR REPLACE FUNCTION check_installation_status()
RETURNS TEXT AS $$
DECLARE
    status TEXT;
BEGIN
    -- Verificar el estado de instalación en la tabla site_config
    SELECT installation_status INTO status FROM site_config LIMIT 1;
    
    -- Si no hay registros o el status es NULL, retornar 'pending'
    IF status IS NULL THEN
        RETURN 'pending';
    END IF;
    
    RETURN status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- Función para marcar la instalación como completada
-- ===============================
CREATE OR REPLACE FUNCTION mark_installation_completed()
RETURNS TEXT AS $$
BEGIN
    -- Actualizar la tabla site_config
    UPDATE site_config SET installation_status = 'completed';
    
    -- Verificar si la actualización fue exitosa
    IF FOUND THEN
        RETURN 'success';
    ELSE
        -- Si no se actualizó ningún registro, intentar insertar uno nuevo
        INSERT INTO site_config (restaurant_name, whatsapp_number, currency, opening_hours, installation_status)
        VALUES ('WHATSFOOD', '18091234567', 'RD$', '8:00 AM - 10:00 PM', 'completed')
        ON CONFLICT DO NOTHING;
        
        RETURN 'success';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  ('cafe-cappuccino', 'bebidas', 'Cappuccino', 'Rico espresso con espumosa leche', 120, 'https://placehold.co/300x200/jpeg', 1),
  ('sandwich-vegetariano', 'plato-principal', 'Sándwich Vegetariano', 'Vegetales a la parrilla con queso', 90, 'https://placehold.co/300x200/jpeg', 1),
  ('ensalada-griega', 'ensaladas', 'Ensalada Griega', 'Vegetales frescos con queso feta', 160, 'https://placehold.co/300x200/jpeg', 1),
  ('brownie-chocolate', 'postres', 'Brownie de Chocolate', 'Caliente brownie de chocolate', 120, 'https://placehold.co/300x200/jpeg', 1)
ON CONFLICT (item_id) DO NOTHING;

-- Función para ejecutar SQL dinámico
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS TEXT AS $$
BEGIN
  EXECUTE sql;
  RETURN 'success';
EXCEPTION
  WHEN OTHERS THEN
    RETURN SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
