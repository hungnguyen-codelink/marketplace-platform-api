import apiClient from './client';
import type { Shop } from '../types';

export interface CreateShopPayload {
  name: string;
  description?: string;
  banner_url?: string;
  contact_email?: string;
}

export interface UpdateShopPayload {
  name?: string;
  description?: string;
  banner_url?: string;
  contact_email?: string;
}

export const shopsApi = {
  createShop: (payload: CreateShopPayload) =>
    apiClient.post<Shop>('/api/shops', payload).then((r) => r.data),
  getMyShop: () =>
    apiClient.get<Shop>('/api/shops/my').then((r) => r.data),
  updateMyShop: (payload: UpdateShopPayload) =>
    apiClient.put<Shop>('/api/shops/my', payload).then((r) => r.data),
  getShopById: (id: string) =>
    apiClient.get<Shop>(`/api/shops/${id}`).then((r) => r.data),
};
