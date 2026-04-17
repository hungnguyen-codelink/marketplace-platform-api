import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import ToastContainer from '../../components/Toast';
import EditProduct from './EditProduct';

vi.mock('../../api/products', () => ({
  productsApi: {
    getProductById: vi.fn(),
    updateProduct: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'prod-1' }),
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

describe('EditProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[EditProduct] On mount, fetches product via GET /api/products/:id with route param', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      description: 'A test product',
      price: 99.99,
      image_url: 'https://example.com/image.jpg',
      category: 'electronics',
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      expect(vi.mocked(productsApi.getProductById)).toHaveBeenCalledWith('prod-1');
    });
  });

  it('[EditProduct] Shows loading spinner while fetching', async () => {
    const { productsApi } = await import('../../api/products');
    let resolveGet: any;
    const getPromise = new Promise((resolve) => {
      resolveGet = resolve;
    });
    vi.mocked(productsApi.getProductById).mockReturnValueOnce(getPromise as any);

    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });

    resolveGet({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      price: 99.99,
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });
  });

  it('[EditProduct] Displays form with product data pre-filled', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      description: 'A test product',
      price: 99.99,
      image_url: 'https://example.com/image.jpg',
      category: 'electronics',
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Test Product');
      expect(screen.getByLabelText(/description/i)).toHaveValue('A test product');
      expect(screen.getByLabelText(/price/i)).toHaveValue(99.99);
      expect(screen.getByLabelText(/image/i)).toHaveValue('https://example.com/image.jpg');
      expect(screen.getByLabelText(/category/i)).toHaveValue('electronics');
      expect(screen.getByLabelText(/stock/i)).toHaveValue(50);
    });
  });

  it('[EditProduct] Has form fields: title, description, price, image_url, category, stock', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      price: 99.99,
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/image/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stock/i)).toBeInTheDocument();
    });
  });

  it('[EditProduct] Submit button calls PUT /api/products/:id with updated payload', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      description: 'A test product',
      price: 99.99,
      image_url: 'https://example.com/image.jpg',
      category: 'electronics',
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    vi.mocked(productsApi.updateProduct).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Updated Product',
      description: 'Updated description',
      price: 199.99,
      image_url: 'https://example.com/new-image.jpg',
      category: 'electronics',
      stock: 100,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Test Product');
    });

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    const priceInput = screen.getByLabelText(/price/i) as HTMLInputElement;
    const stockInput = screen.getByLabelText(/stock/i) as HTMLInputElement;

    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Product');
    await user.clear(priceInput);
    await user.type(priceInput, '199.99');
    await user.clear(stockInput);
    await user.type(stockInput, '100');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(vi.mocked(productsApi.updateProduct)).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({
          title: 'Updated Product',
          price: 199.99,
          stock: 100,
        })
      );
    });
  });

  it('[EditProduct] Form validation: title is required', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      price: 99.99,
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    const form = titleInput.closest('form')!;
    await user.clear(titleInput);

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('[EditProduct] Form validation: price is required and must be > 0', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      price: 99.99,
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    });

    const priceInput = screen.getByLabelText(/price/i) as HTMLInputElement;
    const form = priceInput.closest('form')!;
    await user.clear(priceInput);
    await user.type(priceInput, '0');

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/price must be greater than 0/i)).toBeInTheDocument();
    });
  });

  it('[EditProduct] Form validation: stock is required and must be integer between 0-999999', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      price: 99.99,
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      expect(screen.getByLabelText(/stock/i)).toBeInTheDocument();
    });

    const stockInput = screen.getByLabelText(/stock/i) as HTMLInputElement;
    const form = stockInput.closest('form')!;
    await user.clear(stockInput);
    await user.type(stockInput, '1000000');

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/stock must be between 0 and 999999/i)).toBeInTheDocument();
    });
  });

  it('[EditProduct] On successful save, shows success toast and navigates to /seller/products', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      price: 99.99,
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    vi.mocked(productsApi.updateProduct).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      price: 99.99,
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/product updated successfully/i)).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/seller/products');
    });
  });

  it('[EditProduct] Cancel button navigates to /seller/products', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.getProductById).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      price: 99.99,
      stock: 50,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<EditProduct />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/seller/products');
  });
});
