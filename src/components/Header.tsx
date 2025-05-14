import React from 'react';
import { useConfig } from '../context/ConfigContext';

const Header: React.FC = () => {
  const { config } = useConfig();
  
  return (
    <header className="bg-primary text-white py-4 z-20" style={{ backgroundColor: config.theme.primaryColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        <h1 className="text-2xl font-bold">{config.restaurantName}</h1>
        <p className="text-sm">
          <span className="inline-block mr-1">🕒</span>
          Abierto ahora • Horario: {config.openingHours}
        </p>
      </div>
    </header>
  );
};

export default Header;
