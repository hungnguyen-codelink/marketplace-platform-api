import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import ToastContainer from '../../components/Toast';
import ProductManagement from './ProductManagement';

vi.mock('../../api/products', () => ({
  productsApi: {
    getMyProducts: vi.fn(),
    deleteProduct: vi.fn(),
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
      <AuthProvider>
        <ToastProvider>
          {ui}
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ProductManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[ProductManagement] On mount, fetches seller products via GET /api/products/my', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getMyProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'My Product 1',
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

    renderWithProviders(<ProductManagement />);

    await waitFor(() => {
      expect(vi.mocked(productsApi.getMyProducts)).toHaveBeenCalled();
    });
  });

  it('[ProductManagement] Shows loading spinner while fetching', async () => {
    const { productsApi } = await import('../../api/products');
    let resolveGet: any;
    const getPromise = new Promise((resolve) => {
      resolveGet = resolve;
    });
    vi.mocked(productsApi.getMyProducts).mockReturnValueOnce(getPromise as any);

    renderWithProviders(<ProductManagement />);

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

  it('[ProductManagement] Displays products table with title, price, stock columns', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getMyProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'My Product 1',
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

    renderWithProviders(<ProductManagement />);

    await waitFor(() => {
      expect(screen.getByText('My Product 1')).toBeInTheDocument();
      expect(screen.getByText('$99.99')).toBeInTheDocument();
      expect(screen.getByText(/10/)).toBeInTheDocument();
    });
  });

  it('[ProductManagement] Has "Create Product" link to /seller/products/new', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getMyProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'My Product 1',
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

    renderWithProviders(<ProductManagement />);

    await waitFor(() => {
      const createLinks = screen.getAllByRole('link', { name: /create product/i });
      const topCreateLink = createLinks[0];
      expect(topCreateLink).toHaveAttribute('href', '/seller/products/new');
    });
  });

  it('[ProductManagement] Edit button links to /seller/products/:id/edit', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getMyProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'My Product 1',
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

    renderWithProviders(<ProductManagement />);

    await waitFor(() => {
      const editLink = screen.getByRole('link', { name: /edit/i });
      expect(editLink).toHaveAttribute('href', '/seller/products/prod-1/edit');
    });
  });

  it('[ProductManagement] Delete button opens confirm dialog', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getMyProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'My Product 1',
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

    const user = userEvent.setup();
    renderWithProviders(<ProductManagement />);

    await waitFor(() => {
      expect(screen.getByText('My Product 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });

  it('[ProductManagement] Delete dialog calls DELETE API on confirm', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getMyProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'My Product 1',
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

    vi.mocked(productsApi.deleteProduct).mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    renderWithProviders(<ProductManagement />);

    await waitFor(() => {
      expect(screen.getByText('My Product 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    // The modal has two buttons - we need to click the one that's the confirm button (rightmost)
    const buttons = screen.getAllByRole('button');
    const modalDeleteButton = buttons[buttons.length - 1]; // Last button is the confirm button
    await user.click(modalDeleteButton);

    await waitFor(() => {
      expect(vi.mocked(productsApi.deleteProduct)).toHaveBeenCalledWith('prod-1');
    });
  });

  it('[ProductManagement] On delete success, shows success toast', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getMyProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          shop_id: 'shop-1',
          title: 'My Product 1',
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

    vi.mocked(productsApi.deleteProduct).mockResolvedValueOnce(undefined);
    vi.mocked(productsApi.getMyProducts).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    const user = userEvent.setup();
    renderWithProviders(<ProductManagement />);

    await waitFor(() => {
      expect(screen.getByText('My Product 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    // The modal has two buttons - we need to click the one that's the confirm button (rightmost)
    const buttons = screen.getAllByRole('button');
    const modalDeleteButton = buttons[buttons.length - 1]; // Last button is the confirm button
    await user.click(modalDeleteButton);

    await waitFor(() => {
      expect(screen.getByText(/deleted successfully/i)).toBeInTheDocument();
    });
  });

  it('[ProductManagement] Shows EmptyState when no products exist', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getMyProducts).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<ProductManagement />);

    await waitFor(() => {
      expect(screen.getByText(/no products yet/i)).toBeInTheDocument();
    });
  });
});
