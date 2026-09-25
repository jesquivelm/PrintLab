-- Migración: columna etiquetas_por_rollo_default en costo_general
-- Contexto: Etiquetas por Rollo por Defecto pasa de Configuración General a Costos.
ALTER TABLE costo_general ADD COLUMN IF NOT EXISTS etiquetas_por_rollo_default NUMERIC(12,4);
UPDATE costo_general SET etiquetas_por_rollo_default = 1000 WHERE etiquetas_por_rollo_default IS NULL;