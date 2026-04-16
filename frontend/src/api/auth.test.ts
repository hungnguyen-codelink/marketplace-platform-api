import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './client';
import { authApi } from './auth';

vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockPost = vi.mocked(apiClient.post);

describe('authApi', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('register() posts to /auth/register and returns { user, token }', async () => {
    const user = { id: '1', email: 'a@b.com', full_name: 'A', role: 'buyer' };
    mockPost.mockResolvedValue({ data: { user, token: 'tok' } });
    const result = await authApi.register({
      email: 'a@b.com',
      full_name: 'A',
      password: 'pass1234',
      role: 'buyer',
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/register', expect.any(Object));
    expect(result).toEqual({ user, token: 'tok' });
  });

  it('login() posts to /auth/login and returns { user, token }', async () => {
    const user = { id: '1', email: 'a@b.com', full_name: 'A', role: 'buyer' };
    mockPost.mockResolvedValue({ data: { user, token: 'tok' } });
    const result = await authApi.login({ email: 'a@b.com', password: 'pass1234' });
    expect(mockPost).toHaveBeenCalledWith('/auth/login', expect.any(Object));
    expect(result).toEqual({ user, token: 'tok' });
  });

  it('logout() posts to /auth/logout', async () => {
    mockPost.mockResolvedValue({ data: null });
    await authApi.logout();
    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
  });
});
