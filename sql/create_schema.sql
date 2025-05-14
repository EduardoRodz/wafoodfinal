-- Schema para la inicialización de la base de datos en Supabase

-- Configurar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear función auxiliar para verificación de conexión
CREATE OR REPLACE FUNCTION now()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Configuración de seguridad de RLS (Row Level Security)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Tabla para perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permitir acceso a la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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

-- Tabla para la configuración del sitio
CREATE TABLE IF NOT EXISTS public.site_config (
  id SERIAL PRIMARY KEY,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla site_config
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Políticas para site_config
-- Cualquier usuario puede leer la configuración
CREATE POLICY "Cualquier usuario puede leer la configuración" 
  ON site_config FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden actualizar la configuración
CREATE POLICY "Solo administradores pueden actualizar la configuración" 
  ON site_config FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Tabla para órdenes
CREATE TABLE IF NOT EXISTS public.orders (
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

-- Políticas para órdenes
-- Los usuarios pueden ver sus propias órdenes
CREATE POLICY "Los usuarios pueden ver sus propias órdenes" 
  ON orders FOR SELECT 
  USING (auth.uid() = user_id);

-- Los administradores pueden ver todas las órdenes
CREATE POLICY "Los administradores pueden ver todas las órdenes" 
  ON orders FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Los usuarios pueden crear órdenes
CREATE POLICY "Los usuarios pueden crear órdenes" 
  ON orders FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Los administradores pueden actualizar las órdenes
CREATE POLICY "Los administradores pueden actualizar las órdenes" 
  ON orders FOR UPDATE 
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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
