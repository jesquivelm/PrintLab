-- ============================================================================
-- PRINTLAB ERP - Migración: Producto por Motivo dentro de una Línea de Cálculo
-- ============================================================================
-- Permite convertir cada "motivo" (Tipos o Motivos) de una línea de cálculo en
-- su propio producto/SKU independiente, en vez de un solo producto por línea.
-- ============================================================================

ALTER TABLE flexo_products
    ADD COLUMN IF NOT EXISTS motivo_indice INTEGER;

ALTER TABLE flexo_products
    ADD COLUMN IF NOT EXISTS motivo_nombre TEXT;

CREATE INDEX IF NOT EXISTS idx_flexo_products_motivo
    ON flexo_products(quote_code, line_code, motivo_indice);
