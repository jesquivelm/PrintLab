-- Migración: código del producto según el cliente ("el cliente también codifica sus productos").
-- Campo de identidad, alineado en las 3 tablas del flujo (regla de Column Alignment):
-- flexo_calculations -> flexo_products -> flexo_orders. Sin raw_data para escrituras nuevas;
-- el backfill sí lee raw_data para no perder lo que ya se haya capturado ahí.
-- No se usa versión de producto por decisión del cliente (producto nuevo en vez de versión).

ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS codigo_producto_cliente TEXT;
ALTER TABLE flexo_products     ADD COLUMN IF NOT EXISTS codigo_producto_cliente TEXT;
ALTER TABLE flexo_orders       ADD COLUMN IF NOT EXISTS codigo_producto_cliente TEXT;

CREATE INDEX IF NOT EXISTS idx_flexo_calculations_codigo_producto_cliente ON flexo_calculations (codigo_producto_cliente);
CREATE INDEX IF NOT EXISTS idx_flexo_products_codigo_producto_cliente     ON flexo_products (codigo_producto_cliente);
CREATE INDEX IF NOT EXISTS idx_flexo_orders_codigo_producto_cliente       ON flexo_orders (codigo_producto_cliente);

-- Backfill desde raw_data si alguna vez se guardó ahí bajo estas claves.
UPDATE flexo_calculations
   SET codigo_producto_cliente = COALESCE(
        NULLIF(raw_data->>'CODIGO PRODUCTO CLIENTE', ''),
        NULLIF(raw_data->>'CODIGO CLIENTE PRODUCTO', ''),
        NULLIF(raw_data->>'REQ | Codigo del Cliente', '')
   )
 WHERE codigo_producto_cliente IS NULL
   AND raw_data IS NOT NULL
   AND (raw_data ? 'CODIGO PRODUCTO CLIENTE' OR raw_data ? 'CODIGO CLIENTE PRODUCTO' OR raw_data ? 'REQ | Codigo del Cliente');
