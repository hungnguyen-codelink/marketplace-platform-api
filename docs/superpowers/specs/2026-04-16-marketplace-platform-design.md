# Marketplace Platform — Design Spec

| Field | Value |
|---|---|
| **Date** | 2026-04-16 |
| **Status** | Approved |
| **PRD** | PRD-online-marketplace-api v1.1 |

---

## 1. Overview

A full-stack multi-vendor marketplace (Etsy-like) built as a monorepo with a Node.js/Express/TypeScript backend, React/TypeScript/Tailwind frontend, PostgreSQL database, and Redis for sessions, cart, rate limiting, and category caching. Implementation follows domain-vertical slices — each phase delivers a working backend + frontend + tests before moving to the next domain.

---

## 2. Repository Structure

Monorepo using npm workspaces. Single repo, two packages (`backend`, `frontend`), plus a top-level `e2e/` directory for Playwright specs.

```
marketplace/
├── package.json                  # root workspace, shared scripts (dev, test, lint)
├── docker-compose.yml            # postgres:16-alpine + redis:7-alpine (dev)
├── docker-compose.prod.yml       # production override
├── .env.example
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.ts
│   ├── src/
│   │   ├── app.ts                # Express app factory
│   │   ├── server.ts             # entry point
│   │   ├── config/               # env vars, constants
│   │   ├── db/                   # postgres client, migrations, schema
│   │   ├── redis/                # redis client, helpers
│   │   ├── middleware/           # auth, rate-limit, error handler, validate
│   │   ├── modules/
│   │   │   ├── auth/             # router, controller, service
│   │   │   ├── shops/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── reviews/
│   │   │   ├── fakestore/
│   │   │   ├── mock-payment/
│   │   │   └── admin/
│   │   └── types/                # shared TypeScript types
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx               # router setup
│   │   ├── api/                  # axios client + per-domain API modules
│   │   ├── components/           # shared UI components
│   │   ├── contexts/             # AuthContext, CartContext
│   │   ├── hooks/                # React Query hooks per domain
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── buyer/
│   │   │   ├── seller/
│   │   │   └── admin/
│   │   └── types/                # shared TypeScript types (mirrors backend)
│   └── tests/
├── e2e/
│   ├── playwright.config.ts      # baseURL: http://localhost:5173
│   ├── purchase-flow.spec.ts
│   ├── seller-onboarding.spec.ts
│   ├── review-cycle.spec.ts
│   └── degraded-mode.spec.ts
└── docs/
    └── superpowers/
        └── specs/
```

---

## 3. Infrastructure

### Docker Compose (dev)

| Service | Image | Port | Purpose |
|---|---|---|---|
| postgres | postgres:16-alpine | 5432 | Primary data store |
| redis | redis:7-alpine | 6379 | Sessions, cart, rate limiting, category cache |

A `db:migrate` npm script runs raw SQL migrations on startup via a lightweight migration runner (no ORM — raw `pg` client).

### Redis Key Namespaces

| Key | Value | TTL |
|---|---|---|
| `session:{token_hash}` | user session JSON | configurable via `SESSION_TTL_SECONDS` |
| `cart:{user_id}` | hash of `product_id → quantity` | none (persists until cleared) |
| `categories:fakestore` | JSON array of category strings | `FAKESTORE_CATEGORY_CACHE_TTL_SECONDS` (default 3600) |
| `rate_limit:{ip}` | sliding window counter | `RATE_LIMIT_WINDOW_MS` |

### Environment Variables

```
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=
SESSION_TTL_SECONDS=86400

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# FakeStore
FAKESTORE_BASE_URL=https://fakestoreapi.com
FAKESTORE_CATEGORY_CACHE_TTL_SECONDS=3600
FAKESTORE_TIMEOUT_MS=5000
FAKESTORE_RETRY_ATTEMPTS=3
FAKESTORE_RETRY_BACKOFF_MS=500
```

---

## 4. Database Schema

### Tables

```sql
-- Users
users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  password_hash   text NOT NULL,
  full_name       text NOT NULL,
  role            text NOT NULL CHECK (role IN ('buyer','seller','admin')),
  email_verified  boolean NOT NULL DEFAULT false,
  terms_accepted  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
)

-- Shops (one per seller)
shops (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES users(id) UNIQUE,
  name            text NOT NULL,
  description     text,
  banner_url      text,
  contact_email   text,
  created_at      timestamptz NOT NULL DEFAULT now()
)

-- Products
products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid NOT NULL REFERENCES shops(id),
  fakestore_id      integer UNIQUE,          -- null for manually created products
  title             text NOT NULL,
  description       text,
  price             numeric(10,2) NOT NULL CHECK (price > 0),
  image_url         text,
  category          text,
  stock             integer NOT NULL DEFAULT 0 CHECK (stock >= 0 AND stock <= 999999),
  aggregate_rating  numeric(3,2) NOT NULL DEFAULT 0,
  review_count      integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)

-- Orders
orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         uuid NOT NULL REFERENCES users(id),
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','shipped','delivered','completed')),
  shipping_address jsonb NOT NULL,
  total_amount     numeric(10,2) NOT NULL,
  transaction_id   text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
)

-- Order Items
order_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id),
  product_id  uuid NOT NULL REFERENCES products(id),
  quantity    integer NOT NULL CHECK (quantity > 0),
  unit_price  numeric(10,2) NOT NULL   -- captured at time of purchase
)

-- Reviews
reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) UNIQUE, -- one review per line item
  buyer_id      uuid NOT NULL REFERENCES users(id),
  product_id    uuid NOT NULL REFERENCES products(id),
  rating        integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text          text,
  created_at    timestamptz NOT NULL DEFAULT now()
)

-- Category fallback (used when Redis is unavailable)
categories (
  id    serial PRIMARY KEY,
  name  text UNIQUE NOT NULL
)

-- JWT revocation
sessions (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id),
  expires_at  timestamptz NOT NULL
)
```

### Key Schema Decisions

- `fakestore_id` on products enables upsert-by-external-key for FakeStore import.
- `shipping_address` as JSONB — flexible without a separate address table.
- `aggregate_rating` + `review_count` stored on product and updated atomically with each review to avoid expensive aggregation at read time.
- `sessions` table enables JWT revocation (AC-08) — logout deletes the row; every protected request checks it.
- `order_items.unit_price` captures price at time of purchase since product prices can change later.
- `reviews.order_item_id UNIQUE` enforces one review per order line item (REV-05).

---

## 5. Backend Architecture

### Request Lifecycle

```
Request
  → rateLimiter        (Redis sliding window; fails open when Redis is down)
  → authenticate       (JWT verify + sessions table revocation check)
  → requireRole(...)   (role guard, 403 on mismatch)
  → validate(schema)   (Zod, 400 with field-level errors)
  → controller
  → service
  → Response
```

### Middleware

**`rateLimiter`** — Redis-backed sliding window counter per IP. On Redis failure: fails open (request passes through), logs a warning, sets header `X-RateLimit-Status: DEGRADED`. Test harness detects this header and reports `BLOCKED` state (AC-06, NFR-05).

**`authenticate`** — Verifies JWT signature using `JWT_SECRET`. Checks `sessions` table to confirm the token has not been revoked. Attaches `req.user = { id, email, role }`. Returns 401 if invalid or revoked.

**`requireRole(...roles)`** — Compares `req.user.role` against the allowed list. Returns 403 if not permitted.

**`validate(schema)`** — Zod schema validation against `req.body`, `req.params`, and `req.query`. Returns 400 with structured field errors on failure.

**`errorHandler`** — Global Express error handler. Maps known `AppError` subclasses to HTTP status codes. Logs unknown errors server-side. Never exposes stack traces to clients.

### Error Class Hierarchy

```
AppError (base)
├── ValidationError     → 400
├── AuthError           → 401
├── ForbiddenError      → 403
├── NotFoundError       → 404
├── ConflictError       → 409  (concurrent checkout, duplicate shop, duplicate review)
├── PaymentError        → 402
└── UnprocessableError  → 422  (invalid order state transition)
```

### Atomic Checkout (NFR-01, AC-02)

Checkout runs inside a PostgreSQL transaction:
1. `SELECT ... FOR UPDATE` on all products being purchased — serializes concurrent checkouts.
2. Validate stock for each item; if any item is insufficient, roll back and return 409.
3. Call Mock Payment API (`POST /api/mock-payment`); if non-success response, roll back and return 402.
4. Decrement stock and insert order + order items atomically within the same transaction.
5. Commit. Order status starts as `pending` and immediately transitions to `confirmed`.

### Order State Machine

Valid transitions (server-enforced):
```
pending → confirmed → shipped → delivered → completed
```
Any skip or backward transition returns 422 with `{ currentState, validNextStates }`.

### Mock Payment Module

Internal Express router at `POST /api/mock-payment`. Always returns:
```json
{ "status": "success", "transaction_id": "<uuid>" }
```
Checkout treats any non-`success` status as payment failure (returns 402 to buyer).

### FakeStore Integration

- HTTP client with configurable timeout (`FAKESTORE_TIMEOUT_MS`).
- Retry logic: up to `FAKESTORE_RETRY_ATTEMPTS` with exponential backoff starting at `FAKESTORE_RETRY_BACKOFF_MS`.
- On timeout/5xx/network error: returns a descriptive error to the caller; no system crash.
- Categories: fetched from FakeStore → cached in Redis (TTL configurable) → on cache miss re-fetched → on Redis unavailability fall back to `categories` DB table → on DB table empty re-fetch and populate.
- Product import: upsert by `fakestore_id`. Locally customized fields (price, description, stock) are not overwritten unless `overwrite: true` is passed in the request body (D3).
- Malformed/missing fields from FakeStore fall back to defined defaults rather than causing errors (PROD-08, AC-07).

---

## 6. Frontend Architecture

### Route Map

| Path | Component | Role |
|---|---|---|
| `/` | ProductBrowse | public |
| `/register` | Register | public |
| `/login` | Login | public |
| `/products/:id` | ProductDetail | public |
| `/cart` | Cart | buyer |
| `/checkout` | Checkout | buyer |
| `/checkout/success` | CheckoutSuccess | buyer |
| `/orders` | OrderHistory | buyer |
| `/orders/:id` | OrderDetail | buyer |
| `/seller/onboarding` | SellerOnboarding | seller |
| `/seller/shop` | ShopProfile | seller |
| `/seller/products` | ProductManagement | seller |
| `/seller/products/new` | CreateProduct | seller |
| `/seller/products/import` | FakeStoreImport | seller |
| `/seller/products/:id/edit` | EditProduct | seller |
| `/seller/orders` | SellerOrders | seller |
| `/seller/orders/:id` | SellerOrderDetail | seller |
| `/admin/users` | AdminUsers | admin |
| `/admin/shops` | AdminShops | admin |
| `/admin/orders` | AdminOrders | admin |

### Route Guards

- `<RequireAuth>` — redirects unauthenticated users to `/login?returnTo=<current-path>`.
- `<RequireRole role="seller">` — redirects non-sellers to `/`.
- `<RequireRole role="admin">` — redirects non-admins to `/`.
- Seller routes additionally check `email_verified && terms_accepted`; incomplete onboarding redirects to `/seller/onboarding`.

### State Management

- **`AuthContext`** — current user, JWT token, `login()`, `logout()`. Token persisted in `localStorage`. Cleared on 401 response.
- **`CartContext`** — wraps React Query cart data; exposes `addItem`, `removeItem`, `updateQty`, `clearCart`. Optimistic updates with rollback on error.
- **React Query** — all server state. Each domain has its own query keys (`['products']`, `['orders']`, etc.). Mutations invalidate relevant query keys on success.

### API Layer

Single Axios instance:
- Base URL from `VITE_API_URL` env var.
- Request interceptor: attaches `Authorization: Bearer <token>`.
- Response interceptor: on 401, clears auth and redirects to `/login`.

Per-domain API modules (`auth.api.ts`, `products.api.ts`, `orders.api.ts`, etc.) are thin typed wrappers over the Axios instance.

### Shared UI Components

`Button`, `Input`, `FormField`, `Toast` (global via context), `Badge`, `Modal` (confirm dialogs), `Spinner`, `StarRating`, `StatusBadge`, `ProgressStepper` (order lifecycle), `EmptyState`. All Tailwind-styled, responsive at 375/768/1280px (AC-UI-01).

---

## 7. Implementation Phases

### Phase 0 — Foundation
Monorepo scaffolding, npm workspaces, Docker Compose, DB migration runner, Redis client, Express app factory, global middleware skeleton, Vite + React + Tailwind setup, Axios client, shared UI components, route guard stubs. No features — just everything compiles and `docker-compose up` boots the services.

### Phase 1 — Auth
**Backend:** register, login, logout, JWT issuance, Redis session, bcrypt hashing, role assignment.
**Frontend:** `/register`, `/login`, `AuthContext`, `<RequireAuth>` guard.
**Tests:** unit (bcrypt, JWT), integration (register/login/logout/revocation), UI (form validation, redirect on success).

### Phase 2 — Shops
**Backend:** CRUD for shop, one-shop-per-seller enforcement, onboarding state checks (`SHOP-02`, `SHOP-03`).
**Frontend:** `/seller/onboarding` (two-step flow), `/seller/shop` (profile form), public shop page.
**Tests:** onboarding gate (AC-09), shop CRUD, one-shop limit.

### Phase 3 — Products
**Backend:** product CRUD scoped to shop, search + category filter, price/stock validation.
**Frontend:** `/` (browse + search + category filter), `/products/:id` (with reviews section), `/seller/products` (management table), create/edit forms.
**Tests:** CRUD, price/stock validation, out-of-stock display (AC-UI-04).

### Phase 4 — FakeStore Integration
**Backend:** FakeStore HTTP client (retry + timeout), category cache (Redis → DB fallback), product import (upsert + `overwrite` flag), graceful field defaults.
**Frontend:** `/seller/products/import` (grid + import dialog + overwrite checkbox + error banner + retry).
**Tests:** cache-hit/miss/down paths (EXT-06), FakeStore unavailability (AC-03), malformed field handling (AC-07), overwrite checkbox default state (AC-UI-07).

### Phase 5 — Orders & Checkout
**Backend:** Redis cart (add/remove/update/clear), checkout with `SELECT FOR UPDATE`, mock payment call, atomic stock decrement + order creation, order state machine, seller order view endpoints.
**Frontend:** `/cart`, `/checkout` (with address form + mock payment notice), `/checkout/success`, `/orders`, `/orders/:id` (progress stepper), `/seller/orders` (with status filter tabs), `/seller/orders/:id` (next-state button only).
**Tests:** concurrent checkout for last item (AC-02), inventory validation, payment failure (cart preserved — AC-UI-05), state transition enforcement (AC-UI-08).

### Phase 6 — Reviews
**Backend:** review submission gated on `completed` order status, one-review-per-line-item enforcement, aggregate rating + review count atomic update.
**Frontend:** review form on order detail (inline, no navigation), star rating display on product browse and detail pages.
**Tests:** review gate (AC-04), duplicate review rejection (REV-05), rating recalculation accuracy (AC-10).

### Phase 7 — Admin Panel
**Backend:** admin-scoped endpoints — user list/detail/role-update, shop list/suspend, order status override.
**Frontend:** `/admin/users` (user table + role management), `/admin/shops` (shop table + suspension), `/admin/orders` (order table + status override).
**Tests:** role enforcement (non-admin returns 403), admin CRUD operations.

### Phase 8 — NFRs, Rate Limiting & Production Dockerfiles
- Rate limiter middleware wired up (Redis-backed, fail-open, `DEGRADED` header).
- `BLOCKED` test state detection in test harness (AC-06).
- Production multi-stage Dockerfiles for backend and frontend.
- `docker-compose.prod.yml` with production overrides.
- `.env.example` fully documented.
- E2E Playwright specs written and verified with Playwright MCP (see Section 8).

---

## 8. E2E Testing

### Approach

Two complementary layers:
1. **Playwright MCP live verification** — During frontend development in each phase, the Playwright MCP tool navigates the running app, interacts with UI elements, and verifies acceptance criteria in real time before declaring a phase complete.
2. **Committed Playwright spec files** — Formal `.spec.ts` files in `e2e/` that can be run in CI by anyone (`npx playwright test`).

### Spec Files

| File | Covers |
|---|---|
| `purchase-flow.spec.ts` | Register → browse → add to cart → checkout → order history (AC-01, AC-02) |
| `seller-onboarding.spec.ts` | Register seller → onboarding → create shop → import from FakeStore → product appears in catalog |
| `review-cycle.spec.ts` | Complete order → submit review → rating updates on product page (AC-04, AC-10) |
| `degraded-mode.spec.ts` | FakeStore unreachable → error banner shown → buyer can still browse and purchase existing products |

### Configuration

```typescript
// e2e/playwright.config.ts
baseURL: 'http://localhost:5173'  // Vite dev server
// Backend assumed at http://localhost:3000
```

---

## 9. Testing Strategy

**Unit tests** — Pure functions: password hashing, JWT creation/verification, price validation, state machine transitions, FakeStore field defaults, aggregate rating calculation.

**Integration tests** — Per-domain: each module's routes tested via Supertest against a real test database (separate from dev). Tests run in isolation with setup/teardown per test file.

**UI tests (React Testing Library)** — Component-level: form validation, error states, loading states, conditional rendering (out-of-stock, onboarding gate, review prompt).

**E2E tests (Playwright)** — Full-stack flows as described in Section 8.

**Infrastructure states tested:**
- `PASS` — services up, code correct.
- `FAIL` — services up, code has a bug.
- `BLOCKED` — required infrastructure (Postgres or Redis) unavailable.

---

## 10. Production Dockerfiles

**Backend** — Multi-stage build: `builder` stage compiles TypeScript → `production` stage runs `node dist/server.js`. Runs as non-root user.

**Frontend** — Multi-stage build: `builder` stage runs `vite build` → `production` stage serves static assets via Nginx. Nginx config proxies `/api` to the backend container.

---

## 11. Key Design Decisions (from PRD)

| Decision | Resolution |
|---|---|
| Rate-limit thresholds | Via `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` env vars; defaults baked in |
| Category cache TTL | 3600s default, overridable via `FAKESTORE_CATEGORY_CACHE_TTL_SECONDS` |
| FakeStore import mode | Upsert by `fakestore_id`; local fields not overwritten unless `overwrite: true` |
| Max stock per product | 999,999 units; enforced at DB constraint and API validation |
| Order state transitions | Strictly server-enforced; response includes `validNextStates` on invalid attempt |
