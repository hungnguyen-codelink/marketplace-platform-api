import { test, expect } from '@playwright/test';

test.describe('Purchase Flow', () => {
  const testEmail = `buyer-${Date.now()}@test.local`;
  const testPassword = 'TestPassword123!';
  let productId: string;

  test.beforeAll(async () => {
    // Get a product ID from the API for consistent testing
    const response = await fetch('http://localhost:3000/api/products?limit=1');
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      productId = data.data[0].id;
    }
  });

  test('should register as a buyer', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[placeholder*="email" i]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Register")');

    // Should redirect to home or dashboard
    await expect(page).toHaveURL(/\/(|dashboard)?$/);
  });

  test('should browse products on home page', async ({ page }) => {
    await page.goto('/');

    // Wait for products to load
    const productCard = page.locator('[role="article"], .product-card').first();
    await expect(productCard).toBeVisible({ timeout: 5000 });

    // Verify we can see at least one product
    const productTitle = productCard.locator('h2, h3, [class*="title"]').first();
    await expect(productTitle).toContainText(/\w+/);
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/');

    // Click on first product
    const firstProduct = page.locator('[role="article"], .product-card').first();
    await firstProduct.click();

    // Should be on product detail page
    await expect(page).toHaveURL(/\/products\/[\w-]+/);

    // Add to cart
    const addCartBtn = page.locator('button:has-text("Add to Cart")');
    await expect(addCartBtn).toBeVisible();
    await addCartBtn.click();

    // Verify toast or confirmation
    await expect(page.locator('[role="status"], .toast, [class*="success"]')).toContainText(/added|cart/i);
  });

  test('should view and proceed from cart', async ({ page }) => {
    await page.goto('/cart');

    // Wait for cart to load
    const cartItems = page.locator('[class*="cart-item"], tr:has(td)');
    await expect(cartItems.first()).toBeVisible({ timeout: 5000 });

    // Verify checkout button exists
    const checkoutBtn = page.locator('button:has-text("Checkout")');
    await expect(checkoutBtn).toBeVisible();

    await checkoutBtn.click();
  });

  test('should complete checkout and order', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Add item to cart
    await page.goto('/');
    const firstProduct = page.locator('[role="article"], .product-card').first();
    await firstProduct.click();

    const addCartBtn = page.locator('button:has-text("Add to Cart")');
    if (await addCartBtn.isVisible()) {
      await addCartBtn.click();
      await page.waitForTimeout(500);
    }

    // Go to checkout
    await page.goto('/checkout');
    await expect(page.locator('button:has-text("Complete Purchase")')).toBeVisible({ timeout: 5000 });

    // Fill shipping address if form exists
    const streetInput = page.locator('input[placeholder*="street" i]');
    if (await streetInput.isVisible()) {
      await streetInput.fill('123 Main St');
      await page.fill('input[placeholder*="city" i]', 'New York');
      await page.fill('input[placeholder*="state" i]', 'NY');
      await page.fill('input[placeholder*="zip" i]', '10001');
      await page.fill('input[placeholder*="country" i]', 'USA');
    }

    // Complete purchase
    const completePurchaseBtn = page.locator('button:has-text("Complete Purchase")');
    await completePurchaseBtn.click();

    // Should redirect to success page
    await expect(page).toHaveURL(/\/checkout\/success|\/orders/, { timeout: 10000 });
  });

  test('should view order history', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Navigate to orders
    await page.goto('/orders');

    // Wait for order list to load
    await expect(page.locator('text=Order')).toBeVisible({ timeout: 5000 });

    // Should have at least one order from the previous test
    const orderRow = page.locator('[role="row"], li:has-text("Order")').first();
    await expect(orderRow).toBeVisible();
  });
});
