import React, { useState } from 'react';

interface GeneralSettingsProps {
  config: {
    restaurantName: string;
    whatsappNumber: string;
    currency: string;
    openingHours: string;
    footerText: string;
    cashDenominations: {
      value: number;
      label: string;
    }[];
  };
  onChange: (newSettings: {
    restaurantName: string;
    whatsappNumber: string;
    currency: string;
    openingHours: string;
    footerText: string;
    cashDenominations: {
      value: number;
      label: string;
    }[];
  }) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ config, onChange }) => {
  const [cashValue, setCashValue] = useState<string>('');
  const [cashLabel, setCashLabel] = useState<string>('');

  const handleCashDenominationAdd = () => {
    const value = parseFloat(cashValue);
    if (isNaN(value) || value <= 0) {
      alert('El valor debe ser un número positivo');
      return;
    }

    if (!cashLabel.trim()) {
      alert('La etiqueta es obligatoria');
      return;
    }

    // Verificar si ya existe
    if (config.cashDenominations.some(item => item.value === value)) {
      alert('Ya existe una denominación con este valor');
      return;
    }

    const newDenominations = [
      ...config.cashDenominations, 
      { value, label: cashLabel }
    ].sort((a, b) => a.value - b.value);

    onChange({
      ...config,
      cashDenominations: newDenominations
    });

    // Limpiar los campos
    setCashValue('');
    setCashLabel('');
  };

  const handleCashDenominationRemove = (index: number) => {
    const newDenominations = [...config.cashDenominations];
    newDenominations.splice(index, 1);
    
    onChange({
      ...config,
      cashDenominations: newDenominations
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Configuración General</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del Restaurante</label>
          <input
            type="text"
            value={config.restaurantName}
            onChange={(e) => onChange({ ...config, restaurantName: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ej: Mi Restaurante"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Número de WhatsApp</label>
          <input
            type="text"
            value={config.whatsappNumber}
            onChange={(e) => onChange({ ...config, whatsappNumber: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ej: 123456789 (sin espacios ni símbolos)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formato: código de país + número, sin espacios ni símbolos. Ej: 18091234567
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Símbolo de Moneda</label>
          <input
            type="text"
            value={config.currency}
            onChange={(e) => onChange({ ...config, currency: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ej: $"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Horario de Apertura</label>
          <input
            type="text"
            value={config.openingHours}
            onChange={(e) => onChange({ ...config, openingHours: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Ej: 9:00 AM - 10:00 PM"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Texto del Pie de Página</label>
        <input
          type="text"
          value={config.footerText || ''}
          onChange={(e) => {
            console.log('Nuevo valor de footerText:', e.target.value);
            onChange({ ...config, footerText: e.target.value })
          }}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Ej: © 2023 Mi Restaurante. Todos los derechos reservados."
        />
        <p className="text-xs text-gray-500 mt-1">
          Este texto se mostrará en el pie de página de su sitio web. Se carga desde la columna footer_text en Supabase.
        </p>
      </div>
      
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-md font-medium mb-3">Denominaciones de Efectivo</h3>
        <p className="text-sm text-gray-500 mb-4">
          Estas son las opciones que los clientes verán al pagar con efectivo.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Valor</label>
            <input
              type="number"
              value={cashValue}
              onChange={(e) => setCashValue(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Ej: 100"
              min="1"
              step="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Etiqueta</label>
            <input
              type="text"
              value={cashLabel}
              onChange={(e) => setCashLabel(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Ej: $100"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleCashDenominationAdd}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Añadir
            </button>
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Etiqueta
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {config.cashDenominations.length > 0 ? (
                config.cashDenominations.map((denom, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {denom.value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {denom.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleCashDenominationRemove(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    No hay denominaciones definidas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings; 