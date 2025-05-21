import React, { useEffect, useState } from 'react';
import { useConfig } from '../context/ConfigContext';

const Footer: React.FC = () => {
  const { config } = useConfig();
  const currentYear = new Date().getFullYear();
  
  // Usar el texto del footer directamente desde la configuración de Supabase (columna footer_text)
  // Si no hay texto personalizado, mostrar un texto predeterminado
  const getFooterText = () => {
    if (config.footerText) {
      // Usar el texto exacto de la columna footer_text de site_config
      return config.footerText;
    } else {
      // Texto predeterminado si no hay valor en la columna footer_text
      return `© ${currentYear} ${config.restaurantName}. Frescamente Cocinado para ti.`;
    }
  };
  
  return (
    <footer className="bg-gray-100 py-4 text-gray-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        {getFooterText()} - {' '}
        <span>
          WAFOOD Desarrollado por{' '}
          <a 
            href="https://wa.me/18092010357?text=Hola,%20me%20interesa%20el%20sistema%20de%20WAFOOD" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-gray-800 font-medium"
            style={{ color: config.theme.primaryColor }}
          >
            Eduardo Soto
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
