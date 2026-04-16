import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { Cart } from '../types';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  addItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQty: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await apiClient.get<Cart>('/cart');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const invalidateCart = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  }, [queryClient]);

  const addItemMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      apiClient.post('/cart/items', { product_id: productId, quantity }),
    onSuccess: invalidateCart,
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: string) => apiClient.delete(`/cart/items/${productId}`),
    onSuccess: invalidateCart,
  });

  const updateQtyMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      apiClient.put(`/cart/items/${productId}`, { quantity }),
    onSuccess: invalidateCart,
  });

  const clearCartMutation = useMutation({
    mutationFn: () => apiClient.delete('/cart'),
    onSuccess: invalidateCart,
  });

  const addItem = useCallback(
    (productId: string, quantity: number) =>
      addItemMutation.mutateAsync({ productId, quantity }).then(() => undefined),
    [addItemMutation]
  );

  const removeItem = useCallback(
    (productId: string) => removeItemMutation.mutateAsync(productId).then(() => undefined),
    [removeItemMutation]
  );

  const updateQty = useCallback(
    (productId: string, quantity: number) =>
      updateQtyMutation.mutateAsync({ productId, quantity }).then(() => undefined),
    [updateQtyMutation]
  );

  const clearCart = useCallback(
    () => clearCartMutation.mutateAsync().then(() => undefined),
    [clearCartMutation]
  );

  return (
    <CartContext.Provider
      value={{ cart: cart ?? null, isLoading, addItem, removeItem, updateQty, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
