import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const mockOrderData = {
  id: 'ord-1',
  buyer_id: 'buyer-1',
  status: 'pending' as const,
  shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
  total_amount: 100,
  created_at: '2026-04-17T00:00:00Z',
  updated_at: '2026-04-17T00:00:00Z',
  items: [],
};

describe('OrderHistory', () => {
  beforeEach(() => {
    mockGetOrders.mockClear();
    mockNavigate.mockClear();
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
      data: [mockOrderData],
      total: 1,
      page: 1,
      limit: 10,
    });

    renderWithProviders(<OrderHistory />);

    await waitFor(() => {
      expect(screen.getByText('ord-1')).toBeInTheDocument();
    });
  });

  it('[OrderHistory] Previous button is disabled on the first page', async () => {
    mockGetOrders.mockResolvedValue({
      data: [mockOrderData],
      total: 25,
      page: 1,
      limit: 10,
    });

    renderWithProviders(<OrderHistory />);

    await waitFor(() => {
      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });
  });

  it('[OrderHistory] Next button is disabled when on the last page', async () => {
    mockGetOrders.mockResolvedValue({
      data: [mockOrderData],
      total: 25,
      page: 3,
      limit: 10,
    });

    renderWithProviders(<OrderHistory />);

    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  it('[OrderHistory] Clicking Next increments page and calls API with correct page param', async () => {
    const user = userEvent.setup();

    mockGetOrders.mockResolvedValue({
      data: [mockOrderData],
      total: 25,
      page: 1,
      limit: 10,
    });

    renderWithProviders(<OrderHistory />);

    await waitFor(() => {
      expect(mockGetOrders).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    mockGetOrders.mockResolvedValue({
      data: [mockOrderData],
      total: 25,
      page: 2,
      limit: 10,
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(mockGetOrders).toHaveBeenCalledWith({ page: 2, limit: 10 });
    });
  });

  it('[OrderHistory] Clicking Previous decrements page', async () => {
    const user = userEvent.setup();

    mockGetOrders.mockResolvedValue({
      data: [mockOrderData],
      total: 25,
      page: 2,
      limit: 10,
    });

    renderWithProviders(<OrderHistory />);

    await waitFor(() => {
      expect(mockGetOrders).toHaveBeenCalledWith({ page: 2, limit: 10 });
    });

    mockGetOrders.mockResolvedValue({
      data: [mockOrderData],
      total: 25,
      page: 1,
      limit: 10,
    });

    const prevButton = screen.getByRole('button', { name: /previous/i });
    await user.click(prevButton);

    await waitFor(() => {
      expect(mockGetOrders).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });
});
