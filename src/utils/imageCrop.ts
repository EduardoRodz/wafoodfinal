/**
 * Utilidades para el procesamiento de imágenes
 */

/**
 * Convierte una URL de imagen en base64 a un archivo Blob/File
 * @param dataUrl La URL de datos en formato base64
 * @param filename El nombre del archivo a generar
 * @returns Un objeto File creado a partir de la imagen
 */
export const dataURLtoFile = (dataUrl: string, filename: string): File => {
  // Extraer la información de la data URL
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  // Convertir a un array binario
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  // Crear un objeto File
  return new File([u8arr], filename, { type: mime });
};

/**
 * Descarga una imagen externa y la convierte en un objeto Blob local para evitar problemas de CORS
 * @param imageUrl URL de la imagen externa
 * @returns Promise que resuelve a una URL de objeto local
 */
export const fetchImageAsLocalURL = async (imageUrl: string): Promise<string> => {
  try {
    // Verificar si ya es una URL de blob
    if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    
    // Usar un proxy CORS si la imagen es externa
    let urlToFetch = imageUrl;
    
    // Para imágenes externas, podemos intentar usar un proxy CORS
    if (imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname)) {
      // Opciones de proxy: cors-anywhere, allorigins, o un proxy propio
      // Ejemplo: urlToFetch = `https://cors-anywhere.herokuapp.com/${imageUrl}`;
      // Nota: Muchos proxies públicos tienen limitaciones, considera implementar uno propio
      
      // Intentamos primero sin proxy
      try {
        const response = await fetch(imageUrl, {
          mode: 'cors',
          cache: 'no-cache',
          credentials: 'omit'
        });
        
        if (response.ok) {
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn('Error al obtener la imagen sin proxy:', err);
        // Continuamos con el método alternativo
      }
    }
    
    // Método alternativo: crear un elemento de imagen y usar canvas
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Crear un canvas para convertir la imagen
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          // Dibujar la imagen en el canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto 2D'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          // Convertir a formato de datos con alta calidad
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          
          // Si es una data URL, la devolvemos directamente
          if (dataUrl.startsWith('data:')) {
            resolve(dataUrl);
          } else {
            // Si por alguna razón falla, convertimos manualmente
            const blob = dataURLtoFile(dataUrl, 'image.jpg');
            resolve(URL.createObjectURL(blob));
          }
        } catch (err) {
          reject(new Error(`Error al procesar la imagen en canvas: ${err}`));
        }
      };
      
      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen desde la URL proporcionada'));
      };
      
      // Añadir un parámetro aleatorio para evitar caché
      img.src = `${urlToFetch}${urlToFetch.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`;
    });
  } catch (error) {
    console.error('Error descargando imagen externa:', error);
    throw error;
  }
};

/**
 * Carga una imagen y la prepara para ser usada en un canvas
 * @param imageUrl URL de la imagen (puede ser remota o local)
 * @returns Promise que resuelve a un objeto HTMLImageElement con crossOrigin configurado
 */
export const loadCrossOriginImage = (imageUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    
    // Intentar primero con un parámetro para evitar caché
    img.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}timestamp=${Date.now()}`;
  });
};

/**
 * Redimensiona una imagen para mantenerla bajo un tamaño máximo
 * @param file El archivo de imagen original
 * @param maxSizeInMB El tamaño máximo en MB que debe tener la imagen
 * @returns Una promesa que resuelve con el archivo redimensionado o el original si ya es menor que el tamaño
 */
export const resizeImageIfNeeded = (file: File, maxSizeInMB = 1): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Si el archivo ya es menor que el tamaño máximo, devolverlo directamente
    if (file.size / 1024 / 1024 < maxSizeInMB) {
      resolve(file);
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Calcular las nuevas dimensiones para mantener la relación de aspecto
        let width = img.width;
        let height = img.height;
        
        // Reducir la calidad/dimensiones gradualmente hasta que el tamaño sea adecuado
        let quality = 0.9;
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        
        // Redimensionar la imagen manteniendo la relación de aspecto
        const MAX_WIDTH = 1500;
        const MAX_HEIGHT = 1500;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (!ctx) {
          reject(new Error('No se pudo crear el contexto 2D'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir el canvas a una data URL con calidad reducida
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Convertir la data URL a un archivo
        const newFile = dataURLtoFile(dataUrl, file.name);
        resolve(newFile);
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar la imagen para redimensionar'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo para redimensionar'));
    };
  });
};

/**
 * Optimiza una imagen base64 para mejorar la calidad visual sin aumentar demasiado el tamaño
 * @param dataUrl URL de datos de la imagen
 * @param quality Calidad de la imagen (0-1)
 * @returns Una promesa que resuelve con la URL de datos optimizada
 */
export const optimizeImageQuality = (dataUrl: string, quality = 0.95): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto 2D'));
        return;
      }
      
      // Usar mejor algoritmo de escalado
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Dibujar la imagen
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Convertir a formato JPEG con alta calidad
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(optimizedDataUrl);
    };
    
    img.onerror = () => {
      reject(new Error('Error al cargar la imagen para optimizar'));
    };
    
    img.src = dataUrl;
  });
}; 
 
 