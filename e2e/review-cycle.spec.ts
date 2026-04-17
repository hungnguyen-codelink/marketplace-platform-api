import { test, expect } from '@playwright/test';

test.describe('Review Cycle Flow', () => {
  const buyerEmail = `reviewer-${Date.now()}@test.local`;
  const buyerPassword = 'TestPassword123!';

  test('should place a test order for review', async ({ page }) => {
    // Register and login as buyer
    await page.goto('/register');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const registerBtn = page.getByRole('button', { name: /register/i });

    await emailInput.fill(buyerEmail);
    await passwordInput.fill(buyerPassword);
    await registerBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Browse and add product to cart
    const firstProduct = page.locator('[role="article"], [class*="product"], li').filter({ hasText: /\w+/ }).first();
    await firstProduct.click();
    await expect(page).toHaveURL(/\/products\/[\w-]+/, { timeout: 10000 });

    const addCartBtn = page.getByRole('button', { name: /add to cart|add.+cart/i });
    if (await addCartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addCartBtn.click();
      // Wait for the toast or success message to appear
      await expect(page.locator('[role="status"], [class*="toast"], [class*="success"]')).toBeVisible({ timeout: 5000 });
    }

    // Checkout
    await page.goto('/checkout');
    await expect(page.getByRole('button', { name: /complete purchase|place order|submit/i })).toBeVisible({ timeout: 10000 });

    // Fill shipping if needed
    const streetInput = page.locator('input[placeholder*="street" i], input[placeholder*="address" i]').first();
    if (await streetInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await streetInput.fill('123 Test St');

      const cityInput = page.locator('input[placeholder*="city" i]').first();
      const stateInput = page.locator('input[placeholder*="state" i], input[placeholder*="province" i]').first();
      const zipInput = page.locator('input[placeholder*="zip" i], input[placeholder*="postal" i]').first();
      const countryInput = page.locator('input[placeholder*="country" i]').first();

      await cityInput.fill('Test City');
      await stateInput.fill('TS');
      await zipInput.fill('12345');
      await countryInput.fill('Test Country');
    }

    // Complete order
    const completePurchaseBtn = page.getByRole('button', { name: /complete purchase|place order|submit/i });
    await completePurchaseBtn.click();

    await expect(page).toHaveURL(/\/checkout\/success|\/orders/, { timeout: 10000 });
  });

  test('should navigate to completed order', async ({ page }) => {
    // Login as buyer
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(buyerEmail);
    await passwordInput.fill(buyerPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Go to orders
    await page.goto('/orders');
    await expect(page.getByText(/order/i)).toBeVisible({ timeout: 10000 });

    // Click on first order
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /order|#/i }).first();
    await orderLink.click();

    // Should be on order detail page
    await expect(page).toHaveURL(/\/orders\/[\w-]+/, { timeout: 10000 });
  });

  test('should see review form for completed order', async ({ page }) => {
    // Login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(buyerEmail);
    await passwordInput.fill(buyerPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Navigate to orders
    await page.goto('/orders');
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /order|#/i }).first();
    await orderLink.click();

    // Wait for order to load
    await expect(page.getByText(/order/i)).toBeVisible({ timeout: 10000 });

    // Check for review form - note: order must be in 'completed' status for review form to show
    // This test assumes the backend has automatically completed the order or seller has advanced status
    const reviewForm = page.locator('form:has-text("Rating"), form:has([class*="review"])');
    const reviewSection = page.locator('[class*="review"], [id*="review"]');

    const formVisible = await reviewForm.isVisible({ timeout: 2000 }).catch(() => false);
    const sectionVisible = await reviewSection.isVisible({ timeout: 2000 }).catch(() => false);

    expect(formVisible || sectionVisible).toBeTruthy();
  });

  test('should submit a review with star rating', async ({ page }) => {
    // Login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(buyerEmail);
    await passwordInput.fill(buyerPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Navigate to orders
    await page.goto('/orders');
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /order|#/i }).first();
    await orderLink.click();

    // Find review form
    const reviewForm = page.locator('form:has-text("Rating"), form:has([class*="review"])').first();
    await expect(reviewForm).toBeVisible({ timeout: 10000 });

    // Click on 4th star to set rating (stars are 0-indexed, so index 3 = 4 stars)
    const stars = reviewForm.locator('button[aria-label*="star"], [role="button"]:has-text("★")');
    const starCount = await stars.count();

    if (starCount >= 4) {
      await stars.nth(3).click(); // 4 stars
    } else if (starCount > 0) {
      // Fallback: click last star
      await stars.last().click();
    }

    // Wait for the rating to be registered before submitting
    await page.waitForLoadState('networkidle');

    // Add comment if textarea exists
    const commentInput = reviewForm.locator('textarea').first();
    if (await commentInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await commentInput.fill('Great product! Very satisfied with the quality.');
    }

    // Submit review
    const submitBtn = reviewForm.locator('button:has-text("Submit")').first();
    await expect(submitBtn).toBeVisible({ timeout: 2000 });
    await submitBtn.click();

    // Should show success message
    await expect(page.locator('[role="status"], [class*="toast"], text=/submitted|success|review/i')).toBeVisible({ timeout: 10000 });
  });

  test('should see updated rating on product detail page', async ({ page }) => {
    // Get the product ID from orders page
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(buyerEmail);
    await passwordInput.fill(buyerPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Navigate to orders to find product
    await page.goto('/orders');
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /order|#/i }).first();
    await orderLink.click();

    // Get product link from order items
    const productLink = page.locator('[role="link"], a').filter({ hasText: /product|item/i }).first();
    if (await productLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await productLink.click();
    } else {
      // Fallback: find and click on product in order detail
      const productName = page.locator('td:nth-child(1), [class*="product"]').first();
      const href = await productName.locator('a').getAttribute('href').catch(() => null);
      if (href) {
        await page.goto(href);
      }
    }

    // Should be on product detail page
    await expect(page).toHaveURL(/\/products\/[\w-]+/, { timeout: 10000 });

    // Verify rating is displayed
    const ratingDisplay = page.locator('[class*="rating"], [class*="star"], text=/★/');
    await expect(ratingDisplay.first()).toBeVisible({ timeout: 10000 });

    // Verify review count is updated
    const reviewCount = page.locator('text=/\\(\\d+ review/');
    const reviewCountExists = await reviewCount.isVisible({ timeout: 2000 }).catch(() => false);
    expect(reviewCountExists).toBeTruthy();
  });

  test('should not allow duplicate review submission', async ({ page }) => {
    // Login
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginBtn = page.getByRole('button', { name: /login|sign in/i });

    await emailInput.fill(buyerEmail);
    await passwordInput.fill(buyerPassword);
    await loginBtn.click();

    await page.waitForURL('/', { timeout: 10000 });

    // Navigate to the same order
    await page.goto('/orders');
    const orderLink = page.locator('[role="link"], a, [class*="order"]').filter({ hasText: /order|#/i }).first();
    await orderLink.click();

    // Wait for order to load
    await expect(page.getByText(/order/i)).toBeVisible({ timeout: 10000 });

    // Check that review form is no longer visible or is disabled, or a message indicates already reviewed
    const reviewForm = page.locator('form:has-text("Rating"), form:has([class*="review"])').first();
    const alreadyReviewedMsg = page.locator('text=/already reviewed|review submitted|you.*reviewed/i');

    const formExists = await reviewForm.isVisible({ timeout: 2000 }).catch(() => false);
    const msgExists = await alreadyReviewedMsg.isVisible({ timeout: 2000 }).catch(() => false);

    // Either the form is gone or a message indicates already reviewed
    if (formExists) {
      // If form is still there, it should be disabled
      const submitBtn = reviewForm.locator('button:has-text("Submit")').first();
      const isDisabled = await submitBtn.isDisabled().catch(() => true);
      expect(formExists && isDisabled).toBeTruthy();
    } else {
      // Or we should see an already reviewed message
      expect(msgExists).toBeTruthy();
    }
  });
});
