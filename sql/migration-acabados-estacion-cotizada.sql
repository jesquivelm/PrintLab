-- ============================================================================
-- MIGRACIÓN: Posición COTIZADA de los acabados en línea (barniz / laminado /
-- estampado) sobre la máquina.
-- ----------------------------------------------------------------------------
-- Contexto: los acabados en línea ahora se montan en una torre concreta de la
-- máquina (estaciones removibles) y esa posición se decide en el cálculo. Se
-- guarda como columna tipada y plana en las tres tablas alineadas
-- (flexo_calculations, flexo_orders, flexo_products) para que orden y producto
-- respondan sin parsear JSON y no se pierda trazabilidad. Sin raw_data.
--
-- Convención:
--   * Sufijo _cotizada = valor decidido en el cálculo (par del _vigente que ya
--     capturan barniz_estacion_vigente / foil_estacion_vigente en producción).
--   * Índice base 0 dentro de la lista de estaciones del motivo (inkStations).
--   * Barniz puede repetirse (brillante + mate): esta columna guarda la posición
--     de la PRIMERA instancia; el resto vive en Estado_UI hasta que se defina un
--     modelo multi-barniz en orden/producto.
--
-- Idempotente (ADD COLUMN IF NOT EXISTS). Rollback al final, comentado.
-- ============================================================================

DO $$
DECLARE
    tbl  TEXT;
    col  TEXT;
    defs TEXT[] := ARRAY[
        'barniz_estacion_cotizada INTEGER',
        'laminado_estacion_cotizada INTEGER',
        'estampado_estacion_cotizada INTEGER'
    ];
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_orders', 'flexo_products']
    LOOP
        FOREACH col IN ARRAY defs LOOP
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %s', tbl, col);
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- ROLLBACK (ejecutar manualmente si hay que revertir):
--
-- DO $$
-- DECLARE
--     tbl  TEXT;
--     col  TEXT;
--     cols TEXT[] := ARRAY[
--         'barniz_estacion_cotizada',
--         'laminado_estacion_cotizada',
--         'estampado_estacion_cotizada'
--     ];
-- BEGIN
--     FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_orders', 'flexo_products']
--     LOOP
--         FOREACH col IN ARRAY cols LOOP
--             EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %s', tbl, col);
--         END LOOP;
--     END LOOP;
-- END $$;
-- ============================================================================
