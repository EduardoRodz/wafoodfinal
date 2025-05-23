import React from 'react';

export const SubmitButton: React.FC = () => {
  return (
    <button
      type="submit"
      className="w-full py-4 text-white font-bold rounded-lg transition-colors hover:opacity-90 shadow-md focus:outline-none active:scale-[0.98] z-20 relative"
      style={{ backgroundColor: "#004d2a" }}
    >
      Enviar pedido por WhatsApp
    </button>
  );
};
