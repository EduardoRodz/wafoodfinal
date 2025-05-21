# Seguridad en WaFood

Este documento describe las mejoras de seguridad y configuración implementadas en el proyecto WaFood.

## Mejoras de Seguridad

### 1. Configuración Segura de Supabase

Se ha implementado una solución robusta para manejar las credenciales de Supabase de forma segura:

- Eliminación de claves hardcodeadas en el código fuente
- Uso de variables de entorno para almacenar credenciales sensibles:
  - `VITE_SUPABASE_URL`: URL de tu proyecto Supabase
  - `VITE_SUPABASE_ANON_KEY`: Clave anónima para operaciones de cliente
  - `VITE_SUPABASE_SERVICE_KEY`: Clave de servicio para operaciones administrativas

### 2. Inicialización Asíncrona Segura

Se ha reescrito la inicialización de Supabase para resolver los problemas de "top-level await":

- Implementación de un patrón de inicialización asíncrona que no bloquea
- Funciones de acceso que garantizan la inicialización antes de usar los clientes
- Manejo robusto de errores durante la inicialización

### 3. Manejo de Roles de Usuario

Mejoras en el sistema de roles de usuario:

- Verificación en múltiples fuentes (metadatos, tablas profiles, user_roles)
- Diagnóstico mejorado cuando un usuario con rol admin aparece como staff
- Validación de formato de claves JWT para evitar problemas de autenticación

## Guía de Uso

### Configuración de Variables de Entorno

1. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-key
VITE_SUPABASE_SERVICE_KEY=tu-clave-service-key
```

2. Como alternativa, estas claves pueden almacenarse en localStorage a través del instalador:
   - `supabaseUrl`
   - `supabaseAnonKey`
   - `supabaseServiceKey`

### Acceso a Supabase en el Código

Para acceder a los clientes de Supabase, utiliza las funciones asíncronas proporcionadas:

```typescript
import { getSupabase, getSupabaseAdmin } from '../lib/supabase';

// Cliente regular
const miFunction = async () => {
  const supabase = await getSupabase();
  // Usar supabase aquí...
}

// Cliente con permisos admin
const miFunctionAdmin = async () => {
  const supabaseAdmin = await getSupabaseAdmin();
  // Usar supabaseAdmin aquí...
}
```

## Resolución de Problemas

### Error de "Top-level await is not available"

Este error ha sido resuelto mediante la eliminación de cualquier uso de `await` a nivel de módulo. Ahora toda la inicialización se realiza de forma asíncrona sin bloquear.

### Error "Cannot read properties of null"

Este error ocurría cuando se intentaba usar el cliente Supabase antes de su inicialización. La nueva implementación garantiza que los clientes estén inicializados antes de su uso.

### Problemas con Roles de Usuario

Si un usuario con rol admin aparece como staff en la interfaz, verifica:

1. La tabla `user_roles` en la base de datos
2. Los metadatos del usuario en la autenticación de Supabase
3. La función `getCurrentUserRole()` que determina el rol del usuario

## Seguridad Adicional

- Se han implementado protecciones para evitar la exposición accidental de claves en la consola
- Se validan las claves JWT antes de usarlas
- Se ha mejorado el manejo de errores para proporcionar mensajes claros 