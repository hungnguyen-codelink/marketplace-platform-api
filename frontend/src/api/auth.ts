import apiClient from './client';
import type { User } from '../types';

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
  role: 'buyer' | 'seller';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data),
  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', payload).then((r) => r.data),
  logout: () => apiClient.post('/auth/logout').then(() => {}),
};
