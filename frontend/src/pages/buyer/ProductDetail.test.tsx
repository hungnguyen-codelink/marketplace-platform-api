import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../contexts/ToastContext';
import ProductDetail from './ProductDetail';

vi.mock('../../api/products', () => ({
  productsApi: {
    getProductById: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'prod-1' }),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );
}

describe('ProductDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[ProductDetail] On mount, fetches product via GET /api/products/:id with route param', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Laptop',
      description: 'A great laptop',
      price: 999.99,
      image_url: 'https://example.com/laptop.jpg',
      category: 'electronics',
      stock: 5,
      aggregate_rating: 4.8,
      review_count: 20,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ProductDetail />);

    await waitFor(() => {
      expect(vi.mocked(productsApi.getProductById)).toHaveBeenCalledWith('prod-1');
    });
  });

  it('[ProductDetail] Shows loading spinner while fetching', async () => {
    const { productsApi } = await import('../../api/products');
    let resolveGet: any;
    const getPromise = new Promise((resolve) => {
      resolveGet = resolve;
    });
    vi.mocked(productsApi.getProductById).mockReturnValueOnce(getPromise as any);

    renderWithProviders(<ProductDetail />);

    await waitFor(() => {
      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });

    resolveGet({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Laptop',
      price: 999.99,
      stock: 5,
      aggregate_rating: 4.8,
      review_count: 20,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });
  });

  it('[ProductDetail] If product found, displays: product image, title, description, price, rating, stock status, review count', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Laptop',
      description: 'A great laptop',
      price: 999.99,
      image_url: 'https://example.com/laptop.jpg',
      category: 'electronics',
      stock: 5,
      aggregate_rating: 4.8,
      review_count: 20,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ProductDetail />);

    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('A great laptop')).toBeInTheDocument();
      expect(screen.getByText('$999.99')).toBeInTheDocument();
      expect(screen.getByText(/in stock/i)).toBeInTheDocument();
      expect(screen.getByText(/20 reviews/i)).toBeInTheDocument();
    });
  });

  it('[ProductDetail] Displays product image', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Laptop',
      price: 999.99,
      image_url: 'https://example.com/laptop.jpg',
      stock: 5,
      aggregate_rating: 4.8,
      review_count: 20,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ProductDetail />);

    await waitFor(() => {
      const img = screen.getByAltText('Laptop');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/laptop.jpg');
    });
  });

  it('[ProductDetail] Shows "Out of Stock" badge when stock === 0', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Laptop',
      price: 999.99,
      stock: 0,
      aggregate_rating: 4.8,
      review_count: 20,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ProductDetail />);

    await waitFor(() => {
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    });
  });

  it('[ProductDetail] Shows "In Stock" badge when stock > 0', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Laptop',
      price: 999.99,
      stock: 5,
      aggregate_rating: 4.8,
      review_count: 20,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ProductDetail />);

    await waitFor(() => {
      expect(screen.getByText(/in stock/i)).toBeInTheDocument();
    });
  });

  it('[ProductDetail] Displays review count as plain text (X reviews)', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Laptop',
      price: 999.99,
      stock: 5,
      aggregate_rating: 4.8,
      review_count: 42,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ProductDetail />);

    await waitFor(() => {
      expect(screen.getByText(/42 reviews/i)).toBeInTheDocument();
    });
  });

  it('[ProductDetail] Shows StarRating component with product aggregate_rating', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Laptop',
      price: 999.99,
      stock: 5,
      aggregate_rating: 4.8,
      review_count: 20,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<ProductDetail />);

    await waitFor(() => {
      const starRating = screen.getByRole('img', { name: /4.8 out of 5 stars/i });
      expect(starRating).toBeInTheDocument();
    });
  });

  it('[ProductDetail] If product not found (404), shows not-found message', async () => {
    const { productsApi } = await import('../../api/products');
    const error = new Error('Not found');
    (error as any).response = { status: 404 };
    vi.mocked(productsApi.getProductById).mockRejectedValueOnce(error);

    renderWithProviders(<ProductDetail />);

    await waitFor(() => {
      expect(screen.getByText(/product not found/i)).toBeInTheDocument();
    });
  });
});
