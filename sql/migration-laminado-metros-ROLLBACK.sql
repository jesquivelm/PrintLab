-- Reversa de migration-laminado-metros.sql.

UPDATE flexo_calculations SET laminado_metros_lineales = ROUND(laminado_metros_lineales / 0.3048, 4)
WHERE laminado_metros_lineales IS NOT NULL;
ALTER TABLE flexo_calculations RENAME COLUMN laminado_metros_lineales TO laminado_pies_lineales;

UPDATE flexo_orders SET laminado_metros_lineales = ROUND(laminado_metros_lineales / 0.3048, 4)
WHERE laminado_metros_lineales IS NOT NULL;
ALTER TABLE flexo_orders RENAME COLUMN laminado_metros_lineales TO laminado_pies_lineales;

UPDATE flexo_products SET laminado_metros_lineales = ROUND(laminado_metros_lineales / 0.3048, 4)
WHERE laminado_metros_lineales IS NOT NULL;
ALTER TABLE flexo_products RENAME COLUMN laminado_metros_lineales TO laminado_pies_lineales;
