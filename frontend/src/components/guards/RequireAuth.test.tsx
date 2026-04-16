import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAuth from './RequireAuth';
import * as AuthContextModule from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderWithRouter(ui: React.ReactElement, route = '/protected') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAuth', () => {
  it('redirects unauthenticated users to /login?returnTo=<path>', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({ isAuthenticated: false } as any);
    renderWithRouter(<RequireAuth><div>Protected</div></RequireAuth>);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({ isAuthenticated: true } as any);
    renderWithRouter(<RequireAuth><div>Protected Content</div></RequireAuth>);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
