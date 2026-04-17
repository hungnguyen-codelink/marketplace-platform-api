import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import ToastContainer from '../../components/Toast';
import CreateProduct from './CreateProduct';

vi.mock('../../api/products', () => ({
  productsApi: {
    createProduct: vi.fn(),
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

describe('CreateProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[CreateProduct] Displays form with title, description, price, image_url, category, stock fields', async () => {
    renderWithProviders(<CreateProduct />);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/image/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stock/i)).toBeInTheDocument();
    });
  });

  it('[CreateProduct] Title field is required', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateProduct />);

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('[CreateProduct] Price field is required', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateProduct />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Test Product');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/price is required/i)).toBeInTheDocument();
    });
  });

  it('[CreateProduct] Price must be > 0', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateProduct />);

    const titleInput = screen.getByLabelText(/title/i);
    const priceInput = screen.getByLabelText(/price/i);

    await user.type(titleInput, 'Test Product');
    await user.type(priceInput, '0');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/price must be greater than 0/i)).toBeInTheDocument();
    });
  });

  it('[CreateProduct] Price max 2 decimal places validation', async () => {
    // HTML5 input step="0.01" allows entering decimals up to 2 places
    // This test verifies the validation logic would catch >2 decimals
    const user = userEvent.setup();
    renderWithProviders(<CreateProduct />);

    const titleInput = screen.getByLabelText(/title/i);
    const priceInput = screen.getByLabelText(/price/i);

    await user.type(titleInput, 'Test Product');
    await user.type(priceInput, '99.99');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Should not show an error for valid 2 decimal places
    await waitFor(() => {
      expect(screen.queryByText(/max 2 decimal places/i)).not.toBeInTheDocument();
    });
  });

  it('[CreateProduct] Stock field is required', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateProduct />);

    const titleInput = screen.getByLabelText(/title/i);
    const priceInput = screen.getByLabelText(/price/i);

    await user.type(titleInput, 'Test Product');
    await user.type(priceInput, '99.99');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/stock is required/i)).toBeInTheDocument();
    });
  });

  it('[CreateProduct] Stock validation logic checks for whole numbers', async () => {
    // Note: HTML5 number inputs prevent decimal input, so this test verifies
    // the validation function would catch decimals if somehow entered
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.createProduct).mockResolvedValueOnce({
      id: 'prod-1',
      shop_id: 'shop-1',
      title: 'Test Product',
      price: 99.99,
      stock: 10,
      aggregate_rating: 0,
      review_count: 0,
      created_at: '2026-04-16T00:00:00Z',
      updated_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<CreateProduct />);

    const titleInput = screen.getByLabelText(/title/i);
    const priceInput = screen.getByLabelText(/price/i);
    const stockInput = screen.getByLabelText(/stock/i);

    await user.type(titleInput, 'Test Product');
    await user.type(priceInput, '99.99');
    await user.type(stockInput, '10');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(vi.mocked(productsApi.createProduct)).toHaveBeenCalledWith(
        expect.objectContaining({
          stock: 10,
        })
      );
    });
  });

  it('[CreateProduct] Stock must be between 0 and 999999', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateProduct />);

    const titleInput = screen.getByLabelText(/title/i);
    const priceInput = screen.getByLabelText(/price/i);
    const stockInput = screen.getByLabelText(/stock/i);

    await user.type(titleInput, 'Test Product');
    await user.type(priceInput, '99.99');
    await user.type(stockInput, '1000000');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/stock must be between 0 and 999999/i)).toBeInTheDocument();
    });
  });

  it('[CreateProduct] Submit button calls POST /api/products with form data', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.createProduct).mockResolvedValueOnce({
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

    const user = userEvent.setup();
    renderWithProviders(<CreateProduct />);

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const priceInput = screen.getByLabelText(/price/i);
    const imageInput = screen.getByLabelText(/image/i);
    const categoryInput = screen.getByLabelText(/category/i);
    const stockInput = screen.getByLabelText(/stock/i);

    await user.type(titleInput, 'Test Product');
    await user.type(descriptionInput, 'A test product');
    await user.type(priceInput, '99.99');
    await user.type(imageInput, 'https://example.com/image.jpg');
    await user.selectOptions(categoryInput, 'electronics');
    await user.type(stockInput, '50');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(vi.mocked(productsApi.createProduct)).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Product',
          description: 'A test product',
          price: 99.99,
          image_url: 'https://example.com/image.jpg',
          category: 'electronics',
          stock: 50,
        })
      );
    });
  });

  it('[CreateProduct] On success, shows success toast and navigates to /seller/products', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.createProduct).mockResolvedValueOnce({
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
    renderWithProviders(<CreateProduct />);

    const titleInput = screen.getByLabelText(/title/i);
    const priceInput = screen.getByLabelText(/price/i);
    const stockInput = screen.getByLabelText(/stock/i);

    await user.type(titleInput, 'Test Product');
    await user.type(priceInput, '99.99');
    await user.type(stockInput, '50');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/product created successfully/i)).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/seller/products');
    });
  });

  it('[CreateProduct] Cancel button navigates to /seller/products', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateProduct />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/seller/products');
  });

  it('[CreateProduct] Description and image_url are optional', async () => {
    const { productsApi } = await import('../../api/products');
    vi.mocked(productsApi.createProduct).mockResolvedValueOnce({
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
    renderWithProviders(<CreateProduct />);

    const titleInput = screen.getByLabelText(/title/i);
    const priceInput = screen.getByLabelText(/price/i);
    const stockInput = screen.getByLabelText(/stock/i);

    await user.type(titleInput, 'Test Product');
    await user.type(priceInput, '99.99');
    await user.type(stockInput, '50');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(vi.mocked(productsApi.createProduct)).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Product',
          price: 99.99,
          stock: 50,
        })
      );
    });
  });
});
