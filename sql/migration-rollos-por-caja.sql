-- Migración: soporte para calcular "Rollos por Caja" automáticamente.
--  1) costo_general: tasa de crecimiento del rollo (cm por cada N unidades)
--     y margen interno de la caja (cm) para no calcular al tallado.
--  2) costo_acabado_cajas: medidas internas de la caja (cm), opcionales, para
--     poder calcular cuántos rollos caben por caja.
--  3) flexo_orders / flexo_products / flexo_calculations: advertencia de
--     empaque cuando la caja seleccionada no alcanza para la cantidad de
--     rollos por caja indicada.
--
-- Idempotente: se puede ejecutar más de una vez sin duplicar datos.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-rollos-por-caja.sql

BEGIN;

ALTER TABLE costo_general
  ADD COLUMN IF NOT EXISTS rollo_crecimiento_cm        NUMERIC(10,4) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS rollo_crecimiento_cantidad   NUMERIC(12,2) NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS margen_caja_cm               NUMERIC(10,4) NOT NULL DEFAULT 1;

ALTER TABLE costo_acabado_cajas
  ADD COLUMN IF NOT EXISTS largo_interno_cm NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ancho_interno_cm NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alto_interno_cm  NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE flexo_orders       ADD COLUMN IF NOT EXISTS empaque_advertencia text;
ALTER TABLE flexo_products     ADD COLUMN IF NOT EXISTS empaque_advertencia text;
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS empaque_advertencia text;

COMMIT;
