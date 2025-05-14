import React from 'react';
import { CustomerDetails } from './CustomerDetails';
import { DeliveryDetails } from './DeliveryDetails';
import { PaymentMethod } from './PaymentMethod';
import { CashPayment } from './CashPayment';
import { AdditionalComments } from './AdditionalComments';
import { SubmitButton } from './SubmitButton';
import { useCart } from '../../context/CartContext';
import { config } from '../../config';
import { formatCurrency } from '../../utils/formatCurrency';
import { useOrderForm } from './useOrderForm';

const OrderForm: React.FC = () => {
  const { items, totalAmount } = useCart();
  const { 
    name, setName,
    orderType, setOrderType,
    phone, setPhone,
    address, setAddress,
    paymentMethod, setPaymentMethod,
    cashAmount, setCashAmount,
    comments, setComments,
    handleSubmit
  } = useOrderForm();

  return (
    <div>
      <h3 className="font-bold text-lg mb-4">Información del pedido</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="p-1">
            <CustomerDetails 
              name={name} 
              setName={setName} 
              orderType={orderType} 
              setOrderType={setOrderType} 
            />
            
            {orderType === 'delivery' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <DeliveryDetails 
                  phone={phone} 
                  setPhone={setPhone} 
                  address={address} 
                  setAddress={setAddress} 
                />
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <PaymentMethod 
                paymentMethod={paymentMethod} 
                setPaymentMethod={setPaymentMethod} 
              />
            </div>
            
            {paymentMethod === 'cash' && (
              <div className="mt-4">
                <CashPayment 
                  cashAmount={cashAmount} 
                  setCashAmount={setCashAmount} 
                />
              </div>
            )}
            
            {orderType === 'delivery' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <AdditionalComments 
                  comments={comments} 
                  setComments={setComments} 
                />
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <SubmitButton />
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
