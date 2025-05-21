import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface PickupDetailsProps {
  phone: string;
  setPhone: (phone: string) => void;
}

export const PickupDetails: React.FC<PickupDetailsProps> = ({
  phone,
  setPhone
}) => {
  const [phoneError, setPhoneError] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits
    const numericValue = value.replace(/\D/g, '');
    setPhone(numericValue);
    
    if (numericValue) {
      if (numericValue.length !== 10) {
        setPhoneError('El número debe tener exactamente 10 dígitos');
      } else {
        setPhoneError('');
      }
    } else {
      setPhoneError('Por favor ingresa tu número de teléfono');
    }
  };

  const handlePhoneBlur = () => {
    if (!phone.trim()) {
      setPhoneError('Por favor ingresa tu número de teléfono');
    } else if (phone.length !== 10) {
      setPhoneError('El número debe tener exactamente 10 dígitos');
    } else {
      setPhoneError('');
    }
  };

  return (
    <div className="space-y-1 mb-3">
      <Label htmlFor="pickup-phone" className="block text-sm font-medium">Teléfono <span className="text-red-500">*</span></Label>
      <Input
        id="pickup-phone"
        type="tel"
        value={phone}
        onChange={handlePhoneChange}
        onBlur={handlePhoneBlur}
        placeholder="Tu número de teléfono (10 dígitos)"
        className={`w-full ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'}`}
        aria-invalid={!!phoneError}
        maxLength={10}
      />
      {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
    </div>
  );
}; 