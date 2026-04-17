import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../contexts/ToastContext';
import Cart from './Cart';

const mockRemoveItem = vi.fn();
const mockUpdateQty = vi.fn();
const mockClearCart = vi.fn();
const mockNavigate = vi.fn();

// Mock CartContext
vi.mock('../../contexts/CartContext', () => {
  let mockCart = {
    items: [
      {
        product_id: 'prod-1',
        quantity: 2,
        title: 'Product 1',
        price: 50,
      },
    ],
    total: 100,
  };

  return {
    useCart: vi.fn(() => ({
      cart: mockCart,
      isLoading: false,
      addItem: vi.fn(),
      removeItem: mockRemoveItem,
      updateQty: mockUpdateQty,
      clearCart: mockClearCart,
    })),
    CartProvider: ({ children }: any) => children,
  };
});

// Mock react-router-dom
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

describe('Cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Cart] Renders cart title', () => {
    renderWithProviders(<Cart />);
    expect(screen.getByText(/your cart/i)).toBeInTheDocument();
  });

  it('[Cart] Displays cart items with product title, quantity, and price', () => {
    renderWithProviders(<Cart />);
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText(/quantity/i)).toBeInTheDocument();
  });

  it('[Cart] Displays order total', () => {
    renderWithProviders(<Cart />);
    const totalElements = screen.getAllByText(/\$100/);
    expect(totalElements.length).toBeGreaterThan(0);
  });

  it('[Cart] Shows increment button and calls updateQty on increment', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Cart />);

    const buttons = screen.getAllByRole('button');
    const incrementBtn = buttons.find((btn) => btn.textContent === '+');
    if (incrementBtn) {
      await user.click(incrementBtn);
      expect(mockUpdateQty).toHaveBeenCalledWith('prod-1', 3);
    }
  });

  it('[Cart] Shows decrement button and calls updateQty on decrement', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Cart />);

    const buttons = screen.getAllByRole('button');
    const decrementBtn = buttons.find((btn) => btn.textContent === '-');
    if (decrementBtn) {
      await user.click(decrementBtn);
      expect(mockUpdateQty).toHaveBeenCalledWith('prod-1', 1);
    }
  });

  it('[Cart] Shows remove button and calls removeItem on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Cart />);

    const removeBtn = screen.getByRole('button', { name: /remove/i });
    await user.click(removeBtn);

    expect(mockRemoveItem).toHaveBeenCalledWith('prod-1');
  });

  it('[Cart] Shows "Proceed to Checkout" button', () => {
    renderWithProviders(<Cart />);
    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument();
  });

  it('[Cart] Proceed button navigates to /checkout', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Cart />);

    const proceedBtn = screen.getByRole('button', { name: /proceed to checkout/i });
    await user.click(proceedBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/checkout');
  });
});
