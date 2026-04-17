import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import ToastContainer from '../../components/Toast';
import ShopProfile from './ShopProfile';

// Mock the shops API
vi.mock('../../api/shops', () => ({
  shopsApi: {
    getMyShop: vi.fn(),
    updateMyShop: vi.fn(),
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
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          {ui}
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ShopProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[ShopProfile] On mount, fetches shop via GET /api/shops/my', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      description: 'A great shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(vi.mocked(shopsApi.getMyShop)).toHaveBeenCalledOnce();
    });
  });

  it('[ShopProfile] Shows loading spinner while fetching', async () => {
    const { shopsApi } = await import('../../api/shops');
    let resolveGetShop: any;
    const getShopPromise = new Promise((resolve) => {
      resolveGetShop = resolve;
    });
    vi.mocked(shopsApi.getMyShop).mockReturnValueOnce(getShopPromise as any);

    renderWithProviders(<ShopProfile />);

    // Look for loading spinner (Spinner component has aria-label="Loading")
    await waitFor(() => {
      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });

    resolveGetShop({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });
  });

  it('[ShopProfile] If shop exists, renders form with fields pre-filled with current values', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      description: 'A great shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toHaveValue('My Shop');
      expect(screen.getByLabelText(/description/i)).toHaveValue('A great shop');
    });
  });

  it('[ShopProfile] Form fields: name, description, banner_url, contact_email with proper labels', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      description: 'A great shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/banner/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    });
  });

  it('[ShopProfile] Submit button calls PUT /api/shops/my with updated payload', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      description: 'A great shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    });

    vi.mocked(shopsApi.updateMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'Updated Shop',
      description: 'Updated description',
      banner_url: 'https://example.com/new-banner.jpg',
      contact_email: 'newemail@example.com',
      created_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toHaveValue('My Shop');
    });

    const nameInput = screen.getByLabelText(/shop name/i) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLInputElement;

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Shop');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated description');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(vi.mocked(shopsApi.updateMyShop)).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Shop',
          description: 'Updated description',
        })
      );
    });
  });

  it('[ShopProfile] Button disabled during save request (prevents concurrent saves)', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });

    let resolveUpdate: any;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });
    vi.mocked(shopsApi.updateMyShop).mockReturnValueOnce(updatePromise as any);

    const user = userEvent.setup();
    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });

    await user.click(saveButton);

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });

    resolveUpdate({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('[ShopProfile] On successful save, shows success message', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });

    vi.mocked(shopsApi.updateMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/shop name/i) as HTMLInputElement;
    const form = nameInput.closest('form')!;

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/updated successfully/i)).toBeInTheDocument();
    });
  });

  it('[ShopProfile] On save error, shows error message', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });

    const error = new Error('Server error');
    (error as any).response = { status: 500 };
    vi.mocked(shopsApi.updateMyShop).mockRejectedValueOnce(error);

    const user = userEvent.setup();
    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it('[ShopProfile] If GET /api/shops/my returns 404, redirects to /seller/onboarding', async () => {
    const { shopsApi } = await import('../../api/shops');
    const error = new Error('Not found');
    (error as any).response = { status: 404 };
    vi.mocked(shopsApi.getMyShop).mockRejectedValueOnce(error);

    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/seller/onboarding');
    });
  });

  it('[ShopProfile] Form validation: name is required, shows error on submit if empty', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/shop name/i) as HTMLInputElement;
    const form = nameInput.closest('form')!;
    await user.clear(nameInput);

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('[ShopProfile] Form validation: contact_email format validated if provided', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getMyShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<ShopProfile />);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/shop name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/contact email/i) as HTMLInputElement;
    const form = nameInput.closest('form')!;
    await user.type(emailInput, 'invalid-email');

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });
});
