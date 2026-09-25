-- ============================================================================
-- MIGRACIÓN: Merma de paros (production_route_events) de pies a metros
-- ----------------------------------------------------------------------------
-- migration-vigente-pies-a-metros.sql dejó explícitamente por fuera esta parte:
-- "NO se toca merma_paros_pies_vigente: la alimenta production_route_events.
--  desperdicio_pies (sistema de paros), fuera del alcance de este rediseño."
--
-- Esta migración cierra ese pendiente. La planta trabaja en metros, no en pies.
-- Renombra las columnas y CONVIERTE los valores ya guardados (pies × 0.3048 =
-- metros) para no corromper la merma real que ya se capturó.
--
-- Toca:
--   production_route_events.desperdicio_pies  -> desperdicio_m   (convertido)
--   flexo_orders.merma_paros_pies_vigente      -> merma_paros_m_vigente (convertido)
--   flexo_products.merma_paros_pies_vigente    -> merma_paros_m_vigente (convertido)
--   vw_merma_por_causa                         -> recreada con las columnas nuevas
--
-- desperdicio_kg / merma_paros_kg_vigente NO se tocan (el kg no es una unidad
-- de longitud, no aplica la conversión).
--
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-desperdicio-paros-pies-a-metros.sql
-- ============================================================================

BEGIN;

DROP VIEW IF EXISTS vw_merma_por_causa;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_route_events' AND column_name = 'desperdicio_pies')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_route_events' AND column_name = 'desperdicio_m') THEN
        ALTER TABLE production_route_events RENAME COLUMN desperdicio_pies TO desperdicio_m;
        UPDATE production_route_events SET desperdicio_m = ROUND(desperdicio_m * 0.3048, 4) WHERE desperdicio_m > 0;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flexo_orders' AND column_name = 'merma_paros_pies_vigente')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flexo_orders' AND column_name = 'merma_paros_m_vigente') THEN
        ALTER TABLE flexo_orders RENAME COLUMN merma_paros_pies_vigente TO merma_paros_m_vigente;
        UPDATE flexo_orders SET merma_paros_m_vigente = ROUND(merma_paros_m_vigente * 0.3048, 4) WHERE merma_paros_m_vigente > 0;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flexo_products' AND column_name = 'merma_paros_pies_vigente')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flexo_products' AND column_name = 'merma_paros_m_vigente') THEN
        ALTER TABLE flexo_products RENAME COLUMN merma_paros_pies_vigente TO merma_paros_m_vigente;
        UPDATE flexo_products SET merma_paros_m_vigente = ROUND(merma_paros_m_vigente * 0.3048, 4) WHERE merma_paros_m_vigente > 0;
    END IF;
END $$;

COMMENT ON COLUMN production_route_events.desperdicio_m IS 'Metros de material perdidos por este paro (se suma a la merma de la orden, desglosable por motivo de paro).';
COMMENT ON COLUMN flexo_orders.merma_paros_m_vigente IS 'Suma de desperdicio_m de todos los paros de la orden (real, MES).';

CREATE OR REPLACE VIEW vw_merma_por_causa AS
SELECT op.codigo_orden AS order_code,
       COALESCE(NULLIF(sr.description, ''), sr.reason_code, 'Sin motivo') AS motivo_paro,
       COALESCE(sr.reason_group, '')                                      AS grupo_motivo,
       COUNT(*)                                                           AS cantidad_paros,
       SUM(e.desperdicio_m)                                               AS desperdicio_m,
       SUM(e.desperdicio_kg)                                              AS desperdicio_kg
  FROM production_route_events e
  JOIN orden_proceso op ON op.id = e.orden_proceso_id
  LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
 WHERE LOWER(e.event_type) = 'paro'
 GROUP BY op.codigo_orden, COALESCE(NULLIF(sr.description, ''), sr.reason_code, 'Sin motivo'), sr.reason_group;

COMMIT;
