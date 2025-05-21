import React from 'react';
import { useConfig } from '../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

const Header: React.FC = () => {
  const { config } = useConfig();
  const navigate = useNavigate();
  
  return (
    <header className="bg-primary text-white py-4 z-20" style={{ backgroundColor: config.theme.primaryColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold">{config.restaurantName}</h1>
          <p className="text-sm">
            <span className="inline-block mr-1">🕒</span>
            Abierto ahora • Horario: {config.openingHours}
          </p>
        </div>
        <div>
          <button 
            onClick={() => navigate('/favoritos')}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            aria-label="Ver favoritos"
          >
            <Heart 
              size={24} 
              className="text-white" 
              fill="white"
            />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
