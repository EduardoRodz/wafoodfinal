import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [localColor, setLocalColor] = useState(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Actualizar localColor cuando value cambia desde props
  useEffect(() => {
    setLocalColor(value);
  }, [value]);
  
  // Función para manejar cambios con debounce
  const handleColorChange = (newColor: string) => {
    setLocalColor(newColor);
    
    // Limpiar el timer anterior si existe
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Crear un nuevo timer para aplicar el cambio después de 500ms
    timerRef.current = setTimeout(() => {
      onChange(newColor);
    }, 500);
  };
  
  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  // Convertir hex a RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Determinar si un color es oscuro
  const isDarkColor = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
  };
  
  // Cerrar el selector al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Colores predefinidos para elegir
  const presetColors = [
    '#FF5733', '#0088CC', '#00CC88', '#8800CC', '#CC0088',
    '#33FF57', '#5733FF', '#FFFF33', '#FF33FF', '#33FFFF',
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
    '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFCC00'
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      
      <div className="flex items-center">
        <button
          type="button"
          className="w-10 h-10 rounded border border-gray-300 mr-2 cursor-pointer"
          style={{ backgroundColor: localColor }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Elegir ${label}`}
        />
        
        <input
          type="text"
          value={localColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded"
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-16 z-10 w-64 bg-white rounded-md shadow-lg border border-gray-200 p-2">
          <div className="grid grid-cols-5 gap-2">
            {presetColors.map((color) => (
              <button
                key={color}
                className="w-8 h-8 rounded-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: color }}
                onClick={() => {
                  handleColorChange(color);
                  setIsOpen(false);
                }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
          
          <div className="mt-2">
            <input
              type="color"
              value={localColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-full h-8"
            />
          </div>
          
          <div className="mt-2 flex justify-end">
            <button
              className="text-sm py-1 px-2 rounded text-white"
              style={{ 
                backgroundColor: localColor,
                color: isDarkColor(localColor) ? '#ffffff' : '#000000'
              }}
              onClick={() => setIsOpen(false)}
            >
              Seleccionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker; 