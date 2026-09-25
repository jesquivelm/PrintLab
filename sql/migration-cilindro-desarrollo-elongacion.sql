-- Migración: campos de desarrollo/elongación y existencia por tamaño para Inventario Cilindros.
-- Origen: tabla "Anilox Cilindros.xlsx" del usuario — es una tabla de desarrollo de cilindros
-- por número de dientes (no un anilox/rodillo entintador), con cuántos cilindros regulares y
-- magnéticos existen de cada tamaño, y dos configuraciones de elongación/encogimiento usadas
-- para calcular el montaje real del cliché sobre el cilindro.
--
-- Mapeo de columnas del Excel a columnas existentes de `cilindro`:
--   PULGADAS -> circunferencia_in (ya existe)
--   MM       -> desarrollo_mm (ya existe)
--   DIENTES  -> dientes (ya existe)
--
-- Los nombres de las dos configuraciones (config A / config B) están pendientes de confirmar
-- con el proveedor de la data (ver lista de preguntas entregada al usuario 20260901).

ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS cantidad_cilindros_regulares NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS cantidad_cilindros_magneticos NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS cantidad_recibida NUMERIC(10,2);
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS elongacion_pct_config_a NUMERIC(6,2);
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS encogimiento_config_a NUMERIC(10,4);
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS elongacion_pct_config_b NUMERIC(6,2);
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS encogimiento_config_b NUMERIC(10,4);
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS configuracion_a_nombre VARCHAR(120);
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS configuracion_b_nombre VARCHAR(120);
ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS sin_existencia BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN cilindro.cantidad_cilindros_regulares IS 'Existencia de cilindros regulares (tintas) de este tamaño/desarrollo.';
COMMENT ON COLUMN cilindro.cantidad_cilindros_magneticos IS 'Existencia de cilindros magnéticos de este tamaño, usados para montar el troquel.';
COMMENT ON COLUMN cilindro.cantidad_recibida IS 'Cantidad recibida reportada por separado en la data de origen (informativo).';
COMMENT ON COLUMN cilindro.sin_existencia IS 'Tamaño de referencia que no se ha solicitado/comprado (fila "No se solicitó" en la data de origen).';
