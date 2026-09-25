-- Migración: agrega Viscosidad, Potencia UV y Temp. UV a costo_acabado_barniz.
-- Estos campos ya existían en la interfaz (Costos y Acabados > Barniz) pero no se
-- persistían en la base de datos.
--
-- Idempotente: se puede ejecutar más de una vez sin duplicar datos.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-acabados-barniz-viscosidad.sql

BEGIN;

ALTER TABLE costo_acabado_barniz
  ADD COLUMN IF NOT EXISTS viscosidad  NUMERIC(10,4) NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS potencia_uv NUMERIC(6,2)  NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS temp_uv     NUMERIC(6,2)  NOT NULL DEFAULT 85;

COMMIT;
