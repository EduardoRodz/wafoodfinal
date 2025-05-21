import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2 } from 'lucide-react';

interface ImageCropDialogProps {
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
  aspectRatio = 4/3, // Default aspect ratio cambiado a 4:3 (rectangular)
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Inicializar el recorte en el centro cuando la imagen se carga
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    
    // Calcular el tamaño inicial del recorte (más pequeño en móviles)
    const initialWidth = isMobile ? 70 : 80;
    
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: initialWidth,
        },
        aspectRatio,
        width,
        height
      ),
      width,
      height
    );

    setCrop(initialCrop);
    setLoading(false);
  }

  // Crear una imagen con crossOrigin configurado para prevenir problemas de CORS
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous'; // Establecer crossOrigin para permitir acceso a datos de la imagen
    image.src = imageUrl;
    image.onload = () => {
      if (imgRef.current) {
        imgRef.current.crossOrigin = 'anonymous';
      }
    };
    image.onerror = () => {
      setError('No se pudo cargar la imagen. Intenta con otra imagen o verifica la URL.');
    };
  }, [imageUrl]);

  // Actualizar el canvas para la vista previa cuando cambia el crop
  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      // Dibujar la imagen recortada en el canvas
      const image = imgRef.current;
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return;
      }

      // Obtener dimensiones
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      
      // Preservar proporción de píxeles
      const pixelRatio = window.devicePixelRatio;
      
      // Dimensiones del canvas final (en pixeles reales)
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;
      
      // Establecer dimensiones del canvas con precisión de píxeles
      canvas.width = cropWidth * pixelRatio;
      canvas.height = cropHeight * pixelRatio;
      
      // Configurar calidad de renderizado
      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';
      ctx.imageSmoothingEnabled = true;
      
      // Limpiar el canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Preparar para rotación si es necesario
      if (rotation !== 0) {
        ctx.save();
        ctx.translate(cropWidth / 2, cropHeight / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-cropWidth / 2, -cropHeight / 2);
      }
      
      try {
        // Dibujar la imagen recortada
        ctx.drawImage(
          image,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );
        
        // Restaurar el contexto si hubo rotación
        if (rotation !== 0) {
          ctx.restore();
        }
      } catch (e) {
        console.error('Error al dibujar en el canvas:', e);
        setError('Error al procesar la imagen. Intenta con otra imagen.');
      }
    }
  }, [completedCrop, rotation]);

  // Función para aplicar el recorte y devolver la imagen recortada
  const handleCropComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!previewCanvasRef.current || !completedCrop) {
      setError('No se ha realizado ningún recorte.');
      return;
    }
    
    try {
      // Obtener la imagen como URL data con calidad mejorada
      const croppedImageUrl = previewCanvasRef.current.toDataURL('image/jpeg', 0.95);
      onCropComplete(croppedImageUrl);
    } catch (e) {
      console.error('Error al exportar imagen recortada:', e);
      setError(
        'No se pudo exportar la imagen recortada debido a restricciones de seguridad. ' +
        'Intenta subir la imagen directamente desde tu dispositivo en lugar de usar una URL externa.'
      );
    }
  };

  // Función para cancelar el recorte
  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onCancel();
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleRotate = (e: React.MouseEvent) => {
    // Prevenir cualquier propagación del evento que pudiera cerrar el diálogo
    e.stopPropagation();
    e.preventDefault();
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullScreen = (e: React.MouseEvent) => {
    // Prevenir cualquier propagación del evento que pudiera cerrar el diálogo
    e.stopPropagation();
    e.preventDefault();
    setIsFullScreen(prev => !prev);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-0">
      <div className={`bg-white rounded-lg shadow-xl ${isFullScreen ? 'w-full h-full max-w-none max-h-none' : 'max-w-xl md:max-w-4xl w-full h-[90vh] md:h-auto md:max-h-[90vh]'} flex flex-col overflow-hidden`}>
        <div className="p-3 md:p-4 border-b flex justify-between items-center">
          <h3 className="text-base md:text-lg font-medium text-gray-900">Recortar imagen</h3>
          <div className="flex gap-1 md:gap-2">
            <button
              type="button"
              onClick={handleRotate}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              title="Rotar 90°"
              aria-label="Rotar 90 grados"
            >
              <RotateCw size={18} />
            </button>
            <button
              type="button"
              onClick={toggleFullScreen}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              title={isFullScreen ? "Minimizar" : "Pantalla completa"}
              aria-label={isFullScreen ? "Minimizar" : "Pantalla completa"}
            >
              {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button 
              type="button"
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              title="Cerrar"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className={`flex-1 overflow-auto ${isMobile ? 'flex flex-col' : 'p-4 flex flex-col md:flex-row'} gap-2 md:gap-4`}>
          <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] md:min-h-[300px]">
            {loading && <div className="text-center p-6">Cargando imagen...</div>}
            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded-md mb-4 max-w-md mx-auto">
                {error}
              </div>
            )}
            
            <div className={`${isFullScreen ? 'h-[60vh]' : isMobile ? 'h-[45vh]' : 'max-h-[50vh]'} w-full overflow-auto relative group`}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                className="max-w-full h-full flex items-center justify-center"
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Imagen para recortar"
                  onLoad={onImageLoad}
                  style={{ 
                    maxHeight: '100%',
                    maxWidth: '100%',
                    transform: `scale(${zoom}) rotate(${rotation}deg)`
                  }}
                  crossOrigin="anonymous"
                  className="touch-manipulation"
                />
              </ReactCrop>
              
              <div className="absolute bottom-2 right-2 bg-white rounded-lg shadow-md p-1 flex gap-1">
                <button 
                  type="button"
                  onClick={handleZoomOut} 
                  className="p-2 rounded hover:bg-gray-100 touch-manipulation"
                  title="Reducir zoom"
                  aria-label="Reducir zoom"
                >
                  <ZoomOut size={isMobile ? 20 : 18} />
                </button>
                <button 
                  type="button"
                  onClick={handleZoomIn} 
                  className="p-2 rounded hover:bg-gray-100 touch-manipulation"
                  title="Aumentar zoom"
                  aria-label="Aumentar zoom"
                >
                  <ZoomIn size={isMobile ? 20 : 18} />
                </button>
              </div>
            </div>
            
            <div className="mt-2 text-sm text-gray-500 text-center px-2 md:px-4">
              {isMobile ? (
                "Arrastra para mover, usa los puntos para redimensionar" 
              ) : (
                "Arrastra para mover, usa los controles de las esquinas para redimensionar"
              )}
              <br />
              Se utilizará un formato rectangular (4:3) para que coincida con el diseño del menú.
            </div>
          </div>
          
          <div className={`${isMobile ? 'px-3 pb-3' : 'md:w-64'} space-y-3`}>
            <div>
              <h4 className="text-sm font-medium mb-2">Vista previa:</h4>
              <div className="border rounded-lg p-2 bg-gray-50">
                <div className="overflow-hidden" style={{ 
                  width: '100%', 
                  height: isMobile ? '100px' : '150px', 
                  background: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAA/SURBVHjaYvz//z8DJYCJgUIwasioIaOGjBoyCAxhZPwfCob8evVfBtKVXP+jw3CYGzJqyKgho4YMckMACDAAJ6QbN3ZqKw4AAAAASUVORK5CYII=") repeat' 
                }}>
                  <canvas
                    ref={previewCanvasRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>
            </div>
            
            {error && (
              <div className="text-sm mt-2 text-amber-600 bg-amber-50 p-2 rounded-md">
                <p><strong>Recomendación:</strong> Para un mejor funcionamiento, sube imágenes desde tu dispositivo local en lugar de usar URLs externas.</p>
              </div>
            )}

            {isMobile && !error && (
              <div className="text-sm mt-2 text-blue-600 bg-blue-50 p-2 rounded-md">
                <p><strong>Consejo:</strong> Puedes girar la pantalla para obtener una mejor vista de la imagen.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-3 md:p-4 border-t flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-3 py-2 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 touch-manipulation"
          >
            Cancelar
          </button>
          <button
            onClick={handleCropComplete}
            className="px-3 py-2 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 touch-manipulation"
            disabled={!completedCrop || !!error}
          >
            <Check size={16} /> Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropDialog; 