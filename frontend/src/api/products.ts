import apiClient from './client';
import type { Product, PaginatedResponse } from '../types';

export interface CreateProductPayload {
  title: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  stock: number;
}

export interface UpdateProductPayload {
  title?: string;
  description?: string;
  price?: number;
  image_url?: string;
  category?: string;
  stock?: number;
}

export interface GetProductsParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface GetMyProductsParams {
  page?: number;
  limit?: number;
}

export const productsApi = {
  getProducts: (params?: GetProductsParams) =>
    apiClient
      .get<PaginatedResponse<Product>>('/api/products', { params })
      .then((r) => r.data),
  getProductById: (id: string) =>
    apiClient.get<Product>(`/api/products/${id}`).then((r) => r.data),
  getMyProducts: (params?: GetMyProductsParams) =>
    apiClient
      .get<PaginatedResponse<Product>>('/api/products/my', { params })
      .then((r) => r.data),
  createProduct: (payload: CreateProductPayload) =>
    apiClient.post<Product>('/api/products', payload).then((r) => r.data),
  updateProduct: (id: string, payload: UpdateProductPayload) =>
    apiClient.put<Product>(`/api/products/${id}`, payload).then((r) => r.data),
  deleteProduct: (id: string) =>
    apiClient.delete(`/api/products/${id}`).then((r) => r.data),
};
