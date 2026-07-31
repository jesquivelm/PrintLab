-- Migración FASE 3: Nuevas columnas para eliminar dependencia de raw_data
-- Fecha: 2026-07-25
-- Columnas nuevas en ambas tablas

-- =============================================
-- flexo_calculations
-- =============================================
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS barniz_tipo TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS laminado_tipo TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS estampado_tipo TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS embosado_tipo TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS troquel_forma TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS ruta_calculada TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS montaje_resumen TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS sin_impresion BOOLEAN DEFAULT false;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS medida_fija TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS material_nombre TEXT;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS seleccion_automatica JSONB;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS precio_automatico JSONB;

-- =============================================
-- flexo_orders
-- =============================================
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS barniz_tipo TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS laminado_tipo TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS estampado_tipo TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS embosado_tipo TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS troquel_forma TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS ruta_calculada TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS montaje_resumen TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS sin_impresion BOOLEAN DEFAULT false;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS medida_fija TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS material_nombre TEXT;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS seleccion_automatica JSONB;
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS precio_automatico JSONB;
