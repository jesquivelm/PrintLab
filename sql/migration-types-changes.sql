-- Migración: Tipos o Motivos y Cambios de Producción
-- Agrega la columna quantity_changes_additional a las tablas compartidas.
-- 'Cambios por Tipos o Motivos' se calcula como MAX(cantidad_tipos - 1, 0) y
-- se almacena en quantity_changes. Los cambios adicionales manuales se
-- almacenan en quantity_changes_additional.

ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS quantity_changes_additional NUMERIC(14,4);

ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS quantity_changes_additional NUMERIC(14,4);

ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS quantity_changes_additional NUMERIC(14,4);

-- Normaliza quantity_changes existentes a la fórmula oficial:
-- cantidad_cambios = MAX(cantidad_tipos - 1, 0)
UPDATE flexo_calculations
   SET quantity_changes = GREATEST(COALESCE(quantity_types, 1) - 1, 0)
 WHERE quantity_types IS NOT NULL
   AND COALESCE(quantity_changes, -1) <> GREATEST(COALESCE(quantity_types, 1) - 1, 0);

UPDATE flexo_products
   SET quantity_changes = GREATEST(COALESCE(quantity_types, 1) - 1, 0)
 WHERE quantity_types IS NOT NULL
   AND COALESCE(quantity_changes, -1) <> GREATEST(COALESCE(quantity_types, 1) - 1, 0);

UPDATE flexo_orders
   SET quantity_changes = GREATEST(COALESCE(quantity_types, 1) - 1, 0)
 WHERE quantity_types IS NOT NULL
   AND COALESCE(quantity_changes, -1) <> GREATEST(COALESCE(quantity_types, 1) - 1, 0);
