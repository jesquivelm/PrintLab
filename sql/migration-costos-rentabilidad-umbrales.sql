-- Migración: overhead por defecto y umbrales del semáforo de rentabilidad
-- (Análisis de Rentabilidad de la Cotización + Reportería).
--
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-costos-rentabilidad-umbrales.sql

BEGIN;

ALTER TABLE costo_general
  ADD COLUMN IF NOT EXISTS overhead_defecto_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_saludable_pct NUMERIC(6,2) NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS margen_minimo_pct    NUMERIC(6,2) NOT NULL DEFAULT 20;

COMMIT;
