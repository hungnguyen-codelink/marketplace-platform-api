import { test, expect } from '@playwright/test';

test.describe('Seller Onboarding Flow', () => {
  const testEmail = `seller-${Date.now()}@test.local`;
  const testPassword = 'TestPassword123!';
  const shopName = `Test Shop ${Date.now()}`;

  test('should register as a seller', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[placeholder*="email" i]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Register")');

    await expect(page).toHaveURL(/\/(|dashboard)?$/);
  });

  test('should access seller onboarding', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Navigate to seller onboarding
    await page.goto('/seller/onboarding');
    await expect(page).toHaveURL('/seller/onboarding');
  });

  test('should complete onboarding steps', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Go to onboarding
    await page.goto('/seller/onboarding');

    // Step 1: Accept terms
    const termsCheckbox = page.locator('input[type="checkbox"]');
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")');

    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    if (await continueBtn.isVisible()) {
      await continueBtn.click();
    }

    // Step 2: Fill shop information
    await expect(page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]')).toBeVisible({ timeout: 5000 });

    await page.fill('input[placeholder*="shop" i], input[placeholder*="name" i]', shopName);

    const descInput = page.locator('textarea, input[placeholder*="description" i]');
    if (await descInput.isVisible()) {
      await descInput.fill('A test shop for E2E testing');
    }

    const emailInput = page.locator('input[placeholder*="contact" i], input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('contact@testshop.local');
    }

    // Submit
    const submitBtn = page.locator('button:has-text("Create Shop"), button:has-text("Submit"), button:has-text("Finish")');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Should redirect to seller shop profile
    await expect(page).toHaveURL(/\/seller\/(shop|products|dashboard)/, { timeout: 10000 });
  });

  test('should navigate to shop profile after onboarding', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Go to seller shop
    await page.goto('/seller/shop');
    await expect(page).toHaveURL('/seller/shop');

    // Verify shop information is displayed
    await expect(page.locator('text=' + shopName)).toBeVisible({ timeout: 5000 });
  });

  test('should import products from FakeStore', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Navigate to import page
    await page.goto('/seller/products/import');
    await expect(page).toHaveURL('/seller/products/import');

    // Wait for products to load
    const productCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(productCheckbox).toBeVisible({ timeout: 5000 });

    // Select at least one product
    await productCheckbox.check();

    // Click import button
    const importBtn = page.locator('button:has-text("Import")');
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Confirm import in modal if present
    const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Import")').last();
    if (await confirmBtn.isVisible({ timeout: 1000 })) {
      await confirmBtn.click();
    }

    // Should redirect to products page or show success message
    await expect(page).toHaveURL(/\/seller\/products/, { timeout: 10000 });
    await expect(page.locator('[role="status"], .toast, text=/imported|success/i')).toBeVisible({ timeout: 5000 });
  });

  test('should verify imported products appear in catalog', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Go to seller products page
    await page.goto('/seller/products');

    // Wait for products list to load
    const productRow = page.locator('[role="row"], [class*="product"], li').first();
    await expect(productRow).toBeVisible({ timeout: 5000 });

    // Should have at least one product from import
    const productName = page.locator('h3, h4, td:nth-child(1)').first();
    await expect(productName).toContainText(/\w+/);
  });

  test('should verify products appear in public catalog', async ({ page }) => {
    // Go to home page (public view)
    await page.goto('/');

    // Browse products
    const productCard = page.locator('[role="article"], .product-card').first();
    await expect(productCard).toBeVisible({ timeout: 5000 });

    // Products from the imported shop should be visible
    const productTitle = productCard.locator('h2, h3, [class*="title"]').first();
    await expect(productTitle).toContainText(/\w+/);
  });
});
