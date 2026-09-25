-- Consolidación Producción/Planificación — Paso 7d: retirar las tablas muertas.
-- production_order_routes y order_tracking_marks ya no tienen referencias vivas
-- en el código (todo migró a orden_proceso / orden_planificacion). Se renombran
-- a *_legacy para conservar el histórico. Las FK de production_route_events y
-- production_waste_logs (route_id) siguen a la tabla por OID, sin romperse.

BEGIN;
ALTER TABLE IF EXISTS production_order_routes RENAME TO production_order_routes_legacy;
ALTER TABLE IF EXISTS order_tracking_marks   RENAME TO order_tracking_marks_legacy;
COMMIT;
