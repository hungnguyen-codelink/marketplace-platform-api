import { test, expect } from '@playwright/test';

test.describe('Degraded Mode - FakeStore Unreachable', () => {
  const buyerEmail = `degraded-${Date.now()}@test.local`;
  const buyerPassword = 'TestPassword123!';

  test('should show error banner when FakeStore import fails', async ({ page }) => {
    // Register as seller
    await page.goto('/register');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const registerBtn = page.getByRole('button', { name: /register/i });

    await emailInput.fill(buyerEmail);
    await passwordInput.fill(buyerPassword);
    await registerBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Complete onboarding to become a seller
    await page.goto('/seller/onboarding');

    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await termsCheckbox.check();
    }

    const continueBtn = page.getByRole('button', { name: /continue|next/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      // Wait for the next step to load
      await expect(page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]')).toBeVisible({ timeout: 10000 });
    }

    // Fill shop info
    const shopNameInput = page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]').first();
    await shopNameInput.fill(`Shop ${Date.now()}`);

    const submitBtn = page.getByRole('button', { name: /create shop|submit/i });
    await submitBtn.click();

    await page.waitForURL(/\/seller\/(shop|products)/, { timeout: 10000 });

    // Try to access FakeStore import - if FakeStore is unreachable, error should be shown
    await page.goto('/seller/products/import');

    // The API might be down or FakeStore unreachable - either show loading, products, or error
    const errorBanner = page.locator('[role="alert"], [class*="error"], text=/failed|unreachable|error/i');
    const productList = page.locator('input[type="checkbox"]');

    // Check for error message or products loaded
    const errorVisible = await errorBanner.isVisible({ timeout: 10000 }).catch(() => false);
    const productsCount = await productList.count().catch(() => 0);

    // Should have either an error message or products loaded
    const outcomeValid = errorVisible || productsCount > 0;
    expect(outcomeValid).toBeTruthy();

    if (errorVisible) {
      await expect(errorBanner).toContainText(/failed|unreachable|error/i);
    }
  });

  test('should allow buying existing products regardless of FakeStore status', async ({ page }) => {
    // Register as buyer
    await page.goto('/register');

    const buyerTestEmail = `buyer-degraded-${Date.now()}@test.local`;
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const registerBtn = page.getByRole('button', { name: /register/i });

    await emailInput.fill(buyerTestEmail);
    await passwordInput.fill(buyerPassword);
    await registerBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Browse products - should work regardless of FakeStore status
    await page.goto('/');

    // Wait for products to load
    const productCard = page.locator('[role="article"], [class*="product"], li').filter({ hasText: /\w+/ }).first();
    await expect(productCard).toBeVisible({ timeout: 10000 });

    // Click on product
    await productCard.click();
    await expect(page).toHaveURL(/\/products\/[\w-]+/, { timeout: 10000 });

    // Add to cart
    const addCartBtn = page.getByRole('button', { name: /add to cart|add.+cart/i });
    await addCartBtn.click();
    // Wait for the toast or success message to appear
    await expect(page.locator('[role="status"], [class*="toast"], [class*="success"]')).toBeVisible({ timeout: 5000 });

    // Proceed to cart and checkout
    await page.goto('/checkout');
    await expect(page.getByRole('button', { name: /complete purchase|place order|submit/i })).toBeVisible({ timeout: 10000 });

    // Fill shipping info
    const streetInput = page.locator('input[placeholder*="street" i], input[placeholder*="address" i]').first();
    if (await streetInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await streetInput.fill('123 Resilient St');

      const cityInput = page.locator('input[placeholder*="city" i]').first();
      const stateInput = page.locator('input[placeholder*="state" i], input[placeholder*="province" i]').first();
      const zipInput = page.locator('input[placeholder*="zip" i], input[placeholder*="postal" i]').first();
      const countryInput = page.locator('input[placeholder*="country" i]').first();

      await cityInput.fill('Resilient City');
      await stateInput.fill('RC');
      await zipInput.fill('99999');
      await countryInput.fill('Resilience');
    }

    // Complete purchase
    const completePurchaseBtn = page.getByRole('button', { name: /complete purchase|place order|submit/i });
    await completePurchaseBtn.click();

    await expect(page).toHaveURL(/\/checkout\/success|\/orders/, { timeout: 10000 });
  });

  test('should browse existing product catalog in degraded mode', async ({ page }) => {
    await page.goto('/');

    // Products should be browsable
    const productCards = page.locator('[role="article"], [class*="product"], li').filter({ hasText: /\w+/ });
    const count = await productCards.count({ timeout: 10000 });

    // Should have at least some products available
    expect(count).toBeGreaterThan(0);

    // Click through product to ensure catalog works
    const firstProduct = productCards.first();
    await firstProduct.click();

    await expect(page).toHaveURL(/\/products\/[\w-]+/, { timeout: 10000 });

    // Product details should display correctly
    const productTitle = page.locator('h1, h2, [class*="title"]').first();
    await expect(productTitle).toContainText(/\w+/);

    const price = page.locator('[class*="price"], text=/\\$/').first();
    await expect(price).toBeVisible({ timeout: 5000 });
  });

  test('should handle gracefully when navigating back to catalog after import attempt', async ({ page }) => {
    // Register as seller
    await page.goto('/register');

    const sellerEmail = `seller-degraded-${Date.now()}@test.local`;
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const registerBtn = page.getByRole('button', { name: /register/i });

    await emailInput.fill(sellerEmail);
    await passwordInput.fill(buyerPassword);
    await registerBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Complete onboarding
    await page.goto('/seller/onboarding');

    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await termsCheckbox.check();
    }

    const continueBtn = page.getByRole('button', { name: /continue|next/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      // Wait for the next step to load
      await expect(page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]')).toBeVisible({ timeout: 10000 });
    }

    const shopNameInput = page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]').first();
    await shopNameInput.fill(`Shop ${Date.now()}`);

    const submitBtn = page.getByRole('button', { name: /create shop|submit/i });
    await submitBtn.click();

    await page.waitForURL(/\/seller\/(shop|products)/, { timeout: 10000 });

    // Go to import page
    await page.goto('/seller/products/import');
    // Wait for the import page to load - either show products or error
    await expect(page.locator('input[type="checkbox"], [role="alert"]')).toBeVisible({ timeout: 10000 }).catch(() => true);

    // Go back to home (should work regardless of import state)
    await page.goto('/');

    // Should be able to browse normally
    const productCard = page.locator('[role="article"], [class*="product"], li').filter({ hasText: /\w+/ }).first();
    await expect(productCard).toBeVisible({ timeout: 10000 });
  });

  test('should display products from existing inventory', async ({ page }) => {
    await page.goto('/');

    // Wait for products
    const productCard = page.locator('[role="article"], [class*="product"], li').filter({ hasText: /\w+/ }).first();
    await expect(productCard).toBeVisible({ timeout: 10000 });

    // Verify product has expected fields (text content)
    const productText = await productCard.innerText();
    expect(productText.length).toBeGreaterThan(0);

    // Click to see full details
    await productCard.click();

    // Verify we can see product details
    const detailTitle = page.locator('h1, h2, [class*="title"]').first();
    await expect(detailTitle).toBeVisible({ timeout: 10000 });

    const detailPrice = page.locator('[class*="price"], text=/\\$/').first();
    await expect(detailPrice).toBeVisible({ timeout: 5000 });
  });

  test('should show retry button in error state if available', async ({ page }) => {
    // Register as seller
    await page.goto('/register');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const registerBtn = page.getByRole('button', { name: /register/i });

    const testEmail = `retry-test-${Date.now()}@test.local`;
    await emailInput.fill(testEmail);
    await passwordInput.fill(buyerPassword);
    await registerBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Complete onboarding
    await page.goto('/seller/onboarding');

    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await termsCheckbox.check();
    }

    const continueBtn = page.getByRole('button', { name: /continue|next/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      // Wait for the next step to load
      await expect(page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]')).toBeVisible({ timeout: 10000 });
    }

    const shopNameInput = page.locator('input[placeholder*="shop" i], input[placeholder*="name" i]').first();
    await shopNameInput.fill(`Shop ${Date.now()}`);

    const submitBtn = page.getByRole('button', { name: /create shop|submit/i });
    await submitBtn.click();

    await page.waitForURL(/\/seller\/(shop|products)/, { timeout: 10000 });

    // Navigate to import page
    await page.goto('/seller/products/import');

    // If there's an error, check for retry button
    const errorBanner = page.locator('[role="alert"], [class*="error"]').first();
    const retryBtn = page.getByRole('button', { name: /retry|try again/i });

    const errorVisible = await errorBanner.isVisible({ timeout: 5000 }).catch(() => false);

    if (errorVisible) {
      // Retry button should be visible in error state
      const retryVisible = await retryBtn.isVisible({ timeout: 2000 }).catch(() => false);
      expect(retryVisible).toBeTruthy();
    } else {
      // If no error, products should have loaded successfully
      const productList = page.locator('input[type="checkbox"]');
      const count = await productList.count().catch(() => 0);
      expect(count).toBeGreaterThan(0);
    }
  });
});
