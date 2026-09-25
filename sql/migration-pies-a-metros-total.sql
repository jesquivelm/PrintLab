-- ============================================================================
-- Migración: conversión TOTAL de pies a metros en todo el sistema.
-- El usuario decidió (2026-09-07) eliminar la unidad "pies" del ERP por
-- completo: columnas, valores históricos, tarifas y configuración.
--
-- Factores de conversión:
--   * Longitud lineal:      pies  -> metros    valor * 0.3048
--   * Tarifa de costo:      $/pie -> $/metro   valor / 0.3048
--   * Rendimiento de área:  g/ft2 -> g/m2      valor * 10.7639104167
--
-- Backups previos (2026-09-07 07:09):
--   E:\Github\Adicionales\backups\printlab.backup.pies-a-metros.20260907-070946.sql
--   + server.js / app.js / costos.js / index.html(cálculo) / general-config.json
--
-- Orden interno OBLIGATORIO: primero se renombran TODAS las columnas, luego se
-- reescribe la función del trigger de merma % (que referencia las columnas de
-- sustrato) y sólo al final se convierten los valores con UPDATE — de lo
-- contrario el trigger BEFORE UPDATE explota con los nombres viejos.
--
-- Idempotencia: cada bloque verifica IF EXISTS sobre la columna vieja antes de
-- actuar, así re-ejecutar la migración no falla ni vuelve a multiplicar valores.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- FASE A — RENOMBRAR COLUMNAS (sin tocar valores todavía)
-- ----------------------------------------------------------------------------

-- A.1 Longitudes lineales en flexo_calculations / flexo_orders / flexo_products
DO $$
DECLARE
    tbl TEXT;
    par TEXT[];
    ren TEXT[][] := ARRAY[
        ['pies_totales_sustrato',        'metros_totales_sustrato'],
        ['pies_sustrato_neto',           'metros_sustrato_neto'],
        ['merma_arranque_pies',          'merma_arranque_m'],
        ['merma_tiraje_pies',            'merma_tiraje_m'],
        ['merma_total_pies',             'merma_total_m'],
        ['laminado_pies_lineales',       'laminado_metros_lineales'],
        ['troquelado_merma_ajuste_pies', 'troquelado_merma_ajuste_m'],
        ['rebobinado_merma_ajuste_pies', 'rebobinado_merma_ajuste_m'],
        ['material_pies_macula',         'material_metros_macula'],
        ['merma_paros_pies_vigente',     'merma_paros_m_vigente']
    ];
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_orders', 'flexo_products']
    LOOP
        FOREACH par SLICE 1 IN ARRAY ren
        LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name=tbl AND column_name=par[1])
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name=tbl AND column_name=par[2])
            THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', tbl, par[1], par[2]);
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- A.2 Desperdicio de paros
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='production_route_events' AND column_name='desperdicio_pies')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='production_route_events' AND column_name='desperdicio_m')
    THEN
        DROP VIEW IF EXISTS vw_merma_por_causa;
        ALTER TABLE production_route_events RENAME COLUMN desperdicio_pies TO desperdicio_m;
    END IF;
END $$;

-- A.3 Tarifas de costo $/pie
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='proceso_catalogo' AND column_name='costo_x_pie')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='proceso_catalogo' AND column_name='costo_x_metro')
    THEN
        ALTER TABLE proceso_catalogo RENAME COLUMN costo_x_pie TO costo_x_metro;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='costo_acabado_estampado' AND column_name='costo_por_pie_lineal')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='costo_acabado_estampado' AND column_name='costo_por_metro_lineal')
    THEN
        ALTER TABLE costo_acabado_estampado RENAME COLUMN costo_por_pie_lineal TO costo_por_metro_lineal;
    END IF;
END $$;

-- A.4 material.costo_x_pie -> consolidar en material.costo_x_metro (ya existe) y eliminar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='material' AND column_name='costo_x_pie')
    THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='material' AND column_name='costo_x_metro')
        THEN
            UPDATE material
               SET costo_x_metro = costo_x_pie / 0.3048
             WHERE costo_x_pie IS NOT NULL AND costo_x_pie <> 0
               AND (costo_x_metro IS NULL OR costo_x_metro = 0);
            ALTER TABLE material DROP COLUMN costo_x_pie;
        ELSE
            ALTER TABLE material RENAME COLUMN costo_x_pie TO costo_x_metro;
            UPDATE material SET costo_x_metro = costo_x_metro / 0.3048 WHERE costo_x_metro IS NOT NULL;
        END IF;
    END IF;
END $$;

-- A.5 Rendimiento de área g/ft2 -> g/m2
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='material' AND column_name='rendimiento_g_ft2')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='material' AND column_name='rendimiento_g_m2')
    THEN
        ALTER TABLE material RENAME COLUMN rendimiento_g_ft2 TO rendimiento_g_m2;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='material' AND column_name='comentario_rendimiento_g_ft2')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='material' AND column_name='comentario_rendimiento_g_m2')
    THEN
        ALTER TABLE material RENAME COLUMN comentario_rendimiento_g_ft2 TO comentario_rendimiento_g_m2;
    END IF;
END $$;

-- A.6 Configuración de máquina: macula_default_pies (integer) -> macula_default_m (numeric)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='maquina' AND column_name='macula_default_pies')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='maquina' AND column_name='macula_default_m')
    THEN
        ALTER TABLE maquina RENAME COLUMN macula_default_pies TO macula_default_m;
        ALTER TABLE maquina ALTER COLUMN macula_default_m TYPE NUMERIC(14,4) USING (macula_default_m::numeric * 0.3048);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- FASE B — REESCRIBIR EL TRIGGER DE MERMA % (nombres nuevos) ANTES DE LOS UPDATE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.flexo_set_merma_pct_cotizada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    pct NUMERIC(10,4);
BEGIN
    IF NEW.metros_sustrato_neto IS NOT NULL AND NEW.metros_sustrato_neto > 0
       AND NEW.metros_totales_sustrato IS NOT NULL AND NEW.metros_totales_sustrato > 0 THEN
        pct := ROUND((NEW.metros_totales_sustrato / NEW.metros_sustrato_neto - 1) * 100, 4);
        NEW.merma_sustrato_pct_cotizada := pct;
        NEW.merma_foil_pct_cotizada     := pct;
        NEW.merma_laminado_pct_cotizada := pct;
        NEW.merma_tinta_pct_cotizada    := pct;
    END IF;
    RETURN NEW;
END;
$function$;

-- ----------------------------------------------------------------------------
-- FASE C — CONVERTIR VALORES (UPDATE)
-- ----------------------------------------------------------------------------

-- C.1 Longitudes lineales en las 3 tablas flexo (* 0.3048)
DO $$
DECLARE
    tbl TEXT;
    col TEXT;
    cols TEXT[] := ARRAY[
        'metros_totales_sustrato', 'metros_sustrato_neto', 'merma_arranque_m', 'merma_tiraje_m',
        'merma_total_m', 'laminado_metros_lineales', 'troquelado_merma_ajuste_m',
        'rebobinado_merma_ajuste_m', 'material_metros_macula', 'merma_paros_m_vigente'
    ];
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_orders', 'flexo_products']
    LOOP
        FOREACH col IN ARRAY cols
        LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name=tbl AND column_name=col)
            THEN
                EXECUTE format('UPDATE %I SET %I = %I * 0.3048 WHERE %I IS NOT NULL', tbl, col, col, col);
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- C.2 Desperdicio de paros (* 0.3048)
UPDATE production_route_events SET desperdicio_m = desperdicio_m * 0.3048 WHERE desperdicio_m IS NOT NULL;

-- C.3 Tarifas de costo (/ 0.3048)
UPDATE proceso_catalogo         SET costo_x_metro          = costo_x_metro          / 0.3048 WHERE costo_x_metro          IS NOT NULL;
UPDATE costo_acabado_estampado  SET costo_por_metro_lineal = costo_por_metro_lineal / 0.3048 WHERE costo_por_metro_lineal IS NOT NULL;

-- C.4 Rendimiento de área (* 10.7639104167)
UPDATE material SET rendimiento_g_m2 = rendimiento_g_m2 * 10.7639104167 WHERE rendimiento_g_m2 IS NOT NULL;

-- ----------------------------------------------------------------------------
-- FASE D — RECREAR VISTA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_merma_por_causa AS
 SELECT op.codigo_orden AS order_code,
    COALESCE(NULLIF(sr.description, ''::text), sr.reason_code, 'Sin motivo'::text) AS motivo_paro,
    COALESCE(sr.reason_group, ''::text) AS grupo_motivo,
    count(*) AS cantidad_paros,
    sum(e.desperdicio_m) AS desperdicio_m,
    sum(e.desperdicio_kg) AS desperdicio_kg
   FROM production_route_events e
     JOIN orden_proceso op ON op.id = e.orden_proceso_id
     LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
  WHERE lower(e.event_type) = 'paro'::text
  GROUP BY op.codigo_orden,
           (COALESCE(NULLIF(sr.description, ''::text), sr.reason_code, 'Sin motivo'::text)),
           sr.reason_group;

COMMIT;

-- ============================================================================
-- ROLLBACK (manual, sólo si hace falta revertir):
--   psql -U postgres -d printlab -h localhost -f \
--     "E:\Github\Adicionales\backups\printlab.backup.pies-a-metros.20260907-070946.sql"
-- ============================================================================
