# Migration Completion Summary

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Query v5 Layer                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Queries      │  Mutations   │  Cache       │  DevTools      │
│  (read)       │  (write)     │  Invalidation│  (non-prod)    │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                    QueryProvider                              │
│           QueryClient (global defaults)                      │
│           staleTime: 30s, gcTime: 5min                       │
│           retry: 2 (queries), retry: 0 (mutations)            │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer (unchanged)                  │
│           All services use safeCall() → {success, data, msg}  │
│           unwrap() adapter bridges to React Query             │
├─────────────────────────────────────────────────────────────┤
│                    API (axios, unchanged)                     │
└─────────────────────────────────────────────────────────────┘
```

## Pages Migrated (10 of 12 pages)

| # | Page | Phase | Status | Notes |
|---|------|-------|--------|-------|
| 1 | BranchesPage | 1 | ✅ | First migration, reference pattern |
| 2 | ProductsPage | 2 | ✅ | Pagination, soft-delete modal |
| 3 | DashboardPage | 3 | ✅ | Staggered polling, no setInterval |
| 4 | ProductionPage | 4 | ✅ | Shift-based grouping, branch scope |
| 5 | RemainingPage | 4 | ✅ | Bulk save, form state from query |
| 6 | ReportsPage | 5 | ✅ | 4 report types, export separate |
| 7 | UsersPage | 5 | ✅ | CRUD + block/unblock, security |
| 8 | ProfilePage | — | ❌ Not migrated | 135-line page, low complexity |
| 9 | LoginPage | — | ❌ Not applicable | No server data to cache |
| 10 | NotFoundPage | — | ❌ Not applicable | Static |

**Pages not migrated**: ProfilePage (lightweight, no server state to manage), LoginPage (auth only), NotFoundPage (static).

## Files Created/Modified

### Infrastructure (6 files)
- `src/providers/QueryProvider.jsx` — QueryClient with v5 defaults, rqLogger hook
- `src/utils/queryKeys.js` — v2.0 registry with 6 namespaces, 20+ key factories
- `src/utils/safeQuery.js` — `unwrap()` adapter for safeCall→React Query bridge
- `src/utils/invalidation.js` — centralized helpers, branch-scoped invalidation
- `src/utils/rqLogger.js` — dev-only cache event logger + refetch storm detector

### Feature Hooks (26 files)

| Feature | Query Hooks | Mutation Hooks | Total |
|---------|-------------|----------------|-------|
| branches | 2 | 1 (3 mutations merged) | 3 |
| products | 4 | 4 | 8 |
| dashboard | 4 | 1 | 5 |
| production | 1 | 2 | 3 |
| remaining | 1 | 2 | 3 |
| reports | 4 | 0 | 4 |
| users | 1 | 3 | 4 |
| **Total** | **17** | **16** | **30** |

### Migrations (7 pages)
- `src/pages/branches/BranchesPage.jsx`
- `src/pages/products/ProductsPage.jsx`
- `src/pages/dashboard/DashboardPage.jsx`
- `src/pages/production/ProductionPage.jsx`
- `src/pages/remaining/RemainingPage.jsx`
- `src/pages/reports/ReportsPage.jsx`
- `src/pages/users/UsersPage.jsx`

### Service Files Removed
- `src/hooks/useBranches.js` (Phase 1)
- `src/hooks/useProducts.js` (Phase 2)

---

## Query-Key Registry Snapshot (v2.0)

```javascript
branches: {
  all: ['branches'],
  byId: (id) => ['branches', id],
  active: (filters = {}) => ['branches', 'active', filters],
},
products: {
  all: ['products'],
  byId: (id) => ['products', id],
  list: (filters = {}) => ['products', 'list', filters],
  deleted: (filters = {}) => ['products', 'deleted', filters],
  categories: (filters = {}) => ['products', 'categories', filters],
},
dashboard: {
  overview: (branchId, date) => ['dashboard', 'overview', branchId, date],
  activity: (branchId, date, limit) => ['dashboard', 'activity', branchId, date, limit],
  alerts: (branchId) => ['dashboard', 'alerts', branchId],
},
closure: {
  status: (date) => ['closure', 'status', date],
},
inventory: {
  production: {
    entries: (branchId, filters) => ['inventory', 'production', branchId, 'entries', filters],
    grouped: (branchId, filters) => ['inventory', 'production', branchId, 'grouped', filters],
  },
  remaining: {
    entries: (branchId, date, filters) => ['inventory', 'remaining', branchId, date, filters],
    drafts: (branchId) => ['inventory', 'remaining', branchId, 'drafts'],
  },
  alerts: (branchId) => ['inventory', 'alerts', branchId],
},
reports: {
  daily: (branchId, date, filters) => ['reports', 'daily', branchId, date, filters],
  weekly: (branchId, date, filters) => ['reports', 'weekly', branchId, date, filters],
  monthly: (branchId, date, filters) => ['reports', 'monthly', branchId, date, filters],
  yearly: (branchId, date, filters) => ['reports', 'yearly', branchId, date, filters],
},
users: {
  list: (filters) => ['users', 'list', filters],
  byId: (id) => ['users', id],
},
```

---

## Cache Policy Matrix

| Query | staleTime | gcTime | refetchInterval | refetchOnWindowFocus | Notes |
|-------|-----------|--------|-----------------|---------------------|-------|
| Branches list | 5min | 30min | ❌ | ✅ | Rarely changes |
| Active branches | 5min | 30min | ❌ | ✅ | Same |
| Products list | 30s | 5min | ❌ | ✅ | keepPreviousData |
| Product by ID | 15s | 5min | ❌ | ✅ | enabled: !!id |
| Deleted products | 60s | 5min | ❌ | ✅ | Lazy |
| Product categories | 5min | 10min | ❌ | ✅ | Static data |
| Dashboard overview | 20s | 5min | 30s | ✅ | Staggered |
| Dashboard activity | 15s | 5min | 45s | ✅ | Staggered |
| Closure status | 60s | 5min | ❌ | ✅ | Non-manager only |
| Production entries | 10s | 5min | ❌ | ✅ | Operational |
| Remaining entries | 10s | 5min | ❌ | ✅ | enabled: branch+date |
| Daily report | 30s | 2min | ❌ | ✅ | Operational |
| Weekly report | 5min | 2min | ❌ | ✅ | Historical |
| Monthly report | 10min | 2min | ❌ | ✅ | Historical |
| Yearly report | 60min | 2min | ❌ | ✅ | Historical |
| Users list | 30s | 5min | ❌ | ✅ | Security-sensitive |

---

## Operational Safety Checklist

### ✅ No optimistic updates for quantities
All 16 mutation hooks verified — zero use `onMutate` for optimistic updates.  
All mutations invalidate on `onSuccess` only (confirmed server state).

### ✅ No auto-retry for mutations
Global `mutations.retry: 0`. Every mutation fails immediately on API error.

### ✅ Branch isolation
All operational query keys include `branchId` at a fixed position (index 2).  
Invalidation predicates check `key[2] === branchId || key[2] === 'all'`.

### ✅ No polling spikes — staggered intervals
Dashboard overview: 30s, Dashboard activity: 45s. Production/Remaining: no polling.

### ✅ No inline query keys
All 26 hooks use `queryKeys.*` registry functions. Zero inline array literals.

### ✅ Cache cleared on logout
`queryClient.clear()` called in `MainLayout.handleLogout` before navigation.

### ✅ Export does not invalidate caches
`handleExport` in ReportsPage calls `reportService.exportToCSV()` directly — not a mutation — so it never triggers cache invalidation or refetch.

### ✅ Reports use short gcTime
All report queries: `gcTime: 2min` — report payloads are purged from cache quickly.

### ✅ Error recovery via unwrap()
All mutation hooks use `unwrap()` which throws with `{ message, status }` on API failure. Pages catch with try/catch and display error messages.

---

## Issues Fixed During Migration (Chronological)

| # | Phase | Issue | Severity | Fix |
|---|-------|-------|----------|-----|
| 1 | 1 | Race condition in loadBranches (stale closure) | Low | Eliminated by React Query lifecycle |
| 2 | 1 | Manual loading/error state duplication | Low | Replaced with React Query's built-in states |
| 3 | 2 | Products page had stale data on navigation | Medium | keepPreviousData + refetchOnMount |
| 4 | 2 | Soft-delete modal not triggering list refresh | Medium | Invalidated on mutation success |
| 5 | 3 | Dashboard setInterval polled even when hidden | High | Replaced with refetchInterval (visibility-aware) |
| 6 | 3 | Two separate dashboard timers could sync | Medium | Staggered at 30s and 45s |
| 7 | 4 | Dashboard not invalidated after production | **Critical** | Added invalidateDashboardScope() |
| 8 | 4 | CloseDay mutation invalidated nothing | **Critical** | Fixed to prefix match ['dashboard', 'overview'] |
| 9 | 4 | Dashboard refresh used inline keys | Medium | Replaced with queryKeys registry |
| 10 | 4 | useBranchesQuery ignored filters in key | Medium | Conditionally includes filters |
| 11 | 5 | No cache clearing on logout | Medium | Added queryClient.clear() to handleLogout |
| 12 | 5 | Reports had no dedicated caching policy | Medium | Added explicit gcTime/staleTime per report type |

---

## Future WebSocket Integration Notes

When adding real-time updates via WebSocket (e.g., for live dashboard updates or multi-user sync):

1. **Use `queryClient.setQueryData()` for targeted updates** — push new data into existing cache entries without triggering full refetches.

2. **Never invalidate from WebSocket handlers** — `invalidateQueries` triggers refetches that compete with WebSocket data. Instead, update cache directly and mark as fresh.

3. **WebSocket events for production flows**:
   ```
   production.created → queryClient.setQueryData(queryKeys.inventory.production.grouped(branchId), updater)
   production.updated → same pattern
   remaining.saved → queryClient.setQueryData(queryKeys.inventory.remaining.entries(branchId, date), updater)
   ```

4. **Connection lifecycle**:
   - On reconnect, `refetchOnReconnect: true` handles stale queries automatically
   - Add a `visibilitychange` listener that re-establishes WebSocket when tab becomes visible

5. **Avoid over-fetching**: If WebSocket already pushed the data, React Query's staleTime prevents unnecessary GET requests.

---

## Rollback Documentation

### Rollback Strategy
1. **Per-phase rollback**: Each migration phase is independent — if Phase 5 has issues, revert only reports/features/reports and reports/features/users directories plus the two page files.
2. **Revert commits by phase**, not all at once.

### Files to Revert for Full Rollback
If full rollback to pre-RQ state is needed:

1. **Providers**: `src/providers/QueryProvider.jsx` → remove provider; remove from `App.jsx`
2. **Infrastructure**: Delete `src/utils/queryKeys.js`, `src/utils/safeQuery.js`, `src/utils/invalidation.js`, `src/utils/rqLogger.js`
3. **Features directory**: Delete entire `src/features/` directory
4. **Pages**: Restore from git history:
   ```bash
   git checkout HEAD~1 -- src/pages/branches/BranchesPage.jsx
   git checkout HEAD~1 -- src/pages/products/ProductsPage.jsx
   git checkout HEAD~1 -- src/pages/dashboard/DashboardPage.jsx
   git checkout HEAD~1 -- src/pages/production/ProductionPage.jsx
   git checkout HEAD~1 -- src/pages/remaining/RemainingPage.jsx
   git checkout HEAD~1 -- src/pages/reports/ReportsPage.jsx
   git checkout HEAD~1 -- src/pages/users/UsersPage.jsx
   ```
5. **Dependencies**: `npm uninstall @tanstack/react-query @tanstack/react-query-devtools`
6. **Hooks**: Restore `src/hooks/useBranches.js` and `src/hooks/useProducts.js` from git history

### No backend changes needed for rollback
All React Query code is frontend-only. The backend API is unchanged. Rollback is safe and has zero server-side impact.

## Bundle Impact

| Metric | Before Migration | After Migration | Delta |
|--------|-----------------|-----------------|-------|
| JS bundle | ~490 KB | 551 KB | +61 KB |
| CSS bundle | 27.42 KB | 27.42 KB | 0 |
| npm deps added | 0 | 2 | @tanstack/react-query + devtools |

The 61 KB increase includes React Query runtime (~12 KB gzipped) + all 30 hook files + infrastructure. No external dependencies like Zustand, Redux, or SWR were needed.

---

## Remaining Module Ownership Model

### Decision: Collaborative Branch Draft (Option A)

The Remaining module uses a **shared collaborative draft** model, not user-owned drafts.

**Evidence:**
- `@@unique([branchId, operationalDate, productId])` — one row per product/date/branch regardless of user
- `buildRemainingAccessFilter` filters by **category** (not `createdBy`) for non-admin roles
- `createBulk` finds records by `branchId + operationalDate + productId` without user filter
- `findByOperationalDate` returns all records for the branch/date visible to the user's role

**Implications:**
- All users with overlapping category access see the same draft row
- The last save overwrites previous data (no per-user isolation)
- `createdBy` reflects the original creator only — not the current "owner"
- Frontend `existingRemainings` state includes all visible records regardless of creator

**Why not Option B (User-Owned Drafts):**
- Would require schema migration: remove `@@unique([branchId, operationalDate, productId])`, add `createdBy` to unique constraint
- Would require access filter changes: filter `findByOperationalDate` by `createdBy`
- Would require `createBulk` changes: scope `findFirst` to own records
- Would break manager workflow: managers need to see/finalize all branch records
- Not feasible without multi-month coordinated schema + service + frontend changes

**The recent fixes enforce consistency with Option A:**
- `handleFinalize` now filters inactive products from payload (frontend guard)
- Business-validation throws include `.status` (proper 4xx codes)
- Error handler returns real error messages (no more opaque 500s)
- Defensive logging around `createBulk` failures

---

## Phase C — Governance Rules

### Rule D1 — Stable Query Defaults

Destructuring defaults for server-state data MUST NOT create new object/array references per render. The `= []` and `|| []` patterns produce a new reference on every render, which causes `useEffect` to re-run and can trigger render loops when combined with `setState`.

**Forbidden:**
```js
const { data: items = [] } = useQuery(...)       // new [] every render
const items = data || []                           // new [] every render
const items = data?.items || []                    // new [] every render
```

**Allowed:**
```js
// Option A — stable module-level constant
const EMPTY = Object.freeze([]);
const items = data ?? EMPTY;

// Option B — handle undefined explicitly at consumption point
const { data } = useQuery(...);
// In useEffect: if (!data) return;

// Option C — queryFn returns empty array (already stable from cache)
// queryFn: () => result.data || []    ← safe if result.data is a real array
```

**Rationale:** The `RemainingPage.jsx:48` render-loop was caused by `data: remainingsData = []` combined with `useEffect` + `setExistingRemainings`. Under normal conditions the loop only ran 1-3 iterations (during loading). Under 429 error conditions where `data` remained `undefined` permanently, the loop persisted until React threw `Maximum update depth exceeded` at ~50 iterations. The guard `if (!data) return;` breaks the loop at the source.

**Enforcement:** Code review. ESLint rule recommended (`@opencode/no-unstable-query-default`).

---

### Retry Ownership Charter

Retry logic is split across two layers. Each layer has a distinct concern. 429 MUST NOT be retried by either layer.

| Layer | Owns | Format | Why |
|-------|------|--------|-----|
| **Axios interceptor** (api.js) | Transport/infrastructure retry | `retryableStatuses` array, linear backoff | Network errors have no application context. Axios handles DNS/timeout/connection failures before the application sees them. After the Phase A fix, `retryableStatuses = [408, 502, 503, 504]` — only server-infrastructure codes. |
| **React Query** (QueryProvider.jsx) | Application/server retry | `retry` callback, exponential backoff | Status codes have business meaning (500 = server error, 503 = unavailable). React Query provides per-query retry config, jitter, and cache integration. After Phase A fix, `retry` callback excludes 429 at the global level. Per-query overrides are allowed for special cases. |
| **429 Rate Limit** | **NEITHER** | `retry: (fc, error) => error?.response?.status !== 429` | Rate limits signal backpressure. Retrying amplifies the problem. The ONLY acceptable response is to surface the error to the user and let them retry manually, or implement a single retry with explicit `Retry-After` header delay as a future enhancement. |

**Architectural rationale for removal of 429 from both layers:**

Pre-Phase A, request amplification for a single query under rate-limit conditions was:
```
(1 axios initial + 2 axios retries) × (1 RQ initial + 2 RQ retries) = 9 HTTP requests
```
For three parallel queries on RemainingPage: 27 requests. This caused:
- Self-sustaining rate-limit lockout (requests keep the limiter hot)
- Exhaustion of the shared 100/15min global budget in seconds
- Background retries continuing after component unmount (post "Maximum update depth exceeded")

Post-Phase A, a rate-limited query produces exactly 1 HTTP request before settling in error state. The `ApiErrorState` component displays the error with a manual "Retry" button.

**Future enhancement (optional):** Implement a single `Retry-After`-aware retry in React Query using `retryDelay`:
```js
retry: (failureCount, error) => {
  if (error?.response?.status === 429 && failureCount < 1) return true;
  return false;
},
retryDelay: (attemptIndex, error) => {
  const retryAfter = error?.response?.headers['retry-after'];
  return (retryAfter ? parseInt(retryAfter) * 1000 : 5000);
},
```
This is deferred until traffic monitor data justifies the complexity.

---

### Traffic Monitor — Data Collection for Phase C Route Budgets

The `trafficMonitor.middleware.js` logs per-route request counts every 60 seconds. Use this output to design per-route rate limit budgets. Key questions answered by telemetry:

- What is the peak req/min for dashboard vs production vs remaining?
- Do operational workflows (end-of-day finalize) produce bursts?
- How does traffic scale with concurrent users?
- What is the actual headroom between peak traffic and the 250/15min global limit?

**Recommended route budget thresholds (starting estimates — tune from telemetry):**

| Route | Estimated Budget | Rationale |
|-------|-----------------|-----------|
| `/api/dashboard/*` | 60 req/15min | ~51 idle baseline + headroom |
| `/api/remainings/*` | 30 req/15min | Load + save + finalize |
| `/api/productions/*` | 30 req/15min | Load + create + update |
| `/api/products/*` | 20 req/15min | List + CRUD |
| `/api/branches/*` | 20 req/15min | List + CRUD |
| `/api/reports/*` | 15 req/15min | View + generate |
| `/api/users/*` | 10 req/15min | Admin operations |
| `/api/auth/*` | 10 req/15min | Login + refresh (login has own 5/15min limiter) |

Total estimated: 195/15min — within the raised 250 global limit.

**Monitoring period recommendation:** Collect at least 1 week of traffic data under multi-user load before implementing route budgets. Budgets should be set to P95 peak + 50% headroom.
