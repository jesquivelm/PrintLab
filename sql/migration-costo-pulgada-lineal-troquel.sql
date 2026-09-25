-- Migración: columna costo_pulgada_lineal_troquel_default en costo_general
-- Contexto: Costo por Pulgada Lineal de Troquel (Configuración General → Costos Adicionales),
-- usado para cobrar automáticamente un troquel nuevo en la Calculadora de Troquel.
ALTER TABLE costo_general ADD COLUMN IF NOT EXISTS costo_pulgada_lineal_troquel_default NUMERIC(10,2);
UPDATE costo_general SET costo_pulgada_lineal_troquel_default = 0 WHERE costo_pulgada_lineal_troquel_default IS NULL;
