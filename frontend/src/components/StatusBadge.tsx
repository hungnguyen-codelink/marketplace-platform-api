import React from 'react';
import Badge from './Badge';
import type { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { color: 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'indigo'; label: string }> = {
  pending: { color: 'yellow', label: 'Pending' },
  confirmed: { color: 'blue', label: 'Confirmed' },
  shipped: { color: 'indigo', label: 'Shipped' },
  delivered: { color: 'green', label: 'Delivered' },
  completed: { color: 'green', label: 'Completed' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { color, label } = statusConfig[status] ?? { color: 'gray', label: status };
  return <Badge color={color}>{label}</Badge>;
}
