-- Migración: merma % real (producida) por material — foil, laminado y tinta.
-- El sustrato ya tiene merma_tiraje_pct / merma_tiraje_pct_vigente; aquí se agregan las que faltan.
-- Solo columnas *_vigente (valor producido, lo carga la planta desde MES). No hay contraparte
-- cotizada para foil/laminado/tinta en el modelo de costeo actual (su merma es calculada / no se
-- contempla), así que el "cotizado" queda vacío en valores_produccion_motivo hasta que exista.
-- Alineado en flexo_products y flexo_orders (regla de Column Alignment); MES escribe en ambas.

ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_foil_pct_vigente     NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_laminado_pct_vigente NUMERIC(8,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_tinta_pct_vigente    NUMERIC(8,4);

ALTER TABLE flexo_orders   ADD COLUMN IF NOT EXISTS merma_foil_pct_vigente     NUMERIC(8,4);
ALTER TABLE flexo_orders   ADD COLUMN IF NOT EXISTS merma_laminado_pct_vigente NUMERIC(8,4);
ALTER TABLE flexo_orders   ADD COLUMN IF NOT EXISTS merma_tinta_pct_vigente    NUMERIC(8,4);

COMMENT ON COLUMN flexo_products.merma_foil_pct_vigente     IS 'Merma real de foil en %, capturada en producción (MES).';
COMMENT ON COLUMN flexo_products.merma_laminado_pct_vigente IS 'Merma real de laminado en %, capturada en producción (MES).';
COMMENT ON COLUMN flexo_products.merma_tinta_pct_vigente    IS 'Merma real de tinta en %, capturada en producción (MES).';
