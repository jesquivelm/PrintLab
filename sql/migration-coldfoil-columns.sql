-- ============================================================================
-- Migracion: Columnas para Montaje Cold Foil en calculo_flexo
-- ============================================================================

ALTER TABLE calculo_flexo
  ADD COLUMN IF NOT EXISTS coldfoil_check              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS coldfoil_elemento_ancho_in   DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS coldfoil_elemento_largo_in   DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS coldfoil_columnas            INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS coldfoil_filas               INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS coldfoil_sep_horizontal_in   DECIMAL(10,4) DEFAULT 0.125,
  ADD COLUMN IF NOT EXISTS coldfoil_sep_vertical_in     DECIMAL(10,4) DEFAULT 0.125,
  ADD COLUMN IF NOT EXISTS coldfoil_margen_lateral_in   DECIMAL(10,4) DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS coldfoil_margen_longitudinal_in DECIMAL(10,4) DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS coldfoil_costo_plancha_in2   DECIMAL(12,6),
  ADD COLUMN IF NOT EXISTS coldfoil_cobertura_pct       DECIMAL(6,2) DEFAULT 60,
  ADD COLUMN IF NOT EXISTS coldfoil_cantidad_total      INT DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS coldfoil_gramaje_gm2         DECIMAL(10,4) DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS coldfoil_merma_pct           DECIMAL(6,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS coldfoil_precio_adhesivo_kg  DECIMAL(12,6) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS coldfoil_metros_lineales     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS coldfoil_costo_foil_m2       DECIMAL(12,6),
  ADD COLUMN IF NOT EXISTS coldfoil_ancho_bobina_in     DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS coldfoil_color               VARCHAR(50) DEFAULT 'oro',
  ADD COLUMN IF NOT EXISTS coldfoil_costo_plancha       DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS coldfoil_costo_foil          DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS coldfoil_costo_adhesivo      DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS coldfoil_costo_total         DECIMAL(14,4);
