import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { Shop } from '../types';

export function useMyShop() {
  return useQuery<Shop>({
    queryKey: ['my-shop'],
    queryFn: async () => {
      const res = await apiClient.get<Shop>('/seller/shop');
      return res.data;
    },
  });
}

export function useCreateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Shop>) => apiClient.post<Shop>('/seller/shop', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-shop'] }),
  });
}

export function useUpdateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Shop>) => apiClient.put<Shop>('/seller/shop', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-shop'] }),
  });
}
