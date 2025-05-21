import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useFormatCurrency } from '../../utils/formatCurrency';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '../../context/ConfigContext';

export const useOrderForm = () => {
  const { items, totalAmount } = useCart();
  const { config } = useConfig();
  const formatCurrency = useFormatCurrency();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [orderType, setOrderType] = useState('delivery'); // Changed default to delivery
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash or transfer
  const [cashAmount, setCashAmount] = useState(100); // Valor predeterminado
  const [comments, setComments] = useState('');
  const [formErrors, setFormErrors] = useState({
    name: false,
    phone: false,
    address: false
  });

  const validateForm = () => {
    const errors = {
      name: !name.trim(),
      phone: (!phone.trim() || phone.length !== 10),
      address: orderType === 'delivery' && !address.trim()
    };
    
    setFormErrors(errors);
    
    return !Object.values(errors).some(Boolean);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos a tu carrito antes de ordenar",
        variant: "destructive"
      });
      return;
    }
    
    if (!validateForm()) {
      toast({
        title: "Formulario incompleto",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }
    
    // Prepare WhatsApp message
    let message = '‼️ NUEVO PEDIDO ‼️\n\n';
    message += `🧑 *Cliente:* ${name}\n`;
    message += `🛵 *Tipo:* ${orderType === 'pickup' ? 'Para recoger' : 'Delivery'}\n`;
    
    message += `📞 *Teléfono:* ${phone}\n`;
    
    if (orderType === 'delivery') {
      message += `📍 *Dirección:* ${address}\n`;
    }
    
    message += `💰 *Pago:* ${paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}\n`;
    
    if (paymentMethod === 'cash') {
      message += `💵 *Paga con:* ${formatCurrency(cashAmount)}\n`;
    }
    
    if (comments) {
      message += `\nComentarios: ${comments}\n`;
    }
    
    message += '\n🛒 *DETALLE DEL PEDIDO*\n';
    
    items.forEach(item => {
      message += `• ${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}\n`;
      if (item.note) {
        message += `   Nota: ${item.note}\n`;
      }
    });
    
    message += `\n🧾 *Total:* ${formatCurrency(totalAmount)}\n\n`;
    message += '¡Gracias por tu pedido! Lo estaremos preparando pronto.';
    
    // Create WhatsApp URL with safe access to config.whatsappNumber
    const whatsappNumber = config.whatsappNumber || '';
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
  };

  return {
    name,
    setName,
    orderType,
    setOrderType,
    phone,
    setPhone,
    address,
    setAddress,
    paymentMethod,
    setPaymentMethod,
    cashAmount,
    setCashAmount,
    comments,
    setComments,
    formErrors,
    handleSubmit
  };
};
