-- ============================================================================
-- MIGRACIÓN: Quitar la unidad "pies" de las columnas _vigente de captura
-- ----------------------------------------------------------------------------
-- La planta produce y captura en METROS. Renombra las columnas _vigente en pies
-- que dejó migration-reproceso-parametros-vigentes.sql (dormidas: 100 % NULL,
-- sin escritores; solo lecturas de display en producto-documento.js que ya
-- convertían pies→m). El valor no se convierte porque no hay datos.
--
-- NO se toca merma_paros_pies_vigente: la alimenta production_route_events.
-- desperdicio_pies (sistema de paros), fuera del alcance de este rediseño.
--
-- Idempotente.
--
-- Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-vigente-pies-a-metros.sql
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
    ren TEXT[];
    pares TEXT[][] := ARRAY[
        ['merma_arranque_pies_vigente',          'merma_arranque_m_vigente'],
        ['merma_tiraje_pies_vigente',            'merma_tiraje_m_vigente'],
        ['pies_buenos_producidos_vigente',       'metros_buenos_producidos_vigente'],
        ['rebobinado_merma_ajuste_pies_vigente', 'rebobinado_merma_ajuste_m_vigente']
    ];
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_orders', 'flexo_products']
    LOOP
        FOREACH ren SLICE 1 IN ARRAY pares
        LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = ren[1])
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = ren[2]) THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', tbl, ren[1], ren[2]);
            END IF;
        END LOOP;
    END LOOP;
END $$;
