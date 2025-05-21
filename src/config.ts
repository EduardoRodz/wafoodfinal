// config.ts - Configuration file that can be easily edited

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  items: MenuItem[];
}

// Configuración predeterminada
export const defaultConfig = {
  // Restaurant information
  restaurantName: "WHATSFOOD",
  whatsappNumber: "18092010357", // Format: country code + number, no spaces or symbols
  currency: "RD$",
  openingHours: "8:00 AM - 10:00 PM",
  footerText: "", // Default empty footer text

  // Theme configuration
  theme: {
    primaryColor: "#004d2a", // Dark green
    accentColor: "#00873e", // Light green
    textColor: "#333333",
    backgroundColor: "#FFFFFF",
    cartButtonColor: "#003b29", // Added cart button color configuration
    floatingCartButtonColor: "#003b29", // Floating cart button color
  },

  // Bill denominations for cash payment
  cashDenominations: [
    { value: 200, label: "RD$200" },
    { value: 500, label: "RD$500" },
    { value: 1000, label: "RD$1000" },
    { value: 2000, label: "RD$2000" },
  ],

  // Menu categories and items
  categories: [
    {
      id: "bebidas",
      name: "Bebidas",
      icon: "🥤",
      items: [
        {
          id: "cappuccino",
          name: "Cappuccinoxxx",
          description: "Rico espresso con espumosa leche",
          price: 120,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
        {
          id: "cafe-frio",
          name: "Café Frío",
          description: "Café helado servido con crema",
          price: 140,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
        {
          id: "te-verde",
          name: "Té Verde",
          description: "Premium té verde japonés",
          price: 90,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
        {
          id: "soda-lima",
          name: "Soda de Lima Fresca",
          description: "Refrescante soda con menta",
          price: 70,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
      ],
    },
    {
      id: "plato-principal",
      name: "Plato Principal",
      icon: "🍽️",
      items: [
        {
          id: "sandwich-vegetariano",
          name: "Sándwich Vegetariano",
          description: "Vegetales a la parrilla con queso",
          price: 90,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
        {
          id: "pasta-alfredo",
          name: "Pasta Alfredo",
          description: "Cremosa pasta blanca",
          price: 180,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
        {
          id: "pizza-margherita",
          name: "Pizza Margherita",
          description: "Queso, tomate y albahaca",
          price: 220,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
        {
          id: "hamburguesa-vegetariana",
          name: "Hamburguesa Vegetariana",
          description: "Hamburguesa de vegetales frescos",
          price: 150,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
      ],
    },
    {
      id: "ensaladas",
      name: "Ensaladas",
      icon: "🥗",
      items: [
        {
          id: "ensalada-griega",
          name: "Ensalada Griega",
          description: "Vegetales frescos con queso feta",
          price: 160,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
        {
          id: "ensalada-cesar",
          name: "Ensalada César",
          description: "Lechuga crujiente con aderezo clásico",
          price: 160,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
      ],
    },
    {
      id: "postres",
      name: "Postres",
      icon: "🍰",
      items: [
        {
          id: "brownie-chocolate",
          name: "Brownie de Chocolate",
          description: "Caliente brownie de chocolate",
          price: 120,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
        {
          id: "sundae-helado",
          name: "Sundae de Helado",
          description: "Helado surtido con toppings",
          price: 150,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
        {
          id: "tiramisu",
          name: "Tiramisú",
          description: "Postre italiano de café",
          price: 180,
          image: "https://mojo.generalmills.com/api/public/content/KadqkpTtNk-KOzGZTNo0bg_gmi_hi_res_jpeg.jpeg?v=2c3d8e08&t=16e3ce250f244648bef28c5949fb99ff",
        },
      ],
    },
  ],
};

// Intentar cargar la configuración desde localStorage como fallback temporal
// Esta función se mantendrá por compatibilidad, pero se recomienda usar configService
const loadConfig = () => {
  try {
    const savedConfig = localStorage.getItem('siteConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      return parsedConfig;
    }
  } catch (error) {
    console.error('Error cargando configuración guardada:', error);
  }
  return defaultConfig;
};

// Exportar la configuración activa
export const config = loadConfig();

// Esta función está obsoleta y se mantendrá solo por compatibilidad
// Se recomienda usar saveConfig desde configService
export const saveConfig = (newConfig: typeof defaultConfig) => {
  console.warn('OBSOLETO: Esta función saveConfig está obsoleta. Use saveConfig desde configService');
  try {
    localStorage.setItem('siteConfig', JSON.stringify(newConfig));
    
    // Disparar un evento para informar a otros componentes
    const event = new CustomEvent('configSaved', { detail: newConfig });
    window.dispatchEvent(event);
    
    return true;
  } catch (error) {
    console.error('Error guardando configuración:', error);
    return false;
  }
};
