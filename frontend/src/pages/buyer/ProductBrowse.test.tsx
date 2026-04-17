import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../contexts/ToastContext';
import ProductBrowse from './ProductBrowse';

vi.mock('../../api/products', () => ({
  productsApi: {
    getProducts: vi.fn(),
  },
}));

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
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );
}

describe('ProductBrowse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[ProductBrowse] On mount, fetches products via GET /api/products with default pagination', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'Product 1',
          price: 99.99,
          stock: 10,
          aggregate_rating: 4.5,
          review_count: 5,
          created_at: '2026-04-16T00:00:00Z',
          updated_at: '2026-04-16T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(vi.mocked(productsApi.getProducts)).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
        })
      );
    });
  });

  it('[ProductBrowse] Shows loading spinner while fetching', async () => {
    const { productsApi } = await import('../../api/products');
    let resolveGet: any;
    const getPromise = new Promise((resolve) => {
      resolveGet = resolve;
    });
    vi.mocked(productsApi.getProducts).mockReturnValueOnce(getPromise as any);

    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });

    resolveGet({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it('[ProductBrowse] Displays title "Browse Products" and search input', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByText(/browse products/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument();
    });
  });

  it('[ProductBrowse] Has category filter dropdown', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
    });
  });

  it('[ProductBrowse] Filters products by search input', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'Laptop',
          price: 999.99,
          stock: 5,
          aggregate_rating: 4.8,
          review_count: 20,
          created_at: '2026-04-16T00:00:00Z',
          updated_at: '2026-04-16T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const user = userEvent.setup();
    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'laptop');

    await waitFor(() => {
      expect(vi.mocked(productsApi.getProducts)).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'laptop',
        })
      );
    });
  });

  it('[ProductBrowse] Filters products by category dropdown', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    const user = userEvent.setup();
    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
    });

    const categorySelect = screen.getByDisplayValue('All Categories');
    await user.selectOptions(categorySelect, 'electronics');

    await waitFor(() => {
      expect(vi.mocked(productsApi.getProducts)).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'electronics',
        })
      );
    });
  });

  it('[ProductBrowse] Displays product grid with title, price, and image', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: [
        {
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
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('$999.99')).toBeInTheDocument();
    });
  });

  it('[ProductBrowse] Shows "Out of Stock" badge when stock === 0', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'Laptop',
          price: 999.99,
          stock: 0,
          aggregate_rating: 4.8,
          review_count: 20,
          created_at: '2026-04-16T00:00:00Z',
          updated_at: '2026-04-16T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    });
  });

  it('[ProductBrowse] Shows "In Stock" or stock count when stock > 0', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'Laptop',
          price: 999.99,
          stock: 5,
          aggregate_rating: 4.8,
          review_count: 20,
          created_at: '2026-04-16T00:00:00Z',
          updated_at: '2026-04-16T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByText(/in stock/i)).toBeInTheDocument();
    });
  });

  it('[ProductBrowse] Clicking product navigates to /products/:id', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'Laptop',
          price: 999.99,
          stock: 5,
          aggregate_rating: 4.8,
          review_count: 20,
          created_at: '2026-04-16T00:00:00Z',
          updated_at: '2026-04-16T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const user = userEvent.setup();
    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });

    const productLink = screen.getByRole('link', { name: 'Laptop' });
    await user.click(productLink);

    expect(mockNavigate).toHaveBeenCalledWith('/products/prod-1');
  });

  it('[ProductBrowse] Has pagination controls', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: `prod-${i}`,
        shop_id: 'shop-1',
        title: `Product ${i}`,
        price: 99.99 + i,
        stock: 10,
        aggregate_rating: 4.5,
        review_count: 5,
        created_at: '2026-04-16T00:00:00Z',
        updated_at: '2026-04-16T00:00:00Z',
      })),
      total: 50,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    });
  });

  it('[ProductBrowse] Pagination controls change page', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: `prod-${i}`,
        shop_id: 'shop-1',
        title: `Product ${i}`,
        price: 99.99 + i,
        stock: 10,
        aggregate_rating: 4.5,
        review_count: 5,
        created_at: '2026-04-16T00:00:00Z',
        updated_at: '2026-04-16T00:00:00Z',
      })),
      total: 50,
      page: 1,
      limit: 20,
    });

    const user = userEvent.setup();
    renderWithProviders(<ProductBrowse />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    });

    vi.mocked(productsApi.getProducts).mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: `prod-${20 + i}`,
        shop_id: 'shop-1',
        title: `Product ${20 + i}`,
        price: 99.99 + 20 + i,
        stock: 10,
        aggregate_rating: 4.5,
        review_count: 5,
        created_at: '2026-04-16T00:00:00Z',
        updated_at: '2026-04-16T00:00:00Z',
      })),
      total: 50,
      page: 2,
      limit: 20,
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(vi.mocked(productsApi.getProducts)).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });
});
