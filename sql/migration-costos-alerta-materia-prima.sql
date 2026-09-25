-- Migración: alerta de % máximo de materia prima sobre el precio de venta
-- y valores acordados con el cliente (overhead 5 %, semáforo 30 % / 35 %).
--
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-costos-alerta-materia-prima.sql

BEGIN;

ALTER TABLE costo_general
  ADD COLUMN IF NOT EXISTS materia_prima_maxima_pct NUMERIC(6,2) NOT NULL DEFAULT 55;

UPDATE costo_general
   SET overhead_defecto_pct = 5,
       margen_minimo_pct = 30,
       margen_saludable_pct = 35,
       materia_prima_maxima_pct = 55;

COMMIT;
