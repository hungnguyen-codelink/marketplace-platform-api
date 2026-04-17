import apiClient from './client';
import type { FakestoreProduct } from '../types';

export interface ImportProductsResponse {
  importedIds: number[];
  count: number;
}

export const fakestoreApi = {
  getProducts: () =>
    apiClient.get<FakestoreProduct[]>('/api/fakestore/products', {}).then((r) => r.data),

  importProducts: (ids: number[], overwrite: boolean) =>
    apiClient
      .post<ImportProductsResponse>('/api/fakestore/import', {
        ids,
        overwrite,
      })
      .then((r) => r.data),
};
