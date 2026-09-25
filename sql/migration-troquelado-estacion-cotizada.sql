-- ============================================================================
-- MIGRACIÓN: Posición COTIZADA del Troquelado sobre la máquina.
-- ----------------------------------------------------------------------------
-- Contexto: el Troquelado ahora se monta en una torre concreta de la máquina
-- (estación movible como barniz / laminado / estampado) y esa posición se
-- decide en el cálculo. Se guarda como columna tipada y plana en las tres
-- tablas alineadas (flexo_calculations, flexo_orders, flexo_products), sin
-- raw_data. El COSTO del troquelado (por golpe / lineal) no cambia con la
-- posición; esta columna es solo trazabilidad de dónde va montado.
--
-- Índice base 0 dentro de la lista de estaciones del motivo (inkStations).
-- Idempotente (ADD COLUMN IF NOT EXISTS). Rollback al final, comentado.
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_orders', 'flexo_products']
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS troquelado_estacion_cotizada INTEGER', tbl);
    END LOOP;
END $$;

-- Rollback (manual):
-- ALTER TABLE flexo_calculations DROP COLUMN IF EXISTS troquelado_estacion_cotizada;
-- ALTER TABLE flexo_orders       DROP COLUMN IF EXISTS troquelado_estacion_cotizada;
-- ALTER TABLE flexo_products     DROP COLUMN IF EXISTS troquelado_estacion_cotizada;
