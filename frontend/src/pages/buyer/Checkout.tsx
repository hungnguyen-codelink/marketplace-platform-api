import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkoutOrder } from '../../api/orders';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import Input from '../../components/Input';
import type { ShippingAddress } from '../../types';

export default function Checkout() {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ShippingAddress>({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  const isFormValid = Object.values(formData).every((field) => field.trim() !== '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const order = await checkoutOrder(formData);
      await clearCart();
      addToast('Order placed successfully!', 'success');
      navigate('/checkout/success', { state: { orderId: order.id } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-blue-800">Your payment will be processed securely.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>

            <FormField label="Street Address" htmlFor="street" required>
              <Input
                id="street"
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Main St"
                required
              />
            </FormField>

            <FormField label="City" htmlFor="city" required>
              <Input
                id="city"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Boston"
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="State" htmlFor="state" required>
                <Input
                  id="state"
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="MA"
                  required
                />
              </FormField>

              <FormField label="ZIP Code" htmlFor="zip" required>
                <Input
                  id="zip"
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="02101"
                  required
                />
              </FormField>
            </div>

            <FormField label="Country" htmlFor="country" required>
              <Input
                id="country"
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="USA"
                required
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={() => navigate('/cart')}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Back to Cart
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Processing...' : 'Place Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
