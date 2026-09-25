-- ============================================================================
-- MIGRACIÓN: Multi-barniz en 3 slots planos (barniz_, barniz_2_, barniz_3_).
-- ----------------------------------------------------------------------------
-- Contexto: el barniz en línea puede montarse varias veces (brillante + mate +
-- reserva) como estaciones movibles de la máquina. El COSTO y CONSUMO totales
-- ya se guardan sumados en barniz_costo_total / barniz_consumo_kg; lo que falta
-- es persistir los PARÁMETROS de cada barniz por separado, en columnas tipadas
-- y planas, alineadas entre las tres tablas (flexo_calculations, flexo_orders,
-- flexo_products). Sin raw_data.
--
-- Convención:
--   * Slot 1 = prefijo 'barniz_'   (ya existía en su mayor parte).
--   * Slot 2 = prefijo 'barniz_2_' (nuevo).
--   * Slot 3 = prefijo 'barniz_3_' (nuevo).
--   * Cap = 3. Un 4º barniz manual sigue sumando a barniz_costo_total pero sus
--     parámetros no se guardan en columna.
--   * Se agregan barniz_factor_transferencia / barniz_densidad al slot 1 para
--     que los tres slots tengan el mismo juego de 12 columnas.
--
-- 12 campos × 3 slots × 3 tablas. Idempotente (ADD COLUMN IF NOT EXISTS): las
-- columnas del slot 1 que ya existen quedan como no-op. Rollback al final,
-- comentado.
--
-- Ejecutar:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-barniz-multi-columnas.sql
-- ============================================================================

DO $$
DECLARE
    tbl    TEXT;
    pref   TEXT;
    campo  TEXT;
    campos TEXT[] := ARRAY[
        'material_id TEXT',
        'bcm NUMERIC(12,4)',
        'cobertura_pct NUMERIC(8,4)',
        'costo_por_kg NUMERIC(14,6)',
        'factor_transferencia NUMERIC(10,4)',
        'densidad NUMERIC(10,4)',
        'consumo_kg NUMERIC(14,6)',
        'costo_total NUMERIC(14,6)',
        'estacion_cotizada INTEGER',
        'tiempo_montaje_min NUMERIC(12,4)',
        'zonificado BOOLEAN DEFAULT false',
        'comentario TEXT'
    ];
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_orders', 'flexo_products']
    LOOP
        FOREACH pref IN ARRAY ARRAY['barniz_', 'barniz_2_', 'barniz_3_']
        LOOP
            FOREACH campo IN ARRAY campos LOOP
                EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %s%s', tbl, pref, campo);
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- ROLLBACK (ejecutar manualmente si hay que revertir; sólo los slots nuevos):
--
-- DO $$
-- DECLARE
--     tbl    TEXT;
--     pref   TEXT;
--     campo  TEXT;
--     campos TEXT[] := ARRAY[
--         'material_id', 'bcm', 'cobertura_pct', 'costo_por_kg',
--         'factor_transferencia', 'densidad', 'consumo_kg', 'costo_total',
--         'estacion_cotizada', 'tiempo_montaje_min', 'zonificado', 'comentario'
--     ];
-- BEGIN
--     FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_orders', 'flexo_products']
--     LOOP
--         FOREACH pref IN ARRAY ARRAY['barniz_2_', 'barniz_3_']
--         LOOP
--             FOREACH campo IN ARRAY campos LOOP
--                 EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %s%s', tbl, pref, campo);
--             END LOOP;
--         END LOOP;
--     END LOOP;
--     -- Slot 1 nuevos:
--     FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_orders', 'flexo_products']
--     LOOP
--         EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS barniz_factor_transferencia', tbl);
--         EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS barniz_densidad', tbl);
--     END LOOP;
-- END $$;
-- ============================================================================
