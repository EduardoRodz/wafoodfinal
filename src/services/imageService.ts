import supabase from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Nombre del bucket para almacenar imágenes
const BUCKET_NAME = 'menu-images';

// Función para inicializar el bucket de imágenes (se llama durante la carga de la aplicación)
export const initializeImageStorage = async () => {
  try {
    // Verificar si el bucket existe
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error al listar buckets:', bucketsError);
      return false;
    }
    
    // Si el bucket no existe, crearlo
    if (!buckets?.find(b => b.name === BUCKET_NAME)) {
      const { error: createError } = await supabase
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
    
    // Generar un nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Subir archivo a Supabase Storage
    const { data, error } = await supabase
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
    const { data: urlData } = supabase
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
    const { error } = await supabase
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