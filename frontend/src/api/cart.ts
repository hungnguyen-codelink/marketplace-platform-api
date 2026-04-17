import apiClient from './client';
import type { Cart } from '../types';

export const getCart = async (): Promise<Cart> => {
  const res = await apiClient.get<Cart>('/cart');
  return res.data;
};

export const addItem = async (productId: string, quantity: number): Promise<Cart> => {
  const res = await apiClient.post<Cart>('/cart/items', { product_id: productId, quantity });
  return res.data;
};

export const updateQty = async (productId: string, quantity: number): Promise<Cart> => {
  const res = await apiClient.put<Cart>(`/cart/items/${productId}`, { quantity });
  return res.data;
};

export const removeItem = async (productId: string): Promise<Cart> => {
  const res = await apiClient.delete<Cart>(`/cart/items/${productId}`);
  return res.data;
};

export const clearCart = async (): Promise<Cart> => {
  const res = await apiClient.delete<Cart>('/cart');
  return res.data;
};
