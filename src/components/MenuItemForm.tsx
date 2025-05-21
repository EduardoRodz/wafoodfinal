import React, { useState, useRef } from 'react';
import { Crop, Upload, X, Check, AlertTriangle, Image } from 'lucide-react';
import ImageCropDialog from './ImageCropDialog';
import { uploadImage } from '../../services/imageService';
import { dataURLtoFile, fetchImageAsLocalURL, optimizeImageQuality } from '../../utils/imageCrop';
import { useConfig } from '../context/ConfigContext';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

interface MenuItemFormProps {
  item: MenuItem;
  onChange: (item: MenuItem) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
  generateId?: (name: string) => string;
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({
  item,
  onChange,
  onSave,
  onCancel,
  isNew = false,
  generateId
}) => {
  const { config } = useConfig();
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cuando cambia el nombre, actualizar automáticamente el ID si es necesario
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValidationErrors(prev => ({ ...prev, name: '' }));
    
    if (isNew && generateId && name.trim() !== '') {
      // Si es un item nuevo y tenemos la función generadora, actualizamos el ID
      const newId = generateId(name);
      onChange({ ...item, name, id: newId });
    } else {
      // Si no, solo actualizamos el nombre
      onChange({ ...item, name });
    }
  };
  
  // Función para manejar la carga de archivos de imagen
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const file = files[0];
      
      // Crear una URL temporal para mostrar la imagen antes de recortarla
      const tempUrl = URL.createObjectURL(file);
      setTempImageUrl(tempUrl);
      
      // Abrir el diálogo de recorte
      setCropDialogOpen(true);
    } catch (error: any) {
      console.error('Error al preparar la imagen:', error);
      setUploadError(error.message || 'Error al cargar la imagen');
      setIsUploading(false);
    }
  };
  
  // Función para abrir el diálogo de recorte con la imagen actual
  const handleCropExistingImage = async () => {
    if (!item.image) return;
    
    setIsProcessingImage(true);
    setUploadError(null);
    
    try {
      // Si es una URL externa, primero descargamos la imagen para evitar problemas de CORS
      if (item.image.startsWith('http')) {
        // Verificar si la imagen es del mismo dominio o de nuestro storage
        const isSameDomain = window.location.origin && item.image.startsWith(window.location.origin);
        const isSupabaseStorage = item.image.includes('supabase') && item.image.includes('storage');
        
        if (!isSameDomain && !isSupabaseStorage) {
          try {
            // Para imágenes externas, convertirlas a imágenes locales
            const localUrl = await fetchImageAsLocalURL(item.image);
            setTempImageUrl(localUrl);
          } catch (fetchError) {
            console.error('Error al descargar la imagen externa:', fetchError);
            setUploadError('No se pudo cargar la imagen externa. Intenta subir una imagen desde tu dispositivo.');
            setIsProcessingImage(false);
            return;
          }
        } else {
          // Para imágenes de nuestro dominio, usarlas directamente
          setTempImageUrl(item.image);
        }
      } else {
        // Es una URL de datos o una URL local
        setTempImageUrl(item.image);
      }
      
      setCropDialogOpen(true);
    } catch (error: any) {
      console.error('Error al preparar imagen para recorte:', error);
      setUploadError('No se pudo preparar la imagen para recortar. Intenta subir una imagen de tu dispositivo.');
    } finally {
      setIsProcessingImage(false);
    }
  };
  
  // Función para manejar la finalización del recorte
  const handleCropComplete = async (croppedImageUrl: string) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Optimizar la calidad de la imagen antes de subirla
      const optimizedImageUrl = await optimizeImageQuality(croppedImageUrl, 0.92);
      
      // Convertir la imagen base64 a un archivo File
      const timestamp = Date.now();
      const filename = `cropped-image-${timestamp}.jpg`;
      const file = dataURLtoFile(optimizedImageUrl, filename);
      
      // Subir la imagen recortada
      const result = await uploadImage(file);
      
      // Asegurar que la URL tenga una proporción de aspecto 1:1 (cuadrada)
      // Al añadir un parámetro de tiempo se forzará la recarga y evitará problemas de caché
      const imageUrl = `${result.url}?t=${timestamp}&cropped=true&ratio=1:1`;
      
      console.log('Imagen recortada cargada exitosamente:', imageUrl);
      
      // Actualizar el estado con la URL de la imagen recortada
      onChange({ ...item, image: imageUrl });
    } catch (error: any) {
      console.error('Error al subir imagen recortada:', error);
      setUploadError(error.message || 'Error al subir la imagen');
    } finally {
      setIsUploading(false);
      setCropDialogOpen(false);
      
      // Limpiar la URL temporal y liberar recursos
      if (tempImageUrl && tempImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(tempImageUrl);
      }
      setTempImageUrl(null);
    }
  };
  
  // Función para cancelar el recorte
  const handleCropCancel = () => {
    setCropDialogOpen(false);
    
    // Liberar memoria si es una URL de objeto
    if (tempImageUrl && tempImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(tempImageUrl);
    }
    setTempImageUrl(null);
    
    // Si estábamos en proceso de subida, reseteamos el estado
    if (isUploading) {
      setIsUploading(false);
    }
  };
  
  // Función para abrir el selector de archivos
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Validar el formulario antes de guardar
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // Validar nombre
    if (!item.name.trim()) {
      errors.name = 'El nombre del plato es obligatorio';
    }

    // Validar precio
    if (item.price <= 0) {
      errors.price = 'El precio debe ser mayor que cero';
    }

    // Si hay errores, mostrarlos y no continuar
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Si todo está bien, guardar
    onSave();
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sección de imagen */}
      <div>
        <label className="block text-sm font-medium mb-1">Imagen del plato</label>
        <div className="mb-4">
          <div className="relative aspect-video max-w-md border border-gray-300 rounded overflow-hidden bg-gray-100 mb-3">
            <div className="w-full h-full flex items-center justify-center">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name || 'Vista previa'}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://placehold.co/400x300/jpeg';
                  }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="text-gray-400 flex flex-col items-center p-4 text-center">
                  <Image size={48} strokeWidth={1} />
                  <p className="mt-2 text-sm">Sin imagen</p>
                </div>
              )}
              
              {(isUploading || isProcessingImage) && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-r-2 border-white"></div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={isUploading || isProcessingImage}
              className="flex items-center gap-1 py-2 px-3 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
            >
              <Upload size={16} />
              <span>Subir imagen</span>
            </button>
            
            {item.image && (
              <>
                <button
                  type="button"
                  onClick={handleCropExistingImage}
                  disabled={isUploading || isProcessingImage}
                  className="flex items-center gap-1 py-2 px-3 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  <Crop size={16} />
                  <span>Recortar</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => onChange({ ...item, image: 'https://placehold.co/400x300/jpeg' })}
                  disabled={isUploading || isProcessingImage}
                  className="flex items-center gap-1 py-2 px-3 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  <X size={16} />
                  <span>Quitar</span>
                </button>
              </>
            )}
          </div>
          
          {uploadError && (
            <div className="mt-2 p-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm flex items-start">
              <AlertTriangle size={16} className="mr-1 flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Detalles del plato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del plato *</label>
          <input
            type="text"
            value={item.name}
            onChange={handleNameChange}
            className={`w-full p-2 border rounded ${validationErrors.name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ej. Hamburguesa Especial"
            autoFocus
          />
          {validationErrors.name && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Precio *</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">{config.currency} </span>
            <input
              type="number"
              value={item.price}
              onChange={(e) => {
                setValidationErrors(prev => ({ ...prev, price: '' }));
                onChange({ ...item, price: parseFloat(e.target.value) || 0 });
              }}
              className={`w-full p-2 pl-16 border rounded ${validationErrors.price ? 'border-red-500' : 'border-gray-300'}`}
              style={{ paddingLeft: '4rem' }}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          {validationErrors.price && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.price}</p>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <textarea
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded"
          rows={3}
          placeholder="Describe los ingredientes o características especiales del plato"
        />
      </div>
      
      <div className="pt-2 border-t flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-4 border border-gray-300 rounded shadow-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="py-2 px-4 bg-green-600 text-white rounded shadow-sm hover:bg-green-700 flex items-center gap-1"
          disabled={isUploading || isProcessingImage}
        >
          <Check size={16} />
          Guardar
        </button>
      </div>
      
      {/* Diálogo de recorte de imagen */}
      {cropDialogOpen && tempImageUrl && (
        <ImageCropDialog
          imageUrl={tempImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1} // Cambiado de 4/3 a 1 para hacer el recorte cuadrado
        />
      )}
    </form>
  );
};

export default MenuItemForm; 