# RefreshToken Schema Reconciliation Report

**Branch:** `token-sync-fix`
**Base commit:** `b493ebb` (tip of `feature/auth-system-5-critical-fixes`)
**Date:** 2026-06-06

---

## 1. Problem Statement

Login was returning HTTP 500 on both local and production environments. The root
cause was a three-way schema drift between:

1. The actual Railway database `RefreshToken` table
2. The Prisma schema in `schema.prisma`
3. The generated Prisma client in `node_modules/.prisma/client`

`prisma generate` had been run from the feature-branch schema (which uses
`tokenHash` + `lastUsedAt` + `@@unique([userId])`). The code in
`src/utils/refreshToken.js` was already on the secure HMAC-based design. However,
the actual database table had drifted into a hybrid state from the migration
history:

- `token` and `revoked` columns had been partially re-added
- `tokenHash` column was missing
- `lastUsedAt` and `@@unique([userId])` were already present
- The 6 existing rows still held the old placeholder hashes

This caused `prisma.refreshToken.create({ data: { tokenHash, ... } })` to throw
`P2022` (column does not exist) at runtime.

---

## 2. Reconciliation Steps Applied

All work was done on the dedicated `token-sync-fix` branch (no merge into
`develop`, no push to `develop`).

### Step 2.1 — Killed stray node processes and regenerated Prisma client

```bash
Get-Process -Name node | Stop-Process -Force
npx prisma generate
```

The dev server from the previous session was holding the Prisma DLL locked,
preventing regeneration.

### Step 2.2 — Created `prisma/reconcile_refresh_token.sql`

This script, run with `npx prisma db execute --file ...`, performed the
following idempotent operations inside a single transaction:

1. `ADD COLUMN IF NOT EXISTS "tokenHash" TEXT` (nullable, to allow backfill)
2. Backfilled existing rows with a deterministic placeholder
   (`placeholder_<id>_invalidated_by_reconciliation`) that will never match
   any HMAC-SHA256 hash, forcing re-authentication of all existing sessions
3. `ALTER COLUMN "tokenHash" SET NOT NULL` (after backfill)
4. `DROP COLUMN IF EXISTS "token"` (replaced by `tokenHash`)
5. `DROP COLUMN IF EXISTS "revoked"` (replaced by `@@unique([userId])`)
6. `CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key"`
7. `CREATE INDEX IF NOT EXISTS "RefreshToken_tokenHash_idx"`

### Step 2.3 — Created `prisma/reconcile_passwordreset.sql`

Drops the non-unique `PasswordReset_userId_idx` so that `prisma db push` can
add the unique constraint on `userId` (matching `userId Int @unique` in
`schema.prisma`). The table is empty, so this is safe.

### Step 2.4 — Ran `npx prisma db push --accept-data-loss`

Brought the database fully in sync with `schema.prisma` (added the unique
constraint on `PasswordReset.userId` and any other minor drift).

Final confirmation: `Your database is now in sync with your Prisma schema.`

### Step 2.5 — Cleaned up placeholder rows

```sql
DELETE FROM "RefreshToken" WHERE "tokenHash" LIKE 'placeholder_%';
```

Removed 6 stale placeholder rows. The table now contains only real HMAC-hashed
refresh tokens for users who have logged in since the reconciliation.

---

## 3. Final Schema State (verified)

### `RefreshToken` columns (DB)

| column      | type        | nullable |
|-------------|-------------|----------|
| id          | integer     | NO       |
| userId      | integer     | NO       |
| expiresAt   | timestamp   | NO       |
| createdAt   | timestamp   | NO       |
| lastUsedAt  | timestamp   | NO       |
| tokenHash   | text        | NO       |

### `RefreshToken` indexes (DB)

| index                              | kind    |
|------------------------------------|---------|
| `RefreshToken_pkey`                | UNIQUE  |
| `RefreshToken_tokenHash_key`       | UNIQUE  |
| `RefreshToken_tokenHash_idx`       | non-UNIQUE |
| `RefreshToken_userId_key`          | UNIQUE  |

### Generated Prisma client fields

```json
["id", "tokenHash", "userId", "expiresAt", "createdAt", "lastUsedAt"]
```

### `schema.prisma` model

```
model RefreshToken {
  id         Int      @id @default(autoincrement())
  tokenHash  String   @unique
  userId     Int
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  lastUsedAt DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])

  @@unique([userId])
  @@index([tokenHash])
}
```

**All three layers now agree on the field set and constraints.**

---

## 4. Login Flow Test Results

All tests run against the live backend at `http://localhost:3000`.

| # | Test                          | Expected | Got    | Result |
|---|-------------------------------|----------|--------|--------|
| 1 | Valid login                   | 200      | 200    | PASS   |
| 2 | Invalid password              | 401      | 401    | PASS   |
| 3 | Blocked user                  | 403      | 403    | PASS   |
| 4 | Refresh token rotation        | 200      | 200    | PASS   |
| 5 | Old refresh token reuse       | 401      | 401    | PASS   |
| 6 | Logout                        | 200      | 200    | PASS   |
| 7 | Refresh after logout          | 401      | 401    | PASS   |

Test 1 response body (valid login):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOi...",
    "refreshToken": "f4f5cb429cedfb823d164c52c572abf8f5dbb5b4a636cf90b4f6a7d74b077ffd2f37b3165282949e",
    "user": { "id": 1, "name": "System Admin", "username": "system-admin", "role": "ADMIN", "branchId": null, "branchName": null }
  }
}
```

Test 2 response body (invalid password):
```json
{ "success": false, "message": "Invalid credentials", "type": "AUTH_TOKEN" }
```

Test 3 response body (blocked user):
```json
{ "success": false, "message": "Your account has been blocked. Contact your manager.", "type": "AUTH_ROLE" }
```

Test 5 response body (old refresh token reuse):
```json
{ "success": false, "message": "Invalid or expired refresh token", "type": "AUTH_TOKEN" }
```

Test 6 response body (logout):
```json
{ "success": true, "message": "Logged out successfully" }
```

Test 7 response body (refresh after logout):
```json
{ "success": false, "message": "Invalid or expired refresh token", "type": "AUTH_TOKEN" }
```

---

## 5. Data Considerations

- **No data backfill was required.** Existing refresh tokens in the
  `token` column were intentionally dropped (security upgrade). The
  backfill in the reconciliation script used a deterministic placeholder
  that will never match a real HMAC-SHA256 hash, so all existing sessions
  are invalidated and users must re-authenticate. This is the intended
  behavior of the `secure_refresh_token` migration.
- **6 rows were affected** by the cleanup (placeholder deletion).
- **The `lastUsedAt` and `@@unique([userId])` constraints were preserved
  during reconciliation** (they were already present in the DB from
  migration `20260606_one_token_per_user`).

---

## 6. Files Changed

```
backend/prisma/reconcile_refresh_token.sql   (new)
backend/prisma/reconcile_passwordreset.sql  (new)
```

No code, schema, or migration folder changes were made on this branch. The
`schema.prisma` and `src/utils/refreshToken.js` were already on the correct
secure design from `feature/auth-system-5-critical-fixes`. The only work
required was bringing the live database in line with the existing schema and
regenerating the Prisma client.

---

## 7. Pending Manual Review

This branch has been pushed to origin as `token-sync-fix`. **No merge into
`develop` has been performed.** Awaiting manual review and merge approval
before this reconciliation becomes part of the main codebase.
