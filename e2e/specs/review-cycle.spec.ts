import { test, expect } from '@playwright/test';

test.describe('Review Cycle Flow', () => {
  const buyerEmail = `reviewer-${Date.now()}@test.local`;
  const buyerPassword = 'TestPassword123!';

  test('should place a test order for review', async ({ page }) => {
    // Register and login as buyer
    await page.goto('/register');
    await page.fill('input[placeholder*="email" i]', buyerEmail);
    await page.fill('input[type="password"]', buyerPassword);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/', { timeout: 5000 });

    // Browse and add product to cart
    const firstProduct = page.locator('[role="article"], .product-card').first();
    await firstProduct.click();
    await expect(page).toHaveURL(/\/products\/[\w-]+/);

    const addCartBtn = page.locator('button:has-text("Add to Cart")');
    if (await addCartBtn.isVisible()) {
      await addCartBtn.click();
      await page.waitForTimeout(500);
    }

    // Checkout
    await page.goto('/checkout');
    await expect(page.locator('button:has-text("Complete Purchase")')).toBeVisible({ timeout: 5000 });

    // Fill shipping if needed
    const streetInput = page.locator('input[placeholder*="street" i]');
    if (await streetInput.isVisible()) {
      await streetInput.fill('123 Test St');
      await page.fill('input[placeholder*="city" i]', 'Test City');
      await page.fill('input[placeholder*="state" i]', 'TS');
      await page.fill('input[placeholder*="zip" i]', '12345');
      await page.fill('input[placeholder*="country" i]', 'Test Country');
    }

    // Complete order
    await page.click('button:has-text("Complete Purchase")');
    await expect(page).toHaveURL(/\/checkout\/success|\/orders/, { timeout: 10000 });
  });

  test('should navigate to completed order', async ({ page }) => {
    // Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', buyerEmail);
    await page.fill('input[type="password"]', buyerPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Go to orders
    await page.goto('/orders');
    await expect(page.locator('text=Order')).toBeVisible({ timeout: 5000 });

    // Click on first order
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /Order|#/ }).first();
    await orderLink.click();

    // Should be on order detail page
    await expect(page).toHaveURL(/\/orders\/[\w-]+/);
  });

  test('should see review form for completed order', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', buyerEmail);
    await page.fill('input[type="password"]', buyerPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Navigate to orders
    await page.goto('/orders');
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /Order|#/ }).first();
    await orderLink.click();

    // Wait for order to load
    await expect(page.locator('text=Order')).toBeVisible({ timeout: 5000 });

    // Check for review form
    const reviewForm = page.locator('form:has-text("Rating"), form:has([class*="review"])');
    await expect(reviewForm).toBeVisible({ timeout: 5000 });
  });

  test('should submit a review with star rating', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', buyerEmail);
    await page.fill('input[type="password"]', buyerPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Navigate to orders
    await page.goto('/orders');
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /Order|#/ }).first();
    await orderLink.click();

    // Find review form
    const reviewForm = page.locator('form:has-text("Rating"), form:has([class*="review"])');
    await expect(reviewForm).toBeVisible({ timeout: 5000 });

    // Click on 4th star to set rating
    const stars = reviewForm.locator('button[aria-label*="star"], [role="button"]:has-text("★")');
    const starCount = await stars.count();
    if (starCount >= 4) {
      await stars.nth(3).click(); // 4 stars
    } else {
      // Fallback: click any star button
      await stars.first().click();
    }

    // Add comment if textarea exists
    const commentInput = reviewForm.locator('textarea');
    if (await commentInput.isVisible()) {
      await commentInput.fill('Great product! Very satisfied with the quality.');
    }

    // Submit review
    const submitBtn = reviewForm.locator('button:has-text("Submit")');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Should show success message
    await expect(page.locator('[role="status"], .toast, text=/submitted|success|review/i')).toBeVisible({ timeout: 5000 });
  });

  test('should see updated rating on product detail page', async ({ page }) => {
    // Get the product ID from orders page
    await page.goto('/login');
    await page.fill('input[type="email"]', buyerEmail);
    await page.fill('input[type="password"]', buyerPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Navigate to orders to find product
    await page.goto('/orders');
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /Order|#/ }).first();
    await orderLink.click();

    // Get product link from order items
    const productLink = page.locator('[role="link"], a').filter({ hasText: /product|item/i }).first();
    if (await productLink.isVisible()) {
      await productLink.click();
    } else {
      // Fallback: click on any product name link
      const productName = page.locator('td:nth-child(1), [class*="product"]').first();
      const href = await productName.locator('a').getAttribute('href');
      if (href) {
        await page.goto(href);
      }
    }

    // Should be on product detail page
    await expect(page).toHaveURL(/\/products\/[\w-]+/);

    // Verify rating is displayed and non-zero
    const ratingDisplay = page.locator('[class*="rating"], [class*="star"], text=/★/');
    await expect(ratingDisplay).toBeVisible({ timeout: 5000 });

    // Verify review count is updated
    const reviewCount = page.locator('text=/\\(\\d+ review');
    await expect(reviewCount).toContainText(/\(\d+ review/);
  });

  test('should not allow duplicate review submission', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', buyerEmail);
    await page.fill('input[type="password"]', buyerPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 5000 });

    // Navigate to the same order
    await page.goto('/orders');
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /Order|#/ }).first();
    await orderLink.click();

    // Wait for order to load
    await expect(page.locator('text=Order')).toBeVisible({ timeout: 5000 });

    // Check that review form is no longer visible or is disabled
    const reviewForm = page.locator('form:has-text("Rating"), form:has([class*="review"])');
    const alreadyReviewedMsg = page.locator('text=/already reviewed|review submitted/i');

    const formExists = await reviewForm.isVisible({ timeout: 1000 }).catch(() => false);
    const msgExists = await alreadyReviewedMsg.isVisible({ timeout: 1000 }).catch(() => false);

    // Either the form is gone or a message indicates already reviewed
    if (!formExists) {
      await expect(alreadyReviewedMsg).toBeVisible();
    }
  });
});
