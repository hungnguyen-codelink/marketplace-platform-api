import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { Review } from '../types';

export function useProductReviews(productId: string) {
  return useQuery<Review[]>({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const res = await apiClient.get<Review[]>(`/products/${productId}/reviews`);
      return res.data;
    },
    enabled: !!productId,
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { order_item_id: string; rating: number; text?: string }) =>
      apiClient.post<Review>('/reviews', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
