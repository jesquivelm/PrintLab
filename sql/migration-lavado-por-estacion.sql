-- ============================================================
-- MIGRACIÓN: Agregar columna lavado_por_estacion a maquina
-- Tiempo de lavado por estación de color/barniz (min)
-- ============================================================

ALTER TABLE maquina ADD COLUMN IF NOT EXISTS lavado_por_estacion DECIMAL(12,4) DEFAULT 0;
