-- Add CHECK constraints to prevent negative quantities
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_quantity_check" CHECK (quantity > 0);
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_quantity_check" CHECK (quantity > 0);
