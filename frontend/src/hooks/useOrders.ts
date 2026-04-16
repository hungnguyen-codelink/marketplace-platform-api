import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { Order, ShippingAddress } from '../types';

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await apiClient.get<Order[]>('/orders');
      return res.data;
    },
  });
}

export function useOrder(id: string) {
  return useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: async () => {
      const res = await apiClient.get<Order>(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (address: ShippingAddress) => apiClient.post<Order>('/checkout', { shipping_address: address }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useSellerOrders(params?: { status?: string }) {
  return useQuery<Order[]>({
    queryKey: ['seller-orders', params],
    queryFn: async () => {
      const res = await apiClient.get<Order[]>('/seller/orders', { params });
      return res.data;
    },
  });
}
