import { getSupabase, getSupabaseAdmin } from '../lib/supabase';

// Nombre del bucket para imágenes del menú
const MENU_IMAGES_BUCKET = 'menu-images';

// Variable para controlar el estado de la inicialización del bucket
let bucketInitialized = false;

// Función para inicializar el almacenamiento de imágenes
export const initializeImageStorage = async () => {
  // Si ya inicializamos el bucket en esta sesión, no repetir el proceso
  if (bucketInitialized) {
    console.log('El almacenamiento de imágenes ya fue inicializado en esta sesión');
    return true;
  }

  try {
    // Verificar primero si el cliente Supabase está inicializado
    const supabase = await getSupabase();
    if (!supabase) {
      console.log('Cliente Supabase no inicializado, se omitirá la inicialización del bucket');
      return false;
    }

    console.log('Verificando bucket de imágenes de menú...');
    
    // Verificar si el bucket de imágenes existe
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      // Si hay un error de autorización, lo manejamos silenciosamente
      if (bucketsError.message?.includes('apikey') || 
          bucketsError.message?.includes('401') || 
          bucketsError.message?.includes('unauthorized')) {
        console.log('No se pudo verificar buckets por falta de autenticación, saltando este paso');
        return true; // Devolver true para continuar con la aplicación
      }
      
      console.error('Error al verificar buckets de almacenamiento:', bucketsError);
      return false;
    }
    
    // Verificar si el bucket de imágenes de menú existe
    const menuBucketExists = buckets?.some(bucket => bucket.name === MENU_IMAGES_BUCKET);
    
    if (menuBucketExists) {
      console.log(`Bucket '${MENU_IMAGES_BUCKET}' encontrado, no es necesario crearlo`);
      bucketInitialized = true;
      return true;
    }
    
    console.log(`El bucket '${MENU_IMAGES_BUCKET}' no existe, intentando crearlo...`);
      
    try {
      // Crear el bucket para imágenes de menú
      const supabaseAdmin = await getSupabaseAdmin();
      const { error: createError } = await supabaseAdmin.storage.createBucket(MENU_IMAGES_BUCKET, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      });
      
      if (createError) {
        // Si el error es que el recurso ya existe, es una condición de carrera y está bien
        if (createError.message === 'The resource already exists') {
          console.log(`El bucket '${MENU_IMAGES_BUCKET}' ya existe (posible condición de carrera)`);
          bucketInitialized = true;
          return true;
        }
          
        // Si hay un error de autorización, continuamos con funcionalidad limitada
        if (createError.message?.includes('apikey') || 
            createError.message?.includes('401') ||
            createError.message?.includes('400') ||
            createError.message?.includes('unauthorized')) {
          console.log('No se pudo crear el bucket por falta de permisos, la aplicación continuará con funcionalidad limitada');
          return true;
        }
          
        console.error(`Error al crear bucket '${MENU_IMAGES_BUCKET}':`, createError);
        return true; // Seguir a pesar del error
      }
      
      console.log(`Bucket '${MENU_IMAGES_BUCKET}' creado correctamente, configurando políticas...`);
      
      // Configurar políticas de acceso público para el bucket
      try {
        const bucketSQL = `
          -- Política para permitir a todos los usuarios autenticados leer imágenes
          CREATE POLICY IF NOT EXISTS "Imágenes de menú accesibles públicamente" 
          ON storage.objects FOR SELECT 
            USING (bucket_id = '${MENU_IMAGES_BUCKET}');

          -- Política para permitir a los administradores subir imágenes
          CREATE POLICY IF NOT EXISTS "Solo administradores pueden subir imágenes" 
          ON storage.objects FOR INSERT 
            WITH CHECK (bucket_id = '${MENU_IMAGES_BUCKET}' AND auth.jwt() ->> 'role' = 'admin');

          -- Política para permitir a los administradores modificar imágenes
          CREATE POLICY IF NOT EXISTS "Solo administradores pueden modificar imágenes" 
          ON storage.objects FOR UPDATE 
            USING (bucket_id = '${MENU_IMAGES_BUCKET}' AND auth.jwt() ->> 'role' = 'admin');

          -- Política para permitir a los administradores eliminar imágenes
          CREATE POLICY IF NOT EXISTS "Solo administradores pueden eliminar imágenes" 
          ON storage.objects FOR DELETE 
            USING (bucket_id = '${MENU_IMAGES_BUCKET}' AND auth.jwt() ->> 'role' = 'admin');
        `;

        const supabaseAdminForRpc = await getSupabaseAdmin();
        const { error: sqlError } = await supabaseAdminForRpc.rpc('exec_sql', { sql: bucketSQL });
        
        if (sqlError) {
          console.log("Error al configurar políticas del bucket:", sqlError);
        } else {
          console.log(`Políticas para el bucket '${MENU_IMAGES_BUCKET}' configuradas correctamente`);
        }
      } catch (sqlError) {
        console.log("Error al ejecutar SQL para configurar bucket, continuando sin políticas:", sqlError);
      }
      
      bucketInitialized = true;
      return true;
    } catch (error) {
      console.error(`Error durante la creación del bucket '${MENU_IMAGES_BUCKET}':`, error);
      return true; // Continuar a pesar del error
    }
  } catch (error) {
    console.error('Error general en inicialización de almacenamiento:', error);
    return true; // Devolver true para continuar con la aplicación
  }
};

// Función para subir una imagen al bucket
export const uploadMenuImage = async (file: File, fileName: string): Promise<string | null> => {
  try {
    // Intentar inicializar el bucket si aún no se ha hecho
    if (!bucketInitialized) {
      await initializeImageStorage();
    }
    
    const uniqueFileName = `${Date.now()}-${fileName}`;
    
    const supabaseAdmin = await getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage
      .from(MENU_IMAGES_BUCKET)
      .upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error al subir imagen:', error);
      return null;
    }
    
    // Obtener la URL pública de la imagen
    const supabaseAdminForUrl = await getSupabaseAdmin();
    const { data: urlData } = supabaseAdminForUrl.storage
      .from(MENU_IMAGES_BUCKET)
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error al subir imagen:', error);
    return null;
  }
};

// Función para eliminar una imagen del bucket
export const deleteMenuImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extraer el nombre del archivo de la URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin.storage
      .from(MENU_IMAGES_BUCKET)
      .remove([fileName]);
    
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