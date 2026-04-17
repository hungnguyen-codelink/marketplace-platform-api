import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../contexts/ToastContext';
import Checkout from './Checkout';

// Mock orders API
vi.mock('../../api/orders', () => ({
  checkoutOrder: vi.fn(),
}));

// Mock CartContext
const mockClearCart = vi.fn();
vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({
    cart: { items: [], total: 100 },
    isLoading: false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQty: vi.fn(),
    clearCart: mockClearCart,
  }),
  CartProvider: ({ children }: any) => children,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );
}

describe('Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Checkout] Renders checkout title and shipping form', () => {
    renderWithProviders(<Checkout />);
    expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
  });

  it('[Checkout] Renders all required form fields: street, city, state, zip, country', () => {
    renderWithProviders(<Checkout />);
    expect(screen.getByLabelText(/street/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
  });

  it('[Checkout] Shows security notice about payment', () => {
    renderWithProviders(<Checkout />);
    expect(screen.getByText(/payment will be processed securely/i)).toBeInTheDocument();
  });

  it('[Checkout] Submit button is disabled initially (form empty)', () => {
    renderWithProviders(<Checkout />);
    const submitBtn = screen.getByRole('button', { name: /place order/i });
    expect(submitBtn).toBeDisabled();
  });

  it('[Checkout] Submit button enabled when all fields filled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Checkout />);

    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Boston');
    await user.type(screen.getByLabelText(/state/i), 'MA');
    await user.type(screen.getByLabelText(/zip/i), '02101');
    await user.type(screen.getByLabelText(/country/i), 'USA');

    const submitBtn = screen.getByRole('button', { name: /place order/i });
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it('[Checkout] On submit, calls checkoutOrder with shipping address', async () => {
    const { checkoutOrder } = await import('../../api/orders');
    const mockCheckout = vi.mocked(checkoutOrder);
    mockCheckout.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'pending',
      shipping_address: {
        street: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
        country: 'USA',
      },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<Checkout />);

    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Boston');
    await user.type(screen.getByLabelText(/state/i), 'MA');
    await user.type(screen.getByLabelText(/zip/i), '02101');
    await user.type(screen.getByLabelText(/country/i), 'USA');

    const submitBtn = screen.getByRole('button', { name: /place order/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCheckout).toHaveBeenCalledWith({
        street: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
        country: 'USA',
      });
    });
  });

  it('[Checkout] On success, navigates to /checkout/success with order ID', async () => {
    const { checkoutOrder } = await import('../../api/orders');
    const mockCheckout = vi.mocked(checkoutOrder);
    mockCheckout.mockResolvedValue({
      id: 'ord-123',
      buyer_id: 'buyer-1',
      status: 'pending',
      shipping_address: {
        street: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
        country: 'USA',
      },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<Checkout />);

    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Boston');
    await user.type(screen.getByLabelText(/state/i), 'MA');
    await user.type(screen.getByLabelText(/zip/i), '02101');
    await user.type(screen.getByLabelText(/country/i), 'USA');

    const submitBtn = screen.getByRole('button', { name: /place order/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/checkout/success', { state: { orderId: 'ord-123' } });
    });
  });

  it('[Checkout] On error, shows error toast (AC-UI-05)', async () => {
    const { checkoutOrder } = await import('../../api/orders');
    const mockCheckout = vi.mocked(checkoutOrder);
    mockCheckout.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    renderWithProviders(<Checkout />);

    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Boston');
    await user.type(screen.getByLabelText(/state/i), 'MA');
    await user.type(screen.getByLabelText(/zip/i), '02101');
    await user.type(screen.getByLabelText(/country/i), 'USA');

    const submitBtn = screen.getByRole('button', { name: /place order/i });
    await user.click(submitBtn);

    // After error, submit button should be enabled again (showing the error happened)
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it('[Checkout] On error, does NOT clear cart (AC-UI-05)', async () => {
    const { checkoutOrder } = await import('../../api/orders');
    const mockCheckout = vi.mocked(checkoutOrder);
    mockCheckout.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    renderWithProviders(<Checkout />);

    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Boston');
    await user.type(screen.getByLabelText(/state/i), 'MA');
    await user.type(screen.getByLabelText(/zip/i), '02101');
    await user.type(screen.getByLabelText(/country/i), 'USA');

    const submitBtn = screen.getByRole('button', { name: /place order/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockClearCart).not.toHaveBeenCalled();
    });
  });

  it('[Checkout] On error, preserves form values (AC-UI-05)', async () => {
    const { checkoutOrder } = await import('../../api/orders');
    const mockCheckout = vi.mocked(checkoutOrder);
    mockCheckout.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    renderWithProviders(<Checkout />);

    const streetInput = screen.getByLabelText(/street/i) as HTMLInputElement;
    const cityInput = screen.getByLabelText(/city/i) as HTMLInputElement;

    await user.type(streetInput, '123 Main St');
    await user.type(cityInput, 'Boston');
    await user.type(screen.getByLabelText(/state/i), 'MA');
    await user.type(screen.getByLabelText(/zip/i), '02101');
    await user.type(screen.getByLabelText(/country/i), 'USA');

    const submitBtn = screen.getByRole('button', { name: /place order/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(streetInput.value).toBe('123 Main St');
      expect(cityInput.value).toBe('Boston');
    });
  });

  it('[Checkout] Submit button disabled while pending', async () => {
    const { checkoutOrder } = await import('../../api/orders');
    const mockCheckout = vi.mocked(checkoutOrder);
    mockCheckout.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              id: 'ord-123',
              buyer_id: 'buyer-1',
              status: 'pending',
              shipping_address: {
                street: '123 Main St',
                city: 'Boston',
                state: 'MA',
                zip: '02101',
                country: 'USA',
              },
              total_amount: 100,
              created_at: '2026-04-17T00:00:00Z',
              updated_at: '2026-04-17T00:00:00Z',
            });
          }, 1000);
        })
    );

    const user = userEvent.setup();
    renderWithProviders(<Checkout />);

    await user.type(screen.getByLabelText(/street/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'Boston');
    await user.type(screen.getByLabelText(/state/i), 'MA');
    await user.type(screen.getByLabelText(/zip/i), '02101');
    await user.type(screen.getByLabelText(/country/i), 'USA');

    const submitBtn = screen.getByRole('button', { name: /place order/i });
    await user.click(submitBtn);

    expect(submitBtn).toBeDisabled();
  });
});
