-- 1. Create Enums & Employee Table
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED');

CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "primaryRoleId" INTEGER,
    "primaryBranchId" INTEGER,
    "hireDate" DATE,
    "separationDate" DATE,
    "separationReason" TEXT,
    "userAccountCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");
CREATE INDEX "Employee_status_idx" ON "Employee"("status");
CREATE INDEX "Employee_primaryBranchId_idx" ON "Employee"("primaryBranchId");
CREATE INDEX "Employee_primaryRoleId_idx" ON "Employee"("primaryRoleId");

-- 2. Backfill Employee Records from Existing Users (Employee.id = User.id)
INSERT INTO "Employee" (
    "id",
    "employeeCode",
    "name",
    "email",
    "status",
    "primaryRoleId",
    "primaryBranchId",
    "userAccountCreatedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    u."id",
    'EMP-' || LPAD(u."id"::TEXT, 4, '0'),
    u."name",
    u."email",
    CASE WHEN u."isActive" = true THEN 'ACTIVE'::"EmployeeStatus" ELSE 'INACTIVE'::"EmployeeStatus" END,
    u."roleId",
    u."branchId",
    u."createdAt",
    u."createdAt",
    CURRENT_TIMESTAMP
FROM "User" u;

-- 3. Synchronize Sequence for Employee Table
SELECT setval('Employee_id_seq', COALESCE((SELECT MAX(id) FROM "Employee"), 1));

-- 4. Establish User -> Employee Relationship
ALTER TABLE "User" ADD COLUMN "employeeId" INTEGER;
UPDATE "User" SET "employeeId" = "id";
ALTER TABLE "User" ALTER COLUMN "employeeId" SET NOT NULL;
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Create EmployeeRoleHistory Table & Initial Backfill
CREATE TABLE "EmployeeRoleHistory" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "startDate" DATE NOT NULL DEFAULT CURRENT_DATE,
    "endDate" DATE,

    CONSTRAINT "EmployeeRoleHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeRoleHistory_employeeId_startDate_idx" ON "EmployeeRoleHistory"("employeeId", "startDate");

ALTER TABLE "EmployeeRoleHistory" ADD CONSTRAINT "EmployeeRoleHistory_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeRoleHistory" ADD CONSTRAINT "EmployeeRoleHistory_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "EmployeeRoleHistory" ("employeeId", "roleId", "startDate")
SELECT "id", "roleId", "createdAt"::DATE FROM "User";

-- 6. Add Foreign Keys from Employee to Role and Branch
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_primaryRoleId_fkey"
    FOREIGN KEY ("primaryRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_primaryBranchId_fkey"
    FOREIGN KEY ("primaryBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Re-point Historical FK Constraints to Employee (Preserving Existing Column Names)

-- ProductionRecord
ALTER TABLE "ProductionRecord" DROP CONSTRAINT IF EXISTS "ProductionRecord_createdBy_fkey";
ALTER TABLE "ProductionRecord" DROP CONSTRAINT IF EXISTS "ProductionRecord_updatedBy_fkey";
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RemainingRecord
ALTER TABLE "RemainingRecord" DROP CONSTRAINT IF EXISTS "RemainingRecord_createdBy_fkey";
ALTER TABLE "RemainingRecord" DROP CONSTRAINT IF EXISTS "RemainingRecord_updatedBy_fkey";
ALTER TABLE "RemainingRecord" ADD CONSTRAINT "RemainingRecord_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemainingRecord" ADD CONSTRAINT "RemainingRecord_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- WasteRecord
ALTER TABLE "WasteRecord" DROP CONSTRAINT IF EXISTS "WasteRecord_createdBy_fkey";
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProductTransfer (Explicitly Add Missing DB FK)
ALTER TABLE "ProductTransfer" DROP CONSTRAINT IF EXISTS "ProductTransfer_createdBy_fkey";
ALTER TABLE "ProductTransfer" ADD CONSTRAINT "ProductTransfer_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DailyClosure
ALTER TABLE "DailyClosure" DROP CONSTRAINT IF EXISTS "DailyClosure_closedBy_fkey";
ALTER TABLE "DailyClosure" ADD CONSTRAINT "DailyClosure_closedBy_fkey"
    FOREIGN KEY ("closedBy") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DailySnapshot
ALTER TABLE "DailySnapshot" DROP CONSTRAINT IF EXISTS "DailySnapshot_closedBy_fkey";
ALTER TABLE "DailySnapshot" DROP CONSTRAINT IF EXISTS "DailySnapshot_invalidatedBy_fkey";
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_closedBy_fkey"
    FOREIGN KEY ("closedBy") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_invalidatedBy_fkey"
    FOREIGN KEY ("invalidatedBy") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ReopenLog
ALTER TABLE "ReopenLog" DROP CONSTRAINT IF EXISTS "ReopenLog_reopenedBy_fkey";
ALTER TABLE "ReopenLog" ADD CONSTRAINT "ReopenLog_reopenedBy_fkey"
    FOREIGN KEY ("reopenedBy") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Remediate AuditLog (Option A: Real Rename, Nullable FK, Actor Snapshot)
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" RENAME COLUMN "userId" TO "employeeId";
ALTER TABLE "AuditLog" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN "actorName" TEXT NOT NULL DEFAULT 'System';

-- Backfill actorName from Employee for existing audit entries
UPDATE "AuditLog" a
SET "actorName" = e."name"
FROM "Employee" e
WHERE a."employeeId" = e."id";

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AuditLog_employeeId_idx" ON "AuditLog"("employeeId");
DROP INDEX IF EXISTS "AuditLog_userId_idx";
