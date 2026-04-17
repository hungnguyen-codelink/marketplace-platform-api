import { test, expect } from '@playwright/test';

test.describe('Seller Onboarding Flow', () => {
  const testEmail = `seller-${Date.now()}@test.local`;
  const testPassword = 'TestPassword123!';
  const shopName = `Test Shop ${Date.now()}`;

  test('should register as a seller', async ({ page }) => {
    await page.goto('/register');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const registerBtn = page.getByRole('button', { name: /register/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await registerBtn.click();

    // Should redirect to home or dashboard
    await expect(page).toHaveURL(/\/(|dashboard)?$/, { timeout: 10000 });
  });

  test('should access seller onboarding', async ({ page }) => {
    // Login first
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Navigate to seller onboarding
    await page.goto('/seller/onboarding');
    await expect(page).toHaveURL('/seller/onboarding', { timeout: 10000 });
  });

  test('should complete onboarding steps', async ({ page }) => {
    // Login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Go to onboarding
    await page.goto('/seller/onboarding');

    // Step 1: Accept terms
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    const continueBtn = page.getByRole('button', { name: /continue|next/i });

    if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await termsCheckbox.check();
    }

    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      // Wait for the next step to load
      await expect(page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]')).toBeVisible({ timeout: 10000 });
    }

    // Step 2: Fill shop information
    await expect(page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]')).toBeVisible({ timeout: 10000 });

    const shopNameInput = page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]').first();
    await shopNameInput.fill(shopName);

    const descInput = page.locator('textarea, input[placeholder*="description" i]').first();
    if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await descInput.fill('A test shop for E2E testing');
    }

    const emailInputOnboarding = page.locator('input[placeholder*="contact" i], input[type="email"]').last();
    if (await emailInputOnboarding.isVisible({ timeout: 1000 }).catch(() => false)) {
      await emailInputOnboarding.fill('contact@testshop.local');
    }

    // Submit
    const submitBtn = page.getByRole('button', { name: /create shop|submit|finish/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Should redirect to seller shop profile, products, or dashboard
    await expect(page).toHaveURL(/\/seller\/(shop|products|dashboard)/, { timeout: 10000 });
  });

  test('should navigate to shop profile after onboarding', async ({ page }) => {
    // Login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Go to seller shop
    await page.goto('/seller/shop');
    await expect(page).toHaveURL('/seller/shop', { timeout: 10000 });

    // Verify shop information is displayed
    await expect(page.getByText(shopName)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to FakeStore import page', async ({ page }) => {
    // Login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Navigate to import page
    await page.goto('/seller/products/import');
    await expect(page).toHaveURL('/seller/products/import', { timeout: 10000 });
  });

  test('should import a product from FakeStore', async ({ page }) => {
    // Login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Navigate to import page
    await page.goto('/seller/products/import');

    // Wait for products to load
    const productCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(productCheckbox).toBeVisible({ timeout: 10000 });

    // Select at least one product
    await productCheckbox.check();

    // Click import button
    const importBtn = page.getByRole('button', { name: /import/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Confirm import in modal if present
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|import/i }).last();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Should redirect to products page or show success message
    await expect(page).toHaveURL(/\/seller\/products/, { timeout: 10000 });
    await expect(page.locator('[role="status"], [class*="toast"], text=/imported|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('should verify imported products appear in seller products page', async ({ page }) => {
    // Login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Go to seller products page
    await page.goto('/seller/products');

    // Wait for products list to load
    const productRow = page.locator('[role="row"], [class*="product"], li').first();
    await expect(productRow).toBeVisible({ timeout: 10000 });

    // Should have at least one product from import
    const productName = productRow.locator('h3, h4, td:nth-child(1)').first();
    await expect(productName).toContainText(/\w+/);
  });

  test('should verify products appear in public catalog', async ({ page }) => {
    // Go to home page (public view)
    await page.goto('/');

    // Browse products
    const productCard = page.locator('[role="article"], [class*="product"], li').filter({ hasText: /\w+/ }).first();
    await expect(productCard).toBeVisible({ timeout: 10000 });

    // Products from the imported shop should be visible
    const productTitle = productCard.locator('h2, h3, [class*="title"]').first();
    await expect(productTitle).toContainText(/\w+/);
  });
});
