-- Ficha técnica de la goma para estampado (materia prima clasificada "adicionales").
-- Los mismos números que el barniz, pero viven solo en la línea de inventario `material`.
-- Idempotente: se puede correr varias veces sin efecto.

ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_cobertura_pct DECIMAL(10,4);
ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_bcm_anilox DECIMAL(10,4);
ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_lineatura_anilox DECIMAL(10,4);
ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_factor_transferencia DECIMAL(10,4);
ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_densidad DECIMAL(10,4);
ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_carga_minima_kg DECIMAL(12,6);

-- Producto base de goma para estampado (uno por tenant). Valores de arranque tomados
-- del barniz de referencia; el implementador los ajusta en Inventario → Materia Prima.
INSERT INTO material (
    tenant_id, codigo, nombre, ancho_mm, familia_proceso, clasificacion, activo,
    costo_x_kg, goma_cobertura_pct, goma_bcm_anilox, goma_lineatura_anilox,
    goma_factor_transferencia, goma_densidad, goma_carga_minima_kg
)
SELECT t.id, 'ADI-GOMA-EST', 'Goma para Estampado', 0, 'adicionales', 'adicionales', TRUE,
       12, 100, 7, 0, 0.35, 1.05, 0
  FROM tenant t
 ON CONFLICT (tenant_id, codigo) DO NOTHING;

-- Rollback (manual):
-- DELETE FROM material WHERE codigo = 'ADI-GOMA-EST';
-- ALTER TABLE material DROP COLUMN IF EXISTS goma_cobertura_pct;
-- ALTER TABLE material DROP COLUMN IF EXISTS goma_bcm_anilox;
-- ALTER TABLE material DROP COLUMN IF EXISTS goma_lineatura_anilox;
-- ALTER TABLE material DROP COLUMN IF EXISTS goma_factor_transferencia;
-- ALTER TABLE material DROP COLUMN IF EXISTS goma_densidad;
-- ALTER TABLE material DROP COLUMN IF EXISTS goma_carga_minima_kg;
