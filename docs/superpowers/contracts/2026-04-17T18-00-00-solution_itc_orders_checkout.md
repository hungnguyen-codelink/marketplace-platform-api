```yaml
solution: "Phase 5 — Orders & Checkout"
tasks_covered: [5.1, 5.2]

implementation_summary:
  entry_points:
    - "GET /api/cart — retrieve current user's cart with product details and total"
    - "POST /api/cart/items — add item to cart { product_id, quantity }"
    - "PUT /api/cart/items/:productId — update item quantity { quantity } (0 removes)"
    - "DELETE /api/cart/items/:productId — remove item from cart"
    - "DELETE /api/cart — clear entire cart"
    - "POST /api/orders/checkout — submit checkout with shipping address"
    - "GET /api/orders — list buyer's orders paginated (most recent first)"
    - "GET /api/orders/:id — get single order with items"
    - "GET /api/seller/orders — list orders containing seller's products (paginated, filterable by status)"
    - "GET /api/seller/orders/:id — get order detail for seller"
    - "PATCH /api/seller/orders/:id/status — advance order status (pending→confirmed→shipped→delivered→completed)"
    - "POST /api/mock-payment — mock payment processor (always succeeds)"

  protected_routes:
    - "GET /api/cart (authenticate)"
    - "POST /api/cart/items (authenticate)"
    - "PUT /api/cart/items/:productId (authenticate)"
    - "DELETE /api/cart/items/:productId (authenticate)"
    - "DELETE /api/cart (authenticate)"
    - "POST /api/orders/checkout (authenticate)"
    - "GET /api/orders (authenticate)"
    - "GET /api/orders/:id (authenticate)"
    - "GET /api/seller/orders (authenticate + requireRole('seller'))"
    - "GET /api/seller/orders/:id (authenticate + requireRole('seller'))"
    - "PATCH /api/seller/orders/:id/status (authenticate + requireRole('seller'))"

test_contract:
  tiers_required: [e2e, full_suite]
  rationale: "E2E validates complete purchase flow end-to-end; full_suite ensures no regression across all modules."

  e2e:
    commands:
      - "npm run test -w backend -- tests/integration/modules/cart/endpoints.integration.test.ts"
      - "npm run test -w backend -- tests/integration/modules/orders/endpoints.integration.test.ts"
      - "npm run test -w frontend"
    scenarios:
      - "Authenticated buyer adds product to cart, views cart, updates quantity, removes item, clears cart"
      - "Authenticated buyer checks out with valid shipping address, order created with 'confirmed' status"
      - "Checkout fails when cart empty, stock insufficient, or shipping address invalid"
      - "Buyer retrieves single order and order list (paginated, most recent first)"
      - "Authenticated seller views orders containing their products (paginated)"
      - "Seller filters orders by status (pending/confirmed/shipped/delivered/completed)"
      - "Seller views order detail and advances order status through valid state transitions"
      - "Invalid state transitions (e.g. pending→shipped) return 422 Unprocessable Entity"
      - "Cart cleared after successful checkout"
      - "Stock decremented atomically during checkout"
      - "Transaction rolled back if payment fails"
    required_services:
      - "PostgreSQL (with orders, order_items, products, shops, users, sessions tables)"
      - "Redis (for cart HSET storage)"

  full_suite:
    command: "npm run test -w backend && npm run test -w frontend"
    rationale: "Catch any cross-task regression. Validates 356 backend + 207 frontend tests."

acceptance_criteria:
  e2e: all scenarios pass
  full_suite: all pass
  no_regression: true

sign_off:
  coding_agent: ✅
  testing_agent: ✅
```
