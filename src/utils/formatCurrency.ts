import { useConfig } from '../context/ConfigContext';

// Versión de la función que usa el contexto (para componentes)
export const useFormatCurrency = () => {
  const { config } = useConfig();
  
  return (value: number): string => {
    return `${config.currency}${value.toFixed(2)}`;
  };
};

// Versión alternativa con la configuración pasada como parámetro
export const formatCurrencyWithConfig = (value: number, currencySymbol: string): string => {
  return `${currencySymbol}${value.toFixed(2)}`;
};

// Versión simple con la configuración importada
// Utiliza la configuración actual, no se actualiza en tiempo real
import { defaultConfig } from '../config';
export const formatCurrency = (value: number): string => {
  return `${defaultConfig.currency}${value.toFixed(2)}`;
};
