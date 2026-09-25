-- ============================================================================
-- MIGRACIÓN: Captura real de Rebobinado (valores vigentes)
-- ----------------------------------------------------------------------------
-- Agrega a flexo_orders y flexo_products solo lo que NO existe todavía para
-- Rebobinado (máquina, sentido de salida, core, mermas ya viven en
-- migration-reproceso-parametros-vigentes.sql y se reutilizan tal cual):
--   * Velocidad real de la máquina (m/min).
--   * Distancia recorrida real (m).
--   * Fases de tiempo cronometradas por eventos (montaje / tiraje) e igual
--     patrón que syncCapturaFasesImpresion: marca de inicio, marca de fin,
--     minutos efectivos por fase y el total.
--
-- Idempotente: se puede ejecutar varias veces.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-captura-rebobinado-vigente.sql
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_orders', 'flexo_products']
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_velocidad_vigente NUMERIC(10,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_distancia_recorrida_m_vigente NUMERIC(12,2)', tbl);
        -- rebobinado_sentido_salida_vigente (reproceso) es INTEGER y no admite los valores de texto
        -- del catálogo de Tipos de Salida (p.ej. "Botella plástico (PET/HDPE)"); columna aparte.
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_tipo_salida_vigente TEXT', tbl);

        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_tiempo_montaje_min_vigente NUMERIC(10,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_tiempo_montaje_inicio_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_tiempo_montaje_fin_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_tiempo_tiraje_min_vigente NUMERIC(10,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_tiempo_tiraje_inicio_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_tiempo_tiraje_fin_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_tiempo_total_min_vigente NUMERIC(10,2)', tbl);

        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_captura_actualizado_en TIMESTAMPTZ', tbl);

        -- Distancia consumida por fase (m), declarada obligatoriamente por el operario al
        -- finalizar Montaje y Tiraje. De ahí se derivan los 3 % de merma (montaje, tiraje,
        -- total = suma) contra la distancia cotizada — son para la curva, no se muestran en
        -- el panel del operario.
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_distancia_montaje_m_vigente NUMERIC(12,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_distancia_tiraje_m_vigente NUMERIC(12,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_merma_montaje_pct_vigente NUMERIC(8,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_merma_tiraje_pct_vigente NUMERIC(8,4)', tbl);
        -- Total de productos declarado por el operario al cerrar el Tiraje (reportería).
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS rebobinado_productos_producidos_total_vigente NUMERIC(12,2)', tbl);
    END LOOP;
END $$;
