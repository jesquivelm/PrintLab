-- Datos de Tarima/Pallet en Empaque (informativos, no entran en la fórmula de costo).
-- Distancias en metros, peso en kilogramos.
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_tarima_alto NUMERIC(10,3);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_tarima_ancho NUMERIC(10,3);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_tarima_largo NUMERIC(10,3);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_tarima_peso NUMERIC(10,3);

ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS empaque_tarima_alto NUMERIC(10,3);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS empaque_tarima_ancho NUMERIC(10,3);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS empaque_tarima_largo NUMERIC(10,3);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS empaque_tarima_peso NUMERIC(10,3);

ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_tarima_alto NUMERIC(10,3);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_tarima_ancho NUMERIC(10,3);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_tarima_largo NUMERIC(10,3);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_tarima_peso NUMERIC(10,3);
