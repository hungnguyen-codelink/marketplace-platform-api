import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSellerOrder, updateSellerOrderStatus } from '../../api/orders';
import { useToast } from '../../contexts/ToastContext';
import ProgressStepper from '../../components/ProgressStepper';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import type { Order, OrderStatus } from '../../types';

const nextStatusMap: Record<OrderStatus, OrderStatus> = {
  pending: 'confirmed',
  confirmed: 'shipped',
  shipped: 'delivered',
  delivered: 'completed',
  completed: 'completed',
};

const buttonLabelMap: Record<OrderStatus, string> = {
  pending: 'Confirm Order',
  confirmed: 'Mark as Shipped',
  shipped: 'Mark as Delivered',
  delivered: 'Mark as Completed',
  completed: 'Order Complete',
};

export default function SellerOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!id) return;
        const result = await getSellerOrder(id);
        setOrder(result);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!order || order.status === 'completed') return;

    setIsUpdating(true);
    try {
      const nextStatus = nextStatusMap[order.status];
      const updated = await updateSellerOrderStatus(order.id, nextStatus);
      setOrder(updated);
      addToast('Order status updated successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update order status';
      addToast(errorMessage, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

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

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Order Detail</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Order not found</p>
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

      <div className="grid grid-cols-2 gap-6 mb-6">
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
          </dl>
        </div>
      </div>

      {order.status === 'completed' ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 font-medium">Order Complete</p>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            onClick={handleStatusUpdate}
            disabled={isUpdating || order.status === 'completed'}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isUpdating ? 'Updating...' : buttonLabelMap[order.status]}
          </Button>
        </div>
      )}
    </div>
  );
}
