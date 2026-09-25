-- ============================================================================
-- MIGRACIÓN: Captura real de Impresión (valores vigentes)
-- ----------------------------------------------------------------------------
-- Agrega a flexo_orders y flexo_products las columnas de captura real del
-- proceso de Impresión, alineadas entre ambas tablas:
--   * Fases de tiempo reales (montaje / setup / corrida / limpieza): marca de
--     inicio, marca de fin y minutos efectivos por fase. El cotizado de estas
--     fases ya existe (tiempo_montaje_min, tiempo_setup_min, tiempo_corrida_min,
--     tiempo_limpieza_min) — aquí se agregan sus contrapartes _vigente.
--   * Máquina: velocidad media real (m/min) y cantidad de operarios.
--   * Consumo de sustrato y mermas en metros (montaje, corrida, ajuste/paros,
--     total y exceso de inventario), bobinas consumidas y lote.
--   * Entrega: metros buenos entregados al siguiente proceso, cantidad buena en
--     millares, rechazo y su motivo.
--   * Arranque: estado de las planchas montadas.
--   * Confirmaciones: Impresión solo verifica que sustrato, planchas, troquel y
--     barniz sean los correctos (el valor lo definen Planificación / Tintas).
--
-- Nota: merma_tiraje_pct_vigente / merma_tiraje_pies_vigente ya existen. La
-- columna impresion_merma_corrida_m_vigente es la captura en metros de esa misma
-- merma de tiraje; el backend mantiene sincronizadas las columnas legadas.
--
-- Idempotente: se puede ejecutar varias veces.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-captura-impresion-vigente.sql
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_orders', 'flexo_products']
    LOOP
        -- ---- Fases de tiempo reales -----------------------------------------
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_montaje_min_vigente NUMERIC(10,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_montaje_inicio_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_montaje_fin_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_setup_min_vigente NUMERIC(10,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_setup_inicio_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_setup_fin_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_corrida_min_vigente NUMERIC(10,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_corrida_inicio_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_corrida_fin_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_limpieza_min_vigente NUMERIC(10,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_limpieza_inicio_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_limpieza_fin_vigente TIMESTAMPTZ', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tiempo_total_impresion_min_vigente NUMERIC(10,2)', tbl);

        -- ---- Máquina ------------------------------------------------------------
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS velocidad_maquina_m_min_vigente NUMERIC(10,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_operarios_vigente INTEGER', tbl);

        -- ---- Consumo de sustrato y mermas (metros) ---------------------------
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_sustrato_consumido_m_vigente NUMERIC(12,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_merma_montaje_m_vigente NUMERIC(12,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_merma_corrida_m_vigente NUMERIC(12,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_merma_ajuste_paros_m_vigente NUMERIC(12,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_merma_total_m_vigente NUMERIC(12,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_exceso_inventario_m_vigente NUMERIC(12,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_bobinas_consumidas_vigente INTEGER', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_lote_sustrato_vigente TEXT', tbl);

        -- ---- Entrega al siguiente proceso ----------------------------------
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_metros_buenos_entregados_vigente NUMERIC(12,2)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_cantidad_buena_millares_vigente NUMERIC(12,3)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_rechazo_millares_vigente NUMERIC(12,3)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_rechazo_motivo_vigente TEXT', tbl);

        -- ---- Arranque -----------------------------------------------------------
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_planchas_estado_vigente TEXT', tbl);

        -- ---- Confirmaciones (Impresión verifica, no define) ----------------
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_confirma_sustrato_vigente BOOLEAN', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_confirma_planchas_vigente BOOLEAN', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_confirma_troquel_vigente BOOLEAN', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_confirma_barniz_vigente BOOLEAN', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_discrepancia_vigente TEXT', tbl);

        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS impresion_captura_actualizado_en TIMESTAMPTZ', tbl);
    END LOOP;
END $$;
