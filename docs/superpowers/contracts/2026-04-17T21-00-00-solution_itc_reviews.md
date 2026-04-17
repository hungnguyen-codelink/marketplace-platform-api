# Solution ITC — Phase 6 Reviews

```yaml
solution: "Phase 6 — Reviews"
tasks_covered: [6.1, 6.2]

implementation_summary:
  entry_points:
    - "POST /api/reviews — submit review for order item (auth: buyer)"
  protected_routes:
    - "POST /api/reviews — requires Bearer token + buyer role"

test_contract:
  tiers_required: [e2e, full_suite]
  rationale: "Complete feature touching auth, backend transactions, frontend mutations, and cross-page state updates."

  e2e:
    commands:
      - "cd /Users/nguyenviethung/.config/superpowers/worktrees/marketplace-platform-superpowers/marketplace-implementation/backend && npm test -- --testPathPattern=reviews/endpoints.integration"
      - "cd /Users/nguyenviethung/.config/superpowers/worktrees/marketplace-platform-superpowers/marketplace-implementation/frontend && npm test -- src/pages/buyer/OrderDetail.test.tsx"
      - "cd /Users/nguyenviethung/.config/superpowers/worktrees/marketplace-platform-superpowers/marketplace-implementation/frontend && npm test -- src/pages/buyer/ProductBrowse.test.tsx"

    scenarios:
      - "Buyer submits review for completed order item → backend validates ownership + completed status → atomic product aggregate_rating and review_count update → OrderDetail shows 'Review submitted'"
      - "Buyer attempts review for non-completed order → backend returns 403 → OrderDetail form not rendered"
      - "Buyer attempts duplicate review → first succeeds (201) → second returns 409 → OrderDetail shows 'Already reviewed'"
      - "ProductBrowse displays aggregate_rating + review_count only when review_count > 0"
      - "Frontend ReviewForm requires rating > 0 to enable Submit button"
      - "Multi-item orders show independent ReviewForm per item with separate state"

    required_services:
      - "PostgreSQL database (DATABASE_URL env var)"
      - "Migrations 001-008 applied"
      - "JWT_SECRET and SESSION_TTL_SECONDS env vars set"

  full_suite:
    command: "cd /Users/nguyenviethung/.config/superpowers/worktrees/marketplace-platform-superpowers/marketplace-implementation/backend && npm test && cd /Users/nguyenviethung/.config/superpowers/worktrees/marketplace-platform-superpowers/marketplace-implementation/frontend && npm test"
    rationale: "Run complete backend Jest suite + complete frontend Vitest suite to catch any cross-task regression."

acceptance_criteria:
  e2e: all scenarios pass
  full_suite: all pass
  no_regression: true

sign_off:
  coding_agent: ✅
  testing_agent: ✅
```
