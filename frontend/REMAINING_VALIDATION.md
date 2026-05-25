# Remaining Module — Operational Validation Checklist

## Before Testing
- [ ] Backend server running (`npm run dev` in backend root)
- [ ] Frontend dev server running (`npm run dev` in frontend/)
- [ ] Two user accounts exist (User A, User B) with MANAGER role access
- [ ] At least one product active, one product available to deactivate mid-test
- [ ] Backend console visible for log inspection

---

## Scenario 1: Collaborative Draft Workflow

**Goal:** Verify shared drafts work correctly between two users.

| Step | Action | Expected Result | Actual |
|------|--------|----------------|--------|
| 1.1 | User A navigates to Remaining page for Branch X / Date Y | Page loads with product cards, all empty | |
| 1.2 | User A enters quantity 10 for Product P1, clicks **Save** | Success toast "Remaining saved successfully!" | |
| 1.3 | User B navigates to same Remaining page (Branch X / Date Y) | User B sees Product P1 with quantity 10, status DRAFT | |
| 1.4 | User B changes Product P1 quantity to 15, clicks **Save** | Success toast | |
| 1.5 | User A (still on page) clicks **Refresh** button | Product P1 now shows quantity 15 (User B's value) | |
| 1.6 | User A clicks **Finalize All** | Success toast "All remainings finalized!" | |
| 1.7 | User B clicks **Refresh** | Product P1 shows quantity 15, status FINAL | |

**Backend log check:**
```
[REMAINING:BULK] start { userId: <A>, branchId: X, operationalDate: Y, itemCount: 1 }
[REMAINING:BULK] success { userId: <A>, branchId: X, operationalDate: Y, recordCount: 1 }
```

---

## Scenario 2: Inactive-Product Finalize

**Goal:** Verify finalize skips deactivated products with user-facing message.

| Step | Action | Expected Result | Actual |
|------|--------|----------------|--------|
| 2.1 | User A creates DRAFT for Product P1 (quantity 10) | Draft saved successfully | |
| 2.2 | Admin deactivates Product P1 (via Products page) | Product P1 disappears from remaining product cards | |
| 2.3 | User A (without refreshing) clicks **Finalize All** | Success toast: "All remainings finalized! (1 inactive product(s) skipped)" | |
| 2.4 | User A clicks **Refresh** | Product P1 no longer appears (no active product card) | |
| 2.5 | Verify backend log: `[REMAINING:BULK] success` with recordCount=0 (or only active products) | No error logged | |

**Alternative:**
| Step | Action | Expected Result |
|------|--------|----------------|
| 2.6 | If ONLY inactive product has quantities, click **Finalize All** | Error toast: "All records are for products that are no longer active. Cannot finalize." |

**Error path test (defense in depth):**
| Step | Action | Expected Result |
|------|--------|----------------|
| 2.7 | Send POST /remainings/bulk with inactive productId directly (via curl/Postman) | 400 response: `{"success":false,"message":"Cannot save remaining for inactive product: <id>"}` |
| 2.8 | Skip frontend filtering, send inactive product in finalize payload | Frontend shows: "Cannot save remaining for inactive product: <id>" (not "Internal server error") |

---

## Scenario 3: Race Protection — Day Close During Finalize

**Goal:** Verify transaction day-close re-check prevents writes after closure.

| Step | Action | Expected Result | Actual |
|------|--------|----------------|--------|
| 3.1 | User A has unsaved DRAFT on Remaining page | Page shows unsaved changes | |
| 3.2 | Admin closes the day for Branch X / Date Y (from Dashboard) | Day closed successfully | |
| 3.3 | User A clicks **Save** (without refreshing) | Error toast: "Operational day is closed. Reopen required to make changes." | |
| 3.4 | User A clicks **Finalize All** | Same error toast | |

**Backend log check:**
```
[REMAINING:BULK] error { ..., message: "Operational day is closed. Reopen required to make changes.", status: 403 }
```

**Concurrent close test:**
| Step | Action | Expected Result |
|------|--------|----------------|
| 3.5 | User A has DRAFT, clicks **Finalize All** | |
| 3.6 | Simultaneously, admin closes the day for same branch/date | |
| 3.7 | Either finalize succeeds OR close succeeds, but NOT both writing to same operational day | Transaction isolation prevents partial state |
| 3.8 | Verify DB state: remaining records should all be DRAFT (if close won) or FINAL (if finalize won), never mixed | |

---

## Scenario 4: Frontend UX — Error States

**Goal:** Verify UI is never stuck in loading state on failure.

| Step | Action | Expected Result | Actual |
|------|--------|----------------|--------|
| 4.1 | Trigger 400 error (e.g., send malformed payload via network tab modification) | Finalize button re-enables, error message shown | |
| 4.2 | Trigger 403 error (e.g., close day, then finalize) | Button re-enables, error message: "Operational day is closed..." | |
| 4.3 | Trigger 404 error (e.g., product deleted between render and finalize) | Button re-enables, error message: "Product <id> not found" | |
| 4.4 | Trigger network error (disconnect WiFi during finalize) | Button re-enables, error: "Network error. Please check your connection." | |
| 4.5 | Trigger 500 error (e.g., DB connection loss) | Button re-enables, error: "An unexpected error occurred" | |

**For each:**
- [ ] `isSaving` is `false` after error (button not disabled)
- [ ] Error banner renders with correct message
- [ ] User can retry finalize after fixing the issue

---

## Scenario 5: Concurrent Draft Save

**Goal:** Verify two simultaneous saves don't corrupt data.

| Step | Action | Expected Result | Actual |
|------|--------|----------------|--------|
| 5.1 | User A and User B open the same Remaining page simultaneously | Both see same initial state | |
| 5.2 | User A enters quantity 10 for Product P1, clicks **Save** | Success | |
| 5.3 | User B enters quantity 20 for Product P1, clicks **Save** immediately after (within 1s) | Success (last write wins — expected in collaborative mode) | |
| 5.4 | Both users click **Refresh** | Both see quantity = User B's value (20) | |

**Backend log check:**
```
[REMAINING:BULK] start { userId: <A>, itemCount: 1 }
[REMAINING:BULK] start { userId: <B>, itemCount: 1 }
[REMAINING:BULK] success { userId: <A>, recordCount: 1 }
[REMAINING:BULK] success { userId: <B>, recordCount: 1 }
```

**No P2002 unique constraint violations should appear.** Each bulk call is a transaction — the second one's `findFirst` finds the row created/updated by the first and calls UPDATE instead of CREATE.

---

## Environment Setup Notes

- **Backend logs** are written to stdout via `console.log`/`console.error` with `[REMAINING:BULK]` prefix
- **Error handler** logs all errors with path, method, message, and stack trace
- **JWT expiry**: Default is typically 1h. For testing, reduce to 5min in auth config to verify logout behavior
- **For race testing (Scenario 3.5-3.8)**: Use two browser windows or curl scripts to send simultaneous requests

---

## Post-Validation

- [ ] All 5 scenarios pass
- [ ] No P2002, P2025, or unexpected errors in backend logs
- [ ] Frontend never stuck in loading state
- [ ] Inactive-product skip messages render in user's language
- [ ] Collaborative draft behavior is predictable (last-write-wins)
- [ ] Decision on schema changes deferred until evidence collected
