import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as authModule from '../api/auth';

vi.mock('../api/auth', () => ({
  authApi: { logout: vi.fn(), login: vi.fn(), register: vi.fn() },
}));

// Helper to access context value
function TestComponent({ onAuth }: { onAuth: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  onAuth(auth);
  return null;
}

describe('AuthContext logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('calls authApi.logout() before clearing localStorage', async () => {
    localStorage.setItem('token', 'mytoken');
    localStorage.setItem('user', JSON.stringify({ id: '1' }));

    let authCtx: ReturnType<typeof useAuth> | null = null;
    vi.mocked(authModule.authApi.logout).mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent onAuth={(a) => { authCtx = a; }} />
      </AuthProvider>
    );

    await act(async () => {
      await authCtx!.logout();
    });

    expect(authModule.authApi.logout).toHaveBeenCalledOnce();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('still clears localStorage when authApi.logout() throws', async () => {
    localStorage.setItem('token', 'mytoken');
    vi.mocked(authModule.authApi.logout).mockRejectedValue(new Error('network error'));

    let authCtx: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthProvider>
        <TestComponent onAuth={(a) => { authCtx = a; }} />
      </AuthProvider>
    );

    await act(async () => {
      await authCtx!.logout();
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('does not throw when authApi.logout() fails', async () => {
    vi.mocked(authModule.authApi.logout).mockRejectedValue(new Error('network error'));
    let authCtx: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthProvider>
        <TestComponent onAuth={(a) => { authCtx = a; }} />
      </AuthProvider>
    );

    await expect(act(async () => {
      await authCtx!.logout();
    })).resolves.not.toThrow();
  });
});
