-- Seed test data for verification
DELETE FROM "RemainingRecord" WHERE "operationalDate" IN ('2026-05-12', '2026-05-13');
DELETE FROM "WasteRecord" WHERE "operationalDate" IN ('2026-05-12', '2026-05-13');
DELETE FROM "ProductionRecord" WHERE "operationalDate" IN ('2026-05-12', '2026-05-13');

DO $$ 
DECLARE
  first_prod_id INTEGER;
  branch_id INTEGER;
  user_id INTEGER;
BEGIN
  SELECT id INTO first_prod_id FROM "Product" LIMIT 1;
  SELECT id INTO branch_id FROM "Branch" WHERE "isActive" = true LIMIT 1;
  SELECT id INTO user_id FROM "User" LIMIT 1;

  IF first_prod_id IS NULL OR branch_id IS NULL OR user_id IS NULL THEN
    RAISE NOTICE 'Required seed data missing - run seed first';
    RETURN;
  END IF;

  -- May 12 remaining (30 units)
  INSERT INTO "RemainingRecord" ("productId", "branchId", "operationalDate", "quantity", "status", "createdBy", "updatedAt")
  VALUES (first_prod_id, branch_id, '2026-05-12', 30, 'FINAL', user_id, NOW())
  ON CONFLICT ("branchId", "operationalDate", "productId") DO UPDATE SET "quantity" = 30, "updatedAt" = NOW();

  -- May 12 NIGHT production (210 units) -> operational date = May 13
  INSERT INTO "ProductionRecord" ("productId", "branchId", "productionDate", "operationalDate", "shift", "quantity", "createdBy", "updatedAt")
  VALUES (first_prod_id, branch_id, '2026-05-12', '2026-05-13', 'NIGHT', 210, user_id, NOW());

  -- May 13 DAY production (200 units)
  INSERT INTO "ProductionRecord" ("productId", "branchId", "productionDate", "operationalDate", "shift", "quantity", "createdBy", "updatedAt")
  VALUES (first_prod_id, branch_id, '2026-05-13', '2026-05-13', 'DAY', 200, user_id, NOW());

  -- May 13 remaining (80 units)
  INSERT INTO "RemainingRecord" ("productId", "branchId", "operationalDate", "quantity", "status", "createdBy", "updatedAt")
  VALUES (first_prod_id, branch_id, '2026-05-13', 80, 'FINAL', user_id, NOW())
  ON CONFLICT ("branchId", "operationalDate", "productId") DO UPDATE SET "quantity" = 80, "updatedAt" = NOW();

  -- May 13 waste (5 units)
  INSERT INTO "WasteRecord" ("productId", "branchId", "operationalDate", "quantity", "reason", "createdBy")
  VALUES (first_prod_id, branch_id, '2026-05-13', 5, 'Testing', user_id);

  RAISE NOTICE 'Test data seeded successfully';
END $$;