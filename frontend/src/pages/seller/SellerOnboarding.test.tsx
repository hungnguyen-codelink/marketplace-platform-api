import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import SellerOnboarding from './SellerOnboarding';

// Mock the shops API
vi.mock('../../api/shops', () => ({
  shopsApi: {
    createShop: vi.fn(),
  },
}));

// Mock useNavigate
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
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('SellerOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Step 1 tests
  it('[SellerOnboarding] Renders step 1: terms acceptance with checkbox + continue button', () => {
    renderWithProviders(<SellerOnboarding />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('[SellerOnboarding] Step 1 checkbox has proper label (accessibility)', () => {
    renderWithProviders(<SellerOnboarding />);
    const checkbox = screen.getByRole('checkbox');
    // The checkbox should have a label nearby
    expect(checkbox).toBeInTheDocument();
    // Check that the label is visible (the checkbox is within a label element)
    const label = checkbox.closest('label');
    expect(label).toBeInTheDocument();
  });

  it('[SellerOnboarding] Continue button disabled until checkbox is checked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);
    const continueButton = screen.getByRole('button', { name: /continue/i });

    // Button should be disabled initially
    expect(continueButton).toBeDisabled();

    // Check the checkbox
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    // Button should now be enabled
    await waitFor(() => {
      expect(continueButton).not.toBeDisabled();
    });
  });

  it('[SellerOnboarding] Clicking continue on step 1 advances to step 2', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    // Step 2 should show form fields
    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });
  });

  // Step 2 tests
  it('[SellerOnboarding] Step 2 renders form with fields: name (required), description, banner_url, contact_email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/banner/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    });
  });

  it('[SellerOnboarding] Step 2 form fields have proper labels (accessibility)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/banner/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    });
  });

  it('[SellerOnboarding] Step 2 validates name is required; shows validation error on submit if empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.match(/create shop|submit/i));
    await user.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('[SellerOnboarding] Step 2 validates contact_email format if provided', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/shop name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/contact email/i) as HTMLInputElement;
    const form = nameInput.closest('form')!;

    await user.type(nameInput, 'My Shop');
    await user.type(emailInput, 'invalid-email');

    fireEvent.submit(form);

    // The error should appear in the FormField error display
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('[SellerOnboarding] Step 2 submits to POST /api/shops with form payload', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.createShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      description: 'A great shop',
      banner_url: 'https://example.com/banner.jpg',
      contact_email: 'shop@example.com',
      created_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/shop name/i) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLInputElement;
    const bannerInput = screen.getByLabelText(/banner/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/contact email/i) as HTMLInputElement;

    await user.type(nameInput, 'My Shop');
    await user.type(descriptionInput, 'A great shop');
    await user.type(bannerInput, 'https://example.com/banner.jpg');
    await user.type(emailInput, 'shop@example.com');

    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.match(/create shop|submit/i));
    await user.click(submitButton!);

    await waitFor(() => {
      expect(vi.mocked(shopsApi.createShop)).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My Shop',
        description: 'A great shop',
        banner_url: 'https://example.com/banner.jpg',
        contact_email: 'shop@example.com',
      }));
    });
  });

  it('[SellerOnboarding] Step 2 button disabled during submit request', async () => {
    const { shopsApi } = await import('../../api/shops');
    let resolveCreate: any;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    vi.mocked(shopsApi.createShop).mockReturnValueOnce(createPromise as any);

    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/shop name/i) as HTMLInputElement;
    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.match(/create shop|submit/i))!;

    await user.type(nameInput, 'My Shop');
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolveCreate({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('[SellerOnboarding] Step 2 on successful shop creation, navigates to /seller/shop', async () => {
    const { shopsApi } = await import('../../api/shops');
    vi.mocked(shopsApi.createShop).mockResolvedValueOnce({
      id: 'shop-1',
      seller_id: 'seller-1',
      name: 'My Shop',
      created_at: '2026-04-16T00:00:00Z',
    });

    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/shop name/i) as HTMLInputElement;
    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.match(/create shop|submit/i));

    await user.type(nameInput, 'My Shop');
    await user.click(submitButton!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/seller/shop');
    });
  });

  it('[SellerOnboarding] Step 2 on API error, displays error message and does not navigate', async () => {
    const { shopsApi } = await import('../../api/shops');
    const error = new Error('Server error');
    (error as any).response = { status: 500 };
    vi.mocked(shopsApi.createShop).mockRejectedValueOnce(error);

    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/shop name/i) as HTMLInputElement;
    const submitButton = screen.getAllByRole('button').find(b => b.textContent?.match(/create shop|submit/i));

    await user.type(nameInput, 'My Shop');
    await user.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('[SellerOnboarding] Back button on step 2 returns to step 1', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SellerOnboarding />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    });

    const backButton = screen.getAllByRole('button').find(b => b.textContent?.match(/back/i));
    await user.click(backButton!);

    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.queryByLabelText(/shop name/i)).not.toBeInTheDocument();
    });
  });
});
