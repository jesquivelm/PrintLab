-- ============================================================
-- MIGRACIÓN: Columnas faltantes para completar la propagación
--             cotización -> producto -> orden de producción
-- ============================================================

-- ============================================================
-- 1. flexo_products: columnas que existen en flexo_calculations
--    y flexo_orders pero nunca se agregaron aquí
-- ============================================================
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS analisis_solicitud TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS analisis_finalizar TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS analisis_crear_orden TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS resumen_cotizacion TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS info_impresion TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS estado_creacion TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS embosado_tipo TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS material_nombre TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS seleccion_automatica JSONB;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS precio_automatico JSONB;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS numerado_adjunto TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS empaque_adjunto TEXT;
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS cantidad_tintas NUMERIC(8,4);

-- ============================================================
-- 2. flexo_orders: columnas que existen en flexo_calculations
--    y flexo_products pero nunca se agregaron aquí
-- ============================================================
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS customer_code TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS surface_type TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(8,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,4);
