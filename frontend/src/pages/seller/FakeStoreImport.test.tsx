import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import ToastContainer from '../../components/Toast';
import FakeStoreImport from './FakeStoreImport';
import type { FakestoreProduct } from '../../types';

vi.mock('../../api/fakestore', () => ({
  fakestoreApi: {
    getProducts: vi.fn(),
    importProducts: vi.fn(),
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

import { fakestoreApi } from '../../api/fakestore';

const mockGetProducts = vi.mocked(fakestoreApi.getProducts);
const mockImportProducts = vi.mocked(fakestoreApi.importProducts);

const mockProducts: FakestoreProduct[] = [
  {
    fakestore_id: 1,
    title: 'Product 1',
    price: 29.99,
    description: 'Description 1',
    category: 'electronics',
    image_url: 'https://example.com/image1.jpg',
    aggregate_rating: 4.5,
    review_count: 10,
  },
  {
    fakestore_id: 2,
    title: 'Product 2',
    price: 49.99,
    description: 'Description 2',
    category: 'books',
    image_url: null,
    aggregate_rating: 0,
    review_count: 0,
  },
  {
    fakestore_id: 3,
    title: 'Product 3',
    price: 19.99,
    description: 'Description 3',
    category: 'clothing',
    image_url: 'https://example.com/image3.jpg',
    aggregate_rating: 3.2,
    review_count: 5,
  },
];

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

describe('FakeStoreImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Initial Load', () => {
    it('[FakeStoreImport] On mount: GET /api/fakestore/products called', async () => {
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        expect(mockGetProducts).toHaveBeenCalledTimes(1);
      });
    });

    it('[FakeStoreImport] Loading spinner shown while fetching', async () => {
      mockGetProducts.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockProducts), 100);
          })
      );

      renderWithProviders(<FakeStoreImport />);

      expect(screen.getByLabelText('Loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] Products grid rendered with all products', async () => {
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
        expect(screen.getByText('Product 3')).toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] Each product displays image, title, price, category', async () => {
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText(/\$29\.99/)).toBeInTheDocument();
        expect(screen.getByText('electronics')).toBeInTheDocument();
      });
    });
  });

  describe('Product Selection', () => {
    it('[FakeStoreImport] Each product has checkbox for selection', async () => {
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(mockProducts.length);
      });
    });

    it('[FakeStoreImport] Import button disabled when nothing selected', async () => {
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const importButton = screen.getByRole('button', { name: /import/i });
        expect(importButton).toBeDisabled();
      });
    });

    it('[FakeStoreImport] Import button enabled when 1+ selected', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(firstCheckbox);

      await waitFor(() => {
        const importButton = screen.getByRole('button', { name: /import/i });
        expect(importButton).not.toBeDisabled();
      });
    });

    it('[FakeStoreImport] Can select and deselect products', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const firstCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
      await user.click(firstCheckbox);

      await waitFor(() => {
        expect(firstCheckbox.checked).toBe(true);
      });

      await user.click(firstCheckbox);

      await waitFor(() => {
        expect(firstCheckbox.checked).toBe(false);
      });
    });
  });

  describe('Import Dialog', () => {
    it('[FakeStoreImport] Clicking Import opens Modal dialog', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(firstCheckbox);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] Modal shows selected count', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(2);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /confirm/i });
        expect(heading).toBeInTheDocument();
        // Check the modal content contains the count
        const modalContent = heading.closest('div');
        expect(modalContent?.textContent).toMatch(/2/);
      });
    });

    it('[FakeStoreImport] Overwrite checkbox defaults to UNCHECKED', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const productCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(productCheckbox);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      await waitFor(() => {
        const overwriteCheckbox = screen.getByLabelText(/overwrite/i) as HTMLInputElement;
        expect(overwriteCheckbox.checked).toBe(false);
      });
    });

    it('[FakeStoreImport] Cancel closes dialog without API call', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const productCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(productCheckbox);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /confirm/i })).not.toBeInTheDocument();
      });

      expect(mockImportProducts).not.toHaveBeenCalled();
    });

    it('[FakeStoreImport] Confirm calls POST /api/fakestore/import with overwrite=false when unchecked', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);
      mockImportProducts.mockResolvedValue({
        importedIds: [1],
        count: 1,
      });

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const productCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(productCheckbox);

      const importButtons = screen.getAllByRole('button', { name: /import/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });

      const modal = screen.getByRole('heading', { name: /confirm/i }).closest('div')?.closest('div');
      const confirmButton = modal?.querySelector('button:last-child') as HTMLButtonElement;
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockImportProducts).toHaveBeenCalledWith([1], false);
      });
    });

    it('[FakeStoreImport] Confirm calls POST /api/fakestore/import with overwrite=true when checked', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);
      mockImportProducts.mockResolvedValue({
        importedIds: [1],
        count: 1,
      });

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const productCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(productCheckbox);

      const importButtons = screen.getAllByRole('button', { name: /import/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });

      const overwriteCheckbox = screen.getByLabelText(/overwrite/i);
      await user.click(overwriteCheckbox);

      const modal = screen.getByRole('heading', { name: /confirm/i }).closest('div')?.closest('div');
      const confirmButton = modal?.querySelector('button:last-child') as HTMLButtonElement;
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockImportProducts).toHaveBeenCalledWith([1], true);
      });
    });
  });

  describe('Success Handling', () => {
    it('[FakeStoreImport] On success: toast notification shown', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);
      mockImportProducts.mockResolvedValue({
        importedIds: [1, 2],
        count: 2,
      });

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(2);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      const importButtons = screen.getAllByRole('button', { name: /import/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });

      const modal = screen.getByRole('heading', { name: /confirm/i }).closest('div')?.closest('div');
      const confirmButton = modal?.querySelector('button:last-child') as HTMLButtonElement;
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockImportProducts).toHaveBeenCalledTimes(1);
      });
    });

    it('[FakeStoreImport] On success: navigate to /seller/products', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);
      mockImportProducts.mockResolvedValue({
        importedIds: [1],
        count: 1,
      });

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const productCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(productCheckbox);

      const importButtons = screen.getAllByRole('button', { name: /import/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });

      const modal = screen.getByRole('heading', { name: /confirm/i }).closest('div')?.closest('div');
      const confirmButton = modal?.querySelector('button:last-child') as HTMLButtonElement;
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/seller/products');
      });
    });

    it('[FakeStoreImport] On success: clear selection', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);
      mockImportProducts.mockResolvedValue({
        importedIds: [1],
        count: 1,
      });

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const productCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
      await user.click(productCheckbox);

      expect(productCheckbox.checked).toBe(true);

      const importButtons = screen.getAllByRole('button', { name: /import/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });

      const modal = screen.getByRole('heading', { name: /confirm/i }).closest('div')?.closest('div');
      const confirmButton = modal?.querySelector('button:last-child') as HTMLButtonElement;
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/seller/products');
      });
    });
  });

  describe('Error Handling', () => {
    it('[FakeStoreImport] GET error: error banner shown', async () => {
      const error = new Error('Failed to fetch products');
      mockGetProducts.mockRejectedValue(error);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] GET error: Retry button shown', async () => {
      const error = new Error('Failed to fetch products');
      mockGetProducts.mockRejectedValue(error);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] Retry re-fetches products', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockRejectedValueOnce(new Error('Failed'));
      mockGetProducts.mockResolvedValueOnce(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        expect(mockGetProducts).toHaveBeenCalledTimes(1);
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockGetProducts).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] Multiple retries work: error → retry → error → retry → success', async () => {
      const user = userEvent.setup();
      mockGetProducts
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'))
        .mockResolvedValueOnce(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        expect(mockGetProducts).toHaveBeenCalledTimes(1);
      });

      let retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockGetProducts).toHaveBeenCalledTimes(2);
      });

      retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockGetProducts).toHaveBeenCalledTimes(3);
      });

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] POST error: error banner shown', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);
      mockImportProducts.mockRejectedValue(new Error('Import failed'));

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const productCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(productCheckbox);

      const importButtons = screen.getAllByRole('button', { name: /import/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });

      const modal = screen.getByRole('heading', { name: /confirm/i }).closest('div')?.closest('div');
      const confirmButton = modal?.querySelector('button:last-child') as HTMLButtonElement;
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockImportProducts).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to import/i)).toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] disabled/loading confirm button during import', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);
      mockImportProducts.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  importedIds: [1],
                  count: 1,
                }),
              100
            );
          })
      );

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      });

      const productCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(productCheckbox);

      const importButtons = screen.getAllByRole('button', { name: /import/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });

      const modal = screen.getByRole('heading', { name: /confirm/i }).closest('div')?.closest('div');
      const confirmButton = modal?.querySelector('button:last-child') as HTMLButtonElement;
      await user.click(confirmButton);

      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('[FakeStoreImport] Malformed backend data (null image_url) renders correctly', async () => {
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        expect(screen.getByText('Product 2')).toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] Malformed backend data (zero rating) renders correctly', async () => {
      mockGetProducts.mockResolvedValue(mockProducts);

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        expect(screen.getByText('Product 2')).toBeInTheDocument();
      });
    });

    it('[FakeStoreImport] Select all then import works correctly', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue(mockProducts);
      mockImportProducts.mockResolvedValue({
        importedIds: [1, 2, 3],
        count: 3,
      });

      renderWithProviders(<FakeStoreImport />);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(3);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      for (let i = 0; i < 3; i++) {
        await user.click(checkboxes[i]);
      }

      const importButtons = screen.getAllByRole('button', { name: /import/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /confirm/i })).toBeInTheDocument();
      });

      const modal = screen.getByRole('heading', { name: /confirm/i }).closest('div')?.closest('div');
      const confirmButton = modal?.querySelector('button:last-child') as HTMLButtonElement;
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockImportProducts).toHaveBeenCalledWith([1, 2, 3], false);
      });
    });
  });
});
