-- ============================================================================
-- MIGRACIÓN: Panel de Diseño en Producción (Fase 1)
-- ----------------------------------------------------------------------------
-- 1) produccion_artes: imagen de referencia por MOTIVO y VERSIÓN (hoy es solo
--    por orden + proceso). Ambas columnas nullable — no rompe filas existentes.
-- 2) flexo_orders / flexo_products: forma y orientación de la etiqueta que
--    confirma Diseño (el sangrado ya existe: diseno_sangrado_vigente_in; las
--    notas ya existen: diseno_notas_cliente_vigente).
--
-- Idempotente.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-produccion-diseno.sql
-- ============================================================================

ALTER TABLE produccion_artes ADD COLUMN IF NOT EXISTS motivo_indice INTEGER;
ALTER TABLE produccion_artes ADD COLUMN IF NOT EXISTS version_indice INTEGER;
CREATE INDEX IF NOT EXISTS idx_produccion_artes_motivo
    ON produccion_artes(orden_codigo, motivo_indice, version_indice);

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_orders', 'flexo_products']
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS diseno_forma_vigente TEXT', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS diseno_orientacion_vigente TEXT', tbl);
    END LOOP;
END $$;
