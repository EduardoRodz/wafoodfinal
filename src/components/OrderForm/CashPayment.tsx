import React from 'react';
import { useConfig } from '../../context/ConfigContext';

interface CashPaymentProps {
  cashAmount: number;
  setCashAmount: (amount: number) => void;
}

export const CashPayment: React.FC<CashPaymentProps> = ({
  cashAmount,
  setCashAmount
}) => {
  const { config } = useConfig();
  
  // Valores fijos para las denominaciones
  const denominationsValues = [100, 200, 500, 1000, 2000];
  
  // Obtener el símbolo de moneda desde la configuración
  const currencySymbol = config.currency || 'RD$';
  
  return (
    <div>
      <label className="block mb-1 text-sm font-medium">Paga con</label>
      <select
        value={cashAmount}
        onChange={(e) => setCashAmount(Number(e.target.value))}
        className="w-full p-2 border border-gray-300 rounded"
      >
        {denominationsValues.map((value) => (
          <option key={value} value={value}>
            {currencySymbol}{value}
          </option>
        ))}
      </select>
    </div>
  );
};
