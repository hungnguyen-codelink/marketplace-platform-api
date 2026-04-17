import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../contexts/ToastContext';
import ShopDetail from './ShopDetail';

// Mock the shops API
vi.mock('../../api/shops', () => ({
  shopsApi: {
    getShopById: vi.fn(),
  },
}));

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'shop-1' }),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );
}

describe('ShopDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[ShopDetail] On mount, fetches shop via GET /api/shops/:id with route param', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getShopById).mockResolvedValueOnce({
      id: 'shop-1',
      name: 'Test Shop',
      description: 'A test shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ShopDetail />);

    await waitFor(() => {
      expect(vi.mocked(shopsApi.getShopById)).toHaveBeenCalledWith('shop-1');
    });
  });

  it('[ShopDetail] Shows loading spinner while fetching', async () => {
    const { shopsApi } = await import('../../api/shops');
    let resolveGetShop: any;
    const getShopPromise = new Promise((resolve) => {
      resolveGetShop = resolve;
    });
    vi.mocked(shopsApi.getShopById).mockReturnValueOnce(getShopPromise as any);

    renderWithProviders(<ShopDetail />);

    // Look for loading spinner (Spinner component has aria-label="Loading")
    await waitFor(() => {
      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });

    resolveGetShop({
      id: 'shop-1',
      name: 'Test Shop',
      created_at: '2026-04-16T00:00:00Z',
    });
  });

  it('[ShopDetail] If shop found, displays: shop name, description, banner_url, contact_email, created_at', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.getShopById).mockResolvedValueOnce({
      id: 'shop-1',
      name: 'Test Shop',
      description: 'A test shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ShopDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Shop')).toBeInTheDocument();
      expect(screen.getByText('A test shop')).toBeInTheDocument();
      expect(screen.getByText('shop@example.com')).toBeInTheDocument();
    });
  });

  it('[ShopDetail] If shop not found (404), shows not-found message', async () => {
    const { shopsApi } = await import('../../api/shops');
    const error = new Error('Not found');
    (error as any).response = { status: 404 };
    vi.mocked(shopsApi.getShopById).mockRejectedValueOnce(error);

    renderWithProviders(<ShopDetail />);

    await waitFor(() => {
      expect(screen.getByText(/shop not found/i)).toBeInTheDocument();
    });
  });
});
