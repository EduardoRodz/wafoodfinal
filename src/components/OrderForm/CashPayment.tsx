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
  
  // Asegurar que cashDenominations siempre sea un array válido
  const cashDenominations = Array.isArray(config.cashDenominations) && config.cashDenominations.length > 0
    ? config.cashDenominations
    : [{ value: 100, label: '100' }, { value: 200, label: '200' }, { value: 500, label: '500' }];
  
  return (
    <div>
      <label className="block mb-1 text-sm font-medium">Paga con</label>
      <select
        value={cashAmount}
        onChange={(e) => setCashAmount(Number(e.target.value))}
        className="w-full p-2 border border-gray-300 rounded"
      >
        {cashDenominations.map((denom) => (
          <option key={denom.value} value={denom.value}>
            {denom.label}
          </option>
        ))}
      </select>
    </div>
  );
};
