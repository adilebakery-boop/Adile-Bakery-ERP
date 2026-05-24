# Operational Day Lifecycle — P1 Implementation Plan

## 1. Schema Migration Plan

### New Enum

```prisma
enum ClosureType {
  MANUAL
  AUTO_FINALIZE
}
```

### Migration: Add fields to DailyClosure

```prisma
model DailyClosure {
  // ... existing fields ...
  closureType  ClosureType  @default(MANUAL)
  // closureType distinguishes admin-initiated close from auto-finalize rollover
}
```

### Migration: Add field to RemainingRecord

```prisma
model RemainingRecord {
  // ... existing fields ...
  autoFinalizedAt DateTime?
  // Timestamp when this DRAFT was auto-finalized during rollover.
  // NULL if finalized manually or was always FINAL.
}
```

### SQL Migration Steps

```sql
-- Step 1: Create enum type
CREATE TYPE "ClosureType" AS ENUM ('MANUAL', 'AUTO_FINALIZE');

-- Step 2: Add column to DailyClosure (nullable, backfill existing rows as MANUAL)
ALTER TABLE "DailyClosure" ADD COLUMN "closureType" "ClosureType" NOT NULL DEFAULT 'MANUAL';

-- Step 3: Add column to RemainingRecord
ALTER TABLE "RemainingRecord" ADD COLUMN "autoFinalizedAt" TIMESTAMP(3);
```

### Prisma generate

After schema change: `npx prisma generate`
After SQL applied to DB: `npx prisma db pull` or manual migration script.

### Data Integrity

- Existing DailyClosure rows get `closureType = 'MANUAL'` (default)
- Existing RemainingRecord rows get `autoFinalizedAt = NULL` (no change, these were never auto-finalized)
- No data backfill needed beyond defaults
- Migration is additive only — no column drops, no renames

---

## 2. Transactional Flow Diagram

```
Request for today's data arrives
         │
         ▼
┌─────────────────────┐
│  getAddisAbabaDate() │
│  (backend timezone)  │
└─────────┬───────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│  Detect rollover needed:                 │
│  currentDate > prevDay                   │
│  AND prevDay DRAFT records exist         │
│  AND prevDay is NOT already closed       │
└──────────────────┬───────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
   ┌──────────────┐   ┌──────────────┐
   │ Rollover NOT │   │ Rollover IS  │
   │ needed       │   │ needed       │
   └──────┬───────┘   └──────┬───────┘
          │                  │
          │                  ▼
          │   ┌──────────────────────────────────────┐
          │   │  $transaction BEGIN                  │
          │   │                                      │
          │   │  1. Assert prevDay is NOT closed     │
          │   │     (race guard: manual close wins)  │
          │   │                                      │
          │   │  2. SELECT DRAFT records for         │
          │   │     prevDay (branchId, status=DRAFT) │
          │   │                                      │
          │   │  3. FOR EACH draft:                  │
          │   │     UPDATE status = 'FINAL'          │
          │   │     SET autoFinalizedAt = NOW()      │
          │   │     INSERT AuditLog (AUTO_FINALIZE)  │
          │   │                                      │
          │   │  4. CREATE DailyClosure:             │
          │   │     isClosed = true                  │
          │   │     closureType = 'AUTO_FINALIZE'    │
          │   │     closedAt = NOW()                 │
          │   │     note = 'Auto-finalized: X       │
          │   │            stale DRAFT records'      │
          │   │                                      │
          │   │  5. CREATE DailySnapshot:            │
          │   │     Snapshot items from              │
          │   │     inventoryFlowService             │
          │   │     (includes auto-finalized values  │
          │   │     as remainingStock)                │
          │   │                                      │
          │   │  $transaction COMMIT                 │
          │   └──────────────────────────────────────┘
          │                  │
          ▼                  ▼
   ┌─────────────────────────────────────────┐
   │  Process current day's request normally  │
   │  (getRemainingStock sees prevDay's      │
   │   auto-finalized values as opening)     │
   └─────────────────────────────────────────┘
```

### Key Design Points

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| When to trigger | On first access to previous day's data | No cron job needed. Triggers naturally on the first request of a new day. |
| Where to trigger | `inventoryFlowService.getOpeningStock()` | This is the natural chokepoint — every operational flow needs opening stock. |
| Transaction isolation | `$transaction` with serializable isolation | Prevents duplicate auto-finalize if two requests race. |
| Race with manual close | Inner check `if (closure?.isClosed)` | Same pattern as createBulk's race guard. Manual close wins if it happens first. |
| Multi-day skip | Process oldest → newest sequentially inside the transaction | Each day's auto-finalize uses the previous day's now-FINAL values as opening stock. |
| Audit trail | `action: 'AUTO_FINALIZE'` in AuditLog + `autoFinalizedAt` on record | Full traceability. |

---

## 3. Affected Services List

### Backend (new/modified)

| File | Change | Type |
|------|--------|------|
| `prisma/schema.prisma` | Add `ClosureType` enum, `closureType` on DailyClosure, `autoFinalizedAt` on RemainingRecord | Schema |
| `src/services/inventoryFlowService.js` | Add `resolveRollover(branchId, operationalDate)` called from `getOpeningStock()` | New function |
| `src/services/inventoryFlowService.js` | Modify `getOpeningStock()` to call `resolveRollover()` before computing opening stock | Modify |
| `src/services/remainingService.js` | Export/getDraftRemainings used by resolveRollover | Unchanged (already exported) |
| `src/services/closureService.js` | `closeDay()` and `reopenDay()` must handle `closureType` field | Modify |
| `src/services/closureService.js` | New function `autoFinalizeDay()` for the transactional rollover | New function |
| `src/services/auditService.js` | No change (already generic) | Unchanged |

### Backend (unchanged — benefit from rollover automatically)

| Service | Why no change needed |
|---------|---------------------|
| `dashboardService.js` | Queries FINAL records — auto-finalized records are FINAL |
| `reportService.js` | Queries by operationalDate w/ FINAL filter — works automatically |
| `remainingService.js` | createBulk, findByOperationalDate — operate on current day, rollover is transparent |
| `productionService.js` | No remaining record dependency |
| `wasteService.js` | No remaining record dependency |

### Frontend

| File | Change | Type |
|------|--------|------|
| No changes needed | Auto-finalize is backend-only. Frontend just sees resolved data. | None |

### Key Implementation Details

**`resolveRollover(branchId, currentDate)` function:**

```js
async function resolveRollover(branchId, currentDate) {
  const prevDay = getPreviousDay(new Date(currentDate));
  
  // Check if rollover already happened (closure exists for prevDay)
  const prevClosure = await prisma.dailyClosure.findUnique({
    where: { branchId_operationalDate: { branchId, operationalDate: prevDay } },
  });
  
  if (prevClosure?.isClosed) return; // Already closed (manual or auto) — skip
  
  // Check for DRAFT records on prev day
  const drafts = await prisma.remainingRecord.count({
    where: { branchId, operationalDate: prevDay, status: 'DRAFT' },
  });
  
  if (drafts === 0) return; // No stale drafts — skip
  
  // Execute rollover in transaction
  await prisma.$transaction(async (tx) => {
    // Race guard: re-check closure inside transaction
    const closure = await tx.dailyClosure.findUnique({
      where: { branchId_operationalDate: { branchId, operationalDate: prevDay } },
    });
    if (closure?.isClosed) return;
    
    // Auto-finalize all DRAFT records
    const draftRecords = await tx.remainingRecord.findMany({
      where: { branchId, operationalDate: prevDay, status: 'DRAFT' },
    });
    
    for (const draft of draftRecords) {
      await tx.remainingRecord.update({
        where: { id: draft.id },
        data: { status: 'FINAL', autoFinalizedAt: new Date() },
      });
    }
    
    // Create DailyClosure + Snapshot (same pattern as closureService.closeDay)
    // ... (reuse inventory flow snapshot logic)
  });
}
```

---

## 4. Rollback Strategy

### Before Deployment

| Step | Action | Command |
|------|--------|---------|
| 1 | Backup database | `pg_dump ... > pre_rollover_backup.sql` |
| 2 | Tag current schema | `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema_snapshot.sql` |
| 3 | Deploy code | Standard deploy process |

### Rollback Scenarios

| Scenario | Rollback Action | Data Loss | Complexity |
|----------|----------------|-----------|------------|
| **Schema migration fails** | Don't apply. Fix migration, re-deploy. | None | Low |
| **Auto-finalize fires incorrectly** | Reopen the affected day via existing reopen API. Auto-finalized records remain FINAL (no reversal). | Metadata loss only (`closureType`, `autoFinalizedAt`) | Low |
| **Auto-finalize causes incorrect opening stock** | Manual reopen + correct remaining values + re-close. See recovery doc. | None if caught same day | Medium |
| **Complete rollback needed** | 1. Roll back code to previous deploy. 2. SQL: `ALTER TABLE "DailyClosure" DROP COLUMN "closureType"; ALTER TABLE "RemainingRecord" DROP COLUMN "autoFinalizedAt"; DROP TYPE "ClosureType";` | All auto-finalized records revert to being unmarked (status stays FINAL — they are not reversed to DRAFT) | Low |

### Data Safety Guarantees

| Property | Guarantee |
|----------|-----------|
| No data deletion | Migration is additive only (new columns, no drops) |
| No DRAFT → FINAL reversal needed on rollback | Auto-finalized records stay FINAL. Reopening a day reverts `isClosed=false` but does NOT revert record status. Users can re-enter values if needed. |
| Idempotent migration | `CREATE TYPE IF NOT EXISTS`, column defaults handle re-runs |

---

## 5. Edge-Case Validation List

### Happy Path

| # | Scenario | Expected | Validation |
|---|----------|----------|------------|
| 1 | Single day with DRAFT → next day request triggers auto-finalize | DRAFT → FINAL, DailyClosure created, snapshot taken | Check DB: RemainingRecord.status, DailyClosure.isClosed, AuditLog |
| 2 | Single day with FINAL only (no DRAFT) | No auto-finalize, no closure created | Check: prevDay remains open, no AuditLog entry |
| 3 | Single day no records at all | No auto-finalize | Check: prevDay unchanged |

### Time Boundary

| # | Scenario | Expected | Validation |
|---|----------|----------|------------|
| 4 | Request 1 minute after midnight Addis Ababa time | Correct previous day identified | Use `getAddisAbabaDate()` — prevDay is yesterday |
| 5 | Request at 11:59 PM Addis Ababa time | Same day — no rollover | Current date == prevDay check prevents rollover |
| 6 | Cross-timezone browser (e.g., UTC-5 user) | Backend uses Addis Ababa timezone consistently | `getOpeningStock()` always calls `getAddisAbabaDate()` not `new Date()` |

### Multi-Day Gaps

| # | Scenario | Expected | Validation |
|---|----------|----------|------------|
| 7 | 3-day weekend with no logins (Fri, Sat, Sun DRAFT) | Mon morning processes Fri→Sat→Sun sequentially | Check: all 3 prevDays have DailyClosure, AuditLog shows sequential processing |
| 8 | Same as above but Fri has FINAL, Sat has DRAFT, Sun has FINAL | Only Sat auto-finalizes. Fri and Sun already resolved. | Check: Fri closure not created (if already closed), Sat auto-finalized, Sun not closed |
| 9 | Same as above but no records at all for Sat | No auto-finalize needed. Skip. | Check: empty day skipped |

### Race Conditions

| # | Scenario | Expected | Validation |
|---|----------|----------|------------|
| 10 | Auto-finalize and manual close fire simultaneously | One wins (transaction serialization). Other rolls back. | Check: exactly one DailyClosure exists for prevDay |
| 11 | Two concurrent requests both trigger rollover | First completes, second sees closure already exists and skips | Check: idempotent — single AuditLog entry |
| 12 | User saves remaining DRAFT while auto-finalize is running | Transaction isolation prevents conflict. Save either completes before rollover (and gets auto-finalized) or after (new day, different date). | Check: no lost updates |

### Data Integrity

| # | Scenario | Expected | Validation |
|---|----------|----------|------------|
| 13 | Auto-finalized record with quantity=0 | Finalized as 0. Opening stock = 0. | Check: value preserved |
| 14 | Auto-finalized record with quantity=null | Finalized with last stored value (which is null → 0) | Check: Prisma Decimal handles this |
| 15 | Partially filled day (some products FINAL, some DRAFT) | Only DRAFT records auto-finalized. FINAL records untouched. | Check: mixed status preserved correctly |
| 16 | Day already manually closed | Skip — no auto-finalize | Check: closure exists, isClosed=true |
| 17 | Day already auto-finalized (re-request) | Skip — idempotent | Check: second request doesn't duplicate |

### Dashboard & UI

| # | Scenario | Expected | Validation |
|---|----------|----------|------------|
| 18 | Auto-finalized day → dashboard pending count | Previous day's pending drafts gone (all FINAL now) | Check: dashboard shows 0 pending for prevDay |
| 19 | Auto-finalized day → opening stock today | Uses auto-finalized values as opening stock | Check: inventory flow shows correct carry-over |
| 20 | Auto-finalized closure appears in reports | Appears with `closureType = 'AUTO_FINALIZE'` | Check: report filters distinguish MANUAL vs AUTO_FINALIZE |

### Recovery

| # | Scenario | Expected | Validation |
|---|----------|----------|------------|
| 21 | Admin reopens auto-finalized day | Standard reopen: isClosed=false, snapshot invalidated. autoFinalizedAt stays (historical). | Check: reopen works, records editable |
| 22 | Admin manually closes day that was auto-finalized | Manual close overwrites: closureType becomes 'MANUAL', new snapshot. | Check: closureType updated, new snapshot |
| 23 | Rollback of auto-finalize (see section 4) | Status stays FINAL, columns dropped. No functional impact on remaining operations. | Check: queries still work without extra columns |

### Operational Day Boundary Enforcement

| # | Scenario | Expected | Validation |
|---|----------|----------|------------|
| 24 | Can there be multiple unresolved days per branch? | No — `resolveRollover` processes ALL unresolved days oldest-first before returning. After it completes, only the current day is open. | Check: after rollover, only current day has isClosed=false |
| 25 | What prevents writing to a day that was auto-finalized? | `assertDayOpen()` checks DailyClosure — auto-finalized day has closure → rejects writes with 403 | Check: write to auto-finalized day returns 403 |

---

## Implementation Order (P1)

```
Step 1: Schema migration
  ├── Add ClosureType enum
  ├── Add closureType to DailyClosure
  └── Add autoFinalizedAt to RemainingRecord

Step 2: inventoryFlowService.resolveRollover()
  ├── Transactional rollover logic
  ├── Race guard against manual close
  └── Multi-day sequential processing

Step 3: inventoryFlowService.getOpeningStock()
  └── Call resolveRollover() before computing opening stock

Step 4: closureService updates
  ├── closeDay() sets closureType = 'MANUAL'
  └── autoFinalizeDay() sets closureType = 'AUTO_FINALIZE'
      (or resolveRollover() handles it directly)

Step 5: Audit trail
  └── AUTO_FINALIZE action in AuditLog entries

Step 6: Test all 25 edge cases from section 5
```

## P2 — Timezone Consistency (separate phase)

The frontend `getOperationalDate()` currently uses browser local time at `authUtils.js:31-38`. It should use `Africa/Addis_Ababa` via the backend's existing timezone helpers.

However, this change must be coordinated carefully because it affects ALL date-sensitive operations. The backend already uses `Africa/Addis_Ababa` in `dateUtils.js:4`. The inconsistency only matters if a browser is in a different timezone than Addis Ababa.

**Deferred to P2 because:**
- No user has reported timezone-related bugs (operational context is Addis Ababa)
- Changing the frontend date function affects every page, not just remaining/dashboard
- The backend already normalizes dates via `new Date(dateString)` which consistently treats YYYY-MM-DD as midnight UTC

**When implemented:**
- Options: Use `Intl.DateTimeFormat` with `timeZone: 'Africa/Addis_Ababa'` in the frontend, or derive operational date from a backend API endpoint
- Must test all pages: dashboard, remaining, production, reports, closure
