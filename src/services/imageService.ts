import { getSupabase, getSupabaseAdmin } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Nombre del bucket para almacenar imágenes
const BUCKET_NAME = 'menu-images';

// Función para inicializar el bucket de imágenes (se llama durante la carga de la aplicación)
export const initializeImageStorage = async () => {
  try {
    // Verificar si el bucket existe
    const supabase = await getSupabase();
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error al listar buckets:', bucketsError);
      return false;
    }
    
    // Si el bucket no existe, crearlo
    if (!buckets?.find(b => b.name === BUCKET_NAME)) {
      const supabaseAdmin = await getSupabaseAdmin();
      const { error: createError } = await supabaseAdmin
        .storage
        .createBucket(BUCKET_NAME, {
          public: true, // Hacer públicas las imágenes para que sean accesibles
        });
      
      if (createError) {
        console.error('Error al crear bucket de imágenes:', createError);
        return false;
      }
      
      console.log(`Bucket ${BUCKET_NAME} creado correctamente`);
    }
    
    return true;
  } catch (error) {
    console.error('Error al inicializar almacenamiento de imágenes:', error);
    return false;
  }
};

// Función para subir una imagen desde un archivo
export const uploadImage = async (file: File) => {
  try {
    // Validar el archivo
    if (!file || !(file instanceof File)) {
      throw new Error('Archivo inválido');
    }
    
    // Validar el tipo de archivo (solo imágenes)
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }
    
    // Limitar el tamaño (5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new Error('La imagen no puede ser mayor a 5MB');
    }
    
    // Extraer extensión del archivo o usar jpg por defecto para imágenes base64
    let fileExt = file.name.split('.').pop();
    if (!fileExt || fileExt === 'blob' || fileExt.length > 5) {
      // Si no tiene extensión o es un blob, determinar el tipo basado en el tipo MIME
      const mimeTypes: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg'
      };
      fileExt = mimeTypes[file.type] || 'jpg';
    }
    
    // Generar un nombre único para el archivo
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    console.log('Subiendo archivo recortado:', {
      nombre: file.name,
      tipo: file.type,
      tamaño: `${(file.size / 1024).toFixed(2)} KB`,
      extensiónDetectada: fileExt
    });
    
    // Obtener el cliente admin de Supabase
    const supabaseAdmin = await getSupabaseAdmin();
    
    // Subir archivo a Supabase Storage usando supabaseAdmin para tener permisos suficientes
    const { data, error } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error al subir imagen:', error);
      throw error;
    }
    
    // Obtener la URL pública
    const { data: urlData } = supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return {
      path: filePath,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error en servicio de imágenes:', error);
    throw error;
  }
};

// Función para eliminar una imagen
export const deleteImage = async (path: string) => {
  try {
    // Obtener el cliente admin de Supabase
    const supabaseAdmin = await getSupabaseAdmin();
    
    const { error } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .remove([path]);
    
    if (error) {
      console.error('Error al eliminar imagen:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    return false;
  }
}; 