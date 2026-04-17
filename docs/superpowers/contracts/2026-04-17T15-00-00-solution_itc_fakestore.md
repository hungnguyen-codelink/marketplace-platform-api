# Solution ITC: FakeStore Integration (Tasks 4.1 + 4.2)

```yaml
solution: "FakeStore Integration (Tasks 4.1 + 4.2)"
tasks_covered: [4.1, 4.2]

implementation_summary:
  backend_endpoints:
    - "GET /api/fakestore/products — returns FakestoreProduct[] (seller auth)"
    - "GET /api/fakestore/categories — returns string[] (public, Redis→DB→FakeStore fallback)"
    - "POST /api/fakestore/import — upserts by fakestore_id (seller auth, shop required)"
  frontend_routes:
    - "GET /seller/products/import (FakeStoreImport) — Product grid with checkboxes, import dialog, error banner"
  protected_routes:
    - "GET /api/fakestore/products (seller only)"
    - "POST /api/fakestore/import (seller only, shop required)"
    - "GET /seller/products/import (authenticated, seller role required)"

test_contract:
  tiers_required: [e2e, full_suite]
  rationale: "E2E via backend integration tests + frontend unit tests to verify full import workflow; full_suite ensures no regressions across all modules."

  e2e:
    commands:
      - "npm run test --workspace=backend -- tests/integration/modules/fakestore/endpoints.integration.test.ts"
      - "npm run test --workspace=frontend -- src/pages/seller/FakeStoreImport.test.tsx src/api/fakestore.test.ts"
    scenarios:
      - "Seller fetches FakeStore products: GET /api/fakestore/products returns product list with field defaults applied"
      - "Public fetches categories: GET /api/fakestore/categories returns cached category list"
      - "Category fallback chain: Redis→DB→FakeStore API works correctly on cache miss and Redis unavailability"
      - "Seller imports products with overwrite=false: preserves existing price, description, stock"
      - "Seller imports products with overwrite=true: replaces all fields including price, description, stock"
      - "Malformed FakeStore data applies field defaults (title='Untitled Product', price=0.01, category='uncategorized')"
      - "FakeStore unavailability: error response returned after retry exhaustion"
      - "Frontend: product grid renders with checkboxes, image, title, price, category"
      - "Frontend: overwrite checkbox defaults to unchecked in import dialog (AC-UI-07)"
      - "Frontend: error banner + Retry button shown on GET failure (AC-03)"
      - "Frontend: import success shows toast + navigates to /seller/products"
    required_services:
      - "PostgreSQL test database with users, sessions, shops, products, categories tables"
      - "Redis test instance (localhost:6379 or REDIS_URL env)"
      - "FakeStore API mocked via jest.mock() in tests"

  full_suite:
    command: "npm test"
    rationale: "Runs both backend (jest) and frontend (vitest) test suites from root to catch any cross-module regressions."

acceptance_criteria:
  e2e: all scenarios pass
  full_suite: all pass
  no_regression: true

sign_off:
  coding_agent: ✅
  testing_agent: ✅
```
