-- ============================================================================
-- ROLLBACK de migration-pies-a-metros-total.sql
-- Revierte columnas, valores y objetos a la unidad "pies".
-- Usado el 2026-09-07 para dejar la BD local operativa mientras el pase de
-- código (server.js / app.js / costos.js / plantillas) se hace en la próxima
-- sesión de forma atómica junto con la migración.
--
-- NOTA: el round-trip NUMERIC(14,4) puede dejar diferencias de ±0.0001 en los
-- valores convertidos. Aceptable para datos de prueba locales. Para exactitud
-- total, restaurar desde:
--   E:\Github\Adicionales\backups\printlab.backup.pies-a-metros.20260907-070946.sql
-- ============================================================================

BEGIN;

-- FASE A inversa — renombrar columnas de metros de vuelta a pies
DO $$
DECLARE
    tbl TEXT; par TEXT[];
    ren TEXT[][] := ARRAY[
        ['metros_totales_sustrato',   'pies_totales_sustrato'],
        ['metros_sustrato_neto',      'pies_sustrato_neto'],
        ['merma_arranque_m',          'merma_arranque_pies'],
        ['merma_tiraje_m',            'merma_tiraje_pies'],
        ['merma_total_m',             'merma_total_pies'],
        ['laminado_metros_lineales',  'laminado_pies_lineales'],
        ['troquelado_merma_ajuste_m', 'troquelado_merma_ajuste_pies'],
        ['rebobinado_merma_ajuste_m', 'rebobinado_merma_ajuste_pies'],
        ['material_metros_macula',    'material_pies_macula'],
        ['merma_paros_m_vigente',     'merma_paros_pies_vigente']
    ];
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations','flexo_orders','flexo_products']
    LOOP
        FOREACH par SLICE 1 IN ARRAY ren
        LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tbl AND column_name=par[1])
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tbl AND column_name=par[2])
            THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', tbl, par[1], par[2]);
            END IF;
        END LOOP;
    END LOOP;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='production_route_events' AND column_name='desperdicio_m')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='production_route_events' AND column_name='desperdicio_pies')
    THEN
        DROP VIEW IF EXISTS vw_merma_por_causa;
        ALTER TABLE production_route_events RENAME COLUMN desperdicio_m TO desperdicio_pies;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='proceso_catalogo' AND column_name='costo_x_metro')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='proceso_catalogo' AND column_name='costo_x_pie')
    THEN
        ALTER TABLE proceso_catalogo RENAME COLUMN costo_x_metro TO costo_x_pie;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='costo_acabado_estampado' AND column_name='costo_por_metro_lineal')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='costo_acabado_estampado' AND column_name='costo_por_pie_lineal')
    THEN
        ALTER TABLE costo_acabado_estampado RENAME COLUMN costo_por_metro_lineal TO costo_por_pie_lineal;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='material' AND column_name='rendimiento_g_m2')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='material' AND column_name='rendimiento_g_ft2')
    THEN
        ALTER TABLE material RENAME COLUMN rendimiento_g_m2 TO rendimiento_g_ft2;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='material' AND column_name='comentario_rendimiento_g_m2')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='material' AND column_name='comentario_rendimiento_g_ft2')
    THEN
        ALTER TABLE material RENAME COLUMN comentario_rendimiento_g_m2 TO comentario_rendimiento_g_ft2;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='material' AND column_name='costo_x_pie') THEN
        NULL;
    ELSE
        ALTER TABLE material ADD COLUMN costo_x_pie NUMERIC(14,6);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='maquina' AND column_name='macula_default_m')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='maquina' AND column_name='macula_default_pies')
    THEN
        ALTER TABLE maquina RENAME COLUMN macula_default_m TO macula_default_pies;
        ALTER TABLE maquina ALTER COLUMN macula_default_pies TYPE INTEGER USING ROUND(macula_default_pies / 0.3048)::integer;
    END IF;
END $$;

-- FASE B inversa — restaurar la función del trigger a los nombres en pies
CREATE OR REPLACE FUNCTION public.flexo_set_merma_pct_cotizada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    pct NUMERIC(10,4);
BEGIN
    IF NEW.pies_sustrato_neto IS NOT NULL AND NEW.pies_sustrato_neto > 0
       AND NEW.pies_totales_sustrato IS NOT NULL AND NEW.pies_totales_sustrato > 0 THEN
        pct := ROUND((NEW.pies_totales_sustrato / NEW.pies_sustrato_neto - 1) * 100, 4);
        NEW.merma_sustrato_pct_cotizada := pct;
        NEW.merma_foil_pct_cotizada     := pct;
        NEW.merma_laminado_pct_cotizada := pct;
        NEW.merma_tinta_pct_cotizada    := pct;
    END IF;
    RETURN NEW;
END;
$function$;

-- FASE C inversa — revertir valores
DO $$
DECLARE
    tbl TEXT; col TEXT;
    cols TEXT[] := ARRAY[
        'pies_totales_sustrato','pies_sustrato_neto','merma_arranque_pies','merma_tiraje_pies',
        'merma_total_pies','laminado_pies_lineales','troquelado_merma_ajuste_pies',
        'rebobinado_merma_ajuste_pies','material_pies_macula','merma_paros_pies_vigente'
    ];
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations','flexo_orders','flexo_products']
    LOOP
        FOREACH col IN ARRAY cols
        LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tbl AND column_name=col)
            THEN
                EXECUTE format('UPDATE %I SET %I = %I / 0.3048 WHERE %I IS NOT NULL', tbl, col, col, col);
            END IF;
        END LOOP;
    END LOOP;
END $$;

UPDATE production_route_events SET desperdicio_pies = desperdicio_pies / 0.3048 WHERE desperdicio_pies IS NOT NULL;
UPDATE proceso_catalogo        SET costo_x_pie          = costo_x_pie          * 0.3048 WHERE costo_x_pie          IS NOT NULL;
UPDATE costo_acabado_estampado SET costo_por_pie_lineal = costo_por_pie_lineal * 0.3048 WHERE costo_por_pie_lineal IS NOT NULL;
UPDATE material                SET rendimiento_g_ft2    = rendimiento_g_ft2    / 10.7639104167 WHERE rendimiento_g_ft2 IS NOT NULL;

-- FASE D inversa — recrear la vista con la columna en pies
CREATE OR REPLACE VIEW vw_merma_por_causa AS
 SELECT op.codigo_orden AS order_code,
    COALESCE(NULLIF(sr.description, ''::text), sr.reason_code, 'Sin motivo'::text) AS motivo_paro,
    COALESCE(sr.reason_group, ''::text) AS grupo_motivo,
    count(*) AS cantidad_paros,
    sum(e.desperdicio_pies) AS desperdicio_pies,
    sum(e.desperdicio_kg) AS desperdicio_kg
   FROM production_route_events e
     JOIN orden_proceso op ON op.id = e.orden_proceso_id
     LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
  WHERE lower(e.event_type) = 'paro'::text
  GROUP BY op.codigo_orden,
           (COALESCE(NULLIF(sr.description, ''::text), sr.reason_code, 'Sin motivo'::text)),
           sr.reason_group;

COMMIT;
