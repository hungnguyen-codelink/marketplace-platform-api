import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getOrder } from '../../api/orders';
import ProgressStepper from '../../components/ProgressStepper';
import Spinner from '../../components/Spinner';
import type { Order, OrderStatus } from '../../types';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!id) return;
        const result = await getOrder(id);
        setOrder(result);
      } catch (err) {
        const error = err as any;
        if (error.response?.status === 404) {
          setError('Order not found');
        } else {
          setError('Failed to load order');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Order Detail</h1>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Order Detail</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Order #{order.id}</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
        <ProgressStepper currentStatus={order.status as OrderStatus} />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quantity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Unit Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 text-sm text-gray-900">{item.product?.title || 'Unknown'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.quantity}</td>
                <td className="px-6 py-4 text-sm text-gray-600">${item.unit_price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  ${(item.unit_price * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
          <address className="text-sm text-gray-600 not-italic">
            <div>{order.shipping_address.street}</div>
            <div>
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
            </div>
            <div>{order.shipping_address.country}</div>
          </address>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Order Date:</dt>
              <dd className="font-medium text-gray-900">{new Date(order.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Total:</dt>
              <dd className="font-medium text-gray-900">${order.total_amount.toFixed(2)}</dd>
            </div>
            {order.transaction_id && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Transaction ID:</dt>
                <dd className="font-medium text-gray-900">{order.transaction_id}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
