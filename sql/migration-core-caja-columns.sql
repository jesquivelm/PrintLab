-- Migración: costos de core y caja.
-- Agrega columnas tipadas:
--   - costo_general: costo_core y costo_caja (valores por defecto de Costos -> General).
--   - flexo_calculations, flexo_products, flexo_orders: etiquetas_por_caja, costo_core y costo_caja
--     (persistencia por línea de cálculo; alineación de columnas entre las tres tablas).
--
-- Idempotente: se puede ejecutar más de una vez.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-core-caja-columns.sql

BEGIN;

ALTER TABLE costo_general
  ADD COLUMN IF NOT EXISTS costo_core NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_caja NUMERIC(12,4) NOT NULL DEFAULT 0;

ALTER TABLE flexo_calculations
  ADD COLUMN IF NOT EXISTS etiquetas_por_caja NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_core        NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_caja        NUMERIC(12,4) NOT NULL DEFAULT 0;

ALTER TABLE flexo_products
  ADD COLUMN IF NOT EXISTS etiquetas_por_caja NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_core        NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_caja        NUMERIC(12,4) NOT NULL DEFAULT 0;

ALTER TABLE flexo_orders
  ADD COLUMN IF NOT EXISTS etiquetas_por_caja NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_core        NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_caja        NUMERIC(12,4) NOT NULL DEFAULT 0;

COMMIT;
