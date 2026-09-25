-- ═══════════════════════════════════════════════════════════════════════════
-- Consolidación Producción / Planificación — Paso 7 (parte 1): bitácora y merma
-- ═══════════════════════════════════════════════════════════════════════════
-- Aditivo: añade orden_proceso_id a production_route_events y production_waste_logs
-- y lo rellena desde el route_id viejo (vía orden_proceso.datos_extra.migrado_de_route_id).
-- Las columnas route_id se quedan (apuntan a production_order_routes, que en la
-- parte 2 se renombra a *_legacy). Nada se borra.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE production_route_events
    ADD COLUMN IF NOT EXISTS orden_proceso_id UUID REFERENCES orden_proceso(id) ON DELETE CASCADE;
ALTER TABLE production_route_events ALTER COLUMN route_id DROP NOT NULL;

ALTER TABLE production_waste_logs
    ADD COLUMN IF NOT EXISTS orden_proceso_id UUID REFERENCES orden_proceso(id) ON DELETE CASCADE;
ALTER TABLE production_waste_logs ALTER COLUMN route_id DROP NOT NULL;

-- Backfill: cada evento/merma cuelga del orden_proceso cuyo migrado_de_route_id
-- coincide con su route_id viejo.
UPDATE production_route_events e
   SET orden_proceso_id = op.id
  FROM orden_proceso op
 WHERE e.orden_proceso_id IS NULL
   AND op.datos_extra->>'migrado_de_route_id' ~ '^[0-9a-fA-F-]{36}$'
   AND e.route_id = (op.datos_extra->>'migrado_de_route_id')::uuid;

UPDATE production_waste_logs w
   SET orden_proceso_id = op.id
  FROM orden_proceso op
 WHERE w.orden_proceso_id IS NULL
   AND op.datos_extra->>'migrado_de_route_id' ~ '^[0-9a-fA-F-]{36}$'
   AND w.route_id = (op.datos_extra->>'migrado_de_route_id')::uuid;

CREATE INDEX IF NOT EXISTS idx_route_events_orden_proceso ON production_route_events(orden_proceso_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waste_logs_orden_proceso  ON production_waste_logs(orden_proceso_id, created_at DESC);

-- Vista de merma por causa: ligar por orden_proceso_id.
CREATE OR REPLACE VIEW vw_merma_por_causa AS
SELECT op.codigo_orden AS order_code,
       COALESCE(NULLIF(sr.description, ''), sr.reason_code, 'Sin motivo') AS motivo_paro,
       COALESCE(sr.reason_group, '')                                      AS grupo_motivo,
       COUNT(*)                                                           AS cantidad_paros,
       SUM(e.desperdicio_pies)                                            AS desperdicio_pies,
       SUM(e.desperdicio_kg)                                              AS desperdicio_kg
  FROM production_route_events e
  JOIN orden_proceso op ON op.id = e.orden_proceso_id
  LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
 WHERE LOWER(e.event_type) = 'paro'
 GROUP BY op.codigo_orden, COALESCE(NULLIF(sr.description, ''), sr.reason_code, 'Sin motivo'), sr.reason_group;

COMMIT;
