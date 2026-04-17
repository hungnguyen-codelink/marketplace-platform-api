import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSellerOrders } from '../../api/orders';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import type { Order, OrderStatus } from '../../types';

const STATUS_FILTERS: (OrderStatus | null)[] = [null, 'pending', 'confirmed', 'shipped', 'delivered', 'completed'];
const STATUS_LABELS: Record<OrderStatus | string, string> = {
  '': 'All',
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
};

interface OrdersState {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

export default function SellerOrders() {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [orders, setOrders] = useState<OrdersState>({
    data: [],
    total: 0,
    page: 1,
    limit: 10,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const params: any = { page: orders.page, limit: orders.limit };
        if (selectedStatus) params.status = selectedStatus;
        const result = await getSellerOrders(params);
        setOrders(result);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [selectedStatus, orders.page, orders.limit]);

  const handleRowClick = (orderId: string) => {
    navigate(`/seller/orders/${orderId}`);
  };

  if (isLoading && orders.data.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Seller Orders</h1>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Seller Orders</h1>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {STATUS_FILTERS.map((status) => {
          const label = status ? STATUS_LABELS[status] : 'All';
          const isActive = selectedStatus === status;
          return (
            <button
              key={status || 'all'}
              onClick={() => {
                setSelectedStatus(status);
                setOrders((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 font-medium border-b-2 transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {orders.data.length === 0 ? (
        <EmptyState title="No orders found" />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
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
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">${order.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
