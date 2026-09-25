-- ============================================================================
-- PRINTLAB ERP - Migración: Costo de Tintas por Motivo
-- ============================================================================
-- Guarda el subtotal de tintas de cada motivo (columna "Subtotal" de la tabla
-- de Motivos en Configuración de Impresión). Antes esa columna mostraba un
-- costo totalmente absorbido (sustrato + planchas + máquina + acabados + ...),
-- lo cual no corresponde a ese contexto: ahí solo se cobra el costo de tintas.
-- ============================================================================

ALTER TABLE calculo_motivos
    ADD COLUMN IF NOT EXISTS costo_tintas NUMERIC(14,4);
