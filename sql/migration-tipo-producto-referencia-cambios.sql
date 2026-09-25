-- Migración: Tipo de Producto a nivel de cálculo/orden (hasta ahora solo existía en
-- flexo_products, poblado por un camino distinto al que realmente usa el Cálculo hoy —
-- Estado_UI.header.productType nunca llegaba a una columna real), y Referencia Cambios /
-- Referencia Comentario ("¿Qué Cambia?" del buscador de Referencia), que el dueño pidió
-- explícitamente que lleguen a la orden. tipo_trabajo YA existe como columna en las 3 tablas
-- desde una migración anterior pero nunca se llenó — no necesita ALTER, solo el wireup en
-- server.js (ver buildCalculationRawData).

ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE flexo_orders       ADD COLUMN IF NOT EXISTS product_type TEXT;

ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS referencia_cambios TEXT;
ALTER TABLE flexo_products     ADD COLUMN IF NOT EXISTS referencia_cambios TEXT;
ALTER TABLE flexo_orders       ADD COLUMN IF NOT EXISTS referencia_cambios TEXT;

ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS referencia_comentario TEXT;
ALTER TABLE flexo_products     ADD COLUMN IF NOT EXISTS referencia_comentario TEXT;
ALTER TABLE flexo_orders       ADD COLUMN IF NOT EXISTS referencia_comentario TEXT;

-- Backfill desde raw_data (Estado_UI.header y las claves REQ | ... que ya se guardaban ahí).
UPDATE flexo_calculations
   SET product_type = NULLIF(raw_data->'Estado_UI'->'header'->>'productType', '')
 WHERE product_type IS NULL AND raw_data->'Estado_UI'->'header'->>'productType' IS NOT NULL;

UPDATE flexo_calculations
   SET referencia_comentario = NULLIF(raw_data->>'REQ | Referencia Comentario', '')
 WHERE referencia_comentario IS NULL AND raw_data ? 'REQ | Referencia Comentario';

UPDATE flexo_calculations
   SET referencia_cambios = NULLIF(raw_data->>'REQ | Referencia Cambios', '')
 WHERE referencia_cambios IS NULL AND raw_data ? 'REQ | Referencia Cambios';
