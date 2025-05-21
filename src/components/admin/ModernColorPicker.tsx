import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Palette, Check, X, ChevronDown } from 'lucide-react';
import { Slider } from '../ui/slider';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';

interface ModernColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const defaultPresets = [
  // Material Design colors
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
  '#ff5722', '#795548', '#9e9e9e', '#607d8b', '#000000',

  // Additional palette
  '#ffffff', '#f1f1f1', '#d9d9d9', '#808080', '#424242',
  '#2962ff', '#00c853', '#aa00ff', '#c51162', '#ffab00',
  '#304ffe', '#00bfa5', '#d50000', '#6200ea', '#aeea00'
];

// Función para validar formato hex
const isValidHex = (color: string) => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

// Función para asegurar que siempre tengamos un valor hex válido
const getSafeColor = (color: string | undefined | null): string => {
  if (!color) return '#000000';
  
  // Si es un valor hex válido, usarlo
  if (isValidHex(color)) return color;
  
  // Si es rgba, extraer componentes y convertir a hex
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }
  
  // Si es rgb, extraer componentes y convertir a hex
  if (color.startsWith('rgb')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }
  
  // Valor por defecto
  console.warn(`ModernColorPicker - Color no válido: ${color}, usando negro por defecto`);
  return '#000000';
};

const ModernColorPicker: React.FC<ModernColorPickerProps> = ({ 
  label, 
  value = '#000000',
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localColor, setLocalColor] = useState(getSafeColor(value));
  const [opacity, setOpacity] = useState(100);
  const [colorWithOpacity, setColorWithOpacity] = useState(getSafeColor(value));
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Función para notificar cambios al componente padre
  const notifyParent = (finalColor: string) => {
    console.log(`ModernColorPicker - Enviando color al padre:`, finalColor);
    setColorWithOpacity(finalColor);
    onChange(finalColor);
  };

  // Función para aplicar opacidad al color hex
  const applyOpacity = (hexColor: string, opacityValue: number): string => {
    if (opacityValue === 100) return hexColor;
    
    try {
      const r = parseInt(hexColor.substring(1, 3), 16);
      const g = parseInt(hexColor.substring(3, 5), 16);
      const b = parseInt(hexColor.substring(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacityValue / 100})`;
    } catch (error) {
      console.error('Error al aplicar opacidad:', error);
      return hexColor;
    }
  };

  // Actualizar color local cuando cambia el prop value
  useEffect(() => {
    if (value) {
      console.log(`ModernColorPicker - Actualizando color desde prop:`, value);
      
      // Si es un formato hex, usarlo directamente
      if (isValidHex(value)) {
        setLocalColor(value);
        setOpacity(100); // Reset opacity para colores hex
      }
      // Extraer opacidad si está en formato rgba
      else if (value.startsWith('rgba')) {
        const match = value.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (match && match[4]) {
          // Convertir componentes RGB a hex
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          
          setLocalColor(hexColor);
          setOpacity(parseFloat(match[4]) * 100);
          console.log(`ModernColorPicker - Extraído desde rgba: hex=${hexColor}, opacity=${parseFloat(match[4]) * 100}%`);
        } else {
          // Si no se puede parsear, usar un valor seguro
          setLocalColor(getSafeColor(value));
          setOpacity(100);
        }
      } else {
        // Para otros formatos, intentar obtener un valor seguro
        setLocalColor(getSafeColor(value));
      }
    }
  }, [value]);
  
  // Aplicar cambios de color con debounce
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (!isValidHex(localColor)) {
        console.warn('ModernColorPicker - Color local no válido:', localColor);
        return;
      }
      
      // Decidir si usar hex o rgba
      const finalColor = applyOpacity(localColor, opacity);
      console.log(`ModernColorPicker - Color final con opacidad:`, finalColor);
      notifyParent(finalColor);
    }, 100);
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [localColor, opacity, onChange]);
  
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
  
  // Manejar cambio desde presets
  const handlePresetClick = (preset: string) => {
    setLocalColor(preset);
    setOpacity(100); // Reset opacity al elegir un preset
    // Notificar inmediatamente al padre
    notifyParent(preset);
    setIsOpen(false);
  };
  
  // Manejar cambio de color desde el picker
  const handleColorChange = (newColor: string) => {
    if (isValidHex(newColor)) {
      setLocalColor(newColor);
    }
  };

  // Manejar cambio de opacidad
  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
  };
  
  // Manejar click en botón Aplicar
  const handleApplyClick = () => {
    const finalColor = applyOpacity(localColor, opacity);
    notifyParent(finalColor);
    setIsOpen(false);
  };
  
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="flex items-center space-x-2">
          <div 
            className="w-5 h-5 rounded border border-gray-300 shadow-sm"
            style={{ backgroundColor: colorWithOpacity }}
          />
          <span className="text-xs font-mono uppercase">{colorWithOpacity}</span>
        </div>
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-10 px-3 font-normal"
            style={{
              backgroundColor: 'white',
              borderColor: '#e2e8f0'
            }}
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-5 h-5 rounded-sm border border-gray-200 shadow-sm"
                style={{ backgroundColor: colorWithOpacity }}
              />
              <span className="text-sm text-gray-700">{colorWithOpacity}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" sideOffset={5}>
          <Tabs defaultValue="picker" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="picker" className="text-xs">Color Picker</TabsTrigger>
              <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="picker" className="space-y-4">
              <div className="mb-4">
                <HexColorPicker 
                  color={localColor} 
                  onChange={handleColorChange} 
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-full">
                  <label className="block text-xs mb-1">Hex</label>
                  <HexColorInput
                    color={localColor}
                    onChange={handleColorChange}
                    prefixed
                    className="w-full p-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div 
                  className="w-8 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: localColor }}
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-xs mb-1">Opacidad: {opacity}%</label>
                <Slider
                  value={[opacity]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => handleOpacityChange(value[0])}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm" 
                  onClick={handleApplyClick}
                >
                  <Check className="h-4 w-4 mr-1" /> Aplicar
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="presets" className="h-64 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2">
                {defaultPresets.map((preset) => (
                  <button
                    key={preset}
                    className="w-8 h-8 rounded-md border border-gray-200 shadow-sm hover:scale-110 transition-transform duration-100"
                    style={{ backgroundColor: preset }}
                    onClick={() => handlePresetClick(preset)}
                    aria-label={`Color ${preset}`}
                  />
                ))}
              </div>
              <div className="mt-4">
                <Button 
                  className="w-full"
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsOpen(false)}
                >
                  <Palette className="h-4 w-4 mr-1" /> Cerrar Paleta
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ModernColorPicker; 