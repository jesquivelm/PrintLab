-- ============================================================
-- MIGRACIÓN COMPLEMENTARIA: volteadora_minutos en órdenes/productos/cálculos
-- (las columnas de costo_general, costo_velocidad_impresion y maquina están en
--  sql/migration-cambio-bobina-velocidades-volteadora.sql)
-- ============================================================

ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS volteadora_minutos NUMERIC(12,4);
ALTER TABLE flexo_orders ADD COLUMN IF NOT EXISTS volteadora_minutos NUMERIC(12,4);
ALTER TABLE flexo_calculations ADD COLUMN IF NOT EXISTS volteadora_minutos NUMERIC(12,4);
