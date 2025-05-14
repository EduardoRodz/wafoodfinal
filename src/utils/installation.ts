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
    const sqlEndpoint = `${supabaseUrl}/rest/v1/sql`;
    
    const response = await fetch(sqlEndpoint, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al ejecutar SQL: ${errorText}`);
    }

    return { success: true };
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

// Función para guardar la configuración del restaurante
export const saveRestaurantConfig = async (supabaseClient: any, config: any) => {
  if (!supabaseClient) return false;

  try {
    const { error } = await supabaseClient
      .from('site_config')
      .upsert({ config });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al guardar la configuración:', error);
    return false;
  }
};
