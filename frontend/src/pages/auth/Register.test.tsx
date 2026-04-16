import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import ToastContainer from '../../components/Toast';
import Register from './Register';

// Mock the auth API
vi.mock('../../api/auth', () => ({
  authApi: {
    register: vi.fn(),
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

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <ToastProvider>
          {ui}
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    renderWithProviders(<Register />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /account type/i })).toBeInTheDocument();
  });

  it('renders role select with buyer and seller options', () => {
    renderWithProviders(<Register />);
    const roleSelect = screen.getByRole('combobox', { name: /account type/i }) as HTMLSelectElement;
    expect(roleSelect).toBeInTheDocument();
    const options = Array.from(roleSelect.options).map((o) => o.value);
    expect(options).toContain('buyer');
    expect(options).toContain('seller');
  });

  it('role select has no default selected option', () => {
    renderWithProviders(<Register />);
    const roleSelect = screen.getByRole('combobox', { name: /account type/i }) as HTMLSelectElement;
    expect(roleSelect.value).toBe('');
  });

  it('renders submit button', () => {
    renderWithProviders(<Register />);
    expect(screen.getByRole('button', { name: /register|sign up/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.selectOptions(screen.getByRole('combobox', { name: /account type/i }), 'buyer');
    fireEvent.submit(form);

    expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
  });

  it('shows validation error for password less than 8 characters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.type(emailInput, 'test@example.com');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.selectOptions(screen.getByRole('combobox', { name: /account type/i }), 'buyer');
    fireEvent.submit(form);

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows validation error for empty full name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.type(emailInput, 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.selectOptions(screen.getByRole('combobox', { name: /account type/i }), 'buyer');
    fireEvent.submit(form);

    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
  });

  it('shows validation error when role is not selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.type(emailInput, 'test@example.com');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    fireEvent.submit(form);

    expect(screen.getByText(/role is required/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const { authApi } = await import('../../api/auth');
    vi.mocked(authApi.register).mockResolvedValueOnce({
      user: {
        id: '1',
        email: 'test@example.com',
        full_name: 'John Doe',
        role: 'buyer',
        email_verified: false,
        terms_accepted: false,
        created_at: '2026-04-16T00:00:00Z',
      },
      token: 'test-token',
    });

    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.type(emailInput, 'test@example.com');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.selectOptions(screen.getByRole('combobox', { name: /account type/i }), 'buyer');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(vi.mocked(authApi.register)).toHaveBeenCalledWith({
        email: 'test@example.com',
        full_name: 'John Doe',
        password: 'password123',
        role: 'buyer',
      });
    });
  });

  it('navigates to / on successful registration', async () => {
    const { authApi } = await import('../../api/auth');
    vi.mocked(authApi.register).mockResolvedValueOnce({
      user: {
        id: '1',
        email: 'test@example.com',
        full_name: 'John Doe',
        role: 'buyer',
        email_verified: false,
        terms_accepted: false,
        created_at: '2026-04-16T00:00:00Z',
      },
      token: 'test-token',
    });

    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.type(emailInput, 'test@example.com');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.selectOptions(screen.getByRole('combobox', { name: /account type/i }), 'seller');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('maps server field errors to inline errors on 400', async () => {
    const { authApi } = await import('../../api/auth');
    const error = new Error('Validation failed');
    (error as any).response = {
      status: 400,
      data: {
        errors: {
          email: ['Email is taken'],
          password: ['Password is weak'],
        },
      },
    };
    vi.mocked(authApi.register).mockRejectedValueOnce(error);

    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.type(emailInput, 'taken@example.com');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'shortpass');
    await user.selectOptions(screen.getByRole('combobox', { name: /account type/i }), 'buyer');
    fireEvent.submit(form);

    await waitFor(() => {
      const errorTexts = screen.queryAllByText(/Email is taken|Password is weak/);
      expect(errorTexts.length).toBeGreaterThan(0);
    });
  });

  it('shows toast message on 409 conflict (email exists)', async () => {
    const { authApi } = await import('../../api/auth');
    const error = new Error('Email already exists');
    (error as any).response = { status: 409 };
    vi.mocked(authApi.register).mockRejectedValueOnce(error);

    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.type(emailInput, 'existing@example.com');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.selectOptions(screen.getByRole('combobox', { name: /account type/i }), 'buyer');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it('disables button during request', async () => {
    const { authApi } = await import('../../api/auth');
    let resolveRegister: any;
    const registerPromise = new Promise((resolve) => {
      resolveRegister = resolve;
    });
    vi.mocked(authApi.register).mockReturnValueOnce(registerPromise as any);

    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.type(emailInput, 'test@example.com');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.selectOptions(screen.getByRole('combobox', { name: /account type/i }), 'buyer');
    const submitButton = screen.getByRole('button', { name: /register|sign up/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolveRegister({
      user: {
        id: '1',
        email: 'test@example.com',
        full_name: 'John Doe',
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

  it('stores user and token in localStorage on successful registration', async () => {
    const testUser = {
      id: '1',
      email: 'test@example.com',
      full_name: 'John Doe',
      role: 'seller' as const,
      email_verified: false,
      terms_accepted: false,
      created_at: '2026-04-16T00:00:00Z',
    };
    const { authApi } = await import('../../api/auth');
    vi.mocked(authApi.register).mockResolvedValueOnce({
      user: testUser,
      token: 'test-token',
    });

    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const form = emailInput.closest('form')!;
    await user.type(emailInput, 'test@example.com');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.selectOptions(screen.getByRole('combobox', { name: /account type/i }), 'seller');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    expect(localStorage.getItem('token')).toBe('test-token');
    expect(localStorage.getItem('user')).toBe(JSON.stringify(testUser));
  });
});
