import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CheckoutSuccess from './CheckoutSuccess';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: { orderId: 'ord-123' },
    }),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('CheckoutSuccess', () => {
  it('[CheckoutSuccess] Renders confirmation message', () => {
    renderWithProviders(<CheckoutSuccess />);
    expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
  });

  it('[CheckoutSuccess] Displays order ID from navigation state', () => {
    renderWithProviders(<CheckoutSuccess />);
    expect(screen.getByText(/ord-123/i)).toBeInTheDocument();
  });

  it('[CheckoutSuccess] Shows link/button to /orders', () => {
    renderWithProviders(<CheckoutSuccess />);
    const ordersLink = screen.getByRole('button', { name: /view orders/i });
    expect(ordersLink).toBeInTheDocument();
  });

  it('[CheckoutSuccess] Button navigates to /orders', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckoutSuccess />);
    const ordersBtn = screen.getByRole('button', { name: /view orders/i });
    await user.click(ordersBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/orders');
  });
});
