import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';

export default function Cart() {
  const { cart, isLoading, updateQty, removeItem } = useCart();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart</h1>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart</h1>
        <EmptyState message="Your cart is empty. Start shopping!" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quantity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Subtotal</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cart.items.map((item) => (
              <tr key={item.product_id}>
                <td className="px-6 py-4 text-sm text-gray-900">{item.product?.title || 'Unknown Product'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">${item.product?.price.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.product_id, Math.max(1, item.quantity - 1))}
                      className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="px-2">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product_id, item.quantity + 1)}
                      className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => removeItem(item.product_id)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="flex justify-end mb-6">
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-2">Total</p>
            <p className="text-3xl font-bold text-gray-900">${cart.total.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => navigate('/checkout')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
