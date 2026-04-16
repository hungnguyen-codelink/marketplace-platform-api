import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import Login from './Login';

// Mock the auth API
vi.mock('../../api/auth', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithProviders(ui: React.ReactElement, { route = '/login' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password input fields', () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole('button', { name: /login|sign in/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid email on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;

    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');

    // Submit the form directly
    fireEvent.submit(form);

    // Error message should appear immediately after validation
    expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
  });

  it('shows validation error for empty password on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;

    await user.type(emailInput, 'test@example.com');
    fireEvent.submit(form);

    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('submits form with valid credentials', async () => {
    const { authApi } = await import('../../api/auth');
    vi.mocked(authApi.login).mockResolvedValueOnce({
      user: {
        id: '1',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'buyer',
        email_verified: false,
        terms_accepted: false,
        created_at: '2026-04-16T00:00:00Z',
      },
      token: 'test-token',
    });

    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(vi.mocked(authApi.login)).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('navigates to / on successful login', async () => {
    const { authApi } = await import('../../api/auth');
    vi.mocked(authApi.login).mockResolvedValueOnce({
      user: {
        id: '1',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'buyer',
        email_verified: false,
        terms_accepted: false,
        created_at: '2026-04-16T00:00:00Z',
      },
      token: 'test-token',
    });

    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('navigates to returnTo query param on successful login', async () => {
    const { authApi } = await import('../../api/auth');
    vi.mocked(authApi.login).mockResolvedValueOnce({
      user: {
        id: '1',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'buyer',
        email_verified: false,
        terms_accepted: false,
        created_at: '2026-04-16T00:00:00Z',
      },
      token: 'test-token',
    });

    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: '/login?returnTo=%2Fdashboard' });

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows generic error message on 400/401 response', async () => {
    const { authApi } = await import('../../api/auth');
    const error = new Error('Invalid credentials');
    (error as any).response = { status: 401 };
    vi.mocked(authApi.login).mockRejectedValueOnce(error);

    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('disables button during request', async () => {
    const { authApi } = await import('../../api/auth');
    let resolveLogin: any;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    vi.mocked(authApi.login).mockReturnValueOnce(loginPromise as any);

    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    const submitButton = screen.getByRole('button', { name: /login|sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolveLogin({
      user: {
        id: '1',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'buyer',
        email_verified: false,
        terms_accepted: false,
        created_at: '2026-04-16T00:00:00Z',
      },
      token: 'test-token',
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows loading state on button during request', async () => {
    const { authApi } = await import('../../api/auth');
    let resolveLogin: any;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    vi.mocked(authApi.login).mockReturnValueOnce(loginPromise as any);

    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    const submitButton = screen.getByRole('button', { name: /login|sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.submit(form);

    // Check for loading spinner
    await waitFor(() => {
      expect(submitButton.querySelector('svg')).toBeInTheDocument();
    });

    resolveLogin({
      user: {
        id: '1',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'buyer',
        email_verified: false,
        terms_accepted: false,
        created_at: '2026-04-16T00:00:00Z',
      },
      token: 'test-token',
    });

    await waitFor(() => {
      expect(submitButton.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  it('stores user and token in localStorage on successful login', async () => {
    const testUser = {
      id: '1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'buyer' as const,
      email_verified: false,
      terms_accepted: false,
      created_at: '2026-04-16T00:00:00Z',
    };
    const { authApi } = await import('../../api/auth');
    vi.mocked(authApi.login).mockResolvedValueOnce({
      user: testUser,
      token: 'test-token',
    });

    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    expect(localStorage.getItem('token')).toBe('test-token');
    expect(localStorage.getItem('user')).toBe(JSON.stringify(testUser));
  });
});
