import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../api/orders');

import OrderHistory from './OrderHistory';
import * as ordersApi from '../../api/orders';

const mockGetOrders = vi.mocked(ordersApi.getOrders);

function renderWithProviders(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('OrderHistory', () => {
  beforeEach(() => {
    mockGetOrders.mockClear();
  });

  it('[OrderHistory] Renders orders title', async () => {
    mockGetOrders.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    renderWithProviders(<OrderHistory />);
    await waitFor(() => {
      expect(screen.getByText(/order history/i)).toBeInTheDocument();
    });
  });

  it('[OrderHistory] Loads and displays orders', async () => {
    mockGetOrders.mockResolvedValue({
      data: [
        {
          id: 'ord-1',
          buyer_id: 'buyer-1',
          status: 'pending',
          shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
          total_amount: 100,
          created_at: '2026-04-17T00:00:00Z',
          updated_at: '2026-04-17T00:00:00Z',
          items: [],
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });

    renderWithProviders(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('ord-1')).toBeInTheDocument();
    });
  });
});
