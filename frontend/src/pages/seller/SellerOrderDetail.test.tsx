import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../contexts/ToastContext';

vi.mock('../../api/orders');

import SellerOrderDetail from './SellerOrderDetail';
import * as ordersApi from '../../api/orders';

const mockGetSellerOrder = vi.mocked(ordersApi.getSellerOrder);
const mockUpdateSellerOrderStatus = vi.mocked(ordersApi.updateSellerOrderStatus);

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/seller/orders/ord-1']}>
      <ToastProvider>
        <Routes>
          <Route path="/seller/orders/:id" element={ui} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('SellerOrderDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[SellerOrderDetail] Fetches order on mount', async () => {
    mockGetSellerOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'pending',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    renderWithProviders(<SellerOrderDetail />);

    await waitFor(() => {
      expect(mockGetSellerOrder).toHaveBeenCalledWith('ord-1');
    });
  });

  it('[SellerOrderDetail] pending status shows Confirm Order button', async () => {
    mockGetSellerOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'pending',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    renderWithProviders(<SellerOrderDetail />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm order/i })).toBeInTheDocument();
    });
  });

  it('[SellerOrderDetail] confirmed status shows Mark as Shipped button', async () => {
    mockGetSellerOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'confirmed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    renderWithProviders(<SellerOrderDetail />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark as shipped/i })).toBeInTheDocument();
    });
  });

  it('[SellerOrderDetail] shipped status shows Mark as Delivered button', async () => {
    mockGetSellerOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'shipped',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    renderWithProviders(<SellerOrderDetail />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark as delivered/i })).toBeInTheDocument();
    });
  });

  it('[SellerOrderDetail] delivered status shows Mark as Completed button', async () => {
    mockGetSellerOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'delivered',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    renderWithProviders(<SellerOrderDetail />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark as completed/i })).toBeInTheDocument();
    });
  });

  it('[SellerOrderDetail] completed status shows Order Complete text', async () => {
    mockGetSellerOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    renderWithProviders(<SellerOrderDetail />);

    await waitFor(() => {
      expect(screen.getByText(/order complete/i)).toBeInTheDocument();
    });
  });

  it('[SellerOrderDetail] Button calls updateSellerOrderStatus with correct status', async () => {
    mockGetSellerOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'pending',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    mockUpdateSellerOrderStatus.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'confirmed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    const user = userEvent.setup();
    renderWithProviders(<SellerOrderDetail />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm order/i })).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /confirm order/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockUpdateSellerOrderStatus).toHaveBeenCalledWith('ord-1', 'confirmed');
    });
  });
});
