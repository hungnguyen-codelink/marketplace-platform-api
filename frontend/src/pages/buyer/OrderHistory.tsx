import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../../api/orders';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';
import type { Order, OrderStatus } from '../../types';

interface OrdersState {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrdersState>({
    data: [],
    total: 0,
    page: 1,
    limit: 10,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const result = await getOrders({ page: orders.page, limit: orders.limit });
        setOrders(result);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [orders.page, orders.limit]);

  const handleRowClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handlePreviousPage = () => {
    if (orders.page > 1) {
      setOrders((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleNextPage = () => {
    if (orders.page * orders.limit < orders.total) {
      setOrders((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Order History</h1>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (orders.data.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Order History</h1>
        <EmptyState message="No orders found. Start shopping!" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Order History</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Items</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.data.map((order) => (
              <tr
                key={order.id}
                onClick={() => handleRowClick(order.id)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 text-sm font-medium text-indigo-600">{order.id}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <StatusBadge status={order.status as OrderStatus} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.items?.length || 0}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">${order.total_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Page {orders.page} of {Math.ceil(orders.total / orders.limit)}
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handlePreviousPage}
            disabled={orders.page === 1}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
          >
            Previous
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={orders.page * orders.limit >= orders.total}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
