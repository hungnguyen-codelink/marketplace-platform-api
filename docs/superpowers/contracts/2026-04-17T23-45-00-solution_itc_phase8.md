```yaml
solution: "Phase 8 — NFRs, Rate Limiting & Production Dockerfiles"
tasks_covered: [8.1, 8.2, 8.3, 8.4]

implementation_summary:
  entry_points:
    - "backend/src/middleware/rateLimiter.ts: Sliding window rate limiter (IP-based, Redis-backed, fail-open)"
    - "backend/Dockerfile: Multi-stage production build (Node 20-alpine, non-root appuser)"
    - "frontend/Dockerfile: Multi-stage production build (Vite SPA → Nginx reverse proxy)"
    - "docker-compose.prod.yml: Production orchestration (backend, frontend, Redis, PostgreSQL)"
    - "frontend/nginx.conf: Reverse proxy config (SPA routing, /api/* passthrough to backend:3000)"
    - "backend/.dockerignore & frontend/.dockerignore: Optimized build context exclusions"
    - ".env.example: 12 documented environment variables with production guidance"
    - "e2e/playwright.config.ts + 4 spec files: purchase-flow, seller-onboarding, review-cycle, degraded-mode"

test_contract:
  tiers_required: [e2e, full_suite]
  rationale: "E2E validates user-facing workflows; full suite catches backend unit + integration regressions."

  e2e:
    commands:
      - "cd e2e && npx playwright test"
    scenarios:
      - "purchase-flow: register → browse → add to cart → checkout → order history"
      - "seller-onboarding: register seller → onboarding → shop → FakeStore import → catalog"
      - "review-cycle: complete order → submit review with star rating → aggregate rating updates"
      - "degraded-mode: FakeStore unreachable → error banner → existing products still browsable"
    required_services:
      - "PostgreSQL on localhost:5432 (via docker-compose.yml)"
      - "Redis on localhost:6379 (via docker-compose.yml)"
      - "Backend dev server on localhost:3000"
      - "Frontend Vite dev server on localhost:5173"

  full_suite:
    command: "npm test"
    rationale: "Runs backend Jest (unit + integration) and frontend Vitest, catching cross-task regressions"

acceptance_criteria:
  e2e: all 4 scenarios pass
  full_suite: all tests pass
  no_regression: true

sign_off:
  coding_agent: ✅
  testing_agent: ✅
```
