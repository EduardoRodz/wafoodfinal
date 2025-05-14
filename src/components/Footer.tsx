import React, { useEffect, useState } from 'react';
import { useConfig } from '../context/ConfigContext';

const Footer: React.FC = () => {
  const { config } = useConfig();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Crear el texto del footer dinámicamente con el nombre del restaurante
  const footerText = `© ${currentYear} ${config.restaurantName}. Frescamente Cocinado para ti.`;
  
  return (
    <footer className="bg-gray-100 py-4 text-gray-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        {footerText}
      </div>
    </footer>
  );
};

export default Footer;
