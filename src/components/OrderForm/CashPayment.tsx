import React from 'react';
import { defaultConfig } from '../../config';

interface CashPaymentProps {
  cashAmount: number;
  setCashAmount: (amount: number) => void;
}

export const CashPayment: React.FC<CashPaymentProps> = ({
  cashAmount,
  setCashAmount
}) => {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium">Paga con</label>
      <select
        value={cashAmount}
        onChange={(e) => setCashAmount(Number(e.target.value))}
        className="w-full p-2 border border-gray-300 rounded"
      >
        {defaultConfig.cashDenominations.map((denom) => (
          <option key={denom.value} value={denom.value}>
            {denom.label}
          </option>
        ))}
      </select>
    </div>
  );
};
