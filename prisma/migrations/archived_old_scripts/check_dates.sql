SELECT "operationalDate", "productId", quantity, 'remaining' as type FROM "RemainingRecord"
UNION ALL
SELECT "operationalDate", "productId", quantity, 'production' as type FROM "ProductionRecord"
ORDER BY "operationalDate", "productId";