import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../contexts/ToastContext';

vi.mock('../../api/orders');
vi.mock('../../hooks/useReviews');

import OrderDetail from './OrderDetail';
import * as ordersApi from '../../api/orders';
import * as reviewsHooks from '../../hooks/useReviews';

const mockGetOrder = vi.mocked(ordersApi.getOrder);
const mockUseSubmitReview = vi.mocked(reviewsHooks.useSubmitReview);

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/orders/ord-1']}>
      <ToastProvider>
        <Routes>
          <Route path="/orders/:id" element={ui} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('OrderDetail', () => {
  beforeEach(() => {
    mockGetOrder.mockClear();
    mockUseSubmitReview.mockClear();
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

    mockUseSubmitReview.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

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

    mockUseSubmitReview.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

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

    mockUseSubmitReview.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    });
  });

  it('[OrderDetail Review] When order.status !== "completed", does not render review form', async () => {
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
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Pending Product', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    mockUseSubmitReview.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Pending Product')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
  });

  it('[OrderDetail Review] When order.status === "completed", renders review form below each item', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Product 1', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    mockUseSubmitReview.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('[OrderDetail Review] Review form contains interactive StarRating with onChange handler', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Reviewable Product', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    mockUseSubmitReview.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    const user = userEvent.setup();
    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Reviewable Product')).toBeInTheDocument();
    });

    const formStars = screen.getAllByRole('img', { name: /star/i });
    expect(formStars.length).toBeGreaterThan(0);

    const labelElement = screen.getByText('Rating');
    expect(labelElement).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  it('[OrderDetail Review] Review form contains optional textarea for text input', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Product 1', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    mockUseSubmitReview.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/leave a comment/i);
    expect(textarea).toBeInTheDocument();
  });

  it('[OrderDetail Review] Submit button is disabled until rating > 0', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Product 1', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    mockUseSubmitReview.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  it('[OrderDetail Review] Clicking Submit calls useSubmitReview with order_item_id, rating, and optional text', async () => {
    const mockMutate = vi.fn();

    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Item for Submit Test', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    mockUseSubmitReview.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Item for Submit Test')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/leave a comment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('[OrderDetail Review] On success, displays "Review submitted" and hides form', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-success',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Success Product', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    let successCallback: any = null;
    mockUseSubmitReview.mockReturnValue({
      mutate: (data: any, opts: any) => {
        successCallback = opts.onSuccess;
      },
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Success Product')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();

    if (successCallback) {
      successCallback();
      await waitFor(() => {
        expect(screen.getByText('Review submitted')).toBeInTheDocument();
      });
    }
  });

  it('[OrderDetail Review] On 409 Conflict, displays "Already reviewed"', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-conflict',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Conflict Product', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    let errorCallback: any = null;
    mockUseSubmitReview.mockReturnValue({
      mutate: (data: any, options: any) => {
        errorCallback = options.onError;
      },
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Conflict Product')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();

    if (errorCallback) {
      const conflictError = new Error('Already reviewed');
      (conflictError as any).response = { status: 409 };
      errorCallback(conflictError);
      await waitFor(() => {
        expect(screen.getByText('Already reviewed')).toBeInTheDocument();
      });
    }
  });

  it('[OrderDetail Review] On non-409 errors, shows error toast notification', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-error',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Error Product', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    let errorCallback: any = null;
    mockUseSubmitReview.mockReturnValue({
      mutate: (data: any, options: any) => {
        errorCallback = options.onError;
      },
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Error Product')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();

    if (errorCallback) {
      const serverError = new Error('Server error');
      (serverError as any).response = { status: 500 };
      errorCallback(serverError);
      await waitFor(() => {
        expect(screen.getByText('Failed to submit review')).toBeInTheDocument();
      });
    }
  });

  it('[OrderDetail Review] Each item in multi-item order has independent review form and state', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Product 1', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
        {
          id: 'item-2',
          order_id: 'ord-1',
          product_id: 'prod-2',
          quantity: 1,
          unit_price: 30,
          product: { id: 'prod-2', shop_id: 'shop-1', title: 'Product 2', price: 30, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    mockUseSubmitReview.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'idle',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    expect(submitButtons.length).toBe(2);
  });

  it('[OrderDetail Review] Submit button shows loading state while mutation is pending', async () => {
    mockGetOrder.mockResolvedValue({
      id: 'ord-1',
      buyer_id: 'buyer-1',
      status: 'completed',
      shipping_address: { street: '123 Main', city: 'Boston', state: 'MA', zip: '02101', country: 'USA' },
      total_amount: 100,
      created_at: '2026-04-17T00:00:00Z',
      updated_at: '2026-04-17T00:00:00Z',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-1',
          product_id: 'prod-1',
          quantity: 1,
          unit_price: 50,
          product: { id: 'prod-1', shop_id: 'shop-1', title: 'Product 1', price: 50, stock: 10, aggregate_rating: 0, review_count: 0, created_at: '2026-04-17T00:00:00Z', updated_at: '2026-04-17T00:00:00Z' },
        },
      ],
    });

    const mockMutate = vi.fn();
    mockUseSubmitReview.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      status: 'pending',
      reset: vi.fn(),
    } as any);

    renderWithProviders(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });
});
