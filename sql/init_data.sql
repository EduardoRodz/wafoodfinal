-- Inicializar datos de la aplicación

-- Crear usuario administrador con UUID válido
WITH admin_user AS (
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
    VALUES (
        uuid_generate_v4(),
        'eduardorweb@gmail.com',
        '{"role": "admin"}'::jsonb,
        NOW(),
        NOW()
    )
    RETURNING id
)
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT 
    id,
    'eduardorweb@gmail.com',
    'admin',
    NOW(),
    NOW()
FROM admin_user;

-- Insertar configuración inicial del sitio
INSERT INTO site_config (config, created_at, updated_at)
VALUES (
    '{
      "restaurantName": "WHATSFOOD",
      "whatsappNumber": "18092010357",
      "currency": "RD$",
      "openingHours": "8:00 AM - 10:00 PM",
      "theme": {
        "primaryColor": "#004d2a",
        "accentColor": "#00873e",
        "textColor": "#333333",
        "backgroundColor": "#FFFFFF",
        "cartButtonColor": "#003b29",
        "floatingCartButtonColor": "#003b29"
      },
      "cashDenominations": [
        { "value": 200, "label": "RD$200" },
        { "value": 500, "label": "RD$500" },
        { "value": 1000, "label": "RD$1000" },
        { "value": 2000, "label": "RD$2000" }
      ],
      "categories": [
        {
          "id": "bebidas",
          "name": "Bebidas",
          "icon": "🥤",
          "items": [
            {
              "id": "cappuccino",
              "name": "Cappuccino",
              "description": "Rico espresso con espumosa leche",
              "price": 120,
              "image": "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff"
            },
            {
              "id": "cafe-frio",
              "name": "Café Frío",
              "description": "Café helado servido con crema",
              "price": 140,
              "image": "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff"
            },
            {
              "id": "te-verde",
              "name": "Té Verde",
              "description": "Premium té verde japonés",
              "price": 90,
              "image": "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff"
            },
            {
              "id": "soda-lima",
              "name": "Soda de Lima Fresca",
              "description": "Refrescante soda con menta",
              "price": 70,
              "image": "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff"
            }
          ]
        }
      ]
    }'::jsonb,
    NOW(),
    NOW()
);

-- Crear función para insertar contraseña del administrador
CREATE OR REPLACE FUNCTION insert_admin_password()
RETURNS VOID AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Obtener el ID del usuario administrador
    SELECT id INTO admin_id
    FROM auth.users
    WHERE email = 'eduardorweb@gmail.com';
    
    -- Insertar contraseña para el usuario administrador
    UPDATE auth.users 
    SET password = crypt('admin1234', gen_salt('bf'))
    WHERE id = admin_id;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función para insertar la contraseña
SELECT insert_admin_password();

-- Eliminar la función después de usarla
DROP FUNCTION insert_admin_password();

-- Crear función para insertar contraseña del administrador
CREATE OR REPLACE FUNCTION insert_admin_password()
RETURNS VOID AS $$
BEGIN
    -- Insertar contraseña para el usuario administrador
    INSERT INTO auth.users (id, email, password, raw_user_meta_data, created_at, updated_at)
    VALUES (
        'eduardorweb-admin',
        'eduardorweb@gmail.com',
        crypt('admin1234', gen_salt('bf')),
        '{"role": "admin"}'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        password = EXCLUDED.password;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función para insertar la contraseña
SELECT insert_admin_password();

-- Eliminar la función después de usarla
DROP FUNCTION insert_admin_password();
