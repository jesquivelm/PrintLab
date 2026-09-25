-- Migración: 3 campos de identidad del pedido que el vendedor captura en la Solicitud pero que
-- hoy no tienen columna propia (solo viven un rato en raw_data): Referencia, Insumos que Entrega
-- el Cliente, y Ambiente de Aplicación ("Aplicación", distinto de Tipo de Etiquetado que ya vive
-- en application_type). Mismo patrón que migration-codigo-producto-cliente.sql: alineadas en las
-- 3 tablas del flujo (Column Alignment), sin raw_data para escrituras nuevas.

ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS referencia_cliente TEXT;
ALTER TABLE flexo_products     ADD COLUMN IF NOT EXISTS referencia_cliente TEXT;
ALTER TABLE flexo_orders       ADD COLUMN IF NOT EXISTS referencia_cliente TEXT;

ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS insumos_cliente TEXT;
ALTER TABLE flexo_products     ADD COLUMN IF NOT EXISTS insumos_cliente TEXT;
ALTER TABLE flexo_orders       ADD COLUMN IF NOT EXISTS insumos_cliente TEXT;

ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS ambiente_aplicacion TEXT;
ALTER TABLE flexo_products     ADD COLUMN IF NOT EXISTS ambiente_aplicacion TEXT;
ALTER TABLE flexo_orders       ADD COLUMN IF NOT EXISTS ambiente_aplicacion TEXT;

CREATE INDEX IF NOT EXISTS idx_flexo_calculations_referencia_cliente ON flexo_calculations (referencia_cliente);
CREATE INDEX IF NOT EXISTS idx_flexo_products_referencia_cliente     ON flexo_products (referencia_cliente);
CREATE INDEX IF NOT EXISTS idx_flexo_orders_referencia_cliente       ON flexo_orders (referencia_cliente);

-- Backfill desde raw_data si alguna vez se guardó ahí bajo estas claves (patrón REQ | ... de
-- la Solicitud Rápida, y AMBIENTE APLICACION del cálculo).
UPDATE flexo_calculations
   SET referencia_cliente = NULLIF(raw_data->>'REQ | Referencia', '')
 WHERE referencia_cliente IS NULL AND raw_data ? 'REQ | Referencia';

UPDATE flexo_calculations
   SET insumos_cliente = NULLIF(raw_data->>'REQ | Insumos Cliente', '')
 WHERE insumos_cliente IS NULL AND raw_data ? 'REQ | Insumos Cliente';

UPDATE flexo_calculations
   SET ambiente_aplicacion = NULLIF(raw_data->>'AMBIENTE APLICACION', '')
 WHERE ambiente_aplicacion IS NULL AND raw_data ? 'AMBIENTE APLICACION';
