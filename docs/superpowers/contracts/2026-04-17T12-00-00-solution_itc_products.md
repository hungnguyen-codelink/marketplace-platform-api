# Solution ITC: Products Phase (Tasks 3.1 + 3.2)

```yaml
solution: "Products Phase (Tasks 3.1 + 3.2)"
tasks_covered: [3.1, 3.2]

implementation_summary:
  backend_endpoints:
    - "POST /api/products — Create product (seller auth, returns 201 with product object)"
    - "GET /api/products — Browse products (public, paginated, supports search and category filters)"
    - "GET /api/products/:id — Retrieve product detail (public)"
    - "GET /api/products/my — List current seller's products (seller-only, paginated)"
    - "PUT /api/products/:id — Update product (seller auth, ownership check)"
    - "DELETE /api/products/:id — Delete product (seller auth, ownership check, returns 204)"
  
  frontend_routes:
    - "GET / (ProductBrowse) — Public product grid with search, category filter, pagination"
    - "GET /products/:id (ProductDetail) — Public product detail page"
    - "GET /seller/products (ProductManagement) — Seller's product list with edit/delete actions"
    - "GET /seller/products/new (CreateProduct) — Form to create new product"
    - "GET /seller/products/:id/edit (EditProduct) — Form to edit existing product"
  
  protected_routes:
    - "POST /api/products (seller only)"
    - "GET /api/products/my (seller only)"
    - "PUT /api/products/:id (seller only, ownership check)"
    - "DELETE /api/products/:id (seller only, ownership check)"
    - "GET /seller/products (authenticated, seller role required)"
    - "GET /seller/products/new (authenticated, seller role required)"
    - "GET /seller/products/:id/edit (authenticated, seller role required)"

test_contract:
  tiers_required: [e2e, full_suite]
  rationale: "E2E via backend integration tests (products endpoints, auth/role enforcement, field validation, pagination, ownership checks) + frontend unit tests as proxy for UI interactions; full_suite catches cross-module regressions and ensures both backend and frontend tests pass together."

  e2e:
    commands:
      - "npm run test --workspace=backend -- tests/integration/modules/products/endpoints.integration.test.ts"
      - "npm run test --workspace=frontend -- src/pages/buyer/ProductBrowse.test.tsx src/pages/buyer/ProductDetail.test.tsx src/pages/seller/ProductManagement.test.tsx src/pages/seller/CreateProduct.test.tsx src/pages/seller/EditProduct.test.tsx src/api/products.test.ts"
    
    scenarios:
      # Backend: Authentication & Authorization
      - "POST /api/products without auth token returns 401 Unauthorized"
      - "POST /api/products with buyer role returns 403 Forbidden"
      - "POST /api/products with seller role and valid payload returns 201 with product object (no fakestore_id)"
      - "POST /api/products with seller but no shop returns 403 Forbidden or 404 Not Found"
      
      # Backend: Field Validation (Price & Stock)
      - "POST /api/products with price field missing returns 400 Bad Request"
      - "POST /api/products with price <= 0 returns 400 Bad Request"
      - "POST /api/products with price > 2 decimal places returns 400 Bad Request"
      - "POST /api/products with stock field missing returns 400 Bad Request"
      - "POST /api/products with stock < 0 returns 400 Bad Request"
      - "POST /api/products with stock > 999999 returns 400 Bad Request"
      - "POST /api/products with non-integer stock (e.g., 5.5) returns 400 Bad Request"
      
      # Backend: CRUD Operations
      - "Seller creates product with valid payload (title, description, price, image_url, category, stock) → 201 with all fields including timestamps"
      - "GET /api/products (public) returns paginated list with default page=1, limit=10"
      - "GET /api/products?search=keyword returns products matching keyword case-insensitively in title, description, or category"
      - "GET /api/products?category=electronics returns only products with exact category match"
      - "GET /api/products?page=2&limit=5 respects pagination parameters"
      - "GET /api/products/:id (public) returns complete product object without fakestore_id"
      - "GET /api/products/:id with non-existent id returns 404 Not Found"
      - "GET /api/products/my returns current seller's products; unauthenticated returns 401"
      - "PUT /api/products/:id with valid partial update returns 200 with updated product"
      - "PUT /api/products/:id with non-owned product (different seller) returns 403 Forbidden"
      - "PUT /api/products/:id updating price validates price > 0 and 2 decimals"
      - "PUT /api/products/:id updates updated_at timestamp"
      - "DELETE /api/products/:id returns 204 No Content"
      - "DELETE /api/products/:id with non-owned product returns 403 Forbidden"
      - "DELETE /api/products/:id twice returns 404 on second attempt (idempotence)"
      
      # Backend: Response Format & Field Types
      - "All product responses exclude fakestore_id field"
      - "Price field is numeric with exactly 2 decimal places"
      - "Stock field is integer with no decimal component"
      - "All timestamps are ISO 8601 formatted strings"
      - "Responses include all required fields: id, shop_id, title, description, price, image_url, category, stock, aggregate_rating, review_count, created_at, updated_at"
      
      # Frontend: Product Browse (Public)
      - "ProductBrowse on mount fetches products via GET /api/products with default params"
      - "ProductBrowse shows loading spinner while fetching"
      - "ProductBrowse renders product grid with image, title, price, stock status"
      - "ProductBrowse stock === 0 shows 'Out of Stock' badge"
      - "ProductBrowse stock > 0 shows 'In Stock' status"
      - "ProductBrowse clicking product card navigates to /products/:id"
      - "ProductBrowse search input calls GET /api/products with search param"
      - "ProductBrowse category dropdown calls GET /api/products with category param"
      - "ProductBrowse pagination buttons update page param and re-fetch"
      - "ProductBrowse no products returns EmptyState"
      - "ProductBrowse API error shows error message"
      
      # Frontend: Product Detail (Public)
      - "ProductDetail on mount fetches product via GET /api/products/:id"
      - "ProductDetail shows loading spinner while fetching"
      - "ProductDetail renders: image, title, description, price, StarRating, stock status"
      - "ProductDetail stock === 0 shows 'Out of Stock' badge"
      - "ProductDetail stock > 0 shows 'In Stock' status"
      - "ProductDetail shows review count"
      - "ProductDetail 404 shows 'Product not found' message"
      
      # Frontend: Seller Product Management
      - "ProductManagement on mount fetches seller's products via GET /api/products/my"
      - "ProductManagement shows loading spinner while fetching"
      - "ProductManagement renders table: title, price, stock, edit/delete actions"
      - "ProductManagement edit button links to /seller/products/:id/edit"
      - "ProductManagement delete button confirms and calls DELETE /api/products/:id, shows success toast"
      - "ProductManagement create button links to /seller/products/new"
      - "ProductManagement no products shows EmptyState"
      - "ProductManagement API error shows error message"
      
      # Frontend: Create Product Form
      - "CreateProduct renders form with fields: title, description, price, image_url, category, stock"
      - "CreateProduct title is required validation"
      - "CreateProduct price is required validation"
      - "CreateProduct price > 0 validation"
      - "CreateProduct price max 2 decimal places validation"
      - "CreateProduct stock is required validation"
      - "CreateProduct stock integer 0-999999 validation"
      - "CreateProduct submit calls POST /api/products, navigates to /seller/products on success"
      - "CreateProduct loading state during submit"
      - "CreateProduct API error shows error message"
      - "CreateProduct cancel button navigates to /seller/products"
      
      # Frontend: Edit Product Form
      - "EditProduct on mount fetches product via GET /api/products/:id"
      - "EditProduct shows loading spinner while fetching"
      - "EditProduct form pre-filled with current product values"
      - "EditProduct validation rules match CreateProduct"
      - "EditProduct submit calls PUT /api/products/:id, navigates to /seller/products on success"
      - "EditProduct loading state during submit"
      - "EditProduct API error shows error message"
      - "EditProduct cancel button navigates to /seller/products"
      
      # Frontend: Products API Module
      - "[productsApi] browseProducts(params) calls GET /api/products with search, category, page, limit"
      - "[productsApi] getProductById(id) calls GET /api/products/:id"
      - "[productsApi] getMyProducts(params) calls GET /api/products/my with pagination params"
      - "[productsApi] createProduct(payload) calls POST /api/products"
      - "[productsApi] updateProduct(id, payload) calls PUT /api/products/:id"
      - "[productsApi] deleteProduct(id) calls DELETE /api/products/:id"
    
    required_services:
      - "PostgreSQL database with users, shops, products, sessions tables"
      - "Environment variables: DATABASE_URL, JWT_SECRET, SESSION_TTL_SECONDS"

  full_suite:
    command: "npm run test"
    rationale: "Executes both backend integration tests and frontend unit tests from root. Ensures no cross-module regressions between backend endpoints and frontend consumers, and validates the complete test infrastructure passes."

acceptance_criteria:
  e2e: all scenarios pass
  full_suite: all pass
  no_regression: true
  response_contracts:
    - "All product responses must exclude fakestore_id"
    - "Price field must be numeric with exactly 2 decimal places"
    - "Stock field must be integer with no decimals"
    - "All timestamps must be ISO 8601 formatted"

sign_off:
  coding_agent: ✅
  testing_agent: ✅
```
