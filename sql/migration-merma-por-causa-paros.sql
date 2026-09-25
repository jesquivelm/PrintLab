-- Migración: desperdicio por causa en los paros de producción.
-- Hoy los paros (production_route_events con event_type='paro' + stop_reason_id) registran el
-- motivo pero no cuánto material se perdió por ese paro, y ese desperdicio no se suma a la merma
-- total de la orden. Se agregan columnas tipadas (sin raw_data) y un rollup vigente en la orden
-- y el producto.

ALTER TABLE production_route_events ADD COLUMN IF NOT EXISTS desperdicio_pies NUMERIC(14,4) NOT NULL DEFAULT 0;
ALTER TABLE production_route_events ADD COLUMN IF NOT EXISTS desperdicio_kg   NUMERIC(14,4) NOT NULL DEFAULT 0;

ALTER TABLE flexo_orders   ADD COLUMN IF NOT EXISTS merma_paros_pies_vigente NUMERIC(14,4);
ALTER TABLE flexo_orders   ADD COLUMN IF NOT EXISTS merma_paros_kg_vigente   NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_paros_pies_vigente NUMERIC(14,4);
ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS merma_paros_kg_vigente   NUMERIC(14,4);

COMMENT ON COLUMN production_route_events.desperdicio_pies IS 'Pies de material perdidos por este paro (se suma a la merma de la orden, desglosable por motivo de paro).';
COMMENT ON COLUMN production_route_events.desperdicio_kg   IS 'Kg de material perdidos por este paro.';
COMMENT ON COLUMN flexo_orders.merma_paros_pies_vigente   IS 'Suma de desperdicio_pies de todos los paros de la orden (real, MES).';

-- Vista de apoyo: merma por causa (motivo de paro) por orden.
CREATE OR REPLACE VIEW vw_merma_por_causa AS
SELECT r.order_code,
       COALESCE(NULLIF(sr.description, ''), sr.reason_code, 'Sin motivo') AS motivo_paro,
       COALESCE(sr.reason_group, '')                                      AS grupo_motivo,
       COUNT(*)                                                           AS cantidad_paros,
       SUM(e.desperdicio_pies)                                            AS desperdicio_pies,
       SUM(e.desperdicio_kg)                                              AS desperdicio_kg
  FROM production_route_events e
  JOIN production_order_routes r ON r.id = e.route_id
  LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
 WHERE LOWER(e.event_type) = 'paro'
 GROUP BY r.order_code, COALESCE(NULLIF(sr.description, ''), sr.reason_code, 'Sin motivo'), sr.reason_group;
