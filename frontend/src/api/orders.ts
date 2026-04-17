import apiClient from './client';
import type { Order, OrderStatus, ShippingAddress, PaginatedResponse } from '../types';

export interface CheckoutPayload {
  shipping_address: ShippingAddress;
}

export interface SellerOrdersParams {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface OrdersParams {
  page?: number;
  limit?: number;
}

export const checkoutOrder = async (shippingAddress: ShippingAddress): Promise<Order> => {
  const res = await apiClient.post<Order>('/orders/checkout', { shipping_address: shippingAddress });
  return res.data;
};

export const getOrders = async (params?: OrdersParams): Promise<PaginatedResponse<Order>> => {
  const res = await apiClient.get<PaginatedResponse<Order>>('/orders', { params });
  return res.data;
};

export const getOrder = async (id: string): Promise<Order> => {
  const res = await apiClient.get<Order>(`/orders/${id}`);
  return res.data;
};

export const getSellerOrders = async (params?: SellerOrdersParams): Promise<PaginatedResponse<Order>> => {
  const res = await apiClient.get<PaginatedResponse<Order>>('/seller/orders', { params });
  return res.data;
};

export const getSellerOrder = async (id: string): Promise<Order> => {
  const res = await apiClient.get<Order>(`/seller/orders/${id}`);
  return res.data;
};

export const updateSellerOrderStatus = async (id: string, status: OrderStatus): Promise<Order> => {
  const res = await apiClient.patch<Order>(`/seller/orders/${id}/status`, { status });
  return res.data;
};
