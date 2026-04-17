import { test, expect } from '@playwright/test';

test.describe('Purchase Flow', () => {
  const testEmail = `buyer-${Date.now()}@test.local`;
  const testPassword = 'TestPassword123!';
  let productId: string;

  test.beforeAll(async () => {
    // Get a product ID from the API for consistent testing
    try {
      const response = await fetch('http://localhost:3000/api/products?limit=1');
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        productId = data.data[0].id;
      }
    } catch (error) {
      console.warn('Could not fetch product ID from API:', error);
    }
  });

  test('should register as a buyer', async ({ page }) => {
    await page.goto('/register');

    // Use getByRole for better accessibility
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const registerBtn = page.getByRole('button', { name: /register/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await registerBtn.click();

    // Should redirect to home or dashboard
    await expect(page).toHaveURL(/\/(|dashboard)?$/, { timeout: 10000 });
  });

  test('should browse products on home page', async ({ page }) => {
    await page.goto('/');

    // Wait for products to load
    const productCards = page.locator('[role="article"], [class*="product"], li').filter({ hasText: /\w+/ });
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });

    // Verify we can see product content
    const productTitle = productCards.first().locator('h2, h3, [class*="title"]').first();
    await expect(productTitle).toContainText(/\w+/);
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/');

    // Click on first product
    const firstProduct = page.locator('[role="article"], [class*="product"], li').filter({ hasText: /\w+/ }).first();
    await firstProduct.click();

    // Should be on product detail page
    await expect(page).toHaveURL(/\/products\/[\w-]+/, { timeout: 10000 });

    // Add to cart
    const addCartBtn = page.getByRole('button', { name: /add to cart|add.+cart/i });
    await expect(addCartBtn).toBeVisible();
    await addCartBtn.click();

    // Verify toast or confirmation
    const successMsg = page.locator('[role="status"], [class*="toast"], [class*="success"], text=/added|cart/i');
    await expect(successMsg).toBeVisible({ timeout: 5000 });
  });

  test('should view and proceed from cart', async ({ page }) => {
    await page.goto('/cart');

    // Wait for cart to load
    const cartItems = page.locator('[class*="cart-item"], [class*="cart"], tr:has(td)').first();
    await expect(cartItems).toBeVisible({ timeout: 10000 });

    // Verify checkout button exists
    const checkoutBtn = page.getByRole('button', { name: /checkout|proceed/i });
    await expect(checkoutBtn).toBeVisible();

    await checkoutBtn.click();

    // Should navigate to checkout
    await page.waitForURL('/checkout', { timeout: 10000 });
  });

  test('should complete checkout and order', async ({ page }) => {
    // First register/login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Add item to cart
    await page.goto('/');
    const firstProduct = page.locator('[role="article"], [class*="product"], li').filter({ hasText: /\w+/ }).first();
    await firstProduct.click();

    const addCartBtn = page.getByRole('button', { name: /add to cart|add.+cart/i });
    if (await addCartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addCartBtn.click();
      await page.waitForTimeout(500);
    }

    // Go to checkout
    await page.goto('/checkout');
    await expect(page.getByRole('button', { name: /complete purchase|place order|submit/i })).toBeVisible({ timeout: 10000 });

    // Fill shipping address if form exists
    const streetInput = page.locator('input[placeholder*="street" i], input[placeholder*="address" i]').first();
    if (await streetInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await streetInput.fill('123 Main St');

      const cityInput = page.locator('input[placeholder*="city" i]').first();
      const stateInput = page.locator('input[placeholder*="state" i], input[placeholder*="province" i]').first();
      const zipInput = page.locator('input[placeholder*="zip" i], input[placeholder*="postal" i]').first();
      const countryInput = page.locator('input[placeholder*="country" i]').first();

      await cityInput.fill('New York');
      await stateInput.fill('NY');
      await zipInput.fill('10001');
      await countryInput.fill('USA');
    }

    // Complete purchase
    const completePurchaseBtn = page.getByRole('button', { name: /complete purchase|place order|submit/i });
    await completePurchaseBtn.click();

    // Should redirect to success page or orders
    await expect(page).toHaveURL(/\/checkout\/success|\/orders/, { timeout: 10000 });
  });

  test('should view order history', async ({ page }) => {
    // Login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Navigate to orders
    await page.goto('/orders');

    // Wait for order list to load
    await expect(page.getByText(/order/i)).toBeVisible({ timeout: 10000 });

    // Should have at least one order from the previous test
    const orderRow = page.locator('[role="row"], [class*="order"], li').filter({ hasText: /order|#/i }).first();
    await expect(orderRow).toBeVisible({ timeout: 5000 });
  });
});
