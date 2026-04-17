import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../api/orders');

import OrderDetail from './OrderDetail';
import * as ordersApi from '../../api/orders';

const mockGetOrder = vi.mocked(ordersApi.getOrder);

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/orders/ord-1']}>
      <Routes>
        <Route path="/orders/:id" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OrderDetail', () => {
  beforeEach(() => {
    mockGetOrder.mockClear();
  });

  it('[OrderDetail] Fetches order by ID from URL params', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'pending',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalledWith('ord-1');
    });
  });

  it('[OrderDetail] Shows order items', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'pending',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 2,
          unit_price: 50,
          product: {
            id: 'prod-1',
            shop_id: 'shop-1',
            title: 'Test Product',
            price: 50,
            stock: 10,
            aggregate_rating: 4.5,
            review_count: 10,
            created_at: '2026-04-17T00:00:00Z',
            updated_at: '2026-04-17T00:00:00Z',
          },
        },
      ],
    });

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });

  it('[OrderDetail] Shows shipping address', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'pending',
      shipping_address: { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [],
    });

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    });
  });
});
