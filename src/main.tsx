import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Crear el contenedor de root
const rootElement = document.getElementById("root")!;

// Crear el root con opción para deshabilitar el control de aria-hidden por React
const root = createRoot(rootElement);

// Renderizar la app
root.render(<App />);

// Asegurarse de que el elemento root nunca tenga aria-hidden
// Esta es una solución para evitar el error de accesibilidad
if (rootElement) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'aria-hidden') {
        rootElement.removeAttribute('aria-hidden');
      }
    });
  });
  
  observer.observe(rootElement, { attributes: true });
}
